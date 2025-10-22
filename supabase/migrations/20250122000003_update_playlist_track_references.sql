-- Migration: 003_update_playlist_track_references.sql
-- Description: Updates playlist_tracks to reference tracks instead of posts
-- Requirements: 5.4, 9.1
--
-- This migration:
-- 1. Creates a temporary mapping table between posts and tracks
-- 2. Updates playlist_tracks.track_id to reference actual tracks
-- 3. Drops the old foreign key constraint
-- 4. Adds a new foreign key constraint to the tracks table
-- 5. Includes verification checks to ensure data integrity
--
-- IMPORTANT: This migration requires that migration 002 has been run first

BEGIN;

-- Log migration start
DO $$
BEGIN
  RAISE NOTICE 'Starting migration: update_playlist_track_references';
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- Step 1: Verify prerequisite - migration 002 must have been run
DO $$
DECLARE
  audio_posts_without_tracks INTEGER;
BEGIN
  SELECT COUNT(*) INTO audio_posts_without_tracks
  FROM public.posts
  WHERE post_type = 'audio'
    AND track_id IS NULL;
  
  IF audio_posts_without_tracks > 0 THEN
    RAISE EXCEPTION 'Prerequisite check failed: % audio posts without track_id. Run migration 002 first.', 
      audio_posts_without_tracks;
  END IF;
  
  RAISE NOTICE 'Prerequisite check passed: All audio posts have track_id';
END $$;

-- Step 2: Create temporary mapping table
-- This maps post IDs to track IDs for audio posts
CREATE TEMP TABLE track_post_mapping AS
SELECT 
  p.id as post_id,
  p.track_id
FROM public.posts p
WHERE p.post_type = 'audio'
  AND p.track_id IS NOT NULL;

-- Log mapping table stats
DO $$
DECLARE
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM track_post_mapping;
  RAISE NOTICE 'Created mapping table with % entries', mapping_count;
END $$;

-- Step 3: Backup current playlist_tracks state (for rollback)
-- Create a backup table with current state
CREATE TEMP TABLE playlist_tracks_backup AS
SELECT * FROM public.playlist_tracks;

DO $$
DECLARE
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM playlist_tracks_backup;
  RAISE NOTICE 'Created backup of % playlist_tracks entries', backup_count;
END $$;

-- Step 4: Update playlist_tracks to reference tracks instead of posts
-- Only update entries that currently reference audio posts
UPDATE public.playlist_tracks pt
SET track_id = tpm.track_id
FROM track_post_mapping tpm
WHERE pt.track_id = tpm.post_id
  AND EXISTS (
    -- Double-check this is an audio post
    SELECT 1 FROM public.posts p
    WHERE p.id = tpm.post_id
      AND p.post_type = 'audio'
  );

-- Log how many playlist_tracks were updated
DO $$
DECLARE
  updated_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count how many were updated (those that now reference tracks)
  SELECT COUNT(*) INTO updated_count
  FROM public.playlist_tracks pt
  INNER JOIN public.tracks t ON pt.track_id = t.id;
  
  SELECT COUNT(*) INTO total_count
  FROM public.playlist_tracks;
  
  RAISE NOTICE 'Updated playlist_tracks: % of % now reference tracks', updated_count, total_count;
END $$;

-- Step 5: Verification - Check all playlist_tracks reference valid tracks
DO $$
DECLARE
  invalid_count INTEGER;
  invalid_ids TEXT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.playlist_tracks pt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.id = pt.track_id
  );
  
  IF invalid_count > 0 THEN
    -- Get details of invalid entries for debugging
    SELECT string_agg(id::TEXT, ', ') INTO invalid_ids
    FROM public.playlist_tracks pt
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = pt.track_id
    )
    LIMIT 10;
    
    RAISE EXCEPTION 'Migration failed: % playlist_tracks with invalid track_id. First 10 IDs: %', 
      invalid_count, invalid_ids;
  ELSE
    RAISE NOTICE 'Verification passed: All playlist_tracks reference valid tracks';
  END IF;
END $$;

-- Step 6: Drop old foreign key constraint
-- The old constraint referenced posts.id, we need to remove it
ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

DO $$
BEGIN
  RAISE NOTICE 'Dropped old foreign key constraint';
END $$;

-- Step 7: Add new foreign key constraint to tracks table
ALTER TABLE public.playlist_tracks
  ADD CONSTRAINT playlist_tracks_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.tracks(id) 
    ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Added new foreign key constraint to tracks table';
END $$;

-- Step 8: Verify foreign key constraint is working
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'playlist_tracks_track_id_fkey'
      AND table_name = 'playlist_tracks'
      AND constraint_type = 'FOREIGN KEY'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Foreign key constraint was not created successfully';
  END IF;
  
  RAISE NOTICE 'Foreign key constraint verified';
END $$;

-- Step 9: Additional verification - Check for orphaned playlist entries
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Check if any playlists reference non-existent tracks
  SELECT COUNT(*) INTO orphaned_count
  FROM public.playlist_tracks pt
  LEFT JOIN public.tracks t ON pt.track_id = t.id
  WHERE t.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned playlist_tracks entries', orphaned_count;
  END IF;
  
  RAISE NOTICE 'No orphaned playlist entries found';
END $$;

-- Step 10: Create summary report
DO $$
DECLARE
  total_playlists INTEGER;
  total_playlist_tracks INTEGER;
  unique_tracks_in_playlists INTEGER;
BEGIN
  SELECT COUNT(DISTINCT playlist_id) INTO total_playlists
  FROM public.playlist_tracks;
  
  SELECT COUNT(*) INTO total_playlist_tracks
  FROM public.playlist_tracks;
  
  SELECT COUNT(DISTINCT track_id) INTO unique_tracks_in_playlists
  FROM public.playlist_tracks;
  
  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Total playlists with tracks: %', total_playlists;
  RAISE NOTICE 'Total playlist_tracks entries: %', total_playlist_tracks;
  RAISE NOTICE 'Unique tracks in playlists: %', unique_tracks_in_playlists;
  RAISE NOTICE 'Migration completed successfully at: %', NOW();
END $$;

COMMIT;

-- Rollback instructions (for reference, not executed):
-- To rollback this migration:
-- 
-- BEGIN;
-- -- Drop new foreign key constraint
-- ALTER TABLE public.playlist_tracks
--   DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;
-- 
-- -- Restore original references from backup
-- -- (This requires the backup table to still exist)
-- UPDATE public.playlist_tracks pt
-- SET track_id = b.track_id
-- FROM playlist_tracks_backup b
-- WHERE pt.id = b.id;
-- 
-- -- Restore old foreign key constraint to posts
-- ALTER TABLE public.playlist_tracks
--   ADD CONSTRAINT playlist_tracks_track_id_fkey
--     FOREIGN KEY (track_id) 
--     REFERENCES public.posts(id) 
--     ON DELETE CASCADE;
-- 
-- COMMIT;

