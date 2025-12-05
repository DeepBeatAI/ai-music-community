# ModerationHistoryTimeline Component

## Overview

The `ModerationHistoryTimeline` component displays a chronological timeline of all moderation actions and reversals for a specific user. It provides a visual representation of the progression of moderation actions over time with color-coded markers and detailed information about each action.

## Features

- **Chronological Timeline**: Displays actions in reverse chronological order (most recent first)
- **Color Coding**: 
  - Red: Active actions
  - Gray: Reversed actions
  - Blue: Expired actions
  - Yellow ring: Self-reversals
- **Visual Progression**: Shows the flow of actions over time with connecting lines
- **Self-Reversal Highlighting**: Special visual treatment for actions reversed by the same moderator
- **Detailed Information**: Shows action type, reason, duration, expiration, and reversal details
- **Responsive Design**: Works on all screen sizes

## Requirements

Validates requirements: 14.2, 15.4, 15.6, 15.7

## Usage

```tsx
import { ModerationHistoryTimeline } from '@/components/moderation/ModerationHistoryTimeline';

function UserProfilePage({ userId }: { userId: string }) {
  return (
    <div>
      <h1>User Profile</h1>
      
      {/* Display moderation timeline */}
      <ModerationHistoryTimeline userId={userId} />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | `string` | Yes | The ID of the user whose moderation history to display |

## Visual States

### Active Actions (Red)
- Actions that are currently in effect
- Not expired and not reversed
- Red marker with red background

### Reversed Actions (Gray)
- Actions that have been revoked by a moderator
- Strikethrough text
- Gray marker with gray background
- Shows reversal details including reason and timestamp

### Expired Actions (Blue)
- Actions that have reached their expiration date
- Blue marker with blue background
- No longer in effect but not explicitly reversed

### Self-Reversals (Yellow Ring)
- Actions reversed by the same moderator who created them
- Yellow ring around the marker
- Special badge indicating "SELF-REVERSAL"
- Italic text noting "Moderator corrected their own action"

## Timeline Entry Information

Each timeline entry displays:

1. **Action Type**: The type of moderation action (e.g., "User Suspended", "Content Removed")
2. **Timestamp**: When the action was created
3. **Reason**: Why the action was taken
4. **Duration**: How long the action lasts (if applicable)
5. **Expiration**: When the action expires (if applicable)
6. **Internal Notes**: Additional notes from the moderator (if any)
7. **Reversal Information** (if reversed):
   - When the action was reversed
   - Reason for reversal
   - Whether it was a self-reversal

## Color Legend

The component includes a legend at the bottom explaining the color coding:

- 🔴 Red: Active Action
- ⚪ Gray: Reversed Action
- 🔵 Blue: Expired Action
- 🟡 Yellow Ring: Self-Reversal

## Loading and Error States

### Loading State
Shows animated skeleton placeholders while fetching data.

### Error State
Displays error message if data fails to load.

### Empty State
Shows a message when the user has no moderation history.

## Integration Points

### Data Source
- Uses `getUserModerationHistory()` from `@/lib/moderationService`
- Fetches complete history including revoked actions

### Type Dependencies
- `ModerationHistoryEntry` from `@/lib/moderationService`
- `ACTION_TYPE_LABELS` from `@/types/moderation`

## Example Scenarios

### Scenario 1: User with Multiple Actions
```tsx
// User has been warned, then suspended, then suspension was lifted
<ModerationHistoryTimeline userId="user-123" />

// Timeline shows:
// 1. Suspension Lifted (gray, reversed)
// 2. User Suspended (gray, reversed, with reversal details)
// 3. User Warned (red, active)
```

### Scenario 2: Self-Reversal
```tsx
// Moderator suspended user, then realized it was a mistake and lifted it
<ModerationHistoryTimeline userId="user-456" />

// Timeline shows:
// 1. User Suspended (gray, reversed, yellow ring, "SELF-REVERSAL" badge)
//    - Shows reversal reason
//    - Shows "Moderator corrected their own action"
```

### Scenario 3: Expired Restriction
```tsx
// User had a 7-day posting restriction that has expired
<ModerationHistoryTimeline userId="user-789" />

// Timeline shows:
// 1. Restriction Applied (blue, expired, "EXPIRED" badge)
//    - Shows original duration
//    - Shows expiration date
```

## Styling

The component uses Tailwind CSS classes for styling:

- **Container**: White background with rounded corners and shadow
- **Timeline Line**: Vertical gray line connecting entries
- **Markers**: Circular markers with color coding and rings
- **Cards**: Colored backgrounds matching the action state
- **Text**: Color-coded text matching the action state

## Accessibility

- Semantic HTML structure
- Descriptive titles on markers
- Clear visual hierarchy
- Readable text with sufficient contrast
- Keyboard navigation support (inherent from HTML structure)

## Performance Considerations

- Loads all history at once (no pagination)
- Suitable for users with moderate history (< 100 actions)
- For users with extensive history, consider adding pagination or virtualization

## Future Enhancements

Potential improvements:
- Add filtering by action type
- Add date range filtering
- Add export functionality
- Add zoom/expand for detailed view
- Add animation for timeline entry appearance
- Add search functionality
- Add pagination for large histories

## Related Components

- `UserStatusPanel`: Shows current user status and active actions
- `ModerationLogs`: Shows all moderation actions across all users
- `ReversalConfirmationDialog`: Used to reverse actions

## Testing

Key test scenarios:
- Renders timeline with multiple entries
- Shows correct color coding for each state
- Highlights self-reversals correctly
- Displays reversal details
- Handles loading state
- Handles error state
- Handles empty state
- Formats dates correctly
- Formats durations correctly
