# Performance & System Health Metrics Guide

## Overview

The Performance & System Health tab provides real-time monitoring of your platform's health and performance. This guide explains what each metric means, what good values look like, and how to test if they're being measured accurately.

## Current Metrics Analysis

Based on your current readings:
- **Avg Query Time: 0ms** ✅ Excellent
- **Slow Queries: 0** ✅ Excellent
- **Used: 0.00 GB / 1000.00 GB** ✅ Excellent (just starting)
- **Usage: 0.0%** ✅ Excellent
- **Error Rate: 0.00%** ✅ Excellent
- **Threshold: 30.00%** ⚠️ High threshold (should be lower)

**Overall Assessment**: Your metrics look excellent! This is expected for a new platform with minimal data and traffic.

---

## Database Metrics

### 1. Average Query Time

**What it means**: The average time it takes for database queries to execute.

**Current**: 0ms

**What good looks like**:
- **Excellent**: < 50ms
- **Good**: 50-100ms
- **Acceptable**: 100-200ms
- **Poor**: 200-500ms
- **Critical**: > 500ms

**Why 0ms**:
- Very few queries have been executed
- Queries are extremely simple (no complex joins)
- Database is not under load
- Supabase's PostgreSQL is highly optimized

**How to test**:
1. Navigate through the admin dashboard (loads data)
2. Create some test users, tracks, comments
3. Run complex queries (search, filter, sort)
4. Check if the metric updates
5. Expected: Should show 10-50ms for typical queries

**What affects it**:
- Database indexes (missing indexes = slow queries)
- Query complexity (joins, subqueries)
- Data volume (more rows = slower queries)
- Database load (concurrent users)

### 2. Slow Queries

**What it means**: Number of queries that took longer than a threshold (typically > 1000ms).

**Current**: 0

**What good looks like**:
- **Excellent**: 0 slow queries
- **Good**: < 5 slow queries per hour
- **Acceptable**: 5-20 slow queries per hour
- **Poor**: > 20 slow queries per hour

**Why 0**:
- No complex queries have been run yet
- Database is properly indexed
- Low data volume

**How to test**:
1. Run a complex query without proper indexes
2. Example: Search all tracks without text search index
3. Load a page with many nested queries
4. Check if slow queries are detected

**What causes slow queries**:
- Missing database indexes
- N+1 query problems (loading related data in loops)
- Full table scans on large tables
- Complex joins without optimization
- Unoptimized RLS policies

---

## Storage Metrics

### 3. Storage Usage

**What it means**: How much disk space your data is using.

**Current**: 0.00 GB / 1000.00 GB (0.0%)

**What good looks like**:
- **Excellent**: < 10% of capacity
- **Good**: 10-50% of capacity
- **Acceptable**: 50-75% of capacity
- **Warning**: 75-90% of capacity
- **Critical**: > 90% of capacity

**Why 0.00 GB**:
- Platform is new with minimal data
- No audio files uploaded yet
- Database tables are empty or have few rows

**How to test**:
1. Upload audio files (tracks)
2. Create users, posts, comments
3. Wait for metric to update (may take time)
4. Check Supabase dashboard for actual storage usage

**What uses storage**:
- Audio files (largest - 5-50MB per track)
- User profile images
- Album/playlist cover images
- Database data (relatively small)
- Backups and logs

**Expected growth**:
- 100 tracks × 10MB average = 1GB
- 1,000 tracks = 10GB
- 10,000 tracks = 100GB

---

## Error Rate Metrics

### 4. Error Rate

**What it means**: Percentage of requests that result in errors (4xx, 5xx HTTP status codes).

**Current**: 0.00%

**What good looks like**:
- **Excellent**: < 0.1% (1 error per 1000 requests)
- **Good**: 0.1-1% 
- **Acceptable**: 1-5%
- **Poor**: 5-10%
- **Critical**: > 10%

**Why 0.00%**:
- Very few requests have been made
- No bugs encountered yet
- Proper error handling in place

**How to test**:
1. **Test 404 errors**: Navigate to non-existent page
2. **Test 401 errors**: Try to access admin without permission
3. **Test 500 errors**: Trigger a database error (invalid query)
4. **Test validation errors**: Submit invalid form data
5. Check if error rate increases

**What causes errors**:
- **4xx errors** (client errors):
  - 401: Unauthorized (not logged in)
  - 403: Forbidden (no permission)
  - 404: Not found (invalid URL)
  - 422: Validation error (invalid data)
- **5xx errors** (server errors):
  - 500: Internal server error (bug in code)
  - 502: Bad gateway (Supabase down)
  - 503: Service unavailable (overloaded)

### 5. Error Rate Threshold

**What it means**: The maximum acceptable error rate before alerting.

**Current**: 30.00%

**What good looks like**:
- **Recommended**: 5% (alert if > 5% errors)
- **Strict**: 1% (alert if > 1% errors)
- **Lenient**: 10% (alert if > 10% errors)

**Why 30% is too high**:
- 30% means 3 out of 10 requests can fail before alerting
- This is way too permissive
- Should be lowered to 5% or less

**How to configure**:
1. Go to Platform Admin tab
2. Find "error_rate_threshold" config
3. Change from 0.30 to 0.05 (5%)
4. Save configuration

### 6. Error Rate Status

**What it means**: Current health status based on error rate vs threshold.

**Possible values**:
- **normal**: Error rate < threshold ✅
- **elevated**: Error rate approaching threshold ⚠️
- **critical**: Error rate > threshold ❌

**Current**: normal (0.00% < 30.00%)

---

## Cache Metrics

### 7. Cache Management

**What it means**: Application caches that store frequently accessed data to improve performance.

**What caches exist**:
- **User type cache**: Stores user roles and plan tiers
- **Audio URL cache**: Stores processed audio URLs
- **Session cache**: Stores active session data
- **Query cache**: Stores database query results

**When to clear cache**:
- After updating user roles/permissions
- After changing platform configuration
- When debugging issues
- When data seems stale

**How to test**:
1. Load a page (data is cached)
2. Update data in database directly
3. Reload page (should show old data from cache)
4. Click "Clear All Caches"
5. Reload page (should show new data)

**Warning**: Clearing cache will temporarily slow down the site as caches rebuild.

---

## API Health Metrics

### 8. Supabase Status

**What it means**: Health of your Supabase backend (database, auth, storage).

**Possible values**:
- **healthy**: All services operational ✅
- **degraded**: Some services slow or partially down ⚠️
- **down**: Services unavailable ❌

**How to test**:
1. Check Supabase dashboard status page
2. Try to make a database query
3. Try to authenticate
4. Try to upload a file
5. If any fail, status should show degraded/down

### 9. Vercel Status

**What it means**: Health of your Vercel frontend hosting.

**Possible values**:
- **healthy**: Site is accessible ✅
- **degraded**: Site is slow ⚠️
- **down**: Site is inaccessible ❌

**How to test**:
1. Check Vercel dashboard status page
2. Try to load your site
3. Check response times
4. If slow or down, status should reflect it

---

## Uptime Metrics

### 10. Uptime Percentage

**What it means**: Percentage of time the platform has been available.

**What good looks like**:
- **Excellent**: 99.9% (43 minutes downtime per month)
- **Good**: 99.5% (3.6 hours downtime per month)
- **Acceptable**: 99.0% (7.2 hours downtime per month)
- **Poor**: < 99.0%

**Industry standards**:
- **99.9%** ("three nines"): Standard for production apps
- **99.99%** ("four nines"): High availability apps
- **99.999%** ("five nines"): Mission-critical apps

### 11. Last Downtime

**What it means**: When the platform was last unavailable.

**What good looks like**:
- **Excellent**: No downtime in last 30 days
- **Good**: Brief downtime (< 5 minutes) for maintenance
- **Acceptable**: Occasional downtime (< 1 hour per month)
- **Poor**: Frequent or long downtimes

---

## How to Test Metrics Accuracy

### Test 1: Database Query Time

```sql
-- Run a slow query intentionally
SELECT * FROM audio_tracks 
WHERE title ILIKE '%test%' 
ORDER BY created_at DESC 
LIMIT 1000;
```

**Expected**: Avg Query Time should increase to 50-200ms

### Test 2: Error Rate

```typescript
// Trigger an error
try {
  await supabase.from('nonexistent_table').select('*');
} catch (error) {
  console.error('Expected error:', error);
}
```

**Expected**: Error Rate should increase slightly

### Test 3: Storage Usage

1. Upload 10 audio files (50MB each)
2. Wait 5-10 minutes for metrics to update
3. Check storage usage

**Expected**: Should show ~500MB used

### Test 4: Cache Clearing

1. Load admin dashboard (caches user types)
2. Update user role in database directly
3. Reload dashboard (should show old role - cached)
4. Clear cache
5. Reload dashboard (should show new role)

**Expected**: Cache clearing should force fresh data load

---

## Monitoring Best Practices

### 1. Set Up Alerts

Configure alerts for:
- Error rate > 5%
- Avg query time > 200ms
- Storage usage > 75%
- Slow queries > 10 per hour

### 2. Regular Monitoring

Check metrics:
- **Daily**: Error rate, uptime
- **Weekly**: Query performance, storage usage
- **Monthly**: Trends and patterns

### 3. Performance Optimization

When metrics degrade:
1. **Slow queries**: Add database indexes
2. **High error rate**: Fix bugs, improve error handling
3. **Storage full**: Implement compression, cleanup old data
4. **API degraded**: Check Supabase/Vercel status, scale if needed

### 4. Baseline Metrics

Establish baselines:
- **Normal query time**: 20-50ms
- **Normal error rate**: < 0.5%
- **Normal storage growth**: Track monthly increase
- **Normal uptime**: > 99.9%

---

## Troubleshooting

### Metrics Not Updating

**Problem**: Metrics show 0 or don't change

**Root Cause**: No metrics are being recorded in the `system_metrics` table.

**Why This Happens**:
- Metrics collection is not automatic - it requires active recording
- No background job is collecting metrics
- Application code isn't recording metrics on requests

**Solutions**:

**1. Check if metrics exist**:
```sql
SELECT COUNT(*) FROM system_metrics;
```
If count is 0, no metrics are being recorded.

**2. Insert test metrics** (to verify system works):
```sql
-- Test database query time
SELECT record_system_metric('database_query_time', 25.5, 'ms', '{"query": "test"}'::jsonb);

-- Test API response time
SELECT record_system_metric('api_response_time', 150.0, 'ms', '{"endpoint": "/api/test"}'::jsonb);

-- Check if metrics appear
SELECT * FROM system_metrics ORDER BY recorded_at DESC LIMIT 5;
```

**3. Set up automatic metric collection** (see below)

### Inaccurate Metrics

**Problem**: Metrics don't match reality

**Solutions**:
1. Check metric collection functions
2. Verify database queries are correct
3. Check if caching is affecting readings
4. Compare with Supabase/Vercel dashboards

### High Error Rate

**Problem**: Error rate suddenly increases

**Solutions**:
1. Check error logs in Supabase
2. Check browser console for client errors
3. Check server logs in Vercel
4. Identify and fix the source of errors

---

## Setting Up Automatic Metric Collection

### Current Status

**Metrics are NOT automatically collected.** The system has the infrastructure (database table, functions, UI) but no active collection.

### Why Metrics Show 0

The Performance & System Health tab reads from the `system_metrics` table. If this table is empty, all metrics show as 0. This is expected behavior - metrics must be actively recorded.

### Solution Options

#### Option 1: Supabase Edge Function (Recommended)

Create a scheduled Edge Function that runs every minute to collect metrics:

```typescript
// supabase/functions/collect-metrics/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Collect database metrics
  const { data: dbStats } = await supabase.rpc('pg_stat_statements_info')
  
  // Record metrics
  await supabase.rpc('record_system_metric', {
    p_metric_type: 'database_query_time',
    p_metric_value: dbStats?.avg_time || 0,
    p_metric_unit: 'ms'
  })

  return new Response('Metrics collected', { status: 200 })
})
```

**Schedule it** in Supabase Dashboard:
- Go to Edge Functions
- Create cron trigger: `*/1 * * * *` (every minute)

#### Option 2: Application-Level Recording

Add metric recording to your application code:

```typescript
// In API routes or middleware
import { recordSystemMetric } from '@/lib/systemHealthService'

// Record API response time
const startTime = Date.now()
// ... handle request ...
const duration = Date.now() - startTime

await recordSystemMetric('api_response_time', duration, 'ms', {
  endpoint: req.url
})
```

#### Option 3: Database Triggers (Limited)

Some metrics can be collected via database triggers:

```sql
-- Track slow queries automatically
CREATE OR REPLACE FUNCTION log_slow_query()
RETURNS event_trigger AS $$
BEGIN
  -- Log queries > 1000ms
  IF current_query_duration > 1000 THEN
    PERFORM record_system_metric(
      'database_query_time',
      current_query_duration,
      'ms',
      jsonb_build_object('query', current_query())
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### Option 4: Manual Testing (Current)

For now, you can manually insert test metrics to verify the system works:

```sql
-- Insert realistic test data
SELECT record_system_metric('database_query_time', 25.5, 'ms', '{"query": "SELECT users"}'::jsonb);
SELECT record_system_metric('api_response_time', 150.0, 'ms', '{"endpoint": "/api/tracks"}'::jsonb);
SELECT record_system_metric('page_load_time', 1200.0, 'ms', '{"page": "/discover"}'::jsonb);
SELECT record_system_metric('cache_hit_rate', 0.85, 'ratio', '{"cache": "audio_url"}'::jsonb);
SELECT record_system_metric('error_rate', 0.002, 'ratio', '{"type": "4xx"}'::jsonb);
```

### Recommended Approach

**For MVP**: Use Option 4 (Manual Testing) to verify the system works

**For Production**: Implement Option 1 (Edge Function) for automatic collection

### Verifying Metric Collection

After setting up collection:

1. **Check database**:
```sql
SELECT COUNT(*), metric_type 
FROM system_metrics 
GROUP BY metric_type;
```

2. **Check admin dashboard**:
- Go to Performance & System Health tab
- Metrics should show non-zero values
- Auto-refreshes every 30 seconds

3. **Check recent metrics**:
```sql
SELECT * FROM system_metrics 
ORDER BY recorded_at DESC 
LIMIT 10;
```

---

## Summary

**Your Current Status**: ✅ Excellent

All metrics are healthy, which is expected for a new platform. As you add users and data:

1. **Monitor growth**: Track how metrics change over time
2. **Set baselines**: Establish what's "normal" for your platform
3. **Configure alerts**: Set up notifications for issues
4. **Optimize proactively**: Address issues before they become critical

**Next Steps**:
1. Lower error rate threshold from 30% to 5%
2. Add some test data to see metrics in action
3. Set up monitoring alerts
4. Establish baseline metrics for your platform

---

**Last Updated**: November 27, 2024
**Status**: Active monitoring guide
