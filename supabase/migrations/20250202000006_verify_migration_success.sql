-- Migration: Verify migration success
-- Description: Comprehensive verification of user type system migration
-- Date: 2025-02-02

-- This migration performs verification checks and does not modify data

-- ============================================================================
-- VERIFICATION 1: All users have plan tiers
-- ============================================================================
DO $$
DECLARE
  v_total_users INTEGER;
  v_users_with_plan_tier INTEGER;
  v_users_without_plan_tier INTEGER;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO v_total_users FROM user_profiles;
  
  -- Count users with active plan tier
  SELECT COUNT(DISTINCT user_id) INTO v_users_with_plan_tier
  FROM user_plan_tiers
  WHERE is_active = true;
  
  -- Calculate users without plan tier
  v_users_without_plan_tier := v_total_users - v_users_with_plan_tier;
  
  RAISE NOTICE '=== VERIFICATION 1: Plan Tier Assignment ===';
  RAISE NOTICE 'Total users: %', v_total_users;
  RAISE NOTICE 'Users with plan tier: %', v_users_with_plan_tier;
  RAISE NOTICE 'Users without plan tier: %', v_users_without_plan_tier;
  
  IF v_users_without_plan_tier > 0 THEN
    RAISE WARNING 'FAILED: % users do not have a plan tier assigned', v_users_without_plan_tier;
    
    -- List users without plan tier
    RAISE NOTICE 'Users without plan tier:';
    FOR v_user IN 
      SELECT up.username, up.user_id
      FROM user_profiles up
      WHERE up.user_id NOT IN (
        SELECT user_id FROM user_plan_tiers WHERE is_active = true
      )
    LOOP
      RAISE NOTICE '  - % (ID: %)', v_user.username, v_user.user_id;
    END LOOP;
  ELSE
    RAISE NOTICE 'PASSED: All users have plan tiers assigned';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION 2: Admin role assigned correctly
-- ============================================================================
DO $$
DECLARE
  v_admin_count INTEGER;
  v_admin_username TEXT;
  v_admin_user_id UUID;
BEGIN
  -- Count admin users
  SELECT COUNT(*) INTO v_admin_count
  FROM user_roles
  WHERE role_type = 'admin' AND is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION 2: Admin Role Assignment ===';
  RAISE NOTICE 'Admin users count: %', v_admin_count;
  
  IF v_admin_count = 0 THEN
    RAISE WARNING 'FAILED: No admin users found';
  ELSIF v_admin_count >= 1 THEN
    RAISE NOTICE 'PASSED: Admin role(s) assigned';
    
    -- List all admin users
    RAISE NOTICE 'Admin users:';
    FOR v_admin IN 
      SELECT up.username, ur.user_id, ur.granted_at
      FROM user_roles ur
      JOIN user_profiles up ON ur.user_id = up.user_id
      WHERE ur.role_type = 'admin' AND ur.is_active = true
      ORDER BY ur.granted_at
    LOOP
      RAISE NOTICE '  - % (ID: %, granted: %)', v_admin.username, v_admin.user_id, v_admin.granted_at;
    END LOOP;
    
    -- Test admin functions
    SELECT user_id INTO v_admin_user_id
    FROM user_roles
    WHERE role_type = 'admin' AND is_active = true
    LIMIT 1;
    
    IF is_user_admin(v_admin_user_id) THEN
      RAISE NOTICE 'PASSED: is_user_admin() function works correctly';
    ELSE
      RAISE WARNING 'FAILED: is_user_admin() function returns false for admin user';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION 3: No orphaned or duplicate records
-- ============================================================================
DO $$
DECLARE
  v_duplicate_plan_tiers INTEGER;
  v_orphaned_plan_tiers INTEGER;
  v_orphaned_roles INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION 3: Data Integrity ===';
  
  -- Check for duplicate active plan tiers
  SELECT COUNT(*) INTO v_duplicate_plan_tiers
  FROM (
    SELECT user_id, COUNT(*) as tier_count
    FROM user_plan_tiers
    WHERE is_active = true
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_plan_tiers > 0 THEN
    RAISE WARNING 'FAILED: % users have multiple active plan tiers', v_duplicate_plan_tiers;
    
    -- List users with duplicate plan tiers
    FOR v_user IN 
      SELECT up.username, upt.user_id, COUNT(*) as tier_count
      FROM user_plan_tiers upt
      JOIN user_profiles up ON upt.user_id = up.user_id
      WHERE upt.is_active = true
      GROUP BY up.username, upt.user_id
      HAVING COUNT(*) > 1
    LOOP
      RAISE NOTICE '  - % (ID: %) has % active plan tiers', v_user.username, v_user.user_id, v_user.tier_count;
    END LOOP;
  ELSE
    RAISE NOTICE 'PASSED: No duplicate active plan tiers';
  END IF;
  
  -- Check for orphaned plan tier records (user doesn't exist)
  SELECT COUNT(*) INTO v_orphaned_plan_tiers
  FROM user_plan_tiers upt
  WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = upt.user_id
  );
  
  IF v_orphaned_plan_tiers > 0 THEN
    RAISE WARNING 'FAILED: % orphaned plan tier records found', v_orphaned_plan_tiers;
  ELSE
    RAISE NOTICE 'PASSED: No orphaned plan tier records';
  END IF;
  
  -- Check for orphaned role records (user doesn't exist)
  SELECT COUNT(*) INTO v_orphaned_roles
  FROM user_roles ur
  WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = ur.user_id
  );
  
  IF v_orphaned_roles > 0 THEN
    RAISE WARNING 'FAILED: % orphaned role records found', v_orphaned_roles;
  ELSE
    RAISE NOTICE 'PASSED: No orphaned role records';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION 4: Database functions work correctly
-- ============================================================================
DO $$
DECLARE
  v_test_user_id UUID;
  v_test_username TEXT;
  v_plan_tier TEXT;
  v_roles TEXT[];
  v_all_types RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION 4: Database Functions ===';
  
  -- Get a test user
  SELECT user_id, username INTO v_test_user_id, v_test_username
  FROM user_profiles
  LIMIT 1;
  
  -- Test get_user_plan_tier
  BEGIN
    v_plan_tier := get_user_plan_tier(v_test_user_id);
    RAISE NOTICE 'PASSED: get_user_plan_tier() returns: %', v_plan_tier;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'FAILED: get_user_plan_tier() error: %', SQLERRM;
  END;
  
  -- Test get_user_roles
  BEGIN
    v_roles := get_user_roles(v_test_user_id);
    RAISE NOTICE 'PASSED: get_user_roles() returns: %', COALESCE(array_to_string(v_roles, ', '), 'no roles');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'FAILED: get_user_roles() error: %', SQLERRM;
  END;
  
  -- Test get_user_all_types
  BEGIN
    SELECT * INTO v_all_types FROM get_user_all_types(v_test_user_id);
    RAISE NOTICE 'PASSED: get_user_all_types() returns plan_tier: %, roles: %', 
      v_all_types.plan_tier, 
      COALESCE(array_to_string(v_all_types.roles, ', '), 'no roles');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'FAILED: get_user_all_types() error: %', SQLERRM;
  END;
  
  -- Test is_user_admin
  BEGIN
    IF is_user_admin(v_test_user_id) THEN
      RAISE NOTICE 'PASSED: is_user_admin() returns true for user %', v_test_username;
    ELSE
      RAISE NOTICE 'PASSED: is_user_admin() returns false for user %', v_test_username;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'FAILED: is_user_admin() error: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- VERIFICATION 5: Audit log is working
-- ============================================================================
DO $$
DECLARE
  v_audit_log_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION 5: Audit Log ===';
  
  -- Count audit log entries
  SELECT COUNT(*) INTO v_audit_log_count FROM user_type_audit_log;
  
  IF v_audit_log_count = 0 THEN
    RAISE WARNING 'WARNING: No audit log entries found (expected at least 1 for admin role grant)';
  ELSE
    RAISE NOTICE 'PASSED: Audit log has % entries', v_audit_log_count;
    
    -- Show recent audit log entries
    RAISE NOTICE 'Recent audit log entries:';
    FOR v_log IN 
      SELECT 
        up.username,
        ual.action_type,
        ual.old_value,
        ual.new_value,
        ual.created_at
      FROM user_type_audit_log ual
      JOIN user_profiles up ON ual.target_user_id = up.user_id
      ORDER BY ual.created_at DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  - % | % | % -> % | %', 
        v_log.username, 
        v_log.action_type, 
        COALESCE(v_log.old_value, 'NULL'), 
        COALESCE(v_log.new_value, 'NULL'),
        v_log.created_at;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
DO $$
DECLARE
  v_total_users INTEGER;
  v_users_with_plan_tier INTEGER;
  v_admin_count INTEGER;
  v_duplicate_plan_tiers INTEGER;
  v_orphaned_records INTEGER;
  v_all_checks_passed BOOLEAN := true;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION VERIFICATION SUMMARY ===';
  
  -- Gather all metrics
  SELECT COUNT(*) INTO v_total_users FROM user_profiles;
  
  SELECT COUNT(DISTINCT user_id) INTO v_users_with_plan_tier
  FROM user_plan_tiers WHERE is_active = true;
  
  SELECT COUNT(*) INTO v_admin_count
  FROM user_roles WHERE role_type = 'admin' AND is_active = true;
  
  SELECT COUNT(*) INTO v_duplicate_plan_tiers
  FROM (
    SELECT user_id FROM user_plan_tiers WHERE is_active = true
    GROUP BY user_id HAVING COUNT(*) > 1
  ) duplicates;
  
  SELECT COUNT(*) INTO v_orphaned_records
  FROM (
    SELECT user_id FROM user_plan_tiers
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = user_plan_tiers.user_id)
    UNION
    SELECT user_id FROM user_roles
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = user_roles.user_id)
  ) orphaned;
  
  -- Check each condition
  IF v_total_users != v_users_with_plan_tier THEN
    RAISE NOTICE '❌ FAILED: Not all users have plan tiers';
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE '✓ PASSED: All % users have plan tiers', v_total_users;
  END IF;
  
  IF v_admin_count = 0 THEN
    RAISE NOTICE '❌ FAILED: No admin users found';
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE '✓ PASSED: % admin user(s) assigned', v_admin_count;
  END IF;
  
  IF v_duplicate_plan_tiers > 0 THEN
    RAISE NOTICE '❌ FAILED: % users have duplicate plan tiers', v_duplicate_plan_tiers;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE '✓ PASSED: No duplicate plan tiers';
  END IF;
  
  IF v_orphaned_records > 0 THEN
    RAISE NOTICE '❌ FAILED: % orphaned records found', v_orphaned_records;
    v_all_checks_passed := false;
  ELSE
    RAISE NOTICE '✓ PASSED: No orphaned records';
  END IF;
  
  RAISE NOTICE '';
  IF v_all_checks_passed THEN
    RAISE NOTICE '✓✓✓ MIGRATION SUCCESSFUL ✓✓✓';
    RAISE NOTICE 'All verification checks passed. The user type system is ready for use.';
  ELSE
    RAISE WARNING '❌❌❌ MIGRATION INCOMPLETE ❌❌❌';
    RAISE WARNING 'Some verification checks failed. Please review the issues above.';
  END IF;
END $$;
