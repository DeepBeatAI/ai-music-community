# Implementation Plan

## Overview

This implementation plan breaks down the Library page enhancements into discrete, manageable coding tasks. Each task builds incrementally, focusing on UI consistency, data filtering, and user experience improvements.

## Task List

- [x] 1. Filter Saved Content (Backend)
- [x] 1.1 Update getSavedTracks to exclude own content
  - Add `.neq('tracks.user_id', userId)` filter to query
  - Test that own tracks are excluded from results
  - _Requirements: 1.1_
- [x] 1.2 Update getSavedAlbums to exclude own content
  - Add `.neq('albums.user_id', userId)` filter to query
  - Test that own albums are excluded from results
  - _Requirements: 1.2_
- [x] 1.3 Update getSavedPlaylists to exclude own and private content
  - Add `.neq('playlists.user_id', userId)` filter to query
  - Add `.eq('playlists.is_public', true)` filter to query
  - Test that own and private playlists are excluded from results
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 2. Update SavedTracksSection UI





- [x] 2.1 Add playback integration to SavedTrackCard


  - Import usePlayback hook from PlaybackContext
  - Add onPlay handler that calls playTrack
  - Add play button overlay to cover art
  - Style play button with hover effects (desktop) and always visible (mobile)
  - _Requirements: 2.1, 2.6_
- [x] 2.2 Add membership badges to SavedTrackCard


  - Fetch album and playlist membership data for tracks
  - Display album badge if track belongs to an album
  - Display playlist badge showing count of playlists
  - Style badges to match creator page (purple for albums, pink for playlists)
  - _Requirements: 2.2, 2.3_
- [x] 2.3 Update metadata display in SavedTrackCard


  - Add play count with play icon
  - Add like count with heart icon
  - Update date display to match creator page format
  - Arrange metadata in horizontal layout
  - _Requirements: 2.4_
- [x] 2.4 Add actions menu to SavedTrackCard


  - Create actions menu with Remove, Add to Playlist, Copy URL, Share options
  - Implement hover trigger (desktop) and long-press trigger (mobile)
  - Add click-outside handler to close menu
  - Style menu to match creator page
  - _Requirements: 2.5_
- [x] 2.5 Implement action handlers in SavedTracksSection


  - Add onAddToPlaylist handler (opens AddToPlaylistModal)
  - Add onCopyUrl handler (copies track URL to clipboard)
  - Add onShare handler (opens share dialog)
  - Integrate with existing onRemove handler
  - Show toast notifications for actions
  - _Requirements: 2.5_

- [x] 3. Update SavedAlbumsSection UI






- [x] 3.1 Update SavedAlbumCard to match creator page

  - Use gradient placeholder with album icon if no cover image
  - Match gradient color scheme from creator page
  - Make entire card clickable to navigate to album detail page
  - Update border and hover styles
  - _Requirements: 3.1, 3.5_

- [x] 3.2 Update SavedAlbumCard metadata display

  - Show album name, description, and creation date
  - Replace Remove button with SaveButton component
  - Position SaveButton in metadata section

  - _Requirements: 3.2, 3.3_
- [x] 3.3 Add navigation handler to SavedAlbumCard

  - Import useRouter from next/navigation
  - Add onClick handler to navigate to `/album/${album.id}`
  - Ensure click works on card and title
  - _Requirements: 3.4_

- [x] 4. Update SavedPlaylistsSection UI






- [x] 4.1 Update SavedPlaylistCard to match creator page

  - Use gradient placeholder with playlist icon if no cover image
  - Match gradient color scheme from creator page
  - Make entire card clickable to navigate to playlist detail page
  - Update border and hover styles
  - _Requirements: 4.1, 4.5_

- [x] 4.2 Update SavedPlaylistCard metadata display
  - Show playlist name, description, and creation date
  - Replace Remove button with SaveButton component
  - Position SaveButton in metadata section

  - _Requirements: 4.2, 4.3_
- [x] 4.3 Add navigation handler to SavedPlaylistCard
  - Import useRouter from next/navigation
  - Add onClick handler to navigate to `/playlist/${playlist.id}`
  - Ensure click works on card and title
  - _Requirements: 4.4_

- [x] 5. Add Collapse State to AllTracksSection




- [x] 5.1 Add collapse state management to AllTracksSection


  - Add isCollapsed state with localStorage initialization
  - Use key "all-tracks-collapsed"
  - Add toggleCollapse handler that updates state and localStorage
  - _Requirements: 5.1, 5.2, 5.3_
- [x] 5.2 Add collapse UI to AllTracksSection


  - Add collapse toggle button to section header
  - Add chevron icon that rotates based on state
  - Hide/show track grid based on isCollapsed state
  - Add smooth transition animation
  - _Requirements: 5.4, 5.5_

- [x] 6. Add Collapse State to MyAlbumsSection




- [x] 6.1 Add collapse state management to MyAlbumsSection


  - Add isCollapsed state with localStorage initialization
  - Use key "my-albums-collapsed"
  - Add toggleCollapse handler that updates state and localStorage
  - _Requirements: 6.1, 6.2, 6.3_
- [x] 6.2 Add collapse UI to MyAlbumsSection


  - Add collapse toggle button to section header
  - Add chevron icon that rotates based on state
  - Hide/show album grid based on isCollapsed state
  - Add smooth transition animation
  - _Requirements: 6.4, 6.5_

- [x] 7. Add Collapse State to PlaylistsList





- [x] 7.1 Add collapse state management to PlaylistsList


  - Add isCollapsed state with localStorage initialization
  - Use key "my-playlists-collapsed"
  - Add toggleCollapse handler that updates state and localStorage
  - _Requirements: 7.1, 7.2, 7.3_
- [x] 7.2 Add collapse UI to PlaylistsList




  - Add collapse toggle button to section header
  - Add chevron icon that rotates based on state
  - Hide/show playlist content based on isCollapsed state
  - Add smooth transition animation
  - _Requirements: 7.4, 7.5_

- [x] 8. Remove Public Playlists Sub-section





- [x] 8.1 Identify and remove Public Playlists sub-section code


  - Find PlaylistsList component
  - Locate Public Playlists sub-section wrapper
  - Remove sub-section component and related code
  - _Requirements: 8.1_
- [x] 8.2 Unify playlist display in PlaylistsList

  - Display all user playlists in single grid
  - Remove any filtering logic that separates public/private
  - Maintain privacy badges on individual playlist cards
  - Ensure grid layout remains consistent
  - _Requirements: 8.2, 8.5_
- [x] 8.3 Verify playlist functionality after removal


  - Test create playlist functionality
  - Test edit playlist functionality
  - Test delete playlist functionality
  - Test drag-and-drop reordering
  - Verify privacy badges display correctly
  - _Requirements: 8.3, 8.4_

- [x] 9. Testing and Validation



- [x] 9.1 Test saved content filtering

  - Save own track and verify it doesn't appear in Saved Tracks
  - Save own album and verify it doesn't appear in Saved Albums
  - Save own playlist and verify it doesn't appear in Saved Playlists
  - Save private playlist from another user and verify it doesn't appear
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
- [x] 9.2 Test SavedTracksSection UI updates

  - Verify play button overlay appears and functions correctly
  - Verify membership badges display correctly
  - Verify metadata (plays, likes, date) displays correctly
  - Verify actions menu opens and all actions work
  - Test on mobile and desktop
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
- [x] 9.3 Test SavedAlbumsSection UI updates

  - Verify gradient placeholders match creator page
  - Verify SaveButton functions correctly
  - Verify card navigation to album detail page
  - Test on mobile and desktop
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
- [x] 9.4 Test SavedPlaylistsSection UI updates

  - Verify gradient placeholders match creator page
  - Verify SaveButton functions correctly
  - Verify card navigation to playlist detail page
  - Test on mobile and desktop
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
- [x] 9.5 Test collapse state persistence

  - Collapse All Tracks section and refresh page - verify state persists
  - Collapse My Albums section and refresh page - verify state persists
  - Collapse My Playlists section and refresh page - verify state persists
  - Test smooth transitions when toggling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
- [x] 9.6 Test PlaylistsList without sub-sections

  - Verify all playlists display in single unified list
  - Verify privacy badges show correctly
  - Verify all CRUD operations work
  - Verify drag-and-drop reordering works
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
- [x] 9.7 Run TypeScript compilation and ESLint

  - Run `npm run type-check` and fix any type errors
  - Run `npm run lint` and fix any linting errors
  - Ensure all new code follows project standards
  - _Requirements: All_

## Implementation Notes

### Task Execution Order

Tasks should be executed in the order listed:
1. Filter saved content (backend) - COMPLETED
2. Update SavedTracksSection UI
3. Update SavedAlbumsSection UI
4. Update SavedPlaylistsSection UI
5. Add collapse state to existing sections
6. Remove Public Playlists sub-section
7. Testing and validation

### Code Reuse Strategy

- **SavedTrackCard**: Base on CreatorTrackCard from `client/src/components/profile/CreatorTrackCard.tsx`
- **SavedAlbumCard**: Base on CreatorAlbumCard from `client/src/components/profile/CreatorAlbumsSection.tsx`
- **SavedPlaylistCard**: Base on CreatorPlaylistCard from `client/src/components/profile/CreatorPlaylistsSection.tsx`
- **Collapse State**: Reuse pattern from existing saved content sections

### Key Components to Import

```typescript
// For SavedTracksSection
import { usePlayback } from '@/contexts/PlaybackContext';
import { useRouter } from 'next/navigation';
import SaveButton from '@/components/profile/SaveButton';
import { AddToPlaylistModal } from '@/components/library/AddToPlaylistModal';

// For SavedAlbumsSection and SavedPlaylistsSection
import { useRouter } from 'next/navigation';
import SaveButton from '@/components/profile/SaveButton';
```

### Gradient Color Scheme

Use the same gradient colors as creator pages:
```typescript
const gradientColors = [
  'from-purple-400 to-pink-600',
  'from-blue-400 to-cyan-600',
  'from-green-400 to-teal-600',
  'from-orange-400 to-red-600',
  'from-indigo-400 to-purple-600',
];
const gradientIndex = item.id.charCodeAt(0) % gradientColors.length;
const gradient = gradientColors[gradientIndex];
```

### localStorage Keys

- `all-tracks-collapsed`
- `my-albums-collapsed`
- `my-playlists-collapsed`
- `saved-tracks-collapsed` (existing)
- `saved-albums-collapsed` (existing)
- `saved-playlists-collapsed` (existing)

### Testing Strategy

- Test each UI update immediately after implementation
- Test collapse state after each section is updated
- Test saved content filtering with real data
- Test on both mobile and desktop viewports
- Verify accessibility (keyboard navigation, screen readers)

### Performance Considerations

- Use React.memo for card components
- Maintain existing cache strategy
- Minimize localStorage writes
- Use CSS transitions for smooth animations

### Accessibility

- Ensure all buttons have ARIA labels
- Maintain keyboard navigation support
- Provide focus indicators
- Announce state changes to screen readers
