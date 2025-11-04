# Implementation Plan

## Overview

This implementation plan breaks down the My Library feature into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring the feature can be developed systematically with regular testing checkpoints.

## Task List

- [x] 1. Set up database schema and migrations for albums





  - Create albums table with columns: id, user_id, name, description, is_public (default true), cover_image_url, created_at, updated_at
  - Create album_tracks table with columns: id, album_id, track_id, position, added_at
  - Add unique constraint on (album_id, track_id) in album_tracks table
  - Create indexes on user_id, created_at, and position columns
  - _Requirements: 7.1, 7.2, 7.5, 7.8_

- [x] 1.1 Implement Row Level Security policies for albums


  - Create RLS policy for users to view their own albums
  - Create RLS policy for users to view public albums
  - Create RLS policies for insert, update, and delete operations on albums table
  - _Requirements: 7.3, 8.3, 8.4_

- [x] 1.2 Implement Row Level Security policies for album_tracks


  - Create RLS policy for viewing album_tracks based on album ownership or public status
  - Create RLS policies for insert, update, and delete operations on album_tracks table
  - _Requirements: 7.4, 8.3, 8.4_

- [x] 1.3 Create database functions for album operations


  - Implement get_album_track_count function to count tracks in an album
  - Implement get_next_album_position function to calculate next track position
  - Create trigger function update_album_updated_at for automatic timestamp updates
  - Add CASCADE delete behavior for album_tracks when album is deleted
  - _Requirements: 7.6, 7.7_

- [x] 2. Generate and create TypeScript type definitions






  - Generate TypeScript types from updated database schema using Supabase CLI
  - Create client/src/types/album.ts with Album, AlbumInsert, AlbumUpdate, AlbumTrack types
  - Create extended types: AlbumWithTracks, AlbumWithOwner
  - Create form data interfaces: AlbumFormData, AddTrackToAlbumParams, RemoveTrackFromAlbumParams
  - Create response interfaces: CreateAlbumResponse, AlbumOperationResponse
  - _Requirements: 7.1, 7.2_

- [x] 2.1 Create library-specific TypeScript types



  - Create client/src/types/library.ts file
  - Define LibraryStats interface with uploadRemaining, totalTracks, totalAlbums, totalPlaylists, playsThisWeek, playsAllTime
  - Define TrackWithMembership interface extending Track with album and playlist membership data
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.12_

- [x] 3. Implement album API functions






  - Create client/src/lib/albums.ts file
  - Implement getUserAlbums function to fetch user's albums ordered by created_at
  - Implement getPublicAlbums function to fetch public albums excluding user's own
  - Implement getAlbumWithTracks function to fetch album with tracks and track count
  - Implement createAlbum function with error handling
  - Implement updateAlbum function with error handling
  - Implement deleteAlbum function with error handling
  - _Requirements: 4.1, 4.5, 4.11_

- [x] 3.1 Implement album track management functions


  - Implement addTrackToAlbum function that removes track from previous album (exclusive relationship)
  - Implement removeTrackFromAlbum function with error handling
  - Implement reorderAlbumTracks function for drag-and-drop support
  - _Requirements: 4.8, 4.9, 4.12_

- [x] 4. Implement library stats API functions





  - Create client/src/lib/library.ts file
  - Implement getLibraryStats function that fetches all stats in parallel using Promise.all
  - Calculate playsThisWeek by filtering tracks created in last 7 days
  - Calculate playsAllTime by summing all track play_count values
  - Set uploadRemaining to 'infinite' for MVP phase
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 4.1 Implement track membership query function


  - Implement getUserTracksWithMembership function in client/src/lib/library.ts
  - Query tracks with album_tracks and playlist_tracks relationships
  - Transform data to include albumId, albumName, playlistIds, playlistNames
  - Support optional limit parameter for pagination
  - _Requirements: 3.1, 3.12_

- [x] 5. Create StatsSection component





  - Create client/src/components/library/StatsSection.tsx
  - Implement component that fetches and displays 6 stat cards
  - Create StatCard sub-component with icon, value, and label
  - Implement desktop layout: 1 row x 6 columns
  - Implement mobile layout: 2 rows x 3 columns using Tailwind responsive classes
  - Add loading skeleton state with 6 placeholder cards
  - Add error state with retry button
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 6. Create TrackCard component for All Tracks section





  - Create client/src/components/library/TrackCard.tsx
  - Display track cover art, title, play count, and upload date
  - Do NOT include waveform visualization (future feature)
  - Add visual badges for album and playlist membership
  - Implement actions menu (⋮) with hover trigger for desktop
  - Implement actions menu with long-press trigger for mobile
  - Include actions: Add to Album, Add to Playlist, Copy Track URL, Share, Delete
  - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.12_

- [x] 6.1 Implement TrackCard action handlers



  - Implement handleAddToAlbum that shows album dropdown modal
  - Implement handleAddToPlaylist that shows playlist multi-select modal
  - Implement handleCopyUrl that copies track URL to clipboard
  - Implement handleShare that opens share modal
  - Implement handleDelete that shows confirmation dialog before deletion
  - Add optimistic UI updates with rollback on error
  - _Requirements: 3.9, 3.10, 3.11, 9.2, 9.5, 9.6_

- [x] 7. Create AllTracksSection component





  - Create client/src/components/library/AllTracksSection.tsx
  - Fetch user tracks with membership using getUserTracksWithMembership
  - Display tracks in grid layout (4 columns desktop, 3 tablet, 2 mobile)
  - Limit initial display to 8-12 tracks
  - Add "View All" button when more than 12 tracks exist
  - Implement collapsible section with expand/collapse toggle
  - Add loading state with skeleton grid
  - Add error state with retry button
  - Add empty state when no tracks exist
  - _Requirements: 3.1, 3.2, 3.3, 6.3, 6.4, 6.9, 9.4, 10.2_

- [x] 8. Create AlbumCard component (reuse PlaylistCard pattern)





  - Create client/src/components/library/AlbumCard.tsx by adapting PlaylistCard
  - Display album cover art, title, and track count
  - Add 💿 icon to distinguish from playlists
  - Support showTrackNumbers prop (true for albums, false for playlists)
  - Display track numbers (1, 2, 3...) when viewing album contents
  - Implement same hover and click interactions as PlaylistCard
  - _Requirements: 4.1, 4.6, 4.7_

- [x] 8.1 Create CreateAlbumModal component


  - Create client/src/components/library/CreateAlbumModal.tsx by adapting CreatePlaylistModal
  - Include form fields: name (required), description (optional), cover_image_url (optional)
  - Set is_public default to true (different from playlists)
  - Implement form validation
  - Call createAlbum API function on submit
  - Show success message and close modal on success
  - Show error message on failure
  - _Requirements: 4.5, 4.10, 9.3_

- [x] 9. Create MyAlbumsSection component





  - Create client/src/components/library/MyAlbumsSection.tsx
  - Fetch user albums using getUserAlbums function
  - Display albums in grid layout (3-4 columns desktop, 2-3 tablet, horizontal scroll mobile)
  - Limit initial display to 6-8 albums
  - Add "View All" button when more than 8 albums exist
  - Add "+ New Album" button that opens CreateAlbumModal
  - Implement collapsible section with expand/collapse toggle
  - Add loading state with skeleton cards
  - Add error state with retry button
  - Add empty state with "Create your first album" message
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 6.3, 6.4, 6.5, 9.4, 10.3_



- [x] 10. Adapt TrackUploadSection with post-upload assignment





  - Create client/src/components/library/TrackUploadSection.tsx
  - Reuse AudioUpload component from dashboard (import from @/components/AudioUpload)
  - Implement collapsible behavior with expand/collapse toggle
  - Show "Upload New Track" button when collapsed
  - After successful upload, display inline success message
  - Show album dropdown (single select) with "Skip" option
  - Show playlist multi-select dropdown with "Skip" option
  - Add "Done" button that collapses section after assignment
  - Add "Upload Another" button that keeps section expanded
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 10.1 Implement post-upload assignment logic


  - Create PostUploadAssignment sub-component
  - Fetch user's albums and playlists for dropdowns
  - Implement album assignment using addTrackToAlbum function
  - Implement playlist assignment using existing addTrackToPlaylist function
  - Handle "Skip" action (close assignment without saving)
  - Handle "Done" action (save assignments and collapse section)
  - Handle "Upload Another" action (save assignments and reset form)
  - Show error messages if assignment fails
  - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9, 9.3_

- [x] 11. Adapt MyPlaylistsSection for new layout





  - Update client/src/components/playlists/PlaylistsList.tsx
  - Keep existing "My Playlists" and "Public Playlists" subsections
  - Ensure playlists default to is_public: false
  - Ensure playlist views do NOT show track numbers
  - Maintain all existing CRUD operations
  - Maintain drag-and-drop track reordering
  - No major UX changes required
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 12. Create main LibraryPage component






  - Create client/src/app/library/page.tsx (rename from playlists/page.tsx)
  - Import and arrange sections: StatsSection, TrackUploadSection, AllTracksSection, MyAlbumsSection, MyPlaylistsSection
  - Implement vertical dashboard-style layout
  - Add page header with title "My Library" and description
  - Implement authentication check and redirect to login if not authenticated
  - Add loading state while checking authentication
  - _Requirements: 6.1, 6.2, 8.1, 8.2_


- [x] 12.1 Implement collapsible section state management

  - Add state management for collapsed/expanded sections
  - Persist collapse state to localStorage
  - Restore collapse state on page load
  - Implement smooth collapse/expand animations (300ms transition)
  - Add collapse/expand toggle buttons to section headers
  - _Requirements: 6.3, 6.4_

- [x] 12.2 Implement lazy loading for sections


  - Use Intersection Observer API to detect when sections enter viewport
  - Lazy load MyAlbumsSection when scrolled within 200px of viewport
  - Lazy load MyPlaylistsSection when scrolled within 200px of viewport
  - Show loading skeleton while lazy loading
  - _Requirements: 6.5, 10.2, 10.3_

- [x] 13. Update routing and navigation





  - Update navigation links to point to /library instead of /playlists
  - Update client/src/components/layout/MainLayout.tsx navigation
  - Add redirect from /playlists to /library for backward compatibility
  - Update any internal links that reference /playlists
  - _Requirements: 6.1_

- [x] 14. Implement album detail page





  - Create client/src/app/library/albums/[id]/page.tsx
  - Fetch album with tracks using getAlbumWithTracks function
  - Display album cover, title, description, and track count
  - Display tracks with track numbers (1, 2, 3...)
  - Implement drag-and-drop track reordering using reorderAlbumTracks
  - Add "Edit Album" button for album owner
  - Add "Delete Album" button for album owner with confirmation
  - Show loading state while fetching album
  - Show error state if album not found
  - _Requirements: 4.7, 4.11, 4.12_

- [x] 15. Implement "View All" pages





  - Create client/src/app/library/tracks/page.tsx for all tracks view
  - Create client/src/app/library/albums/page.tsx for all albums view
  - Implement pagination with 20 items per page
  - Add sorting options (recent, oldest, most played)
  - Reuse TrackCard and AlbumCard components
  - Add loading states for pagination
  - _Requirements: 3.3, 4.4, 6.7, 10.7_

- [x] 16. Implement track assignment modals





  - Create client/src/components/library/AddToAlbumModal.tsx
  - Create client/src/components/library/AddToPlaylistModal.tsx
  - Fetch user's albums and playlists
  - For albums: Single select dropdown with "None" option
  - For playlists: Multi-select with checkboxes
  - Implement save functionality calling addTrackToAlbum and addTrackToPlaylist
  - Show success/error messages
  - Close modal on successful save
  - _Requirements: 3.9, 3.10, 4.8, 4.9_
-

- [x] 17. Implement share functionality




  - Create client/src/components/library/ShareModal.tsx
  - Generate shareable track URL
  - Provide copy to clipboard button
  - Add social media share buttons (optional)
  - Show success message when URL copied
  - _Requirements: 3.8_

- [x] 18. Implement delete confirmation dialog




  - Create client/src/components/library/DeleteConfirmDialog.tsx
  - Show warning message explaining consequences (track removed from albums/playlists)
  - Add "Cancel" and "Delete" buttons
  - Call track deletion API on confirm
  - Show success message on deletion
  - Update UI optimistically and rollback on error
  - _Requirements: 3.11, 8.5, 9.2, 9.6_
-

- [x] 19. Add responsive design polish





  - Test all components on mobile (≤768px), tablet (768-1023px), and desktop (≥1024px)
  - Ensure stats section renders as 2x3 grid on mobile
  - Ensure track grid renders as 2 columns on mobile, 3 on tablet, 4 on desktop
  - Ensure albums section uses horizontal scroll on mobile
  - Test touch interactions for mobile (long-press for actions menu)
  - Fix any layout issues or overflow problems
  - _Requirements: 1.8, 6.8, 6.9_

- [x] 20. Implement performance optimizations





  - Add React.memo to StatCard, TrackCard, and AlbumCard components
  - Implement debouncing for search/filter operations (300ms)
  - Cache stats data for 5 minutes in component state
  - Cache tracks list for 2 minutes in component state
  - Cache albums list for 2 minutes in component state
  - Invalidate cache on mutations (create, update, delete)
  - _Requirements: 10.1, 10.4, 10.5, 10.6, 10.8_

-

- [x] 21. Add error boundaries and error handling





  - Wrap each major section in ErrorBoundary component
  - Implement section-specific error fallbacks
  - Add retry functionality for failed operations
  - Implement optimistic UI updates for non-destructive operations
  - Implement rollback logic for failed optimistic updates
  - Add user-friendly error messages for all error scenarios
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 22. Write unit tests for album API functions


  - Test getUserAlbums returns correct data
  - Test createAlbum creates album with correct defaults
  - Test addTrackToAlbum removes track from previous album
  - Test reorderAlbumTracks updates positions correctly
  - Test error handling for all functions
  - _Requirements: 4.8, 4.9, 4.11, 4.12_

- [x] 22.1 Write unit tests for library API functions

  - Test getLibraryStats calculates plays correctly
  - Test getUserTracksWithMembership includes album and playlist data
  - Test stats caching behavior
  - _Requirements: 1.6, 1.7, 3.12_

- [x] 23. Write component tests

  - Test StatsSection renders all 6 stats
  - Test TrackCard actions menu interactions
  - Test AlbumCard displays track numbers
  - Test collapsible section behavior
  - Test lazy loading triggers correctly
  - _Requirements: 1.1, 3.6, 4.7, 6.3, 6.5_

- [x] 24. Write integration tests


  - Test upload track → assign to album → verify in All Tracks
  - Test create album → add tracks → reorder → verify order
  - Test delete track → verify removed from albums/playlists
  - Test add track to album → verify removed from previous album
  - Test collapse sections → refresh page → verify state persisted
  - _Requirements: 2.5, 4.8, 4.9, 4.12, 6.4_

## Implementation Notes

### Testing Checkpoints

After completing each major milestone, pause for user testing:

1. **After Task 4**: Test database schema and API functions manually
2. **After Task 7**: Test AllTracksSection display and interactions
3. **After Task 9**: Test MyAlbumsSection and album creation
4. **After Task 12**: Test full page layout and navigation
5. **After Task 18**: Test all user flows end-to-end
6. **After Task 21**: Final testing and bug fixes

### Dependencies

- Tasks 1-4 must be completed before any component work
- Tasks 5-11 can be developed in parallel after Tasks 1-4
- Task 12 requires Tasks 5-11 to be complete
- Tasks 13-18 can be developed in parallel after Task 12
- Tasks 19-21 should be done after all features are implemented
- Tasks 22-24 (optional tests) can be done throughout or at the end

### Key Reminders

- Always run TypeScript diagnostics after each task
- Fix all linting and type errors before moving to next task
- Test on both desktop and mobile after UI changes
- Request user confirmation before major UX changes
- Do NOT git commit - user will handle version control
- Pause for user testing after each major milestone
