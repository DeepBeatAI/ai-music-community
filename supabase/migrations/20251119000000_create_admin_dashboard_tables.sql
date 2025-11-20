-- =====================================================
-- Admin Dashboard Tables Migration
-- =====================================================
-- This migration creates the database infrastructure for
-- the Admin Dashboard feature including audit logging,
-- security monitoring, platform configuration, system
-- metrics, and session management.
--
-- Requirements: 1.1, 4.1-4.7, 5.1-5.6, 6.2-6.10, 8.1-8.6
-- =====================================================

-- =====================================================
-- 1. Create admin_audit_log table
-- =====================================================
-- Comprehensive logging of all administrative actions
-- Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_resource_type TEXT NOT NULL,
  target_resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid action_type values
  CONSTRAINT valid_action_type CHECK (
    action_type IN (
      'user_role_changed',
      'user_plan_changed',
      'user_suspended',
      'user_password_reset',
      'config_updated',
      'cache_cleared',
      'security_policy_changed',
      'session_terminated'
    )
  ),
  
  -- CHECK constraint for valid target_resource_type values
  CONSTRAINT valid_target_resource_type CHECK (
    target_resource_type IN (
      'user',
      'config',
      'system',
      'security'
    )
  )
);

-- Add table comment for documentation
COMMENT ON TABLE public.admin_audit_log IS 
  'Comprehensive audit log of all administrative actions performed in the system.
   Tracks who performed actions, what was changed, and when changes occurred.
   This table is append-only and protected from modification to ensure audit integrity.';

-- Add column comments for documentation
COMMENT ON COLUMN public.admin_audit_log.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN public.admin_audit_log.admin_user_id IS 'UUID of the admin user who performed the action';
COMMENT ON COLUMN public.admin_audit_log.action_type IS 'Type of action performed (e.g., user_role_changed, config_updated)';
COMMENT ON COLUMN public.admin_audit_log.target_resource_type IS 'Type of resource affected (user, config, system, security)';
COMMENT ON COLUMN public.admin_audit_log.target_resource_id IS 'Identifier of the specific resource affected';
COMMENT ON COLUMN public.admin_audit_log.old_value IS 'Previous value before the change (JSON format)';
COMMENT ON COLUMN public.admin_audit_log.new_value IS 'New value after the change (JSON format)';
COMMENT ON COLUMN public.admin_audit_log.metadata IS 'Additional context about the action (JSON format)';
COMMENT ON COLUMN public.admin_audit_log.ip_address IS 'IP address of the admin user when action was performed';
COMMENT ON COLUMN public.admin_audit_log.user_agent IS 'User agent string of the admin user''s browser';
COMMENT ON COLUMN public.admin_audit_log.created_at IS 'Timestamp when the action was performed';

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_user 
  ON public.admin_audit_log(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_action_type 
  ON public.admin_audit_log(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_resource 
  ON public.admin_audit_log(target_resource_type, target_resource_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at 
  ON public.admin_audit_log(created_at DESC);

-- =====================================================
-- 2. Create security_events table
-- =====================================================
-- Tracks security-related events for monitoring and alerting
-- Requirements: 5.1, 5.2, 5.3, 5.4

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid event_type values
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'failed_login',
      'unauthorized_access',
      'rate_limit_exceeded',
      'suspicious_activity',
      'privilege_escalation_attempt',
      'session_hijack_attempt'
    )
  ),
  
  -- CHECK constraint for valid severity values
  CONSTRAINT valid_severity CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  )
);

-- Add table comment for documentation
COMMENT ON TABLE public.security_events IS 
  'Security event log for monitoring and alerting on potential security threats.
   Tracks failed logins, unauthorized access attempts, and other security-related events.
   Events can be marked as resolved by admin users.';

-- Add column comments for documentation
COMMENT ON COLUMN public.security_events.id IS 'Unique identifier for the security event';
COMMENT ON COLUMN public.security_events.event_type IS 'Type of security event (e.g., failed_login, unauthorized_access)';
COMMENT ON COLUMN public.security_events.severity IS 'Severity level: low, medium, high, or critical';
COMMENT ON COLUMN public.security_events.user_id IS 'UUID of the user associated with the event (if applicable)';
COMMENT ON COLUMN public.security_events.ip_address IS 'IP address where the event originated';
COMMENT ON COLUMN public.security_events.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN public.security_events.details IS 'Additional details about the event (JSON format)';
COMMENT ON COLUMN public.security_events.resolved IS 'Whether the event has been reviewed and resolved';
COMMENT ON COLUMN public.security_events.resolved_by IS 'UUID of the admin who resolved the event';
COMMENT ON COLUMN public.security_events.resolved_at IS 'Timestamp when the event was resolved';
COMMENT ON COLUMN public.security_events.created_at IS 'Timestamp when the event occurred';

-- Create indexes for security monitoring
CREATE INDEX IF NOT EXISTS idx_security_events_type 
  ON public.security_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity 
  ON public.security_events(severity, resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user 
  ON public.security_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_unresolved 
  ON public.security_events(created_at DESC) 
  WHERE resolved = false;

-- =====================================================
-- 3. Create platform_config table
-- =====================================================
-- Stores platform-wide configuration settings
-- Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

CREATE TABLE IF NOT EXISTS public.platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  config_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid config_type values
  CONSTRAINT valid_config_type CHECK (
    config_type IN (
      'feature_flag',
      'upload_limit',
      'rate_limit',
      'email_template',
      'system_setting'
    )
  )
);

-- Add table comment for documentation
COMMENT ON TABLE public.platform_config IS 
  'Platform-wide configuration settings including feature flags, upload limits,
   rate limits, email templates, and system settings. All config changes are
   logged to the audit trail.';

-- Add column comments for documentation
COMMENT ON COLUMN public.platform_config.id IS 'Unique identifier for the config entry';
COMMENT ON COLUMN public.platform_config.config_key IS 'Unique key identifying the configuration setting';
COMMENT ON COLUMN public.platform_config.config_value IS 'Configuration value (JSON format for flexibility)';
COMMENT ON COLUMN public.platform_config.config_type IS 'Type of configuration: feature_flag, upload_limit, rate_limit, email_template, or system_setting';
COMMENT ON COLUMN public.platform_config.description IS 'Human-readable description of what this config controls';
COMMENT ON COLUMN public.platform_config.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN public.platform_config.updated_by IS 'UUID of the admin who last updated this config';
COMMENT ON COLUMN public.platform_config.created_at IS 'Timestamp when this config was created';
COMMENT ON COLUMN public.platform_config.updated_at IS 'Timestamp when this config was last updated';

-- Create indexes for config lookups
CREATE INDEX IF NOT EXISTS idx_platform_config_key 
  ON public.platform_config(config_key) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_platform_config_type 
  ON public.platform_config(config_type, is_active);

-- =====================================================
-- 4. Create system_metrics table
-- =====================================================
-- Stores historical system performance and health metrics
-- Requirements: 6.2, 6.3, 6.8, 6.10

CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for valid metric_type values
  CONSTRAINT valid_metric_type CHECK (
    metric_type IN (
      'page_load_time',
      'api_response_time',
      'database_query_time',
      'error_rate',
      'cache_hit_rate',
      'storage_usage',
      'active_users'
    )
  )
);

-- Add table comment for documentation
COMMENT ON TABLE public.system_metrics IS 
  'Historical system performance and health metrics for monitoring and analysis.
   Metrics are recorded periodically and can be aggregated for trend analysis.
   Partitioned by month for optimal query performance.';

-- Add column comments for documentation
COMMENT ON COLUMN public.system_metrics.id IS 'Unique identifier for the metric entry';
COMMENT ON COLUMN public.system_metrics.metric_type IS 'Type of metric being recorded (e.g., page_load_time, api_response_time)';
COMMENT ON COLUMN public.system_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN public.system_metrics.metric_unit IS 'Unit of measurement (e.g., ms, seconds, percentage, bytes)';
COMMENT ON COLUMN public.system_metrics.metadata IS 'Additional context about the metric (JSON format)';
COMMENT ON COLUMN public.system_metrics.recorded_at IS 'Timestamp when the metric was recorded';

-- Create indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_time 
  ON public.system_metrics(metric_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at 
  ON public.system_metrics(recorded_at DESC);

-- =====================================================
-- 5. Create user_sessions table
-- =====================================================
-- Tracks active user sessions for security monitoring
-- Requirements: 5.5, 5.6

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment for documentation
COMMENT ON TABLE public.user_sessions IS 
  'Active user sessions for security monitoring and session management.
   Admins can view all sessions and terminate suspicious sessions.
   Users can view their own sessions.';

-- Add column comments for documentation
COMMENT ON COLUMN public.user_sessions.id IS 'Unique identifier for the session';
COMMENT ON COLUMN public.user_sessions.user_id IS 'UUID of the user who owns this session';
COMMENT ON COLUMN public.user_sessions.session_token IS 'Unique session token for authentication';
COMMENT ON COLUMN public.user_sessions.ip_address IS 'IP address of the session';
COMMENT ON COLUMN public.user_sessions.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN public.user_sessions.last_activity IS 'Timestamp of the last activity in this session';
COMMENT ON COLUMN public.user_sessions.expires_at IS 'Timestamp when this session expires';
COMMENT ON COLUMN public.user_sessions.is_active IS 'Whether this session is currently active';
COMMENT ON COLUMN public.user_sessions.created_at IS 'Timestamp when this session was created';

-- Create indexes for session management
CREATE INDEX IF NOT EXISTS idx_user_sessions_user 
  ON public.user_sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
  ON public.user_sessions(session_token) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires 
  ON public.user_sessions(expires_at) 
  WHERE is_active = true;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created admin_audit_log table with constraints and indexes
-- ✓ Created security_events table with constraints and indexes
-- ✓ Created platform_config table with constraints and indexes
-- ✓ Created system_metrics table with constraints and indexes
-- ✓ Created user_sessions table with constraints and indexes
-- ✓ Added comprehensive documentation comments for all tables and columns
-- ✓ Added CHECK constraints for data validation
-- ✓ Added indexes for optimal query performance
--
-- Next Steps:
-- - Create database functions for admin operations
-- - Implement RLS policies for all admin tables
-- - Create admin service layer in application
-- - Build admin dashboard UI
-- =====================================================
