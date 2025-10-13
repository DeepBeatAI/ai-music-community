# Quick Start Guide - Deploy Collect Metrics Function

## 📍 File Locations

All documentation is in: `supabase/functions/collect-metrics/`

- **README.md** - Overview and deployment instructions
- **CRON_SETUP.md** - How to set up automated daily collection
- **TESTING_GUIDE.md** - Testing procedures
- **DEPLOYMENT_SUMMARY.md** - Complete implementation summary
- **index.ts** - The Edge Function code (copy this to Dashboard)

## 🚀 5-Minute Deployment

### Step 1: Open Supabase Dashboard

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Edge Functions** in the left sidebar

### Step 2: Create the Function

1. Click **Create a new function**
2. Name: `collect-metrics`
3. Open `supabase/functions/collect-metrics/index.ts` in your editor
4. Copy ALL the code
5. Paste into the Dashboard editor
6. Click **Deploy**

### Step 3: Environment Variables (Auto-Configured!)

**Good news!** Supabase automatically provides these environment variables to all Edge Functions:

- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

**You don't need to set anything manually!** The function will automatically have access to these values.

If you want to verify or customize, you can check the function's environment in the Dashboard, but the default setup should work out of the box.

### Step 4: Test It

Click the **Invoke** or **Test** button in the Dashboard, or use curl:

```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/collect-metrics \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
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

### Step 5: Set Up Daily Automation

**Option A: Use pg_cron (Database-Level Scheduling)**

The easiest way is to schedule it directly in your database using PostgreSQL's pg_cron:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily metric collection at midnight UTC
SELECT cron.schedule(
  'daily-metrics-collection',
  '0 0 * * *',  -- Daily at midnight UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/collect-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Replace `YOUR-PROJECT-REF` with your actual project reference from the URL.

**Option B: Use GitHub Actions (Free & Reliable)**

Create `.github/workflows/collect-metrics.yml`:

```yaml
name: Collect Daily Metrics

on:
  schedule:
    - cron: "0 0 * * *" # Daily at midnight UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Call collect-metrics function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://YOUR-PROJECT-REF.supabase.co/functions/v1/collect-metrics
```

Then add your `SUPABASE_ANON_KEY` to GitHub Secrets.

**Option C: Manual Trigger (For Testing)**

For now, you can manually trigger it daily, or set up a simple cron job on your local machine or server.

## ✅ Verify It's Working

Check the database:

```sql
-- View collection log
SELECT * FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 5;

-- View today's metrics
SELECT * FROM daily_metrics
WHERE metric_date = CURRENT_DATE;
```

## 🆘 Troubleshooting

**Function returns 500 error:**

- Check environment variables are set correctly
- Verify service role key has proper permissions
- Check function logs in Dashboard

**No metrics appearing:**

- Verify database function `collect_daily_metrics` exists
- Check source tables (posts, comments, profiles) have data
- Review collection log for errors

**Cron not triggering:**

- Verify cron expression is correct: `0 0 * * *`
- Check cron is enabled
- Wait 24 hours for first scheduled run

## 📚 More Information

- **Scheduling options:** See `SCHEDULING_OPTIONS.md` for all automation methods
- **Testing guide:** See `TESTING_GUIDE.md`
- **Full documentation:** See `README.md`

---

That's it! Your automated metric collection is now running. 🎉
