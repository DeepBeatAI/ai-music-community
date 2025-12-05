# Show Full History Toggle Implementation

## Overview

Implemented a "Show Full History" toggle in the UserStatusPanel component that allows moderators to view all moderation actions including reversed and expired actions, with proper visual distinction.

## Implementation Details

### Location
- **Component**: `client/src/components/moderation/UserStatusPanel.tsx`
- **Section**: `ModerationHistorySection` component

### Features Implemented

#### 1. Toggle Button
- Located in the header of the Recent Moderation History section
- Text changes between "Show Full History" and "Show Active Only"
- Triggers loading of full history when clicked

#### 2. Collapsed/Dimmed Display for Reversed Actions
**Requirements: 15.3**

When "Show Full History" is enabled:
- Reversed actions are displayed with reduced opacity (60%)
- Expired actions are displayed with reduced opacity (60%)
- Each reversed/expired action has an expand/collapse button (▶/▼)
- Details are hidden by default in collapsed state
- Clicking the expand button shows full details

#### 3. Visual Distinction
**Requirements: 15.3, 15.4**

- **Active actions**: White background, full opacity
- **Reversed actions**: Gray background (#F9FAFB), 60% opacity, strikethrough text
- **Expired actions**: Blue background (#EFF6FF), 60% opacity, blue text
- Badges clearly indicate status (REVERSED, EXPIRED)

#### 4. State Management
- Uses React `useState` to track which reversed actions are expanded
- Maintains a Set of expanded action IDs
- Toggle function adds/removes IDs from the set

### User Experience

#### Default View (Show Active Only)
- Shows only active (non-reversed, non-expired) actions
- Full details visible for all actions
- Clean, focused view of current restrictions

#### Full History View
- Shows all actions including reversed and expired
- Reversed/expired actions start in collapsed state
- Users can expand individual actions to see details
- Maintains visual hierarchy with dimmed appearance

### Code Structure

```typescript
// State for tracking expanded reversed actions
const [expandedReversedActions, setExpandedReversedActions] = useState<Set<string>>(new Set());

// Toggle function
const toggleReversedAction = (actionId: string) => {
  setExpandedReversedActions(prev => {
    const newSet = new Set(prev);
    if (newSet.has(actionId)) {
      newSet.delete(actionId);
    } else {
      newSet.add(actionId);
    }
    return newSet;
  });
};

// Conditional rendering based on state
{(!showFullHistory || !isReversedOrExpired || isExpanded) && (
  // Full details
)}
```

### Integration Points

1. **getUserModerationHistory()**: Loads full history when toggle is enabled
2. **ReversalTooltip**: Provides hover details for all actions
3. **ActionStateBadge**: Shows status badges (REVERSED, EXPIRED)
4. **Color coding system**: Consistent with Requirements 15.4

### Testing Considerations

- Verify toggle switches between "Show Full History" and "Show Active Only"
- Confirm reversed actions appear collapsed by default in full history view
- Test expand/collapse functionality for individual actions
- Validate visual distinction (opacity, colors, strikethrough)
- Ensure active actions always show full details
- Check that action counts update correctly

## Requirements Validated

- ✅ **15.3**: Expand to show all actions including reversed
- ✅ **15.3**: Display reversed actions in collapsed/dimmed state
- ✅ **15.3**: Maintain visual distinction
- ✅ **15.4**: Color coding (active=red, reversed=gray, expired=blue)

## Related Components

- `UserStatusPanel.tsx` - Main implementation
- `ReversalTooltip.tsx` - Hover details
- `ActionStateBadge.tsx` - Status badges
- `ModerationHistoryTimeline.tsx` - Alternative timeline view

## Future Enhancements

- Add keyboard shortcuts for expand/collapse
- Implement "Expand All" / "Collapse All" buttons
- Add animation transitions for expand/collapse
- Consider persisting expanded state in localStorage
