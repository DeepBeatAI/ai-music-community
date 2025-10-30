# Requirements Document

## Introduction

The analytics page currently has multiple critical issues preventing it from displaying data correctly. This specification addresses database function creation, data fetching logic corrections, and UI integration improvements to restore full functionality to the analytics dashboard.

## Priority and Dependencies

### Implementation Order

The requirements must be implemented in the following order due to dependencies:

1. **Requirement 6 (Historical Data Retention)** - Foundation
   - Priority: Critical
   - Dependencies: None
   - Rationale: Ensures the database schema and collection system properly stores all historical data before we fix the display logic

2. **Requirement 1 (Database Functions)** - Backend Foundation
   - Priority: Critical
   - Dependencies: Requirement 6
   - Rationale: Creates the missing database functions that other components depend on

3. **Requirement 2 (Metrics Data Fetching)** - Data Layer
   - Priority: Critical
   - Dependencies: Requirements 1, 6
   - Rationale: Fixes the data fetching logic to correctly query the database

4. **Requirement 3 (Activity Data)** - Data Layer
   - Priority: High
   - Dependencies: Requirements 2, 6
   - Rationale: Extends activity data to include user metrics and correct time ranges

5. **Requirement 5 (Collection Status)** - Monitoring
   - Priority: High
   - Dependencies: Requirements 1, 2
   - Rationale: Provides visibility into the metrics collection system health

6. **Requirement 4 (Play Button)** - UI Enhancement
   - Priority: Medium
   - Dependencies: None (independent feature)
   - Rationale: Improves user experience but doesn't block other functionality

7. **Requirement 7 (Error Handling)** - Cross-cutting Concern
   - Priority: High
   - Dependencies: All other requirements
   - Rationale: Should be implemented throughout all components as they are fixed

## Glossary

- **Analytics System**: The platform's metrics collection and display system that tracks user engagement, content creation, and trending data
- **Daily Metrics**: Aggregated platform statistics collected and stored on a daily basis
- **Trending Tracks**: Audio tracks ranked by recent engagement (plays, likes) within a time window
- **Popular Creators**: Users ranked by their content's aggregate engagement metrics
- **Mini Player**: The persistent audio playback interface that appears across all pages
- **PlaybackContext**: React context providing global audio playback state and controls
- **RPC Function**: Remote Procedure Call - a database function callable from the client

## Requirements

### Requirement 1: Database Functions for Trending Analytics

**User Story:** As a platform administrator, I want the analytics page to display trending tracks and popular creators, so that I can understand which content is performing well.

#### Acceptance Criteria

1. WHEN the System queries for trending tracks, THE Analytics System SHALL execute a database function that calculates trending scores based on plays and likes within the specified time window
2. WHEN the System queries for popular creators, THE Analytics System SHALL execute a database function that aggregates creator metrics including total plays, likes, and track count
3. WHEN a time window parameter is provided, THE Analytics System SHALL filter results to only include activity within that window (7 days or all time)
4. WHEN the database functions execute, THE Analytics System SHALL return results ordered by calculated score in descending order
5. WHEN the result limit parameter is provided, THE Analytics System SHALL return no more than the specified number of results

### Requirement 2: Correct Metrics Data Fetching

**User Story:** As a platform administrator, I want to see accurate total counts for users, posts, and comments, so that I can track platform growth.

#### Acceptance Criteria

1. WHEN the Analytics System fetches current metrics, THE System SHALL query all metric categories from the most recent collection date
2. WHEN multiple metric rows exist for the same date, THE System SHALL aggregate them correctly by category
3. WHEN the metrics display renders, THE System SHALL show non-zero values for users, posts, and comments if data exists in the database
4. WHEN no metrics data exists, THE System SHALL display zero values without throwing errors
5. WHEN the database query fails, THE System SHALL log the error details and display a user-friendly error message

### Requirement 3: Correct Activity Data Time Range and User Metrics

**User Story:** As a platform administrator, I want to see activity data including users, posts, and comments for the last 30 days, so that I can identify recent trends and patterns across all platform metrics.

#### Acceptance Criteria

1. WHEN the Analytics System fetches activity data, THE System SHALL query metrics for the last 30 days from the current date
2. WHEN the activity chart renders, THE System SHALL display data points for users, posts, and comments for each day in the 30-day window
3. WHEN a date has no activity, THE System SHALL display zero values for that date rather than omitting it
4. WHEN the date range query executes, THE System SHALL use proper date comparison to filter results accurately
5. WHEN activity data is aggregated, THE System SHALL group by date and include total users count alongside posts and comments created
6. WHEN the chart displays user data, THE System SHALL show cumulative user count (total users as of that date) rather than daily new users

### Requirement 4: Play Button Integration

**User Story:** As a platform administrator, I want to play trending tracks directly from the analytics page, so that I can quickly listen to popular content.

#### Acceptance Criteria

1. WHEN a user clicks the Play button on a trending track, THE System SHALL load the track into the Mini Player
2. WHEN the track loads, THE System SHALL fetch the audio URL using the cached audio URL utility
3. WHEN playback starts, THE System SHALL update the Mini Player UI to show the playing track
4. WHEN the track is already playing, THE System SHALL pause playback instead
5. WHEN the audio URL is invalid or missing, THE System SHALL display an error message to the user

### Requirement 5: Metric Collection Status Display

**User Story:** As a platform administrator, I want to see the status of metric collection runs, so that I can verify the analytics system is working correctly.

#### Acceptance Criteria

1. WHEN the Metric Collection Monitor loads, THE System SHALL query the most recent collection log entry
2. WHEN collection status is displayed, THE System SHALL show the last run time, metrics collected count, and execution duration
3. WHEN a collection run fails, THE System SHALL display the error message and details
4. WHEN the user triggers manual collection, THE System SHALL call the collect_daily_metrics function and refresh the status
5. WHEN no collection runs exist, THE System SHALL display a message indicating no runs have been performed

### Requirement 6: Historical Data Retention

**User Story:** As a platform administrator, I want all metrics to be collected and stored indefinitely, so that I can query historical data at any time in the future regardless of current display time ranges.

#### Acceptance Criteria

1. WHEN the System collects daily metrics, THE System SHALL store all metric data permanently without automatic deletion
2. WHEN metrics are collected, THE System SHALL maintain immutability of historical records to ensure data integrity
3. WHEN the database schema is designed, THE System SHALL support efficient querying of arbitrary date ranges without performance degradation
4. WHEN display time ranges are configured (7 days, 30 days, all time), THE System SHALL only affect the query filters and not the underlying data retention
5. WHEN future features require historical data, THE System SHALL provide access to all previously collected metrics without data loss

### Requirement 7: Error Handling and User Feedback

**User Story:** As a platform administrator, I want clear error messages when analytics data fails to load, so that I can troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN any analytics query fails, THE System SHALL log the full error details to the console
2. WHEN an error occurs, THE System SHALL display a user-friendly error message in the UI
3. WHEN the user clicks Refresh after an error, THE System SHALL retry the failed queries
4. WHEN multiple errors occur, THE System SHALL display all error messages in a consolidated error panel
5. WHEN errors are transient, THE System SHALL implement automatic retry with exponential backoff
