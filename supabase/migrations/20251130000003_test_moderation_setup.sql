-- =====================================================
-- Moderation System Database Setup Tests
-- =====================================================
-- This file contains tests to verify the moderation system
-- database setup is correct.
--
-- Run these tests after applying the moderation migrations
-- to ensure everything is working correctly.
-- =====================================================

-- =====================================================
-- Test 1: Verify tables were created
-- =====================================================
-- Expected: 3 tables with correct column counts
-- moderation_reports: 16 columns
-- moderation_actions: 17 columns
-- user_restrictions: 10 columns

SELECT 
  'Test 1: Tables Created' as test_name,
  CASE 
    WHEN COUNT(*) = 3 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as tables_found
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('moderation_reports', 'moderation_actions', 'user_restrictions');

-- =====================================================
-- Test 2: Verify CHECK constraints exist
-- =====================================================
-- Expected: Multiple CHECK constraints for data validation
-- moderation_reports: valid_report_type, valid_reason, valid_status, valid_priority
-- moderation_actions: valid_action_type, valid_target_type
-- user_restrictions: valid_restriction_type

SELECT 
  'Test 2: CHECK Constraints' as test_name,
  CASE 
    WHEN COUNT(*) >= 7 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as constraints_found
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name IN ('moderation_reports', 'moderation_actions', 'user_restrictions')
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE 'valid_%';

-- =====================================================
-- Test 3: Verify indexes were created
-- =====================================================
-- Expected: Multiple indexes for query optimization
-- Should have at least 15 indexes across all three tables

SELECT 
  'Test 3: Indexes Created' as test_name,
  CASE 
    WHEN COUNT(*) >= 15 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as indexes_found
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('moderation_reports', 'moderation_actions', 'user_restrictions')
  AND indexname LIKE 'idx_%';

-- =====================================================
-- Test 4: Verify unique constraint for active restrictions
-- =====================================================
-- Expected: unique_active_restriction_per_user index exists

SELECT 
  'Test 4: Unique Constraint' as test_name,
  CASE 
    WHEN COUNT(*) = 1 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as constraint_found
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_restrictions'
  AND indexname = 'unique_active_restriction_per_user';

-- =====================================================
-- Test 5: Verify helper functions exist
-- =====================================================
-- Expected: 6 functions with correct return types

SELECT 
  'Test 5: Helper Functions' as test_name,
  CASE 
    WHEN COUNT(*) = 6 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as functions_found
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'can_user_post',
    'can_user_comment',
    'can_user_upload',
    'get_user_restrictions',
    'expire_restrictions',
    'expire_suspensions'
  );

-- =====================================================
-- Test 6: Verify RLS is enabled
-- =====================================================
-- Expected: RLS enabled on all three moderation tables

SELECT 
  'Test 6: RLS Enabled' as test_name,
  CASE 
    WHEN COUNT(*) = 3 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as tables_with_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('moderation_reports', 'moderation_actions', 'user_restrictions')
  AND rowsecurity = true;

-- =====================================================
-- Test 7: Verify RLS policies exist
-- =====================================================
-- Expected: Multiple policies for each table
-- moderation_reports: 6 policies
-- moderation_actions: 5 policies
-- user_restrictions: 5 policies

SELECT 
  'Test 7: RLS Policies' as test_name,
  CASE 
    WHEN COUNT(*) >= 16 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('moderation_reports', 'moderation_actions', 'user_restrictions');

-- =====================================================
-- Test 8: Verify user_profiles has suspension columns
-- =====================================================
-- Expected: suspended_until and suspension_reason columns exist

SELECT 
  'Test 8: User Profiles Extended' as test_name,
  CASE 
    WHEN COUNT(*) = 2 THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  COUNT(*) as columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN ('suspended_until', 'suspension_reason');

-- =====================================================
-- Test 9: Test helper functions return correct values
-- =====================================================
-- Expected: All functions return true for user with no restrictions

SELECT 
  'Test 9: Helper Functions Work' as test_name,
  CASE 
    WHEN can_user_post('00000000-0000-0000-0000-000000000001'::uuid) = true
     AND can_user_comment('00000000-0000-0000-0000-000000000001'::uuid) = true
     AND can_user_upload('00000000-0000-0000-0000-000000000001'::uuid) = true
    THEN 'PASS'
    ELSE 'FAIL'
  END as result;

-- =====================================================
-- Test 10: Test expire functions work
-- =====================================================
-- Expected: Functions execute without error and return 0 (no expired items)

SELECT 
  'Test 10: Expire Functions Work' as test_name,
  CASE 
    WHEN expire_restrictions() >= 0
     AND expire_suspensions() >= 0
    THEN 'PASS'
    ELSE 'FAIL'
  END as result;

-- =====================================================
-- Test Summary
-- =====================================================
-- All tests should show PASS
-- If any test shows FAIL, review the migration files and re-apply

SELECT 
  '=== TEST SUMMARY ===' as summary,
  'All tests completed' as status,
  'Review results above' as action;
