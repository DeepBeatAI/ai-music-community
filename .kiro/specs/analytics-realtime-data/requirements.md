# Requirements Document

## Introduction

The analytics page currently displays data from the `daily_metrics` table, which contains historical snapshots collected periodically. This specification updates the analytics page to show real-time data by querying live tables directly on page load, while maintaining the refresh button functionality and removing the manual metric collection status section.

## Glossary

- **Analytics System**: The platform's metrics display system that shows user engagement and content statistics
- **Real-Time Data**: Current counts queried directly from source tables (profiles, tracks, comments) rather than cached snapshots
- **Daily Metrics**: Historical snapshots stored in the `daily_metrics` table for trend analysis
- **Refresh Button**: UI control that triggers metric collection and refreshes the displayed data
- **MetricCollectionMonitor**: Component that displays collection status (to be removed)

## Requirements

### Requirement 1: Real-Time Metrics on Page Load

**User Story:** As a platform administrator, I want to see current real-time counts when I load the analytics page, so that I always have the most up-to-date information without waiting for scheduled collection.

#### Acceptance Criteria

1. WHEN the Analytics Page loads, THE System SHALL query the profiles table directly to get the current total user count
2. WHEN the Analytics Page loads, THE System SHALL query the tracks table directly to get the current total tracks count
3. WHEN the Analytics Page loads, THE System SHALL query the comments table directly to get the current total comments count
4. WHEN real-time queries execute, THE System SHALL return results within 100ms for optimal performance
5. WHEN the page displays metrics, THE System SHALL show the live counts without requiring manual refresh

### Requirement 2: Activity Chart with Historical Data

**User Story:** As a platform administrator, I want to see activity trends over the last 30 days, so that I can identify patterns and growth trends.

#### Acceptance Criteria

1. WHEN the Activity Chart loads, THE System SHALL query the daily_metrics table for the last 30 days of historical data
2. WHEN the chart renders, THE System SHALL display three data series: total users, posts created, and comments created
3. WHEN historical data is unavailable for specific dates, THE System SHALL display zero values for those dates
4. WHEN the chart displays, THE System SHALL show cumulative user counts and daily post/comment counts
5. WHEN the date range query executes, THE System SHALL use proper date filtering to return exactly 30 days of data

### Requirement 3: Refresh Button with Collection Trigger

**User Story:** As a platform administrator, I want the refresh button to collect new metrics and update the display, so that I can manually update both real-time and historical data.

#### Acceptance Criteria

1. WHEN the user clicks the Refresh button, THE System SHALL trigger the collect_daily_metrics function for today's date
2. WHEN metric collection completes, THE System SHALL automatically refresh the real-time metrics display
3. WHEN metric collection completes, THE System SHALL automatically refresh the activity chart with updated historical data
4. WHEN the refresh is in progress, THE System SHALL disable the button and show a loading indicator
5. WHEN metric collection fails, THE System SHALL display an error message and allow retry

### Requirement 4: Remove Metric Collection Monitor

**User Story:** As a platform administrator, I want a cleaner analytics interface without the manual collection status section, so that the page focuses on the actual metrics and trends.

#### Acceptance Criteria

1. WHEN the Analytics Page renders, THE System SHALL NOT display the MetricCollectionMonitor component
2. WHEN the page layout is rendered, THE System SHALL remove all references to collection status display
3. WHEN the user views the page, THE System SHALL show only the metrics grid, activity chart, and refresh button
4. WHEN the MetricCollectionMonitor component is removed, THE System SHALL maintain all other page functionality
5. WHEN the refresh button is used, THE System SHALL provide feedback without requiring a separate status section

### Requirement 5: Performance Optimization

**User Story:** As a platform administrator, I want the analytics page to load quickly, so that I can access insights without delay.

#### Acceptance Criteria

1. WHEN real-time queries execute, THE System SHALL use database indexes for optimal performance
2. WHEN multiple metrics are fetched, THE System SHALL execute queries in parallel where possible
3. WHEN the page loads, THE System SHALL complete all data fetching within 2 seconds
4. WHEN queries are executed, THE System SHALL use efficient COUNT queries without loading full table data
5. WHEN the activity chart loads, THE System SHALL limit data to 30 days to maintain performance

### Requirement 6: Error Handling and User Feedback

**User Story:** As a platform administrator, I want clear error messages when data fails to load, so that I can troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN any query fails, THE System SHALL log the full error details to the console
2. WHEN an error occurs, THE System SHALL display a user-friendly error message in the UI
3. WHEN the user clicks Refresh after an error, THE System SHALL retry the failed operations
4. WHEN multiple errors occur, THE System SHALL display all error messages in a consolidated error panel
5. WHEN errors are transient, THE System SHALL implement automatic retry with exponential backoff

## Implementation Notes

### Data Sources

**Real-Time Metrics (Current Counts):**
- Total Users: `SELECT COUNT(*) FROM profiles`
- Total Tracks: `SELECT COUNT(*) FROM tracks`
- Total Comments: `SELECT COUNT(*) FROM comments`

**Historical Data (Activity Chart):**
- Query `daily_metrics` table for last 30 days
- Use existing `fetchActivityData()` function (no changes needed)

### Refresh Button Behavior

1. Trigger `collect_daily_metrics(today)` via RPC
2. Wait for collection to complete
3. Refresh real-time metrics (re-query live tables)
4. Refresh activity chart (re-query daily_metrics)
5. Show success/error feedback

### Components to Modify

- `client/src/app/analytics/page.tsx` - Update to fetch real-time data
- `client/src/lib/analytics.ts` - Add real-time query functions
- Remove `MetricCollectionMonitor` component usage

### Components to Remove

- `client/src/components/MetricCollectionMonitor.tsx` - Delete component
- Remove all imports and references to MetricCollectionMonitor

