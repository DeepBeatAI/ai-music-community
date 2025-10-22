-- Migration: Cleanup invalid playlist_tracks entries
-- Description: Removes or fixes playlist_tracks entries that reference posts instead of tracks

BEGIN;

-- Step 1: Identify the problem entries
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.playlist_tracks pt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
  );
  
  RAISE NOTICE 'Found % invalid playlist_tracks entries', invalid_count;
END $$;

-- Step 2: Try to fix entries that reference posts with track_id
-- Some entries might have post IDs that can be mapped to track IDs
UPDATE public.playlist_tracks pt
SET track_id = p.track_id
FROM public.posts p
WHERE pt.track_id = p.id
  AND p.post_type = 'audio'
  AND p.track_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
  );

DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.playlist_tracks pt
  INNER JOIN public.tracks t ON pt.track_id = t.id;
  
  RAISE NOTICE 'Fixed entries by mapping post IDs to track IDs';
END $$;

-- Step 3: Delete any remaining invalid entries that can't be fixed
-- These are entries that reference non-existent posts or posts without tracks
DELETE FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
);

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % invalid playlist_tracks entries that could not be fixed', deleted_count;
END $$;

-- Step 4: Verify cleanup
DO $$
DECLARE
  remaining_invalid INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_invalid
  FROM public.playlist_tracks pt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
  );
  
  IF remaining_invalid > 0 THEN
    RAISE EXCEPTION 'Cleanup failed: % invalid entries remain', remaining_invalid;
  END IF;
  
  RAISE NOTICE 'Cleanup successful: All playlist_tracks now reference valid tracks';
END $$;

-- Step 5: Summary
DO $$
DECLARE
  total_entries INTEGER;
  unique_tracks INTEGER;
  unique_playlists INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_entries FROM public.playlist_tracks;
  SELECT COUNT(DISTINCT track_id) INTO unique_tracks FROM public.playlist_tracks;
  SELECT COUNT(DISTINCT playlist_id) INTO unique_playlists FROM public.playlist_tracks;
  
  RAISE NOTICE '=== Cleanup Summary ===';
  RAISE NOTICE 'Total playlist_tracks entries: %', total_entries;
  RAISE NOTICE 'Unique tracks: %', unique_tracks;
  RAISE NOTICE 'Unique playlists: %', unique_playlists;
  RAISE NOTICE 'All entries now reference valid tracks';
END $$;

COMMIT;
