-- =====================================================
-- ANALYTICS METRICS SYSTEM - COMPLETE MIGRATION
-- =====================================================
-- Description: Comprehensive migration for the analytics metrics system
--              Creates tables, indexes, RLS policies, functions, and seed data
-- Version: 1.0
-- Created: 2025-01-13
-- Requirements: 1.1, 2.1, 3.1, 4.1, 5.1
-- =====================================================

-- =====================================================
-- SECTION 1: TABLE DEFINITIONS
-- =====================================================

-- -----------------------------------------------------
-- Table: daily_metrics
-- Purpose: Store immutable daily snapshots of platform metrics
-- Requirements: 1.1, 1.3, 2.1, 4.1
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  collection_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one record per date/type/category combination (immutability)
  CONSTRAINT unique_daily_metric UNIQUE (metric_date, metric_type, metric_category)
);

-- Add table and column comments for documentation
COMMENT ON TABLE daily_metrics IS 
'Stores immutable daily snapshots of platform metrics for historical accuracy. 
Once recorded, metrics are never modified to ensure data integrity and consistency.';

COMMENT ON COLUMN daily_metrics.metric_date IS 
'The date this metric represents (not when it was collected)';

COMMENT ON COLUMN daily_metrics.metric_type IS 
'Type of metric: count, average, percentage, aggregate';

COMMENT ON COLUMN daily_metrics.metric_category IS 
'Specific metric category: users_total, posts_created, comments_total, etc.';

COMMENT ON COLUMN daily_metrics.value IS 
'Numeric value of the metric';

COMMENT ON COLUMN daily_metrics.metadata IS 
'Additional metadata in JSON format for complex metrics';

COMMENT ON COLUMN daily_metrics.collection_timestamp IS 
'Timestamp when this metric was collected (for monitoring and debugging)';

-- -----------------------------------------------------
-- Table: metric_definitions
-- Purpose: Store metadata about available metrics
-- Requirements: 2.1, 2.2, 6.1
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  unit TEXT, -- 'count', 'percentage', 'seconds', etc.
  format_pattern TEXT, -- e.g., '0,0' for thousands separator
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_metric_definition UNIQUE (metric_type, metric_category)
);

-- Add table and column comments for documentation
COMMENT ON TABLE metric_definitions IS 
'Metadata definitions for all available metrics. Provides display information and formatting rules.';

COMMENT ON COLUMN metric_definitions.display_name IS 
'Human-readable name for display in UI';

COMMENT ON COLUMN metric_definitions.description IS 
'Detailed description of what this metric measures';

COMMENT ON COLUMN metric_definitions.unit IS 
'Unit of measurement for the metric (users, posts, percentage, etc.)';

COMMENT ON COLUMN metric_definitions.format_pattern IS 
'Formatting pattern for display (e.g., 0,0 for thousands separator)';

COMMENT ON COLUMN metric_definitions.is_active IS 
'Whether this metric is currently being collected';

-- -----------------------------------------------------
-- Table: metric_collection_log
-- Purpose: Track metric collection runs for monitoring
-- Requirements: 3.1, 10.1, 10.2
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_collection_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  metrics_collected INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table and column comments for documentation
COMMENT ON TABLE metric_collection_log IS 
'Logs all metric collection runs for monitoring, debugging, and observability';

COMMENT ON COLUMN metric_collection_log.collection_date IS 
'The date for which metrics were collected';

COMMENT ON COLUMN metric_collection_log.status IS 
'Status of collection: running, completed, or failed';

COMMENT ON COLUMN metric_collection_log.metrics_collected IS 
'Number of metrics successfully collected in this run';

COMMENT ON COLUMN metric_collection_log.error_message IS 
'Error message if collection failed';

COMMENT ON COLUMN metric_collection_log.error_details IS 
'Detailed error information in JSON format (SQLSTATE, context, etc.)';

-- =====================================================
-- SECTION 2: PERFORMANCE INDEXES
-- =====================================================
-- Requirements: 5.1, 5.2, 5.3

-- Primary query pattern: date range + metric type
-- Used by: Dashboard queries, activity charts, metric filtering
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date_type 
ON daily_metrics(metric_date DESC, metric_type, metric_category);

COMMENT ON INDEX idx_daily_metrics_date_type IS 
'Optimizes queries filtering by date range and metric type/category';

-- Query by category (for specific metric lookups)
-- Used by: Current metrics display, single metric queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_category 
ON daily_metrics(metric_category, metric_date DESC);

COMMENT ON INDEX idx_daily_metrics_category IS 
'Optimizes queries for specific metric categories across dates';

-- Query by collection timestamp (for monitoring)
-- Used by: Collection status monitoring, debugging
CREATE INDEX IF NOT EXISTS idx_daily_metrics_collection 
ON daily_metrics(collection_timestamp DESC);

COMMENT ON INDEX idx_daily_metrics_collection IS 
'Optimizes queries for monitoring recent collection runs';

-- Collection log queries (for monitoring dashboard)
CREATE INDEX IF NOT EXISTS idx_collection_log_date 
ON metric_collection_log(collection_date DESC);

COMMENT ON INDEX idx_collection_log_date IS 
'Optimizes queries for collection history by date';

CREATE INDEX IF NOT EXISTS idx_collection_log_status 
ON metric_collection_log(status, started_at DESC);

COMMENT ON INDEX idx_collection_log_status IS 
'Optimizes queries for failed or running collections';

-- =====================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Requirements: 4.1, 4.4

-- Enable RLS on all analytics tables
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_collection_log ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- RLS Policies: daily_metrics
-- -----------------------------------------------------

-- Public read access for metrics (all users can view analytics)
CREATE POLICY "Anyone can view metrics" ON daily_metrics
FOR SELECT USING (true);

COMMENT ON POLICY "Anyone can view metrics" ON daily_metrics IS 
'Allows all users to view analytics metrics for transparency';

-- Only service role can insert/update metrics
CREATE POLICY "Service role can manage metrics" ON daily_metrics
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON POLICY "Service role can manage metrics" ON daily_metrics IS 
'Restricts metric creation and updates to automated collection service only';

-- -----------------------------------------------------
-- RLS Policies: metric_definitions
-- -----------------------------------------------------

-- Public read access for metric definitions
CREATE POLICY "Anyone can view metric definitions" ON metric_definitions
FOR SELECT USING (true);

COMMENT ON POLICY "Anyone can view metric definitions" ON metric_definitions IS 
'Allows all users to view metric metadata for proper display';

-- Service role can manage metric definitions
CREATE POLICY "Service role can manage definitions" ON metric_definitions
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON POLICY "Service role can manage definitions" ON metric_definitions IS 
'Restricts metric definition management to service role';

-- -----------------------------------------------------
-- RLS Policies: metric_collection_log
-- -----------------------------------------------------

-- Service role only access to collection logs
-- Note: Can be extended to admin users when is_admin column is added to profiles
CREATE POLICY "Service role can view collection logs" ON metric_collection_log
FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON POLICY "Service role can view collection logs" ON metric_collection_log IS 
'Restricts collection log viewing to service role (can be extended to admins)';

-- Service role can manage collection logs
CREATE POLICY "Service role can manage logs" ON metric_collection_log
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON POLICY "Service role can manage logs" ON metric_collection_log IS 
'Restricts collection log management to service role';

-- =====================================================
-- SECTION 4: COLLECTION FUNCTION
-- =====================================================
-- Requirements: 1.1, 1.2, 3.1, 3.2, 3.4, 4.1

CREATE OR REPLACE FUNCTION collect_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  metrics_collected INTEGER,
  execution_time_ms INTEGER,
  status TEXT
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  log_id UUID;
  metrics_count INTEGER := 0;
BEGIN
  start_time := clock_timestamp();
  
  -- Create log entry to track this collection run
  INSERT INTO metric_collection_log (collection_date, started_at, status)
  VALUES (target_date, start_time, 'running')
  RETURNING id INTO log_id;
  
  -- ===================================================
  -- Metric 1: Total Users Count
  -- ===================================================
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'users_total',
    (SELECT COUNT(*) FROM profiles WHERE created_at::DATE <= target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value, collection_timestamp = NOW();
  metrics_count := metrics_count + 1;
  
  -- ===================================================
  -- Metric 2: Total Tracks/Posts Count
  -- ===================================================
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'posts_total',
    (SELECT COUNT(*) FROM tracks WHERE created_at::DATE <= target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value, collection_timestamp = NOW();
  metrics_count := metrics_count + 1;
  
  -- ===================================================
  -- Metric 3: Total Comments Count
  -- ===================================================
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'comments_total',
    (SELECT COUNT(*) FROM comments WHERE created_at::DATE <= target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value, collection_timestamp = NOW();
  metrics_count := metrics_count + 1;
  
  -- ===================================================
  -- Metric 4: Tracks Created That Day
  -- ===================================================
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'posts_created',
    (SELECT COUNT(*) FROM tracks WHERE created_at::DATE = target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value, collection_timestamp = NOW();
  metrics_count := metrics_count + 1;
  
  -- ===================================================
  -- Metric 5: Comments Created That Day
  -- ===================================================
  INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
  VALUES (
    target_date,
    'count',
    'comments_created',
    (SELECT COUNT(*) FROM comments WHERE created_at::DATE = target_date)
  )
  ON CONFLICT (metric_date, metric_type, metric_category) 
  DO UPDATE SET value = EXCLUDED.value, collection_timestamp = NOW();
  metrics_count := metrics_count + 1;
  
  -- Update log entry on successful completion
  UPDATE metric_collection_log
  SET completed_at = clock_timestamp(),
      status = 'completed',
      metrics_collected = metrics_count
  WHERE id = log_id;
  
  -- Return summary of collection run
  RETURN QUERY SELECT 
    metrics_count,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER,
    'completed'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  -- Log error details for debugging
  UPDATE metric_collection_log
  SET completed_at = clock_timestamp(),
      status = 'failed',
      error_message = SQLERRM,
      error_details = jsonb_build_object(
        'sqlstate', SQLSTATE,
        'context', PG_EXCEPTION_CONTEXT
      )
  WHERE id = log_id;
  
  -- Re-raise the exception
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function comment for documentation
COMMENT ON FUNCTION collect_daily_metrics IS 
'Collects daily metrics for the platform including user counts, track counts, and comment counts. 
Implements idempotent collection with ON CONFLICT handling and comprehensive error logging.
Can be called manually or scheduled via cron/Edge Function.';

-- =====================================================
-- SECTION 5: BACKFILL FUNCTION
-- =====================================================
-- Requirements: 8.1, 8.2, 8.4

CREATE OR REPLACE FUNCTION backfill_daily_metrics(
  start_date DATE,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  dates_processed INTEGER,
  total_metrics INTEGER,
  execution_time_ms INTEGER,
  status TEXT
) AS $$
DECLARE
  processing_date DATE;
  dates_count INTEGER := 0;
  metrics_total INTEGER := 0;
  start_time TIMESTAMPTZ;
  result RECORD;
  error_count INTEGER := 0;
BEGIN
  start_time := clock_timestamp();
  processing_date := start_date;
  
  -- Validate date range
  IF start_date > end_date THEN
    RAISE EXCEPTION 'start_date (%) cannot be after end_date (%)', start_date, end_date;
  END IF;
  
  -- Log backfill start
  RAISE NOTICE 'Starting backfill from % to %', start_date, end_date;
  
  -- Loop through each date in the range
  WHILE processing_date <= end_date LOOP
    BEGIN
      -- Call collect_daily_metrics for each date
      SELECT * INTO result FROM collect_daily_metrics(processing_date);
      
      dates_count := dates_count + 1;
      metrics_total := metrics_total + result.metrics_collected;
      
      -- Progress logging every 10 dates
      IF dates_count % 10 = 0 THEN
        RAISE NOTICE 'Progress: Processed % dates, % total metrics collected', dates_count, metrics_total;
      END IF;
      
      -- Detailed logging for each date
      RAISE NOTICE 'Processed date: %, Metrics: %, Status: %', 
        processing_date, result.metrics_collected, result.status;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other dates
      error_count := error_count + 1;
      RAISE WARNING 'Error processing date %: % (SQLSTATE: %)', 
        processing_date, SQLERRM, SQLSTATE;
    END;
    
    -- Move to next date
    processing_date := processing_date + INTERVAL '1 day';
  END LOOP;
  
  -- Final summary
  RAISE NOTICE 'Backfill completed: % dates processed, % total metrics, % errors', 
    dates_count, metrics_total, error_count;
  
  -- Return summary statistics
  RETURN QUERY SELECT 
    dates_count,
    metrics_total,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER,
    CASE 
      WHEN error_count = 0 THEN 'completed'::TEXT
      WHEN error_count < dates_count THEN 'completed_with_errors'::TEXT
      ELSE 'failed'::TEXT
    END;
END;
$$ LANGUAGE plpgsql;

-- Add function comment for documentation
COMMENT ON FUNCTION backfill_daily_metrics IS 
'Backfills daily metrics for a date range by calling collect_daily_metrics for each date. 
Includes progress logging, error handling, and continues processing even if individual dates fail.
Returns summary statistics including dates processed, total metrics, and execution time.';

-- =====================================================
-- SECTION 6: METRIC DEFINITIONS SEED DATA
-- =====================================================
-- Requirements: 2.1, 2.2, 6.1, 6.2

INSERT INTO metric_definitions (
  metric_type,
  metric_category,
  display_name,
  description,
  unit,
  format_pattern,
  is_active
) VALUES
  -- Total Users Metric
  (
    'count',
    'users_total',
    'Total Users',
    'Total number of registered users on the platform as of this date',
    'users',
    '0,0',
    true
  ),
  
  -- Total Posts/Tracks Metric
  (
    'count',
    'posts_total',
    'Total Posts',
    'Total number of posts/tracks created on the platform as of this date',
    'posts',
    '0,0',
    true
  ),
  
  -- Total Comments Metric
  (
    'count',
    'comments_total',
    'Total Comments',
    'Total number of comments created on the platform as of this date',
    'comments',
    '0,0',
    true
  ),
  
  -- Posts Created (Daily) Metric
  (
    'count',
    'posts_created',
    'Posts Created',
    'Number of new posts/tracks created on this specific date',
    'posts',
    '0,0',
    true
  ),
  
  -- Comments Created (Daily) Metric
  (
    'count',
    'comments_created',
    'Comments Created',
    'Number of new comments created on this specific date',
    'comments',
    '0,0',
    true
  )
ON CONFLICT (metric_type, metric_category) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  format_pattern = EXCLUDED.format_pattern,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- SECTION 7: USAGE EXAMPLES AND DOCUMENTATION
-- =====================================================

-- Example 1: Collect metrics for today
-- SELECT * FROM collect_daily_metrics();

-- Example 2: Collect metrics for a specific date
-- SELECT * FROM collect_daily_metrics('2025-01-10');

-- Example 3: Backfill metrics for the last 30 days
-- SELECT * FROM backfill_daily_metrics(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);

-- Example 4: Query metrics for date range
-- SELECT metric_date, metric_category, value 
-- FROM daily_metrics 
-- WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
-- ORDER BY metric_date DESC, metric_category;

-- Example 5: Check collection status
-- SELECT * FROM metric_collection_log 
-- ORDER BY started_at DESC 
-- LIMIT 10;

-- Example 6: View metric definitions
-- SELECT * FROM metric_definitions WHERE is_active = true;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next Steps:
-- 1. Run backfill to populate historical data
-- 2. Set up automated collection (cron or Edge Function)
-- 3. Update analytics dashboard to use new tables
-- 4. Monitor collection logs for issues
-- =====================================================
