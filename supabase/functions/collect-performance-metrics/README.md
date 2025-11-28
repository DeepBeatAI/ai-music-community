# Performance Metrics Collection Edge Function

## Overview

This Edge Function collects real-time system performance metrics every minute and stores them in the `system_metrics` table.

## Metrics Collected

1. **Database Query Time**: Average query execution time from pg_stat_statements
2. **Storage Usage**: Total storage used in audio-files bucket
3. **Active Users**: Count of users active in last 5 minutes
4. **Cache Hit Rate**: Application cache effectiveness (placeholder)
5. **Error Rate**: Ratio of errors to total requests in last 5 minutes

## Setup

### 1. Deploy the Function

```bash
# From project root
supabase functions deploy collect-performance-metrics
```

### 2. Set Environment Variables

The function uses these environment variables (automatically available):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access

### 3. Create Required Database Function

```sql
-- Function to get query performance stats
CREATE OR REPLACE FUNCTION get_query_performance_stats()
RETURNS TABLE(avg_exec_time numeric, total_calls bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to get stats from pg_stat_statements if available
  BEGIN
    RETURN QUERY
    SELECT 
      AVG(mean_exec_time)::numeric as avg_exec_time,
      SUM(calls)::bigint as total_calls
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%';
  EXCEPTION WHEN OTHERS THEN
    -- If pg_stat_statements not available, return defaults
    RETURN QUERY SELECT 0::numeric, 0::bigint;
  END;
END;
$$;
```

### 4. Schedule the Function

#### Option A: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard > Edge Functions
2. Click on `collect-performance-metrics`
3. Go to "Cron" or "Schedule" tab
4. Add schedule: `*/1 * * * *` (every minute)
5. Enable the schedule

#### Option B: Using pg_cron

```sql
SELECT cron.schedule(
  'collect-performance-metrics',
  '*/1 * * * *',  -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/collect-performance-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Testing

### Manual Test

```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/collect-performance-metrics' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

Expected response:
```json
{
  "success": true,
  "metrics_collected": 5,
  "metrics": [
    { "type": "database_query_time", "value": 25.5 },
    { "type": "storage_usage", "value": 0.125 },
    { "type": "active_users", "value": 3 },
    { "type": "cache_hit_rate", "value": 0.85 },
    { "type": "error_rate", "value": 0.002 }
  ],
  "timestamp": "2024-11-27T13:45:00.000Z"
}
```

### Verify Metrics in Database

```sql
-- Check recent metrics
SELECT 
  metric_type,
  metric_value,
  metric_unit,
  recorded_at
FROM system_metrics
ORDER BY recorded_at DESC
LIMIT 20;

-- Check metrics by type
SELECT 
  metric_type,
  COUNT(*) as count,
  AVG(metric_value) as avg_value,
  MIN(recorded_at) as first_recorded,
  MAX(recorded_at) as last_recorded
FROM system_metrics
GROUP BY metric_type;
```

## Monitoring

### Check Function Logs

1. Go to Supabase Dashboard > Edge Functions
2. Click on `collect-performance-metrics`
3. View "Logs" tab
4. Look for successful executions every minute

### Alert on Failures

```sql
-- Check if metrics were collected in last 5 minutes
SELECT 
  CASE 
    WHEN MAX(recorded_at) > NOW() - INTERVAL '5 minutes' THEN 'OK'
    ELSE 'ALERT: No metrics in last 5 minutes'
  END as status,
  MAX(recorded_at) as last_metric
FROM system_metrics;
```

## Troubleshooting

### Function not running
- Check cron schedule is enabled
- Verify function is deployed
- Check Supabase project status

### No metrics appearing
- Check function logs for errors
- Verify `record_system_metric` function exists
- Check service role key permissions

### Metrics seem inaccurate
- Verify source data exists (user_stats, security_events, etc.)
- Check RLS policies allow service role access
- Review function logic for calculation errors

## Customization

### Adjust Collection Frequency

- **Every 5 minutes**: `*/5 * * * *`
- **Every 30 seconds**: `*/30 * * * * *` (if supported)
- **Every hour**: `0 * * * *`

### Add Custom Metrics

Add new metric collection in the function:

```typescript
// Example: Collect API response time
const { data: apiMetrics } = await supabase
  .from('api_logs')
  .select('response_time')
  .gte('created_at', fiveMinutesAgo);

const avgResponseTime = apiMetrics.reduce((sum, m) => sum + m.response_time, 0) / apiMetrics.length;

await supabase.rpc('record_system_metric', {
  p_metric_type: 'api_response_time',
  p_metric_value: avgResponseTime,
  p_metric_unit: 'ms',
  p_metadata: { source: 'api_logs' }
});
```

## Cost Considerations

- **Function invocations**: 1,440 per day (every minute)
- **Database writes**: ~5-7 per invocation = ~7,200-10,080 per day
- **Free tier**: 500,000 invocations/month (sufficient)

## Next Steps

1. Deploy the function
2. Set up cron schedule
3. Monitor for 24 hours
4. Verify metrics appear in admin dashboard
5. Adjust collection frequency if needed
