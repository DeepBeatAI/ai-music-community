-- Test file for edit tracking triggers
-- This file tests that updated_at triggers work correctly for posts and comments

-- ============================================================================
-- Test Setup
-- ============================================================================

-- Create a test user profile (if not exists)
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Insert test user profile if it doesn't exist
    INSERT INTO public.user_profiles (user_id, username, created_at)
    VALUES (test_user_id, 'test_edit_user', now())
    ON CONFLICT (user_id) DO NOTHING;
END $$;

-- ============================================================================
-- Test 1: Verify posts.updated_at column exists
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE EXCEPTION 'FAIL: posts.updated_at column does not exist';
    ELSE
        RAISE NOTICE 'PASS: posts.updated_at column exists';
    END IF;
END $$;

-- ============================================================================
-- Test 2: Verify comments table and updated_at column exist
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comments'
    ) THEN
        RAISE EXCEPTION 'FAIL: comments table does not exist';
    ELSE
        RAISE NOTICE 'PASS: comments table exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE EXCEPTION 'FAIL: comments.updated_at column does not exist';
    ELSE
        RAISE NOTICE 'PASS: comments.updated_at column exists';
    END IF;
END $$;

-- ============================================================================
-- Test 3: Verify trigger function exists
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
    ) THEN
        RAISE EXCEPTION 'FAIL: update_updated_at_column function does not exist';
    ELSE
        RAISE NOTICE 'PASS: update_updated_at_column function exists';
    END IF;
END $$;

-- ============================================================================
-- Test 4: Verify triggers exist
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_posts_updated_at'
    ) THEN
        RAISE EXCEPTION 'FAIL: update_posts_updated_at trigger does not exist';
    ELSE
        RAISE NOTICE 'PASS: update_posts_updated_at trigger exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_comments_updated_at'
    ) THEN
        RAISE EXCEPTION 'FAIL: update_comments_updated_at trigger does not exist';
    ELSE
        RAISE NOTICE 'PASS: update_comments_updated_at trigger exists';
    END IF;
END $$;

-- ============================================================================
-- Test 5: Test posts trigger functionality
-- ============================================================================

DO $$
DECLARE
    test_post_id UUID;
    initial_updated_at TIMESTAMP WITH TIME ZONE;
    new_updated_at TIMESTAMP WITH TIME ZONE;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Insert a test post
    INSERT INTO public.posts (user_id, content, post_type, created_at)
    VALUES (test_user_id, 'Test post for trigger', 'text', now())
    RETURNING id, updated_at INTO test_post_id, initial_updated_at;

    RAISE NOTICE 'Created test post with id: % at %', test_post_id, initial_updated_at;

    -- Wait a moment to ensure timestamp difference
    PERFORM pg_sleep(0.1);

    -- Update the post
    UPDATE public.posts 
    SET content = 'Updated test post content'
    WHERE id = test_post_id
    RETURNING updated_at INTO new_updated_at;

    RAISE NOTICE 'Updated post, new updated_at: %', new_updated_at;

    -- Verify updated_at changed
    IF new_updated_at > initial_updated_at THEN
        RAISE NOTICE 'PASS: posts.updated_at trigger works correctly (% > %)', new_updated_at, initial_updated_at;
    ELSE
        RAISE EXCEPTION 'FAIL: posts.updated_at trigger did not update timestamp (% <= %)', new_updated_at, initial_updated_at;
    END IF;

    -- Cleanup
    DELETE FROM public.posts WHERE id = test_post_id;
    RAISE NOTICE 'Cleaned up test post';
END $$;

-- ============================================================================
-- Test 6: Test comments trigger functionality
-- ============================================================================

DO $$
DECLARE
    test_post_id UUID;
    test_comment_id UUID;
    initial_updated_at TIMESTAMP WITH TIME ZONE;
    new_updated_at TIMESTAMP WITH TIME ZONE;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Insert a test post first
    INSERT INTO public.posts (user_id, content, post_type, created_at)
    VALUES (test_user_id, 'Test post for comment trigger', 'text', now())
    RETURNING id INTO test_post_id;

    -- Insert a test comment
    INSERT INTO public.comments (post_id, user_id, content, created_at)
    VALUES (test_post_id, test_user_id, 'Test comment for trigger', now())
    RETURNING id, updated_at INTO test_comment_id, initial_updated_at;

    RAISE NOTICE 'Created test comment with id: % at %', test_comment_id, initial_updated_at;

    -- Wait a moment to ensure timestamp difference
    PERFORM pg_sleep(0.1);

    -- Update the comment
    UPDATE public.comments 
    SET content = 'Updated test comment content'
    WHERE id = test_comment_id
    RETURNING updated_at INTO new_updated_at;

    RAISE NOTICE 'Updated comment, new updated_at: %', new_updated_at;

    -- Verify updated_at changed
    IF new_updated_at > initial_updated_at THEN
        RAISE NOTICE 'PASS: comments.updated_at trigger works correctly (% > %)', new_updated_at, initial_updated_at;
    ELSE
        RAISE EXCEPTION 'FAIL: comments.updated_at trigger did not update timestamp (% <= %)', new_updated_at, initial_updated_at;
    END IF;

    -- Cleanup
    DELETE FROM public.comments WHERE id = test_comment_id;
    DELETE FROM public.posts WHERE id = test_post_id;
    RAISE NOTICE 'Cleaned up test comment and post';
END $$;

-- ============================================================================
-- Test 7: Verify RLS policies for comments
-- ============================================================================

DO $$
BEGIN
    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'comments' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'FAIL: RLS is not enabled on comments table';
    ELSE
        RAISE NOTICE 'PASS: RLS is enabled on comments table';
    END IF;

    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'comments'
    ) THEN
        RAISE EXCEPTION 'FAIL: No RLS policies found for comments table';
    ELSE
        RAISE NOTICE 'PASS: RLS policies exist for comments table';
    END IF;
END $$;

-- ============================================================================
-- Test Summary
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Edit Tracking Migration Tests Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All tests passed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Verified:';
    RAISE NOTICE '  ✓ posts.updated_at column exists';
    RAISE NOTICE '  ✓ comments table and updated_at column exist';
    RAISE NOTICE '  ✓ Trigger function exists';
    RAISE NOTICE '  ✓ Triggers exist for both tables';
    RAISE NOTICE '  ✓ posts trigger updates timestamp on UPDATE';
    RAISE NOTICE '  ✓ comments trigger updates timestamp on UPDATE';
    RAISE NOTICE '  ✓ RLS enabled and policies configured';
END $$;
