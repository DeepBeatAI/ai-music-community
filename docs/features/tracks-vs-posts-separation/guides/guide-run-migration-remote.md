# Guide: Running Migration on Remote Supabase Database

## Overview

This guide walks you through applying the tracks-posts separation migration (`20250122000000_prepare_tracks_posts_separation.sql`) to your remote Supabase database.

## Prerequisites

- Access to your Supabase Dashboard
- Project URL: `https://trsctwpczzgwbbnrkuyg.supabase.co`

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Access SQL Editor

1. Go to your Supabase Dashboard: [https://supabase.com/dashboard/project/trsctwpczzgwbbnrkuyg](https://supabase.com/dashboard/project/trsctwpczzgwbbnrkuyg)
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query** to create a new SQL query

### Step 2: Copy Migration SQL

1. Open the migration file: `supabase/migrations/20250122000000_prepare_tracks_posts_separation.sql`
2. Copy the entire contents of the file (Ctrl+A, Ctrl+C)

### Step 3: Execute Migration

1. Paste the SQL into the SQL Editor
2. Click **Run** (or press Ctrl+Enter)
3. Wait for the query to complete

### Step 4: Verify Success

You should see a success message indicating the migration was applied. The migration adds:

- `file_size` column to tracks table
- `mime_type` column to tracks table
- `original_file_size` column to tracks table (NEW - for compression tracking)
- `compression_ratio` column to tracks table (NEW)
- `compression_applied` column to tracks table (NEW)
- `track_id` column to posts table
- Index on `posts.track_id`
- Foreign key constraint from posts to tracks
- Deprecation comments on old audio_* columns

### Step 5: Verify Columns Exist

Run this query in the SQL Editor to verify the new columns:

```sql
-- Check tracks table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tracks'
ORDER BY ordinal_position;

-- Check posts table has track_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'track_id';

-- Verify compression columns exist
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'original_file_size') as has_original_file_size,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'compression_ratio') as has_compression_ratio,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'compression_applied') as has_compression_applied;
```

Expected result: All three compression columns should return `true`.

## Method 2: Supabase CLI (Alternative)

If you prefer using the CLI:

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Link to Your Project

```bash
supabase link --project-ref trsctwpczzgwbbnrkuyg
```

You'll be prompted to enter your database password.

### Step 3: Push Migration

```bash
supabase db push
```

This will apply all pending migrations to your remote database.

## Verification Checklist

After running the migration, verify:

- [ ] Migration executed without errors
- [ ] `tracks` table has `file_size` column
- [ ] `tracks` table has `mime_type` column
- [ ] `tracks` table has `original_file_size` column (NEW)
- [ ] `tracks` table has `compression_ratio` column (NEW)
- [ ] `tracks` table has `compression_applied` column (NEW)
- [ ] `posts` table has `track_id` column
- [ ] Index `idx_posts_track_id` exists
- [ ] Foreign key constraint `posts_track_id_fkey` exists
- [ ] Deprecation comments added to audio_* columns

## Troubleshooting

### Error: Column already exists

If you see "column already exists" errors, it means the migration was partially applied before. You can:

1. Check which columns exist using the verification query above
2. Manually add only the missing columns
3. Or skip this migration if all columns are already present

### Error: Permission denied

Make sure you're logged in with an account that has admin access to the project.

### Error: Constraint already exists

This is safe to ignore - it means the constraint was already added in a previous attempt.

## Next Steps

After successfully running the migration:

1. Mark task 1.1 as complete in `tasks.md`
2. Proceed to task 2.1: Add compression fields to Track types
3. Continue with the implementation plan

## Related Files

- Migration file: `supabase/migrations/20250122000000_prepare_tracks_posts_separation.sql`
- Tasks file: `.kiro/specs/tracks-vs-posts-separation/tasks.md`
- Design document: `.kiro/specs/tracks-vs-posts-separation/design.md`
