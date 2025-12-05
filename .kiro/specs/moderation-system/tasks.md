# Implementation Plan

## Overview

This implementation plan breaks down the moderation system into discrete, manageable tasks. Each task builds incrementally on previous work, with testing integrated throughout. The plan follows an implementation-first approach: build features before writing tests.

## Task List

- [x] 1. Database Setup





- [x] 1.1 Create moderation tables migration


  - Create migration file: `supabase/migrations/[timestamp]_create_moderation_tables.sql`
  - Implement moderation_reports table with all constraints and indexes
  - Implement moderation_actions table with all constraints and indexes
  - Implement user_restrictions table with unique constraint for active restrictions
  - Add suspended_until and suspension_reason columns to user_profiles
  - _Requirements: 1.1, 2.1, 5.1, 6.1, 12.3_

- [x] 1.2 Create database helper functions


  - Implement can_user_post(p_user_id UUID) function
  - Implement can_user_comment(p_user_id UUID) function
  - Implement can_user_upload(p_user_id UUID) function
  - Implement get_user_restrictions(p_user_id UUID) function
  - Implement expire_restrictions() function
  - Implement expire_suspensions() function
  - _Requirements: 6.1, 6.2, 6.3, 6.7, 12.3_

- [x] 1.3 Create RLS policies for moderation tables


  - Implement RLS policies for moderation_reports (users can create/view own, moderators can view/update all)
  - Implement RLS policies for moderation_actions (moderators can create/view, users can view own)
  - Implement RLS policies for user_restrictions (users can view own, moderators can manage)
  - Enable RLS on all three tables
  - _Requirements: 11.2, 11.3_

- [x] 1.4 Test database setup


  - Verify tables created with correct schema
  - Verify constraints work (CHECK, UNIQUE, FOREIGN KEY)
  - Verify indexes created
  - Verify RLS policies prevent unauthorized access
  - Verify helper functions return correct results
  - _Requirements: 1.1, 6.1, 11.2_

- [x] 2. TypeScript Types and Interfaces






- [x] 2.1 Create moderation type definitions

  - Create `client/src/types/moderation.ts`
  - Define Report, ReportParams, ModeratorFlagParams interfaces
  - Define ModerationAction, ModerationActionParams interfaces
  - Define UserRestriction interface
  - Define QueueFilters interface
  - Define error codes and ModerationError class
  - _Requirements: 1.1, 2.1, 5.1, 6.1_

- [-] 3. Moderation Service Layer


- [x] 3.1 Create moderationService.ts foundation


  - Create `client/src/lib/moderationService.ts`
  - Implement error handling utilities
  - Implement priority calculation logic
  - Set up Supabase client imports
  - _Requirements: 1.1, 1.4_

- [x] 3.2 Implement user reporting functions


  - Implement submitReport(params: ReportParams)
  - Implement rate limit checking (10 reports per 24 hours)
  - Implement reported user ID lookup logic
  - Implement automatic priority calculation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3.3 Write property test for report creation


  - **Property 1: Report Creation Validity**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 3.4 Write property test for rate limiting



  - **Property 2: Rate Limit Enforcement**
  - **Validates: Requirements 1.6, 1.7**

- [x] 3.5 Implement moderator flagging functions


  - Implement moderatorFlagContent(params: ModeratorFlagParams)
  - Implement moderator role verification
  - Implement automatic status setting to "under_review"
  - Implement moderator_flagged flag setting
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [x] 3.6 Write property test for moderator flags


  - **Property 3: Moderator Flag Priority**
  - **Validates: Requirements 2.3, 2.4, 2.6**

- [x] 3.7 Implement moderation queue functions


  - Implement fetchModerationQueue(filters: QueueFilters)
  - Implement filtering by status, priority, moderator_flagged
  - Implement sorting by priority and date
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.8 Write property test for queue ordering


  - **Property 11: Queue Ordering**
  - **Validates: Requirements 4.1, 4.4**

- [x] 3.9 Implement moderation action functions


  - Implement takeModerationAction(params: ModerationActionParams)
  - Implement executeAction() helper for different action types
  - Implement report status update logic
  - Integrate with existing suspendUser() from adminService
  - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 12.1, 12.2_

- [x] 3.10 Write property test for action authorization



  - **Property 4: Authorization Check Consistency**
  - **Validates: Requirements 11.1, 11.2**


- [x] 3.11 Write property test for report status transitions

  - **Property 8: Report Status Transition**
  - **Validates: Requirements 5.6, 5.7**

- [x] 3.12 Implement restriction management functions


  - Implement applyRestriction(userId, restrictionType, reason, durationDays?)
  - Implement checkUserRestrictions(userId)
  - Implement removeContent() helper
  - _Requirements: 5.2, 5.4, 6.1, 6.2, 6.3, 6.4_

- [x] 3.13 Write property test for restriction enforcement


  - **Property 5: Restriction Enforcement**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**


- [x] 3.14 Write property test for restriction expiration

  - **Property 6: Time-Based Restriction Expiration**
  - **Validates: Requirements 6.7**

- [x] 3.15 Write property test for action-restriction link



  - **Property 7: Action Creates Restriction**
  - **Validates: Requirements 5.2, 5.4**

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. User Reporting UI Components




- [x] 5.1 Create ReportModal component


  - Create `client/src/components/moderation/ReportModal.tsx`
  - Implement modal overlay and form
  - Implement reason dropdown with all categories
  - Implement optional description textarea (1000 char limit)
  - Implement form validation
  - Implement loading states
  - Implement success/error toast notifications
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 5.2 Create ReportButton component


  - Create `client/src/components/moderation/ReportButton.tsx`
  - Implement report button (🚩 icon)
  - Implement click handler to open ReportModal
  - Pass content type and ID to modal
  - _Requirements: 1.1_

- [x] 5.3 Integrate report buttons into content components


  - Add ReportButton to post components
  - Add ReportButton to comment components
  - Add ReportButton to track components
  - Ensure buttons are visible to all authenticated users
  - _Requirements: 1.1_

- [x] 5.4 Write unit tests for reporting UI


  - Test ReportModal form validation
  - Test ReportModal submission flow
  - Test ReportButton visibility
  - Test error handling and toast notifications
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Moderator Flagging UI Components







- [x] 6.1 Create ModeratorFlagModal component


  - Create `client/src/components/moderation/ModeratorFlagModal.tsx`
  - Implement simplified modal for moderators
  - Implement reason dropdown
  - Implement required internal notes field
  - Implement priority selector (P1-P5)
  - Implement "Moderator Flag" indicator
  - _Requirements: 2.1, 2.2_

- [x] 6.2 Create ModeratorFlagButton component


  - Create `client/src/components/moderation/ModeratorFlagButton.tsx`
  - Implement flag button (⚠️ icon) visible only to moderators/admins
  - Implement role check using user_roles
  - Implement click handler to open ModeratorFlagModal
  - _Requirements: 2.1, 2.2_

- [x] 6.3 Integrate flag buttons into content components


  - Add ModeratorFlagButton to post components
  - Add ModeratorFlagButton to comment components
  - Add ModeratorFlagButton to track components
  - Add ModeratorFlagButton to user profile pages
  - _Requirements: 2.1, 2.5_

- [x] 6.4 Write unit tests for moderator flagging UI






  - Test ModeratorFlagModal visibility based on role
  - Test ModeratorFlagButton only shows for moderators
  - Test flag submission flow
  - _Requirements: 2.1, 2.2_

- [x] 7. Navigation Integration






- [x] 7.1 Add Moderation link to avatar dropdown


  - Locate avatar dropdown component (likely in Header or Navigation)
  - Add role check for moderator or admin
  - Add "Moderation" menu item (🛡️ icon) visible only to moderators/admins
  - Link to `/moderation` route
  - Ensure existing "Admin Dashboard" link remains admin-only
  - _Requirements: 3.4, 3.5_


- [x] 7.2 Create moderation page route

  - Create `client/src/app/moderation/page.tsx`
  - Implement access control check (moderator or admin role required)
  - Implement redirect for non-moderators
  - Create basic page layout with tab navigation
  - _Requirements: 3.1, 3.2, 3.3_


- [x] 7.3 Write unit tests for navigation


  - Test Moderation link only shows for moderators/admins
  - Test Admin link only shows for admins
  - Test moderation page redirects non-moderators
  - _Requirements: 3.2, 3.4, 3.5_

- [x] 8. Moderation Dashboard - Queue Tab




- [x] 8.1 Create ModerationQueue component




  - Create `client/src/components/moderation/ModerationQueue.tsx`
  - Implement report list display
  - Implement filter controls (status, priority, source)
  - Implement sort controls
  - Implement pagination
  - Display "Moderator Flag" badge for moderator-flagged reports
  - Display priority badges (color-coded P1-P5)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_


- [x] 8.2 Create ReportCard component

  - Create `client/src/components/moderation/ReportCard.tsx`
  - Display report metadata (type, reason, date, priority)
  - Display reporter info (anonymous for users, identified for moderators)
  - Display reported content preview
  - Display action buttons
  - Implement loading and empty states
  - _Requirements: 4.6, 4.7, 4.8_


- [x] 8.3 Integrate Queue tab into moderation page

  - Add Queue tab to moderation page
  - Set as default tab
  - Connect to fetchModerationQueue service
  - Implement real-time updates (optional)
  - _Requirements: 3.3, 4.1_


- [x] 8.4 Write unit tests for queue components

  - Test ModerationQueue filtering
  - Test ModerationQueue sorting
  - Test ReportCard display
  - Test pagination
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Moderation Dashboard - Action Panel




- [x] 9.1 Create ModerationActionPanel component


  - Create `client/src/components/moderation/ModerationActionPanel.tsx`
  - Display full report details
  - Display reported content in context
  - Display user history (past violations)
  - Implement action buttons (Dismiss, Remove Content, Warn, Suspend, Restrict, Ban)
  - Implement duration picker for suspensions (1/7/30 days)
  - Implement restriction type selector
  - Implement internal notes textarea
  - Implement user notification message textarea
  - Implement confirmation dialogs for destructive actions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8_


- [x] 9.2 Integrate action panel with queue

  - Add action panel as modal or side panel
  - Connect to takeModerationAction service
  - Implement success/error handling
  - Refresh queue after action taken
  - _Requirements: 5.6, 5.7_


- [x] 9.3 Write unit tests for action panel

  - Test action buttons display correctly
  - Test admin-only actions (ban) hidden from moderators
  - Test confirmation dialogs
  - Test form validation
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 10. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Moderation Dashboard - Action Logs Tab




- [x] 11.1 Create ModerationLogs component


  - Create `client/src/components/moderation/ModerationLogs.tsx`
  - Display table of recent moderation actions (last 100)
  - Implement filter controls (action type, moderator, date range, target user)
  - Implement search by user ID or content ID
  - Implement pagination
  - Display action details (moderator, target, type, reason, timestamp)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_


- [x] 11.2 Implement CSV export functionality


  - Add export button to logs tab
  - Implement CSV generation from action logs
  - Restrict to admin users only
  - _Requirements: 8.5_


- [x] 11.3 Integrate logs tab into moderation page

  - Add Action Logs tab to moderation page
  - Connect to moderation_actions table query
  - _Requirements: 3.3, 8.1_

- [x] 11.4 Write unit tests for logs components


  - Test ModerationLogs filtering
  - Test search functionality
  - Test CSV export (admin only)
  - Test pagination
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 11.5 Write property test for audit trail


  - **Property 9: Audit Trail Completeness**
  - **Validates: Requirements 10.1, 10.2**

- [x] 12. Moderation Dashboard - Metrics Tab


- [x] 12.1 Create ModerationMetrics component




  - Create `client/src/components/moderation/ModerationMetrics.tsx`
  - Display reports received (today/week/month)
  - Display reports resolved counts
  - Display average resolution time
  - Display actions by type (pie chart or bar chart)
  - Display top reasons for reports
  - Display moderator performance comparison (admin only)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 12.2 Implement metrics calculation functions




  - Create helper functions to calculate metrics from database
  - Implement date range filtering
  - Implement SLA compliance calculation
  - _Requirements: 9.1, 9.2, 9.6, 9.7_

- [x] 12.3 Integrate metrics tab into moderation page




  - Add Metrics tab to moderation page
  - Connect to metrics calculation functions
  - Implement auto-refresh (optional)
  - _Requirements: 3.3, 9.1_

- [x] 12.4 Write unit tests for metrics components





  - Test metrics calculations
  - Test admin-only sections
  - Test date range filtering
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 13. Moderation Dashboard - Settings Tab




- [x] 13.1 Create ModerationSettings component


  - Create `client/src/components/moderation/ModerationSettings.tsx`
  - Implement notification preferences
  - Implement queue display options
  - Implement quick action templates (optional)
  - Save settings to user preferences or local storage
  - _Requirements: 3.3_

- [x] 13.2 Integrate settings tab into moderation page


  - Add Settings tab to moderation page
  - Connect to settings storage
  - _Requirements: 3.3_

- [x] 14. Notification System Integration



- [x] 14.1 Create moderation notification templates


  - Create notification templates for content removal
  - Create notification templates for suspensions
  - Create notification templates for warnings
  - Create notification templates for restrictions
  - Create notification templates for suspension expiration
  - Include appeal information (placeholder for future)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_

- [x] 14.2 Implement notification sending function


  - Create sendModerationNotification() function
  - Integrate with existing notification system
  - Implement notification title generation
  - Implement notification message formatting
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14.3 Integrate notifications with moderation actions


  - Call sendModerationNotification() after each action
  - Update notification_sent flag in moderation_actions
  - Handle notification failures gracefully
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 14.4 Write property test for notification delivery


  - **Property 10: Notification Delivery**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**



- [x] 14.5 Write unit tests for notifications

  - Test notification template generation
  - Test notification sending
  - Test error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 15. Restriction Enforcement at API Endpoints





- [x] 15.1 Add restriction checks to post creation endpoint

  - Locate post creation API endpoint
  - Add call to can_user_post() before allowing post creation
  - Return appropriate error message if restricted
  - _Requirements: 6.1, 6.6_


- [x] 15.2 Add restriction checks to comment creation endpoint

  - Locate comment creation API endpoint
  - Add call to can_user_comment() before allowing comment creation
  - Return appropriate error message if restricted
  - _Requirements: 6.2, 6.6_

- [x] 15.3 Add restriction checks to track upload endpoint


  - Locate track upload API endpoint
  - Add call to can_user_upload() before allowing upload
  - Return appropriate error message if restricted
  - _Requirements: 6.3, 6.6_

- [x] 15.4 Add suspension checks to all protected endpoints


  - Review all protected API endpoints
  - Add suspension check where appropriate
  - Return appropriate error message if suspended
  - _Requirements: 6.4, 6.6_

- [x] 15.5 Write integration tests for restriction enforcement


  - Test restricted user cannot post
  - Test restricted user cannot comment
  - Test restricted user cannot upload
  - Test suspended user cannot perform any action
  - Test non-restricted user can perform actions
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 16. Auto-Expiration System






- [x] 16.1 Create scheduled job for expiration

  - Set up cron job or scheduled function to run expire_restrictions()
  - Set up cron job or scheduled function to run expire_suspensions()
  - Run every hour or as appropriate
  - Log expiration activities
  - _Requirements: 6.7, 12.3_

- [x] 16.2 Implement expiration notification


  - Send notification when suspension expires
  - Send notification when restriction expires
  - _Requirements: 7.7_


- [x] 16.3 Write integration tests for auto-expiration


  - Test restrictions expire automatically
  - Test suspensions expire automatically
  - Test expired restrictions don't block actions
  - Test notifications sent on expiration
  - _Requirements: 6.7, 7.7_

- [x] 17. Security Hardening





- [x] 17.1 Implement rate limiting for moderation actions


  - Add rate limiting to prevent automated abuse
  - Log rate limit violations to security_events
  - _Requirements: 11.7_

- [x] 17.2 Implement input validation


  - Validate all input parameters
  - Sanitize user-provided text (descriptions, notes)
  - Prevent SQL injection and XSS
  - _Requirements: 11.6_

- [x] 17.3 Implement additional authorization checks


  - Verify moderators cannot act on admin accounts
  - Verify users cannot modify their own restrictions
  - Log all failed authorization attempts
  - _Requirements: 11.3, 11.4, 11.5_


- [x] 17.4 Write security tests

  - Test SQL injection prevention
  - Test XSS prevention
  - Test authorization bypass attempts
  - Test privilege escalation prevention
  - Test RLS policy enforcement
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 18. Integration with Existing Admin Dashboard




- [x] 18.1 Update admin suspension functionality


  - Ensure admin suspendUser() creates moderation_actions record
  - Ensure admin suspendUser() creates user_restrictions record
  - Maintain backward compatibility
  - _Requirements: 12.1, 12.2, 12.4, 12.5, 12.7_


- [x] 18.2 Add moderation metrics to admin dashboard

  - Add moderation summary to admin dashboard (optional)
  - Link to moderation dashboard from admin dashboard
  - _Requirements: 12.4_


- [x] 18.3 Write property test for suspension integration

  - **Property 12: Suspension Integration**
  - **Validates: Requirements 12.1, 12.2, 12.7**

- [x] 18.4 Write integration tests for admin integration


  - Test admin suspension creates both records
  - Test admin unsuspension removes both records
  - Test backward compatibility maintained
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 19. Final Checkpoint - Make sure all tests are passing




  - Ensure all tests pass, ask the user if questions arise.

- [-] 20. Documentation and Polish



- [x] 20.1 Update API documentation



  - Document all new service functions
  - Document all new database functions
  - Document error codes and handling
  - _Requirements: All_


- [x] 20.2 Create moderator training documentation

  - Document how to use moderation dashboard
  - Document moderation best practices
  - Document action types and when to use them
  - _Requirements: 3.3, 4.1, 5.1_

- [x] 20.3 Update user-facing documentation




  - Document how to report content
  - Document what happens after reporting
  - Document community guidelines
  - _Requirements: 1.1_

- [x] 20.4 Add loading states and polish UI




  - Ensure all components have loading states
  - Ensure all components have error states
  - Ensure all components have empty states
  - Polish styling and responsiveness
  - _Requirements: All UI requirements_


---

## Task 21: Action Reversal System

**Requirements**: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13, 13.14, 13.15
**Priority**: High
**Estimated Effort**: 5-6 hours

### Objectives
- Implement comprehensive UI for reversing moderation actions
- Add service functions for all reversal types
- Create reversal notification system with detailed information
- Implement proper authorization and complete audit trails
- Add visual indicators for reversed actions throughout the system

### Implementation Tasks

- [ ] 21.1 Reversal Service Functions - Implement all service functions for lifting suspensions, removing bans, revoking actions, and getting user status (_Requirements: 13.1-13.7, 14.2, 14.3, 14.6, 14.7_)

  - [x] Implement `liftSuspension(userId, reason)` function with full workflow





  - Clear user_profiles.suspended_until and suspension_reason
  - Deactivate suspension restriction in user_restrictions
  - Update moderation_actions with revoked_at, revoked_by, and reversal_reason
  - Send notification and log audit event
  - _Requirements: 13.1, 13.4, 13.5, 13.6_

- [x] Implement `removeBan(userId, reason)` function (admin only)




  - Similar to liftSuspension but with admin-only check
  - Handle permanent ban indicator (far future date)
  - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.13_

- [x] Implement enhanced `removeUserRestriction(restrictionId, reason)` function




  - Add reason parameter to existing function
  - Update related moderation_action with reversal details
  - Send appropriate notification based on restriction type
  - _Requirements: 13.2, 13.4, 13.5, 13.6_

- [x] Implement generic `revokeAction(actionId, reason)` function




  - Handle any action type
  - Perform action-specific cleanup
  - Prevent double-reversal
  - _Requirements: 13.4, 13.5, 13.7_

- [x] Add `getUserActiveRestrictions(userId)` helper function




  - Return all active, non-expired restrictions
  - _Requirements: 13.2_



- [x] Add `getUserSuspensionStatus(userId)` helper function


  - Return current suspension status with expiration details
  - Distinguish between temporary and permanent bans
  - _Requirements: 13.1, 13.3_
-

- [x] Add `getUserModerationHistory(userId, includeRevoked)` function



  - Return complete moderation history
  - Support filtering by revoked status
  - _Requirements: 14.2_

- [x] Add `getReversalMetrics(startDate, endDate)` function




  - Calculate overall reversal rate
  - Calculate per-moderator reversal rates
  - Return time-to-reversal statistics
  - _Requirements: 14.3, 14.6, 14.7_

- [ ] 21.2 Authorization and Security - Implement authorization checks to prevent moderators from reversing admin actions and enable self-reversal (_Requirements: 13.8, 13.11, 13.12_)

  - [x] Implement `verifyModeratorRole()` helper function




- [x] Implement `verifyAdminRole()` helper function



-

- [x] Implement `verifyNotAdminTarget(userId)` helper function



  - Prevent moderators from reversing actions on admin accounts
  - Allow admins to reverse any action
  - _Requirements: 13.8, 13.11, 13.13_

- [x] Implement self-reversal permission logic




  - Allow moderators to reverse their own actions
  - Log self-reversals distinctly
  - _Requirements: 13.12_




- [x] Add authorization checks to all reversal functions

  - Verify role before allowing reversal
  - Check target user role
  - Log failed authorization attempts
  - _Requirements: 13.8, 13.11_

- [ ] 21.3 Database Updates - Add reversal tracking fields, indexes, and database functions for reversal metrics (_Requirements: 14.3, 14.7_)

  - [x] Verify `revoked_at` and `revoked_by` columns exist in moderation_actions











- [x] Add `reversal_reason` field to metadata JSONB column



- [x] Create database index on `revoked_at` for filtering reversed actions




- [x] Create database index on `revoked_by` for moderator statistics





- [x] Create database function `get_reversal_metrics(start_date, end_date)`



  - Calculate reversal statistics efficiently
  - _Requirements: 14.3, 14.7_

- [ ] 21.4 UI Components for Reversals - Build user status panel, reversal confirmation dialog, and update existing components with reversal options (_Requirements: 13.1-13.3, 13.9, 13.10, 13.14, 13.15, 14.2, 15.1, 15.4-15.7, 15.10_)

  - [x] Create `UserStatusPanel` component



  - Display active suspension with expiration date
  - Display all active restrictions with details
  - Show "Lift Suspension" button when applicable
  - Show "Remove Ban" button for admins only
  - Show "Remove Restriction" button for each restriction
  - Display recent moderation history
  - _Requirements: 13.1, 13.2, 13.3, 13.14_

- [x] Create `ReversalConfirmationDialog` component




  - Display original action details (who, when, why, duration)
  - Require reason input (textarea, required)
  - Show warning for irreversible actions
  - Implement loading state during reversal
  - Show success/error messages
  - _Requirements: 13.4, 13.14_

- [x] Update `ModerationLogs` component




  - Add visual indicator for reversed actions (strikethrough + badge)
  - Add "REVERSED" badge with reversal details
  - Add tooltip on hover showing reversal info
  - Add "Recently Reversed" filter option
  - Add "Reversed Actions Only" filter option
  - _Requirements: 13.9, 13.10, 15.1, 15.5, 15.10_

- [x] Update `ReportCard` and action panels




  - Show reversal options for applicable actions
  - Display original action details in reversal dialog
  - Update UI immediately after reversal without refresh
  - _Requirements: 13.15_

- [x] Create `ModerationHistoryTimeline` component




  - Display chronological timeline of actions and reversals
  - Use color coding (active=red, reversed=gray, expired=blue)
  - Show progression of actions over time
  - Highlight self-reversals
  - _Requirements: 14.2, 15.4, 15.6, 15.7_

- [ ] 21.5 Reversal Notifications - Create notification templates and implement notification sending for all reversal types (_Requirements: 13.6, 13.15_)

  - [x] Create "Suspension Lifted" notification template




  - Include moderator name who lifted suspension
  - Include reason for reversal
  - Reference original suspension details
  - _Requirements: 13.6, 13.15_

- [x] Create "Ban Removed" notification template




  - Include admin name who removed ban
  - Include reason for reversal
  - Reference original ban details
  - _Requirements: 13.6, 13.15_

- [x] Create "Restriction Removed" notification template




  - Include moderator name who removed restriction
  - Include restriction type that was removed
  - Include reason for reversal
  - _Requirements: 13.6, 13.15_

- [x] Implement `sendReversalNotification()` function




  - Select appropriate template based on action type
  - Include all reversal details
  - Link to original action notification
  - Log notification delivery
  - _Requirements: 13.6, 13.15_

- [x] Update notification system to link reversals to original actions




  - Add `related_notification_id` field
  - Display reversal notifications with context
  - _Requirements: 13.6_

- [ ] 21.6 Write property tests for reversals - Implement all 6 property tests for reversal authorization, state consistency, notifications, history, metrics, and immutability (_Requirements: 13.5-13.8, 13.11-13.13, 13.15, 14.1-14.3, 14.7, 14.10_)


  - [x] Write property test for reversal authorization (Property 13)



  - **Validates: Requirements 13.8, 13.11, 13.12, 13.13**

- [x] Write property test for reversal state consistency (Property 14)




  - **Validates: Requirements 13.5, 13.6, 13.7**

- [x] Write property test for reversal notification delivery (Property 15)




  - **Validates: Requirements 13.6, 13.15**

- [x] Write property test for reversal history completeness (Property 16)




  - **Validates: Requirements 14.1, 14.2**

- [x] Write property test for reversal metrics accuracy (Property 17)




  - **Validates: Requirements 14.3, 14.7**

- [x] Write property test for reversal immutability (Property 18)




  - **Validates: Requirements 14.10**

### Acceptance Criteria
- [ ] Moderators can lift suspensions on non-admin users
- [ ] Moderators can remove restrictions on non-admin users
- [ ] Admins can remove bans and reverse any action
- [ ] All reversals require confirmation dialog with reason
- [ ] Users receive detailed notifications when actions are reversed
- [ ] Reversal history is completely tracked in database
- [ ] Authorization prevents moderators from reversing admin actions
- [ ] Authorization allows self-reversal for mistake correction
- [ ] UI clearly shows available reversal options based on role
- [ ] Reversed actions are visually distinct in all views
- [ ] Action logs show complete reversal details
- [ ] User profiles show only active actions by default
- [ ] Reversal metrics are calculated and displayed correctly
- [ ] UI updates immediately after reversal without page refresh
- [ ] All reversal records are immutable (cannot be deleted)

### Testing Requirements
- [ ] Test liftSuspension() with various suspension types
- [ ] Test removeBan() admin-only restriction
- [ ] Test removeUserRestriction() with all restriction types
- [ ] Test revokeAction() with all action types
- [ ] Test authorization prevents moderator from reversing admin actions
- [ ] Test authorization allows admin to reverse any action
- [ ] Test self-reversal is allowed and logged correctly
- [ ] Test notification delivery for all reversal types
- [ ] Test UI updates immediately after reversal
- [ ] Test visual indicators display correctly
- [ ] Test reversal metrics calculations
- [ ] Test database consistency after reversals
- [ ] Test double-reversal prevention
- [ ] Test reversal record immutability

---

## Task 22: Reversal Metrics and Reporting

**Requirements**: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10
**Priority**: Medium
**Estimated Effort**: 3-4 hours

### Objectives
- Implement comprehensive reversal tracking and metrics
- Create reversal reporting dashboard
- Add reversal rate calculations per moderator
- Implement reversal history visualization
- Add export functionality for reversal data

### Implementation Tasks

- [ ] 22.1 Reversal Metrics Calculation - Implement functions to calculate reversal rates, moderator statistics, time metrics, and identify patterns (_Requirements: 14.3, 14.5, 14.6, 14.7_)

  - [x] Implement `calculateReversalRate(startDate, endDate)` function





  - Calculate overall reversal rate percentage
  - Calculate reversal rate by action type
  - Calculate reversal rate by priority level
  - _Requirements: 14.3_

- [x] Implement `getModeratorReversalStats(moderatorId, startDate, endDate)` function




  - Calculate per-moderator reversal rates
  - Calculate average time-to-reversal
  - Identify moderators with highest reversal rates
  - _Requirements: 14.7_

- [x] Implement `getReversalTimeMetrics()` function





  - Calculate average time between action and reversal
  - Identify fastest and slowest reversals
  - Group by action type
  - _Requirements: 14.6_

- [x] Implement `getReversalPatterns()` function





  - Identify common reversal reasons
  - Identify users with multiple reversed actions
  - Identify time patterns (day of week, time of day)
  - _Requirements: 14.5_

- [ ] 22.2 Reversal History Tracking - Enhance history functions to show reversals, track state changes, and support filtering (_Requirements: 14.2, 14.4, 14.5, 14.9_)

  - [x] Enhance `getUserModerationHistory()` to include reversal details




  - Show original action and reversal side-by-side
  - Calculate time between action and reversal
  - Show reversal reason and moderator
  - _Requirements: 14.2_

- [x] Implement `getReversalHistory(filters)` function




  - Support filtering by date range
  - Support filtering by moderator
  - Support filtering by action type
  - Support filtering by reversal reason
  - _Requirements: 14.5, 14.9_



- [x] Implement state change tracking for multiple reversals



  - Track if action was re-applied after reversal
  - Maintain complete state change history
  - _Requirements: 14.4_

- [ ] 22.3 Reversal Reporting Dashboard - Build UI components for displaying reversal metrics, moderator stats, history view, and comprehensive reports (_Requirements: 14.3, 14.5, 14.6, 14.7, 14.8, 14.9_)

  - [x] Create `ReversalMetricsPanel` component




  - Display overall reversal rate with trend
  - Display reversal rate by action type (chart)
  - Display top reversal reasons
  - Display average time-to-reversal
  - _Requirements: 14.3, 14.6_

- [x] Create `ModeratorReversalStats` component




  - Display table of moderators with reversal rates
  - Highlight moderators with high reversal rates
  - Show per-moderator trends over time
  - Allow drilling down into specific moderator's reversals
  - _Requirements: 14.7_

- [x] Create `ReversalHistoryView` component





  - Display filterable list of all reversals
  - Show original action and reversal details
  - Display time between action and reversal
  - Support export to CSV
  - _Requirements: 14.5, 14.8, 14.9_

- [x] Create `ReversalReport` component





  - Generate comprehensive reversal report for date range
  - Include all metrics and statistics
  - Show patterns and trends
  - Support PDF export
  - _Requirements: 14.9_

- [ ] 22.4 Integration with Existing Metrics - Add reversal metrics to main dashboard, update CSV exports, and add filtering options (_Requirements: 14.3, 14.5, 14.8_)

  - [x] Add reversal metrics to main Metrics tab





  - Add "Reversal Rate" card
  - Add "Recent Reversals" list
  - Add link to detailed reversal report
  - _Requirements: 14.3_

- [x] Update action logs export to include reversal data




  - Add reversal columns to CSV export
  - Include reversal reason and moderator
  - Include time-to-reversal calculation
  - _Requirements: 14.8_

- [x] Add reversal filter to action logs




  - "Show Reversed Only" checkbox
  - "Show Non-Reversed Only" checkbox
  - "Show All" (default)
  - _Requirements: 14.5_

- [ ] 22.5 Data Integrity and Immutability - Add database constraints, triggers, and application-level checks to prevent reversal record modification (_Requirements: 14.10_)

  - [x] Implement database constraints for reversal immutability




  - Prevent updates to revoked_at once set
  - Prevent updates to revoked_by once set
  - Prevent deletion of reversed actions
  - _Requirements: 14.10_

- [x] Add database triggers for reversal protection





  - Trigger to prevent modification of reversal fields
  - Trigger to log attempted modifications
  - _Requirements: 14.10_

- [x] Implement application-level checks




  - Verify reversal records cannot be modified
  - Log any attempted modifications
  - Alert admins of suspicious activity
  - _Requirements: 14.10_

### Acceptance Criteria
- [ ] Reversal rate is calculated correctly for all time periods
- [ ] Per-moderator reversal statistics are accurate
- [ ] Time-to-reversal metrics are calculated correctly
- [ ] Reversal patterns are identified and displayed
- [ ] Reversal history shows complete state change tracking
- [ ] Multiple reversals (re-applications) are tracked correctly
- [ ] Reversal metrics are integrated into main metrics dashboard
- [ ] Action logs can be filtered by reversal status
- [ ] Reversal data is included in CSV exports
- [ ] Comprehensive reversal reports can be generated
- [ ] Reversal records are immutable and cannot be deleted
- [ ] Database constraints prevent reversal record modification
- [ ] All reversal metrics update in real-time

### Testing Requirements
- [ ] Test reversal rate calculations with various datasets
- [ ] Test per-moderator statistics accuracy
- [ ] Test time-to-reversal calculations
- [ ] Test pattern identification algorithms
- [ ] Test state change tracking for multiple reversals
- [ ] Test filtering and export functionality
- [ ] Test database constraints prevent modification
- [ ] Test database triggers fire correctly
- [ ] Test application-level immutability checks
- [ ] Test metrics dashboard displays correctly
- [ ] Test report generation with various date ranges
- [ ] Test CSV export includes all reversal data

---

## Task 23: Visual Indicators for Reversed Actions

**Requirements**: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10
**Priority**: Medium
**Estimated Effort**: 2-3 hours

### Objectives
- Implement consistent visual indicators for reversed actions
- Add color coding for action states
- Create timeline visualization for action history
- Add hover tooltips with reversal details
- Implement filtering for reversed actions

### Implementation Tasks

- [ ] 23.1 Action State Visual Indicators - Create badge component and implement consistent color coding for active, reversed, and expired actions (_Requirements: 15.1, 15.4_)

  - [x] Create `ActionStateBadge` component




  - "ACTIVE" badge (red/orange)
  - "REVERSED" badge (gray with strikethrough)
  - "EXPIRED" badge (blue)
  - Consistent styling across all views
  - _Requirements: 15.1, 15.4_

- [x] Apply strikethrough styling to reversed actions




  - In action logs table
  - In user moderation history
  - In reversal reports
  - _Requirements: 15.1_

- [x] Implement color coding system



  - Active actions: Red (#DC2626) or Orange (#EA580C)
  - Reversed actions: Gray (#6B7280) with strikethrough
  - Expired actions: Blue (#2563EB)
  - Consistent across all components
  - _Requirements: 15.4_

- [ ] 23.2 Hover Tooltips for Reversal Details - Build tooltip component and add to all reversed action displays throughout the system (_Requirements: 15.5_)

  - [x] Create `ReversalTooltip` component




  - Display moderator who reversed action
  - Display reversal timestamp
  - Display reversal reason
  - Smooth fade-in animation
  - _Requirements: 15.5_

- [x] Add tooltips to all reversed action displays





  - Action logs table rows
  - User profile action history
  - Moderation queue items
  - Metrics dashboard
  - _Requirements: 15.5_

- [ ] 23.3 User Profile Action Display - Update profiles to show only active actions by default with toggle for full history and summary counts (_Requirements: 15.2, 15.3, 15.8_)

  - [x] Update user profile to show only active actions by default




  - Hide reversed actions in main view
  - Hide expired actions in main view
  - Show summary counts
  - _Requirements: 15.2, 15.8_

- [x] Add "Show Full History" toggle




  - Expand to show all actions including reversed
  - Display reversed actions in collapsed/dimmed state
  - Maintain visual distinction
  - _Requirements: 15.3_

- [x] Add action summary counts




  - "Active Actions: X" (red)
  - "Reversed Actions: Y" (gray)
  - "Expired Actions: Z" (blue)
  - "Total Actions: N"
  - _Requirements: 15.8_

- [ ] 23.4 Timeline Visualization - Build timeline component showing chronological action progression with color-coded markers and self-reversal highlighting (_Requirements: 15.6, 15.7_)

  - [x] Create `ModerationTimeline` component




  - Vertical timeline showing action progression
  - Color-coded timeline markers
  - Show action type and date
  - Show reversal events
  - Connect related actions with lines
  - _Requirements: 15.6_

- [x] Add timeline to user profile




  - Display chronological action history
  - Highlight reversals with special markers
  - Show time between action and reversal
  - _Requirements: 15.6_

- [x] Highlight self-reversals in timeline




  - Different marker style for self-reversals
  - Tooltip explaining self-reversal
  - _Requirements: 15.7_

- [ ] 23.5 Moderation Queue Indicators - Add badges and context to queue items showing previous reversals to help moderators avoid repeat mistakes (_Requirements: 15.9_)

  - [x] Add indicator for reports related to reversed actions





  - Badge showing "Previously Reversed"
  - Tooltip with details of previous reversal
  - Help moderators avoid repeat mistakes
  - _Requirements: 15.9_

- [x] Update report cards to show reversal history




  - Show if user has had actions reversed before
  - Show if similar reports were reversed
  - Provide context for moderation decisions
  - _Requirements: 15.9_

- [ ] 23.6 Action Logs Filtering - Add time-based reversal filters and quick filter buttons for action states (_Requirements: 15.10_)

  - [x] Add "Recently Reversed" filter




  - Show actions reversed in last 24 hours
  - Show actions reversed in last 7 days
  - Show actions reversed in last 30 days
  - _Requirements: 15.10_

- [x] Add quick filter buttons




  - "Active Only"
  - "Reversed Only"
  - "Expired Only"
  - "All Actions" (default)
  - _Requirements: 15.10_

- [x] Update filter UI




  - Clear visual indication of active filters
  - Filter count badges
  - Reset filters button
  - _Requirements: 15.10_

- [ ] 23.7 Moderator Action History View - Create personalized view for moderators showing their actions with reversal highlighting and self-reversal indicators (_Requirements: 15.7_)

  - [x] Create "My Actions" view for moderators



  - Show all actions taken by current moderator
  - Highlight actions they have reversed
  - Show reversal rate for their actions
  - _Requirements: 15.7_

- [x] Add self-reversal highlighting


  - Different background color for self-reversals
  - Badge indicating "Self-Reversed"
  - Tooltip with self-reversal reason
  - _Requirements: 15.7_

### Acceptance Criteria
- [ ] All reversed actions display with strikethrough and "REVERSED" badge
- [ ] Color coding is consistent across all views
- [ ] Hover tooltips show complete reversal details
- [ ] User profiles show only active actions by default
- [ ] "Show Full History" toggle reveals all actions
- [ ] Action summary counts are accurate and color-coded
- [ ] Timeline visualization displays action progression clearly
- [ ] Self-reversals are visually distinct in timeline
- [ ] Moderation queue shows indicators for previously reversed actions
- [ ] "Recently Reversed" filter works correctly
- [ ] Quick filter buttons work correctly
- [ ] Moderators can view their own action history with reversals highlighted
- [ ] All visual indicators are accessible and clear

### Testing Requirements
- [ ] Test badge display for all action states
- [ ] Test color coding consistency across components
- [ ] Test tooltip display and content
- [ ] Test user profile action filtering
- [ ] Test "Show Full History" toggle
- [ ] Test action summary count calculations
- [ ] Test timeline visualization rendering
- [ ] Test self-reversal highlighting
- [ ] Test moderation queue indicators
- [ ] Test "Recently Reversed" filter
- [ ] Test quick filter buttons
- [ ] Test moderator action history view
- [ ] Test accessibility of visual indicators
- [ ] Test responsive design on mobile devices


---

## Task 24: Comprehensive Manual Testing

**Requirements**: All
**Priority**: High
**Estimated Effort**: 4-5 hours

**IMPORTANT: All automated tests MUST pass before beginning manual testing.**

### User Reporting Flow
- [ ] User can click report button (🚩) on posts
- [ ] User can click report button (🚩) on comments
- [ ] User can click report button (🚩) on tracks
- [ ] Report modal opens with all reason categories
- [ ] "Other" reason requires description field
- [ ] Description has 1000 character limit enforced
- [ ] Report submission shows success toast message
- [ ] Rate limit blocks after 10 reports in 24 hours
- [ ] Rate limit shows appropriate error message with time remaining
- [ ] Report appears in moderation queue immediately

### Moderator Flagging Flow
- [ ] Moderator sees flag button (⚠️) on all content
- [ ] Non-moderators do NOT see flag button
- [ ] Flag modal opens with reason dropdown
- [ ] Internal notes field is required
- [ ] Priority selector shows P1-P5 options
- [ ] Flag submission creates report with "under_review" status
- [ ] Flagged reports appear at top of queue
- [ ] Moderator flag badge displays on flagged reports

### Navigation and Access Control
- [ ] Moderation link (🛡️) appears in avatar dropdown for moderators
- [ ] Moderation link (🛡️) appears in avatar dropdown for admins
- [ ] Moderation link does NOT appear for regular users
- [ ] Admin Dashboard link only appears for admins
- [ ] Clicking Moderation link navigates to /moderation
- [ ] Non-moderators are redirected from /moderation with error message
- [ ] Moderation dashboard loads without errors

### Moderation Queue
- [ ] Queue displays all pending reports
- [ ] Reports sorted by priority (P1-P5) then date
- [ ] Moderator-flagged reports show special badge
- [ ] Priority badges are color-coded correctly
- [ ] Filter by status works (pending, under_review, resolved, dismissed)
- [ ] Filter by priority works (P1-P5)
- [ ] Filter by source works (user reports vs moderator flags)
- [ ] Pagination works correctly with 20 items per page
- [ ] Report cards show all metadata (type, reason, date, priority)
- [ ] Reporter info is anonymous for regular users
- [ ] Reporter info shows username for moderators
- [ ] Clicking report card opens action panel

### Moderation Actions
- [ ] Action panel displays full report details
- [ ] Action panel shows reported content in context
- [ ] Dismiss button works and closes report
- [ ] Remove Content button works and deletes content
- [ ] Warn User button sends warning notification
- [ ] Suspend User shows duration picker (1/7/30 days)
- [ ] Suspend User creates suspension correctly
- [ ] Apply Restriction shows restriction type selector (posting/commenting/upload)
- [ ] Ban User button only visible to admins
- [ ] Confirmation dialogs appear for destructive actions
- [ ] Internal notes field saves correctly
- [ ] User notification message is sent
- [ ] Report status updates to "resolved" after action
- [ ] Queue refreshes after action taken

### Action Logs
- [ ] Logs tab displays recent 100 actions
- [ ] Filter by action type works (content_removed, user_warned, etc.)
- [ ] Filter by moderator works (admin only)
- [ ] Filter by date range works
- [ ] Search by user ID works
- [ ] Search by content ID works
- [ ] Export to CSV works (admin only)
- [ ] Pagination works correctly
- [ ] Action details display completely (moderator, target, type, reason, timestamp)

### Metrics Dashboard
- [ ] Reports received counts display correctly (today/week/month)
- [ ] Reports resolved counts display correctly
- [ ] Average resolution time calculates correctly
- [ ] Actions by type chart displays (pie or bar chart)
- [ ] Top reasons for reports display
- [ ] Moderator performance comparison shows (admin only)
- [ ] Date range filtering works
- [ ] Metrics update in real-time or on refresh

### Notifications
- [ ] User receives notification when content removed
- [ ] User receives notification when suspended
- [ ] User receives notification when warned
- [ ] User receives notification when restricted
- [ ] Notification includes reason for action
- [ ] Notification includes duration (for suspensions/restrictions)
- [ ] Notification includes appeal information placeholder
- [ ] Notifications appear in notification center
- [ ] Notification count badge updates

### Restriction Enforcement
- [ ] User with posting_disabled cannot create posts
- [ ] User with commenting_disabled cannot create comments
- [ ] User with upload_disabled cannot upload tracks
- [ ] Suspended user cannot perform any actions
- [ ] Appropriate error messages display for each restriction type
- [ ] Non-restricted users can perform actions normally
- [ ] Restriction checks happen at API level (not just UI)

### Auto-Expiration
- [ ] Time-based restrictions expire automatically after duration
- [ ] Time-based suspensions expire automatically after duration
- [ ] Expired restrictions no longer block actions
- [ ] Expiration notifications are sent to users
- [ ] Expired restrictions show as inactive in database

### Action Reversal System
- [ ] "Lift Suspension" button appears on suspended user profiles
- [ ] "Remove Ban" button appears on banned user profiles (admin only)
- [ ] "Remove Restriction" button appears for each active restriction
- [ ] Reversal confirmation dialog opens with original action details
- [ ] Reversal confirmation requires reason input
- [ ] Moderators can lift suspensions on non-admin users
- [ ] Moderators CANNOT lift suspensions on admin users
- [ ] Admins can remove bans and reverse any action
- [ ] Reversal updates user status immediately
- [ ] Reversal sends notification to affected user
- [ ] Reversal notification includes moderator name and reason
- [ ] Reversed actions show in action logs with "REVERSED" badge
- [ ] Reversed actions have strikethrough styling
- [ ] Hover tooltip on reversed actions shows reversal details
- [ ] Self-reversals are allowed and logged correctly
- [ ] Double-reversal is prevented (cannot reverse twice)

### Reversal Visual Indicators
- [x] Active actions display in red/orange
- [x] Reversed actions display in gray with strikethrough
- [x] Expired actions display in blue
- [x] "REVERSED" badge displays on reversed actions
- [ ] Hover tooltips show who reversed, when, and why
- [ ] User profiles show only active actions by default
- [ ] "Show Full History" toggle reveals reversed actions
- [ ] Action summary counts display correctly (Active/Reversed/Total)
- [ ] Timeline view shows action progression chronologically
- [ ] Self-reversals are highlighted differently
- [ ] "Recently Reversed" filter works in action logs
- [ ] "Reversed Actions Only" filter works in action logs

### Reversal Metrics
- [ ] Overall reversal rate displays correctly
- [ ] Per-moderator reversal rates display correctly
- [ ] Time-to-reversal metrics calculate correctly
- [ ] Reversal patterns are identified (common reasons, users, times)
- [ ] Reversal history shows complete state changes
- [ ] Multiple reversals (re-applications) are tracked
- [ ] Reversal data included in CSV exports
- [ ] Reversal report can be generated for date ranges
- [ ] Reversal records cannot be modified or deleted

### Cross-Browser Testing
- [ ] Chrome: All features work correctly
- [ ] Firefox: All features work correctly
- [ ] Safari: All features work correctly
- [ ] Edge: All features work correctly
- [ ] No console errors in any browser
- [ ] Styling consistent across browsers

### Mobile Responsiveness
- [ ] Report modal displays correctly on mobile (320px-768px)
- [ ] Moderation queue is usable on mobile
- [ ] Action panel is usable on mobile
- [ ] Navigation menu works on mobile
- [ ] All buttons are touch-friendly (minimum 44px)
- [ ] Tables scroll horizontally on mobile
- [ ] Filters work on mobile
- [ ] Modals are scrollable on mobile
- [ ] No horizontal overflow issues

### Performance Testing
- [ ] Queue loads within 2 seconds with 100+ reports
- [ ] Filtering and sorting remain responsive
- [ ] No console errors or warnings
- [ ] No memory leaks during extended use (check DevTools)
- [ ] Images and content load efficiently
- [ ] Database queries complete within 100ms
- [ ] Real-time updates don't cause lag

### Security Testing
- [ ] Non-moderators cannot access moderation endpoints
- [ ] Non-moderators cannot view moderation queue
- [ ] Users cannot modify their own restrictions
- [ ] Moderators cannot take actions on admin accounts
- [ ] RLS policies prevent unauthorized data access
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized
- [ ] Rate limiting works correctly
- [ ] Authorization checks happen server-side

### Edge Cases and Error Handling
- [ ] Reporting deleted content shows appropriate error
- [ ] Taking action on deleted content shows appropriate error
- [ ] Network errors show retry option
- [ ] Concurrent modifications are handled gracefully
- [ ] Invalid UUIDs are rejected with error message
- [ ] Empty form submissions are prevented
- [ ] Very long text inputs are truncated or rejected
- [ ] Special characters in text fields are handled correctly
- [ ] Timezone differences handled correctly for timestamps

### Accessibility Testing
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Screen reader announces important changes
- [ ] Color contrast meets WCAG AA standards
- [ ] Form labels are properly associated
- [ ] Error messages are announced to screen readers
- [ ] Buttons have descriptive aria-labels

_Requirements: All_
