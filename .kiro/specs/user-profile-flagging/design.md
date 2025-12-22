# User Profile Flagging Foundation - Design Document

## Overview

This design document outlines the technical implementation for User Profile Flagging Foundation, which enables users to report problematic profiles from creator profile pages with essential abuse prevention mechanisms. The implementation leverages the existing moderation system infrastructure and follows a minimal integration approach to maximize code reuse and maintain consistency.

### Design Principles

1. **Reuse Over Rebuild**: Leverage existing components (ReportModal, ModeratorFlagModal, ModerationActionPanel) without modification
2. **Minimal Integration**: Add only necessary UI elements (buttons in CreatorProfileHeader) and backend logic (duplicate detection)
3. **Universal Benefit**: Enhance the moderation system for ALL content types (posts, comments, tracks, users), not just user profiles
4. **Performance First**: Implement efficient duplicate detection with proper database indexing
5. **Security by Default**: Enforce admin protection, rate limiting, and anonymous reporting at all layers

### Scope

**In Scope:**
- Add Report and Flag buttons to CreatorProfileHeader component
- Implement duplicate detection for all report types (posts, comments, tracks, users)
- Extend ModerationActionPanel with profile-specific context
- Add comprehensive security event logging
- Create database index for efficient duplicate detection

**Out of Scope:**
- Modifying existing ReportModal or ModeratorFlagModal components
- Changing the moderation_reports table schema
- Implementing new moderation actions or workflows
- Building a separate profile reporting interface

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Profile Flagging System                 │
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────────────────┐ │
│  │ CreatorProfile   │         │   Existing Moderation        │ │
│  │    Header        │────────▶│      System                  │ │
│  │                  │         │                              │ │
│  │ - ReportButton   │         │ - ReportModal                │ │
│  │ - FlagButton     │         │ - ModeratorFlagModal         │ │
│  └──────────────────┘         │ - ModerationActionPanel      │ │
│                                │ - moderationService.ts       │ │
│                                └──────────────────────────────┘ │
│                                              │                   │
│                                              ▼                   │
│                                ┌──────────────────────────────┐ │
│                                │   Database Layer             │ │
│                                │                              │ │
│                                │ - moderation_reports         │ │
│                                │ - moderation_actions         │ │
│                                │ - user_restrictions          │ │
│                                │ - security_events            │ │
│                                └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Components                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CreatorProfileHeader (NEW INTEGRATION)                          │
│  ├── ReportButton (EXISTING - reused)                           │
│  │   └── onClick → opens ReportModal with report_type='user'   │
│  └── ModeratorFlagButton (EXISTING - reused)                    │
│      └── onClick → opens ModeratorFlagModal                     │
│                                                                   │
│  ReportModal (EXISTING - no changes)                            │
│  ├── Handles all report types: post, comment, track, user      │
│  └── Calls submitReport() from moderationService                │
│                                                                   │
│  ModeratorFlagModal (EXISTING - no changes)                     │
│  ├── Handles all report types: post, comment, track, user      │
│  └── Calls moderatorFlagContent() from moderationService        │
│                                                                   │
│  ModerationActionPanel (ENHANCED)                               │
│  ├── Existing: Displays report details and action buttons      │
│  └── NEW: Profile Context section for report_type='user'       │
│      ├── User avatar, username, bio                            │
│      ├── Account age badge                                     │
│      ├── Report count badge (last 30 days)                     │
│      └── Collapsible moderation history                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Backend Services                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  moderationService.ts (ENHANCED)                                │
│  ├── submitReport() (ENHANCED)                                  │
│  │   ├── EXISTING: Rate limiting (10/day)                      │
│  │   ├── NEW: Duplicate detection (24hr window)                │
│  │   ├── EXISTING: Admin protection                            │
│  │   └── EXISTING: Create report in database                   │
│  │                                                               │
│  ├── moderatorFlagContent() (ENHANCED)                          │
│  │   ├── NEW: Duplicate detection (24hr window)                │
│  │   └── EXISTING: Create moderator flag                       │
│  │                                                               │
│  └── NEW FUNCTIONS:                                             │
│      ├── checkDuplicateReport()                                 │
│      │   └── Query for existing reports by reporter + type +   │
│      │       target within 24hrs                                │
│      │                                                           │
│      └── getProfileContext()                                    │
│          └── Fetch profile data for ModerationActionPanel      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. CreatorProfileHeader Integration

**File:** `client/src/components/profile/CreatorProfileHeader.tsx`

**Changes Required:**
- Import ReportButton and ModeratorFlagButton components
- Add buttons next to Follow button in the header
- Pass profileUserId as targetId prop
- Use report_type='user' for both buttons

**Implementation Pattern (from UserProfile):**
```typescript
// Add imports
import { ReportButton } from '@/components/moderation/ReportButton';
import { ModeratorFlagButton } from '@/components/moderation/ModeratorFlagButton';

// In the component JSX (next to Follow button)
<div className="flex items-center gap-2">
  {/* Existing Follow button */}
  
  {/* NEW: Report and Flag buttons */}
  {user && user.id !== profileUserId && (
    <>
      <ReportButton
        reportType="user"
        targetId={profileUserId}
        iconOnly={false}
      />
      <ModeratorFlagButton
        reportType="user"
        targetId={profileUserId}
        iconOnly={false}
      />
    </>
  )}
</div>
```

**Props Interface (already exists):**
```typescript
interface ReportButtonProps {
  reportType: 'post' | 'comment' | 'track' | 'user';
  targetId: string;
  iconOnly?: boolean;
}

interface ModeratorFlagButtonProps {
  reportType: 'post' | 'comment' | 'track' | 'user';
  targetId: string;
  iconOnly?: boolean;
}
```

### 2. Duplicate Detection Service

**File:** `client/src/lib/moderationService.ts`

**New Function:**
```typescript
/**
 * Check if user has already reported this target within 24 hours
 * Requirements: 2.3, 2.4, 2.5, 2.6, 10.1-10.10
 * 
 * @param userId - Reporter user ID
 * @param reportType - Type of content being reported
 * @param targetId - ID of the target being reported
 * @returns Object with isDuplicate flag and original report timestamp
 * @throws ModerationError if database query fails
 */
async function checkDuplicateReport(
  userId: string,
  reportType: ReportType,
  targetId: string
): Promise<{ isDuplicate: boolean; originalReportDate?: string }> {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MS
    ).toISOString();

    const { data, error } = await supabase
      .from('moderation_reports')
      .select('created_at')
      .eq('reporter_id', userId)
      .eq('report_type', reportType)
      .eq('target_id', targetId)
      .gte('created_at', twentyFourHoursAgo)
      .maybeSingle();

    if (error) {
      throw new ModerationError(
        'Failed to check for duplicate report',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    if (data) {
      return {
        isDuplicate: true,
        originalReportDate: data.created_at,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking for duplicate report',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}
```

**Enhanced submitReport() function:**
```typescript
export async function submitReport(params: ReportParams): Promise<Report> {
  try {
    // Validate parameters
    validateReportParams(params);

    // Get current user
    const user = await getCurrentUser();

    // NEW: Check for duplicate report (before rate limit check)
    const duplicateCheck = await checkDuplicateReport(
      user.id,
      params.reportType,
      params.targetId
    );

    if (duplicateCheck.isDuplicate) {
      // Log duplicate attempt
      await logSecurityEvent('duplicate_report_attempt', user.id, {
        reportType: params.reportType,
        targetId: params.targetId,
        originalReportDate: duplicateCheck.originalReportDate,
      });

      const contentTypeLabel = params.reportType.charAt(0).toUpperCase() + 
                               params.reportType.slice(1);
      
      throw new ModerationError(
        `You have already reported this ${contentTypeLabel.toLowerCase()} recently. Please wait 24 hours before reporting again.`,
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        {
          reportType: params.reportType,
          targetId: params.targetId,
          originalReportDate: duplicateCheck.originalReportDate,
        }
      );
    }

    // EXISTING: Check rate limit
    const reportCount = await checkReportRateLimit(user.id);
    if (reportCount >= REPORT_RATE_LIMIT) {
      // ... existing rate limit logic
    }

    // EXISTING: Rest of the function remains unchanged
    // ...
  }
}
```



### 3. Profile Context Service

**File:** `client/src/lib/moderationService.ts`

**New Function:**
```typescript
/**
 * Get profile context for moderation panel
 * Requirements: 7.2, 7.3, 7.4, 7.5
 * 
 * @param userId - User ID to get context for
 * @returns Profile context data
 * @throws ModerationError if database query fails
 */
export async function getProfileContext(userId: string): Promise<{
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  joinDate: string;
  accountAgeDays: number;
  recentReportCount: number;
  moderationHistory: Array<{
    actionType: string;
    reason: string;
    createdAt: string;
    expiresAt: string | null;
  }>;
}> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Verify moderator role
    await verifyModeratorRole();

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('username, avatar_url, bio, created_at')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new ModerationError(
        'User profile not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { userId }
      );
    }

    // Calculate account age
    const joinDate = new Date(profile.created_at);
    const accountAgeDays = Math.floor(
      (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count recent reports (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count: recentReportCount } = await supabase
      .from('moderation_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reported_user_id', userId)
      .gte('created_at', thirtyDaysAgo);

    // Fetch moderation history
    const { data: moderationHistory, error: historyError } = await supabase
      .from('moderation_actions')
      .select('action_type, reason, created_at, expires_at')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Failed to fetch moderation history:', historyError);
    }

    return {
      username: profile.username,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      joinDate: profile.created_at,
      accountAgeDays,
      recentReportCount: recentReportCount || 0,
      moderationHistory: moderationHistory || [],
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while fetching profile context',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}
```

### 4. ModerationActionPanel Enhancement

**File:** `client/src/components/moderation/ModerationActionPanel.tsx`

**New Component Section:**
```typescript
// Add to imports
import { getProfileContext } from '@/lib/moderationService';

// Add state for profile context
const [profileContext, setProfileContext] = useState<ProfileContext | null>(null);
const [loadingContext, setLoadingContext] = useState(false);

// Load profile context when report type is 'user'
useEffect(() => {
  if (report.report_type === 'user') {
    loadProfileContext();
  }
}, [report]);

const loadProfileContext = async () => {
  try {
    setLoadingContext(true);
    const context = await getProfileContext(report.target_id);
    setProfileContext(context);
  } catch (error) {
    console.error('Failed to load profile context:', error);
  } finally {
    setLoadingContext(false);
  }
};

// Add Profile Context section in JSX (after report details, before action buttons)
{report.report_type === 'user' && profileContext && (
  <div className="bg-gray-800 rounded-lg p-4 space-y-3">
    <h3 className="text-sm font-semibold text-gray-300">Profile Context</h3>
    
    {/* User Info */}
    <div className="flex items-center gap-3">
      <img
        src={profileContext.avatarUrl || '/default-avatar.png'}
        alt={profileContext.username}
        className="w-12 h-12 rounded-full"
      />
      <div>
        <p className="text-white font-medium">{profileContext.username}</p>
        <p className="text-sm text-gray-400">
          Member for {formatAccountAge(profileContext.accountAgeDays)}
        </p>
      </div>
    </div>

    {/* Bio */}
    {profileContext.bio && (
      <div>
        <p className="text-xs text-gray-400 mb-1">Bio</p>
        <p className="text-sm text-gray-300">{profileContext.bio}</p>
      </div>
    )}

    {/* Badges */}
    <div className="flex gap-2">
      {profileContext.recentReportCount > 0 && (
        <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded">
          {profileContext.recentReportCount} reports in last 30 days
        </span>
      )}
      {profileContext.accountAgeDays < 7 && (
        <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded">
          New account
        </span>
      )}
    </div>

    {/* Collapsible Moderation History */}
    {profileContext.moderationHistory.length > 0 && (
      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Moderation History ({profileContext.moderationHistory.length})
        </summary>
        <div className="mt-2 space-y-2 pl-6">
          {profileContext.moderationHistory.map((action, index) => (
            <div key={index} className="text-xs text-gray-400 border-l-2 border-gray-700 pl-3">
              <p className="text-gray-300">{ACTION_TYPE_LABELS[action.actionType]}</p>
              <p>{action.reason}</p>
              <p className="text-gray-500">
                {new Date(action.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </details>
    )}
  </div>
)}
```

**Helper Function:**
```typescript
function formatAccountAge(days: number): string {
  if (days < 1) return 'less than a day';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
}
```

## Data Models

### Existing Tables (No Changes Required)

#### moderation_reports
```sql
CREATE TABLE public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_user_id UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL, -- 'post' | 'comment' | 'track' | 'user'
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 3,
  moderator_flagged BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Existing Indexes:**
- `idx_moderation_reports_status_priority` - For queue queries
- `idx_moderation_reports_reporter` - For rate limiting
- `idx_moderation_reports_reported_user` - For user lookup
- `idx_moderation_reports_target` - For content lookup

**New Index Required:**
```sql
-- Composite index for efficient duplicate detection
CREATE INDEX IF NOT EXISTS idx_moderation_reports_duplicate_check
  ON public.moderation_reports(reporter_id, report_type, target_id, created_at DESC)
  WHERE created_at >= (now() - interval '24 hours');
```

#### security_events
```sql
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**New Event Types:**
- `duplicate_report_attempt` - User tried to report same target twice
- `admin_report_attempt` - User tried to report an admin account

### TypeScript Interfaces

**New Interface:**
```typescript
/**
 * Profile context for moderation panel
 */
export interface ProfileContext {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  joinDate: string;
  accountAgeDays: number;
  recentReportCount: number;
  moderationHistory: Array<{
    actionType: ModerationActionType;
    reason: string;
    createdAt: string;
    expiresAt: string | null;
  }>;
}
```

**Existing Interfaces (No Changes):**
- `Report`
- `ReportParams`
- `ModeratorFlagParams`
- `ModerationAction`
- `ReportType`
- `ReportReason`



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*



### Property 1: Button Visibility Based on User Role

*For any* authenticated user viewing a creator profile (not their own), the report button should be visible, and the flag button should be visible only if the user is a moderator or admin.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Report Modal Opens with Correct Type

*For any* user clicking the report button on a creator profile, the ReportModal should open with report_type='user' and targetId set to the profile user's ID.

**Validates: Requirements 1.4**

### Property 3: Moderator Flag Modal Opens with Correct Type

*For any* moderator clicking the flag button on a creator profile, the ModeratorFlagModal should open with report_type='user' and targetId set to the profile user's ID.

**Validates: Requirements 1.5**

### Property 4: Report Creation with Correct Fields

*For any* valid profile report submission, a record should be created in moderation_reports with report_type='user', target_id matching the profile user ID, and status='pending'.

**Validates: Requirements 1.6, 4.1**

### Property 5: Rate Limit Enforcement Across All Types

*For any* user attempting to submit more than 10 reports within 24 hours (across all report types: post, comment, track, user), the 11th report should be rejected with a rate limit error.

**Validates: Requirements 2.1**

### Property 6: Duplicate Detection Prevents Repeat Reports

*For any* user attempting to report the same target (with same report_type and target_id) within 24 hours, the second report should be rejected with a duplicate error.

**Validates: Requirements 2.3, 2.5, 10.2, 10.3**

### Property 7: Duplicate Detection Works Across All Content Types

*For any* report type (post, comment, track, user), duplicate detection should prevent the same user from reporting the same target twice within 24 hours, but allow reporting different content types with the same target_id.

**Validates: Requirements 2.6, 10.5, 10.10**

### Property 8: Admin Protection Prevents Admin Reports

*For any* user attempting to report a user profile where the target user has an active admin role, the report should be rejected with an admin protection error.

**Validates: Requirements 2.7, 2.8**

### Property 9: Failed Report Attempts Are Logged

*For any* failed report attempt (rate limit, duplicate, or admin protection), a security event should be created with the appropriate event_type and details including report_type and target_id.

**Validates: Requirements 2.9, 2.10, 6.2, 6.3, 6.4, 6.7**

### Property 10: Reporter Anonymity in Notifications

*For any* moderation action notification sent to a reported user, the notification content should not include the reporter's username, user ID, or any identifying information.

**Validates: Requirements 3.3**

### Property 11: Reporter Visibility to Moderators

*For any* profile report viewed by a moderator in the moderation queue, the reporter's username should be visible to the moderator.

**Validates: Requirements 3.4**

### Property 12: Priority Calculation Consistency

*For any* profile report with a given reason, the priority should be calculated using the same PRIORITY_MAP as other report types (self_harm=1, hate_speech=2, harassment=2, etc.).

**Validates: Requirements 4.6**

### Property 13: Duplicate Detection Executes Before Rate Limiting

*For any* report submission that is both a duplicate and would exceed rate limits, the duplicate error should be thrown before checking rate limits.

**Validates: Requirements 10.4**

### Property 14: Time-Based Duplicate Expiration

*For any* user who reported a target 24 hours ago, they should be able to report the same target again (duplicate detection should not block reports older than 24 hours).

**Validates: Requirements 10.6**

### Property 15: Duplicate Error Contains Original Timestamp

*For any* duplicate report attempt, the error details should include the created_at timestamp of the original report.

**Validates: Requirements 10.8**

### Property 16: Duplicate Detection in Both Functions

*For any* report submission through either submitReport() or moderatorFlagContent(), duplicate detection should be applied and prevent duplicate reports.

**Validates: Requirements 10.9**

### Property 17: Self-Reporting Prevention

*For any* user attempting to report their own profile or content, the report should be rejected with an appropriate error message.

**Validates: Requirements 8.5, 8.6**

### Property 18: Consistent Error Messages Across Types

*For any* duplicate report attempt across different content types (post, comment, track, user), the error message format should be consistent, only varying the content type label.

**Validates: Requirements 8.3, 8.8**

### Property 19: Profile Context Data Completeness

*For any* profile report viewed in the ModerationActionPanel, the profile context should include username, avatar, bio, join date, account age, recent report count, and moderation history.

**Validates: Requirements 7.2, 7.3, 7.4, 7.5**

### Property 20: Security Event Log Completeness

*For any* security event logged for report attempts, the event should include user_id, event_type, and details containing report_type, target_id, and timestamp.

**Validates: Requirements 6.1, 6.5, 6.7**



## Error Handling

### Error Types and Responses

#### 1. Duplicate Report Error
```typescript
{
  code: 'MODERATION_VALIDATION_ERROR',
  message: 'You have already reported this [content type] recently. Please wait 24 hours before reporting again.',
  details: {
    reportType: 'user',
    targetId: 'uuid',
    originalReportDate: '2025-01-15T10:30:00Z'
  }
}
```

**User Experience:**
- Toast notification with error message
- Modal remains open (user can cancel)
- Security event logged

#### 2. Rate Limit Exceeded Error
```typescript
{
  code: 'MODERATION_RATE_LIMIT_EXCEEDED',
  message: 'You have exceeded the report limit of 10 reports per 24 hours. Please try again later.',
  details: {
    reportCount: 10,
    limit: 10,
    hoursRemaining: 12
  }
}
```

**User Experience:**
- Toast notification with time remaining
- Modal closes automatically
- Security event logged

#### 3. Admin Protection Error
```typescript
{
  code: 'MODERATION_VALIDATION_ERROR',
  message: 'This account cannot be reported.',
  details: {
    targetUserId: 'uuid',
    reason: 'admin_protection'
  }
}
```

**User Experience:**
- Toast notification with error message
- Modal closes automatically
- Security event logged

#### 4. Self-Report Error
```typescript
{
  code: 'MODERATION_VALIDATION_ERROR',
  message: 'You cannot report your own profile.',
  details: {
    userId: 'uuid',
    targetId: 'uuid'
  }
}
```

**User Experience:**
- Toast notification with error message
- Modal closes automatically
- No security event (not abuse attempt)

### Error Handling Flow

```
User Submits Report
       │
       ▼
Validate Parameters ──────► Invalid ──► Show Validation Error
       │
       ▼ Valid
Check Self-Report ────────► Self ──────► Show Self-Report Error
       │
       ▼ Not Self
Check Admin Target ────────► Admin ────► Show Admin Error + Log
       │
       ▼ Not Admin
Check Duplicate ───────────► Duplicate ► Show Duplicate Error + Log
       │
       ▼ Not Duplicate
Check Rate Limit ──────────► Exceeded ─► Show Rate Limit Error + Log
       │
       ▼ Within Limit
Create Report ─────────────► Success ──► Show Success Message
       │
       ▼
Log Security Event (if applicable)
```

## Testing Strategy

### Unit Testing

**Components to Test:**
1. **CreatorProfileHeader**
   - Button visibility based on user role
   - Button click handlers
   - Props passed to ReportButton and ModeratorFlagButton

2. **checkDuplicateReport() function**
   - Returns isDuplicate=true for reports within 24 hours
   - Returns isDuplicate=false for reports older than 24 hours
   - Returns isDuplicate=false when no previous report exists
   - Handles different report types correctly
   - Includes original report timestamp in response

3. **submitReport() function**
   - Calls checkDuplicateReport before rate limit check
   - Throws duplicate error when duplicate detected
   - Logs security event for duplicate attempts
   - Continues to rate limit check when no duplicate

4. **getProfileContext() function**
   - Fetches correct profile data
   - Calculates account age correctly
   - Counts recent reports accurately
   - Fetches moderation history
   - Handles missing data gracefully

### Property-Based Testing

**Test Framework:** fast-check (for TypeScript/JavaScript)

**Property Test 1: Duplicate Detection Consistency**
```typescript
/**
 * Feature: user-profile-flagging, Property 6: Duplicate Detection Prevents Repeat Reports
 * Validates: Requirements 2.3, 2.5, 10.2, 10.3
 */
fc.assert(
  fc.asyncProperty(
    fc.uuid(), // reporter_id
    fc.constantFrom('post', 'comment', 'track', 'user'), // report_type
    fc.uuid(), // target_id
    async (reporterId, reportType, targetId) => {
      // Create first report
      await createReport(reporterId, reportType, targetId);
      
      // Attempt duplicate report
      const result = await checkDuplicateReport(reporterId, reportType, targetId);
      
      // Should detect duplicate
      expect(result.isDuplicate).toBe(true);
      expect(result.originalReportDate).toBeDefined();
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 2: Rate Limit Enforcement**
```typescript
/**
 * Feature: user-profile-flagging, Property 5: Rate Limit Enforcement Across All Types
 * Validates: Requirements 2.1
 */
fc.assert(
  fc.asyncProperty(
    fc.uuid(), // user_id
    fc.array(
      fc.record({
        reportType: fc.constantFrom('post', 'comment', 'track', 'user'),
        targetId: fc.uuid()
      }),
      { minLength: 11, maxLength: 11 }
    ),
    async (userId, reports) => {
      // Submit first 10 reports (should succeed)
      for (let i = 0; i < 10; i++) {
        await submitReport({
          reportType: reports[i].reportType,
          targetId: reports[i].targetId,
          reason: 'spam'
        });
      }
      
      // 11th report should fail with rate limit error
      await expect(
        submitReport({
          reportType: reports[10].reportType,
          targetId: reports[10].targetId,
          reason: 'spam'
        })
      ).rejects.toMatchObject({
        code: 'MODERATION_RATE_LIMIT_EXCEEDED'
      });
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 3: Cross-Type Duplicate Independence**
```typescript
/**
 * Feature: user-profile-flagging, Property 7: Duplicate Detection Works Across All Content Types
 * Validates: Requirements 2.6, 10.5, 10.10
 */
fc.assert(
  fc.asyncProperty(
    fc.uuid(), // reporter_id
    fc.uuid(), // target_id (same for all types)
    async (reporterId, targetId) => {
      // Report same target as different content types
      const types: ReportType[] = ['post', 'comment', 'track', 'user'];
      
      for (const reportType of types) {
        // Each type should succeed (not blocked by previous types)
        const result = await submitReport({
          reportType,
          targetId,
          reason: 'spam'
        });
        
        expect(result.report_type).toBe(reportType);
        expect(result.target_id).toBe(targetId);
      }
      
      // But reporting same type twice should fail
      await expect(
        submitReport({
          reportType: 'user',
          targetId,
          reason: 'spam'
        })
      ).rejects.toMatchObject({
        code: 'MODERATION_VALIDATION_ERROR'
      });
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 4: Admin Protection**
```typescript
/**
 * Feature: user-profile-flagging, Property 8: Admin Protection Prevents Admin Reports
 * Validates: Requirements 2.7, 2.8
 */
fc.assert(
  fc.asyncProperty(
    fc.uuid(), // reporter_id
    fc.uuid(), // admin_user_id
    async (reporterId, adminUserId) => {
      // Set up admin user
      await createAdminUser(adminUserId);
      
      // Attempt to report admin
      await expect(
        submitReport({
          reportType: 'user',
          targetId: adminUserId,
          reason: 'harassment'
        })
      ).rejects.toMatchObject({
        code: 'MODERATION_VALIDATION_ERROR',
        message: expect.stringContaining('cannot be reported')
      });
      
      // Verify security event was logged
      const events = await getSecurityEvents(reporterId);
      expect(events).toContainEqual(
        expect.objectContaining({
          event_type: 'admin_report_attempt',
          user_id: reporterId
        })
      );
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 5: Time-Based Expiration**
```typescript
/**
 * Feature: user-profile-flagging, Property 14: Time-Based Duplicate Expiration
 * Validates: Requirements 10.6
 */
fc.assert(
  fc.asyncProperty(
    fc.uuid(), // reporter_id
    fc.constantFrom('post', 'comment', 'track', 'user'), // report_type
    fc.uuid(), // target_id
    async (reporterId, reportType, targetId) => {
      // Create report
      await createReport(reporterId, reportType, targetId);
      
      // Immediately check - should be duplicate
      const immediateCheck = await checkDuplicateReport(reporterId, reportType, targetId);
      expect(immediateCheck.isDuplicate).toBe(true);
      
      // Fast-forward time by 24 hours + 1 second
      await advanceTime(24 * 60 * 60 * 1000 + 1000);
      
      // Check again - should NOT be duplicate
      const laterCheck = await checkDuplicateReport(reporterId, reportType, targetId);
      expect(laterCheck.isDuplicate).toBe(false);
    }
  ),
  { numRuns: 100 }
);
```

### Integration Testing

**Test Scenarios:**

1. **Complete Report Flow**
   - User clicks report button
   - Modal opens with correct props
   - User fills form and submits
   - Report created in database
   - Success message displayed
   - Modal closes

2. **Duplicate Detection Flow**
   - User submits report successfully
   - User attempts same report again
   - Duplicate error displayed
   - Security event logged
   - Modal remains open

3. **Rate Limit Flow**
   - User submits 10 reports successfully
   - User attempts 11th report
   - Rate limit error displayed
   - Security event logged
   - Modal closes

4. **Admin Protection Flow**
   - User attempts to report admin
   - Admin protection error displayed
   - Security event logged
   - Modal closes

5. **Moderator Review Flow**
   - Moderator opens profile report
   - Profile context loads
   - All profile data displayed
   - Moderation history visible
   - Action buttons functional

### Performance Testing

**Metrics to Monitor:**

1. **Duplicate Detection Query Time**
   - Target: < 50ms average
   - Test with various database sizes
   - Verify index usage

2. **Profile Context Load Time**
   - Target: < 200ms average
   - Test with users having extensive moderation history
   - Verify async loading doesn't block UI

3. **Report Submission Time**
   - Target: < 500ms end-to-end
   - Include all validation checks
   - Measure with concurrent submissions



## Security Considerations

### 1. Input Validation

**All user inputs must be validated and sanitized:**
- Report descriptions: Max 1000 characters, sanitized for XSS
- Target IDs: Must be valid UUID format
- Report types: Must be one of: 'post', 'comment', 'track', 'user'
- Report reasons: Must be one of the predefined reasons

**Validation is performed at multiple layers:**
- Client-side: Immediate feedback, prevent unnecessary API calls
- Service layer: `validateReportParams()` function
- Database: CHECK constraints on moderation_reports table

### 2. Authorization

**Role-Based Access Control:**
- Regular users: Can submit reports, cannot see reporter identities
- Moderators: Can flag content, view reports, see reporter identities
- Admins: Full access, cannot be reported

**Authorization Checks:**
- `getCurrentUser()` - Verify authentication
- `isModeratorOrAdmin()` - Check moderator/admin role
- `isAdmin()` - Check admin role specifically
- Admin protection check before creating user reports

### 3. Rate Limiting

**Multi-Layer Rate Limiting:**
- Application layer: 10 reports per 24 hours per user
- Database layer: Indexed queries for efficient rate limit checks
- Security events: Log all rate limit violations

**Rate Limit Bypass Prevention:**
- Rate limit checked after duplicate detection
- Rate limit applies across all report types
- Rate limit tied to authenticated user ID (cannot bypass with new sessions)

### 4. Duplicate Detection Security

**Prevents Abuse:**
- Same user cannot spam reports for same target
- 24-hour window prevents circumvention
- Applies to all content types uniformly
- Logged as security events for monitoring

**Implementation Security:**
- Database-level duplicate check (not just client-side)
- Indexed query for performance
- Atomic check-and-insert not required (duplicate check is advisory, not critical)

### 5. Anonymous Reporting

**Reporter Identity Protection:**
- Reporter ID stored in database (for abuse prevention)
- Reporter identity never exposed to reported user
- Reporter identity visible only to moderators/admins
- Notifications to reported users exclude reporter information

**Audit Trail:**
- All reports logged with reporter ID
- Security events track abuse attempts
- Moderators can see full report history

### 6. Admin Protection

**Prevents Targeting of Admins:**
- Admin role check before accepting user reports
- Clear error message (no information disclosure)
- Security event logged for monitoring
- Does not apply to content reports (only user profile reports)

### 7. SQL Injection Prevention

**Parameterized Queries:**
- All database queries use Supabase client with parameterized queries
- No raw SQL with user input
- UUID validation before database queries

### 8. XSS Prevention

**Input Sanitization:**
- `sanitizeText()` function removes HTML tags
- Special characters escaped
- Null bytes removed
- Applied to all user-provided text fields

### 9. CSRF Protection

**Supabase Auth Integration:**
- All API calls require valid JWT token
- Tokens validated on every request
- Short-lived tokens with automatic refresh

### 10. Logging and Monitoring

**Security Event Logging:**
- All failed report attempts logged
- Event types: `duplicate_report_attempt`, `admin_report_attempt`, `rate_limit_exceeded`
- Includes user ID, timestamp, and relevant details
- Queryable by admins for abuse pattern detection

**Audit Trail:**
- All reports stored permanently
- All moderation actions logged
- Reporter anonymity maintained in logs visible to reported users

## Performance Optimization

### 1. Database Indexing

**New Index for Duplicate Detection:**
```sql
CREATE INDEX IF NOT EXISTS idx_moderation_reports_duplicate_check
  ON public.moderation_reports(reporter_id, report_type, target_id, created_at DESC)
  WHERE created_at >= (now() - interval '24 hours');
```

**Benefits:**
- Efficient duplicate detection queries (< 50ms)
- Partial index reduces index size
- Covers exact query pattern used by `checkDuplicateReport()`

**Existing Indexes (Reused):**
- `idx_moderation_reports_reporter` - For rate limiting
- `idx_moderation_reports_target` - For content lookup
- `idx_moderation_reports_status_priority` - For queue queries

### 2. Async Loading

**Profile Context Loading:**
- Loads asynchronously after panel opens
- Doesn't block panel rendering
- Shows loading state while fetching
- Graceful error handling if fetch fails

**Benefits:**
- Panel opens immediately
- Better perceived performance
- Doesn't block user from viewing report details

### 3. Query Optimization

**Duplicate Detection Query:**
```typescript
// Optimized query with time filter
const { data, error } = await supabase
  .from('moderation_reports')
  .select('created_at')
  .eq('reporter_id', userId)
  .eq('report_type', reportType)
  .eq('target_id', targetId)
  .gte('created_at', twentyFourHoursAgo)
  .maybeSingle();
```

**Optimizations:**
- Only selects needed column (created_at)
- Uses indexed columns in WHERE clause
- Time filter reduces scan size
- `.maybeSingle()` stops after first match

**Rate Limit Query:**
```typescript
// Optimized count query
const { error, count } = await supabase
  .from('moderation_reports')
  .select('id', { count: 'exact', head: true })
  .eq('reporter_id', userId)
  .gte('created_at', twentyFourHoursAgo);
```

**Optimizations:**
- Uses `head: true` for count-only query
- Doesn't fetch actual rows
- Indexed on reporter_id
- Time filter reduces scan size

### 4. Caching Strategy

**Client-Side Caching:**
- Profile context cached for 5 minutes
- Reduces redundant API calls
- Invalidated on moderation action

**Database Query Caching:**
- Supabase handles query result caching
- Duplicate detection results cached briefly
- Rate limit counts cached for short duration

### 5. Lazy Loading

**Moderation History:**
- Loaded only when expanded (collapsible section)
- Limited to 10 most recent actions
- Reduces initial data transfer

**Benefits:**
- Faster initial load
- Reduces bandwidth
- Better UX for common case (history not needed)

## Deployment Strategy

### 1. Database Migration

**Migration File:** `20250XXX000000_add_duplicate_detection_index.sql`

```sql
-- Add index for efficient duplicate detection
CREATE INDEX IF NOT EXISTS idx_moderation_reports_duplicate_check
  ON public.moderation_reports(reporter_id, report_type, target_id, created_at DESC)
  WHERE created_at >= (now() - interval '24 hours');

-- Add comment for documentation
COMMENT ON INDEX idx_moderation_reports_duplicate_check IS 
  'Composite index for efficient duplicate report detection within 24-hour window.
   Used by checkDuplicateReport() function to prevent users from reporting the same
   target multiple times within 24 hours.';
```

**Rollback Plan:**
```sql
-- Rollback: Drop the index
DROP INDEX IF EXISTS idx_moderation_reports_duplicate_check;
```

### 2. Feature Flags

**Gradual Rollout:**
1. Deploy backend changes (duplicate detection, profile context)
2. Test with internal users
3. Enable for 10% of users
4. Monitor error rates and performance
5. Gradually increase to 100%

**Feature Flag Configuration:**
```typescript
const FEATURE_FLAGS = {
  userProfileFlagging: {
    enabled: true,
    rolloutPercentage: 100,
  },
  duplicateDetection: {
    enabled: true,
    applyToAllTypes: true,
  },
};
```

### 3. Monitoring

**Metrics to Track:**
- Report submission success rate
- Duplicate detection rate
- Rate limit hit rate
- Admin protection trigger rate
- Profile context load time
- Duplicate detection query time

**Alerts:**
- High duplicate detection rate (> 20%)
- High rate limit hit rate (> 10%)
- Slow duplicate detection queries (> 100ms)
- Failed profile context loads (> 5%)

### 4. Rollback Plan

**If Issues Arise:**
1. Disable feature flag for user profile flagging
2. Revert CreatorProfileHeader changes
3. Keep duplicate detection (benefits all report types)
4. Monitor for 24 hours
5. Investigate and fix issues
6. Re-enable gradually

**Zero-Downtime Rollback:**
- Feature flag can be toggled without deployment
- Database index can remain (no harm if unused)
- Backend functions are backward compatible

## Future Enhancements

### Phase 2 Improvements

1. **Enhanced Duplicate Detection**
   - Detect similar reports (fuzzy matching on description)
   - Cross-user duplicate detection (multiple users reporting same target)
   - Automatic report consolidation

2. **Advanced Rate Limiting**
   - Dynamic rate limits based on user reputation
   - Separate limits for different report types
   - Temporary limit increases for trusted users

3. **Profile Context Enhancements**
   - User activity graph (posts, comments, tracks over time)
   - Follower/following counts
   - Recent content preview
   - AI-powered risk assessment

4. **Bulk Actions**
   - Moderators can act on multiple reports at once
   - Batch approve/dismiss similar reports
   - Pattern-based auto-moderation

5. **Analytics Dashboard**
   - Report trends over time
   - Most reported users
   - Most common violation types
   - Moderator performance metrics

### Out of Scope (Not Planned)

- Real-time notifications for new reports
- Machine learning-based auto-moderation
- User appeals system
- Public moderation transparency reports
- Community-driven moderation (voting system)

## Conclusion

This design document outlines a comprehensive approach to implementing User Profile Flagging Foundation that:

1. **Maximizes Code Reuse**: Leverages existing components and infrastructure
2. **Enhances All Report Types**: Duplicate detection benefits posts, comments, tracks, and users
3. **Maintains Security**: Multiple layers of abuse prevention and authorization
4. **Optimizes Performance**: Efficient database queries with proper indexing
5. **Ensures Testability**: Comprehensive unit, property-based, and integration tests
6. **Provides Clear UX**: Consistent error messages and feedback across all report types

The implementation follows a minimal integration approach, adding only necessary UI elements and backend logic while maintaining consistency with the existing moderation system. The design prioritizes security, performance, and user experience while keeping the codebase maintainable and testable.

