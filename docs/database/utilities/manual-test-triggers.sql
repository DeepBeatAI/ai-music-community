-- Manual test script for edit tracking triggers
-- Run this manually to verify triggers work correctly

-- Test 1: Create a test post and verify updated_at is set
INSERT INTO public.posts (user_id, content, post_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test post', 'text')
RETURNING id, created_at, updated_at;

-- Wait and then update the post
-- Note: Run this after the INSERT above
-- UPDATE public.posts 
-- SET content = 'Updated test post'
-- WHERE content = 'Test post'
-- RETURNING id, created_at, updated_at;

-- Test 2: Create a test comment and verify updated_at is set
-- First create a post to comment on
-- INSERT INTO public.posts (user_id, content, post_type)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Post for comment test', 'text')
-- RETURNING id;

-- Then create a comment (replace post_id with the ID from above)
-- INSERT INTO public.comments (post_id, user_id, content)
-- VALUES ('<post_id_here>', '00000000-0000-0000-0000-000000000001', 'Test comment')
-- RETURNING id, created_at, updated_at;

-- Wait and then update the comment
-- UPDATE public.comments
-- SET content = 'Updated test comment'
-- WHERE content = 'Test comment'
-- RETURNING id, created_at, updated_at;

-- Cleanup
-- DELETE FROM public.posts WHERE content IN ('Test post', 'Updated test post', 'Post for comment test');
