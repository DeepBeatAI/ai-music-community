# Orphaned Data Cleanup Guide

## Overview

This guide documents the process of cleaning up orphaned data in the database - specifically tracks that reference deleted audio files and all their dependencies.

## What Happened (January 15, 2026)

### Storage Cleanup
1. **Deleted 191 orphaned audio files** from Supabase Storage
2. **Freed 782 MB** of storage space (from 988 MB to 206 MB)
3. Storage usage dropped from 98.8% to 20.6%

### Database Cleanup
1. **Deleted 36 orphaned track records** that referenced the deleted audio files
2. **Cleaned up all dependencies:**
   - Posts that referenced orphaned tracks
   - Playlist entries (playlist_tracks)
   - Album entries (album_tracks)
   - Saved tracks (saved_tracks)
   - Related comments, likes, and notifications (cascaded automatically)

### Final State
- **13 tracks remaining** in database
- **13 audio files** in storage
- **0 orphaned tracks** - all tracks now reference valid audio files
- **No broken references** - platform should work without errors

## Why This Was Necessary

### The Problem
When audio files are deleted from storage but track records remain in the database:
1. **Frontend errors** - Pages try to load non-existent audio files
2. **Broken user experience** - Tracks appear but can't be played
3. **Database bloat** - Unnecessary records taking up space
4. **Cascading issues** - Playlists, albums, and posts reference broken tracks

### Root Causes
- Failed uploads where storage succeeded but database record wasn't created
- Test uploads during development
- Duplicate uploads that were replaced
- Manual file deletions without database cleanup

## Prevention Strategies

### 1. Implement Automatic Cleanup

Add a database trigger to clean up storage when tracks are deleted:

```sql
CREATE OR REPLACE FUNCTION cleanup_track_audio_file()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract filename from URL and delete from storage
  -- This would require a storage API call
  -- For now, this is a placeholder for future implementation
  RAISE NOTICE 'Track deleted: %. Audio file should be cleaned up: %', OLD.id, OLD.file_url;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_deletion_cleanup
AFTER DELETE ON tracks
FOR EACH ROW
EXECUTE FUNCTION cleanup_track_audio_file();
```

### 2. Implement Upload Transaction Pattern

Ensure uploads are atomic - either both storage and database succeed, or both fail:

```typescript
async function uploadTrack(file: File, metadata: TrackMetadata) {
  let storageUrl: string | null = null;
  
  try {
    // Step 1: Upload to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('audio-files')
      .upload(filename, file);
    
    if (storageError) throw storageError;
    storageUrl = storageData.path;
    
    // Step 2: Create database record
    const { data: track, error: dbError } = await supabase
      .from('tracks')
      .insert({ ...metadata, file_url: storageUrl })
      .select()
      .single();
    
    if (dbError) {
      // Rollback: Delete the uploaded file
      await supabase.storage.from('audio-files').remove([storageUrl]);
      throw dbError;
    }
    
    return track;
  } catch (error) {
    // Cleanup on any error
    if (storageUrl) {
      await supabase.storage.from('audio-files').remove([storageUrl]);
    }
    throw error;
  }
}
```

### 3. Regular Maintenance

Run the cleanup script monthly to catch any orphaned data:

```bash
# From project root
node scripts/utilities/cleanup-orphaned-audio.js --dry-run

# Review the output, then run actual cleanup
node scripts/utilities/cleanup-orphaned-audio.js
```

### 4. Monitoring

Set up alerts for:
- Storage usage approaching limits
- High number of failed uploads
- Discrepancies between storage file count and track count

## Tools Created

### 1. Storage Cleanup Script
**Location:** `scripts/utilities/cleanup-orphaned-audio.js`

**Purpose:** Identifies and deletes audio files in storage that aren't referenced by any tracks

**Usage:**
```bash
# Preview what would be deleted
node scripts/utilities/cleanup-orphaned-audio.js --dry-run

# Delete up to 50 files
node scripts/utilities/cleanup-orphaned-audio.js --limit=50

# Delete all orphaned files
node scripts/utilities/cleanup-orphaned-audio.js
```

### 2. Database Cleanup Migration
**Location:** `supabase/migrations/20260115000000_cleanup_orphaned_tracks_complete.sql`

**Purpose:** Removes track records that reference deleted audio files and cleans up all dependencies

**What it does:**
1. Identifies tracks with non-existent audio files
2. Deletes posts referencing those tracks
3. Removes playlist and album entries
4. Removes saved track entries
5. Deletes the orphaned track records

### 3. Database Helper Function
**Function:** `find_orphaned_audio_files()`

**Purpose:** Returns a list of storage files not referenced by any tracks

**Usage:**
```sql
SELECT * FROM find_orphaned_audio_files();
```

## Manual Cleanup Process

If you need to manually clean up orphaned data:

### Step 1: Identify Orphaned Files
```sql
SELECT * FROM find_orphaned_audio_files();
```

### Step 2: Identify Orphaned Tracks
```sql
WITH existing_files AS (
  SELECT 
    'https://[project-ref].supabase.co/storage/v1/object/public/audio-files/' || name as full_url
  FROM storage.objects 
  WHERE bucket_id = 'audio-files'
)
SELECT 
  t.id,
  t.title,
  t.file_url
FROM tracks t
WHERE t.file_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM existing_files ef 
    WHERE t.file_url LIKE ef.full_url || '%'
  );
```

### Step 3: Check Dependencies
```sql
-- Check what would be affected
SELECT 
  'posts' as table_name,
  COUNT(*) as affected_count
FROM posts
WHERE track_id IN (SELECT id FROM orphaned_tracks)

UNION ALL

SELECT 
  'playlist_tracks',
  COUNT(*)
FROM playlist_tracks
WHERE track_id IN (SELECT id FROM orphaned_tracks)

UNION ALL

SELECT 
  'album_tracks',
  COUNT(*)
FROM album_tracks
WHERE track_id IN (SELECT id FROM orphaned_tracks);
```

### Step 4: Run Cleanup
Use the migration or run the cleanup script.

## Troubleshooting

### Issue: Tracks still showing on platform after cleanup
**Solution:** Clear browser cache and refresh. The frontend may have cached track data.

### Issue: Storage dashboard not updating
**Solution:** Supabase dashboard metrics are cached. Wait 15-30 minutes or do a hard refresh.

### Issue: Foreign key constraint errors during cleanup
**Solution:** The migration handles cascading deletes properly. If you're doing manual cleanup, delete in this order:
1. Posts (references tracks)
2. Playlist tracks
3. Album tracks
4. Saved tracks
5. Tracks themselves

### Issue: Some tracks still orphaned after cleanup
**Solution:** Check if the file URLs use different formats (signed URLs vs public URLs). The cleanup script handles both, but manual queries might miss one format.

## Best Practices

1. **Always run dry-run first** before deleting anything
2. **Backup before cleanup** if dealing with production data
3. **Monitor storage usage** regularly to catch issues early
4. **Implement atomic uploads** to prevent orphaned data
5. **Document all cleanups** for audit trail
6. **Test in development** before running in production

## Related Documentation

- [Storage Cleanup Guide](guide-storage-cleanup.md)
- [Database Migrations](../migrations/)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)

---

**Last Updated:** January 15, 2026  
**Cleanup Performed:** January 15, 2026  
**Status:** Complete - 0 orphaned tracks remaining
