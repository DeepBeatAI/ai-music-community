# verifyNotAdminTarget Usage Guide

## Overview

The `verifyNotAdminTarget` helper function enforces authorization boundaries in the moderation system by preventing moderators from reversing actions on admin accounts while allowing admins to reverse any action.

## Requirements

- **13.8**: Prevent moderators from reversing actions on admin accounts
- **13.11**: Allow admins to reverse any action
- **13.13**: Admin-only reversal authorization

## Function Signature

```typescript
export async function verifyNotAdminTarget(userId: string): Promise<void>
```

## Parameters

- `userId` (string): The target user ID to check authorization for

## Return Value

- Returns `void` if authorization check passes
- Throws `ModerationError` if authorization check fails

## Behavior

The function performs the following checks:

1. **Validates user ID format** - Ensures the provided userId is a valid UUID
2. **Gets current user** - Retrieves the authenticated user making the request
3. **Checks target user role** - Determines if the target user is an admin
4. **Checks current user role** - Determines if the current user is an admin
5. **Enforces authorization rules**:
   - ✅ Allows action if target is NOT an admin (any moderator/admin can act)
   - ✅ Allows action if current user IS an admin (admins can act on anyone)
   - ❌ Blocks action if current user is moderator AND target is admin
6. **Logs security events** - Records unauthorized attempts for audit purposes

## Usage Examples

### Example 1: Moderator attempting to reverse action on regular user (ALLOWED)

```typescript
import { verifyNotAdminTarget } from '@/lib/moderationService';

async function reverseModerationAction(targetUserId: string) {
  try {
    // Check authorization - will pass if target is not admin
    await verifyNotAdminTarget(targetUserId);
    
    // Proceed with reversal action
    console.log('Authorization passed - proceeding with reversal');
    // ... reversal logic here
  } catch (error) {
    console.error('Authorization failed:', error);
  }
}
```

### Example 2: Moderator attempting to reverse action on admin (BLOCKED)

```typescript
import { verifyNotAdminTarget, ModerationError } from '@/lib/moderationService';

async function liftSuspension(adminUserId: string) {
  try {
    // This will throw an error if current user is moderator
    await verifyNotAdminTarget(adminUserId);
    
    // This code won't execute for moderators
    console.log('Lifting suspension...');
  } catch (error) {
    if (error instanceof ModerationError) {
      // Error: "Moderators cannot reverse actions on admin accounts"
      console.error('Authorization error:', error.message);
    }
  }
}
```

### Example 3: Admin reversing action on another admin (ALLOWED)

```typescript
import { verifyNotAdminTarget } from '@/lib/moderationService';

async function adminReversesAdminAction(targetAdminId: string) {
  try {
    // This will pass if current user is admin
    await verifyNotAdminTarget(targetAdminId);
    
    // Admin can proceed with reversal
    console.log('Admin authorization passed - proceeding');
    // ... reversal logic here
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}
```

### Example 4: Integration in reversal functions

```typescript
import { verifyNotAdminTarget, liftSuspension } from '@/lib/moderationService';

async function performSuspensionReversal(userId: string, reason: string) {
  try {
    // Verify authorization before proceeding
    await verifyNotAdminTarget(userId);
    
    // If we get here, authorization passed
    await liftSuspension(userId, reason);
    
    console.log('Suspension lifted successfully');
  } catch (error) {
    if (error instanceof ModerationError) {
      if (error.code === 'MODERATION_INSUFFICIENT_PERMISSIONS') {
        console.error('Cannot reverse action on admin account');
      }
    }
  }
}
```

## Error Handling

The function throws `ModerationError` with the following error codes:

### VALIDATION_ERROR
- **When**: Invalid user ID format provided
- **Message**: "Invalid user ID format"
- **Data**: `{ userId }`

### INSUFFICIENT_PERMISSIONS
- **When**: Moderator attempts to act on admin account
- **Message**: "Moderators cannot reverse actions on admin accounts"
- **Data**: `{ targetUserId }`
- **Side Effect**: Logs security event `unauthorized_action_on_admin_target`

### DATABASE_ERROR
- **When**: Unexpected error during authorization check
- **Message**: "An unexpected error occurred while verifying target user authorization"
- **Data**: `{ originalError }`

## Security Features

1. **Security Event Logging**: Failed authorization attempts are logged to the `security_events` table with:
   - Event type: `unauthorized_action_on_admin_target`
   - User ID: Current user attempting the action
   - Details: Target user ID and action type

2. **Input Validation**: Validates UUID format before processing

3. **Proper Error Handling**: Wraps all errors in `ModerationError` for consistent error handling

## Authorization Matrix

| Current User Role | Target User Role | Result |
|------------------|------------------|---------|
| Moderator | Regular User | ✅ Allowed |
| Moderator | Admin | ❌ Blocked |
| Admin | Regular User | ✅ Allowed |
| Admin | Admin | ✅ Allowed |

## Integration Points

This function is used in the following reversal functions:

- `liftSuspension()` - Prevents moderators from lifting admin suspensions
- `removeBan()` - Prevents moderators from removing admin bans (though this is admin-only anyway)
- `removeUserRestriction()` - Prevents moderators from removing admin restrictions
- `revokeAction()` - Prevents moderators from revoking actions on admins

## Best Practices

1. **Call early**: Invoke this function at the beginning of reversal operations before making any database changes
2. **Don't catch silently**: Let the error propagate to the caller for proper error handling
3. **Log appropriately**: The function automatically logs security events, no additional logging needed
4. **Validate input**: The function validates the userId, but ensure you're passing the correct target user ID

## Testing Considerations

When testing functions that use `verifyNotAdminTarget`:

1. Test with moderator user and regular target user (should pass)
2. Test with moderator user and admin target user (should fail)
3. Test with admin user and admin target user (should pass)
4. Test with invalid user ID format (should fail with validation error)
5. Verify security events are logged for failed attempts

## Related Functions

- `verifyModeratorRole()` - Verifies current user has moderator/admin role
- `verifyAdminRole()` - Verifies current user has admin role
- `isAdmin()` - Checks if a user has admin role
- `isModeratorOrAdmin()` - Checks if a user has moderator or admin role
