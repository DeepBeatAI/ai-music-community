# Scheduling Options for Automated Metric Collection

Since the Supabase Dashboard may not have a built-in Cron/Schedule UI, here are several working alternatives to automate daily metric collection.

## ✅ Option 1: pg_cron (Recommended - Database Level)

Schedule directly in PostgreSQL using the `pg_cron` extension.

### Setup:

1. **Enable pg_cron in your Supabase project:**
   - Go to Database > Extensions
   - Search for "pg_cron"
   - Enable it

2. **Run this SQL in the SQL Editor:**

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily metric collection at midnight UTC
SELECT cron.schedule(
  'daily-metrics-collection',           -- Job name
  '0 0 * * *',                          -- Cron expression (midnight UTC)
  $$
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/collect-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR-ANON-KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

3. **Replace:**
   - `YOUR-PROJECT-REF` with your project reference (from your Supabase URL)
   - `YOUR-ANON-KEY` with your anon key (from Project Settings > API)

### Verify it's scheduled:

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Unschedule (if needed):

```sql
-- Remove the scheduled job
SELECT cron.unschedule('daily-metrics-collection');
```

---

## ✅ Option 2: GitHub Actions (Free & Reliable)

Use GitHub Actions to trigger the function daily.

### Setup:

1. **Create workflow file** in your repository:
   `.github/workflows/collect-metrics.yml`

```yaml
name: Collect Daily Metrics

on:
  schedule:
    # Runs daily at midnight UTC
    - cron: '0 0 * * *'
  
  # Allows manual trigger from Actions tab
  workflow_dispatch:

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    
    steps:
      - name: Trigger metric collection
        run: |
          response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/collect-metrics)
          
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | head -n-1)
          
          echo "Response: $body"
          echo "HTTP Code: $http_code"
          
          if [ "$http_code" != "200" ]; then
            echo "Error: Metric collection failed"
            exit 1
          fi
      
      - name: Verify metrics in database
        if: success()
        run: echo "Metrics collected successfully!"
```

2. **Add GitHub Secrets:**
   - Go to your GitHub repo > Settings > Secrets and variables > Actions
   - Add:
     - `SUPABASE_ANON_KEY`: Your anon key
     - `SUPABASE_PROJECT_REF`: Your project reference (e.g., `abcdefgh`)

3. **Test manually:**
   - Go to Actions tab
   - Select "Collect Daily Metrics"
   - Click "Run workflow"

---

## ✅ Option 3: Vercel Cron Jobs

If you're deploying a Next.js app on Vercel, use Vercel Cron Jobs.

### Setup:

1. **Create API route** in your Next.js app:
   `app/api/cron/collect-metrics/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}.supabase.co/functions/v1/collect-metrics`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

2. **Add to `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/collect-metrics",
      "schedule": "0 0 * * *"
    }
  ]
}
```

3. **Set environment variables in Vercel:**
   - `CRON_SECRET`: A random secret string
   - `NEXT_PUBLIC_SUPABASE_PROJECT_REF`: Your project ref
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon key

---

## ✅ Option 4: External Cron Service

Use a free cron service like **cron-job.org** or **EasyCron**.

### Setup:

1. **Sign up** for a free account at [cron-job.org](https://cron-job.org)

2. **Create new cron job:**
   - **URL:** `https://YOUR-PROJECT-REF.supabase.co/functions/v1/collect-metrics`
   - **Schedule:** `0 0 * * *` (daily at midnight)
   - **Method:** POST
   - **Headers:**
     ```
     Authorization: Bearer YOUR-ANON-KEY
     Content-Type: application/json
     ```
   - **Body:** `{}`

3. **Enable** the job

---

## ✅ Option 5: Local Server Cron (If you have a server)

If you have a server or VPS running 24/7:

### Linux/Mac:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at midnight UTC)
0 0 * * * curl -X POST -H "Authorization: Bearer YOUR-ANON-KEY" -H "Content-Type: application/json" https://YOUR-PROJECT-REF.supabase.co/functions/v1/collect-metrics
```

### Windows Task Scheduler:

1. Create a PowerShell script `collect-metrics.ps1`:
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR-ANON-KEY"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://YOUR-PROJECT-REF.supabase.co/functions/v1/collect-metrics" -Method Post -Headers $headers
```

2. Schedule it in Task Scheduler to run daily at midnight

---

## 📊 Comparison

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **pg_cron** | Native to Supabase, reliable, no external dependencies | Requires pg_cron extension | Most users |
| **GitHub Actions** | Free, reliable, version controlled | Requires GitHub repo | Projects already on GitHub |
| **Vercel Cron** | Integrated with your app | Requires Vercel deployment | Next.js apps on Vercel |
| **External Service** | Easy setup, no code needed | Depends on third-party | Quick testing |
| **Local Cron** | Full control | Requires always-on server | Self-hosted setups |

## 🎯 Recommendation

**Use pg_cron (Option 1)** - It's built into Supabase, reliable, and requires no external services.

---

## 🔍 Verify Automation is Working

After setting up any option, verify it's working:

```sql
-- Check collection log (should have daily entries)
SELECT 
  collection_date,
  started_at,
  status,
  metrics_collected
FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 7;

-- Check for gaps in collection
SELECT 
  generate_series(
    (SELECT MIN(collection_date) FROM metric_collection_log),
    CURRENT_DATE,
    '1 day'::interval
  )::date as expected_date
EXCEPT
SELECT collection_date
FROM metric_collection_log
WHERE status = 'completed';
```

If you see missing dates, your automation may not be working correctly.
