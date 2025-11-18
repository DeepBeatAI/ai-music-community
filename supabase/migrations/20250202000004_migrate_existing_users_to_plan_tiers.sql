-- Migration: Migrate existing users from user_profiles.user_type to user_plan_tiers
-- Description: Populates user_plan_tiers table with data from existing user_type column
-- Date: 2025-02-02

-- Step 1: Migrate existing users to user_plan_tiers
-- Map user_type values to plan tier enum:
-- - 'Free User' or NULL -> 'free_user'
-- - Values containing 'premium' (case-insensitive) -> 'creator_premium'
-- - Values containing 'pro' (case-insensitive) -> 'creator_pro'
-- - All other values -> 'free_user' (default)

INSERT INTO user_plan_tiers (user_id, plan_tier, is_active, started_at)
SELECT 
  user_id,
  CASE 
    -- Check for premium tier
    WHEN LOWER(COALESCE(user_type, '')) LIKE '%premium%' THEN 'creator_premium'
    -- Check for pro tier
    WHEN LOWER(COALESCE(user_type, '')) LIKE '%pro%' THEN 'creator_pro'
    -- Default to free_user for 'Free User', NULL, or any other value
    ELSE 'free_user'
  END as plan_tier,
  true as is_active,
  created_at as started_at
FROM user_profiles
WHERE user_id NOT IN (
  -- Prevent duplicates: only insert if user doesn't already have an active plan tier
  SELECT user_id FROM user_plan_tiers WHERE is_active = true
);

-- Step 2: Verify migration results
-- This will output the number of users migrated
DO $$
DECLARE
  v_total_users INTEGER;
  v_migrated_users INTEGER;
  v_free_users INTEGER;
  v_pro_users INTEGER;
  v_premium_users INTEGER;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO v_total_users FROM user_profiles;
  
  -- Count migrated users (users with active plan tier)
  SELECT COUNT(*) INTO v_migrated_users 
  FROM user_plan_tiers 
  WHERE is_active = true;
  
  -- Count users by plan tier
  SELECT COUNT(*) INTO v_free_users 
  FROM user_plan_tiers 
  WHERE is_active = true AND plan_tier = 'free_user';
  
  SELECT COUNT(*) INTO v_pro_users 
  FROM user_plan_tiers 
  WHERE is_active = true AND plan_tier = 'creator_pro';
  
  SELECT COUNT(*) INTO v_premium_users 
  FROM user_plan_tiers 
  WHERE is_active = true AND plan_tier = 'creator_premium';
  
  -- Output migration summary
  RAISE NOTICE '=== User Plan Tier Migration Summary ===';
  RAISE NOTICE 'Total users in user_profiles: %', v_total_users;
  RAISE NOTICE 'Users migrated to user_plan_tiers: %', v_migrated_users;
  RAISE NOTICE '  - Free User: %', v_free_users;
  RAISE NOTICE '  - Creator Pro: %', v_pro_users;
  RAISE NOTICE '  - Creator Premium: %', v_premium_users;
  
  -- Verify all users have been migrated
  IF v_total_users != v_migrated_users THEN
    RAISE WARNING 'Migration incomplete: % users not migrated', (v_total_users - v_migrated_users);
  ELSE
    RAISE NOTICE 'Migration successful: All users have been assigned plan tiers';
  END IF;
END $$;

-- Step 3: Add comment to document migration completion
COMMENT ON TABLE user_plan_tiers IS 
  'Stores subscription plan tiers for users. Each user must have exactly one active plan tier.
   Plan tiers determine feature access and usage limits.
   
   Migration Status: Completed on 2025-02-02
   - All existing users migrated from user_profiles.user_type
   - Default plan tier: free_user
   
   RLS Policies:
   - Users can view their own plan tier
   - Admins can view all plan tiers
   - Only admins can insert, update, or delete plan tiers';
