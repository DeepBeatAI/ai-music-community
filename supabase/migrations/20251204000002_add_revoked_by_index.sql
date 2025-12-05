-- =====================================================
-- Add Index on revoked_by for Moderator Statistics
-- =====================================================
-- This migration creates an index on the revoked_by column
-- in the moderation_actions table to optimize queries that
-- calculate per-moderator reversal statistics.
--
-- Requirements: 14.3, 14.7
-- Task: 21.3 Database Updates - Create database index on revoked_by for moderator statistics
-- =====================================================

-- =====================================================
-- 1. Create index on revoked_by for moderator statistics
-- =====================================================
-- This index optimizes queries that calculate reversal statistics per moderator:
-- - Finding all reversals by a specific moderator
-- - Calculating per-moderator reversal rates
-- - Identifying moderators with highest reversal rates
-- - Generating moderator performance reports
-- - Tracking self-reversals (where revoked_by = moderator_id)

CREATE INDEX IF NOT EXISTS idx_moderation_actions_revoked_by 
  ON public.moderation_actions(revoked_by, revoked_at DESC) 
  WHERE revoked_by IS NOT NULL;

-- Add comment explaining the index purpose
COMMENT ON INDEX public.idx_moderation_actions_revoked_by IS 
  'Optimizes queries calculating per-moderator reversal statistics.
   
   This index supports:
   - Finding all reversals performed by a specific moderator
   - Calculating per-moderator reversal rates
   - Identifying moderators with highest reversal rates
   - Tracking self-reversals (moderator reversing their own actions)
   - Generating moderator performance comparison reports
   - Displaying "My Actions" view with reversal highlighting
   
   The partial index (WHERE revoked_by IS NOT NULL) ensures:
   - Only reversed actions are indexed (non-reversed have NULL revoked_by)
   - More efficient than full index for moderator statistics
   - Smaller index size and faster queries
   
   The DESC ordering on revoked_at ensures:
   - Most recent reversals by each moderator appear first
   - Efficient for "Recently Reversed by Moderator" queries';

-- =====================================================
-- 2. Create composite index for self-reversal tracking
-- =====================================================
-- This index optimizes queries that identify self-reversals
-- (where a moderator reverses their own action)

CREATE INDEX IF NOT EXISTS idx_moderation_actions_self_reversal 
  ON public.moderation_actions(moderator_id, revoked_by, revoked_at DESC) 
  WHERE revoked_by IS NOT NULL AND moderator_id = revoked_by;

-- Add comment explaining the self-reversal index purpose
COMMENT ON INDEX public.idx_moderation_actions_self_reversal IS 
  'Partial index for tracking self-reversals by moderators.
   
   This index supports:
   - Identifying actions where moderator reversed their own decision
   - Highlighting self-reversals in moderator action history
   - Calculating self-reversal rates per moderator
   - Displaying self-reversal indicators in timeline view
   
   The partial index (WHERE revoked_by IS NOT NULL AND moderator_id = revoked_by)
   ensures only self-reversals are indexed, making queries very efficient.
   
   Self-reversals are important to track because they indicate:
   - Moderator learning and mistake correction
   - Potential need for additional training
   - Quality improvement over time';

-- =====================================================
-- 3. Create index for moderator reversal rate calculations
-- =====================================================
-- This composite index optimizes the calculation of reversal rates
-- by combining moderator_id with revoked_at for efficient grouping

CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator_reversal_rate 
  ON public.moderation_actions(moderator_id, revoked_at, created_at DESC);

-- Add comment explaining the reversal rate index purpose
COMMENT ON INDEX public.idx_moderation_actions_moderator_reversal_rate IS 
  'Composite index for calculating per-moderator reversal rates.
   
   This index supports:
   - Calculating reversal rate: (reversed actions / total actions) per moderator
   - Grouping actions by moderator for statistics
   - Filtering by date range for time-based reversal rates
   - Comparing moderator performance over time
   
   The index structure (moderator_id, revoked_at, created_at DESC) enables:
   - Efficient GROUP BY moderator_id queries
   - Fast filtering of reversed vs non-reversed actions
   - Chronological ordering within each moderator group
   
   Used by:
   - getModeratorReversalStats() function
   - Moderator performance comparison dashboard
   - Reversal metrics panel
   - Admin oversight reports';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created idx_moderation_actions_revoked_by index for moderator statistics
-- ✓ Created idx_moderation_actions_self_reversal partial index for self-reversals
-- ✓ Created idx_moderation_actions_moderator_reversal_rate composite index
-- ✓ Added comprehensive documentation for all indexes
-- ✓ Optimized for common query patterns:
--   - Per-moderator reversal rate calculations
--   - Self-reversal identification and tracking
--   - Moderator performance comparison
--   - "My Actions" view with reversal highlighting
--   - Admin oversight and quality monitoring
--
-- Performance Impact:
-- - Moderator statistics queries will use index scan instead of seq scan
-- - Per-moderator reversal rate calculations will be significantly faster
-- - Self-reversal queries will be highly efficient (partial index)
-- - Moderator performance dashboard will load faster
-- - No significant impact on write performance (indexes maintained automatically)
--
-- Index Sizes (estimated):
-- - idx_moderation_actions_revoked_by: ~10-20% of table size (partial index)
-- - idx_moderation_actions_self_reversal: ~1-5% of table size (very selective)
-- - idx_moderation_actions_moderator_reversal_rate: ~100% of table size (full index)
--
-- Next Steps:
-- - Implement getModeratorReversalStats() function (Task 21.1)
-- - Implement getReversalMetrics() function (Task 21.1)
-- - Build ModeratorReversalStats component (Task 22.3)
-- - Add reversal metrics to main dashboard (Task 22.4)
-- =====================================================
