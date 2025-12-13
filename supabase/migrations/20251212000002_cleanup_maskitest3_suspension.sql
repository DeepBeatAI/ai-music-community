-- =====================================================
-- Cleanup Maskitest3 Suspension Data
-- =====================================================
-- Migration: 20251212000002_cleanup_maskitest3_suspension.sql
-- Description: 
--   - Clean up expired suspension data for Maskitest3 user
--   - Deactivate old restriction records
--   - Prepare for fresh permanent suspension
-- Date: 2025-12-12
-- =====================================================

-- Deactivate all existing active restrictions for this user
UPDATE public.user_restrictions
SET 
  is_active = false,
  updated_at = now()
WHERE user_id = '12ffbb86-396d-49f9-9508-277e14e780ac'
  AND is_active = true;

-- Clear the expired suspension from user_profiles
UPDATE public.user_profiles
SET 
  suspended_until = NULL,
  suspension_reason = NULL,
  updated_at = now()
WHERE user_id = '12ffbb86-396d-49f9-9508-277e14e780ac';

-- =====================================================
-- Summary
-- =====================================================
-- ✓ Deactivated all active restrictions for user
-- ✓ Cleared expired suspension data from user_profiles
-- ✓ User is now ready for a fresh permanent suspension
