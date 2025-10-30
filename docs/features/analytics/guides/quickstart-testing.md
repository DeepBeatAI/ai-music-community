# Quick Start: Analytics Manual Testing

**Time Required**: 40-50 minutes  
**Goal**: Verify all analytics page fixes work correctly

---

## Before You Start

### Prerequisites Checklist
- [ ] Development server running: `npm run dev`
- [ ] Supabase running: `supabase start`
- [ ] Browser open to `http://localhost:3000/analytics`
- [ ] DevTools open (press F12)
- [ ] Test data exists in database

### Quick Database Check
Run these in Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM user_profiles;  -- Should be > 0
SELECT COUNT(*) FROM posts;          -- Should be > 0
SELECT COUNT(*) FROM comments;       -- Should be > 0
SELECT COUNT(*) FROM tracks;         -- Should be > 0
```

---

## Testing Approach

### Option 1: Full Testing (Recommended First Time)
**Time**: 40-50 minutes

1. Open [guide-manual-testing-tasks-14-20.md](guide-manual-testing-tasks-14-20.md)
2. Complete Tasks 14-19 in order
3. Open [guide-manual-testing-task-20.md](guide-manual-testing-task-20.md)
4. Complete Task 20 comprehensive testing

### Option 2: Quick Verification (After Initial Testing)
**Time**: 15-20 minutes

1. Open [guide-manual-testing-task-20.md](guide-manual-testing-task-20.md)
2. Complete Part A: Verify all issues resolved
3. Complete Part B: Complete user flow test
4. Skip Parts C-E unless needed

### Option 3: Checklist Only (Experienced Testers)
**Time**: 30-40 minutes

1. Open [checklist-manual-testing.md](checklist-manual-testing.md)
2. Print or keep open in second window
3. Check off items as you test
4. Refer to detailed guides if issues found

---

## The 7 Critical Checks

These are the original issues that MUST be fixed:

### 1. ✅ No Console Errors
- Open DevTools Console
- Should see NO red errors
- Blue info logs are OK

### 2. ✅ Metrics Show Values
- Total Users > 0
- Total Posts > 0
- Total Comments > 0

### 3. ✅ Chart Shows 30 Days
- Activity chart X-axis shows ~30 days
- Not just 7 days
- Dates are recent

### 4. ✅ Chart Has Users Line
- Blue line labeled "Total Users"
- Shows cumulative total (increasing)
- Three lines total

### 5. ✅ Play Button Works
- Click play on trending track
- Mini player appears and plays
- NO extra database query

### 6. ✅ Creators Display
- Shows creators OR "No creators" message
- Not "Unknown error"
- Investigation documented

### 7. ✅ Collection Status Works
- Shows last run time
- Shows metrics count
- Shows duration
- Not "Unknown error"

---

## Quick Test Flow (5 Minutes)

If you only have 5 minutes, test this:

1. **Load Page**
   - Go to `/analytics`
   - Wait for load
   - ✅ No console errors

2. **Check Metrics**
   - ✅ All three metrics > 0

3. **Check Chart**
   - ✅ Three lines visible
   - ✅ Blue line present

4. **Test Play**
   - Click play on track
   - ✅ Audio plays
   - ✅ No extra query (check Network tab)

5. **Check Status**
   - Scroll to bottom
   - ✅ Shows last run details

**If all pass**: Likely everything works!  
**If any fail**: Do full testing to find issue

---

## Common Issues & Quick Fixes

### Issue: Metrics Show 0
**Fix**: Run metric collection
```sql
SELECT collect_daily_metrics(CURRENT_DATE);
```

### Issue: Chart Missing Users Line
**Fix**: Check type definition
- Open `client/src/types/analytics.ts`
- Verify `ActivityDataPoint` has `users: number`

### Issue: Play Button Doesn't Work
**Fix**: Check file_url
- Open Network tab
- Find `get_trending_tracks` call
- Verify response includes `file_url`

### Issue: "Unknown Error" Messages
**Fix**: Check RLS policies
```sql
-- Check metric_collection_log policy
SELECT * FROM pg_policies WHERE tablename = 'metric_collection_log';
```

---

## Testing Tools Setup

### Browser DevTools
1. Press F12 to open
2. Open these tabs:
   - **Console**: Check for errors
   - **Network**: Check requests
   - **Application**: Check storage

### Useful Console Commands
```javascript
// Check if data loaded
console.log('Metrics:', window.metricsData);

// Check playback context
console.log('Playback:', window.playbackContext);

// Clear cache
localStorage.clear();
sessionStorage.clear();
```

---

## After Testing

### If All Tests Pass ✅
1. Mark tasks 14-20 complete in tasks.md
2. Commit changes: `git commit -m "test: Complete manual testing tasks 14-20"`
3. Push: `git push`
4. Celebrate! 🎉

### If Tests Fail ❌
1. Document which test failed
2. Capture screenshot
3. Copy console errors
4. Review detailed guide for that task
5. Fix issue
6. Re-test

---

## Need Help?

### Documentation
- [Detailed Testing Guide](guide-manual-testing-tasks-14-20.md)
- [Integration Testing](guide-manual-testing-task-20.md)
- [Testing Checklist](checklist-manual-testing.md)
- [Guides Overview](README.md)

### Related Docs
- [Tasks List](../../../.kiro/specs/analytics-page-fixes/tasks.md)
- [Requirements](../../../.kiro/specs/analytics-page-fixes/requirements.md)
- [Design](../../../.kiro/specs/analytics-page-fixes/design.md)

### Troubleshooting
Each detailed guide has a "Troubleshooting" section with specific solutions.

---

## Testing Checklist Summary

Quick reference of what to test:

- [ ] **Task 14**: Metrics display (5 min)
- [ ] **Task 15**: Activity chart (5 min)
- [ ] **Task 16**: Trending & play button (8 min)
- [ ] **Task 17**: Popular creators (5 min)
- [ ] **Task 18**: Collection status (5 min)
- [ ] **Task 19**: Error handling & UX (7 min)
- [ ] **Task 20**: Integration testing (15 min)

**Total**: 40-50 minutes

---

_Quick Start Guide Version: 1.0_  
_Created: January 31, 2025_  
_Perfect for: First-time testers and quick verification_
