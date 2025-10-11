-- Test file for validating comments table RLS policies
-- This file contains test queries to verify RLS policies work correctly
-- Run these queries in Supabase SQL Editor to validate the implementation

-- ============================================================================
-- TEST 1: Verify table structure and constraints
-- ============================================================================
-- Expected: Should show comments table with all columns and constraints
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

-- ============================================================================
-- TEST 2: Verify indexes exist
-- ============================================================================
-- Expected: Should show all 4 indexes (post_id, user_id, parent_id, created_at)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'comments';

-- ============================================================================
-- TEST 3: Verify RLS is enabled
-- ============================================================================
-- Expected: Should return 't' (true)
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'comments';

-- ============================================================================
-- TEST 4: List all RLS policies
-- ============================================================================
-- Expected: Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'comments';

-- ============================================================================
-- TEST 5: Test public read access (SELECT policy)
-- ============================================================================
-- Expected: Should work without authentication (returns empty result set initially)
-- This simulates an unauthenticated user viewing comments
SET LOCAL ROLE anon;
SELECT * FROM comments LIMIT 5;
RESET ROLE;

-- ============================================================================
-- TEST 6: Test authenticated user can insert their own comment
-- ============================================================================
-- Note: Replace 'YOUR_USER_ID' with an actual user ID from auth.users
-- Expected: Should succeed when user_id matches authenticated user
-- 
-- Example (run in authenticated context):
-- INSERT INTO comments (post_id, user_id, content)
-- VALUES (
--   'POST_ID_HERE',
--   auth.uid(),
--   'This is a test comment'
-- );

-- ============================================================================
-- TEST 7: Test user cannot insert comment as another user
-- ============================================================================
-- Expected: Should fail with RLS policy violation
-- 
-- Example (should fail):
-- INSERT INTO comments (post_id, user_id, content)
-- VALUES (
--   'POST_ID_HERE',
--   'DIFFERENT_USER_ID',
--   'This should fail'
-- );

-- ============================================================================
-- TEST 8: Test user can update their own comment
-- ============================================================================
-- Expected: Should succeed when updating own comment
-- 
-- Example (run in authenticated context):
-- UPDATE comments
-- SET content = 'Updated content'
-- WHERE id = 'COMMENT_ID' AND user_id = auth.uid();

-- ============================================================================
-- TEST 9: Test user cannot update another user's comment
-- ============================================================================
-- Expected: Should fail or affect 0 rows due to RLS policy
-- 
-- Example (should fail):
-- UPDATE comments
-- SET content = 'Trying to update someone else comment'
-- WHERE id = 'COMMENT_ID' AND user_id != auth.uid();

-- ============================================================================
-- TEST 10: Test user can delete their own comment
-- ============================================================================
-- Expected: Should succeed when deleting own comment
-- 
-- Example (run in authenticated context):
-- DELETE FROM comments
-- WHERE id = 'COMMENT_ID' AND user_id = auth.uid();

-- ============================================================================
-- TEST 11: Test cascade delete when parent comment is deleted
-- ============================================================================
-- Expected: When a parent comment is deleted, all child comments should be deleted
-- 
-- Setup:
-- 1. Create a parent comment
-- 2. Create child comments with parent_comment_id
-- 3. Delete parent comment
-- 4. Verify child comments are also deleted

-- ============================================================================
-- TEST 12: Test cascade delete when post is deleted
-- ============================================================================
-- Expected: When a post is deleted, all its comments should be deleted
-- 
-- Setup:
-- 1. Create comments for a post
-- 2. Delete the post
-- 3. Verify all comments for that post are deleted

-- ============================================================================
-- TEST 13: Test content length constraint
-- ============================================================================
-- Expected: Should fail when content is empty or exceeds 1000 characters
-- 
-- Example (should fail - empty content):
-- INSERT INTO comments (post_id, user_id, content)
-- VALUES ('POST_ID', auth.uid(), '');
--
-- Example (should fail - too long):
-- INSERT INTO comments (post_id, user_id, content)
-- VALUES ('POST_ID', auth.uid(), repeat('a', 1001));

-- ============================================================================
-- TEST 14: Test nested comments structure
-- ============================================================================
-- Expected: Should be able to create nested comments up to 3 levels
-- 
-- Example query to view nested structure:
-- WITH RECURSIVE comment_tree AS (
--   -- Base case: top-level comments
--   SELECT 
--     id,
--     content,
--     parent_comment_id,
--     1 as depth,
--     ARRAY[id] as path
--   FROM comments
--   WHERE parent_comment_id IS NULL AND post_id = 'POST_ID'
--   
--   UNION ALL
--   
--   -- Recursive case: child comments
--   SELECT 
--     c.id,
--     c.content,
--     c.parent_comment_id,
--     ct.depth + 1,
--     ct.path || c.id
--   FROM comments c
--   INNER JOIN comment_tree ct ON c.parent_comment_id = ct.id
--   WHERE ct.depth < 3
-- )
-- SELECT 
--   repeat('  ', depth - 1) || content as nested_content,
--   depth
-- FROM comment_tree
-- ORDER BY path;

-- ============================================================================
-- CLEANUP (Optional - uncomment to remove test data)
-- ============================================================================
-- DELETE FROM comments WHERE content LIKE '%test%';
