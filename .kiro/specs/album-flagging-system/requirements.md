# Requirements Document

## Introduction

This document defines the requirements for implementing an Album Flagging System for the AI Music Community Platform. The system extends the existing Moderation System to support reporting and moderating albums, enabling efficient handling of album-level violations such as inappropriate album art, titles, descriptions, and copyright claims.

**Design Philosophy: Maximum Reuse of Existing Infrastructure**

This feature is designed to **reuse as much existing moderation infrastructure as possible** to minimize implementation effort and maintain consistency:

- **Reuse existing ReportModal** - Same modal, same reasons, just add "album" as a report type
- **Reuse existing ModeratorFlagModal** - Same modal for moderator flagging
- **Reuse existing moderation_reports table** - Just add "album" to report_type constraint
- **Reuse existing moderation_actions table** - Just add "album" to target_type constraint
- **Reuse existing moderation queue UI** - Same queue, just display album context
- **Reuse existing action panel** - Same panel, add album-specific actions
- **Reuse existing notification system** - Same templates, album-specific messages
- **Reuse existing RLS policies** - Same security model

**System Context:** The platform has:
- **Albums Feature** (implemented): albums table, album_tracks junction table, album pages at `/album/[id]`
  - Note: Album cover art database column exists but upload functionality is not yet implemented
- **Moderation System** (implemented): Complete moderation infrastructure for posts, comments, tracks, and users
- **Notification System** (implemented): Notification delivery and templates
- **User Roles System** (implemented): Moderator and admin roles

**Key Principle:** If it works for tracks, posts, and comments, reuse it for albums. Only add album-specific logic where absolutely necessary.

## Glossary

- **Album**: A collection of tracks grouped together with shared metadata (title, description, cover art, artist)
- **Album Flagging**: The ability to report an entire album for policy violations
- **Album Report**: A report targeting an album rather than individual tracks
- **Cascading Action**: A moderation action that affects an album and optionally all tracks within it
- **Album Context**: Additional information shown to moderators when reviewing album reports, including all tracks in the album
- **Album-Level Violation**: A policy violation that applies to the album as a whole (e.g., album art, title, description) rather than individual tracks

## Requirements

### Requirement 1

**User Story:** As a platform user, I want to report albums that violate community guidelines using the same familiar reporting interface, so that I can efficiently report album-level violations without learning a new system.

#### Acceptance Criteria

1. WHEN a user views an album page, THE Album Flagging System SHALL display the existing report button (🚩) that opens the existing ReportModal component
2. WHEN a user clicks the report button on an album, THE Album Flagging System SHALL pass reportType="album" to the existing ReportModal
3. WHEN a user submits an album report, THE Album Flagging System SHALL use the existing reason categories (spam, harassment, hate_speech, inappropriate_content, copyright_violation, impersonation, self_harm, other)
4. WHEN a user selects "Other" as the report reason, THE Album Flagging System SHALL require a text description using the existing validation (same as posts/comments/tracks)
5. WHEN a user submits an album report, THE Album Flagging System SHALL create a report record with report_type set to "album" in the existing moderation_reports table
6. WHEN a user submits an album report, THE Album Flagging System SHALL display the existing confirmation message
7. THE Album Flagging System SHALL enforce the existing rate limit of 10 reports per user per 24 hours (shared across all report types including albums)
8. WHEN a user exceeds the report rate limit, THE Album Flagging System SHALL display the existing error message

### Requirement 2

**User Story:** As a moderator, I want to directly flag albums for review using the same moderator flagging interface, so that I can quickly escalate album-level issues I discover while browsing the platform.

#### Acceptance Criteria

1. WHEN a moderator views an album page, THE Album Flagging System SHALL display the existing "Flag for Review" button (⚠️) visible only to moderators and admins
2. WHEN a moderator clicks the flag button on an album, THE Album Flagging System SHALL open the existing ModeratorFlagModal with reportType="album"
3. WHEN a moderator submits an album flag, THE Album Flagging System SHALL create a report with report_type set to "album", status set to "under_review", and moderator_flagged set to true (same as existing content types)
4. WHEN a moderator flags an album, THE Album Flagging System SHALL place the report at the top of the moderation queue based on priority (same as existing content types)
5. WHEN a moderator album flag is created, THE Album Flagging System SHALL include the moderator's internal notes visible to other moderators (same as existing content types)

### Requirement 3

**User Story:** As a moderator, I want to see album reports in the moderation queue with full album context, so that I can make informed decisions about album-level violations.

#### Acceptance Criteria

1. WHEN a moderator accesses the moderation queue, THE Album Flagging System SHALL display album reports alongside other report types
2. WHEN a moderator views an album report card, THE Album Flagging System SHALL display album metadata including title, artist, and description (cover art thumbnail if/when cover art upload is implemented)
3. WHEN a moderator clicks on an album report, THE Album Flagging System SHALL open the action panel with full album context
4. WHEN the action panel displays an album report, THE Album Flagging System SHALL show a list of all tracks contained in the album
5. WHEN the action panel displays an album report, THE Album Flagging System SHALL show track count, total duration, and upload date
6. THE Album Flagging System SHALL allow filtering the moderation queue by report_type to show only album reports
7. THE Album Flagging System SHALL display album reports with a distinctive badge or icon to differentiate them from track reports

### Requirement 4

**User Story:** As a moderator, I want to take actions on reported albums with appropriate options for album-level violations, so that I can efficiently handle violations that affect the entire album.

#### Acceptance Criteria

1. WHEN a moderator reviews an album report, THE Album Flagging System SHALL provide the following action options: Remove Album, Approve Album, Warn User, Suspend User, and Apply Restrictions (same action panel as existing content types)
2. WHEN a moderator selects "Remove Album", THE Album Flagging System SHALL present cascading action options: "Remove album and all tracks" or "Remove album only (keep tracks as standalone)"
3. WHEN a moderator selects "Remove album and all tracks", THE Album Flagging System SHALL delete the album record and all associated track records
4. WHEN a moderator selects "Remove album only", THE Album Flagging System SHALL delete the album record but preserve all tracks as standalone tracks (remove from album_tracks junction table only)
5. WHEN a moderator takes any album action, THE Album Flagging System SHALL create a moderation_action record with target_type set to "album" and target_id set to the album UUID
6. WHEN a moderator takes a cascading action affecting tracks, THE Album Flagging System SHALL create separate moderation_action records for each affected track with metadata linking to the parent album action
7. WHEN a moderator takes an album action, THE Album Flagging System SHALL require a reason and allow optional internal notes (same as existing content types)
8. WHEN a moderator takes an album action, THE Album Flagging System SHALL update the report status to "resolved" and record the action taken (same as existing content types)
9. THE Album Flagging System SHALL NOT provide a "Hide Album" option to avoid the complexity of requiring moderator-user communication for album updates before unhiding

### Requirement 5

**User Story:** As a platform user, I want to be notified when moderation actions are taken on my albums using the same notification system, so that I understand what happened and why.

#### Acceptance Criteria

1. WHEN a moderator removes an album, THE Album Flagging System SHALL send a notification to the album owner using the existing notification system with an album-specific message explaining the action and reason
2. WHEN a moderator removes an album and all tracks, THE Album Flagging System SHALL send a single notification explaining that the album and all tracks were removed
3. WHEN a moderator removes an album but keeps tracks, THE Album Flagging System SHALL send a notification explaining that the album was removed but tracks remain available as standalone tracks
4. THE Album Flagging System SHALL use the existing notification system and notification templates (same infrastructure as track/post/comment moderation)
5. THE Album Flagging System SHALL include information about appeal options in notification messages (placeholder for future appeals feature, same as existing content types)

### Requirement 6

**User Story:** As a moderator, I want album actions to be logged comprehensively, so that I can track what actions have been taken on albums and understand the impact.

#### Acceptance Criteria

1. WHEN a moderator takes an action on an album, THE Album Flagging System SHALL log the action to the moderation_actions table with complete details
2. WHEN a cascading action affects multiple tracks, THE Album Flagging System SHALL log each track action separately while maintaining a reference to the parent album action
3. WHEN viewing action logs, THE Album Flagging System SHALL display album actions with a distinctive indicator showing they are album-level actions
4. WHEN viewing action logs for a cascading action, THE Album Flagging System SHALL show the number of tracks affected
5. THE Album Flagging System SHALL allow filtering action logs by target_type to show only album actions
6. THE Album Flagging System SHALL maintain the existing audit trail integrity for album actions (append-only, no modification)

### Requirement 7

**User Story:** As a platform administrator, I want the album flagging system to integrate seamlessly with the existing moderation system by reusing all existing infrastructure, so that moderators have a consistent experience and implementation is minimal.

#### Acceptance Criteria

1. THE Album Flagging System SHALL reuse the existing moderation_reports table by adding "album" to the report_type CHECK constraint (one-line database change)
2. THE Album Flagging System SHALL reuse the existing moderation_actions table by adding "album" to the target_type CHECK constraint (one-line database change)
3. THE Album Flagging System SHALL reuse the existing ReportModal component without modification (just pass reportType="album")
4. THE Album Flagging System SHALL reuse the existing ModeratorFlagModal component without modification (just pass reportType="album")
5. THE Album Flagging System SHALL reuse the existing moderation queue filtering and sorting logic (no changes needed)
6. THE Album Flagging System SHALL reuse the existing notification system and templates (add album-specific message variants only)
7. THE Album Flagging System SHALL reuse the existing RLS policies (no changes needed, policies are type-agnostic)
8. THE Album Flagging System SHALL reuse the existing moderationService.ts functions (submitReport, moderatorFlagContent work as-is)
9. THE Album Flagging System SHALL maintain backward compatibility with existing post, comment, track, and user reports (no breaking changes)

### Requirement 8

**User Story:** As a moderator, I want to be warned before removing albums permanently, so that I understand the consequences of my actions.

#### Acceptance Criteria

1. WHEN a moderator selects "Remove Album" action, THE Album Flagging System SHALL display the existing confirmation dialog used for content removal (same as posts/comments/tracks)
2. THE confirmation dialog SHALL state: "Are you sure you want to remove this album? This action cannot be easily undone."
3. WHEN a moderator confirms album removal, THE Album Flagging System SHALL log the action to the moderation_actions table with complete details
4. WHEN a moderator removes an album and all tracks, THE Album Flagging System SHALL log each track removal separately while maintaining a reference to the parent album action
5. THE Album Flagging System SHALL prevent moderators from taking actions on albums owned by admin accounts
6. THE Album Flagging System SHALL maintain the existing audit trail integrity for album actions (append-only, no modification)
7. THE Album Flagging System SHALL reuse the existing confirmation dialog component without modification (same UI/UX as other content types)

### Requirement 9

**User Story:** As a platform administrator, I want the album flagging system to be secure against abuse, so that only authorized moderators can take album moderation actions.

#### Acceptance Criteria

1. THE Album Flagging System SHALL verify moderator or admin role on every album moderation action using server-side checks
2. THE Album Flagging System SHALL implement Row Level Security policies on album reports consistent with existing moderation RLS policies
3. THE Album Flagging System SHALL prevent users from modifying their own album restrictions or removals
4. THE Album Flagging System SHALL prevent moderators from taking actions on albums owned by admin accounts
5. THE Album Flagging System SHALL log all failed authorization attempts to the security_events table
6. THE Album Flagging System SHALL validate all input data to prevent SQL injection and XSS attacks
7. THE Album Flagging System SHALL rate limit album moderation actions to prevent automated abuse

### Requirement 10

**User Story:** As a moderator, I want to see album flagging metrics in the moderation dashboard, so that I can understand album moderation workload and patterns.

#### Acceptance Criteria

1. WHEN a moderator accesses the Metrics tab, THE Album Flagging System SHALL display album report counts separately from other content types
2. THE Album Flagging System SHALL display the percentage of album reports vs. track reports
3. THE Album Flagging System SHALL display the most common reasons for album reports
4. THE Album Flagging System SHALL display the average number of tracks per reported album
5. THE Album Flagging System SHALL display cascading action statistics (how often albums are removed with vs. without tracks)
6. THE Album Flagging System SHALL include album actions in the overall moderation metrics calculations
7. THE Album Flagging System SHALL allow filtering metrics by report_type to show album-specific metrics

## Dependencies

### Integration Dependencies

This feature extends the existing Moderation System and requires:

1. **Albums Feature** (already implemented ✅)
   - albums table with columns: id, user_id, name, description, cover_image_url, is_public, created_at, updated_at
   - album_tracks junction table linking albums to tracks
   - Album detail page at `/album/[id]`
   - Album creation, editing, and deletion functionality
   - Note: Album cover art column exists in database but upload UI is not yet implemented

2. **Moderation System** (already implemented ✅)
   - moderation_reports table
   - moderation_actions table
   - user_restrictions table
   - Moderation dashboard at /moderation
   - ReportModal and ModeratorFlagModal components
   - moderationService.ts functions

3. **Notification System** (already implemented ✅)
   - Notification delivery infrastructure
   - Notification templates
   - Notification center UI

4. **User Roles System** (already implemented ✅)
   - Moderator and admin roles
   - Role verification functions
   - RLS policies based on roles

## Implementation Priority

This feature can be implemented immediately as all dependencies are satisfied.

**Implementation Order:**
1. Database migration to add "album" to report_type and target_type constraints
2. Add ReportButton and ModeratorFlagButton to album pages
3. Update moderation queue to display album reports with album context
4. Implement cascading action options in action panel
5. Add album-specific notifications
6. Update metrics to include album statistics

## Notes

- Album reports should be treated with similar priority to track reports (not higher or lower by default)
- Cascading actions are a key differentiator for album moderation vs. track moderation
- The ability to remove an album while keeping tracks provides flexibility for edge cases (e.g., inappropriate album title/description but tracks are fine)
- Album flagging reuses as much existing moderation infrastructure as possible to minimize implementation effort
- Album cover art upload functionality is not yet implemented, but the database column exists for future use
- Album titles and descriptions are the primary targets for moderation currently (inappropriate text content)
- Album descriptions can contain policy violations similar to track descriptions
