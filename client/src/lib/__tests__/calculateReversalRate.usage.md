# calculateReversalRate Function Usage

## Overview

The `calculateReversalRate` function calculates reversal rate statistics for moderation actions within a specified date range. It provides insights into how often moderation actions are reversed, broken down by action type and priority level.

**Requirements:** 14.3

## Function Signature

```typescript
async function calculateReversalRate(
  startDate: string,
  endDate: string
): Promise<ReversalRateResult>
```

## Parameters

- `startDate` (string, required): Start date for calculation in ISO 8601 format (e.g., "2024-01-01T00:00:00.000Z")
- `endDate` (string, required): End date for calculation in ISO 8601 format (e.g., "2024-01-31T23:59:59.999Z")

## Return Value

Returns a `ReversalRateResult` object containing:

```typescript
interface ReversalRateResult {
  overallReversalRate: number;        // Percentage of actions that were reversed (0-100)
  totalActions: number;                // Total number of actions in the period
  totalReversals: number;              // Total number of reversed actions
  reversalRateByActionType: Array<{    // Reversal rates grouped by action type
    actionType: string;                // Type of action (e.g., "user_suspended", "content_removed")
    totalActions: number;              // Total actions of this type
    reversedActions: number;           // Number of reversed actions of this type
    reversalRate: number;              // Percentage reversed (0-100)
  }>;
  reversalRateByPriority: Array<{      // Reversal rates grouped by priority level
    priority: number;                  // Priority level (1-5, where 1 is highest)
    totalActions: number;              // Total actions at this priority
    reversedActions: number;           // Number of reversed actions at this priority
    reversalRate: number;              // Percentage reversed (0-100)
  }>;
}
```

## Authorization

- Requires authenticated user with moderator or admin role
- Throws `ModerationError` with code `UNAUTHORIZED` if user lacks required permissions

## Validation

The function validates:
- Both dates are provided (not empty)
- Both dates are valid ISO 8601 format
- Start date is before end date

Throws `ModerationError` with code `VALIDATION_ERROR` if validation fails.

## Usage Examples

### Basic Usage

```typescript
import { calculateReversalRate } from '@/lib/moderationService';

// Calculate reversal rates for January 2024
const result = await calculateReversalRate(
  '2024-01-01T00:00:00.000Z',
  '2024-01-31T23:59:59.999Z'
);

console.log(`Overall reversal rate: ${result.overallReversalRate}%`);
console.log(`Total actions: ${result.totalActions}`);
console.log(`Total reversals: ${result.totalReversals}`);
```

### Analyzing by Action Type

```typescript
const result = await calculateReversalRate(startDate, endDate);

// Find action types with highest reversal rates
const sortedByRate = [...result.reversalRateByActionType]
  .sort((a, b) => b.reversalRate - a.reversalRate);

console.log('Action types with highest reversal rates:');
sortedByRate.slice(0, 3).forEach(stat => {
  console.log(`${stat.actionType}: ${stat.reversalRate}% (${stat.reversedActions}/${stat.totalActions})`);
});
```

### Analyzing by Priority

```typescript
const result = await calculateReversalRate(startDate, endDate);

// Check reversal rates by priority level
result.reversalRateByPriority.forEach(stat => {
  console.log(`P${stat.priority}: ${stat.reversalRate}% reversal rate`);
});
```

### Error Handling

```typescript
import { ModerationError, MODERATION_ERROR_CODES } from '@/types/moderation';

try {
  const result = await calculateReversalRate(startDate, endDate);
  // Process result
} catch (error) {
  if (error instanceof ModerationError) {
    switch (error.code) {
      case MODERATION_ERROR_CODES.UNAUTHORIZED:
        console.error('User not authorized to calculate reversal rates');
        break;
      case MODERATION_ERROR_CODES.VALIDATION_ERROR:
        console.error('Invalid date parameters:', error.details);
        break;
      case MODERATION_ERROR_CODES.DATABASE_ERROR:
        console.error('Database error:', error.message);
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
  }
}
```

## Use Cases

### 1. Quality Monitoring Dashboard

Display overall reversal rate as a key quality metric:

```typescript
const last30Days = await calculateReversalRate(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  new Date().toISOString()
);

// Display in dashboard
<MetricCard
  title="Reversal Rate (Last 30 Days)"
  value={`${last30Days.overallReversalRate}%`}
  subtitle={`${last30Days.totalReversals} of ${last30Days.totalActions} actions reversed`}
/>
```

### 2. Identifying Problem Action Types

Find which action types are most frequently reversed:

```typescript
const result = await calculateReversalRate(startDate, endDate);

const problematicActions = result.reversalRateByActionType
  .filter(stat => stat.reversalRate > 20) // More than 20% reversed
  .sort((a, b) => b.reversalRate - a.reversalRate);

if (problematicActions.length > 0) {
  console.warn('Action types with high reversal rates:', problematicActions);
  // Alert admins or trigger review process
}
```

### 3. Priority-Based Analysis

Analyze if certain priority levels have higher reversal rates:

```typescript
const result = await calculateReversalRate(startDate, endDate);

// Check if high-priority actions (P1, P2) have different reversal rates
const highPriority = result.reversalRateByPriority
  .filter(stat => stat.priority <= 2);

const lowPriority = result.reversalRateByPriority
  .filter(stat => stat.priority >= 4);

console.log('High priority reversal rate:', 
  highPriority.reduce((sum, s) => sum + s.reversalRate, 0) / highPriority.length);
console.log('Low priority reversal rate:', 
  lowPriority.reduce((sum, s) => sum + s.reversalRate, 0) / lowPriority.length);
```

### 4. Trend Analysis

Compare reversal rates across different time periods:

```typescript
// Calculate for current month
const currentMonth = await calculateReversalRate(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
  new Date().toISOString()
);

// Calculate for previous month
const lastMonth = await calculateReversalRate(
  new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
  new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString()
);

const trend = currentMonth.overallReversalRate - lastMonth.overallReversalRate;
console.log(`Reversal rate ${trend > 0 ? 'increased' : 'decreased'} by ${Math.abs(trend)}%`);
```

## Performance Considerations

- The function fetches all moderation actions in the date range
- For large date ranges with many actions, consider:
  - Breaking into smaller time periods
  - Using pagination if implementing in UI
  - Caching results for frequently accessed periods
- The function joins with `moderation_reports` to get priority data
- Results are calculated in-memory after fetching from database

## Related Functions

- `getReversalMetrics()` - More comprehensive metrics including per-moderator stats and time-to-reversal
- `getModeratorReversalStats()` - Per-moderator reversal statistics
- `getReversalTimeMetrics()` - Time-based reversal metrics
- `getReversalPatterns()` - Pattern identification in reversals

## Testing

See `calculateReversalRate.test.ts` for unit tests covering:
- Function definition and signature
- Date validation (invalid format, empty, start after end)
- Authorization checks
- Error handling

Integration tests with mocked Supabase client would cover:
- Correct calculation of overall reversal rate
- Correct grouping by action type
- Correct grouping by priority level
- Handling of empty result sets
- Proper sorting of results
