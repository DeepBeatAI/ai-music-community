# Manual Testing Validation Guide
# Enhanced Report Evidence & Context Feature

## Document Information
- **Feature:** Enhanced Report Evidence & Context
- **Version:** 1.0
- **Last Updated:** January 2, 2026
- **Prerequisites:** All automated tests must pass before manual testing

## Overview

This guide provides step-by-step instructions for manually validating the Enhanced Report Evidence & Context feature. All automated tests should pass before beginning manual testing.

**Testing Environment:**
- Local development server running on http://localhost:3000
- Test user accounts with different roles (user, moderator, admin)
- Sample content (tracks, posts, comments) for reporting

---

## Test Setup

### Prerequisites Checklist

- [ ] All automated tests passing (19 tests from Phase 1-3, 75 tests from Phase 4)
- [ ] Development server running (
pm run dev in client directory)
- [ ] Database seeded with test data
- [ ] At least 3 test accounts created:
  - Regular user account (for submitting reports)
  - Moderator account (for reviewing reports and flagging)
  - Admin account (for accessing metrics)

### Test Data Setup

Create the following test content before starting:

1. **Test Track:** Upload a track titled "Test Track for Reporting"
2. **Test Post:** Create a post with text content
3. **Test Comment:** Add a comment to any post
4. **Test User Profile:** Identify a user profile to report

---

## Phase 1: Evidence Collection Testing

### Test 1.1: Copyright Evidence Fields (User Report)

**Objective:** Verify copyright evidence fields appear and function correctly

**Steps:**
1. Log in as a regular user
2. Navigate to any track
3. Click the "Report" button (flag icon)
4. In the report modal, select reason: "Copyright Violation"

**Expected Results:**
- [ ] "Link to Original Work" field appears (optional)
- [ ] "Proof of Ownership" field appears (optional)
- [ ] Helper text displays: "Providing evidence helps moderators process your report faster"
- [ ] Fields are clearly labeled and styled

**Test with Evidence:**
5. Enter link: "https://example.com/original-work"
6. Enter proof: "I am the original creator and can provide documentation"
7. Enter description: "This track uses my copyrighted melody without permission"
8. Click "Submit Report"

**Expected Results:**
- [ ] Report submits successfully
- [ ] Success message appears
- [ ] Modal closes

**Test without Evidence:**
9. Open report modal again
10. Select "Copyright Violation"
11. Enter only description (minimum 20 characters)
12. Leave evidence fields empty
13. Click "Submit Report"

**Expected Results:**
- [ ] Report submits successfully (evidence is optional)
- [ ] No errors displayed

---

### Test 1.2: Audio Timestamp Evidence (User Report)

**Objective:** Verify timestamp field appears for audio content violations

**Steps:**
1. Navigate to any track
2. Click "Report" button
3. Select reason: "Hate Speech"

**Expected Results:**
- [ ] "Timestamp in Audio" field appears (optional)
- [ ] Helper text: "Help moderators find the violation quickly (e.g., 2:35)"
- [ ] Field accepts MM:SS or HH:MM:SS format

**Test Valid Timestamps:**
4. Enter timestamp: "2:35"
5. Enter description: "Hate speech occurs at this timestamp"
6. Submit report

**Expected Results:**
- [ ] Report submits successfully
- [ ] Timestamp is stored

7. Try another report with timestamp: "1:23:45"

**Expected Results:**
- [ ] Accepts HH:MM:SS format
- [ ] Report submits successfully

**Test Multiple Timestamps:**
8. Enter: "2:35, 5:12, 8:45"
9. Submit report

**Expected Results:**
- [ ] Accepts comma-separated timestamps
- [ ] Report submits successfully

---

### Test 1.3: Description Minimum Length Validation

**Objective:** Verify 20-character minimum for descriptions

**Steps:**
1. Open report modal
2. Select any reason
3. Enter description: "spam" (4 characters)
4. Attempt to submit

**Expected Results:**
- [ ] Error message displays: "Please provide at least 20 characters describing the violation"
- [ ] Submit button disabled or shows error
- [ ] Character counter shows: "4 / 1000 characters (minimum 20)"

5. Enter description: "This is spam content that violates rules" (40+ characters)
6. Submit report

**Expected Results:**
- [ ] Report submits successfully
- [ ] No validation errors

---

### Test 1.4: Moderator Flag Evidence Fields

**Objective:** Verify moderators have same evidence fields

**Steps:**
1. Log in as moderator account
2. Navigate to any track
3. Click "Flag Content" button (moderator-only)
4. Select reason: "Copyright Violation"

**Expected Results:**
- [ ] "Link to Original Work" field appears
- [ ] "Proof of Ownership" field appears
- [ ] Same helper text as user reports
- [ ] Internal notes field has 10-character minimum (not 20)

5. Enter evidence fields
6. Enter internal notes: "Flagging for review" (18 characters)
7. Submit flag

**Expected Results:**
- [ ] Flag submits successfully
- [ ] Evidence is stored with flag

---

### Test 1.5: Reporting Tips Section

**Objective:** Verify examples section displays correctly

**Steps:**
1. Open report modal as regular user
2. Look for "Reporting Tips" or "Examples" section

**Expected Results:**
- [ ] Tips section is collapsible
- [ ] Section is collapsed by default (or expanded, check design)
- [ ] Click to expand shows examples

3. Expand the tips section

**Expected Results:**
- [ ] Shows "Good" example: Detailed report with specifics
- [ ] Shows "Bad" example: Vague report like "This is spam"
- [ ] Examples are relevant to selected reason

4. Change reason to "Copyright Violation"

**Expected Results:**
- [ ] Examples update to show copyright-specific tips
- [ ] Mentions providing evidence for copyright claims

---

## Phase 2: Evidence Display Testing

### Test 2.1: Evidence Display in Moderation Action Panel

**Objective:** Verify evidence displays prominently in action panel

**Steps:**
1. Log in as moderator
2. Navigate to Moderation Queue
3. Find a report with copyright evidence (from Test 1.1)
4. Click to open the report in ModerationActionPanel

**Expected Results:**
- [ ] Evidence section appears with blue border
- [ ] Section title: "Evidence Provided"
- [ ] Original work link displays as clickable URL
- [ ] Link opens in new tab when clicked
- [ ] Proof of ownership text displays in highlighted box
- [ ] Section appears after "Report Details" and before "Profile Context"

5. Find a report with audio timestamp
6. Open in action panel

**Expected Results:**
- [ ] Timestamp displays clearly (e.g., " 2:35")
- [ ] Multiple timestamps display as list if provided
- [ ] Timestamps are easy to read and prominent

7. Find a report without evidence
8. Open in action panel

**Expected Results:**
- [ ] No evidence section appears
- [ ] No warning about missing evidence (evidence is optional)

---

### Test 2.2: Evidence Badge in Report Cards

**Objective:** Verify evidence indicator badge appears in queue

**Steps:**
1. In Moderation Queue, locate reports with evidence
2. Look at the report cards (list view)

**Expected Results:**
- [ ] Reports with evidence show " Evidence Provided" badge
- [ ] Badge has blue color scheme
- [ ] Badge is clearly visible without opening report

3. Hover over evidence badge

**Expected Results:**
- [ ] Tooltip shows preview of evidence (if implemented)
- [ ] Or badge is clearly labeled

4. Locate reports without evidence

**Expected Results:**
- [ ] No evidence badge appears
- [ ] Report card looks normal

---

### Test 2.3: Related Reports Display

**Objective:** Verify related reports show in action panel

**Setup:**
- Create 2-3 reports about the same track (same target_id)
- Create 2-3 reports about the same user (same reported_user_id)

**Steps:**
1. Open one of the reports in ModerationActionPanel
2. Scroll to "User Violation History" section
3. Look for "Related Reports" subsection

**Expected Results:**
- [ ] "Related Reports" section appears
- [ ] Shows "Same content" reports (up to 5)
- [ ] Shows "Same user" reports (up to 5)
- [ ] Each related report shows: date, reason, status
- [ ] Reports are ordered by most recent first

4. Verify report details are accurate

**Expected Results:**
- [ ] Reason labels are correct
- [ ] Status labels are correct (pending, resolved, etc.)
- [ ] Dates are formatted properly

5. Open a report with no related reports

**Expected Results:**
- [ ] "Related Reports" section either doesn't appear or shows "No related reports"

---

### Test 2.4: Multiple Reports Badge

**Objective:** Verify badge appears when multiple users report same content

**Setup:**
- Have 2+ different users report the same track

**Steps:**
1. View the report cards in Moderation Queue
2. Look for the report about the multiply-reported content

**Expected Results:**
- [ ] "Multiple Reports" badge appears with count (e.g., "3 reports")
- [ ] Badge is visually distinct
- [ ] Count is accurate

---

## Phase 3: Reporter Accuracy Testing

### Test 3.1: Reporter Accuracy Calculation

**Setup:**
- Create test reports with known outcomes:
  - User A: 10 reports, 8 resolved with action, 2 dismissed
  - Expected accuracy: 80%

**Steps:**
1. Log in as moderator
2. Open a report from User A
3. Look at User Violation History section

**Expected Results:**
- [ ] "Reporter Accuracy" subsection appears
- [ ] Shows percentage: "80%"
- [ ] Shows fraction: "8 accurate out of 10 reports"
- [ ] Percentage is large and bold
- [ ] Fraction is smaller, gray text

---

### Test 3.2: Reporter Accuracy Badge in Report Cards

**Objective:** Verify accuracy badge with color coding

**Steps:**
1. In Moderation Queue, find reports from users with different accuracy rates
2. Look for accuracy badges on report cards

**Expected Results for High Accuracy (80%):**
- [ ] Badge shows "Reporter: 85% accurate" (example)
- [ ] Badge has GREEN background (bg-green-900/30)
- [ ] Badge has GREEN text (text-green-400)

**Expected Results for Medium Accuracy (50-79%):**
- [ ] Badge shows "Reporter: 65% accurate" (example)
- [ ] Badge has YELLOW background (bg-yellow-900/30)
- [ ] Badge has YELLOW text (text-yellow-400)

**Expected Results for Low Accuracy (<50%):**
- [ ] Badge shows "Reporter: 30% accurate" (example)
- [ ] Badge has RED background (bg-red-900/30)
- [ ] Badge has RED text (text-red-400)

---

### Test 3.3: Accuracy Display for Moderator Flags

**Objective:** Verify accuracy does NOT display for moderator flags

**Steps:**
1. Open a moderator-flagged report (moderator_flagged = true)
2. Look at User Violation History section

**Expected Results:**
- [ ] "Reporter Accuracy" section does NOT appear
- [ ] Only shows total reports and past actions
- [ ] No accuracy percentage or badge

---

### Test 3.4: Trusted Reporter Badge

**Objective:** Verify special badge for highly accurate reporters

**Setup:**
- User with >90% accuracy and >10 reports

**Steps:**
1. Find report from this user
2. Look at report card and action panel

**Expected Results:**
- [ ] "Trusted Reporter" badge appears (if implemented)
- [ ] Badge is visually distinct (special color/icon)

---

## Phase 2: Evidence Display Testing

### Test 2.1: Evidence Display in Action Panel

**Objective:** Verify evidence displays prominently in moderation action panel

**Steps:**
1. Log in as moderator account
2. Navigate to Moderation Queue
3. Find a report with copyright evidence (from Test 1.1)
4. Click to open the report in action panel

**Expected Results:**
- [ ] Evidence section appears with blue border
- [ ] Section title: "Evidence Provided"
- [ ] Original work link displays as clickable URL
- [ ] Link opens in new tab when clicked
- [ ] Proof of ownership text displays in highlighted box
- [ ] Section appears after "Report Details" and before "Profile Context"

**Test Report Without Evidence:**
5. Find a report without evidence
6. Open in action panel

**Expected Results:**
- [ ] No evidence section displays
- [ ] No empty evidence boxes or placeholders

---

### Test 2.2: Evidence Badge in Report Cards

**Objective:** Verify evidence badge appears in queue

**Steps:**
1. In Moderation Queue, locate reports with evidence
2. Look at the report card (list view)

**Expected Results:**
- [ ] " Evidence Provided" badge displays on reports with evidence
- [ ] Badge has blue color scheme
- [ ] Badge does not appear on reports without evidence

3. Hover over the evidence badge

**Expected Results:**
- [ ] Tooltip shows preview of evidence (if implemented)
- [ ] Or badge is clearly visible without hover

---

### Test 2.3: Timestamp Display in Action Panel

**Objective:** Verify audio timestamps display correctly

**Steps:**
1. Find a track report with timestamp evidence (from Test 1.2)
2. Open in action panel

**Expected Results:**
- [ ] Timestamp displays in evidence section
- [ ] Format: " 2:35" or similar
- [ ] Timestamp is prominently displayed
- [ ] If multiple timestamps, all display in order

---

### Test 2.4: Related Reports Display

**Objective:** Verify related reports show in action panel

**Setup:**
1. Create 3 reports against the same track (same target_id)
2. Create 2 reports against the same user (same reported_user_id)

**Steps:**
3. Open one of the reports in action panel
4. Scroll to "User Violation History" section
5. Look for "Related Reports" subsection

**Expected Results:**
- [ ] "Related Reports" section displays
- [ ] "Same content" subsection shows other reports on same track (max 5)
- [ ] Each related report shows: date, reason, status
- [ ] "Same user" subsection shows other reports against same user (max 5)
- [ ] Reports are ordered by most recent first
- [ ] Color coding distinguishes different report types

**Test with No Related Reports:**
6. Open a report with no related reports

**Expected Results:**
- [ ] "Related Reports" section does not display
- [ ] Or displays "No related reports found"

---

### Test 2.5: Multiple Reports Badge

**Objective:** Verify badge appears when multiple users report same content

**Setup:**
1. Have 3 different users report the same track

**Steps:**
2. View the report cards in moderation queue

**Expected Results:**
- [ ] "Multiple Reports" badge displays with count (e.g., "3 reports")
- [ ] Badge is visually distinct
- [ ] Clicking any report shows related reports in action panel

---

## Phase 3: Reporter Accuracy Testing

### Test 3.1: Accuracy Calculation

**Objective:** Verify accuracy is calculated correctly

**Setup:**
1. Create a test reporter account
2. Submit 10 reports from this account
3. As moderator, resolve 7 with action taken (accurate)
4. Dismiss 3 without action (inaccurate)

**Steps:**
5. Submit a new report from the test reporter
6. As moderator, open this report in action panel
7. Look at "User Violation History" section

**Expected Results:**
- [ ] "Reporter Accuracy" subsection displays
- [ ] Shows: "70%" (7/10 accurate)
- [ ] Shows fraction: "7 accurate out of 10 reports"
- [ ] Percentage is large and bold
- [ ] Fraction is smaller text below

---

### Test 3.2: Accuracy Badge in Report Cards

**Objective:** Verify accuracy badge displays with correct color

**Steps:**
1. View report cards in queue from reporters with different accuracy rates

**High Accuracy (80%):**
- [ ] Badge displays: "Reporter: 85% accurate"
- [ ] Badge color: Green background, green text
- [ ] Badge class: bg-green-900/30 text-green-400

**Medium Accuracy (50-79%):**
- [ ] Badge displays: "Reporter: 65% accurate"
- [ ] Badge color: Yellow background, yellow text
- [ ] Badge class: bg-yellow-900/30 text-yellow-400

**Low Accuracy (<50%):**
- [ ] Badge displays: "Reporter: 30% accurate"
- [ ] Badge color: Red background, red text
- [ ] Badge class: bg-red-900/30 text-red-400

---

### Test 3.3: Accuracy Does Not Display for Moderator Flags

**Objective:** Verify accuracy only shows for user reports

**Steps:**
1. Create a moderator flag (not user report)
2. Open in action panel
3. Check "User Violation History" section

**Expected Results:**
- [ ] "Reporter Accuracy" subsection does NOT display
- [ ] Only shows total reports and past actions
- [ ] No accuracy percentage or fraction

---

### Test 3.4: Trusted Reporter Badge

**Objective:** Verify special badge for high-accuracy reporters

**Setup:**
1. Create reporter with >90% accuracy and >10 total reports

**Steps:**
2. View their reports in queue

**Expected Results:**
- [ ] "Trusted Reporter" badge displays (if implemented)
- [ ] Badge is visually distinct from regular accuracy badge

---

### Test 3.5: Low Accuracy Warning

**Objective:** Verify warning for low-accuracy reporters

**Setup:**
1. Create reporter with <30% accuracy and >5 total reports

**Steps:**
2. View their reports in queue

**Expected Results:**
- [ ] "Low Accuracy" warning badge displays (if implemented)
- [ ] Badge uses warning colors (red/orange)

---

## Phase 2: Evidence Display Testing

### Test 2.1: Evidence Display in Action Panel

**Objective:** Verify evidence displays prominently in moderation action panel

**Steps:**
1. Log in as moderator account
2. Navigate to Moderation Queue
3. Find a report that has copyright evidence (from Test 1.1)
4. Click to open the report in the action panel

**Expected Results:**
- [ ] Evidence section appears with blue border
- [ ] Section title: "Evidence Provided"
- [ ] "Link to original work" displays as clickable link
- [ ] "Proof of ownership" displays as text
- [ ] Evidence section appears after Report Details, before Profile Context

5. Click the "Link to original work" URL

**Expected Results:**
- [ ] Link opens in new tab
- [ ] URL is correct (https://example.com/original-work)

---

### Test 2.2: Evidence Badge in Report Cards

**Objective:** Verify evidence badge appears in queue

**Steps:**
1. In Moderation Queue, view the list of reports
2. Find reports with evidence (from previous tests)

**Expected Results:**
- [ ] Reports with evidence show "📎 Evidence Provided" badge
- [ ] Badge has blue color scheme
- [ ] Badge is clearly visible

3. Find reports with timestamps

**Expected Results:**
- [ ] Shows timestamp badge: "🕐 2:35" (or whatever timestamp was entered)
- [ ] Badge has orange color scheme

4. Find reports with detailed descriptions (>100 characters)

**Expected Results:**
- [ ] Shows "📝 Detailed Report" badge
- [ ] Badge has green color scheme

5. Hover over an evidence badge

**Expected Results:**
- [ ] Tooltip appears showing evidence preview
- [ ] Tooltip is readable and helpful

---

### Test 2.3: Related Reports Display

**Objective:** Verify related reports appear in action panel

**Setup:**
1. Create 3 reports against the same track (same target_id)
2. Create 2 reports against the same user (same reported_user_id)

**Steps:**
1. Open one of the reports in action panel
2. Scroll to "Related Reports" section

**Expected Results:**
- [ ] "Related Reports" section appears
- [ ] Shows "Same content" subsection with up to 5 reports
- [ ] Shows "Same user" subsection with up to 5 reports
- [ ] Each related report shows: date, reason, status
- [ ] Reports are ordered by most recent first
- [ ] Limited to 5 per category

3. Check report card in queue

**Expected Results:**
- [ ] If multiple reports on same content, shows "Multiple Reports" badge with count
- [ ] Badge is clearly visible

---

### Test 2.4: No Evidence Display

**Objective:** Verify no evidence section when evidence is absent

**Steps:**
1. Find a report without any evidence
2. Open in action panel

**Expected Results:**
- [ ] No "Evidence Provided" section appears
- [ ] No evidence badges in report card
- [ ] Panel displays normally without errors

---

## Phase 3: Reporter Accuracy Testing

### Test 3.1: Accuracy Badge in Report Cards

**Objective:** Verify reporter accuracy badge displays with correct color

**Setup:**
1. Create a test reporter with known accuracy:
   - Submit 10 reports as test user
   - Have moderator resolve 8 with action, dismiss 2
   - This gives 80% accuracy

**Steps:**
1. View reports from this user in moderation queue

**Expected Results:**
- [ ] Badge displays: "Reporter: 80% accurate"
- [ ] Badge has GREEN color (≥80%)
- [ ] Badge is clearly visible in report card

**Test Color Coding:**
2. Create reporter with 60% accuracy (6/10 accurate)

**Expected Results:**
- [ ] Badge shows YELLOW color (50-79%)

3. Create reporter with 30% accuracy (3/10 accurate)

**Expected Results:**
- [ ] Badge shows RED color (<50%)

---

### Test 3.2: Accuracy in User Violation History

**Objective:** Verify accuracy displays in action panel for user reports

**Steps:**
1. Open a user report (not moderator flag) in action panel
2. Scroll to "User Violation History" section

**Expected Results:**
- [ ] "Reporter Accuracy" subsection appears
- [ ] Shows large percentage: "80%" (or actual rate)
- [ ] Shows fraction: "8 accurate out of 10 reports"
- [ ] Percentage is large and bold (2xl font)
- [ ] Fraction is smaller text below

3. Open a moderator flag in action panel

**Expected Results:**
- [ ] "Reporter Accuracy" section does NOT appear
- [ ] Only shows user violation history for reported user

---

### Test 3.3: Accuracy Calculation Verification

**Objective:** Verify accuracy calculation is correct

**Steps:**
1. Create a new test user
2. Submit exactly 5 reports
3. Have moderator resolve 3 with action taken
4. Have moderator dismiss 2 without action

**Expected Results:**
- [ ] Accuracy should be 60% (3/5)
- [ ] Badge shows "Reporter: 60% accurate"
- [ ] Fraction shows "3 accurate out of 5 reports"

---

## Phase 4: Polish & Validation Testing

### Test 4.1: URL Format Validation

**Objective:** Verify URL validation works correctly

**Steps:**
1. Open report modal
2. Select "Copyright Violation"
3. Enter invalid URL: "not-a-url"
4. Attempt to submit

**Expected Results:**
- [ ] Error message: "Please enter a valid URL (e.g., https://example.com)"
- [ ] Submit blocked or shows error

5. Enter valid URL: "https://example.com/original"
6. Submit report

**Expected Results:**
- [ ] Report submits successfully
- [ ] No validation errors

7. Leave URL field empty
8. Submit report

**Expected Results:**
- [ ] Report submits successfully (field is optional)

---

### Test 4.2: Timestamp Format Validation

**Objective:** Verify timestamp validation works correctly

**Steps:**
1. Open report modal for track
2. Select "Hate Speech"
3. Enter invalid timestamp: "abc"
4. Attempt to submit

**Expected Results:**
- [ ] Error message: "Please use format MM:SS or HH:MM:SS (e.g., 2:35)"
- [ ] Submit blocked or shows error

5. Enter invalid timestamp: "99:99"
6. Attempt to submit

**Expected Results:**
- [ ] Error message about invalid format
- [ ] Submit blocked

7. Enter valid timestamp: "2:35"
8. Submit report

**Expected Results:**
- [ ] Report submits successfully
- [ ] No validation errors

---

### Test 4.3: Copy-to-Clipboard for Timestamps

**Objective:** Verify copy functionality works

**Steps:**
1. Open a report with timestamp in action panel
2. Find the timestamp display
3. Look for copy button next to timestamp

**Expected Results:**
- [ ] Copy button is visible
- [ ] Button has clear icon (clipboard or copy icon)

4. Click copy button

**Expected Results:**
- [ ] Success feedback appears (toast or message)
- [ ] Timestamp is copied to clipboard
- [ ] Can paste timestamp elsewhere (test in notepad)

---

### Test 4.4: Report Quality Metrics

**Objective:** Verify metrics display in admin dashboard

**Steps:**
1. Log in as admin account
2. Navigate to Moderation Dashboard
3. Click on "Metrics" tab
4. Scroll to "Report Quality" section

**Expected Results:**
- [ ] "Report Quality" section appears
- [ ] Shows "Average Quality Score"
- [ ] Shows "% Reports with Evidence"
- [ ] Shows "% Reports with Detailed Description (>100 chars)"
- [ ] Shows breakdown by report reason
- [ ] All metrics display correctly with proper formatting

5. Check metrics accuracy:
   - Count reports with evidence manually
   - Compare with displayed percentage

**Expected Results:**
- [ ] Metrics are accurate
- [ ] Percentages calculated correctly

---

### Test 4.5: Queue Filtering by Evidence

**Objective:** Verify filtering works in moderation queue

**Steps:**
1. In Moderation Queue, look for filter options
2. Find "Has Evidence" checkbox filter

**Expected Results:**
- [ ] "Has Evidence" filter checkbox exists
- [ ] Checkbox is clearly labeled

3. Check the "Has Evidence" filter

**Expected Results:**
- [ ] Queue updates to show only reports with evidence
- [ ] Reports without evidence are hidden
- [ ] Count updates correctly

4. Uncheck the filter

**Expected Results:**
- [ ] All reports appear again
- [ ] Queue returns to normal view

---

### Test 4.6: Queue Sorting by Evidence

**Objective:** Verify reports with evidence appear higher in queue

**Steps:**
1. View moderation queue without filters
2. Observe order of reports (within same priority level)

**Expected Results:**
- [ ] Reports with evidence appear before reports without evidence
- [ ] Within same priority, evidence reports are sorted higher
- [ ] Sorting is consistent

---

## End-to-End Flow Testing

### E2E Test 1: Complete User Report Flow with Evidence

**Objective:** Test entire flow from report submission to resolution

**Steps:**
1. **As Regular User:**
   - Navigate to a track
   - Click "Report"
   - Select "Copyright Violation"
   - Enter link: "https://example.com/my-work"
   - Enter proof: "I am the original artist"
   - Enter description: "This track uses my copyrighted melody without permission or credit"
   - Submit report

2. **Verify Submission:**
   - [ ] Success message appears
   - [ ] Modal closes
   - [ ] No errors in console

3. **As Moderator:**
   - Navigate to Moderation Queue
   - Find the submitted report

4. **Verify Queue Display:**
   - [ ] Report appears in queue
   - [ ] Shows "📎 Evidence Provided" badge
   - [ ] Shows "📝 Detailed Report" badge
   - [ ] Report details are visible

5. **Open Report:**
   - Click to open in action panel

6. **Verify Action Panel:**
   - [ ] Evidence section displays with blue border
   - [ ] Link is clickable
   - [ ] Proof text is visible
   - [ ] Description is complete
   - [ ] User Violation History shows
   - [ ] Related Reports section shows (if any)

7. **Take Action:**
   - Review evidence
   - Click "Verify Evidence" button (if exists)
   - Take moderation action (e.g., "Remove Content")
   - Add resolution notes
   - Submit action

8. **Verify Resolution:**
   - [ ] Action completes successfully
   - [ ] Report status updates to "Resolved"
   - [ ] Report moves out of pending queue

---

### E2E Test 2: Complete Moderator Flag Flow with Evidence

**Objective:** Test moderator flagging with evidence

**Steps:**
1. **As Moderator:**
   - Navigate to a track
   - Click "Flag Content"
   - Select "Hate Speech"
   - Enter timestamp: "2:35, 5:12"
   - Enter internal notes: "Multiple instances of hate speech targeting specific group"
   - Set priority: High
   - Submit flag

2. **Verify Flag Creation:**
   - [ ] Success message appears
   - [ ] Flag appears in queue immediately
   - [ ] Shows moderator flag indicator

3. **As Another Moderator:**
   - Open the flagged report

4. **Verify Evidence Display:**
   - [ ] Timestamps display prominently
   - [ ] "Jump to Timestamp" buttons appear
   - [ ] Internal notes are visible
   - [ ] Priority is correct

5. **Test Timestamp Jump:**
   - Click "Jump to Timestamp" for 2:35

**Expected Results:**
   - [ ] Audio player seeks to 2:35
   - [ ] Playback starts at correct time
   - [ ] Timestamp highlights in evidence section

6. **Complete Review:**
   - Take appropriate action
   - Resolve flag

**Expected Results:**
   - [ ] Flag resolves successfully
   - [ ] Evidence is preserved in history

---

### E2E Test 3: Reporter Accuracy Impact Flow

**Objective:** Test how reporter accuracy affects moderation decisions

**Steps:**
1. **Create High-Accuracy Reporter:**
   - Submit 10 reports as User A
   - Have 9 resolved with action (90% accuracy)

2. **Create Low-Accuracy Reporter:**
   - Submit 10 reports as User B
   - Have 2 resolved with action (20% accuracy)

3. **Submit Similar Reports:**
   - User A reports Track X for spam
   - User B reports Track Y for spam
   - Both with similar descriptions

4. **As Moderator, Review Both:**
   - Open User A's report

**Expected Results:**
   - [ ] Shows "Reporter: 90% accurate" badge (green)
   - [ ] Accuracy displayed in violation history
   - [ ] Report appears more credible

5. Open User B's report

**Expected Results:**
   - [ ] Shows "Reporter: 20% accurate" badge (red)
   - [ ] Low accuracy is clearly visible
   - [ ] May influence moderator's scrutiny level

6. **Verify Decision Making:**
   - Moderator can see accuracy context
   - Can make informed decision based on reporter history

---

## Performance Testing

### Test P.1: Report Submission Latency

**Objective:** Verify submission completes quickly

**Steps:**
1. Open report modal
2. Fill in all fields with evidence
3. Click submit
4. Time from click to success message

**Expected Results:**
- [ ] Submission completes in < 2 seconds
- [ ] No lag or freezing
- [ ] Smooth user experience

---

### Test P.2: Evidence Display Load Time

**Objective:** Verify action panel loads quickly

**Steps:**
1. Open report with evidence in action panel
2. Time from click to full display

**Expected Results:**
- [ ] Panel loads in < 1 second
- [ ] Evidence displays immediately
- [ ] No loading delays

---

### Test P.3: Related Reports Query Performance

**Objective:** Verify related reports load quickly

**Steps:**
1. Open report with many related reports
2. Observe load time for related reports section

**Expected Results:**
- [ ] Related reports load in < 500ms
- [ ] No noticeable delay
- [ ] Query is optimized

---

## Browser Compatibility Testing

### Test B.1: Cross-Browser Validation

**Objective:** Verify feature works across browsers

**Browsers to Test:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**For Each Browser:**
1. Submit report with evidence
2. View report in queue
3. Open report in action panel
4. Verify all features work

**Expected Results:**
- [ ] All features work consistently
- [ ] No browser-specific bugs
- [ ] UI renders correctly

---

## Accessibility Testing

### Test A.1: Keyboard Navigation

**Objective:** Verify keyboard accessibility

**Steps:**
1. Open report modal
2. Use Tab key to navigate through fields
3. Use Enter to submit

**Expected Results:**
- [ ] All fields are keyboard accessible
- [ ] Tab order is logical
- [ ] Enter key submits form
- [ ] Escape key closes modal

---

### Test A.2: Screen Reader Compatibility

**Objective:** Verify screen reader support

**Steps:**
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate through report modal
3. Listen to field labels and descriptions

**Expected Results:**
- [ ] All fields have proper labels
- [ ] Helper text is announced
- [ ] Error messages are announced
- [ ] Success messages are announced

---

## Error Handling Testing

### Test E.1: Network Failure Handling

**Objective:** Verify graceful error handling

**Steps:**
1. Open browser DevTools
2. Go to Network tab
3. Enable "Offline" mode
4. Attempt to submit report

**Expected Results:**
- [ ] Error message displays
- [ ] Message is user-friendly
- [ ] Form data is not lost
- [ ] Can retry after reconnecting

---

### Test E.2: Invalid Data Handling

**Objective:** Verify validation catches all invalid inputs

**Test Cases:**
- [ ] Empty description (< 20 chars)
- [ ] Invalid URL format
- [ ] Invalid timestamp format
- [ ] Special characters in fields
- [ ] Extremely long inputs (> 1000 chars)

**Expected Results:**
- [ ] All invalid inputs are caught
- [ ] Clear error messages display
- [ ] Submit is blocked until fixed

---

## Final Validation Checklist

### Evidence Collection
- [ ] Copyright evidence fields work (user reports)
- [ ] Copyright evidence fields work (moderator flags)
- [ ] Audio timestamp fields work
- [ ] Description minimum length enforced
- [ ] Reporting tips display correctly
- [ ] All validation works correctly

### Evidence Display
- [ ] Evidence displays in action panel
- [ ] Evidence badges appear in queue
- [ ] Related reports display correctly
- [ ] No evidence section hidden when absent

### Reporter Accuracy
- [ ] Accuracy badge displays in cards
- [ ] Accuracy displays in violation history
- [ ] Color coding works (green/yellow/red)
- [ ] Accuracy calculation is correct
- [ ] No accuracy for moderator flags

### Polish & Features
- [ ] URL validation works
- [ ] Timestamp validation works
- [ ] Copy-to-clipboard works
- [ ] Report quality metrics display
- [ ] Queue filtering by evidence works
- [ ] Queue sorting by evidence works

### End-to-End Flows
- [ ] Complete user report flow works
- [ ] Complete moderator flag flow works
- [ ] Reporter accuracy impacts decisions

### Performance
- [ ] Report submission < 2 seconds
- [ ] Evidence display < 1 second
- [ ] Related reports < 500ms
- [ ] No memory leaks
- [ ] No console errors

### Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Keyboard accessible
- [ ] Screen reader compatible

---

## Test Results Documentation

### Test Execution Log

**Date:** _____________
**Tester:** _____________
**Environment:** _____________

**Summary:**
- Total Tests: ___
- Passed: ___
- Failed: ___
- Blocked: ___

**Failed Tests:**
1. Test ID: _____ | Issue: _____________________
2. Test ID: _____ | Issue: _____________________

**Notes:**
_________________________________________________________________
_________________________________________________________________

---

## Sign-Off

**Manual Testing Completed By:**
- Name: _____________
- Date: _____________
- Signature: _____________

**Approved By:**
- Name: _____________
- Date: _____________
- Signature: _____________

---

**End of Manual Testing Validation Guide**
