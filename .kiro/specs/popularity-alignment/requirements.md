# Requirements Document

## Introduction

This specification defines the requirements for aligning popularity calculation logic across the Home and Discover pages with the established baseline from the Analytics page. Currently, the Home and Discover pages use inconsistent algorithms that don't consider play counts, leading to different "trending" and "popular" results than what appears in Analytics. This update also establishes clear separation between objective popularity metrics (engagement-based) and personalized recommendations (social proof included).

## Glossary

- **System**: The AI Music Community Platform
- **Analytics Page**: The `/analytics` page that displays platform-wide trending tracks and popular creators using database functions
- **Home Page**: The authenticated home page (`/`) showing "Trending This Week", "Suggested for You", and "Popular Creators"
- **Discover Page**: The `/discover` page showing "Trending This Week", "Suggested for You", and "Popular Creators"
- **Trending Score**: A weighted calculation combining play count (70%) and like count (30%)
- **Creator Score**: A weighted calculation combining total plays (60%) and total likes (40%)
- **Play Count**: The number of times a track has been played by users
- **Like Count**: The number of likes a post/track has received
- **7-Day Window**: A time filter for content created within the last 7 days (168 hours)
- **Database Functions**: PostgreSQL functions `get_trending_tracks()` and `get_popular_creators()`
- **Popular Creators**: Creators ranked by pure engagement metrics (plays and likes) without social proof factors
- **Suggested for You**: Personalized creator recommendations that may include social proof factors like follower count and mutual follows

## Requirements

### Requirement 1: Home Page Trending This Week Alignment

**User Story:** As a user viewing the home page, I want to see trending tracks that match the analytics page logic, so that I have a consistent understanding of what's truly trending on the platform.

#### Acceptance Criteria

1. WHEN the System displays "Trending This Week" on the Home Page, THE System SHALL use the database function `get_trending_tracks(7, 4)` to fetch results
2. WHEN calculating trending scores, THE System SHALL apply the formula: `(play_count × 0.7) + (like_count × 0.3)`
3. WHEN filtering by time range, THE System SHALL include only tracks created within the last 7 days (168 hours)
4. WHEN displaying results, THE System SHALL show a maximum of 4 trending tracks
5. WHEN no tracks meet the criteria, THE System SHALL display an appropriate empty state message

### Requirement 2: Home Page Popular Creators Alignment

**User Story:** As a user viewing the home page, I want to see popular creators ranked by the same criteria as the analytics page, so that I discover the most engaged creators on the platform based on content quality.

#### Acceptance Criteria

1. WHEN the System displays "Popular Creators" on the Home Page, THE System SHALL use the database function `get_popular_creators(7, 3)` to fetch results
2. WHEN calculating creator scores, THE System SHALL apply the formula: `(total_plays × 0.6) + (total_likes × 0.4)`
3. WHEN filtering by time range, THE System SHALL include only creators with tracks created within the last 7 days (168 hours)
4. WHEN displaying results, THE System SHALL show a maximum of 3 popular creators
5. WHEN the section header is displayed, THE System SHALL use the label "Popular Creators" instead of "Featured Creators"
6. WHEN no creators meet the criteria, THE System SHALL display an appropriate empty state message

### Requirement 3: Discover Page Trending This Week Alignment

**User Story:** As a user viewing the discover page, I want to see trending tracks that match the analytics page logic, so that I can discover the most popular content based on actual engagement metrics.

#### Acceptance Criteria

1. WHEN the System displays "Trending This Week" on the Discover Page, THE System SHALL use the database function `get_trending_tracks(7, 8)` to fetch results
2. WHEN calculating trending scores, THE System SHALL apply the formula: `(play_count × 0.7) + (like_count × 0.3)`
3. WHEN filtering by time range, THE System SHALL include only tracks created within the last 7 days (168 hours)
4. WHEN displaying results, THE System SHALL show a maximum of 8 trending tracks
5. WHEN no tracks meet the criteria, THE System SHALL display an appropriate empty state message

### Requirement 4: Discover Page Popular Creators Alignment

**User Story:** As a user viewing the discover page, I want to see popular creators ranked by the same criteria as the analytics page, so that I can follow creators who are genuinely popular based on plays and likes.

#### Acceptance Criteria

1. WHEN the System displays "Popular Creators" on the Discover Page, THE System SHALL use the database function `get_popular_creators(7, 6)` to fetch results
2. WHEN calculating creator scores, THE System SHALL apply the formula: `(total_plays × 0.6) + (total_likes × 0.4)`
3. WHEN filtering by time range, THE System SHALL include only creators with tracks created within the last 7 days (168 hours)
4. WHEN displaying results, THE System SHALL show a maximum of 6 popular creators
5. WHEN the section header is displayed, THE System SHALL use the label "Popular Creators" instead of "Featured Creators"
6. WHEN no creators meet the criteria, THE System SHALL display an appropriate empty state message

### Requirement 5: Caching and Performance

**User Story:** As a platform administrator, I want the popularity calculations to be cached appropriately, so that the system performs efficiently without excessive database queries.

#### Acceptance Criteria

1. WHEN the System fetches trending tracks or popular creators, THE System SHALL cache results for 5 minutes
2. WHEN cached data exists and is less than 5 minutes old, THE System SHALL return cached data without querying the database
3. WHEN cached data is older than 5 minutes, THE System SHALL fetch fresh data from the database
4. WHEN multiple components request the same data simultaneously, THE System SHALL deduplicate requests to prevent redundant database queries
5. WHEN the cache is cleared manually, THE System SHALL fetch fresh data on the next request

### Requirement 6: Discover Page Section Naming Consistency

**User Story:** As a user, I want consistent naming across the Home and Discover pages, so that I understand the purpose of each section regardless of which page I'm viewing.

#### Acceptance Criteria

1. WHEN the System displays personalized recommendations on the Discover Page, THE System SHALL use the section header "Suggested for You"
2. WHEN the System displays personalized recommendations on the Home Page, THE System SHALL use the section header "Suggested for You"
3. WHEN both pages display "Suggested for You", THE System SHALL use the same underlying recommendation algorithm
4. WHEN the section header is changed from "Recommended for You" to "Suggested for You", THE System SHALL maintain all existing functionality
5. WHEN users view either page, THE System SHALL present a consistent user experience with matching section names

### Requirement 7: Backward Compatibility

**User Story:** As a developer, I want to ensure that removing old utility functions doesn't break other parts of the application, so that the refactoring is safe and complete.

#### Acceptance Criteria

1. WHEN the System removes `getTrendingContent()` from `recommendations.ts`, THE System SHALL verify no other components depend on this function
2. WHEN the System removes `getFeaturedCreators()` from `recommendations.ts`, THE System SHALL verify no other components depend on this function
3. WHEN the System removes `getTrendingContent()` from `search.ts`, THE System SHALL verify no other components depend on this function
4. WHEN the System removes `getFeaturedCreators()` from `search.ts`, THE System SHALL verify no other components depend on this function
5. WHEN all old functions are removed, THE System SHALL maintain all existing functionality without errors

### Requirement 8: Data Consistency

**User Story:** As a user, I want to see consistent trending and popular content across all pages, so that I can trust the platform's recommendations.

#### Acceptance Criteria

1. WHEN the System displays trending tracks on any page, THE System SHALL use the same scoring formula across all pages
2. WHEN the System displays popular creators on any page, THE System SHALL use the same scoring formula across all pages
3. WHEN the System filters by "7 days", THE System SHALL use the same time window (168 hours) across all pages
4. WHEN the System calculates engagement metrics, THE System SHALL use the same data sources (play_count, like_count) across all pages
5. WHEN a track or creator appears in analytics, THE System SHALL ensure it can appear in home/discover pages if it meets the criteria

### Requirement 9: Clear Separation of Recommendation Types

**User Story:** As a user, I want to understand the difference between objective popularity and personalized suggestions, so that I can make informed decisions about what content to explore.

#### Acceptance Criteria

1. WHEN the System displays "Trending This Week", THE System SHALL use only engagement metrics (plays and likes) without personalization
2. WHEN the System displays "Popular Creators", THE System SHALL use only engagement metrics (plays and likes) without social proof factors
3. WHEN the System displays "Suggested for You", THE System SHALL use personalized algorithms that MAY include social proof factors like follower count and mutual follows
4. WHEN section headers are displayed, THE System SHALL use clear, distinct labels that communicate the purpose of each section
5. WHEN users view recommendations, THE System SHALL ensure no overlap in the algorithms used for "Popular Creators" versus "Suggested for You"

## Non-Functional Requirements

### Performance
- Trending tracks query SHALL complete in less than 100ms
- Popular creators query SHALL complete in less than 100ms
- Cache hit rate SHALL be greater than 80% during normal usage

### Reliability
- The System SHALL handle database errors gracefully without crashing
- The System SHALL display appropriate error messages when data cannot be loaded
- The System SHALL provide retry mechanisms for failed requests

### Maintainability
- All popularity calculations SHALL be centralized in database functions
- All caching logic SHALL be centralized in the `trendingAnalytics.ts` module
- Code SHALL be documented with clear comments explaining the scoring formulas

## Out of Scope

The following items are explicitly out of scope for this specification:

- Changes to the "Suggested for You" personalized recommendation algorithm logic (only renaming the section on Discover page)
- Changes to the analytics page itself (it's the baseline)
- Addition of new popularity metrics or scoring factors
- Changes to the database function formulas (70/30 and 60/40 splits)
- Major UI/UX redesigns of how trending content is displayed (only label changes)
- Addition of "All Time" trending sections to home/discover pages
- Modifications to how follower count is used in personalized "Suggested for You" recommendations
