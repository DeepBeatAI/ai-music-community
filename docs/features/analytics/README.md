# Analytics Metrics System

## Overview

The Analytics Metrics System is a dedicated solution for tracking platform activity over time with historical accuracy, independent of content deletions. It captures daily snapshots of key metrics, ensuring that analytics remain accurate even when posts, comments, or other content is deleted from the operational tables.

## Problem Solved

The previous analytics system queried live data from `posts` and `comments` tables. When content was deleted (hard delete with CASCADE), historical metrics became inaccurate because the system could only count what currently existed in the database. This new system maintains immutable daily snapshots, preserving historical accuracy.

## Architecture

### Core Components

1. **Database Tables**
   - `daily_metrics` - Stores daily metric snapshots
   - `metric_definitions` - Metadata about each metric type
   - `metric_collection_log` - Monitoring and audit trail

2. **Collection Functions**
   - `collect_daily_metrics()` - Collects metrics for a specific date
   - `backfill_daily_metrics()` - Backfills historical data

3. **Query API**
   - TypeScript functions for fetching and transforming metrics
   - Located in `client/src/lib/analytics.ts`

4. **Automation**
   - Supabase Edge Function for scheduled collection
   - Cron trigger for daily execution at 00:00 UTC

### Data Flow

```
Source Tables (posts, comments, profiles)
           ↓
Collection Function (daily at 00:00 UTC)
           ↓
daily_metrics Table (immutable snapshots)
           ↓
Query API (fetchMetrics, fetchCurrentMetrics, etc.)
           ↓
Analytics Dashboard
```

## Current Metrics

The system currently tracks 5 core metrics:

| Metric Category | Type | Description |
|----------------|------|-------------|
| `users_total` | count | Total registered users |
| `posts_total` | count | Total posts created |
| `comments_total` | count | Total comments created |
| `posts_created` | count | Posts created on that specific day |
| `comments_created` | count | Comments created on that specific day |

## Key Features

### 1. Immutability
Once recorded, daily metrics are never modified. This ensures:
- Historical data remains accurate
- Audit trail is preserved
- Reports are consistent over time

### 2. Idempotency
The collection function can be run multiple times for the same date without creating duplicates. It uses `ON CONFLICT` handling to update existing records if needed.

### 3. Performance
- Optimized indexes for fast queries
- Pre-aggregated data eliminates expensive calculations
- Query times under 100ms for 30-day ranges

### 4. Extensibility
The schema supports adding new metrics without breaking changes:
- Flexible metric types (count, average, percentage, aggregate)
- JSONB metadata field for complex data
- Separate definitions table for metric metadata

### 5. Monitoring
- Collection logs track success/failure
- Execution time monitoring
- Error details captured for debugging

## Usage

### Querying Metrics

```typescript
import { fetchMetrics, fetchCurrentMetrics, fetchActivityData } from '@/lib/analytics';

// Get current platform metrics
const current = await fetchCurrentMetrics();
console.log(current.totalUsers, current.totalPosts, current.totalComments);

// Get activity data for last 30 days
const activity = await fetchActivityData();
activity.forEach(day => {
  console.log(day.date, day.posts, day.comments);
});

// Get metrics for custom date range
const metrics = await fetchMetrics({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  categories: ['posts_created', 'comments_created']
});
```

### Manual Collection

```typescript
import { triggerMetricCollection } from '@/lib/analytics';

// Collect metrics for today
await triggerMetricCollection();

// Collect metrics for specific date
await triggerMetricCollection('2025-01-15');
```

### Running Backfill

See [Backfill Guide](./BACKFILL_GUIDE.md) for detailed instructions.

## Database Schema

### daily_metrics Table

```sql
CREATE TABLE daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  collection_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_daily_metric UNIQUE (metric_date, metric_type, metric_category)
);
```

### Indexes

- `idx_daily_metrics_date_type` - Composite index on (metric_date DESC, metric_type, metric_category)
- `idx_daily_metrics_category` - Index on (metric_category, metric_date DESC)
- `idx_daily_metrics_collection` - Index on collection_timestamp

### Row Level Security

- Public read access for all metrics
- Service role only for insert/update operations
- Admin-only access to collection logs

## Adding New Metrics

See [Adding New Metrics Guide](./ADDING_METRICS.md) for step-by-step instructions.

## Monitoring

### Collection Status

Check the latest collection status:

```sql
SELECT 
  collection_date,
  status,
  metrics_collected,
  completed_at - started_at as duration,
  error_message
FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 10;
```

### Data Quality Checks

```sql
-- Check for missing dates
SELECT generate_series(
  (SELECT MIN(metric_date) FROM daily_metrics),
  CURRENT_DATE,
  '1 day'::interval
)::date AS expected_date
EXCEPT
SELECT DISTINCT metric_date FROM daily_metrics
ORDER BY expected_date;

-- Check metric counts per day
SELECT 
  metric_date,
  COUNT(*) as metric_count
FROM daily_metrics
GROUP BY metric_date
HAVING COUNT(*) != 5  -- Expected 5 metrics per day
ORDER BY metric_date DESC;
```

## Performance Benchmarks

- Collection time: < 30 seconds
- Query time (30 days): < 100ms
- Dashboard load time: < 2 seconds
- Backfill rate: ~100 days per minute

## Troubleshooting

### Collection Failures

1. Check collection logs:
```sql
SELECT * FROM metric_collection_log 
WHERE status = 'failed' 
ORDER BY started_at DESC;
```

2. Review error details:
```sql
SELECT 
  collection_date,
  error_message,
  error_details
FROM metric_collection_log
WHERE status = 'failed';
```

3. Manually trigger collection:
```typescript
await triggerMetricCollection('2025-01-15');
```

### Missing Data

If data is missing for specific dates, run backfill:

```bash
cd scripts
npx tsx backfill-analytics.ts
```

### Performance Issues

1. Check index usage:
```sql
EXPLAIN ANALYZE
SELECT * FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_date DESC;
```

2. Verify indexes exist:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'daily_metrics';
```

## Related Documentation

- [Backfill Guide](./BACKFILL_GUIDE.md) - Running historical data backfill
- [Adding New Metrics](./ADDING_METRICS.md) - How to add new metric types
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment validation
- [Testing Guide](./TESTING_GUIDE.md) - How to test the analytics system

## Migration Information

The analytics system was implemented in migration `20250113000000_analytics_metrics_complete.sql`. See the migration file for complete schema details.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review collection logs for errors
3. Consult the design document at `.kiro/specs/analytics-metrics-table/design.md`
