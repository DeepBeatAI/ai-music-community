# Analytics Manual Testing Guides

This directory contains comprehensive step-by-step guides for manually testing the analytics page fixes (Tasks 14-20).

## Quick Links

- **[Tasks 14-19: Individual Feature Testing](guide-manual-testing-tasks-14-20.md)** - Detailed testing for each feature
- **[Task 20: Comprehensive Integration Testing](guide-manual-testing-task-20.md)** - End-to-end testing of all features together

## Testing Overview

### Total Time Required
- **Tasks 14-19**: 25-30 minutes
- **Task 20**: 15-20 minutes
- **Total**: 40-50 minutes

### Prerequisites
- Development server running (`npm run dev`)
- Local Supabase instance running
- Browser DevTools open (F12)
- Test data in database

---

## Task Breakdown

### Task 14: Metrics Display (5 min)
Test that Total Users, Posts, and Comments display correctly.

**Key Checks:**
- Non-zero values display
- Refresh button works
- No console errors

### Task 15: Activity Chart (5 min)
Test that the Activity Over Time chart shows 30 days with three lines.

**Key Checks:**
- 30 days of data (not 7)
- Three lines: Users (blue), Posts (green), Comments (amber)
- Users line shows cumulative total
- Tooltips work

### Task 16: Trending Sections & Play Button (8 min)
Test trending tracks display and play button functionality.

**Key Checks:**
- Trending tracks display
- file_url included in data
- Play button works WITHOUT extra database query
- Mini player loads and plays audio
- Can switch between tracks

### Task 17: Popular Creators (5 min)
Test popular creators sections and review investigation findings.

**Key Checks:**
- Creators display OR appropriate message
- Investigation documented
- No RPC errors

### Task 18: Collection Status (5 min)
Test metric collection status display and trigger button.

**Key Checks:**
- Status shows last run details
- Trigger button runs collection
- Status updates after collection

### Task 19: Error Handling & UX (7 min)
Test error messages and loading skeletons.

**Key Checks:**
- User-friendly error messages
- No sensitive information exposed
- Loading skeletons display
- Pulse animation works

### Task 20: Comprehensive Integration (15 min)
Test complete user flow and verify all issues resolved.

**Key Checks:**
- All 7 original issues fixed
- Complete user flow works
- Performance acceptable
- Cross-browser compatible (optional)
- Mobile responsive (optional)

---

## How to Use These Guides

### For First-Time Testing

1. **Start with Task 14**
   - Open [guide-manual-testing-tasks-14-20.md](guide-manual-testing-tasks-14-20.md)
   - Follow Task 14 instructions step-by-step
   - Check off each success criterion

2. **Continue Through Task 19**
   - Complete each task in order
   - Document any failures
   - Fix issues before proceeding

3. **Finish with Task 20**
   - Open [guide-manual-testing-task-20.md](guide-manual-testing-task-20.md)
   - Complete comprehensive integration testing
   - Verify all original issues resolved

### For Quick Verification

If you just need to verify everything works:

1. **Go directly to Task 20**
   - Open [guide-manual-testing-task-20.md](guide-manual-testing-task-20.md)
   - Complete Part A (verify all issues resolved)
   - Complete Part B (complete user flow)
   - Skip Parts C-E if time is limited

### For Specific Feature Testing

If you need to test a specific feature:

- **Metrics**: Task 14
- **Chart**: Task 15
- **Play Button**: Task 16
- **Creators**: Task 17
- **Collection**: Task 18
- **Errors/Loading**: Task 19

---

## Success Criteria Summary

All tasks must pass these criteria:

### Functionality
- ✅ All metrics display correctly
- ✅ Chart shows 30 days with 3 lines
- ✅ Play button works without extra queries
- ✅ Collection status displays correctly
- ✅ Error messages are user-friendly
- ✅ Loading skeletons display

### Performance
- ✅ Page loads in < 3 seconds
- ✅ No memory leaks
- ✅ No unnecessary re-renders

### Quality
- ✅ No console errors
- ✅ No sensitive information exposed
- ✅ Responsive on mobile
- ✅ Cross-browser compatible

---

## Troubleshooting

### Common Issues

**Metrics show 0:**
- Check if database has data
- Verify RLS policies allow reading
- Check daily_metrics table

**Chart missing users line:**
- Verify ActivityDataPoint type includes users
- Check fetchActivityData() maps users_total
- Verify chart configuration

**Play button doesn't work:**
- Check file_url in network response
- Verify PlaybackContext is used
- Check audio file exists in storage

**Errors not user-friendly:**
- Verify getErrorMessage() function
- Check error mapping in catch blocks

### Getting Help

If you encounter issues:

1. Check browser console for detailed errors
2. Review the specific task guide for troubleshooting section
3. Check network tab for failed requests
4. Verify all previous tasks (1-13) completed successfully

---

## Related Documentation

- [Analytics Page Fixes Tasks](../../../.kiro/specs/analytics-page-fixes/tasks.md)
- [Analytics Page Fixes Requirements](../../../.kiro/specs/analytics-page-fixes/requirements.md)
- [Analytics Page Fixes Design](../../../.kiro/specs/analytics-page-fixes/design.md)
- [Popular Creators Investigation](../investigation-popular-creators.md)
- [Popular Creators Fix Guide](../guide-popular-creators-fix.md)

---

_Manual Testing Guides Version: 1.0_  
_Created: January 2025_  
_Last Updated: January 31, 2025_
