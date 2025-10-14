-- FIX: Disable trigger, update timestamps, then re-enable trigger
-- The trigger is preventing us from setting updated_at = created_at

-- ============================================================================
-- Step 1: Disable the trigger temporarily
-- ============================================================================

ALTER TABLE posts DISABLE TRIGGER update_posts_updated_at;

-- ============================================================================
-- Step 2: Update all posts (now the trigger won't interfere)
-- ============================================================================

UPDATE posts 
SET updated_at = created_at;

-- ============================================================================
-- Step 3: Re-enable the trigger
-- ============================================================================

ALTER TABLE posts ENABLE TRIGGER update_posts_updated_at;

-- ============================================================================
-- Step 4: Verify it worked
-- ============================================================================

DO $$
DECLARE
    total INTEGER;
    matching INTEGER;
    different INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM posts;
    SELECT COUNT(*) INTO matching FROM posts WHERE updated_at = created_at;
    SELECT COUNT(*) INTO different FROM posts WHERE updated_at != created_at;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Total posts: %', total;
    RAISE NOTICE 'Posts with matching timestamps: %', matching;
    RAISE NOTICE 'Posts with different timestamps: %', different;
    RAISE NOTICE '';
    
    IF different = 0 THEN
        RAISE NOTICE '✅ SUCCESS! All posts now have matching timestamps!';
        RAISE NOTICE '   Refresh your app - the "Edited" badges should be gone.';
    ELSE
        RAISE WARNING '⚠️ Still have % posts with different timestamps', different;
    END IF;
END $$;

-- ============================================================================
-- Step 5: Show sample of fixed posts
-- ============================================================================

SELECT 
    id,
    LEFT(content, 40) as content_preview,
    created_at,
    updated_at,
    (created_at = updated_at) as timestamps_match
FROM posts
ORDER BY created_at DESC
LIMIT 5;
