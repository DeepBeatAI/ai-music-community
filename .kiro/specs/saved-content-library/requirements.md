# Requirements Document

## Introduction

This feature enhances the existing Library page by adding display sections for saved content (tracks, albums, and playlists). Users can view content they have saved from other creators, remove items from their saved collections, and navigate to creator profiles. The feature leverages existing database tables and save/unsave functionality while introducing new UI components that follow established patterns from the current Library page.

## Glossary

- **Library Page**: The `/library` route where users manage their own content and view saved content
- **Saved Content**: Tracks, albums, or playlists that a user has bookmarked from other creators
- **Save Service**: Existing utility functions (`saveTrack`, `unsaveTrack`, etc.) for managing saved content
- **Section Component**: A collapsible UI component displaying a collection of items (tracks, albums, or playlists)
- **Creator Attribution**: Display of the original creator's username with a link to their profile
- **Cache Utility**: Existing browser caching mechanism for optimizing data fetching
- **User**: An authenticated user of the AI Music Community Platform

## Requirements

### Requirement 1

**User Story:** As a user, I want to view all tracks I have saved from other creators, so that I can easily access and play music I've bookmarked.

#### Acceptance Criteria

1. WHEN the User navigates to the Library page, THE Library Page SHALL display a "Saved Tracks" section below existing content sections
2. WHILE the User is authenticated, THE Saved Tracks Section SHALL fetch and display tracks from the saved_tracks database table ordered by most recently saved first
3. WHEN a saved track is displayed, THE Saved Tracks Section SHALL show the track title, creator username, waveform visualization, and a "Remove" button
4. WHEN the User clicks on a creator username, THE Library Page SHALL navigate to that creator's profile page
5. IF no saved tracks exist, THEN THE Saved Tracks Section SHALL display an empty state message indicating no saved tracks

### Requirement 2

**User Story:** As a user, I want to view all albums I have saved from other creators, so that I can explore collections of music I've bookmarked.

#### Acceptance Criteria

1. WHEN the User navigates to the Library page, THE Library Page SHALL display a "Saved Albums" section below the Saved Tracks section
2. WHILE the User is authenticated, THE Saved Albums Section SHALL fetch and display albums from the saved_albums database table ordered by most recently saved first
3. WHEN a saved album is displayed, THE Saved Albums Section SHALL show the album title, creator username, track count, and a "Remove" button
4. WHEN the User clicks on a creator username, THE Library Page SHALL navigate to that creator's profile page
5. IF no saved albums exist, THEN THE Saved Albums Section SHALL display an empty state message indicating no saved albums

### Requirement 3

**User Story:** As a user, I want to view all playlists I have saved from other creators, so that I can access curated collections I've bookmarked.

#### Acceptance Criteria

1. WHEN the User navigates to the Library page, THE Library Page SHALL display a "Saved Playlists" section below the Saved Albums section
2. WHILE the User is authenticated, THE Saved Playlists Section SHALL fetch and display playlists from the saved_playlists database table ordered by most recently saved first
3. WHEN a saved playlist is displayed, THE Saved Playlists Section SHALL show the playlist title, creator username, track count, and a "Remove" button
4. WHEN the User clicks on a creator username, THE Library Page SHALL navigate to that creator's profile page
5. IF no saved playlists exist, THEN THE Saved Playlists Section SHALL display an empty state message indicating no saved playlists

### Requirement 4

**User Story:** As a user, I want to remove items from my saved collections, so that I can manage and curate my bookmarked content.

#### Acceptance Criteria

1. WHEN the User clicks the "Remove" button on a saved track, THE Saved Tracks Section SHALL call the unsaveTrack function and remove the track from the display
2. WHEN the User clicks the "Remove" button on a saved album, THE Saved Albums Section SHALL call the unsaveAlbum function and remove the album from the display
3. WHEN the User clicks the "Remove" button on a saved playlist, THE Saved Playlists Section SHALL call the unsavePlaylist function and remove the playlist from the display
4. WHEN a remove action completes successfully, THE Library Page SHALL display a toast notification confirming the removal
5. IF a remove action fails, THEN THE Library Page SHALL display an error toast notification and retain the item in the display

### Requirement 5

**User Story:** As a user, I want saved content sections to be collapsible, so that I can focus on specific types of content and manage screen space efficiently.

#### Acceptance Criteria

1. WHEN a saved content section is displayed, THE Section Component SHALL include a collapse/expand toggle button
2. WHEN the User clicks the toggle button, THE Section Component SHALL collapse or expand the content area
3. WHILE a section is collapsed, THE Section Component SHALL persist the collapsed state in browser localStorage
4. WHEN the User returns to the Library page, THE Section Component SHALL restore the previous collapsed/expanded state from localStorage
5. THE Section Component SHALL display a visual indicator (icon or arrow) showing the current collapsed/expanded state

### Requirement 6

**User Story:** As a user, I want saved content sections to handle loading and error states gracefully, so that I understand the system status and can retry if needed.

#### Acceptance Criteria

1. WHILE saved content is being fetched, THE Section Component SHALL display a loading indicator
2. IF a fetch operation fails, THEN THE Section Component SHALL display an error message with a retry button
3. WHEN the User clicks the retry button, THE Section Component SHALL re-attempt to fetch the saved content
4. WHEN saved content is successfully loaded, THE Section Component SHALL display the items in a responsive grid layout
5. THE Section Component SHALL use error boundaries to prevent crashes from affecting other page sections

### Requirement 7

**User Story:** As a user, I want saved content to be clearly distinguished from my own content, so that I can easily identify which items I created versus which I saved.

#### Acceptance Criteria

1. WHEN saved content sections are displayed, THE Library Page SHALL show a visual divider with the label "🔖 Saved Content" above the sections
2. WHEN a saved item is displayed, THE Section Component SHALL use the 🔖 bookmark emoji as a visual indicator
3. WHEN a saved item is displayed, THE Section Component SHALL prominently show the creator's username with the prefix "by @username"
4. THE Section Component SHALL use consistent styling that matches existing Library page sections while maintaining visual distinction
5. THE Section Component SHALL maintain dark theme consistency with the rest of the application

### Requirement 8

**User Story:** As a developer, I want saved content queries to be efficient and follow existing patterns, so that the feature is maintainable and performs well.

#### Acceptance Criteria

1. THE Save Service SHALL implement getSavedTracks function that joins saved_tracks, tracks, and user_profiles tables in a single query
2. THE Save Service SHALL implement getSavedAlbums function that joins saved_albums, albums, and user_profiles tables in a single query
3. THE Save Service SHALL implement getSavedPlaylists function that joins saved_playlists, playlists, and user_profiles tables in a single query
4. WHEN fetching saved content, THE Save Service SHALL accept optional limit and offset parameters for pagination
5. THE Save Service SHALL use the existing cache utility with appropriate cache keys for saved content queries
