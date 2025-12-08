-- Cleanup Script: Remove Old Restrictions on Maskitest3
-- This script deactivates all active restrictions for the test user Maskitest3
-- Run this in your Supabase SQL Editor

-- Step 1: Find the user ID for Maskitest3
DO $$
DECLARE
  v_user_id UUID;
  v_restriction RECORD;
BEGIN
  -- Get the user ID
  SELECT user_id INTO v_user_id
  FROM user_profiles
  WHERE username = 'Maskitest3';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User Maskitest3 not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user Maskitest3 with ID: %', v_user_id;

  -- Step 2: Deactivate all active restrictions for this user
  UPDATE user_restrictions
  SET 
    is_active = false,
    updated_at = now()
  WHERE 
    user_id = v_user_id
    AND is_active = true;

  RAISE NOTICE 'Deactivated % restriction(s) for Maskitest3', 
    (SELECT COUNT(*) FROM user_restrictions WHERE user_id = v_user_id AND is_active = false);

  -- Step 3: Show the deactivated restrictions
  RAISE NOTICE 'Deactivated restrictions:';
  FOR v_restriction IN 
    SELECT id, restriction_type, reason, created_at, expires_at
    FROM user_restrictions
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE '  - % (%) created at %, expires at %', 
      v_restriction.restriction_type, 
      v_restriction.reason,
      v_restriction.created_at,
      COALESCE(v_restriction.expires_at::text, 'never');
  END LOOP;

END $$;

-- Verify: Show current state of restrictions for Maskitest3
SELECT 
  ur.id,
  ur.restriction_type,
  ur.is_active,
  ur.expires_at,
  ur.reason,
  ur.created_at,
  ur.related_action_id
FROM user_restrictions ur
JOIN user_profiles up ON ur.user_id = up.user_id
WHERE up.username = 'Maskitest3'
ORDER BY ur.created_at DESC;
