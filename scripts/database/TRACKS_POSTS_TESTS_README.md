# Tracks-Posts Separation Schema Tests

## Overview

This directory contains comprehensive database schema tests for the tracks-posts separation feature. These tests verify that all schema changes have been applied correctly and that the database structure meets the requirements.

## Test Coverage

The test suite covers:

1. **Tracks Table Structure**
   - Verifies `file_size` and `mime_type` columns exist
   - Tests constraints (positive file_size values)
   - Validates all required columns are present

2. **Posts Table Changes**
   - Verifies `track_id` column exists
   - Confirms column is UUID type and nullable
   - Tests backward compatibility

3. **Foreign Key Relationship**
   - Verifies foreign key constraint exists
   - Tests constraint references tracks table correctly
   - Validates ON DELETE SET NULL behavior
   - Tests constraint enforcement (valid and invalid references)

4. **Indexes**
   - Verifies index on `posts.track_id` exists
   - Checks indexes on `tracks.user_id` and `tracks.is_public`

5. **RLS Policies**
   - Verifies RLS is enabled on tracks table
   - Checks all required policies exist
   - Validates policy definitions

## Running the Tests

### Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g @supabase/cli
   ```

2. **Supabase running locally**
   ```bash
   supabase start
   ```

### Option 1: Using the Test Script (Recommended)

**On Linux/Mac:**
```bash
chmod +x scripts/database/run-tracks-posts-tests.sh
./scripts/database/run-tracks-posts-tests.sh
```

**On Windows:**
```cmd
scripts\database\run-tracks-posts-tests.bat
```

The script will:
1. Reset the database (apply all migrations)
2. Run the test suite
3. Display results

### Option 2: Manual Execution

1. **Apply migrations:**
   ```bash
   supabase db reset
   ```

2. **Run tests:**
   ```bash
   supabase db execute --file scripts/database/test-tracks-posts-separation-schema.sql
   ```

### Option 3: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `test-tracks-posts-separation-schema.sql`
4. Paste and execute
5. Review the NOTICE messages for test results

## Understanding Test Results

### Success Output

All tests should show `PASS` status:
```
NOTICE:  TEST 1.1: PASS - Tracks table exists
NOTICE:  TEST 1.2: PASS - file_size column exists on tracks table
NOTICE:  TEST 1.3: PASS - mime_type column exists on tracks table
...
```

### Failure Output

If a test fails, you'll see:
```
ERROR:  TEST X.X: FAIL - [Description of what failed]
```

This indicates a schema issue that needs to be resolved.

### Skipped Tests

Some tests may be skipped if test data is unavailable:
```
NOTICE:  TEST X.X: SKIP - No test user available
```

This is normal and doesn't indicate a problem.

## Test Files

- `test-tracks-posts-separation-schema.sql` - Main test suite
- `run-tracks-posts-tests.sh` - Linux/Mac test runner
- `run-tracks-posts-tests.bat` - Windows test runner
- `TRACKS_POSTS_TESTS_README.md` - This file

## Troubleshooting

### "Supabase CLI is not installed"

Install the Supabase CLI:
```bash
npm install -g @supabase/cli
```

### "Supabase is not running"

Start Supabase locally:
```bash
supabase start
```

### "Migration already applied"

If you need to re-run migrations:
```bash
supabase db reset
```

This will reset the database and apply all migrations from scratch.

### Test Failures

If tests fail:

1. **Check migration files** - Ensure all migration files are present in `supabase/migrations/`
2. **Verify migration order** - Migrations should be applied in order
3. **Check for conflicts** - Look for conflicting schema changes
4. **Review error messages** - The test output will indicate what's wrong

## Integration with CI/CD

These tests can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Database Tests
  run: |
    supabase start
    ./scripts/database/run-tracks-posts-tests.sh
```

## Next Steps

After all tests pass:

1. Proceed with data migration (Phase 2)
2. Update TypeScript types (Phase 3)
3. Update application code (Phases 4-8)

## Requirements Mapping

These tests verify the following requirements:

- **Requirement 4.1**: Tracks table stores audio file metadata
- **Requirement 4.2**: Posts table references tracks via foreign key
- **Requirement 5.1**: Database schema changes are correct
- **Requirement 9.1**: RLS policies are properly configured
- **Requirement 9.4**: Comprehensive testing is implemented

## Support

If you encounter issues with the tests:

1. Check the test output for specific error messages
2. Review the migration files for syntax errors
3. Verify your Supabase version is up to date
4. Check the Supabase logs: `supabase logs`

---

*Last Updated: January 2025*
*Version: 1.0*
