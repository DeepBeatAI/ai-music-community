-- Migration: Create comments table with RLS policies and indexes
-- Description: Implements threaded commenting system with nested replies support
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 1000),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view comments (public read access)
-- Requirement 2.2: Allow SELECT operations for all users
CREATE POLICY "Comments are viewable by everyone"
ON comments FOR SELECT
USING (true);

-- RLS Policy: Authenticated users can create comments (must match their user_id)
-- Requirement 2.3: Only allow INSERT if user_id matches authenticated user
CREATE POLICY "Users can create comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own comments only
-- Requirement 2.4: Only allow UPDATE if they own the comment
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own comments only
-- Requirement 2.5: Only allow DELETE if they own the comment
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table and columns for documentation
COMMENT ON TABLE comments IS 'Stores user comments on posts with support for nested replies up to 3 levels deep';
COMMENT ON COLUMN comments.id IS 'Unique identifier for the comment';
COMMENT ON COLUMN comments.post_id IS 'Reference to the post this comment belongs to';
COMMENT ON COLUMN comments.user_id IS 'Reference to the user who created the comment';
COMMENT ON COLUMN comments.content IS 'Comment text content, limited to 1000 characters';
COMMENT ON COLUMN comments.parent_comment_id IS 'Reference to parent comment for nested replies, NULL for top-level comments';
COMMENT ON COLUMN comments.created_at IS 'Timestamp when the comment was created';
COMMENT ON COLUMN comments.updated_at IS 'Timestamp when the comment was last updated';
