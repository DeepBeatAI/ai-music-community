-- Migration: Add edit tracking infrastructure for posts and comments
-- This migration adds updated_at columns and triggers to track content edits

-- ============================================================================
-- 1. Create posts table if it doesn't exist and add updated_at column
-- ============================================================================

-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'text' NOT NULL,
    audio_url TEXT,
    audio_filename TEXT,
    audio_mime_type TEXT,
    audio_file_size INTEGER,
    audio_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0),
    CONSTRAINT valid_post_type CHECK (post_type IN ('text', 'audio'))
);

-- Add updated_at column to posts table if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'posts' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.posts 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- Set initial updated_at values to match created_at for existing posts
UPDATE public.posts 
SET updated_at = created_at 
WHERE updated_at IS NULL OR updated_at < created_at;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);

-- ============================================================================
-- 2. Create comments table with updated_at column
-- ============================================================================

-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0),
    CONSTRAINT content_max_length CHECK (length(content) <= 1000)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- ============================================================================
-- 3. Create trigger function to auto-update updated_at timestamp
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Add triggers to posts and comments tables
-- ============================================================================

-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;

-- Create trigger for posts table
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for comments table
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. Enable Row Level Security for posts and comments tables
-- ============================================================================

-- Enable RLS for posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view posts
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

-- Policy: Authenticated users can insert posts
CREATE POLICY "Authenticated users can insert posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS for comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view comments
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

-- Policy: Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Add tables to realtime publication
-- ============================================================================

-- Enable realtime for posts table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    END IF;
END $$;

-- Enable realtime for comments table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
    END IF;
END $$;

-- Add table comment for documentation
COMMENT ON TABLE public.comments IS 'Stores user comments on posts with support for nested replies. Includes edit tracking via updated_at timestamp. Realtime enabled for live updates.';
COMMENT ON COLUMN public.posts.updated_at IS 'Timestamp of last update. Automatically updated by trigger on UPDATE operations.';
COMMENT ON COLUMN public.comments.updated_at IS 'Timestamp of last update. Automatically updated by trigger on UPDATE operations.';
