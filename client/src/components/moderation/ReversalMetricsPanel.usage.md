# ReversalMetricsPanel Component - Usage Guide

## Overview

The `ReversalMetricsPanel` component displays comprehensive reversal metrics for moderation actions. It provides visual insights into reversal rates, time-to-reversal statistics, and patterns by action type. This component is designed for the moderation dashboard to help track moderation quality and identify areas for improvement.

## Features

- **Overall Reversal Rate**: Displays the percentage of actions that have been reversed with trend indicators
- **Time-to-Reversal Statistics**: Shows average, median, min, and max time between action and reversal
- **Reversal by Action Type**: Bar chart showing reversal rates for each action type
- **Common Patterns**: Highlights quick reversals, detection times, and extremes
- **Automatic Alerts**: Warns when reversal rates or detection times exceed thresholds
- **Date Range Support**: Allows filtering metrics by custom date ranges
- **Loading States**: Skeleton loaders during data fetch
- **Error Handling**: Graceful error display with retry option

## Props

```typescript
interface ReversalMetricsPanelProps {
  startDate?: string;  // ISO 8601 timestamp (optional, defaults to 30 days ago)
  endDate?: string;    // ISO 8601 timestamp (optional, defaults to now)
}
```

## Basic Usage

### Default (Last 30 Days)

```typescript
import { ReversalMetricsPanel } from '@/components/moderation/ReversalMetricsPanel';

export function ModerationDashboard() {
  return (
    <div>
      <h1>Moderation Dashboard</h1>
      <ReversalMetricsPanel />
    </div>
  );
}
```

### Custom Date Range

```typescript
import { ReversalMetricsPanel } from '@/components/moderation/ReversalMetricsPanel';

export function ModerationDashboard() {
  // Last 7 days
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <div>
      <h1>Weekly Reversal Metrics</h1>
      <ReversalMetricsPanel startDate={startDate} endDate={endDate} />
    </div>
  );
}
```

### With Date Range Picker

```typescript
import { useState } from 'react';
import { ReversalMetricsPanel } from '@/components/moderation/ReversalMetricsPanel';

export function ModerationDashboard() {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString());

  return (
    <div>
      <h1>Reversal Metrics</h1>
      
      {/* Date Range Picker */}
      <div className="mb-6 flex space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate.split('T')[0]}
            onChange={(e) => setStartDate(new Date(e.target.value).toISOString())}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate.split('T')[0]}
            onChange={(e) => setEndDate(new Date(e.target.value).toISOString())}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>
      </div>

      <ReversalMetricsPanel startDate={startDate} endDate={endDate} />
    </div>
  );
}
```

## Integration with Metrics Tab

### Add to Existing Metrics Dashboard

```typescript
import { ModerationMetrics } from '@/components/moderation/ModerationMetrics';
import { ReversalMetricsPanel } from '@/components/moderation/ReversalMetricsPanel';

export function MetricsTab() {
  return (
    <div className="space-y-8">
      {/* Existing Metrics */}
      <ModerationMetrics />
      
      {/* Reversal Metrics Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Reversal Analysis</h2>
        <ReversalMetricsPanel />
      </div>
    </div>
  );
}
```

### Tabbed Interface

```typescript
import { useState } from 'react';
import { ModerationMetrics } from '@/components/moderation/ModerationMetrics';
import { ReversalMetricsPanel } from '@/components/moderation/ReversalMetricsPanel';

export function MetricsTab() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reversals'>('overview');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('reversals')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'reversals'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Reversals
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <ModerationMetrics />
      ) : (
        <ReversalMetricsPanel />
      )}
    </div>
  );
}
```

## Metrics Displayed

### 1. Overall Reversal Rate Card
- **Value**: Percentage of actions reversed (0-100%)
- **Trend Indicator**: 
  - Green ↓ "Low" (< 10%)
  - Yellow → "Moderate" (10-20%)
  - Red ↑ "High" (> 20%)
- **Details**: Count of reversed actions vs total actions

### 2. Average Time to Reversal Card
- **Value**: Average hours between action and reversal
- **Details**: Median time, min/max range

### 3. Total Actions Card
- **Value**: Total moderation actions in period
- **Details**: Simple count

### 4. Total Reversals Card
- **Value**: Total reversed actions in period
- **Details**: Simple count

### 5. Reversal Rate by Action Type Chart
- **Bar Chart**: Shows reversal rate for each action type
- **Sorting**: Highest reversal rate first
- **Highlighting**: Red bars for rates > 25%
- **Labels**: Action type name, percentage, and count

### 6. Common Reversal Patterns
- Quick reversals count (< 1 hour)
- Average detection time
- Fastest reversal time
- Slowest reversal time

## Alerts and Warnings

### High Reversal Rate Alert
**Triggers when**: Overall reversal rate > 20%

```
⚠️ High Reversal Rate Detected
The overall reversal rate of X% exceeds the recommended threshold of 20%. 
This may indicate issues with moderation quality or unclear guidelines.
```

**Styling**: Red background with red border

### Slow Reversal Detection Alert
**Triggers when**: Average time to reversal > 48 hours

```
⏰ Slow Reversal Detection
The average time to reversal of X hours exceeds 48 hours. 
Mistakes are taking too long to correct.
```

**Styling**: Yellow background with yellow border

## Styling and Theming

The component uses Tailwind CSS with a dark theme consistent with the moderation dashboard:

- **Background**: `bg-gray-800` for cards
- **Text**: `text-white` for headings, `text-gray-400` for labels
- **Accent Colors**:
  - Blue: Primary metrics
  - Purple: Time metrics
  - Orange: Reversal counts
  - Green: Low rates
  - Yellow: Moderate rates
  - Red: High rates

## Loading States

The component displays skeleton loaders while fetching data:

```typescript
// 4 metric cards with animated pulse
<div className="bg-gray-800 rounded-lg p-6 animate-pulse">
  <div className="h-6 w-32 bg-gray-700 rounded mb-4"></div>
  <div className="h-10 w-20 bg-gray-700 rounded mb-2"></div>
  <div className="h-4 w-24 bg-gray-700 rounded"></div>
</div>
```

## Error Handling

### Error Display
When data fetch fails, shows:
- Warning icon (⚠️)
- Error message
- "Try Again" button to reload

### Error Recovery
```typescript
// Automatic retry on button click
<button onClick={() => window.location.reload()}>
  Try Again
</button>
```

## Performance Considerations

1. **Database Function**: Uses `get_reversal_metrics` database function for efficient aggregation
2. **Single Query**: All metrics calculated in one database call
3. **Memoization**: React hooks prevent unnecessary re-renders
4. **Conditional Rendering**: Only renders when data is available

## Accessibility

- **Semantic HTML**: Uses proper heading hierarchy
- **Color Contrast**: Meets WCAG AA standards
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Readers**: Descriptive labels and ARIA attributes

## Best Practices

### 1. Regular Monitoring
```typescript
// Check reversal metrics weekly
<ReversalMetricsPanel 
  startDate={getWeekStart()} 
  endDate={getWeekEnd()} 
/>
```

### 2. Threshold Alerts
The component automatically alerts when:
- Reversal rate > 20%
- Time to reversal > 48 hours

### 3. Comparative Analysis
```typescript
// Compare current month vs previous month
const currentMonth = <ReversalMetricsPanel startDate={...} endDate={...} />;
const previousMonth = <ReversalMetricsPanel startDate={...} endDate={...} />;
```

### 4. Export Data
For detailed analysis, use the underlying `get_reversal_metrics` function:

```typescript
const { data } = await supabase.rpc('get_reversal_metrics', {
  p_start_date: startDate,
  p_end_date: endDate
});

// Export to CSV, generate reports, etc.
```

## Common Use Cases

### 1. Quality Assurance Dashboard
```typescript
<div className="quality-dashboard">
  <h1>Moderation Quality</h1>
  <ReversalMetricsPanel />
</div>
```

### 2. Monthly Reports
```typescript
function MonthlyReport({ month, year }: { month: number; year: number }) {
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0).toISOString();
  
  return <ReversalMetricsPanel startDate={startDate} endDate={endDate} />;
}
```

### 3. Trend Analysis
```typescript
function TrendAnalysis() {
  const months = getLastSixMonths();
  
  return (
    <div className="grid grid-cols-2 gap-6">
      {months.map(month => (
        <ReversalMetricsPanel 
          key={month.start}
          startDate={month.start} 
          endDate={month.end} 
        />
      ))}
    </div>
  );
}
```

## Requirements Validation

This component satisfies the following requirements:

- **14.3**: Display overall reversal rate with trend
- **14.6**: Display average time-to-reversal
- **Task 22.3**: Create ReversalMetricsPanel component with all specified features

## Related Components

- `ModerationMetrics` - Overall moderation metrics
- `ModeratorReversalStats` - Per-moderator reversal statistics
- `ReversalHistoryView` - Detailed reversal history
- `ModerationLogs` - Action logs with reversal indicators

## Database Dependencies

- **Function**: `get_reversal_metrics(p_start_date, p_end_date)`
- **Migration**: `20251204000003_create_reversal_metrics_function.sql`
- **Tables**: `moderation_actions` (with `revoked_at`, `revoked_by` columns)

## Testing

### Unit Tests
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { ReversalMetricsPanel } from './ReversalMetricsPanel';

test('displays loading state initially', () => {
  render(<ReversalMetricsPanel />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('displays metrics after loading', async () => {
  render(<ReversalMetricsPanel />);
  await waitFor(() => {
    expect(screen.getByText(/overall reversal rate/i)).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
test('fetches metrics from database', async () => {
  const { data } = await supabase.rpc('get_reversal_metrics', {
    p_start_date: startDate,
    p_end_date: endDate
  });
  
  expect(data).toBeDefined();
  expect(data.overallReversalRate).toBeGreaterThanOrEqual(0);
});
```

## Troubleshooting

### Issue: "Failed to load reversal metrics"
**Cause**: Database function not found or permission denied
**Solution**: Ensure migration `20251204000003_create_reversal_metrics_function.sql` is applied

### Issue: No data displayed
**Cause**: No actions in selected date range
**Solution**: Expand date range or check if actions exist in database

### Issue: Slow loading
**Cause**: Large date range or many actions
**Solution**: Limit date range to 30-90 days for optimal performance

## Future Enhancements

1. **Export to CSV**: Add button to export metrics data
2. **Comparison Mode**: Compare two time periods side-by-side
3. **Real-time Updates**: Auto-refresh metrics every N minutes
4. **Drill-down**: Click action type to see detailed reversals
5. **Moderator Filter**: Filter metrics by specific moderator
6. **Custom Thresholds**: Allow admins to set custom alert thresholds

