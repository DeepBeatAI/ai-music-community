# Quick Performance Test Reference

## Quick Start Guide

This is a condensed reference for quickly testing the performance indexes. For comprehensive documentation, see `performance-index-testing-guide.md`.

## Prerequisites

- Access to Supabase SQL Editor
- Migration `004_add_performance_indexes.sql` applied
- Some test data in the database

## Quick Test (5 minutes)

### 1. Verify Indexes Exist

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected Output**: Should see all indexes from the migration:
- idx_posts_created_at
- idx_posts_user_id_created_at
- idx_comments_post_id
- idx_comments_user_id
- idx_comments_parent_id
- idx_user_stats_followers
- idx_notifications_user_unread
- idx_notifications_user_created
- Plus additional indexes for likes, follows, activity feed

### 2. Test Key Queries

Run these 3 critical queries to verify performance:

#### Test A: Posts Feed (Most Common Query)
```sql
EXPLAIN ANALYZE
SELECT id, user_id, content, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 20;
```
✓ **Pass**: Should show "Index Scan using idx_posts_created_at"  
✓ **Target**: < 100ms execution time

#### Test B: Unread Notifications (Partial Index)
```sql
EXPLAIN ANALYZE
SELECT id, type, title, created_at
FROM notifications
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND read = false
ORDER BY created_at DESC;
```
✓ **Pass**: Should show "Index Scan using idx_notifications_user_unread"  
✓ **Target**: < 30ms execution time

#### Test C: Comments for Post
```sql
EXPLAIN ANALYZE
SELECT id, content, user_id, created_at
FROM comments
WHERE post_id = (SELECT id FROM posts LIMIT 1)
ORDER BY created_at ASC;
```
✓ **Pass**: Should show "Index Scan using idx_comments_post_id"  
✓ **Target**: < 50ms execution time

### 3. Check Index Usage Statistics

```sql
SELECT
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

**What to Look For**:
- Indexes with high scan counts are being used effectively
- Index sizes should be reasonable (typically < 1MB for small datasets)
- Zero scans might indicate unused indexes (check after some usage)

## Quick Troubleshooting

### Problem: "Seq Scan" instead of "Index Scan"

**Solution 1**: Update statistics
```sql
ANALYZE posts;
ANALYZE comments;
ANALYZE notifications;
ANALYZE user_stats;
```

**Solution 2**: Check if table is too small
- PostgreSQL may prefer sequential scan on small tables (< 1000 rows)
- This is actually optimal and not a problem

### Problem: Query still slow

**Check 1**: Verify index exists
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'your_table' AND indexname = 'your_index';
```

**Check 2**: Look for other bottlenecks in EXPLAIN ANALYZE
- Network latency
- Complex JOINs
- Large result sets without LIMIT

## Performance Benchmarks

| Query Type | Target | Good | Excellent |
|------------|--------|------|-----------|
| Feed queries | < 100ms | < 50ms | < 20ms |
| User queries | < 50ms | < 30ms | < 10ms |
| Comment queries | < 50ms | < 30ms | < 10ms |
| Notification queries | < 30ms | < 20ms | < 5ms |
| Like/follow checks | < 20ms | < 10ms | < 5ms |

## One-Line Health Check

Run this to get a quick overview of all index performance:

```sql
SELECT 
    relname AS tablename,
    COUNT(*) as index_count,
    SUM(idx_scan) as total_scans,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND indexrelname LIKE 'idx_%'
GROUP BY relname
ORDER BY total_scans DESC;
```

## Success Checklist

- [ ] All expected indexes exist
- [ ] Key queries use indexes (no Seq Scan on large tables)
- [ ] Query times meet performance targets
- [ ] Index sizes are reasonable
- [ ] No errors in EXPLAIN ANALYZE output

## Next Steps After Testing

1. ✓ Document results in `performance-index-testing-guide.md`
2. ✓ Monitor query performance in production
3. ✓ Set up alerts for slow queries
4. ✓ Schedule monthly VACUUM ANALYZE
5. ✓ Review index usage quarterly

---

**Quick Reference Version**: 1.0  
**For Full Documentation**: See `performance-index-testing-guide.md`
