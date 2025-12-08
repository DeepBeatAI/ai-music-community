-- =====================================================
-- Migration: Fix Notifications RLS for Moderation System
-- Description: Allow moderators and admins to insert notifications for any user
-- Requirements: 7.1, 7.2, 7.3, 7.4
-- =====================================================

-- =====================================================
-- 1. Drop existing INSERT policy if it exists
-- =====================================================
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- =====================================================
-- 2. Create new INSERT policy that allows:
--    - Users to insert their own notifications
--    - Moderators and admins to insert notifications for any user
-- =====================================================
CREATE POLICY "Allow users and moderators to insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert their own notifications
  auth.uid() = user_id
  OR
  -- Moderators and admins can insert notifications for any user
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role_type IN ('moderator', 'admin')
    AND user_roles.is_active = true
  )
);

COMMENT ON POLICY "Allow users and moderators to insert notifications" ON public.notifications IS
  'Allows users to create their own notifications and moderators/admins to create notifications for any user (for moderation actions)';

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Dropped old INSERT policy on notifications
-- ✓ Created new policy allowing moderators to insert notifications for any user
-- ✓ Maintains security: regular users can only insert their own notifications
-- ✓ Enables moderation system to send notifications to users
-- =====================================================
