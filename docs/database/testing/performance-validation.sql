-- =====================================================
-- Performance Validation Script
-- =====================================================
-- This script validates that all analytics queries meet
-- performance requirements specified in the design.
--
-- Requirements:
-- - Query times should be under 100ms
-- - Collection function should complete in < 30s
-- - Indexes should be used effectively
-- =====================================================

\timing on

-- =====================================================
-- 1. EXPLAIN ANALYZE: Fetch 30 days of activity data
-- =====================================================
-- This is the most common query pattern for the dashboard
-- Expected: < 100ms, should use idx_daily_metrics_date_type

\echo '\n=== Query 1: Fetch 30 days of activity data ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT metric_date, metric_category, value
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
  AND metric_date <= CURRENT_DATE
  AND metric_category IN ('posts_created', 'comments_created')
ORDER BY metric_date ASC;

-- =====================================================
-- 2. EXPLAIN ANALYZE: Fetch current metrics
-- =====================================================
-- Query for total counts (users, posts, comments)
-- Expected: < 100ms, should use idx_daily_metrics_category

\echo '\n=== Query 2: Fetch current metrics (latest totals) ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT DISTINCT ON (metric_category) 
  metric_category, 
  value,
  metric_date
FROM daily_metrics
WHERE metric_category IN ('users_total', 'posts_total', 'comments_total')
ORDER BY metric_category, metric_date DESC;

-- =====================================================
-- 3. EXPLAIN ANALYZE: Date range query with filtering
-- =====================================================
-- Query for specific metric types over a date range
-- Expected: < 100ms, should use idx_daily_metrics_date_type

\echo '\n=== Query 3: Date range query with category filter ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT metric_date, metric_type, metric_category, value
FROM daily_metrics
WHERE metric_date >= '2025-01-01'
  AND metric_date <= '2025-01-31'
  AND metric_category = 'posts_total'
ORDER BY metric_date DESC;

-- =====================================================
-- 4. EXPLAIN ANALYZE: Collection log monitoring query
-- =====================================================
-- Query for latest collection status
-- Expected: < 100ms, should use idx_daily_metrics_collection

\echo '\n=== Query 4: Latest collection status ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  collection_date,
  started_at,
  completed_at,
  status,
  metrics_collected,
  error_message
FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 1;

-- =====================================================
-- 5. EXPLAIN ANALYZE: Aggregate query for metrics
-- =====================================================
-- Query for counting metrics by category
-- Expected: < 100ms

\echo '\n=== Query 5: Aggregate metrics by category ==='
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
  metric_category,
  COUNT(*) as record_count,
  MIN(metric_date) as earliest_date,
  MAX(metric_date) as latest_date
FROM daily_metrics
GROUP BY metric_category
ORDER BY metric_category;

-- =====================================================
-- 6. Test collection function execution time
-- =====================================================
-- Run collection for current date and measure time
-- Expected: < 30 seconds

\echo '\n=== Test 6: Collection function execution time ==='
\echo 'Running collect_daily_metrics for current date...'

DO $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms INTEGER;
  result RECORD;
BEGIN
  start_time := clock_timestamp();
  
  -- Run collection function
  SELECT * INTO result FROM collect_daily_metrics(CURRENT_DATE);
  
  end_time := clock_timestamp();
  duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  
  RAISE NOTICE 'Collection completed in % ms', duration_ms;
  RAISE NOTICE 'Metrics collected: %', result.metrics_collected;
  RAISE NOTICE 'Status: %', result.status;
  
  IF duration_ms > 30000 THEN
    RAISE WARNING 'Collection took longer than 30 seconds: % ms', duration_ms;
  ELSE
    RAISE NOTICE 'Performance requirement met (< 30s)';
  END IF;
END $$;

-- =====================================================
-- 7. Index usage verification
-- =====================================================
-- Verify that indexes are being used effectively

\echo '\n=== Index Usage Statistics ==='
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('daily_metrics', 'metric_collection_log', 'metric_definitions')
ORDER BY tablename, indexname;

-- =====================================================
-- 8. Table statistics
-- =====================================================
-- Check table sizes and row counts

\echo '\n=== Table Statistics ==='
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('daily_metrics', 'metric_collection_log', 'metric_definitions')
ORDER BY tablename;

-- =====================================================
-- 9. Query performance summary
-- =====================================================
-- Summary of query execution times

\echo '\n=== Performance Validation Summary ==='
\echo 'All queries should complete in < 100ms'
\echo 'Collection function should complete in < 30s'
\echo 'Check the EXPLAIN ANALYZE output above for actual timings'
\echo ''
\echo 'Key performance indicators:'
\echo '- Index scans should be used (not sequential scans)'
\echo '- Execution times should meet requirements'
\echo '- No missing indexes warnings'
\echo ''

-- =====================================================
-- 10. Recommendations check
-- =====================================================
-- Check for potential performance issues

\echo '\n=== Performance Recommendations ==='

-- Check for missing indexes on foreign keys
SELECT 
  'Check: No missing indexes detected' as recommendation
WHERE NOT EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE tablename = 'daily_metrics' 
  AND indexdef NOT LIKE '%UNIQUE%'
  HAVING COUNT(*) < 3
);

-- Check for tables that need vacuum
SELECT 
  'Recommendation: Run VACUUM ANALYZE on ' || tablename as recommendation
FROM pg_stat_user_tables
WHERE tablename IN ('daily_metrics', 'metric_collection_log')
  AND (last_vacuum IS NULL OR last_vacuum < NOW() - INTERVAL '7 days')
  AND n_live_tup > 1000;

\echo '\n=== Performance Validation Complete ==='
