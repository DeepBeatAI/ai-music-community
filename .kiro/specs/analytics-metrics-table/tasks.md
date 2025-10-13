# Implementation Plan

- [x] 1. Create database schema and tables

  - Create `daily_metrics` table with proper columns and constraints
  - Create `metric_definitions` table for metric metadata
  - Create `metric_collection_log` table for monitoring
  - Add unique constraint on (metric_date, metric_type, metric_category)
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 4.1_

- [x] 2. Implement database indexes for performance

  - Create composite index on (metric_date DESC, metric_type, metric_category)
  - Create index on (metric_category, metric_date DESC)
  - Create index on collection_timestamp for monitoring queries
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Set up Row Level Security policies

  - Enable RLS on daily_metrics, metric_definitions, and metric_collection_log tables
  - Create policy for public read access to metrics
  - Create policy for service role to manage metrics
  - Create policy for admin access to collection logs
  - _Requirements: 4.1, 4.4_

- [x] 4. Implement metric collection function

- [x] 4.1 Create collect_daily_metrics PostgreSQL function

  - Write function signature with target_date parameter
  - Implement collection log entry creation
  - Add query for users_total metric
  - Add query for posts_total metric
  - Add query for comments_total metric
  - Add query for posts_created metric
  - Add query for comments_created metric
  - Implement ON CONFLICT handling for idempotency
  - Add error handling with exception block
  - Update collection log on completion or failure
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.4, 4.1_

- [x] 4.2 Test collection function manually

  - Run function for current date
  - Verify 5 metrics are created
  - Check collection log entry
  - Run function again and verify no duplicates
  - _Requirements: 1.1, 4.1_

- [x] 5. Implement backfill functionality

- [x] 5.1 Create backfill_daily_metrics PostgreSQL function

  - Write function with start_date and end_date parameters
  - Implement date loop logic
  - Call collect_daily_metrics for each date
  - Add progress logging with RAISE NOTICE
  - Return summary statistics
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 5.2 Create backfill TypeScript script

  - Create scripts/backfill-analytics.ts file
  - Query earliest post/comment date
  - Call backfill_daily_metrics RPC function
  - Add progress logging
  - Handle errors and exit codes
  - _Requirements: 8.1, 8.2_

- [x] 5.3 Run backfill for historical data

  - Execute backfill script
  - Monitor progress and logs
  - Verify metrics created for all dates
  - Validate data accuracy against source tables
  - _Requirements: 8.1, 8.5_

- [x] 6. Set up automated metric collection

- [x] 6.1 Implement Supabase Edge Function for collection

  - Create supabase/functions/collect-metrics/index.ts
  - Set up Supabase client with service role key
  - Call collect_daily_metrics RPC function
  - Return success/error response
  - Add error logging
  - _Requirements: 3.1, 3.3, 3.5_

- [x] 6.2 Configure cron trigger for Edge Function

  - Set up daily cron schedule (00:00 UTC)
  - Test manual invocation
  - Verify scheduled execution
  - _Requirements: 3.1_

- [x] 7. Create TypeScript types and interfaces

  - Define DailyMetric interface
  - Define MetricDefinition interface
  - Define MetricsQueryParams interface
  - Define ActivityDataPoint interface
  - Define CollectionStatus interface
  - Add types to types/analytics.ts file
  - _Requirements: 9.2_

- [x] 8. Implement query API functions

- [x] 8.1 Create fetchMetrics function

  - Implement date range filtering
  - Add category filtering
  - Add type filtering
  - Add proper ordering
  - Handle errors with try-catch
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 8.2 Create fetchCurrentMetrics function

  - Query latest metrics for users_total, posts_total, comments_total
  - Transform data to dashboard format
  - Handle missing data gracefully
  - _Requirements: 9.1, 9.2_

- [x] 8.3 Create fetchActivityData function

  - Calculate 30-day date range
  - Query posts_created and comments_created metrics
  - Group data by date
  - Transform to ActivityDataPoint format
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 8.4 Create triggerMetricCollection function (admin)

  - Call collect_daily_metrics RPC with optional date
  - Handle errors
  - Return collection results
  - _Requirements: 9.1_

- [x] 9. Update analytics dashboard to use new API

- [x] 9.1 Update analytics page metrics fetching

  - Replace direct Supabase queries with fetchCurrentMetrics
  - Update state management
  - Keep loading and error states
  - _Requirements: 1.5, 5.1_

- [x] 9.2 Update analytics page activity chart

  - Replace direct Supabase queries with fetchActivityData
  - Update data transformation logic
  - Verify chart renders correctly
  - _Requirements: 1.5, 5.1_

- [x] 9.3 Add error handling and retry logic

  - Implement retry mechanism for failed queries
  - Add user-friendly error messages
  - Add manual refresh button
  - _Requirements: 3.5, 9.3_

- [x] 10. Implement monitoring and observability

- [x] 10.1 Create collection status query function

  - Query latest entry from metric_collection_log
  - Calculate duration
  - Format status response
  - _Requirements: 10.1, 10.2, 10.4_

- [x] 10.2 Create admin monitoring component (optional)

  - Display last collection status
  - Show metrics collected count
  - Display error messages if any
  - Add manual trigger button
  - _Requirements: 10.1, 10.4_

- [x] 11. Add metric definitions seed data

  - Insert definitions for users_total
  - Insert definitions for posts_total
  - Insert definitions for comments_total
  - Insert definitions for posts_created
  - Insert definitions for comments_created
  - Include display names, descriptions, and format patterns
  - _Requirements: 2.1, 2.2, 6.1, 6.2_

- [x] 12. Create database migration file

  - Create new migration file in supabase/migrations/
  - Include all table creation statements
  - Include all index creation statements
  - Include all RLS policies
  - Include all functions (collect_daily_metrics, backfill_daily_metrics)
  - Include metric definitions seed data
  - Add comments for documentation
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 13. Write validation tests

- [x] 13.1 Write unit tests for collection function

  - Test successful collection for a date
  - Test handling of missing source data
  - Test idempotency (no duplicates on re-run)
  - Test error handling
  - _Requirements: 1.1, 3.4, 4.1_

- [x] 13.2 Write unit tests for query API functions

  - Test fetchMetrics with date range
  - Test fetchMetrics with category filtering
  - Test fetchCurrentMetrics data transformation
  - Test fetchActivityData grouping logic
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 13.3 Write integration test for end-to-end flow

  - Create test posts and comments
  - Run collection for test date
  - Verify metrics match expected counts
  - Delete test data
  - Verify metrics remain unchanged (immutability test)
  - _Requirements: 1.2, 4.1, 4.2, 4.4_

- [x] 14. Performance validation

  - Run EXPLAIN ANALYZE on key queries
  - Verify query times are under 100ms
  - Test collection function execution time (should be < 30s)
  - Load test analytics dashboard
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 15. Documentation and deployment


  - Document the new analytics system in README or docs/
  - Add instructions for running backfill
  - Document how to add new metrics in the future
  - Create deployment checklist
  - Update analytics dashboard test guide
  - _Requirements: 2.1, 2.2, 8.1_
