# Migration Execution Guide: Tracks vs Posts Separation

## Document Information
- **Feature**: Tracks vs Posts Separation
- **Version**: 1.0
- **Created**: January 2025
- **Status**: Production Ready

## Overview

This guide provides detailed instructions for executing the database migrations that separate tracks from posts. Follow these steps carefully to ensure a successful deployment.

---

## Migration Files Overview

### Migration Sequence

1. **20250122000000_prepare_tracks_posts_separation.sql**
   - Duration: 2-3 minutes
   - Impact: Non-breaking schema changes
   - Adds track_id column to posts
   - Creates indexes

2. **20250122000002_migrate_audio_posts_to_tracks.sql**
   - Duration: 15-25 minutes (data-dependent)
   - Impact: Data migration
   - Creates tracks from audio posts
   - Updates post references

3. **20250122000003_update_playlist_track_references.sql**
   - Duration: 8-12 minutes
   - Impact: Updates playlist references
   - Changes foreign key constraints
   - Updates playlist_tracks table

4. **20250122000004_finalize_tracks_posts_separation.sql**
   - Duration: 2-3 minutes
   - Impact: Adds constraints
   - Finalizes schema changes
   - Marks deprecated columns

**Total Expected Duration**: 30-45 minutes

---

## Pre-Migration Requirements

### 1. Database Backup

**CRITICAL: Create backup before starting**

```bash
# Via Supabase CLI
supabase db dump -f backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Or via Supabase Dashboard
# 1. Go to Database > Backups
# 2. Click "Create Backup"
# 3. Download backup file
```

**Verify backup:**
```bash
# Check file size (should be >1MB for production)
ls -lh backup_pre_migration_*.sql

# Verify file is readable
head -n 20 backup_pre_migration_*.sql
```

### 2. Environment Verification

```bash
# Check Supabase connection
supabase status

# Verify you're connected to production
supabase db remote list

# Check current migration status
supabase migration list
```

### 3. Pre-Migration Data Snapshot

```sql
-- Run these queries and save results for comparison

-- Count audio posts
SELECT COUNT(*) as audio_post_count 
FROM posts 
WHERE post_type = 'audio';

-- Count existing tracks
SELECT COUNT(*) as existing_track_count 
FROM tracks;

-- Count playlist tracks
SELECT COUNT(*) as playlist_track_count 
FROM playlist_tracks;

-- Sample audio post data
SELECT id, user_id, audio_url, audio_filename, created_at
FROM posts
WHERE post_type = 'audio'
LIMIT 5;
```

---

## Migration Execution

### Migration 1: Schema Preparation

**File**: `20250122000000_prepare_tracks_posts_separation.sql`

**What it does:**
- Adds `track_id` column to posts table (nullable)
- Creates index on `track_id`
- Adds foreign key constraint (not validated yet)
- Updates tracks table structure

**Execute:**
```bash
# Apply migration
supabase db push
```

**Verify:**
```sql
-- Check track_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'posts' AND column_name = 'track_id';
-- Expected: track_id | uuid | YES

-- Check index created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'posts' AND indexname = 'idx_posts_track_id';
-- Expected: Index exists

-- Check foreign key constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'posts' AND constraint_name = 'posts_track_id_fkey';
-- Expected: posts_track_id_fkey | FOREIGN KEY
```

**Expected Results:**
- ✅ Column added successfully
- ✅ Index created
- ✅ Foreign key constraint added
- ✅ No errors in logs

**If errors occur:**
- Check error message in migration output
- Verify database permissions
- Ensure no conflicting constraints
- See rollback section if needed

---

### Migration 2: Data Migration

**File**: `20250122000002_migrate_audio_posts_to_tracks.sql`

**What it does:**
- Creates track records from audio posts
- Updates posts.track_id to reference new tracks
- Includes verification checks
- Prevents duplicate migrations

**IMPORTANT**: This is the longest migration (15-25 minutes)

**Execute:**
```bash
# Apply migration
supabase db push

# Monitor progress (in separate terminal)
watch -n 5 'psql $DATABASE_URL -c "SELECT COUNT(*) FROM tracks"'
```

**Monitor during execution:**
```sql
-- Check migration progress
SELECT 
  (SELECT COUNT(*) FROM tracks) as tracks_created,
  (SELECT COUNT(*) FROM posts WHERE post_type = 'audio' AND track_id IS NOT NULL) as posts_updated,
  (SELECT COUNT(*) FROM posts WHERE post_type = 'audio') as total_audio_posts;
```

**Verify after completion:**
```sql
-- All audio posts should have track_id
SELECT COUNT(*) as orphaned_posts
FROM posts
WHERE post_type = 'audio' AND track_id IS NULL;
-- Expected: 0

-- Tracks created should match or exceed audio posts
SELECT 
  (SELECT COUNT(*) FROM posts WHERE post_type = 'audio') as audio_posts,
  (SELECT COUNT(*) FROM tracks) as tracks;
-- Expected: tracks >= audio_posts

-- Verify track data integrity
SELECT 
  p.id as post_id,
  p.audio_url as post_audio_url,
  t.id as track_id,
  t.file_url as track_file_url,
  t.title as track_title
FROM posts p
JOIN tracks t ON p.track_id = t.id
WHERE p.post_type = 'audio'
LIMIT 10;
-- Expected: All rows have matching data

-- Check for duplicate tracks (should be minimal)
SELECT file_url, COUNT(*) as count
FROM tracks
GROUP BY file_url
HAVING COUNT(*) > 1;
-- Expected: Empty or very few results
```

**Expected Results:**
- ✅ All audio posts have track_id
- ✅ Track count >= audio post count
- ✅ No orphaned posts
- ✅ Data integrity maintained

**If errors occur:**
- Check which posts failed to migrate
- Verify audio_url data is valid
- Check for constraint violations
- See troubleshooting section

---

### Migration 3: Update Playlist References

**File**: `20250122000003_update_playlist_track_references.sql`

**What it does:**
- Updates playlist_tracks to reference tracks instead of posts
- Updates foreign key constraints
- Includes verification checks

**Execute:**
```bash
# Apply migration
supabase db push
```

**Monitor during execution:**
```sql
-- Check update progress
SELECT 
  COUNT(*) as total_playlist_tracks,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM tracks WHERE id = playlist_tracks.track_id
  ) THEN 1 END) as valid_references
FROM playlist_tracks;
```

**Verify after completion:**
```sql
-- All playlist_tracks should reference valid tracks
SELECT COUNT(*) as invalid_references
FROM playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM tracks t WHERE t.id = pt.track_id
);
-- Expected: 0

-- Check foreign key constraint updated
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'playlist_tracks' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'track_id';
-- Expected: References tracks table

-- Verify playlist integrity
SELECT 
  pl.id as playlist_id,
  pl.name,
  COUNT(pt.id) as track_count,
  COUNT(t.id) as valid_tracks
FROM playlists pl
LEFT JOIN playlist_tracks pt ON pl.id = pt.playlist_id
LEFT JOIN tracks t ON pt.track_id = t.id
GROUP BY pl.id, pl.name
HAVING COUNT(pt.id) != COUNT(t.id);
-- Expected: Empty (all playlists have valid tracks)
```

**Expected Results:**
- ✅ All playlist_tracks reference valid tracks
- ✅ Foreign key constraint updated
- ✅ No invalid references
- ✅ Playlist integrity maintained

---

### Migration 4: Finalization

**File**: `20250122000004_finalize_tracks_posts_separation.sql`

**What it does:**
- Adds audio_posts_must_have_track constraint
- Creates performance indexes
- Marks deprecated columns with comments

**Execute:**
```bash
# Apply migration
supabase db push
```

**Verify:**
```sql
-- Check constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'audio_posts_must_have_track';
-- Expected: Constraint exists with proper check clause

-- Check indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tracks'
ORDER BY indexname;
-- Expected: idx_tracks_user_id, idx_tracks_created_at, idx_tracks_is_public

-- Verify deprecated column comments
SELECT 
  column_name,
  col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) as comment
FROM information_schema.columns
WHERE table_name = 'posts' 
  AND column_name LIKE 'audio_%';
-- Expected: Comments indicating deprecation
```

**Expected Results:**
- ✅ Constraint added successfully
- ✅ All indexes created
- ✅ Deprecated columns marked
- ✅ No errors

---

## Post-Migration Verification

### Comprehensive Data Integrity Check

```sql
-- Run all verification queries

-- 1. No orphaned audio posts
SELECT COUNT(*) as orphaned_audio_posts
FROM posts
WHERE post_type = 'audio' AND track_id IS NULL;
-- Expected: 0

-- 2. No invalid track references in posts
SELECT COUNT(*) as invalid_post_tracks
FROM posts p
WHERE p.track_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tracks WHERE id = p.track_id);
-- Expected: 0

-- 3. No invalid track references in playlists
SELECT COUNT(*) as invalid_playlist_tracks
FROM playlist_tracks pt
WHERE NOT EXISTS (SELECT 1 FROM tracks WHERE id = pt.track_id);
-- Expected: 0

-- 4. Track count validation
SELECT 
  (SELECT COUNT(*) FROM posts WHERE post_type = 'audio') as audio_posts,
  (SELECT COUNT(*) FROM tracks) as total_tracks,
  (SELECT COUNT(DISTINCT track_id) FROM posts WHERE track_id IS NOT NULL) as tracks_in_posts;
-- Expected: total_tracks >= audio_posts

-- 5. Playlist integrity
SELECT 
  COUNT(DISTINCT pl.id) as total_playlists,
  COUNT(pt.id) as total_playlist_tracks,
  COUNT(t.id) as valid_track_references
FROM playlists pl
LEFT JOIN playlist_tracks pt ON pl.id = pt.playlist_id
LEFT JOIN tracks t ON pt.track_id = t.id;
-- Expected: total_playlist_tracks = valid_track_references
```

### Performance Verification

```sql
-- Test query performance with EXPLAIN ANALYZE

-- 1. Fetch posts with tracks
EXPLAIN ANALYZE
SELECT p.*, t.*
FROM posts p
LEFT JOIN tracks t ON p.track_id = t.id
WHERE p.post_type = 'audio'
ORDER BY p.created_at DESC
LIMIT 15;
-- Expected: Execution time <100ms, uses indexes

-- 2. Fetch playlist with tracks
EXPLAIN ANALYZE
SELECT 
  pl.*,
  pt.position,
  t.*
FROM playlists pl
JOIN playlist_tracks pt ON pl.id = pt.playlist_id
JOIN tracks t ON pt.track_id = t.id
WHERE pl.id = 'sample-playlist-id'
ORDER BY pt.position;
-- Expected: Execution time <50ms, uses indexes

-- 3. User tracks query
EXPLAIN ANALYZE
SELECT * FROM tracks
WHERE user_id = 'sample-user-id'
ORDER BY created_at DESC;
-- Expected: Execution time <50ms, uses idx_tracks_user_id
```

---

## Expected Execution Times

### By Data Volume

**Small Database (<1000 audio posts)**
- Migration 1: 1-2 minutes
- Migration 2: 5-10 minutes
- Migration 3: 3-5 minutes
- Migration 4: 1-2 minutes
- **Total**: 10-20 minutes

**Medium Database (1000-10000 audio posts)**
- Migration 1: 2-3 minutes
- Migration 2: 15-25 minutes
- Migration 3: 8-12 minutes
- Migration 4: 2-3 minutes
- **Total**: 30-45 minutes

**Large Database (>10000 audio posts)**
- Migration 1: 3-5 minutes
- Migration 2: 30-60 minutes
- Migration 3: 15-25 minutes
- Migration 4: 3-5 minutes
- **Total**: 50-95 minutes

---

## Rollback Procedures

See: `docs/features/tracks-vs-posts-separation/deployment/rollback-procedures.md`

**Quick rollback steps:**

1. **Stop application** (if possible)
2. **Restore database backup**
   ```bash
   supabase db reset --db-url [PRODUCTION_URL]
   psql $DATABASE_URL < backup_pre_migration_*.sql
   ```
3. **Verify restoration**
4. **Restart application**
5. **Investigate failure cause**

---

## Troubleshooting

### Common Issues

**Issue**: Migration 2 takes too long
- **Cause**: Large dataset
- **Solution**: Normal for large databases, monitor progress
- **Action**: Wait for completion, verify no errors

**Issue**: Orphaned audio posts after Migration 2
- **Cause**: Invalid audio_url data
- **Solution**: Manual data cleanup required
- **Action**: Identify posts, fix data, re-run migration

**Issue**: Invalid playlist references after Migration 3
- **Cause**: Playlist referenced non-existent posts
- **Solution**: Clean up invalid playlist_tracks
- **Action**: Run cleanup script, re-run migration

**Issue**: Constraint violation in Migration 4
- **Cause**: Data inconsistency
- **Solution**: Fix data before adding constraint
- **Action**: Identify violations, fix data, re-run

---

*Migration Execution Guide Version: 1.0*  
*Created: January 2025*  
*Status: Production Ready*
