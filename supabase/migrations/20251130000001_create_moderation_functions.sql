-- =====================================================
-- Moderation System Helper Functions Migration
-- =====================================================
-- This migration creates database functions for checking
-- user restrictions and automatically expiring time-based
-- restrictions and suspensions.
--
-- Requirements: 6.1, 6.2, 6.3, 6.7, 12.3
-- =====================================================

-- =====================================================
-- 1. Function: can_user_post
-- =====================================================
-- Checks if a user is allowed to create posts
-- Returns FALSE if user has posting_disabled or suspended restriction
-- Requirements: 6.1

CREATE OR REPLACE FUNCTION public.can_user_post(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_restriction BOOLEAN;
BEGIN
  -- Check if user has active posting_disabled or suspended restriction
  SELECT EXISTS (
    SELECT 1
    FROM public.user_restrictions
    WHERE user_id = p_user_id
      AND is_active = true
      AND restriction_type IN ('posting_disabled', 'suspended')
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_restriction;
  
  -- Return TRUE if no restriction, FALSE if restricted
  RETURN NOT v_has_restriction;
END;
$$;

COMMENT ON FUNCTION public.can_user_post(UUID) IS 
  'Checks if a user is allowed to create posts.
   Returns FALSE if user has an active posting_disabled or suspended restriction.
   Returns TRUE if user has no restrictions or restrictions have expired.';

-- =====================================================
-- 2. Function: can_user_comment
-- =====================================================
-- Checks if a user is allowed to create comments
-- Returns FALSE if user has commenting_disabled or suspended restriction
-- Requirements: 6.2

CREATE OR REPLACE FUNCTION public.can_user_comment(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_restriction BOOLEAN;
BEGIN
  -- Check if user has active commenting_disabled or suspended restriction
  SELECT EXISTS (
    SELECT 1
    FROM public.user_restrictions
    WHERE user_id = p_user_id
      AND is_active = true
      AND restriction_type IN ('commenting_disabled', 'suspended')
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_restriction;
  
  -- Return TRUE if no restriction, FALSE if restricted
  RETURN NOT v_has_restriction;
END;
$$;

COMMENT ON FUNCTION public.can_user_comment(UUID) IS 
  'Checks if a user is allowed to create comments.
   Returns FALSE if user has an active commenting_disabled or suspended restriction.
   Returns TRUE if user has no restrictions or restrictions have expired.';

-- =====================================================
-- 3. Function: can_user_upload
-- =====================================================
-- Checks if a user is allowed to upload tracks
-- Returns FALSE if user has upload_disabled or suspended restriction
-- Requirements: 6.3

CREATE OR REPLACE FUNCTION public.can_user_upload(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_restriction BOOLEAN;
BEGIN
  -- Check if user has active upload_disabled or suspended restriction
  SELECT EXISTS (
    SELECT 1
    FROM public.user_restrictions
    WHERE user_id = p_user_id
      AND is_active = true
      AND restriction_type IN ('upload_disabled', 'suspended')
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_restriction;
  
  -- Return TRUE if no restriction, FALSE if restricted
  RETURN NOT v_has_restriction;
END;
$$;

COMMENT ON FUNCTION public.can_user_upload(UUID) IS 
  'Checks if a user is allowed to upload tracks.
   Returns FALSE if user has an active upload_disabled or suspended restriction.
   Returns TRUE if user has no restrictions or restrictions have expired.';

-- =====================================================
-- 4. Function: get_user_restrictions
-- =====================================================
-- Returns all active restrictions for a user
-- Requirements: 6.1, 6.2, 6.3

CREATE OR REPLACE FUNCTION public.get_user_restrictions(p_user_id UUID)
RETURNS TABLE (
  restriction_id UUID,
  restriction_type TEXT,
  expires_at TIMESTAMPTZ,
  reason TEXT,
  applied_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    user_restrictions.restriction_type,
    user_restrictions.expires_at,
    user_restrictions.reason,
    user_restrictions.applied_by,
    user_restrictions.created_at
  FROM public.user_restrictions
  WHERE user_id = p_user_id
    AND is_active = true
    AND (user_restrictions.expires_at IS NULL OR user_restrictions.expires_at > now())
  ORDER BY created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_user_restrictions(UUID) IS 
  'Returns all active restrictions for a user.
   Includes restriction type, expiration date, reason, and who applied it.
   Only returns restrictions that are active and not expired.';

-- =====================================================
-- 5. Function: expire_restrictions
-- =====================================================
-- Automatically expires time-based restrictions that have passed their expiration date
-- Should be called periodically (e.g., hourly via cron job)
-- Requirements: 6.7

CREATE OR REPLACE FUNCTION public.expire_restrictions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Update expired restrictions to inactive
  UPDATE public.user_restrictions
  SET 
    is_active = false,
    updated_at = now()
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  
  -- Get count of expired restrictions
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Log the expiration activity
  IF v_expired_count > 0 THEN
    RAISE NOTICE 'Expired % user restrictions', v_expired_count;
  END IF;
  
  RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.expire_restrictions() IS 
  'Automatically expires time-based restrictions that have passed their expiration date.
   Should be called periodically (e.g., hourly) via a cron job or scheduled function.
   Returns the number of restrictions that were expired.';

-- =====================================================
-- 6. Function: expire_suspensions
-- =====================================================
-- Automatically expires user suspensions that have passed their expiration date
-- Should be called periodically (e.g., hourly via cron job)
-- Requirements: 6.7, 12.3

CREATE OR REPLACE FUNCTION public.expire_suspensions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Clear suspension fields for users whose suspension has expired
  UPDATE public.user_profiles
  SET 
    suspended_until = NULL,
    suspension_reason = NULL,
    updated_at = now()
  WHERE suspended_until IS NOT NULL
    AND suspended_until <= now();
  
  -- Get count of expired suspensions
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Also expire corresponding suspended restrictions
  UPDATE public.user_restrictions
  SET 
    is_active = false,
    updated_at = now()
  WHERE is_active = true
    AND restriction_type = 'suspended'
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  
  -- Log the expiration activity
  IF v_expired_count > 0 THEN
    RAISE NOTICE 'Expired % user suspensions', v_expired_count;
  END IF;
  
  RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.expire_suspensions() IS 
  'Automatically expires user suspensions that have passed their expiration date.
   Clears suspended_until and suspension_reason fields in user_profiles.
   Also expires corresponding suspended restrictions in user_restrictions table.
   Should be called periodically (e.g., hourly) via a cron job or scheduled function.
   Returns the number of suspensions that were expired.';

-- =====================================================
-- 7. Grant execute permissions
-- =====================================================
-- Grant execute permissions to authenticated users for restriction check functions
-- Only admins/moderators should call expire functions

GRANT EXECUTE ON FUNCTION public.can_user_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_comment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_upload(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_restrictions(UUID) TO authenticated;

-- Expire functions should only be called by service role or via scheduled jobs
-- No explicit grants needed as they use SECURITY DEFINER

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created can_user_post() function to check posting restrictions
-- ✓ Created can_user_comment() function to check commenting restrictions
-- ✓ Created can_user_upload() function to check upload restrictions
-- ✓ Created get_user_restrictions() function to retrieve user restrictions
-- ✓ Created expire_restrictions() function for automatic expiration
-- ✓ Created expire_suspensions() function for automatic suspension expiration
-- ✓ Granted appropriate execute permissions
-- ✓ Added comprehensive documentation comments for all functions
--
-- Next Steps:
-- - Implement RLS policies for moderation tables
-- - Set up scheduled jobs to call expire_restrictions() and expire_suspensions()
-- - Create moderation service layer in application
-- - Integrate restriction checks into API endpoints
-- =====================================================
