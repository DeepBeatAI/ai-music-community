-- Performance Testing Script for Index Optimization
-- This script tests query performance improvements after applying indexes
-- Run EXPLAIN ANALYZE on key queries to verify index usage and performance

-- ============================================================================
-- Test 1: Posts Feed Query (ordered by creation date)
-- ============================================================================

-- Expected: Should use idx_posts_created_at index
-- Performance target: < 100ms for typical feed queries
EXPLAIN ANALYZE
SELECT id, user_id, content, post_type, audio_url, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- Test 2: User Profile Posts Query
-- ============================================================================

-- Expected: Should use idx_posts_user_id_created_at composite index
-- Performance target: < 50ms for user profile queries
EXPLAIN ANALYZE
SELECT id, content, post_type, audio_url, created_at
FROM posts
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- Test 3: Comments for a Post Query
-- ============================================================================

-- Expected: Should use idx_comments_post_id index
-- Performance target: < 50ms for comment fetching
EXPLAIN ANALYZE
SELECT c.id, c.content, c.user_id, c.parent_comment_id, c.created_at
FROM comments c
WHERE c.post_id = (SELECT id FROM posts LIMIT 1)
ORDER BY c.created_at ASC;

-- ============================================================================
-- Test 4: Nested Replies Query
-- ============================================================================

-- Expected: Should use idx_comments_parent_id index
-- Performance target: < 30ms for nested reply queries
EXPLAIN ANALYZE
SELECT id, content, user_id, created_at
FROM comments
WHERE parent_comment_id = (SELECT id FROM comments WHERE parent_comment_id IS NULL LIMIT 1)
ORDER BY created_at ASC;

-- ============================================================================
-- Test 5: User Comments Query
-- ============================================================================

-- Expected: Should use idx_comments_user_id index
-- Performance target: < 50ms for user comment history
EXPLAIN ANALYZE
SELECT id, post_id, content, created_at
FROM comments
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- Test 6: User Stats Leaderboard Query
-- ============================================================================

-- Expected: Should use idx_user_stats_followers index
-- Performance target: < 50ms for leaderboard queries
EXPLAIN ANALYZE
SELECT user_id, followers_count, posts_count, likes_received
FROM user_stats
ORDER BY followers_count DESC
LIMIT 20;

-- ============================================================================
-- Test 7: Unread Notifications Query (Partial Index)
-- ============================================================================

-- Expected: Should use idx_notifications_user_unread partial index
-- Performance target: < 30ms for unread notification queries
EXPLAIN ANALYZE
SELECT id, type, title, message, created_at
FROM notifications
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND read = false
ORDER BY created_at DESC;

-- ============================================================================
-- Test 8: All User Notifications Query
-- ============================================================================

-- Expected: Should use idx_notifications_user_created index
-- Performance target: < 50ms for notification feed
EXPLAIN ANALYZE
SELECT id, type, title, message, read, created_at
FROM notifications
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- Test 9: Post Likes Count Query
-- ============================================================================

-- Expected: Should use idx_post_likes_post_id index
-- Performance target: < 20ms for like count queries
EXPLAIN ANALYZE
SELECT COUNT(*) as like_count
FROM post_likes
WHERE post_id = (SELECT id FROM posts LIMIT 1);

-- ============================================================================
-- Test 10: Check if User Liked Post Query
-- ============================================================================

-- Expected: Should use idx_post_likes_user_post composite index
-- Performance target: < 20ms for like status check
EXPLAIN ANALYZE
SELECT id
FROM post_likes
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND post_id = (SELECT id FROM posts LIMIT 1)
LIMIT 1;

-- ============================================================================
-- Test 11: User Following List Query
-- ============================================================================

-- Expected: Should use idx_user_follows_follower index
-- Performance target: < 30ms for following list
EXPLAIN ANALYZE
SELECT following_id, created_at
FROM user_follows
WHERE follower_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC;

-- ============================================================================
-- Test 12: User Followers List Query
-- ============================================================================

-- Expected: Should use idx_user_follows_following index
-- Performance target: < 30ms for followers list
EXPLAIN ANALYZE
SELECT follower_id, created_at
FROM user_follows
WHERE following_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY created_at DESC;

-- ============================================================================
-- Test 13: Activity Feed Query
-- ============================================================================

-- Expected: Should use idx_activity_feed_user_created index
-- Performance target: < 50ms for activity feed
EXPLAIN ANALYZE
SELECT af.id, af.activity_id, af.seen, af.created_at
FROM activity_feed af
WHERE af.user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY af.created_at DESC
LIMIT 20;

-- ============================================================================
-- Test 14: Unseen Activity Feed Query (Partial Index)
-- ============================================================================

-- Expected: Should use idx_activity_feed_user_unseen partial index
-- Performance target: < 30ms for unseen activity
EXPLAIN ANALYZE
SELECT af.id, af.activity_id, af.created_at
FROM activity_feed af
WHERE af.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND af.seen = false
ORDER BY af.created_at DESC;

-- ============================================================================
-- Index Usage Verification
-- ============================================================================

-- Query to check all indexes on the tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'comments', 'user_stats', 'notifications', 
                    'post_likes', 'user_follows', 'activity_feed')
ORDER BY tablename, indexname;

-- ============================================================================
-- Index Size and Statistics
-- ============================================================================

-- Check index sizes to ensure they're reasonable
SELECT
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('posts', 'comments', 'user_stats', 'notifications',
                  'post_likes', 'user_follows', 'activity_feed')
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- Performance Comparison Notes
-- ============================================================================

/*
PERFORMANCE TESTING INSTRUCTIONS:

1. BEFORE applying indexes (baseline):
   - Run each EXPLAIN ANALYZE query
   - Record execution time and query plan
   - Note if sequential scans are used

2. AFTER applying indexes:
   - Run the same EXPLAIN ANALYZE queries
   - Record execution time and query plan
   - Verify index scans are used instead of sequential scans
   - Calculate performance improvement percentage

3. EXPECTED IMPROVEMENTS:
   - Feed queries: 30-50% faster
   - User-specific queries: 40-60% faster
   - Partial index queries (unread notifications): 50-70% faster
   - Like/follow checks: 60-80% faster

4. VERIFICATION CHECKLIST:
   ✓ All queries use appropriate indexes (check "Index Scan" in plan)
   ✓ No sequential scans on large tables
   ✓ Query execution time meets performance targets
   ✓ Index sizes are reasonable (< 10% of table size typically)
   ✓ Partial indexes only contain relevant rows

5. DOCUMENTATION:
   - Document baseline performance metrics
   - Document post-index performance metrics
   - Calculate and record improvement percentages
   - Note any queries that don't use indexes as expected
   - Identify any additional optimization opportunities

EXAMPLE DOCUMENTATION FORMAT:

Query: Posts Feed (Test 1)
Before: 45ms, Sequential Scan
After: 12ms, Index Scan using idx_posts_created_at
Improvement: 73% faster

Query: Unread Notifications (Test 7)
Before: 38ms, Sequential Scan + Filter
After: 8ms, Index Scan using idx_notifications_user_unread
Improvement: 79% faster
*/
