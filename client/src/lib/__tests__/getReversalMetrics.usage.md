# get_reversal_metrics Database Function - Usage Guide

## Overview

The `get_reversal_metrics` database function efficiently calculates comprehensive reversal statistics for a given time period. This function is designed to support the reversal metrics dashboard and reporting features.

## Function Signature

```sql
get_reversal_metrics(p_start_date timestamptz, p_end_date timestamptz) RETURNS jsonb
```

## Parameters

- **p_start_date** (timestamptz): Start of the time period (inclusive)
- **p_end_date** (timestamptz): End of the time period (inclusive)

## Return Value

Returns a JSONB object with the following structure:

```typescript
interface ReversalMetrics {
  startDate: string;              // ISO 8601 timestamp
  endDate: string;                // ISO 8601 timestamp
  totalActions: number;           // Total moderation actions in period
  totalReversals: number;         // Total reversed actions in period
  overallReversalRate: number;    // Percentage (0-100) with 2 decimal places
  
  perModeratorStats: Array<{
    moderatorId: string;          // UUID of moderator
    totalActions: number;         // Total actions by this moderator
    reversedActions: number;      // Number of reversed actions
    reversalRate: number;         // Percentage (0-100) with 2 decimal places
    averageTimeToReversalHours: number | null; // Average hours to reversal
  }>;
  
  timeToReversalStats: {
    averageHours: number;         // Average time to reversal
    medianHours: number;          // Median time to reversal
    minHours: number;             // Fastest reversal time
    maxHours: number;             // Slowest reversal time
    totalReversals: number;       // Number of reversals in calculation
  };
  
  reversalByActionType: Array<{
    actionType: string;           // Type of action
    totalActions: number;         // Total actions of this type
    reversedActions: number;      // Reversed actions of this type
    reversalRate: number;         // Percentage (0-100) with 2 decimal places
  }>;
}
```

## Usage Examples

### Basic Usage - Get Metrics for Last 30 Days

```typescript
import { supabase } from '@/lib/supabase';

async function getReversalMetrics(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_reversal_metrics', {
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    console.error('Error fetching reversal metrics:', error);
    throw error;
  }

  return data as ReversalMetrics;
}

// Get metrics for last 30 days
const endDate = new Date().toISOString();
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const metrics = await getReversalMetrics(startDate, endDate);

console.log(`Overall reversal rate: ${metrics.overallReversalRate}%`);
console.log(`Total actions: ${metrics.totalActions}`);
console.log(`Total reversals: ${metrics.totalReversals}`);
```

### Analyzing Per-Moderator Statistics

```typescript
const metrics = await getReversalMetrics(startDate, endDate);

// Find moderators with high reversal rates
const highReversalModerators = metrics.perModeratorStats.filter(
  mod => mod.reversalRate > 20 // More than 20% reversal rate
);

console.log('Moderators with high reversal rates:');
highReversalModerators.forEach(mod => {
  console.log(`- Moderator ${mod.moderatorId}: ${mod.reversalRate}% (${mod.reversedActions}/${mod.totalActions})`);
});
```

### Analyzing Time-to-Reversal

```typescript
const metrics = await getReversalMetrics(startDate, endDate);

console.log('Time-to-Reversal Statistics:');
console.log(`- Average: ${metrics.timeToReversalStats.averageHours} hours`);
console.log(`- Median: ${metrics.timeToReversalStats.medianHours} hours`);
console.log(`- Fastest: ${metrics.timeToReversalStats.minHours} hours`);
console.log(`- Slowest: ${metrics.timeToReversalStats.maxHours} hours`);

// Alert if average time to reversal is too high
if (metrics.timeToReversalStats.averageHours > 48) {
  console.warn('⚠️ Average time to reversal exceeds 48 hours - mistakes are taking too long to correct');
}
```

### Monthly Reversal Rate Tracking

```typescript
// Calculate reversal rates for each month
const months = [
  { name: 'January', start: '2024-01-01T00:00:00.000Z', end: '2024-01-31T23:59:59.999Z' },
  { name: 'February', start: '2024-02-01T00:00:00.000Z', end: '2024-02-29T23:59:59.999Z' },
  // ... more months
];

for (const month of months) {
  const metrics = await getReversalMetrics(month.start, month.end);
  console.log(`${month.name}: ${metrics.overallReversalRate}% reversal rate`);
}
```

### Analyzing Reversal Patterns by Action Type

```typescript
const metrics = await getReversalMetrics(startDate, endDate);

console.log('Reversal Rates by Action Type:');
metrics.reversalByActionType
  .sort((a, b) => b.reversalRate - a.reversalRate)
  .forEach(actionType => {
    console.log(`- ${actionType.actionType}: ${actionType.reversalRate}% (${actionType.reversedActions}/${actionType.totalActions})`);
  });

// Identify action types with high reversal rates
const problematicActionTypes = metrics.reversalByActionType.filter(
  at => at.reversalRate > 25 && at.totalActions > 10
);

if (problematicActionTypes.length > 0) {
  console.warn('⚠️ Action types with high reversal rates:');
  problematicActionTypes.forEach(at => {
    console.warn(`  - ${at.actionType}: ${at.reversalRate}%`);
  });
}
```

## Integration with React Components

### ReversalMetricsPanel Component

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ReversalMetricsPanelProps {
  startDate: string;
  endDate: string;
}

export function ReversalMetricsPanel({ startDate, endDate }: ReversalMetricsPanelProps) {
  const [metrics, setMetrics] = useState<ReversalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_reversal_metrics', {
          p_start_date: startDate,
          p_end_date: endDate
        });

        if (error) throw error;
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [startDate, endDate]);

  if (loading) return <div>Loading metrics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metrics) return null;

  return (
    <div className="reversal-metrics-panel">
      <h2>Reversal Metrics</h2>
      
      <div className="metric-card">
        <h3>Overall Reversal Rate</h3>
        <p className="metric-value">{metrics.overallReversalRate}%</p>
        <p className="metric-detail">
          {metrics.totalReversals} of {metrics.totalActions} actions reversed
        </p>
      </div>

      <div className="metric-card">
        <h3>Average Time to Reversal</h3>
        <p className="metric-value">
          {metrics.timeToReversalStats.averageHours.toFixed(1)} hours
        </p>
        <p className="metric-detail">
          Median: {metrics.timeToReversalStats.medianHours.toFixed(1)} hours
        </p>
      </div>

      {/* More metric cards... */}
    </div>
  );
}
```

## Calculation Details

### Overall Reversal Rate

```
overallReversalRate = (totalReversals / totalActions) * 100
- Rounded to 2 decimal places
- Returns 0 if totalActions is 0
```

### Per-Moderator Reversal Rate

```
reversalRate = (reversedActions / totalActions) * 100
- Calculated for each moderator individually
- Sorted by reversal rate descending (highest first)
- Only includes moderators with at least 1 action
- Rounded to 2 decimal places
```

### Time-to-Reversal Statistics

- **Average**: Mean time from action creation to reversal
- **Median**: Middle value when all times are sorted
- **Min**: Fastest reversal time
- **Max**: Slowest reversal time
- All times calculated in hours and rounded to 2 decimal places
- Only includes actions that have been reversed (revoked_at IS NOT NULL)

### Reversal Rate by Action Type

```
reversalRate = (reversedActions / totalActions) * 100
- Calculated for each action type separately
- Sorted by reversal rate descending
- Only includes action types with at least 1 action
- Rounded to 2 decimal places
```

## Performance Considerations

1. **Efficient Aggregation**: The function uses PostgreSQL's aggregation features to calculate all metrics in a single query
2. **Indexed Columns**: Ensure `created_at` and `revoked_at` columns are indexed for optimal performance
3. **Date Range**: Limit the date range to reasonable periods (e.g., 30-90 days) for best performance
4. **Caching**: Consider caching results for frequently accessed time periods

## Error Handling

```typescript
async function getReversalMetricsWithErrorHandling(
  startDate: string,
  endDate: string
): Promise<ReversalMetrics | null> {
  try {
    const { data, error } = await supabase.rpc('get_reversal_metrics', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to fetch reversal metrics: ${error.message}`);
    }

    if (!data) {
      console.warn('No data returned from get_reversal_metrics');
      return null;
    }

    return data as ReversalMetrics;
  } catch (error) {
    console.error('Error in getReversalMetrics:', error);
    throw error;
  }
}
```

## Best Practices

1. **Regular Monitoring**: Check reversal rates weekly or monthly to identify trends
2. **Threshold Alerts**: Set up alerts for reversal rates above 15-20%
3. **Moderator Training**: Use per-moderator stats to identify training needs
4. **Time Tracking**: Monitor time-to-reversal to ensure mistakes are caught quickly
5. **Pattern Analysis**: Look for patterns in high-reversal periods or moderators

## Common Use Cases

1. **Quality Assurance**: Track overall moderation quality through reversal rates
2. **Moderator Performance**: Identify moderators who may need additional training
3. **Process Improvement**: Analyze time-to-reversal to improve mistake detection
4. **Reporting**: Generate monthly or quarterly reversal reports for stakeholders
5. **Trend Analysis**: Track reversal rates over time to measure improvement

## Requirements Validation

This function satisfies the following requirements:

- **14.3**: Calculate and display reversal rate metrics (percentage of actions that are reversed)
- **14.7**: Track which moderators have the highest reversal rates for quality improvement

## Related Functions

- `getUserModerationHistory()` - Get complete moderation history for a user
- `getReversalHistory()` - Get detailed reversal history with filtering
- `liftSuspension()` - Reverse a suspension action
- `removeUserRestriction()` - Reverse a restriction action
- `revokeAction()` - Generic action reversal function

## Migration File

Location: `supabase/migrations/20251204000003_create_reversal_metrics_function.sql`

To apply this migration:
```bash
# Using Supabase CLI
supabase db push

# Or apply manually through Supabase Dashboard
# SQL Editor > New Query > Paste migration content > Run
```
