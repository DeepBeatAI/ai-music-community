# Automated Performance Testing Guide

## Overview

This guide explains how to use the automated performance testing suite for the tracks-vs-posts-separation feature.

## Quick Start

### 1. Ensure Prerequisites

- ✅ Node.js installed (v18+)
- ✅ Supabase running locally or configured remotely
- ✅ Database seeded with test data
- ✅ Environment variables configured

### 2. Run Tests

**Option A: Using npm (recommended)**
```bash
cd client
npm run test:performance
```

**Option B: Using PowerShell (Windows)**
```powershell
.\scripts\testing\run-performance-tests.ps1
```

**Option C: Using Bash (Mac/Linux)**
```bash
bash scripts/testing/run-performance-tests.sh
```

**Option D: Direct execution**
```bash
node scripts/testing/performance-test-automation.js
```

## What Gets Tested

### 1. Query Performance (4 tests)
- ✅ Post fetching with tracks (target: <100ms)
- ✅ Playlist fetching with tracks (target: <100ms)
- ✅ User tracks fetching (target: <50ms)
- ✅ Search queries (target: <150ms)

### 2. Large Dataset Handling (4 tests)
- ✅ User with 100+ tracks (target: <2s)
- ✅ Playlist with 50+ tracks (target: <2s)
- ✅ Feed with 1000+ posts (target: <3s)
- ✅ User with 50+ posts (target: <3s)

### 3. N+1 Query Detection (3 tests)
- ✅ Post fetching (should use JOIN)
- ✅ Playlist fetching (should use JOIN)
- ✅ User tracks fetching (single query)

### 4. Database Optimization (1 test)
- ✅ Index verification on critical tables

## Understanding Results

### Console Output

```
🚀 Starting Performance Test Automation

============================================================
  Test 1: Query Performance with Joins
============================================================

✅ Post fetch with tracks: 85.23ms (target: <100ms)
✅ Playlist fetch with tracks: 92.15ms (target: <100ms)
✅ User tracks fetch: 42.08ms (target: <50ms)
✅ Search with tracks: 128.45ms (target: <150ms)
```

**Symbols:**
- ✅ = Test passed (within target)
- ❌ = Test failed (exceeded target)
- ⚠️ = Warning or manual check required

### Generated Reports

**JSON Report** (detailed data)
```
docs/features/tracks-vs-posts-separation/testing/
  test-performance-results-{timestamp}.json
```

**Markdown Report** (human-readable)
```
docs/features/tracks-vs-posts-separation/testing/
  test-performance-report-{date}.md
```

## Common Issues & Solutions

### Issue: "No data found" errors

**Problem:** Database is empty or has insufficient test data

**Solution:**
```bash
# Reset and seed database
supabase db reset

# Or manually seed test data
supabase db seed
```

### Issue: "Could not connect to Supabase"

**Problem:** Supabase is not running or URL is incorrect

**Solution:**
```bash
# Start local Supabase
supabase start

# Or check your .env.local configuration
cat client/.env.local
```

### Issue: "Missing indexes detected"

**Problem:** Required database indexes are not created

**Solution:**
The script will output SQL commands to create missing indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_posts_track_id ON posts(track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
```

Run these in Supabase SQL Editor or via migration.

### Issue: Tests fail with "exceeded target"

**Problem:** Queries are slower than performance targets

**Solutions:**
1. Check if indexes exist (see above)
2. Verify database has reasonable amount of data
3. Check system resources (CPU, memory)
4. Review query execution plans in Supabase Dashboard
5. Consider optimizing queries or adjusting targets

## Interpreting Performance Metrics

### Query Duration Benchmarks

| Query Type | Excellent | Good | Acceptable | Poor |
|------------|-----------|------|------------|------|
| Post fetch | <50ms | <100ms | <200ms | >200ms |
| Playlist fetch | <50ms | <100ms | <200ms | >200ms |
| User tracks | <25ms | <50ms | <100ms | >100ms |
| Search | <75ms | <150ms | <300ms | >300ms |

### Success Rate Interpretation

- **100%**: Perfect! All tests passed
- **90-99%**: Excellent, minor issues
- **75-89%**: Good, some optimization needed
- **50-74%**: Fair, significant optimization required
- **<50%**: Poor, major performance issues

## Best Practices

### 1. Run Tests Regularly

- ✅ After database schema changes
- ✅ After query optimizations
- ✅ Before deploying to production
- ✅ Weekly as part of maintenance

### 2. Maintain Test Data

- Keep database seeded with realistic data volumes
- Test with various data sizes (small, medium, large)
- Include edge cases (empty results, max limits)

### 3. Track Performance Over Time

- Save reports with timestamps
- Compare results across versions
- Monitor for performance regressions
- Document optimizations applied

### 4. Act on Results

- Fix failing tests before deploying
- Investigate warnings and manual checks
- Create indexes for missing ones
- Optimize slow queries

## Advanced Usage

### Running Specific Test Suites

Edit `performance-test-automation.js` and comment out unwanted tests:

```javascript
async function main() {
  // await testQueryPerformance();  // Skip this
  await testLargeDatasets();         // Run only this
  // await testNPlusOneQueries();    // Skip this
  // await testIndexes();            // Skip this
  
  generateReport();
}
```

### Customizing Performance Targets

Edit the `TARGETS` object in `performance-test-automation.js`:

```javascript
const TARGETS = {
  postFetch: 150,        // Increase to 150ms
  playlistFetch: 100,
  userTracks: 50,
  search: 200,           // Increase to 200ms
  // ...
};
```

### Adding Custom Tests

Add new test functions following this pattern:

```javascript
async function testMyFeature() {
  logSection('Test: My Feature');
  
  results.myFeature = await measureQuery(
    'My feature test',
    async () => {
      return await supabase
        .from('my_table')
        .select('*')
        .limit(10);
    },
    100  // Target in ms
  );
}
```

Then call it in `main()`:
```javascript
await testMyFeature();
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd client
          npm ci
          
      - name: Start Supabase
        run: |
          supabase start
          
      - name: Run performance tests
        run: |
          cd client
          npm run test:performance
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: docs/features/tracks-vs-posts-separation/testing/test-performance-*
```

## Troubleshooting

### Enable Debug Logging

Set environment variable for verbose output:
```bash
DEBUG=true node scripts/testing/performance-test-automation.js
```

### Check Supabase Logs

```bash
# View all logs
supabase logs

# View database logs only
supabase logs db

# Follow logs in real-time
supabase logs -f
```

### Verify Database Connection

```bash
# Test connection
curl http://127.0.0.1:54321/rest/v1/

# Check Supabase status
supabase status
```

## Related Documentation

- [Performance Testing Guide](./performance-testing-guide.md) - Manual testing procedures
- [Tracks vs Posts Separation Spec](../../../.kiro/specs/tracks-vs-posts-separation/)
- [Database Schema](../../../../supabase/migrations/)
- [README](../../../scripts/testing/README-performance-tests.md) - Technical details

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the console output for specific errors
3. Check generated reports for detailed information
4. Verify Supabase is running and accessible
5. Ensure database has test data

---

*Last Updated: October 2025*
