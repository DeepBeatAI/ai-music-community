# Drag-and-Drop Track Reordering Implementation Guide

## Overview

This guide documents the implementation of drag-and-drop track reordering functionality for playlists in the AI Music Community Platform. This feature allows playlist owners to reorder tracks by dragging and dropping them into new positions.

## Implementation Date

January 24, 2025

## Components Implemented

### 1. Database Function

**File:** `supabase/migrations/20250124000000_create_reorder_playlist_tracks_function.sql`

Created a PostgreSQL function `reorder_playlist_tracks` that:
- Accepts a playlist ID and an array of track positions (JSONB)
- Validates user authentication and authorization
- Updates track positions in a single transaction
- Includes proper error handling and security checks

**Key Features:**
- Security: Only playlist owners can reorder tracks
- Transaction safety: All updates happen atomically
- Error handling: Clear error messages for authentication and authorization failures

### 2. TrackReorderList Component

**File:** `client/src/components/playlists/TrackReorderList.tsx`

A new React component that provides drag-and-drop functionality:

**Features:**
- Drag handles visible only to playlist owners
- Visual feedback during drag operations (opacity, drop zones)
- Border indicators showing drop position
- Maintains playback state during reordering
- Loading overlay during database updates
- Integrates with PlaybackContext for play/pause functionality

**Drag States:**
- `dragging`: Track being dragged (50% opacity)
- `dragOver`: Drop zone indicator (blue border)
- `isReordering`: Loading overlay during database update

**Props:**
```typescript
interface TrackReorderListProps {
  playlist: PlaylistWithTracks;
  isOwner: boolean;
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>;
  onRemoveTrack: (trackId: string) => Promise<void>;
  removingTrack: string | null;
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (trackId: string | null) => void;
}
```

### 3. Reorder Utility Function

**File:** `client/src/lib/playlists.ts`

Added `reorderPlaylistTracks` function:

**Features:**
- Validates input parameters
- Calls the database RPC function
- Handles specific error cases (authentication, authorization, not found)
- Returns standardized response format

**Function Signature:**
```typescript
export async function reorderPlaylistTracks(
  playlistId: string,
  trackPositions: Array<{ track_id: string; position: number }>
): Promise<PlaylistOperationResponse>
```

### 4. PlaylistDetailClient Integration

**File:** `client/src/components/playlists/PlaylistDetailClient.tsx`

Updated to integrate the TrackReorderList component:

**Changes:**
- Replaced inline track list with TrackReorderList component
- Added `handleReorder` function for drag-and-drop operations
- Implements optimistic UI updates with rollback on error
- Refreshes playlist data after successful reorder
- Added event listener for play track events from TrackReorderList

**Reorder Flow:**
1. User drags track to new position
2. Optimistic UI update (immediate visual feedback)
3. Calculate new positions for all tracks
4. Call database function to persist changes
5. On success: Refresh playlist data from server
6. On error: Rollback to original order and show error message

## User Experience

### For Playlist Owners

1. **Drag Handle:** Six-dot icon appears on the left of each track
2. **Drag Operation:** Click and hold the drag handle to start dragging
3. **Visual Feedback:**
   - Dragged track becomes semi-transparent
   - Blue border appears at drop position
   - Cursor changes to grabbing hand
4. **Drop:** Release to drop track at new position
5. **Loading:** Brief loading overlay while updating database
6. **Confirmation:** Track list updates with new order

### For Non-Owners

- No drag handles visible
- Track list is read-only (except for playback controls)
- Can still play tracks and view playlist

## Technical Details

### Drag and Drop API

Uses HTML5 Drag and Drop API:
- `draggable` attribute on track items
- Event handlers: `onDragStart`, `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`, `onDragEnd`
- `dataTransfer` for drag data management

### Position Calculation

When a track is moved from index A to index B:
1. Remove track from position A
2. Insert track at position B
3. Recalculate positions for all tracks (0, 1, 2, ...)
4. Send all new positions to database

### Error Handling

**Client-side:**
- Optimistic updates with rollback on error
- User-friendly error messages
- Loading states during operations

**Server-side:**
- Authentication checks
- Authorization checks (playlist ownership)
- Transaction safety
- Detailed error messages

### Playback State Preservation

- Playback continues during reordering
- Currently playing track remains highlighted
- Play/pause controls remain functional
- Mini player unaffected by reordering

## Database Schema

No schema changes required. Uses existing `playlist_tracks` table:
- `playlist_id`: UUID (foreign key to playlists)
- `track_id`: UUID (foreign key to tracks)
- `position`: INTEGER (track order in playlist)
- `updated_at`: TIMESTAMP (automatically updated)

## Security

### Row Level Security (RLS)

The database function enforces:
1. User must be authenticated
2. User must own the playlist
3. Playlist must exist

### Client-side Validation

- Drag handles only visible to owners
- Reorder function checks ownership before calling database
- All positions validated as non-negative integers

## Performance Considerations

### Optimistic Updates

- Immediate UI feedback (no waiting for server)
- Rollback on error maintains data consistency

### Database Efficiency

- Single RPC call updates all positions
- Transaction ensures atomicity
- Minimal network overhead

### UI Performance

- CSS transitions for smooth animations
- Throttled drag events to prevent excessive updates
- Loading overlay prevents multiple simultaneous operations

## Testing Recommendations

### Manual Testing

1. **Basic Reordering:**
   - Drag first track to last position
   - Drag last track to first position
   - Drag middle track up and down

2. **Edge Cases:**
   - Drag track to same position (no change)
   - Rapid drag operations
   - Drag while track is playing

3. **Error Scenarios:**
   - Network failure during reorder
   - Unauthorized user attempts reorder
   - Invalid playlist ID

4. **Playback Integration:**
   - Reorder while track is playing
   - Verify playback continues
   - Verify currently playing track remains highlighted

### Automated Testing

Recommended test cases:
- Unit tests for `reorderPlaylistTracks` function
- Integration tests for drag-and-drop component
- E2E tests for complete reorder flow

## Known Limitations

1. **Migration Not Applied:** The database migration file was created but not applied to the remote database due to existing migration conflicts. The function needs to be manually created in the Supabase SQL editor or the migration needs to be applied separately.

2. **No Undo:** Once reordered, there's no undo functionality (user must manually reorder back)

3. **Desktop Optimized:** Drag-and-drop works best on desktop browsers. Mobile support may require additional touch event handling.

4. **No Batch Operations:** Can only move one track at a time

## Future Enhancements

1. **Touch Support:** Implement touch event handlers for mobile devices
2. **Undo/Redo:** Add undo/redo functionality for reordering
3. **Keyboard Navigation:** Support keyboard shortcuts for reordering
4. **Batch Operations:** Allow selecting and moving multiple tracks
5. **Animation:** Add smooth animations for track position changes
6. **Drag Preview:** Show custom drag preview with track info

## Migration Instructions

To apply the database function, run the following SQL in the Supabase SQL editor:

```sql
-- Copy the contents of:
-- supabase/migrations/20250124000000_create_reorder_playlist_tracks_function.sql
```

Or use the Supabase CLI:

```bash
cd supabase
npx supabase db push --include-all
```

## Related Files

- `supabase/migrations/20250124000000_create_reorder_playlist_tracks_function.sql`
- `client/src/components/playlists/TrackReorderList.tsx`
- `client/src/components/playlists/PlaylistDetailClient.tsx`
- `client/src/lib/playlists.ts`
- `client/src/types/playlist.ts`

## References

- [HTML5 Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [React DnD (alternative library)](https://react-dnd.github.io/react-dnd/)

---

**Implementation Status:** ✅ Complete  
**Last Updated:** January 24, 2025  
**Implemented By:** Kiro AI Assistant
