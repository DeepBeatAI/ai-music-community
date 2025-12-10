-- =====================================================
-- Cleanup Script: Fix Maskitest3 Suspension State
-- Description: Clean up duplicate suspension records for Maskitest3
-- Date: 2025-12-09
-- =====================================================

-- Get the user_id for Maskitest3
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find Maskitest3's user_id
  SELECT user_id INTO v_user_id
  FROM user_profiles
  WHERE username = 'Maskitest3';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User Maskitest3 not found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found Maskitest3 with user_id: %', v_user_id;
  
  -- 1. Clear suspension from user_profiles
  UPDATE user_profiles
  SET 
    suspended_until = NULL,
    suspension_reason = NULL,
    updated_at = NOW()
  WHERE user_id = v_user_id
    AND (suspended_until IS NOT NULL OR suspension_reason IS NOT NULL);
  
  RAISE NOTICE 'Cleared suspension from user_profiles';
  
  -- 2. Deactivate all active suspended restrictions
  UPDATE user_restrictions
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE user_id = v_user_id
    AND restriction_type = 'suspended'
    AND is_active = true;
  
  RAISE NOTICE 'Deactivated suspended restrictions';
  
  -- 3. Show current state
  RAISE NOTICE '=== Current State ===';
  RAISE NOTICE 'User Profile Suspension: %', (
    SELECT COALESCE(suspended_until::TEXT, 'NULL')
    FROM user_profiles
    WHERE user_id = v_user_id
  );
  
  RAISE NOTICE 'Active Restrictions: %', (
    SELECT COUNT(*)
    FROM user_restrictions
    WHERE user_id = v_user_id
      AND is_active = true
  );
  
  RAISE NOTICE 'Active Suspension Actions: %', (
    SELECT COUNT(*)
    FROM moderation_actions
    WHERE target_user_id = v_user_id
      AND action_type IN ('user_suspended', 'user_banned')
      AND revoked_at IS NULL
  );
  
END $$;
