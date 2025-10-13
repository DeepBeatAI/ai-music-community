-- Migration: Add Performance Indexes
-- Description: Add indexes to optimize common query patterns for posts, comments, user_stats, and notifications
-- Requirements: 2.7, 2.8, 2.9, 2.10

-- ============================================================================
-- Posts Table Indexes
-- ============================================================================

-- Index for fetching posts ordered by creation date (feed queries)
-- Optimizes: SELECT * FROM posts ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_created_at 
ON posts(created_at DESC);

-- Composite index for user-specific post queries ordered by date
-- Optimizes: SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at 
ON posts(user_id, created_at DESC);

-- ============================================================================
-- Comments Table Indexes
-- ============================================================================

-- Index for fetching comments by post (already exists from comments migration)
-- Optimizes: SELECT * FROM comments WHERE post_id = ?
CREATE INDEX IF NOT EXISTS idx_comments_post_id 
ON comments(post_id);

-- Index for fetching comments by user
-- Optimizes: SELECT * FROM comments WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_comments_user_id 
ON comments(user_id);

-- Index for fetching nested replies
-- Optimizes: SELECT * FROM comments WHERE parent_comment_id = ?
CREATE INDEX IF NOT EXISTS idx_comments_parent_id 
ON comments(parent_comment_id);

-- ============================================================================
-- User Stats Table Indexes
-- ============================================================================

-- Index for leaderboard and discovery queries sorted by followers
-- Optimizes: SELECT * FROM user_stats ORDER BY followers_count DESC
CREATE INDEX IF NOT EXISTS idx_user_stats_followers 
ON user_stats(followers_count DESC);

-- ============================================================================
-- Notifications Table Indexes
-- ============================================================================

-- Partial index for unread notifications (most common query)
-- Optimizes: SELECT * FROM notifications WHERE user_id = ? AND read = false
-- Only indexes unread notifications to save space and improve performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, read) 
WHERE read = false;

-- Index for all user notifications ordered by creation date
-- Optimizes: SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- ============================================================================
-- Additional Performance Indexes
-- ============================================================================

-- Index for post likes queries
-- Optimizes: SELECT * FROM post_likes WHERE post_id = ?
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id 
ON post_likes(post_id);

-- Index for checking if user liked a post
-- Optimizes: SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post 
ON post_likes(user_id, post_id);

-- Index for user follows queries
-- Optimizes: SELECT * FROM user_follows WHERE follower_id = ?
CREATE INDEX IF NOT EXISTS idx_user_follows_follower 
ON user_follows(follower_id);

-- Index for checking followers of a user
-- Optimizes: SELECT * FROM user_follows WHERE following_id = ?
CREATE INDEX IF NOT EXISTS idx_user_follows_following 
ON user_follows(following_id);

-- Index for activity feed queries
-- Optimizes: SELECT * FROM activity_feed WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_created 
ON activity_feed(user_id, created_at DESC);

-- Index for unseen activity feed items
-- Optimizes: SELECT * FROM activity_feed WHERE user_id = ? AND seen = false
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_unseen 
ON activity_feed(user_id, seen) 
WHERE seen = false;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON INDEX idx_posts_created_at IS 'Optimizes feed queries ordered by post creation date';
COMMENT ON INDEX idx_posts_user_id_created_at IS 'Optimizes user profile post queries ordered by date';
COMMENT ON INDEX idx_comments_post_id IS 'Optimizes fetching all comments for a specific post';
COMMENT ON INDEX idx_comments_user_id IS 'Optimizes fetching all comments by a specific user';
COMMENT ON INDEX idx_comments_parent_id IS 'Optimizes fetching nested replies for threaded comments';
COMMENT ON INDEX idx_user_stats_followers IS 'Optimizes leaderboard and user discovery queries';
COMMENT ON INDEX idx_notifications_user_unread IS 'Optimizes unread notification queries (partial index)';
COMMENT ON INDEX idx_notifications_user_created IS 'Optimizes notification feed queries ordered by date';
COMMENT ON INDEX idx_post_likes_post_id IS 'Optimizes like count queries for posts';
COMMENT ON INDEX idx_post_likes_user_post IS 'Optimizes checking if user liked a specific post';
COMMENT ON INDEX idx_user_follows_follower IS 'Optimizes queries for users a person is following';
COMMENT ON INDEX idx_user_follows_following IS 'Optimizes queries for followers of a user';
COMMENT ON INDEX idx_activity_feed_user_created IS 'Optimizes activity feed queries ordered by date';
COMMENT ON INDEX idx_activity_feed_user_unseen IS 'Optimizes unseen activity feed queries (partial index)';
