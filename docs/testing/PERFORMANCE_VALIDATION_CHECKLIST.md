# Performance Validation Checklist

Use this checklist to validate that the analytics metrics system meets all performance requirements.

## Pre-Validation Setup

- [ ] Database migration applied (`20250113000000_analytics_metrics_complete.sql`)
- [ ] Metrics data exists (run backfill if needed)
- [ ] Environment variables configured
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Dependencies installed (`npm install` in client directory)

## Method 1: Automated TypeScript Tests (Recommended)

### Run Tests
```bash
npm run test:performance
```

### Expected Results
- [ ] Test 1: 30-day activity query - ✅ PASS (< 100ms)
- [ ] Test 2: Current metrics query - ✅ PASS (< 100ms)
- [ ] Test 3: Date range with filter - ✅ PASS (< 100ms)
- [ ] Test 4: Collection log query - ✅ PASS (< 100ms)
- [ ] Test 5: Aggregate metrics query - ✅ PASS (< 100ms)
- [ ] Test 6: Collection function - ✅ PASS (< 30s)
- [ ] Test 7: Concurrent queries - ✅ PASS (< 100ms avg)

### Success Criteria
- [ ] All 7 tests pass
- [ ] Success rate: 100%
- [ ] No errors or warnings
- [ ] Exit code: 0

## Method 2: SQL Performance Validation

### Run SQL Script
```bash
supabase db execute -f supabase/migrations/performance_validation.sql
```

### Check Results
- [ ] All EXPLAIN ANALYZE outputs show "Index Scan" (not "Seq Scan")
- [ ] Query execution times < 100ms
- [ ] Collection function completes in < 30s
- [ ] Index usage statistics show scans > 0
- [ ] No performance warnings or recommendations

### Key Metrics to Verify
- [ ] `idx_daily_metrics_date_type` is used
- [ ] `idx_daily_metrics_category` is used
- [ ] `idx_daily_metrics_collection` is used
- [ ] No missing indexes warnings
- [ ] Tables have been analyzed recently

## Method 3: Browser Performance Testing

### Dashboard Load Test
- [ ] Open Chrome DevTools (F12)
- [ ] Navigate to Analytics page
- [ ] Check Network tab:
  - [ ] DOMContentLoaded < 1s
  - [ ] Load complete < 2s
  - [ ] API requests < 100ms each
- [ ] No console errors
- [ ] Charts render smoothly

### Lighthouse Audit
- [ ] Run Lighthouse performance audit
- [ ] Performance score > 90
- [ ] Best Practices score > 90
- [ ] No performance warnings

### Visual Performance
- [ ] Page loads without blank states
- [ ] Loading indicators appear appropriately
- [ ] Transitions are smooth
- [ ] No layout shifts

## Method 4: Load Testing (Optional)

### Apache Bench Test
```bash
ab -n 100 -c 10 http://localhost:3000/api/analytics/metrics
```

### Expected Results
- [ ] 0 failed requests
- [ ] Average response time < 100ms
- [ ] 95th percentile < 200ms
- [ ] No timeout errors

## Database Health Checks

### Index Verification
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'daily_metrics';
```

- [ ] `daily_metrics_pkey` exists
- [ ] `unique_daily_metric` exists
- [ ] `idx_daily_metrics_date_type` exists
- [ ] `idx_daily_metrics_category` exists
- [ ] `idx_daily_metrics_collection` exists

### Table Statistics
```sql
SELECT 
  tablename,
  n_live_tup as row_count,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE tablename = 'daily_metrics';
```

- [ ] Row count > 0 (data exists)
- [ ] Last analyze is recent (< 7 days)
- [ ] No excessive dead rows

### Query Statistics
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE tablename = 'daily_metrics';
```

- [ ] All indexes show scans > 0
- [ ] Primary index has highest scan count
- [ ] No unused indexes

## Performance Optimization Checks

### Database Optimization
- [ ] ANALYZE has been run on all tables
- [ ] VACUUM has been run recently
- [ ] No table bloat detected
- [ ] Connection pooling configured

### Query Optimization
- [ ] Queries use indexed columns in WHERE clauses
- [ ] ORDER BY uses indexed columns
- [ ] LIMIT clauses used where appropriate
- [ ] No N+1 query patterns

### Application Optimization
- [ ] API responses are cached (if applicable)
- [ ] Bundle size is optimized
- [ ] Lazy loading implemented
- [ ] Error boundaries in place

## Troubleshooting Steps

### If Tests Fail

1. **Check Database Connection**
   - [ ] Verify environment variables
   - [ ] Test database connectivity
   - [ ] Check network latency

2. **Run Database Maintenance**
   ```sql
   ANALYZE daily_metrics;
   ANALYZE metric_collection_log;
   ANALYZE metric_definitions;
   ```
   - [ ] ANALYZE completed successfully
   - [ ] Re-run performance tests

3. **Verify Indexes**
   ```sql
   \d daily_metrics
   ```
   - [ ] All indexes exist
   - [ ] Indexes are valid
   - [ ] No duplicate indexes

4. **Check for Locks**
   ```sql
   SELECT * FROM pg_locks 
   WHERE relation = 'daily_metrics'::regclass;
   ```
   - [ ] No blocking locks
   - [ ] No long-running transactions

### If Queries Are Slow

- [ ] Run EXPLAIN ANALYZE on slow query
- [ ] Verify index is being used
- [ ] Check for sequential scans
- [ ] Review query plan
- [ ] Consider adding composite index

### If Collection Is Slow

- [ ] Check source table sizes
- [ ] Look for table locks
- [ ] Review aggregation queries
- [ ] Check for missing indexes on source tables
- [ ] Consider batch processing

## Documentation

### Record Baseline Metrics

After successful validation, record actual performance:

| Metric | Requirement | Actual | Status |
|--------|-------------|--------|--------|
| 30-day query | < 100ms | ___ ms | ⏳ |
| Current metrics | < 100ms | ___ ms | ⏳ |
| Date range query | < 100ms | ___ ms | ⏳ |
| Collection log | < 100ms | ___ ms | ⏳ |
| Aggregate query | < 100ms | ___ ms | ⏳ |
| Collection function | < 30s | ___ s | ⏳ |
| Dashboard load | < 2s | ___ s | ⏳ |
| Concurrent queries | < 100ms avg | ___ ms | ⏳ |

### Update Documentation

- [ ] Record baseline metrics in table above
- [ ] Document any issues encountered
- [ ] Note any optimizations applied
- [ ] Update performance guide if needed

## Final Validation

### All Tests Pass
- [ ] Automated TypeScript tests: 100% pass rate
- [ ] SQL validation: All queries optimized
- [ ] Browser testing: Performance scores > 90
- [ ] Load testing: No failures under load

### Performance Requirements Met
- [ ] Requirement 5.1: Query times < 100ms ✅
- [ ] Requirement 5.2: Indexes optimized ✅
- [ ] Requirement 5.3: Collection < 30s ✅
- [ ] Requirement 5.4: Dashboard load < 2s ✅

### Documentation Complete
- [ ] Baseline metrics recorded
- [ ] Performance guide reviewed
- [ ] Troubleshooting steps documented
- [ ] Monitoring plan established

## Sign-Off

- [ ] All performance tests pass
- [ ] All requirements satisfied
- [ ] Documentation complete
- [ ] Ready for production

**Validated By**: _______________  
**Date**: _______________  
**Notes**: _______________

---

**Next Steps**:
1. Set up continuous monitoring
2. Schedule regular performance reviews
3. Configure performance alerts
4. Mark Task 14 as complete

**References**:
- Performance Validation Guide: `docs/testing/PERFORMANCE_VALIDATION_GUIDE.md`
- Task Summary: `TASK_14_PERFORMANCE_VALIDATION.md`
- SQL Script: `supabase/migrations/performance_validation.sql`
- TypeScript Tests: `scripts/performance/validate-analytics-performance.ts`
