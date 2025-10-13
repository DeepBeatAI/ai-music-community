# Cron Trigger Setup for Automated Metric Collection

This guide explains how to configure automated daily metric collection using Supabase Edge Function cron triggers.

## Overview

The `collect-metrics` Edge Function will be triggered automatically every day at 00:00 UTC to collect analytics metrics.

## Prerequisites

1. Edge Function deployed via Supabase Dashboard
2. Environment variables configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
3. Database function `collect_daily_metrics` exists and is working

## Setup Methods

### Method 1: Supabase Dashboard (Recommended)

#### Step 1: Access Cron Configuration
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions** in the left sidebar
4. Click on the **collect-metrics** function
5. Click the **Cron** tab or look for **Schedule** section

#### Step 2: Create Cron Schedule
Click **Add Schedule** or **Create Cron** and configure:

- **Cron Expression:** `0 0 * * *` (daily at midnight UTC)
- **Request Body (optional):** Leave empty or use `{}` for current date
- **Enabled:** Toggle ON

#### Step 3: Save and Verify
- Click **Save** or **Create**
- The function will now run automatically at the scheduled time

### Method 2: Using pg_cron (Alternative)

If your Supabase project has pg_cron enabled, you can schedule the function call directly in PostgreSQL:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the Edge Function invocation
SELECT cron.schedule(
  'daily-metrics-collection',
  '0 0 * * *',  -- Daily at midnight UTC
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/collect-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Note:** Replace `your-project-ref` with your actual Supabase project reference.

### Method 3: External Cron Service

You can use external services like:
- **GitHub Actions** (with scheduled workflows)
- **Vercel Cron Jobs**
- **Render Cron Jobs**
- **EasyCron** or similar services

Example GitHub Actions workflow:

```yaml
# .github/workflows/collect-metrics.yml
name: Collect Daily Metrics

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Call collect-metrics function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://your-project-ref.supabase.co/functions/v1/collect-metrics
```

## Cron Expression Explained

`0 0 * * *` means:
- **Minute:** 0 (at the start of the hour)
- **Hour:** 0 (midnight)
- **Day of Month:** * (every day)
- **Month:** * (every month)
- **Day of Week:** * (every day of the week)

**Result:** Runs daily at 00:00 UTC

### Alternative Schedules

- Every 6 hours: `0 */6 * * *`
- Every day at 2 AM UTC: `0 2 * * *`
- Every Monday at midnight: `0 0 * * 1`
- Twice daily (midnight and noon): `0 0,12 * * *`

## Testing the Cron Setup

### Test Manual Invocation

Before relying on the cron schedule, test manual invocation:

```bash
# Test via curl
curl -i --location --request POST \
  'https://your-project-ref.supabase.co/functions/v1/collect-metrics' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "metrics_collected": 5,
    "execution_time_ms": 1234,
    "status": "completed"
  },
  "message": "Metrics collected successfully"
}
```

### Verify Scheduled Execution

After setting up the cron job:

1. **Wait for first scheduled run** (or trigger manually if supported)
2. **Check Edge Function logs:**
   - Go to Supabase Dashboard > Edge Functions > collect-metrics
   - View the **Logs** tab
   - Look for successful invocations at the scheduled time

3. **Verify metrics in database:**
```sql
-- Check latest collection log
SELECT * FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 5;

-- Verify today's metrics were collected
SELECT * FROM daily_metrics
WHERE metric_date = CURRENT_DATE
ORDER BY collection_timestamp DESC;
```

4. **Monitor for several days** to ensure consistent execution

## Monitoring and Alerts

### Check Cron Job Status

Regularly monitor:
- Edge Function invocation logs
- `metric_collection_log` table for failures
- Alert on missing daily collections

### Set Up Alerts

Create a monitoring query to check for missed collections:

```sql
-- Check if metrics were collected in the last 25 hours
SELECT 
  CASE 
    WHEN MAX(started_at) > NOW() - INTERVAL '25 hours' THEN 'OK'
    ELSE 'ALERT: No collection in last 25 hours'
  END as status,
  MAX(started_at) as last_collection
FROM metric_collection_log
WHERE status = 'completed';
```

### Troubleshooting

**Cron job not running:**
1. Verify cron expression is correct
2. Check Edge Function is deployed and accessible
3. Verify environment secrets are set
4. Check Supabase project billing status (cron may be disabled on free tier limits)

**Function runs but fails:**
1. Check Edge Function logs for errors
2. Verify `collect_daily_metrics` database function exists
3. Check service role key has proper permissions
4. Review `metric_collection_log` for error details

**Metrics not appearing:**
1. Verify source tables (posts, comments, profiles) have data
2. Check RLS policies allow service role access
3. Manually test the database function
4. Review collection log for partial failures

## Maintenance

### Pause Collection
To temporarily pause automated collection:
- Disable the cron job in Supabase Dashboard
- Or comment out the pg_cron schedule

### Resume Collection
- Re-enable the cron job
- Backfill any missed dates using the backfill script

### Update Schedule
To change the collection time:
1. Update the cron expression
2. Save changes
3. Verify new schedule in logs

## Requirements Addressed

- **3.1:** Daily automated metric collection at scheduled time (00:00 UTC)
- **Testing:** Manual invocation capability for validation
- **Verification:** Methods to confirm scheduled execution is working

## Next Steps

After cron setup:
1. Monitor for 7 days to ensure reliability
2. Set up alerting for failed collections
3. Document any issues and resolutions
4. Consider redundancy (backup collection method)
