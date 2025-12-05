-- =====================================================
-- Migration: Add related_notification_id to notifications
-- Description: Link reversal notifications to original action notifications
-- Requirements: 13.6
-- =====================================================

-- =====================================================
-- 1. Add related_notification_id Column
-- =====================================================
-- This column allows reversal notifications to reference the original
-- moderation action notification, providing context to users

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.notifications.related_notification_id IS 
  'References the original notification when this is a reversal notification. ' ||
  'Allows users to see the context of what action was reversed.';

-- =====================================================
-- 2. Create Index for Related Notifications
-- =====================================================
-- Index to efficiently query notifications by their related notification

CREATE INDEX IF NOT EXISTS idx_notifications_related_notification_id
  ON public.notifications(related_notification_id)
  WHERE related_notification_id IS NOT NULL;

COMMENT ON INDEX idx_notifications_related_notification_id IS
  'Index for efficiently querying reversal notifications linked to original actions';

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Added related_notification_id column to notifications table
-- ✓ Added foreign key constraint to reference notifications(id)
-- ✓ Added index for efficient querying of related notifications
-- ✓ Added documentation comments
--
-- Next Steps:
-- - Update sendReversalNotification() to include related_notification_id
-- - Update notification display components to show reversal context
-- - Test notification linking in UI
-- =====================================================
