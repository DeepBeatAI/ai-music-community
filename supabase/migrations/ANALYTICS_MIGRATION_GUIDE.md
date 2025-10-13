# Analytics Metrics System - Migration Guide

## Overview

This guide explains the comprehensive analytics metrics migration file (`20250113000000_analytics_metrics_complete.sql`) that implements the complete analytics metrics system for the AI Music Community Platform.

## What This Migration Includes

### 1. Database Tables (3 tables)
- **daily_metrics** - Immutable daily snapshots of platform metrics
- **metric_definitions** - Metadata about available metrics
- **metric_collection_log** - Monitoring logs for collection runs

### 2. Performance Indexes (5 indexes)
- Date range and metric type queries
- Category-specific lookups
- Collection timestamp monitoring
- Collection log queries

### 3. Row Level Security (RLS) Policies (6 policies)
- Public read access for metrics and definitions
- Service role management for all tables
- Collection log access restrictions

### 4. PostgreSQL Functions (2 functions)
- **collect_daily_metrics()** - Daily metric collection
- **backfill_daily_metrics()** - Historical data backfill

### 5. Seed Data
- 5 core metric definitions (users, posts, comments)

## Migration File Structure

```
20250113000000_analytics_metrics_complete.sql
├── Section 1: Table Definitions
│   ├── daily_metrics
│   ├── metric_definitions
│   └── metric_collection_log
├── Section 2: Performance Indexes
├── Section 3: Row Level Security Policies
├── Section 4: Collection Function
├── Section 5: Backfill Function
├── Section 6: Metric Definitions Seed Data
└── Section 7: Usage Examples
```

## Installation Instructions

### For Fresh Installations

If you're setting up the analytics system for the first time:

```bash
# Apply the migration using Supabase CLI
supabase db push

# Or apply directly via SQL editor in Supabase Dashboard
# Copy and paste the entire migration file
```

### For Existing Installations

If you already have the analytics system installed via separate migration files:

**Option 1: Use as Reference Only**
- Keep existing migrations (20250111000000_*.sql files)
- Use this file as documentation and reference
- No action needed

**Option 2: Fresh Start (Advanced)**
- Only if you need to rebuild the analytics system
- Drop existing tables first (will lose data!)
- Apply this consolidated migration

## Post-Migration Steps

### 1. Verify Installation

```sql
-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('daily_metrics', 'metric_definitions', 'metric_collection_log');

-- Check that functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('collect_daily_metrics', 'backfill_daily_metrics');

-- Check that indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'daily_metrics';
```

### 2. Run Initial Backfill

Populate historical metrics data:

```sql
-- Backfill from earliest data to today
SELECT * FROM backfill_daily_metrics(
  (SELECT MIN(created_at::DATE) FROM tracks),
  CURRENT_DATE
);
```

### 3. Test Collection Function

```sql
-- Test collecting metrics for today
SELECT * FROM collect_daily_metrics();

-- Verify metrics were created
SELECT * FROM daily_metrics 
WHERE metric_date = CURRENT_DATE 
ORDER BY metric_category;

-- Check collection log
SELECT * FROM metric_collection_log 
ORDER BY started_at DESC 
LIMIT 1;
```

### 4. Set Up Automated Collection

**Option A: Supabase Edge Function (Recommended)**

Create `supabase/functions/collect-metrics/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { data, error } = await supabase.rpc('collect_daily_metrics')
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

Then configure cron trigger in Supabase Dashboard:
- Function: collect-metrics
- Schedule: `0 0 * * *` (daily at midnight UTC)

**Option B: pg_cron (If Available)**

```sql
-- Schedule daily collection at 00:00 UTC
SELECT cron.schedule(
  'collect-daily-metrics',
  '0 0 * * *',
  $$SELECT collect_daily_metrics()$$
);
```

## Usage Examples

### Collecting Metrics

```sql
-- Collect metrics for today
SELECT * FROM collect_daily_metrics();

-- Collect metrics for specific date
SELECT * FROM collect_daily_metrics('2025-01-10');

-- Backfill last 30 days
SELECT * FROM backfill_daily_metrics(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);
```

### Querying Metrics

```sql
-- Get all metrics for last 30 days
SELECT 
  metric_date,
  metric_category,
  value
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_date DESC, metric_category;

-- Get latest total counts
SELECT 
  metric_category,
  value
FROM daily_metrics
WHERE metric_date = (SELECT MAX(metric_date) FROM daily_metrics)
  AND metric_category IN ('users_total', 'posts_total', 'comments_total');

-- Get daily activity (posts and comments created)
SELECT 
  metric_date,
  SUM(CASE WHEN metric_category = 'posts_created' THEN value ELSE 0 END) as posts,
  SUM(CASE WHEN metric_category = 'comments_created' THEN value ELSE 0 END) as comments
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
  AND metric_category IN ('posts_created', 'comments_created')
GROUP BY metric_date
ORDER BY metric_date DESC;
```

### Monitoring Collection

```sql
-- Check recent collection runs
SELECT 
  collection_date,
  status,
  metrics_collected,
  started_at,
  completed_at,
  (completed_at - started_at) as duration
FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 10;

-- Check for failed collections
SELECT * FROM metric_collection_log
WHERE status = 'failed'
ORDER BY started_at DESC;

-- View metric definitions
SELECT 
  display_name,
  description,
  unit,
  format_pattern
FROM metric_definitions
WHERE is_active = true
ORDER BY metric_category;
```

## Troubleshooting

### Issue: Migration Fails with "relation already exists"

**Solution:** The tables already exist from previous migrations. This is expected if you've already run the separate migration files. You can:
- Skip this migration (use existing setup)
- Or use `CREATE TABLE IF NOT EXISTS` (already included in migration)

### Issue: Backfill Takes Too Long

**Solution:** Process in smaller batches:

```sql
-- Backfill one month at a time
SELECT * FROM backfill_daily_metrics('2024-01-01', '2024-01-31');
SELECT * FROM backfill_daily_metrics('2024-02-01', '2024-02-29');
-- etc.
```

### Issue: Collection Function Returns 0 Metrics

**Solution:** Check that source tables have data:

```sql
-- Verify source data exists
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM tracks;
SELECT COUNT(*) FROM comments;
```

### Issue: RLS Policies Block Access

**Solution:** Ensure you're using the service role key for collection:

```typescript
// Use service role key, not anon key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Not ANON_KEY
)
```

## Performance Considerations

### Query Performance

All queries should complete in < 100ms with proper indexes:

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT metric_date, metric_category, value
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
  AND metric_category IN ('posts_created', 'comments_created')
ORDER BY metric_date DESC;
```

Expected: Index scan on `idx_daily_metrics_date_type`

### Collection Performance

Collection should complete in < 30 seconds:

```sql
-- Monitor collection duration
SELECT 
  collection_date,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM metric_collection_log
WHERE status = 'completed'
ORDER BY started_at DESC
LIMIT 10;
```

## Adding New Metrics

To add new metrics to the system:

### 1. Add Metric Definition

```sql
INSERT INTO metric_definitions (
  metric_type,
  metric_category,
  display_name,
  description,
  unit,
  format_pattern,
  is_active
) VALUES (
  'count',
  'likes_total',
  'Total Likes',
  'Total number of likes on the platform',
  'likes',
  '0,0',
  true
);
```

### 2. Update Collection Function

Add new metric collection logic to `collect_daily_metrics()`:

```sql
-- Add to the function body
INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
VALUES (
  target_date,
  'count',
  'likes_total',
  (SELECT COUNT(*) FROM likes WHERE created_at::DATE <= target_date)
)
ON CONFLICT (metric_date, metric_type, metric_category) 
DO UPDATE SET value = EXCLUDED.value, collection_timestamp = NOW();
metrics_count := metrics_count + 1;
```

### 3. Backfill Historical Data

```sql
-- Backfill the new metric
SELECT * FROM backfill_daily_metrics(
  (SELECT MIN(created_at::DATE) FROM likes),
  CURRENT_DATE
);
```

## Requirements Mapping

This migration satisfies the following requirements:

- **1.1, 1.3** - Daily metrics snapshot system
- **2.1, 2.3** - Extensible metrics schema
- **3.1, 3.2, 3.4** - Automated metric collection
- **4.1, 4.4** - Historical data integrity with RLS
- **5.1, 5.2, 5.3** - Performance optimization with indexes
- **6.1, 6.2** - Metric type flexibility
- **8.1, 8.2, 8.4** - Migration and backfill support
- **10.1, 10.2** - Monitoring and observability

## Related Files

- **Migration File:** `supabase/migrations/20250113000000_analytics_metrics_complete.sql`
- **Requirements:** `.kiro/specs/analytics-metrics-table/requirements.md`
- **Design:** `.kiro/specs/analytics-metrics-table/design.md`
- **Tasks:** `.kiro/specs/analytics-metrics-table/tasks.md`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the design document for architecture details
3. Check collection logs for error messages
4. Verify RLS policies and permissions

---

**Migration Version:** 1.0  
**Created:** 2025-01-13  
**Status:** Complete and Ready for Use
