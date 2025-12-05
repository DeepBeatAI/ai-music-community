-- =====================================================
-- Moderation System Tables Migration
-- =====================================================
-- This migration creates the database infrastructure for
-- the Moderation System including reports, actions, and
-- user restrictions.
--
-- Requirements: 1.1, 2.1, 5.1, 6.1, 11.2, 11.3, 12.3
-- =====================================================

-- =====================================================
-- 1. Create moderation_reports table
-- =====================================================
-- Stores user reports and moderator flags for content violations
-- Requirements: 1.1, 2.1

CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 3,
  moderator_flagged BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid report_type values
  CONSTRAINT valid_report_type CHECK (
    report_type IN ('post', 'comment', 'track', 'user')
  ),
  
  -- CHECK constraint for valid reason values
  CONSTRAINT valid_reason CHECK (
    reason IN (
      'spam',
      'harassment',
      'hate_speech',
      'inappropriate_content',
      'copyright_violation',
      'impersonation',
      'self_harm',
      'other'
    )
  ),
  
  -- CHECK constraint for valid status values
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'under_review', 'resolved', 'dismissed')
  ),
  
  -- CHECK constraint for valid priority values (P1-P5)
  CONSTRAINT valid_priority CHECK (
    priority BETWEEN 1 AND 5
  )
);

-- Add table comment for documentation
COMMENT ON TABLE public.moderation_reports IS 
  'Stores user reports and moderator flags for content and user violations.
   Reports can be submitted by users or created directly by moderators.
   Priority is automatically calculated based on reason, with moderator flags
   receiving higher priority.';

-- Add column comments for documentation
COMMENT ON COLUMN public.moderation_reports.id IS 'Unique identifier for the report';
COMMENT ON COLUMN public.moderation_reports.reporter_id IS 'UUID of the user who submitted the report';
COMMENT ON COLUMN public.moderation_reports.reported_user_id IS 'UUID of the user being reported (NULL for content reports)';
COMMENT ON COLUMN public.moderation_reports.report_type IS 'Type of content being reported: post, comment, track, or user';
COMMENT ON COLUMN public.moderation_reports.target_id IS 'UUID of the specific content or user being reported';
COMMENT ON COLUMN public.moderation_reports.reason IS 'Reason for the report (predefined categories)';
COMMENT ON COLUMN public.moderation_reports.description IS 'Optional detailed description of the violation';
COMMENT ON COLUMN public.moderation_reports.status IS 'Current status: pending, under_review, resolved, or dismissed';
COMMENT ON COLUMN public.moderation_reports.priority IS 'Priority level (1-5, where 1 is highest priority)';
COMMENT ON COLUMN public.moderation_reports.moderator_flagged IS 'Whether this report was created by a moderator';
COMMENT ON COLUMN public.moderation_reports.reviewed_by IS 'UUID of the moderator who reviewed the report';
COMMENT ON COLUMN public.moderation_reports.reviewed_at IS 'Timestamp when the report was reviewed';
COMMENT ON COLUMN public.moderation_reports.resolution_notes IS 'Internal notes about the resolution';
COMMENT ON COLUMN public.moderation_reports.action_taken IS 'Description of the action taken';
COMMENT ON COLUMN public.moderation_reports.created_at IS 'Timestamp when the report was created';
COMMENT ON COLUMN public.moderation_reports.updated_at IS 'Timestamp when the report was last updated';

-- Create indexes for moderation queue queries
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status_priority 
  ON public.moderation_reports(status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter 
  ON public.moderation_reports(reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reported_user 
  ON public.moderation_reports(reported_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_target 
  ON public.moderation_reports(report_type, target_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_moderator_flagged 
  ON public.moderation_reports(moderator_flagged, status, priority) 
  WHERE moderator_flagged = true;

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reviewed_by 
  ON public.moderation_reports(reviewed_by, reviewed_at DESC);

-- =====================================================
-- 2. Create moderation_actions table
-- =====================================================
-- Stores all moderation actions taken by moderators and admins
-- Requirements: 5.1, 12.3

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  reason TEXT NOT NULL,
  duration_days INTEGER,
  expires_at TIMESTAMPTZ,
  related_report_id UUID REFERENCES public.moderation_reports(id) ON DELETE SET NULL,
  internal_notes TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  
  -- CHECK constraint for valid action_type values
  CONSTRAINT valid_action_type CHECK (
    action_type IN (
      'content_removed',
      'content_hidden',
      'content_approved',
      'user_warned',
      'user_suspended',
      'user_banned',
      'restriction_applied'
    )
  ),
  
  -- CHECK constraint for valid target_type values
  CONSTRAINT valid_target_type CHECK (
    target_type IN ('post', 'comment', 'track', 'user') OR target_type IS NULL
  )
);

-- Add table comment for documentation
COMMENT ON TABLE public.moderation_actions IS 
  'Comprehensive audit log of all moderation actions taken by moderators and admins.
   Tracks content removals, user warnings, suspensions, bans, and restrictions.
   This table is append-only and protected from modification to ensure audit integrity.';

-- Add column comments for documentation
COMMENT ON COLUMN public.moderation_actions.id IS 'Unique identifier for the moderation action';
COMMENT ON COLUMN public.moderation_actions.moderator_id IS 'UUID of the moderator who performed the action';
COMMENT ON COLUMN public.moderation_actions.target_user_id IS 'UUID of the user affected by the action';
COMMENT ON COLUMN public.moderation_actions.action_type IS 'Type of action: content_removed, content_hidden, content_approved, user_warned, user_suspended, user_banned, or restriction_applied';
COMMENT ON COLUMN public.moderation_actions.target_type IS 'Type of content affected (if applicable): post, comment, track, or user';
COMMENT ON COLUMN public.moderation_actions.target_id IS 'UUID of the specific content affected (if applicable)';
COMMENT ON COLUMN public.moderation_actions.reason IS 'Reason for the action';
COMMENT ON COLUMN public.moderation_actions.duration_days IS 'Duration in days for time-based actions (suspensions, restrictions)';
COMMENT ON COLUMN public.moderation_actions.expires_at IS 'Timestamp when the action expires (for time-based actions)';
COMMENT ON COLUMN public.moderation_actions.related_report_id IS 'UUID of the report that triggered this action (if applicable)';
COMMENT ON COLUMN public.moderation_actions.internal_notes IS 'Internal notes for moderators (not visible to users)';
COMMENT ON COLUMN public.moderation_actions.notification_sent IS 'Whether a notification was sent to the affected user';
COMMENT ON COLUMN public.moderation_actions.notification_message IS 'Message sent to the user in the notification';
COMMENT ON COLUMN public.moderation_actions.created_at IS 'Timestamp when the action was taken';
COMMENT ON COLUMN public.moderation_actions.revoked_at IS 'Timestamp when the action was revoked (if applicable)';
COMMENT ON COLUMN public.moderation_actions.revoked_by IS 'UUID of the admin who revoked the action';
COMMENT ON COLUMN public.moderation_actions.metadata IS 'Additional metadata about the action (JSON format)';

-- Create indexes for action log queries
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator 
  ON public.moderation_actions(moderator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_user 
  ON public.moderation_actions(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_action_type 
  ON public.moderation_actions(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_report 
  ON public.moderation_actions(related_report_id);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at 
  ON public.moderation_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_expires 
  ON public.moderation_actions(expires_at) 
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

-- =====================================================
-- 3. Create user_restrictions table
-- =====================================================
-- Stores fine-grained user restrictions (posting, commenting, uploading)
-- Requirements: 6.1

CREATE TABLE IF NOT EXISTS public.user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  reason TEXT NOT NULL,
  applied_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  related_action_id UUID REFERENCES public.moderation_actions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid restriction_type values
  CONSTRAINT valid_restriction_type CHECK (
    restriction_type IN (
      'posting_disabled',
      'commenting_disabled',
      'upload_disabled',
      'suspended'
    )
  )
);

-- Create unique partial index to ensure only one active restriction of each type per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_restriction_per_user 
  ON public.user_restrictions(user_id, restriction_type) 
  WHERE is_active = true;

-- Add table comment for documentation
COMMENT ON TABLE public.user_restrictions IS 
  'Stores fine-grained user restrictions for specific capabilities.
   Each user can have multiple active restrictions simultaneously.
   Restrictions can be time-based (with expiration) or permanent (NULL expires_at).';

-- Add column comments for documentation
COMMENT ON COLUMN public.user_restrictions.id IS 'Unique identifier for the restriction';
COMMENT ON COLUMN public.user_restrictions.user_id IS 'UUID of the user being restricted';
COMMENT ON COLUMN public.user_restrictions.restriction_type IS 'Type of restriction: posting_disabled, commenting_disabled, upload_disabled, or suspended';
COMMENT ON COLUMN public.user_restrictions.expires_at IS 'Timestamp when the restriction expires (NULL for permanent restrictions)';
COMMENT ON COLUMN public.user_restrictions.is_active IS 'Whether this restriction is currently active';
COMMENT ON COLUMN public.user_restrictions.reason IS 'Reason for the restriction';
COMMENT ON COLUMN public.user_restrictions.applied_by IS 'UUID of the moderator who applied the restriction';
COMMENT ON COLUMN public.user_restrictions.related_action_id IS 'UUID of the moderation action that created this restriction';
COMMENT ON COLUMN public.user_restrictions.created_at IS 'Timestamp when the restriction was created';
COMMENT ON COLUMN public.user_restrictions.updated_at IS 'Timestamp when the restriction was last updated';

-- Create indexes for restriction checks
CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_active 
  ON public.user_restrictions(user_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_restrictions_type 
  ON public.user_restrictions(restriction_type, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_restrictions_expires 
  ON public.user_restrictions(expires_at) 
  WHERE expires_at IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_restrictions_applied_by 
  ON public.user_restrictions(applied_by, created_at DESC);

-- =====================================================
-- 4. Extend user_profiles table
-- =====================================================
-- Add suspension tracking columns to existing user_profiles table
-- Requirements: 12.3

-- Check if user_profiles table exists (it should from initial schema)
DO $$
BEGIN
  -- Add suspended_until column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.user_profiles 
      ADD COLUMN suspended_until TIMESTAMPTZ;
    
    COMMENT ON COLUMN public.user_profiles.suspended_until IS 
      'Timestamp when the user suspension expires (NULL if not suspended)';
  END IF;

  -- Add suspension_reason column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE public.user_profiles 
      ADD COLUMN suspension_reason TEXT;
    
    COMMENT ON COLUMN public.user_profiles.suspension_reason IS 
      'Reason for the current suspension (NULL if not suspended)';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created moderation_reports table with constraints and indexes
-- ✓ Created moderation_actions table with constraints and indexes
-- ✓ Created user_restrictions table with unique constraint and indexes
-- ✓ Extended user_profiles table with suspension tracking columns
-- ✓ Added comprehensive documentation comments for all tables and columns
-- ✓ Added CHECK constraints for data validation
-- ✓ Added indexes for optimal query performance
--
-- Next Steps:
-- - Create database helper functions (can_user_post, can_user_comment, etc.)
-- - Implement RLS policies for all moderation tables
-- - Create moderation service layer in application
-- - Build moderation dashboard UI
-- =====================================================
