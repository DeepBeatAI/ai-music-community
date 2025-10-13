# Analytics Backfill Script

This directory contains the script for backfilling historical analytics metrics.

## Prerequisites

1. **Environment Variables**: Ensure you have the following in your `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Functions**: The following functions must be deployed to your database:
   - `collect_daily_metrics()` - Collects metrics for a single date
   - `backfill_daily_metrics()` - Backfills metrics for a date range

3. **Node.js & TypeScript**: Ensure you have Node.js installed and ts-node available.

## Installation

If you don't have ts-node installed globally, install it:

```bash
npm install -g ts-node
```

Or use it via npx (no installation needed):

```bash
npx ts-node scripts/database/backfill-analytics.ts
```

## Usage

### Basic Usage (Auto-detect date range)

The script will automatically find the earliest post/comment date and backfill to today:

```bash
cd client
npx ts-node ../scripts/database/backfill-analytics.ts
```

### Custom Date Range

Specify a custom start and/or end date:

```bash
cd client
npx ts-node ../scripts/database/backfill-analytics.ts --start-date 2024-01-01 --end-date 2024-12-31
```

### Options

- `--start-date YYYY-MM-DD` - Start date for backfill (optional, auto-detected if not provided)
- `--end-date YYYY-MM-DD` - End date for backfill (optional, defaults to today)

## What the Script Does

1. **Validates Environment**: Checks that required environment variables are set
2. **Finds Earliest Date**: Queries the database for the earliest post/comment (if not specified)
3. **Calls Backfill Function**: Executes the `backfill_daily_metrics` PostgreSQL function
4. **Logs Progress**: Displays progress and summary statistics
5. **Handles Errors**: Provides clear error messages and troubleshooting tips

## Output

The script provides detailed output:

```
═══════════════════════════════════════════════════════
  Analytics Metrics Backfill Script
═══════════════════════════════════════════════════════

📅 Finding earliest post/comment date...
✅ Earliest date found: 2024-01-01

🚀 Starting analytics backfill...
   Start Date: 2024-01-01
   End Date: 2025-01-11

✅ Backfill completed successfully!

📊 Summary:
   Dates Processed: 376
   Total Metrics: 1880
   Database Execution Time: 12543ms
   Total Script Time: 13.24s
   Status: completed

✨ All done! Your analytics metrics are now up to date.
```

## Troubleshooting

### Error: Missing required environment variables

**Solution**: Make sure your `.env.local` file contains:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Error: Function backfill_daily_metrics does not exist

**Solution**: Apply the migration that creates the backfill function:
```bash
supabase db push
```

### Error: Permission denied

**Solution**: Ensure you're using the service role key, not the anon key. The service role key has elevated permissions needed for the backfill operation.

### Backfill completed with errors

**Solution**: Check the Supabase logs for detailed error messages:
```bash
supabase logs
```

## Performance Considerations

- **Large Date Ranges**: Backfilling many months/years of data may take several minutes
- **Progress Logging**: The PostgreSQL function logs progress every 10 dates
- **Error Handling**: Individual date failures won't stop the entire backfill
- **Idempotency**: Running the script multiple times is safe - it won't create duplicates

## Monitoring

To monitor the backfill progress in real-time:

1. **Database Logs**: Watch Supabase logs for NOTICE messages
2. **Collection Log Table**: Query `metric_collection_log` for detailed status
3. **Script Output**: The script displays progress and summary statistics

## Next Steps

After running the backfill:

1. **Verify Data**: Check that metrics were created for all dates
2. **Validate Accuracy**: Compare metrics against source tables
3. **Set Up Automation**: Configure daily collection (cron or Edge Function)
4. **Update Dashboard**: Ensure the analytics dashboard displays the backfilled data

## Related Files

- `backfill-analytics.ts` - The backfill script
- `supabase/migrations/20250111000002_create_backfill_daily_metrics_function.sql` - PostgreSQL function
- `supabase/migrations/20250111000001_create_collect_daily_metrics_function.sql` - Collection function
- `.kiro/specs/analytics-metrics-table/` - Full specification and design documents
