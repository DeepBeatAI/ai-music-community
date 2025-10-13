-- Test script to validate analytics metrics schema
-- This script tests that all tables, constraints, and indexes were created correctly

-- Test 1: Verify tables exist
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'daily_metrics'
  )), 'daily_metrics table should exist';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'metric_definitions'
  )), 'metric_definitions table should exist';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'metric_collection_log'
  )), 'metric_collection_log table should exist';
  
  RAISE NOTICE 'Test 1 PASSED: All tables exist';
END $$;

-- Test 2: Verify unique constraints
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'unique_daily_metric'
  )), 'unique_daily_metric constraint should exist';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'unique_metric_definition'
  )), 'unique_metric_definition constraint should exist';
  
  RAISE NOTICE 'Test 2 PASSED: Unique constraints exist';
END $$;

-- Test 3: Verify indexes exist
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT FROM pg_indexes 
    WHERE indexname = 'idx_daily_metrics_date_type'
  )), 'idx_daily_metrics_date_type index should exist';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM pg_indexes 
    WHERE indexname = 'idx_daily_metrics_category'
  )), 'idx_daily_metrics_category index should exist';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM pg_indexes 
    WHERE indexname = 'idx_daily_metrics_collection'
  )), 'idx_daily_metrics_collection index should exist';
  
  RAISE NOTICE 'Test 3 PASSED: All indexes exist';
END $$;

-- Test 4: Verify RLS is enabled
DO $$
BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'daily_metrics'), 
    'RLS should be enabled on daily_metrics';
  
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'metric_definitions'), 
    'RLS should be enabled on metric_definitions';
  
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'metric_collection_log'), 
    'RLS should be enabled on metric_collection_log';
  
  RAISE NOTICE 'Test 4 PASSED: RLS enabled on all tables';
END $$;

-- Test 5: Test inserting sample data (should work with service role)
INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
VALUES ('2025-01-10', 'count', 'users_total', 100)
ON CONFLICT (metric_date, metric_type, metric_category) DO NOTHING;

INSERT INTO metric_definitions (metric_type, metric_category, display_name, unit)
VALUES ('count', 'users_total', 'Total Users', 'count')
ON CONFLICT (metric_type, metric_category) DO NOTHING;

INSERT INTO metric_collection_log (collection_date, started_at, status)
VALUES ('2025-01-10', NOW(), 'completed');

-- Test 6: Verify data was inserted
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM daily_metrics) > 0, 
    'Should have at least one metric record';
  
  ASSERT (SELECT COUNT(*) FROM metric_definitions) > 0, 
    'Should have at least one metric definition';
  
  ASSERT (SELECT COUNT(*) FROM metric_collection_log) > 0, 
    'Should have at least one collection log entry';
  
  RAISE NOTICE 'Test 5 & 6 PASSED: Data insertion and retrieval works';
END $$;

-- Test 7: Verify unique constraint works (should fail on duplicate)
DO $$
BEGIN
  BEGIN
    INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
    VALUES ('2025-01-10', 'count', 'users_total', 200);
    
    RAISE EXCEPTION 'Should have failed due to unique constraint';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'Test 7 PASSED: Unique constraint prevents duplicates';
  END;
END $$;

-- Test 8: Verify check constraint on status
DO $$
BEGIN
  BEGIN
    INSERT INTO metric_collection_log (collection_date, started_at, status)
    VALUES ('2025-01-11', NOW(), 'invalid_status');
    
    RAISE EXCEPTION 'Should have failed due to check constraint';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'Test 8 PASSED: Check constraint validates status values';
  END;
END $$;

-- Cleanup test data
DELETE FROM daily_metrics WHERE metric_date = '2025-01-10';
DELETE FROM metric_definitions WHERE metric_category = 'users_total';
DELETE FROM metric_collection_log WHERE collection_date IN ('2025-01-10', '2025-01-11');

RAISE NOTICE '===========================================';
RAISE NOTICE 'ALL TESTS PASSED: Schema is correctly created';
RAISE NOTICE '===========================================';
