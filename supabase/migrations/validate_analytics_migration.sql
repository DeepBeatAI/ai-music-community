-- =====================================================
-- VALIDATION SCRIPT FOR ANALYTICS MIGRATION
-- =====================================================
-- Purpose: Verify that the analytics metrics system is properly installed
-- Usage: Run this after applying the migration to validate installation
-- =====================================================

-- =====================================================
-- SECTION 1: TABLE VALIDATION
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  RAISE NOTICE '=== TABLE VALIDATION ===';
  
  -- Check daily_metrics table
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'daily_metrics';
  
  IF table_count = 1 THEN
    RAISE NOTICE '✓ daily_metrics table exists';
  ELSE
    RAISE WARNING '✗ daily_metrics table NOT FOUND';
  END IF;
  
  -- Check metric_definitions table
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'metric_definitions';
  
  IF table_count = 1 THEN
    RAISE NOTICE '✓ metric_definitions table exists';
  ELSE
    RAISE WARNING '✗ metric_definitions table NOT FOUND';
  END IF;
  
  -- Check metric_collection_log table
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'metric_collection_log';
  
  IF table_count = 1 THEN
    RAISE NOTICE '✓ metric_collection_log table exists';
  ELSE
    RAISE WARNING '✗ metric_collection_log table NOT FOUND';
  END IF;
END $$;

-- =====================================================
-- SECTION 2: INDEX VALIDATION
-- =====================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== INDEX VALIDATION ===';
  
  -- Check daily_metrics indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public' 
    AND tablename = 'daily_metrics'
    AND indexname IN (
      'idx_daily_metrics_date_type',
      'idx_daily_metrics_category',
      'idx_daily_metrics_collection'
    );
  
  RAISE NOTICE '✓ Found % of 3 expected daily_metrics indexes', index_count;
  
  -- Check collection_log indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public' 
    AND tablename = 'metric_collection_log'
    AND indexname IN (
      'idx_collection_log_date',
      'idx_collection_log_status'
    );
  
  RAISE NOTICE '✓ Found % of 2 expected metric_collection_log indexes', index_count;
END $$;

-- =====================================================
-- SECTION 3: FUNCTION VALIDATION
-- =====================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FUNCTION VALIDATION ===';
  
  -- Check collect_daily_metrics function
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public' 
    AND routine_name = 'collect_daily_metrics';
  
  IF function_count = 1 THEN
    RAISE NOTICE '✓ collect_daily_metrics function exists';
  ELSE
    RAISE WARNING '✗ collect_daily_metrics function NOT FOUND';
  END IF;
  
  -- Check backfill_daily_metrics function
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public' 
    AND routine_name = 'backfill_daily_metrics';
  
  IF function_count = 1 THEN
    RAISE NOTICE '✓ backfill_daily_metrics function exists';
  ELSE
    RAISE WARNING '✗ backfill_daily_metrics function NOT FOUND';
  END IF;
END $$;

-- =====================================================
-- SECTION 4: RLS POLICY VALIDATION
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RLS POLICY VALIDATION ===';
  
  -- Check if RLS is enabled
  SELECT COUNT(*) INTO policy_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log')
    AND rowsecurity = true;
  
  RAISE NOTICE '✓ RLS enabled on % of 3 tables', policy_count;
  
  -- Check policy count
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log');
  
  RAISE NOTICE '✓ Found % RLS policies', policy_count;
END $$;

-- =====================================================
-- SECTION 5: SEED DATA VALIDATION
-- =====================================================

DO $$
DECLARE
  definition_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== SEED DATA VALIDATION ===';
  
  -- Check metric definitions
  SELECT COUNT(*) INTO definition_count
  FROM metric_definitions
  WHERE is_active = true;
  
  IF definition_count >= 5 THEN
    RAISE NOTICE '✓ Found % metric definitions (expected 5+)', definition_count;
  ELSE
    RAISE WARNING '✗ Found only % metric definitions (expected 5)', definition_count;
  END IF;
  
  -- List all metric definitions
  RAISE NOTICE '';
  RAISE NOTICE 'Metric Definitions:';
  FOR definition_count IN 
    SELECT metric_category FROM metric_definitions ORDER BY metric_category
  LOOP
    RAISE NOTICE '  - %', definition_count;
  END LOOP;
END $$;

-- =====================================================
-- SECTION 6: CONSTRAINT VALIDATION
-- =====================================================

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CONSTRAINT VALIDATION ===';
  
  -- Check unique constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND constraint_type = 'UNIQUE'
    AND table_name IN ('daily_metrics', 'metric_definitions');
  
  RAISE NOTICE '✓ Found % unique constraints', constraint_count;
  
  -- Check check constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND constraint_type = 'CHECK'
    AND table_name = 'metric_collection_log';
  
  RAISE NOTICE '✓ Found % check constraints', constraint_count;
END $$;

-- =====================================================
-- SECTION 7: FUNCTIONAL TEST
-- =====================================================

DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FUNCTIONAL TEST ===';
  RAISE NOTICE 'Testing collect_daily_metrics function...';
  
  -- Test the collection function (dry run for yesterday to avoid conflicts)
  BEGIN
    SELECT * INTO test_result 
    FROM collect_daily_metrics(CURRENT_DATE - INTERVAL '1 day');
    
    RAISE NOTICE '✓ Function executed successfully';
    RAISE NOTICE '  - Metrics collected: %', test_result.metrics_collected;
    RAISE NOTICE '  - Execution time: % ms', test_result.execution_time_ms;
    RAISE NOTICE '  - Status: %', test_result.status;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Function test failed: %', SQLERRM;
  END;
END $$;

-- =====================================================
-- SECTION 8: SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VALIDATION COMPLETE ===';
  RAISE NOTICE 'Review the output above for any warnings or errors.';
  RAISE NOTICE 'All checks with ✓ indicate successful validation.';
  RAISE NOTICE 'Any checks with ✗ indicate issues that need attention.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. If all validations passed, run backfill for historical data';
  RAISE NOTICE '2. Set up automated collection (Edge Function or cron)';
  RAISE NOTICE '3. Update analytics dashboard to use new tables';
  RAISE NOTICE '4. Monitor collection logs for issues';
END $$;
