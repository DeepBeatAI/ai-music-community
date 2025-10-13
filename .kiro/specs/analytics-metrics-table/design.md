# Design Document

## Overview

This design implements a dedicated analytics metrics table system that captures daily snapshots of platform activity, ensuring historical accuracy independent of content deletions. The system uses a flexible, extensible schema that supports multiple metric types and aggregation levels, enabling future analytics features without major restructuring.

### Key Design Principles

1. **Immutability**: Once recorded, daily metrics are never modified
2. **Extensibility**: Schema supports adding new metrics without breaking changes
3. **Performance**: Optimized for fast queries with proper indexing
4. **Automation**: Scheduled collection with error handling and retry logic
5. **Future-Proof**: Designed to accommodate growth in metrics types and data volume

### Problem Being Solved

The current analytics system queries live data from `posts` and `comments` tables. When content is deleted (hard delete with CASCADE), historical metrics become inaccurate because the system can only count what currently exists. This design solves that by maintaining immutable daily snapshots.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Analytics System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Scheduler  │─────▶│  Collector   │                    │
│  │  (pg_cron)   │      │   Service    │                    │
│  └──────────────┘      └──────┬───────┘                    │
│                                │                             │
│                                ▼                             │
│                    ┌───────────────────────┐                │
│                    │  Aggregation Engine   │                │
│                    └───────────┬───────────┘                │
│                                │                             │
│                                ▼                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │         daily_metrics Table                      │       │
│  │  (Immutable snapshots of platform activity)      │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  Query API   │─────▶│  Analytics   │                    │
│  │              │      │  Dashboard    │                    │
│  └──────────────┘      └──────────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Source Tables:
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  posts   │  │ comments │  │ profiles │  │  tracks  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Data Flow

1. **Collection Phase** (Daily at 00:00 UTC)
   - Scheduler triggers collection function
   - Aggregation engine queries source tables
   - Metrics calculated and validated
   - Records inserted into daily_metrics table

2. **Query Phase** (On-demand)
   - Dashboard requests metrics for date range
   - Query API retrieves from daily_metrics
   - Data formatted and returned to UI
   - No calculation needed - pre-aggregated data

3. **Backfill Phase** (One-time migration)
   - Historical data extracted from source tables
   - Daily snapshots calculated for past dates
   - Batch insertion with progress tracking
   - Validation against expected patterns



## Components and Interfaces

### 1. Database Schema

#### Primary Table: `daily_metrics`

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
  
  -- Ensure one record per date/type/category combination
  CONSTRAINT unique_daily_metric UNIQUE (metric_date, metric_type, metric_category)
);
```

#### Metric Types and Categories

**Core Metrics (Phase 1)**
- `metric_type: 'count'`, `metric_category: 'users_total'` - Total user count
- `metric_type: 'count'`, `metric_category: 'posts_total'` - Total posts count
- `metric_type: 'count'`, `metric_category: 'comments_total'` - Total comments count
- `metric_type: 'count'`, `metric_category: 'posts_created'` - Posts created that day
- `metric_type: 'count'`, `metric_category: 'comments_created'` - Comments created that day

**Future Metrics (Extensible)**
- `metric_type: 'count'`, `metric_category: 'tracks_uploaded'` - Audio tracks uploaded
- `metric_type: 'count'`, `metric_category: 'likes_total'` - Total likes
- `metric_type: 'count'`, `metric_category: 'follows_total'` - Total follows
- `metric_type: 'average'`, `metric_category: 'engagement_rate'` - Avg engagement
- `metric_type: 'percentage'`, `metric_category: 'active_users'` - % active users
- `metric_type: 'aggregate'`, `metric_category: 'top_genres'` - JSON data with top genres

#### Indexes

```sql
-- Primary query pattern: date range + metric type
CREATE INDEX idx_daily_metrics_date_type 
ON daily_metrics(metric_date DESC, metric_type, metric_category);

-- Query by category
CREATE INDEX idx_daily_metrics_category 
ON daily_metrics(metric_category, metric_date DESC);

-- Query by collection timestamp (monitoring)
CREATE INDEX idx_daily_metrics_collection 
ON daily_metrics(collection_timestamp DESC);
```

#### Metadata Table: `metric_definitions`

```sql
CREATE TABLE metric_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  unit TEXT, -- 'count', 'percentage', 'seconds', etc.
  format_pattern TEXT, -- e.g., '0,0' for thousands separator
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_metric_definition UNIQUE (metric_type, metric_category)
);
```

#### Collection Log Table: `metric_collection_log`

```sql
CREATE TABLE metric_collection_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL, -- 'running', 'completed', 'failed'
  metrics_collected INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 2. Collection Service

#### PostgreSQL Function: `collect_daily_metrics()`

```sql
CREATE OR REPLACE FUNCTION collect_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  metrics_collected INTEGER,
  execution_time_ms INTEGER,
  status TEXT
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  log_id UUID;
  metrics_count INTEGER := 0;
BEGIN
  start_time := clock_timestamp();
  
  -- Create log entry
  INSERT INTO metric_collection_log (collection_date, started_at, status)
  VALUES (target_date, start_time, 'running')
  RETURNING id INTO log_id;
  
  -- Collect total users count
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'users_total',
    (SELECT COUNT(*) FROM profiles WHERE created_at::DATE <= target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value;
  metrics_count := metrics_count + 1;
  
  -- Collect total posts count
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'posts_total',
    (SELECT COUNT(*) FROM posts WHERE created_at::DATE <= target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value;
  metrics_count := metrics_count + 1;
  
  -- Collect total comments count
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'comments_total',
    (SELECT COUNT(*) FROM comments WHERE created_at::DATE <= target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value;
  metrics_count := metrics_count + 1;
  
  -- Collect posts created that day
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'posts_created',
    (SELECT COUNT(*) FROM posts WHERE created_at::DATE = target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value;
  metrics_count := metrics_count + 1;
  
  -- Collect comments created that day
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'comments_created',
    (SELECT COUNT(*) FROM comments WHERE created_at::DATE = target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value;
  metrics_count := metrics_count + 1;
  
  -- Update log entry
  UPDATE metric_collection_log
  SET completed_at = clock_timestamp(),
      status = 'completed',
      metrics_collected = metrics_count
  WHERE id = log_id;
  
  RETURN QUERY SELECT 
    metrics_count,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER,
    'completed'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  -- Log error
  UPDATE metric_collection_log
  SET completed_at = clock_timestamp(),
      status = 'failed',
      error_message = SQLERRM,
      error_details = jsonb_build_object(
        'sqlstate', SQLSTATE,
        'context', PG_EXCEPTION_CONTEXT
      )
  WHERE id = log_id;
  
  RAISE;
END;
$$ LANGUAGE plpgsql;
```



#### Scheduler Setup (pg_cron)

```sql
-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily collection at 00:00 UTC
SELECT cron.schedule(
  'collect-daily-metrics',
  '0 0 * * *',
  $$SELECT collect_daily_metrics()$$
);
```

**Alternative: Supabase Edge Function**

For Supabase hosted instances without pg_cron access, use Edge Functions with cron triggers:

```typescript
// supabase/functions/collect-metrics/index.ts
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

### 3. Query API

#### TypeScript Interface

```typescript
// types/analytics.ts
export interface DailyMetric {
  id: string;
  metric_date: string;
  metric_type: 'count' | 'average' | 'percentage' | 'aggregate';
  metric_category: string;
  value: number;
  metadata: Record<string, any>;
  collection_timestamp: string;
  created_at: string;
}

export interface MetricDefinition {
  id: string;
  metric_type: string;
  metric_category: string;
  display_name: string;
  description: string;
  unit: string;
  format_pattern: string;
  is_active: boolean;
}

export interface MetricsQueryParams {
  startDate: string;
  endDate: string;
  categories?: string[];
  types?: string[];
  aggregation?: 'daily' | 'weekly' | 'monthly';
}

export interface ActivityDataPoint {
  date: string;
  posts: number;
  comments: number;
}
```

#### API Functions

```typescript
// lib/analytics.ts
import { supabase } from '@/lib/supabase';
import type { DailyMetric, MetricsQueryParams, ActivityDataPoint } from '@/types/analytics';

/**
 * Fetch metrics for a date range
 */
export async function fetchMetrics(params: MetricsQueryParams): Promise<DailyMetric[]> {
  let query = supabase
    .from('daily_metrics')
    .select('*')
    .gte('metric_date', params.startDate)
    .lte('metric_date', params.endDate)
    .order('metric_date', { ascending: true });

  if (params.categories && params.categories.length > 0) {
    query = query.in('metric_category', params.categories);
  }

  if (params.types && params.types.length > 0) {
    query = query.in('metric_type', params.types);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Fetch current platform metrics (latest snapshot)
 */
export async function fetchCurrentMetrics() {
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('metric_category, value')
    .in('metric_category', ['users_total', 'posts_total', 'comments_total'])
    .order('metric_date', { ascending: false })
    .limit(3);

  if (error) throw error;

  // Transform to expected format
  const metrics = {
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
  };

  data?.forEach((metric) => {
    if (metric.metric_category === 'users_total') metrics.totalUsers = metric.value;
    if (metric.metric_category === 'posts_total') metrics.totalPosts = metric.value;
    if (metric.metric_category === 'comments_total') metrics.totalComments = metric.value;
  });

  return metrics;
}

/**
 * Fetch activity data for chart (last 30 days)
 */
export async function fetchActivityData(): Promise<ActivityDataPoint[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('metric_date, metric_category, value')
    .in('metric_category', ['posts_created', 'comments_created'])
    .gte('metric_date', startDate)
    .lte('metric_date', endDate)
    .order('metric_date', { ascending: true });

  if (error) throw error;

  // Group by date
  const activityMap = new Map<string, { posts: number; comments: number }>();

  data?.forEach((metric) => {
    const existing = activityMap.get(metric.metric_date) || { posts: 0, comments: 0 };
    
    if (metric.metric_category === 'posts_created') {
      existing.posts = metric.value;
    } else if (metric.metric_category === 'comments_created') {
      existing.comments = metric.value;
    }
    
    activityMap.set(metric.metric_date, existing);
  });

  // Convert to array
  return Array.from(activityMap.entries()).map(([date, counts]) => ({
    date,
    posts: counts.posts,
    comments: counts.comments,
  }));
}

/**
 * Trigger manual metric collection (admin only)
 */
export async function triggerMetricCollection(targetDate?: string) {
  const { data, error } = await supabase.rpc('collect_daily_metrics', {
    target_date: targetDate || new Date().toISOString().split('T')[0],
  });

  if (error) throw error;
  return data;
}
```



### 4. Migration and Backfill Service

#### Backfill Function

```sql
CREATE OR REPLACE FUNCTION backfill_daily_metrics(
  start_date DATE,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  dates_processed INTEGER,
  total_metrics INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  current_date DATE;
  dates_count INTEGER := 0;
  metrics_total INTEGER := 0;
  start_time TIMESTAMPTZ;
  result RECORD;
BEGIN
  start_time := clock_timestamp();
  current_date := start_date;
  
  WHILE current_date <= end_date LOOP
    -- Call collect_daily_metrics for each date
    SELECT * INTO result FROM collect_daily_metrics(current_date);
    
    dates_count := dates_count + 1;
    metrics_total := metrics_total + result.metrics_collected;
    
    -- Progress logging
    RAISE NOTICE 'Processed date: %, Metrics: %', current_date, result.metrics_collected;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN QUERY SELECT 
    dates_count,
    metrics_total,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

#### Backfill Script

```typescript
// scripts/backfill-analytics.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backfillMetrics() {
  console.log('Starting analytics backfill...');
  
  // Get the earliest post/comment date
  const { data: earliestPost } = await supabase
    .from('posts')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);
  
  const startDate = earliestPost?.[0]?.created_at?.split('T')[0] || '2024-01-01';
  const endDate = new Date().toISOString().split('T')[0];
  
  console.log(`Backfilling from ${startDate} to ${endDate}`);
  
  const { data, error } = await supabase.rpc('backfill_daily_metrics', {
    start_date: startDate,
    end_date: endDate,
  });
  
  if (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
  
  console.log('Backfill completed:', data);
}

backfillMetrics();
```

## Data Models

### Metric Value Types

```typescript
// Scalar metrics
type CountMetric = {
  metric_type: 'count';
  value: number;
  metadata: {};
};

type AverageMetric = {
  metric_type: 'average';
  value: number;
  metadata: {
    sample_size: number;
    std_deviation?: number;
  };
};

type PercentageMetric = {
  metric_type: 'percentage';
  value: number; // 0-100
  metadata: {
    numerator: number;
    denominator: number;
  };
};

// Complex metrics
type AggregateMetric = {
  metric_type: 'aggregate';
  value: number; // Summary value
  metadata: {
    breakdown: Record<string, number>;
    top_items?: Array<{ key: string; value: number }>;
  };
};
```

### Example Metric Records

```json
// Total users count
{
  "metric_date": "2025-01-10",
  "metric_type": "count",
  "metric_category": "users_total",
  "value": 1234,
  "metadata": {},
  "collection_timestamp": "2025-01-11T00:00:15Z"
}

// Posts created that day
{
  "metric_date": "2025-01-10",
  "metric_type": "count",
  "metric_category": "posts_created",
  "value": 45,
  "metadata": {},
  "collection_timestamp": "2025-01-11T00:00:15Z"
}

// Future: Engagement rate
{
  "metric_date": "2025-01-10",
  "metric_type": "percentage",
  "metric_category": "engagement_rate",
  "value": 23.5,
  "metadata": {
    "numerator": 235,
    "denominator": 1000,
    "calculation": "users_with_activity / total_users"
  },
  "collection_timestamp": "2025-01-11T00:00:15Z"
}

// Future: Top genres
{
  "metric_date": "2025-01-10",
  "metric_type": "aggregate",
  "metric_category": "top_genres",
  "value": 5,
  "metadata": {
    "breakdown": {
      "electronic": 120,
      "hip-hop": 95,
      "ambient": 78,
      "rock": 45,
      "jazz": 32
    },
    "top_items": [
      { "key": "electronic", "value": 120 },
      { "key": "hip-hop", "value": 95 },
      { "key": "ambient", "value": 78 }
    ]
  },
  "collection_timestamp": "2025-01-11T00:00:15Z"
}
```

## Error Handling

### Collection Errors

1. **Database Connection Failures**
   - Retry with exponential backoff (3 attempts)
   - Log error details to `metric_collection_log`
   - Alert administrators via monitoring system

2. **Data Inconsistencies**
   - Validate counts against expected ranges
   - Flag anomalies in metadata
   - Continue collection for other metrics

3. **Timeout Issues**
   - Set query timeout to 30 seconds
   - Break large aggregations into smaller chunks
   - Log partial completion status

### Query Errors

1. **Missing Data**
   - Return empty array for date ranges with no data
   - Indicate gaps in metadata
   - Suggest backfill if needed

2. **Invalid Parameters**
   - Validate date formats
   - Check date range limits (max 365 days)
   - Return clear error messages

3. **Performance Issues**
   - Implement query result caching (5 minutes)
   - Limit result set size
   - Provide pagination for large datasets



## Testing Strategy

### Unit Tests

1. **Collection Function Tests**
   ```typescript
   describe('collect_daily_metrics', () => {
     it('should collect all core metrics for a given date', async () => {
       const result = await supabase.rpc('collect_daily_metrics', {
         target_date: '2025-01-10'
       });
       expect(result.data.metrics_collected).toBe(5);
     });

     it('should handle missing source data gracefully', async () => {
       // Test with date before any data exists
       const result = await supabase.rpc('collect_daily_metrics', {
         target_date: '2020-01-01'
       });
       expect(result.data.status).toBe('completed');
     });

     it('should not duplicate metrics on re-run', async () => {
       await supabase.rpc('collect_daily_metrics', { target_date: '2025-01-10' });
       await supabase.rpc('collect_daily_metrics', { target_date: '2025-01-10' });
       
       const { count } = await supabase
         .from('daily_metrics')
         .select('*', { count: 'exact', head: true })
         .eq('metric_date', '2025-01-10');
       
       expect(count).toBe(5); // Should still be 5, not 10
     });
   });
   ```

2. **Query API Tests**
   ```typescript
   describe('fetchMetrics', () => {
     it('should fetch metrics for date range', async () => {
       const metrics = await fetchMetrics({
         startDate: '2025-01-01',
         endDate: '2025-01-31'
       });
       expect(metrics.length).toBeGreaterThan(0);
     });

     it('should filter by categories', async () => {
       const metrics = await fetchMetrics({
         startDate: '2025-01-01',
         endDate: '2025-01-31',
         categories: ['posts_total', 'comments_total']
       });
       metrics.forEach(m => {
         expect(['posts_total', 'comments_total']).toContain(m.metric_category);
       });
     });
   });
   ```

### Integration Tests

1. **End-to-End Collection Flow**
   - Create test posts and comments
   - Run collection for test date
   - Verify metrics match expected counts
   - Delete test data
   - Verify metrics remain unchanged

2. **Dashboard Integration**
   - Load analytics page
   - Verify metrics display correctly
   - Check activity chart renders
   - Validate data matches database

3. **Backfill Process**
   - Run backfill for date range
   - Verify all dates have metrics
   - Check for data consistency
   - Validate performance

### Performance Tests

1. **Query Performance**
   ```sql
   -- Should complete in < 100ms
   EXPLAIN ANALYZE
   SELECT metric_date, metric_category, value
   FROM daily_metrics
   WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
     AND metric_category IN ('posts_created', 'comments_created')
   ORDER BY metric_date ASC;
   ```

2. **Collection Performance**
   - Measure collection time for single day
   - Test with varying data volumes
   - Verify stays under 30 seconds

3. **Backfill Performance**
   - Test backfill for 365 days
   - Monitor memory usage
   - Verify batch processing works

### Data Validation Tests

1. **Accuracy Checks**
   ```typescript
   // Verify metrics match source data
   const { count: actualPosts } = await supabase
     .from('posts')
     .select('*', { count: 'exact', head: true })
     .lte('created_at', '2025-01-10T23:59:59Z');

   const { data: metric } = await supabase
     .from('daily_metrics')
     .select('value')
     .eq('metric_date', '2025-01-10')
     .eq('metric_category', 'posts_total')
     .single();

   expect(metric.value).toBe(actualPosts);
   ```

2. **Immutability Checks**
   - Record metric value
   - Delete source data
   - Verify metric unchanged
   - Re-run collection
   - Verify metric still unchanged

## Security Considerations

### Row Level Security (RLS)

```sql
-- Enable RLS on all analytics tables
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_collection_log ENABLE ROW LEVEL SECURITY;

-- Public read access for metrics (all users can view analytics)
CREATE POLICY "Anyone can view metrics" ON daily_metrics
FOR SELECT USING (true);

-- Only service role can insert/update metrics
CREATE POLICY "Service role can manage metrics" ON daily_metrics
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Public read access for metric definitions
CREATE POLICY "Anyone can view metric definitions" ON metric_definitions
FOR SELECT USING (true);

-- Admin-only access to collection logs
CREATE POLICY "Admins can view collection logs" ON metric_collection_log
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_admin = true
  )
);
```

### API Security

1. **Rate Limiting**
   - Limit analytics queries to 100 per minute per user
   - Implement exponential backoff for repeated failures

2. **Input Validation**
   - Validate date formats (YYYY-MM-DD)
   - Limit date range to max 365 days
   - Sanitize category/type filters

3. **Authentication**
   - Require authentication for analytics dashboard
   - Use service role key for collection functions
   - Implement admin-only endpoints for manual triggers

## Performance Optimization

### Database Optimizations

1. **Indexing Strategy**
   - Composite index on (metric_date, metric_type, metric_category)
   - Partial indexes for frequently queried categories
   - Index on collection_timestamp for monitoring

2. **Query Optimization**
   - Use covering indexes to avoid table lookups
   - Implement query result caching
   - Use materialized views for complex aggregations

3. **Partitioning** (Future consideration for large datasets)
   ```sql
   -- Partition by year for better performance
   CREATE TABLE daily_metrics_2025 PARTITION OF daily_metrics
   FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
   ```

### Application Optimizations

1. **Caching**
   - Cache current metrics for 5 minutes
   - Cache activity data for 10 minutes
   - Implement browser-side caching

2. **Lazy Loading**
   - Load metrics on demand
   - Implement pagination for large datasets
   - Use skeleton loaders during fetch

3. **Batch Operations**
   - Batch metric queries when possible
   - Use single query for multiple categories
   - Minimize round trips to database

## Monitoring and Observability

### Key Metrics to Monitor

1. **Collection Health**
   - Collection success rate (target: 99.9%)
   - Collection duration (target: < 30s)
   - Metrics collected per run (expected: 5+)

2. **Query Performance**
   - Average query time (target: < 100ms)
   - 95th percentile query time (target: < 200ms)
   - Query error rate (target: < 0.1%)

3. **Data Quality**
   - Missing data gaps
   - Anomalous values (sudden spikes/drops)
   - Collection failures

### Monitoring Dashboard

```typescript
// Admin monitoring component
interface CollectionStatus {
  last_run: string;
  status: 'completed' | 'failed' | 'running';
  metrics_collected: number;
  duration_ms: number;
  error_message?: string;
}

async function getCollectionStatus(): Promise<CollectionStatus> {
  const { data } = await supabase
    .from('metric_collection_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return {
    last_run: data.started_at,
    status: data.status,
    metrics_collected: data.metrics_collected,
    duration_ms: data.completed_at 
      ? new Date(data.completed_at).getTime() - new Date(data.started_at).getTime()
      : 0,
    error_message: data.error_message,
  };
}
```

### Alerting Rules

1. **Critical Alerts**
   - Collection failed 3 times in a row
   - No data collected in 48 hours
   - Query error rate > 5%

2. **Warning Alerts**
   - Collection duration > 60 seconds
   - Missing data for any date
   - Anomalous metric values (> 3 std deviations)

## Migration Plan

### Phase 1: Setup (Week 1)
1. Create database tables and indexes
2. Implement collection function
3. Set up RLS policies
4. Deploy backfill script

### Phase 2: Backfill (Week 1)
1. Run backfill for historical data
2. Validate data accuracy
3. Fix any discrepancies
4. Document baseline metrics

### Phase 3: Integration (Week 2)
1. Update analytics dashboard to use new tables
2. Implement query API functions
3. Add error handling
4. Deploy to production

### Phase 4: Automation (Week 2)
1. Set up scheduled collection (pg_cron or Edge Function)
2. Implement monitoring
3. Configure alerts
4. Document operational procedures

### Phase 5: Validation (Week 3)
1. Monitor for 7 days
2. Verify data accuracy
3. Check performance metrics
4. Gather user feedback

## Future Enhancements

### Short-term (Next 3 months)
1. Add user engagement metrics (likes, follows, plays)
2. Implement weekly/monthly aggregations
3. Add export functionality (CSV, JSON)
4. Create admin dashboard for metric management

### Medium-term (3-6 months)
1. Add real-time metrics (current active users)
2. Implement custom metric definitions
3. Add data visualization options
4. Create API for third-party integrations

### Long-term (6-12 months)
1. Machine learning for anomaly detection
2. Predictive analytics
3. Custom reporting builder
4. Multi-tenant analytics support

## Rollback Plan

If issues arise during deployment:

1. **Immediate Rollback**
   - Revert analytics dashboard to query live tables
   - Disable scheduled collection
   - Document issues encountered

2. **Data Preservation**
   - Keep daily_metrics table intact
   - Export collected data for analysis
   - Maintain collection logs

3. **Investigation**
   - Analyze error logs
   - Identify root cause
   - Develop fix

4. **Retry**
   - Apply fixes
   - Test in staging environment
   - Redeploy with monitoring
