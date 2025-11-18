-- =====================================================
-- User Type Utility Functions Migration
-- =====================================================
-- This migration creates utility functions for querying
-- user plan tiers and roles.
--
-- Requirements: 1.1, 6.1, 6.4
-- =====================================================

-- =====================================================
-- Function: get_user_plan_tier
-- =====================================================
-- Returns the active plan tier for a user
-- Returns 'free_user' as default if no plan tier found
-- Requirements: 1.1, 6.1

CREATE OR REPLACE FUNCTION public.get_user_plan_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_tier TEXT;
BEGIN
  -- Get the active plan tier for the user
  SELECT plan_tier INTO v_plan_tier
  FROM public.user_plan_tiers
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;
  
  -- Default to 'free_user' if no plan tier found
  RETURN COALESCE(v_plan_tier, 'free_user');
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.get_user_plan_tier(UUID) IS 
  'Returns the active plan tier for a user. Returns ''free_user'' as default if no plan tier is found.
   
   Parameters:
   - p_user_id: UUID of the user
   
   Returns: TEXT - plan tier value (free_user, creator_pro, or creator_premium)
   
   Example:
   SELECT get_user_plan_tier(''123e4567-e89b-12d3-a456-426614174000'');';

-- =====================================================
-- Function: get_user_roles
-- =====================================================
-- Returns all active roles for a user as an array
-- Returns empty array if no roles found
-- Requirements: 1.1, 6.1

CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles TEXT[];
BEGIN
  -- Get all active roles for the user, ordered alphabetically
  SELECT ARRAY_AGG(role_type ORDER BY role_type)
  INTO v_roles
  FROM public.user_roles
  WHERE user_id = p_user_id
    AND is_active = true;
  
  -- Return empty array if no roles found
  RETURN COALESCE(v_roles, ARRAY[]::TEXT[]);
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.get_user_roles(UUID) IS 
  'Returns all active roles for a user as an array. Returns empty array if no roles are found.
   
   Parameters:
   - p_user_id: UUID of the user
   
   Returns: TEXT[] - array of role types (admin, moderator, tester)
   
   Example:
   SELECT get_user_roles(''123e4567-e89b-12d3-a456-426614174000'');';

-- =====================================================
-- Function: get_user_all_types
-- =====================================================
-- Returns plan tier and roles combined for display purposes
-- Returns a table with plan_tier, roles array, and all_types array
-- Requirements: 6.1, 6.4

CREATE OR REPLACE FUNCTION public.get_user_all_types(p_user_id UUID)
RETURNS TABLE(
  plan_tier TEXT,
  roles TEXT[],
  all_types TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_tier TEXT;
  v_roles TEXT[];
  v_all_types TEXT[];
BEGIN
  -- Get plan tier
  v_plan_tier := public.get_user_plan_tier(p_user_id);
  
  -- Get roles
  v_roles := public.get_user_roles(p_user_id);
  
  -- Combine for display (plan tier + roles)
  v_all_types := ARRAY[v_plan_tier] || COALESCE(v_roles, ARRAY[]::TEXT[]);
  
  -- Return the combined information
  RETURN QUERY SELECT v_plan_tier, v_roles, v_all_types;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.get_user_all_types(UUID) IS 
  'Returns plan tier and roles combined for display purposes.
   
   Parameters:
   - p_user_id: UUID of the user
   
   Returns: TABLE with columns:
   - plan_tier: TEXT - the active plan tier
   - roles: TEXT[] - array of active roles
   - all_types: TEXT[] - combined array of plan tier and roles for display
   
   Example:
   SELECT * FROM get_user_all_types(''123e4567-e89b-12d3-a456-426614174000'');';

-- =====================================================
-- Function: is_user_admin
-- =====================================================
-- Quick check if a user has admin role
-- Returns true if user has active admin role, false otherwise
-- Requirements: 6.1, 6.4

CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has active admin role
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role_type = 'admin'
      AND is_active = true
  );
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.is_user_admin(UUID) IS 
  'Quick check if a user has admin role. Returns true if user has active admin role, false otherwise.
   
   Parameters:
   - p_user_id: UUID of the user
   
   Returns: BOOLEAN - true if user is admin, false otherwise
   
   Example:
   SELECT is_user_admin(''123e4567-e89b-12d3-a456-426614174000'');';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created get_user_plan_tier() function
-- ✓ Created get_user_roles() function
-- ✓ Created get_user_all_types() function
-- ✓ Created is_user_admin() function
-- ✓ Added comprehensive documentation comments
--
-- All functions use SECURITY DEFINER for controlled access
-- All functions include proper error handling and defaults
-- =====================================================
