-- =====================================================
-- Moderation Data Cleanup Migration
-- =====================================================
-- Description: Cleans up all moderation-related data while preserving database structure
-- Created: 2024-12-16
-- Purpose: Reset moderation system to clean state for production/testing
--
-- This migration:
-- 1. Clears all moderation reports
-- 2. Clears all moderation actions
-- 3. Clears all user restrictions
-- 4. Clears all admin audit logs
-- 5. Resets all user suspension/ban status
-- 6. Clears all moderation-related notifications
-- 7. Preserves all database structure (tables, functions, policies, indexes)
-- =====================================================

BEGIN;

-- =====================================================
-- Step 1: Clear Moderation Reports
-- =====================================================
-- Delete all reports (pending, resolved, dismissed)
DELETE FROM public.moderation_reports;

-- Reset sequence if needed (optional, for clean IDs)
-- Note: UUID primary keys don't use sequences, so this is informational only

-- =====================================================
-- Step 2: Clear Moderation Actions
-- =====================================================
-- Delete all moderation actions (warnings, suspensions, content removals, etc.)
DELETE FROM public.moderation_actions;

-- =====================================================
-- Step 3: Clear User Restrictions
-- =====================================================
-- Delete all user restrictions (posting, commenting, upload restrictions)
DELETE FROM public.user_restrictions;

-- =====================================================
-- Step 4: Clear Admin Audit Logs
-- =====================================================
-- Delete all admin audit logs
DELETE FROM public.admin_audit_log;

-- =====================================================
-- Step 5: Reset User Suspension/Ban Status
-- =====================================================
-- Clear suspension data from user_profiles
UPDATE public.user_profiles
SET 
  suspended_until = NULL,
  suspension_reason = NULL,
  updated_at = now()
WHERE 
  suspended_until IS NOT NULL 
  OR suspension_reason IS NOT NULL;

-- Unban all users from Supabase Auth
-- Note: This requires manual intervention via Supabase Dashboard or API
-- as there's no direct SQL access to auth.users ban status
-- Users will need to be unbanned via:
-- 1. Supabase Dashboard: Authentication > Users > Select user > Unban
-- 2. Or via Management API: DELETE /admin/users/{user_id}/factors/ban

-- =====================================================
-- Step 6: Clear Moderation-Related Notifications
-- =====================================================
-- Delete notifications related to moderation actions
DELETE FROM public.notifications
WHERE type IN (
  'moderation_action',
  'content_removed',
  'warning_issued',
  'restriction_applied',
  'suspension_notice',
  'restriction_expired',
  'suspension_expired',
  'moderation'  -- Added for P1/P2 report notifications
);

-- =====================================================
-- Step 7: Clear User Sessions (Optional)
-- =====================================================
-- Clear active sessions for previously suspended/banned users
-- This ensures they can log in fresh after cleanup
-- Note: This is optional and may log out all users
-- Uncomment if you want to force re-authentication

-- DELETE FROM auth.sessions
-- WHERE user_id IN (
--   SELECT user_id 
--   FROM public.user_profiles 
--   WHERE suspended_until IS NOT NULL OR suspension_reason IS NOT NULL
-- );

-- =====================================================
-- Verification Queries (for manual checking)
-- =====================================================
-- Run these queries after migration to verify cleanup:

-- Check reports count (should be 0)
-- SELECT COUNT(*) as reports_count FROM public.moderation_reports;

-- Check actions count (should be 0)
-- SELECT COUNT(*) as actions_count FROM public.moderation_actions;

-- Check restrictions count (should be 0)
-- SELECT COUNT(*) as restrictions_count FROM public.user_restrictions;

-- Check audit logs count (should be 0)
-- SELECT COUNT(*) as audit_logs_count FROM public.admin_audit_log;

-- Check suspended users count (should be 0)
-- SELECT COUNT(*) as suspended_users_count 
-- FROM public.user_profiles 
-- WHERE suspended_until IS NOT NULL OR suspension_reason IS NOT NULL;

-- Check moderation notifications count (should be 0)
-- SELECT COUNT(*) as moderation_notifications_count 
-- FROM public.notifications 
-- WHERE type IN ('moderation_action', 'content_removed', 'warning_issued', 
--                'restriction_applied', 'suspension_notice', 'restriction_expired', 
--                'suspension_expired', 'moderation');

COMMIT;

-- =====================================================
-- Post-Migration Notes
-- =====================================================
-- 
-- IMPORTANT: Manual Steps Required
-- ---------------------------------
-- 1. Unban users from Supabase Auth (if any were banned):
--    - Go to Supabase Dashboard > Authentication > Users
--    - Filter for banned users
--    - Unban each user manually
--    - Or use Management API to unban programmatically
--
-- 2. Verify content visibility:
--    - Check if any posts/comments were marked as removed
--    - Update content visibility if needed
--
-- 3. Test moderation system:
--    - Create a test report
--    - Take a test moderation action
--    - Verify everything works as expected
--
-- Database Structure Preserved:
-- -----------------------------
-- ✓ Tables: moderation_reports, moderation_actions, user_restrictions, admin_audit_log
-- ✓ Functions: All moderation functions remain intact
-- ✓ RLS Policies: All security policies remain active
-- ✓ Indexes: All performance indexes remain
-- ✓ Triggers: All automation triggers remain
--
-- What Was Cleaned:
-- -----------------
-- ✓ All moderation reports (pending, resolved, dismissed)
-- ✓ All moderation actions (warnings, suspensions, removals)
-- ✓ All user restrictions (posting, commenting, uploads)
-- ✓ All admin audit logs
-- ✓ All user suspension data (suspended_until, suspension_reason)
-- ✓ All moderation-related notifications
--
-- =====================================================
