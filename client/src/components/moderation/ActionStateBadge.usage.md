# ActionStateBadge Component Usage

## Overview

The `ActionStateBadge` component provides consistent visual indicators for moderation action states across the entire moderation system. It displays color-coded badges that clearly communicate whether an action is active, reversed, or expired.

## Requirements

- **15.1**: Display reversed actions with strikethrough and "REVERSED" badge
- **15.4**: Implement consistent color coding across all views

## Component API

### Props

```typescript
interface ActionStateBadgeProps {
  action: ModerationAction;  // The moderation action to display
  className?: string;        // Optional additional CSS classes
}
```

### Action States

The component automatically determines the action state based on the action data:

1. **ACTIVE** - Action is currently in effect
   - Color: Red (#DC2626)
   - Badge: "ACTIVE"
   - No strikethrough

2. **REVERSED** - Action has been reversed by a moderator
   - Color: Gray (#6B7280)
   - Badge: "REVERSED"
   - Strikethrough styling applied

3. **EXPIRED** - Action has reached its expiration date
   - Color: Blue (#2563EB)
   - Badge: "EXPIRED"
   - No strikethrough

## Usage Examples

### Basic Usage

```tsx
import { ActionStateBadge } from '@/components/moderation/ActionStateBadge';
import { ModerationAction } from '@/types/moderation';

function ActionList({ actions }: { actions: ModerationAction[] }) {
  return (
    <div>
      {actions.map((action) => (
        <div key={action.id} className="flex items-center space-x-2">
          <span>{action.reason}</span>
          <ActionStateBadge action={action} />
        </div>
      ))}
    </div>
  );
}
```

### In Action Logs Table

```tsx
import { ActionStateBadge } from '@/components/moderation/ActionStateBadge';

function ActionLogsTable({ actions }: { actions: ModerationAction[] }) {
  return (
    <table>
      <tbody>
        {actions.map((action) => (
          <tr key={action.id}>
            <td>{action.action_type}</td>
            <td>
              <ActionStateBadge action={action} />
            </td>
            <td>{action.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### In User Profile

```tsx
import { ActionStateBadge } from '@/components/moderation/ActionStateBadge';

function UserModerationHistory({ actions }: { actions: ModerationAction[] }) {
  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <div key={action.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
          <div>
            <p className="font-medium">{action.action_type}</p>
            <p className="text-sm text-gray-400">{action.reason}</p>
          </div>
          <ActionStateBadge action={action} />
        </div>
      ))}
    </div>
  );
}
```

### With Custom Styling

```tsx
import { ActionStateBadge } from '@/components/moderation/ActionStateBadge';

function CustomActionDisplay({ action }: { action: ModerationAction }) {
  return (
    <div className="flex items-center space-x-3">
      <ActionStateBadge 
        action={action} 
        className="text-sm font-bold" 
      />
      <span>{action.reason}</span>
    </div>
  );
}
```

## Utility Functions

The component also exports several utility functions for working with action states:

### getStateColor

Get the hex color code for an action state (useful for charts):

```typescript
import { getStateColor } from '@/components/moderation/ActionStateBadge';

const activeColor = getStateColor('active');    // '#DC2626'
const reversedColor = getStateColor('reversed'); // '#6B7280'
const expiredColor = getStateColor('expired');   // '#2563EB'
```

### isActionReversed

Check if an action has been reversed:

```typescript
import { isActionReversed } from '@/components/moderation/ActionStateBadge';

if (isActionReversed(action)) {
  console.log('This action was reversed');
}
```

### isActionExpired

Check if an action has expired:

```typescript
import { isActionExpired } from '@/components/moderation/ActionStateBadge';

if (isActionExpired(action)) {
  console.log('This action has expired');
}
```

### isActionActive

Check if an action is currently active:

```typescript
import { isActionActive } from '@/components/moderation/ActionStateBadge';

if (isActionActive(action)) {
  console.log('This action is currently in effect');
}
```

## Color Coding System

The component implements a consistent color coding system across all views:

| State    | Background | Text Color | Hex Code | Strikethrough |
|----------|-----------|------------|----------|---------------|
| Active   | Red       | Light Red  | #DC2626  | No            |
| Reversed | Gray      | Light Gray | #6B7280  | Yes           |
| Expired  | Blue      | Light Blue | #2563EB  | No            |

## Integration Points

This component should be used in:

1. **ModerationLogs** - Display action state in logs table
2. **UserStatusPanel** - Show state of user's active actions
3. **ModerationActionPanel** - Display state when viewing action details
4. **ReportCard** - Show state of related actions
5. **ModerationHistoryTimeline** - Visual indicators in timeline
6. **ReversalHistoryView** - Display state in reversal history
7. **ModeratorReversalStats** - Show state in statistics

## Accessibility

The component uses semantic HTML and provides clear visual indicators:

- Color is not the only indicator (text labels are included)
- Sufficient color contrast for WCAG AA compliance
- Strikethrough provides additional visual cue for reversed actions
- Text labels are screen-reader friendly

## Testing

When testing components that use `ActionStateBadge`:

```typescript
import { render, screen } from '@testing-library/react';
import { ActionStateBadge } from '@/components/moderation/ActionStateBadge';

test('displays ACTIVE badge for active action', () => {
  const action = {
    id: '1',
    revoked_at: null,
    expires_at: null,
    // ... other required fields
  };

  render(<ActionStateBadge action={action} />);
  expect(screen.getByText('ACTIVE')).toBeInTheDocument();
});

test('displays REVERSED badge for reversed action', () => {
  const action = {
    id: '1',
    revoked_at: new Date().toISOString(),
    expires_at: null,
    // ... other required fields
  };

  render(<ActionStateBadge action={action} />);
  expect(screen.getByText('REVERSED')).toBeInTheDocument();
});

test('displays EXPIRED badge for expired action', () => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  const action = {
    id: '1',
    revoked_at: null,
    expires_at: pastDate.toISOString(),
    // ... other required fields
  };

  render(<ActionStateBadge action={action} />);
  expect(screen.getByText('EXPIRED')).toBeInTheDocument();
});
```

## Best Practices

1. **Always use this component** for displaying action states - don't create custom badges
2. **Don't override the color scheme** - maintain consistency across the application
3. **Use utility functions** when you need to check action state programmatically
4. **Combine with tooltips** for additional context (see ReversalTooltip component)
5. **Test all three states** when writing component tests

## Related Components

- `ReversalTooltip` - Provides detailed reversal information on hover
- `ModerationHistoryTimeline` - Uses badges in timeline visualization
- `UserStatusPanel` - Displays badges for user's active actions
- `ModerationLogs` - Shows badges in action logs table
