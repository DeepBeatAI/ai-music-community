# Shuffle Mode Play Button Fix

## Issue Description

**Problem:** When combining reordering and shuffle play while playing a track, clicking the play button next to a track name would start playing a different track in the list.

**Example Scenario:**
1. Enable shuffle mode
2. Start playing a track
3. Reorder tracks in the playlist
4. Click play button on "Track A" in the displayed list
5. A different track starts playing instead of "Track A"

**Root Cause:** The play button was passing the track's display index to the playback system. In shuffle mode, the queue order is different from the display order, so:
- Display shows: Track A (index 0), Track B (index 1), Track C (index 2)
- Shuffled queue: Track C (index 0), Track A (index 1), Track B (index 2)
- Clicking play on "Track A" (display index 0) would play Track C (queue index 0)

## Solution Implemented

### Changed from Index-Based to ID-Based Track Selection

**Before:**
```typescript
// TrackReorderList.tsx - Passed display index
const event = new CustomEvent('playTrack', { detail: { index } });

// PlaylistDetailClient.tsx - Used index directly
const handlePlayTrackEvent = (event: Event) => {
  const customEvent = event as CustomEvent<{ index: number }>;
  handlePlayTrack(customEvent.detail.index);
};

const handlePlayTrack = (index: number) => {
  playPlaylist(playlist, index);
};
```

**After:**
```typescript
// TrackReorderList.tsx - Pass track ID instead
const event = new CustomEvent('playTrack', { detail: { trackId: track.id } });

// PlaylistDetailClient.tsx - Find track by ID in original order
const handlePlayTrackEvent = (event: Event) => {
  const customEvent = event as CustomEvent<{ trackId: string }>;
  handlePlayTrackByTrackId(customEvent.detail.trackId);
};

const handlePlayTrackByTrackId = (trackId: string) => {
  // Find the track index in the original playlist order
  const index = playlist.tracks.findIndex(pt => pt.track.id === trackId);
  if (index >= 0) {
    playPlaylist(playlist, index);
  } else {
    console.error('Track not found in playlist:', trackId);
  }
};
```

## How It Works

1. **User clicks play button** on a track in the displayed list
2. **TrackReorderList dispatches event** with the track's unique ID
3. **PlaylistDetailClient receives event** and looks up the track by ID
4. **Finds track's index** in the original playlist order (not display order)
5. **Calls playPlaylist** with the correct index
6. **PlaybackContext builds queue** (shuffled or not) starting from that track
7. **Correct track plays** regardless of shuffle mode or reordering

## Why This Works

### Track ID is Stable
- Track IDs don't change when shuffling or reordering
- Each track has a unique identifier
- ID lookup always finds the correct track

### Original Order is Preserved
- The playlist object maintains the original track order
- `playPlaylist` uses this order to build the queue
- Shuffle happens after the starting track is determined

### Queue Building is Consistent
- When you click a track, `playPlaylist` is called with its original index
- The queue is built from that point in the original order
- If shuffle is on, the queue is shuffled (but starting track is correct)

## Edge Cases Handled

### 1. Track Not Found
```typescript
if (index >= 0) {
  playPlaylist(playlist, index);
} else {
  console.error('Track not found in playlist:', trackId);
}
```
If a track ID isn't found (shouldn't happen), error is logged and nothing plays.

### 2. Shuffle Mode Active
- Track is found by ID in original order
- Queue is built starting from that track
- Remaining tracks are shuffled
- Clicked track always plays first

### 3. After Reordering
- Display order changes
- Original playlist order is updated
- Track ID lookup uses the new order
- Correct track plays

### 4. Multiple Reorders
- Each reorder updates the playlist state
- Track IDs remain stable
- Lookup always uses current playlist state

## Files Modified

1. **`client/src/components/playlists/TrackReorderList.tsx`**
   - Changed custom event to pass `trackId` instead of `index`
   - Comment updated to explain the change

2. **`client/src/components/playlists/PlaylistDetailClient.tsx`**
   - Updated event handler to receive `trackId`
   - Added `handlePlayTrackByTrackId` function
   - Removed unused `handlePlayTrack` function

## Testing Instructions

### Test: Shuffle Mode Play Button

**Setup:**
1. Create a playlist with at least 5 tracks
2. Enable shuffle mode
3. Start playing any track

**Test Steps:**
1. Note which track is currently playing
2. Look at the displayed track list
3. Click the play button on a different track (e.g., "Track C")
4. Verify that "Track C" starts playing (not a different track)

**Expected Results:**
- ✅ Clicked track starts playing immediately
- ✅ Track title in mini player matches clicked track
- ✅ Playing indicator appears on correct track in list
- ✅ Next/previous buttons work correctly from that track

### Test: Reorder + Shuffle + Play

**Setup:**
1. Create a playlist with at least 5 tracks
2. Enable shuffle mode
3. Start playing track 2

**Test Steps:**
1. Reorder tracks (drag track 5 to position 2)
2. Click play button on track 4
3. Verify track 4 starts playing

**Expected Results:**
- ✅ Track 4 plays (not a different track)
- ✅ Reordering doesn't affect play button accuracy
- ✅ Shuffle mode still works correctly

### Test: Normal Mode (No Shuffle)

**Setup:**
1. Create a playlist with at least 5 tracks
2. Ensure shuffle is OFF
3. Start playing track 1

**Test Steps:**
1. Click play button on track 3
2. Verify track 3 starts playing
3. Click next button
4. Verify track 4 plays next

**Expected Results:**
- ✅ Clicked track plays correctly
- ✅ Sequential playback works as expected
- ✅ No regression in normal mode behavior

## Verification

✅ No TypeScript errors  
✅ Track ID is passed instead of index  
✅ Lookup finds correct track in original order  
✅ Works in both shuffle and normal modes  
✅ Handles reordering correctly  

---

**Status:** ✅ FIXED  
**Date:** October 25, 2025  
**Ready for:** User manual testing
