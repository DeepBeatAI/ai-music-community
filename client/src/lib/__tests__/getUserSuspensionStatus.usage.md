# getUserSuspensionStatus Usage Guide

## Overview

The `getUserSuspensionStatus` helper function returns the current suspension status for a user, including whether they are suspended, when the suspension expires, and whether it's a permanent ban.

**Requirements:** 13.1, 13.3

## Function Signature

```typescript
export async function getUserSuspensionStatus(userId: string): Promise<UserSuspensionStatus>
```

## Return Type

```typescript
interface UserSuspensionStatus {
  isSuspended: boolean;        // Whether the user is currently suspended
  suspendedUntil: string | null; // ISO date string of suspension expiration
  suspensionReason: string | null; // Reason for the suspension
  isPermanent: boolean;        // Whether this is a permanent ban
  daysRemaining: number | null; // Days until suspension expires (null for permanent)
}
```

## Usage Examples

### Check if a user is suspended

```typescript
import { getUserSuspensionStatus } from '@/lib/moderationService';

const status = await getUserSuspensionStatus(userId);

if (status.isSuspended) {
  if (status.isPermanent) {
    console.log('User is permanently banned');
  } else {
    console.log(`User is suspended for ${status.daysRemaining} more days`);
  }
} else {
  console.log('User is not suspended');
}
```

### Display suspension information on user profile

```typescript
const status = await getUserSuspensionStatus(userId);

if (status.isSuspended) {
  return (
    <div className="suspension-banner">
      <h3>Account Suspended</h3>
      {status.isPermanent ? (
        <p>This account has been permanently banned.</p>
      ) : (
        <p>Suspended until {new Date(status.suspendedUntil!).toLocaleDateString()}</p>
      )}
      <p>Reason: {status.suspensionReason}</p>
      {!status.isPermanent && (
        <button onClick={() => liftSuspension(userId, reason)}>
          Lift Suspension
        </button>
      )}
    </div>
  );
}
```

### Determine available reversal actions

```typescript
const status = await getUserSuspensionStatus(userId);

// Show appropriate reversal button based on suspension type
if (status.isSuspended) {
  if (status.isPermanent) {
    // Only admins can remove permanent bans
    if (isAdmin) {
      return <button onClick={handleRemoveBan}>Remove Ban</button>;
    }
  } else {
    // Moderators can lift temporary suspensions
    return <button onClick={handleLiftSuspension}>Lift Suspension</button>;
  }
}
```

## Key Features

### Distinguishing Temporary vs Permanent Bans

The function automatically distinguishes between temporary suspensions and permanent bans:

- **Temporary Suspension**: `suspended_until` is within 50 years
  - `isPermanent: false`
  - `daysRemaining` contains the number of days until expiration

- **Permanent Ban**: `suspended_until` is more than 50 years in the future
  - `isPermanent: true`
  - `daysRemaining: null`

### Handling Expired Suspensions

If a suspension has already expired (date is in the past):
- `isSuspended: false`
- `daysRemaining: 0`
- The suspension details are still returned for reference

### Error Handling

The function throws `ModerationError` for:
- Invalid user ID format (validation error)
- Database query failures (database error)

```typescript
try {
  const status = await getUserSuspensionStatus(userId);
  // Use status
} catch (error) {
  if (error instanceof ModerationError) {
    console.error(`Moderation error: ${error.message}`, error.code);
  }
}
```

## Integration with Other Functions

This function works alongside other moderation helper functions:

- `getUserActiveRestrictions(userId)` - Get all active restrictions
- `liftSuspension(userId, reason)` - Remove a temporary suspension
- `removeBan(userId, reason)` - Remove a permanent ban (admin only)

## Testing

The function includes comprehensive unit tests covering:
- ✅ Not suspended users
- ✅ Temporary suspensions with days remaining
- ✅ Permanent bans (far future dates)
- ✅ Expired suspensions
- ✅ Invalid user ID validation
- ✅ Database error handling

Run tests with:
```bash
npm test -- getUserSuspensionStatus.test.ts
```
