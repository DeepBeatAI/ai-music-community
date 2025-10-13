-- ============================================================================
-- Run Analytics Backfill
-- ============================================================================
-- This script runs the backfill process to populate historical analytics data
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- ============================================================================

-- Step 1: Find the earliest date in your database
\echo 'Finding earliest post/comment date...'
\echo ''

SELECT 
  'Earliest Date Found' as info,
  LEAST(
    COALESCE((SELECT MIN(created_at::date) FROM posts), CURRENT_DATE),
    COALESCE((SELECT MIN(created_at::date) FROM comments), CURRENT_DATE)
  ) as earliest_date;

\echo ''
\echo 'Copy the date above and use it in the backfill call below'
\echo ''

-- Step 2: Run the backfill
-- IMPORTANT: Replace 'YYYY-MM-DD' below with the earliest_date from above
-- Example: SELECT * FROM backfill_daily_metrics('2024-01-15'::DATE, CURRENT_DATE);

\echo 'Running backfill...'
\echo 'NOTE: If you have a lot of historical data, this may take a few minutes'
\echo ''

-- Uncomment and edit the line below with your actual start date:
-- SELECT * FROM backfill_daily_metrics('2024-01-01'::DATE, CURRENT_DATE);

-- Or use this to backfill just the last 30 days for testing:
SELECT * FROM backfill_daily_metrics(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);

\echo ''
\echo 'Backfill complete! Check the results above.'
\echo ''
