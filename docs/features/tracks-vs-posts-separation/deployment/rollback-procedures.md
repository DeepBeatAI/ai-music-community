# Rollback Procedures: Tracks vs Posts Separation

## Document Information
- **Feature**: Tracks vs Posts Separation
- **Version**: 1.0
- **Created**: January 2025
- **Status**: Production Ready

## Overview

This document provides detailed rollback procedures for the tracks-posts separation migration. Use these procedures if critical issues are encountered during or after deployment.

---

## Rollback Decision Criteria

### When to Rollback

**Initiate rollback immediately if:**

1. **Critical Data Loss**
   - Audio posts missing after migration
   - Tracks not created properly
   - Playlist data corrupted

2. **System Failure**
   - Migration fails with unrecoverable errors
   - Database becomes unresponsive
   - Application crashes repeatedly

3. **Performance Degradation**
   - Query times exceed 500ms consistently
   - Database CPU usage >90% sustained
   - User-facing errors >10% of requests

4. **Data Integrity Issues**
   - Orphaned audio posts (track_id NULL)
   - Invalid foreign key references
   - Constraint violations preventing operations

### When NOT to Rollback

**Do NOT rollback for:**
- Minor performance issues (<20% degradation)
- Individual user reports (investigate first)
- Non-critical errors affecting <5% of users
- Cosmetic UI issues

---

## Rollback Methods

### Method 1: Database Restore (Recommended)

**Use when:** Complete rollback needed, backup available  
**Duration:** 15-30 minutes  
**Risk:** Low (restores to known good state)

### Method 2: Reverse Migrations

**Use when:** Partial rollback needed, specific migration failed  
**Duration:** 20-40 minutes  
**Risk:** Medium (manual SQL execution)

### Method 3: Manual Data Cleanup

**Use when:** Minor data issues, most migration successful  
**Duration:** 30-60 minutes  
**Risk:** High (requires careful manual intervention)

---

## Method 1: Full Database Restore

### Prerequisites

- [ ] Database backup file available
- [ ] Backup verified and readable
- [ ] Application can be stopped temporarily
- [ ] Team notified of rollback

### Step 1: Stop Application (5 minutes)


```bash
# Put application in maintenance mode
# This prevents new data from being created during rollback

# Option 1: Via Vercel (if using)
vercel env add MAINTENANCE_MODE true

# Option 2: Via environment variable
# Set NEXT_PUBLIC_MAINTENANCE_MODE=true in Vercel dashboard
```

**Verify application stopped:**
- Check application returns maintenance page
- Verify no new database writes occurring
- Monitor active connections

### Step 2: Verify Backup (2 minutes)

```bash
# Check backup file exists and is recent
ls -lh backup_pre_migration_*.sql

# Verify backup is from before migration
head -n 50 backup_pre_migration_*.sql | grep "PostgreSQL database dump"

# Check backup size (should be reasonable for your data)
du -h backup_pre_migration_*.sql
```

### Step 3: Restore Database (10-15 minutes)

```bash
# Connect to production database
export DATABASE_URL="your_production_database_url"

# Restore from backup
psql $DATABASE_URL < backup_pre_migration_YYYYMMDD_HHMMSS.sql

# Monitor restoration progress
# (In separate terminal)
watch -n 5 'psql $DATABASE_URL -c "SELECT COUNT(*) FROM posts"'
```

**Expected output:**
- Restoration completes without errors
- Table counts match pre-migration snapshot
- No constraint violations

### Step 4: Verify Restoration (5 minutes)

```sql
-- Connect to database
psql $DATABASE_URL

-- Verify posts table structure (should NOT have track_id)
\d posts
-- Expected: No track_id column

-- Verify audio posts have audio_* columns
SELECT 
  id, 
  audio_url, 
  audio_filename, 
  audio_duration
FROM posts
WHERE post_type = 'audio'
LIMIT 5;
-- Expected: Data present in audio_* columns

-- Verify playlist_tracks references posts (old structure)
SELECT 
  pt.id,
  pt.track_id,
  p.id as post_id,
  p.post_type
FROM playlist_tracks pt
JOIN posts p ON pt.track_id = p.id
LIMIT 5;
-- Expected: track_id references posts.id

-- Check data counts match pre-migration
SELECT 
  (SELECT COUNT(*) FROM posts WHERE post_type = 'audio') as audio_posts,
  (SELECT COUNT(*) FROM playlist_tracks) as playlist_tracks;
-- Expected: Matches pre-migration snapshot
```

### Step 5: Restart Application (3 minutes)

```bash
# Remove maintenance mode
vercel env rm MAINTENANCE_MODE

# Or update environment variable
# Set NEXT_PUBLIC_MAINTENANCE_MODE=false

# Trigger redeployment if needed
vercel --prod
```

**Verify application:**
- Application loads normally
- Audio posts display correctly
- Playlists work properly
- No errors in logs

### Step 6: Post-Rollback Verification (5 minutes)

```bash
# Test critical functionality
# 1. Load feed with audio posts
# 2. Play audio from post
# 3. View playlist
# 4. Play audio from playlist
# 5. Create new audio post (if safe)
```

**Monitor for 30 minutes:**
- Error rates return to normal
- Performance metrics stable
- User activity resumes normally

---

## Method 2: Reverse Migrations

### Use Case

When you need to rollback specific migrations but keep some changes.

### Reverse Migration Scripts

#### Rollback Migration 4

```sql
-- File: rollback_004_finalize.sql
BEGIN;

-- Remove constraint
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS audio_posts_must_have_track;

-- Remove comments from deprecated columns
COMMENT ON COLUMN public.posts.audio_url IS NULL;
COMMENT ON COLUMN public.posts.audio_filename IS NULL;
COMMENT ON COLUMN public.posts.audio_duration IS NULL;
COMMENT ON COLUMN public.posts.audio_file_size IS NULL;
COMMENT ON COLUMN public.posts.audio_mime_type IS NULL;

-- Drop indexes (optional, for complete rollback)
DROP INDEX IF EXISTS idx_tracks_user_id;
DROP INDEX IF EXISTS idx_tracks_created_at;
DROP INDEX IF EXISTS idx_tracks_is_public;

COMMIT;
```

#### Rollback Migration 3

```sql
-- File: rollback_003_playlist_references.sql
BEGIN;

-- This is complex - requires restoring original playlist_tracks data
-- ONLY use if you have backup of original playlist_tracks

-- Drop current foreign key
ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

-- Restore original references (from backup)
-- This step requires manual data restoration

-- Add back original foreign key to posts
ALTER TABLE public.playlist_tracks
  ADD CONSTRAINT playlist_tracks_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.posts(id) 
    ON DELETE CASCADE;

COMMIT;
```

#### Rollback Migration 2

```sql
-- File: rollback_002_data_migration.sql
BEGIN;

-- Remove track_id references from posts
UPDATE public.posts 
SET track_id = NULL 
WHERE post_type = 'audio';

-- Delete migrated tracks
-- CAUTION: This deletes track data
-- Only run if you're sure tracks were created by migration
DELETE FROM public.tracks
WHERE created_at >= (
  SELECT MIN(created_at) 
  FROM public.posts 
  WHERE post_type = 'audio'
);

-- Verify audio_* columns still have data
SELECT COUNT(*) 
FROM posts 
WHERE post_type = 'audio' 
  AND audio_url IS NOT NULL;
-- Expected: All audio posts

COMMIT;
```

#### Rollback Migration 1

```sql
-- File: rollback_001_schema_prep.sql
BEGIN;

-- Drop foreign key constraint
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS posts_track_id_fkey;

-- Drop index
DROP INDEX IF EXISTS idx_posts_track_id;

-- Drop track_id column
ALTER TABLE public.posts 
  DROP COLUMN IF EXISTS track_id;

-- Revert tracks table changes
ALTER TABLE public.tracks
  DROP COLUMN IF EXISTS file_size,
  DROP COLUMN IF EXISTS mime_type;

COMMIT;
```

### Executing Reverse Migrations

```bash
# Run in reverse order (4, 3, 2, 1)

# Rollback Migration 4
psql $DATABASE_URL < rollback_004_finalize.sql

# Verify
psql $DATABASE_URL -c "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'posts' AND constraint_name = 'audio_posts_must_have_track';"
# Expected: Empty result

# Rollback Migration 3
psql $DATABASE_URL < rollback_003_playlist_references.sql

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM playlist_tracks pt JOIN posts p ON pt.track_id = p.id;"
# Expected: All playlist tracks reference posts

# Rollback Migration 2
psql $DATABASE_URL < rollback_002_data_migration.sql

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM posts WHERE post_type = 'audio' AND track_id IS NOT NULL;"
# Expected: 0

# Rollback Migration 1
psql $DATABASE_URL < rollback_001_schema_prep.sql

# Verify
psql $DATABASE_URL -c "\d posts" | grep track_id
# Expected: No output (column doesn't exist)
```

---

## Method 3: Manual Data Cleanup

### Use Case

When most of the migration succeeded but there are specific data issues.

### Common Cleanup Scenarios

#### Scenario 1: Orphaned Audio Posts

**Problem:** Some audio posts don't have track_id

**Solution:**
```sql
-- Identify orphaned posts
SELECT id, user_id, audio_url, audio_filename
FROM posts
WHERE post_type = 'audio' AND track_id IS NULL;

-- Create tracks for orphaned posts
INSERT INTO tracks (
  id, user_id, title, file_url, duration, 
  file_size, mime_type, is_public, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  p.user_id,
  COALESCE(p.audio_filename, 'Recovered Track'),
  p.audio_url,
  p.audio_duration,
  p.audio_file_size,
  p.audio_mime_type,
  TRUE,
  p.created_at,
  p.updated_at
FROM posts p
WHERE p.post_type = 'audio' 
  AND p.track_id IS NULL
  AND p.audio_url IS NOT NULL
RETURNING id, title;

-- Update posts with new track_id
UPDATE posts p
SET track_id = t.id
FROM tracks t
WHERE p.post_type = 'audio'
  AND p.track_id IS NULL
  AND p.audio_url = t.file_url
  AND p.user_id = t.user_id;

-- Verify fix
SELECT COUNT(*) FROM posts 
WHERE post_type = 'audio' AND track_id IS NULL;
-- Expected: 0
```

#### Scenario 2: Invalid Playlist References

**Problem:** Playlist tracks reference non-existent tracks

**Solution:**
```sql
-- Identify invalid references
SELECT pt.id, pt.playlist_id, pt.track_id
FROM playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM tracks WHERE id = pt.track_id
);

-- Option A: Remove invalid entries
DELETE FROM playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM tracks WHERE id = pt.track_id
);

-- Option B: Fix references (if you know correct track_id)
-- This requires manual mapping
UPDATE playlist_tracks
SET track_id = 'correct-track-id'
WHERE id = 'playlist-track-id';

-- Verify fix
SELECT COUNT(*) FROM playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM tracks WHERE id = pt.track_id
);
-- Expected: 0
```

#### Scenario 3: Duplicate Tracks

**Problem:** Same audio file created multiple tracks

**Solution:**
```sql
-- Identify duplicates
SELECT file_url, COUNT(*) as count, array_agg(id) as track_ids
FROM tracks
GROUP BY file_url
HAVING COUNT(*) > 1;

-- For each duplicate set, keep oldest track and update references
-- Example for one duplicate set:
WITH oldest_track AS (
  SELECT id
  FROM tracks
  WHERE file_url = 'duplicate-file-url'
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE posts
SET track_id = (SELECT id FROM oldest_track)
WHERE track_id IN (
  SELECT id FROM tracks 
  WHERE file_url = 'duplicate-file-url'
  AND id != (SELECT id FROM oldest_track)
);

-- Delete duplicate tracks
DELETE FROM tracks
WHERE file_url = 'duplicate-file-url'
  AND id != (SELECT id FROM oldest_track);

-- Repeat for each duplicate set
```

---

## Post-Rollback Actions

### 1. Incident Report

Document the rollback:
- **Trigger:** What caused the rollback
- **Timeline:** When issues started, when rollback initiated
- **Impact:** Users affected, data affected
- **Resolution:** Steps taken, current status
- **Root Cause:** Why migration failed
- **Prevention:** How to prevent in future

### 2. Data Verification

```sql
-- Run comprehensive checks
-- 1. Audio posts integrity
SELECT COUNT(*) as audio_posts,
  COUNT(CASE WHEN audio_url IS NOT NULL THEN 1 END) as with_audio
FROM posts
WHERE post_type = 'audio';

-- 2. Playlist integrity
SELECT COUNT(*) as playlist_tracks,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM posts WHERE id = playlist_tracks.track_id
  ) THEN 1 END) as valid_references
FROM playlist_tracks;

-- 3. User data integrity
SELECT user_id, COUNT(*) as post_count
FROM posts
WHERE post_type = 'audio'
GROUP BY user_id
ORDER BY post_count DESC
LIMIT 10;
```

### 3. Communication

**Internal:**
- Notify team of rollback completion
- Share incident report
- Schedule post-mortem meeting

**External (if needed):**
- Notify users of service restoration
- Apologize for any disruption
- Provide timeline for retry

### 4. Investigation

- Review migration logs
- Identify failure point
- Test fix in development
- Update migration scripts
- Plan retry deployment

---

## Rollback Testing

### Test Rollback in Development

**Before production deployment:**

```bash
# 1. Create test database with production-like data
# 2. Run migrations
# 3. Test rollback procedures
# 4. Verify data integrity
# 5. Document any issues
```

### Rollback Drill

Schedule regular rollback drills:
- Practice rollback procedures
- Time each step
- Identify bottlenecks
- Update documentation
- Train team members

---

## Emergency Contacts

**During Rollback:**
- **Database Admin**: [Contact]
- **DevOps Lead**: [Contact]
- **Product Owner**: [Contact]
- **On-Call Engineer**: [Contact]

**Escalation:**
1. On-call engineer (immediate)
2. Database admin (15 min)
3. DevOps lead (30 min)
4. Product owner (1 hour)

---

## Rollback Checklist

- [ ] Rollback decision made and documented
- [ ] Team notified
- [ ] Application stopped/maintenance mode
- [ ] Backup verified
- [ ] Rollback method selected
- [ ] Rollback executed
- [ ] Data integrity verified
- [ ] Application restarted
- [ ] Functionality tested
- [ ] Monitoring resumed
- [ ] Incident report created
- [ ] Post-mortem scheduled

---

*Rollback Procedures Version: 1.0*  
*Created: January 2025*  
*Status: Production Ready*
