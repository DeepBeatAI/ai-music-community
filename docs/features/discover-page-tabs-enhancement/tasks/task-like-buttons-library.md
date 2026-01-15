# Task: Add Like Buttons to Library Saved Content

## Status: ✅ Complete

## Overview

Added like buttons (heart icon) to saved albums and playlists in the library page, in addition to the existing save buttons (bookmark icon). This ensures users can like content from other creators even when viewing their saved collection.

## Problem

The user reported that like buttons were missing from 6 locations:
1. `/profile/[username]/` - Public album cards ✅ (already fixed)
2. `/profile/[username]/albums/` - Public album cards ✅ (already fixed)
3. `/library/` - Saved albums section ❌ (FIXED IN THIS TASK)
4. `/profile/[username]/` - Public playlist cards ✅ (already fixed)
5. `/profile/[username]/playlists/` - Public playlist cards ✅ (already fixed)
6. `/library/` - Saved playlists section ❌ (FIXED IN THIS TASK)

## Investigation

The library page has two distinct sections:
- **My Albums/Playlists**: User's own content (no like buttons needed - can't like your own content)
- **Saved Albums/Playlists**: Content from OTHER users (SHOULD have like buttons)

The saved content sections used custom card components (`SavedAlbumCard` and `SavedPlaylistCard`) that only had save buttons (bookmark icon) but no like buttons (heart icon).

## Implementation

### Files Modified

1. **client/src/components/library/SavedAlbumsSection.tsx**
   - Added import for `AlbumLikeButton`
   - Added like button below the save button in `SavedAlbumCard`
   - Adjusted spacing to accommodate both buttons

2. **client/src/components/library/SavedPlaylistsSection.tsx**
   - Added import for `PlaylistLikeButton`
   - Added like button below the save button in `SavedPlaylistCard`
   - Adjusted spacing to accommodate both buttons

### Changes Made

**SavedAlbumsSection.tsx:**
```typescript
// Added import
import AlbumLikeButton from '@/components/albums/AlbumLikeButton';

// Updated metadata section to add margin-bottom
<div className="flex items-center justify-between text-xs text-gray-500 mb-3">
  {/* ... existing save button ... */}
</div>

// Added like button
<div className="mt-2">
  <AlbumLikeButton albumId={album.id} size="sm" />
</div>
```

**SavedPlaylistsSection.tsx:**
```typescript
// Added import
import PlaylistLikeButton from '@/components/playlists/PlaylistLikeButton';

// Updated metadata section to add margin-bottom
<div className="flex items-center justify-between text-xs text-gray-500 mb-3">
  {/* ... existing save button ... */}
</div>

// Added like button
<div className="mt-2">
  <PlaylistLikeButton playlistId={playlist.id} size="sm" />
</div>
```

## Validation

### Diagnostics
- ✅ No TypeScript errors
- ✅ No linting errors

### Expected Behavior
- Like buttons now appear on all saved album cards in `/library/` (Saved Albums section)
- Like buttons now appear on all saved playlist cards in `/library/` (Saved Playlists section)
- Users can like/unlike content from other creators
- Like count updates in real-time with optimistic UI updates
- Like status syncs with database

## UI Layout

Each saved content card now has:
1. **Cover image** (top)
2. **Title** (clickable)
3. **Creator name** (clickable)
4. **Description** (if available)
5. **Metadata row**: Date + Save button (bookmark icon)
6. **Like button row**: Like button (heart icon) with count

## Next Steps

This completes Task 3 (Add Like Buttons to Library). The remaining tasks are:

- **Task 4**: Implement like button sync (when same album/playlist appears in multiple sections)
- **Task 5**: Investigate NextJS error on page refresh

## Requirements Satisfied

- Like buttons visible on all 6 specified locations
- Saved content sections now have like functionality
- Consistent UI/UX across all album and playlist cards
- Proper separation between save (bookmark) and like (heart) actions
