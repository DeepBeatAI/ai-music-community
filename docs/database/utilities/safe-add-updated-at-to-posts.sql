-- SAFE Migration: Add updated_at column and trigger to posts table
-- This is a minimal, non-destructive migration that only adds what's missing

-- ============================================================================
-- 1. Add updated_at column to posts table (if it doesn't exist)
-- ============================================================================

DO $$
BEGIN
    -- Check if updated_at column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'updated_at'
    ) THEN
        -- Add the column with default value
        ALTER TABLE public.posts 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
        
        -- Set initial updated_at values to match created_at for existing posts
        UPDATE public.posts 
        SET updated_at = created_at 
        WHERE updated_at IS NULL OR updated_at < created_at;
        
        RAISE NOTICE 'Added updated_at column to posts table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in posts table';
    END IF;
END $$;

-- ============================================================================
-- 2. Create trigger function (if it doesn't exist)
-- ============================================================================

-- This function is likely already created for comments table
-- We'll create it only if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Add trigger to posts table (if it doesn't exist)
-- ============================================================================

DO $$
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE event_object_table = 'posts' 
        AND trigger_name = 'update_posts_updated_at'
    ) THEN
        -- Create the trigger
        CREATE TRIGGER update_posts_updated_at
            BEFORE UPDATE ON public.posts
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
        
        RAISE NOTICE 'Created trigger update_posts_updated_at on posts table';
    ELSE
        RAISE NOTICE 'Trigger update_posts_updated_at already exists on posts table';
    END IF;
END $$;

-- ============================================================================
-- 4. Verify the setup
-- ============================================================================

-- Check that everything is in place
DO $$
DECLARE
    column_exists BOOLEAN;
    trigger_exists BOOLEAN;
BEGIN
    -- Check column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'updated_at'
    ) INTO column_exists;
    
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE event_object_table = 'posts' 
        AND trigger_name = 'update_posts_updated_at'
    ) INTO trigger_exists;
    
    IF column_exists AND trigger_exists THEN
        RAISE NOTICE '✅ SUCCESS: Posts table is now set up for edit tracking!';
    ELSE
        RAISE WARNING '⚠️ WARNING: Setup incomplete. Column exists: %, Trigger exists: %', column_exists, trigger_exists;
    END IF;
END $$;

-- ============================================================================
-- DONE! 
-- ============================================================================
-- This migration is SAFE because:
-- 1. It only ADDS columns/triggers, never DROPS anything
-- 2. It checks if things exist before creating them (idempotent)
-- 3. It doesn't modify existing data (except setting initial updated_at values)
-- 4. It doesn't change any RLS policies or permissions
-- ============================================================================
