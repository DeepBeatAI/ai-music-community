# Implementation Plan

## Overview

This implementation plan breaks down the Saved Content Library feature into discrete, manageable coding tasks. Each task builds incrementally on previous steps, with all code integrated into the application by the end.

## Task List

- [x] 1. Backend Service Functions and Type Definitions



- [x] 1.1 Add type definitions for saved content with uploader info


  - Create `SavedTrackWithUploader`, `SavedAlbumWithCreator`, `SavedPlaylistWithCreator` interfaces in `client/src/types/library.ts`
  - Extend existing Track, Album, Playlist types with uploader/creator info and saved_at timestamp
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.2 Implement getSavedTracks service function


  - Add `getSavedTracks(userId, limit?, offset?)` to `client/src/lib/library.ts`
  - Query `saved_tracks` JOIN `tracks` JOIN `user_profiles` to get track details with uploader info
  - Order by `saved_tracks.created_at DESC` (most recently saved first)
  - Return empty array on error for graceful degradation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.3 Implement getSavedAlbums service function


  - Add `getSavedAlbums(userId, limit?, offset?)` to `client/src/lib/library.ts`
  - Query `saved_albums` JOIN `albums` JOIN `user_profiles` with track count subquery
  - Follow same pattern as getSavedTracks
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.4 Implement getSavedPlaylists service function


  - Add `getSavedPlaylists(userId, limit?, offset?)` to `client/src/lib/library.ts`
  - Query `saved_playlists` JOIN `playlists` JOIN `user_profiles` with track count subquery
  - Follow same pattern as getSavedTracks
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.5 Add cache keys and TTLs for saved content


  - Add `SAVED_TRACKS`, `SAVED_ALBUMS`, `SAVED_PLAYLISTS` to CACHE_KEYS in `client/src/utils/cache.ts`
  - Add corresponding TTL values (2 minutes each) to CACHE_TTL
  - _Requirements: 8.5_

- [x] 2. SavedTracksSection Component





- [x] 2.1 Create SavedTracksSection component structure


  - Create `client/src/components/library/SavedTracksSection.tsx` based on `AllTracksSection.tsx`
  - Set up component props interface with userId and initialLimit (default: 8)
  - Implement state management for tracks, loading, error, isCollapsed, totalTracksCount, toast
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.2 Implement data fetching with cache integration


  - Create fetchTracks function that checks cache first using CACHE_KEYS.SAVED_TRACKS
  - Call getSavedTracks on cache miss
  - Cache results with CACHE_TTL.SAVED_TRACKS
  - Set up cache invalidation event listener
  - _Requirements: 1.1, 1.2, 8.5_

- [x] 2.3 Implement track card display with author and uploader info


  - Display track title, author (artist name), and uploader username
  - Show author prominently: "by {track.author}"
  - Show uploader as secondary info: "uploaded by @{uploader_username}" with profile link
  - Include saved timestamp, play count, and waveform visualization
  - _Requirements: 1.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2.4 Implement remove functionality with optimistic updates


  - Add "Remove" button that calls unsaveTrack from saveService
  - Implement optimistic UI update (remove from display immediately)
  - Show success toast: "Track removed from saved"
  - Handle errors with rollback and error toast
  - Invalidate CACHE_KEYS.SAVED_TRACKS on successful removal
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 2.5 Implement collapsible behavior with localStorage persistence


  - Add collapse/expand toggle button with arrow icon
  - Persist collapsed state to localStorage with key "saved-tracks-collapsed"
  - Restore state on component mount
  - Animate collapse/expand with 300ms transition
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.6 Implement loading, error, and empty states


  - Create loading skeleton with 8 track card skeletons
  - Create error state with retry button and user-friendly message
  - Create empty state: "No saved tracks yet" with bookmark icon
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 2.7 Implement responsive grid layout

  - Mobile: 2-column grid (grid-cols-2)
  - Tablet: 3-column grid (md:grid-cols-3)
  - Desktop: 4-column grid (lg:grid-cols-4)
  - Test on multiple screen sizes
  - _Requirements: 7.5_



- [x] 3. SavedAlbumsSection Component





- [x] 3.1 Create SavedAlbumsSection component structure

  - Create `client/src/components/library/SavedAlbumsSection.tsx` based on `MyAlbumsSection.tsx`
  - Set up component props interface with userId and initialLimit (default: 8)
  - Implement state management for albums, loading, error, isCollapsed, totalAlbumsCount
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_



- [x] 3.2 Implement data fetching with cache integration
  - Create fetchAlbums function that checks cache first using CACHE_KEYS.SAVED_ALBUMS
  - Call getSavedAlbums on cache miss
  - Cache results with CACHE_TTL.SAVED_ALBUMS
  - Set up cache invalidation event listener
  - _Requirements: 2.1, 2.2, 8.5_



- [x] 3.3 Implement album card display with creator info
  - Display album cover, title, creator username, and track count
  - Show creator with profile link: "by @{creator_username}"
  - Include saved timestamp


  - _Requirements: 2.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.4 Implement remove functionality with optimistic updates
  - Add "Remove" button that calls unsaveAlbum from saveService
  - Implement optimistic UI update
  - Show success toast: "Album removed from saved"
  - Handle errors with rollback and error toast


  - Invalidate CACHE_KEYS.SAVED_ALBUMS on successful removal
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 3.5 Implement collapsible behavior with localStorage persistence
  - Add collapse/expand toggle button

  - Persist collapsed state to localStorage with key "saved-albums-collapsed"
  - Restore state on component mount
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.6 Implement loading, error, and empty states



  - Create loading skeleton with 6 album card skeletons
  - Create error state with retry button
  - Create empty state: "No saved albums yet"
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 3.7 Implement responsive grid layout
  - Mobile: 1-column grid (grid-cols-1)
  - Small tablet: 2-column grid (sm:grid-cols-2)
  - Large tablet: 3-column grid (lg:grid-cols-3)
  - Desktop: 4-column grid (xl:grid-cols-4)
  - _Requirements: 7.5_

- [x] 4. SavedPlaylistsSection Component



- [x] 4.1 Create SavedPlaylistsSection component structure


  - Create `client/src/components/library/SavedPlaylistsSection.tsx` based on `PlaylistsList.tsx`
  - Set up component props interface with userId and initialLimit (default: 8)
  - Implement state management for playlists, loading, error, isCollapsed, totalPlaylistsCount
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.2 Implement data fetching with cache integration

  - Create fetchPlaylists function that checks cache first using CACHE_KEYS.SAVED_PLAYLISTS
  - Call getSavedPlaylists on cache miss
  - Cache results with CACHE_TTL.SAVED_PLAYLISTS
  - Set up cache invalidation event listener
  - _Requirements: 3.1, 3.2, 8.5_


- [x] 4.3 Implement playlist card display with creator info

  - Display playlist title, creator username, track count, and privacy status
  - Show creator with profile link: "by @{creator_username}"
  - Include privacy badge (Public/Private)
  - Include saved timestamp
  - _Requirements: 3.3, 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 4.4 Implement remove functionality with optimistic updates

  - Add "Remove" button that calls unsavePlaylist from saveService
  - Implement optimistic UI update
  - Show success toast: "Playlist removed from saved"
  - Handle errors with rollback and error toast
  - Invalidate CACHE_KEYS.SAVED_PLAYLISTS on successful removal
  - _Requirements: 4.1, 4.3, 4.4, 4.5_


- [x] 4.5 Implement collapsible behavior with localStorage persistence

  - Add collapse/expand toggle button
  - Persist collapsed state to localStorage with key "saved-playlists-collapsed"
  - Restore state on component mount
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 4.6 Implement loading, error, and empty states

  - Create loading skeleton with playlist card skeletons
  - Create error state with retry button
  - Create empty state: "No saved playlists yet"
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_



- [x] 4.7 Implement responsive grid layout

  - Mobile: 1-column grid (grid-cols-1)
  - Tablet: 2-column grid (md:grid-cols-2)
  - Desktop: 3-column grid (lg:grid-cols-3)
  - _Requirements: 7.5_



- [x] 5. Error Boundaries for Saved Sections


- [x] 5.1 Create error boundaries for saved content sections



  - Add `SavedTracksSectionErrorBoundary` to `client/src/components/library/LibraryErrorBoundaries.tsx`
  - Add `SavedAlbumsSectionErrorBoundary` to same file
  - Add `SavedPlaylistsSectionErrorBoundary` to same file
  - Each boundary should display user-friendly error message with bookmark icon
  - _Requirements: 6.4, 6.5, 6.6_

- [x] 6. Library Page Integration





- [x] 6.1 Add visual divider for saved content section

  - Add divider component to `client/src/app/library/page.tsx` after existing sections
  - Display centered text "🔖 Saved Content" with horizontal lines on both sides
  - Use gray-700 color for lines, gray-400 for text
  - Add appropriate spacing (mb-8 mt-12)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 6.2 Integrate SavedTracksSection into Library page

  - Import SavedTracksSection and SavedTracksSectionErrorBoundary
  - Add section below visual divider wrapped in error boundary
  - Pass user.id and initialLimit={8} as props
  - Add key={`saved-tracks-${refreshKey}`} for refresh support
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.4, 6.5, 6.6_


- [x] 6.3 Integrate SavedAlbumsSection into Library page

  - Import SavedAlbumsSection and SavedAlbumsSectionErrorBoundary
  - Add section below SavedTracksSection wrapped in error boundary
  - Pass user.id and initialLimit={8} as props
  - Add key={`saved-albums-${refreshKey}`} for refresh support

  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.4, 6.5, 6.6_

- [x] 6.4 Integrate SavedPlaylistsSection into Library page


  - Import SavedPlaylistsSection and SavedPlaylistsSectionErrorBoundary
  - Add section below SavedAlbumsSection wrapped in error boundary
  - Pass user.id and initialLimit={8} as props
  - Add key={`saved-playlists-${refreshKey}`} for refresh support
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.4, 6.5, 6.6_

- [x] 7. Testing and Validation
- [x] 7.1 Run TypeScript compilation and fix any type errors
  - Run `npm run type-check` or equivalent TypeScript compilation command
  - Fix all type errors in new files
  - Ensure all interfaces are properly defined and used
  - _Requirements: All_
- [x] 7.2 Run ESLint and fix linting errors
  - Run `npm run lint` or equivalent ESLint command
  - Fix all linting errors and warnings in new files
  - Ensure code follows project style guidelines
  - _Requirements: All_
- [x] 7.3 Manual testing - Saved tracks functionality
  - Navigate to Library page and verify SavedTracksSection displays
  - Test with no saved tracks (empty state)
  - Save a track from another user's profile
  - Verify track appears in SavedTracksSection
  - Test remove button (optimistic update and toast)
  - Test creator profile link navigation
  - Test collapse/expand functionality
  - Test on mobile, tablet, and desktop screen sizes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5_
- [x] 7.4 Manual testing - Saved albums functionality
  - Test with no saved albums (empty state)
  - Save an album from another user's profile
  - Verify album appears in SavedAlbumsSection
  - Test remove button
  - Test creator profile link navigation
  - Test collapse/expand functionality
  - Test responsive layout
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5_
- [x] 7.5 Manual testing - Saved playlists functionality
  - Test with no saved playlists (empty state)
  - Save a playlist from another user's profile
  - Verify playlist appears in SavedPlaylistsSection
  - Test remove button
  - Test creator profile link navigation
  - Test collapse/expand functionality
  - Test responsive layout
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5_
- [x] 7.6 Manual testing - Error scenarios
  - Test with network disconnected (error state with retry)
  - Test cache invalidation (save/unsave from profile page)
  - Test error boundaries (simulate component error)
  - Test loading states (throttle network in DevTools)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
- [x] 7.7 Manual testing - Performance and accessibility
  - Verify page load time < 3 seconds
  - Verify section render time < 500ms
  - Test keyboard navigation (Tab, Enter, Space)
  - Test screen reader announcements
  - Verify focus indicators are visible
  - Test color contrast with accessibility tools
  - _Requirements: All_



## Implementation Notes

### Task Execution Order

Tasks should be executed in the order listed above:
1. Backend service functions and types (foundation)
2. SavedTracksSection component (first UI component)
3. SavedAlbumsSection component (second UI component)
4. SavedPlaylistsSection component (third UI component)
5. Error boundaries (safety layer)
6. Library page integration (wiring everything together)
7. Testing and validation (quality assurance)

### Code Reuse Strategy

- **SavedTracksSection** is based on `AllTracksSection.tsx`
- **SavedAlbumsSection** is based on `MyAlbumsSection.tsx`
- **SavedPlaylistsSection** is based on `PlaylistsList.tsx`

Copy the structure and patterns from these existing components, then adapt for saved content:
- Change data fetching to use new service functions
- Update UI to show author/creator attribution
- Replace delete with remove functionality
- Add uploader profile links
- Maintain all existing patterns (collapsible, cache, error handling)

### Key Differences from Existing Components

1. **Data Source**: Fetch from `saved_*` tables instead of user's own content
2. **Attribution**: Show track author + uploader username (for tracks) or creator username (for albums/playlists)
3. **Actions**: "Remove" button instead of "Delete" (calls unsave functions)
4. **Read-Only**: No edit functionality (users don't own saved content)
5. **Visual Indicator**: 🔖 bookmark emoji for all saved sections

### Testing Strategy

- **After each component**: Run TypeScript and ESLint checks
- **After integration**: Manual testing of full flow
- **Before completion**: Comprehensive testing checklist

### Cache Management

- Each section has its own cache key (SAVED_TRACKS, SAVED_ALBUMS, SAVED_PLAYLISTS)
- Cache TTL: 2 minutes (same as other library sections)
- Invalidate cache after remove actions
- Listen for cache invalidation events from other pages

### Error Handling

- All components wrapped in error boundaries
- Graceful degradation (return empty arrays on error)
- User-friendly error messages with retry buttons
- Toast notifications for action feedback

### Accessibility

- Keyboard navigation support
- Screen reader announcements
- ARIA labels for icon-only buttons
- Focus indicators on all interactive elements
- Semantic HTML structure

### Performance Targets

- Initial page load: < 3 seconds
- Section render: < 500ms
- Cache hit response: < 100ms
- Remove action (optimistic): < 50ms
- Remove action (confirmed): < 500ms

