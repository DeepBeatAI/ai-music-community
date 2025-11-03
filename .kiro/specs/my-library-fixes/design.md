# My Library Fixes and Enhancements - Design Document

## Overview

This design document outlines the technical approach to fix critical bugs and implement user experience improvements identified during manual testing of the My Library feature. The fixes are prioritized by severity and impact on user experience.

## Priority Classification

### Critical (P0) - Blocking Issues
1. Page refresh/navigation loading failure (Albums & Playlists)
2. Track deletion database constraint error
3. Track upload database error

### High (P1) - Functional Issues
4. Playlist track removal not working
5. Stats section play count calculation error
6. Album edit page 404 error

### Medium (P2) - UX Improvements
7. Track card visual clarity (icons, play button, likes, author)
8. Album description overflow
9. Album card not updating after edit
10. My Playlists section layout inconsistency

### Low (P3) - Nice to Have
11. Album creation form cleanup (remove cover URL field)
12. /tracks page enhancements
13. Album playback controls

## Root Cause Analysis

### Issue 1: Lazy Loading State Not Persisting

**Problem:** Albums and Playlists sections show skeleton indefinitely on page refresh or back navigation.

**Root Cause:** The `shouldLoadAlbums` and `shouldLoadPlaylists` state variables are initialized to `false` on every component mount. The Intersection Observer only triggers when the element enters the viewport, but on page refresh, the elements are already in the viewport, so the observer never fires.

**Current Code (LibraryPage.tsx):**
```typescript
const [shouldLoadAlbums, setShouldLoadAlbums] = useState(false);
const [shouldLoadPlaylists, setShouldLoadPlaylists] = useState(false);

useEffect(() => {
  if (!user) return;
  
  const albumsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !shouldLoadAlbums) {
        setShouldLoadAlbums(true);
        albumsObserver.disconnect();
      }
    });
  }, observerOptions);
  
  if (albumsRef.current) {
    albumsObserver.observe(albumsRef.current);
  }
}, [user, shouldLoadAlbums, shouldLoadPlaylists]);
```

**Solution:**
1. Check if element is already in viewport on mount
2. If yes, immediately set state to load
3. If no, use Intersection Observer as before

### Issue 2: Stats Play Count Calculation

**Problem:** "Plays This Week" equals "Total Plays" when they should be different.

**Root Cause:** The calculation filters tracks by `created_at` date instead of checking when plays occurred. The logic counts play_count for tracks created in the last 7 days, not plays that happened in the last 7 days.

**Current Code (lib/library.ts):**
```typescript
const playsThisWeek = playsResult.data?.reduce((sum, track) => {
  const trackDate = new Date(track.created_at);
  if (trackDate >= oneWeekAgo) {
    return sum + (track.play_count || 0);
  }
  return sum;
}, 0) || 0;
```

**Solution:**
The database doesn't track individual play timestamps, only a cumulative `play_count`. We need to either:
- Option A: Add a `plays` table to track individual play events with timestamps
- Option B: Remove "Plays This Week" stat and only show "Total Plays"
- Option C: Add `plays_this_week` column to tracks table (updated by a scheduled job)

**Recommended:** Option B (simplest) - Remove the misleading stat until proper play tracking is implemented.



### Issue 3: Track Upload Database Error

**Problem:** Track upload fails with 400 Bad Request and database insert error.

**Root Cause:** The tracks table has a constraint that requires certain fields, but the upload component may not be providing all required fields or is providing invalid data.

**Investigation Needed:**
1. Check tracks table schema and constraints
2. Review AudioUpload component to see what fields it sends
3. Check if there's a posts table relationship causing issues

**Solution Approach:**
1. Query database to understand tracks table schema
2. Identify missing or invalid fields in upload payload
3. Update AudioUpload component to provide all required fields
4. Add proper validation before database insert

### Issue 4: Track Card Visual Improvements

**Problem:** Multiple UX issues with track cards:
- Eye icon is confusing for play count
- Missing likes counter
- Missing track author
- Too many tracks displayed (12 instead of 8)
- No play button for quick playback

**Current Implementation:**
- Play count uses eye icon (👁️)
- No likes display
- No author display
- initialLimit set to 12
- No play button

**Solution:**
1. Replace eye icon with play icon (▶️) or add "plays" text label
2. Add likes counter from database (requires checking if likes table exists)
3. Add author username from user_profiles join
4. Change initialLimit from 12 to 8 in AllTracksSection
5. Add play button that integrates with existing mini player

**Design for Enhanced Track Card:**
```
┌─────────────────────────┐
│   Cover Art             │
│   [▶️ Play Button]      │
├─────────────────────────┤
│ Track Title             │
│ by Author Name          │
│ 🎵 Album Badge          │
│ 📝 Playlist Badge       │
├─────────────────────────┤
│ ▶️ 123 plays            │
│ ❤️ 45 likes             │
│ 📅 2 days ago      [⋮]  │
└─────────────────────────┘
```

### Issue 5: Album Assignment Menu - Remove Descriptions

**Problem:** Album descriptions clutter the selection menu in AddToAlbumModal.

**Current Code (AddToAlbumModal.tsx):**
```typescript
{album.description && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {album.description}
  </p>
)}
```

**Solution:** Simply remove the description display from the album selection options. Keep only album name and "Current" indicator.



### Issue 6: Playlist Track Removal Not Working

**Problem:** Unchecking a playlist checkbox doesn't remove the track from that playlist. After clicking Save, the checkbox reverts to checked.

**Root Cause:** The AddToPlaylistModal likely only handles adding tracks, not removing them. The save logic probably doesn't detect unchecked boxes as removal requests.

**Investigation Needed:**
1. Find and examine AddToPlaylistModal component
2. Check if it tracks initial state vs current state
3. Verify if removal API calls are being made

**Solution Approach:**
1. Track initial playlist membership state
2. Compare with final state on save
3. For each unchecked playlist that was initially checked, call remove API
4. For each checked playlist that was initially unchecked, call add API
5. Update UI optimistically and rollback on error

### Issue 7: Track Deletion Constraint Error

**Problem:** Deleting a track fails with constraint violation: "new row for relation 'posts' violates check constraint 'posts_audio_fields_check'"

**Root Cause:** There's a relationship between tracks and posts tables. When a track is deleted, it tries to update or create a post record, but the post doesn't have required audio fields, violating a check constraint.

**Database Schema Investigation Needed:**
1. Understand tracks → posts relationship
2. Check posts table constraints
3. Determine if posts should be deleted or updated when track is deleted

**Solution Options:**
- Option A: Delete related posts before deleting track
- Option B: Set posts.track_id to NULL (if allowed)
- Option C: Update posts table to handle missing track gracefully
- Option D: Add CASCADE delete on posts → tracks foreign key

**Recommended:** Option A - Delete related posts first, then delete track.

### Issue 8: Album Creation and Management Fixes

**Problem 8a:** Cover Image URL field should not be shown in album creation modal.

**Solution:** Remove or hide the cover_image_url input field from CreateAlbumModal component.

**Problem 8b:** Album edit page returns 404.

**Root Cause:** The edit route `/library/albums/[id]/edit` doesn't exist.

**Solution:** Create the edit page at `client/src/app/library/albums/[id]/edit/page.tsx` or handle editing in a modal on the detail page.

**Problem 8c:** Long album descriptions overflow their container.

**Solution:** Add CSS to handle text overflow:
```css
.album-description {
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}
```

**Problem 8d:** Album card doesn't update after editing until page refresh.

**Root Cause:** Cache invalidation isn't triggering a re-fetch of the albums list when returning from edit page.

**Solution:** 
1. Invalidate albums cache when edit is saved
2. Use router events or state management to trigger refresh
3. Consider using SWR or React Query for automatic revalidation



### Issue 9: Album Playback Controls

**Problem:** Album details page lacks "Play Album" and individual track "Play" buttons.

**Reference Implementation:** Playlist details page already has this functionality.

**Solution:** 
1. Examine playlist details page implementation
2. Copy playback integration pattern to album details page
3. Ensure mini player integration works identically
4. Add "Play Album" button that queues all tracks
5. Add "Play" button next to each track

**Implementation Pattern (from Playlists):**
```typescript
// Play entire album
const handlePlayAlbum = () => {
  const tracks = album.tracks.map(t => t.track);
  playbackContext.playPlaylist(tracks, 0);
};

// Play specific track
const handlePlayTrack = (index: number) => {
  const tracks = album.tracks.map(t => t.track);
  playbackContext.playPlaylist(tracks, index);
};
```

### Issue 10: My Playlists Section Layout

**Problem 10a:** Playlists section wrapped in unnecessary box.

**Current Code (LibraryPage.tsx):**
```typescript
<div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
  <div className="mb-6">
    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
      <span>📝</span>
      <span>My Playlists</span>
    </h2>
  </div>
  <PlaylistsList />
</div>
```

**Solution:** Remove the wrapper div and let PlaylistsList handle its own styling, or add collapse functionality to match other sections.

**Problem 10b:** Missing collapse/expand arrow button.

**Solution:** Add collapse toggle button consistent with All Tracks and My Albums sections.

**Problem 10c:** Playlist details page says "Back to Playlists" instead of "Back to Library".

**Solution:** Update the back button text in the playlist details page component.

## Implementation Strategy

### Phase 1: Critical Fixes (P0)
1. Fix lazy loading state persistence
2. Fix track deletion constraint error
3. Fix track upload database error

### Phase 2: Functional Fixes (P1)
4. Fix playlist track removal
5. Fix/remove stats play count calculation
6. Create album edit page

### Phase 3: UX Improvements (P2)
7. Enhance track card visuals
8. Fix album description overflow
9. Fix album card update after edit
10. Improve playlists section layout

### Phase 4: Enhancements (P3)
11. Clean up album creation form
12. Add /tracks page enhancements
13. Add album playback controls



## Detailed Technical Solutions

### Solution 1: Fix Lazy Loading State Persistence

**File:** `client/src/app/library/page.tsx`

**Approach:** Check if elements are already visible on mount.

```typescript
useEffect(() => {
  if (!user) return;

  const observerOptions = {
    root: null,
    rootMargin: '200px',
    threshold: 0,
  };

  // Check if already in viewport on mount
  const checkInitialVisibility = () => {
    if (albumsRef.current && !shouldLoadAlbums) {
      const rect = albumsRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight + 200;
      if (isVisible) {
        setShouldLoadAlbums(true);
      }
    }
    
    if (playlistsRef.current && !shouldLoadPlaylists) {
      const rect = playlistsRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight + 200;
      if (isVisible) {
        setShouldLoadPlaylists(true);
      }
    }
  };

  // Check immediately on mount
  checkInitialVisibility();

  // Set up observers for lazy loading if not already visible
  const albumsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !shouldLoadAlbums) {
        setShouldLoadAlbums(true);
        albumsObserver.disconnect();
      }
    });
  }, observerOptions);

  const playlistsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !shouldLoadPlaylists) {
        setShouldLoadPlaylists(true);
        playlistsObserver.disconnect();
      }
    });
  }, observerOptions);

  if (albumsRef.current && !shouldLoadAlbums) {
    albumsObserver.observe(albumsRef.current);
  }
  if (playlistsRef.current && !shouldLoadPlaylists) {
    playlistsObserver.observe(playlistsRef.current);
  }

  return () => {
    albumsObserver.disconnect();
    playlistsObserver.disconnect();
  };
}, [user, shouldLoadAlbums, shouldLoadPlaylists]);
```

### Solution 2: Fix Stats Play Count Calculation

**File:** `client/src/lib/library.ts`

**Option A: Remove "Plays This Week" stat (Recommended)**

Update `LibraryStats` interface:
```typescript
export interface LibraryStats {
  uploadRemaining: number | 'infinite';
  totalTracks: number;
  totalAlbums: number;
  totalPlaylists: number;
  // Remove: playsThisWeek: number;
  playsAllTime: number;
}
```

Update `getLibraryStats` function to remove the calculation.

Update `StatsSection` component to display only 5 stats instead of 6.

**Option B: Add proper play tracking (Future enhancement)**

Create a `plays` table:
```sql
CREATE TABLE plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Then query plays from the last 7 days:
```typescript
const { data: recentPlays } = await supabase
  .from('plays')
  .select('id')
  .gte('played_at', oneWeekAgo.toISOString())
  .in('track_id', userTrackIds);

const playsThisWeek = recentPlays?.length || 0;
```



### Solution 3: Fix Track Upload Database Error

**Investigation Steps:**
1. Query tracks table schema to identify required fields
2. Check posts table and its relationship to tracks
3. Review AudioUpload component payload

**Likely Solution:**
The tracks table probably requires fields that AudioUpload isn't providing. Common missing fields:
- `genre` (if required)
- `description` (if required)
- `is_public` (if required with no default)

**Fix Approach:**
1. Make optional fields nullable in database OR provide defaults
2. Update AudioUpload to include all required fields
3. Add validation before insert

### Solution 4: Enhance Track Card Visuals

**File:** `client/src/components/library/TrackCard.tsx`

**Changes:**

1. **Replace eye icon with play icon + text:**
```typescript
{/* Play Count */}
<div className="flex items-center gap-1">
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
  <span>{track.play_count || 0} plays</span>
</div>
```

2. **Add likes counter:**
```typescript
{/* Likes Count */}
<div className="flex items-center gap-1">
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
  <span>{track.like_count || 0}</span>
</div>
```

3. **Add author name:**
```typescript
{/* Track Title and Author */}
<h3 className="text-lg font-semibold text-white truncate">
  {track.title}
</h3>
<p className="text-sm text-gray-400 truncate">
  by {track.user?.username || 'Unknown Artist'}
</p>
```

4. **Add play button overlay on cover art:**
```typescript
<div className="relative aspect-square bg-gray-700 group">
  <div className="w-full h-full flex items-center justify-center text-gray-500">
    {/* Existing music icon */}
  </div>
  
  {/* Play Button Overlay */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      onPlay(track.id);
    }}
    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all opacity-0 group-hover:opacity-100"
  >
    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>
  </button>
</div>
```

5. **Update TrackCard props to include onPlay:**
```typescript
interface TrackCardProps {
  track: TrackWithMembership;
  onAddToAlbum: (trackId: string) => void;
  onAddToPlaylist: (trackId: string) => void;
  onCopyUrl: (trackId: string) => void;
  onShare: (trackId: string) => void;
  onDelete: (trackId: string) => void;
  onPlay: (trackId: string) => void; // NEW
}
```

6. **Update AllTracksSection initialLimit:**
```typescript
<AllTracksSection 
  userId={user.id}
  initialLimit={8}  // Changed from 12
/>
```



### Solution 5: Remove Album Descriptions from Selection Menu

**File:** `client/src/components/library/AddToAlbumModal.tsx`

**Change:** Remove the description paragraph:

```typescript
// BEFORE
<div className="ml-3 flex-1">
  <p className="text-sm font-medium text-gray-900 dark:text-white">
    {album.name}
  </p>
  {album.description && (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {album.description}
    </p>
  )}
</div>

// AFTER
<div className="ml-3 flex-1">
  <p className="text-sm font-medium text-gray-900 dark:text-white">
    {album.name}
  </p>
</div>
```

### Solution 6: Fix Playlist Track Removal

**File:** `client/src/components/library/AddToPlaylistModal.tsx` (needs to be found/created)

**Implementation:**

```typescript
interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  currentPlaylistIds: string[];
  userId: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function AddToPlaylistModal({ 
  trackId, 
  currentPlaylistIds,
  // ... other props
}: AddToPlaylistModalProps) {
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>(currentPlaylistIds);
  const [initialPlaylistIds] = useState<string[]>(currentPlaylistIds); // Track initial state
  
  const handleSave = async () => {
    // Determine which playlists to add and remove
    const toAdd = selectedPlaylistIds.filter(id => !initialPlaylistIds.includes(id));
    const toRemove = initialPlaylistIds.filter(id => !selectedPlaylistIds.includes(id));
    
    try {
      // Remove from unchecked playlists
      for (const playlistId of toRemove) {
        await removeTrackFromPlaylist({ playlist_id: playlistId, track_id: trackId });
      }
      
      // Add to newly checked playlists
      for (const playlistId of toAdd) {
        await addTrackToPlaylist({ playlist_id: playlistId, track_id: trackId });
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      onError?.('Failed to update playlist membership');
    }
  };
  
  return (
    // Modal with checkboxes for each playlist
    // checked={selectedPlaylistIds.includes(playlist.id)}
    // onChange={(e) => {
    //   if (e.target.checked) {
    //     setSelectedPlaylistIds([...selectedPlaylistIds, playlist.id]);
    //   } else {
    //     setSelectedPlaylistIds(selectedPlaylistIds.filter(id => id !== playlist.id));
    //   }
    // }}
  );
}
```

### Solution 7: Fix Track Deletion Constraint Error

**Investigation Required:** Query database to understand posts → tracks relationship.

**Likely Solution:**

**File:** `client/src/lib/tracks.ts` (or wherever deleteTrack is defined)

```typescript
export async function deleteTrack(trackId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Delete related posts first
    const { error: postsError } = await supabase
      .from('posts')
      .delete()
      .eq('track_id', trackId);
    
    if (postsError) {
      console.error('Error deleting related posts:', postsError);
      // Continue anyway - posts might not exist
    }
    
    // Step 2: Delete the track
    const { error: trackError } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId);
    
    if (trackError) {
      console.error('Error deleting track:', trackError);
      return { success: false, error: trackError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting track:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```



### Solution 8: Album Management Fixes

**8a. Remove Cover Image URL from Album Creation**

**File:** `client/src/components/library/CreateAlbumModal.tsx`

Remove or hide the cover_image_url input field:

```typescript
// Remove this section:
<div>
  <label className="block text-sm font-medium mb-2">
    Cover Image URL
  </label>
  <input
    type="url"
    value={formData.cover_image_url || ''}
    onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
    className="w-full px-3 py-2 border rounded-lg"
  />
</div>
```

**8b. Create Album Edit Page**

**File:** `client/src/app/library/albums/[id]/edit/page.tsx` (NEW)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAlbumWithTracks, updateAlbum } from '@/lib/albums';
import { cache, CACHE_KEYS } from '@/utils/cache';

export default function EditAlbumPage() {
  const router = useRouter();
  const params = useParams();
  const albumId = params.id as string;
  
  const [album, setAlbum] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true
  });
  
  useEffect(() => {
    // Fetch album data
    // Populate form
  }, [albumId]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateAlbum(albumId, formData);
    
    if (result.success) {
      // Invalidate cache
      cache.invalidate(CACHE_KEYS.ALBUMS(userId));
      // Navigate back
      router.push('/library');
    }
  };
  
  return (
    // Edit form
  );
}
```

**8c. Fix Album Description Overflow**

**File:** `client/src/app/library/albums/[id]/page.tsx`

Add proper text wrapping:

```typescript
<div className="mb-6">
  <p className="text-gray-300 whitespace-pre-wrap break-words max-w-full">
    {album.description}
  </p>
</div>
```

**8d. Fix Album Card Update After Edit**

**Approach 1:** Invalidate cache on navigation back

**File:** `client/src/app/library/albums/[id]/edit/page.tsx`

```typescript
const handleBack = () => {
  // Invalidate albums cache before navigating
  cache.invalidate(CACHE_KEYS.ALBUMS(userId));
  router.push('/library');
};
```

**Approach 2:** Use router events to detect navigation

**File:** `client/src/components/library/MyAlbumsSection.tsx`

```typescript
useEffect(() => {
  // Re-fetch albums when component mounts
  // This will happen when navigating back
  fetchAlbums();
}, []);
```

### Solution 9: Add Album Playback Controls

**File:** `client/src/app/library/albums/[id]/page.tsx`

**Implementation:**

```typescript
import { usePlayback } from '@/contexts/PlaybackContext';

export default function AlbumDetailPage() {
  const { playPlaylist } = usePlayback();
  
  // Play entire album
  const handlePlayAlbum = () => {
    if (!album?.tracks) return;
    
    const tracks = album.tracks
      .sort((a, b) => a.position - b.position)
      .map(at => at.track);
    
    playPlaylist(tracks, 0);
  };
  
  // Play specific track
  const handlePlayTrack = (index: number) => {
    if (!album?.tracks) return;
    
    const tracks = album.tracks
      .sort((a, b) => a.position - b.position)
      .map(at => at.track);
    
    playPlaylist(tracks, index);
  };
  
  return (
    <div>
      {/* Album Header */}
      <div className="flex items-center gap-4 mb-8">
        <h1>{album.name}</h1>
        <button
          onClick={handlePlayAlbum}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span>Play Album</span>
        </button>
      </div>
      
      {/* Track List */}
      <div className="space-y-2">
        {album.tracks.map((albumTrack, index) => (
          <div key={albumTrack.id} className="flex items-center gap-4 p-3 hover:bg-gray-800 rounded-lg">
            <span className="text-gray-400 w-8">{albumTrack.position}</span>
            
            <button
              onClick={() => handlePlayTrack(index)}
              className="w-10 h-10 rounded-full bg-gray-700 hover:bg-blue-600 flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            
            <div className="flex-1">
              <p className="font-medium">{albumTrack.track.title}</p>
              <p className="text-sm text-gray-400">{albumTrack.track.user?.username}</p>
            </div>
            
            <span className="text-gray-400">{formatDuration(albumTrack.track.duration)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```



### Solution 10: Fix My Playlists Section Layout

**File:** `client/src/app/library/page.tsx`

**10a & 10b: Remove wrapper box and add collapse button**

```typescript
// BEFORE
<div className="mb-8" ref={playlistsRef}>
  <PlaylistsSectionErrorBoundary>
    {shouldLoadPlaylists ? (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📝</span>
            <span>My Playlists</span>
          </h2>
        </div>
        <PlaylistsList />
      </div>
    ) : (
      // skeleton
    )}
  </PlaylistsSectionErrorBoundary>
</div>

// AFTER
<div className="mb-8" ref={playlistsRef}>
  <PlaylistsSectionErrorBoundary>
    {shouldLoadPlaylists ? (
      <div className="mb-12">
        {/* Section Header with Collapse Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaylistsCollapsed(!isPlaylistsCollapsed)}
              className="p-3 md:p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={isPlaylistsCollapsed ? 'Expand section' : 'Collapse section'}
            >
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isPlaylistsCollapsed ? 'rotate-0' : 'rotate-90'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📝</span>
              <span>My Playlists</span>
            </h2>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isPlaylistsCollapsed && (
          <div className="transition-all duration-300">
            <PlaylistsList />
          </div>
        )}
      </div>
    ) : (
      // skeleton
    )}
  </PlaylistsSectionErrorBoundary>
</div>
```

Add state for collapse:
```typescript
const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(false);
```

**10c: Update "Back to Playlists" button**

**File:** Find playlist details page (likely `client/src/app/playlists/[id]/page.tsx`)

```typescript
// BEFORE
<Link href="/playlists" className="...">
  ← Back to Playlists
</Link>

// AFTER
<Link href="/library" className="...">
  ← Back to Library
</Link>
```

## Testing Strategy

### Unit Tests
- Test lazy loading logic with mocked Intersection Observer
- Test stats calculation with various data scenarios
- Test track card play button integration
- Test playlist add/remove logic

### Integration Tests
- Test page refresh and back navigation
- Test track upload with all required fields
- Test track deletion with posts cleanup
- Test album edit and cache invalidation

### Manual Testing Checklist
- [ ] Refresh /library page - all sections load
- [ ] Navigate back to /library - all sections load
- [ ] Upload track - succeeds without errors
- [ ] Delete track - succeeds without errors
- [ ] Add track to playlist - works
- [ ] Remove track from playlist - works
- [ ] Edit album - updates card without refresh
- [ ] Play track from card - mini player starts
- [ ] Play album - all tracks queue correctly
- [ ] Long album description - no overflow
- [ ] Collapse/expand playlists section - works

## Success Metrics

- Zero 404 errors on album edit
- Zero database constraint errors on track operations
- 100% section load success rate on page refresh
- All track card actions functional
- Consistent UI across all sections

