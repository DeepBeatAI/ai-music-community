-- Performance validation script for analytics metrics indexes
-- This script validates that the indexes are being used correctly by the query planner

-- =====================================================
-- Test 1: Verify composite index usage for date range queries
-- =====================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT metric_date, metric_type, metric_category, value
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
  AND metric_date <= CURRENT_DATE
  AND metric_type = 'count'
ORDER BY metric_date DESC;

-- Expected: Should use idx_daily_metrics_date_type index
-- Look for "Index Scan using idx_daily_metrics_date_type"

-- =====================================================
-- Test 2: Verify category index usage
-- =====================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT metric_date, metric_category, value
FROM daily_metrics
WHERE metric_category IN ('posts_created', 'comments_created')
  AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_date DESC;

-- Expected: Should use idx_daily_metrics_category index
-- Look for "Index Scan using idx_daily_metrics_category"

-- =====================================================
-- Test 3: Verify collection timestamp index usage
-- =====================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT metric_date, metric_category, value, collection_timestamp
FROM daily_metrics
WHERE collection_timestamp >= NOW() - INTERVAL '7 days'
ORDER BY collection_timestamp DESC;

-- Expected: Should use idx_daily_metrics_collection index
-- Look for "Index Scan using idx_daily_metrics_collection"

-- =====================================================
-- Test 4: Verify index statistics
-- =====================================================
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'daily_metrics'
ORDER BY indexname;

-- =====================================================
-- Test 5: Verify index sizes
-- =====================================================
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'daily_metrics'
ORDER BY indexname;

-- =====================================================
-- Summary Report
-- =====================================================
DO $
DECLARE
  idx_count INTEGER;
BEGIN
  -- Count indexes on daily_metrics
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'daily_metrics'
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'INDEX VALIDATION SUMMARY';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total indexes on daily_metrics: %', idx_count;
  RAISE NOTICE 'Expected indexes: 3 (date_type, category, collection)';
  
  IF idx_count >= 3 THEN
    RAISE NOTICE 'STATUS: ✓ All required indexes are present';
  ELSE
    RAISE WARNING 'STATUS: ✗ Missing indexes (found %, expected 3)', idx_count;
  END IF;
  
  RAISE NOTICE '===========================================';
END $;
