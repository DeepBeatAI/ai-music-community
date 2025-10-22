-- Migration: Populate missing track durations
-- Description: Copy duration values from posts table to tracks table

BEGIN;

DO $$
BEGIN
  RAISE NOTICE 'Starting track duration population';
END $$;

-- Update tracks with duration from posts where duration is null
UPDATE tracks t
SET duration = p.audio_duration
FROM posts p
WHERE p.track_id = t.id
  AND p.post_type = 'audio'
  AND t.duration IS NULL
  AND p.audio_duration IS NOT NULL;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % tracks with duration from posts', updated_count;
END $$;

-- Summary
DO $$
DECLARE
  total_tracks INTEGER;
  tracks_with_duration INTEGER;
  tracks_without_duration INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tracks FROM tracks;
  SELECT COUNT(*) INTO tracks_with_duration FROM tracks WHERE duration IS NOT NULL;
  SELECT COUNT(*) INTO tracks_without_duration FROM tracks WHERE duration IS NULL;
  
  RAISE NOTICE '=== Duration Population Summary ===';
  RAISE NOTICE 'Total tracks: %', total_tracks;
  RAISE NOTICE 'Tracks with duration: %', tracks_with_duration;
  RAISE NOTICE 'Tracks without duration: %', tracks_without_duration;
END $$;

COMMIT;
