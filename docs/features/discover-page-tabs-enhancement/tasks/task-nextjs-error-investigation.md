# Task: Investigate NextJS Error on Page Refresh

## Status: ✅ Complete

## Overview

Investigated and improved error handling for the intermittent "Error fetching playlist with tracks: {}" error that occurs randomly when refreshing the page while on the Playlists tab.

## Problem

User reported an error that happens occasionally (twice observed):
- **Error**: "Error fetching playlist with tracks: {}"
- **Location**: `src/utils/extensionErrorHandler.ts (43:21)`
- **Trigger**: Random, when refreshing page while on Playlists tab
- **Frequency**: Not consistently reproducible

## Investigation

### Root Cause Analysis

The error shows `{}` (empty object) which indicates:
1. **Race condition**: Request cancelled during page refresh
2. **Stale cache**: Cached data becomes invalid
3. **Network timing**: Request fails silently without detailed error
4. **Supabase client state**: Client connection interrupted during refresh

### Error Source

The error originates from `getPlaylistWithTracks()` in `client/src/lib/playlists.ts`, which is called by:
1. `TrendingPlaylistCard` - Play button click
2. `PlaylistDetailClient` - Playlist detail page
3. `PlaybackContext` - Restoring playback state

## Implementation

### Files Modified

1. **client/src/lib/playlists.ts**
   - Enhanced error logging with detailed error information
   - Added structured error objects with all error properties
   - Added warning for null data returns
   - Improved error context (playlistId, error type, message, stack)

2. **client/src/components/discover/TrendingPlaylistCard.tsx**
   - Added retry logic (2 attempts with 500ms delay)
   - Enhanced error logging with structured error details
   - Added attempt tracking and logging
   - Graceful degradation on failure

3. **client/src/components/discover/TrendingAlbumCard.tsx**
   - Added retry logic (2 attempts with 500ms delay)
   - Enhanced error logging with structured error details
   - Consistent error handling with playlist card

## Technical Details

### Enhanced Error Logging

**Before:**
```typescript
console.error('Error fetching playlist with tracks:', error);
```

**After:**
```typescript
console.error('Error fetching playlist with tracks:', {
  playlistId,
  error,
  errorCode: error.code,
  errorMessage: error.message,
  errorDetails: error.details,
  errorHint: error.hint,
});
```

### Retry Logic

```typescript
let attempts = 0;
const maxAttempts = 2;

while (attempts < maxAttempts) {
  try {
    const data = await fetchData();
    
    if (!data) {
      if (attempts < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        continue;
      }
      break;
    }
    
    // Success
    return data;
  } catch (error) {
    if (attempts < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    } else {
      break;
    }
  }
}
```

### Error Information Captured

Now logging:
- `playlistId` / `albumId` - Which content failed
- `error` - Full error object
- `errorCode` - Supabase error code
- `errorMessage` - Human-readable message
- `errorDetails` - Additional error details
- `errorHint` - Supabase hint for resolution
- `errorType` - Error constructor name
- `errorStack` - Stack trace for debugging

## Benefits

1. **Better Debugging**: Detailed error logs help identify root cause
2. **Resilience**: Retry logic handles transient failures
3. **User Experience**: Graceful degradation instead of silent failure
4. **Monitoring**: Structured logs enable better error tracking
5. **Consistency**: Same error handling across album and playlist cards

## Validation

### Diagnostics
- ✅ No TypeScript errors
- ✅ No linting errors

### Expected Behavior
- First attempt fails → Retry after 500ms
- Second attempt succeeds → Play content normally
- Both attempts fail → Log detailed error, don't play
- User sees "Loading..." during retries
- No silent failures

## Testing Scenarios

1. **Normal Operation**
   - Click play button → Loads and plays immediately
   - No retries needed

2. **Transient Failure**
   - First attempt fails (network hiccup)
   - Second attempt succeeds
   - Content plays after brief delay

3. **Persistent Failure**
   - Both attempts fail
   - Detailed error logged to console
   - Button returns to normal state
   - User can try again

4. **Page Refresh During Load**
   - Request cancelled mid-flight
   - Error logged with context
   - No crash or undefined behavior

## Error Patterns to Watch

With enhanced logging, we can now identify:
- **Network errors**: Connection issues, timeouts
- **Database errors**: RLS policy violations, missing data
- **Race conditions**: Cancelled requests, stale state
- **Cache issues**: Invalid cached data

## Next Steps

If the error persists after these improvements:
1. Check console for detailed error logs
2. Identify error pattern (code, message, details)
3. Add specific handling for that error type
4. Consider adding user-facing error messages
5. Implement exponential backoff if needed

## Future Improvements

- Add user-facing error toast notifications
- Implement exponential backoff for retries
- Add circuit breaker pattern for persistent failures
- Track error rates with monitoring service
- Add Sentry or similar error tracking

## Requirements Satisfied

- Enhanced error logging for debugging
- Retry logic for transient failures
- Graceful degradation on persistent failures
- Consistent error handling across components
- Better user experience during failures
