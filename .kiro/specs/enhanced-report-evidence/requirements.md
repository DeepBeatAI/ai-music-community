# Requirements Document

## Introduction

This document defines the requirements for enhancing the existing Moderation System with improved report evidence collection and contextual information. The system will help moderators make better decisions by requiring specific evidence for certain violation types, providing better context about reporters and targets, and reducing false positives through improved reporting quality.

This feature builds upon the existing moderation system (`.kiro/specs/moderation-system/`) and reuses its infrastructure including the `moderation_reports` table, `ReportModal` component, `ModerationQueue` component, and `ModerationActionPanel` component.

## Glossary

- **Report Evidence**: Additional information provided by reporters to support their claim (links, timestamps, descriptions)
- **Reporter History**: Track record of a reporter's past reports and their accuracy
- **Target Violation History**: Record of past moderation actions taken against a user or content
- **Related Reports**: Other reports about the same content or user
- **Report Accuracy Rate**: Percentage of a reporter's reports that resulted in moderation action
- **Copyright Claim**: Report alleging unauthorized use of copyrighted material
- **Timestamp Evidence**: Specific time marker in audio/video content where violation occurs
- **Evidence Field**: Optional input field for providing supporting evidence
- **Report Quality**: Measure of how well a report provides actionable information
- **False Positive**: Report that did not result in moderation action (dismissed)
- **Context Panel**: UI section showing additional information to help moderation decisions

## Requirements

### Requirement 1

**User Story:** As a user reporting copyright violations, I want to provide evidence of the original work, so that moderators can verify my claim and take appropriate action.

#### Acceptance Criteria

1. WHEN a user selects "Copyright Violation" as the report reason, THE System SHALL display an optional "Link to Original Work" text field
2. WHEN a user selects "Copyright Violation" as the report reason, THE System SHALL display an optional "Proof of Ownership" text field
3. THE System SHALL display a UI hint: "Providing evidence helps moderators process your report faster"
4. WHEN a user submits a copyright report with evidence, THE System SHALL store the evidence in the report metadata
5. WHEN a user submits a copyright report without evidence, THE System SHALL still accept the report but mark it as having no evidence
6. THE System SHALL validate URL format for "Link to Original Work" field if provided
7. THE System SHALL limit "Proof of Ownership" field to 500 characters

### Requirement 2

**User Story:** As a user reporting audio content violations, I want to provide specific timestamps where violations occur, so that moderators can quickly locate and verify the issue.

#### Acceptance Criteria

1. WHEN a user reports a track with reason "Hate Speech", "Harassment", or "Inappropriate Content", THE System SHALL display an optional "Timestamp in Audio" field
2. THE System SHALL accept timestamp format as MM:SS or HH:MM:SS (e.g., "2:35" or "1:23:45")
3. THE System SHALL display a UI hint: "Help moderators find the violation quickly (e.g., 2:35)"
4. WHEN a user provides a timestamp, THE System SHALL validate the format before submission
5. WHEN a user submits a report with timestamp, THE System SHALL store it in the report metadata
6. THE System SHALL allow multiple timestamps separated by commas (e.g., "2:35, 5:12, 8:45")
7. WHEN a timestamp is provided, THE System SHALL display it prominently in the moderation queue

### Requirement 3

**User Story:** As a user submitting any report, I want clear guidance on what makes a good report, so that I can provide useful information to moderators.

#### Acceptance Criteria

1. THE System SHALL expand the description field with better prompts based on report reason
2. WHEN a user selects "Spam or Misleading Content", THE System SHALL show prompt: "Describe what makes this spam or misleading"
3. WHEN a user selects "Harassment or Bullying", THE System SHALL show prompt: "Describe the harassing behavior and its impact"
4. WHEN a user selects "Hate Speech", THE System SHALL show prompt: "Describe the hate speech and who it targets"
5. WHEN a user selects "Inappropriate Content", THE System SHALL show prompt: "Describe why this content is inappropriate"
6. THE System SHALL enforce a minimum character count of 20 characters for the description field
7. THE System SHALL display character count indicator showing "X / 1000 characters (minimum 20)"
8. WHEN a user attempts to submit with less than 20 characters, THE System SHALL display an error: "Please provide at least 20 characters describing the violation"

### Requirement 4

**User Story:** As a user learning to report effectively, I want to see examples of good and bad reports, so that I can improve my reporting quality.

#### Acceptance Criteria

1. THE System SHALL display a "Reporting Tips" section in the report modal
2. THE System SHALL show examples of good reports: "Good: 'User posted spam links to external sites in 5 consecutive comments (2:35 PM - 2:40 PM)'"
3. THE System SHALL show examples of bad reports: "Bad: 'This is spam' or 'I don't like this'"
4. THE System SHALL display tips as collapsible section to avoid cluttering the modal
5. WHEN a user expands the tips section, THE System SHALL show 2-3 examples relevant to the selected reason
6. THE System SHALL update examples dynamically based on the selected report reason
7. THE System SHALL include a tip about providing evidence for copyright claims

### Requirement 4.5

**User Story:** As a moderator using the flag system, I want the same evidence collection and quality improvements, so that my flags are as detailed and actionable as user reports.

#### Acceptance Criteria

1. THE System SHALL extend the ModeratorFlagModal with the same evidence fields as the ReportModal
2. WHEN a moderator selects "Copyright Violation", THE System SHALL display optional "Link to Original Work" and "Proof of Ownership" fields
3. WHEN a moderator flags a track with "Hate Speech", "Harassment", or "Inappropriate Content", THE System SHALL display optional "Timestamp in Audio" field
4. THE System SHALL maintain the existing 10-character minimum for the internal notes field (moderators are expected to provide more context than regular users)
5. THE System SHALL display the same "Reporting Tips" section adapted for moderators (collapsible, with moderator-specific examples)
6. THE System SHALL store moderator flag evidence in the same metadata structure as user reports
7. THE System SHALL display moderator flag evidence with the same badges and prominence as user report evidence

### Requirement 5

**User Story:** As a moderator reviewing reports, I want to see the reporter's history and accuracy rate in the report card, so that I can quickly assess the reliability of the report without opening the full action panel.

#### Acceptance Criteria

1. WHEN a moderator views a report card in the queue, THE System SHALL display the reporter's total report count
2. WHEN a moderator views a report card in the queue, THE System SHALL calculate and display the reporter's accuracy rate
3. THE System SHALL calculate accuracy rate as: ((total reports - dismissed reports) / total reports) * 100
4. THE System SHALL display accuracy rate with color coding: Green (>80%), Yellow (50-80%), Red (<50%)
5. THE System SHALL display a "Trusted Reporter" badge if accuracy rate is >90% and total reports >10
6. THE System SHALL display a "Low Accuracy" warning badge if accuracy rate is <30% and total reports >5
7. WHEN a moderator hovers over the accuracy rate, THE System SHALL show a tooltip with detailed breakdown: total reports, resolved reports, dismissed reports

### Requirement 6

**User Story:** As a moderator reviewing reports, I want enhanced violation history context in the existing User Violation History section, so that I can better identify patterns and repeat offenders.

#### Acceptance Criteria

1. THE System SHALL enhance the existing "User Violation History" section in the ModerationActionPanel with additional context
2. WHEN a target user has 3+ violations in the past 30 days, THE System SHALL display a "Repeat Offender" warning badge prominently
3. WHEN a target user has violations of the same type as the current report, THE System SHALL highlight those violations
4. THE System SHALL display a timeline indicator showing the frequency of violations (e.g., "3 violations in last 7 days")
5. THE System SHALL calculate and display a "violation trend" indicator: Increasing, Stable, or Decreasing
6. WHEN displaying recent actions, THE System SHALL show if any were reversed and why
7. THE System SHALL maintain backward compatibility with the existing User Violation History display

### Requirement 7

**User Story:** As a moderator reviewing reports, I want to see related reports about the same content or user in the action panel, so that I can identify patterns and coordinated violations.

#### Acceptance Criteria

1. WHEN a moderator views a report in the ModerationActionPanel, THE System SHALL display a "Related Reports" section
2. THE System SHALL search for other reports about the same target_id (same content)
3. THE System SHALL search for other reports about the same reported_user_id (same user)
4. THE System SHALL display up to 5 most recent related reports
5. THE System SHALL display each related report with: date, reason, status, and reporter username
6. WHEN multiple users report the same content, THE System SHALL display a "Multiple Reports" badge with count on the report card
7. WHEN the same user has been reported multiple times in 24 hours, THE System SHALL display a "Multiple Reports Today" warning badge on the report card

### Requirement 8

**User Story:** As a moderator, I want evidence fields to be prominently displayed in the moderation queue, so that I can quickly assess report quality without opening each report.

#### Acceptance Criteria

1. WHEN a report contains copyright evidence (link or proof), THE System SHALL display a "📎 Evidence Provided" badge on the report card
2. WHEN a report contains timestamp evidence, THE System SHALL display the timestamp on the report card (e.g., "🕐 2:35")
3. WHEN a report has a description longer than 100 characters, THE System SHALL display a "📝 Detailed Report" badge
4. THE System SHALL display evidence badges with distinct colors: Copyright (blue), Timestamp (orange), Detailed (green)
5. WHEN a moderator hovers over an evidence badge, THE System SHALL show a tooltip with the evidence preview
6. THE System SHALL sort reports with evidence higher in the queue (within same priority level)
7. WHEN filtering reports, THE System SHALL allow filtering by "Has Evidence" checkbox

### Requirement 9

**User Story:** As a moderator reviewing a copyright claim, I want to see the provided evidence prominently, so that I can quickly verify the claim.

#### Acceptance Criteria

1. WHEN a moderator opens a copyright report in the ModerationActionPanel, THE System SHALL display a "Copyright Evidence" section at the top
2. WHEN a link to original work is provided, THE System SHALL display it as a clickable link with preview
3. WHEN proof of ownership is provided, THE System SHALL display the full text in a highlighted box
4. WHEN no evidence is provided, THE System SHALL display a warning: "⚠️ No evidence provided - verification may be difficult"
5. THE System SHALL display a "Verify Evidence" button that opens the original work link in a new tab
6. THE System SHALL allow moderators to add internal notes about evidence verification
7. THE System SHALL track whether evidence was verified before taking action

### Requirement 10

**User Story:** As a moderator reviewing an audio content report, I want to jump directly to the reported timestamp, so that I can quickly verify the violation.

#### Acceptance Criteria

1. WHEN a moderator opens a track report with timestamp in the ModerationActionPanel, THE System SHALL display an audio player
2. THE System SHALL display a "Jump to Timestamp" button for each provided timestamp
3. WHEN a moderator clicks "Jump to Timestamp", THE System SHALL seek the audio player to that exact time
4. THE System SHALL highlight the timestamp in the evidence section when the player reaches it
5. WHEN multiple timestamps are provided, THE System SHALL display them as a list of clickable buttons
6. THE System SHALL display timestamps in chronological order
7. THE System SHALL allow moderators to add notes about what they found at each timestamp

### Requirement 11

**User Story:** As a platform administrator, I want to track report quality metrics in the existing Metrics tab, so that I can identify areas for improvement in the reporting system.

#### Acceptance Criteria

1. THE System SHALL add a "Report Quality" section to the existing Metrics tab
2. THE System SHALL calculate average report quality score based on: evidence provided (40%), description length (30%), and accuracy (30%)
3. THE System SHALL display: Average Quality Score, % Reports with Evidence, % Reports with Detailed Description (>100 chars)
4. THE System SHALL display a breakdown showing which report reasons have the highest quality scores
5. THE System SHALL display a breakdown showing which report reasons have the lowest quality scores
6. THE System SHALL display trends over time for report quality improvements (requires date range filter)
7. THE System SHALL integrate seamlessly with existing metrics display and filtering

### Requirement 12

**User Story:** As a platform administrator, I want to identify and educate users who submit low-quality reports, so that I can improve overall report quality.

#### Acceptance Criteria

1. WHEN a user's accuracy rate falls below 20% after 10+ reports, THE System SHALL flag them as "Needs Education"
2. THE System SHALL send an automated notification to flagged users with reporting tips and guidelines
3. THE System SHALL display a "Reporting Guidelines" link in the notification
4. WHEN a flagged user submits their next report, THE System SHALL display an educational banner with tips
5. THE System SHALL track whether educational interventions improve user accuracy rates
6. THE System SHALL allow moderators to manually send reporting guidelines to specific users
7. THE System SHALL remove the "Needs Education" flag when accuracy improves above 40%

### Requirement 13

**User Story:** As a moderator, I want the system to leverage existing moderation infrastructure, so that new features integrate seamlessly without duplication.

#### Acceptance Criteria

1. THE System SHALL reuse the existing `moderation_reports` table and add evidence fields to the metadata JSONB column
2. THE System SHALL reuse the existing `ReportModal` component and extend it with conditional evidence fields
3. THE System SHALL reuse the existing `ModerationQueue` component and add evidence badges
4. THE System SHALL reuse the existing `ModerationActionPanel` component and add context sections
5. THE System SHALL reuse the existing `moderationService.ts` and add evidence validation functions
6. THE System SHALL maintain backward compatibility with existing reports that have no evidence
7. THE System SHALL not modify existing database schema except adding indexes for performance

### Requirement 14

**User Story:** As a developer, I want comprehensive documentation of evidence field formats, so that I can maintain and extend the system correctly.

#### Acceptance Criteria

1. THE System SHALL document the metadata JSONB structure for evidence fields
2. THE System SHALL document timestamp format validation rules
3. THE System SHALL document URL validation rules for copyright links
4. THE System SHALL document character limits for all evidence fields
5. THE System SHALL document how evidence affects report priority and sorting
6. THE System SHALL document how to add new evidence field types in the future
7. THE System SHALL include code examples for accessing evidence in moderation components

