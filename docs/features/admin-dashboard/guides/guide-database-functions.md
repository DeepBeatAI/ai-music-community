# Admin Dashboard Database Functions

## Overview

This document provides detailed documentation for all database functions used by the Admin Dashboard.

## Admin Functions

### log_admin_action()

Logs administrative actions to the audit trail.

**Signature**:
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
```

**Parameters**:
- `p_action_type`: Type of action performed
- `p_target_resource_type`: Type of resource affected
- `p_target_resource_id`: ID of affected resource
- `p_old_value`: Previous value (JSONB)
- `p_new_value`: New value (JSONB)
- `p_metadata`: Additional metadata (JSONB)

**Returns**: UUID of created audit log entry

**Security**: 
- Requires admin role
- Automatically captures IP address and user agent
- Throws exception if caller is not admin

**Example**:
```sql
SELECT log_admin_action(
  'user_plan_changed',
  'user',
  'user-uuid-here',
  '{"plan_tier": "free_user"}'::jsonb,
  '{"plan_tier": "creator_pro"}'::jsonb,
  '{"reason": "upgrade request"}'::jsonb
);
```

### log_security_event()

Logs security-related events for monitoring.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
```

**Parameters**:
- `p_event_type`: Type of security event
- `p_severity`: Severity level ('low', 'medium', 'high', 'critical')
- `p_user_id`: User ID associated with event
- `p_details`: Event details (JSONB)

**Returns**: UUID of created security event

**Security**: 
- Can be called by any authenticated user
- Automatically captures IP address and user agent

**Example**:
```sql
SELECT log_security_event(
  'failed_login',
  'medium',
  'user-uuid-here',
  '{"attempts": 3, "last_attempt": "2024-01-15T10:30:00Z"}'::jsonb
);
```

### get_platform_config()

Retrieves platform configuration value.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_platform_config(p_config_key TEXT)
RETURNS JSONB
```

**Parameters**:
- `p_config_key`: Configuration key to retrieve

**Returns**: JSONB configuration value or NULL if not found

**Security**: 
- Can be called by any authenticated user
- Only returns active configurations

**Example**:
```sql
SELECT get_platform_config('max_upload_size_mb');
-- Returns: {"free_user": 50, "creator_pro": 100, "creator_premium": 200}
```

### update_platform_config()

Updates platform configuration (admin only).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION update_platform_config(
  p_config_key TEXT,
  p_config_value JSONB,
  p_config_type TEXT DEFAULT 'system_setting',
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
```

**Parameters**:
- `p_config_key`: Configuration key
- `p_config_value`: Configuration value (JSONB)
- `p_config_type`: Configuration type
- `p_description`: Configuration description

**Returns**: TRUE if successful

**Security**: 
- Requires admin role
- Automatically logs change to audit trail
- Throws exception if caller is not admin

**Side Effects**:
- Creates audit log entry
- Updates or inserts configuration

**Example**:
```sql
SELECT update_platform_config(
  'max_upload_size_mb',
  '{"free_user": 50, "creator_pro": 150, "creator_premium": 250}'::jsonb,
  'upload_limit',
  'Maximum upload size in MB per plan tier'
);
```

### record_system_metric()

Records system performance metric.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_metric_unit TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
```

**Parameters**:
- `p_metric_type`: Type of metric
- `p_metric_value`: Metric value
- `p_metric_unit`: Unit of measurement
- `p_metadata`: Additional metadata (JSONB)

**Returns**: UUID of created metric entry

**Security**: 
- Can be called by system or admin users
- No special permissions required

**Example**:
```sql
SELECT record_system_metric(
  'page_load_time',
  1.25,
  'seconds',
  '{"page": "/admin", "user_agent": "Chrome"}'::jsonb
);
```

### get_user_activity_summary()

Gets summary of user activity for admin dashboard.

**Signature**:
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
```

**Parameters**:
- `p_user_id`: User ID to get summary for
- `p_days_back`: Number of days to look back (default: 30)

**Returns**: Table with activity counts

**Security**: 
- Requires admin role
- Throws exception if caller is not admin

**Example**:
```sql
SELECT * FROM get_user_activity_summary('user-uuid-here', 30);
```

### suspend_user_account()

Suspends a user account (admin only).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION suspend_user_account(
  p_target_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
```

**Parameters**:
- `p_target_user_id`: User ID to suspend
- `p_reason`: Suspension reason
- `p_duration_days`: Suspension duration (NULL = indefinite)

**Returns**: TRUE if successful

**Security**: 
- Requires admin role
- Cannot suspend admin users
- Automatically logs action to audit trail
- Throws exception if caller is not admin

**Side Effects**:
- Updates user profile
- Creates audit log entry
- Terminates active sessions

**Example**:
```sql
SELECT suspend_user_account(
  'user-uuid-here',
  'Violation of terms of service',
  30
);
```

### terminate_user_session()

Terminates a user session (admin only).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION terminate_user_session(p_session_id UUID)
RETURNS BOOLEAN
```

**Parameters**:
- `p_session_id`: Session ID to terminate

**Returns**: TRUE if successful

**Security**: 
- Requires admin role
- Automatically logs action to audit trail
- Throws exception if caller is not admin

**Side Effects**:
- Marks session as inactive
- Creates audit log entry
- User logged out immediately

**Example**:
```sql
SELECT terminate_user_session('session-uuid-here');
```

## Helper Functions

### is_user_admin()

Checks if a user has admin role.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id UUID)
RETURNS BOOLEAN
```

**Parameters**:
- `p_user_id`: User ID to check

**Returns**: TRUE if user is admin, FALSE otherwise

**Security**: 
- Can be called by any authenticated user
- Used internally by other functions

**Example**:
```sql
SELECT is_user_admin(auth.uid());
```

## Usage Patterns

### Audit Logging Pattern

All admin operations should log to audit trail:

```sql
-- 1. Verify admin status
IF NOT is_user_admin(auth.uid()) THEN
  RAISE EXCEPTION 'Unauthorized';
END IF;

-- 2. Get old value
SELECT current_value INTO v_old_value FROM table WHERE id = target_id;

-- 3. Perform operation
UPDATE table SET value = new_value WHERE id = target_id;

-- 4. Log action
PERFORM log_admin_action(
  'action_type',
  'resource_type',
  target_id::TEXT,
  jsonb_build_object('value', v_old_value),
  jsonb_build_object('value', new_value)
);
```

### Security Event Pattern

Log security events for monitoring:

```sql
-- Detect suspicious activity
IF suspicious_condition THEN
  PERFORM log_security_event(
    'suspicious_activity',
    'high',
    user_id,
    jsonb_build_object('details', 'description')
  );
END IF;
```

### Configuration Management Pattern

Update configuration with audit trail:

```sql
-- Update config
SELECT update_platform_config(
  'config_key',
  new_value::jsonb,
  'config_type',
  'description'
);

-- Config automatically logged to audit trail
```

## Performance Considerations

### Indexing

All functions use indexed columns for optimal performance:
- `user_id` indexed on all tables
- `created_at` indexed for time-based queries
- `action_type` indexed for filtering
- `config_key` indexed for lookups

### Caching

Some functions benefit from caching:
- `get_platform_config()` - Cache for 5 minutes
- `is_user_admin()` - Cache for session duration
- `get_user_activity_summary()` - Cache for 1 minute

### Batch Operations

For bulk operations, use transactions:

```sql
BEGIN;
  -- Multiple operations
  SELECT suspend_user_account(...);
  SELECT suspend_user_account(...);
  SELECT suspend_user_account(...);
COMMIT;
```

## Error Handling

All functions use consistent error handling:

```sql
BEGIN
  -- Operation
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Unauthorized: %', SQLERRM;
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Invalid reference: %', SQLERRM;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Operation failed: %', SQLERRM;
END;
```

## Testing

### Unit Tests

Test each function individually:

```sql
-- Test admin check
SELECT is_user_admin('[admin-user-id]'); -- Should return TRUE
SELECT is_user_admin('[regular-user-id]'); -- Should return FALSE

-- Test audit logging
SELECT log_admin_action('test_action', 'test_resource', 'test_id');
SELECT COUNT(*) FROM admin_audit_log WHERE action_type = 'test_action';

-- Test config management
SELECT update_platform_config('test_key', '{"value": "test"}'::jsonb);
SELECT get_platform_config('test_key'); -- Should return {"value": "test"}
```

### Integration Tests

Test function interactions:

```sql
-- Test suspend user workflow
SELECT suspend_user_account('[user-id]', 'test reason', 7);
SELECT * FROM admin_audit_log WHERE action_type = 'user_suspended';
SELECT * FROM user_sessions WHERE user_id = '[user-id]' AND is_active = true;
-- Should have no active sessions
```

## Related Documentation

- [Database Schema](guide-database-schema.md)
- [API Reference](guide-api-reference.md)
- [Security Design](../security/security-design.md)
- [Architecture Overview](guide-architecture.md)
