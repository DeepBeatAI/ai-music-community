# Test 4.5 Playback During Reorder Fix

## Issue Description

**Problem:** When reordering tracks while a track is playing, the player would go to the original next song, not the new next song after reordering.

**Example Scenario:**
1. Playlist order: Track A, Track B, Track C, Track D
2. Currently playing: Track B
3. User drags Track D to position 2 (after Track B)
4. New order: Track A, Track B, Track D, Track C
5. When Track B finishes, player plays Track C (wrong!) instead of Track D (correct)

**Root Cause:** The PlaybackContext maintains an internal queue of tracks. When the playlist is reordered in PlaylistDetailClient, the context wasn't notified of the change, so it continued using the old queue order.

## Solution Implemented

### 1. Added `updatePlaylist` Function to PlaybackContext

**Purpose:** Allow external components to notify the context when a playlist's track order changes.

**Implementation:**
```typescript
/**
 * Update the active playlist (e.g., after reordering tracks)
 * Rebuilds the queue while maintaining the current track position
 */
const updatePlaylist = useCallback((playlist: PlaylistWithTracks): void => {
  // Only update if this is the currently active playlist
  if (!activePlaylist || activePlaylist.id !== playlist.id) {
    return;
  }
  
  // Update the playlist reference
  setActivePlaylist(playlist);
  
  // Extract tracks from updated playlist
  const tracks = playlist.tracks.map(pt => pt.track);
  
  // If we have a current track, rebuild the queue maintaining its position
  if (currentTrack) {
    if (shuffleMode) {
      // In shuffle mode, keep current track at front and shuffle the rest
      const remaining = tracks.filter(t => t.id !== currentTrack.id);
      const shuffled = queueUtils.shuffleArray(remaining);
      const newQueue = [currentTrack, ...shuffled];
      setQueue(newQueue);
      setCurrentTrackIndex(0);
    } else {
      // In normal mode, use the new order
      setQueue(tracks);
      // Find current track in the new order
      const newIndex = tracks.findIndex(t => t.id === currentTrack.id);
      if (newIndex >= 0) {
        setCurrentTrackIndex(newIndex);
      } else {
        // Current track was removed from playlist, stop playback
        console.warn('Current track no longer in playlist');
        stop();
      }
    }
  } else {
    // No current track, just rebuild the queue
    const newQueue = shuffleMode ? queueUtils.shuffleArray([...tracks]) : tracks;
    setQueue(newQueue);
  }
}, [activePlaylist, currentTrack, shuffleMode, stop]);
```

**Key Features:**
- Only updates if the playlist ID matches the active playlist
- Maintains current track position in the queue
- Handles both normal and shuffle modes correctly
- Stops playback if current track is removed from playlist
- Rebuilds queue with new track order

### 2. Updated PlaybackContext Interface

**Added to `PlaybackContextType`:**
```typescript
updatePlaylist: (playlist: PlaylistWithTracks) => void;
```

### 3. Updated PlaylistDetailClient

**Called after successful reorder:**
```typescript
// Refresh playlist data from server to ensure consistency
const refreshedPlaylist = await getPlaylistWithTracks(playlist.id);
if (refreshedPlaylist) {
  setPlaylist(refreshedPlaylist);
  // Update the playback context with the new playlist order
  updatePlaylist(refreshedPlaylist);
}
```

## Behavior Details

### Normal Mode (Shuffle Off)
- Queue is rebuilt with the new track order
- Current track index is updated to reflect its new position
- Next/previous navigation uses the new order

### Shuffle Mode
- Current track stays at the front of the queue
- Remaining tracks are reshuffled
- Maintains shuffle randomness while respecting the reorder

### Edge Cases Handled
1. **Playlist ID mismatch:** If a different playlist is active, update is ignored
2. **Current track removed:** If the playing track is removed during reorder, playback stops
3. **No active playback:** Queue is rebuilt but no track position needs updating

## Files Modified

1. **`client/src/contexts/PlaybackContext.tsx`**
   - Added `updatePlaylist` function
   - Updated `PlaybackContextType` interface
   - Added to context value and dependencies

2. **`client/src/components/playlists/PlaylistDetailClient.tsx`**
   - Imported `updatePlaylist` from usePlayback hook
   - Called `updatePlaylist` after successful reorder and refresh

## Testing Instructions

### Test 4.5: Playback During Reorder

**Setup:**
1. Create a playlist with at least 4 tracks
2. Start playing track 2

**Test Steps:**
1. While track 2 is playing, drag track 4 to position 3 (right after track 2)
2. Wait for track 2 to finish (or click next)
3. Verify that track 4 plays next (not track 3)

**Expected Results:**
- ✅ Track 4 plays after track 2 (respecting new order)
- ✅ Next button goes to track 4
- ✅ Previous button goes back to track 2
- ✅ Queue reflects the new order
- ✅ No playback interruption during reorder

**Additional Test Cases:**

**Test 4.5a: Reorder with Shuffle On**
1. Enable shuffle mode
2. Start playing a track
3. Reorder tracks
4. Verify next track is still random (not following old order)

**Test 4.5b: Remove Current Track**
1. Start playing a track
2. Remove that track from the playlist
3. Verify playback stops gracefully

**Test 4.5c: Reorder Different Playlist**
1. Start playing playlist A
2. Navigate to playlist B
3. Reorder tracks in playlist B
4. Verify playlist A playback is unaffected

## Verification

✅ No TypeScript errors  
✅ Function properly integrated into context  
✅ Called at the right time in the reorder flow  
✅ Handles all edge cases  

---

**Status:** ✅ FIXED  
**Date:** October 25, 2025  
**Ready for:** User manual testing
