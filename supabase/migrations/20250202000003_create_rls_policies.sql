-- =====================================================
-- Row Level Security (RLS) Policies Migration
-- =====================================================
-- This migration creates RLS policies for user_plan_tiers,
-- user_roles, and user_type_audit_log tables.
--
-- Requirements: 5.3, 7.1, 7.2, 7.3, 7.5
-- =====================================================

-- =====================================================
-- 1. RLS Policies for user_plan_tiers
-- =====================================================
-- Requirements: 5.3, 7.1, 7.2, 7.3

-- Enable RLS on user_plan_tiers table
ALTER TABLE public.user_plan_tiers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own plan tier
CREATE POLICY "Users can view own plan tier"
  ON public.user_plan_tiers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all plan tiers
CREATE POLICY "Admins can view all plan tiers"
  ON public.user_plan_tiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Policy: Only admins can insert plan tiers
CREATE POLICY "Only admins can insert plan tiers"
  ON public.user_plan_tiers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Policy: Only admins can update plan tiers
CREATE POLICY "Only admins can update plan tiers"
  ON public.user_plan_tiers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Policy: Only admins can delete plan tiers
CREATE POLICY "Only admins can delete plan tiers"
  ON public.user_plan_tiers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Add table comment documenting RLS policies
COMMENT ON TABLE public.user_plan_tiers IS 
  'Stores subscription plan tiers for users. Each user must have exactly one active plan tier.
   Plan tiers determine feature access and usage limits.
   
   RLS Policies:
   - Users can view their own plan tier
   - Admins can view all plan tiers
   - Only admins can insert, update, or delete plan tiers';

-- =====================================================
-- 2. RLS Policies for user_roles
-- =====================================================
-- Requirements: 5.3, 7.1, 7.2, 7.3

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles AS admin_check
      WHERE admin_check.user_id = auth.uid()
        AND admin_check.role_type = 'admin'
        AND admin_check.is_active = true
    )
  );

-- Policy: Only admins can insert roles
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles AS admin_check
      WHERE admin_check.user_id = auth.uid()
        AND admin_check.role_type = 'admin'
        AND admin_check.is_active = true
    )
  );

-- Policy: Only admins can update roles
CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles AS admin_check
      WHERE admin_check.user_id = auth.uid()
        AND admin_check.role_type = 'admin'
        AND admin_check.is_active = true
    )
  );

-- Policy: Only admins can delete roles
CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles AS admin_check
      WHERE admin_check.user_id = auth.uid()
        AND admin_check.role_type = 'admin'
        AND admin_check.is_active = true
    )
  );

-- Add table comment documenting RLS policies
COMMENT ON TABLE public.user_roles IS 
  'Stores additional roles that can be combined with plan tiers.
   Users can have multiple active roles simultaneously (e.g., moderator + tester).
   
   RLS Policies:
   - Users can view their own roles
   - Admins can view all roles
   - Only admins can insert, update, or delete roles';

-- =====================================================
-- 3. RLS Policies for user_type_audit_log
-- =====================================================
-- Requirements: 5.3, 7.5

-- Enable RLS on user_type_audit_log table
ALTER TABLE public.user_type_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.user_type_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Policy: Only admins can insert audit logs
-- Note: In practice, audit logs are inserted by database functions
-- This policy ensures only admins can manually insert if needed
CREATE POLICY "Only admins can insert audit logs"
  ON public.user_type_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Policy: Prevent updates to audit logs (immutable)
-- Audit logs should never be updated, only inserted
CREATE POLICY "Prevent updates to audit logs"
  ON public.user_type_audit_log
  FOR UPDATE
  USING (false);

-- Policy: Prevent deletes from audit logs (immutable)
-- Audit logs should never be deleted for compliance
CREATE POLICY "Prevent deletes from audit logs"
  ON public.user_type_audit_log
  FOR DELETE
  USING (false);

-- Add table comment documenting RLS policies
COMMENT ON TABLE public.user_type_audit_log IS 
  'Audit log for all user type and role modifications.
   Tracks who made changes, when, and what was changed for security and compliance.
   
   RLS Policies:
   - Only admins can view audit logs
   - Only admins can insert audit logs (via database functions)
   - Audit logs are immutable (cannot be updated or deleted)';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Enabled RLS on user_plan_tiers table
-- ✓ Created policies for users to view own plan tier
-- ✓ Created policies for admins to view all plan tiers
-- ✓ Created policies for admins to modify plan tiers
--
-- ✓ Enabled RLS on user_roles table
-- ✓ Created policies for users to view own roles
-- ✓ Created policies for admins to view all roles
-- ✓ Created policies for admins to modify roles
--
-- ✓ Enabled RLS on user_type_audit_log table
-- ✓ Created policies for admins to view audit logs
-- ✓ Created policies to prevent modification of audit logs
--
-- All tables now have comprehensive RLS protection
-- Security is enforced at the database level
-- =====================================================
