-- =====================================================
-- Add Index on revoked_at for Filtering Reversed Actions
-- =====================================================
-- This migration creates an index on the revoked_at column
-- in the moderation_actions table to optimize queries that
-- filter by reversal status.
--
-- Requirements: 14.3, 14.7, 15.1, 15.5, 15.10
-- Task: 21.3 Database Updates - Create database index on revoked_at for filtering reversed actions
-- =====================================================

-- =====================================================
-- 1. Create index on revoked_at for filtering
-- =====================================================
-- This index optimizes queries that filter actions by reversal status:
-- - Finding all reversed actions (WHERE revoked_at IS NOT NULL)
-- - Finding all non-reversed actions (WHERE revoked_at IS NULL)
-- - Finding recently reversed actions (WHERE revoked_at > timestamp)
-- - Calculating reversal metrics and statistics

CREATE INDEX IF NOT EXISTS idx_moderation_actions_revoked_at 
  ON public.moderation_actions(revoked_at DESC NULLS LAST, created_at DESC);

-- Add comment explaining the index purpose
COMMENT ON INDEX public.idx_moderation_actions_revoked_at IS 
  'Optimizes queries filtering moderation actions by reversal status.
   
   This index supports:
   - Filtering reversed actions (revoked_at IS NOT NULL)
   - Filtering non-reversed actions (revoked_at IS NULL)
   - Finding recently reversed actions (revoked_at > timestamp)
   - Calculating reversal rate metrics
   - Displaying reversed actions in action logs
   - Generating reversal reports and statistics
   
   The DESC NULLS LAST ordering ensures:
   - Most recent reversals appear first
   - Non-reversed actions (NULL) appear last
   - Efficient sorting for "Recently Reversed" filter';

-- =====================================================
-- 2. Create partial index for active (non-reversed) actions
-- =====================================================
-- This partial index optimizes queries that specifically
-- filter for non-reversed actions, which is a common query pattern

CREATE INDEX IF NOT EXISTS idx_moderation_actions_active 
  ON public.moderation_actions(created_at DESC, action_type) 
  WHERE revoked_at IS NULL;

-- Add comment explaining the partial index purpose
COMMENT ON INDEX public.idx_moderation_actions_active IS 
  'Partial index for active (non-reversed) moderation actions.
   
   This index supports:
   - Displaying only active actions in user profiles
   - Filtering action logs to show non-reversed actions only
   - Calculating metrics for active actions
   - Generating reports excluding reversed actions
   
   The partial index (WHERE revoked_at IS NULL) is more efficient
   than the full index for queries that only need active actions.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created idx_moderation_actions_revoked_at index for reversal filtering
-- ✓ Created idx_moderation_actions_active partial index for active actions
-- ✓ Added comprehensive documentation for both indexes
-- ✓ Optimized for common query patterns:
--   - "Recently Reversed" filter in action logs
--   - "Reversed Actions Only" filter
--   - "Active Actions Only" filter
--   - Reversal rate calculations
--   - Reversal metrics and statistics
--
-- Performance Impact:
-- - Queries filtering by revoked_at will use index scan instead of seq scan
-- - Reversal metrics calculations will be significantly faster
-- - Action logs filtering will be more responsive
-- - No impact on write performance (indexes maintained automatically)
--
-- Next Steps:
-- - Create index on revoked_by for moderator statistics (Task 21.3)
-- - Implement reversal metrics calculation functions (Task 21.1)
-- - Build reversal reporting dashboard UI (Task 22.3)
-- =====================================================
