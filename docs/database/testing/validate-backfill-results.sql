-- ============================================================================
-- Backfill Validation Script
-- ============================================================================
-- This script validates the results of the analytics backfill process
-- Run this after executing the backfill script to ensure data accuracy
-- Requirements: 8.1, 8.5
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'Analytics Backfill Validation'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- 1. METRICS COUNT VALIDATION
-- ============================================================================
\echo '1. Validating Metrics Count...'
\echo '─────────────────────────────────────────────────────────────────────'

-- Total metrics count
SELECT 
  '✓ Total Metrics' as check_name,
  COUNT(*) as count
FROM daily_metrics;

\echo ''

-- Metrics by type
SELECT 
  '✓ Metrics by Type' as check_name,
  metric_type,
  COUNT(*) as count
FROM daily_metrics
GROUP BY metric_type
ORDER BY metric_type;

\echo ''

-- ============================================================================
-- 2. DATE COVERAGE VALIDATION
-- ============================================================================
\echo '2. Validating Date Coverage...'
\echo '─────────────────────────────────────────────────────────────────────'

-- Date range summary
SELECT 
  '✓ Date Range' as check_name,
  MIN(metric_date) as earliest_date,
  MAX(metric_date) as latest_date,
  COUNT(DISTINCT metric_date) as unique_dates,
  (MAX(metric_date) - MIN(metric_date) + 1) as expected_dates
FROM daily_metrics;

\echo ''

-- Check for missing dates or incomplete dates
WITH date_series AS (
  SELECT generate_series(
    (SELECT MIN(metric_date) FROM daily_metrics),
    (SELECT MAX(metric_date) FROM daily_metrics),
    '1 day'::interval
  )::date AS expected_date
),
date_metrics AS (
  SELECT 
    ds.expected_date,
    COUNT(dm.metric_date) as metrics_count
  FROM date_series ds
  LEFT JOIN daily_metrics dm ON ds.expected_date = dm.metric_date
  GROUP BY ds.expected_date
)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No Missing Dates'
    ELSE '✗ Missing or Incomplete Dates Found'
  END as check_name,
  COUNT(*) as problem_dates
FROM date_metrics
WHERE metrics_count < 5;

\echo ''

-- Show any problematic dates
WITH date_series AS (
  SELECT generate_series(
    (SELECT MIN(metric_date) FROM daily_metrics),
    (SELECT MAX(metric_date) FROM daily_metrics),
    '1 day'::interval
  )::date AS expected_date
),
date_metrics AS (
  SELECT 
    ds.expected_date,
    COUNT(dm.metric_date) as metrics_count
  FROM date_series ds
  LEFT JOIN daily_metrics dm ON ds.expected_date = dm.metric_date
  GROUP BY ds.expected_date
)
SELECT 
  '  Problem Date' as detail,
  expected_date,
  metrics_count,
  CASE 
    WHEN metrics_count = 0 THEN 'Missing all metrics'
    ELSE 'Incomplete (' || metrics_count || '/5 metrics)'
  END as issue
FROM date_metrics
WHERE metrics_count < 5
ORDER BY expected_date DESC
LIMIT 10;

\echo ''

-- ============================================================================
-- 3. DATA ACCURACY VALIDATION
-- ============================================================================
\echo '3. Validating Data Accuracy...'
\echo '─────────────────────────────────────────────────────────────────────'

-- Validate posts_created metric
\echo '  Checking posts_created accuracy...'
WITH source_counts AS (
  SELECT 
    created_at::date as date,
    COUNT(*) as actual_count
  FROM posts
  GROUP BY created_at::date
),
metric_counts AS (
  SELECT 
    metric_date as date,
    metric_value as recorded_count
  FROM daily_metrics
  WHERE metric_type = 'posts_created'
),
comparison AS (
  SELECT 
    COALESCE(s.date, m.date) as date,
    COALESCE(s.actual_count, 0) as actual,
    COALESCE(m.recorded_count, 0) as recorded,
    COALESCE(s.actual_count, 0) = COALESCE(m.recorded_count, 0) as matches
  FROM source_counts s
  FULL OUTER JOIN metric_counts m ON s.date = m.date
)
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE NOT matches) = 0 THEN '✓ posts_created'
    ELSE '✗ posts_created'
  END as check_name,
  COUNT(*) as total_dates,
  COUNT(*) FILTER (WHERE matches) as matching,
  COUNT(*) FILTER (WHERE NOT matches) as mismatched
FROM comparison;

\echo ''

-- Validate comments_created metric
\echo '  Checking comments_created accuracy...'
WITH source_counts AS (
  SELECT 
    created_at::date as date,
    COUNT(*) as actual_count
  FROM comments
  GROUP BY created_at::date
),
metric_counts AS (
  SELECT 
    metric_date as date,
    metric_value as recorded_count
  FROM daily_metrics
  WHERE metric_type = 'comments_created'
),
comparison AS (
  SELECT 
    COALESCE(s.date, m.date) as date,
    COALESCE(s.actual_count, 0) as actual,
    COALESCE(m.recorded_count, 0) as recorded,
    COALESCE(s.actual_count, 0) = COALESCE(m.recorded_count, 0) as matches
  FROM source_counts s
  FULL OUTER JOIN metric_counts m ON s.date = m.date
)
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE NOT matches) = 0 THEN '✓ comments_created'
    ELSE '✗ comments_created'
  END as check_name,
  COUNT(*) as total_dates,
  COUNT(*) FILTER (WHERE matches) as matching,
  COUNT(*) FILTER (WHERE NOT matches) as mismatched
FROM comparison;

\echo ''

-- Validate likes_given metric
\echo '  Checking likes_given accuracy...'
WITH source_counts AS (
  SELECT 
    created_at::date as date,
    COUNT(*) as actual_count
  FROM likes
  GROUP BY created_at::date
),
metric_counts AS (
  SELECT 
    metric_date as date,
    metric_value as recorded_count
  FROM daily_metrics
  WHERE metric_type = 'likes_given'
),
comparison AS (
  SELECT 
    COALESCE(s.date, m.date) as date,
    COALESCE(s.actual_count, 0) as actual,
    COALESCE(m.recorded_count, 0) as recorded,
    COALESCE(s.actual_count, 0) = COALESCE(m.recorded_count, 0) as matches
  FROM source_counts s
  FULL OUTER JOIN metric_counts m ON s.date = m.date
)
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE NOT matches) = 0 THEN '✓ likes_given'
    ELSE '✗ likes_given'
  END as check_name,
  COUNT(*) as total_dates,
  COUNT(*) FILTER (WHERE matches) as matching,
  COUNT(*) FILTER (WHERE NOT matches) as mismatched
FROM comparison;

\echo ''

-- Validate follows_created metric
\echo '  Checking follows_created accuracy...'
WITH source_counts AS (
  SELECT 
    created_at::date as date,
    COUNT(*) as actual_count
  FROM follows
  GROUP BY created_at::date
),
metric_counts AS (
  SELECT 
    metric_date as date,
    metric_value as recorded_count
  FROM daily_metrics
  WHERE metric_type = 'follows_created'
),
comparison AS (
  SELECT 
    COALESCE(s.date, m.date) as date,
    COALESCE(s.actual_count, 0) as actual,
    COALESCE(m.recorded_count, 0) as recorded,
    COALESCE(s.actual_count, 0) = COALESCE(m.recorded_count, 0) as matches
  FROM source_counts s
  FULL OUTER JOIN metric_counts m ON s.date = m.date
)
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE NOT matches) = 0 THEN '✓ follows_created'
    ELSE '✗ follows_created'
  END as check_name,
  COUNT(*) as total_dates,
  COUNT(*) FILTER (WHERE matches) as matching,
  COUNT(*) FILTER (WHERE NOT matches) as mismatched
FROM comparison;

\echo ''

-- ============================================================================
-- 4. COLLECTION LOG VALIDATION
-- ============================================================================
\echo '4. Validating Collection Log...'
\echo '─────────────────────────────────────────────────────────────────────'

-- Collection status summary
SELECT 
  '✓ Collection Status' as check_name,
  status,
  COUNT(*) as count
FROM metric_collection_log
GROUP BY status
ORDER BY status;

\echo ''

-- Check for errors
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No Collection Errors'
    ELSE '✗ Collection Errors Found'
  END as check_name,
  COUNT(*) as error_count
FROM metric_collection_log
WHERE status = 'error';

\echo ''

-- Show recent errors if any
SELECT 
  '  Error Detail' as detail,
  collection_date,
  error_message,
  LEFT(error_details, 100) as error_preview
FROM metric_collection_log
WHERE status = 'error'
ORDER BY collection_date DESC
LIMIT 5;

\echo ''

-- ============================================================================
-- 5. PERFORMANCE VALIDATION
-- ============================================================================
\echo '5. Validating Query Performance...'
\echo '─────────────────────────────────────────────────────────────────────'

-- Test common analytics query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT 
  metric_date,
  SUM(CASE WHEN metric_type = 'posts_created' THEN metric_value ELSE 0 END) as posts,
  SUM(CASE WHEN metric_type = 'comments_created' THEN metric_value ELSE 0 END) as comments,
  SUM(CASE WHEN metric_type = 'active_users' THEN metric_value ELSE 0 END) as users
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY metric_date
ORDER BY metric_date DESC;

\echo ''

-- ============================================================================
-- 6. DATA QUALITY CHECKS
-- ============================================================================
\echo '6. Validating Data Quality...'
\echo '─────────────────────────────────────────────────────────────────────'

-- Check for negative values
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No Negative Values'
    ELSE '✗ Negative Values Found'
  END as check_name,
  COUNT(*) as negative_count
FROM daily_metrics
WHERE metric_value < 0;

\echo ''

-- Check for extreme outliers (values > 10000)
SELECT 
  '✓ Outlier Check' as check_name,
  metric_type,
  COUNT(*) as count,
  MAX(metric_value) as max_value
FROM daily_metrics
WHERE metric_value > 10000
GROUP BY metric_type;

\echo ''

-- Recent metrics sample
\echo '  Recent Metrics Sample:'
SELECT 
  metric_date,
  metric_type,
  metric_value
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY metric_date DESC, metric_type
LIMIT 20;

\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'Validation Summary'
\echo '═══════════════════════════════════════════════════════════════════════'

WITH validation_summary AS (
  SELECT 
    (SELECT COUNT(*) FROM daily_metrics) as total_metrics,
    (SELECT COUNT(DISTINCT metric_date) FROM daily_metrics) as unique_dates,
    (SELECT COUNT(*) FROM metric_collection_log WHERE status = 'completed') as successful_collections,
    (SELECT COUNT(*) FROM metric_collection_log WHERE status = 'error') as failed_collections
)
SELECT 
  'Total Metrics' as metric,
  total_metrics::text as value
FROM validation_summary
UNION ALL
SELECT 
  'Unique Dates',
  unique_dates::text
FROM validation_summary
UNION ALL
SELECT 
  'Successful Collections',
  successful_collections::text
FROM validation_summary
UNION ALL
SELECT 
  'Failed Collections',
  failed_collections::text
FROM validation_summary;

\echo ''
\echo 'Validation Complete!'
\echo '═══════════════════════════════════════════════════════════════════════'
