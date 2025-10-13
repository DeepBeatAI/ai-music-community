# Task 4.2: Manual Testing Guide for collect_daily_metrics Function

## Prerequisites

Before testing, ensure:
- [ ] Docker Desktop is installed and running
- [ ] Supabase CLI is available (via npx or globally installed)
- [ ] All previous migrations have been applied (Tasks 1-3)
- [ ] Migration 20250111000001 (collect_daily_metrics function) is ready

## Setup Instructions

### Step 1: Start Supabase Local Development

```bash
# Start Supabase services
npx supabase start
```

Expected output:
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
```

### Step 2: Apply All Migrations

```bash
# Reset database and apply all migrations
npx supabase db reset
```

This will:
- Drop and recreate the database
- Apply all migrations in order
- Create tables, indexes, RLS policies, and functions

### Step 3: Verify Function Exists

Open Supabase Studio at `http://localhost:54323` or use psql:

```bash
# Connect to local database
npx supabase db psql
```

Then run:
```sql
-- Verify function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'collect_daily_metrics';
```

Expected result:
```
function_name          | arguments                      | return_type
-----------------------|--------------------------------|----------------------------------
collect_daily_metrics  | target_date date DEFAULT       | TABLE(metrics_collected integer,
                       | CURRENT_DATE                   | execution_time_ms integer,
                       |                                | status text)
```

## Test Scenario 1: Run Function for Current Date

### Execute the Function

```sql
-- Run collection for current date
SELECT * FROM collect_daily_metrics(CURRENT_DATE);
```

### Expected Results

The function should return:
```
metrics_collected | execution_time_ms | status
------------------|-------------------|----------
5                 | [varies]          | completed
```

**Validation Points:**
- ✓ `metrics_collected` should be exactly 5
- ✓ `execution_time_ms` should be a positive integer (typically < 1000ms)
- ✓ `status` should be 'completed'

### Verify Metrics Were Created

```sql
-- Check all metrics created for today
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

Expected result (5 rows):
```
metric_date | metric_type | metric_category   | value | collection_timestamp
------------|-------------|-------------------|-------|---------------------
2025-01-11  | count       | comments_created  | [N]   | 2025-01-11 ...
2025-01-11  | count       | comments_total    | [N]   | 2025-01-11 ...
2025-01-11  | count       | posts_created     | [N]   | 2025-01-11 ...
2025-01-11  | count       | posts_total       | [N]   | 2025-01-11 ...
2025-01-11  | count       | users_total       | [N]   | 2025-01-11 ...
```

**Validation Points:**
- ✓ Exactly 5 metrics should be present
- ✓ All metrics should have metric_type = 'count'
- ✓ All 5 expected categories should be present
- ✓ Values should be non-negative integers
- ✓ collection_timestamp should be recent

## Test Scenario 2: Check Collection Log Entry

### Query the Collection Log

```sql
-- Check the most recent collection log entry
SELECT 
  collection_date,
  started_at,
  completed_at,
  status,
  metrics_collected,
  error_message,
  (completed_at - started_at) as duration
FROM metric_collection_log
WHERE collection_date = CURRENT_DATE
ORDER BY started_at DESC
LIMIT 1;
```

Expected result:
```
collection_date | started_at          | completed_at        | status    | metrics_collected | error_message | duration
----------------|---------------------|---------------------|-----------|-------------------|---------------|----------
2025-01-11      | 2025-01-11 10:30:00 | 2025-01-11 10:30:01 | completed | 5                 | NULL          | 00:00:01
```

**Validation Points:**
- ✓ `status` should be 'completed'
- ✓ `metrics_collected` should be 5
- ✓ `error_message` should be NULL
- ✓ `completed_at` should be after `started_at`
- ✓ Duration should be reasonable (typically < 30 seconds)

## Test Scenario 3: Verify Idempotency (No Duplicates)

### Run Function Again for Same Date

```sql
-- Run collection again for the same date
SELECT * FROM collect_daily_metrics(CURRENT_DATE);
```

Expected result:
```
metrics_collected | execution_time_ms | status
------------------|-------------------|----------
5                 | [varies]          | completed
```

### Verify No Duplicates Were Created

```sql
-- Check for duplicate metrics
SELECT 
  metric_date,
  metric_category,
  COUNT(*) as count
FROM daily_metrics
WHERE metric_date = CURRENT_DATE
GROUP BY metric_date, metric_category
HAVING COUNT(*) > 1;
```

Expected result:
```
(0 rows)
```

**Validation Points:**
- ✓ Query should return 0 rows (no duplicates)
- ✓ Function should still return success
- ✓ Metrics may have updated values but no new rows

### Verify Total Metric Count

```sql
-- Count total metrics for today
SELECT COUNT(*) as total_metrics
FROM daily_metrics
WHERE metric_date = CURRENT_DATE;
```

Expected result:
```
total_metrics
-------------
5
```

**Validation Points:**
- ✓ Should still be exactly 5 metrics (not 10)
- ✓ Confirms ON CONFLICT handling is working

## Test Scenario 4: Test with Historical Date

### Run Function for Past Date

```sql
-- Run collection for a past date (e.g., yesterday)
SELECT * FROM collect_daily_metrics(CURRENT_DATE - INTERVAL '1 day');
```

Expected result:
```
metrics_collected | execution_time_ms | status
------------------|-------------------|----------
5                 | [varies]          | completed
```

### Verify Historical Metrics

```sql
-- Check metrics for yesterday
SELECT 
  metric_date,
  metric_category,
  value
FROM daily_metrics
WHERE metric_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY metric_category;
```

**Validation Points:**
- ✓ Should create 5 metrics for the historical date
- ✓ Values should reflect counts as of that date
- ✓ Total counts should be <= current date totals
- ✓ Daily counts (posts_created, comments_created) should be specific to that date

## Test Scenario 5: Verify Metric Values

### Check Metric Accuracy

```sql
-- Verify users_total matches actual count
SELECT 
  (SELECT value FROM daily_metrics 
   WHERE metric_date = CURRENT_DATE 
   AND metric_category = 'users_total') as metric_value,
  (SELECT COUNT(*) FROM profiles 
   WHERE created_at::DATE <= CURRENT_DATE) as actual_count;
```

Expected result:
```
metric_value | actual_count
-------------|-------------
[N]          | [N]
```

**Validation Points:**
- ✓ metric_value should equal actual_count
- ✓ Repeat for posts_total, comments_total, posts_created, comments_created

### Complete Accuracy Check

```sql
-- Comprehensive accuracy verification
WITH metric_values AS (
  SELECT metric_category, value
  FROM daily_metrics
  WHERE metric_date = CURRENT_DATE
),
actual_values AS (
  SELECT 'users_total' as category, 
         COUNT(*)::numeric as count 
  FROM profiles 
  WHERE created_at::DATE <= CURRENT_DATE
  
  UNION ALL
  
  SELECT 'posts_total', 
         COUNT(*)::numeric 
  FROM posts 
  WHERE created_at::DATE <= CURRENT_DATE
  
  UNION ALL
  
  SELECT 'comments_total', 
         COUNT(*)::numeric 
  FROM comments 
  WHERE created_at::DATE <= CURRENT_DATE
  
  UNION ALL
  
  SELECT 'posts_created', 
         COUNT(*)::numeric 
  FROM posts 
  WHERE created_at::DATE = CURRENT_DATE
  
  UNION ALL
  
  SELECT 'comments_created', 
         COUNT(*)::numeric 
  FROM comments 
  WHERE created_at::DATE = CURRENT_DATE
)
SELECT 
  a.category,
  a.count as actual_value,
  m.value as metric_value,
  CASE 
    WHEN a.count = m.value THEN '✓ Match'
    ELSE '✗ Mismatch'
  END as validation
FROM actual_values a
LEFT JOIN metric_values m ON a.category = m.metric_category
ORDER BY a.category;
```

Expected result:
```
category          | actual_value | metric_value | validation
------------------|--------------|--------------|------------
comments_created  | [N]          | [N]          | ✓ Match
comments_total    | [N]          | [N]          | ✓ Match
posts_created     | [N]          | [N]          | ✓ Match
posts_total       | [N]          | [N]          | ✓ Match
users_total       | [N]          | [N]          | ✓ Match
```

**Validation Points:**
- ✓ All 5 metrics should show '✓ Match'
- ✓ No mismatches should be present

## Test Scenario 6: Error Handling Test

### Test with Invalid Date (Optional)

```sql
-- Test error handling (this should work but with 0 values for future dates)
SELECT * FROM collect_daily_metrics(CURRENT_DATE + INTERVAL '1 day');
```

This should still succeed but with 0 values for daily metrics.

## Success Criteria Checklist

After completing all test scenarios, verify:

- [ ] Function executes successfully for current date
- [ ] Exactly 5 metrics are created
- [ ] Collection log entry shows 'completed' status
- [ ] Running function again does not create duplicates
- [ ] Total metric count remains 5 after re-run
- [ ] Function works for historical dates
- [ ] Metric values match actual database counts
- [ ] No errors in collection log
- [ ] Execution time is reasonable (< 30 seconds)
- [ ] All metric categories are present

## Troubleshooting

### Issue: Function Not Found

**Symptom**: `ERROR: function collect_daily_metrics(date) does not exist`

**Solution**:
```bash
# Reapply migrations
npx supabase db reset
```

### Issue: Permission Denied

**Symptom**: `ERROR: permission denied for table profiles`

**Solution**: Function should use SECURITY DEFINER. Check function definition:
```sql
SELECT prosecdef FROM pg_proc WHERE proname = 'collect_daily_metrics';
```
Should return `t` (true).

### Issue: Duplicate Key Violation

**Symptom**: `ERROR: duplicate key value violates unique constraint`

**Solution**: This shouldn't happen with ON CONFLICT handling. Check unique constraint:
```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'daily_metrics'::regclass 
AND contype = 'u';
```

### Issue: No Data in Source Tables

**Symptom**: All metrics show value = 0

**Solution**: This is expected if no data exists. Create test data:
```sql
-- Insert test profile
INSERT INTO profiles (id, email, username)
VALUES (gen_random_uuid(), 'test@example.com', 'testuser');

-- Insert test post
INSERT INTO posts (id, user_id, title, content)
VALUES (gen_random_uuid(), (SELECT id FROM profiles LIMIT 1), 'Test Post', 'Content');

-- Re-run collection
SELECT * FROM collect_daily_metrics(CURRENT_DATE);
```

## Cleanup (Optional)

To clean up test data:

```sql
-- Delete test metrics
DELETE FROM daily_metrics WHERE metric_date = CURRENT_DATE;

-- Delete test collection logs
DELETE FROM metric_collection_log WHERE collection_date = CURRENT_DATE;
```

## Next Steps

After successful testing:
1. Document any issues encountered
2. Verify all requirements are met (1.1, 4.1)
3. Mark task 4.2 as complete
4. Proceed to task 5: Implement backfill functionality

---

**Requirements Validated**: 1.1, 4.1
**Status**: Ready for manual testing when Docker Desktop is available
