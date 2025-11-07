# Requirements Document

## Introduction

This specification covers enhancements to the creator profile feature and related pages. These enhancements improve user experience by adding missing functionality, implementing existing features that were marked as "coming soon", and creating new pages for viewing albums and playlists.

## Glossary

- **Creator Profile Page**: The public-facing page displaying a creator's profile at `/profile/[username]`
- **Track Card**: UI component displaying track information with actions menu
- **Album Card**: UI component displaying album information
- **Playlist Card**: UI component displaying playlist information
- **Save Button**: Button to bookmark content for later access
- **Add to Playlist**: Feature to add tracks to user's playlists
- **Share**: Feature to share content via native share API or copy URL
- **Colorful Placeholder**: Gradient background for cards without cover art
- **Album Detail Page**: Page showing album tracks at `/album/[album_id]`
- **Playlist Detail Page**: Page showing playlist tracks at `/playlist/[playlist_id]`
- **Notification Event Card**: UI component in notifications page showing user activity
- **Follow Button**: Button to follow/unfollow creators

## Requirements

### Requirement 1: Hide Save/Remove Buttons on Own Profile

**User Story:** As a user viewing my own creator profile, I don't want to see Save/Remove buttons on my content, so that the interface is cleaner and less confusing.

#### Acceptance Criteria

1. WHEN a user views their own creator profile, THE System SHALL NOT display Save buttons on track cards
2. WHEN a user views their own creator profile, THE System SHALL NOT display Save buttons on album cards
3. WHEN a user views their own creator profile, THE System SHALL NOT display Save buttons on playlist cards
4. WHEN a user views another creator's profile, THE System SHALL display Save buttons on all content
5. THE System SHALL determine ownership by comparing authenticated user ID with content owner ID

### Requirement 2: Add Colorful Placeholders for Albums and Playlists

**User Story:** As a user, I want to see colorful placeholders on albums and playlists without cover art, so that the interface is more visually appealing.

#### Acceptance Criteria

1. THE System SHALL display a gradient background on album cards without cover art
2. THE System SHALL display a gradient background on playlist cards without cover art
3. THE System SHALL use the same gradient generation logic as `/library` page
4. THE System SHALL ensure gradients are consistent for the same album/playlist
5. THE System SHALL display cover art when available, with gradient as fallback only

### Requirement 3: Create Album Detail Page

**User Story:** As a user, I want to view album details and tracks when clicking on an album card, so that I can explore the album content.

#### Acceptance Criteria

1. WHEN a user clicks an album card, THE System SHALL navigate to `/album/[album_id]`
2. THE Album Detail Page SHALL mirror the UI of `/library/albums/[album_id]`
3. WHEN viewing another user's album, THE System SHALL NOT display edit button
4. WHEN viewing another user's album, THE System SHALL NOT display delete button
5. WHEN viewing another user's album, THE System SHALL NOT allow track reordering
6. WHEN viewing another user's album, THE System SHALL only show public albums
7. THE System SHALL display "Album not found" for private albums accessed by non-owners

### Requirement 4: Create Playlist Detail Page

**User Story:** As a user, I want to view playlist details and tracks when clicking on a playlist card, so that I can explore the playlist content.

#### Acceptance Criteria

1. WHEN a user clicks a playlist card, THE System SHALL navigate to `/playlist/[playlist_id]`
2. THE Playlist Detail Page SHALL mirror the UI of `/library/playlists/[playlist_id]`
3. WHEN viewing another user's playlist, THE System SHALL NOT display edit button
4. WHEN viewing another user's playlist, THE System SHALL NOT display delete button
5. WHEN viewing another user's playlist, THE System SHALL NOT allow track reordering
6. WHEN viewing another user's playlist, THE System SHALL only show public playlists
7. THE System SHALL display "Playlist not found" for private playlists accessed by non-owners

### Requirement 5: Implement Add to Playlist Functionality

**User Story:** As a user viewing another creator's tracks, I want to add their tracks to my playlists, so that I can organize content I enjoy.

#### Acceptance Criteria

1. WHEN a user clicks "Add to Playlist" in the track card 3-dot menu on `/profile/[username]/`, THE System SHALL display the Add to Playlist modal
2. WHEN a user clicks "Add to Playlist" in the track card 3-dot menu on `/profile/[username]/tracks/`, THE System SHALL display the Add to Playlist modal
3. THE System SHALL copy the implementation from `/library` and `/library/tracks` pages
4. THE System SHALL display all user's playlists in the modal
5. WHEN a user selects a playlist, THE System SHALL add the track to that playlist
6. THE System SHALL show success toast notification after adding track
7. THE System SHALL handle errors with appropriate error messages
8. THE System SHALL replace the current "Add to playlist feature coming soon" message with working functionality

### Requirement 6: Implement Share Functionality

**User Story:** As a user, I want to share tracks from creator profiles, so that I can recommend content to others.

#### Acceptance Criteria

1. WHEN a user clicks "Share" in the track card 3-dot menu on `/profile/[username]/`, THE System SHALL attempt native share API
2. WHEN a user clicks "Share" in the track card 3-dot menu on `/profile/[username]/tracks/`, THE System SHALL attempt native share API
3. IF native share is not available, THE System SHALL copy track URL to clipboard
4. THE System SHALL copy the implementation from `/library` and `/library/tracks` pages
5. THE System SHALL use the correct track URL format: `/tracks/[track_id]`
6. THE System SHALL show success toast notification after sharing
7. THE System SHALL replace the current "Share functionality coming soon" message with working functionality

### Requirement 7: Notifications Page - Event Card Navigation

**User Story:** As a user viewing notifications, I want to navigate to relevant pages when clicking event cards, so that I can see the full context of the notification.

#### Acceptance Criteria

1. WHEN a user clicks a follow event card, THE System SHALL navigate to the followed creator's profile page
2. WHEN a user clicks a post event card, THE System SHALL navigate to `/dashboard`
3. WHEN a user clicks an audio post event card, THE System SHALL navigate to `/dashboard`
4. WHEN a user clicks a like event card, THE System SHALL navigate to `/dashboard`
5. WHEN a user clicks a username in an event card, THE System SHALL navigate to that creator's profile page
6. IF the username is the authenticated user's username, THE System SHALL NOT make it clickable

### Requirement 8: Notifications Page - Fix Follow Button

**User Story:** As a user viewing notifications, I want to follow/unfollow creators directly from notification cards, so that I can manage my follows efficiently.

#### Acceptance Criteria

1. THE System SHALL display a working Follow button on notification event cards
2. THE System SHALL copy the Follow button implementation from `/home` page "Suggested for you" section
3. WHEN a user clicks Follow, THE System SHALL create a follow relationship
4. WHEN a user clicks Following, THE System SHALL remove the follow relationship
5. THE System SHALL update the button state immediately (optimistic update)
6. THE System SHALL show appropriate error messages if the action fails

