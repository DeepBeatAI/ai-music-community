-- Fix: Reset updated_at to match created_at for posts that haven't been edited
-- This will remove the "Edited" badge from posts that were never actually edited

-- ============================================================================
-- Reset updated_at to created_at for all existing posts
-- ============================================================================

-- This assumes that any post where updated_at was set when the column was added
-- should have updated_at = created_at (since they weren't actually edited)
UPDATE public.posts 
SET updated_at = created_at
WHERE updated_at > created_at;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check how many posts now have matching timestamps (should be all unedited posts)
DO $$
DECLARE
    matching_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO matching_count
    FROM public.posts 
    WHERE updated_at = created_at;
    
    SELECT COUNT(*) INTO total_count
    FROM public.posts;
    
    RAISE NOTICE '✅ Reset complete: % out of % posts now have updated_at = created_at', matching_count, total_count;
    RAISE NOTICE 'These posts will NOT show the "Edited" badge';
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this:
-- - All posts that were never edited will have updated_at = created_at
-- - The "Edited" badge will only appear on posts that are actually edited in the future
-- ============================================================================
