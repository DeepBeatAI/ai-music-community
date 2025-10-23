# Implementation Plan

## Overview

This implementation plan breaks down the playlist system and performance dashboard features into discrete, actionable coding tasks. Each task builds incrementally on previous tasks and includes specific requirements references, implementation details, and testing criteria.

---

## Foundation Phase

- [x] 1. Set up database schema and security policies

  - Create migration file for playlists and playlist_tracks tables
  - Implement all RLS policies for data protection
  - Create database functions and triggers
  - Add indexes for query performance
  - _Requirements: 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 1.1 Create playlists table migration

  - Write SQL migration with id, user_id, name, description, is_public, cover_image_url, created_at, updated_at columns
  - Add foreign key constraint to auth.users with CASCADE delete
  - Create indexes on user_id and created_at columns
  - _Requirements: 7.1, 7.5_

- [x] 1.2 Create playlist_tracks junction table migration

  - Write SQL migration with id, playlist_id, track_id, position, added_at columns
  - Add foreign key constraints with CASCADE delete
  - Create unique constraint on (playlist_id, track_id)
  - Create indexes on playlist_id, track_id, and position columns
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 1.3 Implement RLS policies for playlists table

  - Enable RLS on playlists table
  - Create SELECT policy for owned playlists
  - Create SELECT policy for public playlists
  - Create INSERT policy with user_id check
  - Create UPDATE policy for owners only
  - Create DELETE policy for owners only
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 1.4 Implement RLS policies for playlist_tracks table

  - Enable RLS on playlist_tracks table
  - Create SELECT policy checking playlist ownership or public status
  - Create INSERT policy verifying playlist ownership
  - Create DELETE policy verifying playlist ownership

  - _Requirements: 4.5, 4.6_

- [x] 1.5 Create database functions and triggers

  - Write update_playlist_updated_at() function
  - Create trigger to auto-update updated_at timestamp
  - Write get_playlist_track_count() function
  - _Requirements: 7.6, 7.7_

- [x] 2. Generate and create TypeScript types

  - Run Supabase type generation command
  - Create playlist.ts types file with base and extended types
  - Define all interfaces for components and API responses
  - Export types from index.ts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2.1 Generate Supabase database types

  - Run `supabase gen types typescript` command
  - Update src/types/supabase.ts with generated types
  - Verify Playlist and PlaylistTrack types are present
  - _Requirements: 7.1, 7.2_

- [x] 2.2 Create playlist type definitions

  - Create src/types/playlist.ts file
  - Define base types (Playlist, PlaylistInsert, PlaylistUpdate, PlaylistTrack, PlaylistTrackInsert)
  - Define extended types (PlaylistWithTracks, PlaylistWithOwner)
  - Define form data interfaces (PlaylistFormData)
  - Define operation parameter interfaces (AddTrackToPlaylistParams, RemoveTrackFromPlaylistParams)
  - Define response interfaces (CreatePlaylistResponse, PlaylistOperationResponse)
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Implement playlist utility functions

  - Create lib/playlists.ts with all CRUD operations
  - Implement createPlaylist function with error handling
  - Implement getUserPlaylists function
  - Implement getPlaylistWithTracks function with track sorting
  - Implement updatePlaylist function
  - Implement deletePlaylist function
  - Implement addTrackToPlaylist with position management
  - Implement removeTrackFromPlaylist function
  - Implement isTrackInPlaylist check function
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.1 Implement playlist creation function

  - Write createPlaylist() function accepting userId and PlaylistFormData
  - Use Supabase client to insert playlist record
  - Handle errors and return CreatePlaylistResponse
  - Include proper TypeScript typing
  - _Requirements: 1.1, 1.2, 1.3, 1.7_

- [x] 3.2 Implement playlist retrieval functions

  - Write getUserPlaylists() to fetch user's playlists ordered by created_at
  - Write getPlaylistWithTracks() to fetch playlist with nested track data
  - Sort tracks by position in getPlaylistWithTracks()
  - Calculate track_count in response
  - _Requirements: 1.4, 3.6_

- [x] 3.3 Implement playlist update and delete functions

  - Write updatePlaylist() accepting playlistId and partial updates
  - Write deletePlaylist() accepting playlistId
  - Return PlaylistOperationResponse for both
  - Include comprehensive error handling

  - _Requirements: 1.5, 1.6_

- [x] 3.4 Implement track management functions

  - Write addTrackToPlaylist() with automatic position calculation
  - Handle duplicate track error (unique constraint violation)
  - Write removeTrackFromPlaylist() function
  - Write isTrackInPlaylist() check function
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

---

## Feature Implementation Phase

- [x] 4. Create playlist creation UI components

  - Implement CreatePlaylist form component with validation
  - Implement CreatePlaylistModal wrapper component
  - Add form state management and submission handling
  - Include loading and error states
  - _Requirements: 1.1, 1.2, 1.3, 1.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 10.6_

- [x] 4.1 Create CreatePlaylist form component

  - Create src/components/playlists/CreatePlaylist.tsx
  - Implement form with name, description, and is_public fields
  - Add form validation (required name, max lengths)
  - Implement handleSubmit with createPlaylist() call
  - Add loading state during submission
  - Display error messages
  - Handle success with callback or navigation
  - _Requirements: 1.1, 1.2, 1.3, 1.7, 8.2, 8.3, 10.6_

- [x] 4.2 Create CreatePlaylistModal wrapper

  - Create src/components/playlists/CreatePlaylistModal.tsx
  - Implement modal with backdrop and close button
  - Wrap CreatePlaylist component
  - Handle isOpen, onClose, and onSuccess props
  - Add click-outside-to-close functionality
  - _Requirements: 8.1, 10.6_

- [x] 5. Create playlist display and management components

  - Implement PlaylistCard component with edit/delete actions
  - Implement PlaylistsList component with grid layout
  - Add delete confirmation modal
  - Implement empty state handling
  - Add responsive grid layout
  - _Requirements: 1.4, 1.5, 1.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 5.1 Create PlaylistCard component

  - Create src/components/playlists/PlaylistCard.tsx
  - Display playlist cover image or gradient placeholder
  - Show playlist name, description, creation date
  - Display privacy badge for private playlists
  - Add Edit and Delete buttons for owners
  - Implement delete confirmation modal
  - Handle delete operation with loading state
  - _Requirements: 1.6, 8.2, 8.3, 8.4, 8.5, 8.7_

- [x] 5.2 Create PlaylistsList component

  - Create src/components/playlists/PlaylistsList.tsx
  - Fetch user's playlists on mount
  - Display playlists in responsive grid (1/2/3 columns)
  - Show loading state while fetching
  - Display empty state when no playlists
  - Add "Create Playlist" button
  - Integrate CreatePlaylistModal
  - Refresh list after create/delete operations
  - _Requirements: 1.4, 8.1, 8.4, 8.5, 8.6_

- [x] 6. Implement track management in playlists

  - Create AddToPlaylist dropdown component
  - Create PlaylistDetailClient component for playlist view
  - Implement add track functionality
  - Implement remove track functionality
  - Add duplicate prevention
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.6_

- [x] 6.1 Create AddToPlaylist component

  - Create src/components/playlists/AddToPlaylist.tsx
  - Display button that opens dropdown menu
  - Fetch user's playlists when opened
  - Show loading state while fetching
  - Display each playlist with add button
  - Check which playlists already contain the track
  - Show checkmark for playlists that already have the track
  - Disable add button for playlists with track
  - Handle add operation with loading state
  - Call onSuccess callback after successful add
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.2_

- [x] 6.2 Create playlist detail page (server component)

  - Create src/app/playlists/[id]/page.tsx
  - Fetch playlist with tracks using getPlaylistWithTracks()
  - Check user authentication and playlist access permissions
  - Redirect if playlist not found or access denied
  - Pass playlist data and isOwner flag to client component
  - _Requirements: 2.2, 2.3, 3.6, 10.4_

- [x] 6.3 Create PlaylistDetailClient component

  - Create src/components/playlists/PlaylistDetailClient.tsx
  - Display playlist header with cover, name, description, metadata
  - Show privacy badge for private playlists
  - Display track count and creation date
  - Show Edit button for owners
  - Render track list with position numbers
  - Display track cover, title, artist, duration
  - Add Remove button for each track (owners only)
  - Implement remove track with confirmation
  - Update local state optimistically after removal
  - Show empty state when no tracks
  - _Requirements: 3.5, 3.6, 3.7, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

---

## Integration Phase

- [x] 7. Integrate playlist functionality throughout application

  - Add Playlists link to main navigation
  - Add AddToPlaylist component to track displays
  - Create playlists main page
  - Ensure authentication checks
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 7.1 Add playlists navigation link

  - Update main navigation component (Header.tsx or Navigation.tsx)
  - Add "Playlists" link that navigates to /playlists
  - Show link only for authenticated users
  - Highlight active state when on playlists pages
  - _Requirements: 10.1, 10.3_

- [x] 7.2 Integrate AddToPlaylist in track components

  - Find all track display components (TrackCard, TrackList, track detail pages)
  - Add AddToPlaylist component with trackId prop
  - Position button appropriately in UI
  - Ensure button only shows for authenticated users
  - _Requirements: 10.2_

- [x] 7.3 Create playlists main page

  - Create src/app/playlists/page.tsx
  - Check user authentication (redirect if not authenticated)
  - Render PlaylistsList component
  - Add page title and metadata
  - _Requirements: 10.3_

---

## Performance Dashboard Phase

- [x] 8. Create performance dashboard structure

  - Implement PerformanceDashboard main component
  - Create tab navigation system
  - Add expand/collapse functionality
  - Implement auto-refresh toggle
  - Add Generate Report and Reset buttons
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 8.1 Create PerformanceDashboard component structure

  - Create src/components/performance/PerformanceDashboard.tsx
  - Implement collapsed state as fixed button in bottom-right
  - Implement expanded state as panel with tabs
  - Add state management for isExpanded and activeTab
  - Create tab buttons for Overview, Performance, Cache, Bandwidth
  - Add auto-refresh checkbox in header
  - Add close button in header
  - Add Generate Report and Reset buttons in footer
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 9.1, 9.2, 9.5_

- [x] 9. Implement performance monitoring features

  - Create OverviewTab with session and cache metrics
  - Create PerformanceTab with render tracking
  - Create CacheTab with storage statistics
  - Create BandwidthTab with transfer metrics
  - Implement localStorage persistence
  - Add metric calculation logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.3, 9.4, 9.6, 9.7_

- [x] 9.1 Implement OverviewTab component

  - Create OverviewTab function component within PerformanceDashboard
  - Track session duration using sessionStorage
  - Calculate cache hit rate from localStorage cacheStats
  - Display API calls saved (cache hits)
  - Calculate optimization status (Excellent/Good/Poor based on hit rate)
  - Create MetricCard component for displaying metrics
  - Update metrics every 5 seconds when auto-refresh enabled
  - Format duration as minutes and seconds
  - Use color coding for status (green/blue/yellow)
  - _Requirements: 6.1, 6.5, 9.3, 9.4, 9.7_

- [x] 9.2 Implement PerformanceTab component

  - Create PerformanceTab function component
  - Track component renders in localStorage
  - Track effect executions in localStorage
  - Display render and effect counts
  - Store and display performance warnings array
  - Update metrics every 5 seconds when auto-refresh enabled
  - _Requirements: 6.2, 6.5_

- [x] 9.3 Implement CacheTab component

  - Create CacheTab function component
  - Read metadata, images, and audio cache from localStorage
  - Calculate cache size, items count, and hits for each type
  - Display statistics in cards for each cache type
  - Add Clear button for each cache type
  - Format byte sizes in human-readable units (B, KB, MB)
  - Update statistics every 5 seconds when auto-refresh enabled
  - _Requirements: 6.3, 6.5, 6.7, 9.3, 9.4_

- [x] 9.4 Implement BandwidthTab component

  - Create BandwidthTab function component
  - Read bandwidth statistics from localStorage
  - Display total transfer and saved bandwidth
  - Show top 5 resources with sizes
  - Indicate cached resources with checkmark
  - Add Clear Bandwidth Data button
  - Format byte sizes in human-readable units
  - Update statistics every 5 seconds when auto-refresh enabled
  - _Requirements: 6.4, 6.5, 6.7, 9.3, 9.4_

- [x] 9.5 Add dashboard to application layout

  - Update src/app/layout.tsx or main layout component
  - Import and add PerformanceDashboard component
  - Place at end of component tree (renders as fixed position)
  - Ensure dashboard appears on all pages
  - Verify dashboard doesn't interfere with page content
  - _Requirements: 5.1, 9.1, 9.2_

---

## Testing and Validation Phase

- [x] 10. Perform comprehensive testing

  - Execute functional testing for all features
  - Verify cross-browser compatibility
  - Validate performance benchmarks
  - Confirm security measures
  - Test complete user workflows
  - _Requirements: All requirements_

- [x] 10.1 Execute functional testing checklist

  - Test playlist creation (public and private)
  - Test playlist editing
  - Test playlist deletion with confirmation
  - Test adding tracks to playlists
  - Test removing tracks from playlists
  - Test viewing playlists with tracks
  - Test access control (private vs public)
  - Test dashboard open/close
  - Test all dashboard tabs
  - Test dashboard metrics updates
  - Test auto-refresh toggle
  - Test clear cache functions
  - Test generate report function
  - Verify no console errors
  - Run TypeScript compiler check
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 6.1, 6.2, 6.3, 6.4, 6.7_

- [x] 10.2 Perform cross-browser testing

  - Test in Chrome/Edge (all features work, no errors, UI renders correctly)
  - Test in Firefox (all features work, no errors, UI renders correctly)
  - Test in Safari if available (all features work, no errors, UI renders correctly)
  - Test on mobile browsers (responsive design, touch interactions, no layout issues)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10.3 Validate performance benchmarks

  - Verify playlist queries execute in < 3 seconds
  - Confirm RLS policies enforce correctly
  - Check for N+1 query problems
  - Verify components render efficiently
  - Check for excessive re-renders
  - Confirm smooth transitions and animations
  - Verify cache hit rate improves over time
  - Check localStorage usage is reasonable
  - Test for memory leaks
  - _Requirements: 6.5, 6.6_

- [x] 10.4 Confirm security measures

  - Verify users can only modify own playlists
  - Confirm private playlists not accessible to others
  - Verify public playlists viewable by all
  - Test track management respects ownership
  - Verify XSS protection in form inputs
  - Confirm SQL injection prevented (Supabase client)
  - Test character limits enforced
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 2.1, 2.2, 2.3_

- [x] 11. Update documentation and finalize


  - Update README with new features
  - Create or update CHANGELOG
  - Update steering documents
  - Run final code quality checks
  - Prepare git commit message
  - _Requirements: All requirements_

- [x] 11.1 Update README.md

  - Add Playlist System section describing features
  - Add usage instructions for playlists
  - Add Performance Dashboard section
  - Describe dashboard features and access method
  - Include screenshots or examples if helpful
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 11.2 Update CHANGELOG.md

  - Create Month 3 Week 4 entry
  - List all added features (Playlist System, Performance Dashboard)
  - Document changed components (navigation, track components)
  - Note fixed issues (TypeScript errors, RLS policies)
  - Document security improvements
  - _Requirements: All requirements_

- [x] 11.3 Update steering documents

  - Update .kiro/steering/product.md with progress tracking
  - Mark Month 3 Week 4 as complete
  - Add feature completion notes
  - Document any lessons learned
  - _Requirements: All requirements_

- [x] 11.4 Run final code quality checks

  - Run `npx tsc --noEmit` (verify no TypeScript errors)
  - Run `npm run lint` if available (verify no critical linting errors)
  - Run `npm run build` (verify build succeeds)
  - Check browser console for errors/warnings
  - Review all changed files
  - Verify no sensitive data in code
  - Verify no unnecessary files included
  - _Requirements: All requirements_

---

## Task Execution Notes

### Task Dependencies

- Tasks 1.1-1.5 must complete before Task 2
- Task 2 must complete before Task 3
- Tasks 1-3 must complete before Tasks 4-6
- Tasks 4-6 can be worked on in parallel after foundation is complete
- Task 7 requires Tasks 4-6 to be complete
- Tasks 8-9 are independent and can be worked on in parallel with Tasks 4-7
- Task 10 requires all previous tasks to be complete
- Task 11 requires Task 10 to be complete

### Testing Guidelines

- Test after completing each major task
- Run TypeScript compiler check after any type changes
- Test database operations in Supabase dashboard
- Verify RLS policies by attempting unauthorized operations
- Test UI components in browser during development
- Check responsive design on mobile viewport

### All Tasks Required

All tasks including comprehensive testing are required for production-ready implementation. This ensures quality, security, and performance from the start.

### Success Criteria

- All non-optional tasks completed
- No TypeScript compilation errors
- No console errors in browser
- All functional tests pass
- Documentation updated
- Code ready for git commit

---

_Implementation Plan Version: 1.0_  
_Created: Month 3 Week 4_  
_Total Tasks: 11 main tasks with 40+ sub-tasks_  
_Estimated Time: 5.5 hours_
