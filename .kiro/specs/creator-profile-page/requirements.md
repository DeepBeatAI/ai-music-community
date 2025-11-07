# Requirements Document

## Introduction

The Creator Profile Page feature enables users to explore other creators' profiles, view their public content (tracks, albums, playlists), and interact through following and saving content. This feature transforms the platform from a personal library system into a social discovery platform where users can discover and engage with other creators' work. The feature includes URL routing changes to separate account management (/account) from public creator profiles (/profile), comprehensive integration across existing pages, and new social features like following and saving content.

## Glossary

- **Creator Profile Page**: A public-facing page displaying a creator's profile information, statistics, and public content
- **Profile System**: The application component that manages user profile pages and account settings
- **Library Page**: The existing /library page showing a user's own tracks, albums, and playlists
- **Account Page**: The page for managing user account settings (renamed from /profile)
- **Follow System**: The social feature allowing users to follow other creators
- **Save System**: The feature allowing users to bookmark tracks, albums, and playlists for later access
- **User Type Badge**: A visual indicator showing the user's account tier (e.g., "Free User")
- **Creator Score**: A calculated metric representing a creator's popularity and engagement
- **Public Content**: Tracks, albums, and playlists marked as publicly visible
- **Stats Card**: A UI component displaying key metrics about a creator
- **Mini Player**: The persistent audio player component that remains visible across page navigation
- **Event Card**: A UI component displaying activity feed events

## Requirements

### Requirement 1: URL Routing and Navigation Structure

**User Story:** As a user, I want clear separation between my account settings and public creator profiles, so that I can easily manage my account and view other creators' work.

#### Acceptance Criteria

1. WHEN a user navigates to /account, THE Profile System SHALL display the current /profile page content for account management
2. WHEN a user navigates to /profile, THE Profile System SHALL display the authenticated user's own creator profile page
3. WHEN a user navigates to /profile/[username], THE Profile System SHALL display the specified creator's public profile page
4. IF the username contains spaces or special characters that prevent URL routing, THEN THE Profile System SHALL support /profile/[userid] as an alternative route
5. WHEN a user clicks their avatar in the top menu header, THE Profile System SHALL display a dropdown menu with "My Creator Profile" and "Manage my Account" options

### Requirement 2: Creator Profile Page Layout and Content

**User Story:** As a user, I want to view a creator's profile with their public content organized similarly to my library, so that I can easily browse their work.

#### Acceptance Criteria

1. THE Creator Profile Page SHALL display a User Type badge at the top showing the creator's account tier from the database
2. THE Creator Profile Page SHALL display stats cards with Creator Score, Followers (followers count), Tracks (count only public tracks), Albums (count only public albums), Playlists (count only public playlists), and Total Plays
3. THE Creator Profile Page SHALL display an "Albums" section showing only the creator's public albums
4. THE Creator Profile Page SHALL display a "Public Playlists" section showing only the creator's public playlists
5. THE Creator Profile Page SHALL display an "All Tracks" section with a "View All" button that redirects to a dedicated tracks page showing all public tracks
6. THE Creator Profile Page SHALL NOT display the "Upload remaining" stats card component
7. THE Creator Profile Page SHALL NOT display the "Upload New Track" section
8. THE Creator Profile Page SHALL NOT display a "My Playlists" section (private playlists)

### Requirement 3: Creator Profile Statistics and Metrics

**User Story:** As a user, I want to see key statistics about a creator, so that I can understand their popularity and activity level.

#### Acceptance Criteria

1. THE Stats Card SHALL calculate and display the Creator Score using the same algorithm as the "Top 5 Popular Creators" section on the /discover page
2. THE Stats Card SHALL display "Followers" with the total number of followers for the creator
3. THE Stats Card SHALL display "Tracks" with the count of only public tracks
4. THE Stats Card SHALL display "Albums" with the count of only public albums
5. THE Stats Card SHALL display "Playlists" with the count of only public playlists
6. THE Stats Card SHALL display "Total Plays" with the sum of play counts across all public tracks

### Requirement 4: Follow and Following Functionality

**User Story:** As a user, I want to follow creators I'm interested in, so that I can stay updated with their content.

#### Acceptance Criteria

1. THE Creator Profile Page SHALL display a Follow button when viewing another creator's profile and the authenticated user is not following them
2. THE Creator Profile Page SHALL display a Following button when viewing another creator's profile and the authenticated user is already following them
3. WHEN a user clicks the Follow button, THE Follow System SHALL create a follow relationship in the database and update the button to "Following"
4. WHEN a user clicks the Following button, THE Follow System SHALL remove the follow relationship from the database and update the button to "Follow"
5. THE Follow System SHALL update the follower count in real-time when follow status changes

### Requirement 5: Save Content Functionality

**User Story:** As a user, I want to save tracks, albums, and playlists from other creators, so that I can easily access them later.

#### Acceptance Criteria

1. THE Creator Profile Page SHALL display a Save button on each track card
2. THE Creator Profile Page SHALL display a Save button on each album card
3. THE Creator Profile Page SHALL display a Save button on each playlist card
4. WHEN a user clicks a Save button, THE Save System SHALL create a saved item record in the database and change the button label to "Remove"
5. WHEN a user clicks a Remove button on already-saved content, THE Save System SHALL remove the saved item record from the database and change the button label to "Save"
6. THE Save System SHALL visually indicate when content is already saved (e.g., filled icon vs outline icon, and "Remove" label vs "Save" label)

### Requirement 6: Track Card Menu Modifications

**User Story:** As a user viewing another creator's profile, I want to see only relevant actions for their tracks, so that I'm not confused by unavailable options.

#### Acceptance Criteria

1. THE Track Card SHALL NOT display the "Add to Album" menu option when viewing another creator's tracks
2. THE Track Card SHALL NOT display the "Delete" menu option when viewing another creator's tracks
3. THE Track Card SHALL display the "Add to Playlist" menu option for adding tracks to the viewer's own playlists
4. THE Track Card SHALL display the "Save" option in the three-dot menu
5. THE Track Card SHALL display the "Copy Track URL" option in the three-dot menu
6. THE Track Card SHALL display the "Share" option in the three-dot menu

### Requirement 7: All Tracks Page for Creator

**User Story:** As a user, I want to view all of a creator's public tracks on a dedicated page, so that I can browse their complete catalog.

#### Acceptance Criteria

1. WHEN a user clicks "View All" next to "All Tracks" on a creator profile, THE Profile System SHALL navigate to /profile/[username]/tracks
2. THE Creator Tracks Page SHALL display all public tracks from the specified creator
3. THE Creator Tracks Page SHALL use copied components from the /library/tracks page, not reused components
4. THE Creator Tracks Page SHALL display the same Save and menu options as the main creator profile page
5. THE Creator Tracks Page SHALL maintain the same layout and styling as the /library/tracks page

### Requirement 8: Database Schema for New Features

**User Story:** As a developer, I want proper database tables for follows, saves, and user types, so that the feature has a solid data foundation.

#### Acceptance Criteria

1. THE Database SHALL include a user_follows table with columns: id, follower_id, following_id, created_at
2. THE Database SHALL include a saved_tracks table with columns: id, user_id, track_id, created_at
3. THE Database SHALL include a saved_albums table with columns: id, user_id, album_id, created_at
4. THE Database SHALL include a saved_playlists table with columns: id, user_id, playlist_id, created_at
5. THE Database SHALL include a user_type column in the profiles table with default value "Free User"
6. THE Database SHALL enforce unique constraints on (follower_id, following_id) in user_follows
7. THE Database SHALL enforce unique constraints on (user_id, track_id) in saved_tracks
8. THE Database SHALL enforce unique constraints on (user_id, album_id) in saved_albums
9. THE Database SHALL enforce unique constraints on (user_id, playlist_id) in saved_playlists

### Requirement 9: Integration with Home Page

**User Story:** As a user, I want to navigate to creator profiles from the home page, so that I can easily discover and explore creators.

#### Acceptance Criteria

1. WHEN a user clicks a follow event card in the Recent Activity section, THE Profile System SHALL navigate to the followed creator's profile page
2. WHEN a user clicks a post or audio post event card in the Recent Activity section, THE Profile System SHALL navigate to the /dashboard page
3. WHEN a user clicks a username in the Recent Activity section, THE Profile System SHALL navigate to that creator's profile page
4. IF the username belongs to the authenticated user, THEN THE Profile System SHALL NOT make the username clickable
5. WHEN a user clicks the "View" button on a creator card in the Popular Creators section, THE Profile System SHALL navigate to that creator's profile page
6. WHEN a user clicks a username in the Popular Creators section, THE Profile System SHALL navigate to that creator's profile page
7. IF the username belongs to the authenticated user, THEN THE Profile System SHALL NOT make the username clickable
8. WHEN a user clicks a username in the Suggested for You section, THE Profile System SHALL navigate to that creator's profile page
9. IF the username belongs to the authenticated user, THEN THE Profile System SHALL NOT make the username clickable

### Requirement 10: Integration with Discover Page

**User Story:** As a user, I want to navigate to creator profiles from the discover page, so that I can explore creators I find interesting.

#### Acceptance Criteria

1. WHEN a user clicks "Check out Creator" button in the Suggested for You section, THE Profile System SHALL navigate to that creator's profile page
2. WHEN a user clicks "View Profile" button in the Top 5 Popular Creators (Last 7 Days) section, THE Profile System SHALL navigate to that creator's profile page
3. WHEN a user clicks "View Profile" button in the Top 5 Popular Creators (All Time) section, THE Profile System SHALL navigate to that creator's profile page

### Requirement 11: Integration with Dashboard Page

**User Story:** As a user viewing posts on the dashboard, I want to navigate to creator profiles, so that I can learn more about post authors.

#### Acceptance Criteria

1. WHEN a user clicks a username on a post in the dashboard, THE Profile System SHALL navigate to that creator's profile page
2. IF the username belongs to the authenticated user, THEN THE Profile System SHALL NOT make the username clickable

### Requirement 12: Integration with Feed Page

**User Story:** As a user viewing my activity feed, I want to navigate to creator profiles, so that I can explore creators mentioned in my feed.

#### Acceptance Criteria

1. WHEN a user clicks a follow event card in the feed, THE Profile System SHALL navigate to the followed creator's profile page
2. WHEN a user clicks a post or audio post event card in the feed, THE Profile System SHALL navigate to the /dashboard page
3. WHEN a user clicks a username in the feed, THE Profile System SHALL navigate to that creator's profile page
4. IF the username belongs to the authenticated user, THEN THE Profile System SHALL NOT make the username clickable

### Requirement 13: Integration with Notifications Page

**User Story:** As a user viewing notifications, I want to navigate to creator profiles, so that I can see who interacted with my content.

#### Acceptance Criteria

1. THE Notifications Page SHALL remove the current link to the /discover page from notification cards
2. WHEN a user clicks a username in a notification, THE Profile System SHALL navigate to that creator's profile page
3. IF the username belongs to the authenticated user, THEN THE Profile System SHALL NOT make the username clickable

### Requirement 14: Component Isolation and Code Duplication

**User Story:** As a developer, I want creator profile components to be independent copies, so that changes to library pages don't affect creator profiles.

#### Acceptance Criteria

1. THE Creator Profile Page SHALL use copied components from /library page, not shared components
2. THE Creator Tracks Page SHALL use copied components from /library/tracks page, not shared components
3. THE Profile System SHALL maintain separate component files for creator profile views
4. WHEN library page components are modified, THE Creator Profile Page components SHALL remain unchanged unless explicitly updated

### Requirement 15: User Type Badge System Preparation

**User Story:** As a developer, I want the database prepared for future user type features, so that we can easily implement tiered accounts later.

#### Acceptance Criteria

1. THE Database SHALL store user_type as a string field in the profiles table
2. THE Creator Profile Page SHALL query and display the user_type value from the database
3. THE Creator Profile Page SHALL display "Free User" as the default badge for all users
4. THE Creator Profile Page SHALL allocate sufficient space in the UI for multiple badges in future implementations
5. THE Database SHALL support storing multiple user types as a JSON array or comma-separated string for future expansion
