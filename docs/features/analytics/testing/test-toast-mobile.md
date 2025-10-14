# Toast Notification Mobile Testing Guide

## Overview
This guide provides instructions for testing toast notifications on mobile devices to ensure they meet the requirements for mobile responsiveness and touch-friendly interactions.

## Testing Checklist

### Visual Testing

#### Desktop (1920x1080)
- [ ] Toasts appear in top-right corner
- [ ] Toasts are properly sized (min-width: 300px, max-width: 500px)
- [ ] Multiple toasts stack vertically without overlap
- [ ] Animations are smooth (slide-in from right, fade-out)
- [ ] Text is readable at default zoom level

#### Tablet (768x1024)
- [ ] Toasts remain in top-right corner
- [ ] Toasts don't overflow viewport
- [ ] Text remains readable
- [ ] Touch targets are at least 44px
- [ ] Animations work smoothly

#### Mobile (375x667 - iPhone SE)
- [ ] Toasts appear in top-right corner
- [ ] Toasts adjust width to fit screen (with padding)
- [ ] Text wraps properly for long messages
- [ ] Icons are visible and properly sized
- [ ] Dismiss button is easily tappable (44px minimum)

#### Mobile (360x640 - Android)
- [ ] Same checks as iPhone SE
- [ ] Toasts don't interfere with navigation
- [ ] Z-index ensures toasts appear above other content

### Interaction Testing

#### Touch Interactions
- [ ] Dismiss button responds to touch
- [ ] No accidental dismissals from nearby touches
- [ ] Touch feedback is immediate
- [ ] No double-tap required

#### Auto-Dismiss
- [ ] Success toasts dismiss after 4 seconds
- [ ] Error toasts dismiss after 5 seconds
- [ ] Timer resets if user interacts with toast
- [ ] Multiple toasts dismiss independently

#### Accessibility
- [ ] Screen reader announces toast messages
- [ ] Success toasts use "polite" announcement
- [ ] Error toasts use "assertive" announcement
- [ ] Dismiss button has proper aria-label
- [ ] Focus management works correctly

### Edit Flow Testing

#### Post Editing on Mobile
1. Navigate to a post you own
2. Tap the Edit button (should be 44px touch target)
3. Edit the content
4. Tap Save
5. Verify success toast appears
6. Verify toast is readable and doesn't block content
7. Verify toast auto-dismisses after 4 seconds

#### Comment Editing on Mobile
1. Navigate to a comment you own
2. Tap the Edit button
3. Edit the comment
4. Tap Save
5. Verify success toast appears
6. Verify toast doesn't interfere with comment thread
7. Verify toast auto-dismisses after 4 seconds

#### Error Scenarios on Mobile
1. Edit a post/comment
2. Turn off network connection
3. Attempt to save
4. Verify error toast appears
5. Verify error message is readable
6. Verify toast auto-dismisses after 5 seconds
7. Turn network back on and retry

### Performance Testing

#### Animation Performance
- [ ] Slide-in animation is smooth (60fps)
- [ ] Fade-out animation is smooth
- [ ] No jank or stuttering
- [ ] Multiple toasts animate independently

#### Memory Usage
- [ ] Toasts are properly cleaned up after dismissal
- [ ] No memory leaks with repeated toast creation
- [ ] Browser doesn't slow down with many toasts

### Browser Testing

#### iOS Safari
- [ ] Toasts render correctly
- [ ] Animations work smoothly
- [ ] Touch interactions work
- [ ] Auto-dismiss works
- [ ] Screen reader (VoiceOver) announces toasts

#### Chrome Mobile (Android)
- [ ] Toasts render correctly
- [ ] Animations work smoothly
- [ ] Touch interactions work
- [ ] Auto-dismiss works
- [ ] Screen reader (TalkBack) announces toasts

#### Firefox Mobile
- [ ] Toasts render correctly
- [ ] Animations work smoothly
- [ ] Touch interactions work
- [ ] Auto-dismiss works

## Testing Procedure

### Manual Testing Steps

1. **Open Developer Tools**
   - Press F12 or right-click and select "Inspect"
   - Click the device toolbar icon (or Ctrl+Shift+M)

2. **Select Mobile Device**
   - Choose "iPhone SE" from the device dropdown
   - Set orientation to portrait

3. **Test Post Editing**
   - Navigate to feed or profile
   - Find a post you own
   - Click Edit button
   - Modify content
   - Click Save
   - Observe toast notification

4. **Test Comment Editing**
   - Navigate to a post with your comments
   - Click Edit on your comment
   - Modify content
   - Click Save
   - Observe toast notification

5. **Test Error Handling**
   - Open Network tab in DevTools
   - Set throttling to "Offline"
   - Attempt to edit and save
   - Observe error toast
   - Set throttling back to "Online"

6. **Test Multiple Toasts**
   - Quickly edit and save multiple items
   - Verify toasts stack properly
   - Verify each dismisses independently

7. **Test Accessibility**
   - Enable screen reader (VoiceOver on Mac, NVDA on Windows)
   - Trigger a toast notification
   - Verify announcement is made
   - Verify dismiss button is accessible

### Automated Testing

Run the integration tests:
```bash
cd client
npm test -- --testPathPatterns="toast-edit-integration"
```

All tests should pass, including:
- Success toast display
- Error toast display
- Auto-dismiss timing
- Multiple toast queue

## Common Issues and Solutions

### Issue: Toast appears off-screen on small devices
**Solution**: Check that `max-width: 500px` is set and viewport padding is applied

### Issue: Dismiss button too small to tap
**Solution**: Verify `min-w-[24px] min-h-[24px]` classes are applied (should be 44px for better touch)

### Issue: Toast blocks important content
**Solution**: Ensure z-index is appropriate and position is `fixed` not `absolute`

### Issue: Animations are janky on mobile
**Solution**: Use CSS transforms instead of position changes, enable hardware acceleration

### Issue: Screen reader doesn't announce toasts
**Solution**: Verify `role="alert"` and `aria-live` attributes are present

## Success Criteria

All tests pass when:
- ✅ Toasts are visible and readable on all device sizes
- ✅ Touch targets meet 44px minimum size requirement
- ✅ Animations are smooth (60fps)
- ✅ Auto-dismiss works correctly
- ✅ Screen readers announce toasts
- ✅ Multiple toasts stack without overlap
- ✅ Toasts don't interfere with page content
- ✅ Error and success toasts are visually distinct

## Notes

- Test on actual devices when possible, not just emulators
- Test in both portrait and landscape orientations
- Test with different font sizes (accessibility settings)
- Test with reduced motion preferences enabled
- Test with high contrast mode enabled

## Reporting Issues

If you find any issues during testing:
1. Document the device/browser combination
2. Take screenshots or screen recordings
3. Note the steps to reproduce
4. Check if issue occurs on desktop as well
5. File a bug report with all details
