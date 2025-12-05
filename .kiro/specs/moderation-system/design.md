# Design Document

## Overview

The Moderation System provides a comprehensive content and user moderation solution for the AI Music Community Platform. It enables users to report violations, moderators to review and take action, and administrators to monitor moderation activities. The system builds upon existing infrastructure including the user roles system, admin dashboard, and suspension functionality.

### Key Design Principles

1. **Leverage Existing Infrastructure**: Reuse existing `user_roles` table, `suspendUser()` function, and admin audit logging
2. **Separation of Concerns**: Distinct `/moderation/` dashboard for moderators, separate from `/admin/` dashboard
3. **Security First**: Server-side authorization checks, RLS policies, and comprehensive audit logging
4. **Scalability**: Efficient database queries with proper indexing and pagination
5. **User Experience**: Clear notifications, intuitive workflows, and responsive interfaces

### System Context

**Existing Components to Leverage:**
- `user_roles` table with `moderator` and `admin` roles
- `suspendUser(userId, reason, durationDays?)` function in `adminService.ts`
- `admin_audit_log` table for action tracking
- `security_events` table for security monitoring
- Avatar dropdown menu for navigation

**New Components to Build:**
- Moderation-specific database tables (reports, actions, restrictions)
- `/moderation/` page and dashboard components
- User reporting UI components
- Moderator flagging functionality
- Notification system integration

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├─────────────────────────────────────────────────────────────┤
│  User Reporting UI  │  Moderator Dashboard  │  Admin Dashboard│
│  - Report Modal     │  - Queue Tab          │  - User Mgmt    │
│  - Report Button    │  - Action Logs        │  - Existing     │
│                     │  - Metrics            │    Features     │
│                     │  - Flag Modal         │                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  moderationService.ts                                        │
│  - submitReport()           - fetchModerationQueue()         │
│  - moderatorFlagContent()   - takeModerationAction()         │
│  - applyRestriction()       - checkUserRestrictions()        │
│  - Integration with existing adminService.ts                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  New Tables:                Existing Tables:                 │
│  - moderation_reports       - user_roles                     │
│  - moderation_actions       - user_profiles                  │
│  - user_restrictions        - admin_audit_log                │
│                             - security_events                │
│  Database Functions:                                         │
│  - can_user_post()          - expire_restrictions()          │
│  - can_user_comment()       - expire_suspensions()           │
│  - can_user_upload()        - get_user_restrictions()        │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**User Report Flow:**
```
User clicks Report → ReportModal opens → submitReport() called
→ moderation_reports table insert → Report appears in Queue
→ Moderator reviews → takeModerationAction() called
→ moderation_actions table insert → User receives notification
```

**Moderator Flag Flow:**
```
Moderator clicks Flag → ModeratorFlagModal opens → moderatorFlagContent()
→ moderation_reports table insert (moderator_flagged=true)
→ Report goes to "under_review" status → Appears at top of queue
→ Moderator takes action → Same action flow as user reports
```

**Restriction Enforcement Flow:**
```
User attempts action → API endpoint checks restrictions
→ can_user_post/comment/upload() function called
→ Returns true/false → Action allowed or blocked with error message
```

## Reversal Workflow

### Reversal Authorization Matrix

| Action Type | Moderator Can Reverse | Admin Can Reverse | Self-Reversal Allowed |
|-------------|----------------------|-------------------|----------------------|
| Warning | ✅ (non-admin users) | ✅ (all users) | ✅ |
| Suspension | ✅ (non-admin users) | ✅ (all users) | ✅ |
| Restriction | ✅ (non-admin users) | ✅ (all users) | ✅ |
| Ban | ❌ | ✅ (all users) | ❌ |
| Content Removal | ✅ (non-admin users) | ✅ (all users) | ✅ |

### Reversal Process Flow

```
Moderator views user profile → Sees active action indicator
→ Clicks "Lift Suspension" / "Remove Ban" / "Remove Restriction"
→ Confirmation dialog opens with reason input (required)
→ Moderator enters reason and confirms
→ System updates moderation_actions.revoked_at and revoked_by
→ System updates user_profiles or user_restrictions
→ System sends reversal notification to user
→ System logs reversal in audit trail
→ UI updates to show action has been reversed
```

### Reversal UI Patterns

**User Profile Status Display:**
```
┌─────────────────────────────────────────┐
│ User: john_doe                          │
│ Status: 🔴 Suspended until 2024-01-15  │
│                                         │
│ [Lift Suspension] [View History]       │
│                                         │
│ Active Restrictions:                    │
│ • Commenting Disabled (expires 2024-01-10) │
│   [Remove Restriction]                  │
│ • Upload Disabled (expires 2024-01-20) │
│   [Remove Restriction]                  │
└─────────────────────────────────────────┘
```

**Reversal Confirmation Dialog:**
```
┌─────────────────────────────────────────┐
│ Lift Suspension                         │
│                                         │
│ You are about to lift the suspension   │
│ for user: john_doe                      │
│                                         │
│ Original Action:                        │
│ • Suspended until: 2024-01-15          │
│ • Reason: Spam posting                 │
│ • Applied by: moderator_jane           │
│                                         │
│ Reason for reversal: (required)        │
│ ┌─────────────────────────────────────┐ │
│ │ False positive - user was framed    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancel] [Confirm Lift Suspension]     │
└─────────────────────────────────────────┘
```

**Action Log Entry with Reversal:**
```
┌─────────────────────────────────────────┐
│ 🔴 User Suspended                       │
│ User: john_doe                          │
│ By: moderator_jane                      │
│ Date: 2024-01-01 10:30 AM              │
│ Reason: Spam posting                    │
│ Duration: 14 days                       │
│                                         │
│ ✅ REVERSED on 2024-01-05 2:15 PM      │
│ By: moderator_jane                      │
│ Reason: False positive - user was framed│
└─────────────────────────────────────────┘
```

## Components and Interfaces

### Database Schema

#### New Tables

**1. moderation_reports**
```sql
CREATE TABLE moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('post', 'comment', 'track', 'user')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate_speech', 'inappropriate_content',
    'copyright_violation', 'impersonation', 'self_harm', 'other'
  )),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'resolved', 'dismissed'
  )),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  moderator_flagged BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**2. moderation_actions**
```sql
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'content_removed', 'content_approved',
    'user_warned', 'user_suspended', 'user_banned', 'restriction_applied'
  )),
  target_type TEXT CHECK (target_type IN ('post', 'comment', 'track', 'user')),
  target_id UUID,
  reason TEXT NOT NULL,
  duration_days INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  related_report_id UUID REFERENCES moderation_reports(id) ON DELETE SET NULL,
  internal_notes TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB
);
```

**3. user_restrictions**
```sql
CREATE TABLE user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN (
    'posting_disabled', 'commenting_disabled', 'upload_disabled', 'suspended'
  )),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  reason TEXT NOT NULL,
  applied_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  related_action_id UUID REFERENCES moderation_actions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table Modifications

**user_profiles enhancements:**
```sql
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
```

### TypeScript Interfaces

```typescript
// Report interfaces
export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  report_type: 'post' | 'comment' | 'track' | 'user';
  target_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: number;
  moderator_flagged: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportParams {
  reportType: 'post' | 'comment' | 'track' | 'user';
  targetId: string;
  reason: string;
  description?: string;
}

export interface ModeratorFlagParams {
  reportType: 'post' | 'comment' | 'track' | 'user';
  targetId: string;
  reason: string;
  internalNotes: string;
  priority?: number;
}

// Action interfaces
export interface ModerationAction {
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

export interface ModerationActionParams {
  reportId: string;
  actionType: string;
  targetUserId: string;
  targetType?: string;
  targetId?: string;
  reason: string;
  durationDays?: number;
  internalNotes?: string;
  notificationMessage?: string;
}

// Restriction interfaces
export interface UserRestriction {
  id: string;
  user_id: string;
  restriction_type: 'posting_disabled' | 'commenting_disabled' | 'upload_disabled' | 'suspended';
  expires_at: string | null;
  is_active: boolean;
  reason: string;
  applied_by: string;
  related_action_id: string | null;
  created_at: string;
  updated_at: string;
}

// Queue interfaces
export interface QueueFilters {
  status?: string;
  priority?: number;
  moderatorFlagged?: boolean;
}
```

## Data Models

### Report Priority Calculation

Priority is automatically calculated based on report reason:

```typescript
const PRIORITY_MAP: Record<string, number> = {
  'self_harm': 1,              // P1 - Critical
  'hate_speech': 2,            // P2 - High
  'harassment': 2,             // P2 - High
  'inappropriate_content': 3,  // P3 - Standard
  'spam': 3,                   // P3 - Standard
  'copyright_violation': 3,    // P3 - Standard
  'impersonation': 3,          // P3 - Standard
  'other': 4,                  // P4 - Low
};
```

### Report Status Lifecycle

```
pending → under_review → resolved
                      ↘ dismissed
```

- **pending**: Initial state for user reports
- **under_review**: Moderator is actively reviewing (default for moderator flags)
- **resolved**: Action taken, report closed
- **dismissed**: No action needed, report closed

### Restriction Types and Enforcement

| Restriction Type | Blocks | Checked By |
|-----------------|--------|------------|
| `posting_disabled` | Creating new posts | `can_user_post()` |
| `commenting_disabled` | Creating comments | `can_user_comment()` |
| `upload_disabled` | Uploading tracks | `can_user_upload()` |
| `suspended` | All actions | All three functions |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Report Creation Validity
*For any* valid report parameters (type, target, reason), submitting a report should create exactly one report record with status "pending" and correct priority based on reason.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Rate Limit Enforcement
*For any* user, attempting to submit more than 10 reports within a 24-hour period should be rejected, and the report count should remain at or below 10.
**Validates: Requirements 1.6, 1.7**

### Property 3: Moderator Flag Priority
*For any* moderator-flagged report, the report should have status "under_review", moderator_flagged set to true, and priority should be 2 or higher.
**Validates: Requirements 2.3, 2.4, 2.6**

### Property 4: Authorization Check Consistency
*For any* moderation action, only users with active moderator or admin role should be able to create the action, and all other users should be rejected.
**Validates: Requirements 11.1, 11.2**

### Property 5: Restriction Enforcement
*For any* user with an active restriction of type X, attempting the restricted action should be blocked, and attempting a non-restricted action should be allowed.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 6: Time-Based Restriction Expiration
*For any* restriction with an expiration date in the past, the restriction should be automatically marked as inactive and should not block user actions.
**Validates: Requirements 6.7**

### Property 7: Action Creates Restriction
*For any* moderation action of type "restriction_applied", a corresponding user_restriction record should be created with matching user_id, restriction_type, and expiration.
**Validates: Requirements 5.2, 5.4**

### Property 8: Report Status Transition
*For any* report that receives a moderation action, the report status should transition from "pending" or "under_review" to either "resolved" or "dismissed", never remaining in the initial state.
**Validates: Requirements 5.6, 5.7**

### Property 9: Audit Trail Completeness
*For any* moderation action taken, a corresponding entry should exist in moderation_actions table with complete details including moderator_id, timestamp, and reason.
**Validates: Requirements 10.1, 10.2**

### Property 10: Notification Delivery
*For any* moderation action that affects a user (content removal, suspension, warning, restriction), a notification should be created and delivered to the target user.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 11: Queue Ordering
*For any* set of pending reports, fetching the moderation queue should return reports ordered by priority (ascending) then by creation date (ascending), with moderator-flagged reports appearing before user reports of the same priority.
**Validates: Requirements 4.1, 4.4**

### Property 12: Suspension Integration
*For any* user suspension action, both the user_profiles.is_suspended field and a user_restrictions record with type "suspended" should be updated consistently.
**Validates: Requirements 12.1, 12.2, 12.7**

### Property 13: Reversal Authorization
*For any* reversal action, moderators should be able to reverse actions on non-admin users, admins should be able to reverse any action, and moderators should not be able to reverse actions on admin accounts.
**Validates: Requirements 13.8, 13.11, 13.12, 13.13**

### Property 14: Reversal State Consistency
*For any* reversed action, the moderation_actions record should have revoked_at and revoked_by fields populated, and the corresponding user state (suspension, restriction) should be cleared.
**Validates: Requirements 13.5, 13.6, 13.7**

### Property 15: Reversal Notification Delivery
*For any* reversed action, a notification should be sent to the affected user with reversal details including who reversed it and why.
**Validates: Requirements 13.6, 13.15**

### Property 16: Reversal History Completeness
*For any* user with moderation history, fetching their history should include both original actions and reversals in chronological order with complete details.
**Validates: Requirements 14.1, 14.2**

### Property 17: Reversal Metrics Accuracy
*For any* time period, the reversal rate calculation should equal (number of reversed actions / total actions) * 100, and per-moderator rates should be calculated correctly.
**Validates: Requirements 14.3, 14.7**

### Property 18: Reversal Immutability
*For any* reversed action, the reversal record (revoked_at, revoked_by, reversal_reason) should not be modifiable or deletable.
**Validates: Requirements 14.10**

## Error Handling

### Client-Side Error Handling

**Report Submission Errors:**
- Rate limit exceeded: Display user-friendly message with time until next report allowed
- Invalid target: Show error that content no longer exists
- Network errors: Retry with exponential backoff, show retry button
- Validation errors: Highlight specific fields with error messages

**Moderation Action Errors:**
- Insufficient permissions: Redirect to home with unauthorized message
- Target user not found: Display error and refresh queue
- Concurrent modification: Show conflict message and reload report details
- Database errors: Log to console, show generic error to user

### Server-Side Error Handling

**Database Errors:**
```typescript
try {
  // Database operation
} catch (error) {
  console.error('Database error:', error);
  throw new ModerationError(
    'Failed to perform operation',
    MODERATION_ERROR_CODES.DATABASE_ERROR,
    { originalError: error }
  );
}
```

**Authorization Errors:**
```typescript
// Check moderator role
const { data: roles } = await supabase
  .from('user_roles')
  .select('role_type')
  .eq('user_id', user.id)
  .eq('is_active', true);

const isModerator = roles?.some(r => 
  ['moderator', 'admin'].includes(r.role_type)
);

if (!isModerator) {
  throw new ModerationError(
    'Insufficient permissions',
    MODERATION_ERROR_CODES.UNAUTHORIZED
  );
}
```

**Validation Errors:**
```typescript
// Validate report parameters
if (!['post', 'comment', 'track', 'user'].includes(params.reportType)) {
  throw new ModerationError(
    'Invalid report type',
    MODERATION_ERROR_CODES.VALIDATION_ERROR,
    { reportType: params.reportType }
  );
}
```

### Error Codes

```typescript
export const MODERATION_ERROR_CODES = {
  DATABASE_ERROR: 'MODERATION_DATABASE_ERROR',
  UNAUTHORIZED: 'MODERATION_UNAUTHORIZED',
  VALIDATION_ERROR: 'MODERATION_VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'MODERATION_RATE_LIMIT_EXCEEDED',
  NOT_FOUND: 'MODERATION_NOT_FOUND',
  CONCURRENT_MODIFICATION: 'MODERATION_CONCURRENT_MODIFICATION',
} as const;
```

## Testing Strategy

### Unit Testing

**Service Layer Tests:**
- Test `submitReport()` with valid and invalid parameters
- Test `moderatorFlagContent()` authorization checks
- Test `takeModerationAction()` with different action types
- Test `applyRestriction()` with various restriction types
- Test `checkUserRestrictions()` with active and expired restrictions
- Test priority calculation logic
- Test error handling for all service functions

**Component Tests:**
- Test ReportModal form validation
- Test ModeratorFlagModal visibility based on role
- Test ModerationQueue filtering and sorting
- Test ModerationActionPanel action buttons
- Test notification display components

### Property-Based Testing

**Testing Framework:** fast-check (for TypeScript/JavaScript)

**Configuration:** Each property test should run a minimum of 100 iterations.

**Property Test Examples:**

```typescript
import fc from 'fast-check';

// Property 1: Report Creation Validity
test('Property 1: Report creation creates valid report', () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        reportType: fc.constantFrom('post', 'comment', 'track', 'user'),
        targetId: fc.uuid(),
        reason: fc.constantFrom('spam', 'harassment', 'hate_speech'),
        description: fc.option(fc.string()),
      }),
      async (params) => {
        const report = await submitReport(params);
        expect(report.status).toBe('pending');
        expect(report.priority).toBeGreaterThanOrEqual(1);
        expect(report.priority).toBeLessThanOrEqual(5);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 5: Restriction Enforcement
test('Property 5: Restrictions block appropriate actions', () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(), // user_id
      fc.constantFrom('posting_disabled', 'commenting_disabled', 'upload_disabled'),
      async (userId, restrictionType) => {
        await applyRestriction(userId, restrictionType, 'test reason');
        
        const canPost = await can_user_post(userId);
        const canComment = await can_user_comment(userId);
        const canUpload = await can_user_upload(userId);
        
        if (restrictionType === 'posting_disabled') {
          expect(canPost).toBe(false);
        } else if (restrictionType === 'commenting_disabled') {
          expect(canComment).toBe(false);
        } else if (restrictionType === 'upload_disabled') {
          expect(canUpload).toBe(false);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Database Integration Tests:**
- Test report creation with actual database
- Test RLS policies prevent unauthorized access
- Test restriction enforcement at database level
- Test auto-expiration functions work correctly
- Test cascade deletes work as expected

**API Integration Tests:**
- Test full report submission flow
- Test moderator flag creation flow
- Test moderation action execution flow
- Test notification delivery
- Test restriction enforcement at API endpoints

**End-to-End Tests:**
- User submits report → appears in queue → moderator takes action → user receives notification
- Moderator flags content → appears at top of queue → action taken → audit log created
- User with restriction attempts action → blocked with error message
- Time-based restriction expires → user can perform action again

### Security Testing

**Authorization Tests:**
- Non-moderators cannot access moderation endpoints
- Non-moderators cannot view moderation queue
- Users cannot modify their own restrictions
- Moderators cannot take actions on admin accounts
- RLS policies prevent data leakage

**Input Validation Tests:**
- SQL injection attempts are blocked
- XSS attempts are sanitized
- Invalid UUIDs are rejected
- Invalid enum values are rejected
- Rate limiting works correctly

### Performance Testing

**Load Tests:**
- Queue can handle 1000+ pending reports
- Filtering and sorting remain fast with large datasets
- Pagination works efficiently
- Database queries complete within 100ms

**Stress Tests:**
- Multiple moderators can work simultaneously
- Concurrent actions on same report are handled correctly
- High report submission rate doesn't degrade performance

