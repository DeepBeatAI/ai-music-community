# Analytics Metrics System - Quick Reference

## 📁 Key Files

### Main Migration (Consolidated)
```
20250113000000_analytics_metrics_complete.sql
```
**Use for:** Fresh installations, reference documentation, complete system overview

### Original Migrations (Already Applied)
```
20250111000000_create_analytics_metrics_tables.sql
20250111000001_create_collect_daily_metrics_function.sql
20250111000002_create_backfill_daily_metrics_function.sql
20250111000003_seed_metric_definitions.sql
```
**Status:** Already applied to database

### Documentation
```
ANALYTICS_MIGRATION_GUIDE.md - Complete usage guide
TASK_12_COMPLETION_SUMMARY.md - Implementation summary
```

### Validation
```
validate_analytics_migration.sql - System validation script
```

## 🚀 Quick Commands

### Collect Today's Metrics
```sql
SELECT * FROM collect_daily_metrics();
```

### Backfill Last 30 Days
```sql
SELECT * FROM backfill_daily_metrics(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);
```

### View Recent Metrics
```sql
SELECT metric_date, metric_category, value
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY metric_date DESC, metric_category;
```

### Check Collection Status
```sql
SELECT collection_date, status, metrics_collected, 
       started_at, completed_at
FROM metric_collection_log
ORDER BY started_at DESC
LIMIT 5;
```

### View Metric Definitions
```sql
SELECT display_name, description, unit, format_pattern
FROM metric_definitions
WHERE is_active = true
ORDER BY metric_category;
```

## 📊 System Components

### Tables (3)
- `daily_metrics` - Daily metric snapshots
- `metric_definitions` - Metric metadata
- `metric_collection_log` - Collection monitoring

### Functions (2)
- `collect_daily_metrics(date)` - Collect metrics
- `backfill_daily_metrics(start, end)` - Backfill range

### Indexes (5)
- Date range queries
- Category lookups
- Collection monitoring

### RLS Policies (6)
- Public read access
- Service role management

### Metrics (5)
- users_total
- posts_total
- comments_total
- posts_created
- comments_created

## 🔍 Troubleshooting

### No metrics collected?
```sql
-- Check source data
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM tracks;
SELECT COUNT(*) FROM comments;
```

### Collection failed?
```sql
-- Check error logs
SELECT * FROM metric_collection_log
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### Slow queries?
```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days';
```

## 📖 Full Documentation

See `ANALYTICS_MIGRATION_GUIDE.md` for:
- Installation instructions
- Complete usage examples
- Performance tuning
- Adding new metrics
- Troubleshooting guide

## ✅ Validation

Run validation script:
```sql
-- Copy and paste contents of validate_analytics_migration.sql
-- into Supabase SQL editor
```

Expected output: All checks with ✓ symbols

---

**Quick Reference Version:** 1.0  
**Last Updated:** 2025-01-13
