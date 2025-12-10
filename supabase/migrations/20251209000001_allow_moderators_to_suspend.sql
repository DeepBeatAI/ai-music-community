-- =====================================================
-- Migration: Allow Moderators to Suspend Users (Temporary Only)
-- Description: 
--   - Create is_user_moderator() helper function
--   - Update suspend_user_account to allow moderators for temporary suspensions
--   - Keep permanent suspensions admin-only
-- Date: 2025-12-09
-- =====================================================

-- =====================================================
-- 1. Create is_user_moderator helper function
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_user_moderator(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role_type = 'moderator'
      AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION public.is_user_moderator(UUID) IS 
  'Quick check if a user has moderator role. Returns true if user has active moderator role, false otherwise.';

-- =====================================================
-- 2. Update suspend_user_account function
-- =====================================================
-- Drop and recreate the function with updated authorization check
DROP FUNCTION IF EXISTS public.suspend_user_account(UUID, TEXT, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.suspend_user_account(
  p_target_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL,
  p_existing_action_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_moderator BOOLEAN;
  v_target_is_admin BOOLEAN;
  v_expires_at TIMESTAMPTZ;
  v_action_id UUID;
BEGIN
  -- Check if caller is admin or moderator
  SELECT public.is_user_admin(auth.uid()) INTO v_is_admin;
  SELECT public.is_user_moderator(auth.uid()) INTO v_is_moderator;
  
  -- For permanent suspensions (no duration), only admins allowed
  IF p_duration_days IS NULL THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only admins can permanently suspend user accounts';
    END IF;
  ELSE
    -- For temporary suspensions, moderators or admins allowed
    IF NOT (v_is_admin OR v_is_moderator) THEN
      RAISE EXCEPTION 'Only moderators and admins can suspend user accounts';
    END IF;
  END IF;
  
  -- Prevent suspending admin users
  SELECT public.is_user_admin(p_target_user_id) INTO v_target_is_admin;
  
  IF v_target_is_admin THEN
    RAISE EXCEPTION 'Cannot suspend admin users';
  END IF;
  
  -- Validate reason is provided
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Suspension reason is required';
  END IF;
  
  -- Validate duration if provided
  IF p_duration_days IS NOT NULL AND (p_duration_days < 1 OR p_duration_days > 365) THEN
    RAISE EXCEPTION 'Duration must be between 1 and 365 days';
  END IF;
  
  -- Calculate expiration if duration provided
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;
  
  -- Update user profile to mark as suspended
  UPDATE public.user_profiles
  SET 
    suspended_until = v_expires_at,
    suspension_reason = p_reason,
    updated_at = now()
  WHERE user_id = p_target_user_id;
  
  -- If existing action ID provided, use it; otherwise create new action
  IF p_existing_action_id IS NOT NULL THEN
    -- Link to existing moderation action
    v_action_id := p_existing_action_id;
    
    -- Update the existing action with suspension details
    UPDATE public.moderation_actions
    SET
      expires_at = v_expires_at,
      duration_days = p_duration_days
    WHERE id = p_existing_action_id;
  ELSE
    -- Create new moderation_actions record (for direct admin suspension)
    INSERT INTO public.moderation_actions (
      moderator_id,
      target_user_id,
      action_type,
      target_type,
      target_id,
      reason,
      duration_days,
      expires_at,
      internal_notes,
      notification_sent
    ) VALUES (
      auth.uid(),
      p_target_user_id,
      'user_suspended',
      'user',
      p_target_user_id,
      p_reason,
      p_duration_days,
      v_expires_at,
      'Created by admin suspension function',
      false
    ) RETURNING id INTO v_action_id;
  END IF;
  
  -- Create user_restrictions record
  INSERT INTO public.user_restrictions (
    user_id,
    restriction_type,
    expires_at,
    is_active,
    reason,
    applied_by,
    related_action_id
  ) VALUES (
    p_target_user_id,
    'suspended',
    v_expires_at,
    true,
    p_reason,
    auth.uid(),
    v_action_id
  );
  
  -- Log the suspension to admin audit log (only if caller is admin)
  -- Moderators don't have permission to write to admin_audit_log
  IF v_is_admin THEN
    PERFORM public.log_admin_action(
      'user_banned',
      'user',
      p_target_user_id::TEXT,
      NULL,
      jsonb_build_object(
        'reason', p_reason,
        'duration_days', p_duration_days,
        'expires_at', v_expires_at,
        'moderation_action_id', v_action_id
      )
    );
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.suspend_user_account IS 
  'Suspends a user account. 
   - Temporary suspensions (with duration): Callable by moderators and admins
   - Permanent suspensions (no duration): Admin-only
   Cannot suspend admin users.
   Creates moderation_actions and user_restrictions records for integration with moderation system.
   Logs the suspension to the admin audit trail with reason and duration.
   If p_existing_action_id is provided, links to existing action instead of creating duplicate.';

-- =====================================================
-- Summary
-- =====================================================
-- ✓ Created is_user_moderator() helper function
-- ✓ Updated suspend_user_account() to allow moderators for temporary suspensions
-- ✓ Permanent suspensions remain admin-only
-- ✓ Maintains protection: cannot suspend admin users
-- ✓ Maintains all existing functionality
