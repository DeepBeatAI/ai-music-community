# Requirements Document

## Introduction

This feature enables users to share individual posts from the community board by providing shareable URLs and a dedicated post detail page. Users will be able to copy post URLs to their clipboard and share posts via the Web Share API (where supported). Each post will have its own dedicated page that respects the same access rights as the dashboard view.

## Glossary

- **Post**: A content item on the community board, which can be either a text post or an audio post with an associated track
- **Post Detail Page**: A dedicated page displaying a single post with its full content, comments, and interactions
- **Web Share API**: A browser API that allows sharing content through the device's native share functionality
- **RLS (Row Level Security)**: Database-level security policies that control access to data based on user authentication
- **Dashboard**: The main community board page where all posts are displayed
- **PostItem Component**: The React component that renders individual posts on the dashboard

## Requirements

### Requirement 1: Copy Post URL Functionality

**User Story:** As a user viewing posts on the dashboard, I want to copy a post's URL to my clipboard so that I can share it through any communication channel of my choice

#### Acceptance Criteria

1. WHEN a user clicks the "Copy post url" button on any post, THE System SHALL copy the post's unique URL to the user's clipboard
2. WHEN the clipboard copy operation succeeds, THE System SHALL display a success toast notification with the message "Post URL copied to clipboard"
3. IF the clipboard API is not available or fails, THEN THE System SHALL display a modal dialog with the URL in a text input field for manual copying
4. THE "Copy post url" button SHALL be positioned to the left of the "Share post" button in the post footer
5. THE "Copy post url" button SHALL display a link icon and the text "Copy post url"

### Requirement 2: Share Post Functionality

**User Story:** As a user viewing posts on the dashboard, I want to share a post using my device's native share functionality so that I can quickly share content with my contacts

#### Acceptance Criteria

1. WHEN a user clicks the "Share post" button on any post, THE System SHALL invoke the Web Share API with the post's URL and title
2. IF the Web Share API is not supported by the browser, THEN THE System SHALL fall back to copying the URL to the clipboard
3. WHEN the share operation completes successfully, THE System SHALL display a success toast notification
4. IF the share operation is cancelled by the user, THEN THE System SHALL not display any notification
5. THE "Share post" button SHALL display a share icon and the text "Share post"

### Requirement 3: Individual Post Detail Page

**User Story:** As a user who receives a shared post URL, I want to view the post on its own dedicated page so that I can see the full content and interact with it

#### Acceptance Criteria

1. THE System SHALL create a post detail page accessible at the URL pattern `/posts/[postId]`
2. WHEN a user navigates to a post detail page, THE System SHALL display the complete post with all its content, metadata, and interactions
3. THE post detail page SHALL include the same functionality as posts on the dashboard, including like button, comment section, follow button, and edit/delete buttons for post owners
4. THE post detail page SHALL display a "Back to Dashboard" navigation link
5. THE post detail page SHALL use the same PostItem component as the dashboard for consistency

### Requirement 4: Access Rights Validation

**User Story:** As a system administrator, I want post access to be properly validated so that users can only view posts they have permission to see

#### Acceptance Criteria

1. WHEN a user attempts to view a post detail page, THE System SHALL verify the user has permission to view the post based on RLS policies
2. IF a post does not exist, THEN THE System SHALL display a 404 error page with the message "Post not found"
3. IF a user does not have permission to view a post, THEN THE System SHALL display a 403 error page with the message "You don't have permission to view this post"
4. THE System SHALL apply the same RLS policies on the post detail page as on the dashboard
5. WHEN a user is not authenticated and attempts to view a public post, THE System SHALL display the post without requiring authentication

### Requirement 5: SEO and Metadata

**User Story:** As a content creator, I want my shared posts to display properly when shared on social media so that they attract more engagement

#### Acceptance Criteria

1. THE post detail page SHALL include Open Graph meta tags with the post content, author, and creation date
2. THE post detail page SHALL include a descriptive page title in the format "[Username]'s post - AI Music Community"
3. WHERE the post is an audio post, THE post detail page SHALL include the track title in the meta tags
4. THE post detail page SHALL include Twitter Card meta tags for proper display on Twitter
5. THE System SHALL generate appropriate meta descriptions based on the post content, truncated to 160 characters

### Requirement 6: Loading and Error States

**User Story:** As a user navigating to a post detail page, I want to see appropriate feedback while the post loads so that I understand the system is working

#### Acceptance Criteria

1. WHILE the post is loading, THE System SHALL display a loading spinner with the text "Loading post..."
2. IF the post fails to load due to a network error, THEN THE System SHALL display an error message with a "Retry" button
3. WHEN the user clicks the "Retry" button, THE System SHALL attempt to reload the post
4. THE loading state SHALL be displayed for a minimum of 200ms to prevent flickering
5. THE System SHALL handle all error states gracefully without crashing the application
