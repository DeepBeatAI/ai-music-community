# ReversalConfirmationDialog Component Usage

## Overview

The `ReversalConfirmationDialog` is a reusable dialog component for confirming the reversal of moderation actions. It provides a consistent user experience across all reversal types (suspensions, bans, restrictions, etc.).

## Features

- ✅ Display original action details (who, when, why, duration)
- ✅ Require reason input (textarea, required, minimum 10 characters)
- ✅ Show warning for irreversible actions
- ✅ Implement loading state during reversal
- ✅ Show success/error messages
- ✅ Mobile-responsive design
- ✅ Dark mode support
- ✅ Accessible (keyboard navigation, ARIA labels)

## Requirements

**Validates:** Requirements 13.4, 13.14

## Basic Usage

```tsx
import { ReversalConfirmationDialog, OriginalActionDetails } from '@/components/moderation/ReversalConfirmationDialog';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);

  const originalAction: OriginalActionDetails = {
    actionType: 'user_suspended',
    reason: 'Spam posting',
    appliedBy: 'moderator_jane',
    appliedAt: '2024-01-01T10:30:00Z',
    duration: '14 days',
    expiresAt: '2024-01-15T10:30:00Z',
    targetUser: 'john_doe',
  };

  const handleConfirm = async (reason: string) => {
    // Perform the reversal action
    await liftSuspension(userId, reason);
  };

  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        Lift Suspension
      </button>

      <ReversalConfirmationDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={handleConfirm}
        title="Lift Suspension"
        originalAction={originalAction}
        confirmButtonText="Confirm Lift Suspension"
      />
    </>
  );
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls dialog visibility |
| `onClose` | `() => void` | Callback when dialog is closed |
| `onConfirm` | `(reason: string) => Promise<void>` | Callback when reversal is confirmed with the reason |
| `title` | `string` | Dialog title (e.g., "Lift Suspension", "Remove Ban") |
| `originalAction` | `OriginalActionDetails` | Details of the original action being reversed |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `confirmButtonText` | `string` | `"Confirm Reversal"` | Text for the confirm button |
| `warningMessage` | `string` | `undefined` | Custom warning message to display |
| `isIrreversible` | `boolean` | `false` | Shows a red warning for irreversible actions |

### OriginalActionDetails Interface

```typescript
interface OriginalActionDetails {
  actionType: string;          // e.g., 'user_suspended', 'user_banned'
  reason: string;              // Original reason for the action
  appliedBy?: string;          // Username of moderator who applied action
  appliedAt: string;           // ISO date string when action was applied
  duration?: string;           // Human-readable duration (e.g., "14 days")
  expiresAt?: string;          // ISO date string when action expires
  targetUser?: string;         // Username of the target user
}
```

## Usage Examples

### Example 1: Lifting a Suspension

```tsx
const suspensionAction: OriginalActionDetails = {
  actionType: 'user_suspended',
  reason: 'Spam posting',
  appliedBy: 'moderator_jane',
  appliedAt: '2024-01-01T10:30:00Z',
  duration: '14 days',
  expiresAt: '2024-01-15T10:30:00Z',
  targetUser: 'john_doe',
};

<ReversalConfirmationDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={async (reason) => {
    await liftSuspension(userId, reason);
  }}
  title="Lift Suspension"
  originalAction={suspensionAction}
  confirmButtonText="Confirm Lift Suspension"
/>
```

### Example 2: Removing a Ban (Admin Only)

```tsx
const banAction: OriginalActionDetails = {
  actionType: 'user_banned',
  reason: 'Repeated violations',
  appliedBy: 'admin_smith',
  appliedAt: '2024-01-01T10:30:00Z',
  targetUser: 'john_doe',
};

<ReversalConfirmationDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={async (reason) => {
    await removeBan(userId, reason);
  }}
  title="Remove Ban"
  originalAction={banAction}
  confirmButtonText="Confirm Remove Ban"
  warningMessage="Only admins can remove permanent bans."
/>
```

### Example 3: Removing a Restriction

```tsx
const restrictionAction: OriginalActionDetails = {
  actionType: 'restriction_applied',
  reason: 'Inappropriate comments',
  appliedBy: 'moderator_jane',
  appliedAt: '2024-01-01T10:30:00Z',
  duration: '7 days',
  expiresAt: '2024-01-08T10:30:00Z',
  targetUser: 'john_doe',
};

<ReversalConfirmationDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={async (reason) => {
    await removeUserRestriction(restrictionId, reason);
  }}
  title="Remove Restriction"
  originalAction={restrictionAction}
  confirmButtonText="Confirm Remove Restriction"
/>
```

### Example 4: With Irreversible Warning

```tsx
<ReversalConfirmationDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleConfirm}
  title="Remove Permanent Ban"
  originalAction={banAction}
  confirmButtonText="Confirm Remove Ban"
  isIrreversible={true}
/>
```

## Validation Rules

The dialog enforces the following validation rules:

1. **Required Field**: Reversal reason must not be empty
2. **Minimum Length**: Reason must be at least 10 characters
3. **Maximum Length**: Reason must not exceed 1000 characters
4. **Trimming**: Leading and trailing whitespace is automatically removed

## User Experience Flow

1. User clicks a reversal button (e.g., "Lift Suspension")
2. Dialog opens showing original action details
3. User reads the details and any warnings
4. User enters a reason for the reversal (minimum 10 characters)
5. User clicks confirm button
6. Loading state is shown during processing
7. On success:
   - Success message is displayed
   - Dialog automatically closes after 1.5 seconds
8. On error:
   - Error message is displayed
   - User can retry or cancel

## Error Handling

The component handles errors gracefully:

```tsx
const handleConfirm = async (reason: string) => {
  try {
    await liftSuspension(userId, reason);
  } catch (error) {
    // Error is caught and displayed in the dialog
    throw error; // Re-throw to let dialog handle it
  }
};
```

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ ARIA labels for screen readers
- ✅ Focus management
- ✅ Backdrop click to close
- ✅ Disabled state during submission

## Mobile Responsiveness

- Full-screen on mobile devices
- Rounded corners on larger screens
- Touch-friendly button sizes
- Scrollable content area

## Dark Mode Support

The component automatically adapts to dark mode using Tailwind's dark mode classes.

## Integration with UserStatusPanel

The `ReversalConfirmationDialog` is designed to work seamlessly with the `UserStatusPanel` component. See the `UserStatusPanel` implementation for examples of how to integrate this dialog for suspensions and restrictions.

## Testing

When testing components that use `ReversalConfirmationDialog`:

1. Test that the dialog opens when triggered
2. Test that validation works correctly
3. Test that the onConfirm callback is called with the correct reason
4. Test that the dialog closes after successful reversal
5. Test error handling
6. Test that the dialog can be cancelled

```tsx
// Example test
it('should call onConfirm with the reversal reason', async () => {
  const onConfirm = jest.fn().mockResolvedValue(undefined);
  
  render(
    <ReversalConfirmationDialog
      isOpen={true}
      onClose={jest.fn()}
      onConfirm={onConfirm}
      title="Test Reversal"
      originalAction={mockAction}
    />
  );

  // Enter reason
  const textarea = screen.getByLabelText(/reason for reversal/i);
  fireEvent.change(textarea, { target: { value: 'Test reason for reversal' } });

  // Submit
  const confirmButton = screen.getByText(/confirm/i);
  fireEvent.click(confirmButton);

  await waitFor(() => {
    expect(onConfirm).toHaveBeenCalledWith('Test reason for reversal');
  });
});
```

## Notes

- The dialog automatically closes 1.5 seconds after a successful reversal
- The dialog cannot be closed while a reversal is in progress
- All dates are formatted using the user's locale
- The component is fully typed with TypeScript for better developer experience
