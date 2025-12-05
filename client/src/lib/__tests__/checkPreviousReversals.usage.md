# checkPreviousReversals Function Usage

## Overview

The `checkPreviousReversals` function checks if there are previous moderation actions on the same target (user or content) that were later reversed. This helps moderators avoid repeating mistakes by providing context about past false positives.

**Requirements:** 15.9

## Function Signature

```typescript
async function checkPreviousReversals(report: Report): Promise<{
  hasPreviousReversals: boolean;
  reversalCount: number;
  mostRecentReversal: {
    actionType: string;
    reversedAt: string;
    reversalReason: string;
    moderatorId: string;
  } | null;
}>
```

## Parameters

- `report` - The report to check for previous reversals

## Returns

Object containing:
- `hasPreviousReversals` - Boolean indicating if previous reversals exist
- `reversalCount` - Number of previous reversed actions
- `mostRecentReversal` - Details of the most recent reversal (or null if none)

## Usage Example

```typescript
import { checkPreviousReversals } from '@/lib/moderationService';

// Check for previous reversals on a report
const report = {
  id: 'report-123',
  report_type: 'post',
  target_id: 'post-456',
  // ... other report fields
};

const reversalInfo = await checkPreviousReversals(report);

if (reversalInfo.hasPreviousReversals) {
  console.log(`Found ${reversalInfo.reversalCount} previous reversals`);
  console.log('Most recent:', reversalInfo.mostRecentReversal);
}
```

## Implementation Details

### Query Logic

1. **For user reports**: Queries by `target_user_id`
2. **For content reports**: Queries by `target_type` and `target_id`
3. Filters for only reversed actions (`revoked_at IS NOT NULL`)
4. Orders by `revoked_at` descending (most recent first)

### Return Values

- Returns `hasPreviousReversals: false` when:
  - No reversed actions found
  - Report has no valid target (empty `target_id` and no `reported_user_id`)
  
- Returns reversal information when previous reversals exist:
  - Count of all reversed actions
  - Details of the most recent reversal including action type, timestamp, reason, and moderator

## UI Integration

The function is used in `ReportCard` component to display:

1. **Badge in header**: "⚠️ Previously Reversed" badge when reversals exist
2. **Detailed context section**: Shows count, most recent reversal details, and helpful tip

### Visual Indicators

```tsx
{/* Badge */}
{previousReversals?.hasPreviousReversals && (
  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500">
    ⚠️ Previously Reversed
  </span>
)}

{/* Context Section */}
{previousReversals?.hasPreviousReversals && (
  <div className="bg-yellow-900/20 rounded-md p-3 border border-yellow-700">
    {/* Reversal details */}
  </div>
)}
```

## Error Handling

Throws `ModerationError` with appropriate codes:
- `VALIDATION_ERROR` - Invalid report or missing ID
- `DATABASE_ERROR` - Database query failure or unexpected error

## Testing

Comprehensive test suite covers:
- Validation (invalid reports, missing IDs)
- Query building (user vs content reports, filtering, ordering)
- No reversals scenarios
- Multiple reversals scenarios
- Error handling

All 13 tests pass successfully.

## Benefits

1. **Prevents Repeat Mistakes**: Moderators see if similar actions were reversed before
2. **Provides Context**: Shows why previous actions were reversed
3. **Improves Decision Making**: Helps moderators make more informed choices
4. **Reduces False Positives**: Awareness of past reversals encourages careful review

## Related Components

- `ReportCard.tsx` - Displays the reversal indicators
- `ModerationQueue.tsx` - Shows reports with reversal context
- `moderationService.ts` - Contains the implementation
