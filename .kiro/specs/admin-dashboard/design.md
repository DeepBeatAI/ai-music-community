# Design Document: Admin Dashboard

## Overview

This document outlines the technical design for implementing a comprehensive Admin Dashboard for the AI Music Community Platform. The dashboard provides administrators with centralized access to user management, platform configuration, security monitoring, performance analytics, and business metrics. The system builds upon the user types and plan tiers infrastructure to enforce admin-only access controls.

### Key Design Principles

1. **Security First**: All admin routes protected with server-side authorization checks
2. **Performance Optimized**: Lazy loading, pagination, and caching for large datasets
3. **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
4. **Real-time Updates**: Live data for security events and performance metrics
5. **Audit Everything**: Comprehensive logging of all administrative actions
6. **Modular Architecture**: Tab-based interface with independent, reusable components

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Application                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Admin Route  │  │ Protected    │  │ Navigation   │          │
│  │ /admin       │  │ Routes       │  │ Menu         │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                            │
│                   │  Admin Context  │                            │
│                   │  & Middleware   │                            │
│                   └────────┬────────┘                            │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐          │
│  │ User Mgmt    │  │ Platform     │  │ Security     │          │
│  │ Tab          │  │ Admin Tab    │  │ Tab          │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Performance  │  │ Analytics    │                            │
│  │ & Health Tab │  │ Tab          │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Supabase API   │
                    └────────┬────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    Database Layer                                 │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ user_profiles    │  │ user_plan_tiers  │                      │
│  │ user_roles       │  │ user_type_audit  │                      │
│  └──────────────────┘  └──────────────────┘                      │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ admin_audit_log  │  │ security_events  │                      │
│  │ platform_config  │  │ system_metrics   │                      │
│  └──────────────────┘  └──────────────────┘                      │
│                                                                   │
│  ┌──────────────────────────────────────────┐                    │
│  │         Row Level Security (RLS)         │                    │
│  │  - Admin-only access policies            │                    │
│  │  - Audit log protection                  │                    │
│  │  - Configuration access control          │                    │
│  └──────────────────────────────────────────┘                    │
└───────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Admin Authentication**: User logs in, AuthContext loads user roles
2. **Authorization Check**: Middleware verifies admin role before rendering dashboard
3. **Tab Navigation**: User selects tab, lazy loads tab-specific data
4. **Data Fetching**: Tab components fetch data from Supabase with RLS enforcement
5. **Real-time Updates**: Security and performance tabs subscribe to real-time events
6. **Admin Actions**: User performs action, system logs to audit trail, updates database
7. **UI Update**: Optimistic UI updates with server confirmation

## Components and Interfaces

### Database Schema

#### New Table: `admin_audit_log`

Comprehensive logging of all administrative actions.

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_role_changed',
    'user_plan_changed',
    'user_suspended',
    'user_password_reset',
    'config_updated',
    'cache_cleared',
    'security_policy_changed'
  )),
  target_resource_type TEXT NOT NULL CHECK (target_resource_type IN (
    'user',
    'config',
    'system',
    'security'
  )),
  target_resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX idx_admin_audit_admin_user ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_action_type ON admin_audit_log(action_type, created_at DESC);
CREATE INDEX idx_admin_audit_resource ON admin_audit_log(target_resource_type, target_resource_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at DESC);
```

#### New Table: `security_events`

Tracks security-related events for monitoring and alerting.

```sql
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'failed_login',
    'unauthorized_access',
    'rate_limit_exceeded',
    'suspicious_activity',
    'privilege_escalation_attempt',
    'session_hijack_attempt'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for security monitoring
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, resolved, created_at DESC);
CREATE INDEX idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX idx_security_events_unresolved ON security_events(created_at DESC) 
  WHERE resolved = false;
```

#### New Table: `platform_config`

Stores platform-wide configuration settings.

```sql
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN (
    'feature_flag',
    'upload_limit',
    'rate_limit',
    'email_template',
    'system_setting'
  )),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for config lookups
CREATE INDEX idx_platform_config_key ON platform_config(config_key) WHERE is_active = true;
CREATE INDEX idx_platform_config_type ON platform_config(config_type, is_active);
```

#### New Table: `system_metrics`

Stores historical system performance and health metrics.

```sql
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'page_load_time',
    'api_response_time',
    'database_query_time',
    'error_rate',
    'cache_hit_rate',
    'storage_usage',
    'active_users'
  )),
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for metrics queries
CREATE INDEX idx_system_metrics_type_time ON system_metrics(metric_type, recorded_at DESC);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);

-- Partition by month for performance
CREATE INDEX idx_system_metrics_monthly ON system_metrics(
  metric_type, 
  date_trunc('month', recorded_at)
);
```

#### New Table: `user_sessions`

Tracks active user sessions for security monitoring.

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for session management
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;
```



### Row Level Security (RLS) Policies

#### `admin_audit_log` RLS Policies

```sql
-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Audit log inserts handled by database functions (no direct INSERT policy)
```

#### `security_events` RLS Policies

```sql
-- Only admins can view security events
CREATE POLICY "Only admins can view security events"
  ON security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Only admins can update security events (mark as resolved)
CREATE POLICY "Only admins can update security events"
  ON security_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );
```

#### `platform_config` RLS Policies

```sql
-- Only admins can view platform config
CREATE POLICY "Only admins can view platform config"
  ON platform_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Only admins can modify platform config
CREATE POLICY "Only admins can modify platform config"
  ON platform_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );
```

#### `system_metrics` RLS Policies

```sql
-- Only admins can view system metrics
CREATE POLICY "Only admins can view system metrics"
  ON system_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );
```

#### `user_sessions` RLS Policies

```sql
-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Only admins can terminate sessions
CREATE POLICY "Only admins can terminate sessions"
  ON user_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );
```

### Database Functions

#### Function: `log_admin_action`

Logs administrative actions to audit trail.

```sql
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_target_resource_type TEXT,
  p_target_resource_id TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can log admin actions';
  END IF;
  
  -- Insert audit log entry
  INSERT INTO admin_audit_log (
    admin_user_id,
    action_type,
    target_resource_type,
    target_resource_id,
    old_value,
    new_value,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_resource_type,
    p_target_resource_id,
    p_old_value,
    p_new_value,
    p_metadata,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;
```

#### Function: `log_security_event`

Logs security events for monitoring.

```sql
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert security event
  INSERT INTO security_events (
    event_type,
    severity,
    user_id,
    ip_address,
    user_agent,
    details
  ) VALUES (
    p_event_type,
    p_severity,
    p_user_id,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    p_details
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;
```

#### Function: `get_platform_config`

Retrieves platform configuration value.

```sql
CREATE OR REPLACE FUNCTION get_platform_config(p_config_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config_value JSONB;
BEGIN
  SELECT config_value INTO v_config_value
  FROM platform_config
  WHERE config_key = p_config_key
    AND is_active = true;
  
  RETURN v_config_value;
END;
$$;
```

#### Function: `update_platform_config`

Updates platform configuration (admin only).

```sql
CREATE OR REPLACE FUNCTION update_platform_config(
  p_config_key TEXT,
  p_config_value JSONB,
  p_config_type TEXT DEFAULT 'system_setting',
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_old_value JSONB;
BEGIN
  -- Verify caller is admin
  SELECT is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can update platform config';
  END IF;
  
  -- Get old value for audit log
  SELECT config_value INTO v_old_value
  FROM platform_config
  WHERE config_key = p_config_key;
  
  -- Upsert configuration
  INSERT INTO platform_config (
    config_key,
    config_value,
    config_type,
    description,
    updated_by
  ) VALUES (
    p_config_key,
    p_config_value,
    p_config_type,
    p_description,
    auth.uid()
  )
  ON CONFLICT (config_key) DO UPDATE SET
    config_value = p_config_value,
    description = COALESCE(p_description, platform_config.description),
    updated_by = auth.uid(),
    updated_at = now();
  
  -- Log the change
  PERFORM log_admin_action(
    'config_updated',
    'config',
    p_config_key,
    jsonb_build_object('value', v_old_value),
    jsonb_build_object('value', p_config_value)
  );
  
  RETURN true;
END;
$$;
```

#### Function: `record_system_metric`

Records system performance metric.

```sql
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_metric_unit TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO system_metrics (
    metric_type,
    metric_value,
    metric_unit,
    metadata
  ) VALUES (
    p_metric_type,
    p_metric_value,
    p_metric_unit,
    p_metadata
  ) RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$;
```

#### Function: `get_user_activity_summary`

Gets summary of user activity for admin dashboard.

```sql
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  posts_count INTEGER,
  tracks_count INTEGER,
  albums_count INTEGER,
  playlists_count INTEGER,
  comments_count INTEGER,
  likes_given INTEGER,
  likes_received INTEGER,
  last_active TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can view user activity summaries';
  END IF;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM posts 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM tracks 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM albums 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM playlists 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM comments 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COALESCE(likes_given, 0)::INTEGER FROM user_stats WHERE user_id = p_user_id),
    (SELECT COALESCE(likes_received, 0)::INTEGER FROM user_stats WHERE user_id = p_user_id),
    (SELECT COALESCE(last_active, now()) FROM user_stats WHERE user_id = p_user_id);
END;
$$;
```

#### Function: `suspend_user_account`

Suspends a user account (admin only).

```sql
CREATE OR REPLACE FUNCTION suspend_user_account(
  p_target_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify caller is admin
  SELECT is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can suspend user accounts';
  END IF;
  
  -- Prevent suspending admin users
  IF is_user_admin(p_target_user_id) THEN
    RAISE EXCEPTION 'Cannot suspend admin users';
  END IF;
  
  -- Calculate expiration if duration provided
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;
  
  -- Update user profile to mark as suspended
  -- (Assumes a suspended_until column exists or will be added)
  UPDATE user_profiles
  SET updated_at = now()
  WHERE user_id = p_target_user_id;
  
  -- Log the suspension
  PERFORM log_admin_action(
    'user_suspended',
    'user',
    p_target_user_id::TEXT,
    NULL,
    jsonb_build_object(
      'reason', p_reason,
      'duration_days', p_duration_days,
      'expires_at', v_expires_at
    )
  );
  
  RETURN true;
END;
$$;
```

#### Function: `terminate_user_session`

Terminates a user session (admin only).

```sql
CREATE OR REPLACE FUNCTION terminate_user_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Verify caller is admin
  SELECT is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can terminate user sessions';
  END IF;
  
  -- Get user_id for logging
  SELECT user_id INTO v_user_id
  FROM user_sessions
  WHERE id = p_session_id;
  
  -- Terminate the session
  UPDATE user_sessions
  SET is_active = false
  WHERE id = p_session_id;
  
  -- Log the action
  PERFORM log_admin_action(
    'session_terminated',
    'user',
    v_user_id::TEXT,
    NULL,
    jsonb_build_object('session_id', p_session_id)
  );
  
  RETURN true;
END;
$$;
```



## Data Models

### TypeScript Type Definitions

```typescript
// client/src/types/admin.ts

/**
 * Admin audit log entry
 */
export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_resource_type: string;
  target_resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Security event entry
 */
export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

/**
 * Platform configuration entry
 */
export interface PlatformConfig {
  id: string;
  config_key: string;
  config_value: Record<string, unknown>;
  config_type: 'feature_flag' | 'upload_limit' | 'rate_limit' | 'email_template' | 'system_setting';
  description: string | null;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * System metric entry
 */
export interface SystemMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  metadata: Record<string, unknown> | null;
  recorded_at: string;
}

/**
 * User session entry
 */
export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
  posts_count: number;
  tracks_count: number;
  albums_count: number;
  playlists_count: number;
  comments_count: number;
  likes_given: number;
  likes_received: number;
  last_active: string;
}

/**
 * User management data for admin dashboard
 */
export interface AdminUserData {
  id: string;
  user_id: string;
  username: string;
  email: string;
  plan_tier: string;
  roles: string[];
  created_at: string;
  last_active: string;
  is_suspended: boolean;
  activity_summary: UserActivitySummary;
}

/**
 * Platform analytics data
 */
export interface PlatformAnalytics {
  user_growth: {
    total_users: number;
    new_users_today: number;
    new_users_this_week: number;
    new_users_this_month: number;
    growth_rate: number;
  };
  content_metrics: {
    total_tracks: number;
    total_albums: number;
    total_playlists: number;
    total_posts: number;
    uploads_today: number;
    uploads_this_week: number;
    uploads_this_month: number;
  };
  engagement_metrics: {
    total_plays: number;
    total_likes: number;
    total_comments: number;
    total_follows: number;
    avg_plays_per_track: number;
    avg_engagement_rate: number;
  };
  plan_distribution: {
    free_users: number;
    creator_pro: number;
    creator_premium: number;
  };
  revenue_metrics: {
    mrr: number;
    arr: number;
    churn_rate: number;
  };
}

/**
 * System health status
 */
export interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connection_count: number;
    avg_query_time: number;
    slow_queries: number;
  };
  storage: {
    total_capacity_gb: number;
    used_capacity_gb: number;
    available_capacity_gb: number;
    usage_percentage: number;
  };
  api_health: {
    supabase: 'healthy' | 'degraded' | 'down';
    vercel: 'healthy' | 'degraded' | 'down';
  };
  error_rate: {
    current_rate: number;
    threshold: number;
    status: 'normal' | 'elevated' | 'critical';
  };
  uptime: {
    percentage: number;
    last_downtime: string | null;
  };
}
```

## UI/UX Design

### Admin Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Top Navigation (with Admin link in avatar dropdown)        │
├─────────────────────────────────────────────────────────────┤
│  Admin Dashboard Header                                     │
│  [User Management] [Platform Admin] [Security]              │
│  [Performance & Health] [Analytics]                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tab Content Area (lazy loaded)                            │
│                                                             │
│  - User Management: User list, filters, actions            │
│  - Platform Admin: Config settings, feature flags          │
│  - Security: Events, audit logs, sessions                  │
│  - Performance & Health: Metrics, system status            │
│  - Analytics: Charts, growth metrics, revenue              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tab-Specific Layouts

#### User Management Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Search: [___________]  Filter: [Plan Tier ▼] [Role ▼]     │
├─────────────────────────────────────────────────────────────┤
│  Username    Email         Plan Tier    Roles    Actions    │
│  ─────────────────────────────────────────────────────────  │
│  john_doe    john@...      Creator Pro  -        [Edit ▼]   │
│  jane_smith  jane@...      Free User    Mod      [Edit ▼]   │
│  ...                                                         │
├─────────────────────────────────────────────────────────────┤
│  [< Previous]  Page 1 of 10  [Next >]                       │
└─────────────────────────────────────────────────────────────┘

User Detail Modal:
┌─────────────────────────────────────────────────────────────┐
│  User: john_doe                                      [X]     │
├─────────────────────────────────────────────────────────────┤
│  Account Info:                                              │
│  - Email: john@example.com                                  │
│  - Plan Tier: [Creator Pro ▼]                              │
│  - Roles: [Moderator] [Tester] [+ Add Role]                │
│  - Status: Active / [Suspend Account]                      │
│                                                             │
│  Activity (Last 30 Days):                                   │
│  - Posts: 15  Tracks: 8  Albums: 2  Playlists: 5          │
│  - Likes Given: 120  Likes Received: 450                   │
│  - Last Active: 2 hours ago                                │
│                                                             │
│  Recent Actions:                                            │
│  - 2024-01-15: Created track "New Song"                    │
│  - 2024-01-14: Updated profile                             │
│  - 2024-01-13: Created playlist "Favorites"                │
│                                                             │
│  Admin Actions:                                             │
│  [Reset Password]  [View Sessions]  [View Audit Log]       │
│                                                             │
│  [Save Changes]  [Cancel]                                   │
└─────────────────────────────────────────────────────────────┘
```

#### Platform Administration Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Configuration Settings                                     │
├─────────────────────────────────────────────────────────────┤
│  Feature Flags:                                             │
│  ☑ Enable new audio player                                 │
│  ☐ Enable collaborative playlists                          │
│  ☑ Enable AI-generated content tags                        │
│                                                             │
│  Upload Limits by Plan Tier:                               │
│  Free User:       50 MB per file, 10 files/month           │
│  Creator Pro:     100 MB per file, 50 files/month          │
│  Creator Premium: 200 MB per file, unlimited files         │
│  [Edit Limits]                                              │
│                                                             │
│  Platform Announcements:                                    │
│  [Create New Announcement]                                  │
│  - "Maintenance scheduled for..." (Active)                 │
│  - "New features released!" (Expired)                      │
│                                                             │
│  Email Templates:                                           │
│  - Welcome Email  [Edit]                                    │
│  - Password Reset [Edit]                                    │
│  - Plan Upgrade   [Edit]                                    │
│                                                             │
│  Rate Limiting:                                             │
│  API Requests: 100 per minute per user                     │
│  Upload Requests: 10 per hour per user                     │
│  [Edit Rate Limits]                                         │
└─────────────────────────────────────────────────────────────┘
```

#### Security Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Security Overview                                          │
├─────────────────────────────────────────────────────────────┤
│  Unresolved Events: 3 Critical, 5 High, 12 Medium          │
│                                                             │
│  Recent Security Events:                                    │
│  Severity  Type                  User        Time          │
│  ──────────────────────────────────────────────────────    │
│  🔴 CRIT   Privilege Escalation  user123    2 min ago      │
│  🟠 HIGH   Failed Login (5x)     user456    15 min ago     │
│  🟡 MED    Rate Limit Exceeded   user789    1 hour ago     │
│  ...                                                        │
│                                                             │
│  Active Sessions: 1,234                                     │
│  [View All Sessions]                                        │
│                                                             │
│  Recent Admin Actions:                                      │
│  - admin1 changed user123 plan tier (5 min ago)           │
│  - admin2 suspended user456 (1 hour ago)                   │
│  - admin1 updated platform config (2 hours ago)            │
│  [View Full Audit Log]                                      │
│                                                             │
│  Security Policies:                                         │
│  - Password Requirements: [Configure]                       │
│  - Session Timeout: 24 hours [Edit]                        │
│  - Failed Login Threshold: 5 attempts [Edit]               │
└─────────────────────────────────────────────────────────────┘
```

#### Performance & System Health Tab

```
┌─────────────────────────────────────────────────────────────┐
│  System Health Overview                                     │
├─────────────────────────────────────────────────────────────┤
│  ✅ Database: Healthy (avg query: 45ms)                     │
│  ✅ Storage: 45% used (450 GB / 1 TB)                       │
│  ✅ Supabase API: Healthy                                   │
│  ✅ Vercel: Healthy                                         │
│  ⚠️  Error Rate: Elevated (0.5% - threshold: 0.3%)         │
│  ✅ Uptime: 99.95%                                          │
│                                                             │
│  Performance Metrics (Last 24 Hours):                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Page Load Time: [Chart showing trend]             │   │
│  │  Avg: 1.2s  P95: 2.1s  P99: 3.5s                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Response Time: [Chart showing trend]          │   │
│  │  Avg: 85ms  P95: 150ms  P99: 300ms                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Cache Performance:                                         │
│  Hit Rate: 85%  Misses: 15%  Size: 2.3 GB                 │
│  [Clear Cache]                                              │
│                                                             │
│  Slow Queries (> 1s):                                       │
│  - SELECT * FROM tracks WHERE... (1.5s) [Optimize]        │
│  - SELECT * FROM user_stats... (1.2s) [Optimize]          │
│                                                             │
│  Recent Errors:                                             │
│  - TypeError in AudioPlayer (5 occurrences)                │
│  - Database timeout (2 occurrences)                        │
│  [View Error Logs]                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Analytics Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Platform Analytics                                         │
│  Date Range: [Last 30 Days ▼]  [Export CSV]                │
├─────────────────────────────────────────────────────────────┤
│  User Growth:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Line chart showing user growth over time]        │   │
│  │  Total: 10,234  New Today: 45  Growth: +12%        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Plan Distribution:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Pie chart]                                        │   │
│  │  Free: 8,500 (83%)                                  │   │
│  │  Creator Pro: 1,200 (12%)                           │   │
│  │  Creator Premium: 534 (5%)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Content Metrics:                                           │
│  Tracks: 45,678  Albums: 3,456  Playlists: 12,345         │
│  Uploads Today: 234  This Week: 1,567  This Month: 6,789  │
│                                                             │
│  Engagement:                                                │
│  Total Plays: 1.2M  Likes: 450K  Comments: 89K            │
│  Avg Plays/Track: 26  Engagement Rate: 8.5%               │
│                                                             │
│  Revenue (MRR):                                             │
│  Creator Pro: $12,000  Creator Premium: $26,700            │
│  Total MRR: $38,700  ARR: $464,400                         │
│  Churn Rate: 2.3%                                           │
│                                                             │
│  Top Creators:                                              │
│  1. artist_name (12K followers, 500K plays)                │
│  2. creator_xyz (8K followers, 350K plays)                 │
│  3. music_pro (6K followers, 280K plays)                   │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Menu Integration

The admin link will be added to the existing user avatar dropdown menu:

```
┌─────────────────────────┐
│  👤 john_doe            │
├─────────────────────────┤
│  Profile                │
│  Account                │
│  ──────────────────     │  ← Only visible to admins
│  🛡️ Admin Dashboard     │  ← New link
│  ──────────────────     │
│  Logout                 │
└─────────────────────────┘
```



## Route Protection and Middleware

### Admin Route Protection

```typescript
// client/src/middleware.ts (additions)

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected admin routes
  const adminRoutes = ['/admin', '/analytics', '/test-audio-compression'];
  const isAdminRoute = adminRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  if (isAdminRoute) {
    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    const isAdmin = roles?.some(role => role.role_type === 'admin');

    if (!isAdmin) {
      // Redirect to home with error message
      const url = new URL('/', req.url);
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/analytics/:path*', '/test-audio-compression/:path*'],
};
```

### Admin Context Provider

```typescript
// client/src/contexts/AdminContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminContextType {
  isAdmin: boolean;
  loading: boolean;
  refreshAdminStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase.rpc('is_user_admin', {
        p_user_id: user.id,
      });

      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const refreshAdminStatus = async () => {
    setLoading(true);
    await checkAdminStatus();
  };

  return (
    <AdminContext.Provider value={{ isAdmin, loading, refreshAdminStatus }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
```

## Error Handling

### Error Types

```typescript
// client/src/types/admin.ts (additions)

export class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export const ADMIN_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;
```

### Error Handling Strategy

1. **Authorization Errors**: Return 403 Forbidden with clear message
2. **Validation Errors**: Return 400 Bad Request with specific validation failures
3. **Database Errors**: Log error, return generic message to user
4. **Rate Limiting**: Return 429 Too Many Requests with retry-after header
5. **Audit Logging**: Log all errors related to admin operations

## Performance Optimization

### Caching Strategy

1. **User List Caching**: Cache user list for 5 minutes, invalidate on changes
2. **Config Caching**: Cache platform config in memory, invalidate on updates
3. **Metrics Caching**: Cache aggregated metrics for 1 minute
4. **Analytics Caching**: Cache analytics data for 15 minutes

### Pagination

1. **User List**: 50 users per page with cursor-based pagination
2. **Audit Logs**: 100 entries per page with offset pagination
3. **Security Events**: 50 events per page with cursor-based pagination
4. **Metrics**: Time-based windowing for large datasets

### Lazy Loading

1. **Tab Content**: Load tab data only when tab is activated
2. **Charts**: Lazy load chart libraries (Chart.js, Recharts)
3. **Modals**: Load modal content on demand
4. **Export Functions**: Load export libraries on demand

## Security Considerations

### Access Control

1. **Server-Side Checks**: All admin operations verified server-side
2. **RLS Enforcement**: Database-level security for all admin tables
3. **Session Validation**: Verify admin status on every request
4. **IP Logging**: Log IP address for all admin actions
5. **Rate Limiting**: Prevent abuse of admin endpoints

### Audit Trail

1. **Comprehensive Logging**: Log all admin actions with full context
2. **Immutable Logs**: Prevent modification or deletion of audit logs
3. **Retention Policy**: Retain logs for minimum 90 days
4. **Real-time Alerts**: Alert on suspicious admin activity
5. **Export Capability**: Allow export of audit logs for compliance

### Data Protection

1. **Sensitive Data Masking**: Mask passwords and tokens in logs
2. **Encryption**: Encrypt sensitive configuration values
3. **Access Logging**: Log all access to sensitive data
4. **Data Minimization**: Only expose necessary data to admin UI
5. **Secure Transmission**: All admin API calls over HTTPS

## Testing Strategy

### Unit Tests

1. **Admin Utilities**: Test admin status checks, permission helpers
2. **Database Functions**: Test all admin database functions
3. **RLS Policies**: Test admin access policies
4. **Data Formatting**: Test data transformation functions

### Integration Tests

1. **Route Protection**: Test admin route middleware
2. **Tab Loading**: Test tab data fetching and rendering
3. **Admin Actions**: Test user management operations
4. **Audit Logging**: Test audit trail creation

### End-to-End Tests

1. **Admin Login Flow**: Test admin user accessing dashboard
2. **User Management**: Test complete user management workflow
3. **Config Updates**: Test platform configuration changes
4. **Security Monitoring**: Test security event viewing and resolution

### Manual Testing Checklist

After automated tests pass:

- [ ] Admin dashboard accessible at /admin for admin users
- [ ] Non-admin users redirected from /admin
- [ ] All tabs load correctly and display data
- [ ] User management actions work (role changes, suspensions)
- [ ] Platform config updates persist correctly
- [ ] Security events display in real-time
- [ ] Performance metrics match Performance overlay
- [ ] Analytics charts render correctly
- [ ] Audit logs record all admin actions
- [ ] Dashboard responsive on mobile/tablet/desktop
- [ ] Loading states display correctly
- [ ] Error states show user-friendly messages
- [ ] Performance overlay hidden from non-admins
- [ ] /analytics route protected for admins only
- [ ] /test-audio-compression route protected for admins only

## Migration Strategy

### Phase 1: Database Setup

1. Create new admin tables (audit_log, security_events, platform_config, system_metrics, user_sessions)
2. Create database functions for admin operations
3. Implement RLS policies
4. Create indexes for performance

### Phase 2: Backend Integration

1. Update middleware for route protection
2. Create admin service functions
3. Implement audit logging
4. Set up security event tracking

### Phase 3: UI Development

1. Create admin dashboard layout
2. Implement tab navigation
3. Build User Management tab
4. Build Platform Administration tab
5. Build Security tab
6. Build Performance & System Health tab
7. Build Analytics tab

### Phase 4: Integration

1. Integrate Performance overlay data
2. Add admin link to navigation menu
3. Protect existing admin routes
4. Connect all tabs to backend services

### Phase 5: Testing & Deployment

1. Run automated test suite
2. Perform manual testing
3. Security audit
4. Performance testing
5. Deploy to production

## Future Enhancements

This design provides foundation for future features:

1. **Advanced Analytics**: Custom reports, data visualization, trend analysis
2. **Bulk Operations**: Bulk user management, bulk config updates
3. **Scheduled Tasks**: Automated maintenance, scheduled reports
4. **Notification System**: Real-time alerts for critical events
5. **API Management**: API key management, rate limit configuration
6. **Content Moderation**: Integration with moderation system (separate spec)
7. **Backup & Recovery**: Database backup management, disaster recovery
8. **Multi-Admin Support**: Role-based admin permissions, admin teams
9. **Audit Report Generation**: Automated compliance reports
10. **Performance Optimization Tools**: Query optimizer, cache management

## Conclusion

This design provides a comprehensive, secure, and scalable Admin Dashboard that centralizes platform management capabilities. The architecture supports future growth while maintaining security and performance standards.

Key strengths:
- **Security-first approach** with comprehensive access control and audit logging
- **Modular tab-based design** for organized feature access
- **Real-time monitoring** for security and performance
- **Responsive design** works on all devices
- **Performance optimized** with caching, pagination, and lazy loading
- **Audit everything** for compliance and accountability
- **Future-ready** architecture supports planned enhancements

The implementation will be executed in phases to minimize risk and ensure thorough testing at each stage.
