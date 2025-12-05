# getReversalPatterns Function Usage

## Overview

The `getReversalPatterns` function analyzes reversal patterns to identify common reasons, users with multiple reversals, and time-based patterns.

**Requirements:** 14.5

## Function Signature

```typescript
async function getReversalPatterns(
  startDate: string,
  endDate: string
): Promise<ReversalPatterns>
```

## Parameters

- `startDate` (string, required): Start date for pattern analysis in ISO 8601 format
- `endDate` (string, required): End date for pattern analysis in ISO 8601 format

## Returns

Returns a `ReversalPatterns` object containing:

```typescript
interface ReversalPatterns {
  commonReasons: ReversalReasonPattern[];
  usersWithMultipleReversals: UserReversalPattern[];
  dayOfWeekPatterns: DayOfWeekPattern[];
  hourOfDayPatterns: HourOfDayPattern[];
  totalReversals: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}
```

### ReversalReasonPattern

```typescript
interface ReversalReasonPattern {
  reason: string;
  count: number;
  percentage: number;
}
```

### UserReversalPattern

```typescript
interface UserReversalPattern {
  userId: string;
  username?: string;
  reversedActionCount: number;
  totalActionCount: number;
  reversalRate: number;
  mostCommonReason: string;
}
```

### DayOfWeekPattern

```typescript
interface DayOfWeekPattern {
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  dayNumber: number; // 0-6 (Sunday = 0)
  count: number;
  percentage: number;
}
```

### HourOfDayPattern

```typescript
interface HourOfDayPattern {
  hour: number; // 0-23
  count: number;
  percentage: number;
}
```

## Usage Examples

### Basic Usage

```typescript
import { getReversalPatterns } from '@/lib/moderationService';

// Analyze patterns for the last 30 days
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const endDate = new Date().toISOString();

try {
  const patterns = await getReversalPatterns(startDate, endDate);
  
  console.log('Total reversals:', patterns.totalReversals);
  console.log('Common reasons:', patterns.commonReasons);
  console.log('Users with multiple reversals:', patterns.usersWithMultipleReversals);
  console.log('Day of week patterns:', patterns.dayOfWeekPatterns);
  console.log('Hour of day patterns:', patterns.hourOfDayPatterns);
} catch (error) {
  console.error('Failed to get reversal patterns:', error);
}
```

### Analyzing Common Reversal Reasons

```typescript
const patterns = await getReversalPatterns(startDate, endDate);

// Get top 5 most common reasons
const topReasons = patterns.commonReasons.slice(0, 5);

topReasons.forEach((reason) => {
  console.log(`${reason.reason}: ${reason.count} (${reason.percentage}%)`);
});
```

### Identifying Problem Users

```typescript
const patterns = await getReversalPatterns(startDate, endDate);

// Find users with high reversal rates
const problemUsers = patterns.usersWithMultipleReversals
  .filter((user) => user.reversalRate > 50)
  .sort((a, b) => b.reversalRate - a.reversalRate);

problemUsers.forEach((user) => {
  console.log(`User ${user.username || user.userId}:`);
  console.log(`  - ${user.reversedActionCount} reversals out of ${user.totalActionCount} actions`);
  console.log(`  - Reversal rate: ${user.reversalRate}%`);
  console.log(`  - Most common reason: ${user.mostCommonReason}`);
});
```

### Analyzing Time Patterns

```typescript
const patterns = await getReversalPatterns(startDate, endDate);

// Find busiest day of week
const busiestDay = patterns.dayOfWeekPatterns
  .reduce((max, day) => day.count > max.count ? day : max);

console.log(`Most reversals occur on ${busiestDay.dayOfWeek} (${busiestDay.count} reversals)`);

// Find peak hours
const peakHours = patterns.hourOfDayPatterns
  .filter((hour) => hour.count > 0)
  .sort((a, b) => b.count - a.count)
  .slice(0, 3);

console.log('Peak reversal hours:');
peakHours.forEach((hour) => {
  console.log(`  - ${hour.hour}:00 UTC: ${hour.count} reversals (${hour.percentage}%)`);
});
```

### Using in a Dashboard Component

```typescript
import { useEffect, useState } from 'react';
import { getReversalPatterns } from '@/lib/moderationService';
import type { ReversalPatterns } from '@/types/moderation';

function ReversalPatternsPanel() {
  const [patterns, setPatterns] = useState<ReversalPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatterns() {
      try {
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const data = await getReversalPatterns(startDate, endDate);
        setPatterns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patterns');
      } finally {
        setLoading(false);
      }
    }

    loadPatterns();
  }, []);

  if (loading) return <div>Loading patterns...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!patterns) return null;

  return (
    <div>
      <h2>Reversal Patterns Analysis</h2>
      <p>Total reversals: {patterns.totalReversals}</p>
      
      <section>
        <h3>Common Reasons</h3>
        <ul>
          {patterns.commonReasons.slice(0, 5).map((reason) => (
            <li key={reason.reason}>
              {reason.reason}: {reason.count} ({reason.percentage}%)
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Users with Multiple Reversals</h3>
        <ul>
          {patterns.usersWithMultipleReversals.slice(0, 10).map((user) => (
            <li key={user.userId}>
              {user.username || user.userId}: {user.reversedActionCount} reversals
              ({user.reversalRate}% rate)
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

## Authorization

- Requires moderator or admin role
- Throws `ModerationError` with code `UNAUTHORIZED` if user lacks permissions

## Error Handling

The function throws `ModerationError` in the following cases:

- **UNAUTHORIZED**: User is not a moderator or admin
- **VALIDATION_ERROR**: Invalid date parameters or date format
- **DATABASE_ERROR**: Database query fails

## Notes

- Reversal reasons are extracted from the `metadata.reversal_reason` field
- Users with fewer than 2 reversals are not included in the `usersWithMultipleReversals` array
- Time patterns use UTC timezone for consistency
- All percentages are rounded to 2 decimal places
- If no reversals exist in the date range, empty arrays are returned

## Related Functions

- `getReversalMetrics()` - Calculate overall reversal rates and statistics
- `getReversalTimeMetrics()` - Analyze time-to-reversal metrics
- `getModeratorReversalStats()` - Get reversal statistics for a specific moderator
- `getUserModerationHistory()` - Get complete moderation history for a user
