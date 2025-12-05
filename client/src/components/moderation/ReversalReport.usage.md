# ReversalReport Component

## Overview

The `ReversalReport` component generates comprehensive reversal reports for a specified date range. It provides detailed analysis of reversal metrics, patterns, trends, and actionable recommendations. The component supports PDF export for sharing and archival purposes.

**Requirements:** 14.9

## Features

- **Executive Summary**: High-level overview of key metrics and findings
- **Detailed Metrics**: Complete reversal statistics and rates
- **Pattern Analysis**: Identifies trends in reversal reasons, timing, and moderator performance
- **Reversal History**: Complete list of all reversals in the period
- **Recommendations**: Actionable insights based on the data
- **PDF Export**: Generate printable reports for distribution

## Usage

### Basic Usage

```tsx
import { ReversalReport } from '@/components/moderation/ReversalReport';

function ModerationDashboard() {
  const [showReport, setShowReport] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  });

  return (
    <>
      <button onClick={() => setShowReport(true)}>
        Generate Reversal Report
      </button>

      {showReport && (
        <ReversalReport
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
```

### With Custom Date Range Selector

```tsx
import { ReversalReport } from '@/components/moderation/ReversalReport';
import { useState } from 'react';

function ReportsPage() {
  const [showReport, setShowReport] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerateReport = () => {
    if (startDate && endDate) {
      setShowReport(true);
    }
  };

  return (
    <div>
      <h2>Generate Reversal Report</h2>
      
      <div className="date-inputs">
        <label>
          Start Date:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        
        <label>
          End Date:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>

      <button onClick={handleGenerateReport}>
        Generate Report
      </button>

      {showReport && (
        <ReversalReport
          startDate={startDate}
          endDate={endDate}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
```

### Preset Date Ranges

```tsx
import { ReversalReport } from '@/components/moderation/ReversalReport';
import { useState } from 'react';

function QuickReports() {
  const [showReport, setShowReport] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const generateReport = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
    setShowReport(true);
  };

  return (
    <div>
      <h2>Quick Reports</h2>
      
      <div className="quick-actions">
        <button onClick={() => generateReport(7)}>
          Last 7 Days
        </button>
        <button onClick={() => generateReport(30)}>
          Last 30 Days
        </button>
        <button onClick={() => generateReport(90)}>
          Last 90 Days
        </button>
      </div>

      {showReport && dateRange && (
        <ReversalReport
          startDate={dateRange.start}
          endDate={dateRange.end}
          onClose={() => {
            setShowReport(false);
            setDateRange(null);
          }}
        />
      )}
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `startDate` | `string` | Yes | Start date for the report period (ISO format: YYYY-MM-DD) |
| `endDate` | `string` | Yes | End date for the report period (ISO format: YYYY-MM-DD) |
| `onClose` | `() => void` | No | Callback function when the report is closed |

## Report Sections

### 1. Executive Summary
- Total reversals count
- Overall reversal rate
- Average time to reversal
- System health status
- Key findings bullet points

### 2. Reversal Metrics
- Detailed metrics panel with all statistics
- Breakdown by action type
- Time-based metrics
- Moderator performance comparison

### 3. Patterns & Trends
- **Common Reversal Reasons**: Top reasons for reversals with percentages
- **Users with Multiple Reversals**: Moderators with high reversal rates
- **Day of Week Patterns**: When reversals occur most frequently
- **Hour of Day Patterns**: Time-of-day distribution of reversals

### 4. Complete Reversal History
- Full list of all reversals in the period
- Detailed information for each reversal
- Filterable and sortable

### 5. Recommendations
- Automated recommendations based on data analysis
- Color-coded by severity (success, warning, error)
- Suggested action items for improvement

## PDF Export

The component includes built-in PDF export functionality:

1. Click the "Export PDF" button in the header
2. A print dialog will open with a formatted version of the report
3. Save as PDF or print directly

The PDF includes:
- All metrics and statistics
- Tables with reversal data
- Recommendations
- Professional formatting for sharing

## Data Sources

The component fetches data from multiple sources:

- `getReversalMetrics()`: Overall metrics and statistics
- `getReversalHistory()`: Complete reversal history
- `getReversalPatterns()`: Pattern analysis and trends

All data is fetched in parallel for optimal performance.

## Loading States

The component handles three states:

1. **Loading**: Shows spinner while fetching data
2. **Error**: Displays error message with retry option
3. **Success**: Shows complete report with all sections

## Health Status Indicators

The report automatically calculates system health based on reversal rate:

- **Excellent** (< 10%): Green indicator
- **Good** (10-15%): Blue indicator
- **Fair** (15-20%): Yellow indicator
- **Concerning** (20-30%): Orange indicator
- **Critical** (> 30%): Red indicator

## Recommendations Logic

Recommendations are automatically generated based on:

- Overall reversal rate thresholds
- Average time to reversal
- Moderator performance patterns
- Common reversal reasons
- Temporal patterns (day/time)

## Best Practices

1. **Date Range Selection**:
   - Use meaningful periods (week, month, quarter)
   - Avoid very short periods (< 7 days) for statistical significance
   - Consider seasonal patterns when comparing periods

2. **Regular Reporting**:
   - Generate monthly reports for trend tracking
   - Compare reports over time to measure improvement
   - Share reports with moderation team leadership

3. **Action on Insights**:
   - Review recommendations with the team
   - Implement suggested improvements
   - Track progress in subsequent reports

4. **PDF Distribution**:
   - Export reports for stakeholder meetings
   - Archive reports for compliance
   - Share with training coordinators

## Accessibility

- Keyboard navigation supported
- Screen reader friendly
- High contrast colors for readability
- Clear visual hierarchy

## Performance Considerations

- Data is fetched in parallel for speed
- Large datasets are handled efficiently
- PDF generation is client-side (no server load)
- Component unmounts cleanly to prevent memory leaks

## Error Handling

The component handles various error scenarios:

- Network failures during data fetch
- Missing or incomplete data
- PDF generation failures
- Invalid date ranges

All errors are displayed with user-friendly messages and recovery options.

## Related Components

- `ReversalMetricsPanel`: Displays detailed metrics
- `ReversalHistoryView`: Shows complete reversal history
- `ModeratorReversalStats`: Moderator-specific statistics
- `PatternsSection`: Pattern analysis visualization

## Requirements Validation

This component validates the following requirements:

- **14.9**: Generate comprehensive reversal report for date range
  - ✅ Includes all metrics and statistics
  - ✅ Shows patterns and trends
  - ✅ Supports PDF export
  - ✅ Provides actionable recommendations
