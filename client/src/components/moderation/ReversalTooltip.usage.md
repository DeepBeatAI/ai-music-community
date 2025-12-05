# ReversalTooltip Component Usage Guide

## Overview

The `ReversalTooltip` component displays detailed reversal information when hovering over reversed moderation actions. It provides a smooth, animated tooltip with complete reversal details.

**Requirements:** 15.5

## Features

- ✅ Display moderator who reversed the action
- ✅ Display reversal timestamp (with relative time for recent reversals)
- ✅ Display reversal reason
- ✅ Smooth fade-in animation (0.2s ease-in-out)
- ✅ Configurable position (top, bottom, left, right)
- ✅ Self-reversal indicator badge
- ✅ Automatic viewport boundary detection
- ✅ Responsive positioning on scroll/resize

## Basic Usage

```tsx
import { ReversalTooltip } from '@/components/moderation/ReversalTooltip';
import { ModerationAction } from '@/types/moderation';

function ActionLogRow({ action }: { action: ModerationAction }) {
  return (
    <ReversalTooltip action={action}>
      <div className="action-row">
        {/* Your action content */}
        <span className="line-through text-gray-500">
          Action taken on {formatDate(action.created_at)}
        </span>
      </div>
    </ReversalTooltip>
  );
}
```

## Props

### `action` (required)
- **Type:** `ModerationAction`
- **Description:** The moderation action to display reversal info for
- **Note:** If the action is not reversed (no `revoked_at`), the tooltip will not render

### `children` (required)
- **Type:** `React.ReactNode`
- **Description:** The element(s) that trigger the tooltip on hover

### `className` (optional)
- **Type:** `string`
- **Default:** `''`
- **Description:** Additional CSS classes for the trigger wrapper

### `position` (optional)
- **Type:** `'top' | 'bottom' | 'left' | 'right'`
- **Default:** `'top'`
- **Description:** Position of the tooltip relative to the trigger element

## Usage Examples

### In Action Logs Table

```tsx
import { ReversalTooltip } from '@/components/moderation/ReversalTooltip';
import { ActionStateBadge } from '@/components/moderation/ActionStateBadge';

function ActionLogsTable({ actions }: { actions: ModerationAction[] }) {
  return (
    <table>
      <tbody>
        {actions.map((action) => (
          <tr key={action.id}>
            <td>
              <ReversalTooltip action={action}>
                <div className="flex items-center gap-2">
                  <span className={action.revoked_at ? 'line-through' : ''}>
                    {ACTION_TYPE_LABELS[action.action_type]}
                  </span>
                  <ActionStateBadge action={action} />
                </div>
              </ReversalTooltip>
            </td>
            {/* Other columns */}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### In User Profile Action History

```tsx
import { ReversalTooltip } from '@/components/moderation/ReversalTooltip';

function UserActionHistory({ actions }: { actions: ModerationAction[] }) {
  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <ReversalTooltip key={action.id} action={action} position="right">
          <div className={`p-3 rounded-lg ${
            action.revoked_at 
              ? 'bg-gray-700 opacity-75' 
              : 'bg-red-900'
          }`}>
            <div className={action.revoked_at ? 'line-through' : ''}>
              {action.reason}
            </div>
          </div>
        </ReversalTooltip>
      ))}
    </div>
  );
}
```

### In Moderation Queue

```tsx
import { ReversalTooltip } from '@/components/moderation/ReversalTooltip';

function ReportCard({ report, relatedAction }: { 
  report: Report; 
  relatedAction?: ModerationAction;
}) {
  return (
    <div className="report-card">
      {/* Report content */}
      
      {relatedAction?.revoked_at && (
        <ReversalTooltip action={relatedAction} position="bottom">
          <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-800 rounded">
            <span className="text-yellow-300 text-sm">
              ⚠️ Previously Reversed Action
            </span>
          </div>
        </ReversalTooltip>
      )}
    </div>
  );
}
```

### In Metrics Dashboard

```tsx
import { ReversalTooltip } from '@/components/moderation/ReversalTooltip';

function RecentReversalsList({ reversals }: { reversals: ModerationAction[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Recent Reversals</h3>
      {reversals.map((action) => (
        <ReversalTooltip key={action.id} action={action} position="left">
          <div className="p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer">
            <div className="text-sm text-gray-400">
              {formatDate(action.revoked_at!)}
            </div>
            <div className="text-white line-through">
              {ACTION_TYPE_LABELS[action.action_type]}
            </div>
          </div>
        </ReversalTooltip>
      ))}
    </div>
  );
}
```

## Tooltip Content

The tooltip displays the following information:

1. **Header:** "Action Reversed" with checkmark icon
2. **Reversed by:** Moderator username or ID (with "Self-Reversal" badge if applicable)
3. **Reversed on:** Formatted timestamp (relative for recent, absolute for older)
4. **Reason:** The reversal reason from metadata

### Time Formatting

- **< 1 minute:** "Just now"
- **< 60 minutes:** "X minute(s) ago"
- **< 24 hours:** "X hour(s) ago"
- **< 7 days:** "X day(s) ago"
- **≥ 7 days:** Full date (e.g., "Jan 15, 2024, 2:30 PM")

## Styling

The tooltip uses:
- Dark theme (`bg-gray-900`, `text-white`)
- Border (`border-gray-700`)
- Shadow (`shadow-xl`)
- Smooth fade-in animation (0.2s)
- Arrow indicator pointing to trigger element
- Maximum width of `max-w-xs` (20rem)

## Accessibility

- Tooltip appears on hover (mouse enter)
- Tooltip disappears on mouse leave
- Tooltip stays within viewport boundaries
- Tooltip repositions on scroll/resize
- High contrast colors for readability
- Clear visual hierarchy

## Utility Functions

### `hasReversalInfo(action: ModerationAction): boolean`

Check if an action has reversal information before rendering the tooltip:

```tsx
import { hasReversalInfo } from '@/components/moderation/ReversalTooltip';

function ActionRow({ action }: { action: ModerationAction }) {
  if (!hasReversalInfo(action)) {
    return <div>{/* Normal action display */}</div>;
  }

  return (
    <ReversalTooltip action={action}>
      <div>{/* Reversed action display */}</div>
    </ReversalTooltip>
  );
}
```

## Best Practices

1. **Always wrap reversed actions:** Use the tooltip for any reversed action display
2. **Consistent positioning:** Use the same position within a view for consistency
3. **Visual indicators:** Combine with strikethrough and ActionStateBadge
4. **Conditional rendering:** Only render tooltip for reversed actions
5. **Hover targets:** Ensure trigger elements are large enough for easy hovering

## Integration with Other Components

### With ActionStateBadge

```tsx
<ReversalTooltip action={action}>
  <div className="flex items-center gap-2">
    <span className={action.revoked_at ? 'line-through' : ''}>
      {action.reason}
    </span>
    <ActionStateBadge action={action} />
  </div>
</ReversalTooltip>
```

### With ModerationLogs

The tooltip is already integrated into `ModerationLogs` component via the `title` attribute on table rows. For enhanced UX, you can replace the native title with this component.

### With UserStatusPanel

```tsx
<ReversalTooltip action={action} position="right">
  <div className="action-item">
    {/* Action details */}
  </div>
</ReversalTooltip>
```

## Performance Considerations

- Tooltip only renders when action is reversed
- Position calculation only occurs on hover
- Event listeners added/removed based on visibility
- Smooth animations without layout thrashing
- Efficient DOM updates

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS transforms for positioning
- Fixed positioning with z-index
- Smooth animations with CSS transitions

## Requirements Validation

✅ **Requirement 15.5:** Display moderator who reversed action  
✅ **Requirement 15.5:** Display reversal timestamp  
✅ **Requirement 15.5:** Display reversal reason  
✅ **Requirement 15.5:** Smooth fade-in animation  
✅ **Requirement 15.5:** Configurable positioning  
✅ **Requirement 15.5:** Self-reversal indication  
✅ **Requirement 15.5:** Viewport boundary detection
