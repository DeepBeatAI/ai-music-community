# Requirements Document - My Library Fixes and Enhancements

## Introduction

This specification addresses critical bugs and user experience improvements identified during manual testing of the My Library feature. The fixes focus on data loading issues, UI/UX enhancements, and functional corrections to ensure a smooth user experience across all library sections.

## Glossary

- **My Library System**: The comprehensive personal music management interface at /library
- **Stats Section**: Dashboard component displaying user metrics
- **Upload Section**: Audio upload interface with post-upload assignment
- **All Tracks Section**: Grid display of user-uploaded tracks with management actions
- **My Albums Section**: Collection management interface for organizing tracks into albums
- **My Playlists Section**: Playlist management interface
- **Track Card**: Visual component displaying track information with action menu
- **Album Card**: Visual component displaying album information
- **Mini Player**: Global audio player component that persists across pages

## Requirements

### Requirement 1: Fix Page Refresh and Navigation Loading Issues

**User Story:** As a user, when I refresh the /library page or navigate using the browser back button, I want all sections to load correctly, so that I can access my albums and playlists without workarounds.

#### Acceptance Criteria

1. WHEN THE user refreshes the /library page, THE My Library System SHALL load all sections including My Albums and My Playlists completely
2. WHEN THE user navigates to /library using the browser back button, THE My Library System SHALL load all sections including My Albums and My Playlists completely
3. THE My Library System SHALL NOT display skeleton loaders indefinitely for My Albums and My Playlists sections
4. THE My Library System SHALL implement proper data fetching that works consistently across all navigation methods
5. THE My Library System SHALL handle component mounting and data fetching lifecycle correctly

### Requirement 2: Fix Stats Section Play Count Calculation

**User Story:** As a user, I want accurate play count statistics, so that I can track my music performance correctly.

#### Acceptance Criteria

1. THE Stats Section SHALL calculate "Plays This Week" by summing play counts for tracks played within the last 7 days
2. THE Stats Section SHALL calculate "Total Plays" by summing all play counts for all user tracks
3. THE Stats Section SHALL NOT display identical values for "Plays This Week" and "Total Plays" unless all plays occurred within the current week
4. THE Stats Section SHALL query the correct database fields for play count data
5. THE Stats Section SHALL handle cases where play count data is null or undefined

### Requirement 3: Fix Track Upload Database Error

**User Story:** As a user, when I upload a track, I want the upload to complete successfully without database errors, so that I can add content to my library.

#### Acceptance Criteria

1. WHEN THE user uploads a track, THE Upload Section SHALL insert the track into the database without constraint violations
2. THE Upload Section SHALL provide all required fields for track insertion
3. THE Upload Section SHALL handle optional fields correctly (allowing null values where appropriate)
4. THE Upload Section SHALL display user-friendly error messages when upload fails
5. THE Upload Section SHALL log detailed error information for debugging

### Requirement 4: Improve Track Card Visual Clarity

**User Story:** As a user, I want clear and intuitive track card displays, so that I can quickly understand track information and interact with tracks easily.

#### Acceptance Criteria

1. THE Track Card SHALL replace the eye icon with a play icon or add "plays" text label for clarity
2. THE Track Card SHALL display the number of likes the track has received
3. THE Track Card SHALL display the track author's username
4. THE All Tracks Section SHALL limit the initial display to 8 tracks maximum
5. THE Track Card SHALL include a small play button icon that starts playback in the mini player
6. THE Track Card play button SHALL integrate with the existing mini player system

### Requirement 5: Fix Album Assignment Menu Display

**User Story:** As a user, when I add a track to an album, I want a clean selection menu without unnecessary information, so that I can quickly choose the target album.

#### Acceptance Criteria

1. WHEN THE user clicks "Add to Album" on a track, THE My Library System SHALL display an album selection menu
2. THE album selection menu SHALL display only album names without descriptions
3. THE album selection menu SHALL maintain album cover images for visual identification
4. THE album selection menu SHALL be easy to scan and select from

### Requirement 6: Fix Playlist Track Removal Functionality

**User Story:** As a user, when I uncheck a playlist in the track assignment menu, I want the track to be removed from that playlist, so that I can manage playlist membership correctly.

#### Acceptance Criteria

1. WHEN THE user unchecks a playlist checkbox in the "Add to Playlists" menu, THE My Library System SHALL remove the track from that playlist
2. WHEN THE user clicks "Save" after unchecking playlists, THE My Library System SHALL persist the removal to the database
3. THE My Library System SHALL NOT revert unchecked checkboxes back to checked state after save
4. THE My Library System SHALL display success confirmation when playlist membership is updated
5. THE My Library System SHALL handle both adding and removing tracks in the same save operation

### Requirement 7: Fix Track Deletion Database Constraint Error

**User Story:** As a user, when I delete a track, I want the deletion to complete successfully, so that I can remove unwanted content from my library.

#### Acceptance Criteria

1. WHEN THE user confirms track deletion, THE My Library System SHALL delete the track without database constraint violations
2. THE My Library System SHALL handle the relationship between tracks and posts tables correctly
3. THE My Library System SHALL remove or update related records before deleting the track
4. THE My Library System SHALL display success confirmation when deletion completes
5. THE My Library System SHALL remove the track from the UI immediately after successful deletion

### Requirement 8: Enhance Tracks Page Functionality

**User Story:** As a user, on the /tracks page, I want functional track cards with filters and playback controls, so that I can discover and play music easily.

#### Acceptance Criteria

1. THE Track Card actions menu (3 dots) on /tracks page SHALL function correctly for all actions
2. THE Track Card on /tracks page SHALL display play count with clear icon or label
3. THE Track Card on /tracks page SHALL include a play button that starts playback in the mini player
4. THE Track Card on /tracks page SHALL display the number of likes
5. THE Track Card on /tracks page SHALL display the track author's username
6. THE /tracks page filters SHALL include a "Most Liked" sorting option
7. THE "Most Liked" filter SHALL sort tracks by like count in descending order

### Requirement 9: Fix Album Creation and Management

**User Story:** As a user, I want to create and manage albums without errors or UI issues, so that I can organize my music collection effectively.

#### Acceptance Criteria

1. THE "New Album" creation window SHALL NOT display a "Cover Image URL" input field
2. THE album edit page SHALL load correctly without 404 errors
3. WHEN THE album description is long, THE album details page SHALL display the description within its container without overflow
4. WHEN THE user edits an album and clicks "Back to Library", THE album card SHALL display updated information without requiring a page refresh
5. THE album details page SHALL include a "Play Album" button that plays all tracks sequentially in the mini player
6. THE album details page SHALL include a "Play" button next to each track that starts playback in the mini player
7. THE album playback controls SHALL function identically to playlist playback controls

### Requirement 10: Improve My Playlists Section Layout

**User Story:** As a user, I want the My Playlists section to have consistent styling and navigation, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE My Playlists Section SHALL NOT be wrapped in an unnecessary container box
2. THE My Playlists Section SHALL include a collapse/expand arrow button consistent with other sections
3. THE playlist details page SHALL display a "Back to Library" button instead of "Back to Playlists"
4. THE My Playlists Section SHALL maintain visual consistency with My Albums and All Tracks sections

