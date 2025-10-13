# Collect Metrics Edge Function

This Supabase Edge Function automatically collects daily analytics metrics by calling the `collect_daily_metrics` PostgreSQL function.

## Purpose

- Automates daily metric collection for the analytics system
- Can be triggered manually or via cron schedule
- Supports optional target date parameter for backfilling or manual collection

## Deployment

### Deploy via Supabase Dashboard

1. **Navigate to Edge Functions:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Click **Edge Functions** in the left sidebar

2. **Create New Function:**
   - Click **Create a new function**
   - Name: `collect-metrics`
   - Copy the code from `supabase/functions/collect-metrics/index.ts`
   - Paste into the function editor
   - Click **Deploy**

3. **Environment Variables:**
   - **Auto-configured!** Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to all Edge Functions
   - No manual configuration needed

## Testing

### Manual invocation (current date)
```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/collect-metrics' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

### Manual invocation (specific date)
```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/collect-metrics' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"target_date": "2025-01-10"}'
```

### Test in Dashboard
- Go to your function in the Dashboard
- Click the **Invoke** button
- Or use the **Test** tab to send a request

## Cron Schedule

To set up automated daily collection at 00:00 UTC, configure the cron trigger in the Supabase Dashboard:

1. Go to Database > Cron Jobs (or Edge Functions > Cron)
2. Create new cron job:
   - **Name:** `collect-daily-metrics`
   - **Schedule:** `0 0 * * *` (daily at midnight UTC)
   - **Function:** `collect-metrics`
   - **Payload:** `{}` (empty for current date)

## Response Format

### Success Response
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

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Error Handling

The function includes comprehensive error handling:
- Validates environment variables
- Logs all operations to console
- Returns detailed error messages
- Handles CORS for browser requests

## Requirements Addressed

- **3.1:** Automated metric collection via scheduled trigger
- **3.3:** Error handling and logging for collection failures
- **3.5:** Detailed error information for troubleshooting
