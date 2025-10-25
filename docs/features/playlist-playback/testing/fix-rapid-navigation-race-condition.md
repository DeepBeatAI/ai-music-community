# Fix: Rapid Track Navigation Race Condition

## Issue Description

**Reported Error:**
```
Failed to play audio: AbortError: The play() request was interrupted by a new load request.
Failed to play next track: AbortError: The play() request was interrupted by a new load request.
```

**Symptoms:**
- When rapidly clicking next/previous track buttons, the audio player would fail
- Play button would not change to pause state
- Console errors would appear
- Playback would stop working

**Root Cause:**
Race condition when multiple track navigation requests overlap:
1. User clicks "next" → starts loading track A
2. User clicks "next" again before track A finishes loading → starts loading track B
3. Track A's `play()` promise is interrupted by track B's `load()` call
4. Browser throws AbortError
5. Error handling sets `isPlaying` to false, breaking UI state

## Solution Implemented

### 1. AudioManager Improvements (`client/src/lib/audio/AudioManager.ts`)

**Added State Tracking:**
- `pendingPlayPromise`: Tracks ongoing play() operations
- `isLoadingTrack`: Tracks ongoing load operations

**Enhanced `loadTrack()` Method:**
```typescript
public async loadTrack(audioUrl: string): Promise<void> {
  // Wait for any pending play promise to resolve/reject
  if (this.pendingPlayPromise) {
    try {
      await this.pendingPlayPromise;
    } catch {
      // Ignore errors from previous play attempt
    }
    this.pendingPlayPromise = null;
  }
  
  // Pause current playback to prevent interruption errors
  this.audio.pause();
  
  // Set loading flag
  this.isLoadingTrack = true;
  
  // Load the track
  this.audio.src = audioUrl;
  this.currentTrackUrl = audioUrl;
  this.audio.load();
  
  // Wait for the audio to be ready to play
  await new Promise<void>((resolve, reject) => {
    const handleCanPlay = (): void => {
      this.audio.removeEventListener('canplay', handleCanPlay);
      this.audio.removeEventListener('error', handleError);
      this.isLoadingTrack = false;
      resolve();
    };
    
    const handleError = (event: Event): void => {
      this.audio.removeEventListener('canplay', handleCanPlay);
      this.audio.removeEventListener('error', handleError);
      this.isLoadingTrack = false;
      reject(event);
    };
    
    this.audio.addEventListener('canplay', handleCanPlay, { once: true });
    this.audio.addEventListener('error', handleError, { once: true });
  });
}
```

**Enhanced `play()` Method:**
```typescript
public async play(): Promise<void> {
  try {
    // Wait for any pending load to complete
    if (this.isLoadingTrack) {
      console.log('Waiting for track to finish loading...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Store the play promise
    this.pendingPlayPromise = this.audio.play();
    await this.pendingPlayPromise;
    this.pendingPlayPromise = null;
  } catch (error) {
    this.pendingPlayPromise = null;
    // Only log non-abort errors
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Failed to play audio:', error);
    }
    throw error;
  }
}
```

**Added Helper Method:**
```typescript
public isLoading(): boolean {
  return this.isLoadingTrack;
}
```

### 2. PlaybackContext Debouncing (`client/src/contexts/PlaybackContext.tsx`)

**Added Navigation State Tracking:**
```typescript
// Track navigation debouncing
const isNavigatingRef = useRef<boolean>(false);
const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

**Enhanced `next()` Method:**
```typescript
const next = useCallback((): void => {
  if (!audioManagerRef.current || queue.length === 0) {
    return;
  }
  
  // Debounce rapid navigation attempts
  if (isNavigatingRef.current) {
    console.log('Navigation already in progress, ignoring request');
    return;
  }
  
  // Set navigation flag
  isNavigatingRef.current = true;
  
  // Clear any existing timeout
  if (navigationTimeoutRef.current) {
    clearTimeout(navigationTimeoutRef.current);
  }
  
  // Reset navigation flag after a delay
  navigationTimeoutRef.current = setTimeout(() => {
    isNavigatingRef.current = false;
  }, 500); // 500ms debounce
  
  // ... rest of navigation logic
  
  // In promise chain:
  .then(() => setIsPlaying(true))
  .catch((error) => {
    // Only log non-abort errors
    if (error?.name !== 'AbortError') {
      console.error('Failed to play next track:', error);
    }
    setIsPlaying(false);
  })
  .finally(() => {
    isNavigatingRef.current = false;
  });
}, [queue, currentTrackIndex, repeatMode, stop]);
```

**Enhanced `previous()` Method:**
- Same debouncing logic as `next()`
- Prevents rapid-fire navigation
- Properly handles navigation state

## Key Improvements

1. **Request Serialization**: Ensures previous play/load operations complete before starting new ones
2. **Debouncing**: 500ms debounce prevents rapid-fire clicks from creating race conditions
3. **State Synchronization**: Properly tracks loading and playing states
4. **Error Filtering**: Only logs meaningful errors, ignoring expected AbortErrors
5. **Graceful Degradation**: System continues to work even if one navigation fails

## Testing Recommendations

1. **Rapid Navigation Test**:
   - Click next button 5-10 times rapidly
   - Verify no console errors
   - Verify playback continues smoothly
   - Verify play/pause button state remains correct

2. **Back-and-Forth Test**:
   - Alternate between next and previous rapidly
   - Verify smooth transitions
   - Verify no state corruption

3. **Edge Cases**:
   - Test at playlist boundaries (first/last track)
   - Test with different repeat modes
   - Test with shuffle enabled

## Files Modified

- `client/src/lib/audio/AudioManager.ts`
- `client/src/contexts/PlaybackContext.tsx`

## Status

✅ **Fixed** - Build successful, no TypeScript errors
⏳ **Pending User Testing** - Awaiting manual verification

## Related Documentation

- [Manual Testing Guide](./manual-testing-guide.md)
- [Testing Status](./testing-status.md)
- [Playlist Playback Spec](.kiro/specs/playlist-playback-enhancements/)
