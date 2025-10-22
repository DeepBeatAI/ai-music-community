# Migration Testing Guide: Tracks vs Posts Separation

## Overview

This guide provides step-by-step instructions for testing the data migration from posts to tracks. The migration consists of three main SQL scripts that must be run in sequence.

## Prerequisites

- Supabase CLI installed and configured
- Local development database running
- Access to production database (for production migration)
- Backup of database before migration

## Migration Scripts

1. **002_migrate_audio_posts_to_tracks.sql** - Migrates audio post data to tracks table
2. **003_update_playlist_track_references.sql** - Updates playlist references to use tracks
3. **verify-tracks-posts-migration.sql** - Verification queries

## Testing Procedure

### Phase 1: Pre-Migration Preparation

#### Step 1: Start Local Supabase

```bash
cd ai-music-community
supabase start
```

#### Step 2: Run Baseline Queries

Run the pre-migration baseline queries from `verify-tracks-posts-migration.sql`:

```bash
# Connect to local database
supabase db reset

# Run baseline queries (Query 1-4)
psql postgresql://postgres:postgres@localhost:54322/postgres -f scripts/database/verify-tracks-posts-migration.sql
```

Record the baseline counts:
- Audio posts count: _____
- Existing tracks count: _____
- Playlist tracks count: _____

#### Step 3: Create Test Data (if needed)

If your local database doesn't have test data, create some:

```sql
-- Insert test audio posts
INSERT INTO public.posts (user_id, content, post_type, audio_url, audio_filename, audio_duration, audio_file_size, audio_mime_type)
VALUES 
  (auth.uid(), 'Test audio post 1', 'audio', 'test-audio-1.mp3', 'Test Track 1', 180, 5242880, 'audio/mpeg'),
  (auth.uid(), 'Test audio post 2', 'audio', 'test-audio-2.mp3', 'Test Track 2', 240, 7340032, 'audio/mpeg');
```

### Phase 2: Run Migration 002

#### Step 1: Apply Migration

```bash
# Apply migration 002
supabase migration up --file 20250122000002_migrate_audio_posts_to_tracks.sql
```

#### Step 2: Check Migration Output

Look for these success messages in the output:
- ✓ "Total tracks in database: X"
- ✓ "Audio posts with track_id: X"
- ✓ "Verification passed: All audio posts have track_id"
- ✓ "Track integrity verification passed"
- ✓ "Migration completed successfully"

#### Step 3: Run Verification Queries

```bash
# Run post-migration verification (Query 5-13)
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT 
  'Orphaned Audio Posts' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM public.posts
WHERE post_type = 'audio' AND track_id IS NULL;
"
```

Expected result: 0 orphaned posts

#### Step 4: Verify Track Data

```bash
# Check track data integrity
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT 
  p.id as post_id,
  p.audio_url as post_audio_url,
  t.id as track_id,
  t.file_url as track_file_url,
  t.title as track_title
FROM public.posts p
INNER JOIN public.tracks t ON p.track_id = t.id
WHERE p.post_type = 'audio'
LIMIT 5;
"
```

Verify that:
- post_audio_url matches track_file_url
- track_title is populated
- All posts have valid track_id

### Phase 3: Run Migration 003

#### Step 1: Apply Migration

```bash
# Apply migration 003
supabase migration up --file 20250122000003_update_playlist_track_references.sql
```

#### Step 2: Check Migration Output

Look for these success messages:
- ✓ "Prerequisite check passed: All audio posts have track_id"
- ✓ "Created mapping table with X entries"
- ✓ "Created backup of X playlist_tracks entries"
- ✓ "Updated playlist_tracks: X of X now reference tracks"
- ✓ "Verification passed: All playlist_tracks reference valid tracks"
- ✓ "Dropped old foreign key constraint"
- ✓ "Added new foreign key constraint to tracks table"
- ✓ "Migration completed successfully"

#### Step 3: Verify Playlist References

```bash
# Check playlist integrity
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT 
  COUNT(*) as invalid_refs
FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
);
"
```

Expected result: 0 invalid references

### Phase 4: Comprehensive Verification

#### Step 1: Run All Verification Queries

```bash
# Run complete verification suite
psql postgresql://postgres:postgres@localhost:54322/postgres -f scripts/database/verify-tracks-posts-migration.sql > migration-verification-results.txt
```

#### Step 2: Review Results

Check the output file for:
- ✓ All "PASS" statuses
- ⚠ Review any "WARNING" statuses
- ✗ Investigate any "FAIL" statuses

#### Step 3: Run Summary Report

```bash
# Get migration summary
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT 
  json_build_object(
    'total_audio_posts', (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio'),
    'posts_with_tracks', (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NOT NULL),
    'orphaned_posts', (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NULL),
    'total_tracks', (SELECT COUNT(*) FROM public.tracks),
    'invalid_playlist_refs', (
      SELECT COUNT(*) FROM public.playlist_tracks pt
      WHERE NOT EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id)
    ),
    'migration_success', (
      SELECT CASE 
        WHEN (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NULL) = 0
         AND (SELECT COUNT(*) FROM public.playlist_tracks pt WHERE NOT EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id)) = 0
        THEN true
        ELSE false
      END
    )
  ) as summary;
"
```

### Phase 5: Test Rollback (Optional)

**WARNING: Only test rollback on a separate test database!**

#### Step 1: Create Rollback Script

```sql
-- rollback-migration.sql
BEGIN;

-- Rollback migration 003
ALTER TABLE public.playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

-- Rollback migration 002
UPDATE public.posts SET track_id = NULL WHERE post_type = 'audio';
DELETE FROM public.tracks WHERE created_at >= '[MIGRATION_START_TIME]';

COMMIT;
```

#### Step 2: Test Rollback

```bash
# Apply rollback
psql postgresql://postgres:postgres@localhost:54322/postgres -f rollback-migration.sql
```

#### Step 3: Verify Rollback

```bash
# Check that track_id is NULL
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NOT NULL;
"
```

Expected result: 0 (all track_id should be NULL after rollback)

## Testing Checklist

### Pre-Migration
- [ ] Database backup created
- [ ] Baseline counts recorded
- [ ] Test data created (if needed)
- [ ] Migration scripts reviewed

### Migration 002
- [ ] Migration applied successfully
- [ ] No orphaned audio posts
- [ ] All tracks have valid data
- [ ] Track counts match audio post counts
- [ ] Sample data verified

### Migration 003
- [ ] Migration applied successfully
- [ ] No invalid playlist references
- [ ] Foreign key constraints updated
- [ ] Playlist integrity verified
- [ ] Sample playlist data checked

### Post-Migration
- [ ] All verification queries pass
- [ ] Summary report shows success
- [ ] No data loss detected
- [ ] Performance acceptable
- [ ] Documentation updated

### Rollback Testing (Optional)
- [ ] Rollback script created
- [ ] Rollback tested on separate database
- [ ] Rollback verification passed
- [ ] Re-migration tested after rollback

## Common Issues and Solutions

### Issue 1: Orphaned Audio Posts

**Symptom:** Query 5 shows orphaned audio posts (count > 0)

**Cause:** Some audio posts don't have valid audio_url

**Solution:**
```sql
-- Find problematic posts
SELECT id, user_id, audio_url, content
FROM public.posts
WHERE post_type = 'audio' AND track_id IS NULL;

-- Option 1: Delete invalid posts
DELETE FROM public.posts
WHERE post_type = 'audio' AND (audio_url IS NULL OR audio_url = '');

-- Option 2: Convert to text posts
UPDATE public.posts
SET post_type = 'text'
WHERE post_type = 'audio' AND (audio_url IS NULL OR audio_url = '');
```

### Issue 2: Invalid Playlist References

**Symptom:** Query 9 shows invalid playlist references

**Cause:** Playlist references posts that don't exist or aren't audio posts

**Solution:**
```sql
-- Find problematic playlist entries
SELECT pt.id, pt.playlist_id, pt.track_id
FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
);

-- Remove invalid entries
DELETE FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
);
```

### Issue 3: Duplicate Tracks

**Symptom:** Query 14 shows duplicate tracks

**Cause:** Same audio file uploaded multiple times

**Solution:**
```sql
-- Find duplicates
SELECT file_url, user_id, COUNT(*) as count
FROM public.tracks
GROUP BY file_url, user_id
HAVING COUNT(*) > 1;

-- Keep oldest, update references, delete duplicates
-- (Manual process - review each case)
```

### Issue 4: Migration Timeout

**Symptom:** Migration takes too long or times out

**Cause:** Large dataset

**Solution:**
```sql
-- Run migration in batches
-- Modify migration script to process in chunks:
INSERT INTO public.tracks (...)
SELECT ...
FROM public.posts p
WHERE p.post_type = 'audio'
  AND p.created_at < '2024-01-01'  -- Process by date range
  AND NOT EXISTS (...);
```

## Performance Benchmarks

Expected migration times (approximate):

| Records | Migration 002 | Migration 003 | Total |
|---------|---------------|---------------|-------|
| 100     | < 1 second    | < 1 second    | < 2s  |
| 1,000   | 1-2 seconds   | 1-2 seconds   | 2-4s  |
| 10,000  | 5-10 seconds  | 5-10 seconds  | 10-20s|
| 100,000 | 30-60 seconds | 30-60 seconds | 1-2m  |

## Production Migration Plan

### Pre-Production
1. Test on staging environment
2. Verify all tests pass
3. Create production backup
4. Schedule maintenance window
5. Notify users of downtime

### Production Execution
1. Enable maintenance mode
2. Create database backup
3. Run migration 002
4. Verify migration 002
5. Run migration 003
6. Verify migration 003
7. Run full verification suite
8. Test application functionality
9. Disable maintenance mode
10. Monitor for issues

### Post-Production
1. Monitor error logs
2. Check performance metrics
3. Verify user reports
4. Keep backup for 7 days
5. Document any issues

## Support and Troubleshooting

If you encounter issues during migration:

1. **Stop immediately** - Don't proceed if verification fails
2. **Check logs** - Review migration output for error messages
3. **Run diagnostics** - Use troubleshooting queries (Query 22-24)
4. **Consider rollback** - If issues are severe
5. **Document issue** - Record error messages and data state
6. **Seek help** - Consult with team or database expert

## Success Criteria

Migration is considered successful when:

- ✓ All audio posts have track_id
- ✓ All playlist_tracks reference valid tracks
- ✓ No data loss detected
- ✓ Foreign key constraints in place
- ✓ Application functions correctly
- ✓ Performance is acceptable
- ✓ No error logs related to migration

## Next Steps

After successful migration:

1. Monitor application for 24-48 hours
2. Run migration 004 to add constraints
3. Update application code to use new structure
4. Plan for removing deprecated columns (migration 005)
5. Update documentation

---

**Document Version:** 1.0  
**Last Updated:** January 22, 2025  
**Related Files:**
- `supabase/migrations/20250122000002_migrate_audio_posts_to_tracks.sql`
- `supabase/migrations/20250122000003_update_playlist_track_references.sql`
- `scripts/database/verify-tracks-posts-migration.sql`
