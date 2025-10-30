# Analytics Manual Testing Checklist

Quick reference checklist for manual testing tasks 14-20. Print this or keep it open while testing.

---

## Task 14: Metrics Display ⏱️ 5 min

- [ ] Navigate to `/analytics` page
- [ ] Total Users shows non-zero value
- [ ] Total Posts shows non-zero value
- [ ] Total Comments shows non-zero value
- [ ] No console errors
- [ ] Refresh button updates metrics

**If fails**: Check database has data, verify RLS policies

---

## Task 15: Activity Chart ⏱️ 5 min

- [ ] Activity chart displays
- [ ] Chart shows ~30 days of data (not 7)
- [ ] Blue line: "Total Users" (cumulative, increasing)
- [ ] Green line: "Posts Created" (daily counts)
- [ ] Amber line: "Comments Created" (daily counts)
- [ ] Tooltips work on hover
- [ ] Chart responsive on mobile

**If fails**: Check fetchActivityData() date calculation, verify users field in type

---

## Task 16: Trending & Play Button ⏱️ 8 min

### Trending Display
- [ ] "Top 10 Trending Tracks (Last 7 Days)" shows tracks
- [ ] "Top 10 Trending Tracks (All Time)" shows tracks
- [ ] Play counts, like counts, scores visible
- [ ] file_url in network response (check DevTools)

### Play Button
- [ ] Play button visible on tracks
- [ ] Click play → mini player appears
- [ ] Audio starts playing
- [ ] NO extra database query (check Network tab)
- [ ] Play button changes to Pause
- [ ] Click pause → audio stops
- [ ] Can play different tracks in sequence
- [ ] No console errors

**If fails**: Check file_url in RPC function, verify PlaybackContext usage

---

## Task 17: Popular Creators ⏱️ 5 min

- [ ] "Top 5 Popular Creators (Last 7 Days)" displays
- [ ] Shows creators OR "No active creators" (not error)
- [ ] "Top 5 Popular Creators (All Time)" displays
- [ ] Shows creators OR "No creators yet" (not error)
- [ ] Investigation findings documented (Task 10)
- [ ] SQL queries executed and results recorded
- [ ] No RPC errors in console

**If fails**: Check investigation doc, verify RPC function exists

---

## Task 18: Collection Status ⏱️ 5 min

- [ ] "Metric Collection Status" section displays
- [ ] Shows last run time (not "Unknown error")
- [ ] Shows metrics collected count
- [ ] Shows execution duration
- [ ] "Trigger Collection" button visible
- [ ] Click trigger → collection runs
- [ ] Status updates after collection
- [ ] Can trigger multiple times

**If fails**: Check RLS policy, verify .maybeSingle() usage

---

## Task 19: Error Handling & UX ⏱️ 7 min

### Error Messages
- [ ] Network error: "Connection error. Please check your internet."
- [ ] Permission error: "Permission denied. Please contact support."
- [ ] No data: "No data available yet." (not error code)
- [ ] No sensitive info in user messages
- [ ] Console has detailed logs for developers

### Loading Skeletons
- [ ] Skeletons display on initial load
- [ ] Pulse animation works
- [ ] Skeletons for metrics cards
- [ ] Skeletons for activity chart
- [ ] Skeletons for trending tracks
- [ ] Skeletons for popular creators
- [ ] Smooth transition to content
- [ ] No layout shift

**If fails**: Check getErrorMessage() function, verify skeleton implementation

---

## Task 20: Integration Testing ⏱️ 15 min

### All Original Issues Resolved
- [ ] ✅ No NextJS errors in console
- [ ] ✅ Total Users, Posts, Comments non-zero
- [ ] ✅ Activity chart shows 30 days
- [ ] ✅ Activity chart has Users line
- [ ] ✅ Play button works on trending tracks
- [ ] ✅ Popular Creators display or investigation done
- [ ] ✅ Collection Status shows details

### Complete User Flow
- [ ] Clear cache and load page
- [ ] Skeletons appear during load
- [ ] All sections load successfully
- [ ] Click play on trending track
- [ ] Mini player plays audio
- [ ] Switch to different track
- [ ] Pause playback
- [ ] Click refresh button
- [ ] Data reloads successfully
- [ ] Trigger manual collection
- [ ] Collection status updates

### Performance
- [ ] Page loads in < 3 seconds
- [ ] No memory leaks (check DevTools)
- [ ] No unnecessary re-renders

### Cross-Browser (Optional)
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari

### Mobile (Optional)
- [ ] Responsive layout
- [ ] Touch interactions work
- [ ] Chart readable on mobile

**If fails**: Review all previous tasks, check console and network tab

---

## Quick Troubleshooting

| Issue | Check |
|-------|-------|
| Metrics show 0 | Database has data? RLS policies? |
| Chart missing users | Type includes users? fetchActivityData maps it? |
| Play button fails | file_url in response? PlaybackContext used? |
| Errors not friendly | getErrorMessage() working? |
| No skeletons | Loading state managed? Skeletons rendered? |
| Performance slow | Network throttled? Too many requests? |

---

## Need Help?

**For detailed instructions on any task:**
- [Tasks 14-19 Detailed Guide](guide-manual-testing-tasks-14-20.md)
- [Task 20 Detailed Guide](guide-manual-testing-task-20.md)
- [Quick Start Guide](quickstart-testing.md)
- [Guides Overview](README.md)

---

## Final Sign-Off

**Tester Name**: ___________________  
**Date**: ___________________  
**All Tests Passed**: ☐ Yes ☐ No  

**Issues Found**: ___________________  
___________________  
___________________  

**Notes**: ___________________  
___________________  
___________________  

---

_Checklist Version: 1.0_  
_Created: January 31, 2025_
