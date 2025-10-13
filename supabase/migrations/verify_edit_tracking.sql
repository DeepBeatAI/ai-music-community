-- Verification script for edit tracking infrastructure
-- Run this in Supabase Studio SQL Editor to verify the migration

-- 1. Verify posts table exists with updated_at column
SELECT 
    'posts table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'posts' 
            AND column_name = 'updated_at'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 2. Verify comments table exists with updated_at column
SELECT 
    'comments table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'comments' 
            AND column_name = 'updated_at'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 3. Verify trigger function exists
SELECT 
    'trigger function' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'update_updated_at_column'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 4. Verify posts trigger exists
SELECT 
    'posts trigger' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'update_posts_updated_at'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 5. Verify comments trigger exists
SELECT 
    'comments trigger' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'update_comments_updated_at'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 6. Verify RLS is enabled on posts
SELECT 
    'posts RLS' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'posts' 
            AND rowsecurity = true
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 7. Verify RLS is enabled on comments
SELECT 
    'comments RLS' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'comments' 
            AND rowsecurity = true
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 8. Verify realtime is enabled for posts
SELECT 
    'posts realtime' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'posts'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- 9. Verify realtime is enabled for comments
SELECT 
    'comments realtime' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'comments'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;
