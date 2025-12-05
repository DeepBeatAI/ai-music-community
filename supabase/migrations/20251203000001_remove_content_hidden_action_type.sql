-- Migration: Remove content_hidden action type
-- This migration removes the 'content_hidden' action type from the moderation system
-- as the feature has been removed in favor of a simpler Remove/Approve workflow

-- Drop the existing constraint
ALTER TABLE public.moderation_actions
DROP CONSTRAINT IF EXISTS moderation_actions_action_type_check;

-- Recreate the constraint without content_hidden
ALTER TABLE public.moderation_actions
ADD CONSTRAINT moderation_actions_action_type_check
CHECK (
  action_type IN (
    'content_removed',
    'content_approved',
    'user_warned',
    'user_suspended',
    'user_banned',
    'restriction_applied'
  )
);

-- Update the column comment to reflect the change
COMMENT ON COLUMN public.moderation_actions.action_type IS 'Type of action: content_removed, content_approved, user_warned, user_suspended, user_banned, or restriction_applied';
