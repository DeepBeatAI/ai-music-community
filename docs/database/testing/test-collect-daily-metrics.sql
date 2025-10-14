-- Test script for collect_daily_metrics function
-- This script validates the function implementation

-- Test 1: Verify function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'collect_daily_metrics';

-- Test 2: Call function for current date (will fail if tables don't have data)
-- SELECT * FROM collect_daily_metrics(CURRENT_DATE);

-- Test 3: Verify idempotency - run twice and check for duplicates
-- SELECT * FROM collect_daily_metrics(CURRENT_DATE);
-- SELECT * FROM collect_daily_metrics(CURRENT_DATE);

-- Test 4: Check metrics were created
-- SELECT 
--   metric_date,
--   metric_type,
--   metric_category,
--   value
-- FROM daily_metrics
-- WHERE metric_date = CURRENT_DATE
-- ORDER BY metric_category;

-- Test 5: Check collection log entry
-- SELECT 
--   collection_date,
--   started_at,
--   completed_at,
--   status,
--   metrics_collected,
--   error_message
-- FROM metric_collection_log
-- WHERE collection_date = CURRENT_DATE
-- ORDER BY started_at DESC
-- LIMIT 1;

-- Test 6: Verify no duplicates after re-run
-- SELECT 
--   metric_date,
--   metric_category,
--   COUNT(*) as count
-- FROM daily_metrics
-- WHERE metric_date = CURRENT_DATE
-- GROUP BY metric_date, metric_category
-- HAVING COUNT(*) > 1;

-- Expected results:
-- - Function should exist with correct signature
-- - Should create exactly 5 metrics (users_total, posts_total, comments_total, posts_created, comments_created)
-- - Collection log should show 'completed' status
-- - Re-running should not create duplicates (ON CONFLICT handling)
-- - No duplicate metrics should exist for the same date/category combination
