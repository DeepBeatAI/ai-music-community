-- Simple Cleanup: Deactivate all restrictions for Maskitest3
-- Copy and paste this into Supabase SQL Editor

-- Deactivate all active restrictions for Maskitest3
UPDATE user_restrictions
SET 
  is_active = false,
  updated_at = now()
WHERE user_id IN (
  SELECT user_id 
  FROM user_profiles 
  WHERE username = 'Maskitest3'
)
AND is_active = true;

-- Verify the cleanup
SELECT 
  ur.id,
  ur.restriction_type,
  ur.is_active,
  ur.expires_at,
  ur.reason,
  ur.created_at
FROM user_restrictions ur
JOIN user_profiles up ON ur.user_id = up.user_id
WHERE up.username = 'Maskitest3'
ORDER BY ur.created_at DESC;
