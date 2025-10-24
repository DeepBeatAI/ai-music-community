# Manual Testing Guide - Playlist Playback Enhancements

**Purpose:** Step-by-step instructions for manually testing all playlist playback features  
**Estimated Time:** 30-45 minutes  
**Prerequisites:**

- Development server running (`npm run dev` in client folder)
- Test user account with login credentials
- At least one playlist with 3+ tracks

---

## Pre-Test Setup

### 1. Start Development Server

```bash
cd client
npm run dev
```

Server should be running at http://localhost:3000

### 2. Prepare Test Data

- Login to your test account
- Ensure you have at least one playlist with 3+ tracks
- Note the playlist name for testing

### 3. Open Browser DevTools

- Press F12 to open DevTools
- Go to Console tab (check for errors)
- Go to Application > Storage > Session Storage (for state persistence tests)

---

## Test Section 1: Basic Playback Functionality

### Test 1.1: Play All Button

**Objective:** Verify "Play All" button starts playlist from beginning

**Steps:**

1. Navigate to http://localhost:3000/playlists
2. Click on any playlist
3. Click the "Play All" button

**Expected Results:**

- ✅ Mini player appears at bottom of screen
- ✅ First track in playlist starts playing
- ✅ Play button shows pause icon
- ✅ Track title and artist name displayed correctly
- ✅ Progress bar starts moving

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 1.2: Individual Track Play

**Objective:** Verify clicking play on specific track works

**Steps:**

1. On playlist detail page, find the 3rd track
2. Click the play button (▶) next to that track
3. Observe mini player

**Expected Results:**

- ✅ Mini player appears
- ✅ 3rd track starts playing (not 1st track)
- ✅ Currently playing indicator shows on 3rd track
- ✅ Track info matches 3rd track

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 1.3: Play/Pause Toggle

**Objective:** Verify play/pause button works correctly

**Steps:**

1. Start playback of any track
2. Let it play for 10 seconds
3. Click pause button in mini player
4. Wait 3 seconds
5. Click play button again

**Expected Results:**

- ✅ Pause button stops audio immediately
- ✅ Progress bar stops moving
- ✅ Play button resumes from same position
- ✅ Audio doesn't restart from beginning

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 1.4: Next Track Navigation

**Objective:** Verify next button advances to next track

**Steps:**

1. Start playlist playback from beginning
2. Click "Next" button in mini player
3. Observe track change

**Expected Results:**

- ✅ Second track starts playing
- ✅ Track info updates to second track
- ✅ Progress bar resets to beginning
- ✅ Currently playing indicator moves to second track

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 1.5: Previous Track Navigation

**Objective:** Verify previous button goes to previous track

**Steps:**

1. Start playlist playback
2. Click "Next" button twice (now on 3rd track)
3. Click "Previous" button
4. Observe track change

**Expected Results:**

- ✅ Second track starts playing
- ✅ Track info updates correctly
- ✅ Progress bar resets
- ✅ Currently playing indicator correct

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

### Test 1.6: Automatic Track Progression

**Objective:** Verify tracks advance automatically when one ends

**Steps:**

1. Find a very short track (or use browser DevTools to speed up playback)
2. Start playback
3. Wait for track to complete
4. Observe what happens

**Expected Results:**

- ✅ Next track starts automatically
- ✅ No gap or long delay between tracks
- ✅ Progress bar resets for new track
- ✅ Track info updates

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 1.7: Cross-Page Persistence

**Objective:** Verify mini player persists across page navigation

**Steps:**

1. Start playlist playback
2. Click "Home" in navigation
3. Click "Discover" in navigation
4. Click "Playlists" in navigation
5. Observe mini player throughout

**Expected Results:**

- ✅ Mini player visible on all pages
- ✅ Playback continues without interruption
- ✅ Progress continues advancing
- ✅ All controls remain functional

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## Test Section 2: Shuffle and Repeat Modes

### Test 2.1: Enable Shuffle

**Objective:** Verify shuffle randomizes track order

**Steps:**

1. Start playlist playback (note current track order)
2. Click shuffle button in mini player
3. Click "Next" button several times
4. Observe track order

**Expected Results:**

- ✅ Shuffle button shows active state (highlighted)
- ✅ Tracks play in different order than original
- ✅ Current track continues playing when shuffle enabled
- ✅ All tracks still accessible

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 2.2: Disable Shuffle

**Objective:** Verify disabling shuffle restores original order

**Steps:**

1. With shuffle enabled, note current track
2. Click shuffle button again to disable
3. Click "Next" button
4. Observe track order

**Expected Results:**

- ✅ Shuffle button returns to inactive state
- ✅ Next track follows original playlist order
- ✅ Current track continues playing

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 2.3: Repeat Off Mode

**Objective:** Verify playback stops after last track with repeat off

**Steps:**

1. Ensure repeat button shows "off" state (no icon highlight)
2. Navigate to last track in playlist
3. Let track play to completion
4. Observe behavior

**Expected Results:**

- ✅ Playback stops after last track
- ✅ Mini player remains visible
- ✅ Play button available to restart
- ✅ No automatic restart

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 2.4: Repeat Playlist Mode

**Objective:** Verify playlist restarts from beginning

**Steps:**

1. Click repeat button once (should show playlist repeat icon)
2. Navigate to last track
3. Let track play to completion
4. Observe behavior

**Expected Results:**

- ✅ First track starts automatically
- ✅ Seamless transition
- ✅ Playlist continues cycling

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 2.5: Repeat Track Mode

**Objective:** Verify current track replays continuously

**Steps:**

1. Click repeat button twice (should show track repeat icon)
2. Let current track play to completion
3. Observe behavior

**Expected Results:**

- ✅ Same track restarts from beginning
- ✅ Track index doesn't change
- ✅ Continues repeating
- ✅ Next/Previous buttons still work

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 2.6: Repeat Mode Cycling

**Objective:** Verify repeat button cycles through all modes

**Steps:**

1. Note current repeat mode
2. Click repeat button
3. Observe icon change
4. Click again
5. Click again

**Expected Results:**

- ✅ Cycles: Off → Playlist → Track → Off
- ✅ Icon updates for each mode
- ✅ Tooltip shows current mode

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

## Test Section 3: State Persistence

### Test 3.1: State Saves to SessionStorage

**Objective:** Verify playback state is saved

**Steps:**

1. Start playlist playback
2. Let track play for 30 seconds
3. Open DevTools > Application > Session Storage
4. Find 'playbackState' key
5. Examine the value

**Expected Results:**

- ✅ 'playbackState' key exists
- ✅ Contains playlist ID
- ✅ Contains track ID
- ✅ Contains position (~30 seconds)
- ✅ Contains shuffle/repeat modes
- ✅ Contains timestamp

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 3.2: State Restores After Refresh

**Objective:** Verify state restoration works

**Steps:**

1. Start playback at track 2, position 45 seconds
2. Enable shuffle mode
3. Press F5 to refresh page
4. Wait for page to load
5. Observe playback state

**Expected Results:**

- ✅ Playback resumes at track 2
- ✅ Position restored to ~45 seconds
- ✅ Shuffle mode still enabled
- ✅ Mini player appears automatically
- ✅ Can continue playback

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 3.3: Stale State Handling

**Objective:** Verify old state is ignored

**Steps:**

1. Open DevTools > Application > Session Storage
2. Find 'playbackState' key
3. Edit the timestamp to be 2 hours ago
4. Refresh page
5. Observe behavior

**Expected Results:**

- ✅ Old state ignored
- ✅ No playback restoration
- ✅ Mini player hidden
- ✅ Clean slate

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 3.4: Browser Close Clears State

**Objective:** Verify sessionStorage clears on browser close

**Steps:**

1. Start playback
2. Close browser completely (all windows)
3. Reopen browser
4. Navigate to site
5. Check for playback restoration

**Expected Results:**

- ✅ No playback restoration
- ✅ Mini player hidden
- ✅ Clean state

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## Test Section 4: Drag-and-Drop Reordering

### Test 4.1: Drag Handles for Owners

**Objective:** Verify drag handles appear for playlist owners

**Steps:**

1. Navigate to YOUR OWN playlist
2. Observe track list
3. Hover over tracks

**Expected Results:**

- ✅ Drag handle icon visible on each track
- ✅ Cursor changes to grab/move on hover
- ✅ Visual indication of draggable items

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 4.2: No Drag Handles for Non-Owners

**Objective:** Verify drag handles hidden for non-owners

**Steps:**

1. Navigate to ANOTHER USER'S public playlist
2. Observe track list

**Expected Results:**

- ✅ No drag handles visible
- ✅ Tracks not draggable
- ✅ Read-only view

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 4.3: Drag and Drop Functionality

**Objective:** Verify tracks can be reordered

**Steps:**

1. On your own playlist, note track order
2. Drag track 3 to position 1
3. Release mouse
4. Observe changes

**Expected Results:**

- ✅ Visual feedback during drag
- ✅ Drop zones highlighted
- ✅ Tracks shift to show new position
- ✅ Order updates immediately
- ✅ Success message shown

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 4.4: Reorder Persists

**Objective:** Verify reorder saves to database

**Steps:**

1. Reorder tracks in playlist
2. Refresh page (F5)
3. Observe track order

**Expected Results:**

- ✅ New order maintained after refresh
- ✅ All tracks in correct positions
- ✅ No gaps or duplicates

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 4.5: Playback During Reorder

**Objective:** Verify playback continues during reorder

**Steps:**

1. Start playback of track 2
2. Drag track 4 to position 1
3. Observe playback

**Expected Results:**

- ✅ Current track continues playing
- ✅ No audio interruption
- ✅ Playback controls still work

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

## Test Section 5: Two-Section Playlists Page

### Test 5.1: My Playlists Section

**Objective:** Verify user's playlists display correctly

**Steps:**

1. Navigate to http://localhost:3000/playlists
2. Locate "My Playlists" section
3. Observe playlists shown

**Expected Results:**

- ✅ "My Playlists" header visible
- ✅ All your playlists shown (public and private)
- ✅ "Create New Playlist" button available
- ✅ Playlists sorted by newest first

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 5.2: Public Playlists Section

**Objective:** Verify other users' public playlists display

**Steps:**

1. On /playlists page, scroll down
2. Locate "Public Playlists" section
3. Observe playlists shown

**Expected Results:**

- ✅ "Public Playlists" header visible
- ✅ Other users' public playlists shown
- ✅ YOUR playlists NOT in this section
- ✅ Sorted by newest first

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 5.3: No Duplication

**Objective:** Verify user's public playlists don't appear twice

**Steps:**

1. Create a public playlist
2. Refresh /playlists page
3. Check both sections

**Expected Results:**

- ✅ Public playlist appears in "My Playlists"
- ✅ Same playlist NOT in "Public Playlists"
- ✅ No duplication

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 5.4: Independent Loading

**Objective:** Verify sections load independently

**Steps:**

1. Clear browser cache
2. Navigate to /playlists
3. Observe loading behavior

**Expected Results:**

- ✅ Each section has own loading spinner
- ✅ Sections can load at different times
- ✅ No blocking between sections

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 5.5: Empty States

**Objective:** Verify empty state messages

**Steps:**

1. Test with new user account (no playlists)
2. Observe both sections

**Expected Results:**

- ✅ "My Playlists" shows "No playlists yet" message
- ✅ "Public Playlists" shows appropriate message
- ✅ Create button prominent
- ✅ Helpful messaging

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 5.6: Responsive Layout

**Objective:** Verify layout adapts to screen size

**Steps:**

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test these viewports:
   - Mobile: 375px width
   - Tablet: 768px width
   - Desktop: 1024px+ width

**Expected Results:**

- ✅ Mobile: Single column, cards full width
- ✅ Tablet: 2 columns
- ✅ Desktop: 3 columns
- ✅ Touch-friendly spacing on mobile

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## Test Section 6: Error Handling

### Test 6.1: Network Error Handling

**Objective:** Verify graceful handling of network errors

**Steps:**

1. Open DevTools > Network tab
2. Set throttling to "Offline"
3. Try to load a playlist
4. Observe error handling

**Expected Results:**

- ✅ Error message displayed
- ✅ User-friendly message (no technical jargon)
- ✅ Retry option available
- ✅ No app crash

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 6.2: Invalid Track Handling

**Objective:** Verify handling of unplayable tracks

**Steps:**

1. Start playlist with a track that has invalid audio URL
2. Let it attempt to play
3. Observe behavior

**Expected Results:**

- ✅ Error notification shown
- ✅ Automatically skips to next track
- ✅ Playback continues
- ✅ User informed of issue

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 6.3: Permission Errors

**Objective:** Verify permission checks work

**Steps:**

1. Navigate to another user's playlist
2. Try to reorder tracks (if UI allows)
3. Observe behavior

**Expected Results:**

- ✅ Drag handles not shown
- ✅ If attempted, permission denied message
- ✅ No database update
- ✅ Read-only enforced

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## Test Section 7: Performance

### Test 7.1: Page Load Performance

**Objective:** Verify acceptable load times

**Steps:**

1. Open DevTools > Network tab
2. Hard refresh page (Ctrl+Shift+R)
3. Check load time in Network tab

**Expected Results:**

- ✅ Initial page load < 3 seconds
- ✅ Playlist loads < 500ms
- ✅ No excessive network requests

**Pass/Fail:** \***\*\_\_\_\*\***

**Load Time:** \***\*\_\_\_\*\***

---

### Test 7.2: Playback Performance

**Objective:** Verify smooth playback

**Steps:**

1. Start playlist playback
2. Switch tracks multiple times
3. Observe responsiveness

**Expected Results:**

- ✅ Track switching < 100ms
- ✅ No audio stuttering
- ✅ Smooth progress bar animation
- ✅ Responsive controls

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 7.3: Memory Usage

**Objective:** Verify no memory leaks

**Steps:**

1. Open DevTools > Performance > Memory
2. Start recording
3. Play through entire playlist
4. Stop recording
5. Check memory graph

**Expected Results:**

- ✅ Memory usage stable
- ✅ No continuous growth
- ✅ Garbage collection working

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

## Test Section 8: Browser Console Checks

### Test 8.1: Console Errors

**Objective:** Verify no console errors during normal use

**Steps:**

1. Open DevTools > Console
2. Clear console
3. Perform all basic playback operations
4. Check for errors

**Expected Results:**

- ✅ No red error messages
- ✅ No React warnings
- ✅ No network errors
- ✅ Only info/debug messages if any

**Pass/Fail:** \***\*\_\_\_\*\***

**Errors Found:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 8.2: Network Requests

**Objective:** Verify efficient network usage

**Steps:**

1. Open DevTools > Network tab
2. Clear network log
3. Load playlist and start playback
4. Observe requests

**Expected Results:**

- ✅ No duplicate requests
- ✅ Audio URLs cached appropriately
- ✅ No failed requests (except intentional tests)
- ✅ Reasonable request count

**Pass/Fail:** \***\*\_\_\_\*\***

**Notes:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## Test Section 9: Code Quality Checks

### Test 9.1: TypeScript Compilation

**Objective:** Verify no TypeScript errors

**Steps:**

1. Open terminal in client folder
2. Run: `npx tsc --noEmit`
3. Check output

**Expected Results:**

- ✅ Exit code 0
- ✅ No compilation errors
- ✅ All types valid

**Pass/Fail:** \***\*\_\_\_\*\***

**Output:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

### Test 9.2: ESLint Checks

**Objective:** Verify no linting errors

**Steps:**

1. Open terminal in client folder
2. Run: `npm run lint`
3. Check output

**Expected Results:**

- ✅ Exit code 0
- ✅ No errors (warnings acceptable)
- ✅ Playlist feature files clean

**Pass/Fail:** \***\*\_\_\_\*\***

**Output:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## Test Completion Checklist

### Summary

**Total Tests:** 40+  
**Tests Passed:** **\_**  
**Tests Failed:** **\_**  
**Pass Rate:** **\_**%

### Critical Issues Found

List any blocking issues that must be fixed:

1. ***
2. ***
3. ***

### Minor Issues Found

List any non-blocking issues:

1. ***
2. ***
3. ***

### Performance Notes

Any performance concerns:

---

---

### Browser Compatibility

Tested on:

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Overall Assessment

**Ready for Production?** YES / NO

**Tester Name:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***  
**Test Date:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***  
**Test Duration:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

### Sign-Off

By completing this manual testing guide, I confirm that:

- [ ] All tests have been executed
- [ ] Results have been documented
- [ ] Critical issues have been reported
- [ ] The feature meets requirements

**Signature:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***  
**Date:** **\*\*\*\***\*\*\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\*\*\***\*\*\*\***

---

## Appendix: Quick Reference

### Common Issues and Solutions

**Issue:** Mini player doesn't appear  
**Solution:** Check browser console for errors, verify playlist has tracks

**Issue:** Playback doesn't start  
**Solution:** Check audio URL validity, check network tab for failed requests

**Issue:** State doesn't restore  
**Solution:** Check sessionStorage in DevTools, verify timestamp not stale

**Issue:** Drag-and-drop doesn't work  
**Solution:** Verify you're the playlist owner, check for JavaScript errors

### Test Data Requirements

**Minimum Test Data:**

- 1 user account
- 1 playlist with 5+ tracks
- 1 public playlist from another user

**Recommended Test Data:**

- 2+ user accounts
- 3+ playlists (mix of public/private)
- 10+ tracks total
- Mix of short and long tracks

### Performance Benchmarks

**Target Metrics:**

- Page load: < 3 seconds
- Playlist load: < 500ms
- Track switching: < 100ms
- Drag-and-drop response: < 50ms
- State restoration: < 200ms

### Browser DevTools Tips

**Console Filtering:**

- Filter by "error" to see only errors
- Filter by "warn" to see warnings
- Use `-node_modules` to hide library warnings

**Network Throttling:**

- Fast 3G: Test mobile performance
- Slow 3G: Test loading states
- Offline: Test error handling

**Performance Profiling:**

- Record during playback to check for jank
- Check memory tab for leaks
- Monitor CPU usage during operations

---

**End of Manual Testing Guide**
