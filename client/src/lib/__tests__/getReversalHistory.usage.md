# getReversalHistory Function Usage

## Overview

The `getReversalHistory` function retrieves a complete history of all reversed moderation actions with comprehensive filtering support. It provides detailed information about each reversal including timing, who performed the reversal, and whether it was a self-reversal.

## Requirements

- **Requirements**: 14.5, 14.9
- **Authorization**: Requires moderator or admin role
- **Returns**: Array of `ReversalHistoryEntry` objects

## Function Signature

```typescript
async function getReversalHistory(
  filters?: ReversalHistoryFilters
): Promise<ReversalHistoryEntry[]>
```

## Filter Options

```typescript
interface ReversalHistoryFilters {
  startDate?: string;        // ISO 8601 format
  endDate?: string;          // ISO 8601 format
  moderatorId?: string;      // UUID of original moderator
  actionType?: ModerationActionType;
  reversalReason?: string;   // Partial match (case-insensitive)
  targetUserId?: string;     // UUID of target user
  revokedBy?: string;        // UUID of user who performed reversal
}
```

## Return Type

```typescript
interface ReversalHistoryEntry {
  action: ModerationAction;
  revokedAt: string;
  revokedBy: string;
  reversalReason: string | null;
  timeBetweenActionAndReversal: number; // milliseconds
  isSelfReversal: boolean;
  moderatorUsername?: string;
  revokedByUsername?: string;
  targetUsername?: string;
}
```

## Usage Examples

### Basic Usage - Get All Reversals

```typescript
import { getReversalHistory } from '@/lib/moderationService';

// Get all reversed actions
const allReversals = await getReversalHistory();
console.log(`Total reversals: ${allReversals.length}`);
```

### Filter by Date Range

```typescript
// Get reversals from January 2024
const filters = {
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.999Z',
};

const januaryReversals = await getReversalHistory(filters);
```

### Filter by Moderator

```typescript
// Get all reversals for actions taken by a specific moderator
const filters = {
  moderatorId: '123e4567-e89b-12d3-a456-426614174000',
};

const moderatorReversals = await getReversalHistory(filters);
```

### Filter by Action Type

```typescript
// Get all reversed suspensions
const filters = {
  actionType: 'user_suspended',
};

const reversedSuspensions = await getReversalHistory(filters);
```

### Filter by Reversal Reason

```typescript
// Find all reversals due to false positives
const filters = {
  reversalReason: 'false positive',
};

const falsePositives = await getReversalHistory(filters);
```

### Combined Filters

```typescript
// Get all self-reversals by a specific moderator in a date range
const filters = {
  moderatorId: '123e4567-e89b-12d3-a456-426614174000',
  revokedBy: '123e4567-e89b-12d3-a456-426614174000', // Same as moderatorId
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-31T23:59:59.999Z',
};

const selfReversals = await getReversalHistory(filters);
```

## Error Handling

```typescript
import { ModerationError, MODERATION_ERROR_CODES } from '@/types/moderation';

try {
  const reversals = await getReversalHistory(filters);
  // Process reversals
} catch (error) {
  if (error instanceof ModerationError) {
    switch (error.code) {
      case MODERATION_ERROR_CODES.UNAUTHORIZED:
        console.error('User lacks moderator permissions');
        break;
      case MODERATION_ERROR_CODES.VALIDATION_ERROR:
        console.error('Invalid filter parameters:', error.details);
        break;
      case MODERATION_ERROR_CODES.DATABASE_ERROR:
        console.error('Database error occurred');
        break;
    }
  }
}
```

## Features

- **Authorization**: Automatically verifies moderator/admin role
- **Comprehensive Filtering**: Multiple filter options can be combined
- **User Information**: Includes usernames for moderators and target users
- **Self-Reversal Detection**: Identifies when moderators reverse their own actions
- **Time Tracking**: Calculates time between action and reversal
- **Validation**: All filter parameters are validated before query execution
- **Sorting**: Results are sorted by reversal date (most recent first)

## Validation Rules

- **Date Format**: Must be valid ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- **Date Range**: Start date must be before end date
- **UUID Format**: All user IDs must be valid UUIDs
- **Action Type**: Must be one of the valid ModerationActionType values
- **Reversal Reason**: Case-insensitive partial match

## Performance Considerations

- Results include user profile lookups for usernames
- Large date ranges may return many results
- Consider pagination for UI display
- Reversal reason filtering happens in-memory after database query
