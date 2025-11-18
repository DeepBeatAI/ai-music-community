-- Migration: Assign initial admin role to platform owner
-- Description: Grants admin role to the specified user
-- Date: 2025-02-02
-- 
-- IMPORTANT: This migration requires manual configuration
-- Replace [ADMIN_USER_ID] with the actual user_id of the platform owner
-- 
-- Available users:
-- - Maskitest1: c6fb3653-42c4-45c8-aff1-4e4abdb866ea
-- - Maskitest2: 913d6b37-c566-492b-90ea-f24a4b4c7872
-- - Maskitest3: 12ffbb86-396d-49f9-9508-277e14e780ac

-- Step 1: Assign admin role to platform owner
-- REPLACE THE USER_ID BELOW WITH THE ACTUAL ADMIN USER ID
DO $$
DECLARE
  v_admin_user_id UUID := 'c6fb3653-42c4-45c8-aff1-4e4abdb866ea'; -- CHANGE THIS TO THE CORRECT USER ID
  v_username TEXT;
  v_user_exists BOOLEAN;
BEGIN
  -- Verify the user exists
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = v_admin_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist. Please update the v_admin_user_id variable with a valid user ID.', v_admin_user_id;
  END IF;
  
  -- Get username for logging
  SELECT username INTO v_username FROM user_profiles WHERE user_id = v_admin_user_id;
  
  -- Insert admin role (using direct INSERT since we don't have an admin yet to call grant_user_role)
  -- Check if admin role already exists
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_admin_user_id 
    AND role_type = 'admin' 
    AND is_active = true
  ) THEN
    INSERT INTO user_roles (user_id, role_type, is_active, granted_by)
    VALUES (v_admin_user_id, 'admin', true, NULL);
  ELSE
    RAISE NOTICE 'Admin role already exists for user %', v_username;
  END IF;
  
  -- Log the admin assignment in audit log
  INSERT INTO user_type_audit_log (
    target_user_id,
    modified_by,
    action_type,
    new_value,
    metadata
  ) VALUES (
    v_admin_user_id,
    v_admin_user_id, -- Self-granted for initial setup
    'role_granted',
    'admin',
    jsonb_build_object(
      'reason', 'Initial platform setup',
      'username', v_username,
      'migration_date', now()
    )
  );
  
  RAISE NOTICE '=== Admin Role Assignment ===';
  RAISE NOTICE 'Admin role granted to user: % (ID: %)', v_username, v_admin_user_id;
  RAISE NOTICE 'The user now has full administrative access to the platform.';
END $$;

-- Step 2: Verify admin role assignment
DO $$
DECLARE
  v_admin_count INTEGER;
  v_admin_username TEXT;
BEGIN
  -- Count admin users
  SELECT COUNT(*) INTO v_admin_count
  FROM user_roles
  WHERE role_type = 'admin' AND is_active = true;
  
  IF v_admin_count = 0 THEN
    RAISE WARNING 'No admin users found. Please check the migration script.';
  ELSIF v_admin_count = 1 THEN
    -- Get admin username
    SELECT up.username INTO v_admin_username
    FROM user_roles ur
    JOIN user_profiles up ON ur.user_id = up.user_id
    WHERE ur.role_type = 'admin' AND ur.is_active = true;
    
    RAISE NOTICE 'Admin role verification successful';
    RAISE NOTICE 'Platform admin: %', v_admin_username;
  ELSE
    RAISE NOTICE 'Multiple admin users found: %', v_admin_count;
  END IF;
END $$;

-- Step 3: Test admin functions
-- Verify that the admin can use admin functions
DO $$
DECLARE
  v_admin_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get the admin user ID
  SELECT user_id INTO v_admin_user_id
  FROM user_roles
  WHERE role_type = 'admin' AND is_active = true
  LIMIT 1;
  
  -- Test is_user_admin function
  SELECT is_user_admin(v_admin_user_id) INTO v_is_admin;
  
  IF v_is_admin THEN
    RAISE NOTICE 'Admin function test: PASSED - is_user_admin() returns true';
  ELSE
    RAISE WARNING 'Admin function test: FAILED - is_user_admin() returns false';
  END IF;
END $$;

-- Documentation: How to grant admin role to additional users
COMMENT ON TABLE user_roles IS 
  'Stores additional roles that can be combined with plan tiers.
   Users can have multiple active roles simultaneously (e.g., moderator + tester).
   
   Initial Admin Setup: Completed on 2025-02-02
   
   To grant admin role to additional users:
   1. Use the grant_user_role() function as an existing admin:
      SELECT grant_user_role(''[target_user_id]'', ''admin'');
   
   2. Or use the Supabase dashboard to insert directly into user_roles table
   
   To revoke admin role:
   1. Use the revoke_user_role() function as an admin:
      SELECT revoke_user_role(''[target_user_id]'', ''admin'');
   
   Note: Admins cannot revoke their own admin role for security.
   
   RLS Policies:
   - Users can view their own roles
   - Admins can view all roles
   - Only admins can insert, update, or delete roles';
