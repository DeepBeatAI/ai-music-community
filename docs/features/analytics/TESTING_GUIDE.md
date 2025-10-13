# Analytics System Testing Guide

## Overview

This guide provides comprehensive testing procedures for the analytics metrics system, covering unit tests, integration tests, manual testing, and performance validation.

## Test Categories

### 1. Unit Tests
- Individual function testing
- Data transformation logic
- Error handling

### 2. Integration Tests
- Database operations
- API endpoint testing
- Data flow validation

### 3. End-to-End Tests
- Complete user workflows
- Dashboard functionality
- Real-world scenarios

### 4. Performance Tests
- Query performance
- Collection speed
- Dashboard load times

### 5. Manual Tests
- UI/UX validation
- Edge case exploration
- Cross-browser testing

## Running Automated Tests

### All Analytics Tests

```bash
cd client
npm test -- analytics
```

### Specific Test Suites

```bash
# Unit tests only
npm test -- analytics-api.test.ts

# Integration tests only
npm test -- analytics-collection.test.ts

# E2E tests only
npm test -- analytics-e2e.test.ts
```

### Watch Mode (Development)

```bash
npm test -- --watch analytics
```

### Coverage Report

```bash
npm test -- --coverage analytics
```

## Unit Test Coverage

### API Functions (`analytics-api.test.ts`)

Tests for TypeScript query functions:

- [ ] `fetchMetrics()` - Basic query
- [ ] `fetchMetrics()` - With date range
- [ ] `fetchMetrics()` - With specific categories
- [ ] `fetchMetrics()` - Error handling
- [ ] `fetchCurrentMetrics()` - Latest values
- [ ] `fetchCurrentMetrics()` - Missing data handling
- [ ] `fetchActivityData()` - 30-day default
- [ ] `fetchActivityData()` - Custom day range
- [ ] `triggerMetricCollection()` - Today
- [ ] `triggerMetricCollection()` - Specific date

**Run:**
```bash
npm test -- analytics-api.test.ts
```

### Collection Functions (`analytics-collection.test.ts`)

Tests for database collection logic:

- [ ] `collect_daily_metrics()` - Current date
- [ ] `collect_daily_metrics()` - Historical date
- [ ] `collect_daily_metrics()` - Idempotency
- [ ] `collect_daily_metrics()` - All metrics present
- [ ] `backfill_daily_metrics()` - Date range
- [ ] `backfill_daily_metrics()` - Large range
- [ ] Metric definitions exist
- [ ] Collection logs created

**Run:**
```bash
npm test -- analytics-collection.test.ts
```

## Integration Test Coverage

### End-to-End Flow (`analytics-e2e.test.ts`)

Tests complete workflows:

- [ ] Collect → Query → Display flow
- [ ] Backfill → Verify → Query flow
- [ ] Error handling across layers
- [ ] Data consistency checks
- [ ] Performance benchmarks

**Run:**
```bash
npm test -- analytics-e2e.test.ts
```

### Test Scenarios

#### Scenario 1: Fresh Collection
```typescript
test('Fresh collection creates all metrics', async () => {
  // 1. Trigger collection
  await triggerMetricCollection();
  
  // 2. Verify metrics exist
  const metrics = await fetchMetrics({
    startDate: today,
    endDate: today
  });
  
  // 3. Assert all 5 metrics present
  expect(metrics).toHaveLength(5);
});
```

#### Scenario 2: Historical Backfill
```typescript
test('Backfill populates historical data', async () => {
  // 1. Run backfill
  const result = await supabase.rpc('backfill_daily_metrics', {
    start_date: '2024-01-01',
    end_date: '2024-01-07'
  });
  
  // 2. Verify date coverage
  const metrics = await fetchMetrics({
    startDate: '2024-01-01',
    endDate: '2024-01-07'
  });
  
  // 3. Assert 7 days × 5 metrics = 35 records
  expect(metrics).toHaveLength(35);
});
```

#### Scenario 3: Dashboard Load
```typescript
test('Dashboard loads metrics efficiently', async () => {
  const startTime = Date.now();
  
  // 1. Load current metrics
  const current = await fetchCurrentMetrics();
  
  // 2. Load activity data
  const activity = await fetchActivityData(30);
  
  const loadTime = Date.now() - startTime;
  
  // 3. Assert performance
  expect(loadTime).toBeLessThan(2000); // < 2 seconds
  expect(current).toBeDefined();
  expect(activity).toHaveLength(30);
});
```

## Manual Testing Procedures

### Test 1: Database Schema Validation

**Objective**: Verify all database objects exist

**Steps:**
1. Connect to database
2. Run validation query:
```sql
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name IN ('daily_metrics', 'metric_definitions', 'metric_collection_log')) as tables,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'daily_metrics') as indexes,
  (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('collect_daily_metrics', 'backfill_daily_metrics')) as functions;
```

**Expected Result:**
- tables: 3
- indexes: 3
- functions: 2

### Test 2: Manual Collection

**Objective**: Verify collection function works

**Steps:**
1. Run collection:
```sql
SELECT * FROM collect_daily_metrics(CURRENT_DATE);
```

2. Verify results:
```sql
SELECT * FROM daily_metrics 
WHERE metric_date = CURRENT_DATE
ORDER BY metric_category;
```

**Expected Result:**
- 5 rows returned (one per metric)
- All values > 0 (assuming data exists)
- collection_timestamp is recent

### Test 3: Backfill Validation

**Objective**: Verify backfill works correctly

**Steps:**
1. Run backfill for small range:
```sql
SELECT * FROM backfill_daily_metrics(
  start_date := CURRENT_DATE - INTERVAL '7 days',
  end_date := CURRENT_DATE
);
```

2. Check results:
```sql
SELECT 
  metric_date,
  COUNT(*) as metric_count
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY metric_date
ORDER BY metric_date;
```

**Expected Result:**
- 8 dates (7 days + today)
- 5 metrics per date
- No gaps in dates

### Test 4: API Function Testing

**Objective**: Verify TypeScript functions work

**Steps:**
1. Open browser console on analytics page
2. Test each function:
```javascript
// Test 1: Current metrics
const current = await fetchCurrentMetrics();
console.log('Current:', current);

// Test 2: Activity data
const activity = await fetchActivityData(7);
console.log('Activity:', activity);

// Test 3: Custom query
const metrics = await fetchMetrics({
  startDate: '2025-01-01',
  endDate: '2025-01-07',
  categories: ['posts_created', 'comments_created']
});
console.log('Metrics:', metrics);
```

**Expected Result:**
- All functions return data
- No console errors
- Data structure matches types

### Test 5: Dashboard UI Testing

**Objective**: Verify dashboard displays correctly

**Steps:**
1. Navigate to analytics dashboard
2. Check each section:
   - [ ] Current metrics display
   - [ ] Activity chart renders
   - [ ] Data is accurate
   - [ ] Loading states work
   - [ ] Error states handled
3. Test interactions:
   - [ ] Refresh button works
   - [ ] Date range selector works
   - [ ] Chart tooltips display
4. Test responsive design:
   - [ ] Desktop view
   - [ ] Tablet view
   - [ ] Mobile view

**Expected Result:**
- All sections display correctly
- No visual glitches
- Interactions work smoothly
- Responsive on all devices

### Test 6: Performance Validation

**Objective**: Verify performance meets benchmarks

**Steps:**
1. Test collection speed:
```sql
EXPLAIN ANALYZE
SELECT * FROM collect_daily_metrics(CURRENT_DATE);
```

2. Test query speed:
```sql
EXPLAIN ANALYZE
SELECT * FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_date DESC;
```

3. Test dashboard load:
- Open DevTools Network tab
- Refresh analytics page
- Check load time

**Expected Result:**
- Collection: < 30 seconds
- Query: < 100ms
- Dashboard: < 2 seconds

### Test 7: Error Handling

**Objective**: Verify system handles errors gracefully

**Steps:**
1. Test invalid date:
```typescript
await triggerMetricCollection('invalid-date');
// Should throw error
```

2. Test missing data:
```sql
SELECT * FROM daily_metrics 
WHERE metric_date = '2020-01-01';
-- Should return empty, not error
```

3. Test network failure:
- Disconnect network
- Try to load dashboard
- Should show error message

**Expected Result:**
- Errors caught and handled
- User-friendly error messages
- System remains stable

### Test 8: Security Validation

**Objective**: Verify RLS policies work

**Steps:**
1. Test read access (should work):
```sql
SET ROLE anon;
SELECT * FROM daily_metrics LIMIT 1;
RESET ROLE;
```

2. Test write access (should fail):
```sql
SET ROLE anon;
INSERT INTO daily_metrics (metric_date, metric_type, metric_category, value)
VALUES (CURRENT_DATE, 'count', 'test', 1);
RESET ROLE;
```

**Expected Result:**
- Read succeeds
- Write fails with permission error

## Performance Testing

### Load Testing

Test system under load:

```bash
# Install k6 (load testing tool)
brew install k6

# Run load test
k6 run load-test.js
```

**load-test.js:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
};

export default function() {
  let res = http.get('https://your-app.com/api/analytics/current');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

### Database Performance

Test query performance:

```sql
-- Test 1: Simple query
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM daily_metrics
WHERE metric_date = CURRENT_DATE;

-- Test 2: Range query
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_date DESC;

-- Test 3: Aggregation
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  metric_category,
  AVG(value) as avg_value
FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY metric_category;
```

**Expected Results:**
- Index scans (not sequential scans)
- Execution time < 100ms
- Reasonable buffer usage

## Regression Testing

### Before Each Release

Run complete test suite:

```bash
# 1. Run all automated tests
npm test -- analytics

# 2. Run performance validation
cd scripts/performance
npx tsx validate-analytics-performance.ts

# 3. Manual smoke tests
# - Load dashboard
# - Trigger collection
# - Verify data accuracy

# 4. Check logs
# - No errors in collection logs
# - Performance within benchmarks
```

### Test Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Performance benchmarks met
- [ ] Manual tests completed
- [ ] No console errors
- [ ] No database errors
- [ ] Documentation updated

## Continuous Monitoring

### Daily Checks

```sql
-- Check today's collection
SELECT * FROM metric_collection_log
WHERE collection_date = CURRENT_DATE;

-- Verify metrics collected
SELECT COUNT(*) FROM daily_metrics
WHERE metric_date = CURRENT_DATE;
-- Expected: 5
```

### Weekly Checks

```sql
-- Check collection success rate
SELECT 
  COUNT(*) as total_collections,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*), 2) as success_rate
FROM metric_collection_log
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days';

-- Check for missing dates
SELECT generate_series(
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE,
  '1 day'::interval
)::date AS expected_date
EXCEPT
SELECT DISTINCT metric_date FROM daily_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days';
```

## Troubleshooting Test Failures

### Test Fails: "No metrics found"

**Cause**: Database empty or collection not run

**Solution:**
```bash
# Run backfill
cd scripts
npx tsx backfill-analytics.ts
```

### Test Fails: "Timeout"

**Cause**: Slow query or database overload

**Solution:**
1. Check database performance
2. Verify indexes exist
3. Increase test timeout

### Test Fails: "Permission denied"

**Cause**: RLS policy blocking access

**Solution:**
1. Check RLS policies
2. Verify service role key is set
3. Use correct authentication

## Related Documentation

- [Analytics System README](./README.md)
- [Backfill Guide](./BACKFILL_GUIDE.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Performance Validation Guide](../../../docs/testing/PERFORMANCE_VALIDATION_GUIDE.md)

## Test Results

Document test results:

**Date**: _____________  
**Tester**: _____________  
**Version**: _____________

**Results:**
- [ ] All automated tests passed
- [ ] Manual tests completed
- [ ] Performance validated
- [ ] No critical issues found

**Notes**: _____________________________________________
