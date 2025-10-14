# Analytics Metrics Tables - Implementation Summary

## Overview
This migration creates the database schema for the analytics metrics system, which captures daily snapshots of platform activity to ensure historical accuracy independent of content deletions.

## Migration File
- **File:** `20250111000000_create_analytics_metrics_tables.sql`
- **Task:** Task 1 - Create database schema and tables
- **Requirements:** 1.1, 1.3, 2.1, 2.3, 4.1

## Tables Created

### 1. daily_metrics
**Purpose:** Store immutable daily snapshots of platform metrics

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `metric_date` (DATE, NOT NULL) - The date this metric represents
- `metric_type` (TEXT, NOT NULL) - Type: count, average, percentage, aggregate
- `metric_category` (TEXT, NOT NULL) - Category: users_total, posts_created, etc.
- `value` (NUMERIC, NOT NULL) - Numeric value of the metric
- `metadata` (JSONB, DEFAULT '{}') - Additional metadata in JSON format
- `collection_timestamp` (TIMESTAMPTZ, DEFAULT NOW()) - When collected
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Record creation time

**Constraints:**
- `unique_daily_metric` - UNIQUE(metric_date, metric_type, metric_category)
  - Ensures one record per date/type/category combination
  - Provides immutability - prevents duplicate entries

**Indexes:**
- `idx_daily_metrics_date_type` - (metric_date DESC, metric_type, metric_category)
  - Optimizes date range queries with type filtering
- `idx_daily_metrics_category` - (metric_category, metric_date DESC)
  - Optimizes category-specific queries
- `idx_daily_metrics_collection` - (collection_timestamp DESC)
  - Optimizes monitoring queries

### 2. metric_definitions
**Purpose:** Store metadata about available metrics

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `metric_type` (TEXT, NOT NULL) - Type of metric
- `metric_category` (TEXT, NOT NULL) - Specific category
- `display_name` (TEXT, NOT NULL) - Human-readable name for UI
- `description` (TEXT) - Detailed description
- `unit` (TEXT) - Unit of measurement (count, percentage, seconds, etc.)
- `format_pattern` (TEXT) - Display formatting (e.g., '0,0' for thousands)
- `is_active` (BOOLEAN, DEFAULT TRUE) - Whether currently being collected
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Record creation time

**Constraints:**
- `unique_metric_definition` - UNIQUE(metric_type, metric_category)
  - Ensures one definition per metric type/category pair

### 3. metric_collection_log
**Purpose:** Track metric collection runs for monitoring and debugging

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `collection_date` (DATE, NOT NULL) - Date being collected
- `started_at` (TIMESTAMPTZ, NOT NULL) - Collection start time
- `completed_at` (TIMESTAMPTZ) - Collection completion time (NULL if running)
- `status` (TEXT, NOT NULL) - Status: 'running', 'completed', or 'failed'
- `metrics_collected` (INTEGER, DEFAULT 0) - Number of metrics collected
- `error_message` (TEXT) - Error message if failed
- `error_details` (JSONB) - Detailed error information in JSON
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Record creation time

**Constraints:**
- CHECK constraint on `status` - Must be 'running', 'completed', or 'failed'

**Indexes:**
- `idx_collection_log_date` - (collection_date DESC)
  - Optimizes date-based log queries
- `idx_collection_log_status` - (status, started_at DESC)
  - Optimizes status-based monitoring queries

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### daily_metrics
- **"Anyone can view metrics"** - SELECT for all users (public read access)
- **"Service role can manage metrics"** - ALL operations for service role only

### metric_definitions
- **"Anyone can view metric definitions"** - SELECT for all users
- **"Service role can manage definitions"** - ALL operations for service role only

### metric_collection_log
- **"Admins can view collection logs"** - SELECT for admin users only
  - Checks `profiles.is_admin = true`
- **"Service role can manage logs"** - ALL operations for service role only

## Core Metrics (Phase 1)

The system is designed to collect these initial metrics:

1. **users_total** (count) - Total user count
2. **posts_total** (count) - Total posts count
3. **comments_total** (count) - Total comments count
4. **posts_created** (count) - Posts created that day
5. **comments_created** (count) - Comments created that day

## Verification Steps

### 1. Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('daily_metrics', 'metric_definitions', 'metric_collection_log');
```

### 2. Check Constraints
```sql
SELECT conname, contype 
FROM pg_constraint 
WHERE conname IN ('unique_daily_metric', 'unique_metric_definition');
```

### 3. Check Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log');
```

### 4. Check RLS Policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log');
```

### 5. Run Test Script
Execute the test script to validate all functionality:
```bash
psql -f supabase/migrations/test_analytics_schema.sql
```

## Next Steps

After this migration is applied:

1. **Task 2:** Implement database indexes for performance (already included)
2. **Task 3:** Set up Row Level Security policies (already included)
3. **Task 4:** Implement metric collection function
4. **Task 5:** Implement backfill functionality
5. **Task 6:** Set up automated metric collection

## Design Decisions

### Why Separate Tables?
- **daily_metrics:** Optimized for fast queries and immutable storage
- **metric_definitions:** Provides metadata for UI display and documentation
- **metric_collection_log:** Enables monitoring and debugging without cluttering metrics

### Why NUMERIC for value?
- Supports both integers and decimals
- Handles large numbers without overflow
- Allows for percentage and average metrics in the future

### Why JSONB for metadata?
- Flexible schema for future metric types
- Efficient storage and querying
- Supports complex data structures for aggregate metrics

### Why Unique Constraint?
- Ensures immutability - one record per date/type/category
- Prevents accidental duplicates
- Enables idempotent collection (can re-run safely)

## Performance Considerations

- **Indexes:** Optimized for common query patterns (date ranges, categories)
- **RLS:** Minimal overhead with simple policies
- **JSONB:** Efficient storage and GIN indexing available if needed
- **Partitioning:** Can be added later if table grows very large

## Security Considerations

- **RLS Enabled:** All tables protected by Row Level Security
- **Service Role Only:** Only service role can insert/update metrics
- **Admin Access:** Collection logs restricted to admin users
- **Public Read:** Metrics are public (analytics dashboard accessible to all)

## Monitoring

The `metric_collection_log` table provides:
- Collection success/failure tracking
- Performance monitoring (duration)
- Error debugging (detailed error information)
- Audit trail of all collection runs

## Extensibility

The schema supports future enhancements:
- New metric types (average, percentage, aggregate)
- Complex metadata in JSONB
- Additional indexes for new query patterns
- Partitioning for large datasets
- Archival strategies for old data
