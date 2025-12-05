# ModeratorReversalStats Component

## Overview

The `ModeratorReversalStats` component displays a comprehensive table of moderators with their reversal rates, highlights moderators with high reversal rates, shows trends, and allows drilling down into specific moderator's reversals.

**Requirements:** 14.7

## Features

- **Moderator Statistics Table**: Displays all moderators with their action counts and reversal rates
- **Visual Indicators**: Color-coded status badges (Excellent, Good, Fair, Concerning, Critical)
- **High Rate Highlighting**: Automatically highlights moderators with reversal rates ≥ 20%
- **Drill-Down Details**: Click on any moderator to view their specific reversals
- **Time-to-Reversal Tracking**: Shows how long it took to reverse each action
- **Summary Statistics**: Average reversal rate, high-rate moderator count, best performer
- **Recommendations**: Provides actionable recommendations when high rates are detected

## Props

```typescript
interface ModeratorReversalStatsProps {
  perModeratorStats: Array<{
    moderatorId: string;
    totalActions: number;
    reversedActions: number;
    reversalRate: number;
  }>;
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
}
```

## Usage

### Basic Usage

```tsx
import { ModeratorReversalStats } from '@/components/moderation/ModeratorReversalStats';

function MyComponent() {
  const stats = [
    {
      moderatorId: 'user-123',
      totalActions: 100,
      reversedActions: 5,
      reversalRate: 5.0
    },
    // ... more stats
  ];

  return (
    <ModeratorReversalStats
      perModeratorStats={stats}
      startDate="2024-01-01T00:00:00.000Z"
      endDate="2024-01-31T23:59:59.999Z"
    />
  );
}
```

### Integrated with ReversalMetricsPanel

The component is automatically integrated into the `ReversalMetricsPanel` when moderator stats are available:

```tsx
import { ReversalMetricsPanel } from '@/components/moderation/ReversalMetricsPanel';

function ModerationDashboard() {
  return (
    <ReversalMetricsPanel
      startDate="2024-01-01T00:00:00.000Z"
      endDate="2024-01-31T23:59:59.999Z"
    />
  );
}
```

## Reversal Rate Categories

The component categorizes moderators based on their reversal rates:

| Rate Range | Category | Color | Meaning |
|------------|----------|-------|---------|
| < 10% | Excellent | Green | Very low reversal rate, high quality |
| 10-15% | Good | Blue | Acceptable reversal rate |
| 15-20% | Fair | Yellow | Moderate reversal rate, monitor |
| 20-30% | Concerning | Orange | High reversal rate, needs attention |
| ≥ 30% | Critical | Red | Very high reversal rate, immediate action needed |

## Features in Detail

### 1. Statistics Table

Displays for each moderator:
- Username (fetched from user_profiles)
- Total actions taken
- Number of reversed actions
- Reversal rate percentage
- Status badge (color-coded)
- View Details button

### 2. High Rate Highlighting

Moderators with reversal rates ≥ 20% receive:
- ⚠️ High Rate badge next to their name
- Highlighted row in the table
- Inclusion in the "Moderators with High Rate" summary stat

### 3. Drill-Down Details

When clicking "View Details" on a moderator:
- Fetches all their reversed actions in the date range
- Shows each reversal with:
  - Action type and target
  - Original reason for the action
  - Reversal reason (from metadata)
  - Time to reversal (calculated)
  - Created and reversed timestamps
- Displays in an expandable panel below the table

### 4. Summary Statistics

Three key metrics displayed below the table:
- **Average Reversal Rate**: Mean across all moderators
- **Moderators with High Rate**: Count of moderators with rate ≥ 20%
- **Best Performer**: Moderator with the lowest reversal rate

### 5. Recommendations

When high reversal rates are detected, displays actionable recommendations:
- Review moderation guidelines
- Implement peer review
- Provide additional training
- Consider mentorship programs
- Clarify ambiguous policies

## Data Flow

1. Component receives `perModeratorStats` from parent (ReversalMetricsPanel)
2. Fetches moderator usernames from `user_profiles` table
3. Combines stats with usernames for display
4. When a moderator is selected:
   - Fetches their reversed actions from `moderation_actions` table
   - Filters by moderator_id, date range, and revoked_at not null
   - Displays detailed reversal information

## Database Queries

### Fetch Moderator Usernames
```sql
SELECT user_id, username
FROM user_profiles
WHERE user_id IN (moderator_ids)
```

### Fetch Moderator Reversals
```sql
SELECT id, action_type, target_type, target_id, reason, 
       created_at, revoked_at, revoked_by, metadata
FROM moderation_actions
WHERE moderator_id = ?
  AND revoked_at IS NOT NULL
  AND created_at >= ?
  AND created_at <= ?
ORDER BY revoked_at DESC
```

## Error Handling

- **Username Fetch Failure**: Falls back to displaying truncated user IDs
- **Reversal Fetch Failure**: Shows error toast and empty state
- **No Data**: Displays "No moderator activity in the selected period"

## Loading States

- **Initial Load**: Animated skeleton for table rows
- **Reversal Details Load**: Animated skeleton for reversal cards
- **Smooth Transitions**: All state changes use CSS transitions

## Accessibility

- Semantic HTML table structure
- Clear button labels
- Color is not the only indicator (text labels accompany colors)
- Keyboard navigable buttons
- Screen reader friendly status badges

## Performance Considerations

- Usernames fetched once on mount
- Reversal details fetched only when moderator is selected
- Efficient filtering and sorting in JavaScript
- Minimal re-renders with proper state management

## Testing

See `ModeratorReversalStats.test.tsx` for comprehensive test coverage including:
- Rendering with various data scenarios
- Username fetching and fallback
- Drill-down functionality
- Category calculations
- Summary statistics
- Recommendations display

## Related Components

- `ReversalMetricsPanel`: Parent component that provides the data
- `ModerationLogs`: Shows all moderation actions with reversal indicators
- `ModerationHistoryTimeline`: Shows chronological action history

## Future Enhancements

- Trend analysis over multiple time periods
- Export moderator stats to CSV
- Comparison charts between moderators
- Historical trend graphs
- Automated alerts for high reversal rates
- Integration with moderator training system
