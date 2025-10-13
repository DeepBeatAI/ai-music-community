# Task 5.3: Backfill Validation Guide

## Overview

This guide provides step-by-step instructions for running the backfill script and validating that historical data has been correctly processed.

**Requirements Covered**: 8.1, 8.2, 8.5

## Prerequisites

Before running the backfill:

1. ✅ All migrations applied (tasks 1-4 completed)
2. ✅ `collect_daily_metrics()` function tested and working
3. ✅ `backfill_daily_metrics()` function deployed
4. ✅ Environment variables configured in `.env.local`
5. ✅ Service role key available with proper permissions

## Step 1: Apply the Backfill Migration

First, ensure the backfill function is deployed to your database:

```bash
# Apply the migration
supabase db push

# Or if using remote database
supabase db push --db-url "your-database-url"
```

**Verify the function exists:**

```sql
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'backfill_daily_metrics';
```

Expected: One row showing the function exists.

## Step 2: Pre-Backfill Validation

Before running the backfill, check your current state:

### Check Existing Metrics

```sql
-- Count existing daily metrics
SELECT COUNT(*) as existing_metrics
FROM daily_metrics;

-- Check date range of existing metrics
SELECT 
  MIN(metric_date) as earliest_metric,
  MAX(metric_date) as latest_metric,
  COUNT(DISTINCT metric_date) as unique_dates
FROM daily_metrics;
```

### Check Source Data Range

```sql
-- Find earliest and latest posts
SELECT 
  MIN(created_at::date) as earliest_post,
  MAX(created_at::date) as latest_post,
  COUNT(*) as total_posts
FROM posts;

-- Find earliest and latest comments
SELECT 
  MIN(created_at::date) as earliest_comment,
  MAX(created_at::date) as latest_comment,
  COUNT(*) as total_comments
FROM comments;
```

**Record these values** - you'll use them to validate the backfill results.

## Step 3: Run the Backfill Script

### Option A: Auto-detect Date Range (Recommended)

Navigate to the client directory and run:

```bash
cd client
npx ts-node ../scripts/database/backfill-analytics.ts
```

The script will:
- Find the earliest post/comment date automatically
- Backfill from that date to today
- Display progress and summary

### Option B: Specify Custom Date Range

```bash
cd client
npx ts-node ../scripts/database/backfill-analytics.ts --start-date 2024-01-01 --end-date 2024-12-31
```

### Expected Output

```
═══════════════════════════════════════════════════════
  Analytics Metrics Backfill Script
═══════════════════════════════════════════════════════

📅 Finding earliest post/comment date...
✅ Earliest date found: 2024-01-01

🚀 Starting analytics backfill...
   Start Date: 2024-01-01
   End Date: 2025-01-11

✅ Backfill completed successfully!

📊 Summary:
   Dates Processed: 376
   Total Metrics: 1880
   Database Execution Time: 12543ms
   Total Script Time: 13.24s
   Status: completed

✨ All done! Your analytics metrics are now up to date.
```

## Step 4: Post-Backfill Validation

### Validation 1: Check Metrics Count

```sql
-- Count total metrics after backfill
SELECT COUNT(*) as total_metrics
FROM daily_metrics;

-- Count metrics by type
SELECT 
  metric_type,
  COUNT(*) as count
FROM daily_metrics
GROUP BY metric_type
ORDER BY metric_type;
```

**Expected**: 
- 5 metrics per date (posts_created, comments_created, likes_given, follows_created, active_users)
- Total metrics = (number of dates) × 5

### Validation 2: Verify Date Coverage

```sql
-- Check for gaps in date coverage
WITH date_series AS (
  SELECT generate_series(
    (SELECT MIN(metric_date) FROM daily_metrics),
    (SELECT MAX(metric_date) FROM daily_metrics),
    '1 day'::interval
  )::date AS expected_date
),
missing_dates AS (
  SELECT 
    ds.expected_date,
    COUNT(dm.metric_date) as metrics_count
  FROM date_series ds
  LEFT JOIN daily_metrics dm ON ds.expected_date = dm.metric_date
  GROUP BY ds.expected_date
  HAVING COUNT(dm.metric_date) < 5
)
SELECT * FROM missing_dates;
```

**Expected**: No rows (no missing dates or incomplete dates)

### Validation 3: Validate Data Accuracy

Compare aggregated metrics against source tables:

```sql
-- Validate posts_created metric
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
)
SELECT 
  COALESCE(s.date, m.date) as date,
  s.actual_count,
  m.recorded_count,
  CASE 
    WHEN s.actual_count = m.recorded_count THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM source_counts s
FULL OUTER JOIN metric_counts m ON s.date = m.date
WHERE s.actual_count != m.recorded_count OR s.actual_count IS NULL OR m.recorded_count IS NULL
ORDER BY date DESC
LIMIT 10;
```

**Expected**: No rows (all counts match)

Repeat for other metric types:
- `comments_created`
- `likes_given`
- `follows_created`
- `active_users`

### Validation 4: Check Collection Log

```sql
-- Review collection log for the backfill
SELECT 
  collection_date,
  status,
  metrics_collected,
  execution_time_ms,
  error_message
FROM metric_collection_log
WHERE collection_date >= (SELECT MIN(metric_date) FROM daily_metrics)
ORDER BY collection_date DESC
LIMIT 20;
```

**Expected**: 
- Status = 'completed' for all dates
- No error messages
- Metrics_collected = 5 for each date

### Validation 5: Verify Metric Trends

```sql
-- Check for reasonable metric trends
SELECT 
  metric_date,
  metric_type,
  metric_value
FROM daily_metrics
WHERE metric_type IN ('posts_created', 'active_users')
ORDER BY metric_date DESC
LIMIT 30;
```

**Expected**: Values should be reasonable and show realistic trends (no negative values, no extreme outliers)

## Step 5: Performance Validation

### Check Query Performance

```sql
-- Test common analytics queries
EXPLAIN ANALYZE
SELECT 
  metric_date,
  SUM(CASE WHEN metric_type = 'posts_created' THEN metric_value ELSE 0 END) as posts,
  SUM(CASE WHEN metric_type = 'comments_created' THEN metric_value ELSE 0 END) as comments,
  SUM(CASE WHEN metric_type = 'active_users' THEN metric_value ELSE 0 END) as users
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY metric_date
ORDER BY metric_date DESC;
```

**Expected**: Query execution time < 100ms

## Troubleshooting

### Issue: Script fails with "Missing environment variables"

**Solution**: 
```bash
# Check your .env.local file in the client directory
cat client/.env.local | grep SUPABASE

# Ensure these are set:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Issue: "Function backfill_daily_metrics does not exist"

**Solution**:
```bash
# Apply the migration
supabase db push

# Verify function exists
supabase db execute "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'backfill_daily_metrics';"
```

### Issue: Backfill completed with errors

**Solution**:
```sql
-- Check the collection log for specific errors
SELECT 
  collection_date,
  error_message,
  error_details
FROM metric_collection_log
WHERE status = 'error'
ORDER BY collection_date DESC;

-- Review database logs
-- In Supabase dashboard: Database > Logs
```

### Issue: Metrics don't match source data

**Solution**:
```sql
-- Clear metrics for a specific date and re-run
DELETE FROM daily_metrics WHERE metric_date = '2024-01-01';
DELETE FROM metric_collection_log WHERE collection_date = '2024-01-01';

-- Re-run collection for that date
SELECT * FROM collect_daily_metrics('2024-01-01');

-- Verify the results
SELECT * FROM daily_metrics WHERE metric_date = '2024-01-01';
```

### Issue: Performance is slow

**Solution**:
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM daily_metrics WHERE metric_date >= '2024-01-01';

-- Verify indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'daily_metrics';

-- If needed, reindex
REINDEX TABLE daily_metrics;
```

## Success Criteria Checklist

- [ ] Backfill script executed without errors
- [ ] All dates have 5 metrics (posts, comments, likes, follows, users)
- [ ] No gaps in date coverage
- [ ] Metric values match source table counts
- [ ] Collection log shows all successful completions
- [ ] Query performance meets requirements (< 100ms)
- [ ] No error messages in collection log
- [ ] Metric trends appear reasonable

## Next Steps

After successful validation:

1. **Set up automated collection**: Configure daily cron job or Edge Function
2. **Create analytics dashboard**: Build UI to display the metrics
3. **Monitor ongoing collection**: Set up alerts for collection failures
4. **Document for team**: Share this guide with team members

## Related Files

- `scripts/database/backfill-analytics.ts` - The backfill script
- `scripts/database/BACKFILL_README.md` - Usage documentation
- `supabase/migrations/20250111000002_create_backfill_daily_metrics_function.sql` - SQL function
- `supabase/migrations/validate_backfill_results.sql` - Validation queries (see below)
