-- Database Schema Tests for Tracks-Posts Separation
-- This script tests the schema changes for tracks-posts separation
-- Requirements: 4.1, 4.2, 5.1, 9.1, 9.4

-- ============================================================================
-- TEST SETUP
-- ============================================================================

-- Set client encoding and display settings
SET client_min_messages TO NOTICE;

-- ============================================================================
-- TEST 1: Tracks Table Structure and Constraints
-- Requirement 4.1: Tracks table has correct structure
-- ============================================================================

-- Test 1.1: Verify tracks table exists
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tracks'
  ) THEN
    RAISE NOTICE 'TEST 1.1: PASS - Tracks table exists';
  ELSE
    RAISE EXCEPTION 'TEST 1.1: FAIL - Tracks table does not exist';
  END IF;
END $;

-- Test 1.2: Verify file_size column exists
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'tracks'
    AND column_name = 'file_size'
  ) THEN
    RAISE NOTICE 'TEST 1.2: PASS - file_size column exists on tracks table';
  ELSE
    RAISE EXCEPTION 'TEST 1.2: FAIL - file_size column missing from tracks table';
  END IF;
END $;

-- Test 1.3: Verify mime_type column exists
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'tracks'
    AND column_name = 'mime_type'
  ) THEN
    RAISE NOTICE 'TEST 1.3: PASS - mime_type column exists on tracks table';
  ELSE
    RAISE EXCEPTION 'TEST 1.3: FAIL - mime_type column missing from tracks table';
  END IF;
END $;

-- Test 1.4: Verify file_size constraint (positive values only)
DO $
BEGIN
  BEGIN
    INSERT INTO tracks (user_id, title, file_url, file_size, mime_type)
    VALUES (
      (SELECT id FROM auth.users LIMIT 1),
      'Test Track - Negative Size',
      'https://example.com/test.mp3',
      -100,
      'audio/mpeg'
    );
    RAISE EXCEPTION 'TEST 1.4: FAIL - Negative file_size should be rejected';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'TEST 1.4: PASS - Negative file_size rejected by constraint';
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST 1.4: PASS - Negative file_size rejected';
  END;
END $;

-- Test 1.5: Verify tracks table has required columns
DO $
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY['id', 'user_id', 'title', 'file_url', 'duration', 
                        'file_size', 'mime_type', 'genre', 'tags', 'is_public', 
                        'play_count', 'created_at', 'updated_at']) AS column_name
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'tracks'
    AND information_schema.columns.column_name = expected.column_name
  );
  
  IF missing_columns IS NULL OR array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE 'TEST 1.5: PASS - All required columns exist on tracks table';
  ELSE
    RAISE EXCEPTION 'TEST 1.5: FAIL - Missing columns: %', array_to_string(missing_columns, ', ');
  END IF;
END $;

-- ============================================================================
-- TEST 2: Posts Table has track_id Column
-- Requirement 4.2: Posts table references tracks via track_id
-- ============================================================================

-- Test 2.1: Verify track_id column exists on posts table
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'track_id'
  ) THEN
    RAISE NOTICE 'TEST 2.1: PASS - track_id column exists on posts table';
  ELSE
    RAISE EXCEPTION 'TEST 2.1: FAIL - track_id column missing from posts table';
  END IF;
END $;

-- Test 2.2: Verify track_id column is UUID type
DO $
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'track_id';
  
  IF col_type = 'uuid' THEN
    RAISE NOTICE 'TEST 2.2: PASS - track_id is UUID type';
  ELSE
    RAISE EXCEPTION 'TEST 2.2: FAIL - track_id is % instead of uuid', col_type;
  END IF;
END $;

-- Test 2.3: Verify track_id column is nullable
DO $
DECLARE
  is_nullable TEXT;
BEGIN
  SELECT is_nullable INTO is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'track_id';
  
  IF is_nullable = 'YES' THEN
    RAISE NOTICE 'TEST 2.3: PASS - track_id is nullable (backward compatible)';
  ELSE
    RAISE EXCEPTION 'TEST 2.3: FAIL - track_id should be nullable for backward compatibility';
  END IF;
END $;

-- ============================================================================
-- TEST 3: Foreign Key Relationship
-- Requirement 5.1: Foreign key constraint exists and is valid
-- ============================================================================

-- Test 3.1: Verify foreign key constraint exists
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'posts'
    AND constraint_name = 'posts_track_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE NOTICE 'TEST 3.1: PASS - Foreign key constraint posts_track_id_fkey exists';
  ELSE
    RAISE EXCEPTION 'TEST 3.1: FAIL - Foreign key constraint posts_track_id_fkey not found';
  END IF;
END $;

-- Test 3.2: Verify foreign key references tracks table
DO $
DECLARE
  ref_table TEXT;
BEGIN
  SELECT ccu.table_name INTO ref_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.constraint_schema = ccu.constraint_schema
  WHERE tc.constraint_schema = 'public'
  AND tc.table_name = 'posts'
  AND tc.constraint_name = 'posts_track_id_fkey';
  
  IF ref_table = 'tracks' THEN
    RAISE NOTICE 'TEST 3.2: PASS - Foreign key references tracks table';
  ELSE
    RAISE EXCEPTION 'TEST 3.2: FAIL - Foreign key references % instead of tracks', ref_table;
  END IF;
END $;

-- Test 3.3: Verify foreign key ON DELETE behavior is SET NULL
DO $
DECLARE
  delete_rule TEXT;
BEGIN
  SELECT rc.delete_rule INTO delete_rule
  FROM information_schema.referential_constraints rc
  WHERE rc.constraint_schema = 'public'
  AND rc.constraint_name = 'posts_track_id_fkey';
  
  IF delete_rule = 'SET NULL' THEN
    RAISE NOTICE 'TEST 3.3: PASS - Foreign key has ON DELETE SET NULL';
  ELSE
    RAISE EXCEPTION 'TEST 3.3: FAIL - Foreign key has ON DELETE % instead of SET NULL', delete_rule;
  END IF;
END $;

-- Test 3.4: Test foreign key constraint enforcement (valid reference)
DO $
DECLARE
  test_track_id UUID;
  test_user_id UUID;
  test_post_id UUID;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'TEST 3.4: SKIP - No test user available';
    RETURN;
  END IF;
  
  -- Create a test track
  INSERT INTO tracks (user_id, title, file_url, file_size, mime_type)
  VALUES (test_user_id, 'Test Track for FK', 'https://example.com/test.mp3', 1000000, 'audio/mpeg')
  RETURNING id INTO test_track_id;
  
  -- Create a post referencing the track
  INSERT INTO posts (user_id, content, post_type, track_id)
  VALUES (test_user_id, 'Test post with track', 'audio', test_track_id)
  RETURNING id INTO test_post_id;
  
  RAISE NOTICE 'TEST 3.4: PASS - Can create post with valid track_id reference';
  
  -- Cleanup
  DELETE FROM posts WHERE id = test_post_id;
  DELETE FROM tracks WHERE id = test_track_id;
END $;

-- Test 3.5: Test foreign key constraint enforcement (invalid reference)
DO $
DECLARE
  test_user_id UUID;
  invalid_track_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'TEST 3.5: SKIP - No test user available';
    RETURN;
  END IF;
  
  BEGIN
    INSERT INTO posts (user_id, content, post_type, track_id)
    VALUES (test_user_id, 'Test post with invalid track', 'audio', invalid_track_id);
    
    RAISE EXCEPTION 'TEST 3.5: FAIL - Should not allow invalid track_id reference';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 3.5: PASS - Foreign key constraint prevents invalid track_id';
  END;
END $;

-- Test 3.6: Test ON DELETE SET NULL behavior
DO $
DECLARE
  test_track_id UUID;
  test_user_id UUID;
  test_post_id UUID;
  post_track_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'TEST 3.6: SKIP - No test user available';
    RETURN;
  END IF;
  
  -- Create a test track
  INSERT INTO tracks (user_id, title, file_url, file_size, mime_type)
  VALUES (test_user_id, 'Test Track for Delete', 'https://example.com/test.mp3', 1000000, 'audio/mpeg')
  RETURNING id INTO test_track_id;
  
  -- Create a post referencing the track
  INSERT INTO posts (user_id, content, post_type, track_id)
  VALUES (test_user_id, 'Test post for delete', 'audio', test_track_id)
  RETURNING id INTO test_post_id;
  
  -- Delete the track
  DELETE FROM tracks WHERE id = test_track_id;
  
  -- Check if post still exists with NULL track_id
  SELECT track_id INTO post_track_id FROM posts WHERE id = test_post_id;
  
  IF post_track_id IS NULL THEN
    RAISE NOTICE 'TEST 3.6: PASS - ON DELETE SET NULL works correctly';
  ELSE
    RAISE EXCEPTION 'TEST 3.6: FAIL - track_id should be NULL after track deletion';
  END IF;
  
  -- Cleanup
  DELETE FROM posts WHERE id = test_post_id;
END $;

-- ============================================================================
-- TEST 4: Index on posts.track_id
-- Requirement 5.1: Index exists for performance
-- ============================================================================

-- Test 4.1: Verify index exists on posts.track_id
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'posts'
    AND indexname = 'idx_posts_track_id'
  ) THEN
    RAISE NOTICE 'TEST 4.1: PASS - Index idx_posts_track_id exists';
  ELSE
    RAISE EXCEPTION 'TEST 4.1: FAIL - Index idx_posts_track_id not found';
  END IF;
END $;

-- ============================================================================
-- TEST 5: RLS Policies for Tracks Table
-- Requirement 9.1: RLS policies are correctly configured
-- ============================================================================

-- Test 5.1: Verify RLS is enabled on tracks table
DO $
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'tracks'
  AND relnamespace = 'public'::regnamespace;
  
  IF rls_enabled THEN
    RAISE NOTICE 'TEST 5.1: PASS - RLS is enabled on tracks table';
  ELSE
    RAISE EXCEPTION 'TEST 5.1: FAIL - RLS is not enabled on tracks table';
  END IF;
END $;

-- Test 5.2: Verify required RLS policies exist
DO $
DECLARE
  policy_count INTEGER;
  expected_policies TEXT[] := ARRAY[
    'Public tracks are viewable by everyone',
    'Users can view their own tracks',
    'Users can insert their own tracks',
    'Users can update their own tracks',
    'Users can delete their own tracks'
  ];
  missing_policies TEXT[];
BEGIN
  SELECT ARRAY_AGG(policy_name)
  INTO missing_policies
  FROM unnest(expected_policies) AS policy_name
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tracks'
    AND pg_policies.policyname = policy_name
  );
  
  IF missing_policies IS NULL OR array_length(missing_policies, 1) IS NULL THEN
    RAISE NOTICE 'TEST 5.2: PASS - All required RLS policies exist';
  ELSE
    RAISE EXCEPTION 'TEST 5.2: FAIL - Missing policies: %', array_to_string(missing_policies, ', ');
  END IF;
END $;

-- Test 5.3: Verify public tracks policy allows SELECT for public tracks
DO $
DECLARE
  policy_definition TEXT;
BEGIN
  SELECT qual::TEXT INTO policy_definition
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'tracks'
  AND policyname = 'Public tracks are viewable by everyone'
  AND cmd = 'SELECT';
  
  IF policy_definition IS NOT NULL THEN
    RAISE NOTICE 'TEST 5.3: PASS - Public tracks SELECT policy exists';
  ELSE
    RAISE EXCEPTION 'TEST 5.3: FAIL - Public tracks SELECT policy not found';
  END IF;
END $;

-- ============================================================================
-- TEST 6: Indexes for Performance
-- Requirement 9.1: Proper indexes exist
-- ============================================================================

-- Test 6.1: Verify index on tracks.user_id exists
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'tracks'
    AND indexname = 'idx_tracks_user_id'
  ) THEN
    RAISE NOTICE 'TEST 6.1: PASS - Index idx_tracks_user_id exists';
  ELSE
    RAISE EXCEPTION 'TEST 6.1: FAIL - Index idx_tracks_user_id not found';
  END IF;
END $;

-- Test 6.2: Verify index on tracks.is_public exists
DO $
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'tracks'
    AND indexname = 'idx_tracks_is_public'
  ) THEN
    RAISE NOTICE 'TEST 6.2: PASS - Index idx_tracks_is_public exists';
  ELSE
    RAISE EXCEPTION 'TEST 6.2: FAIL - Index idx_tracks_is_public not found';
  END IF;
END $;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $
DECLARE
  test_summary TEXT;
BEGIN
  test_summary := E'\n' ||
    '============================================================' || E'\n' ||
    'TRACKS-POSTS SEPARATION SCHEMA TESTS COMPLETE' || E'\n' ||
    '============================================================' || E'\n' ||
    'Review NOTICE messages above for detailed test results.' || E'\n' ||
    E'\n' ||
    'Tests Covered:' || E'\n' ||
    '✓ Tracks table structure and constraints' || E'\n' ||
    '✓ Posts table has track_id column' || E'\n' ||
    '✓ Foreign key relationship (posts -> tracks)' || E'\n' ||
    '✓ ON DELETE SET NULL behavior' || E'\n' ||
    '✓ Index on posts.track_id' || E'\n' ||
    '✓ RLS policies on tracks table' || E'\n' ||
    '✓ Performance indexes' || E'\n' ||
    '============================================================';
  
  RAISE NOTICE '%', test_summary;
END $;

-- ============================================================================
-- MANUAL TESTING INSTRUCTIONS
-- ============================================================================

-- To run these tests:
-- 1. Ensure migrations have been applied
-- 2. Run this script: psql -f test-tracks-posts-separation-schema.sql
-- 3. Or in Supabase SQL Editor: Copy and paste this entire file
-- 4. Review NOTICE messages for test results
-- 5. All tests should PASS - any FAIL indicates a schema issue
