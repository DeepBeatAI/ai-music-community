-- =====================================================
-- RLS Policy Testing Script
-- Purpose: Validate Row Level Security policies for analytics tables
-- =====================================================

-- Test 1: Verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log')
ORDER BY tablename;

-- Expected: All three tables should have rls_enabled = true

-- Test 2: List all policies on daily_metrics
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'daily_metrics'
ORDER BY policyname;

-- Expected policies:
-- 1. "Anyone can view metrics" - SELECT - USING (true)
-- 2. "Service role can manage metrics" - ALL - USING (auth.jwt() ->> 'role' = 'service_role')

-- Test 3: List all policies on metric_definitions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'metric_definitions'
ORDER BY policyname;

-- Expected policies:
-- 1. "Anyone can view metric definitions" - SELECT - USING (true)
-- 2. "Service role can manage definitions" - ALL - USING (auth.jwt() ->> 'role' = 'service_role')

-- Test 4: List all policies on metric_collection_log
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'metric_collection_log'
ORDER BY policyname;

-- Expected policies:
-- 1. "Admins can view collection logs" - SELECT - checks profiles.is_admin = true
-- 2. "Service role can manage logs" - ALL - USING (auth.jwt() ->> 'role' = 'service_role')

-- Test 5: Verify public read access to daily_metrics
-- This should succeed (returns data or empty set)
SELECT COUNT(*) as metric_count FROM daily_metrics;

-- Test 6: Verify public read access to metric_definitions
-- This should succeed (returns data or empty set)
SELECT COUNT(*) as definition_count FROM metric_definitions;

-- Test 7: Summary of RLS configuration
SELECT 
  'RLS Configuration Summary' as test_name,
  COUNT(DISTINCT tablename) as tables_with_rls,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('daily_metrics', 'metric_definitions', 'metric_collection_log');

-- Expected: 3 tables with RLS, 6 total policies
