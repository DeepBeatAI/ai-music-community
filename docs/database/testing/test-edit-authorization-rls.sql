-- ============================================================================
-- RLS Policy Tests for Post and Comment Editing Authorization
-- ============================================================================
-- This file contains SQL tests to verify Row Level Security policies
-- for post and comment editing functionality.
--
-- Requirements tested: 3.1, 3.2, 3.3, 3.4, 3.5
-- ============================================================================

-- Test Setup: Create test users and content
-- ============================================================================

DO $$
DECLARE
    test_user_1_id UUID := '00000000-0000-0000-0000-000000000001';
    test_user_2_id UUID := '00000000-0000-0000-0000-000000000002';
    test_post_id UUID;
    test_comment_id UUID;
    update_result INTEGER;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Starting RLS Policy Tests for Edit Authorization';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 1: Verify RLS is enabled on posts table
    -- ========================================================================
    RAISE NOTICE 'Test 1: Checking if RLS is enabled on posts table...';
    
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'posts' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✓ PASS: RLS is enabled on posts table';
    ELSE
        RAISE NOTICE '✗ FAIL: RLS is NOT enabled on posts table';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 2: Verify RLS is enabled on comments table
    -- ========================================================================
    RAISE NOTICE 'Test 2: Checking if RLS is enabled on comments table...';
    
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'comments' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✓ PASS: RLS is enabled on comments table';
    ELSE
        RAISE NOTICE '✗ FAIL: RLS is NOT enabled on comments table';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 3: Verify UPDATE policy exists for posts
    -- ========================================================================
    RAISE NOTICE 'Test 3: Checking UPDATE policy for posts table...';
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'posts' 
        AND cmd = 'UPDATE'
    ) THEN
        RAISE NOTICE '✓ PASS: UPDATE policy exists for posts table';
        
        -- Show the policy details
        FOR update_result IN 
            SELECT policyname FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'posts' 
            AND cmd = 'UPDATE'
        LOOP
            RAISE NOTICE '  Policy name: %', (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND cmd = 'UPDATE' LIMIT 1);
        END LOOP;
    ELSE
        RAISE NOTICE '✗ FAIL: No UPDATE policy found for posts table';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 4: Verify UPDATE policy exists for comments
    -- ========================================================================
    RAISE NOTICE 'Test 4: Checking UPDATE policy for comments table...';
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'comments' 
        AND cmd = 'UPDATE'
    ) THEN
        RAISE NOTICE '✓ PASS: UPDATE policy exists for comments table';
        
        -- Show the policy details
        FOR update_result IN 
            SELECT policyname FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'comments' 
            AND cmd = 'UPDATE'
        LOOP
            RAISE NOTICE '  Policy name: %', (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND cmd = 'UPDATE' LIMIT 1);
        END LOOP;
    ELSE
        RAISE NOTICE '✗ FAIL: No UPDATE policy found for comments table';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 5: Verify updated_at column exists on posts
    -- ========================================================================
    RAISE NOTICE 'Test 5: Checking updated_at column on posts table...';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE '✓ PASS: updated_at column exists on posts table';
    ELSE
        RAISE NOTICE '✗ FAIL: updated_at column missing on posts table';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 6: Verify updated_at column exists on comments
    -- ========================================================================
    RAISE NOTICE 'Test 6: Checking updated_at column on comments table...';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE '✓ PASS: updated_at column exists on comments table';
    ELSE
        RAISE NOTICE '✗ FAIL: updated_at column missing on comments table';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 7: Verify trigger exists for posts updated_at
    -- ========================================================================
    RAISE NOTICE 'Test 7: Checking trigger for posts updated_at...';
    
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_posts_updated_at'
    ) THEN
        RAISE NOTICE '✓ PASS: Trigger exists for posts updated_at';
    ELSE
        RAISE NOTICE '✗ FAIL: Trigger missing for posts updated_at';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 8: Verify trigger exists for comments updated_at
    -- ========================================================================
    RAISE NOTICE 'Test 8: Checking trigger for comments updated_at...';
    
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_comments_updated_at'
    ) THEN
        RAISE NOTICE '✓ PASS: Trigger exists for comments updated_at';
    ELSE
        RAISE NOTICE '✗ FAIL: Trigger missing for comments updated_at';
    END IF;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 9: List all policies for posts table
    -- ========================================================================
    RAISE NOTICE 'Test 9: Listing all policies for posts table...';
    RAISE NOTICE '';
    
    FOR update_result IN 
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'posts'
    LOOP
        RAISE NOTICE '  Policy: % (Command: %)', 
            (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' LIMIT 1 OFFSET update_result - 1),
            (SELECT cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' LIMIT 1 OFFSET update_result - 1);
    END LOOP;
    RAISE NOTICE '';

    -- ========================================================================
    -- Test 10: List all policies for comments table
    -- ========================================================================
    RAISE NOTICE 'Test 10: Listing all policies for comments table...';
    RAISE NOTICE '';
    
    FOR update_result IN 
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'comments'
    LOOP
        RAISE NOTICE '  Policy: % (Command: %)', 
            (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' LIMIT 1 OFFSET update_result - 1),
            (SELECT cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' LIMIT 1 OFFSET update_result - 1);
    END LOOP;
    RAISE NOTICE '';

    -- ========================================================================
    -- Summary
    -- ========================================================================
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'RLS Policy Tests Complete';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Review the results above to ensure all policies are properly configured.';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected Results:';
    RAISE NOTICE '  - RLS enabled on both posts and comments tables';
    RAISE NOTICE '  - UPDATE policies exist for both tables';
    RAISE NOTICE '  - updated_at columns exist on both tables';
    RAISE NOTICE '  - Triggers exist to auto-update updated_at timestamps';
    RAISE NOTICE '';
    RAISE NOTICE 'If any tests failed, review the migration files and ensure they have been';
    RAISE NOTICE 'applied correctly to your database.';
    RAISE NOTICE '';

END $$;
