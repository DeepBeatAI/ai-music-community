-- =====================================================
-- User Types and Plan Tiers System Migration
-- =====================================================
-- This migration creates the infrastructure for a flexible
-- user type system supporting plan tiers and roles.
--
-- Requirements: 1.1, 1.3, 5.1, 5.2, 7.5, 8.1
-- =====================================================

-- =====================================================
-- 1. Create user_plan_tiers table
-- =====================================================
-- Stores subscription tier for each user (one active tier per user)
-- Requirements: 1.1, 1.3, 5.1, 5.2

CREATE TABLE IF NOT EXISTS public.user_plan_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid plan_tier values
  CONSTRAINT valid_plan_tier CHECK (
    plan_tier IN ('free_user', 'creator_pro', 'creator_premium')
  )
);

-- Create unique partial index to ensure only one active plan tier per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_plan_per_user 
  ON public.user_plan_tiers(user_id) 
  WHERE is_active = true;

-- Add table comment for documentation
COMMENT ON TABLE public.user_plan_tiers IS 
  'Stores subscription plan tiers for users. Each user must have exactly one active plan tier. 
   Plan tiers determine feature access and usage limits.';

-- Add column comments for documentation
COMMENT ON COLUMN public.user_plan_tiers.id IS 'Unique identifier for the plan tier record';
COMMENT ON COLUMN public.user_plan_tiers.user_id IS 'Reference to the user in auth.users';
COMMENT ON COLUMN public.user_plan_tiers.plan_tier IS 'Plan tier: free_user, creator_pro, or creator_premium';
COMMENT ON COLUMN public.user_plan_tiers.is_active IS 'Whether this is the currently active plan tier for the user';
COMMENT ON COLUMN public.user_plan_tiers.started_at IS 'When this plan tier became active';
COMMENT ON COLUMN public.user_plan_tiers.expires_at IS 'When this plan tier expires (NULL for indefinite)';
COMMENT ON COLUMN public.user_plan_tiers.created_at IS 'When this record was created';
COMMENT ON COLUMN public.user_plan_tiers.updated_at IS 'When this record was last updated';

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_plan_tiers_user_id 
  ON public.user_plan_tiers(user_id);

CREATE INDEX IF NOT EXISTS idx_user_plan_tiers_active 
  ON public.user_plan_tiers(user_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_plan_tiers_plan_tier 
  ON public.user_plan_tiers(plan_tier) 
  WHERE is_active = true;

-- =====================================================
-- 2. Create user_roles table
-- =====================================================
-- Stores additional roles that can be combined with plan tiers
-- Requirements: 1.1, 1.3, 5.1, 5.2

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid role_type values
  CONSTRAINT valid_role_type CHECK (
    role_type IN ('admin', 'moderator', 'tester')
  )
);

-- Create unique partial index to prevent duplicate active roles for same user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_role_per_user 
  ON public.user_roles(user_id, role_type) 
  WHERE is_active = true;

-- Add table comment for documentation
COMMENT ON TABLE public.user_roles IS 
  'Stores additional roles that can be combined with plan tiers. 
   Users can have multiple active roles simultaneously (e.g., moderator + tester).';

-- Add column comments for documentation
COMMENT ON COLUMN public.user_roles.id IS 'Unique identifier for the role record';
COMMENT ON COLUMN public.user_roles.user_id IS 'Reference to the user in auth.users';
COMMENT ON COLUMN public.user_roles.role_type IS 'Role type: admin, moderator, or tester';
COMMENT ON COLUMN public.user_roles.granted_at IS 'When this role was granted';
COMMENT ON COLUMN public.user_roles.granted_by IS 'User ID of the admin who granted this role';
COMMENT ON COLUMN public.user_roles.revoked_at IS 'When this role was revoked (NULL if still active)';
COMMENT ON COLUMN public.user_roles.is_active IS 'Whether this role is currently active';
COMMENT ON COLUMN public.user_roles.created_at IS 'When this record was created';

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_active 
  ON public.user_roles(user_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_roles_type 
  ON public.user_roles(role_type, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by 
  ON public.user_roles(granted_by) 
  WHERE granted_by IS NOT NULL;

-- =====================================================
-- 3. Create user_type_audit_log table
-- =====================================================
-- Tracks all user type and role modifications for security auditing
-- Requirements: 5.1, 7.5, 8.1

CREATE TABLE IF NOT EXISTS public.user_type_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  modified_by UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid action_type values
  CONSTRAINT valid_action_type CHECK (
    action_type IN (
      'plan_tier_assigned', 
      'plan_tier_changed', 
      'role_granted', 
      'role_revoked'
    )
  )
);

-- Add table comment for documentation
COMMENT ON TABLE public.user_type_audit_log IS 
  'Audit log for all user type and role modifications. 
   Tracks who made changes, when, and what was changed for security and compliance.';

-- Add column comments for documentation
COMMENT ON COLUMN public.user_type_audit_log.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN public.user_type_audit_log.target_user_id IS 'User whose type/role was modified';
COMMENT ON COLUMN public.user_type_audit_log.modified_by IS 'Admin user who made the modification';
COMMENT ON COLUMN public.user_type_audit_log.action_type IS 'Type of action: plan_tier_assigned, plan_tier_changed, role_granted, or role_revoked';
COMMENT ON COLUMN public.user_type_audit_log.old_value IS 'Previous value before modification (NULL for new assignments)';
COMMENT ON COLUMN public.user_type_audit_log.new_value IS 'New value after modification (NULL for revocations)';
COMMENT ON COLUMN public.user_type_audit_log.metadata IS 'Additional metadata about the change (JSON format)';
COMMENT ON COLUMN public.user_type_audit_log.created_at IS 'When this audit log entry was created';

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_target_user 
  ON public.user_type_audit_log(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_modified_by 
  ON public.user_type_audit_log(modified_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_type 
  ON public.user_type_audit_log(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_created_at 
  ON public.user_type_audit_log(created_at DESC);

-- =====================================================
-- 4. Add deprecation comment to user_profiles.user_type
-- =====================================================
-- Mark the existing user_type column as deprecated
-- Requirements: 5.1

COMMENT ON COLUMN public.user_profiles.user_type IS 
  'DEPRECATED: This column is deprecated and will be removed in a future release. 
   Use user_plan_tiers and user_roles tables instead for user type information.
   
   Migration Path:
   1. Plan tiers are stored in user_plan_tiers table
   2. Additional roles (admin, moderator, tester) are stored in user_roles table
   3. Use get_user_plan_tier() and get_user_roles() functions to retrieve user type information
   
   This column is maintained for backward compatibility during the migration period.
   Do not use this column for new features or functionality.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created user_plan_tiers table with constraints and indexes
-- ✓ Created user_roles table with constraints and indexes  
-- ✓ Created user_type_audit_log table with indexes
-- ✓ Added deprecation comment to user_profiles.user_type
--
-- Next Steps:
-- - Create database functions (get_user_plan_tier, assign_plan_tier, etc.)
-- - Implement RLS policies for all three tables
-- - Run data migration to populate user_plan_tiers from existing user_type values
-- =====================================================
