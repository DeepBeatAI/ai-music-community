# getModeratorReversalStats Function Usage

## Overview

The `getModeratorReversalStats` function calculates detailed reversal statistics for a specific moderator within a given date range. This function is part of the moderation system's reversal tracking and analytics capabilities.

**Requirements:** 14.7

## Function Signature

```typescript
async function getModeratorReversalStats(
  moderatorId: string,
  startDate: string,
  endDate: string
): Promise<ModeratorReversalStats>
```

## Parameters

- **moderatorId** (string, required): UUID of the moderator to get statistics for
- **startDate** (string, required): Start date in ISO 8601 format (e.g., '2024-01-01T00:00:00.000Z')
- **endDate** (string, required): End date in ISO 8601 format (e.g., '2024-01-31T23:59:59.999Z')

## Return Type

```typescript
interface ModeratorReversalStats {
  moderatorId: string;
  totalActions: number;
  reversedActions: number;
  reversalRate: number; // Percentage (0-100)
  averageTimeToReversalHours: number;
  selfReversals: number;
  reversalsByOthers: number;
  actionsByType: Record<string, { total: number; reversed: number }>;
}
```

## Usage Examples

### Basic Usage

```typescript
import { getModeratorReversalStats } from '@/lib/moderationService';

// Get stats for a specific moderator for January 2024
const stats = await getModeratorReversalStats(
  '123e4567-e89b-12d3-a456-426614174000',
  '2024-01-01T00:00:00.000Z',
  '2024-01-31T23:59:59.999Z'
);

console.log(`Moderator ${stats.moderatorId}:`);
console.log(`- Total actions: ${stats.totalActions}`);
console.log(`- Reversed actions: ${stats.reversedActions}`);
console.log(`- Reversal rate: ${stats.reversalRate}%`);
console.log(`- Average time to reversal: ${stats.averageTimeToReversalHours} hours`);
console.log(`- Self-reversals: ${stats.selfReversals}`);
console.log(`- Reversals by others: ${stats.reversalsByOthers}`);
```

### Analyzing Action Types

```typescript
const stats = await getModeratorReversalStats(
  moderatorId,
  startDate,
  endDate
);

// Analyze which action types have highest reversal rates
Object.entries(stats.actionsByType).forEach(([actionType, counts]) => {
  const rate = counts.total > 0 
    ? (counts.reversed / counts.total) * 100 
    : 0;
  
  console.log(`${actionType}:`);
  console.log(`  Total: ${counts.total}`);
  console.log(`  Reversed: ${counts.reversed}`);
  console.log(`  Rate: ${rate.toFixed(2)}%`);
});
```

### Comparing Multiple Moderators

```typescript
const moderatorIds = [
  '123e4567-e89b-12d3-a456-426614174000',
  '223e4567-e89b-12d3-a456-426614174001',
  '323e4567-e89b-12d3-a456-426614174002',
];

const allStats = await Promise.all(
  moderatorIds.map(id => 
    getModeratorReversalStats(id, startDate, endDate)
  )
);

// Sort by reversal rate (highest first)
allStats.sort((a, b) => b.reversalRate - a.reversalRate);

console.log('Moderators with highest reversal rates:');
allStats.forEach((stats, index) => {
  console.log(`${index + 1}. Moderator ${stats.moderatorId}: ${stats.reversalRate}%`);
});
```

### Identifying Moderators Needing Training

```typescript
const stats = await getModeratorReversalStats(
  moderatorId,
  startDate,
  endDate
);

// Flag moderators with high reversal rates or many reversals by others
const needsTraining = 
  stats.reversalRate > 20 || // More than 20% of actions reversed
  (stats.reversalsByOthers > 5 && stats.reversalsByOthers > stats.selfReversals);

if (needsTraining) {
  console.log(`Moderator ${stats.moderatorId} may need additional training:`);
  console.log(`- Reversal rate: ${stats.reversalRate}%`);
  console.log(`- Reversals by others: ${stats.reversalsByOthers}`);
  console.log(`- Self-reversals: ${stats.selfReversals}`);
}
```

### Tracking Improvement Over Time

```typescript
// Get stats for different time periods
const q1Stats = await getModeratorReversalStats(
  moderatorId,
  '2024-01-01T00:00:00.000Z',
  '2024-03-31T23:59:59.999Z'
);

const q2Stats = await getModeratorReversalStats(
  moderatorId,
  '2024-04-01T00:00:00.000Z',
  '2024-06-30T23:59:59.999Z'
);

const improvement = q1Stats.reversalRate - q2Stats.reversalRate;

if (improvement > 0) {
  console.log(`Moderator improved by ${improvement.toFixed(2)}% in Q2`);
} else if (improvement < 0) {
  console.log(`Moderator's reversal rate increased by ${Math.abs(improvement).toFixed(2)}% in Q2`);
} else {
  console.log('Moderator maintained consistent reversal rate');
}
```

## Error Handling

```typescript
import { ModerationError, MODERATION_ERROR_CODES } from '@/types/moderation';

try {
  const stats = await getModeratorReversalStats(
    moderatorId,
    startDate,
    endDate
  );
  
  // Use stats...
} catch (error) {
  if (error instanceof ModerationError) {
    switch (error.code) {
      case MODERATION_ERROR_CODES.UNAUTHORIZED:
        console.error('User not authorized to view reversal statistics');
        break;
      case MODERATION_ERROR_CODES.VALIDATION_ERROR:
        console.error('Invalid parameters:', error.details);
        break;
      case MODERATION_ERROR_CODES.DATABASE_ERROR:
        console.error('Database error occurred:', error.message);
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Authorization

- **Required Role:** Moderator or Admin
- Only authenticated users with moderator or admin role can access this function
- The function verifies the user's role before returning statistics

## Validation

The function validates:
1. **Moderator ID:** Must be a valid UUID format
2. **Start Date:** Must be provided and in valid ISO 8601 format
3. **End Date:** Must be provided and in valid ISO 8601 format
4. **Date Range:** Start date must be before end date

## Performance Considerations

- The function queries all actions by the specified moderator within the date range
- For moderators with many actions, consider using shorter date ranges
- Results are calculated in real-time (not cached)
- Consider implementing caching for frequently accessed moderator stats

## Related Functions

- `getReversalMetrics(startDate, endDate)` - Get overall reversal metrics for all moderators
- `getUserModerationHistory(userId, includeRevoked)` - Get complete moderation history for a user
- `calculateModerationMetrics(dateRange, includeSLA, includeTrends)` - Get comprehensive moderation metrics

## Use Cases

1. **Performance Reviews:** Evaluate moderator performance based on reversal rates
2. **Training Identification:** Identify moderators who may need additional training
3. **Quality Assurance:** Monitor moderation quality across the team
4. **Trend Analysis:** Track improvement or decline in moderator performance over time
5. **Action Type Analysis:** Identify which types of actions are most frequently reversed
6. **Self-Correction Tracking:** Monitor how often moderators reverse their own actions
