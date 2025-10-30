# Analytics Page Manual Testing Guide (Tasks 14-20)

## Overview

This guide provides step-by-step instructions for manually testing the analytics page fixes. Complete these tests in order to verify all functionality works correctly.

**Estimated Time**: 30-45 minutes  
**Prerequisites**:

- Development server running (`npm run dev`)
- Local Supabase instance running
- Browser DevTools open (F12)
- Test data in database (users, posts, tracks, etc.)

---

## Task 14: Manual Testing - Metrics Display

**Objective**: Verify that the current metrics section displays correct data.

### Step-by-Step Instructions

1. **Navigate to Analytics Page**

   - Open your browser to `http://localhost:3000/analytics`
   - Wait for the page to fully load

2. **Verify Metrics Cards Display**

   - Look for three metric cards at the top of the page
   - Each card should show a title and a number

3. **Check Total Users Metric**

   - Find the "Total Users" card
   - ✅ **Expected**: Shows a non-zero number (e.g., 5, 10, 25)
   - ❌ **Failure**: Shows 0 or "Unknown error occurred"
   - **Note**: This should match the total number of users in your database

4. **Check Total Posts Metric**

   - Find the "Total Posts" card
   - ✅ **Expected**: Shows a non-zero number
   - ❌ **Failure**: Shows 0 or error message
   - **Note**: This should match the total number of posts (tracks) in your database

5. **Check Total Comments Metric**

   - Find the "Total Comments" card
   - ✅ **Expected**: Shows a non-zero number
   - ❌ **Failure**: Shows 0 or error message
   - **Note**: This should match the total number of comments in your database

6. **Check Browser Console**

   - Open DevTools Console (F12 → Console tab)
   - ✅ **Expected**: No red error messages
   - ❌ **Failure**: Errors like "Error fetching current metrics" or "Permission denied"
   - **Note**: You may see blue info logs - these are normal

7. **Test Refresh Button**
   - Look for a refresh/reload button near the metrics
   - Click the refresh button
   - ✅ **Expected**: Metrics reload and update (you may see loading state briefly)
   - ❌ **Failure**: Nothing happens or error appears
   - Check console for any errors during refresh

### Troubleshooting

**If metrics show 0:**

- Check if you have data in your database
- Run: `SELECT COUNT(*) FROM user_profiles;` in Supabase SQL editor
- Run: `SELECT COUNT(*) FROM posts;` in Supabase SQL editor
- Run: `SELECT COUNT(*) FROM comments;` in Supabase SQL editor

**If you see "Unknown error occurred":**

- Check browser console for detailed error
- Verify RLS policies allow authenticated users to read `daily_metrics` table
- Check if `daily_metrics` table has data

**If metrics don't refresh:**

- Check network tab for failed requests
- Verify the refresh button is properly wired up

### Success Criteria

- [ ] Total Users shows non-zero value
- [ ] Total Posts shows non-zero value
- [ ] Total Comments shows non-zero value
- [ ] No console errors
- [ ] Refresh button updates metrics

---

## Task 15: Manual Testing - Activity Chart

**Objective**: Verify the Activity Over Time chart displays 30 days of data with three lines.

### Step-by-Step Instructions

1. **Locate Activity Chart**

   - Scroll down on the `/analytics` page
   - Find the "Activity Over Time" section
   - You should see a line chart

2. **Verify Chart Displays**

   - ✅ **Expected**: Chart renders with grid lines and axes
   - ❌ **Failure**: Empty space or error message
   - **Note**: Chart should be visible and interactive

3. **Check Date Range (30 Days)**

   - Look at the X-axis (bottom) of the chart
   - ✅ **Expected**: Shows dates spanning approximately 30 days
   - ❌ **Failure**: Shows only 7 days or dates in the past
   - **Tip**: Hover over data points to see exact dates

4. **Verify Three Lines Are Present**

   - Look for three colored lines on the chart
   - ✅ **Expected**: Three distinct lines with different colors
   - ❌ **Failure**: Only one or two lines visible

5. **Check Users Line (Blue)**

   - Find the blue line on the chart
   - ✅ **Expected**: Blue line labeled "Total Users"
   - ✅ **Expected**: Line shows cumulative total (generally increasing or flat)
   - ❌ **Failure**: No blue line or line decreases significantly
   - **Note**: Users should accumulate over time, not decrease

6. **Check Posts Line (Green)**

   - Find the green line on the chart
   - ✅ **Expected**: Green line labeled "Posts Created" or similar
   - ✅ **Expected**: Shows daily post counts (may vary day to day)
   - ❌ **Failure**: No green line

7. **Check Comments Line (Amber/Yellow)**

   - Find the amber/yellow line on the chart
   - ✅ **Expected**: Amber line labeled "Comments Created" or similar
   - ✅ **Expected**: Shows daily comment counts
   - ❌ **Failure**: No amber line

8. **Test Tooltips**

   - Hover your mouse over different data points on the chart
   - ✅ **Expected**: Tooltip appears showing date and value
   - ✅ **Expected**: Tooltip shows all three metrics for that date
   - ❌ **Failure**: No tooltip or incomplete data

9. **Test Chart Legend**

   - Look for a legend (usually at top or bottom of chart)
   - ✅ **Expected**: Legend shows all three metrics with colors
   - Click on legend items to toggle lines on/off
   - ✅ **Expected**: Lines hide/show when clicking legend

10. **Test Responsive Design (Mobile)**
    - Resize browser window to mobile width (< 768px)
    - Or use DevTools Device Toolbar (Ctrl+Shift+M)
    - ✅ **Expected**: Chart resizes and remains readable
    - ✅ **Expected**: All three lines still visible
    - ❌ **Failure**: Chart overflows or becomes unreadable

### Troubleshooting

**If chart doesn't display:**

- Check console for errors
- Verify `fetchActivityData()` is returning data
- Check network tab for `/api/analytics` or RPC calls

**If only 7 days show instead of 30:**

- Check the date calculation in `fetchActivityData()`
- Verify the query uses `.gte('metric_date', startDate)` with 30 days ago

**If users line is missing:**

- Check `ActivityDataPoint` type includes `users: number`
- Verify `fetchActivityData()` maps `users_total` to `activity.users`
- Check chart configuration includes users dataset

**If lines are hard to distinguish:**

- Verify colors are set correctly:
  - Users: `rgb(59, 130, 246)` (blue)
  - Posts: `rgb(34, 197, 94)` (green)
  - Comments: `rgb(251, 191, 36)` (amber)

### Success Criteria

- [ ] Chart displays on analytics page
- [ ] Chart shows 30 days of data
- [ ] Three lines visible: Users (blue), Posts (green), Comments (amber)
- [ ] Users line shows cumulative total (increasing trend)
- [ ] Posts and comments show daily counts
- [ ] Tooltips work on hover
- [ ] Chart is responsive on mobile

---

## Task 16: Manual Testing - Trending Sections and Play Button

**Objective**: Verify trending tracks display correctly and play button works without extra database queries.

### Step-by-Step Instructions

#### Part A: Verify Trending Sections Display

1. **Locate Trending Tracks Sections**

   - Scroll down on the `/analytics` page
   - Find "Top 10 Trending Tracks (Last 7 Days)" section
   - Find "Top 10 Trending Tracks (All Time)" section

2. **Check Last 7 Days Section**

   - ✅ **Expected**: Shows up to 10 track cards
   - ✅ **Expected**: Each card shows track title, artist, and metrics
   - ❌ **Failure**: Empty or "No trending tracks" message
   - **Note**: If no tracks, you may need to add test data

3. **Check All Time Section**

   - ✅ **Expected**: Shows up to 10 track cards
   - ✅ **Expected**: Different tracks than Last 7 Days (or same if limited data)
   - ❌ **Failure**: Empty or error message

4. **Verify Track Metrics Display**

   - Look at each track card
   - ✅ **Expected**: Shows play count (e.g., "1,234 plays")
   - ✅ **Expected**: Shows like count (e.g., "56 likes")
   - ✅ **Expected**: Shows trending score (e.g., "Score: 89.5")
   - ❌ **Failure**: Missing metrics or showing 0 for all

5. **Verify file_url in Network Tab**
   - Open DevTools → Network tab
   - Refresh the page
   - Find the RPC call to `get_trending_tracks`
   - Click on the request → Preview/Response tab
   - ✅ **Expected**: Each track object includes `file_url` field
   - ❌ **Failure**: `file_url` is missing or null
   - **Note**: This is critical for play button to work

#### Part B: Test Play Button Functionality

6. **Locate Play Button**

   - Find a track card in either trending section
   - Look for a "Play" button (usually with play icon ▶)
   - ✅ **Expected**: Button is visible and enabled
   - ❌ **Failure**: Button is missing or disabled

7. **Test Play Button Click**

   - Click the "Play" button on a track
   - ✅ **Expected**: Button text changes to "Pause" or shows pause icon ⏸
   - ✅ **Expected**: Mini player appears at bottom of screen
   - ✅ **Expected**: Track starts playing within 1-2 seconds
   - ❌ **Failure**: Nothing happens or error appears

8. **Verify No Extra Database Query**

   - Keep Network tab open
   - Click play button
   - Watch for new network requests
   - ✅ **Expected**: NO new request to fetch track data
   - ✅ **Expected**: Only audio file request (to Supabase Storage)
   - ❌ **Failure**: Extra RPC call to get track details
   - **Note**: Play should use file_url from trending data directly

9. **Check Mini Player**

   - Look at the mini player at bottom of screen
   - ✅ **Expected**: Shows track title and artist
   - ✅ **Expected**: Shows waveform visualization
   - ✅ **Expected**: Shows play/pause button
   - ✅ **Expected**: Audio is playing
   - ❌ **Failure**: Mini player doesn't appear or shows error

10. **Test Pause Button**

    - Click the "Pause" button (on track card or mini player)
    - ✅ **Expected**: Audio stops playing
    - ✅ **Expected**: Button changes back to "Play"
    - ✅ **Expected**: Waveform stops animating
    - ❌ **Failure**: Audio continues or button doesn't change

11. **Test Multiple Tracks**

    - Click play on a different track
    - ✅ **Expected**: Previous track stops
    - ✅ **Expected**: New track starts playing
    - ✅ **Expected**: Mini player updates to show new track
    - ❌ **Failure**: Both tracks play simultaneously or error

12. **Check Console for Errors**
    - Open DevTools Console
    - Play and pause several tracks
    - ✅ **Expected**: No red error messages
    - ❌ **Failure**: Errors like "Cannot read property 'file_url'" or "Track not found"
    - **Note**: Blue info logs are normal

### Troubleshooting

**If trending sections are empty:**

- Check if you have tracks with play_count > 0 in database
- Run: `SELECT * FROM get_trending_tracks(7, 10);` in Supabase SQL editor
- Add test data if needed

**If file_url is missing:**

- Verify migration added file_url to get_trending_tracks function
- Check function definition includes `t.file_url` in SELECT
- Check RETURNS TABLE includes `file_url TEXT`

**If play button doesn't work:**

- Check console for errors
- Verify PlaybackContext is imported and used
- Verify track.file_url is not null
- Check if audio file exists in Supabase Storage

**If extra database query occurs:**

- Check TrendingTrackCard component
- Verify it uses track.file_url directly (not fetching from database)
- Verify no supabase.from('tracks').select() call in handlePlay

**If multiple tracks play simultaneously:**

- Check PlaybackContext logic
- Verify playTrack() stops previous track before starting new one

### Success Criteria

- [ ] "Top 10 Trending Tracks (Last 7 Days)" displays tracks
- [ ] "Top 10 Trending Tracks (All Time)" displays tracks
- [ ] Play counts, like counts, and trending scores visible
- [ ] file_url included in track data (verified in network tab)
- [ ] Play button starts playback in mini player
- [ ] NO extra database query when clicking play
- [ ] Play button changes to Pause when playing
- [ ] Pause button stops playback
- [ ] Can play different tracks in sequence
- [ ] No console errors during playback

---

## Task 17: Manual Testing - Popular Creators and Investigation

**Objective**: Verify popular creators sections and review investigation findings.

### Step-by-Step Instructions

#### Part A: Check Popular Creators Display

1. **Locate Popular Creators Sections**

   - Scroll down on the `/analytics` page
   - Find "Top 5 Popular Creators (Last 7 Days)" section
   - Find "Top 5 Popular Creators (All Time)" section

2. **Check Last 7 Days Section**

   - Look for creator cards or a message
   - ✅ **Expected**: Shows up to 5 creator cards OR "No active creators" message
   - ❌ **Failure**: Shows "Unknown error occurred"
   - **Note**: Empty state is acceptable if no data exists

3. **Check All Time Section**

   - Look for creator cards or a message
   - ✅ **Expected**: Shows up to 5 creator cards OR "No creators yet" message
   - ❌ **Failure**: Shows error message
   - **Note**: Empty state is acceptable if no data exists

4. **If Creators Display, Verify Data**
   - Look at each creator card
   - ✅ **Expected**: Shows username
   - ✅ **Expected**: Shows total plays
   - ✅ **Expected**: Shows total likes
   - ✅ **Expected**: Shows engagement score
   - ❌ **Failure**: Missing data or all zeros

#### Part B: Review Investigation Findings

5. **Open Investigation Document**

   - Navigate to `docs/features/analytics/investigation-popular-creators.md`
   - Or check console logs from Task 10 execution

6. **Review SQL Query Results**

   - Check documented results for:
     - `SELECT COUNT(*) FROM tracks WHERE play_count > 0`
     - `SELECT COUNT(DISTINCT user_id) FROM tracks WHERE play_count > 0`
     - `SELECT * FROM get_popular_creators(7, 5)`
     - `SELECT * FROM get_popular_creators(0, 5)`
   - ✅ **Expected**: Results are documented with counts
   - ❌ **Failure**: Queries not executed or results missing

7. **Verify Data Consistency**

   - Compare investigation results with UI display
   - If investigation shows tracks with play_count > 0:
     - ✅ **Expected**: Popular creators should display
     - ❌ **Failure**: UI shows "No creators" but data exists
   - If investigation shows 0 tracks with plays:
     - ✅ **Expected**: UI shows "No active creators" message
     - ✅ **Expected**: This is correct behavior

8. **Check for Documented Issues**

   - Review investigation document for any bugs found
   - ✅ **Expected**: Issues are clearly documented
   - ✅ **Expected**: Root cause identified (if applicable)
   - **Note**: If bug found, it should be noted for follow-up (not fixed in this task)

9. **Verify RPC Function Works**

   - Open Supabase SQL Editor
   - Run: `SELECT * FROM get_popular_creators(7, 5);`
   - ✅ **Expected**: Query executes without error
   - ✅ **Expected**: Returns data if creators exist
   - ❌ **Failure**: Function doesn't exist or throws error

10. **Check Browser Console**
    - Open DevTools Console
    - Look for any RPC errors related to popular creators
    - ✅ **Expected**: No errors OR clear "No data" message
    - ❌ **Failure**: Permission denied or function not found errors

### Troubleshooting

**If "Unknown error occurred" appears:**

- Check console for detailed error
- Verify RLS policies allow reading from tracks table
- Verify get_popular_creators function exists
- Check function permissions

**If data exists but UI shows "No creators":**

- Verify RPC call is working (check network tab)
- Check if function returns correct format
- Verify component is parsing response correctly
- Document this discrepancy in investigation

**If investigation not completed:**

- Run the SQL queries manually in Supabase SQL Editor
- Document results in investigation file
- Note any errors or unexpected results

### Success Criteria

- [ ] "Top 5 Popular Creators (Last 7 Days)" section displays
- [ ] Shows creators OR "No active creators" message (not error)
- [ ] "Top 5 Popular Creators (All Time)" section displays
- [ ] Shows creators OR "No creators yet" message (not error)
- [ ] Investigation findings documented (from Task 10)
- [ ] SQL queries executed and results recorded
- [ ] If issue found, it's documented for follow-up
- [ ] If data exists but not showing, discrepancy noted
- [ ] No RPC errors in browser console

---

## Task 18: Manual Testing - Collection Status

**Objective**: Verify the Metric Collection Status section displays correctly and trigger button works.

### Step-by-Step Instructions

#### Part A: Verify Status Display

1. **Locate Collection Status Section**

   - Scroll to the bottom of the `/analytics` page
   - Find "Metric Collection Status" section
   - ✅ **Expected**: Section is visible
   - ❌ **Failure**: Section missing or hidden

2. **Check Last Run Time**

   - Look for "Last Run" or "Last Collection" field
   - ✅ **Expected**: Shows a date/time (e.g., "2025-01-31 14:30:00")
   - ❌ **Failure**: Shows "Unknown error occurred" or blank
   - **Note**: If no collections exist yet, may show appropriate message

3. **Check Metrics Collected Count**

   - Look for "Metrics Collected" field
   - ✅ **Expected**: Shows a number (e.g., "12 metrics")
   - ❌ **Failure**: Shows 0 or error
   - **Note**: Should match number of metric categories collected

4. **Check Execution Duration**

   - Look for "Duration" or "Execution Time" field
   - ✅ **Expected**: Shows time in milliseconds (e.g., "245 ms")
   - ❌ **Failure**: Shows 0 or error
   - **Note**: Typical range is 100-500ms

5. **Check Status Indicator**

   - Look for status badge or indicator
   - ✅ **Expected**: Shows "Completed" or "Success" (green)
   - ❌ **Failure**: Shows "Failed" or "Error" (red)
   - **Note**: If failed, error message should be displayed

6. **Handle No Collections Scenario**
   - If this is first time running:
   - ✅ **Expected**: Shows message like "No collections yet" or "Run first collection"
   - ✅ **Expected**: Trigger button is available
   - ❌ **Failure**: Shows error instead of helpful message

#### Part B: Test Trigger Collection Button

7. **Locate Trigger Button**

   - Find "Trigger Collection" or "Run Collection" button
   - ✅ **Expected**: Button is visible and enabled
   - ❌ **Failure**: Button is missing or disabled

8. **Click Trigger Button**

   - Click the "Trigger Collection" button
   - ✅ **Expected**: Button shows loading state (spinner or "Running...")
   - ✅ **Expected**: Button becomes disabled during execution
   - ❌ **Failure**: Nothing happens or immediate error

9. **Wait for Collection to Complete**

   - Wait 1-3 seconds for collection to finish
   - ✅ **Expected**: Loading state disappears
   - ✅ **Expected**: Button becomes enabled again
   - ❌ **Failure**: Stuck in loading state or error appears

10. **Verify Status Updates**

    - Check if collection status section updates
    - ✅ **Expected**: "Last Run" shows current date/time
    - ✅ **Expected**: "Metrics Collected" shows updated count
    - ✅ **Expected**: "Duration" shows execution time
    - ❌ **Failure**: Status doesn't update or shows old data

11. **Verify Metrics Update**

    - Scroll back to top of page
    - Check if "Total Users", "Total Posts", "Total Comments" updated
    - ✅ **Expected**: Metrics reflect current database state
    - **Note**: Values should match or be close to actual counts

12. **Check Console for Errors**
    - Open DevTools Console
    - ✅ **Expected**: No red error messages
    - ✅ **Expected**: May see info logs about collection
    - ❌ **Failure**: Errors like "Permission denied" or "Function not found"

#### Part C: Test Multiple Collections

13. **Trigger Collection Again**

    - Click "Trigger Collection" button again
    - ✅ **Expected**: Works same as first time
    - ✅ **Expected**: Status updates with new timestamp
    - ❌ **Failure**: Error or doesn't update

14. **Verify No Duplicate Data**
    - Check that metrics don't double
    - ✅ **Expected**: Metrics show current counts (not doubled)
    - ❌ **Failure**: Metrics increase incorrectly
    - **Note**: Collection should replace old data, not add to it

### Troubleshooting

**If status shows "Unknown error occurred":**

- Check console for detailed error
- Verify RLS policy allows reading metric_collection_log table
- Check if table exists: `SELECT * FROM metric_collection_log LIMIT 1;`
- Verify getCollectionStatus() uses .maybeSingle() not .single()

**If trigger button doesn't work:**

- Check console for errors
- Verify collect_daily_metrics function exists
- Check function permissions (should allow authenticated users)
- Verify RLS policy allows writing to metric_collection_log

**If status doesn't update after collection:**

- Check if collection actually ran (check database)
- Verify component refetches data after trigger
- Check network tab for RPC calls

**If metrics don't update:**

- Verify collection function is working correctly
- Check daily_metrics table for new entries
- Run: `SELECT * FROM daily_metrics ORDER BY metric_date DESC LIMIT 10;`

### Success Criteria

- [ ] "Metric Collection Status" section displays
- [ ] Shows last run time (not "Unknown error occurred")
- [ ] Shows metrics collected count
- [ ] Shows execution duration
- [ ] If no collections exist, shows appropriate message
- [ ] "Trigger Collection" button is visible
- [ ] Clicking button runs collection successfully
- [ ] Status updates after collection
- [ ] Can trigger multiple collections
- [ ] No console errors

---

## Task 19: Manual Testing - Error Handling and UX Improvements

**Objective**: Verify error messages are user-friendly and loading states work correctly.

### Step-by-Step Instructions

#### Part A: Test Error Message Mapping

1. **Test Network Error (Simulated)**

   - Open DevTools → Network tab
   - Set throttling to "Offline" (dropdown at top)
   - Refresh the `/analytics` page
   - ✅ **Expected**: Error message shows "Connection error. Please check your internet."
   - ❌ **Failure**: Shows technical error or "Unknown error occurred"
   - **Note**: This tests the network error mapping from Task 11

2. **Restore Network Connection**

   - Set throttling back to "No throttling" or "Online"
   - Click refresh button on page
   - ✅ **Expected**: Data loads successfully
   - ✅ **Expected**: Error message disappears
   - ❌ **Failure**: Still shows error or doesn't retry

3. **Test Permission Error (If Applicable)**

   - If you have a test user with limited permissions:
   - Log in as that user
   - Navigate to `/analytics`
   - ✅ **Expected**: Shows "Permission denied. Please contact support."
   - ❌ **Failure**: Shows technical error code
   - **Note**: Skip this if all users have full access

4. **Test No Data Scenario**

   - If possible, test with empty database
   - Or check sections that have no data
   - ✅ **Expected**: Shows "No data available yet." or similar friendly message
   - ❌ **Failure**: Shows error code like "PGRST116"

5. **Verify No Sensitive Information**

   - Trigger various errors (network, permission, etc.)
   - Check error messages shown to user
   - ✅ **Expected**: Messages are generic and user-friendly
   - ❌ **Failure**: Shows database table names, SQL queries, or stack traces
   - **Note**: Technical details should only be in console, not UI

6. **Check Console for Detailed Logs**
   - Open DevTools Console
   - Trigger an error (e.g., go offline and refresh)
   - ✅ **Expected**: Console shows detailed error with code, message, details
   - ✅ **Expected**: Includes error.code, error.message, error.details, error.hint
   - ❌ **Failure**: No console logs or missing details
   - **Note**: Detailed logs help developers debug, but users don't see them

#### Part B: Test Loading Skeletons

7. **Test Initial Page Load**

   - Clear browser cache (Ctrl+Shift+Delete)
   - Navigate to `/analytics` page
   - Watch the page as it loads
   - ✅ **Expected**: See skeleton loaders (pulsing gray boxes) before data appears
   - ❌ **Failure**: Blank space or spinners instead of skeletons
   - **Note**: Skeletons should match the layout of actual content

8. **Verify Skeleton for Metrics Cards**

   - During initial load, look at top section
   - ✅ **Expected**: Three skeleton cards with pulsing animation
   - ✅ **Expected**: Skeletons match size/shape of actual metric cards
   - ❌ **Failure**: No skeletons or wrong layout

9. **Verify Skeleton for Activity Chart**

   - During initial load, look at chart section
   - ✅ **Expected**: Skeleton placeholder for chart area
   - ✅ **Expected**: Pulsing animation
   - ❌ **Failure**: Blank space or spinner

10. **Verify Skeleton for Trending Tracks**

    - During initial load, look at trending sections
    - ✅ **Expected**: Multiple skeleton cards (matching track card layout)
    - ✅ **Expected**: Skeletons show where title, artist, metrics will be
    - ❌ **Failure**: No skeletons or generic spinner

11. **Verify Skeleton for Popular Creators**

    - During initial load, look at creators sections
    - ✅ **Expected**: Skeleton cards matching creator card layout
    - ✅ **Expected**: Pulsing animation
    - ❌ **Failure**: No skeletons

12. **Check Pulse Animation**

    - Watch the skeleton loaders
    - ✅ **Expected**: Smooth pulsing/shimmer animation
    - ✅ **Expected**: Animation loops continuously until data loads
    - ❌ **Failure**: Static gray boxes or no animation

13. **Test Slow Network (Throttled)**

    - Open DevTools → Network tab
    - Set throttling to "Slow 3G"
    - Refresh the page
    - ✅ **Expected**: Skeletons display for longer duration
    - ✅ **Expected**: Smooth transition from skeleton to actual content
    - ❌ **Failure**: Jarring layout shift or flash of content

14. **Verify Skeleton Matches Content Layout**
    - Compare skeleton structure to actual content
    - ✅ **Expected**: Skeletons are same size and position as real content
    - ✅ **Expected**: No layout shift when content loads
    - ❌ **Failure**: Content jumps or moves when replacing skeleton

#### Part C: Test All Loading States

15. **Test Refresh Button Loading**

    - Click refresh button on any section
    - ✅ **Expected**: Button shows loading state (spinner or "Loading...")
    - ✅ **Expected**: Button is disabled during load
    - ✅ **Expected**: Skeletons appear during reload
    - ❌ **Failure**: No loading indicator

16. **Test Trigger Collection Loading**
    - Click "Trigger Collection" button
    - ✅ **Expected**: Button shows loading state
    - ✅ **Expected**: Button is disabled during execution
    - ✅ **Expected**: Clear feedback that action is in progress
    - ❌ **Failure**: No loading indicator or button stays enabled

### Troubleshooting

**If error messages show technical details:**

- Check getErrorMessage() function in analytics.ts
- Verify error mapping is working correctly
- Ensure catch blocks use getErrorMessage(error)

**If skeletons don't appear:**

- Check TrendingSection.tsx for skeleton implementation
- Verify loading state is properly managed
- Check if skeletons are conditionally rendered based on loading state

**If skeletons don't match content:**

- Compare skeleton JSX to actual content JSX
- Adjust skeleton dimensions and structure
- Test with different screen sizes

**If animations don't work:**

- Check CSS for pulse/shimmer animation
- Verify animation classes are applied
- Check browser compatibility

### Success Criteria

- [ ] Network errors show "Connection error. Please check your internet."
- [ ] Permission errors show "Permission denied. Please contact support."
- [ ] No data shows "No data available yet." (not error code)
- [ ] No sensitive information in user-facing errors
- [ ] Console shows detailed error logs for developers
- [ ] Loading skeletons display during initial load
- [ ] Skeletons have pulse animation
- [ ] Skeletons match component layouts
- [ ] All sections show skeletons (metrics, chart, trending, creators)
- [ ] Smooth transition from skeleton to content
- [ ] No layout shift when content loads
- [ ] Refresh button shows loading state
- [ ] Trigger collection button shows loading state

---
