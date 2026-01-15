# Task: Implement Like Button Sync

## Status: ✅ Complete

## Overview

Implemented a global event system to synchronize like button state across multiple instances of the same album or playlist on the page. When a user likes/unlikes content, all like buttons for that content update simultaneously.

## Problem

When the same album or playlist appears in multiple sections (e.g., 7-day trending and all-time trending on the discover page), clicking the like button on one card doesn't update the other instances. Each card maintains its own local state for like count and liked status.

## Solution

Implemented a CustomEvent-based event emitter system that broadcasts like status changes globally. All like button instances listen for these events and update their state when they receive an event for their content.

## Implementation

### Files Created

1. **client/src/utils/likeEventEmitter.ts** (NEW)
   - Global event system using CustomEvent API
   - Type-safe event details with TypeScript interfaces
   - Clean subscription/unsubscription pattern

### Files Modified

1. **client/src/components/albums/AlbumLikeButton.tsx**
   - Added import for `emitLikeEvent` and `onLikeEvent`
   - Emits event after successful like/unlike
   - Listens for events from other instances
   - Updates local state when event matches album ID

2. **client/src/components/playlists/PlaylistLikeButton.tsx**
   - Added import for `emitLikeEvent` and `onLikeEvent`
   - Emits event after successful like/unlike
   - Listens for events from other instances
   - Updates local state when event matches playlist ID

3. **Parent Card Components** (to sync like counts)
   - `client/src/components/discover/TrendingAlbumCard.tsx`
   - `client/src/components/discover/TrendingPlaylistCard.tsx`
   - `client/src/components/profile/CreatorAlbumsSection.tsx`
   - `client/src/components/profile/CreatorPlaylistsSection.tsx`
   - `client/src/components/library/SavedAlbumsSection.tsx`
   - `client/src/components/library/SavedPlaylistsSection.tsx`
   - All added event listeners to update their local `likeCount` state

## Technical Details

### Event Emitter Pattern

```typescript
// Event detail interface
export interface LikeEventDetail {
  itemId: string;
  itemType: 'album' | 'playlist';
  liked: boolean;
  likeCount: number;
}

// Emit event
emitLikeEvent({
  itemId: albumId,
  itemType: 'album',
  liked: true,
  likeCount: 42,
});

// Listen for events
const cleanup = onLikeEvent((detail) => {
  if (detail.itemType === 'album' && detail.itemId === albumId) {
    setLiked(detail.liked);
    setLikeCount(detail.likeCount);
  }
});

// Cleanup on unmount
return cleanup;
```

### Event Flow

1. User clicks like button on Card A
2. Optimistic UI update on Card A
3. API call to toggle like status
4. On success, emit global event with new state
5. All other instances (Card B, Card C, etc.) receive event
6. Each instance checks if event is for their content
7. Matching instances update their local state
8. All cards now show synchronized state

### Benefits

- **Real-time sync**: All instances update immediately
- **No polling**: Event-driven, not polling-based
- **Lightweight**: Uses native CustomEvent API
- **Type-safe**: TypeScript interfaces for event details
- **Clean cleanup**: Proper event listener removal on unmount
- **Scoped updates**: Only matching content updates (by ID and type)

## Validation

### Diagnostics
- ✅ No TypeScript errors
- ✅ No linting errors

### Expected Behavior
- When liking an album/playlist in one location, all other instances update
- Like count stays synchronized across all cards
- Works across different sections (7-day, all-time, saved, profile, etc.)
- No duplicate API calls (only the clicked button makes the call)
- Proper cleanup prevents memory leaks

## Testing Scenarios

1. **Discover Page - Same content in multiple sections**
   - Album appears in both 7-day and all-time trending
   - Like in 7-day section → all-time section updates
   - Unlike in all-time section → 7-day section updates

2. **Profile + Discover Page**
   - Album appears on creator's profile and discover page
   - Like on profile → discover page updates
   - Unlike on discover → profile updates

3. **Library + Discover Page**
   - Saved album appears in library and discover page
   - Like on library → discover page updates
   - Unlike on discover → library updates

## Performance Considerations

- **Event listeners**: Each like button adds one event listener
- **Event filtering**: Each listener checks if event matches its content
- **Cleanup**: Listeners removed on component unmount
- **No polling**: Event-driven approach is more efficient than polling

## Future Improvements

- Could extend to other content types (tracks, users)
- Could add debouncing if performance becomes an issue
- Could use Supabase Realtime for cross-tab synchronization
- Could add optimistic rollback on network failure

## Requirements Satisfied

- Like buttons sync across all instances of the same content
- Real-time updates without page refresh
- No duplicate API calls
- Clean, maintainable code with proper TypeScript types
