# Library Page Refresh After Track Upload

## Overview

Fixed the issue where the library page doesn't automatically refresh after uploading a new track. The Total Tracks stat and newly uploaded track card now appear immediately without requiring a manual page refresh.

## Problem

After successfully uploading a track and completing the album/playlist assignment:
1. The library page displays but shows stale data
2. Total Tracks stat card doesn't increment
3. Newly uploaded track card doesn't appear in the All Tracks section
4. User must manually refresh the page to see the new track

## Root Cause

The library page components (StatsSection and AllTracksSection) were using cached data and had no mechanism to refresh when a new track was uploaded. The `onUploadSuccess` callback in the library page was empty, so no cache invalidation or re-rendering was triggered.

## Solution Implemented

### 1. Added Refresh Mechanism

**File:** `client/src/app/library/page.tsx`

Implemented a refresh key pattern to force re-rendering of data-dependent components:

```typescript
// State for triggering refreshes
const [refreshKey, setRefreshKey] = useState(0);

// Handle upload success - invalidate caches and refresh sections
const handleUploadSuccess = useCallback(() => {
  if (!user) return;
  
  // Add a small delay to ensure database changes are committed
  // PostUploadAssignment already has a 500ms delay before calling this
  setTimeout(() => {
    // Invalidate all relevant caches to force fresh data
    cache.invalidate(CACHE_KEYS.TRACKS(user.id));
    cache.invalidate(CACHE_KEYS.STATS(user.id));
    cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
    cache.invalidate(CACHE_KEYS.PLAYLISTS(user.id));
    
    // Trigger re-render of sections by updating refresh key
    setRefreshKey(prev => prev + 1);
    
    console.log('✅ Library refreshed after track upload with all memberships');
  }, 100); // Small additional delay to ensure database consistency
}, [user]);
```

### 2. Connected Upload Success Callback

Wired the `handleUploadSuccess` callback to the TrackUploadSection:

```typescript
<TrackUploadSection 
  onUploadSuccess={handleUploadSuccess}
/>
```

### 3. Added Key Props for Re-rendering

Used the `refreshKey` as part of the `key` prop to force component remount:

```typescript
{/* Stats Section - Always visible, not collapsible */}
<StatsSection userId={user.id} key={`stats-${refreshKey}`} />

{/* All Tracks Section - Collapsible */}
<AllTracksSection 
  userId={user.id}
  initialLimit={12}
  key={`tracks-${refreshKey}`}
/>
```

## How It Works

1. **User uploads a track** → TrackUploadSection calls `onTrackUploaded`
2. **Assignment modal appears** → User assigns track to albums/playlists
3. **User clicks "Done"** → PostUploadAssignment saves assignments (500ms delay)
4. **Assignment complete** → TrackUploadSection calls `onUploadSuccess`
5. **Additional delay** → 100ms to ensure database consistency
6. **Cache invalidation** → All caches (tracks, stats, albums, playlists) are cleared
7. **Refresh key increments** → `refreshKey` changes from 0 to 1
8. **Components remount** → StatsSection and AllTracksSection remount with new keys
9. **Fresh data loads** → Components fetch fresh data with membership info
10. **UI updates** → New track appears with badges, stats are updated

### Critical Fix: Timing of onUploadSuccess

The key fix was moving the `onUploadSuccess` callback from when the track is uploaded to when the assignment is complete:

**Before (incorrect):**
```typescript
const handleTrackUploaded = useCallback((trackId, track) => {
  setUploadedTrack(track);
  setShowAssignment(true);
  onUploadSuccess(track); // ❌ Called too early!
}, [onUploadSuccess]);
```

**After (correct):**
```typescript
const handleAssignmentDone = useCallback(() => {
  setShowAssignment(false);
  setUploadedTrack(null);
  setIsExpanded(false);
  
  // ✅ Called AFTER assignment is complete
  if (onUploadSuccess && uploadedTrack) {
    onUploadSuccess(uploadedTrack);
  }
}, [onUploadSuccess, uploadedTrack]);
```

This ensures the refresh happens after the database relationships (album_tracks, playlist_tracks) are created.

## Benefits

- **Immediate feedback**: Users see their uploaded track right away
- **Accurate stats**: Total Tracks count updates immediately
- **No manual refresh**: Eliminates the need for users to refresh the page
- **Cache consistency**: Ensures all components show fresh data
- **Clean implementation**: Uses React's key prop pattern for controlled re-rendering

## Technical Details

### Cache Invalidation

The solution invalidates four caches:
- `CACHE_KEYS.TRACKS(userId)` - Clears the tracks list cache (includes membership data)
- `CACHE_KEYS.STATS(userId)` - Clears the stats cache
- `CACHE_KEYS.ALBUMS(userId)` - Clears the albums cache
- `CACHE_KEYS.PLAYLISTS(userId)` - Clears the playlists cache

This ensures that when components remount, they fetch fresh data from the database instead of using stale cached data. Invalidating albums and playlists caches is crucial because the track membership badges depend on this data.

### Timing Considerations

The refresh includes two timing delays:
1. **PostUploadAssignment delay (500ms)**: Shows success message before calling `onDone`
2. **Additional delay (100ms)**: Ensures database changes are fully committed before fetching

Total delay: ~600ms, which provides a smooth user experience while ensuring data consistency.

### Key Prop Pattern

Using the `key` prop with a changing value forces React to:
1. Unmount the old component instance
2. Mount a new component instance
3. Run all initialization logic (including data fetching)

This is more reliable than trying to expose refresh methods or use refs.

### Callback Flow

```
AudioUpload (track mode)
  ↓ onTrackUploaded
TrackUploadSection
  ↓ shows PostUploadAssignment
PostUploadAssignment (user clicks "Done")
  ↓ onDone
TrackUploadSection
  ↓ onUploadSuccess
LibraryPage
  ↓ handleUploadSuccess
  ├─ cache.invalidate(TRACKS)
  ├─ cache.invalidate(STATS)
  └─ setRefreshKey(prev => prev + 1)
```

## Testing

### Test Cases

1. **Upload and assign to album**
   - Upload a new track
   - Assign it to an album
   - Click "Done"
   - Verify track appears in All Tracks section
   - Verify Total Tracks count increments

2. **Upload and assign to playlist**
   - Upload a new track
   - Assign it to a playlist
   - Click "Done"
   - Verify track appears immediately

3. **Upload without assignment**
   - Upload a new track
   - Click "Skip" on assignment modal
   - Verify track still appears in All Tracks section

4. **Upload multiple tracks**
   - Upload first track → verify it appears
   - Upload second track → verify both appear
   - Verify Total Tracks count is correct

5. **Stats accuracy**
   - Note current Total Tracks count
   - Upload a track
   - Verify count increments by 1
   - Verify other stats remain accurate

## Files Modified

1. **client/src/app/library/page.tsx**
   - Added `refreshKey` state
   - Implemented `handleUploadSuccess` callback
   - Added cache invalidation logic (tracks, stats, albums, playlists)
   - Added `key` props to StatsSection and AllTracksSection
   - Imported cache utilities
   - Added 100ms delay for database consistency

2. **client/src/components/library/TrackUploadSection.tsx**
   - **CRITICAL FIX:** Moved `onUploadSuccess` call from `handleTrackUploaded` to after assignment
   - Added `onUploadSuccess` call in `handleAssignmentDone`
   - Added `onUploadSuccess` call in `handleUploadAnother`
   - Added `onUploadSuccess` call in `handleSkipAssignment`
   - Ensures refresh happens after database relationships are created

## Related Issues

This fix also ensures that:
- Album assignments are immediately visible (badges on track cards)
- Playlist assignments are immediately visible (badges on track cards)
- Stats are always accurate after uploads
- No race conditions between upload and display
- All caches are synchronized after assignments

### Album and Playlist Badges

The track cards display badges showing which album and playlists a track belongs to. These badges are populated from the `getUserTracksWithMembership` query which joins:
- `album_tracks` → `albums` (for album name)
- `playlist_tracks` → `playlists` (for playlist names)

By invalidating the albums and playlists caches in addition to the tracks cache, we ensure that when the track data is re-fetched, the membership information is fresh and includes any assignments made during the upload flow.

## Notes

- The refresh mechanism is automatic and requires no user action
- Cache invalidation ensures data consistency across all sections
- The key prop pattern is a React best practice for controlled re-rendering
- Console log confirms when refresh occurs (for debugging)

---

**Status:** ✅ Complete
**Date:** 2025-01-03
**Related Task:** Track upload flow improvements
