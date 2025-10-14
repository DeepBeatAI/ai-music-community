# Performance Index Testing Guide

## Overview

This document provides comprehensive instructions for testing the performance improvements achieved by adding database indexes to the AI Music Community Platform. The indexes optimize common query patterns for posts, comments, user statistics, and notifications.

## Requirements Addressed

- **Requirement 2.7**: Optimize posts queries by creation date
- **Requirement 2.8**: Optimize comments queries for posts
- **Requirement 2.9**: Optimize user statistics queries
- **Requirement 2.10**: Optimize unread notification queries

## Testing Methodology

### Phase 1: Baseline Performance Measurement (Before Indexes)

1. **Connect to Supabase Database**
   - Open Supabase Dashboard
   - Navigate to SQL Editor
   - Ensure you're connected to your project database

2. **Run Baseline Tests**
   - Execute each query from `004_test_performance_indexes.sql`
   - Record execution time from EXPLAIN ANALYZE output
   - Note the query plan (Sequential Scan vs Index Scan)
   - Document any performance bottlenecks

3. **Baseline Metrics Template**
   ```
   Test 1: Posts Feed Query
   - Execution Time: ___ ms
   - Query Plan: Sequential Scan / Index Scan
   - Rows Scanned: ___
   - Notes: ___
   ```

### Phase 2: Apply Performance Indexes

1. **Apply Migration**
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or apply via SQL Editor
   # Copy contents of 004_add_performance_indexes.sql
   # Execute in Supabase SQL Editor
   ```

2. **Verify Index Creation**
   ```sql
   -- Check all indexes were created
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename IN ('posts', 'comments', 'user_stats', 'notifications')
   ORDER BY tablename, indexname;
   ```

3. **Expected Indexes**
   - `idx_posts_created_at` - Posts ordered by date
   - `idx_posts_user_id_created_at` - User posts by date
   - `idx_comments_post_id` - Comments by post
   - `idx_comments_user_id` - Comments by user
   - `idx_comments_parent_id` - Nested replies
   - `idx_user_stats_followers` - User leaderboard
   - `idx_notifications_user_unread` - Unread notifications (partial)
   - `idx_notifications_user_created` - All notifications by date
   - Additional indexes for likes, follows, and activity feed

### Phase 3: Post-Index Performance Measurement

1. **Re-run All Test Queries**
   - Execute the same queries from Phase 1
   - Record new execution times
   - Verify index usage in query plans
   - Compare with baseline metrics

2. **Verify Index Usage**
   Look for these indicators in EXPLAIN ANALYZE output:
   - `Index Scan using idx_[name]` - Index is being used
   - `Bitmap Index Scan` - Index used for complex queries
   - Absence of `Seq Scan` on large tables - Good sign

3. **Performance Metrics Template**
   ```
   Test 1: Posts Feed Query
   - Before: ___ ms (Sequential Scan)
   - After: ___ ms (Index Scan using idx_posts_created_at)
   - Improvement: ___% faster
   - Status: ✓ Pass / ✗ Fail
   ```

## Detailed Test Cases

### Test 1: Posts Feed Query
**Purpose**: Verify feed queries are optimized  
**Expected Index**: `idx_posts_created_at`  
**Target Performance**: < 100ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT id, user_id, content, post_type, audio_url, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 20;
```

### Test 2: User Profile Posts
**Purpose**: Verify user-specific post queries are optimized  
**Expected Index**: `idx_posts_user_id_created_at`  
**Target Performance**: < 50ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT id, content, post_type, audio_url, created_at
FROM posts
WHERE user_id = '[user_id]'
ORDER BY created_at DESC
LIMIT 20;
```

### Test 3: Comments for Post
**Purpose**: Verify comment fetching is optimized  
**Expected Index**: `idx_comments_post_id`  
**Target Performance**: < 50ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT c.id, c.content, c.user_id, c.parent_comment_id, c.created_at
FROM comments c
WHERE c.post_id = '[post_id]'
ORDER BY c.created_at ASC;
```

### Test 4: Nested Replies
**Purpose**: Verify threaded comment queries are optimized  
**Expected Index**: `idx_comments_parent_id`  
**Target Performance**: < 30ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT id, content, user_id, created_at
FROM comments
WHERE parent_comment_id = '[comment_id]'
ORDER BY created_at ASC;
```

### Test 5: User Comments History
**Purpose**: Verify user comment queries are optimized  
**Expected Index**: `idx_comments_user_id`  
**Target Performance**: < 50ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT id, post_id, content, created_at
FROM comments
WHERE user_id = '[user_id]'
ORDER BY created_at DESC
LIMIT 20;
```

### Test 6: User Stats Leaderboard
**Purpose**: Verify leaderboard queries are optimized  
**Expected Index**: `idx_user_stats_followers`  
**Target Performance**: < 50ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT user_id, followers_count, posts_count, likes_received
FROM user_stats
ORDER BY followers_count DESC
LIMIT 20;
```

### Test 7: Unread Notifications (Critical)
**Purpose**: Verify unread notification queries use partial index  
**Expected Index**: `idx_notifications_user_unread` (partial)  
**Target Performance**: < 30ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT id, type, title, message, created_at
FROM notifications
WHERE user_id = '[user_id]'
  AND read = false
ORDER BY created_at DESC;
```

### Test 8: All User Notifications
**Purpose**: Verify notification feed queries are optimized  
**Expected Index**: `idx_notifications_user_created`  
**Target Performance**: < 50ms  
**Query**:
```sql
EXPLAIN ANALYZE
SELECT id, type, title, message, read, created_at
FROM notifications
WHERE user_id = '[user_id]'
ORDER BY created_at DESC
LIMIT 20;
```

## Performance Targets

| Query Type | Target Time | Expected Improvement |
|------------|-------------|---------------------|
| Feed queries | < 100ms | 30-50% faster |
| User-specific queries | < 50ms | 40-60% faster |
| Comment queries | < 50ms | 40-60% faster |
| Nested reply queries | < 30ms | 50-70% faster |
| Unread notifications | < 30ms | 50-70% faster |
| Like/follow checks | < 20ms | 60-80% faster |

## Success Criteria

### ✓ Pass Criteria
- All queries use appropriate indexes (no sequential scans on large tables)
- Query execution times meet or exceed performance targets
- Index sizes are reasonable (typically < 10% of table size)
- Partial indexes only contain relevant rows
- No degradation in write performance (INSERT/UPDATE/DELETE)

### ✗ Fail Criteria
- Queries still use sequential scans
- Execution times don't meet targets
- Index sizes are excessive (> 20% of table size)
- Write operations significantly slower (> 20% degradation)

## Troubleshooting

### Issue: Index Not Being Used

**Possible Causes**:
1. Statistics are outdated
2. Table is too small (PostgreSQL prefers seq scan)
3. Query doesn't match index structure

**Solutions**:
```sql
-- Update table statistics
ANALYZE posts;
ANALYZE comments;
ANALYZE user_stats;
ANALYZE notifications;

-- Force index usage for testing (not for production)
SET enable_seqscan = OFF;
-- Run your query
SET enable_seqscan = ON;
```

### Issue: Performance Not Improved

**Possible Causes**:
1. Wrong index type
2. Index not covering query columns
3. Other bottlenecks (network, CPU)

**Solutions**:
- Review EXPLAIN ANALYZE output for bottlenecks
- Check if query needs additional columns in index
- Consider composite indexes for multi-column queries

### Issue: Write Performance Degraded

**Possible Causes**:
1. Too many indexes on table
2. Large index sizes

**Solutions**:
- Remove unused indexes
- Consider partial indexes for specific use cases
- Monitor index usage with pg_stat_user_indexes

## Documentation Template

Use this template to document your performance testing results:

```markdown
# Performance Index Testing Results

## Test Date: [DATE]
## Tester: [NAME]
## Database: [PROJECT_NAME]

## Summary
- Total Tests: 14
- Tests Passed: __/14
- Average Improvement: ___%
- Overall Status: ✓ Pass / ✗ Fail

## Detailed Results

### Test 1: Posts Feed Query
- **Before**: ___ ms (Sequential Scan)
- **After**: ___ ms (Index Scan using idx_posts_created_at)
- **Improvement**: ___% faster
- **Status**: ✓ Pass / ✗ Fail
- **Notes**: ___

### Test 2: User Profile Posts
- **Before**: ___ ms
- **After**: ___ ms (Index Scan using idx_posts_user_id_created_at)
- **Improvement**: ___% faster
- **Status**: ✓ Pass / ✗ Fail
- **Notes**: ___

[Continue for all 14 tests...]

## Index Statistics

| Index Name | Table | Size | Rows Indexed |
|------------|-------|------|--------------|
| idx_posts_created_at | posts | ___ KB | ___ |
| idx_posts_user_id_created_at | posts | ___ KB | ___ |
| idx_comments_post_id | comments | ___ KB | ___ |
| ... | ... | ... | ... |

## Observations
- [Key findings]
- [Unexpected results]
- [Recommendations]

## Recommendations
- [Future optimizations]
- [Monitoring suggestions]
- [Maintenance tasks]

## Sign-off
- [ ] All tests completed
- [ ] Results documented
- [ ] Performance targets met
- [ ] No regressions identified
- [ ] Ready for production
```

## Monitoring and Maintenance

### Ongoing Monitoring

1. **Query Performance Dashboard**
   - Monitor slow queries in Supabase Dashboard
 
  - Set up alerts for queries exceeding thresholds
   - Review query patterns weekly

2. **Index Usage Statistics**
   ```sql
   -- Check which indexes are being used
   SELECT
       schemaname,
       relname AS tablename,
       indexrelname AS indexname,
       idx_scan as index_scans,
       idx_tup_read as tuples_read,
       idx_tup_fetch as tuples_fetched
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

3. **Unused Index Detection**
   ```sql
   -- Find indexes that are never used
   SELECT
       schemaname,
       relname AS tablename,
       indexrelname AS indexname,
       idx_scan
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
     AND idx_scan = 0
     AND indexrelname NOT LIKE '%_pkey';
   ```

### Maintenance Tasks

1. **Weekly**
   - Review slow query logs
   - Check index usage statistics
   - Monitor table growth

2. **Monthly**
   - Run VACUUM ANALYZE on all tables
   - Review and optimize underperforming queries
   - Check for index bloat

3. **Quarterly**
   - Full performance audit
   - Review and remove unused indexes
   - Consider new indexes based on query patterns

## Best Practices

### Index Design Principles

1. **Index Selectivity**: Indexes work best on columns with high cardinality
2. **Composite Indexes**: Order columns by selectivity (most selective first)
3. **Partial Indexes**: Use for queries with consistent WHERE clauses
4. **Index Size**: Keep indexes as small as possible (only necessary columns)

### Query Optimization Tips

1. **Use EXPLAIN ANALYZE**: Always test queries before deploying
2. **Avoid SELECT ***: Only select needed columns
3. **Use LIMIT**: Paginate large result sets
4. **Filter Early**: Apply WHERE clauses before JOINs when possible

### Common Pitfalls to Avoid

1. **Over-indexing**: Too many indexes slow down writes
2. **Duplicate Indexes**: Remove redundant indexes
3. **Ignoring Statistics**: Run ANALYZE regularly
4. **Not Monitoring**: Set up performance monitoring from day one

## Additional Resources

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [EXPLAIN ANALYZE Tutorial](https://www.postgresql.org/docs/current/using-explain.html)

## Appendix: Sample EXPLAIN ANALYZE Output

### Before Index (Sequential Scan)
```
Limit  (cost=0.00..1.50 rows=20 width=100) (actual time=0.045..2.123 rows=20 loops=1)
  ->  Seq Scan on posts  (cost=0.00..150.00 rows=2000 width=100) (actual time=0.044..2.089 rows=20 loops=1)
        Filter: (created_at IS NOT NULL)
Planning Time: 0.123 ms
Execution Time: 2.156 ms
```

### After Index (Index Scan)
```
Limit  (cost=0.28..1.50 rows=20 width=100) (actual time=0.012..0.234 rows=20 loops=1)
  ->  Index Scan using idx_posts_created_at on posts  (cost=0.28..122.28 rows=2000 width=100) (actual time=0.011..0.198 rows=20 loops=1)
Planning Time: 0.089 ms
Execution Time: 0.267 ms
```

**Analysis**: 
- Execution time improved from 2.156ms to 0.267ms (87% faster)
- Changed from Sequential Scan to Index Scan
- Index `idx_posts_created_at` is being used correctly

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Active  
**Related Files**: 
- `supabase/migrations/004_add_performance_indexes.sql`
- `supabase/migrations/004_test_performance_indexes.sql`
