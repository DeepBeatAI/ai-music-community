# Requirements Document

## Introduction

This specification addresses enhancements to the Library page (`/library`) to improve UI consistency, data filtering, and user experience. The enhancements focus on matching the UI patterns used on creator profile pages, adding collapse state persistence to all sections, and removing unnecessary UI elements.

## Glossary

- **Library Page**: The `/library` page where users manage their own content and view saved content
- **Creator Page**: The `/profile/[username]` page showing a creator's public content
- **Saved Content**: Tracks, albums, and playlists that users have saved from other creators
- **Collapse State**: Whether a section is expanded or collapsed, persisted in localStorage
- **Card Component**: A UI component displaying a track, album, or playlist
- **RLS**: Row Level Security - database-level access control

## Requirements

### Requirement 1: Filter Saved Content

**User Story:** As a user, I want to see only other creators' public content in my Saved Content sections, so that I don't see my own content or private content I shouldn't have access to.

#### Acceptance Criteria

1. WHEN THE System fetches saved tracks, THE System SHALL exclude tracks where the track's user_id matches the current user's id
2. WHEN THE System fetches saved albums, THE System SHALL exclude albums where the album's user_id matches the current user's id
3. WHEN THE System fetches saved playlists, THE System SHALL exclude playlists where the playlist's user_id matches the current user's id
4. WHEN THE System fetches saved playlists, THE System SHALL include only playlists where is_public equals true
5. IF a user has saved their own content, THEN THE System SHALL not display it in the Saved Content sections

### Requirement 2: Match Creator Page Card UI for Saved Tracks

**User Story:** As a user, I want saved track cards to look and function like track cards on creator pages, so that I have a consistent experience across the platform.

#### Acceptance Criteria

1. WHEN a saved track card is displayed, THE System SHALL show a play button overlay that appears on hover (desktop) or is always visible (mobile)
2. WHEN a saved track card is displayed, THE System SHALL show album membership badges if the track belongs to an album
3. WHEN a saved track card is displayed, THE System SHALL show playlist membership badges indicating how many playlists contain the track
4. WHEN a saved track card is displayed, THE System SHALL show play count, like count, and upload date in the metadata section
5. WHEN a saved track card is displayed, THE System SHALL provide an actions menu with options: Remove, Add to Playlist, Copy URL, and Share
6. WHEN the play button is clicked, THE System SHALL start playing the track using the playback context
7. WHEN a saved track card is displayed, THE System SHALL show the track author prominently and uploader username as secondary information

### Requirement 3: Match Creator Page Card UI for Saved Albums

**User Story:** As a user, I want saved album cards to look like album cards on creator pages, so that I have a consistent experience.

#### Acceptance Criteria

1. WHEN a saved album card is displayed, THE System SHALL show the album cover image or a gradient placeholder with album icon
2. WHEN a saved album card is displayed, THE System SHALL show the album name, description (if present), and creation date
3. WHEN a saved album card is displayed, THE System SHALL show a Remove button (SaveButton component) in the metadata section
4. WHEN the album card is clicked, THE System SHALL navigate to the album detail page
5. WHEN a saved album card is displayed, THE System SHALL use the same gradient color scheme as creator page album cards

### Requirement 4: Match Creator Page Card UI for Saved Playlists

**User Story:** As a user, I want saved playlist cards to look like playlist cards on creator pages, so that I have a consistent experience.

#### Acceptance Criteria

1. WHEN a saved playlist card is displayed, THE System SHALL show the playlist cover image or a gradient placeholder with playlist icon
2. WHEN a saved playlist card is displayed, THE System SHALL show the playlist name, description (if present), and creation date
3. WHEN a saved playlist card is displayed, THE System SHALL show a Remove button (SaveButton component) in the metadata section
4. WHEN the playlist card is clicked, THE System SHALL navigate to the playlist detail page
5. WHEN a saved playlist card is displayed, THE System SHALL use the same gradient color scheme as creator page playlist cards

### Requirement 5: Add Collapse State Persistence to All Tracks Section

**User Story:** As a user, I want the All Tracks section to remember if I collapsed it, so that my preference is maintained across page visits.

#### Acceptance Criteria

1. WHEN the All Tracks section is collapsed, THE System SHALL save the collapsed state to localStorage with key "all-tracks-collapsed"
2. WHEN the Library page loads, THE System SHALL restore the All Tracks section's collapsed state from localStorage
3. WHEN the collapse toggle button is clicked, THE System SHALL update the collapsed state in localStorage
4. WHEN the All Tracks section is collapsed, THE System SHALL hide the track grid with a smooth transition
5. WHEN the All Tracks section is expanded, THE System SHALL show the track grid with a smooth transition

### Requirement 6: Add Collapse State Persistence to My Albums Section

**User Story:** As a user, I want the My Albums section to remember if I collapsed it, so that my preference is maintained across page visits.

#### Acceptance Criteria

1. WHEN the My Albums section is collapsed, THE System SHALL save the collapsed state to localStorage with key "my-albums-collapsed"
2. WHEN the Library page loads, THE System SHALL restore the My Albums section's collapsed state from localStorage
3. WHEN the collapse toggle button is clicked, THE System SHALL update the collapsed state in localStorage
4. WHEN the My Albums section is collapsed, THE System SHALL hide the album grid with a smooth transition
5. WHEN the My Albums section is expanded, THE System SHALL show the album grid with a smooth transition

### Requirement 7: Add Collapse State Persistence to My Playlists Section

**User Story:** As a user, I want the My Playlists section to remember if I collapsed it, so that my preference is maintained across page visits.

#### Acceptance Criteria

1. WHEN the My Playlists section is collapsed, THE System SHALL save the collapsed state to localStorage with key "my-playlists-collapsed"
2. WHEN the Library page loads, THE System SHALL restore the My Playlists section's collapsed state from localStorage
3. WHEN the collapse toggle button is clicked, THE System SHALL update the collapsed state in localStorage
4. WHEN the My Playlists section is collapsed, THE System SHALL hide the playlist content with a smooth transition
5. WHEN the My Playlists section is expanded, THE System SHALL show the playlist content with a smooth transition

### Requirement 8: Remove Public Playlists Sub-section

**User Story:** As a user, I want to see only my playlists in the My Playlists section without a confusing sub-section, so that the interface is cleaner and simpler.

#### Acceptance Criteria

1. WHEN the My Playlists section is displayed, THE System SHALL not show a "Public Playlists" sub-section
2. WHEN the My Playlists section is displayed, THE System SHALL show all user playlists (both public and private) in a single unified list
3. WHEN the My Playlists section is displayed, THE System SHALL maintain the existing privacy badge display on each playlist card
4. WHEN the My Playlists section is displayed, THE System SHALL maintain all existing functionality (create, edit, delete, reorder)
5. WHEN the My Playlists section is displayed, THE System SHALL use the same grid layout as before without the sub-section wrapper
