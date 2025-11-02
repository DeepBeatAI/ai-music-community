# Manual Testing Guide - My Library Feature

## Overview

This guide provides step-by-step instructions for manually testing the My Library feature.

## Prerequisites

- [ ] Application running locally or staging
- [ ] Test user account with authentication
- [ ] 3-5 test audio files ready (MP3, WAV, FLAC)
- [ ] Browser DevTools open
- [ ] Multiple devices/browsers available

## Test Suite 1: Visual Design (Task 23)

### Test 23.1: Stats Section Display

**Steps**:
1. Navigate to `/library`
2. Observe Stats Section

**Verify**:
- [ ] All 6 stats visible with icons
- [ ] Desktop: 1 row × 6 columns
- [ ] Mobile: 2 rows × 3 columns
- [ ] Hover effects work
- [ ] Numbers formatted correctly

### Test 23.2: Track Card Actions

**Steps**:
1. Hover over track card
2. Click three-dot menu

**Verify**:
- [ ] Menu opens with all options
- [ ] Menu closes on outside click
- [ ] Touch targets ≥44px on mobile

### Test 23.3: Album Track Numbers

**Steps**:
1. View album detail page
2. Check track numbers

**Verify**:
- [ ] Albums show track numbers (1, 2, 3...)
- [ ] Playlists don't show numbers

### Test 23.4: Collapsible Sections

**Steps**:
1. Click collapse arrow on section
2. Refresh page

**Verify**:
- [ ] Smooth 300ms animation
- [ ] State persists after refresh
- [ ] All sections collapsible

### Test 23.5: Lazy Loading

**Steps**:
1. Load page, don't scroll
2. Slowly scroll down

**Verify**:
- [ ] Albums/Playlists show skeleton initially
- [ ] Load when within 200px of viewport
- [ ] Smooth transition, no jumping

## Test Suite 2: Integration Flows (Task 24)

### Test 24.1: Upload → Assign → Verify

**Steps**:
1. Upload track "Test Track 001"
2. Assign to album
3. Check All Tracks section
4. Check album detail page

**Verify**:
- [ ] Track appears in All Tracks
- [ ] Track shows album badge
- [ ] Track appears in album
- [ ] Stats updated

### Test 24.2: Create Album → Add Tracks → Reorder

**Steps**:
1. Create "Test Album 001"
2. Add 3 tracks to album
3. Drag track #3 to position #1
4. Refresh page

**Verify**:
- [ ] Album created successfully
- [ ] Tracks added to album
- [ ] Reorder works with drag-drop
- [ ] Order persists after refresh

### Test 24.3: Delete Track → Verify Cleanup

**Steps**:
1. Create track in album and playlist
2. Delete track
3. Check album and playlist

**Verify**:
- [ ] Confirmation dialog shows
- [ ] Track removed from all locations
- [ ] Stats updated
- [ ] No broken references



### Test 24.4: Album Assignment Switching

**Steps**:
1. Create two albums: "Album A" and "Album B"
2. Add track to "Album A"
3. Open track actions menu
4. Select "Add to Album"
5. Choose "Album B"
6. Save

**Verify**:
- [ ] Track removed from Album A
- [ ] Track added to Album B
- [ ] Track badge updates
- [ ] Only in one album at a time

### Test 24.5: State Persistence

**Steps**:
1. Collapse "All Tracks" section
2. Collapse "My Albums" section
3. Refresh page (F5)
4. Check section states

**Verify**:
- [ ] Collapsed sections remain collapsed
- [ ] Expanded sections remain expanded
- [ ] localStorage contains state
- [ ] Works across browser sessions

## Test Suite 3: Error Handling

### Test 24.6: Error Boundaries

**Steps**:
1. Simulate network failure (DevTools offline)
2. Try to load sections

**Verify**:
- [ ] Error message displays
- [ ] "Try Again" button works
- [ ] Other sections still functional
- [ ] No page crash

### Test 24.7: Upload Errors

**Steps**:
1. Try uploading invalid file type
2. Try uploading file >50MB
3. Disconnect network during upload

**Verify**:
- [ ] Clear error messages
- [ ] Upload can be retried
- [ ] Form doesn't break
- [ ] User can cancel

## Test Suite 4: Performance

### Test 24.8: Large Data Sets

**Setup**: Create 50+ tracks, 20+ albums

**Steps**:
1. Navigate to `/library`
2. Observe load times
3. Scroll through sections

**Verify**:
- [ ] Initial load <3 seconds
- [ ] Smooth scrolling
- [ ] No lag on interactions
- [ ] Lazy loading works

### Test 24.9: Cache Behavior

**Steps**:
1. Load library page
2. Note load time
3. Navigate away
4. Return to library page
5. Note load time

**Verify**:
- [ ] Second load faster (cached)
- [ ] Data still accurate
- [ ] Cache invalidates on mutations

## Test Suite 5: Mobile Specific

### Test 24.10: Touch Interactions

**Device**: Test on actual mobile device

**Steps**:
1. Tap track card
2. Long-press track card
3. Swipe through sections
4. Pinch to zoom

**Verify**:
- [ ] Touch targets ≥44px
- [ ] No accidental triggers
- [ ] Smooth scrolling
- [ ] Gestures work naturally

### Test 24.11: Mobile Layout

**Steps**:
1. Test on phone (≤767px)
2. Test on tablet (768-1023px)
3. Rotate device

**Verify**:
- [ ] No horizontal scroll
- [ ] Text readable
- [ ] Buttons accessible
- [ ] Layout adapts to orientation

## Pass/Fail Criteria

### Critical (Must Pass)
- All core functionality works
- No data loss
- No crashes or errors
- Responsive on all devices

### Important (Should Pass)
- Smooth animations
- Fast load times
- Good UX
- Clear error messages

### Nice to Have
- Perfect visual polish
- Optimal performance
- Advanced features

## Reporting Issues

When you find a bug, document:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Screenshots/video**
5. **Device/browser info**
6. **Console errors**

## Test Completion Checklist

- [ ] All Test Suite 1 tests passed
- [ ] All Test Suite 2 tests passed
- [ ] All Test Suite 3 tests passed
- [ ] All Test Suite 4 tests passed
- [ ] All Test Suite 5 tests passed
- [ ] Issues documented
- [ ] Critical bugs fixed
- [ ] Ready for production
