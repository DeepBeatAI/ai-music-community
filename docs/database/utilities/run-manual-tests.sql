-- Quick Manual Test Script for collect_daily_metrics Function
-- Run this script after applying all migrations

-- ============================================================================
-- TEST 1: Verify Function Exists
-- ============================================================================
\echo '=== TEST 1: Verify Function Exists ==='
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'collect_daily_metrics';

-- ============================================================================
-- TEST 2: Run Function for Current Date
-- ============================================================================
\echo ''
\echo '=== TEST 2: Run Function for Current Date ==='
SELECT * FROM collect_daily_metrics(CURRENT_DATE);

-- ============================================================================
-- TEST 3: Verify 5 Metrics Were Created
-- ============================================================================
\echo ''
\echo '=== TEST 3: Verify 5 Metrics Were Created ==='
SELECT 
  metric_date,
  metric_type,
  metric_category,
  value,
  collection_timestamp
FROM daily_metrics
WHERE metric_date = CURRENT_DATE
ORDER BY metric_category;

-- ============================================================================
-- TEST 4: Check Collection Log Entry
-- ============================================================================
\echo ''
\echo '=== TEST 4: Check Collection Log Entry ==='
SELECT 
  collection_date,
  started_at,
  completed_at,
  status,
  metrics_collected,
  error_message,
  (completed_at - started_at) as duration
FROM metric_collection_log
WHERE collection_date = CURRENT_DATE
ORDER BY started_at DESC
LIMIT 1;

-- ============================================================================
-- TEST 5: Run Function Again (Test Idempotency)
-- ============================================================================
\echo ''
\echo '=== TEST 5: Run Function Again (Test Idempotency) ==='
SELECT * FROM collect_daily_metrics(CURRENT_DATE);

-- ============================================================================
-- TEST 6: Verify No Duplicates Were Created
-- ============================================================================
\echo ''
\echo '=== TEST 6: Verify No Duplicates Were Created ==='
SELECT 
  metric_date,
  metric_category,
  COUNT(*) as count
FROM daily_metrics
WHERE metric_date = CURRENT_DATE
GROUP BY metric_date, metric_category
HAVING COUNT(*) > 1;

\echo ''
\echo 'Expected: 0 rows (no duplicates)'

-- ============================================================================
-- TEST 7: Verify Total Metric Count
-- ============================================================================
\echo ''
\echo '=== TEST 7: Verify Total Metric Count ==='
SELECT COUNT(*) as total_metrics
FROM daily_metrics
WHERE metric_date = CURRENT_DATE;

\echo ''
\echo 'Expected: 5 metrics'

-- ============================================================================
-- TEST 8: Verify Metric Accuracy
-- ============================================================================
\echo ''
\echo '=== TEST 8: Verify Metric Accuracy ==='
WITH metric_values AS (
  SELECT metric_category, value
  FROM daily_metrics
  WHERE metric_date = CURRENT_DATE
),
actual_values AS (
  SELECT 'users_total' as category, 
         COUNT(*)::numeric as count 
  FROM profiles 
  WHERE created_at::DATE <= CURRENT_DATE
  
  UNION ALL
  
  SELECT 'posts_total', 
         COUNT(*)::numeric 
  FROM posts 
  WHERE created_at::DATE <= CURRENT_DATE
  
  UNION ALL
  
  SELECT 'comments_total', 
         COUNT(*)::numeric 
  FROM comments 
  WHERE created_at::DATE <= CURRENT_DATE
  
  UNION ALL
  
  SELECT 'posts_created', 
         COUNT(*)::numeric 
  FROM posts 
  WHERE created_at::DATE = CURRENT_DATE
  
  UNION ALL
  
  SELECT 'comments_created', 
         COUNT(*)::numeric 
  FROM comments 
  WHERE created_at::DATE = CURRENT_DATE
)
SELECT 
  a.category,
  a.count as actual_value,
  m.value as metric_value,
  CASE 
    WHEN a.count = m.value THEN '✓ Match'
    ELSE '✗ Mismatch'
  END as validation
FROM actual_values a
LEFT JOIN metric_values m ON a.category = m.metric_category
ORDER BY a.category;

\echo ''
\echo 'Expected: All metrics show ✓ Match'

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo ''
\echo '=== TEST SUMMARY ==='
\echo 'If all tests passed:'
\echo '  ✓ Function exists and is callable'
\echo '  ✓ Function creates exactly 5 metrics'
\echo '  ✓ Collection log shows completed status'
\echo '  ✓ Function is idempotent (no duplicates on re-run)'
\echo '  ✓ Metric values match actual database counts'
\echo ''
\echo 'Requirements validated: 1.1, 4.1'
