# Admin Dashboard API Reference

## Overview

This document provides a comprehensive reference for all Admin Dashboard APIs, including service functions, database functions, and type definitions.

## Service Layer APIs

### Admin Service (`lib/adminService.ts`)

#### fetchAllUsers()

Fetches paginated list of all users.

**Signature**:
```typescript
function fetchAllUsers(options?: {
  page?: number;
  limit?: number;
  search?: string;
  planTier?: string;
  role?: string;
}): Promise<{ users: AdminUserData[]; total: number }>
```

**Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Users per page (default: 50)
- `search` (optional): Search by username or email
- `planTier` (optional): Filter by plan tier
- `role` (optional): Filter by role

**Returns**: Promise with users array and total count

**Throws**: `AdminError` if unauthorized or database error

**Example**:
```typescript
const { users, total } = await fetchAllUsers({
  page: 1,
  limit: 50,
  search: 'john',
  planTier: 'creator_pro'
});
```

#### fetchUserDetails()

Fetches detailed information for a specific user.

**Signature**:
```typescript
function fetchUserDetails(userId: string): Promise<AdminUserData>
```

**Parameters**:
- `userId`: User ID to fetch

**Returns**: Promise with complete user data including activity summary

**Throws**: `AdminError` if unauthorized or user not found

#### updateUserPlanTier()

Updates a user's plan tier.

**Signature**:
```typescript
function updateUserPlanTier(
  userId: string,
  newTier: string
): Promise<void>
```

**Parameters**:
- `userId`: User ID to update
- `newTier`: New plan tier ('free_user', 'creator_pro', 'creator_premium')

**Side Effects**: Logs action to audit trail

**Throws**: `AdminError` if unauthorized or invalid tier

#### updateUserRoles()

Updates a user's roles.

**Signature**:
```typescript
function updateUserRoles(
  userId: string,
  roles: string[]
): Promise<void>
```

**Parameters**:
- `userId`: User ID to update
- `roles`: Array of role types ('moderator', 'tester')

**Side Effects**: Logs action to audit trail

**Throws**: `AdminError` if unauthorized or invalid role

#### suspendUser()

Suspends a user account.

**Signature**:
```typescript
function suspendUser(
  userId: string,
  reason: string,
  durationDays?: number
): Promise<void>
```

**Parameters**:
- `userId`: User ID to suspend
- `reason`: Suspension reason
- `durationDays` (optional): Suspension duration

**Side Effects**: Logs action to audit trail

**Throws**: `AdminError` if unauthorized or cannot suspend admin

#### resetUserPassword()

Initiates password reset for a user.

**Signature**:
```typescript
function resetUserPassword(userId: string): Promise<void>
```

**Parameters**:
- `userId`: User ID for password reset

**Side Effects**: 
- Sends password reset email
- Logs action to audit trail

**Throws**: `AdminError` if unauthorized

### Platform Config Service (`lib/platformConfigService.ts`)

#### fetchPlatformConfig()

Fetches platform configuration.

**Signature**:
```typescript
function fetchPlatformConfig(
  configType?: string
): Promise<PlatformConfig[]>
```

**Parameters**:
- `configType` (optional): Filter by config type

**Returns**: Promise with array of config entries

**Caching**: 5-minute in-memory cache

#### updatePlatformConfig()

Updates platform configuration.

**Signature**:
```typescript
function updatePlatformConfig(
  configKey: string,
  configValue: Record<string, unknown>,
  configType: string,
  description?: string
): Promise<void>
```

**Parameters**:
- `configKey`: Unique config key
- `configValue`: Config value (JSONB)
- `configType`: Config type
- `description` (optional): Config description

**Side Effects**: 
- Logs action to audit trail
- Invalidates cache

#### fetchFeatureFlags()

Fetches all feature flags.

**Signature**:
```typescript
function fetchFeatureFlags(): Promise<PlatformConfig[]>
```

**Returns**: Promise with feature flag configs

#### updateFeatureFlag()

Updates a feature flag.

**Signature**:
```typescript
function updateFeatureFlag(
  flagKey: string,
  enabled: boolean
): Promise<void>
```

**Parameters**:
- `flagKey`: Feature flag key
- `enabled`: Enable/disable flag

**Side Effects**: Logs action to audit trail

### Security Service (`lib/securityService.ts`)

#### fetchSecurityEvents()

Fetches security events with filtering.

**Signature**:
```typescript
function fetchSecurityEvents(options?: {
  severity?: string;
  eventType?: string;
  resolved?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ events: SecurityEvent[]; total: number }>
```

**Parameters**:
- `severity` (optional): Filter by severity
- `eventType` (optional): Filter by event type
- `resolved` (optional): Filter by resolution status
- `page` (optional): Page number
- `limit` (optional): Events per page

**Returns**: Promise with events array and total count

#### resolveSecurityEvent()

Marks a security event as resolved.

**Signature**:
```typescript
function resolveSecurityEvent(
  eventId: string,
  notes?: string
): Promise<void>
```

**Parameters**:
- `eventId`: Event ID to resolve
- `notes` (optional): Resolution notes

**Side Effects**: Updates event in database

#### fetchAuditLogs()

Fetches audit logs with filtering.

**Signature**:
```typescript
function fetchAuditLogs(options?: {
  actionType?: string;
  adminUserId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ logs: AdminAuditLog[]; total: number }>
```

**Parameters**:
- `actionType` (optional): Filter by action type
- `adminUserId` (optional): Filter by admin user
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `page` (optional): Page number
- `limit` (optional): Logs per page

**Returns**: Promise with logs array and total count

#### fetchActiveSessions()

Fetches all active user sessions.

**Signature**:
```typescript
function fetchActiveSessions(): Promise<UserSession[]>
```

**Returns**: Promise with array of active sessions

#### terminateSession()

Terminates a user session.

**Signature**:
```typescript
function terminateSession(sessionId: string): Promise<void>
```

**Parameters**:
- `sessionId`: Session ID to terminate

**Side Effects**: 
- Logs action to audit trail
- User logged out immediately

### System Health Service (`lib/systemHealthService.ts`)

#### fetchSystemMetrics()

Fetches system metrics.

**Signature**:
```typescript
function fetchSystemMetrics(options?: {
  metricType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<SystemMetric[]>
```

**Parameters**:
- `metricType` (optional): Filter by metric type
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

**Returns**: Promise with array of metrics

**Caching**: 1-minute cache

#### fetchSystemHealth()

Fetches overall system health status.

**Signature**:
```typescript
function fetchSystemHealth(): Promise<SystemHealth>
```

**Returns**: Promise with system health object

#### fetchPerformanceMetrics()

Fetches performance metrics summary.

**Signature**:
```typescript
function fetchPerformanceMetrics(): Promise<{
  pageLoadTime: { avg: number; p95: number; p99: number };
  apiResponseTime: { avg: number; p95: number; p99: number };
  cacheHitRate: number;
  errorRate: number;
}>
```

**Returns**: Promise with performance metrics

#### clearCache()

Clears specified cache.

**Signature**:
```typescript
function clearCache(cacheType: string): Promise<void>
```

**Parameters**:
- `cacheType`: Cache type to clear ('all', 'user', 'config', 'metrics')

**Side Effects**: Logs action to audit trail

#### fetchSlowQueries()

Fetches slow database queries.

**Signature**:
```typescript
function fetchSlowQueries(): Promise<Array<{
  query: string;
  executionTime: number;
  frequency: number;
  recommendations: string[];
}>>
```

**Returns**: Promise with slow queries and recommendations

#### fetchErrorLogs()

Fetches recent error logs.

**Signature**:
```typescript
function fetchErrorLogs(options?: {
  errorType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<Array<{
  errorType: string;
  message: string;
  count: number;
  lastOccurrence: Date;
  stackTrace?: string;
}>>
```

**Parameters**:
- `errorType` (optional): Filter by error type
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `limit` (optional): Max errors to return

**Returns**: Promise with error logs

### Analytics Service (`lib/analyticsService.ts`)

#### fetchUserGrowthMetrics()

Fetches user growth metrics.

**Signature**:
```typescript
function fetchUserGrowthMetrics(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  growthRate: number;
}>
```

**Parameters**:
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Returns**: Promise with user growth metrics

**Caching**: 15-minute cache

#### fetchContentMetrics()

Fetches content metrics.

**Signature**:
```typescript
function fetchContentMetrics(): Promise<{
  totalTracks: number;
  totalAlbums: number;
  totalPlaylists: number;
  totalPosts: number;
  uploadsToday: number;
  uploadsThisWeek: number;
  uploadsThisMonth: number;
}>
```

**Returns**: Promise with content metrics

#### fetchEngagementMetrics()

Fetches engagement metrics.

**Signature**:
```typescript
function fetchEngagementMetrics(): Promise<{
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalFollows: number;
  avgPlaysPerTrack: number;
  avgEngagementRate: number;
}>
```

**Returns**: Promise with engagement metrics

#### fetchPlanDistribution()

Fetches plan tier distribution.

**Signature**:
```typescript
function fetchPlanDistribution(): Promise<{
  freeUsers: number;
  creatorPro: number;
  creatorPremium: number;
}>
```

**Returns**: Promise with plan distribution

#### fetchRevenueMetrics()

Fetches revenue metrics.

**Signature**:
```typescript
function fetchRevenueMetrics(): Promise<{
  mrr: number;
  arr: number;
  churnRate: number;
}>
```

**Returns**: Promise with revenue metrics

#### fetchTopCreators()

Fetches top creators.

**Signature**:
```typescript
function fetchTopCreators(options?: {
  sortBy?: 'followers' | 'plays' | 'engagement';
  limit?: number;
}): Promise<Array<{
  userId: string;
  username: string;
  followers: number;
  totalPlays: number;
  engagementRate: number;
}>>
```

**Parameters**:
- `sortBy` (optional): Sort criteria (default: 'followers')
- `limit` (optional): Max creators to return (default: 10)

**Returns**: Promise with top creators

#### exportAnalyticsData()

Exports analytics data to CSV.

**Signature**:
```typescript
function exportAnalyticsData(options: {
  dataTypes: string[];
  startDate?: Date;
  endDate?: Date;
}): Promise<Blob>
```

**Parameters**:
- `dataTypes`: Array of data types to export
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Returns**: Promise with CSV blob

## Database Functions

See [Database Functions Guide](guide-database-functions.md) for complete documentation.

## Type Definitions

### AdminUserData

```typescript
interface AdminUserData {
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
```

### UserActivitySummary

```typescript
interface UserActivitySummary {
  posts_count: number;
  tracks_count: number;
  albums_count: number;
  playlists_count: number;
  comments_count: number;
  likes_given: number;
  likes_received: number;
  last_active: string;
}
```

### PlatformConfig

```typescript
interface PlatformConfig {
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
```

### SecurityEvent

```typescript
interface SecurityEvent {
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
```

### AdminAuditLog

```typescript
interface AdminAuditLog {
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
```

### SystemMetric

```typescript
interface SystemMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  metadata: Record<string, unknown> | null;
  recorded_at: string;
}
```

### UserSession

```typescript
interface UserSession {
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
```

### SystemHealth

```typescript
interface SystemHealth {
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

### AdminError

```typescript
class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  );
}
```

### Error Codes

```typescript
const ADMIN_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;
```

## Error Handling

All service functions throw `AdminError` with appropriate error codes:

```typescript
try {
  await updateUserPlanTier(userId, newTier);
} catch (error) {
  if (error instanceof AdminError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        // Handle unauthorized
        break;
      case 'VALIDATION_ERROR':
        // Handle validation error
        break;
      default:
        // Handle other errors
    }
  }
}
```

## Related Documentation

- [Architecture Overview](guide-architecture.md)
- [Database Schema](guide-database-schema.md)
- [Database Functions](guide-database-functions.md)
- [Security Design](../security/security-design.md)
