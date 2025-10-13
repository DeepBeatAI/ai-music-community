-- ============================================================================
-- EXECUTE ANALYTICS BACKFILL
-- ============================================================================
-- Copy and paste this entire file into your Supabase SQL Editor and run it
-- This will backfill all historical analytics data
-- ============================================================================

-- Step 1: Find the earliest date
DO $$
DECLARE
  earliest DATE;
  latest DATE;
BEGIN
  -- Get earliest date from posts and comments
  SELECT LEAST(
    COALESCE((SELECT MIN(created_at::date) FROM posts), CURRENT_DATE),
    COALESCE((SELECT MIN(created_at::date) FROM comments), CURRENT_DATE)
  ) INTO earliest;
  
  latest := CURRENT_DATE;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  Analytics Backfill';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Earliest date found: %', earliest;
  RAISE NOTICE 'Latest date: %', latest;
  RAISE NOTICE 'Total days to process: %', (latest - earliest + 1);
  RAISE NOTICE '';
  RAISE NOTICE 'Starting backfill...';
  RAISE NOTICE '';
END $$;

-- Step 2: Run the backfill
-- This will process all dates and show progress
SELECT * FROM backfill_daily_metrics(
  (SELECT LEAST(
    COALESCE((SELECT MIN(created_at::date) FROM posts), CURRENT_DATE),
    COALESCE((SELECT MIN(created_at::date) FROM comments), CURRENT_DATE)
  )),
  CURRENT_DATE
);

-- Step 3: Show summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  Backfill Complete!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Step 4: Verify results
SELECT 
  '✓ Total Metrics Created' as check_name,
  COUNT(*) as count
FROM daily_metrics;

SELECT 
  '✓ Metrics by Category' as check_name,
  metric_category,
  COUNT(*) as count
FROM daily_metrics
GROUP BY metric_category
ORDER BY metric_category;

SELECT 
  '✓ Date Range' as check_name,
  MIN(metric_date) as earliest_date,
  MAX(metric_date) as latest_date,
  COUNT(DISTINCT metric_date) as unique_dates
FROM daily_metrics;

SELECT 
  '✓ Recent Metrics Sample' as check_name,
  metric_date,
  metric_category,
  value
FROM daily_metrics
ORDER BY metric_date DESC, metric_category
LIMIT 15;
