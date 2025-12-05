-- =====================================================
-- Migration: Add Moderator Content Deletion Policies
-- Description: Allow moderators to delete content for moderation purposes
-- Requirements: 5.2, 11.2
-- =====================================================

-- =====================================================
-- 1. Add RLS Policies for Moderators to Delete Content
-- =====================================================

-- Allow moderators and admins to delete posts
CREATE POLICY "Moderators can delete posts"
ON public.posts
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

-- Allow moderators and admins to delete comments
CREATE POLICY "Moderators can delete comments"
ON public.comments
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

-- Allow moderators and admins to delete tracks
CREATE POLICY "Moderators can delete tracks"
ON public.tracks
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
-- 2. Add notification type 'moderation' to check constraint
-- =====================================================

-- First, drop the existing check constraint if it exists
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated check constraint with 'moderation' type
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('like', 'follow', 'comment', 'post', 'mention', 'system', 'moderation'));

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Added RLS policy for moderators to delete posts
-- ✓ Added RLS policy for moderators to delete comments
-- ✓ Added RLS policy for moderators to delete tracks
-- ✓ Updated notifications type constraint to include 'moderation'
--
-- Security Notes:
-- - Only users with active moderator or admin role can delete content
-- - Content owners can still delete their own content via existing policies
-- - All deletions are logged through moderation_actions table
