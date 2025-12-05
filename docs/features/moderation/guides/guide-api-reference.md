# Moderation System API Reference

## Overview

This document provides comprehensive API documentation for the Moderation System, including all service functions, database functions, error codes, and usage examples.

## Table of Contents

1. [Service Functions](#service-functions)
2. [Database Functions](#database-functions)
3. [Error Codes](#error-codes)
4. [Type Definitions](#type-definitions)
5. [Usage Examples](#usage-examples)

---

## Service Functions

### User Reporting Functions

#### `submitReport(params: ReportParams): Promise<Report>`

Submit a user report for content or user violations.

**Requirements:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6

**Parameters:**
- `params.reportType` (string): Type of content being reported ('post', 'comment', 'track', 'user')
- `params.targetId` (string): UUID of the content/user being reported
- `params.reason` (ReportReason): Reason for the report
- `params.description` (string, optional): Additional description (required if reason is 'other', max 1000 chars)

**Returns:** Created `Report` object

**Throws:**
- `VALIDATION_ERROR`: Invalid parameters or missing required fields
- `RATE_LIMIT_EXCEEDED`: User has exceeded 10 reports per 24 hours
- `UNAUTHORIZED`: User is not authenticated
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { submitReport } from '@/lib/moderationService';

try {
  const report = await submitReport({
    reportType: 'post',
    targetId: 'post-uuid-here',
    reason: 'spam',
    description: 'This post contains spam links'
  });
  console.log('Report submitted:', report.id);
} catch (error) {
  if (error.code === 'MODERATION_RATE_LIMIT_EXCEEDED') {
    console.error('Too many reports. Please try again later.');
  }
}
```

---

### Moderator Flagging Functions

#### `moderatorFlagContent(params: ModeratorFlagParams): Promise<Report>`

Moderator directly flags content for review (bypasses user report flow).

**Requirements:** 2.1, 2.2, 2.3, 2.4, 2.6

**Parameters:**
- `params.reportType` (string): Type of content being flagged
- `params.targetId` (string): UUID of the content/user being flagged
- `params.reason` (ReportReason): Reason for the flag
- `params.internalNotes` (string): Internal notes for moderators (required, max 5000 chars)
- `params.priority` (number, optional): Priority level 1-5 (defaults to calculated priority)

**Returns:** Created `Report` object with `moderator_flagged: true` and `status: 'under_review'`

**Throws:**
- `VALIDATION_ERROR`: Invalid parameters
- `UNAUTHORIZED`: User is not a moderator or admin
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { moderatorFlagContent } from '@/lib/moderationService';

const report = await moderatorFlagContent({
  reportType: 'user',
  targetId: 'user-uuid-here',
  reason: 'harassment',
  internalNotes: 'Multiple reports of harassment from this user',
  priority: 2
});
```

---

### Moderation Queue Functions

#### `fetchModerationQueue(filters?: QueueFilters): Promise<Report[]>`

Fetch the moderation queue with optional filtering and sorting.

**Requirements:** 4.1, 4.2, 4.3, 4.4

**Parameters:**
- `filters.status` (string, optional): Filter by report status
- `filters.priority` (number, optional): Filter by priority level
- `filters.moderatorFlagged` (boolean, optional): Filter by moderator-flagged reports
- `filters.reportType` (string, optional): Filter by report type
- `filters.startDate` (string, optional): Filter by creation date (ISO string)
- `filters.endDate` (string, optional): Filter by creation date (ISO string)

**Returns:** Array of `Report` objects sorted by moderator_flagged (desc), priority (asc), created_at (asc)

**Throws:**
- `UNAUTHORIZED`: User is not a moderator or admin
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { fetchModerationQueue } from '@/lib/moderationService';

// Get all pending reports
const pendingReports = await fetchModerationQueue({ status: 'pending' });

// Get high-priority moderator-flagged reports
const urgentReports = await fetchModerationQueue({
  moderatorFlagged: true,
  priority: 1
});
```

---

### Moderation Action Functions

#### `takeModerationAction(params: ModerationActionParams): Promise<ModerationAction>`

Take a moderation action on a report.

**Requirements:** 5.1, 5.2, 5.3, 5.6, 5.7, 7.1, 7.2, 7.3, 7.4, 12.1, 12.2

**Parameters:**
- `params.reportId` (string): UUID of the report being acted upon
- `params.actionType` (string): Type of action to take
- `params.targetUserId` (string): UUID of the user being acted upon
- `params.targetType` (string, optional): Type of content being acted upon
- `params.targetId` (string, optional): UUID of content being acted upon
- `params.reason` (string): Reason for the action (max 1000 chars)
- `params.durationDays` (number, optional): Duration for suspensions/restrictions
- `params.internalNotes` (string, optional): Internal notes (max 5000 chars)
- `params.notificationMessage` (string, optional): Custom notification message (max 2000 chars)

**Action Types:**
- `content_removed`: Permanently delete content
- `content_approved`: Dismiss report, no action needed
- `user_warned`: Issue warning to user
- `user_suspended`: Temporarily suspend user
- `user_banned`: Permanently ban user (admin only)
- `restriction_applied`: Apply specific restriction

**Returns:** Created `ModerationAction` object

**Throws:**
- `VALIDATION_ERROR`: Invalid parameters
- `UNAUTHORIZED`: User is not a moderator or admin
- `INSUFFICIENT_PERMISSIONS`: Action requires admin role or targets admin account
- `RATE_LIMIT_EXCEEDED`: Moderator has exceeded 100 actions per hour
- `NOT_FOUND`: Report not found
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { takeModerationAction } from '@/lib/moderationService';

const action = await takeModerationAction({
  reportId: 'report-uuid-here',
  actionType: 'user_suspended',
  targetUserId: 'user-uuid-here',
  reason: 'Repeated spam violations',
  durationDays: 7,
  internalNotes: 'Third violation this month',
  notificationMessage: 'Your account has been suspended for spam violations.'
});
```

---

### Restriction Management Functions

#### `applyRestriction(userId, restrictionType, reason, durationDays?, relatedActionId?, sendNotification?): Promise<UserRestriction>`

Apply a specific restriction to a user.

**Requirements:** 5.2, 5.4, 6.1, 6.2, 6.3, 6.4, 7.4

**Parameters:**
- `userId` (string): UUID of user to restrict
- `restrictionType` (RestrictionType): Type of restriction
- `reason` (string): Reason for restriction (max 1000 chars)
- `durationDays` (number, optional): Duration in days (null = permanent)
- `relatedActionId` (string, optional): Related moderation action ID
- `sendNotification` (boolean, optional): Send notification to user (default: true)

**Restriction Types:**
- `posting_disabled`: User cannot create posts
- `commenting_disabled`: User cannot create comments
- `upload_disabled`: User cannot upload tracks
- `suspended`: User cannot perform any actions

**Returns:** Created `UserRestriction` object

**Throws:**
- `VALIDATION_ERROR`: Invalid parameters
- `UNAUTHORIZED`: User is not a moderator or admin
- `INSUFFICIENT_PERMISSIONS`: Cannot restrict admin accounts
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { applyRestriction } from '@/lib/moderationService';

const restriction = await applyRestriction(
  'user-uuid-here',
  'commenting_disabled',
  'Harassment in comments',
  30 // 30 days
);
```



#### `checkUserRestrictions(userId: string): Promise<UserRestriction[]>`

Check if user has any active restrictions.

**Requirements:** 6.1, 6.2, 6.3, 6.4, 6.5

**Parameters:**
- `userId` (string): UUID of user to check

**Returns:** Array of active `UserRestriction` objects

**Throws:**
- `VALIDATION_ERROR`: Invalid user ID
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { checkUserRestrictions } from '@/lib/moderationService';

const restrictions = await checkUserRestrictions('user-uuid-here');
const isSuspended = restrictions.some(r => r.restriction_type === 'suspended');
```

---

#### `canUserPerformAction(userId: string, action: 'post' | 'comment' | 'upload'): Promise<boolean>`

Check if user can perform a specific action based on restrictions.

**Requirements:** 6.1, 6.2, 6.3, 6.4, 6.5

**Parameters:**
- `userId` (string): UUID of user to check
- `action` (string): Action to check ('post', 'comment', 'upload')

**Returns:** `true` if user can perform the action, `false` otherwise

**Throws:**
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { canUserPerformAction } from '@/lib/moderationService';

const canPost = await canUserPerformAction('user-uuid-here', 'post');
if (!canPost) {
  console.error('You are restricted from posting');
}
```

---

#### `removeUserRestriction(restrictionId: string): Promise<void>`

Remove a user restriction (moderator/admin only).

**Requirements:** 11.3

**Parameters:**
- `restrictionId` (string): UUID of restriction to remove

**Returns:** void

**Throws:**
- `VALIDATION_ERROR`: Invalid restriction ID
- `UNAUTHORIZED`: User is not a moderator or admin
- `INSUFFICIENT_PERMISSIONS`: Cannot modify own restrictions or admin restrictions
- `NOT_FOUND`: Restriction not found
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { removeUserRestriction } from '@/lib/moderationService';

await removeUserRestriction('restriction-uuid-here');
```

---

### Action Logs Functions

#### `fetchModerationLogs(filters?, limit?, offset?): Promise<{ actions: ModerationAction[]; total: number }>`

Fetch moderation action logs with filtering and pagination.

**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.6

**Parameters:**
- `filters.actionType` (string, optional): Filter by action type
- `filters.moderatorId` (string, optional): Filter by moderator
- `filters.targetUserId` (string, optional): Filter by target user
- `filters.startDate` (string, optional): Filter by date range
- `filters.endDate` (string, optional): Filter by date range
- `filters.searchQuery` (string, optional): Search by user ID or content ID
- `limit` (number, optional): Max records to return (default: 100)
- `offset` (number, optional): Records to skip for pagination (default: 0)

**Returns:** Object with `actions` array and `total` count

**Throws:**
- `UNAUTHORIZED`: User is not a moderator or admin
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { fetchModerationLogs } from '@/lib/moderationService';

const { actions, total } = await fetchModerationLogs(
  { actionType: 'user_suspended' },
  50,
  0
);
console.log(`Found ${total} suspension actions`);
```

---

#### `exportActionLogsToCSV(filters?): Promise<string>`

Export moderation action logs to CSV format (admin only).

**Requirements:** 8.5

**Parameters:**
- `filters` (ActionLogFilters, optional): Same filters as fetchModerationLogs

**Returns:** CSV string

**Throws:**
- `INSUFFICIENT_PERMISSIONS`: User is not an admin
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { exportActionLogsToCSV } from '@/lib/moderationService';

const csv = await exportActionLogsToCSV({ startDate: '2024-01-01' });
// Download or save CSV
```

---

### Metrics Functions

#### `calculateModerationMetrics(dateRange?, includeSLA?, includeTrends?): Promise<ModerationMetrics>`

Calculate moderation metrics with optional date range filtering.

**Requirements:** 9.1, 9.2, 9.3, 9.4, 9.5, 9.6

**Parameters:**
- `dateRange` (MetricsDateRange, optional): Date range for filtering
- `includeSLA` (boolean, optional): Include SLA compliance data (default: false)
- `includeTrends` (boolean, optional): Include trend data (default: false)

**Returns:** `ModerationMetrics` object containing:
- `reportsReceived`: Counts for today/week/month
- `reportsResolved`: Counts for today/week/month
- `averageResolutionTime`: Hours and minutes
- `actionsByType`: Count by action type
- `topReasons`: Top 5 report reasons
- `moderatorPerformance`: Performance by moderator (admin only)
- `slaCompliance`: SLA compliance by priority (if requested)
- `trends`: Report volume and resolution rate trends (if requested)

**Throws:**
- `UNAUTHORIZED`: User is not a moderator or admin
- `DATABASE_ERROR`: Database operation failed

**Example:**
```typescript
import { calculateModerationMetrics } from '@/lib/moderationService';

const metrics = await calculateModerationMetrics(
  {
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-31T23:59:59Z'
  },
  true, // Include SLA
  true  // Include trends
);

console.log(`Average resolution: ${metrics.averageResolutionTime.hours}h ${metrics.averageResolutionTime.minutes}m`);
```

---

### Utility Functions

#### `isModeratorOrAdmin(userId: string): Promise<boolean>`

Check if user has moderator or admin role.

**Requirements:** 11.1, 11.2

**Parameters:**
- `userId` (string): UUID of user to check

**Returns:** `true` if user is moderator or admin

**Throws:**
- `DATABASE_ERROR`: Database operation failed

---

#### `isAdmin(userId: string): Promise<boolean>`

Check if user has admin role.

**Requirements:** 11.1

**Parameters:**
- `userId` (string): UUID of user to check

**Returns:** `true` if user is admin

**Throws:**
- `DATABASE_ERROR`: Database operation failed

---

#### `calculatePriority(reason: ReportReason): number`

Calculate priority level based on report reason.

**Requirements:** 1.4

**Parameters:**
- `reason` (ReportReason): Report reason

**Returns:** Priority level (1-5, where 1 is highest)

**Priority Mapping:**
- `self_harm`: 1 (Critical)
- `hate_speech`: 2 (High)
- `harassment`: 2 (High)
- `inappropriate_content`: 3 (Standard)
- `spam`: 3 (Standard)
- `copyright_violation`: 3 (Standard)
- `impersonation`: 3 (Standard)
- `other`: 4 (Low)

---

## Database Functions

These functions are available in the PostgreSQL database and can be called via Supabase.

### `can_user_post(p_user_id UUID): BOOLEAN`

Check if user can create posts.

**Requirements:** 6.1

**Parameters:**
- `p_user_id`: User ID to check

**Returns:** `true` if user can post, `false` if restricted or suspended

**Usage:**
```sql
SELECT can_user_post('user-uuid-here');
```

---

### `can_user_comment(p_user_id UUID): BOOLEAN`

Check if user can create comments.

**Requirements:** 6.2

**Parameters:**
- `p_user_id`: User ID to check

**Returns:** `true` if user can comment, `false` if restricted or suspended

---

### `can_user_upload(p_user_id UUID): BOOLEAN`

Check if user can upload tracks.

**Requirements:** 6.3

**Parameters:**
- `p_user_id`: User ID to check

**Returns:** `true` if user can upload, `false` if restricted or suspended

---

### `get_user_restrictions(p_user_id UUID): TABLE`

Get all active restrictions for a user.

**Requirements:** 6.1, 6.2, 6.3, 6.4

**Parameters:**
- `p_user_id`: User ID to check

**Returns:** Table of active restrictions

---

### `expire_restrictions(): INTEGER`

Expire time-based restrictions that have passed their expiration date.

**Requirements:** 6.7

**Returns:** Number of restrictions expired

**Usage:** Called by scheduled job every hour

---

### `expire_suspensions(): INTEGER`

Expire time-based suspensions that have passed their expiration date.

**Requirements:** 6.7, 12.3

**Returns:** Number of suspensions expired

**Usage:** Called by scheduled job every hour

---

## Error Codes

All moderation errors use the `ModerationError` class with specific error codes:

### `MODERATION_DATABASE_ERROR`

Database operation failed. Check the `originalError` property for details.

**Common Causes:**
- Network connectivity issues
- Database constraints violated
- Invalid SQL queries

**Handling:**
```typescript
try {
  await submitReport(params);
} catch (error) {
  if (error.code === 'MODERATION_DATABASE_ERROR') {
    console.error('Database error:', error.originalError);
    // Retry or show user-friendly message
  }
}
```

---

### `MODERATION_UNAUTHORIZED`

User is not authenticated or does not have required role.

**Common Causes:**
- User not logged in
- User is not a moderator or admin
- Session expired

**Handling:**
```typescript
if (error.code === 'MODERATION_UNAUTHORIZED') {
  // Redirect to login or show access denied message
}
```

---

### `MODERATION_VALIDATION_ERROR`

Input validation failed.

**Common Causes:**
- Invalid UUID format
- Missing required fields
- Text exceeds maximum length
- Invalid enum values

**Handling:**
```typescript
if (error.code === 'MODERATION_VALIDATION_ERROR') {
  console.error('Validation error:', error.message);
  // Show field-specific error messages
}
```

---

### `MODERATION_RATE_LIMIT_EXCEEDED`

Rate limit exceeded for reports or actions.

**Limits:**
- User reports: 10 per 24 hours
- Moderation actions: 100 per hour

**Handling:**
```typescript
if (error.code === 'MODERATION_RATE_LIMIT_EXCEEDED') {
  console.error('Rate limit exceeded. Please try again later.');
  // Show countdown timer or retry button
}
```

---

### `MODERATION_NOT_FOUND`

Requested resource not found.

**Common Causes:**
- Report ID doesn't exist
- Restriction ID doesn't exist
- Content was deleted

**Handling:**
```typescript
if (error.code === 'MODERATION_NOT_FOUND') {
  // Refresh data or show "not found" message
}
```

---

### `MODERATION_INSUFFICIENT_PERMISSIONS`

User lacks required permissions for the action.

**Common Causes:**
- Moderator trying to ban users (admin only)
- Moderator trying to act on admin accounts
- User trying to modify own restrictions

**Handling:**
```typescript
if (error.code === 'MODERATION_INSUFFICIENT_PERMISSIONS') {
  console.error('Insufficient permissions:', error.message);
  // Hide admin-only features or show permission denied
}
```

---

### `MODERATION_CONCURRENT_MODIFICATION`

Resource was modified by another user.

**Handling:**
```typescript
if (error.code === 'MODERATION_CONCURRENT_MODIFICATION') {
  // Reload data and ask user to retry
}
```

---

### `MODERATION_INVALID_ACTION`

Invalid action type or action cannot be performed.

**Handling:**
```typescript
if (error.code === 'MODERATION_INVALID_ACTION') {
  console.error('Invalid action:', error.message);
}
```

---

## Type Definitions

### ReportReason

```typescript
type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'copyright_violation'
  | 'impersonation'
  | 'self_harm'
  | 'other';
```

---

### RestrictionType

```typescript
type RestrictionType =
  | 'posting_disabled'
  | 'commenting_disabled'
  | 'upload_disabled'
  | 'suspended';
```

---

### Report

```typescript
interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  report_type: 'post' | 'comment' | 'track' | 'user';
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: number; // 1-5
  moderator_flagged: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### ModerationAction

```typescript
interface ModerationAction {
  id: string;
  moderator_id: string;
  target_user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  reason: string;
  duration_days: number | null;
  expires_at: string | null;
  related_report_id: string | null;
  internal_notes: string | null;
  notification_sent: boolean;
  notification_message: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  metadata: Record<string, any> | null;
}
```

---

### UserRestriction

```typescript
interface UserRestriction {
  id: string;
  user_id: string;
  restriction_type: RestrictionType;
  expires_at: string | null;
  is_active: boolean;
  reason: string;
  applied_by: string;
  related_action_id: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Usage Examples

### Complete User Report Flow

```typescript
import { submitReport } from '@/lib/moderationService';

async function handleReportSubmission(postId: string) {
  try {
    const report = await submitReport({
      reportType: 'post',
      targetId: postId,
      reason: 'spam',
      description: 'This post contains spam links'
    });

    // Show success message
    console.log('Report submitted successfully');
    return report;
  } catch (error) {
    if (error.code === 'MODERATION_RATE_LIMIT_EXCEEDED') {
      alert('You have submitted too many reports. Please try again later.');
    } else if (error.code === 'MODERATION_VALIDATION_ERROR') {
      alert('Invalid report data. Please check your input.');
    } else {
      alert('Failed to submit report. Please try again.');
    }
    throw error;
  }
}
```

---

### Complete Moderation Action Flow

```typescript
import { takeModerationAction, fetchModerationQueue } from '@/lib/moderationService';

async function handleModerationAction(reportId: string) {
  try {
    // Fetch report details
    const reports = await fetchModerationQueue();
    const report = reports.find(r => r.id === reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    // Take action
    const action = await takeModerationAction({
      reportId: report.id,
      actionType: 'content_removed',
      targetUserId: report.reported_user_id!,
      targetType: report.report_type,
      targetId: report.target_id,
      reason: 'Spam content removed',
      internalNotes: 'Clear spam violation',
      notificationMessage: 'Your content was removed for violating our spam policy.'
    });

    console.log('Action taken successfully:', action.id);
    return action;
  } catch (error) {
    if (error.code === 'MODERATION_INSUFFICIENT_PERMISSIONS') {
      alert('You do not have permission to perform this action.');
    } else if (error.code === 'MODERATION_RATE_LIMIT_EXCEEDED') {
      alert('You have performed too many actions. Please wait before continuing.');
    } else {
      alert('Failed to take action. Please try again.');
    }
    throw error;
  }
}
```

---

### Checking User Restrictions Before Action

```typescript
import { canUserPerformAction } from '@/lib/moderationService';

async function createPost(userId: string, postData: any) {
  // Check if user can post
  const canPost = await canUserPerformAction(userId, 'post');

  if (!canPost) {
    throw new Error('You are restricted from creating posts');
  }

  // Proceed with post creation
  // ...
}
```

---

### Fetching and Displaying Metrics

```typescript
import { calculateModerationMetrics } from '@/lib/moderationService';

async function displayModerationDashboard() {
  const metrics = await calculateModerationMetrics(
    {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    },
    true, // Include SLA
    false // Don't include trends
  );

  console.log('Reports this month:', metrics.reportsReceived.month);
  console.log('Resolved this month:', metrics.reportsResolved.month);
  console.log('Average resolution time:', 
    `${metrics.averageResolutionTime.hours}h ${metrics.averageResolutionTime.minutes}m`
  );

  // Display SLA compliance
  if (metrics.slaCompliance) {
    console.log('P1 SLA compliance:', metrics.slaCompliance.p1.percentage + '%');
    console.log('P2 SLA compliance:', metrics.slaCompliance.p2.percentage + '%');
  }

  return metrics;
}
```

---

## Best Practices

### Error Handling

Always wrap moderation service calls in try-catch blocks and handle specific error codes:

```typescript
try {
  await moderationServiceCall();
} catch (error) {
  if (error instanceof ModerationError) {
    switch (error.code) {
      case 'MODERATION_UNAUTHORIZED':
        // Handle auth error
        break;
      case 'MODERATION_RATE_LIMIT_EXCEEDED':
        // Handle rate limit
        break;
      default:
        // Handle other errors
    }
  }
}
```

### Input Validation

Always validate user input before calling service functions:

```typescript
function validateReportInput(data: any): boolean {
  if (!data.targetId || !isValidUUID(data.targetId)) {
    return false;
  }
  if (!data.reason || !VALID_REASONS.includes(data.reason)) {
    return false;
  }
  if (data.reason === 'other' && !data.description) {
    return false;
  }
  return true;
}
```

### Rate Limiting

Implement client-side rate limiting to prevent hitting server limits:

```typescript
const reportCache = new Map<string, number>();

function canSubmitReport(userId: string): boolean {
  const lastReportTime = reportCache.get(userId);
  if (!lastReportTime) return true;

  const timeSinceLastReport = Date.now() - lastReportTime;
  const minInterval = 60 * 1000; // 1 minute between reports

  return timeSinceLastReport >= minInterval;
}
```

### Security

Never expose internal notes or moderator IDs to regular users:

```typescript
function sanitizeReportForUser(report: Report): Partial<Report> {
  return {
    id: report.id,
    report_type: report.report_type,
    reason: report.reason,
    status: report.status,
    created_at: report.created_at
    // Don't include: internal_notes, reviewed_by, resolution_notes
  };
}
```

---

## Support

For questions or issues with the Moderation System API:

1. Check this documentation first
2. Review the design document at `.kiro/specs/moderation-system/design.md`
3. Check the requirements document at `.kiro/specs/moderation-system/requirements.md`
4. Contact the development team

---

**Last Updated:** December 2024  
**Version:** 1.0
