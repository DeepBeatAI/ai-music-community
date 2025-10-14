-- Debug: Check the actual timestamps in the database

-- Show the first 10 posts with their timestamps
SELECT 
    id,
    LEFT(content, 50) as content_preview,
    created_at,
    updated_at,
    -- Check if they're equal
    CASE 
        WHEN created_at = updated_at THEN '✅ EQUAL (no badge)'
        WHEN updated_at > created_at THEN '❌ DIFFERENT (shows badge)'
        ELSE '⚠️ UNEXPECTED'
    END as status,
    -- Show the difference in milliseconds
    EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 as diff_milliseconds
FROM posts
ORDER BY created_at DESC
LIMIT 10;

-- Count how many posts have matching vs different timestamps
SELECT 
    COUNT(*) FILTER (WHERE created_at = updated_at) as posts_with_no_badge,
    COUNT(*) FILTER (WHERE updated_at > created_at) as posts_with_badge,
    COUNT(*) as total_posts
FROM posts;
