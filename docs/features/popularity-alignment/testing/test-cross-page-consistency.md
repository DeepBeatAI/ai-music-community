# Cross-Page Consistency Testing Checklist

## Overview

This document provides a comprehensive checklist for verifying that trending tracks and popular creators are consistent across the Home, Discover, and Analytics pages after implementing the popularity alignment feature.

## Prerequisites

- All previous tasks (1-3) must be completed
- Application must be running locally or deployed
- Test data should exist in the database (tracks and creators with engagement metrics)

## Automated Verification

### Running the Verification Script

```bash
cd client
node ../scripts/testing/verify-popularity-consistency.js
```

This script will:
- Fetch trending tracks and popular creators from the database
- Compare results across different page limits
- Report any inconsistencies
- Provide a pass/fail summary

## Manual Testing Checklist

### Task 4.1: Compare Trending Tracks Across Pages

#### Step 1: Home Page Trending Tracks
- [ ] Navigate to the Home page (`/`)
- [ ] Locate the "Trending This Week" section
- [ ] Note the tracks displayed (should be 4 tracks maximum)
- [ ] Record track titles and authors:
  ```
  1. ___________________________
  2. ___________________________
  3. ___________________________
  4. ___________________________
  ```

#### Step 2: Discover Page Trending Tracks
- [ ] Navigate to the Discover page (`/discover`)
- [ ] Locate the "Trending This Week" section
- [ ] Note the tracks displayed (should be 8 tracks maximum)
- [ ] Verify the first 4 tracks match the Home page tracks
- [ ] Record track titles and authors:
  ```
  1. ___________________________
  2. ___________________________
  3. ___________________________
  4. ___________________________
  5. ___________________________
  6. ___________________________
  7. ___________________________
  8. ___________________________
  ```

#### Step 3: Analytics Page Trending Tracks
- [ ] Navigate to the Analytics page (`/analytics`)
- [ ] Locate the "Trending This Week" or "7 Days" tab
- [ ] Note the tracks displayed
- [ ] Verify the first 4 tracks match the Home page tracks
- [ ] Record track titles and authors:
  ```
  1. ___________________________
  2. ___________________________
  3. ___________________________
  4. ___________________________
  (additional tracks...)
  ```

#### Step 4: Verify 7-Day Time Window
- [ ] Check that all pages show tracks created within the last 7 days
- [ ] Verify no tracks older than 7 days appear in any "Trending This Week" section
- [ ] Confirm the date range is consistent across all pages

#### Verification Criteria
- ✅ First 4 tracks on Home match first 4 on Discover
- ✅ First 4 tracks on Home match first 4 on Analytics
- ✅ Track order is identical across pages
- ✅ All tracks are within 7-day window
- ✅ Trending scores are consistent

---

### Task 4.2: Compare Popular Creators Across Pages

#### Step 1: Home Page Popular Creators
- [ ] Navigate to the Home page (`/`)
- [ ] Locate the "Popular Creators" section
- [ ] Note the creators displayed (should be 3 creators maximum)
- [ ] Record creator usernames:
  ```
  1. ___________________________
  2. ___________________________
  3. ___________________________
  ```

#### Step 2: Discover Page Popular Creators
- [ ] Navigate to the Discover page (`/discover`)
- [ ] Locate the "Popular Creators" section
- [ ] Note the creators displayed (should be 6 creators maximum)
- [ ] Verify the first 3 creators match the Home page creators
- [ ] Record creator usernames:
  ```
  1. ___________________________
  2. ___________________________
  3. ___________________________
  4. ___________________________
  5. ___________________________
  6. ___________________________
  ```

#### Step 3: Analytics Page Popular Creators
- [ ] Navigate to the Analytics page (`/analytics`)
- [ ] Locate the "Popular Creators" or "7 Days" tab
- [ ] Note the creators displayed
- [ ] Verify the first 3 creators match the Home page creators
- [ ] Record creator usernames:
  ```
  1. ___________________________
  2. ___________________________
  3. ___________________________
  (additional creators...)
  ```

#### Step 4: Verify 7-Day Time Window
- [ ] Check that all pages show creators with tracks created within the last 7 days
- [ ] Verify creators without recent tracks (last 7 days) don't appear
- [ ] Confirm the date range is consistent across all pages

#### Verification Criteria
- ✅ First 3 creators on Home match first 3 on Discover
- ✅ First 3 creators on Home match first 3 on Analytics
- ✅ Creator order is identical across pages
- ✅ All creators have tracks within 7-day window
- ✅ Creator scores are consistent

---

### Task 4.3: Verify Section Naming Consistency

#### Step 1: Home Page Section Names
- [ ] Navigate to the Home page (`/`)
- [ ] Verify section header: "Trending This Week" ✓
- [ ] Verify section header: "Popular Creators" ✓
- [ ] Verify section header: "Suggested for You" ✓
- [ ] Record any incorrect labels: ___________________________

#### Step 2: Discover Page Section Names
- [ ] Navigate to the Discover page (`/discover`)
- [ ] Verify section header: "Trending This Week" ✓
- [ ] Verify section header: "Popular Creators" ✓
- [ ] Verify section header: "Suggested for You" ✓
- [ ] Confirm NO "Featured Creators" label exists
- [ ] Confirm NO "Recommended for You" label exists
- [ ] Record any incorrect labels: ___________________________

#### Step 3: Analytics Page Section Names
- [ ] Navigate to the Analytics page (`/analytics`)
- [ ] Verify appropriate labels for trending tracks section
- [ ] Verify appropriate labels for popular creators section
- [ ] Confirm labels are descriptive and clear
- [ ] Record section labels: ___________________________

#### Verification Criteria
- ✅ "Trending This Week" appears on Home, Discover, and Analytics
- ✅ "Popular Creators" appears on Home and Discover
- ✅ "Suggested for You" appears on Home and Discover
- ✅ NO "Featured Creators" on any page
- ✅ NO "Recommended for You" on any page
- ✅ Analytics uses appropriate, descriptive labels

---

## Edge Cases to Test

### Empty States
- [ ] Test with no tracks in database (should show empty state)
- [ ] Test with no tracks in last 7 days (should show empty state)
- [ ] Test with no creators with recent tracks (should show empty state)

### Data Freshness
- [ ] Clear browser cache and reload pages
- [ ] Verify data is consistent after cache clear
- [ ] Wait 5+ minutes (cache expiry) and verify data refreshes

### Different Result Limits
- [ ] Verify Home shows exactly 4 trending tracks (or fewer if not enough data)
- [ ] Verify Discover shows exactly 8 trending tracks (or fewer if not enough data)
- [ ] Verify Home shows exactly 3 popular creators (or fewer if not enough data)
- [ ] Verify Discover shows exactly 6 popular creators (or fewer if not enough data)

### Scoring Consistency
- [ ] Verify trending score formula: (play_count × 0.7) + (like_count × 0.3)
- [ ] Verify creator score formula: (total_plays × 0.6) + (total_likes × 0.4)
- [ ] Confirm scores are identical for same track/creator across pages

---

## Browser Testing

Test consistency across different browsers:

### Chrome
- [ ] Home page consistency verified
- [ ] Discover page consistency verified
- [ ] Analytics page consistency verified

### Firefox
- [ ] Home page consistency verified
- [ ] Discover page consistency verified
- [ ] Analytics page consistency verified

### Safari
- [ ] Home page consistency verified
- [ ] Discover page consistency verified
- [ ] Analytics page consistency verified

### Mobile (Chrome/Safari)
- [ ] Home page consistency verified
- [ ] Discover page consistency verified
- [ ] Analytics page consistency verified

---

## Performance Verification

### Caching
- [ ] Verify cache is working (check browser console for cache hits)
- [ ] Verify 5-minute cache duration
- [ ] Verify cache is shared across components on same page
- [ ] Verify cache is shared across different pages

### Load Times
- [ ] Measure Home page load time: _____ ms
- [ ] Measure Discover page load time: _____ ms
- [ ] Measure Analytics page load time: _____ ms
- [ ] Verify all pages load in < 3 seconds

### Database Queries
- [ ] Verify queries complete in < 100ms (check network tab)
- [ ] Verify no duplicate queries for same data
- [ ] Verify request deduplication is working

---

## Issue Reporting Template

If inconsistencies are found, document them using this template:

```markdown
### Issue: [Brief Description]

**Severity:** [Critical / High / Medium / Low]

**Pages Affected:**
- [ ] Home
- [ ] Discover
- [ ] Analytics

**Description:**
[Detailed description of the inconsistency]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Screenshots:**
[Attach screenshots if applicable]

**Browser/Device:**
[Browser name and version, device type]

**Additional Context:**
[Any other relevant information]
```

---

## Sign-Off

### Task 4.1: Compare Trending Tracks
- [ ] All checks passed
- [ ] Issues documented (if any)
- [ ] Tested by: ___________________________
- [ ] Date: ___________________________

### Task 4.2: Compare Popular Creators
- [ ] All checks passed
- [ ] Issues documented (if any)
- [ ] Tested by: ___________________________
- [ ] Date: ___________________________

### Task 4.3: Verify Section Naming
- [ ] All checks passed
- [ ] Issues documented (if any)
- [ ] Tested by: ___________________________
- [ ] Date: ___________________________

### Overall Verification
- [ ] All subtasks completed
- [ ] All consistency checks passed
- [ ] No critical issues found
- [ ] Ready to proceed to next task

**Final Sign-Off:**
- Tester: ___________________________
- Date: ___________________________
- Status: [ ] PASS / [ ] FAIL

---

## Notes

Use this section to record any additional observations, concerns, or recommendations:

```
[Your notes here]
```
