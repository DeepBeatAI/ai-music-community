# UserStatusPanel Component Usage

## Overview

The `UserStatusPanel` component displays a user's current moderation status, including active suspensions, restrictions, and moderation history. It provides UI for moderators and admins to reverse actions (lift suspensions, remove bans, remove restrictions).

## Requirements

Validates: Requirements 13.1, 13.2, 13.3, 13.14

## Features

- **Suspension Status Display**: Shows active suspensions with expiration dates
- **Ban Status Display**: Shows permanent bans (admin only can remove)
- **Active Restrictions**: Lists all active restrictions (posting, commenting, upload disabled)
- **Action Summary**: Shows counts of active, reversed, and total actions
- **Moderation History**: Displays recent moderation actions with reversal information
- **Reversal Actions**: 
  - Lift Suspension button (moderators and admins)
  - Remove Ban button (admins only)
  - Remove Restriction buttons for each active restriction
- **Reversal Confirmation**: Requires reason input before reversing any action
- **Full History Toggle**: Option to view all actions including reversed ones

## Props

```typescript
interface UserStatusPanelProps {
  userId: string;              // User ID to display status for
  onActionComplete?: () => void; // Optional callback after action is completed
}
```

## Usage Example

```tsx
import { UserStatusPanel } from '@/components/moderation/UserStatusPanel';

function UserProfilePage({ userId }: { userId: string }) {
  const handleActionComplete = () => {
    // Refresh user data or show success message
    console.log('Moderation action completed');
  };

  return (
    <div className="container mx-auto p-6">
      <h1>User Profile</h1>
      
      {/* Display user's moderation status */}
      <UserStatusPanel 
        userId={userId}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
```

## Integration with Moderation Dashboard

```tsx
import { UserStatusPanel } from '@/components/moderation/UserStatusPanel';

function ModerationUserDetailPage({ userId }: { userId: string }) {
  return (
    <div className="space-y-6">
      {/* User basic info */}
      <UserInfoCard userId={userId} />
      
      {/* Moderation status and actions */}
      <UserStatusPanel 
        userId={userId}
        onActionComplete={() => {
          // Refresh moderation queue or logs
          refreshModerationData();
        }}
      />
      
      {/* Additional moderation tools */}
      <ModerationActionsPanel userId={userId} />
    </div>
  );
}
```

## Component Structure

### Main Sections

1. **Suspension Section** (if user is suspended)
   - Red background with suspension details
   - "Lift Suspension" or "Remove Ban" button
   - Displays expiration date and days remaining
   - Shows suspension reason

2. **Restrictions Section** (if user has active restrictions)
   - Orange background with list of restrictions
   - Each restriction has a "Remove" button
   - Shows restriction type, expiration, and reason

3. **Action Summary**
   - Gray background with statistics
   - Shows active, reversed, and total action counts
   - Color-coded for easy scanning

4. **Moderation History**
   - List of recent moderation actions
   - Reversed actions shown with strikethrough and "REVERSED" badge
   - Toggle to show full history including reversed actions
   - Limited to 5 most recent actions by default

### Reversal Confirmation Dialog

When a moderator clicks any reversal button (Lift Suspension, Remove Ban, Remove Restriction), a confirmation dialog appears with:

- **Original Action Details**: Shows what action is being reversed
- **Reason Input**: Required textarea for explaining the reversal
- **Cancel/Confirm Buttons**: Standard dialog actions
- **Loading State**: Disables buttons during processing
- **Error Display**: Shows any errors that occur

## Authorization

- **Lift Suspension**: Available to moderators and admins (for non-admin users)
- **Remove Ban**: Available to admins only
- **Remove Restriction**: Available to moderators and admins (for non-admin users)
- **View History**: Available to all moderators and admins

The component automatically checks the current user's role and only displays appropriate actions.

## State Management

The component manages its own state for:
- Loading states
- Error messages
- Dialog visibility
- Form inputs (reversal reasons)
- User status data (suspension, restrictions, history)

## API Integration

The component uses these moderation service functions:
- `getUserSuspensionStatus(userId)` - Get suspension details
- `getUserActiveRestrictions(userId)` - Get active restrictions
- `getUserModerationHistory(userId, includeRevoked)` - Get action history
- `liftSuspension(userId, reason)` - Lift a suspension
- `removeBan(userId, reason)` - Remove a permanent ban
- `removeUserRestriction(restrictionId, reason)` - Remove a restriction
- `isAdmin(userId)` - Check if user is admin

## Styling

The component uses Tailwind CSS with a consistent color scheme:
- **Red** (#DC2626): Suspensions and bans
- **Orange** (#EA580C): Restrictions
- **Gray** (#6B7280): Reversed actions and summaries
- **Blue** (#2563EB): Action buttons

## Accessibility

- Semantic HTML structure
- Proper button labels
- Form labels for inputs
- Keyboard navigation support
- Focus management in dialogs

## Error Handling

The component handles errors gracefully:
- Displays error messages in red text
- Maintains form state on error
- Allows retry without losing input
- Logs errors to console for debugging

## Loading States

- Initial load: Shows skeleton loading animation
- Action processing: Disables buttons and shows "Processing..." text
- Prevents duplicate submissions during processing

## Future Enhancements

Potential improvements for future iterations:
- Timeline visualization of action history
- Bulk restriction removal
- Export action history
- Real-time updates via Supabase Realtime
- Notification when actions are reversed
- Audit log integration
