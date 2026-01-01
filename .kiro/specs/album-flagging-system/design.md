# Design Document

## Overview

The Album Flagging System extends the existing Moderation System to support reporting and moderating albums. The design follows a principle of **maximum infrastructure reuse** - leveraging existing moderation components, database tables, services, and UI patterns with minimal modifications.

### Key Design Principles

1. **Maximum Reuse**: Reuse existing ReportModal, ModeratorFlagModal, moderation queue, action panel, and notification system
2. **Minimal Database Changes**: Only add "album" to existing CHECK constraints (one-line changes)
3. **Consistent UX**: Same reporting flow, same moderation workflow, same confirmation dialogs as other content types
4. **Type-Agnostic Infrastructure**: Existing RLS policies and services work without modification
5. **Album-Specific Context**: Only add album-specific logic where absolutely necessary (album context display, cascading actions)

### System Context

**Existing Infrastructure to Leverage:**
- `moderation_reports` table with report_type CHECK constraint
- `moderation_actions` table with target_type CHECK constraint
- `ReportModal` component (accepts reportType prop)
- `ModeratorFlagModal` component (accepts reportType prop)
- `moderationService.ts` functions (submitReport, moderatorFlagContent)
- Moderation queue UI with filtering and sorting
- Notification system with templates
- RLS policies (type-agnostic)
- Confirmation dialogs for content removal

**Album-Specific Components to Build:**
- Album context display in moderation queue
- Cascading action options in action panel
- Album-specific notification message variants

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Album Pages        │  Moderation Dashboard                  │
│  - ReportButton     │  - Queue (existing)                    │
│  - FlagButton       │  - Action Panel (extended)             │
│  (reuse existing)   │  - Album Context Display (new)         │
│                     │  - Cascading Actions (new)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  moderationService.ts (existing - no changes needed)         │
│  - submitReport() - works with reportType="album"            │
│  - moderatorFlagContent() - works with reportType="album"    │
│  - takeModerationAction() - extended for cascading           │
│  - fetchAlbumContext() - new function for album details      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Existing Tables (minimal changes):                          │
│  - moderation_reports: Add "album" to report_type constraint │
│  - moderation_actions: Add "album" to target_type constraint │
│                                                              │
│  Existing Tables (no changes):                              │
│  - albums, album_tracks, user_profiles, user_restrictions   │
│                                                              │
│  Existing RLS Policies (no changes - type-agnostic)         │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**User Report Flow (Reuses Existing):**
```
User on album page → Clicks report button (🚩)
→ ReportModal opens with reportType="album"
→ User selects reason and submits
→ submitReport() called (existing function)
→ moderation_reports table insert with report_type="album"
→ Report appears in queue (existing queue UI)
→ Moderator reviews with album context (new display)
→ Moderator takes action (extended for cascading)
```

**Moderator Flag Flow (Reuses Existing):**
```
Moderator on album page → Clicks flag button (⚠️)
→ ModeratorFlagModal opens with reportType="album"
→ Moderator enters notes and submits
→ moderatorFlagContent() called (existing function)
→ moderation_reports table insert with moderator_flagged=true
→ Report goes to top of queue (existing priority logic)
```

**Album Context Display Flow (New):**
```
Moderator clicks album report in queue
→ Action panel opens (existing panel)
→ fetchAlbumContext() called (new function)
→ Fetches album metadata + tracks from albums/album_tracks tables
→ Displays album title, artist, description, track list
→ Shows track count, total duration, upload date
```

**Cascading Action Flow (New):**
```
Moderator selects "Remove Album"
→ Confirmation dialog shows (existing dialog, reused)
→ Dialog presents cascading options:
   - "Remove album and all tracks"
   - "Remove album only (keep tracks as standalone)"
→ Moderator selects option and confirms
→ takeModerationAction() executes:
   - Creates moderation_action for album
   - If cascading: Creates moderation_action for each track
   - Deletes album record
   - If cascading: Deletes track records
   - If not cascading: Removes from album_tracks junction only
→ Sends notification to album owner
```

## Components and Interfaces

### Database Schema Changes

#### Minimal Database Modifications

**1. moderation_reports table - Add "album" to CHECK constraint:**
```sql
-- Migration: Add "album" to report_type constraint
ALTER TABLE moderation_reports
  DROP CONSTRAINT IF EXISTS moderation_reports_report_type_check;

ALTER TABLE moderation_reports
  ADD CONSTRAINT moderation_reports_report_type_check
  CHECK (report_type IN ('post', 'comment', 'track', 'user', 'album'));
```

**2. moderation_actions table - Add "album" to CHECK constraint:**
```sql
-- Migration: Add "album" to target_type constraint
ALTER TABLE moderation_actions
  DROP CONSTRAINT IF EXISTS moderation_actions_target_type_check;

ALTER TABLE moderation_actions
  ADD CONSTRAINT moderation_actions_target_type_check
  CHECK (target_type IN ('post', 'comment', 'track', 'user', 'album'));
```

**No other database changes needed.** Existing tables, RLS policies, and functions work as-is.

### TypeScript Interfaces

**Extend Existing Types (in moderation.ts):**

```typescript
// Extend ReportType to include 'album'
export type ReportType = 'post' | 'comment' | 'track' | 'user' | 'album';

// Extend ModerationTargetType to include 'album'
export type ModerationTargetType = 'post' | 'comment' | 'track' | 'user' | 'album';

// New interface for album context in moderation queue
export interface AlbumContext {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
  tracks: Array<{
    id: string;
    title: string;
    duration: number | null;
    position: number;
  }>;
  track_count: number;
  total_duration: number | null;
}

// New interface for cascading action options
export interface CascadingActionOptions {
  removeAlbum: boolean;
  removeTracks: boolean;
}

// Extend ModerationActionParams to include cascading options
export interface ModerationActionParams {
  reportId: string;
  actionType: ModerationActionType;
  targetUserId: string;
  targetType?: ModerationTargetType;
  targetId?: string;
  reason: string;
  durationDays?: number;
  internalNotes?: string;
  notificationMessage?: string;
  restrictionType?: RestrictionType;
  cascadingOptions?: CascadingActionOptions; // New field for album actions
}
```

## Data Models

### Album Context Data Model

When displaying an album report in the moderation queue, the system fetches comprehensive album context:

```typescript
interface AlbumContextData {
  // Album metadata
  album: {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null; // May be null (upload not implemented yet)
    user_id: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
  };
  
  // Album owner information
  owner: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  
  // Tracks in the album
  tracks: Array<{
    id: string;
    title: string;
    artist: string | null;
    duration: number | null;
    position: number;
    file_url: string;
    created_at: string;
  }>;
  
  // Aggregate statistics
  stats: {
    track_count: number;
    total_duration: number | null; // Sum of all track durations
    upload_date: string; // Album created_at
  };
}
```

### Cascading Action Logic

When a moderator removes an album, they choose between two cascading options:

**Option 1: Remove album and all tracks**
- Deletes album record from `albums` table
- Deletes all track records from `tracks` table (CASCADE via album_tracks)
- Creates moderation_action for album (target_type='album')
- Creates moderation_action for each track (target_type='track', metadata links to parent)
- Sends single notification explaining album and tracks were removed

**Option 2: Remove album only (keep tracks as standalone)**
- Deletes album record from `albums` table
- Removes entries from `album_tracks` junction table
- Tracks remain in `tracks` table as standalone tracks
- Creates moderation_action for album only (target_type='album')
- Sends notification explaining album removed but tracks remain

### Cascading Action Metadata

When a cascading action affects multiple tracks, the parent-child relationship is maintained in metadata:

```typescript
// Parent album action
{
  id: 'action-uuid-1',
  action_type: 'content_removed',
  target_type: 'album',
  target_id: 'album-uuid',
  metadata: {
    cascading_action: true,
    affected_tracks: ['track-uuid-1', 'track-uuid-2', 'track-uuid-3'],
    track_count: 3
  }
}

// Child track actions (if cascading to tracks)
{
  id: 'action-uuid-2',
  action_type: 'content_removed',
  target_type: 'track',
  target_id: 'track-uuid-1',
  metadata: {
    parent_album_action: 'action-uuid-1',
    parent_album_id: 'album-uuid',
    cascaded_from_album: true
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis and property reflection to eliminate redundancy, here are the key correctness properties:

### Property 1: Album Report Creation with Correct Type
*For any* valid album report parameters (album ID, reason, description), submitting a report should create exactly one report record with report_type set to "album" and correct priority based on reason.
**Validates: Requirements 1.2, 1.3, 1.5**

### Property 2: Report Modal Prop Passing
*For any* album page, clicking the report button should pass reportType="album" to the ReportModal component.
**Validates: Requirements 1.2**

### Property 3: Rate Limit Enforcement
*For any* user, attempting to submit more than 10 reports (across all types including albums) within a 24-hour period should be rejected.
**Validates: Requirements 1.7**

### Property 4: Moderator Flag Priority
*For any* moderator-flagged album report, the report should have status "under_review", moderator_flagged set to true, and should appear before user reports of the same priority in the queue.
**Validates: Requirements 2.2, 2.3, 2.4**

### Property 5: Album Context Completeness
*For any* album report displayed in the moderation queue, the album context should include all tracks contained in the album with correct track count and total duration calculations.
**Validates: Requirements 3.2, 3.4, 3.5**

### Property 6: Queue Filtering by Report Type
*For any* moderation queue filtered by report_type="album", only album reports should be returned, and filtering by target_type="album" in action logs should return only album actions.
**Validates: Requirements 3.6, 6.5**

### Property 7: Cascading Deletion Consistency
*For any* album removal with "Remove album and all tracks" option, both the album record and all associated track records should be deleted, and a moderation_action should be created for each.
**Validates: Requirements 4.3, 4.6**

### Property 8: Selective Deletion Preservation
*For any* album removal with "Remove album only" option, the album record should be deleted but all tracks should remain in the tracks table as standalone tracks.
**Validates: Requirements 4.4**

### Property 9: Action Logging Completeness
*For any* moderation action taken on an album, a moderation_action record should be created with target_type="album", target_id set to the album UUID, and complete action details.
**Validates: Requirements 4.5, 6.1, 8.3**

### Property 10: Cascading Action Logging
*For any* cascading action affecting multiple tracks, each track should have its own moderation_action record with metadata linking to the parent album action.
**Validates: Requirements 4.6, 6.2, 8.4**

### Property 11: Report Status Transition
*For any* album report that receives a moderation action, the report status should transition from "pending" or "under_review" to "resolved".
**Validates: Requirements 4.8**

### Property 12: Notification Delivery
*For any* album removal action, a notification should be sent to the album owner with appropriate message content based on whether tracks were also removed.
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 13: Admin Account Protection
*For any* album owned by an admin account, moderator actions should be blocked and a security event should be logged.
**Validates: Requirements 8.5, 9.4**

### Property 14: Authorization Verification
*For any* album moderation action, the system should verify the user has moderator or admin role before allowing the action.
**Validates: Requirements 9.1**

### Property 15: Failed Authorization Logging
*For any* failed authorization attempt on album moderation actions, a security event should be logged to the security_events table.
**Validates: Requirements 9.5**

### Property 16: Input Validation
*For any* album report or moderation action, all input data should be validated and sanitized to prevent SQL injection and XSS attacks.
**Validates: Requirements 9.6**

### Property 17: Metrics Calculation Accuracy
*For any* time period, album-specific metrics (report counts, percentages, averages, cascading action statistics) should be calculated correctly based on the underlying data.
**Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**

## Error Handling

### Client-Side Error Handling

**Album Report Submission Errors:**
- Rate limit exceeded: Display existing error message "You have reached the maximum number of reports (10) in 24 hours"
- Invalid album ID: Show error that album no longer exists
- Network errors: Retry with exponential backoff (reuse existing retry logic)
- Validation errors: Highlight specific fields with error messages (reuse existing validation)

**Album Context Loading Errors:**
- Album not found: Display error message and refresh queue
- Tracks fetch failure: Show album metadata with "Unable to load tracks" message
- Network timeout: Retry with loading indicator

**Cascading Action Errors:**
- Confirmation dialog cancellation: No action taken, return to action panel
- Deletion failure: Show error message, log to console, allow retry
- Partial deletion failure: Show which items failed, log details for investigation

### Server-Side Error Handling

**Album Context Fetching:**
```typescript
try {
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .select('*, album_tracks(track:tracks(*))')
    .eq('id', albumId)
    .single();
    
  if (albumError) {
    throw new ModerationError(
      'Failed to fetch album context',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { albumId, originalError: albumError }
    );
  }
  
  return album;
} catch (error) {
  console.error('Album context fetch error:', error);
  throw error;
}
```

**Cascading Action Execution:**
```typescript
try {
  // Start transaction for cascading deletion
  const { data: albumAction, error: albumError } = await supabase
    .from('moderation_actions')
    .insert({
      moderator_id: moderatorId,
      target_user_id: albumOwnerId,
      action_type: 'content_removed',
      target_type: 'album',
      target_id: albumId,
      reason: reason,
      metadata: {
        cascading_action: options.removeTracks,
        affected_tracks: trackIds,
        track_count: trackIds.length
      }
    })
    .select()
    .single();
    
  if (albumError) {
    throw new ModerationError(
      'Failed to create album action',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { albumId, originalError: albumError }
    );
  }
  
  // If cascading, create track actions
  if (options.removeTracks) {
    const trackActions = trackIds.map(trackId => ({
      moderator_id: moderatorId,
      target_user_id: albumOwnerId,
      action_type: 'content_removed',
      target_type: 'track',
      target_id: trackId,
      reason: reason,
      metadata: {
        parent_album_action: albumAction.id,
        parent_album_id: albumId,
        cascaded_from_album: true
      }
    }));
    
    const { error: tracksError } = await supabase
      .from('moderation_actions')
      .insert(trackActions);
      
    if (tracksError) {
      // Log error but don't fail entire operation
      console.error('Failed to create track actions:', tracksError);
    }
  }
  
  // Delete album (tracks cascade if option selected)
  const { error: deleteError } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId);
    
  if (deleteError) {
    throw new ModerationError(
      'Failed to delete album',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { albumId, originalError: deleteError }
    );
  }
  
} catch (error) {
  console.error('Cascading action error:', error);
  throw error;
}
```

**Authorization Errors:**
```typescript
// Check if target album is owned by admin
const { data: albumOwner } = await supabase
  .from('albums')
  .select('user_id')
  .eq('id', albumId)
  .single();
  
if (albumOwner) {
  const isAdminOwned = await isAdmin(albumOwner.user_id);
  if (isAdminOwned) {
    // Log security event
    await logSecurityEvent('unauthorized_admin_album_action', moderatorId, {
      albumId,
      targetUserId: albumOwner.user_id
    });
    
    throw new ModerationError(
      'Cannot take moderation actions on albums owned by admin accounts',
      MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      { albumId }
    );
  }
}
```

### Error Codes

Reuse existing moderation error codes (no new codes needed):
- `MODERATION_DATABASE_ERROR`
- `MODERATION_UNAUTHORIZED`
- `MODERATION_VALIDATION_ERROR`
- `MODERATION_RATE_LIMIT_EXCEEDED`
- `MODERATION_NOT_FOUND`
- `MODERATION_INSUFFICIENT_PERMISSIONS`

## Testing Strategy

### Unit Testing

**Service Layer Tests:**
- Test `submitReport()` with reportType="album" (reuse existing test, add album case)
- Test `moderatorFlagContent()` with reportType="album" (reuse existing test, add album case)
- Test `fetchAlbumContext()` with valid and invalid album IDs
- Test `takeModerationAction()` with cascading options
- Test cascading deletion logic (both options)
- Test album context aggregation (track count, total duration)
- Test error handling for all new functions

**Component Tests:**
- Test ReportButton on album pages (reuse existing component test)
- Test ModeratorFlagButton on album pages (reuse existing component test)
- Test AlbumContextDisplay component with mock data
- Test CascadingActionOptions component with both options
- Test confirmation dialog with album-specific message

### Property-Based Testing

**Testing Framework:** fast-check (for TypeScript/JavaScript)

**Configuration:** Each property test should run a minimum of 100 iterations.

**Property Test Examples:**

```typescript
import fc from 'fast-check';

// Property 1: Album Report Creation with Correct Type
test('Property 1: Album report creates record with correct type', () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        reportType: fc.constant('album'),
        targetId: fc.uuid(),
        reason: fc.constantFrom('spam', 'harassment', 'inappropriate_content'),
        description: fc.option(fc.string()),
      }),
      async (params) => {
        const report = await submitReport(params);
        expect(report.report_type).toBe('album');
        expect(report.priority).toBeGreaterThanOrEqual(1);
        expect(report.priority).toBeLessThanOrEqual(5);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 7: Cascading Deletion Consistency
test('Property 7: Cascading deletion removes album and all tracks', () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(), // albumId
      fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }), // trackIds
      async (albumId, trackIds) => {
        // Setup: Create album with tracks
        await createTestAlbum(albumId, trackIds);
        
        // Execute cascading deletion
        await takeModerationAction({
          reportId: 'test-report',
          actionType: 'content_removed',
          targetType: 'album',
          targetId: albumId,
          reason: 'test',
          cascadingOptions: {
            removeAlbum: true,
            removeTracks: true
          }
        });
        
        // Verify album deleted
        const album = await fetchAlbum(albumId);
        expect(album).toBeNull();
        
        // Verify all tracks deleted
        for (const trackId of trackIds) {
          const track = await fetchTrack(trackId);
          expect(track).toBeNull();
        }
        
        // Verify action records created
        const actions = await fetchModerationActions(albumId);
        expect(actions.length).toBe(1 + trackIds.length); // 1 album + N tracks
      }
    ),
    { numRuns: 100 }
  );
});

// Property 8: Selective Deletion Preservation
test('Property 8: Selective deletion preserves tracks', () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(), // albumId
      fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }), // trackIds
      async (albumId, trackIds) => {
        // Setup: Create album with tracks
        await createTestAlbum(albumId, trackIds);
        
        // Execute selective deletion
        await takeModerationAction({
          reportId: 'test-report',
          actionType: 'content_removed',
          targetType: 'album',
          targetId: albumId,
          reason: 'test',
          cascadingOptions: {
            removeAlbum: true,
            removeTracks: false
          }
        });
        
        // Verify album deleted
        const album = await fetchAlbum(albumId);
        expect(album).toBeNull();
        
        // Verify all tracks still exist
        for (const trackId of trackIds) {
          const track = await fetchTrack(trackId);
          expect(track).not.toBeNull();
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Database Integration Tests:**
- Test album report creation with actual database
- Test CHECK constraint enforcement (only "album" allowed in report_type)
- Test cascading deletion with actual album and track records
- Test RLS policies work for album reports (type-agnostic)
- Test album context fetching with joins

**API Integration Tests:**
- Test full album report submission flow
- Test moderator flag creation for albums
- Test album moderation action execution with cascading
- Test notification delivery for album actions
- Test album context API endpoint

**End-to-End Tests:**
- User submits album report → appears in queue → moderator reviews with album context → takes cascading action → owner receives notification
- Moderator flags album → appears at top of queue → action taken → audit log created
- Album with 5 tracks → cascading removal → all 6 items deleted → 6 action records created

### Security Testing

**Authorization Tests:**
- Non-moderators cannot access album moderation endpoints
- Moderators cannot take actions on admin-owned albums
- RLS policies prevent unauthorized access to album reports
- Security events logged for failed authorization attempts

**Input Validation Tests:**
- SQL injection attempts in album report descriptions are blocked
- XSS attempts in album context display are sanitized
- Invalid album UUIDs are rejected
- Invalid cascading options are rejected

### Performance Testing

**Load Tests:**
- Queue can handle album reports alongside other report types
- Album context fetching completes within 100ms
- Cascading deletion of album with 100 tracks completes within 5 seconds
- Filtering by report_type remains fast with large datasets

**Stress Tests:**
- Multiple moderators can review album reports simultaneously
- Concurrent cascading actions are handled correctly
- High album report submission rate doesn't degrade performance

## Implementation Notes

### Reuse Checklist

Before implementing any component, verify maximum reuse:

✅ **ReportModal** - Pass reportType="album", no changes needed
✅ **ModeratorFlagModal** - Pass reportType="album", no changes needed
✅ **submitReport()** - Works as-is with reportType="album"
✅ **moderatorFlagContent()** - Works as-is with reportType="album"
✅ **Moderation queue filtering** - Works as-is, just add "album" option
✅ **Notification system** - Reuse templates, add album-specific variants
✅ **Confirmation dialog** - Reuse existing dialog, same warning message
✅ **RLS policies** - Type-agnostic, no changes needed

### New Components to Build

Only these components need to be created:

1. **AlbumContextDisplay** - Shows album metadata and track list in action panel
2. **CascadingActionOptions** - Radio buttons for cascading deletion options
3. **fetchAlbumContext()** - Service function to fetch album with tracks
4. **Album-specific notification messages** - Message variants for album actions

### Database Migration

Single migration file with two one-line changes:

```sql
-- Migration: 20XX_add_album_to_moderation_types.sql

-- Add "album" to report_type constraint
ALTER TABLE moderation_reports
  DROP CONSTRAINT IF EXISTS moderation_reports_report_type_check;
ALTER TABLE moderation_reports
  ADD CONSTRAINT moderation_reports_report_type_check
  CHECK (report_type IN ('post', 'comment', 'track', 'user', 'album'));

-- Add "album" to target_type constraint
ALTER TABLE moderation_actions
  DROP CONSTRAINT IF EXISTS moderation_actions_target_type_check;
ALTER TABLE moderation_actions
  ADD CONSTRAINT moderation_actions_target_type_check
  CHECK (target_type IN ('post', 'comment', 'track', 'user', 'album'));
```

### Implementation Priority

1. **Database migration** (5 minutes) - Add "album" to constraints
2. **Add report/flag buttons to album pages** (15 minutes) - Reuse existing components
3. **Album context display** (1 hour) - New component for action panel
4. **Cascading action options** (1 hour) - New component and logic
5. **Album-specific notifications** (30 minutes) - Message variants
6. **Metrics updates** (30 minutes) - Add album filtering to metrics

**Total estimated implementation time: 3-4 hours**
