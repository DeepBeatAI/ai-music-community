-- =====================================================
-- Admin Operation Functions Migration
-- =====================================================
-- This migration creates functions for admin operations
-- including plan tier assignment and role management.
--
-- Requirements: 2.1, 2.2, 2.3, 2.4, 7.4
-- =====================================================

-- =====================================================
-- Function: assign_plan_tier
-- =====================================================
-- Assigns or changes a user's plan tier (Admin only)
-- Includes admin verification, validation, and audit logging
-- Requirements: 2.1, 2.2, 7.4

CREATE OR REPLACE FUNCTION public.assign_plan_tier(
  p_target_user_id UUID,
  p_new_plan_tier TEXT,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_plan_tier TEXT;
  v_is_admin BOOLEAN;
  v_action_type TEXT;
BEGIN
  -- Verify caller is admin
  SELECT public.is_user_admin(p_admin_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can assign plan tiers';
  END IF;
  
  -- Validate plan tier
  IF p_new_plan_tier NOT IN ('free_user', 'creator_pro', 'creator_premium') THEN
    RAISE EXCEPTION 'Invalid plan tier: %. Must be one of: free_user, creator_pro, creator_premium', p_new_plan_tier;
  END IF;
  
  -- Get current plan tier
  v_old_plan_tier := public.get_user_plan_tier(p_target_user_id);
  
  -- Determine action type
  IF v_old_plan_tier = 'free_user' AND NOT EXISTS (
    SELECT 1 FROM public.user_plan_tiers WHERE user_id = p_target_user_id
  ) THEN
    v_action_type := 'plan_tier_assigned';
  ELSE
    v_action_type := 'plan_tier_changed';
  END IF;
  
  -- Deactivate old plan tier(s)
  UPDATE public.user_plan_tiers
  SET is_active = false,
      updated_at = now()
  WHERE user_id = p_target_user_id
    AND is_active = true;
  
  -- Insert new plan tier
  INSERT INTO public.user_plan_tiers (user_id, plan_tier, is_active)
  VALUES (p_target_user_id, p_new_plan_tier, true);
  
  -- Log the change
  INSERT INTO public.user_type_audit_log (
    target_user_id,
    modified_by,
    action_type,
    old_value,
    new_value
  ) VALUES (
    p_target_user_id,
    p_admin_user_id,
    v_action_type,
    v_old_plan_tier,
    p_new_plan_tier
  );
  
  RETURN true;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.assign_plan_tier(UUID, TEXT, UUID) IS 
  'Assigns or changes a user''s plan tier. Only admins can call this function.
   
   Parameters:
   - p_target_user_id: UUID of the user to modify
   - p_new_plan_tier: New plan tier (free_user, creator_pro, or creator_premium)
   - p_admin_user_id: UUID of the admin making the change (defaults to current user)
   
   Returns: BOOLEAN - true if successful
   
   Throws:
   - Exception if caller is not admin
   - Exception if plan tier is invalid
   
   Side Effects:
   - Deactivates old plan tier
   - Creates new active plan tier
   - Logs change to audit log
   
   Example:
   SELECT assign_plan_tier(''123e4567-e89b-12d3-a456-426614174000'', ''creator_pro'');';

-- =====================================================
-- Function: grant_user_role
-- =====================================================
-- Grants a role to a user (Admin only)
-- Includes admin verification, validation, and audit logging
-- Requirements: 2.3, 7.4

CREATE OR REPLACE FUNCTION public.grant_user_role(
  p_target_user_id UUID,
  p_role_type TEXT,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_role_exists BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT public.is_user_admin(p_admin_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can grant roles';
  END IF;
  
  -- Validate role type
  IF p_role_type NOT IN ('admin', 'moderator', 'tester') THEN
    RAISE EXCEPTION 'Invalid role type: %. Must be one of: admin, moderator, tester', p_role_type;
  END IF;
  
  -- Check if role already exists and is active
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_target_user_id
      AND role_type = p_role_type
      AND is_active = true
  ) INTO v_role_exists;
  
  IF v_role_exists THEN
    RAISE EXCEPTION 'User already has role: %', p_role_type;
  END IF;
  
  -- Grant the role (or reactivate if previously revoked)
  INSERT INTO public.user_roles (user_id, role_type, granted_by, is_active)
  VALUES (p_target_user_id, p_role_type, p_admin_user_id, true)
  ON CONFLICT (user_id, role_type) WHERE is_active = true
  DO UPDATE SET
    granted_at = now(),
    granted_by = p_admin_user_id,
    revoked_at = NULL,
    is_active = true;
  
  -- Log the change
  INSERT INTO public.user_type_audit_log (
    target_user_id,
    modified_by,
    action_type,
    new_value
  ) VALUES (
    p_target_user_id,
    p_admin_user_id,
    'role_granted',
    p_role_type
  );
  
  RETURN true;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.grant_user_role(UUID, TEXT, UUID) IS 
  'Grants a role to a user. Only admins can call this function.
   
   Parameters:
   - p_target_user_id: UUID of the user to grant role to
   - p_role_type: Role to grant (admin, moderator, or tester)
   - p_admin_user_id: UUID of the admin making the change (defaults to current user)
   
   Returns: BOOLEAN - true if successful
   
   Throws:
   - Exception if caller is not admin
   - Exception if role type is invalid
   - Exception if user already has the role
   
   Side Effects:
   - Creates new active role or reactivates previously revoked role
   - Logs change to audit log
   
   Example:
   SELECT grant_user_role(''123e4567-e89b-12d3-a456-426614174000'', ''moderator'');';

-- =====================================================
-- Function: revoke_user_role
-- =====================================================
-- Revokes a role from a user (Admin only)
-- Includes admin verification, self-revocation prevention, and audit logging
-- Requirements: 2.4, 7.4

CREATE OR REPLACE FUNCTION public.revoke_user_role(
  p_target_user_id UUID,
  p_role_type TEXT,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT public.is_user_admin(p_admin_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can revoke roles';
  END IF;
  
  -- Prevent revoking own admin role
  IF p_target_user_id = p_admin_user_id AND p_role_type = 'admin' THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;
  
  -- Validate role type
  IF p_role_type NOT IN ('admin', 'moderator', 'tester') THEN
    RAISE EXCEPTION 'Invalid role type: %. Must be one of: admin, moderator, tester', p_role_type;
  END IF;
  
  -- Revoke the role
  UPDATE public.user_roles
  SET is_active = false,
      revoked_at = now()
  WHERE user_id = p_target_user_id
    AND role_type = p_role_type
    AND is_active = true;
  
  -- Check if any rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User does not have active role: %', p_role_type;
  END IF;
  
  -- Log the change
  INSERT INTO public.user_type_audit_log (
    target_user_id,
    modified_by,
    action_type,
    old_value
  ) VALUES (
    p_target_user_id,
    p_admin_user_id,
    'role_revoked',
    p_role_type
  );
  
  RETURN true;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.revoke_user_role(UUID, TEXT, UUID) IS 
  'Revokes a role from a user. Only admins can call this function.
   
   Parameters:
   - p_target_user_id: UUID of the user to revoke role from
   - p_role_type: Role to revoke (admin, moderator, or tester)
   - p_admin_user_id: UUID of the admin making the change (defaults to current user)
   
   Returns: BOOLEAN - true if successful
   
   Throws:
   - Exception if caller is not admin
   - Exception if trying to revoke own admin role
   - Exception if role type is invalid
   - Exception if user does not have the role
   
   Side Effects:
   - Deactivates the role and sets revoked_at timestamp
   - Logs change to audit log
   
   Example:
   SELECT revoke_user_role(''123e4567-e89b-12d3-a456-426614174000'', ''moderator'');';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created assign_plan_tier() function with admin verification
-- ✓ Created grant_user_role() function with admin verification
-- ✓ Created revoke_user_role() function with admin verification
-- ✓ Added comprehensive error handling and validation
-- ✓ Added audit logging to all functions
-- ✓ Added comprehensive documentation comments
--
-- All functions enforce admin-only access
-- All functions include proper validation
-- All functions log changes to audit log
-- =====================================================
