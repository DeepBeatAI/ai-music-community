-- =====================================================
-- Migration: Add Moderator Album Deletion Policy
-- Description: Allow moderators to delete albums for moderation purposes
-- Requirements: Album Flagging System - Requirement 4.3, 4.4
-- =====================================================

-- =====================================================
-- Add RLS Policy for Moderators to Delete Albums
-- =====================================================

-- Drop the policy if it already exists (idempotent migration)
DROP POLICY IF EXISTS "Moderators can delete albums" ON public.albums;

-- Allow moderators and admins to delete albums
CREATE POLICY "Moderators can delete albums"
ON public.albums
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_type IN ('moderator', 'admin')
      AND user_roles.is_active = true
  )
);

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Added RLS policy for moderators to delete albums
--
-- Security Notes:
-- - Only users with active moderator or admin role can delete albums
-- - Album owners can still delete their own albums via existing policies
-- - All deletions are logged through moderation_actions table
-- - This policy enables the album flagging system's cascading deletion feature

