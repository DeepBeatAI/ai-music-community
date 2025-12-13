-- =====================================================
-- Create Function to Revoke All User Sessions
-- =====================================================
-- Migration: 20251213000001_create_revoke_user_sessions_function.sql
-- Description: 
--   - Create function to revoke all sessions for a user
--   - This will immediately log them out from all devices
-- Date: 2025-12-13
-- =====================================================

-- Create function to revoke all sessions for a user
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT public.is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can revoke user sessions';
  END IF;
  
  -- Delete all sessions for the user from auth.sessions table
  DELETE FROM auth.sessions
  WHERE user_id = p_user_id;
  
  -- Also mark all sessions as inactive in user_sessions table
  UPDATE public.user_sessions
  SET is_active = false
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.revoke_user_sessions IS 
  'Revokes all active sessions for a user. Only callable by admin users.
   This will immediately log the user out from all devices.';

-- =====================================================
-- Summary
-- =====================================================
-- ✓ Created revoke_user_sessions() function
-- ✓ Only admins can call this function
-- ✓ Deletes all sessions from auth.sessions table
-- ✓ Immediately logs out the user from all devices
