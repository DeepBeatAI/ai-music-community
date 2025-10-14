# Analytics Backfill Guide

## Overview

This guide explains how to backfill historical analytics data for the metrics system. Backfilling is necessary when:
- First deploying the analytics system
- Recovering from collection failures
- Adding new metrics that need historical data

## Prerequisites

- Supabase project with analytics tables deployed
- Service role key with database access
- Node.js and npm/npx installed
- Access to the `scripts/` directory

## Quick Start

### 1. Navigate to Scripts Directory

```bash
cd scripts
```

### 2. Run Backfill Script

```bash
npx tsx backfill-analytics.ts
```

The script will:
1. Query the earliest post/comment date
2. Calculate the date range to backfill
3. Call the `backfill_daily_metrics()` database function
4. Display progress and results

## Backfill Process

### What Happens During Backfill

1. **Date Range Calculation**
   - Finds the earliest content creation date
   - Sets end date to current date
   - Processes each date sequentially

2. **Metric Collection**
   - For each date, calls `collect_daily_metrics(date)`
   - Collects all 5 core metrics
   - Uses `ON CONFLICT` to handle existing records

3. **Progress Logging**
   - Logs each date processed
   - Shows metrics collected per date
   - Reports total execution time

### Expected Output

```
Starting analytics backfill...
Backfilling from 2024-06-01 to 2025-01-13
Processing dates...
Backfill completed: {
  dates_processed: 227,
  total_metrics: 1135,
  execution_time_ms: 45230
}
```

## Manual Backfill (SQL)

If you prefer to run backfill directly in SQL:

```sql
-- Backfill from specific start date to today
SELECT * FROM backfill_daily_metrics(
  start_date := '2024-06-01'::DATE,
  end_date := CURRENT_DATE
);

-- Backfill specific date range
SELECT * FROM backfill_daily_metrics(
  start_date := '2024-06-01'::DATE,
  end_date := '2024-12-31'::DATE
);
```

## Validation After Backfill

### 1. Check Date Coverage

```sql
-- Verify all dates have metrics
SELECT 
  metric_date,
  COUNT(*) as metric_count
FROM daily_metrics
GROUP BY metric_date
ORDER BY metric_date DESC
LIMIT 30;
```

Expected: 5 metrics per date

### 2. Verify Data Accuracy

```sql
-- Compare latest metrics to actual counts
SELECT 
  (SELECT COUNT(*) FROM profiles) as actual_users,
  (SELECT value FROM daily_metrics 
   WHERE metric_category = 'users_total' 
   ORDER BY metric_date DESC LIMIT 1) as recorded_users,
  
  (SELECT COUNT(*) FROM posts) as actual_posts,
  (SELECT value FROM daily_metrics 
   WHERE metric_category = 'posts_total' 
   ORDER BY metric_date DESC LIMIT 1) as recorded_posts;
```

### 3. Check for Missing Dates

```sql
-- Find any gaps in date coverage
WITH date_range AS (
  SELECT generate_series(
    (SELECT MIN(metric_date) FROM daily_metrics),
    CURRENT_DATE,
    '1 day'::interval
  )::date AS expected_date
)
SELECT expected_date
FROM date_range
WHERE expected_date NOT IN (
  SELECT DISTINCT metric_date FROM daily_metrics
)
ORDER BY expected_date;
```

## Troubleshooting

### Backfill Script Fails

**Error: Cannot find module**
```bash
# Install dependencies
npm install

# Try again
npx tsx backfill-analytics.ts
```

**Error: Connection refused**
```bash
# Check environment variables
cat client/.env.local | grep SUPABASE

# Verify Supabase is accessible
curl https://your-project.supabase.co
```

### Partial Backfill

If backfill stops partway through:

1. Check which dates were processed:
```sql
SELECT MAX(metric_date) FROM daily_metrics;
```

2. Resume from that date:
```sql
SELECT * FROM backfill_daily_metrics(
  start_date := '2024-08-15'::DATE,  -- Day after last processed
  end_date := CURRENT_DATE
);
```

### Performance Issues

If backfill is slow:

1. **Process in smaller batches**:
```sql
-- Backfill one month at a time
SELECT * FROM backfill_daily_metrics(
  start_date := '2024-06-01'::DATE,
  end_date := '2024-06-30'::DATE
);
```

2. **Check database load**:
```sql
SELECT * FROM pg_stat_activity 
WHERE state = 'active';
```

3. **Run during off-peak hours**

### Data Inconsistencies

If backfilled data doesn't match expectations:

1. **Check source data**:
```sql
-- Verify posts exist for the date range
SELECT 
  created_at::date as date,
  COUNT(*) as posts
FROM posts
WHERE created_at::date >= '2024-06-01'
GROUP BY created_at::date
ORDER BY date
LIMIT 10;
```

2. **Re-run collection for specific dates**:
```sql
-- Force recollection for a date
DELETE FROM daily_metrics WHERE metric_date = '2024-06-15';
SELECT * FROM collect_daily_metrics('2024-06-15'::DATE);
```

## Best Practices

### Before Backfill

1. **Backup existing data** (if any):
```sql
CREATE TABLE daily_metrics_backup AS 
SELECT * FROM daily_metrics;
```

2. **Verify source data quality**:
```sql
-- Check for data in source tables
SELECT 
  (SELECT COUNT(*) FROM posts) as posts,
  (SELECT COUNT(*) FROM comments) as comments,
  (SELECT COUNT(*) FROM profiles) as users;
```

3. **Test on a small range first**:
```sql
-- Test with one week
SELECT * FROM backfill_daily_metrics(
  start_date := CURRENT_DATE - INTERVAL '7 days',
  end_date := CURRENT_DATE
);
```

### During Backfill

1. **Monitor progress** in collection logs:
```sql
SELECT * FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 10;
```

2. **Watch for errors**:
```sql
SELECT * FROM metric_collection_log
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### After Backfill

1. **Run validation queries** (see Validation section above)
2. **Check dashboard** displays correctly
3. **Document backfill** in deployment notes
4. **Clean up** any test data

## Scheduling Regular Backfills

For ongoing maintenance, you can schedule periodic backfills:

### Weekly Backfill (Catch-up)

```bash
# Add to cron (runs every Sunday at 2 AM)
0 2 * * 0 cd /path/to/project/scripts && npx tsx backfill-analytics.ts
```

### On-Demand Backfill

Create a script for manual execution:

```bash
#!/bin/bash
# backfill-last-week.sh

cd scripts
npx tsx -e "
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);

const { data, error } = await supabase.rpc('backfill_daily_metrics', {
  start_date: startDate.toISOString().split('T')[0],
  end_date: new Date().toISOString().split('T')[0]
});

console.log('Backfill result:', data);
"
```

## Performance Expectations

- **Processing rate**: ~100 dates per minute
- **Memory usage**: < 100MB
- **Database load**: Moderate (uses indexes efficiently)
- **Network**: Minimal (single RPC call)

## Example Scenarios

### Scenario 1: Initial Deployment

```bash
# First time setup - backfill all historical data
cd scripts
npx tsx backfill-analytics.ts
```

### Scenario 2: Missed Collections

```sql
-- Find missing dates
WITH date_range AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    '1 day'::interval
  )::date AS expected_date
)
SELECT expected_date
FROM date_range
WHERE expected_date NOT IN (
  SELECT DISTINCT metric_date FROM daily_metrics
);

-- Backfill missing dates
SELECT * FROM backfill_daily_metrics(
  start_date := '2025-01-05'::DATE,
  end_date := '2025-01-07'::DATE
);
```

### Scenario 3: New Metric Added

When adding a new metric type, backfill historical data:

```sql
-- After adding new metric to collect_daily_metrics()
-- Re-run backfill to populate historical values
SELECT * FROM backfill_daily_metrics(
  start_date := '2024-06-01'::DATE,
  end_date := CURRENT_DATE
);
```

## Related Documentation

- [Analytics System README](./README.md) - System overview
- [Adding New Metrics](./ADDING_METRICS.md) - How to add metrics
- [Testing Guide](./TESTING_GUIDE.md) - Testing procedures

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review collection logs for errors
3. Verify environment variables are set correctly
4. Consult the design document for technical details
