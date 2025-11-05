# Single Track Page - Manual Testing Guide

## Overview
This document provides a comprehensive manual testing checklist for the Single Track Page feature. All automated tests have passed (93/93), and this guide covers functionality that requires manual validation.

## Prerequisites
- Development server running (`npm run dev`)
- At least one track uploaded to the database
- Test user account (authenticated)
- Test track IDs (valid and invalid)

## Testing Checklist

### 1. Basic Page Load and Display

#### Test 1.1: Valid Track ID
- [ ] Navigate to `/tracks/{valid_id}`
- [ ] **Expected**: Page loads without errors
- [ ] **Expected**: Track metadata displays correctly (title, author, play count, like count)
- [ ] **Expected**: Creator information displays with avatar and username
- [ ] **Expected**: Track stats show (plays, likes, upload date)

#### Test 1.2: Invalid Track ID
- [ ] Navigate to `/tracks/{invalid_id}`
- [ ] **Expected**: 404 error page displays
- [ ] **Expected**: Error message: "Track Not Found"
- [ ] **Expected**: "Go Back" and "Go to Dashboard" buttons display
- [ ] **Expected**: No console errors

### 2. Audio Playback

#### Test 2.1: Waveform Player Display
- [ ] Verify waveform player displays correctly
- [ ] **Expected**: Waveform visualization shows
- [ ] **Expected**: Play/pause button is visible
- [ ] **Expected**: Progress bar displays
- [ ] **Expected**: Time indicators show (current/total)

#### Test 2.2: Audio Playback
- [ ] Click the "Click to load audio player" button
- [ ] **Expected**: Audio player loads
- [ ] **Expected**: Loading state shows briefly
- [ ] Click play button
- [ ] **Expected**: Audio starts playing
- [ ] **Expected**: Waveform progress indicator moves
- [ ] **Expected**: Time updates in real-time

#### Test 2.3: Seek Functionality
- [ ] Click on different positions on the waveform
- [ ] **Expected**: Audio seeks to clicked position
- [ ] **Expected**: Playback continues from new position
- [ ] **Expected**: Time indicator updates correctly

#### Test 2.4: Volume Control
- [ ] Adjust volume slider
- [ ] **Expected**: Audio volume changes accordingly
- [ ] **Expected**: Volume level persists across seeks
- [ ] Mute/unmute audio
- [ ] **Expected**: Audio mutes and unmutes correctly

#### Test 2.5: Play Tracking (30+ seconds)
- [ ] Play track for at least 30 seconds
- [ ] Wait a few seconds after 30-second mark
- [ ] Check database `tracks` table for the track
- [ ] **Expected**: `play_count` has incremented by 1
- [ ] Play again immediately
- [ ] **Expected**: Play count does NOT increment (debounced)

### 3. Social Interactions

#### Test 3.1: Like Button (Authenticated)
- [ ] Ensure you're logged in
- [ ] Click the like button (heart icon)
- [ ] **Expected**: Button changes to "liked" state (filled heart)
- [ ] **Expected**: Like count increments by 1
- [ ] **Expected**: Toast notification shows "Track liked"
- [ ] Click like button again to unlike
- [ ] **Expected**: Button changes to "unliked" state (outline heart)
- [ ] **Expected**: Like count decrements by 1

#### Test 3.2: Like Button (Unauthenticated)
- [ ] Log out or open in incognito mode
- [ ] Navigate to track page
- [ ] **Expected**: Like button shows but is disabled or prompts login
- [ ] Click like button
- [ ] **Expected**: Redirected to login or shown login prompt

#### Test 3.3: Follow Button (Authenticated, Non-Owner)
- [ ] Ensure you're logged in
- [ ] Navigate to a track you don't own
- [ ] **Expected**: Follow button displays next to creator name
- [ ] Click follow button
- [ ] **Expected**: Button changes to "Following"
- [ ] **Expected**: Toast notification shows success message
- [ ] Click again to unfollow
- [ ] **Expected**: Button changes back to "Follow"

#### Test 3.4: Follow Button (Track Owner)
- [ ] Navigate to your own track
- [ ] **Expected**: Follow button does NOT display
- [ ] **Expected**: Only track actions menu shows

### 4. Track Actions Menu

#### Test 4.1: Track Owner Actions
- [ ] Navigate to your own track
- [ ] Click the actions menu (three dots)
- [ ] **Expected**: Menu shows "Edit Track" and "Delete Track" options
- [ ] Click "Edit Track"
- [ ] **Expected**: Edit modal opens with track details
- [ ] Close modal and click "Delete Track"
- [ ] **Expected**: Confirmation dialog appears
- [ ] Cancel deletion
- [ ] **Expected**: Track remains, modal closes

#### Test 4.2: Non-Owner Actions
- [ ] Navigate to someone else's track
- [ ] Click the actions menu
- [ ] **Expected**: Menu shows "Copy Track URL" option
- [ ] **Expected**: No edit or delete options visible

#### Test 4.3: Copy Track URL
- [ ] Click "Copy Track URL" from actions menu
- [ ] **Expected**: Toast notification shows "URL copied to clipboard"
- [ ] Paste into a text editor
- [ ] **Expected**: Full track URL is copied correctly
- [ ] Open copied URL in new tab
- [ ] **Expected**: Same track page loads

### 5. Navigation

#### Test 5.1: Back Button
- [ ] Navigate to track page from dashboard
- [ ] Click back button
- [ ] **Expected**: Returns to dashboard
- [ ] **Expected**: Scroll position preserved (if applicable)

#### Test 5.2: Back Button (Direct Link)
- [ ] Open track page directly (no history)
- [ ] Click back button
- [ ] **Expected**: Navigates to dashboard (authenticated) or home (unauthenticated)

#### Test 5.3: Browser Back Button
- [ ] Navigate to track page
- [ ] Use browser back button
- [ ] **Expected**: Navigation works correctly
- [ ] **Expected**: Audio stops playing

### 6. Responsive Design

#### Test 6.1: Mobile Layout (< 768px)
- [ ] Open page on mobile device or resize browser to mobile width
- [ ] **Expected**: Single column layout
- [ ] **Expected**: Waveform player full width
- [ ] **Expected**: Track card below player
- [ ] **Expected**: All buttons are touch-friendly (44px minimum)
- [ ] **Expected**: Text is readable without zooming

#### Test 6.2: Tablet Layout (768px - 1024px)
- [ ] Resize browser to tablet width
- [ ] **Expected**: Layout adjusts appropriately
- [ ] **Expected**: Content remains readable and accessible

#### Test 6.3: Desktop Layout (> 1024px)
- [ ] Open page on desktop or resize to desktop width
- [ ] **Expected**: Two-column layout displays
- [ ] **Expected**: Track card and details on left
- [ ] **Expected**: Additional info on right
- [ ] **Expected**: Waveform player spans full width

### 7. Error Handling

#### Test 7.1: Network Error
- [ ] Open DevTools Network tab
- [ ] Set network to "Offline"
- [ ] Try to load track page
- [ ] **Expected**: Network error message displays
- [ ] **Expected**: Retry button shows
- [ ] Set network back to "Online"
- [ ] Click retry
- [ ] **Expected**: Page loads successfully

#### Test 7.2: Audio Load Failure
- [ ] Navigate to track with invalid audio URL (if available)
- [ ] **Expected**: Audio error message displays
- [ ] **Expected**: Troubleshooting steps shown
- [ ] **Expected**: Retry button available

#### Test 7.3: Permission Denied (Private Track)
- [ ] Log out
- [ ] Navigate to a private track URL
- [ ] **Expected**: 403 error page displays
- [ ] **Expected**: Message: "Access Denied"
- [ ] **Expected**: "Sign In" button shows

### 8. Performance

#### Test 8.1: Page Load Time
- [ ] Open DevTools Performance tab
- [ ] Navigate to track page
- [ ] **Expected**: Page loads in < 3 seconds
- [ ] **Expected**: Metadata loads before audio
- [ ] **Expected**: No layout shifts

#### Test 8.2: Audio Ready Time
- [ ] Click to load audio player
- [ ] **Expected**: Audio ready in < 2 seconds
- [ ] **Expected**: Loading indicator shows during load

#### Test 8.3: Interaction Response Time
- [ ] Click like button
- [ ] **Expected**: UI updates immediately (optimistic)
- [ ] **Expected**: No lag or delay
- [ ] Click follow button
- [ ] **Expected**: Immediate visual feedback

### 9. SEO and Sharing

#### Test 9.1: Page Title
- [ ] Navigate to track page
- [ ] Check browser tab title
- [ ] **Expected**: Title format: "{Track Title} by {Author} | AI Music Community"

#### Test 9.2: Meta Description
- [ ] View page source
- [ ] Check meta description tag
- [ ] **Expected**: Contains track title and description

#### Test 9.3: Open Graph Tags
- [ ] Share track URL on Facebook or LinkedIn
- [ ] **Expected**: Preview shows track title
- [ ] **Expected**: Preview shows track description
- [ ] **Expected**: Preview shows track cover image (or default)

#### Test 9.4: Twitter Card
- [ ] Share track URL on Twitter/X
- [ ] **Expected**: Card displays with large image
- [ ] **Expected**: Card shows track title and description

### 10. Offline Detection

#### Test 10.1: Going Offline
- [ ] While on track page, disconnect internet
- [ ] **Expected**: Offline indicator appears at top
- [ ] **Expected**: Message: "You're offline"
- [ ] Try to like track
- [ ] **Expected**: Action queued for retry

#### Test 10.2: Coming Back Online
- [ ] Reconnect internet
- [ ] **Expected**: Offline indicator disappears
- [ ] **Expected**: Toast: "Connection restored"
- [ ] **Expected**: Queued actions retry automatically

### 11. Edge Cases

#### Test 11.1: Very Long Track Title
- [ ] Navigate to track with very long title
- [ ] **Expected**: Title truncates with ellipsis
- [ ] **Expected**: Full title visible on hover (if applicable)

#### Test 11.2: Track with No Description
- [ ] Navigate to track without description
- [ ] **Expected**: Description section doesn't show or shows placeholder

#### Test 11.3: Track with No Playlists
- [ ] Navigate to track not in any playlists
- [ ] **Expected**: Playlist section doesn't show or shows "Not in any playlists"

#### Test 11.4: Rapid Button Clicks
- [ ] Rapidly click like button multiple times
- [ ] **Expected**: Only one request sent (debounced)
- [ ] **Expected**: UI state remains consistent

## Test Results Template

### Test Session Information
- **Date**: _______________
- **Tester**: _______________
- **Environment**: Development / Staging / Production
- **Browser**: _______________
- **Device**: _______________

### Results Summary
- **Total Tests**: 50+
- **Passed**: _______________
- **Failed**: _______________
- **Blocked**: _______________

### Issues Found
| Test ID | Description | Severity | Status |
|---------|-------------|----------|--------|
|         |             |          |        |

### Notes
_Add any additional observations or comments here_

## Sign-Off

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Known issues documented
- [ ] Ready for production

**Tester Signature**: _______________
**Date**: _______________
