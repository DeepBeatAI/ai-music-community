# Metric Definitions Usage Guide

## Overview
This guide explains how to use the metric definitions table to enhance the analytics dashboard with proper formatting and metadata.

## Available Metric Definitions

### Core Metrics (Seeded)

| Category | Type | Display Name | Unit | Format | Description |
|----------|------|--------------|------|--------|-------------|
| users_total | count | Total Users | users | 0,0 | Total registered users as of date |
| posts_total | count | Total Posts | posts | 0,0 | Total posts created as of date |
| comments_total | count | Total Comments | comments | 0,0 | Total comments created as of date |
| posts_created | count | Posts Created | posts | 0,0 | New posts created on specific date |
| comments_created | count | Comments Created | comments | 0,0 | New comments created on specific date |

## Querying Metric Definitions

### Get All Active Metrics
```sql
SELECT * FROM metric_definitions 
WHERE is_active = true 
ORDER BY metric_category;
```

### Get Definition for Specific Metric
```sql
SELECT * FROM metric_definitions 
WHERE metric_category = 'users_total';
```

### Get Definitions by Type
```sql
SELECT * FROM metric_definitions 
WHERE metric_type = 'count';
```

## Using in TypeScript/JavaScript

### Fetch Metric Definitions
```typescript
// lib/analytics.ts
export async function fetchMetricDefinitions() {
  const { data, error } = await supabase
    .from('metric_definitions')
    .select('*')
    .eq('is_active', true)
    .order('metric_category');

  if (error) throw error;
  return data;
}
```

### Format Metric Value
```typescript
// utils/formatMetric.ts
import type { MetricDefinition } from '@/types/analytics';

export function formatMetricValue(
  value: number, 
  definition: MetricDefinition
): string {
  // Apply format pattern (e.g., '0,0' adds thousands separator)
  if (definition.format_pattern === '0,0') {
    return value.toLocaleString();
  }
  
  return value.toString();
}

// Usage example
const definition = await fetchMetricDefinition('users_total');
const formattedValue = formatMetricValue(1234, definition);
// Result: "1,234"
```

### Display Metric with Metadata
```typescript
// components/MetricCard.tsx
interface MetricCardProps {
  category: string;
  value: number;
  definition: MetricDefinition;
}

export function MetricCard({ category, value, definition }: MetricCardProps) {
  const formattedValue = formatMetricValue(value, definition);
  
  return (
    <div className="metric-card">
      <h3>{definition.display_name}</h3>
      <p className="value">{formattedValue} {definition.unit}</p>
      <p className="description">{definition.description}</p>
    </div>
  );
}
```

## Adding New Metric Definitions

### Step 1: Insert Definition
```sql
INSERT INTO metric_definitions (
  metric_type,
  metric_category,
  display_name,
  description,
  unit,
  format_pattern,
  is_active
) VALUES (
  'count',
  'tracks_uploaded',
  'Tracks Uploaded',
  'Number of audio tracks uploaded on this specific date',
  'tracks',
  '0,0',
  true
);
```

### Step 2: Update Collection Function
Add the metric collection logic to `collect_daily_metrics()` function.

### Step 3: Update TypeScript Types
```typescript
// types/analytics.ts
export type MetricCategory = 
  | 'users_total'
  | 'posts_total'
  | 'comments_total'
  | 'posts_created'
  | 'comments_created'
  | 'tracks_uploaded'; // Add new category
```

## Format Patterns

### Supported Patterns

| Pattern | Example Input | Example Output | Use Case |
|---------|---------------|----------------|----------|
| 0,0 | 1234 | 1,234 | Counts with thousands separator |
| 0.0 | 12.345 | 12.3 | Decimals with one place |
| 0.00 | 12.345 | 12.35 | Decimals with two places |
| 0% | 0.234 | 23% | Percentages |
| 0.0% | 0.234 | 23.4% | Percentages with decimal |

### Implementing Format Patterns

```typescript
export function formatMetricValue(
  value: number, 
  pattern: string
): string {
  switch (pattern) {
    case '0,0':
      return value.toLocaleString();
    case '0.0':
      return value.toFixed(1);
    case '0.00':
      return value.toFixed(2);
    case '0%':
      return `${Math.round(value * 100)}%`;
    case '0.0%':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toString();
  }
}
```

## Best Practices

### 1. Always Use Definitions for Display
❌ **Don't:**
```typescript
<div>Total Users: {metrics.users_total}</div>
```

✅ **Do:**
```typescript
const definition = definitions.find(d => d.metric_category === 'users_total');
<div>{definition.display_name}: {formatMetricValue(metrics.users_total, definition)}</div>
```

### 2. Cache Definitions
```typescript
// Cache definitions to avoid repeated queries
const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);

useEffect(() => {
  fetchMetricDefinitions().then(setDefinitions);
}, []);
```

### 3. Handle Missing Definitions
```typescript
function getDefinition(category: string): MetricDefinition | null {
  return definitions.find(d => d.metric_category === category) || null;
}

// Provide fallback
const definition = getDefinition('users_total') || {
  display_name: 'Users',
  format_pattern: '0,0',
  unit: 'users'
};
```

### 4. Keep Definitions in Sync
When adding new metrics:
1. ✅ Add to metric_definitions table
2. ✅ Update collection function
3. ✅ Update TypeScript types
4. ✅ Update UI components

## Migration Pattern

### Creating New Metric Definition Migration
```sql
-- Migration: Add [Metric Name] Definition
-- Description: Add definition for [metric description]

INSERT INTO metric_definitions (
  metric_type,
  metric_category,
  display_name,
  description,
  unit,
  format_pattern,
  is_active
) VALUES (
  '[type]',
  '[category]',
  '[Display Name]',
  '[Description]',
  '[unit]',
  '[pattern]',
  true
)
ON CONFLICT (metric_type, metric_category) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  format_pattern = EXCLUDED.format_pattern,
  is_active = EXCLUDED.is_active;
```

## Troubleshooting

### Definition Not Found
```typescript
// Check if definition exists
const definition = await supabase
  .from('metric_definitions')
  .select('*')
  .eq('metric_category', 'users_total')
  .single();

if (!definition.data) {
  console.error('Metric definition not found');
}
```

### Incorrect Formatting
```typescript
// Verify format pattern
console.log('Format pattern:', definition.format_pattern);
console.log('Formatted value:', formatMetricValue(1234, definition));
```

### RLS Issues
Metric definitions are publicly readable. If you can't query them:
```sql
-- Verify RLS policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'metric_definitions';

-- Should show: "Anyone can view metric definitions"
```

## Examples

### Complete Dashboard Integration
```typescript
// app/analytics/page.tsx
import { fetchMetrics, fetchMetricDefinitions } from '@/lib/analytics';
import { formatMetricValue } from '@/utils/formatMetric';

export default async function AnalyticsPage() {
  const [metrics, definitions] = await Promise.all([
    fetchCurrentMetrics(),
    fetchMetricDefinitions()
  ]);

  return (
    <div className="analytics-dashboard">
      {Object.entries(metrics).map(([category, value]) => {
        const definition = definitions.find(d => d.metric_category === category);
        if (!definition) return null;

        return (
          <MetricCard
            key={category}
            category={category}
            value={value}
            definition={definition}
          />
        );
      })}
    </div>
  );
}
```

## Summary

Metric definitions provide:
- ✅ Consistent display names across the application
- ✅ Proper formatting for different metric types
- ✅ Descriptive context for users
- ✅ Extensibility for future metrics
- ✅ Centralized metadata management

Use them to create a professional, maintainable analytics dashboard.
