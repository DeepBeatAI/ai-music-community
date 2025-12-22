# Implementation Plan

- [x] 1. Database Migration and Indexing




- [x] 1.1 Create database migration for duplicate detection index


  - Create migration file `20250XXX000000_add_duplicate_detection_index.sql`
  - Add composite index on (reporter_id, report_type, target_id, created_at)
  - Add index comment for documentation
  - Test index creation on development database
  - _Requirements: 12.1, 12.2, 12.6_

- [x] 1.2 Apply migration to remote database


  - Run migration using Supabase MCP tools
  - Verify index was created successfully
  - Check index is being used by duplicate detection queries
  - _Requirements: 12.1, 12.6_

- [x] 2. Implement Duplicate Detection Service




- [x] 2.1 Add checkDuplicateReport() function to moderationService.ts


  - Implement function with proper TypeScript types
  - Query moderation_reports for existing reports within 24 hours
  - Return isDuplicate flag and originalReportDate
  - Handle database errors with ModerationError
  - Add JSDoc comments with requirements references
  - _Requirements: 2.3, 2.5, 10.1, 10.2, 10.3_

- [x] 2.2 Write property test for duplicate detection


  - **Property 6: Duplicate Detection Prevents Repeat Reports**
  - **Validates: Requirements 2.3, 2.5, 10.2, 10.3**
  - Test that reporting same target twice within 24 hours fails
  - Test with various report types (post, comment, track, user)
  - Configure to run 100 iterations
  - _Requirements: 2.3, 2.5, 10.2, 10.3_

- [x] 2.3 Write property test for cross-type independence

  - **Property 7: Duplicate Detection Works Across All Content Types**
  - **Validates: Requirements 2.6, 10.5, 10.10**
  - Test that reporting different types with same target_id succeeds
  - Test that reporting same type twice fails
  - Configure to run 100 iterations
  - _Requirements: 2.6, 10.5, 10.10_

- [x] 2.4 Write property test for time-based expiration

  - **Property 14: Time-Based Duplicate Expiration**
  - **Validates: Requirements 10.6**
  - Test that duplicate detection expires after 24 hours
  - Use time mocking to advance time
  - Configure to run 100 iterations
  - _Requirements: 10.6_

- [x] 3. Enhance submitReport() with Duplicate Detection
- [x] 3.1 Integrate checkDuplicateReport() into submitReport()
  - Call checkDuplicateReport() before rate limit check
  - Throw ModerationError with VALIDATION_ERROR code if duplicate
  - Include originalReportDate in error details
  - Log security event for duplicate attempts
  - Format error message with content type label
  - _Requirements: 2.3, 2.4, 10.4, 10.7, 10.8_

- [x] 3.2 Add self-report prevention
  - Check if reporter_id equals target_id for user reports
  - Check if reporter_id equals content owner for other types
  - Throw appropriate error message
  - _Requirements: 8.5, 8.6_

- [x] 3.3 Write property test for duplicate detection execution order
  - **Property 13: Duplicate Detection Executes Before Rate Limiting**
  - **Validates: Requirements 10.4**
  - Test that duplicate error is thrown before rate limit check
  - Configure to run 100 iterations
  - _Requirements: 10.4_

- [x] 3.4 Write unit tests for submitReport() enhancements
  - Test duplicate detection integration
  - Test self-report prevention
  - Test error message formatting
  - Test security event logging
  - _Requirements: 2.3, 2.4, 8.5, 8.6_

- [x] 4. Enhance moderatorFlagContent() with Duplicate Detection
- [x] 4.1 Integrate checkDuplicateReport() into moderatorFlagContent()
  - Call checkDuplicateReport() for moderator flags
  - Handle duplicate detection same as submitReport()
  - Log security events for moderator duplicate attempts
  - _Requirements: 10.9_

- [x] 4.2 Write unit tests for moderatorFlagContent() enhancements
  - Test duplicate detection for moderator flags
  - Test that moderators can flag after user reports (different reporter_id)
  - _Requirements: 10.9_

- [x] 5. Implement Admin Protection
- [x] 5.1 Add admin protection check to submitReport()
  - Check if target user has admin role (for user reports only)
  - Throw ModerationError if target is admin
  - Log security event for admin report attempts
  - _Requirements: 2.7, 2.8, 6.4_

- [x] 5.2 Write property test for admin protection
  - **Property 8: Admin Protection Prevents Admin Reports**
  - **Validates: Requirements 2.7, 2.8**
  - Test that reporting admin accounts fails
  - Test that security event is logged
  - Configure to run 100 iterations
  - _Requirements: 2.7, 2.8_

- [x] 5.3 Write unit tests for admin protection
  - Test admin protection for user reports
  - Test that admin protection doesn't apply to content reports
  - Test security event logging
  - _Requirements: 2.7, 2.8, 6.4_

- [x] 6. Implement Profile Context Service
- [x] 6.1 Add getProfileContext() function to moderationService.ts
  - Fetch user profile data (username, avatar, bio, join date)
  - Calculate account age in days
  - Count recent reports (last 30 days)
  - Fetch moderation history (last 10 actions)
  - Handle errors gracefully
  - Add JSDoc comments with requirements references
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 6.2 Add ProfileContext TypeScript interface
  - Define interface in types/moderation.ts
  - Include all required fields
  - Export for use in components
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 6.3 Write unit tests for getProfileContext()
  - Test profile data fetching
  - Test account age calculation
  - Test recent report counting
  - Test moderation history fetching
  - Test error handling
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 7. Enhance ModerationActionPanel with Profile Context
- [x] 7.1 Add profile context loading to ModerationActionPanel
  - Add state for profileContext and loadingContext
  - Load profile context when report_type='user'
  - Handle loading and error states
  - _Requirements: 7.1, 7.9_

- [x] 7.2 Add Profile Context UI section
  - Display user avatar, username, and bio
  - Show account age badge
  - Show recent report count badge
  - Add "New account" badge for accounts < 7 days old
  - Use compact, scannable layout
  - _Requirements: 7.2, 7.3, 7.5, 7.7, 7.8_

- [x] 7.3 Add collapsible Moderation History section
  - Use HTML details/summary for collapsible section
  - Display last 10 moderation actions
  - Show action type, reason, and date
  - Format dates for readability
  - _Requirements: 7.4, 7.7_

- [x] 7.4 Add formatAccountAge() helper function
  - Format days into human-readable string
  - Handle edge cases (< 1 day, 1 day, weeks, months, years)
  - _Requirements: 7.2_

- [x] 7.5 Write unit tests for ModerationActionPanel enhancements
  - Test profile context loading
  - Test UI rendering for user reports
  - Test that profile context doesn't show for other report types
  - Test collapsible history functionality
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Integrate Report/Flag Buttons into CreatorProfileHeader
- [x] 8.1 Add button imports to CreatorProfileHeader
  - Import ReportButton from @/components/moderation/ReportButton
  - Import ModeratorFlagButton from @/components/moderation/ModeratorFlagButton
  - _Requirements: 1.1, 5.1, 5.2_

- [x] 8.2 Add button rendering logic
  - Render buttons next to Follow button
  - Hide buttons when viewing own profile
  - Pass report_type='user' and targetId=profileUserId
  - Use iconOnly={false} for both buttons
  - Match UserProfile component pattern
  - _Requirements: 1.1, 1.2, 1.3, 11.1, 11.2, 11.3, 11.6, 11.7, 11.10_

- [x] 8.3 Write unit tests for CreatorProfileHeader integration
  - Test button visibility for regular users
  - Test button visibility for moderators
  - Test buttons hidden when viewing own profile
  - Test correct props passed to buttons
  - _Requirements: 1.1, 1.2, 1.3, 11.6, 11.7_

- [x] 9. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property-based tests and verify they pass
  - Fix any failing tests
  - Ensure TypeScript compilation succeeds with no errors
  - Ensure ESLint passes with no errors
  - Ask the user if questions arise

- [x] 10. Security Event Logging Enhancement
- [x] 10.1 Enhance logSecurityEvent() calls
  - Ensure all duplicate attempts log with report_type and target_id
  - Ensure all rate limit violations log with report_type
  - Ensure all admin report attempts log correctly
  - Include user_agent and IP if available
  - _Requirements: 2.9, 2.10, 6.2, 6.3, 6.4, 6.5, 6.7_

- [x] 10.2 Write unit tests for security event logging
  - Test duplicate attempt logging
  - Test rate limit logging
  - Test admin protection logging
  - Test log content includes required fields
  - _Requirements: 2.9, 2.10, 6.2, 6.3, 6.4, 6.7_

- [x] 11. Error Message Consistency
- [x] 11.1 Standardize error messages across all report types
  - Ensure duplicate error format is consistent
  - Ensure rate limit error format is consistent
  - Ensure self-report error format is consistent
  - Test error messages for all content types
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8_

- [x] 11.2 Write unit tests for error message consistency
  - Test error messages for each report type
  - Test error message formatting
  - Test that content type labels are correct
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8_

- [x] 12. Integration Testing
- [x] 12.1 Write integration test for complete report flow
  - Test user clicks report button
  - Test modal opens with correct props
  - Test report submission
  - Test success message and modal close
  - _Requirements: 1.4, 1.6, 1.7_

- [x] 12.2 Write integration test for duplicate detection flow
  - Test first report succeeds
  - Test second report fails with duplicate error
  - Test security event is logged
  - _Requirements: 2.3, 2.4, 2.9_

- [x] 12.3 Write integration test for rate limit flow
  - Test 10 reports succeed
  - Test 11th report fails with rate limit error
  - Test security event is logged
  - _Requirements: 2.1, 2.2, 6.2_

- [x] 12.4 Write integration test for admin protection flow
  - Test reporting admin fails
  - Test security event is logged
  - _Requirements: 2.7, 2.8, 6.4_

- [x] 12.5 Write integration test for moderator review flow
  - Test moderator opens profile report
  - Test profile context loads
  - Test all profile data displayed
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 13. Performance Testing and Optimization
- [x] 13.1 Test duplicate detection query performance
  - Measure query time with various database sizes
  - Verify average time < 50ms
  - Verify index is being used
  - _Requirements: 12.1, 12.2, 12.4_

- [x] 13.2 Test profile context load performance
  - Measure load time with extensive moderation history
  - Verify average time < 200ms
  - Test async loading doesn't block UI
  - _Requirements: 7.9, 12.4_

- [x] 13.3 Test report submission end-to-end performance
  - Measure complete submission time
  - Verify average time < 500ms
  - Test with concurrent submissions
  - _Requirements: 12.4_

- [x] 14. Automated Testing - Final Checkpoint
- [x] 14.1 Run complete automated test suite
  - Run all unit tests (Jest)
  - Run all property-based tests (fast-check)
  - Run all integration tests
  - Verify all automated tests pass
  - Check code coverage (target 90%+)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8_

- [x] 14.2 Run code quality checks
  - Run TypeScript compiler and fix any errors
  - Run ESLint and fix any errors
  - Verify no linting warnings
  - _Requirements: All_

- [x] 15. Manual Testing
- [x] 15.1 Test report button functionality
  - **Checklist:**
    - [x] Report button visible on creator profiles (not own profile)
    - [x] Report button opens ReportModal with correct props
    - [x] Modal displays all report reasons correctly
    - [x] Success toast appears after submission
    - [x] Modal closes after successful submission
  - _Requirements: 1.1, 1.2, 1.4, 1.7_

- [x] 15.2 Test moderator flag button functionality
  - **Checklist:**
    - [x] Flag button visible only to moderators/admins
    - [x] Flag button opens ModeratorFlagModal with correct props
    - [x] Modal displays priority options correctly
    - [x] Success toast appears after submission
    - [x] Modal closes after successful submission
  - _Requirements: 1.3, 1.5_

- [x] 15.3 Test duplicate detection user experience
  - **Step-by-step:**
    1. Submit a report for a user profile
    2. Verify success message appears
    3. Attempt to report the same profile again immediately
    4. Verify duplicate error message appears: "You have already reported this user recently. Please wait 24 hours before reporting again."
    5. Verify modal remains open (user can cancel)
  - **Status:** Confirmed functional - 24-hour duplicate prevention working correctly
  - _Requirements: 2.3, 2.4, 8.3_

- [x] 15.4 Test rate limit user experience
  - **Step-by-step:**
    1. Submit 10 reports (mix of different content types)
    2. Verify all 10 succeed
    3. Attempt to submit an 11th report
    4. Verify rate limit error message appears with time remaining
    5. Verify modal closes automatically
  - _Requirements: 2.1, 2.2, 8.2_

- [x] 15.5 Test admin protection user experience
  - **Step-by-step:**
    1. Navigate to an admin user's profile
    2. Click report button
    3. Fill out report form and submit
    4. Verify error message: "This account cannot be reported"
    5. Verify modal closes automatically
  - _Requirements: 2.7, 2.8, 8.4_

- [x] 15.6 Test self-report prevention
  - **Step-by-step:**
    1. Navigate to your own profile
    2. Verify report and flag buttons are NOT visible
    3. (If buttons were visible) Attempt to report own profile
    4. Verify error message: "You cannot report your own profile"
  - _Requirements: 8.5, 11.6_

- [x] 15.7 Test profile context in moderation panel
  - **Checklist:**
    - [x] Open a user profile report in moderation queue
    - [x] Verify profile context section appears
    - [x] Verify avatar, username, and bio are displayed
    - [x] Verify account age badge shows correct information
    - [x] Verify recent report count badge (if applicable)
    - [x] Verify "New account" badge for accounts < 7 days old
    - [x] Expand moderation history section
    - [x] Verify last 10 actions are displayed with correct formatting
  - **Issues Fixed:**
    - Fixed "User profile not found" error by querying only existing columns (username, created_at, user_id)
    - Fixed content preview showing "Content has been deleted" by using correct field (user_id instead of id)
    - Replaced avatar image with initial-based placeholder to eliminate 404 errors
    - Removed debug console.log statements
    - Added warning message to ReportModal for user reports about 24-hour duplicate limit
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15.8 Test cross-browser compatibility
  - **Checklist:**
    - [x] Test in Chrome (buttons render, modals work, errors display)
    - [x] Test in Firefox (buttons render, modals work, errors display)
    - [x] Test in Safari (buttons render, modals work, errors display)
    - [x] Test in Edge (buttons render, modals work, errors display)
  - _Requirements: All_

- [x] 15.9 Test mobile responsiveness
  - **Checklist:**
    - [x] Buttons render correctly on mobile screens
    - [x] Buttons are touch-friendly (44px minimum)
    - [x] Modals display correctly on mobile
    - [x] Profile context section is readable on mobile
    - [x] Collapsible sections work on mobile
  - _Requirements: 11.1, 11.2, 11.9_

- [x] 15.10 Test keyboard accessibility
  - **Checklist:**
    - [x] Tab to report button (focus visible)
    - [x] Press Enter to open modal
    - [x] Tab through modal form fields
    - [x] Press Escape to close modal
    - [x] Tab to flag button (moderators only)
    - [x] Verify all interactive elements are keyboard accessible
  - _Requirements: 11.9_

- [x] 16. Documentation and Deployment Preparation
- [x] 16.1 Update component documentation
  - Add JSDoc comments to new functions
  - Update README if needed
  - Document new TypeScript interfaces
  - _Requirements: All_

- [x] 16.2 Prepare deployment checklist
  - Verify migration is ready
  - Verify all automated tests pass
  - Verify all manual tests completed successfully
  - Verify no TypeScript/ESLint errors
  - Create deployment plan document
  - _Requirements: All_

