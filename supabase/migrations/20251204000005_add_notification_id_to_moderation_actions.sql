-- =====================================================
-- Migration: Add notification_id to moderation_actions
-- Description: Store the notification ID for each moderation action
--              to enable linking reversal notifications to original actions
-- Requirements: 13.6
-- =====================================================

-- =====================================================
-- 1. Add notification_id Column
-- =====================================================
-- This column stores the ID of the notification sent when the action was taken

ALTER TABLE public.moderation_actions
ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.moderation_actions.notification_id IS 
  'ID of the notification sent to the user when this action was taken. ' ||
  'Used to link reversal notifications to the original action notification.';

-- =====================================================
-- 2. Create Index for Notification Lookups
-- =====================================================
-- Index to efficiently query actions by their notification ID

CREATE INDEX IF NOT EXISTS idx_moderation_actions_notification_id
  ON public.moderation_actions(notification_id)
  WHERE notification_id IS NOT NULL;

COMMENT ON INDEX idx_moderation_actions_notification_id IS
  'Index for efficiently querying moderation actions by their notification ID';

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Added notification_id column to moderation_actions table
-- ✓ Added foreign key constraint to reference notifications(id)
-- ✓ Added index for efficient querying by notification ID
-- ✓ Added documentation comments
--
-- Next Steps:
-- - Update takeModerationAction() to store notification_id
-- - Update reversal functions to retrieve and use notification_id
-- - Test notification linking in reversal flow
-- =====================================================
