# Fix: Playlist Badge Not Updating Immediately

## Issue
On the /library page, when adding a track to a playlist via the track card's "Add to Playlist" button, the playlist badge on the track card did not appear immediately. A page refresh was required to see the updated badge.

## Root Cause
The AllTracksSection component was not listening for cache invalidation events. When a track was added to a playlist:

1. The AddToPlaylistModal would save changes to the database
2. TrackCardWithActions would invalidate the cache
3. TrackCardWithActions would do an optimistic update to the track state
4. However, AllTracksSection would not refetch the data because it wasn't listening for cache invalidation events

The optimistic update was happening, but it was using the data from the modal's selected playlists, which might not match the actual database state if there were any issues during the save operation.

## Solution
Added a cache invalidation event listener to AllTracksSection that:

1. Listens for 'cache-invalidated' events from the cache utility
2. Checks if the invalidated key matches the TRACKS cache key for the current user
3. Refetches tracks from the database when the cache is invalidated

This ensures that when a track is added to or removed from a playlist:
- The cache is invalidated first (emitting an event)
- The optimistic update happens
- AllTracksSection hears the event and refetches fresh data
- The track card displays the updated playlist badge immediately

## Files Modified

### client/src/components/library/AllTracksSection.tsx
- Added useEffect hook to listen for 'cache-invalidated' events
- Refetches tracks when TRACKS cache is invalidated

### client/src/components/library/TrackCardWithActions.tsx
- Reordered operations in handlePlaylistSuccess to invalidate cache BEFORE optimistic update
- This ensures the cache invalidation event is emitted before the UI updates

### client/src/components/library/AddToPlaylistModal.tsx
- Reordered success message building to happen before onSuccess callback
- This ensures the UI flow is more logical

## Testing
To verify the fix:

1. Navigate to /library page
2. Find a track card
3. Click the three-dot menu and select "Add to Playlist"
4. Select one or more playlists
5. Click "Save"
6. Verify that the playlist badge appears immediately on the track card without requiring a page refresh

## Related Requirements
- Requirement 9.4: Implement optimistic UI updates for non-destructive operations
- Requirement 9.5: Implement rollback logic for failed optimistic updates
- Requirement 3.12: Display album and playlist membership badges on track cards

## Date Fixed
2025-01-03
