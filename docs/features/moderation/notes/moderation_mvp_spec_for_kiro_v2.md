# Moderation System - MVP Specification for Kiro IDE (v2)

## System Overview

This specification defines a moderation system for the AI Music Community Platform that enables user reporting, moderator review, and administrative actions. The system is designed as an MVP with scalable architecture to support future enhancements.

---

## Current Platform Context

### Existing Infrastructure
1. **User Roles System**: Platform already supports a `moderator` role that can be assigned by admins
2. **Admin Dashboard**: Located at `/admin/` with tabs:
   - User Management
   - Platform Admin
   - Security
   - Performance & Health
   - Analytics
   - **Access**: Admins only
3. **Suspension System**: Admins can suspend user accounts via `suspendUser()` function, but currently lacks:
   - Time-based suspension duration
   - Automatic expiration
   - User notification system
4. **Top Menu**: Avatar dropdown with user options (Profile, Account, Logout, etc.)

### Required Integration Points
- Leverage existing `moderator` role for moderation queue access
- Extend current suspension system to support temporary suspensions
- **NEW**: Create separate `/moderation/` page accessible from avatar dropdown
- Build on existing RLS and security patterns

---

## Access Control & Navigation

### Admin Dashboard (`/admin/`)
- **Access**: Admins only
- **Purpose**: Platform administration, user management, system health
- **No Changes**: Remains admin-only

### Moderation Dashboard (`/moderation/`)
- **Access**: Moderators AND Admins
- **Location**: Accessible from avatar dropdown menu in top navigation
- **Purpose**: Review reports, take moderation actions, view logs
- **New Menu Item**: "Moderation" (icon: 🛡️) appears in avatar dropdown for users with moderator or admin role

### Avatar Dropdown Menu Structure
```
[Avatar] ▼
├─ Profile
├─ Account Settings
├─ Moderation (🛡️)    ← NEW - only visible to moderators/admins
├─ Admin Dashboard     ← existing - only visible to admins
├─ Logout
```

---

## MVP Core Features

### 1. User Reporting System

**Purpose**: Allow users to report content that violates community guidelines

**How Users Report**:
- Click report button (🚩) on any post, comment, or track
- Select reason from dropdown
- Add optional description
- Submit → Report goes to moderation queue

**Report Categories**:
1. Spam or Misleading Content
2. Harassment or Bullying
3. Hate Speech
4. Inappropriate Content (NSFW, violence)
5. Copyright Violation
6. Impersonation
7. Self-Harm or Dangerous Acts
8. Other (requires explanation)

**Report Data Structure**:
```typescript
interface Report {
  id: uuid;
  reporter_id: uuid;           // Who submitted the report
  reported_user_id: uuid;      // Owner of the content
  report_type: 'post' | 'comment' | 'track' | 'user';
  target_id: uuid;             // ID of reported item
  reason: string;              // Selected category
  description: string;         // Optional details
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 1-5;               // Based on reason (1=critical, 5=low)
  created_at: timestamp;
  reviewed_at: timestamp;
  reviewed_by: uuid;           // Moderator/admin who reviewed
  resolution_notes: string;    // Internal notes
  action_taken: string;        // What was done
}
```

**Abuse Prevention**:
- Rate limit: 10 reports per user per 24 hours
- Track report accuracy per user
- Auto-flag users with high false report rates

---

### 2. Moderator Direct Flagging

**Purpose**: Allow moderators to directly flag content without going through user report flow

**How Moderators Flag Content**:

**Option 1: Flag Button (Recommended)**
- Moderators see an additional "Flag for Review" button (⚠️) on all content
- Clicking opens a simplified modal:
  - Reason dropdown (same categories as user reports)
  - Internal notes field (required)
  - Priority selector (P1-P5)
  - [Submit] button
- Creates report with `reporter_id` = moderator's ID
- Report marked with `moderator_flagged: true` flag
- Goes directly to "Under Review" status
- Appears at top of moderation queue

**Option 2: Quick Action Menu**
- Moderators see "..." menu with additional option:
  - Remove Content (immediate)
  - Flag for Review (opens modal)
  - View History
- Quick removal creates automatic report record

**Recommended**: Option 1 for transparency and audit trail

**How Moderators Flag Users**:
- From user profile page
- "Flag User" button visible only to moderators
- Opens modal with:
  - Reason (harassment pattern, suspicious activity, etc.)
  - Evidence/description
  - Recommended action
  - [Submit to Queue]

**Moderator-Flagged Reports**:
- Displayed with "Moderator Flag" badge in queue
- Higher default priority
- Includes moderator's internal notes visible to other mods
- Tracked separately in analytics

---

### 3. Moderation Queue

**Purpose**: Centralized queue for moderators to review reports

**Access Control**:
- **Moderators**: Can view and process all pending reports
- **Admins**: Full access to all reports and actions

**Queue Features**:
- Filter by status (pending, under_review, resolved, dismissed)
- Filter by source (user reports vs moderator flags)
- Sort by priority and date
- Display report details with full context
- Quick action buttons (dismiss, resolve, take action)

**Priority Levels**:
| Level | SLA Target | Triggers |
|-------|-----------|----------|
| P1 (Critical) | 1 hour | Self-harm, child safety, credible threats |
| P2 (High) | 4 hours | Hate speech, harassment, verified copyright |
| P3 (Standard) | 24 hours | Spam, inappropriate content, impersonation |
| P4 (Low) | 48 hours | Minor violations, duplicates |
| P5 (Routine) | 7 days | User reviews, low-priority items |

**Queue View Requirements**:
- Show report metadata (type, reason, date, priority)
- Display reporter info (users anonymous, moderators identified)
- Show reported content with full context
- Link to reported user's history
- Action buttons for moderators
- Badge for moderator-flagged content

---

### 4. Moderation Actions

**Purpose**: Standardized actions moderators can take on violating content/users

**Available Actions**:

1. **Content Actions**:
   - Remove content (permanent deletion)
   - Hide content (temporary, pending review)
   - Approve content (dismiss report)

2. **User Actions**:
   - Issue warning (notification only)
   - Temporary suspension (1, 7, or 30 days)
   - Permanent ban (admin only)
   - Apply specific restrictions:
     - Disable posting
     - Disable commenting
     - Disable uploads

3. **Administrative Actions**:
   - Add internal notes
   - Escalate to admin
   - Dismiss report as invalid

**Action Data Structure**:
```typescript
interface ModerationAction {
  id: uuid;
  moderator_id: uuid;          // Who took the action
  target_user_id: uuid;        // Who is affected
  action_type: string;         // Type of action taken
  target_type: string;         // What was acted on (post/comment/track/user)
  target_id: uuid;             // ID of the item
  reason: string;              // Why action was taken
  duration_days: number;       // For temporary actions
  expires_at: timestamp;       // When action expires
  related_report_id: uuid;     // Original report that triggered this
  internal_notes: string;      // Private moderator notes
  notification_sent: boolean;  // Whether user was notified
  notification_message: string; // What user was told
  created_at: timestamp;
  revoked_at: timestamp;       // If action was reversed
  revoked_by: uuid;            // Who reversed it
}
```

---

### 5. Enhanced Suspension System

**Purpose**: Extend existing suspension to support time-based restrictions

**Current System**:
```typescript
// Existing function
suspendUser(userId: string, reason: string): Promise<void>
unsuspendUser(userId: string): Promise<void>
```

**Enhanced System**:
```typescript
// New enhanced function
suspendUser(
  userId: string, 
  reason: string, 
  durationDays?: number  // Optional: if null, permanent
): Promise<void>

// Auto-expiration check function
expireExpiredSuspensions(): Promise<void>
```

**Suspension Table Enhancement**:
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Auto-expire function
CREATE OR REPLACE FUNCTION expire_old_suspensions()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET is_suspended = FALSE,
      suspended_until = NULL
  WHERE is_suspended = TRUE
    AND suspended_until IS NOT NULL
    AND suspended_until <= NOW();
END;
$$ LANGUAGE plpgsql;
```

---

### 6. User Notifications

**Purpose**: Inform users when actions are taken on their content or account

**Notification Triggers**:
1. Content removed/hidden
2. Account suspended
3. Warning issued
4. Suspension expired
5. Appeal decision (future)

**Notification Methods**:
- In-app notification center (existing)
- Email notification (if critical)

**Notification Template Structure**:
```typescript
interface ModerationNotification {
  type: 'content_removed' | 'warning' | 'suspension' | 'appeal_decision';
  title: string;
  message: string;
  action_details: {
    reason: string;
    duration?: string;
    appeal_available: boolean;
  };
  created_at: timestamp;
}
```

**Example Notification Messages**:

**Content Removed**:
```
Title: Content Removed
Message: Your [post/comment/track] was removed for violating our Community Guidelines.
Reason: [Specific reason from moderator]
You can appeal this decision within 7 days if you believe this was a mistake.
```

**Account Suspended**:
```
Title: Account Suspended
Message: Your account has been temporarily suspended.
Reason: [Specific reason]
Duration: [X days] - Expires on [date]
During this time, you cannot post, comment, or upload content.
You can appeal this decision if you believe it was made in error.
```

**Warning Issued**:
```
Title: Community Guidelines Warning
Message: We've issued a warning regarding your recent [action].
Reason: [Specific reason]
Future violations may result in suspension or permanent ban.
Please review our Community Guidelines.
```

---

### 7. User Restrictions System

**Purpose**: Fine-grained control over user capabilities without full suspension

**Restriction Types**:
1. `posting_disabled` - Cannot create new posts
2. `commenting_disabled` - Cannot comment on posts
3. `upload_disabled` - Cannot upload new tracks
4. `suspended` - Full account suspension

**Restriction Data Structure**:
```typescript
interface UserRestriction {
  id: uuid;
  user_id: uuid;
  restriction_type: string;
  expires_at: timestamp;      // null for permanent
  is_active: boolean;
  reason: string;
  applied_by: uuid;           // Admin/moderator who applied it
  created_at: timestamp;
}
```

**Enforcement Points**:
- Post creation endpoint: Check `posting_disabled`
- Comment creation endpoint: Check `commenting_disabled`
- Track upload endpoint: Check `upload_disabled`
- All endpoints: Check `suspended`

---

### 8. Moderation Logs & Reporting

**Purpose**: Track all moderation actions for accountability and analytics

**Log Requirements**:
- All moderation actions logged with timestamps
- Moderator attribution for all actions
- Reason and context for each action
- Outcome tracking (resolved, dismissed, escalated)

**Moderation Dashboard Structure** (`/moderation/`)

**Tab Navigation**:
1. **Queue** (default view)
2. **Action Logs**
3. **Metrics**
4. **Settings** (moderator preferences)

**Section Details**:

**1. Queue Tab**:
- Pending reports list
- Filters: Status, Priority, Source (user/moderator)
- Sort: Priority, Date, Type
- Quick actions per report
- Batch actions (select multiple)

**2. Action Logs Tab**:
- Recent moderation actions (last 100)
- Filters:
  - Action type
  - Moderator (if admin viewing)
  - Date range
  - Target user
- Search by user or content ID
- Export to CSV
- Pagination

**3. Metrics Tab**:
- Reports received (today/week/month)
- Reports resolved
- Average resolution time
- Actions by type (pie chart)
- Top reasons for reports
- **Admin only**: Moderator performance comparison

**4. Settings Tab**:
- Notification preferences
- Queue display options
- Quick action templates

---

## Database Schema

### New Tables

```sql
-- ============================================================================
-- MODERATION REPORTS TABLE
-- ============================================================================
CREATE TABLE moderation_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What's being reported
  report_type TEXT NOT NULL CHECK (report_type IN (
    'post', 'comment', 'track', 'user'
  )),
  target_id UUID NOT NULL,
  
  -- Report details
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate_speech', 'inappropriate_content',
    'copyright_violation', 'impersonation', 'self_harm', 'other'
  )),
  description TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'resolved', 'dismissed'
  )),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  
  -- Moderator flag tracking
  moderator_flagged BOOLEAN DEFAULT FALSE,
  
  -- Review details
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  action_taken TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX idx_moderation_reports_priority ON moderation_reports(priority DESC, created_at ASC);
CREATE INDEX idx_moderation_reports_reporter ON moderation_reports(reporter_id);
CREATE INDEX idx_moderation_reports_reported_user ON moderation_reports(reported_user_id);
CREATE INDEX idx_moderation_reports_target ON moderation_reports(report_type, target_id);
CREATE INDEX idx_moderation_reports_moderator_flagged ON moderation_reports(moderator_flagged) 
  WHERE moderator_flagged = TRUE;

-- ============================================================================
-- MODERATION ACTIONS TABLE
-- ============================================================================
CREATE TABLE moderation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'content_removed', 'content_approved',
    'user_warned', 'user_suspended', 'user_banned',
    'restriction_applied'
  )),
  
  -- What content was affected
  target_type TEXT CHECK (target_type IN ('post', 'comment', 'track', 'user')),
  target_id UUID,
  
  -- Action context
  reason TEXT NOT NULL,
  duration_days INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Related to a report?
  related_report_id UUID REFERENCES moderation_reports(id) ON DELETE SET NULL,
  
  -- Internal notes
  internal_notes TEXT,
  
  -- User notification
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_actions_target_user ON moderation_actions(target_user_id);
CREATE INDEX idx_moderation_actions_created_at ON moderation_actions(created_at DESC);
CREATE INDEX idx_moderation_actions_expires_at ON moderation_actions(expires_at) 
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- USER RESTRICTIONS TABLE
-- ============================================================================
CREATE TABLE user_restrictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Restriction type
  restriction_type TEXT NOT NULL CHECK (restriction_type IN (
    'posting_disabled', 'commenting_disabled', 'upload_disabled', 'suspended'
  )),
  
  -- Duration
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Context
  reason TEXT NOT NULL,
  applied_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  related_action_id UUID REFERENCES moderation_actions(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_restrictions_user_id ON user_restrictions(user_id);
CREATE INDEX idx_user_restrictions_active ON user_restrictions(is_active) 
  WHERE is_active = TRUE;
CREATE INDEX idx_user_restrictions_expires_at ON user_restrictions(expires_at) 
  WHERE expires_at IS NOT NULL AND is_active = TRUE;

-- Unique constraint: only one active restriction of each type per user
CREATE UNIQUE INDEX idx_user_restrictions_unique_active 
  ON user_restrictions(user_id, restriction_type) 
  WHERE is_active = TRUE;
```

### Table Modifications

```sql
-- ============================================================================
-- ENHANCE USER_PROFILES FOR SUSPENSION TRACKING
-- ============================================================================
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ============================================================================
-- AUTO-EXPIRATION FUNCTIONS
-- ============================================================================

-- Function to expire restrictions
CREATE OR REPLACE FUNCTION expire_restrictions()
RETURNS void AS $$
BEGIN
  UPDATE user_restrictions
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire suspensions
CREATE OR REPLACE FUNCTION expire_suspensions()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET is_suspended = FALSE,
      suspended_until = NULL
  WHERE is_suspended = TRUE
    AND suspended_until IS NOT NULL
    AND suspended_until <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user can post
CREATE OR REPLACE FUNCTION can_user_post(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_restrictions
    WHERE user_id = p_user_id
    AND restriction_type IN ('posting_disabled', 'suspended')
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can comment
CREATE OR REPLACE FUNCTION can_user_comment(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_restrictions
    WHERE user_id = p_user_id
    AND restriction_type IN ('commenting_disabled', 'suspended')
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can upload
CREATE OR REPLACE FUNCTION can_user_upload(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_restrictions
    WHERE user_id = p_user_id
    AND restriction_type IN ('upload_disabled', 'suspended')
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all active restrictions for a user
CREATE OR REPLACE FUNCTION get_user_restrictions(p_user_id UUID)
RETURNS TABLE (
  restriction_type TEXT,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.restriction_type, ur.reason, ur.expires_at, ur.applied_by
  FROM user_restrictions ur
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ORDER BY ur.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS Policies

```sql
-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;

-- moderation_reports policies
CREATE POLICY "users_can_create_reports" ON moderation_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "users_can_view_own_reports" ON moderation_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "moderators_can_view_all_reports" ON moderation_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  );

CREATE POLICY "moderators_can_update_reports" ON moderation_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  );

-- Allow moderators to create reports (for direct flagging)
CREATE POLICY "moderators_can_create_reports" ON moderation_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  );

-- moderation_actions policies
CREATE POLICY "moderators_can_create_actions" ON moderation_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  );

CREATE POLICY "moderators_can_view_actions" ON moderation_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  );

CREATE POLICY "users_can_view_own_actions" ON moderation_actions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = target_user_id 
    AND notification_sent = TRUE
  );

-- user_restrictions policies
CREATE POLICY "users_can_view_own_restrictions" ON user_restrictions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "moderators_can_view_restrictions" ON user_restrictions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  );

CREATE POLICY "moderators_can_manage_restrictions" ON user_restrictions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('moderator', 'admin') 
      AND is_active = TRUE
    )
  );
```

---

## API/Service Layer

### TypeScript Service: moderationService.ts

```typescript
import { supabase } from '@/lib/supabase';

// ============================================================================
// REPORTING (User Reports)
// ============================================================================

export interface ReportParams {
  reportType: 'post' | 'comment' | 'track' | 'user';
  targetId: string;
  reason: string;
  description?: string;
}

export async function submitReport(params: ReportParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get reported user ID
  let reportedUserId: string | null = null;
  if (params.reportType === 'user') {
    reportedUserId = params.targetId;
  } else {
    const tableMap = {
      post: 'posts',
      comment: 'comments',
      track: 'tracks',
    };
    const { data } = await supabase
      .from(tableMap[params.reportType])
      .select('user_id')
      .eq('id', params.targetId)
      .single();
    reportedUserId = data?.user_id || null;
  }

  // Calculate priority
  const criticalReasons = ['self_harm'];
  const highReasons = ['harassment', 'hate_speech'];
  let priority = 3;
  if (criticalReasons.includes(params.reason)) priority = 1;
  else if (highReasons.includes(params.reason)) priority = 2;

  const { data, error } = await supabase
    .from('moderation_reports')
    .insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      report_type: params.reportType,
      target_id: params.targetId,
      reason: params.reason,
      description: params.description,
      status: 'pending',
      priority,
      moderator_flagged: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// MODERATOR FLAGGING
// ============================================================================

export interface ModeratorFlagParams {
  reportType: 'post' | 'comment' | 'track' | 'user';
  targetId: string;
  reason: string;
  internalNotes: string;
  priority?: number; // Optional: moderator can override
}

export async function moderatorFlagContent(params: ModeratorFlagParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user is moderator or admin
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role_type')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const isModerator = roles?.some(r => ['moderator', 'admin'].includes(r.role_type));
  if (!isModerator) throw new Error('Insufficient permissions');

  // Get reported user ID
  let reportedUserId: string | null = null;
  if (params.reportType === 'user') {
    reportedUserId = params.targetId;
  } else {
    const tableMap = {
      post: 'posts',
      comment: 'comments',
      track: 'tracks',
    };
    const { data } = await supabase
      .from(tableMap[params.reportType])
      .select('user_id')
      .eq('id', params.targetId)
      .single();
    reportedUserId = data?.user_id || null;
  }

  // Moderator flags default to higher priority
  const defaultPriority = params.priority || 2;

  const { data, error } = await supabase
    .from('moderation_reports')
    .insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      report_type: params.reportType,
      target_id: params.targetId,
      reason: params.reason,
      description: params.internalNotes,
      status: 'under_review', // Moderator flags go directly to under_review
      priority: defaultPriority,
      moderator_flagged: true,
      resolution_notes: params.internalNotes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// MODERATION QUEUE
// ============================================================================

export interface QueueFilters {
  status?: string;
  priority?: number;
  moderatorFlagged?: boolean;
}

export async function fetchModerationQueue(filters: QueueFilters = {}) {
  let query = supabase
    .from('moderation_reports')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.moderatorFlagged !== undefined) {
    query = query.eq('moderator_flagged', filters.moderatorFlagged);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================================================
// MODERATION ACTIONS
// ============================================================================

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

export async function takeModerationAction(params: ModerationActionParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const expiresAt = params.durationDays
    ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000)
    : null;

  // Create action record
  const { data: action, error: actionError } = await supabase
    .from('moderation_actions')
    .insert({
      moderator_id: user.id,
      target_user_id: params.targetUserId,
      action_type: params.actionType,
      target_type: params.targetType,
      target_id: params.targetId,
      reason: params.reason,
      duration_days: params.durationDays,
      expires_at: expiresAt?.toISOString(),
      related_report_id: params.reportId,
      internal_notes: params.internalNotes,
      notification_message: params.notificationMessage,
    })
    .select()
    .single();

  if (actionError) throw actionError;

  // Update report status
  await supabase
    .from('moderation_reports')
    .update({
      status: 'resolved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      action_taken: params.actionType,
    })
    .eq('id', params.reportId);

  // Execute the action (content removal, suspension, etc.)
  await executeAction(action, params);

  return action;
}

async function executeAction(action: any, params: ModerationActionParams) {
  // Handle different action types
  switch (action.action_type) {
    case 'content_removed':
      await removeContent(params.targetType!, params.targetId!);
      break;
    case 'user_suspended':
      await applySuspension(params.targetUserId, params.reason, params.durationDays);
      break;
    case 'restriction_applied':
      await applyRestriction(params.targetUserId, params.reason, params.durationDays);
      break;
    // Add other cases as needed
  }

  // Send notification to user
  if (params.notificationMessage) {
    await sendModerationNotification(action);
  }
}

// ============================================================================
// RESTRICTIONS
// ============================================================================

export async function applyRestriction(
  userId: string,
  restrictionType: string,
  reason: string,
  durationDays?: number
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const expiresAt = durationDays
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  const { data, error } = await supabase
    .from('user_restrictions')
    .insert({
      user_id: userId,
      restriction_type: restrictionType,
      reason,
      expires_at: expiresAt?.toISOString(),
      applied_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function checkUserRestrictions(userId: string) {
  const { data, error } = await supabase
    .rpc('get_user_restrictions', { p_user_id: userId });

  if (error) throw error;
  return data;
}

// ============================================================================
// SUSPENSION (Enhanced)
// ============================================================================

export async function suspendUser(
  userId: string,
  reason: string,
  durationDays?: number
) {
  const suspendedUntil = durationDays
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      is_suspended: true,
      suspended_until: suspendedUntil?.toISOString(),
      suspension_reason: reason,
    })
    .eq('user_id', userId);

  if (profileError) throw profileError;

  // Also create restriction record
  await applyRestriction(userId, 'suspended', reason, durationDays);
}

export async function unsuspendUser(userId: string) {
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      is_suspended: false,
      suspended_until: null,
      suspension_reason: null,
    })
    .eq('user_id', userId);

  if (profileError) throw profileError;

  // Deactivate restriction
  await supabase
    .from('user_restrictions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('restriction_type', 'suspended');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function removeContent(contentType: string, contentId: string) {
  const tableMap: Record<string, string> = {
    post: 'posts',
    comment: 'comments',
    track: 'tracks',
  };

  const table = tableMap[contentType];
  if (!table) return;

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', contentId);

  if (error) throw error;
}

async function sendModerationNotification(action: any) {
  // Create notification in notifications table
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: action.target_user_id,
      type: 'system',
      title: getNotificationTitle(action.action_type),
      message: action.notification_message,
      data: {
        action_type: action.action_type,
        action_id: action.id,
        moderator_id: action.moderator_id,
      },
    });

  if (error) throw error;
}

function getNotificationTitle(actionType: string): string {
  const titles: Record<string, string> = {
    content_removed: 'Content Removed',
    user_warned: 'Community Guidelines Warning',
    user_suspended: 'Account Suspended',
    user_banned: 'Account Banned',
    restriction_applied: 'Account Restriction Applied',
  };
  return titles[actionType] || 'Moderation Action';
}
```

---

## UI Components

### 1. Report Modal Component (Users)

**File**: `/client/src/components/moderation/ReportModal.tsx`

**Purpose**: Allow users to report content

**Requirements**:
- Modal overlay with form
- Dropdown for report reason
- Optional text area for details
- Character limit (1000 chars)
- Submit and cancel buttons
- Loading state during submission
- Success/error toast notifications

---

### 2. Moderator Flag Modal Component

**File**: `/client/src/components/moderation/ModeratorFlagModal.tsx`

**Purpose**: Allow moderators to directly flag content

**Requirements**:
- Similar to ReportModal but simplified
- Reason dropdown
- Internal notes field (required)
- Priority selector (P1-P5)
- "This is a moderator flag" indicator
- Immediate submission to queue

---

### 3. Moderation Page Layout

**File**: `/client/src/app/moderation/page.tsx`

**Purpose**: Main moderation dashboard

**Requirements**:
- Access check: moderator or admin role
- Tab navigation (Queue, Logs, Metrics, Settings)
- Responsive layout
- Loading states
- Permission denied message for non-moderators

---

### 4. Moderation Queue Component

**File**: `/client/src/components/moderation/ModerationQueue.tsx`

**Purpose**: Display and manage moderation queue

**Requirements**:
- Filter controls (status, priority, source)
- Sort controls
- Report cards with:
  - Priority badge (color-coded)
  - "Moderator Flag" badge if applicable
  - Report type and reason
  - Reported content preview
  - Reporter info (users anonymous, mods identified)
  - Timestamp
  - Action buttons
- Pagination
- Loading states
- Empty state

---

### 5. Moderation Action Panel

**File**: `/client/src/components/moderation/ModerationActionPanel.tsx`

**Purpose**: Take actions on reports

**Requirements**:
- View full report details
- View reported content in context
- View user history (past violations)
- Action buttons:
  - Dismiss report
  - Remove content
  - Warn user
  - Suspend user (with duration picker: 1/7/30 days)
  - Apply custom restriction
  - Ban user (admin only)
- Text area for internal notes
- Text area for user notification message
- Confirmation dialogs for destructive actions

---

### 6. Moderation Logs Component

**File**: `/client/src/components/moderation/ModerationLogs.tsx`

**Purpose**: Display moderation action history

**Requirements**:
- Table view of all actions
- Filter by:
  - Action type
  - Moderator (if admin viewing)
  - Date range
  - Target user
- Search by user or content ID
- Export to CSV
- Pagination

---

### 7. Moderator Flag Button Component

**File**: `/client/src/components/moderation/ModeratorFlagButton.tsx`

**Purpose**: Add flag button to content for moderators

**Requirements**:
- Only visible to moderators/admins
- Icon: ⚠️ "Flag for Review"
- Opens ModeratorFlagModal on click
- Styled distinctly from user report button

---

## Navigation Integration

### Update Header/Avatar Dropdown

**File**: `/client/src/components/layout/Header.tsx` (or wherever avatar menu is)

**Add Moderation Link**:
```typescript
// Check if user is moderator or admin
const { data: roles } = await supabase
  .from('user_roles')
  .select('role_type')
  .eq('user_id', user.id)
  .eq('is_active', true);

const isModerator = roles?.some(r => 
  ['moderator', 'admin'].includes(r.role_type)
);

// In avatar dropdown menu:
{isModerator && (
  <Link href="/moderation" className="...">
    🛡️ Moderation
  </Link>
)}

{isAdmin && (
  <Link href="/admin" className="...">
    ⚙️ Admin Dashboard
  </Link>
)}
```

---

## Testing Requirements

### Database Tests
- [ ] Reports can be created by users
- [ ] Reports can be created by moderators with moderator_flagged=true
- [ ] RLS policies prevent unauthorized access
- [ ] Helper functions correctly check restrictions
- [ ] Auto-expiration functions work correctly
- [ ] Unique constraints prevent duplicate restrictions

### API Tests
- [ ] submitReport creates valid user report
- [ ] moderatorFlagContent creates valid moderator flag
- [ ] fetchModerationQueue filters correctly
- [ ] takeModerationAction creates action and updates report
- [ ] applyRestriction creates restriction record
- [ ] Enhanced suspendUser supports duration
- [ ] Notifications are created for actions

### UI Tests
- [ ] Report modal validates input
- [ ] Moderator flag modal only accessible to moderators
- [ ] Moderation page blocks non-moderators
- [ ] Moderation queue displays reports correctly
- [ ] Moderator-flagged reports show badge
- [ ] Action panel shows all options
- [ ] Filters work on queue view
- [ ] Pagination works correctly
- [ ] Loading states display properly

### Integration Tests
- [ ] Full user report → review → action flow
- [ ] Full moderator flag → review → action flow
- [ ] User receives notification after action
- [ ] Content removal actually removes content
- [ ] Suspensions prevent user actions
- [ ] Restrictions are enforced at API level
- [ ] Auto-expiration runs correctly
- [ ] Moderator menu item appears for moderators only
- [ ] Admin menu item appears for admins only

---

## Migration Path

### Phase 1: Database Setup
1. Create moderation tables
2. Add RLS policies
3. Create helper functions
4. Test in Supabase dashboard

### Phase 2: Backend Services
1. Implement moderationService.ts
2. Add moderator flagging functions
3. Update existing API routes to check restrictions
4. Add notification sending logic
5. Test with Postman/curl

### Phase 3: Navigation & Access Control
1. Add "Moderation" to avatar dropdown
2. Create /moderation/ page with access check
3. Test role-based access

### Phase 4: User Reporting
1. Create ReportModal component
2. Add report buttons to posts/comments/tracks
3. Test report submission flow

### Phase 5: Moderator Flagging
1. Create ModeratorFlagModal component
2. Add ModeratorFlagButton to content
3. Test moderator flagging flow

### Phase 6: Moderation Dashboard
1. Create ModerationQueue component
2. Create ModerationActionPanel component
3. Implement queue view with filters
4. Test moderation workflow

### Phase 7: Logs & Analytics
1. Create ModerationLogs component
2. Add metrics calculations
3. Add export functionality
4. Test reporting features

### Phase 8: Testing & Polish
1. Run all tests
2. Fix bugs
3. Add loading states
4. Improve error handling
5. User acceptance testing

---

## Success Criteria

MVP is complete when:
- [ ] Users can report content
- [ ] Moderators can directly flag content
- [ ] Moderators see "Moderation" in avatar menu
- [ ] /moderation/ page accessible to moderators/admins only
- [ ] /admin/ page remains admin-only
- [ ] Reports appear in moderation queue
- [ ] Moderator-flagged content shows distinct badge
- [ ] Moderators can review and take actions
- [ ] Users receive notifications of actions
- [ ] Suspensions can have time limits
- [ ] Restrictions are enforced
- [ ] Actions are logged
- [ ] Moderators can view logs and metrics
- [ ] All tests pass
- [ ] Documentation is complete

---

## Future Enhancements (Post-MVP)

These features are NOT part of MVP but architecture supports them:

1. **Automated Content Filtering**
   - Profanity detection
   - Spam pattern recognition
   - AI-powered classification

2. **Appeals System**
   - Users can appeal actions
   - Admin review workflow
   - Appeal tracking

3. **Trusted Reporters**
   - Track reporter accuracy
   - Fast-track reports from trusted users
   - Reporter badges

4. **Advanced Analytics**
   - Trend analysis
   - Moderator performance tracking
   - False positive rate calculation

5. **Community Moderation**
   - Volunteer moderator program
   - Community voting on reports
   - Reputation system

---

## Notes for Kiro IDE

### Key Integration Points
1. Use existing `moderator` role from `user_roles` table
2. Extend current `suspendUser()` function to support time-based suspensions
3. Create separate `/moderation/` page, distinct from `/admin/`
4. Add "Moderation" link to avatar dropdown (moderators + admins)
5. Keep `/admin/` restricted to admins only
6. Use existing notification system for user notifications
7. Follow existing RLS patterns for security

### Code Style Guidelines
- Follow existing TypeScript patterns in codebase
- Use existing Supabase client patterns
- Match existing component structure
- Follow existing naming conventions
- Use existing error handling patterns

### Testing Strategy
- Write tests matching existing test structure
- Use existing test utilities
- Follow existing mocking patterns
- Ensure all database functions have tests

### Documentation
- Update existing API documentation
- Add moderation section to user guide
- Create moderator training documentation
- Document all database changes
