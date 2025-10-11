# Analytics Dashboard - Manual Testing Guide

## Quick Test Checklist

Use this guide to manually verify the analytics dashboard functionality in your browser.

---

## Test 1: Authenticated User Access ✅

**Steps:**

1. Start your development server: `npm run dev` (in client folder)
2. Open browser to `http://localhost:3000`
3. Log in with your test account
4. Navigate to `http://localhost:3000/analytics`

**Expected Results:**

- ✅ Dashboard loads successfully
- ✅ Page title shows "Platform Analytics"
- ✅ Three metric cards are visible (Users, Posts, Comments)
- ✅ Activity chart is displayed below metrics
- ✅ No errors in browser console (F12)

---

## Test 2: Unauthenticated Redirect ✅

**Steps:**

1. Log out of the application
2. In browser address bar, navigate directly to `http://localhost:3000/analytics`

**Expected Results:**

- ✅ You are automatically redirected to `/login`
- ✅ Dashboard content is NOT visible
- ✅ No errors in console

---

## Test 3: Metrics Display ✅

**Steps:**

1. Log in and navigate to analytics dashboard
2. Observe the three metric cards

**Expected Results:**

- ✅ **Total Users** card shows count with 👥 icon
- ✅ **Total Posts** card shows count with 📝 icon
- ✅ **Total Comments** card shows count with 💬 icon
- ✅ Numbers are formatted with commas (e.g., 1,234)
- ✅ Cards have hover effect (border changes to blue)

**Verify Accuracy:**

1. Open Supabase Dashboard
2. Go to Table Editor
3. Check counts in `user_profiles`, `posts`, and `comments` tables
4. Verify they match the dashboard display

---

## Test 4: Activity Chart ✅

**Steps:**

1. Scroll down to the "Activity Over Time" section
2. Examine the chart

**Expected Results:**

- ✅ Chart title "Activity Over Time" is visible
- ✅ Legend shows two items:
  - Blue square = Posts
  - Green square = Comments
- ✅ Chart displays last 30 days of data
- ✅ Two colored lines are visible (blue and green)
- ✅ Grid lines and axis labels are present
- ✅ X-axis shows dates (e.g., "Oct 1", "Oct 8")
- ✅ Y-axis shows count values
- ✅ Hover over data points shows tooltip with date and count

---

## Test 5: Mobile Responsiveness ✅

**Steps:**

1. Open Chrome DevTools (F12)
2. Click the device toolbar icon (or Ctrl+Shift+M)
3. Select different devices:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1920px)

**Expected Results:**

- ✅ **Mobile (< 768px):**
  - Metric cards stack vertically (one per row)
  - Chart has horizontal scroll if needed
  - Text remains readable
  - No layout overflow
- ✅ **Tablet (768px - 1024px):**
  - Metric cards display in 3-column grid
  - Chart fits width properly
- ✅ **Desktop (> 1024px):**
  - Full 3-column grid layout
  - Chart displays at optimal size

---

## Test 6: Loading States ✅

**Steps:**

1. Open DevTools Network tab
2. Set throttling to "Slow 3G"
3. Refresh the analytics page

**Expected Results:**

- ✅ Loading skeleton appears while fetching data
- ✅ Skeleton shows placeholder cards with animation
- ✅ Smooth transition from loading to actual content
- ✅ No content "flash" or layout shift

---

## Test 7: Error Handling ✅

**Steps:**

1. Open DevTools Console
2. Temporarily disable network (DevTools > Network > Offline)
3. Refresh the analytics page
4. Re-enable network

**Expected Results:**

- ✅ Error message displays: "Failed to load platform metrics"
- ✅ Retry button is available
- ✅ Clicking retry reloads the data
- ✅ No application crash

---

## Test 8: Empty Data State ✅

**Steps:**

1. If you have a fresh database with no posts/comments:
2. Navigate to analytics dashboard

**Expected Results:**

- ✅ Metrics show "0" for empty counts
- ✅ Chart shows "No activity data available" message
- ✅ No broken UI elements

---

## Test 9: Browser Compatibility ✅

**Test in Multiple Browsers:**

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if on Mac)

**Expected Results:**

- ✅ Dashboard works identically in all browsers
- ✅ SVG chart renders correctly
- ✅ CSS styles display properly
- ✅ No browser-specific errors

---

## Test 10: Performance Check ✅

**Steps:**

1. Open DevTools > Network tab
2. Refresh analytics page
3. Check the timing

**Expected Results:**

- ✅ Page loads in < 3 seconds
- ✅ Database queries complete in < 200ms
- ✅ No unnecessary duplicate requests
- ✅ Lighthouse score > 80 (optional)

**Run Lighthouse:**

1. Open DevTools > Lighthouse tab
2. Select "Performance" category
3. Click "Analyze page load"
4. Verify score is above 80

---

## Test 11: Keyboard Navigation ✅

**Steps:**

1. Navigate to analytics page
2. Press Tab key repeatedly
3. Verify focus moves through interactive elements

**Expected Results:**

- ✅ Focus indicators are visible
- ✅ Can navigate through all interactive elements
- ✅ Focus order is logical (top to bottom)

---

## Test 12: Console Errors ✅

**Steps:**

1. Open DevTools Console (F12)
2. Navigate through analytics dashboard
3. Interact with all elements

**Expected Results:**

- ✅ No red errors in console
- ✅ No yellow warnings (except expected ones)
- ✅ No failed network requests

---

## Quick Verification Commands

### Check TypeScript Errors

```bash
cd client
npx tsc --noEmit
```

**Expected:** No errors

### Check for Console Logs

```bash
# Search for console.log in analytics files
grep -r "console.log" client/src/app/analytics/
grep -r "console.log" client/src/components/MetricsGrid.tsx
grep -r "console.log" client/src/components/ActivityChart.tsx
```

**Expected:** Only console.error for error handling

---

## Test Results Summary

After completing all tests, fill in your results:

| Test                        | Status | Notes |
| --------------------------- | ------ | ----- |
| 1. Authenticated Access     | ⬜     |       |
| 2. Unauthenticated Redirect | ⬜     |       |
| 3. Metrics Display          | ⬜     |       |
| 4. Activity Chart           | ⬜     |       |
| 5. Mobile Responsiveness    | ⬜     |       |
| 6. Loading States           | ⬜     |       |
| 7. Error Handling           | ⬜     |       |
| 8. Empty Data State         | ⬜     |       |
| 9. Browser Compatibility    | ⬜     |       |
| 10. Performance Check       | ⬜     |       |
| 11. Keyboard Navigation     | ⬜     |       |
| 12. Console Errors          | ⬜     |       |

---

## Common Issues and Solutions

### Issue: Dashboard shows 0 for all metrics

**Solution:** Ensure you have data in your database. Create some test posts and comments.

### Issue: Chart not displaying

**Solution:** Check browser console for errors. Ensure activity data is being fetched.

### Issue: Redirect loop

**Solution:** Clear browser cache and cookies. Check authentication state.

### Issue: Slow loading

**Solution:** Check network tab for slow queries. Verify database indexes are applied.

---

## Next Steps After Testing

Once all tests pass:

- ✅ Mark task 9.3 as complete
- ✅ Document any issues found
- ✅ Proceed to next task (9.4 or 10.1)

---

**Testing Guide Version:** 1.0  
**Last Updated:** October 8, 2025  
**Status:** Ready for Manual Testing
