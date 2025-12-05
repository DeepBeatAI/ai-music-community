# Requirements Document

## Introduction

This document defines the requirements for implementing a comprehensive Moderation System for the AI Music Community Platform. The system enables user reporting, moderator review, and administrative actions on content and users. It builds upon the existing user roles system (which already supports the `moderator` role) and admin infrastructure, adding moderation-specific functionality accessible to both moderators and admins.

## Glossary

- **Moderation System**: The complete system for reporting, reviewing, and taking action on content and user violations
- **Moderation Dashboard**: A dedicated interface at `/moderation/` accessible to moderators and admins for reviewing reports and taking actions
- **Report**: A user-submitted or moderator-created flag indicating content or user violations
- **Moderation Queue**: A prioritized list of pending reports awaiting moderator review
- **Moderation Action**: A specific action taken by a moderator in response to a report (e.g., content removal, user suspension)
- **User Restriction**: Fine-grained limitations on user capabilities (posting, commenting, uploading) without full suspension
- **Moderator Flag**: A report created directly by a moderator, bypassing the user report flow
- **Priority Level**: A ranking system (P1-P5) determining the urgency of report review
- **Report Status**: The current state of a report (pending, under_review, resolved, dismissed)
- **Suspension**: Temporary or permanent restriction of all user account capabilities
- **Content Types**: Posts, comments, tracks, and user profiles that can be reported
- **Abuse Prevention**: Rate limiting and tracking mechanisms to prevent report system abuse
- **Audit Trail**: Comprehensive logging of all moderation actions for accountability

## Requirements

### Requirement 1

**User Story:** As a platform user, I want to report content that violates community guidelines, so that moderators can review and take appropriate action.

#### Acceptance Criteria

1. WHEN a user views a post, comment, or track, THE Moderation System SHALL display a report button (🚩) that opens a report modal
2. WHEN a user submits a report, THE Moderation System SHALL require selection of a reason from the following categories: Spam or Misleading Content, Harassment or Bullying, Hate Speech, Inappropriate Content, Copyright Violation, Impersonation, Self-Harm or Dangerous Acts, or Other
3. WHEN a user selects "Other" as the report reason, THE Moderation System SHALL require a text description explaining the violation
4. WHEN a user submits a report, THE Moderation System SHALL create a report record with status "pending" and automatically calculate priority based on the reason
5. WHEN a user submits a report, THE Moderation System SHALL display a confirmation message and close the report modal
6. THE Moderation System SHALL enforce a rate limit of 10 reports per user per 24 hours to prevent abuse
7. WHEN a user exceeds the report rate limit, THE Moderation System SHALL display an error message and prevent report submission

### Requirement 2

**User Story:** As a moderator, I want to directly flag content for review without going through the user report flow, so that I can quickly escalate issues I discover while browsing the platform.

#### Acceptance Criteria

1. WHEN a moderator views any post, comment, or track, THE Moderation System SHALL display a "Flag for Review" button (⚠️) visible only to moderators and admins
2. WHEN a moderator clicks the flag button, THE Moderation System SHALL open a moderator flag modal with reason dropdown, internal notes field, and priority selector
3. WHEN a moderator submits a flag, THE Moderation System SHALL create a report with status "under_review" and moderator_flagged set to true
4. WHEN a moderator flags content, THE Moderation System SHALL place the report at the top of the moderation queue based on priority
5. THE Moderation System SHALL allow moderators to flag user profiles directly from the profile page
6. WHEN a moderator flag is created, THE Moderation System SHALL include the moderator's internal notes visible to other moderators

### Requirement 3

**User Story:** As a moderator, I want access to a dedicated moderation dashboard, so that I can efficiently review reports and take appropriate actions.

#### Acceptance Criteria

1. THE Moderation System SHALL provide a moderation dashboard accessible at the /moderation route
2. WHEN a non-moderator user attempts to access /moderation, THE Moderation System SHALL redirect them to the home page with an unauthorized message
3. WHEN a moderator or admin accesses /moderation, THE Moderation System SHALL display the full moderation interface with Queue, Action Logs, Metrics, and Settings tabs
4. THE Moderation System SHALL add a "Moderation" menu item (🛡️) to the avatar dropdown menu visible only to users with moderator or admin role
5. THE Moderation System SHALL maintain the existing Admin Dashboard at /admin accessible only to admins

### Requirement 4

**User Story:** As a moderator, I want to view and filter the moderation queue, so that I can prioritize and efficiently process reports.

#### Acceptance Criteria

1. WHEN a moderator accesses the Queue tab, THE Moderation System SHALL display all pending reports sorted by priority (P1-P5) and creation date
2. THE Moderation System SHALL allow filtering reports by status (pending, under_review, resolved, dismissed)
3. THE Moderation System SHALL allow filtering reports by source (user reports vs moderator flags)
4. THE Moderation System SHALL allow sorting reports by priority, date, and report type
5. WHEN a report is from a moderator flag, THE Moderation System SHALL display a "Moderator Flag" badge on the report card
6. THE Moderation System SHALL display report metadata including report type, reason, date, priority, and reporter information
7. THE Moderation System SHALL display reported content with full context including the content itself and surrounding information
8. THE Moderation System SHALL provide quick action buttons on each report card for common actions

### Requirement 5

**User Story:** As a moderator, I want to take various actions on reported content and users, so that I can enforce community guidelines appropriately.

#### Acceptance Criteria

1. THE Moderation System SHALL provide the following content actions: Remove Content (permanent deletion) and Approve Content (dismiss report)
2. THE Moderation System SHALL provide the following user actions: Issue Warning, Temporary Suspension (1, 7, or 30 days), and Apply Specific Restrictions
3. THE Moderation System SHALL allow admins to permanently ban users
4. THE Moderation System SHALL provide the following restriction types: Disable Posting, Disable Commenting, and Disable Uploads
5. WHEN a moderator takes an action, THE Moderation System SHALL require a reason and allow optional internal notes
6. WHEN a moderator takes an action, THE Moderation System SHALL update the report status to "resolved" and record the action taken
7. WHEN a moderator takes an action, THE Moderation System SHALL create a moderation action record with all relevant details
8. THE Moderation System SHALL allow moderators to dismiss reports as invalid without taking action on the content or user

### Requirement 6

**User Story:** As a moderator, I want the system to enforce user restrictions automatically, so that restricted users cannot perform prohibited actions.

#### Acceptance Criteria

1. WHEN a user has an active "posting_disabled" restriction, THE Moderation System SHALL prevent the user from creating new posts
2. WHEN a user has an active "commenting_disabled" restriction, THE Moderation System SHALL prevent the user from creating new comments
3. WHEN a user has an active "upload_disabled" restriction, THE Moderation System SHALL prevent the user from uploading new tracks
4. WHEN a user has an active "suspended" restriction, THE Moderation System SHALL prevent all user actions (posting, commenting, uploading)
5. THE Moderation System SHALL check restrictions at the API endpoint level before allowing any restricted action
6. WHEN a restricted user attempts a prohibited action, THE Moderation System SHALL display an error message explaining the restriction
7. THE Moderation System SHALL automatically expire time-based restrictions when the expiration date is reached

### Requirement 7

**User Story:** As a platform user, I want to be notified when moderation actions are taken on my content or account, so that I understand what happened and why.

#### Acceptance Criteria

1. WHEN a moderator removes or hides user content, THE Moderation System SHALL send a notification to the content owner explaining the action and reason
2. WHEN a moderator suspends a user account, THE Moderation System SHALL send a notification explaining the suspension reason and duration
3. WHEN a moderator issues a warning, THE Moderation System SHALL send a notification explaining the warning reason
4. WHEN a moderator applies a restriction, THE Moderation System SHALL send a notification explaining the restriction type, reason, and duration
5. THE Moderation System SHALL use the existing notification system for delivering moderation notifications
6. THE Moderation System SHALL include information about appeal options in notification messages (placeholder for future appeals feature)
7. WHEN a time-based suspension or restriction expires, THE Moderation System SHALL send a notification informing the user their account is restored

### Requirement 8

**User Story:** As a moderator, I want to view logs of all moderation actions, so that I can track what actions have been taken and by whom.

#### Acceptance Criteria

1. WHEN a moderator accesses the Action Logs tab, THE Moderation System SHALL display the 100 most recent moderation actions
2. THE Moderation System SHALL allow filtering action logs by action type, moderator (if admin viewing), date range, and target user
3. THE Moderation System SHALL provide search functionality to find actions by user ID or content ID
4. THE Moderation System SHALL display action details including moderator, target user, action type, reason, timestamp, and outcome
5. THE Moderation System SHALL allow admins to export action logs to CSV format
6. THE Moderation System SHALL implement pagination for action logs to handle large datasets
7. THE Moderation System SHALL log all moderation actions automatically when they are taken

### Requirement 9

**User Story:** As a moderator, I want to view moderation metrics and analytics, so that I can understand moderation workload and patterns.

#### Acceptance Criteria

1. WHEN a moderator accesses the Metrics tab, THE Moderation System SHALL display reports received counts for today, this week, and this month
2. THE Moderation System SHALL display reports resolved counts and average resolution time
3. THE Moderation System SHALL display a breakdown of actions by type using a pie chart or similar visualization
4. THE Moderation System SHALL display the top reasons for reports
5. WHEN an admin accesses the Metrics tab, THE Moderation System SHALL display moderator performance comparison showing actions taken per moderator
6. THE Moderation System SHALL calculate and display the percentage of reports resolved within SLA targets for each priority level
7. THE Moderation System SHALL display trends over time for report volume and resolution rates

### Requirement 10

**User Story:** As a platform administrator, I want comprehensive audit logging of all moderation actions, so that I can ensure accountability and investigate issues.

#### Acceptance Criteria

1. THE Moderation System SHALL log every moderation action to the moderation_actions table with complete details
2. THE Moderation System SHALL include moderator identity, timestamp, target user, action type, reason, and outcome in every log entry
3. THE Moderation System SHALL prevent modification or deletion of moderation action logs
4. THE Moderation System SHALL integrate with the existing admin_audit_log table for admin-level actions
5. THE Moderation System SHALL retain moderation logs indefinitely for compliance and investigation purposes
6. THE Moderation System SHALL provide admins with the ability to search and filter all moderation logs
7. THE Moderation System SHALL track report accuracy by correlating reports with actions taken

### Requirement 11

**User Story:** As a platform administrator, I want the moderation system to be secure against abuse and privilege escalation, so that only authorized moderators can take moderation actions.

#### Acceptance Criteria

1. THE Moderation System SHALL verify moderator or admin role on every moderation action using server-side checks
2. THE Moderation System SHALL implement Row Level Security policies on all moderation tables to prevent unauthorized data access
3. THE Moderation System SHALL prevent users from modifying their own restrictions or suspensions
4. THE Moderation System SHALL prevent moderators from taking actions on admin accounts
5. THE Moderation System SHALL log all failed authorization attempts to the security_events table
6. THE Moderation System SHALL validate all input data to prevent SQL injection and XSS attacks
7. THE Moderation System SHALL rate limit moderation actions to prevent automated abuse

### Requirement 12

**User Story:** As a platform administrator, I want to leverage the existing suspension system, so that I don't duplicate functionality and maintain consistency.

#### Acceptance Criteria

1. THE Moderation System SHALL use the existing suspendUser() function from adminService.ts for user suspensions
2. THE Moderation System SHALL use the existing unsuspendUser() function for removing suspensions
3. THE Moderation System SHALL extend the existing user_profiles table columns (suspended_until, suspension_reason) for suspension tracking
4. THE Moderation System SHALL integrate with the existing admin_audit_log table for suspension actions
5. THE Moderation System SHALL maintain compatibility with existing admin dashboard suspension functionality
6. THE Moderation System SHALL use the existing user_roles table to check for moderator and admin roles
7. THE Moderation System SHALL create moderation_actions records when using existing suspension functions to maintain moderation audit trail

### Requirement 13

**User Story:** As a moderator, I want to reverse moderation actions when mistakes are made or false positives occur, so that I can correct errors and restore user accounts appropriately.

#### Acceptance Criteria

1. WHEN a moderator views a user with an active suspension, THE Moderation System SHALL display a "Lift Suspension" button that removes the suspension immediately
2. WHEN a moderator views a user with active restrictions, THE Moderation System SHALL display a "Remove Restriction" button for each active restriction
3. WHEN a moderator views a user with a permanent ban, THE Moderation System SHALL display an "Unban User" button (admin only) that restores the account
4. WHEN a moderator lifts a suspension or removes a restriction, THE Moderation System SHALL require a reason for the reversal
5. WHEN a moderator reverses an action, THE Moderation System SHALL update the original moderation_action record with revoked_at timestamp and revoked_by moderator ID
6. WHEN a moderator reverses an action, THE Moderation System SHALL send a notification to the affected user explaining that the action has been reversed
7. THE Moderation System SHALL log all action reversals to the moderation_actions table for audit trail purposes
8. THE Moderation System SHALL prevent moderators from reversing actions taken on admin accounts
9. WHEN a moderator reverses an action, THE Moderation System SHALL display the reversal in the action logs with clear indication that it was a reversal
10. WHEN a moderator views the action logs, THE Moderation System SHALL display reversed actions with a visual indicator (strikethrough or badge) and show the reversal details
11. WHEN a moderator attempts to reverse an action on an admin account, THE Moderation System SHALL display an error message and prevent the reversal
12. WHEN a moderator reverses their own action, THE Moderation System SHALL allow the reversal and log it as a self-reversal
13. WHEN an admin reverses any action, THE Moderation System SHALL allow the reversal regardless of who originally took the action
14. THE Moderation System SHALL include the original action details in the reversal confirmation dialog to help moderators make informed decisions
15. WHEN a reversal is completed, THE Moderation System SHALL immediately update the user's status in the UI without requiring a page refresh



### Requirement 14

**User Story:** As a platform administrator, I want to track all action reversals comprehensively, so that I can identify patterns of false positives and improve moderation quality.

#### Acceptance Criteria

1. THE Moderation System SHALL maintain a complete history of all reversals in the moderation_actions table using revoked_at and revoked_by fields
2. WHEN viewing a user's moderation history, THE Moderation System SHALL display both original actions and their reversals in chronological order
3. THE Moderation System SHALL calculate and display reversal rate metrics (percentage of actions that are reversed) in the metrics dashboard
4. WHEN an action is reversed multiple times (re-applied then reversed again), THE Moderation System SHALL maintain the complete history of all state changes
5. THE Moderation System SHALL allow filtering action logs by "reversed actions only" to identify patterns
6. THE Moderation System SHALL display the time between action and reversal to help identify how quickly mistakes are caught
7. THE Moderation System SHALL track which moderators have the highest reversal rates for quality improvement purposes
8. WHEN exporting action logs, THE Moderation System SHALL include reversal information in the exported data
9. THE Moderation System SHALL allow admins to view a "Reversal Report" showing all reversals in a given time period with reasons
10. THE Moderation System SHALL prevent deletion of reversal records to maintain audit trail integrity

### Requirement 15

**User Story:** As a moderator, I want clear visual indicators for reversed actions throughout the system, so that I can quickly understand the current state of moderation actions.

#### Acceptance Criteria

1. WHEN viewing action logs, THE Moderation System SHALL display reversed actions with a strikethrough style and a "REVERSED" badge
2. WHEN viewing a user profile, THE Moderation System SHALL show only active (non-reversed) restrictions and suspensions
3. WHEN viewing a user's full moderation history, THE Moderation System SHALL display reversed actions in a collapsed or dimmed state
4. THE Moderation System SHALL use consistent color coding for action states (active=red, reversed=gray, expired=blue)
5. WHEN hovering over a reversed action, THE Moderation System SHALL display a tooltip with reversal details (who, when, why)
6. THE Moderation System SHALL display a timeline view showing the progression of actions and reversals for a user
7. WHEN a moderator views their own action history, THE Moderation System SHALL highlight actions they have reversed
8. THE Moderation System SHALL display a summary count of "Active Actions" vs "Reversed Actions" on user profiles
9. WHEN viewing the moderation queue, THE Moderation System SHALL indicate if a report is related to a previously reversed action
10. THE Moderation System SHALL provide a "Recently Reversed" filter in the action logs for quick access to recent reversals
