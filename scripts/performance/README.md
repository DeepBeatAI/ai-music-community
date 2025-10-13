# Performance Validation Scripts

This directory contains scripts for validating the performance of the analytics metrics system.

## Scripts

### validate-analytics-performance.ts

Comprehensive TypeScript test suite that validates all performance requirements.

**Prerequisites**:
- Node.js and npm installed
- Supabase project configured
- Environment variables set

**Setup**:
```bash
# Install dependencies (from client directory)
cd client
npm install

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

**Usage**:
```bash
# From project root
npm run test:performance

# Or from client directory
cd client
npx ts-node ../scripts/performance/validate-analytics-performance.ts
```

**What it tests**:
1. 30-day activity data query (< 100ms)
2. Current metrics query (< 100ms)
3. Date range with filtering (< 100ms)
4. Collection log monitoring (< 100ms)
5. Aggregate metrics query (< 100ms)
6. Collection function execution (< 30s)
7. Concurrent query load test (10 simultaneous queries)

**Expected output**:
```
🚀 Starting Analytics Performance Validation
============================================================

📊 Test 1: Fetch 30 days of activity data
   Duration: 45.23ms
   Records: 60
   Status: ✅ PASS (threshold: 100ms)

...

📈 PERFORMANCE VALIDATION SUMMARY
============================================================
Total Tests: 7
✅ Passed: 7
❌ Failed: 0
Success Rate: 100.0%

🎉 All performance tests passed!
```

## Alternative Validation Methods

### SQL Validation

For direct database performance testing:

```bash
# Using Supabase CLI
supabase db execute -f supabase/migrations/performance_validation.sql

# Or using psql
psql $DATABASE_URL -f supabase/migrations/performance_validation.sql
```

### Browser Testing

1. Open Chrome DevTools
2. Navigate to Analytics page
3. Check Network tab for API response times
4. Run Lighthouse performance audit

### Load Testing

Using Apache Bench:

```bash
# Install Apache Bench
# macOS: brew install httpd
# Ubuntu: apt-get install apache2-utils

# Test analytics API endpoint
ab -n 100 -c 10 http://localhost:3000/api/analytics/metrics
```

## Performance Requirements

| Metric | Requirement | Target |
|--------|-------------|--------|
| Query times | < 100ms | All queries |
| Collection function | < 30s | Daily collection |
| Dashboard load | < 2s | Initial page load |
| Concurrent queries | < 100ms avg | 10 simultaneous |

## Troubleshooting

### Module not found errors

If you get `Cannot find module '@supabase/supabase-js'`:

```bash
# Run from client directory where dependencies are installed
cd client
npx ts-node ../scripts/performance/validate-analytics-performance.ts
```

### Environment variable errors

Ensure environment variables are set:

```bash
# Check if variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Set them if missing (use your actual values)
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Permission errors

Ensure the service role key has proper permissions:
- Read access to `daily_metrics` table
- Execute access to `collect_daily_metrics` function
- Read access to `metric_collection_log` table

## Documentation

For detailed performance validation guide, see:
- `docs/testing/PERFORMANCE_VALIDATION_GUIDE.md`

For task completion summary, see:
- `TASK_14_PERFORMANCE_VALIDATION.md`

## CI/CD Integration

To integrate into CI/CD pipeline:

```yaml
# .github/workflows/performance-tests.yml
- name: Run Performance Tests
  run: npm run test:performance
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Next Steps

1. Run initial validation
2. Document baseline metrics
3. Set up continuous monitoring
4. Schedule regular validation runs

---

**Last Updated**: January 2025  
**Requirements**: 5.1, 5.2, 5.3, 5.4
