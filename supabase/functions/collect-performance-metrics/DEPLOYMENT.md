# Deployment Guide for Performance Metrics Collection

## Quick Start

### 1. Deploy the Edge Function

```bash
# From your project root
cd supabase/functions
supabase functions deploy collect-performance-metrics
```

### 2. Test the Function

```bash
# Replace YOUR_PROJECT_REF with your actual project reference
# Replace YOUR_ANON_KEY with your anon key from Supabase Dashboard

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

### 3. Schedule Automatic Collection

#### Option A: Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions**
4. Click on **collect-performance-metrics**
5. Go to **Cron** or **Schedule** tab
6. Click **Add Schedule**
7. Enter cron expression: `*/1 * * * *` (every minute)
8. Enable the schedule
9. Save

#### Option B: Using Supabase CLI

```bash
# Create a cron job (if supported by your plan)
supabase functions schedule create collect-performance-metrics \
  --cron "*/1 * * * *"
```

### 4. Verify It's Working

Wait 2-3 minutes, then check:

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
```

You should see new metrics being added every minute.

### 5. View in Admin Dashboard

1. Go to your admin dashboard
2. Click on **Performance & System Health** tab
3. Metrics should now show real values and update automatically

## Troubleshooting

### Function deploys but doesn't run

**Check deployment status:**
```bash
supabase functions list
```

**View function logs:**
1. Go to Supabase Dashboard > Edge Functions
2. Click on collect-performance-metrics
3. View Logs tab

### Metrics not appearing

**Check if function is being called:**
```sql
-- Check if any metrics were recorded in last 5 minutes
SELECT COUNT(*), MAX(recorded_at)
FROM system_metrics
WHERE recorded_at > NOW() - INTERVAL '5 minutes';
```

**If count is 0:**
1. Check cron schedule is enabled
2. Manually trigger the function (see test command above)
3. Check function logs for errors

### Permission errors

**Grant necessary permissions:**
```sql
-- Ensure service role can execute functions
GRANT EXECUTE ON FUNCTION record_system_metric TO service_role;
GRANT EXECUTE ON FUNCTION get_query_performance_stats TO service_role;

-- Ensure service role can read necessary tables
GRANT SELECT ON user_stats TO service_role;
GRANT SELECT ON security_events TO service_role;
GRANT SELECT ON user_sessions TO service_role;
```

## Monitoring

### Check Collection Health

```sql
-- Check metrics collection frequency
SELECT 
  metric_type,
  COUNT(*) as count,
  MIN(recorded_at) as first,
  MAX(recorded_at) as last,
  EXTRACT(EPOCH FROM (MAX(recorded_at) - MIN(recorded_at))) / COUNT(*) as avg_interval_seconds
FROM system_metrics
WHERE recorded_at > NOW() - INTERVAL '1 hour'
GROUP BY metric_type;
```

Expected `avg_interval_seconds`: ~60 (one minute)

### Alert on Missing Metrics

```sql
-- Alert if no metrics in last 5 minutes
SELECT 
  CASE 
    WHEN MAX(recorded_at) > NOW() - INTERVAL '5 minutes' THEN 'OK'
    ELSE 'ALERT: No metrics collected in last 5 minutes'
  END as status,
  MAX(recorded_at) as last_metric_time
FROM system_metrics;
```

## Cost Estimation

- **Function invocations**: 1,440 per day (every minute)
- **Database writes**: ~5-7 per invocation = ~7,200-10,080 per day
- **Monthly invocations**: ~43,200
- **Monthly database writes**: ~216,000-302,400

**Supabase Free Tier Limits:**
- Edge Function invocations: 500,000/month ✅ (well within limit)
- Database writes: Unlimited on free tier ✅

## Customization

### Change Collection Frequency

**Every 5 minutes** (recommended for production):
```
*/5 * * * *
```

**Every 30 seconds** (if your plan supports it):
```
*/30 * * * * *
```

**Every hour** (for low-traffic sites):
```
0 * * * *
```

### Disable Specific Metrics

Edit `index.ts` and comment out the metrics you don't need:

```typescript
// 4. Collect Cache Hit Rate (DISABLED)
// try {
//   ...
// } catch (error) {
//   console.error('Error recording cache hit rate:', error);
// }
```

## Next Steps

1. ✅ Deploy function
2. ✅ Test manually
3. ✅ Set up cron schedule
4. ⏳ Monitor for 24 hours
5. ⏳ Verify metrics in admin dashboard
6. ⏳ Adjust frequency if needed
7. ⏳ Set up alerts for failures

## Support

If you encounter issues:
1. Check function logs in Supabase Dashboard
2. Verify database functions exist
3. Test manual invocation
4. Check service role permissions
5. Review migration was applied successfully
