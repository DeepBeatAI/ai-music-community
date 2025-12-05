# getUserModerationHistory Usage Guide

## Overview

The `getUserModerationHistory` function retrieves the complete moderation history for a user, including both original actions and their reversals. This provides a chronological view of all moderation actions taken on a user's account.

**Requirements:** 14.2

## Function Signature

```typescript
async function getUserModerationHistory(
  userId: string,
  includeRevoked: boolean = true
): Promise<ModerationHistoryEntry[]>
```

## Parameters

- `userId` (string, required): The UUID of the user to get moderation history for
- `includeRevoked` (boolean, optional): Whether to include revoked actions in the history. Defaults to `true`.

## Return Type

Returns an array of `ModerationHistoryEntry` objects:

```typescript
interface ModerationHistoryEntry {
  action: ModerationAction;      // The original moderation action
  isRevoked: boolean;             // Whether the action has been revoked
  revokedAt: string | null;       // When the action was revoked (if applicable)
  revokedBy: string | null;       // Who revoked the action (if applicable)
  reversalReason: string | null;  // Reason for reversal (if applicable)
}
```

## Usage Examples

### Example 1: Get Complete History (Including Revoked Actions)

```typescript
import { getUserModerationHistory } from '@/lib/moderationService';

async function displayUserHistory(userId: string) {
  try {
    // Get complete history including revoked actions
    const history = await getUserModerationHistory(userId);
    
    console.log(`Found ${history.length} moderation actions for user`);
    
    history.forEach((entry) => {
      console.log(`Action: ${entry.action.action_type}`);
      console.log(`Date: ${entry.action.created_at}`);
      console.log(`Reason: ${entry.action.reason}`);
      
      if (entry.isRevoked) {
        console.log(`REVOKED on ${entry.revokedAt}`);
        console.log(`Reversal reason: ${entry.reversalReason}`);
      }
      console.log('---');
    });
  } catch (error) {
    console.error('Failed to get moderation history:', error);
  }
}
```

### Example 2: Get Only Active (Non-Revoked) Actions

```typescript
import { getUserModerationHistory } from '@/lib/moderationService';

async function displayActiveActions(userId: string) {
  try {
    // Get only active actions (exclude revoked)
    const activeHistory = await getUserModerationHistory(userId, false);
    
    console.log(`User has ${activeHistory.length} active moderation actions`);
    
    activeHistory.forEach((entry) => {
      console.log(`${entry.action.action_type}: ${entry.action.reason}`);
    });
  } catch (error) {
    console.error('Failed to get active actions:', error);
  }
}
```

### Example 3: Display History in UI Component

```typescript
import { getUserModerationHistory, ModerationHistoryEntry } from '@/lib/moderationService';
import { useState, useEffect } from 'react';

function UserModerationHistoryPanel({ userId }: { userId: string }) {
  const [history, setHistory] = useState<ModerationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const data = await getUserModerationHistory(userId);
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [userId]);

  if (loading) return <div>Loading history...</div>;
  if (error) return <div>Error: {error}</div>;
  if (history.length === 0) return <div>No moderation history</div>;

  return (
    <div className="moderation-history">
      <h3>Moderation History</h3>
      {history.map((entry) => (
        <div 
          key={entry.action.id} 
          className={entry.isRevoked ? 'revoked' : 'active'}
        >
          <div className="action-type">{entry.action.action_type}</div>
          <div className="action-date">
            {new Date(entry.action.created_at).toLocaleDateString()}
          </div>
          <div className="action-reason">{entry.action.reason}</div>
          
          {entry.isRevoked && (
            <div className="reversal-info">
              <span className="badge">REVERSED</span>
              <div>Reversed on: {new Date(entry.revokedAt!).toLocaleDateString()}</div>
              <div>Reason: {entry.reversalReason}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Example 4: Filter History by Action Type

```typescript
import { getUserModerationHistory } from '@/lib/moderationService';

async function getSuspensionHistory(userId: string) {
  try {
    const history = await getUserModerationHistory(userId);
    
    // Filter for suspension-related actions
    const suspensions = history.filter((entry) => 
      entry.action.action_type === 'user_suspended' || 
      entry.action.action_type === 'user_banned'
    );
    
    console.log(`User has ${suspensions.length} suspension actions`);
    
    // Count active vs revoked
    const active = suspensions.filter(s => !s.isRevoked).length;
    const revoked = suspensions.filter(s => s.isRevoked).length;
    
    console.log(`Active: ${active}, Revoked: ${revoked}`);
    
    return suspensions;
  } catch (error) {
    console.error('Failed to get suspension history:', error);
    return [];
  }
}
```

### Example 5: Calculate Reversal Statistics

```typescript
import { getUserModerationHistory } from '@/lib/moderationService';

async function calculateReversalStats(userId: string) {
  try {
    const history = await getUserModerationHistory(userId);
    
    const totalActions = history.length;
    const revokedActions = history.filter(h => h.isRevoked).length;
    const activeActions = totalActions - revokedActions;
    const reversalRate = totalActions > 0 
      ? (revokedActions / totalActions * 100).toFixed(1) 
      : '0';
    
    return {
      total: totalActions,
      active: activeActions,
      revoked: revokedActions,
      reversalRate: `${reversalRate}%`,
    };
  } catch (error) {
    console.error('Failed to calculate stats:', error);
    return null;
  }
}
```

## Error Handling

The function throws `ModerationError` with specific error codes:

```typescript
import { getUserModerationHistory, ModerationError, MODERATION_ERROR_CODES } from '@/lib/moderationService';

async function safeGetHistory(userId: string) {
  try {
    return await getUserModerationHistory(userId);
  } catch (error) {
    if (error instanceof ModerationError) {
      switch (error.code) {
        case MODERATION_ERROR_CODES.VALIDATION_ERROR:
          console.error('Invalid user ID format');
          break;
        case MODERATION_ERROR_CODES.DATABASE_ERROR:
          console.error('Database error occurred');
          break;
        default:
          console.error('Unknown moderation error:', error.message);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    return [];
  }
}
```

## Common Use Cases

### 1. User Profile Page
Display a user's complete moderation history on their profile page, showing both active and revoked actions.

### 2. Moderator Dashboard
Show moderators the history of actions taken on a user to help inform future moderation decisions.

### 3. Appeal Review
When reviewing an appeal, display the complete history including any reversals to understand the context.

### 4. Audit Trail
Generate reports showing all moderation actions and reversals for compliance and accountability.

### 5. Statistics Dashboard
Calculate metrics like reversal rates, most common action types, and moderator performance.

## Best Practices

1. **Always handle errors**: Wrap calls in try-catch blocks to handle potential errors gracefully.

2. **Use includeRevoked appropriately**: 
   - Use `true` (default) for complete history views
   - Use `false` for showing only current active restrictions

3. **Display reversal information clearly**: When showing revoked actions, make it visually distinct with badges or styling.

4. **Consider pagination**: For users with extensive history, implement pagination or lazy loading.

5. **Cache results**: Consider caching the history data to avoid repeated database queries.

6. **Respect privacy**: Only show moderation history to authorized users (moderators, admins, or the user themselves).

## Related Functions

- `getUserActiveRestrictions(userId)` - Get only active restrictions
- `getUserSuspensionStatus(userId)` - Get current suspension status
- `fetchModerationLogs(filters)` - Get moderation action logs with filtering
- `liftSuspension(userId, reason)` - Lift a suspension (creates reversal)
- `removeUserRestriction(restrictionId, reason)` - Remove a restriction (creates reversal)
- `revokeAction(actionId, reason)` - Revoke any moderation action

## Notes

- The history is ordered by creation date (most recent first)
- Reversal information is extracted from the `metadata.reversal_reason` field
- The function validates the user ID format before querying
- Empty arrays are returned for users with no moderation history
- The function does not require moderator permissions to call (authorization should be handled at the UI level)
