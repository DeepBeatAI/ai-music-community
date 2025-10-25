# Fix: Repeat Track and End Behavior Issues

**Date:** January 25, 2025  
**Status:** ✅ FIXED

## Issues Fixed

### Issue 1: Repeat Track Doesn't Work ✅

**Problem:** When "Repeat Track" mode is enabled, the next track starts playing instead of repeating the current track.

**Root Cause:** 
The `handleEnded` event handler was created once in `useEffect` and captured the initial `repeatMode` value. When the user changed repeat mode, the handler still had the old value due to JavaScript closure.

**Solution:**
Use a ref to store the current repeat mode value, which can be accessed by the event handler:

```typescript
// Create ref to store current repeat mode
const repeatModeRef = useRef<RepeatMode>(repeatMode);

// Update ref when repeatMode changes
useEffect(() => {
  repeatModeRef.current = repeatMode;
}, [repeatMode]);

// In handleEnded, use the ref instead of the state
const handleEnded = (): void => {
  if (repeatModeRef.current === 'track' && audioManagerRef.current) {
    // Restart current track
    audioManagerRef.current.seek(0);
    audioManagerRef.current.play();
  } else if (nextRef.current) {
    // Move to next track
    nextRef.current();
  }
};
```

**Why This Works:**
- Refs maintain their current value across renders
- Event handlers can access the latest value via the ref
- No need to recreate the AudioManager on every repeat mode change

### Issue 2: Mini Player Closes After Final Track ✅

**Problem:** When the final track in a playlist finishes playing (with repeat off), the mini player closes completely instead of staying open in a paused state.

**Root Cause:**
The `next()` function was calling `stop()` when reaching the end of the playlist with repeat off. The `stop()` function clears all state including the active playlist, which causes the mini player to unmount.

**Solution:**
Instead of calling `stop()`, just pause playback and keep the playlist state:

**Before:**
```typescript
if (isLastTrack) {
  if (repeatMode === 'playlist') {
    // Restart playlist
  } else {
    stop(); // This closes the mini player!
    isNavigatingRef.current = false;
  }
}
```

**After:**
```typescript
if (isLastTrack) {
  if (repeatMode === 'playlist') {
    // Restart playlist
  } else {
    // Pause at end - keep mini player open
    if (audioManagerRef.current) {
      audioManagerRef.current.pause();
    }
    setIsPlaying(false);
    isNavigatingRef.current = false;
  }
}
```

**Benefits:**
- Mini player stays visible after playlist ends
- User can see what was playing
- User can easily restart playback or navigate tracks
- Consistent with typical music player behavior

## Technical Details

### Repeat Mode Ref Pattern

**State vs Ref:**
- **State (`repeatMode`)**: Used for UI rendering and React updates
- **Ref (`repeatModeRef`)**: Used by event handlers that need current value

**Synchronization:**
```typescript
// State for UI
const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

// Ref for event handlers
const repeatModeRef = useRef<RepeatMode>(repeatMode);

// Keep ref in sync with state
useEffect(() => {
  repeatModeRef.current = repeatMode;
}, [repeatMode]);
```

### End Behavior Comparison

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| Last track ends (repeat off) | Mini player closes | Mini player stays open, paused |
| Last track ends (repeat playlist) | Restarts from first track | Restarts from first track ✓ |
| Last track ends (repeat track) | Plays next track ❌ | Repeats current track ✓ |

## Testing Checklist

### Repeat Track Mode
- [x] TypeScript compilation passes
- [ ] Enable "Repeat Track" mode
- [ ] Play a track to completion
- [ ] Track restarts from beginning
- [ ] Track continues repeating
- [ ] Can manually skip to next track

### End Behavior
- [x] TypeScript compilation passes
- [ ] Play playlist to the end (repeat off)
- [ ] Mini player stays visible
- [ ] Playback is paused
- [ ] Can click play to restart last track
- [ ] Can navigate to previous tracks
- [ ] Can close mini player manually

### Repeat Playlist Mode
- [ ] Enable "Repeat Playlist" mode
- [ ] Play playlist to the end
- [ ] Playlist restarts from first track
- [ ] Continues playing automatically

## Files Modified

**`client/src/contexts/PlaybackContext.tsx`**

1. Added `repeatModeRef` to store current repeat mode
2. Added useEffect to sync ref with state
3. Updated `handleEnded` to use `repeatModeRef.current`
4. Changed end-of-playlist behavior from `stop()` to `pause()`
5. Removed `repeatMode` from AudioManager useEffect dependencies

## Code Changes Summary

```typescript
// Added ref for repeat mode
const repeatModeRef = useRef<RepeatMode>(repeatMode);

// Sync ref with state
useEffect(() => {
  repeatModeRef.current = repeatMode;
}, [repeatMode]);

// Use ref in event handler
const handleEnded = (): void => {
  if (repeatModeRef.current === 'track') {
    // Repeat current track
  } else {
    // Move to next
  }
};

// Pause instead of stop at end
if (isLastTrack && repeatMode !== 'playlist') {
  audioManagerRef.current?.pause();
  setIsPlaying(false);
  // Don't call stop() - keeps mini player open
}
```

## Verification

```bash
✅ npm run type-check  # 0 errors
✅ Build successful
```

## Related Documentation

- [Fix: Rapid Navigation Race Condition](./fix-rapid-navigation-race-condition.md)
- [Fix: State Restoration Error](./fix-state-restoration-error.md)
- [Manual Testing Guide](./manual-testing-guide.md)
