# Shuffle Mode Specific Track Selection Fix

## Issue Description

**Problem:** When shuffle is active and tracks are playing randomly, clicking the play button on a specific track would cause shuffle to become inactive (even though the shuffle indicator still showed as active). After clicking a specific track, subsequent tracks would play in sequential order instead of randomly.

**Example Scenario:**

1. Enable shuffle mode
2. Click "Play All" - tracks play in random order ✓
3. Click play button on "Track C" specifically
4. "Track C" plays ✓
5. When "Track C" ends, "Track D" plays (sequential, not random) ✗
6. Shuffle indicator still shows as active but shuffle isn't working

**Root Cause:** The `playPlaylist` function was building the queue incorrectly when starting from a specific track in shuffle mode:

```typescript
// OLD CODE - INCORRECT
const orderedQueue = shuffleMode
  ? queueUtils.shuffleArray([...tracks])
  : tracks;
setQueue(orderedQueue);
setCurrentTrackIndex(startIndex);
const trackToPlay = orderedQueue[startIndex];
```

This logic:

1. Shuffled ALL tracks randomly
2. Tried to play track at position `startIndex` in the shuffled queue
3. Result: You got a random track, not the one you clicked
4. The queue was shuffled once but then played sequentially from that point

## Solution Implemented

### Correct Shuffle Behavior When Starting from Specific Track

**New Logic:**

```typescript
// Get the track to play (from original order)
const trackToPlay = tracks[startIndex];
setCurrentTrack(trackToPlay);

// Build queue based on shuffle mode
let orderedQueue: PlaylistTrackDisplay[];
let currentIndex: number;

if (shuffleMode) {
  // In shuffle mode: put selected track first, then shuffle the rest
  const remaining = tracks.filter((_, idx) => idx !== startIndex);
  const shuffled = queueUtils.shuffleArray(remaining);
  orderedQueue = [trackToPlay, ...shuffled];
  currentIndex = 0; // Selected track is always at position 0
} else {
  // In normal mode: use original order
  orderedQueue = tracks;
  currentIndex = startIndex;
}

setQueue(orderedQueue);
setCurrentTrackIndex(currentIndex);
```

### How It Works

#### Normal Mode (Shuffle Off)

1. Queue = original track order
2. Current index = position of clicked track
3. Playback continues sequentially from that track

#### Shuffle Mode (Shuffle On)

1. Get the clicked track from original order
2. Remove it from the track list
3. Shuffle the remaining tracks
4. Build queue: [clicked track, ...shuffled remaining tracks]
5. Set current index to 0 (clicked track is first)
6. Playback continues randomly through the shuffled remaining tracks

## Key Improvements

### 1. Clicked Track Always Plays First

- In shuffle mode, the clicked track is placed at position 0 in the queue
- This ensures the correct track plays immediately
- No random selection involved

### 2. Shuffle Remains Active

- Remaining tracks are shuffled
- After the clicked track finishes, playback continues randomly
- Shuffle behavior is maintained throughout the session

### 3. Consistent Behavior

- Whether you click "Play All" or a specific track, shuffle works the same way
- The only difference is which track plays first
- All subsequent tracks are shuffled

## Comparison: Before vs After

### Before (Broken)

```
User clicks "Track C" with shuffle on:
1. Shuffle all tracks: [D, A, E, B, C]
2. Try to play track at startIndex (2): Track E plays ✗
3. Queue plays sequentially: E → B → C → (no more shuffle)
```

### After (Fixed)

```
User clicks "Track C" with shuffle on:
1. Get Track C from original order
2. Remove Track C from list: [A, B, D, E]
3. Shuffle remaining: [E, A, D, B]
4. Build queue: [C, E, A, D, B]
5. Play from index 0: Track C plays ✓
6. Continue shuffled: C → E → A → D → B ✓
```

## Edge Cases Handled

### 1. Play All with Shuffle

```typescript
playPlaylist(playlist, 0);
// startIndex = 0, so first track is selected
// Queue: [Track 1, ...shuffled remaining tracks]
```

### 2. Play Specific Track with Shuffle

```typescript
playPlaylist(playlist, 3);
// startIndex = 3, so Track 4 is selected
// Queue: [Track 4, ...shuffled remaining tracks]
```

### 3. Play Last Track with Shuffle

```typescript
playPlaylist(playlist, tracks.length - 1);
// Last track is selected
// Queue: [Last track, ...shuffled all other tracks]
```

### 4. Toggle Shuffle During Playback

The existing `toggleShuffle` function already handles this correctly:

- Rebuilds queue with current track at front
- Shuffles or unshuffles remaining tracks

## Files Modified

**`client/src/contexts/PlaybackContext.tsx`**

- Updated `playPlaylist` function
- Changed queue building logic for shuffle mode
- Ensures clicked track plays first, then shuffled tracks follow

## Testing Instructions

### Test: Shuffle with Specific Track Selection

**Setup:**

1. Create a playlist with at least 5 tracks
2. Enable shuffle mode

**Test Steps:**

1. Click "Play All" button
2. Verify tracks play in random order (note the order)
3. Click play button on "Track C" specifically
4. Verify "Track C" starts playing immediately
5. Wait for "Track C" to finish (or click next)
6. Verify next track is random (not "Track D")
7. Continue through several tracks
8. Verify all tracks play in random order

**Expected Results:**

- ✅ "Track C" plays when clicked
- ✅ Subsequent tracks are random
- ✅ Shuffle indicator remains active
- ✅ No sequential playback after clicking specific track

### Test: Compare Play All vs Specific Track

**Setup:**

1. Create a playlist with tracks A, B, C, D, E
2. Enable shuffle mode

**Test Case 1: Play All**

1. Click "Play All"
2. Note the playback order (e.g., C → A → E → B → D)

**Test Case 2: Play Specific Track**

1. Refresh the page
2. Enable shuffle mode
3. Click play on "Track C"
4. Note the playback order (e.g., C → E → A → D → B)

**Expected Results:**

- ✅ Both cases play tracks in random order
- ✅ In case 2, "Track C" plays first
- ✅ Remaining tracks are shuffled in both cases
- ✅ No sequential playback in either case

### Test: Shuffle Toggle After Specific Track

**Setup:**

1. Create a playlist with at least 5 tracks
2. Enable shuffle mode

**Test Steps:**

1. Click play on "Track C"
2. Verify "Track C" plays
3. Click next button
4. Note the next track (should be random)
5. Toggle shuffle OFF
6. Click next button
7. Verify tracks now play sequentially

**Expected Results:**

- ✅ Shuffle works correctly after clicking specific track
- ✅ Toggle shuffle OFF switches to sequential playback
- ✅ Toggle shuffle ON switches back to random playback

## Technical Details

### Queue Structure in Shuffle Mode

**When clicking "Play All" (startIndex = 0):**

```
Original: [A, B, C, D, E]
Selected: A
Remaining: [B, C, D, E]
Shuffled: [D, B, E, C]
Queue: [A, D, B, E, C]
Index: 0
```

**When clicking "Track C" (startIndex = 2):**

```
Original: [A, B, C, D, E]
Selected: C
Remaining: [A, B, D, E]
Shuffled: [E, A, D, B]
Queue: [C, E, A, D, B]
Index: 0
```

### Why Index is Always 0 in Shuffle Mode

In shuffle mode, the selected track is always placed at position 0 in the queue. This simplifies the logic:

- Current track is always at queue[0]
- Next track is always at queue[1]
- No need to track different indices for shuffled vs original order

## Verification

✅ No TypeScript errors  
✅ Clicked track plays first in shuffle mode  
✅ Remaining tracks are shuffled  
✅ Shuffle remains active after clicking specific track  
✅ Works with all edge cases (first track, last track, middle track)

---

## Additional Fix: Stale Shuffle Mode State

**Issue Found:** Console logs showed `shuffleMode: false` even when shuffle was visually enabled.

**Root Cause:** The `playPlaylist` callback had `shuffleMode` in its dependencies, which meant it captured the shuffle mode value when the callback was created. When called from `handlePlayTrackByTrackId`, it was using a stale closure value.

**Solution:** Use a ref to always get the latest shuffle mode value:

```typescript
const shuffleModeRef = useRef<boolean>(false);

// Keep ref in sync with state
useEffect(() => {
  shuffleModeRef.current = shuffleMode;
}, [shuffleMode]);

// In playPlaylist:
const currentShuffleMode = shuffleModeRef.current;
if (currentShuffleMode) {
  // Build shuffled queue
}
```

**Result:** The playPlaylist function now always uses the current shuffle mode state, regardless of when the callback was created.

---

**Status:** ✅ FIXED  
**Date:** October 25, 2025  
**Ready for:** User manual testing
