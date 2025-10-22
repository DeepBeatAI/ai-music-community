# Task 1.1: Run Migration on Dev Database

## Status: Ready to Execute

## Overview

The migration file `20250122000000_prepare_tracks_posts_separation.sql` is ready and includes all necessary compression columns. You need to apply it to your remote Supabase database.

## Quick Start

### Option 1: Supabase Dashboard (Recommended - 5 minutes)

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/trsctwpczzgwbbnrkuyg
   - Click **SQL Editor** in left sidebar
   - Click **New Query**

2. **Copy & Execute Migration**
   - Open: `supabase/migrations/20250122000000_prepare_tracks_posts_separation.sql`
   - Copy entire file contents (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor
   - Click **Run** (or Ctrl+Enter)

3. **Verify Success**
   - Copy contents of: `scripts/database/verify-migration-remote.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Check that all compression columns show `true`

### Option 2: Supabase CLI (Alternative)

```bash
# Install CLI (if not installed)
npm install -g supabase

# Link to project
supabase link --project-ref trsctwpczzgwbbnrkuyg

# Push migration
supabase db push
```

## What This Migration Does

Adds to **tracks** table:
- ✅ `file_size` (INTEGER) - Size after compression
- ✅ `mime_type` (TEXT) - Audio file type
- ✅ `original_file_size` (INTEGER) - Size before compression
- ✅ `compression_ratio` (DECIMAL) - Compression ratio
- ✅ `compression_applied` (BOOLEAN) - Whether compressed

Adds to **posts** table:
- ✅ `track_id` (UUID) - Foreign key to tracks
- ✅ Index on `track_id` for performance
- ✅ Foreign key constraint with ON DELETE SET NULL

Marks as deprecated:
- ⚠️ `audio_url`, `audio_filename`, `audio_duration`, `audio_file_size`, `audio_mime_type`

## Verification Checklist

After running migration, verify:

- [ ] Migration executed without errors
- [ ] All 5 new columns exist in tracks table
- [ ] `track_id` column exists in posts table
- [ ] Index `idx_posts_track_id` created
- [ ] Foreign key `posts_track_id_fkey` created
- [ ] Compression columns return `true` in verification query

## Quick Verification Query

Run this in SQL Editor to check compression columns:

```sql
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'tracks' AND column_name = 'original_file_size') as has_original_file_size,
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'tracks' AND column_name = 'compression_ratio') as has_compression_ratio,
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'tracks' AND column_name = 'compression_applied') as has_compression_applied;
```

Expected result: All three should be `true`.

## Next Steps

After successful migration:

1. Mark task 1.1 as complete in `tasks.md`
2. Proceed to task 2.1: Add compression fields to Track types
3. Continue with Phase 2 of the implementation plan

## Troubleshooting

**Error: Column already exists**
- Check which columns exist with verification query
- Manually add only missing columns
- Or skip if all columns present

**Error: Permission denied**
- Ensure you're logged in with admin access

**Error: Constraint already exists**
- Safe to ignore - constraint was already added

## Related Files

- Migration: `supabase/migrations/20250122000000_prepare_tracks_posts_separation.sql`
- Verification: `scripts/database/verify-migration-remote.sql`
- Full Guide: `docs/features/tracks-vs-posts-separation/guides/guide-run-migration-remote.md`
- Tasks: `.kiro/specs/tracks-vs-posts-separation/tasks.md`

## Time Estimate

- Dashboard method: 5 minutes
- CLI method: 10 minutes (including setup)
- Verification: 2 minutes

**Total: ~7-12 minutes**
