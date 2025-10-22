# Performance Test Automation

Automated performance testing suite for the tracks-vs-posts-separation feature.

## Overview

This automation script runs comprehensive performance tests based on the testing guide at `docs/features/tracks-vs-posts-separation/testing/performance-testing-guide.md`.

## Features

- ✅ Automated query performance testing
- ✅ Large dataset testing
- ✅ N+1 query detection
- ✅ Database index verification
- ✅ JSON and Markdown report generation
- ✅ Cross-platform support (Windows/Mac/Linux)

## Prerequisites

1. **Node.js** installed (v18 or higher)
2. **Supabase** running locally or remote instance configured
3. **Environment variables** set up in `client/.env.local`

## Quick Start

### Option 1: Using npm scripts (from client directory)

```bash
cd client
npm run test:performance
```

### Option 2: Using PowerShell script (Windows)

```powershell
.\scripts\testing\run-performance-tests.ps1
```

### Option 3: Using Bash script (Mac/Linux)

```bash
bash scripts/testing/run-performance-tests.sh
```

### Option 4: Direct execution

```bash
node scripts/testing/performance-test-automation.js
```

## Configuration

The script uses environment variables from `client/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For local development, defaults to:
- URL: `http://127.0.0.1:54321`
- Anon Key: Local Supabase default key

## Test Coverage

### 1. Query Performance Tests
- Post fetching with tracks (target: <100ms)
- Playlist fetching with tracks (target: <100ms)
- User tracks fetching (target: <50ms)
- Search queries with tracks (target: <150ms)

### 2. Large Dataset Tests
- User with 100+ tracks (target: <2s)
- Playlist with 50+ tracks (target: <2s)
- Feed with 1000+ posts (target: <3s)
- User with 50+ posts (target: <3s)

### 3. N+1 Query Detection
- Post fetching (should use single JOIN)
- Playlist fetching (should use single JOIN)
- User tracks fetching (should be single query)

### 4. Database Optimization
- Index verification on critical columns
- Missing index detection
- Optimization recommendations

## Output

### Console Output
Real-time test results with:
- ✅ Pass/fail indicators
- ⏱️ Execution times
- 📊 Performance metrics
- ⚠️ Warnings and recommendations

### JSON Report
Detailed results saved to:
```
docs/features/tracks-vs-posts-separation/testing/test-performance-results-{timestamp}.json
```

### Markdown Report
Human-readable report saved to:
```
docs/features/tracks-vs-posts-separation/testing/test-performance-report-{date}.md
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Post fetch | < 100ms |
| Playlist fetch | < 100ms |
| User tracks | < 50ms |
| Search | < 150ms |
| Feed page load | < 3s |
| Playlist page load | < 2s |
| Track library load | < 2s |

## Troubleshooting

### "Could not connect to Supabase"
- Ensure Supabase is running: `supabase start`
- Check your `.env.local` configuration
- Verify network connectivity

### "No data found" errors
- Seed your database with test data
- Run migrations: `supabase db reset`
- Check RLS policies are not blocking queries

### Missing indexes detected
The script will output SQL commands to create missing indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_posts_track_id ON posts(track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
-- etc.
```

Run these in your Supabase SQL editor.

### Permission errors (Unix)
Make scripts executable:
```bash
chmod +x scripts/testing/run-performance-tests.sh
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Performance Tests
  run: |
    npm run test:performance
  working-directory: ./client
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Extending the Tests

To add new performance tests, edit `performance-test-automation.js`:

1. Add test function:
```javascript
async function testNewFeature() {
  logSection('Test: New Feature');
  
  results.newFeature = await measureQuery(
    'New feature test',
    async () => {
      return await supabase.from('table').select('*');
    },
    TARGET_MS
  );
}
```

2. Call in `main()`:
```javascript
await testNewFeature();
```

3. Update report generation to include new results

## Related Documentation

- [Performance Testing Guide](../../docs/features/tracks-vs-posts-separation/testing/performance-testing-guide.md)
- [Tracks vs Posts Separation Spec](.kiro/specs/tracks-vs-posts-separation/)
- [Database Schema](../../supabase/migrations/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the performance testing guide
3. Check Supabase logs: `supabase logs`
4. Review generated reports for specific error messages

---

*Last Updated: January 2025*
