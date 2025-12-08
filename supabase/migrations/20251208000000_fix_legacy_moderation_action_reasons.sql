-- Migration: Fix Legacy Moderation Action Reasons
-- Description: Updates old moderation actions that have notification messages in the reason field
--              to use the actual report reason from the related report
-- Date: 2024-12-08
-- Requirements: Moderation System Data Integrity

-- =====================================================
-- Update moderation actions with proper reasons
-- =====================================================

-- Update actions that have a related_report_id and whose reason doesn't match valid reason keys
-- Valid reason keys: spam, harassment, hate_speech, inappropriate_content, copyright_violation, impersonation, self_harm, other
UPDATE public.moderation_actions ma
SET reason = mr.reason
FROM public.moderation_reports mr
WHERE ma.related_report_id = mr.id
  AND ma.related_report_id IS NOT NULL
  AND ma.reason NOT IN (
    'spam',
    'harassment', 
    'hate_speech',
    'inappropriate_content',
    'copyright_violation',
    'impersonation',
    'self_harm',
    'other'
  );

-- =====================================================
-- Verification Query (commented out - for manual verification)
-- =====================================================

-- To verify the migration worked, run this query:
-- SELECT 
--   ma.id,
--   ma.reason as action_reason,
--   mr.reason as report_reason,
--   ma.notification_message,
--   ma.created_at
-- FROM moderation_actions ma
-- LEFT JOIN moderation_reports mr ON ma.related_report_id = mr.id
-- WHERE ma.related_report_id IS NOT NULL
-- ORDER BY ma.created_at DESC
-- LIMIT 20;

-- =====================================================
-- Summary
-- =====================================================

-- This migration:
-- ✓ Updates moderation_actions.reason field for legacy actions
-- ✓ Pulls the correct reason from the related moderation_reports table
-- ✓ Only updates actions where reason doesn't match valid reason keys
-- ✓ Preserves notification_message field for historical reference
-- ✓ Ensures future queries can properly use REASON_LABELS mapping

COMMENT ON COLUMN public.moderation_actions.reason IS 
  'The reason for the moderation action. Should be one of the valid reason keys: 
   spam, harassment, hate_speech, inappropriate_content, copyright_violation, 
   impersonation, self_harm, other. Legacy actions may have had notification 
   messages here, which were migrated to use proper reason keys.';
