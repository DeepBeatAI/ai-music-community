# Testing Guide for Collect Metrics Edge Function

This guide provides step-by-step instructions for testing the automated metric collection system.

## Pre-Deployment Testing

### 1. Test Database Function First

Before deploying the Edge Function, verify the database function works:

```sql
-- Test the collect_daily_metrics function
SELECT collect_daily_metrics();

-- Check the results
SELECT * FROM metric_collection_log ORDER BY started_at DESC LIMIT 1;
SELECT * FROM daily_metrics WHERE metric_date = CURRENT_DATE;
```

## Post-Deployment Testing

### 1. Deploy via Dashboard

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **Create a new function**
3. Name: `collect-metrics`
4. Copy code from `supabase/functions/collect-metrics/index.ts`
5. Set environment variables:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
6. Click **Deploy**

### 2. Test Production Endpoint

Replace `your-project-ref` and `YOUR_ANON_KEY` with your actual values:

```bash
curl -i --location --request POST \
  'https://your-project-ref.supabase.co/functions/v1/collect-metrics' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

### 3. Verify in Database

Check that metrics were collected:

```sql
-- View latest collection log entry
SELECT 
  collection_date,
  started_at,
  completed_at,
  status,
  metrics_collected,
  error_message
FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 1;

-- View collected metrics for today
SELECT 
  metric_date,
  metric_type,
  metric_category,
  value,
  collection_timestamp
FROM daily_metrics
WHERE metric_date = CURRENT_DATE
ORDER BY metric_category;
```

Expected results:
- Collection log shows status = 'completed'
- 5 metrics collected (users_total, posts_total, comments_total, posts_created, comments_created)
- No error_message

## Cron Trigger Testing

### 1. Manual Trigger Test

If your Supabase Dashboard supports manual cron trigger:
1. Go to Edge Functions > collect-metrics
2. Find the cron job configuration
3. Click "Run Now" or "Test Trigger"
4. Check logs for execution

### 2. Wait for Scheduled Execution

After setting up the cron job:
1. Note the current time and next scheduled run time
2. Wait for the scheduled time to pass
3. Check Edge Function logs
4. Verify database entries

### 3. Verify Consistent Execution

Monitor for 3-5 days:

```sql
-- Check collection history
SELECT 
  collection_date,
  started_at,
  status,
  metrics_collected,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM metric_collection_log
WHERE started_at > NOW() - INTERVAL '7 days'
ORDER BY started_at DESC;
```

Expected pattern:
- One entry per day
- All status = 'completed'
- Consistent metrics_collected count
- Duration under 30 seconds

## Error Scenario Testing

### 1. Test Missing Environment Variables

Temporarily remove secrets and test:

```bash
# This should fail gracefully
curl -i --location --request POST \
  'https://your-project-ref.supabase.co/functions/v1/collect-metrics' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

Expected: Error response with clear message about missing environment variables

### 2. Test Invalid Date Format

```bash
curl -i --location --request POST \
  'https://your-project-ref.supabase.co/functions/v1/collect-metrics' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"target_date": "invalid-date"}'
```

Expected: Error response from database function

### 3. Test Duplicate Collection

Run the function twice for the same date:

```bash
# First run
curl -X POST https://your-project-ref.supabase.co/functions/v1/collect-metrics \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_date": "2025-01-15"}'

# Second run (should handle gracefully with ON CONFLICT)
curl -X POST https://your-project-ref.supabase.co/functions/v1/collect-metrics \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_date": "2025-01-15"}'
```

Expected: Both succeed, but metrics are not duplicated (ON CONFLICT DO UPDATE)

## Performance Testing

### 1. Measure Execution Time

```sql
-- Check recent execution times
SELECT 
  collection_date,
  EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 as duration_ms,
  metrics_collected
FROM metric_collection_log
WHERE status = 'completed'
ORDER BY started_at DESC
LIMIT 10;
```

Expected: Duration under 30 seconds (30,000 ms)

### 2. Test with Large Dataset

If you have significant data:
1. Run collection for current date
2. Monitor execution time
3. Check for timeout issues
4. Verify all metrics collected

## Integration Testing

### 1. End-to-End Flow

Complete workflow test:

```bash
# 1. Trigger collection
curl -X POST https://your-project-ref.supabase.co/functions/v1/collect-metrics \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# 2. Wait a few seconds for completion

# 3. Query the analytics API (if implemented)
curl https://your-project-ref.supabase.co/rest/v1/daily_metrics?metric_date=eq.$(date +%Y-%m-%d) \
  -H "apikey: YOUR_ANON_KEY"
```

### 2. Dashboard Integration

If analytics dashboard is implemented:
1. Trigger metric collection
2. Refresh analytics dashboard
3. Verify new data appears
4. Check charts update correctly

## Monitoring Checklist

After deployment, verify:

- [ ] Function deploys successfully
- [ ] Manual invocation works
- [ ] Metrics appear in database
- [ ] Collection log records success
- [ ] Cron job is configured
- [ ] Scheduled execution occurs
- [ ] No errors in function logs
- [ ] Performance is acceptable (< 30s)
- [ ] Error handling works correctly
- [ ] Duplicate runs handled gracefully

## Troubleshooting Common Issues

### Function Returns 500 Error

Check:
1. Environment secrets are set correctly
2. Database function `collect_daily_metrics` exists
3. Service role key has proper permissions
4. Function logs for detailed error

### Metrics Not Appearing

Check:
1. Source tables have data
2. RLS policies allow service role access
3. Collection log for errors
4. Database function executes successfully

### Cron Not Triggering

Check:
1. Cron expression is correct
2. Cron job is enabled
3. Project billing status
4. Edge Function is deployed
5. Supabase service status

## Success Criteria

The system is working correctly when:

✅ Manual invocation succeeds consistently
✅ Metrics appear in database after collection
✅ Collection log shows 'completed' status
✅ Cron job triggers at scheduled time
✅ No errors in function logs
✅ Performance meets requirements (< 30s)
✅ Error scenarios handled gracefully
✅ Monitoring queries return expected results

## Next Steps

After successful testing:
1. Set up monitoring alerts
2. Document any issues encountered
3. Create runbook for common problems
4. Schedule regular health checks
5. Plan for scaling if needed
