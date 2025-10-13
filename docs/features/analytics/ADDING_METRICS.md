# Adding New Metrics Guide

## Overview

This guide explains how to add new metrics to the analytics system. The system is designed to be extensible, allowing you to add new metric types without breaking existing functionality.

## Before You Start

Consider:
- **What are you measuring?** (e.g., user engagement, content quality)
- **What type of metric?** (count, average, percentage, aggregate)
- **What's the data source?** (which tables/columns)
- **How often to collect?** (daily, weekly, monthly)
- **Is historical data needed?** (requires backfill)

## Step-by-Step Process

### Step 1: Define the Metric

Add a record to the `metric_definitions` table:

```sql
INSERT INTO metric_definitions (
  metric_type,
  metric_category,
  display_name,
  description,
  unit,
  aggregation_method
) VALUES (
  'count',                    -- Type: count, average, percentage, aggregate
  'likes_total',              -- Unique category identifier
  'Total Likes',              -- Display name for UI
  'Total number of likes across all posts',
  'likes',                    -- Unit of measurement
  'sum'                       -- How to aggregate: sum, avg, max, min
);
```

### Step 2: Update Collection Function

Modify `collect_daily_metrics()` function in the migration file:

```sql
CREATE OR REPLACE FUNCTION collect_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  metric_category TEXT,
  value NUMERIC,
  metadata JSONB
) AS $$
BEGIN
  -- Existing metrics...
  
  -- Add your new metric
  RETURN QUERY
  SELECT 
    'likes_total'::TEXT as metric_category,
    COUNT(*)::NUMERIC as value,
    jsonb_build_object(
      'collection_date', target_date,
      'source_table', 'post_likes'
    ) as metadata
  FROM post_likes
  WHERE created_at::DATE <= target_date;
  
  -- Continue with other metrics...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Update TypeScript Types

Add the new metric to TypeScript types in `client/src/types/analytics.ts`:

```typescript
export type MetricCategory = 
  | 'users_total'
  | 'posts_total'
  | 'comments_total'
  | 'posts_created'
  | 'comments_created'
  | 'likes_total';  // Add your new metric

export interface DailyMetric {
  id: string;
  metric_date: string;
  metric_type: 'count' | 'average' | 'percentage' | 'aggregate';
  metric_category: MetricCategory;
  value: number;
  metadata: Record<string, any>;
  collection_timestamp: string;
  created_at: string;
}
```

### Step 4: Update Query Functions

Add query functions for the new metric in `client/src/lib/analytics.ts`:

```typescript
export async function fetchLikesData(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('metric_date, value')
    .eq('metric_category', 'likes_total')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (error) throw error;

  return data.map(item => ({
    date: item.metric_date,
    likes: item.value
  }));
}
```

### Step 5: Update Dashboard UI

Add the new metric to the analytics dashboard:

```typescript
// In your dashboard component
const [likesData, setLikesData] = useState<any[]>([]);

useEffect(() => {
  async function loadLikesData() {
    const data = await fetchLikesData(30);
    setLikesData(data);
  }
  loadLikesData();
}, []);

// Render in UI
<div className="metric-card">
  <h3>Total Likes</h3>
  <p className="metric-value">{likesData[likesData.length - 1]?.likes || 0}</p>
</div>
```

### Step 6: Create Migration

Create a new migration file for the changes:

```bash
# Create migration file
cd supabase/migrations
touch $(date +%Y%m%d%H%M%S)_add_likes_metric.sql
```

```sql
-- Add metric definition
INSERT INTO metric_definitions (
  metric_type,
  metric_category,
  display_name,
  description,
  unit,
  aggregation_method
) VALUES (
  'count',
  'likes_total',
  'Total Likes',
  'Total number of likes across all posts',
  'likes',
  'sum'
);

-- Update collection function
CREATE OR REPLACE FUNCTION collect_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  metric_category TEXT,
  value NUMERIC,
  metadata JSONB
) AS $$
BEGIN
  -- Include all existing metrics plus new one
  -- (Full function body here)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 7: Test the New Metric

```sql
-- Test collection for today
SELECT * FROM collect_daily_metrics(CURRENT_DATE);

-- Verify the new metric appears
SELECT * FROM daily_metrics 
WHERE metric_category = 'likes_total'
ORDER BY metric_date DESC
LIMIT 5;
```

### Step 8: Backfill Historical Data

If you need historical data for the new metric:

```sql
-- Backfill from earliest date
SELECT * FROM backfill_daily_metrics(
  start_date := (SELECT MIN(created_at::DATE) FROM post_likes),
  end_date := CURRENT_DATE
);
```

### Step 9: Update Documentation

Update the metrics list in `docs/features/analytics/README.md`:

```markdown
## Current Metrics

| Metric Category | Type | Description |
|----------------|------|-------------|
| `users_total` | count | Total registered users |
| `posts_total` | count | Total posts created |
| `comments_total` | count | Total comments created |
| `posts_created` | count | Posts created on that specific day |
| `comments_created` | count | Comments created on that specific day |
| `likes_total` | count | Total likes across all posts |
```

## Metric Type Examples

### Count Metric (Simple)

```sql
-- Total count of records
RETURN QUERY
SELECT 
  'metric_name'::TEXT,
  COUNT(*)::NUMERIC,
  jsonb_build_object('source', 'table_name')
FROM table_name
WHERE created_at::DATE <= target_date;
```

### Count Metric (Daily)

```sql
-- Count for specific day
RETURN QUERY
SELECT 
  'metric_name_daily'::TEXT,
  COUNT(*)::NUMERIC,
  jsonb_build_object('date', target_date)
FROM table_name
WHERE created_at::DATE = target_date;
```

### Average Metric

```sql
-- Average value
RETURN QUERY
SELECT 
  'avg_metric_name'::TEXT,
  AVG(column_name)::NUMERIC,
  jsonb_build_object(
    'min', MIN(column_name),
    'max', MAX(column_name)
  )
FROM table_name
WHERE created_at::DATE <= target_date;
```

### Percentage Metric

```sql
-- Percentage calculation
RETURN QUERY
SELECT 
  'percentage_metric'::TEXT,
  (COUNT(*) FILTER (WHERE condition) * 100.0 / NULLIF(COUNT(*), 0))::NUMERIC,
  jsonb_build_object(
    'numerator', COUNT(*) FILTER (WHERE condition),
    'denominator', COUNT(*)
  )
FROM table_name
WHERE created_at::DATE <= target_date;
```

### Aggregate Metric (Complex)

```sql
-- Multiple aggregations
RETURN QUERY
SELECT 
  'complex_metric'::TEXT,
  SUM(value_column)::NUMERIC,
  jsonb_build_object(
    'count', COUNT(*),
    'avg', AVG(value_column),
    'min', MIN(value_column),
    'max', MAX(value_column),
    'stddev', STDDEV(value_column)
  )
FROM table_name
WHERE created_at::DATE <= target_date;
```

## Best Practices

### Naming Conventions

- **Category names**: Use snake_case (e.g., `posts_total`, `avg_engagement_rate`)
- **Suffixes**: 
  - `_total` for cumulative counts
  - `_created` for daily counts
  - `_avg` for averages
  - `_rate` for percentages

### Performance Considerations

1. **Use indexes** on date columns:
```sql
CREATE INDEX IF NOT EXISTS idx_table_created_at 
ON table_name(created_at);
```

2. **Limit data scanned**:
```sql
-- Good: Uses date filter
WHERE created_at::DATE <= target_date

-- Bad: Scans all rows
WHERE id IS NOT NULL
```

3. **Use appropriate data types**:
```sql
-- Use NUMERIC for precision
COUNT(*)::NUMERIC

-- Use REAL for approximate values
AVG(value)::REAL
```

### Metadata Usage

Store additional context in the metadata field:

```sql
jsonb_build_object(
  'collection_date', target_date,
  'source_table', 'posts',
  'filters_applied', 'published_only',
  'data_quality', 'high',
  'notes', 'Excludes deleted posts'
)
```

### Error Handling

Add error handling for complex metrics:

```sql
BEGIN
  RETURN QUERY
  SELECT 
    'metric_name'::TEXT,
    COALESCE(COUNT(*), 0)::NUMERIC,
    jsonb_build_object('status', 'success')
  FROM table_name
  WHERE created_at::DATE <= target_date;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail entire collection
  RAISE WARNING 'Failed to collect metric_name: %', SQLERRM;
  RETURN QUERY
  SELECT 
    'metric_name'::TEXT,
    0::NUMERIC,
    jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
```

## Testing Checklist

- [ ] Metric definition added to `metric_definitions`
- [ ] Collection function updated and tested
- [ ] TypeScript types updated
- [ ] Query functions implemented
- [ ] Dashboard UI updated
- [ ] Migration file created
- [ ] Manual collection test passed
- [ ] Backfill completed (if needed)
- [ ] Documentation updated
- [ ] Performance validated (< 100ms query time)

## Common Issues

### Issue: Metric not appearing in results

**Solution**: Check that the metric category matches exactly:
```sql
-- Check definition
SELECT * FROM metric_definitions WHERE metric_category = 'your_metric';

-- Check collection
SELECT * FROM daily_metrics WHERE metric_category = 'your_metric';
```

### Issue: Duplicate metrics

**Solution**: Ensure UNIQUE constraint is working:
```sql
-- Check for duplicates
SELECT metric_date, metric_category, COUNT(*)
FROM daily_metrics
GROUP BY metric_date, metric_category
HAVING COUNT(*) > 1;
```

### Issue: Slow collection

**Solution**: Add indexes and optimize query:
```sql
-- Add index
CREATE INDEX idx_table_date ON table_name(created_at);

-- Use EXPLAIN to analyze
EXPLAIN ANALYZE
SELECT COUNT(*) FROM table_name WHERE created_at::DATE <= CURRENT_DATE;
```

## Examples from Production

### Example 1: User Engagement Rate

```sql
-- Add to collect_daily_metrics()
RETURN QUERY
SELECT 
  'user_engagement_rate'::TEXT,
  (COUNT(DISTINCT user_id) * 100.0 / 
   NULLIF((SELECT COUNT(*) FROM profiles WHERE created_at::DATE <= target_date), 0))::NUMERIC,
  jsonb_build_object(
    'active_users', COUNT(DISTINCT user_id),
    'total_users', (SELECT COUNT(*) FROM profiles WHERE created_at::DATE <= target_date)
  )
FROM posts
WHERE created_at::DATE = target_date;
```

### Example 2: Average Comments Per Post

```sql
RETURN QUERY
SELECT 
  'avg_comments_per_post'::TEXT,
  (COUNT(c.*) / NULLIF(COUNT(DISTINCT p.id), 0))::NUMERIC,
  jsonb_build_object(
    'total_comments', COUNT(c.*),
    'total_posts', COUNT(DISTINCT p.id)
  )
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
WHERE p.created_at::DATE <= target_date;
```

## Related Documentation

- [Analytics System README](./README.md) - System overview
- [Backfill Guide](./BACKFILL_GUIDE.md) - Running backfill
- [Testing Guide](./TESTING_GUIDE.md) - Testing procedures

## Support

For questions or issues:
1. Review the examples above
2. Check the design document for architecture details
3. Test with a single date before full backfill
4. Consult the troubleshooting section in the main README
