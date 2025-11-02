# Requirements Document

## Introduction

The My Library feature transforms the existing playlists-only page into a comprehensive personal music management hub. This feature enables users to manage their entire music collection including individual tracks, albums, and playlists in a unified dashboard-style interface. The system provides statistics, upload capabilities, and organization tools while maintaining the existing playlist functionality.

## Glossary

- **My Library System**: The comprehensive personal music management interface that replaces the playlists-only page
- **Stats Section**: A dashboard component displaying user metrics including upload limits, track counts, album counts, playlist counts, and play statistics
- **Track Upload Component**: A retractable audio upload interface reused from the dashboard page
- **All Tracks Section**: A grid display of all user-uploaded tracks with management actions
- **Albums Section**: A collection management interface for organizing tracks into albums (exclusive relationship)
- **Playlists Section**: The existing playlist management interface (non-exclusive relationship)
- **Track Card**: A visual component displaying track information without waveform visualization
- **Upload Remaining**: A metric showing the number of tracks a user can still upload (infinite for MVP)
- **Album Assignment**: The process of adding a track to exactly one album
- **Playlist Assignment**: The process of adding a track to one or more playlists
- **Collapsible Section**: A UI component that can be expanded or collapsed to manage screen space

## Requirements

### Requirement 1: Stats Dashboard Display

**User Story:** As a user, I want to see my library statistics at a glance, so that I can quickly understand my content and usage metrics.

#### Acceptance Criteria

1. WHEN THE My Library System loads, THE Stats Section SHALL display six metrics in a horizontal row layout
2. THE Stats Section SHALL display "Upload Remaining" with a value of infinity (∞) for all users during MVP phase
3. THE Stats Section SHALL display "Total Tracks" showing the count of all tracks uploaded by the authenticated user
4. THE Stats Section SHALL display "Total Albums" showing the count of all albums created by the authenticated user
5. THE Stats Section SHALL display "Total Playlists" showing the count of all playlists created by the authenticated user
6. THE Stats Section SHALL display "Total Plays This Week" showing the sum of play counts for the user's tracks within the last 7 days
7. THE Stats Section SHALL display "Total Plays All Time" showing the cumulative sum of all play counts for the user's tracks
8. THE Stats Section SHALL render as a 2-row by 3-column grid on mobile devices

### Requirement 2: Track Upload Interface

**User Story:** As a user, I want to upload new tracks directly from My Library, so that I can add content to my collection without navigating to another page.

#### Acceptance Criteria

1. THE Track Upload Component SHALL reuse the existing AudioUpload component from the dashboard page
2. THE Track Upload Component SHALL be collapsible with an expand/collapse toggle button
3. WHEN THE Track Upload Component is collapsed, THE My Library System SHALL display a prominent "Upload New Track" button
4. WHEN a track upload completes successfully, THE My Library System SHALL display an inline success message
5. WHEN a track upload completes successfully, THE My Library System SHALL present optional dropdowns for "Add to Album" and "Add to Playlist"
6. THE Album Assignment dropdown SHALL allow the user to select one existing album or skip assignment
7. THE Playlist Assignment dropdown SHALL allow the user to select one or more existing playlists or skip assignment
8. THE Track Upload Component SHALL provide an "Upload Another" button that keeps the component expanded for batch uploads
9. THE Track Upload Component SHALL provide a "Done" button that collapses the component after assignment completion

### Requirement 3: All Tracks Display and Management

**User Story:** As a user, I want to view and manage all my uploaded tracks in one place, so that I can organize, share, and delete my content efficiently.

#### Acceptance Criteria

1. THE All Tracks Section SHALL display tracks in a grid layout similar to the discover page track cards
2. THE All Tracks Section SHALL display a maximum of 8 to 12 tracks initially
3. WHEN THE All Tracks Section contains more than 12 tracks, THE My Library System SHALL display a "View All" button linking to a full tracks page
4. THE Track Card SHALL display track cover art, title, play count, and upload date
5. THE Track Card SHALL NOT display waveform visualization during MVP phase
6. THE Track Card SHALL provide an actions menu (⋮) accessible on hover for desktop users
7. THE Track Card SHALL provide an actions menu accessible via long-press for mobile users
8. THE actions menu SHALL include options for "Add to Album", "Add to Playlist", "Copy Track URL", "Share", and "Delete"
9. WHEN THE user selects "Add to Album", THE My Library System SHALL display a dropdown of available albums
10. WHEN THE user selects "Add to Playlist", THE My Library System SHALL display a dropdown of available playlists with multi-select capability
11. WHEN THE user selects "Delete", THE My Library System SHALL display a confirmation dialog before removing the track
12. THE Track Card SHALL display visual badges indicating album and playlist membership

### Requirement 4: Albums Management Interface

**User Story:** As a user, I want to create and manage albums for my tracks, so that I can organize my music into cohesive collections representing bodies of work.

#### Acceptance Criteria

1. THE Albums Section SHALL reuse the existing playlist UI components and layout
2. THE Albums Section SHALL display albums in a horizontal scrollable row or grid layout
3. THE Albums Section SHALL display a maximum of 6 to 8 albums initially
4. WHEN THE Albums Section contains more than 8 albums, THE My Library System SHALL display a "View All" button
5. THE Albums Section SHALL provide a "+ New Album" button for creating new albums
6. THE album card SHALL display album cover art, album title, and track count
7. THE album card SHALL display track numbers (1, 2, 3...) when viewing album contents
8. THE My Library System SHALL enforce that each track belongs to at most one album (exclusive relationship)
9. WHEN THE user adds a track to an album, THE My Library System SHALL remove the track from any previously assigned album
10. THE Albums Section SHALL default new albums to public visibility
11. THE album interface SHALL support the same CRUD operations as playlists (create, read, update, delete)
12. THE album interface SHALL support drag-and-drop track reordering for album owners

### Requirement 5: Playlists Management Interface

**User Story:** As a user, I want to continue managing my playlists as before, so that I can maintain my existing music organization without disruption.

#### Acceptance Criteria

1. THE Playlists Section SHALL maintain the existing playlist UI and functionality without major UX changes
2. THE Playlists Section SHALL continue to display both "My Playlists" and "Public Playlists" subsections
3. THE My Library System SHALL support tracks belonging to multiple playlists simultaneously (non-exclusive relationship)
4. THE playlist card SHALL NOT display track numbers when viewing playlist contents
5. THE Playlists Section SHALL default new playlists to private visibility
6. THE Playlists Section SHALL support all existing playlist operations including create, edit, delete, and track management
7. THE Playlists Section SHALL support drag-and-drop track reordering for playlist owners

### Requirement 6: Page Layout and Navigation

**User Story:** As a user, I want a clean and organized library interface, so that I can easily access different sections without excessive scrolling.

#### Acceptance Criteria

1. THE My Library System SHALL organize content in a dashboard-style vertical layout
2. THE My Library System SHALL order sections as follows: Stats, Track Upload, All Tracks, My Albums, My Playlists
3. THE My Library System SHALL make each section collapsible except the Stats Section
4. THE My Library System SHALL provide collapse/expand toggle buttons for collapsible sections
5. THE My Library System SHALL implement lazy loading for Albums and Playlists sections when they become visible
6. THE My Library System SHALL limit section heights to reduce scrolling requirements
7. THE My Library System SHALL provide "View All" links for sections with more content than the preview limit
8. THE My Library System SHALL stack sections vertically on mobile devices
9. THE My Library System SHALL render the All Tracks Section as a 2-column grid on mobile devices

### Requirement 7: Database Schema for Albums

**User Story:** As a developer, I want a database schema for albums that mirrors playlists, so that I can reuse existing code patterns and maintain consistency.

#### Acceptance Criteria

1. THE My Library System SHALL create an "albums" table with columns: id, user_id, name, description, is_public, cover_image_url, created_at, updated_at
2. THE My Library System SHALL create an "album_tracks" table with columns: id, album_id, track_id, position, added_at
3. THE My Library System SHALL implement Row Level Security (RLS) policies on the albums table matching playlist security patterns
4. THE My Library System SHALL implement RLS policies on the album_tracks table matching playlist_tracks security patterns
5. THE My Library System SHALL create a unique constraint on (album_id, track_id) in the album_tracks table
6. THE My Library System SHALL create a database function "get_album_track_count" similar to the playlist equivalent
7. THE My Library System SHALL implement CASCADE delete for album_tracks when an album is deleted
8. THE My Library System SHALL create indexes on user_id, created_at, and position columns for performance optimization

### Requirement 8: Authentication and Authorization

**User Story:** As a user, I want my library content to be private and secure, so that only I can manage my tracks, albums, and playlists.

#### Acceptance Criteria

1. THE My Library System SHALL require user authentication to access any library features
2. WHEN THE user is not authenticated, THE My Library System SHALL redirect to the login page with a return URL
3. THE My Library System SHALL enforce that users can only view and modify their own tracks, albums, and playlists
4. THE My Library System SHALL implement RLS policies ensuring users cannot access other users' private content
5. THE My Library System SHALL validate user ownership before allowing any delete operations
6. THE My Library System SHALL validate user ownership before allowing any update operations to albums or playlists

### Requirement 9: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when operations succeed or fail, so that I understand the state of my actions and can recover from errors.

#### Acceptance Criteria

1. WHEN a track upload fails, THE My Library System SHALL display a user-friendly error message with retry option
2. WHEN a track deletion fails, THE My Library System SHALL display an error message and prevent the UI from updating
3. WHEN album or playlist assignment fails, THE My Library System SHALL display an error message and maintain previous state
4. WHEN a section fails to load, THE My Library System SHALL display a section-specific error message with retry button
5. THE My Library System SHALL implement optimistic UI updates for non-destructive operations
6. THE My Library System SHALL roll back optimistic updates when server operations fail
7. THE My Library System SHALL display loading states for all asynchronous operations
8. THE My Library System SHALL provide success confirmation messages for completed operations

### Requirement 10: Performance and Optimization

**User Story:** As a user, I want the library page to load quickly and respond smoothly, so that I can efficiently manage my music collection.

#### Acceptance Criteria

1. THE My Library System SHALL load the Stats Section and Track Upload Component within 1 second
2. THE My Library System SHALL implement lazy loading for track cards in the All Tracks Section
3. THE My Library System SHALL implement lazy loading for album and playlist cards
4. THE My Library System SHALL limit initial database queries to fetch only preview data (8-12 items per section)
5. THE My Library System SHALL cache track, album, and playlist data in component state to avoid redundant queries
6. THE My Library System SHALL debounce search and filter operations by 300 milliseconds
7. THE My Library System SHALL implement pagination for "View All" pages with 20 items per page
8. THE My Library System SHALL use React.memo for track, album, and playlist card components to prevent unnecessary re-renders
