# Admin Dashboard Database Schema

## Overview

The Admin Dashboard introduces five new database tables to support administrative operations, security monitoring, platform configuration, and system metrics tracking. All tables are protected by Row Level Security (RLS) policies that enforce admin-only access.

## Tables

### 1. admin_audit_log

**Purpose**: Comprehensive logging of all administrative actions for accountability and compliance.

**Schema**:
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
```

**Indexes**:
```sql
CREATE INDEX idx_admin_audit_admin_user ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_action_type ON admin_audit_log(action_type, created_at DESC);
CREATE INDEX idx_admin_audit_resource ON admin_audit_log(target_resource_type, target_resource_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at DESC);
```

**RLS Policies**:
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
```

**Key Features**:
- Immutable logs (no UPDATE/DELETE policies)
- Automatic IP address and user agent capture
- JSONB for flexible metadata storage
- Comprehensive indexing for fast queries

### 2. security_events

**Purpose**: Track security-related events for monitoring and alerting.

**Schema**:
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
```

**Indexes**:
```sql
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, resolved, created_at DESC);
CREATE INDEX idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX idx_security_events_unresolved ON security_events(created_at DESC) 
  WHERE resolved = false;
```

**RLS Policies**:
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

**Key Features**:
- Severity levels for prioritization
- Resolution tracking
- Partial index for unresolved events
- Real-time updates via Supabase Realtime

### 3. platform_config

**Purpose**: Store platform-wide configuration settings.

**Schema**:
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
```

**Indexes**:
```sql
CREATE INDEX idx_platform_config_key ON platform_config(config_key) WHERE is_active = true;
CREATE INDEX idx_platform_config_type ON platform_config(config_type, is_active);
```

**RLS Policies**:
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

**Key Features**:
- JSONB for flexible configuration values
- Unique constraint on config_key
- Soft delete via is_active flag
- Automatic timestamp updates

### 4. system_metrics

**Purpose**: Store historical system performance and health metrics.

**Schema**:
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
```

**Indexes**:
```sql
CREATE INDEX idx_system_metrics_type_time ON system_metrics(metric_type, recorded_at DESC);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);

-- Partition by month for performance
CREATE INDEX idx_system_metrics_monthly ON system_metrics(
  metric_type, 
  date_trunc('month', recorded_at)
);
```

**RLS Policies**:
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

**Key Features**:
- High-volume data storage
- Monthly partitioning for performance
- Flexible metadata storage
- Time-series data optimization

### 5. user_sessions

**Purpose**: Track active user sessions for security monitoring.

**Schema**:
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
```

**Indexes**:
```sql
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;
```

**RLS Policies**:
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

**Key Features**:
- Session tracking for security
- Automatic expiration
- Admin session termination
- User self-service session viewing

## Database Functions

See [Database Functions Guide](guide-database-functions.md) for detailed documentation of all admin database functions.

## Migrations

All admin dashboard tables are created via migrations in the following order:

1. `20251119000000_create_admin_dashboard_tables.sql` - Creates all 5 tables with indexes
2. `20251119000001_create_admin_functions_and_rls.sql` - Creates functions and RLS policies

## Performance Considerations

### Indexing Strategy

- **Foreign Keys**: All foreign keys indexed for join performance
- **Frequently Queried Columns**: `created_at`, `user_id`, `action_type`, etc.
- **Partial Indexes**: For filtered queries (e.g., `WHERE is_active = true`)
- **Composite Indexes**: For common query patterns

### Query Optimization

- **Pagination**: Use cursor-based or offset pagination for large datasets
- **Time Windows**: Limit queries to specific time ranges
- **Aggregation**: Pre-aggregate metrics where possible
- **Caching**: Cache frequently accessed data

### Data Retention

- **Audit Logs**: Retain for minimum 90 days, archive older data
- **Security Events**: Retain resolved events for 30 days
- **System Metrics**: Retain for 90 days, aggregate older data
- **User Sessions**: Clean up expired sessions daily

## Security Considerations

### Row Level Security (RLS)

- **All tables have RLS enabled**
- **Admin-only access** enforced at database level
- **No direct INSERT policies** - use database functions
- **Audit logs are immutable** - no UPDATE/DELETE policies

### Data Protection

- **Sensitive data masking** in logs (passwords, tokens)
- **IP address logging** for security tracking
- **User agent tracking** for session management
- **Encryption at rest** via Supabase

### Access Control

- **Server-side verification** in all database functions
- **Admin status check** via `is_user_admin()` function
- **Session validation** for all operations
- **Rate limiting** to prevent abuse

## Monitoring

### Key Metrics to Monitor

- **Audit log growth rate**
- **Security event frequency**
- **System metrics volume**
- **Query performance**
- **Table sizes**
- **Index usage**

### Alerts

- **High security event rate**
- **Slow queries (> 1s)**
- **Table size thresholds**
- **Failed admin operations**

## Related Documentation

- [Database Functions Guide](guide-database-functions.md)
- [Security Design](../security/security-design.md)
- [Architecture Overview](guide-architecture.md)
- [API Reference](guide-api-reference.md)
