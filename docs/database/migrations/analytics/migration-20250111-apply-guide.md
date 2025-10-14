# How to Apply Analytics Metrics Migration

## Overview
This guide explains how to apply the analytics metrics tables migration to your Supabase database.

## Prerequisites
- Supabase CLI installed (`npm install -g @supabase/cli`)
- Supabase project linked (`supabase link`)
- Database access credentials

## Local Development

### Option 1: Using Supabase CLI (Recommended)
```bash
# Start local Supabase (if not already running)
supabase start

# Apply all pending migrations
supabase db reset

# Or apply migrations without resetting
supabase db push
```

### Option 2: Direct SQL Execution
```bash
# Connect to local database
psql postgresql://postgres:postgres@localhost:54322/postgres

# Execute migration
\i supabase/migrations/20250111000000_create_analytics_metrics_tables.sql

# Exit psql
\q
```

## Production Deployment

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `20250111000000_create_analytics_metrics_tables.sql`
4. Paste into the SQL editor
5. Click **Run** to execute

### Option 2: Supabase CLI
```bash
# Link to your production project (if not already linked)
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push
```

### Option 3: Migration API
```bash
# Using Supabase Management API
curl -X POST 'https://api.supabase.com/v1/projects/{ref}/database/migrations' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d @supabase/migrations/20250111000000_create_analytics_metrics_tables.sql
```

## Verification

After applying the migration, verify it was successful:

### 1. Check Tables Created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('daily_metrics', 'metric_definitions', 'metric_collection_log');
```

Expected output: 3 rows (all three tables)

### 2. Check Indexes
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log')
ORDER BY tablename, indexname;
```

Expected output: 5 indexes total

### 3. Check RLS Policies
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log')
ORDER BY tablename, policyname;
```

Expected output: 6 policies total

### 4. Run Test Script (Optional)
```bash
# Local development
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/test_analytics_schema.sql

# Production (use your connection string)
psql "your-production-connection-string" \
  -f supabase/migrations/test_analytics_schema.sql
```

Expected output: All tests should pass with "PASSED" messages

## Troubleshooting

### Error: "relation already exists"
The migration uses `CREATE TABLE IF NOT EXISTS`, so this shouldn't happen. If it does:
1. Check if tables were partially created
2. Drop existing tables if safe to do so
3. Re-run migration

### Error: "permission denied"
Ensure you're using a role with sufficient privileges:
- Local: `postgres` user (default)
- Production: Service role or database owner

### Error: "column does not exist" in RLS policies
The RLS policy for `metric_collection_log` references `profiles.is_admin`. Ensure:
1. The `profiles` table exists
2. The `is_admin` column exists in `profiles`
3. If not, modify the policy or create the column

### Migration Not Showing Up
```bash
# Check migration status
supabase migration list

# Repair migration history if needed
supabase migration repair
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop policies first
DROP POLICY IF EXISTS "Service role can manage logs" ON metric_collection_log;
DROP POLICY IF EXISTS "Admins can view collection logs" ON metric_collection_log;
DROP POLICY IF EXISTS "Service role can manage definitions" ON metric_definitions;
DROP POLICY IF EXISTS "Anyone can view metric definitions" ON metric_definitions;
DROP POLICY IF EXISTS "Service role can manage metrics" ON daily_metrics;
DROP POLICY IF EXISTS "Anyone can view metrics" ON daily_metrics;

-- Drop indexes
DROP INDEX IF EXISTS idx_collection_log_status;
DROP INDEX IF EXISTS idx_collection_log_date;
DROP INDEX IF EXISTS idx_daily_metrics_collection;
DROP INDEX IF EXISTS idx_daily_metrics_category;
DROP INDEX IF EXISTS idx_daily_metrics_date_type;

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS metric_collection_log CASCADE;
DROP TABLE IF EXISTS metric_definitions CASCADE;
DROP TABLE IF EXISTS daily_metrics CASCADE;
```

## Next Steps

After successfully applying this migration:

1. ✅ **Task 1 Complete:** Database schema created
2. ⏭️ **Task 2:** Indexes already included in this migration
3. ⏭️ **Task 3:** RLS policies already included in this migration
4. ⏭️ **Task 4:** Implement metric collection function
5. ⏭️ **Task 5:** Implement backfill functionality

## Support

If you encounter issues:
1. Check the implementation summary: `20250111000000_IMPLEMENTATION_SUMMARY.md`
2. Review the design document: `.kiro/specs/analytics-metrics-table/design.md`
3. Check Supabase logs for detailed error messages
4. Verify your database version supports all features (PostgreSQL 15+)

## Migration Details

- **File:** `20250111000000_create_analytics_metrics_tables.sql`
- **Task:** Task 1 - Create database schema and tables
- **Requirements:** 1.1, 1.3, 2.1, 2.3, 4.1
- **Tables:** 3 (daily_metrics, metric_definitions, metric_collection_log)
- **Indexes:** 5 (optimized for query patterns)
- **RLS Policies:** 6 (security and access control)
- **Constraints:** 3 (unique constraints + check constraint)
