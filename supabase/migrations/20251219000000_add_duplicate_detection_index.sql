-- =====================================================
-- Duplicate Detection Index Migration
-- =====================================================
-- This migration adds a composite index to the moderation_reports
-- table to enable efficient duplicate report detection.
--
-- The index supports the checkDuplicateReport() function which
-- prevents users from reporting the same target multiple times
-- within a 24-hour window.
--
-- Requirements: 12.1, 12.2, 12.6
-- =====================================================

-- =====================================================
-- 1. Create composite index for duplicate detection
-- =====================================================
-- This index optimizes queries that check if a user has already
-- reported a specific target within the last 24 hours.
--
-- Query pattern:
-- SELECT created_at FROM moderation_reports
-- WHERE reporter_id = ? 
--   AND report_type = ?
--   AND target_id = ?
--   AND created_at >= (now() - interval '24 hours')
-- LIMIT 1;
--
-- The index covers all columns in the WHERE clause and includes
-- created_at in descending order to quickly find the most recent
-- matching report.

CREATE INDEX IF NOT EXISTS idx_moderation_reports_duplicate_check
  ON public.moderation_reports(reporter_id, report_type, target_id, created_at DESC);

-- Add index comment for documentation
COMMENT ON INDEX idx_moderation_reports_duplicate_check IS 
  'Composite index for efficient duplicate report detection within 24-hour window.
   Used by checkDuplicateReport() function to prevent users from reporting the same
   target multiple times within 24 hours. Covers queries filtering by reporter_id,
   report_type, and target_id, with created_at ordered descending for fast lookup.
   
   Performance target: < 50ms average query time
   
   Requirements: 12.1, 12.2, 12.6';

-- =====================================================
-- 2. Verify index creation
-- =====================================================
-- Query to verify the index was created successfully
-- (This is informational and will be executed during migration)

DO $$
DECLARE
  index_exists BOOLEAN;
BEGIN
  -- Check if the index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'moderation_reports'
      AND indexname = 'idx_moderation_reports_duplicate_check'
  ) INTO index_exists;

  -- Log the result
  IF index_exists THEN
    RAISE NOTICE 'Index idx_moderation_reports_duplicate_check created successfully';
  ELSE
    RAISE WARNING 'Index idx_moderation_reports_duplicate_check was not created';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created composite index on (reporter_id, report_type, target_id, created_at DESC)
-- ✓ Added comprehensive documentation comment
-- ✓ Verified index creation
--
-- Index Benefits:
-- - Enables efficient duplicate detection queries (< 50ms target)
-- - Supports all four report types: post, comment, track, user
-- - Optimized for 24-hour window queries
-- - Reduces database load for report submissions
--
-- Next Steps:
-- - Apply migration to remote database using Supabase MCP tools
-- - Verify index is being used by duplicate detection queries
-- - Monitor query performance to ensure < 50ms average
-- =====================================================
