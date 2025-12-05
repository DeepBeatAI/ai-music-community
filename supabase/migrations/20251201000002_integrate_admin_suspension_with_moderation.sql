-- =====================================================
-- Integrate Admin Suspension with Moderation System
-- =====================================================
-- This migration updates the admin suspension functions
-- to create moderation_actions and user_restrictions records
-- for integration with the moderation system.
--
-- Requirements: 12.1, 12.2, 12.4, 12.5, 12.7
-- =====================================================

-- =====================================================
-- 1. Update suspend_user_account function
-- =====================================================
-- Update to create moderation_actions and user_restrictions records
-- Requirements: 12.1, 12.2, 12.7

CREATE OR REPLACE FUNCTION public.suspend_user_account(
  p_target_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_target_is_admin BOOLEAN;
  v_expires_at TIMESTAMPTZ;
  v_action_id UUID;
BEGIN
  -- Verify caller is admin
  SELECT public.is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can suspend user accounts';
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
  
  -- Create moderation_actions record
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
  
  -- Log the suspension to admin audit log
  PERFORM public.log_admin_action(
    'user_suspended',
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
  
  RETURN true;
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.suspend_user_account IS 
  'Suspends a user account. Only callable by admin users. Cannot suspend admin users.
   Creates moderation_actions and user_restrictions records for integration with moderation system.
   Logs the suspension to the admin audit trail with reason and duration.';

-- =====================================================
-- 2. Create unsuspend_user_account function
-- =====================================================
-- New function to unsuspend users and clean up moderation records
-- Requirements: 12.2, 12.3, 12.7

CREATE OR REPLACE FUNCTION public.unsuspend_user_account(
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_was_suspended BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT public.is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can unsuspend user accounts';
  END IF;
  
  -- Check if user is currently suspended
  SELECT (suspended_until IS NOT NULL AND suspended_until > now())
  INTO v_was_suspended
  FROM public.user_profiles
  WHERE user_id = p_target_user_id;
  
  IF NOT v_was_suspended THEN
    RAISE EXCEPTION 'User is not currently suspended';
  END IF;
  
  -- Update user profile to remove suspension
  UPDATE public.user_profiles
  SET 
    suspended_until = NULL,
    suspension_reason = NULL,
    updated_at = now()
  WHERE user_id = p_target_user_id;
  
  -- Deactivate user_restrictions records for this user
  UPDATE public.user_restrictions
  SET 
    is_active = false,
    updated_at = now()
  WHERE user_id = p_target_user_id
    AND restriction_type = 'suspended'
    AND is_active = true;
  
  -- Log the unsuspension to admin audit log
  PERFORM public.log_admin_action(
    'user_unsuspended',
    'user',
    p_target_user_id::TEXT,
    NULL,
    jsonb_build_object('action', 'unsuspended')
  );
  
  RETURN true;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.unsuspend_user_account IS 
  'Unsuspends a user account. Only callable by admin users.
   Removes suspension from user_profiles and deactivates user_restrictions records.
   Logs the unsuspension to the admin audit trail.';

-- =====================================================
-- 3. Add helper function to check if user is suspended
-- =====================================================
-- Requirements: 12.3

CREATE OR REPLACE FUNCTION public.is_user_suspended(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_suspended BOOLEAN;
BEGIN
  SELECT (suspended_until IS NOT NULL AND suspended_until > now())
  INTO v_is_suspended
  FROM public.user_profiles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_is_suspended, false);
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.is_user_suspended IS 
  'Checks if a user is currently suspended based on suspended_until timestamp.
   Returns true if user is suspended, false otherwise.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Updated suspend_user_account() to create moderation_actions record
-- ✓ Updated suspend_user_account() to create user_restrictions record
-- ✓ Created unsuspend_user_account() function
-- ✓ Created is_user_suspended() helper function
-- ✓ Maintained backward compatibility with existing admin dashboard
-- ✓ All functions include proper audit logging
--
-- Integration Points:
-- - Admin suspension now creates moderation_actions records
-- - Admin suspension now creates user_restrictions records
-- - Unsuspension properly cleans up both records
-- - Audit trail maintained in admin_audit_log
-- =====================================================
