# getReversalTimeMetrics() Usage Guide

## Overview

The `getReversalTimeMetrics()` function calculates detailed time-based metrics for action reversals, providing insights into how quickly actions are being reversed and identifying patterns by action type.

**Requirements**: 14.6

## Function Signature

```typescript
export async function getReversalTimeMetrics(
  startDate: string,
  endDate: string
): Promise<ReversalTimeMetrics>
```

## Parameters

- `startDate` (string, required): Start date for metrics calculation in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- `endDate` (string, required): End date for metrics calculation in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)

## Return Type

```typescript
interface ReversalTimeMetrics {
  averageHours: number;          // Average time between action and reversal
  medianHours: number;           // Median time to reversal
  fastestHours: number;          // Fastest reversal time
  slowestHours: number;          // Slowest reversal time
  byActionType: Record<string, { // Metrics grouped by action type
    averageHours: number;
    medianHours: number;
    fastestHours: number;
    slowestHours: number;
    count: number;               // Number of reversals for this action type
  }>;
}
```

## Authorization

- Requires authenticated user with moderator or admin role
- Throws `MODERATION_UNAUTHORIZED` error if user lacks required permissions

## Usage Examples

### Basic Usage

```typescript
import { getReversalTimeMetrics } from '@/lib/moderationService';

// Get reversal time metrics for January 2024
const metrics = await getReversalTimeMetrics(
  '2024-01-01T00:00:00.000Z',
  '2024-01-31T23:59:59.999Z'
);

console.log(`Average time to reversal: ${metrics.averageHours} hours`);
console.log(`Median time to reversal: ${metrics.medianHours} hours`);
console.log(`Fastest reversal: ${metrics.fastestHours} hours`);
console.log(`Slowest reversal: ${metrics.slowestHours} hours`);
```

### Analyzing by Action Type

```typescript
const metrics = await getReversalTimeMetrics(
  '2024-01-01T00:00:00.000Z',
  '2024-01-31T23:59:59.999Z'
);

// Display metrics for each action type
Object.entries(metrics.byActionType).forEach(([actionType, stats]) => {
  console.log(`\n${actionType}:`);
  console.log(`  Count: ${stats.count}`);
  console.log(`  Average: ${stats.averageHours} hours`);
  console.log(`  Median: ${stats.medianHours} hours`);
  console.log(`  Fastest: ${stats.fastestHours} hours`);
  console.log(`  Slowest: ${stats.slowestHours} hours`);
});
```

### Identifying Problem Areas

```typescript
const metrics = await getReversalTimeMetrics(
  '2024-01-01T00:00:00.000Z',
  '2024-01-31T23:59:59.999Z'
);

// Find action types with fastest average reversal time (potential false positives)
const sortedBySpeed = Object.entries(metrics.byActionType)
  .sort((a, b) => a[1].averageHours - b[1].averageHours);

console.log('Action types with fastest reversals (potential false positives):');
sortedBySpeed.slice(0, 3).forEach(([actionType, stats]) => {
  console.log(`  ${actionType}: ${stats.averageHours} hours average`);
});

// Find action types with slowest average reversal time
console.log('\nAction types with slowest reversals:');
sortedBySpeed.slice(-3).forEach(([actionType, stats]) => {
  console.log(`  ${actionType}: ${stats.averageHours} hours average`);
});
```

### Displaying in UI Component

```typescript
import { getReversalTimeMetrics } from '@/lib/moderationService';
import { useState, useEffect } from 'react';

function ReversalTimeMetricsPanel() {
  const [metrics, setMetrics] = useState<ReversalTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const data = await getReversalTimeMetrics(startDate, endDate);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load reversal time metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  if (loading) return <div>Loading metrics...</div>;
  if (!metrics) return <div>No data available</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Reversal Time Metrics (Last 30 Days)</h2>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded">
          <div className="text-sm text-gray-600">Average</div>
          <div className="text-2xl font-bold">{metrics.averageHours.toFixed(1)}h</div>
        </div>
        
        <div className="p-4 bg-green-50 rounded">
          <div className="text-sm text-gray-600">Median</div>
          <div className="text-2xl font-bold">{metrics.medianHours.toFixed(1)}h</div>
        </div>
        
        <div className="p-4 bg-yellow-50 rounded">
          <div className="text-sm text-gray-600">Fastest</div>
          <div className="text-2xl font-bold">{metrics.fastestHours.toFixed(1)}h</div>
        </div>
        
        <div className="p-4 bg-red-50 rounded">
          <div className="text-sm text-gray-600">Slowest</div>
          <div className="text-2xl font-bold">{metrics.slowestHours.toFixed(1)}h</div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">By Action Type</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Action Type</th>
              <th className="text-right p-2">Count</th>
              <th className="text-right p-2">Avg (h)</th>
              <th className="text-right p-2">Median (h)</th>
              <th className="text-right p-2">Fastest (h)</th>
              <th className="text-right p-2">Slowest (h)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metrics.byActionType).map(([actionType, stats]) => (
              <tr key={actionType} className="border-b">
                <td className="p-2">{actionType}</td>
                <td className="text-right p-2">{stats.count}</td>
                <td className="text-right p-2">{stats.averageHours.toFixed(1)}</td>
                <td className="text-right p-2">{stats.medianHours.toFixed(1)}</td>
                <td className="text-right p-2">{stats.fastestHours.toFixed(1)}</td>
                <td className="text-right p-2">{stats.slowestHours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Error Handling

The function throws `ModerationError` with the following error codes:

- `MODERATION_UNAUTHORIZED`: User is not authenticated or lacks moderator/admin role
- `MODERATION_VALIDATION_ERROR`: Invalid date format or start date after end date
- `MODERATION_DATABASE_ERROR`: Database query failed

```typescript
import { getReversalTimeMetrics, ModerationError, MODERATION_ERROR_CODES } from '@/lib/moderationService';

try {
  const metrics = await getReversalTimeMetrics(startDate, endDate);
  // Use metrics...
} catch (error) {
  if (error instanceof ModerationError) {
    switch (error.code) {
      case MODERATION_ERROR_CODES.UNAUTHORIZED:
        console.error('User not authorized to view metrics');
        break;
      case MODERATION_ERROR_CODES.VALIDATION_ERROR:
        console.error('Invalid date parameters:', error.details);
        break;
      case MODERATION_ERROR_CODES.DATABASE_ERROR:
        console.error('Database error:', error.message);
        break;
    }
  }
}
```

## Validation Rules

1. **Date Format**: Both dates must be valid ISO 8601 format strings
2. **Date Range**: Start date must be before or equal to end date
3. **Required Parameters**: Both startDate and endDate are required
4. **Authorization**: User must have moderator or admin role

## Performance Considerations

- The function queries all reversed actions in the date range
- For large date ranges with many reversals, consider:
  - Limiting the date range to smaller periods (e.g., 30 days)
  - Implementing pagination if displaying results
  - Caching results for frequently accessed date ranges
  - Using the database function `get_reversal_metrics()` for better performance

## Related Functions

- `getReversalMetrics()`: Get overall reversal metrics including rates and per-moderator stats
- `getModeratorReversalStats()`: Get reversal statistics for a specific moderator
- `getUserModerationHistory()`: Get complete moderation history for a user including reversals

## Use Cases

1. **Quality Monitoring**: Identify if actions are being reversed too quickly (potential false positives)
2. **Process Improvement**: Understand typical time-to-reversal to improve moderation guidelines
3. **Pattern Detection**: Identify action types that are frequently reversed quickly
4. **Performance Metrics**: Track how quickly mistakes are being caught and corrected
5. **Training**: Use metrics to identify areas where moderators need additional training

## Notes

- All time values are returned in hours with 2 decimal places
- If no reversed actions exist in the date range, all metrics return 0
- The `byActionType` object only includes action types that have been reversed
- Time calculations are based on `created_at` and `revoked_at` timestamps
