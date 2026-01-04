# Implementation Plan: Enhanced Report Evidence & Context

## Overview

This implementation plan breaks down the Enhanced Report Evidence & Context feature into discrete coding tasks. The plan follows a 4-phase rollout approach, with each phase building on the previous one. All tasks involve writing, modifying, or testing code.

## Tasks

- [ ] 1. Phase 1: Evidence Collection

- [x] 1.1 Implementation Tasks

- [x] 1.1.1 Update type definitions for evidence metadata
  - Add `ReportMetadata` interface to `client/src/types/moderation.ts`
  - Update `Report` interface to include `metadata: ReportMetadata | null`
  - Export new types for use in components
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2_

- [x] 1.1.2 Update ReportModal component with evidence fields
  - Add state variables for `originalWorkLink`, `proofOfOwnership`, `audioTimestamp`
  - Update description field label to "Description of violation *"
  - Add 20-character minimum validation for description
  - Add conditional evidence fields based on selected reason (copyright, hate_speech, harassment)
  - Add helper text for each evidence field
  - Update form submission to include metadata
  - Update validation function to check description length
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

- [x] 1.1.3 Update ModeratorFlagModal component with evidence fields
  - Add state variables for evidence fields (same as ReportModal)
  - Keep existing 10-character minimum for internal notes
  - Add conditional evidence fields (same logic as ReportModal)
  - Update form submission to include metadata
  - _Requirements: 4.1, 4.2_

- [x] 1.1.4 Update submitReport service function
  - Add `metadata?: ReportMetadata` parameter
  - Add validation for 20-character minimum description
  - Update database insert to include metadata field
  - Add error handling for validation failures
  - _Requirements: 1.2, 2.2, 3.1, 3.2_

- [x] 1.1.5 Update moderatorFlagContent service function
  - Add `metadata?: ReportMetadata` parameter
  - Keep existing 10-character minimum validation for internal notes
  - Update database insert to include metadata field
  - Add error handling for validation failures
  - _Requirements: 4.2_

- [x] 1.2 Automated Tests ✅ **COMPLETED**

- [x] 1.2.1 Write property tests for ReportModal evidence fields
  - **Property 1: Evidence Metadata Round-Trip** ✅
  - **Property 2: Copyright Evidence Fields Display** ✅
  - **Property 3: Audio Timestamp Field Display** ✅
  - **Property 4: Description Minimum Length Validation** ✅
  - **Property 5: Description Validation Error Message** ✅
  - **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2**
  - **File:** `client/src/components/moderation/__tests__/ReportModal.evidence.property.test.tsx`
  - **Tests:** 5 property tests, 100 iterations each, all passing

- [x] 1.2.2 Write property tests for ModeratorFlagModal evidence fields
  - **Property 6: Moderator Evidence Field Parity** ✅
  - **Property 6b: Moderator Evidence Metadata Storage** ✅
  - **Property 6c: Moderator Internal Notes Minimum Length** ✅
  - **Validates: Requirements 4.1, 4.2**
  - **File:** `client/src/components/moderation/__tests__/ModeratorFlagModal.evidence.property.test.tsx`
  - **Tests:** 3 property tests, 100 iterations each, all passing

- [x] 1.2.3 Write integration tests for report submission with evidence
  - Test report submission with copyright evidence ✅
  - Test report submission with audio timestamp ✅
  - Test report submission without evidence ✅
  - Test validation error handling for short descriptions ✅
  - Test metadata storage and retrieval ✅
  - _Requirements: 1.2, 2.2, 3.1, 3.2, 4.2_
  - **File:** `client/src/components/moderation/__tests__/ReportSubmission.evidence.integration.test.tsx`
  - **Tests:** 11 integration tests, all passing

- [x] 1.2.4 Run all automated tests and fix failures
  - All property tests pass (8 tests) ✅
  - All integration tests pass (11 tests) ✅
  - All TypeScript errors fixed ✅
  - All linting errors resolved ✅
  - **Total:** 19 tests passing
  - **Test execution time:** ~27 seconds


- [ ] 2. Phase 2: Evidence Display

- [x] 2.1 Implementation Tasks

- [x] 2.1.1 Add evidence display section to ModerationActionPanel
  - Add state for evidence display
  - Create evidence display section with blue-bordered styling
  - Add conditional rendering based on metadata presence
  - Display original work link as clickable URL
  - Display proof of ownership as text
  - Display audio timestamp as text
  - Position section after Report Details, before Profile Context
  - _Requirements: 8.1_

- [x] 2.1.2 Add evidence indicator badge to ReportCard
  - Add conditional badge rendering based on metadata presence
  - Use blue color scheme with 📎 icon
  - Display "Evidence Provided" text
  - _Requirements: 9.1_

- [x] 2.1.3 Implement related reports fetching logic
  - Add `loadRelatedReports` function to ModerationActionPanel
  - Query for reports with same `target_id` (limit 5, most recent)
  - Query for reports with same `reported_user_id` (limit 5, most recent)
  - Add state for `relatedReports` with `sameContent` and `sameUser` arrays
  - Call function in useEffect when panel opens
  - _Requirements: 7.1, 7.2_

- [x] 2.1.4 Add related reports display to User Violation History section
  - Add "Related Reports" subsection after reporter accuracy
  - Display "Same content" reports with reason, status, date
  - Display "Same user" reports with type, reason, status
  - Use color coding for different report types
  - Limit display to 5 per category
  - _Requirements: 7.1, 7.2_

- [x] 2.2 Automated Tests

- [x] 2.2.1 Write property tests for evidence display
  - **Property 13: Evidence Display in Action Panel**
  - **Validates: Requirements 8.1**

- [x] 2.2.2 Write property tests for evidence badge
  - **Property 14: Evidence Indicator Badge**
  - **Validates: Requirements 9.1**

- [x] 2.2.3 Write property tests for related reports fetching
  - **Property 11: Related Reports Same Content**
  - **Property 12: Related Reports Same User**
  - **Validates: Requirements 7.1, 7.2**

- [x] 2.2.4 Write integration tests for evidence display flow
  - Test evidence display with all field types
  - Test evidence display with partial fields
  - Test evidence display with no fields
  - Test related reports display
  - Test related reports with no matches
  - _Requirements: 7.1, 7.2, 8.1, 9.1_

- [x] 2.2.5 Run all automated tests and fix failures
  - Ensure all property tests pass
  - Ensure all integration tests pass
  - Fix any TypeScript/linting errors
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 3. Phase 3: Reporter Accuracy

- [x] 3.1 Implementation Tasks

- [x] 3.1.1 Implement calculateReporterAccuracy function
  - Add function to `client/src/lib/moderationService.ts`
  - Query all reports by reporter ID
  - Count accurate reports (resolved with action taken)
  - Calculate accuracy rate as percentage
  - Return object with totalReports, accurateReports, accuracyRate
  - Handle edge cases (0 reports, null reporter)
  - _Requirements: 5.2_

- [x] 3.1.2 Add reporter accuracy display to ReportCard
  - Add conditional badge rendering based on metadata.reporterAccuracy
  - Implement color coding: green ≥80%, yellow ≥50%, red <50%
  - Display format: "Reporter: X% accurate"
  - Position badge with other metadata badges
  - _Requirements: 5.1_

- [x] 3.1.3 Add reporter accuracy display to User Violation History
  - Add conditional section for reporter accuracy
  - Display large percentage with fraction (e.g., "85% (17/20 reports)")
  - Only show for user reports (not moderator flags)
  - Position after existing stats, before related reports
  - _Requirements: 6.2_

- [x] 3.1.4 Integrate accuracy calculation into report flow
  - Calculate accuracy when loading ModerationActionPanel
  - Store accuracy in component state
  - Pass accuracy to display components
  - Handle loading and error states
  - _Requirements: 5.1, 5.2, 6.2_

- [x] 3.2 Automated Tests

- [x] 3.2.1 Write property tests for accuracy calculation
  - **Property 8: Reporter Accuracy Calculation**
  - Test with various report scenarios
  - Test edge cases (0 reports, all accurate, all inaccurate)
  - Test null handling
  - **Validates: Requirements 5.2**

- [x] 3.2.2 Write property tests for accuracy badge display
  - **Property 7: Reporter Accuracy Display in Cards**
  - Test color coding logic
  - Test badge rendering conditions
  - **Validates: Requirements 5.1**

- [x] 3.2.3 Write property tests for accuracy in violation history
  - **Property 9: User Violation History Display**
  - **Property 10: Conditional Reporter Accuracy in History**
  - Test conditional display logic
  - Test accuracy formatting
  - **Validates: Requirements 6.1, 6.2**

- [x] 3.2.4 Write integration tests for accuracy flow
  - Test accuracy calculation integration
  - Test accuracy display in report cards
  - Test accuracy display in violation history
  - Test conditional display logic
  - _Requirements: 5.1, 5.2, 6.2_

- [x] 3.2.5 Run all automated tests and fix failures
  - Ensure all property tests pass
  - Ensure all integration tests pass
  - Fix any TypeScript/linting errors
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 4. Phase 4: Polish & Metrics

- [x] 4.1 Implementation Tasks

- [x] 4.1.1 Add examples section to ReportModal
  - Create collapsible "Examples of Good Reports" section
  - Add examples specific to each violation type
  - Show good vs bad report examples
  - Position at bottom of modal
  - Style with subtle background color
  - _Requirements: 3.1, 3.2_

- [x] 4.1.2 Implement URL format validation
  - Add URL validation function to ReportModal
  - Add URL validation function to ModeratorFlagModal
  - Validate format on blur or submit
  - Display clear error message for invalid URLs
  - Allow empty (optional) URLs
  - _Requirements: 10.1_

- [x] 4.1.3 Implement timestamp format validation
  - Add timestamp validation function (MM:SS or HH:MM:SS)
  - Validate format on blur or submit
  - Display clear error message for invalid timestamps
  - Allow empty (optional) timestamps
  - _Requirements: 2.1, 2.2_

- [x] 4.1.4 Add report quality metrics to ModerationMetrics
  - Add "Report Quality" section to Metrics tab
  - Calculate percentage of reports with evidence
  - Calculate average description length
  - Calculate percentage meeting minimum character requirement
  - Display metrics with charts/graphs
  - _Requirements: 11.1_

- [x] 4.1.5 Add copy-to-clipboard functionality for timestamps
  - Add copy button next to timestamp display in action panel
  - Implement clipboard API integration
  - Show success feedback on copy
  - Handle clipboard API errors gracefully
  - _Requirements: 8.1_

- [x] 4.1.6 Performance testing and optimization
  - Test report submission latency
  - Test evidence display load time
  - Test related reports query performance
  - Test accuracy calculation performance
  - Optimize slow queries if needed
  - Add database indexes if needed
  - _Requirements: All_

- [x] 4.2 Automated Tests

- [x] 4.2.1 Write unit tests for examples section
  - Test collapsible functionality
  - Test example content rendering
  - Test conditional display by violation type
  - _Requirements: 3.1, 3.2_

- [x] 4.2.2 Write property tests for URL validation
  - **Property 15: URL Format Validation**
  - Test various invalid URL formats
  - Test valid URL formats
  - Test empty/null handling
  - **Validates: Requirements 10.1**

- [x] 4.2.3 Write unit tests for timestamp validation
  - Test valid formats (2:35, 1:23:45)
  - Test invalid formats
  - Test edge cases
  - _Requirements: 2.1, 2.2_

- [x] 4.2.4 Write property tests for report quality metrics
  - **Property 16: Report Quality Metrics**
  - Test metric calculations with various data
  - Test edge cases (no reports, all with evidence, none with evidence)
  - **Validates: Requirements 11.1**
  - **Status:** PASSING - All 7 property tests passing

- [x] 4.2.5 Write unit tests for copy-to-clipboard
  - Test clipboard API integration
  - Test success feedback
  - Test error handling
  - _Requirements: 8.1_

- [x] 4.2.6 Write comprehensive E2E tests
  - Test complete user report flow with evidence
  - Test complete moderator flag flow with evidence
  - Test moderator review flow with evidence display
  - Test reporter accuracy flow
  - Test related reports display
  - Test validation error flows
  - _Requirements: All_
  - **Status:** PASSING - All 11 integration tests passing

- [x] 4.2.7 Run all automated tests and fix failures
  - All 75 tests for task 4.2 passing
  - Fixed ModerationMetrics mocking issues
  - Fixed ReportModal validation timing issues
  - Fixed examples section visibility issues
  - Ensure all property tests pass
  - Ensure all integration tests pass
  - Ensure all E2E tests pass
  - Fix any TypeScript/linting errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4.3 Manual Testing (After all automated tests pass)

- [x] 4.3.1 Manual validation checklist
  **Evidence Collection:**
  - [x] Copyright evidence fields appear when copyright reason selected
  - [x] Audio timestamp field appears when hate speech/harassment selected
  - [x] Evidence fields are optional (can submit without them)
  - [x] Description requires 20 characters minimum
  - [x] Error messages are clear and helpful
  - [x] Moderator flag modal has same evidence fields
  
  **Evidence Display:**
  - [x] Evidence displays prominently in action panel with blue border
  - [x] Original work links are clickable and open in new tab
  - [x] Evidence badge appears in report cards when evidence exists
  - [x] Evidence badge does not appear when no evidence
  - [x] Related reports display correctly (same content and same user)
  - [x] Related reports limited to 5 per category
  
  **Reporter Accuracy:**
  - [x] Accuracy badge displays in report cards with correct color
  - [x] Green badge for ≥80% accuracy
  - [x] Yellow badge for 50-79% accuracy
  - [x] Red badge for <50% accuracy
  - [x] Accuracy displays in User Violation History for user reports
  - [x] Accuracy does not display for moderator flags
  - [x] Accuracy calculation is correct
  
  **Report Quality Metrics:**
  - [x] Metrics tab shows report quality statistics
  - [x] Evidence provision rate displays correctly
  - [x] Average description length displays correctly
  - [x] Minimum character requirement percentage displays correctly
  
  **Examples Section:**
  - [x] Examples section is collapsible
  - [x] Examples are specific to violation type
  - [x] Good vs bad examples are clear
  
  **Validation:**
  - [x] URL validation rejects invalid formats
  - [x] URL validation accepts valid formats
  - [x] Timestamp validation rejects invalid formats (e.g., "abc", "99:99")
  - [x] Timestamp validation accepts valid formats (e.g., "2:35", "1:23:45")
  - [x] Copy-to-clipboard works for timestamps
  
  **Performance:**
  - [x] Report submission completes in <2 seconds
  - [x] Evidence display loads in <1 second
  - [x] Related reports query completes in <500ms
  - [x] No console errors or warnings
  - [x] No memory leaks during extended use

## Notes

- **Automated tests MUST be run and pass before manual testing**
- Each phase has clear separation: Implementation → Automated Tests → Manual Testing (Phase 4 only)
- Manual testing uses checklists for straightforward validation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after automated tests
- Property tests validate universal correctness properties (minimum 100 iterations)
- Unit tests validate specific examples and edge cases
- Integration tests validate component interactions
- E2E tests validate complete user workflows
- Manual testing validates UI/UX aspects that cannot be automated

## Documentation Created

- ✅ **Manual Testing Validation Guide:** `docs/features/enhanced-report-evidence/testing/test-manual-validation-guide.md`
  - Comprehensive step-by-step testing instructions
  - Covers all phases and features
  - Includes E2E flows and performance testing
  - 34KB detailed guide with checklists
- ✅ **Feature README:** `docs/features/enhanced-report-evidence/README.md`
  - Feature overview and status
  - Links to all documentation
  - Testing status and next steps
