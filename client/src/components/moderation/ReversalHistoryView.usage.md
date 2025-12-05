# ReversalHistoryView Component

## Overview

The `ReversalHistoryView` component displays a comprehensive, filterable list of all moderation action reversals. It provides detailed information about each reversal including original action details, reversal timing, and reasons. The component supports CSV export for admins and includes summary statistics.

**Requirements:** 14.5, 14.8, 14.9

## Features

- **Filterable List**: Filter reversals by action type, date range, reversal reason, and self-reversal status
- **Detailed Display**: Shows original action details, reversal details, and time between action and reversal
- **CSV Export**: Admin-only export functionality for analysis and reporting
- **Summary Statistics**: Displays total reversals, self-reversals, and average time to reversal
- **Visual Indicators**: Badges for self-reversals and re-applied actions
- **Responsive Design**: Works on all screen sizes with horizontal scrolling for table

## Props

```typescript
interface ReversalHistoryViewProps {
  onEntrySelect?: (entry: ReversalHistoryEntry) => void;
}
```

### `onEntrySelect` (optional)
- **Type:** `(entry: ReversalHistoryEntry) => void`
- **Description:** Callback function called when a reversal entry is clicked
- **Use Case:** Open a detailed view or modal with complete reversal information

## Usage

### Basic Usage

```tsx
import { ReversalHistoryView } from '@/components/moderation/ReversalHistoryView';

export default function ReversalHistoryPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Reversal History</h1>
      <ReversalHistoryView />
    </div>
  );
}
```

### With Entry Selection Handler

```tsx
import { useState } from 'react';
import { ReversalHistoryView } from '@/components/moderation/ReversalHistoryView';
import { ReversalHistoryEntry } from '@/types/moderation';
import { ReversalDetailModal } from '@/components/moderation/ReversalDetailModal';

export default function ReversalHistoryPage() {
  const [selectedEntry, setSelectedEntry] = useState<ReversalHistoryEntry | null>(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Reversal History</h1>
      
      <ReversalHistoryView onEntrySelect={setSelectedEntry} />
      
      {selectedEntry && (
        <ReversalDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
```

### In Moderation Dashboard

```tsx
import { ReversalHistoryView } from '@/components/moderation/ReversalHistoryView';

export default function ModerationDashboard() {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className="container mx-auto p-6">
      <div className="flex space-x-4 mb-6">
        <button onClick={() => setActiveTab('queue')}>Queue</button>
        <button onClick={() => setActiveTab('logs')}>Action Logs</button>
        <button onClick={() => setActiveTab('reversals')}>Reversals</button>
        <button onClick={() => setActiveTab('metrics')}>Metrics</button>
      </div>

      {activeTab === 'reversals' && <ReversalHistoryView />}
    </div>
  );
}
```

## Filter Options

The component provides several filter options:

### Action Type Filter
- Filter by specific action types (content_removed, user_suspended, etc.)
- Dropdown selection with "All Types" option

### Date Range Filter
- **Reversal Start Date**: Filter reversals that occurred on or after this date
- **Reversal End Date**: Filter reversals that occurred on or before this date
- Uses native date picker inputs

### Reversal Reason Search
- Text search that filters by reversal reason
- Case-insensitive partial matching
- Searches the `reversal_reason` field in metadata

### Self-Reversal Filter
- Checkbox to show only self-reversals
- Self-reversals are when a moderator reverses their own action
- Useful for identifying moderators who frequently correct their own mistakes

## Display Information

Each reversal entry displays:

1. **Reversal Date**: When the action was reversed
2. **Action Type**: Type of original action with badges for:
   - Self-Reversal (yellow badge)
   - Re-applied (orange badge)
3. **Original Action**: Date and moderator who took the original action
4. **Time to Reversal**: Duration between action and reversal (formatted as hours/minutes)
5. **Reversed By**: Username or ID of moderator who reversed the action
6. **Reversal Reason**: Reason provided for the reversal

## Summary Statistics

At the bottom of the view, three summary cards display:

1. **Total Reversals**: Count of all reversals in the filtered results
2. **Self-Reversals**: Count and percentage of self-reversals
3. **Avg Time to Reversal**: Average time between action and reversal

## CSV Export

### Admin-Only Feature
- Only users with admin role can see and use the export button
- Button is disabled when there are no entries to export

### Export Format
The CSV includes the following columns:
- Action ID
- Action Type
- Original Moderator ID and Username
- Target User ID and Username
- Action Created At
- Action Reason
- Duration (Days)
- Revoked At
- Revoked By ID and Username
- Reversal Reason
- Time to Reversal (Hours)
- Is Self Reversal
- Was Reapplied
- Related Report ID

### Usage
```tsx
// Export button appears automatically for admins
// Click "Export CSV" button to download
// File name format: reversal-history-YYYY-MM-DD.csv
```

## Empty States

The component handles three empty states:

1. **No Reversals Ever**: Shows when no reversals exist in the system
2. **No Matching Filters**: Shows when filters exclude all results
3. **Loading State**: Shows skeleton loaders while fetching data

## Authorization

- **View Access**: Requires moderator or admin role
- **Export Access**: Requires admin role only
- Unauthorized users will see an error message

## Performance Considerations

- Fetches data on mount and when filters change
- No pagination (displays all matching results)
- For large datasets, consider adding pagination
- CSV export fetches all data (no limit)

## Styling

The component uses Tailwind CSS with the following color scheme:
- **Background**: Gray-800 for cards and table
- **Text**: White for headings, Gray-300 for content
- **Badges**: Purple for action types, Yellow for self-reversals, Orange for re-applied
- **Buttons**: Blue for primary actions, Green for export, Gray for secondary

## Error Handling

The component handles errors gracefully:
- Shows toast notifications for fetch errors
- Shows toast notifications for export errors
- Logs errors to console for debugging
- Displays user-friendly error messages

## Accessibility

- Semantic HTML table structure
- Proper label associations for form inputs
- Keyboard navigation support
- Screen reader friendly
- Focus management for interactive elements

## Related Components

- **ReversalMetricsPanel**: Displays reversal metrics and statistics
- **ModerationLogs**: Displays all moderation actions (including reversed ones)
- **ModerationHistoryTimeline**: Shows chronological timeline of actions and reversals
- **UserStatusPanel**: Shows user's active restrictions and reversal options

## Related Functions

- **getReversalHistory()**: Fetches reversal history with filters
- **exportReversalHistoryToCSV()**: Exports reversal history to CSV format
- **isAdmin()**: Checks if user has admin role

## Example: Complete Integration

```tsx
import { useState } from 'react';
import { ReversalHistoryView } from '@/components/moderation/ReversalHistoryView';
import { ReversalMetricsPanel } from '@/components/moderation/ReversalMetricsPanel';
import { ReversalHistoryEntry } from '@/types/moderation';

export default function ReversalAnalysisPage() {
  const [selectedEntry, setSelectedEntry] = useState<ReversalHistoryEntry | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">Reversal Analysis</h1>

      {/* Metrics Overview */}
      <ReversalMetricsPanel
        startDate={dateRange.start}
        endDate={dateRange.end}
      />

      {/* Detailed History */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Reversal History</h2>
        <ReversalHistoryView onEntrySelect={setSelectedEntry} />
      </div>

      {/* Selected Entry Details */}
      {selectedEntry && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Selected Reversal</h3>
          <pre className="text-gray-300 text-sm overflow-auto">
            {JSON.stringify(selectedEntry, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

## Testing

The component can be tested with:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReversalHistoryView } from './ReversalHistoryView';
import * as moderationService from '@/lib/moderationService';

jest.mock('@/lib/moderationService');

describe('ReversalHistoryView', () => {
  it('displays reversal history entries', async () => {
    const mockEntries = [
      {
        action: { id: '1', action_type: 'user_suspended', /* ... */ },
        revokedAt: '2024-01-15T10:00:00Z',
        revokedBy: 'mod-123',
        reversalReason: 'False positive',
        timeBetweenActionAndReversal: 3600000, // 1 hour
        isSelfReversal: false,
      },
    ];

    (moderationService.getReversalHistory as jest.Mock).mockResolvedValue(mockEntries);

    render(<ReversalHistoryView />);

    await waitFor(() => {
      expect(screen.getByText('False positive')).toBeInTheDocument();
    });
  });

  it('exports to CSV when admin clicks export', async () => {
    (moderationService.isAdmin as jest.Mock).mockResolvedValue(true);
    (moderationService.exportReversalHistoryToCSV as jest.Mock).mockResolvedValue('csv,data');

    render(<ReversalHistoryView />);

    const exportButton = await screen.findByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(moderationService.exportReversalHistoryToCSV).toHaveBeenCalled();
    });
  });
});
```

## Notes

- The component automatically refreshes when filters change
- CSV export is limited to admins for data security
- Time to reversal is calculated in milliseconds and formatted for display
- Self-reversals are highlighted with a yellow badge
- Re-applied actions are highlighted with an orange badge
- The component uses the existing toast context for notifications
- All dates are displayed in the user's local timezone
