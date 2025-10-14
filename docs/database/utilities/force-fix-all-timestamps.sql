-- FORCE FIX: Reset ALL post timestamps to match created_at
-- This will remove the "Edited" badge from ALL posts

-- ============================================================================
-- Step 1: Show current state
-- ============================================================================
DO $$
DECLARE
    total INTEGER;
    different INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM posts;
    SELECT COUNT(*) INTO different FROM posts WHERE updated_at != created_at;
    
    RAISE NOTICE 'BEFORE FIX:';
    RAISE NOTICE '  Total posts: %', total;
    RAISE NOTICE '  Posts with different timestamps: %', different;
END $$;

-- ============================================================================
-- Step 2: FORCE update ALL posts (no conditions)
-- ============================================================================

-- This will set updated_at = created_at for EVERY post
UPDATE posts 
SET updated_at = created_at;

-- ============================================================================
-- Step 3: Verify the fix worked
-- ============================================================================
DO $$
DECLARE
    total INTEGER;
    different INTEGER;
    equal_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM posts;
    SELECT COUNT(*) INTO different FROM posts WHERE updated_at != created_at;
    SELECT COUNT(*) INTO equal_count FROM posts WHERE updated_at = created_at;
    
    RAISE NOTICE '';
    RAISE NOTICE 'AFTER FIX:';
    RAISE NOTICE '  Total posts: %', total;
    RAISE NOTICE '  Posts with matching timestamps: %', equal_count;
    RAISE NOTICE '  Posts with different timestamps: %', different;
    RAISE NOTICE '';
    
    IF different = 0 THEN
        RAISE NOTICE '✅ SUCCESS! All posts now have matching timestamps.';
        RAISE NOTICE '   The "Edited" badge should no longer appear on any posts.';
        RAISE NOTICE '   Refresh your app to see the changes.';
    ELSE
        RAISE WARNING '⚠️ WARNING: % posts still have different timestamps!', different;
    END IF;
END $$;

-- ============================================================================
-- Step 4: Show a sample of the fixed posts
-- ============================================================================
SELECT 
    'Sample of fixed posts:' as info;

SELECT 
    id,
    LEFT(content, 40) as content_preview,
    created_at,
    updated_at,
    (created_at = updated_at) as timestamps_match
FROM posts
ORDER BY created_at DESC
LIMIT 5;
