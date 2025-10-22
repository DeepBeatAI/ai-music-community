# Performance Testing - Quick Reference

## Run Tests

```bash
# Recommended: From client directory
cd client && npm run test:performance

# Windows PowerShell
.\scripts\testing\run-performance-tests.ps1

# Mac/Linux Bash
bash scripts/testing/run-performance-tests.sh

# Direct execution
node scripts/testing/performance-test-automation.js
```

## Check Results

```bash
# View latest markdown report
cat docs/features/tracks-vs-posts-separation/testing/test-performance-report-*.md | tail -n 100

# View latest JSON report
cat docs/features/tracks-vs-posts-separation/testing/test-performance-results-*.json
```

## Common Issues

### No data found
```bash
supabase db reset
```

### Can't connect to Supabase
```bash
supabase start
supabase status
```

### Missing indexes
```sql
-- Run in Supabase SQL Editor
CREATE INDEX IF NOT EXISTS idx_posts_track_id ON posts(track_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
```

## Performance Targets

| Test | Target |
|------|--------|
| Post fetch | < 100ms |
| Playlist fetch | < 100ms |
| User tracks | < 50ms |
| Search | < 150ms |

## Status Indicators

- ✅ = Passed (within target)
- ❌ = Failed (exceeded target)
- ⚠️ = Warning/manual check

## Report Locations

```
docs/features/tracks-vs-posts-separation/testing/
├── test-performance-results-{timestamp}.json
└── test-performance-report-{date}.md
```

## Documentation

- [User Guide](./guide-automated-performance-testing.md)
- [Technical README](../../../scripts/testing/README-performance-tests.md)
- [Manual Testing Guide](./performance-testing-guide.md)
- [Implementation Summary](./summary-automation-implementation.md)

---

*Quick Reference - October 2025*
