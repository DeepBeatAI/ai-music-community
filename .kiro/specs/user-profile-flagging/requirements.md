# Requirements Document

## Introduction

This document defines the requirements for implementing User Profile Flagging Foundation for the AI Music Community Platform. This feature enables users to report problematic profiles directly from creator profile pages, with essential abuse prevention mechanisms. It builds upon the existing moderation system (moderation_reports, moderation_actions, user_restrictions tables) and extends it to support user profile reporting from the CreatorProfileHeader component.

**Note:** The UserProfile component already has both ReportButton and ModeratorFlagButton implemented. This spec focuses on adding the same functionality to CreatorProfileHeader, which currently lacks these buttons.

## Glossary

- **User Profile Flagging**: The ability for users to report problematic user profiles (offensive usernames, inappropriate profile pictures, harassing bios)
- **CreatorProfileHeader**: The component displayed at the top of creator profile pages where the report and flag buttons will be added
- **UserProfile**: The existing component that already has both ReportButton and ModeratorFlagButton implemented
- **Profile Report**: A specific type of report with report_type='user' targeting a user profile
- **Rate Limiting**: Mechanism to prevent abuse by limiting users to 10 reports per 24 hours
- **Duplicate Detection**: System to prevent the same user from reporting the same target multiple times within 24 hours
- **Admin Protection**: Security measure preventing users from reporting admin accounts
- **Anonymous Reporting**: Reporter identity is hidden from the reported user but visible to moderators
- **Moderation System**: The existing comprehensive system for handling reports, actions, and restrictions
- **Report Button**: UI element (🚩 icon) for regular users that opens the report modal when clicked
- **Moderator Flag Button**: UI element (⚠️ icon) for moderators/admins that opens the moderator flag modal when clicked

## Requirements

### Requirement 1

**User Story:** As a platform user, I want to report problematic user profiles from creator pages, so that moderators can review accounts with offensive usernames, inappropriate profile pictures, or harassing bios.

#### Acceptance Criteria

1. WHEN a user views a creator profile page, THE User Profile Flagging System SHALL display both a report button (🚩) and a moderator flag button (⚠️) in the CreatorProfileHeader component
2. WHEN a regular user views a creator profile, THE User Profile Flagging System SHALL show only the report button (🚩)
3. WHEN a moderator or admin views a creator profile, THE User Profile Flagging System SHALL show both the report button (🚩) and the moderator flag button (⚠️)
4. WHEN a user clicks the report button, THE User Profile Flagging System SHALL open the existing ReportModal component with report_type='user'
5. WHEN a moderator clicks the flag button, THE User Profile Flagging System SHALL open the existing ModeratorFlagModal component with report_type='user'
6. WHEN a user submits a profile report, THE User Profile Flagging System SHALL create a report record with report_type='user', target_id=profile_user_id, and status='pending'
7. WHEN a user submits a profile report, THE User Profile Flagging System SHALL display a confirmation message and close the report modal
8. THE User Profile Flagging System SHALL use the existing ReportButton and ModeratorFlagButton components without modification
9. THE User Profile Flagging System SHALL integrate with the existing moderation_reports table without requiring schema changes

### Requirement 2

**User Story:** As a platform user, I want the system to prevent report abuse, so that the reporting feature cannot be weaponized against innocent users.

#### Acceptance Criteria

1. THE Moderation System SHALL enforce a rate limit of 10 reports per user per 24 hours across all report types (posts, comments, tracks, users)
2. WHEN a user exceeds the report rate limit, THE Moderation System SHALL display an error message indicating how many hours until they can report again
3. THE Moderation System SHALL prevent duplicate reports by checking if the same user has reported the same target (post, comment, track, or user) within the last 24 hours
4. WHEN a user attempts to submit a duplicate report for any content type, THE Moderation System SHALL display an error message stating "You have already reported this [content type] recently. Please wait 24 hours before reporting again."
5. THE Moderation System SHALL check for duplicates using reporter_id, report_type, and target_id combination
6. THE Moderation System SHALL apply duplicate detection to all report types: posts, comments, tracks, and users
7. THE Moderation System SHALL prevent users from reporting admin accounts (applies only to user profile reports)
8. WHEN a user attempts to report an admin account, THE Moderation System SHALL display an error message stating "This account cannot be reported"
9. THE Moderation System SHALL log all failed report attempts (rate limit, duplicate, admin protection) to the security_events table for monitoring
10. THE Moderation System SHALL include the report_type and target_id in duplicate detection security event logs

### Requirement 3

**User Story:** As a platform user, I want my identity to remain anonymous when reporting profiles, so that I can report violations without fear of retaliation.

#### Acceptance Criteria

1. WHEN a user submits a profile report, THE User Profile Flagging System SHALL store the reporter_id in the moderation_reports table
2. WHEN a reported user views their own profile, THE User Profile Flagging System SHALL NOT display any indication that they have been reported
3. WHEN a reported user receives a moderation action notification, THE User Profile Flagging System SHALL NOT include the reporter's identity in the notification
4. WHEN a moderator views a profile report in the moderation queue, THE User Profile Flagging System SHALL display the reporter's username to the moderator
5. THE User Profile Flagging System SHALL maintain reporter anonymity at the application level, not just the UI level

### Requirement 4

**User Story:** As a moderator, I want profile reports to appear in the existing moderation queue, so that I can review them alongside other reports without learning a new interface.

#### Acceptance Criteria

1. WHEN a user submits a profile report, THE User Profile Flagging System SHALL create a record in the existing moderation_reports table with report_type='user'
2. WHEN a moderator accesses the moderation queue, THE User Profile Flagging System SHALL display profile reports alongside post, comment, and track reports
3. WHEN a moderator views a profile report, THE User Profile Flagging System SHALL display the reported user's profile information (username, profile picture, bio, join date)
4. WHEN a moderator views a profile report, THE User Profile Flagging System SHALL display the report reason and description
5. WHEN a moderator takes action on a profile report, THE User Profile Flagging System SHALL use the existing moderation action workflow (warn, suspend, restrict, ban)
6. THE User Profile Flagging System SHALL calculate priority for profile reports using the same priority map as other report types

### Requirement 5

**User Story:** As a developer, I want the profile flagging system to integrate seamlessly with existing code, so that we minimize code duplication and maintain consistency.

#### Acceptance Criteria

1. THE User Profile Flagging System SHALL use the existing ReportButton component without modification
2. THE User Profile Flagging System SHALL use the existing ModeratorFlagButton component without modification
3. THE User Profile Flagging System SHALL use the existing ReportModal component without modification
4. THE User Profile Flagging System SHALL use the existing ModeratorFlagModal component without modification
5. THE User Profile Flagging System SHALL use the existing submitReport() and moderatorFlagContent() functions from moderationService.ts
6. THE User Profile Flagging System SHALL use the existing rate limiting logic from moderationService.ts
7. THE User Profile Flagging System SHALL use the existing moderation_reports table without schema changes
8. THE User Profile Flagging System SHALL use the existing RLS policies for moderation_reports
9. THE User Profile Flagging System SHALL add only the necessary UI integration (import and render buttons in CreatorProfileHeader)
10. THE User Profile Flagging System SHALL follow the same pattern as UserProfile component for button placement and styling

### Requirement 6

**User Story:** As a platform administrator, I want comprehensive logging of report attempts across all content types, so that I can identify abuse patterns and bad actors.

#### Acceptance Criteria

1. WHEN a user successfully submits any report (post, comment, track, or user), THE Moderation System SHALL log the event with reporter_id, target_id, report_type, reason, and timestamp
2. WHEN a user's report is blocked by rate limiting, THE Moderation System SHALL log the event to security_events with event_type='rate_limit_exceeded' and include report_type in details
3. WHEN a user attempts to submit a duplicate report for any content type, THE Moderation System SHALL log the event to security_events with event_type='duplicate_report_attempt' and include report_type and target_id in details
4. WHEN a user attempts to report an admin account, THE Moderation System SHALL log the event to security_events with event_type='admin_report_attempt'
5. THE Moderation System SHALL include user_agent and IP address in security event logs (if available)
6. THE Moderation System SHALL allow admins to query security_events to identify users who frequently trigger abuse prevention measures
7. THE Moderation System SHALL include the specific content type (post, comment, track, user) in all security event logs for duplicate detection

### Requirement 7

**User Story:** As a moderator, I want to see profile-specific context when reviewing reports, so that I can make informed moderation decisions without overwhelming the UI.

#### Acceptance Criteria

1. WHEN a moderator clicks on a profile report in the queue, THE User Profile Flagging System SHALL open the existing ModerationActionPanel component
2. WHEN the ModerationActionPanel displays a profile report (report_type='user'), THE User Profile Flagging System SHALL show a Profile Context section with the reported user's username, avatar, bio, and join date
3. WHEN the ModerationActionPanel displays a profile report, THE User Profile Flagging System SHALL show the reported user's account age (e.g., "Member for 3 months") in the Profile Context section
4. WHEN the ModerationActionPanel displays a profile report, THE User Profile Flagging System SHALL show a collapsible "Moderation History" section that displays previous warnings, suspensions, and restrictions when expanded
5. WHEN the ModerationActionPanel displays a profile report, THE User Profile Flagging System SHALL show a badge indicating the number of reports received in the last 30 days (e.g., "3 reports in last 30 days")
6. THE User Profile Flagging System SHALL use the existing action buttons in ModerationActionPanel (Warn User, Suspend User, Apply Restriction, Ban User) without adding new buttons
7. THE User Profile Flagging System SHALL display profile-specific context in a compact, scannable format to avoid cluttering the panel
8. THE User Profile Flagging System SHALL use the same layout and styling as other report types in ModerationActionPanel for consistency
9. THE User Profile Flagging System SHALL load profile context data asynchronously to avoid blocking the panel from opening
10. THE User Profile Flagging System SHALL display profile reports with the same priority and filtering options as other report types in the moderation queue

### Requirement 8

**User Story:** As a platform user, I want clear feedback when reporting any content, so that I understand what happens after I submit a report.

#### Acceptance Criteria

1. WHEN a user successfully submits any report (post, comment, track, or user), THE Moderation System SHALL display a success toast message stating "Report submitted successfully. Our moderation team will review it shortly."
2. WHEN a user's report fails due to rate limiting, THE Moderation System SHALL display an error toast message with the exact time until they can report again
3. WHEN a user attempts a duplicate report for any content type, THE Moderation System SHALL display an error toast message stating "You have already reported this [content type] recently. Please wait 24 hours before reporting again."
4. WHEN a user attempts to report an admin account, THE Moderation System SHALL display an error toast message stating "This account cannot be reported."
5. WHEN a user attempts to report their own profile, THE Moderation System SHALL display an error toast message stating "You cannot report your own profile."
6. WHEN a user attempts to report their own content (post, comment, or track), THE Moderation System SHALL display an error toast message stating "You cannot report your own [content type]."
7. THE Moderation System SHALL provide consistent error messaging across all report types (posts, comments, tracks, users)
8. THE Moderation System SHALL use the same error message format for duplicate detection across all content types

### Requirement 9

**User Story:** As a developer, I want the moderation system to be testable across all content types, so that we can ensure it works correctly and prevent regressions.

#### Acceptance Criteria

1. THE Moderation System SHALL provide unit tests for the report button component
2. THE Moderation System SHALL provide unit tests for rate limiting logic across all report types
3. THE Moderation System SHALL provide unit tests for duplicate detection logic for posts, comments, tracks, and users
4. THE Moderation System SHALL provide unit tests for admin protection logic
5. THE Moderation System SHALL provide integration tests for the complete report submission flow for all content types
6. THE Moderation System SHALL provide property-based tests for abuse prevention mechanisms (rate limiting, duplicate detection)
7. THE Moderation System SHALL test duplicate detection with various combinations of reporter_id, report_type, and target_id
8. THE Moderation System SHALL achieve 90%+ code coverage for new components and functions
9. THE Moderation System SHALL test that duplicate detection works independently for each content type (reporting a post doesn't prevent reporting a comment)

### Requirement 10

**User Story:** As a platform user, I want to be prevented from spamming duplicate reports across all content types, so that the moderation queue remains manageable and focused on unique violations.

#### Acceptance Criteria

1. THE Moderation System SHALL implement a checkDuplicateReport() function that queries moderation_reports for existing reports
2. THE Moderation System SHALL check for duplicates using the combination of reporter_id, report_type, and target_id
3. THE Moderation System SHALL consider a report duplicate if created within the last 24 hours
4. THE Moderation System SHALL apply duplicate detection before rate limit checking (fail fast on duplicates)
5. THE Moderation System SHALL allow the same user to report different content types with the same target_id (e.g., report both a user's post and their profile)
6. THE Moderation System SHALL allow the same user to report the same target after 24 hours have passed
7. THE Moderation System SHALL throw a ModerationError with code MODERATION_ERROR_CODES.VALIDATION_ERROR when duplicate detected
8. THE Moderation System SHALL include the original report timestamp in the duplicate error details
9. THE Moderation System SHALL apply duplicate detection to both submitReport() and moderatorFlagContent() functions
10. THE Moderation System SHALL ensure duplicate detection works correctly across all four report types: post, comment, track, user

### Requirement 11

**User Story:** As a platform user, I want the report and flag buttons to be easily accessible but not intrusive, so that I can report violations without cluttering the UI.

#### Acceptance Criteria

1. WHEN a user views a creator profile, THE User Profile Flagging System SHALL display the report/flag buttons in the CreatorProfileHeader component next to the Follow button
2. THE User Profile Flagging System SHALL position the buttons in a flex container with gap-2 spacing, matching the UserProfile component pattern
3. THE User Profile Flagging System SHALL use iconOnly={false} for both buttons to show icon and text labels
4. WHEN a user hovers over the report button, THE User Profile Flagging System SHALL display a tooltip stating "Report this profile"
5. WHEN a moderator hovers over the flag button, THE User Profile Flagging System SHALL display a tooltip stating "Flag for moderation"
6. THE User Profile Flagging System SHALL hide both buttons when viewing your own profile
7. THE User Profile Flagging System SHALL display the report button for all authenticated users (except when viewing own profile)
8. THE User Profile Flagging System SHALL display the flag button only for moderators and admins
9. THE User Profile Flagging System SHALL ensure both buttons are accessible via keyboard navigation (tab order, enter to activate)
10. THE User Profile Flagging System SHALL place the buttons in the same location as the Follow button section for visual consistency

### Requirement 12

**User Story:** As a developer, I want duplicate detection to be implemented efficiently, so that it doesn't impact report submission performance.

#### Acceptance Criteria

1. THE Moderation System SHALL use a database index on (reporter_id, report_type, target_id, created_at) for efficient duplicate detection queries
2. THE Moderation System SHALL limit duplicate detection queries to the last 24 hours using created_at >= (now() - interval '24 hours')
3. THE Moderation System SHALL use .maybeSingle() instead of .single() to handle cases where no duplicate exists
4. THE Moderation System SHALL complete duplicate detection checks in under 50ms on average
5. THE Moderation System SHALL cache duplicate detection results for 5 minutes to reduce database load for repeated attempts
6. THE Moderation System SHALL ensure duplicate detection queries use the existing idx_moderation_reports_reporter index
7. THE Moderation System SHALL log slow duplicate detection queries (>100ms) for performance monitoring
