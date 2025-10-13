# Analytics Performance Validation Guide

## Overview

This guide provides instructions for validating that the analytics metrics system meets all performance requirements specified in the design document.

## Performance Requirements

### Query Performance (Requirement 5.1, 5.2)
- **30-day activity query**: < 100ms
- **Current metrics query**: < 100ms
- **Date range queries**: < 100ms
- **Collection log queries**: < 100ms
- **Aggregate queries**: < 100ms

### Collection Performance (Requirement 5.3)
- **Daily collection function**: < 30 seconds
- **Backfill operations**: Reasonable batch processing time

### Dashboard Performance (Requirement 5.4)
- **Page load time**: < 2 seconds
- **Concurrent query handling**: No performance degradation

## Validation Methods

### Method 1: SQL Performance Validation

Run the SQL performance validation script directly in the database:

```bash
# Using Supabase CLI
supabase db execute -f supabase/migrations/performance_validation.sql

# Or using psql
psql $DATABASE_URL -f supabase/migrations/performance_validation.sql
```

**What it tests:**
- EXPLAIN ANALYZE for all key query patterns
- Collection function execution time
- Index usage statistics
- Table statistics and health
- Performance recommendations

**Expected output:**
- All queries should show index scans (not sequential scans)
- Execution times should be under 100ms
- Collection function should complete in < 30s

### Method 2: TypeScript Performance Tests

Run the comprehensive TypeScript performance validation:

```bash
# From project root
cd scripts/performance
npx ts-node validate-analytics-performance.ts

# Or add to package.json scripts:
npm run test:performance
```

**What it tests:**
1. 30-day activity data query
2. Current metrics query
3. Date range with filtering
4. Collection log monitoring
5. Aggregate metrics query
6. Collection function execution
7. Concurrent query load test (10 simultaneous queries)

**Expected output:**
```
🚀 Starting Analytics Performance Validation
============================================================

📊 Test 1: Fetch 30 days of activity data
   Duration: 45.23ms
   Records: 60
   Status: ✅ PASS (threshold: 100ms)

📊 Test 2: Fetch current metrics
   Duration: 32.15ms
   Records: 3
   Status: ✅ PASS (threshold: 100ms)

...

📈 PERFORMANCE VALIDATION SUMMARY
============================================================
Total Tests: 7
✅ Passed: 7
❌ Failed: 0
Success Rate: 100.0%
```

### Method 3: Browser Performance Testing

Test dashboard load performance in the browser:

1. **Open Chrome DevTools**
   - Navigate to Analytics page
   - Open DevTools (F12)
   - Go to Network tab
   - Reload page (Ctrl+R)

2. **Check Performance Metrics**
   - **DOMContentLoaded**: Should be < 1s
   - **Load**: Should be < 2s
   - **API requests**: Should complete in < 100ms each

3. **Use Lighthouse**
   - Open DevTools > Lighthouse tab
   - Run performance audit
   - Target scores:
     - Performance: > 90
     - Best Practices: > 90

### Method 4: Load Testing

Test system behavior under concurrent load:

```bash
# Install Apache Bench (if not installed)
# macOS: brew install httpd
# Ubuntu: apt-get install apache2-utils

# Test analytics API endpoint
ab -n 100 -c 10 http://localhost:3000/api/analytics/metrics

# Expected:
# - No failed requests
# - Average response time < 100ms
# - 95th percentile < 200ms
```

## Performance Optimization Checklist

### Database Optimization

- [ ] **Indexes are created and used**
  ```sql
  -- Verify indexes exist
  SELECT indexname, indexdef 
  FROM pg_indexes 
  WHERE tablename = 'daily_metrics';
  ```

- [ ] **Tables are analyzed**
  ```sql
  -- Run ANALYZE to update statistics
  ANALYZE daily_metrics;
  ANALYZE metric_collection_log;
  ANALYZE metric_definitions;
  ```

- [ ] **Vacuum is performed regularly**
  ```sql
  -- Check last vacuum time
  SELECT 
    schemaname, 
    tablename, 
    last_vacuum, 
    last_autovacuum
  FROM pg_stat_user_tables
  WHERE tablename IN ('daily_metrics', 'metric_collection_log');
  ```

### Query Optimization

- [ ] **Use covering indexes**
  - Queries should use index-only scans when possible
  - Check EXPLAIN output for "Index Only Scan"

- [ ] **Limit result sets**
  - Use LIMIT for queries that don't need all results
  - Implement pagination for large datasets

- [ ] **Avoid N+1 queries**
  - Batch related queries
  - Use JOINs or single queries with filters

### Application Optimization

- [ ] **Implement caching**
  - Browser caching for static assets
  - API response caching (5-10 minutes)
  - CDN caching for public data

- [ ] **Use connection pooling**
  - Supabase client uses connection pooling by default
  - Verify pool settings in Supabase dashboard

- [ ] **Optimize bundle size**
  - Check Next.js bundle analyzer
  - Lazy load components when possible

## Troubleshooting Performance Issues

### Slow Queries

**Symptom**: Queries taking > 100ms

**Diagnosis**:
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days';

-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

**Solutions**:
1. Ensure indexes exist: `\d daily_metrics`
2. Run ANALYZE: `ANALYZE daily_metrics;`
3. Check for missing WHERE clauses
4. Consider adding composite indexes

### Slow Collection Function

**Symptom**: Collection taking > 30 seconds

**Diagnosis**:
```sql
-- Check source table sizes
SELECT 
  'posts' as table_name,
  COUNT(*) as row_count
FROM posts
UNION ALL
SELECT 
  'comments',
  COUNT(*)
FROM comments;

-- Check for locks
SELECT * FROM pg_locks 
WHERE relation = 'daily_metrics'::regclass;
```

**Solutions**:
1. Optimize source queries with indexes
2. Check for table locks or long-running transactions
3. Consider batch processing for large datasets
4. Review aggregation logic for efficiency

### High Memory Usage

**Symptom**: Database or application using excessive memory

**Diagnosis**:
```sql
-- Check query memory usage
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Solutions**:
1. Add LIMIT clauses to queries
2. Implement pagination
3. Use streaming for large result sets
4. Optimize JOIN operations

### Concurrent Query Issues

**Symptom**: Performance degrades with multiple users

**Diagnosis**:
- Monitor connection pool usage
- Check for connection leaks
- Review query locking behavior

**Solutions**:
1. Increase connection pool size (if needed)
2. Implement query result caching
3. Use read replicas for read-heavy workloads
4. Optimize slow queries first

## Performance Monitoring

### Continuous Monitoring

Set up ongoing performance monitoring:

1. **Database Monitoring**
   - Use Supabase dashboard metrics
   - Monitor query performance over time
   - Set up alerts for slow queries

2. **Application Monitoring**
   - Use Vercel Analytics
   - Monitor API response times
   - Track user-perceived performance

3. **Custom Metrics**
   ```typescript
   // Track query performance in application
   const startTime = performance.now();
   const data = await fetchMetrics(params);
   const duration = performance.now() - startTime;
   
   if (duration > 100) {
     console.warn('Slow query detected:', duration, 'ms');
   }
   ```

### Performance Benchmarks

Establish baseline performance metrics:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| 30-day query | < 100ms | ___ ms | ⏳ |
| Current metrics | < 100ms | ___ ms | ⏳ |
| Collection function | < 30s | ___ s | ⏳ |
| Dashboard load | < 2s | ___ s | ⏳ |
| Concurrent queries | < 100ms avg | ___ ms | ⏳ |

Update this table after running validation tests.

## Validation Schedule

### Initial Validation
- Run all tests before marking task complete
- Document baseline performance metrics
- Address any failing tests

### Ongoing Validation
- **Weekly**: Quick performance check during development
- **Monthly**: Full performance validation suite
- **After major changes**: Targeted performance tests
- **Before releases**: Complete validation

## Success Criteria

Performance validation is successful when:

- ✅ All SQL queries complete in < 100ms
- ✅ Collection function completes in < 30s
- ✅ Dashboard loads in < 2s
- ✅ Concurrent queries maintain performance
- ✅ Indexes are used effectively
- ✅ No performance warnings or recommendations
- ✅ All automated tests pass

## Next Steps

After successful validation:

1. Document baseline metrics
2. Set up continuous monitoring
3. Configure performance alerts
4. Schedule regular performance reviews
5. Mark task 14 as complete

## Resources

- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/sql-explain.html)
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Performance Best Practices](https://web.dev/performance/)

---

**Last Updated**: January 2025  
**Requirements**: 5.1, 5.2, 5.3, 5.4
