# Storage Cleanup Guide

## Overview

This guide explains how to use the storage cleanup utility to identify and delete orphaned audio files from Supabase Storage, freeing up valuable storage space.

## What Are Orphaned Files?

Orphaned files are audio files that exist in Supabase Storage but are not referenced by any tracks in the database. These files typically result from:

- Failed uploads where the database record wasn't created
- Deleted tracks where the storage file wasn't removed
- Test uploads during development
- Duplicate uploads that were replaced

## Prerequisites

1. **Environment Variables**: Ensure you have the following set in `client/.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Node.js**: The script requires Node.js and the `@supabase/supabase-js` package (already installed in the project)

## Usage

### 1. Preview Orphaned Files (Dry Run)

**Always run a dry run first** to see what would be deleted:

```bash
cd client
node ../scripts/utilities/cleanup-orphaned-audio.js --dry-run
```

This will:
- List all orphaned files
- Show their sizes
- Calculate total space that would be freed
- **NOT delete anything**

### 2. Delete Limited Number of Files

To delete only a specific number of files (recommended for first run):

```bash
node ../scripts/utilities/cleanup-orphaned-audio.js --limit=10
```

This will:
- Delete only the 10 largest orphaned files
- Show progress as files are deleted
- Provide a summary of freed space

### 3. Delete All Orphaned Files

To delete all orphaned files:

```bash
node ../scripts/utilities/cleanup-orphaned-audio.js
```

**Warning**: This will delete ALL orphaned files after a 5-second countdown. Press Ctrl+C to cancel.

## Command Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview what would be deleted without actually deleting |
| `--limit=N` | Limit deletion to N files (largest first) |
| `--help` | Show help message with usage examples |

## Example Output

### Dry Run Output
```
🧹 Supabase Storage Cleanup Tool

Mode: DRY RUN

🔍 Searching for orphaned audio files...

Found 47 orphaned files

Top 10 largest orphaned files:
   1. compressed_1757828240521_12 - All Apologies.mp3
      Size: 43 MB
      Created: 9/14/2025, 5:44:44 AM
   2. compressed_1757828409833_12 - All Apologies.mp3
      Size: 43 MB
      Created: 9/14/2025, 5:47:34 AM
   ...

📊 Summary:
   Files to delete: 47
   Total size: 387.5 MB
   Bucket: audio-files

🔍 DRY RUN MODE - No files will be deleted

✅ Dry run complete. Run without --dry-run to actually delete files.
```

### Actual Deletion Output
```
🧹 Supabase Storage Cleanup Tool

Mode: DELETE

🔍 Searching for orphaned audio files...

Found 47 orphaned files

📊 Summary:
   Files to delete: 47
   Total size: 387.5 MB
   Bucket: audio-files

⚠️  WARNING: This will permanently delete these files!
   Press Ctrl+C to cancel, or wait 5 seconds to continue...

🗑️  Deleting files...

   ✅ Deleted: compressed_1757828240521_12 - All Apologies.mp3 (43 MB)
   ✅ Deleted: compressed_1757828409833_12 - All Apologies.mp3 (43 MB)
   ...

✅ Cleanup complete!
   Successfully deleted: 47 files (387.5 MB)
```

## Safety Features

1. **Dry Run Mode**: Always preview before deleting
2. **5-Second Countdown**: Time to cancel before actual deletion
3. **Service Role Key Required**: Only works with proper authentication
4. **Database Function**: Uses a database function to ensure accuracy
5. **Detailed Logging**: Shows exactly what's being deleted

## Current Storage Status

As of the last check:
- **Total Storage Used**: 988 MB / 1 GB (98.8%)
- **Orphaned Files**: ~47 files
- **Potential Space to Free**: ~300-400 MB

## Recommended Workflow

1. **Run dry run** to see what would be deleted:
   ```bash
   node ../scripts/utilities/cleanup-orphaned-audio.js --dry-run
   ```

2. **Review the list** of files to ensure nothing important would be deleted

3. **Delete in batches** (recommended for first time):
   ```bash
   node ../scripts/utilities/cleanup-orphaned-audio.js --limit=20
   ```

4. **Verify storage usage** in Supabase dashboard

5. **Repeat if needed** until satisfied with storage usage

## Troubleshooting

### Error: Missing environment variables
**Solution**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `client/.env.local`

### Error: Failed to list storage files
**Solution**: Check that your service role key has proper permissions for storage operations

### Error: RPC function not found
**Solution**: The script will automatically fall back to a direct query approach. This is normal and works fine.

### No orphaned files found
**Solution**: Great! Your storage is already clean. No action needed.

## Database Function

The cleanup script uses a database function `find_orphaned_audio_files()` that:
- Queries all files in the `audio-files` bucket
- Checks if each file is referenced by any track
- Returns files that are not referenced
- Sorts by size (largest first)

This function is automatically created by the migration and is safe to use.

## Best Practices

1. **Run cleanup regularly**: Schedule monthly cleanups to prevent storage buildup
2. **Always dry run first**: Never skip the preview step
3. **Delete in batches**: Start with small limits to ensure safety
4. **Monitor storage**: Check Supabase dashboard after cleanup
5. **Keep backups**: Ensure important data is backed up before cleanup

## Future Improvements

Consider implementing:
- Automated cleanup on track deletion
- Storage usage monitoring and alerts
- Scheduled cleanup jobs
- More aggressive audio compression to prevent future issues

## Related Documentation

- [Audio Compression Configuration](../../client/src/config/compressionConfig.ts)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Database Utilities](../utilities/)

---

**Last Updated**: January 15, 2026  
**Status**: Active and tested
