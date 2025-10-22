-- Migration: 002_migrate_audio_posts_to_tracks.sql
-- Description: Migrates existing audio post data to the tracks table
-- Requirements: 5.1, 5.2, 5.3, 4A.2, 9.1
-- 
-- This migration:
-- 1. Creates track records from existing audio posts
-- 2. Updates posts.track_id to reference the new tracks
-- 3. Includes verification checks to ensure data integrity
-- 4. Supports rollback capability
-- 5. Sets compression defaults for historical data
--
-- COMPRESSION DEFAULTS:
-- Historical audio posts do not have compression metadata, so we set:
-- - original_file_size: Set to current audio_file_size (no historical data available)
-- - compression_ratio: 1.0 (indicates no compression was applied)
-- - compression_applied: FALSE (historical uploads were not compressed)
-- Future uploads will use the audio compression system and have accurate metadata.
--
-- IMPORTANT: This migration is idempotent and can be run multiple times safely

BEGIN;

-- Log migration start
DO $$
BEGIN
  RAISE NOTICE 'Starting migration: migrate_audio_posts_to_tracks';
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- Step 1: Create tracks from existing audio posts
-- This INSERT is idempotent - it won't create duplicates if run multiple times
INSERT INTO public.tracks (
  id,
  user_id,
  title,
  description,
  file_url,
  duration,
  file_size,
  mime_type,
  is_public,
  original_file_size,
  compression_ratio,
  compression_applied,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  p.user_id,
  COALESCE(
    NULLIF(TRIM(p.audio_filename), ''),
    'Audio Track - ' || to_char(p.created_at, 'YYYY-MM-DD HH24:MI')
  ) as title,
  CASE 
    WHEN TRIM(p.content) != '' THEN p.content
    ELSE NULL
  END as description,
  p.audio_url as file_url,
  p.audio_duration as duration,
  p.audio_file_size as file_size,
  p.audio_mime_type as mime_type,
  TRUE as is_public, -- Assume public since posts are public
  p.audio_file_size as original_file_size, -- Set to current file size (no historical compression data)
  1.0 as compression_ratio, -- Default 1.0 indicates no compression
  FALSE as compression_applied, -- Historical data was not compressed
  p.created_at,
  p.updated_at
FROM public.posts p
WHERE p.post_type = 'audio'
  AND p.audio_url IS NOT NULL
  AND p.audio_url != ''
  AND NOT EXISTS (
    -- Avoid duplicates if migration is run multiple times
    -- Match on file_url and user_id to identify existing tracks
    SELECT 1 FROM public.tracks t
    WHERE t.file_url = p.audio_url
      AND t.user_id = p.user_id
  );

-- Log how many tracks were created
DO $$
DECLARE
  tracks_created INTEGER;
BEGIN
  SELECT COUNT(*) INTO tracks_created
  FROM public.tracks;
  
  RAISE NOTICE 'Total tracks in database: %', tracks_created;
END $$;

-- Step 2: Update posts to reference the newly created tracks
-- This UPDATE is idempotent - it only updates posts without track_id
UPDATE public.posts p
SET track_id = t.id
FROM public.tracks t
WHERE p.post_type = 'audio'
  AND p.audio_url = t.file_url
  AND p.user_id = t.user_id
  AND p.track_id IS NULL;

-- Log how many posts were updated
DO $$
DECLARE
  posts_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO posts_updated
  FROM public.posts
  WHERE post_type = 'audio'
    AND track_id IS NOT NULL;
  
  RAISE NOTICE 'Audio posts with track_id: %', posts_updated;
END $$;

-- Step 3: Verification - Check for orphaned audio posts
-- This will raise an exception if any audio posts don't have track_id
DO $$
DECLARE
  orphaned_count INTEGER;
  orphaned_posts TEXT;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.posts
  WHERE post_type = 'audio'
    AND track_id IS NULL;
  
  IF orphaned_count > 0 THEN
    -- Get details of orphaned posts for debugging
    SELECT string_agg(id::TEXT, ', ') INTO orphaned_posts
    FROM public.posts
    WHERE post_type = 'audio'
      AND track_id IS NULL
    LIMIT 10;
    
    RAISE EXCEPTION 'Migration failed: % audio posts without track_id. First 10 IDs: %', 
      orphaned_count, orphaned_posts;
  ELSE
    RAISE NOTICE 'Verification passed: All audio posts have track_id';
  END IF;
END $$;

-- Step 4: Additional verification - Check track integrity
DO $$
DECLARE
  invalid_tracks INTEGER;
BEGIN
  -- Check for tracks without file_url
  SELECT COUNT(*) INTO invalid_tracks
  FROM public.tracks
  WHERE file_url IS NULL OR file_url = '';
  
  IF invalid_tracks > 0 THEN
    RAISE EXCEPTION 'Migration failed: % tracks without valid file_url', invalid_tracks;
  END IF;
  
  -- Check for tracks without user_id
  SELECT COUNT(*) INTO invalid_tracks
  FROM public.tracks
  WHERE user_id IS NULL;
  
  IF invalid_tracks > 0 THEN
    RAISE EXCEPTION 'Migration failed: % tracks without user_id', invalid_tracks;
  END IF;
  
  RAISE NOTICE 'Track integrity verification passed';
END $$;

-- Step 5: Create summary report
DO $$
DECLARE
  total_audio_posts INTEGER;
  total_tracks INTEGER;
  posts_with_tracks INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_audio_posts
  FROM public.posts
  WHERE post_type = 'audio';
  
  SELECT COUNT(*) INTO total_tracks
  FROM public.tracks;
  
  SELECT COUNT(*) INTO posts_with_tracks
  FROM public.posts
  WHERE post_type = 'audio'
    AND track_id IS NOT NULL;
  
  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Total audio posts: %', total_audio_posts;
  RAISE NOTICE 'Total tracks: %', total_tracks;
  RAISE NOTICE 'Audio posts with track_id: %', posts_with_tracks;
  RAISE NOTICE 'Migration completed successfully at: %', NOW();
END $$;

COMMIT;

-- Rollback instructions (for reference, not executed):
-- To rollback this migration:
-- 
-- BEGIN;
-- -- Remove track_id references from posts
-- UPDATE public.posts SET track_id = NULL WHERE post_type = 'audio';
-- 
-- -- Delete tracks created by this migration
-- -- (Only if you have a way to identify them, e.g., by created_at timestamp)
-- DELETE FROM public.tracks
-- WHERE created_at >= '[MIGRATION_START_TIME]';
-- 
-- COMMIT;
