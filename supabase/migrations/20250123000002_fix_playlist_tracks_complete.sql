-- Migration: Complete fix for playlist_tracks foreign key
-- Description: Drop old constraint, clean up data, add new constraint

BEGIN;

DO $$
BEGIN
  RAISE NOTICE 'Starting complete playlist_tracks fix';
END $$;

-- Step 1: Drop the old foreign key constraint (pointing to posts)
ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

DO $$
BEGIN
  RAISE NOTICE 'Dropped old foreign key constraint';
END $$;

-- Step 2: Now we can safely update the data
-- Try to fix entries that reference posts by mapping to track_id
UPDATE public.playlist_tracks pt
SET track_id = p.track_id
FROM public.posts p
WHERE pt.track_id = p.id
  AND p.post_type = 'audio'
  AND p.track_id IS NOT NULL;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % entries by mapping post IDs to track IDs', updated_count;
END $$;

-- Step 3: Delete any remaining invalid entries
DELETE FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
);

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % invalid entries', deleted_count;
END $$;

-- Step 4: Verify all entries are now valid
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.playlist_tracks pt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
  );
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Data cleanup failed: % invalid entries remain', invalid_count;
  END IF;
  
  RAISE NOTICE 'Data cleanup successful: All entries reference valid tracks';
END $$;

-- Step 5: Add new foreign key constraint (pointing to tracks)
ALTER TABLE public.playlist_tracks
  ADD CONSTRAINT playlist_tracks_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.tracks(id) 
    ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Added new foreign key constraint to tracks table';
END $$;

-- Step 6: Verify the constraint
DO $$
DECLARE
  constraint_table TEXT;
BEGIN
  SELECT ccu.table_name
  INTO constraint_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_name = 'playlist_tracks_track_id_fkey'
    AND tc.table_name = 'playlist_tracks'
    AND tc.constraint_type = 'FOREIGN KEY';
  
  IF constraint_table != 'tracks' THEN
    RAISE EXCEPTION 'Foreign key constraint verification failed. Points to: %', constraint_table;
  END IF;
  
  RAISE NOTICE 'Verification passed: Foreign key points to tracks table';
END $$;

-- Step 7: Summary
DO $$
DECLARE
  total_entries INTEGER;
  unique_tracks INTEGER;
  unique_playlists INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_entries FROM public.playlist_tracks;
  SELECT COUNT(DISTINCT track_id) INTO unique_tracks FROM public.playlist_tracks;
  SELECT COUNT(DISTINCT playlist_id) INTO unique_playlists FROM public.playlist_tracks;
  
  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Total playlist_tracks entries: %', total_entries;
  RAISE NOTICE 'Unique tracks in playlists: %', unique_tracks;
  RAISE NOTICE 'Unique playlists: %', unique_playlists;
  RAISE NOTICE 'Foreign key now correctly points to tracks table';
END $$;

COMMIT;
