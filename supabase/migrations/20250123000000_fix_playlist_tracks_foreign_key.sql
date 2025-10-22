-- Migration: Fix playlist_tracks foreign key constraint
-- Description: Ensures playlist_tracks.track_id references tracks table, not posts table
-- Issue: The foreign key constraint is pointing to posts table instead of tracks table

BEGIN;

-- Log migration start
DO $$
BEGIN
  RAISE NOTICE 'Starting migration: fix_playlist_tracks_foreign_key';
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- Step 1: Check current constraint
DO $$
DECLARE
  current_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO current_constraint_def
  FROM pg_constraint
  WHERE conname = 'playlist_tracks_track_id_fkey'
    AND conrelid = 'playlist_tracks'::regclass;
  
  RAISE NOTICE 'Current constraint definition: %', current_constraint_def;
END $$;

-- Step 2: Drop the incorrect foreign key constraint
ALTER TABLE public.playlist_tracks
  DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;

DO $$
BEGIN
  RAISE NOTICE 'Dropped old foreign key constraint';
END $$;

-- Step 3: Verify all track_ids in playlist_tracks exist in tracks table
DO $$
DECLARE
  invalid_count INTEGER;
  invalid_tracks TEXT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.playlist_tracks pt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.id = pt.track_id
  );
  
  IF invalid_count > 0 THEN
    -- Get sample of invalid track IDs
    SELECT string_agg(DISTINCT track_id::TEXT, ', ')
    INTO invalid_tracks
    FROM public.playlist_tracks pt
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tracks t
      WHERE t.id = pt.track_id
    )
    LIMIT 5;
    
    RAISE EXCEPTION 'Cannot create foreign key: % playlist_tracks entries reference non-existent tracks. Sample track_ids: %', 
      invalid_count, invalid_tracks;
  END IF;
  
  RAISE NOTICE 'Verification passed: All playlist_tracks reference valid tracks';
END $$;

-- Step 4: Add correct foreign key constraint pointing to tracks table
ALTER TABLE public.playlist_tracks
  ADD CONSTRAINT playlist_tracks_track_id_fkey
    FOREIGN KEY (track_id) 
    REFERENCES public.tracks(id) 
    ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Added new foreign key constraint to tracks table';
END $$;

-- Step 5: Verify the new constraint
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
    RAISE EXCEPTION 'Foreign key constraint is not pointing to tracks table. Points to: %', constraint_table;
  END IF;
  
  RAISE NOTICE 'Verification passed: Foreign key constraint points to tracks table';
END $$;

-- Step 6: Test the constraint by attempting an invalid insert (should fail)
DO $$
BEGIN
  -- Try to insert with a non-existent track_id (should fail)
  BEGIN
    INSERT INTO public.playlist_tracks (playlist_id, track_id, position)
    VALUES (
      (SELECT id FROM public.playlists LIMIT 1),
      '00000000-0000-0000-0000-000000000000'::uuid,
      999
    );
    
    -- If we get here, the constraint didn't work
    RAISE EXCEPTION 'Foreign key constraint test failed: Invalid insert was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- This is expected - the constraint is working
      RAISE NOTICE 'Foreign key constraint test passed: Invalid insert was rejected';
  END;
END $$;

-- Step 7: Summary
DO $$
DECLARE
  total_playlist_tracks INTEGER;
  unique_tracks INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_playlist_tracks
  FROM public.playlist_tracks;
  
  SELECT COUNT(DISTINCT track_id) INTO unique_tracks
  FROM public.playlist_tracks;
  
  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Total playlist_tracks entries: %', total_playlist_tracks;
  RAISE NOTICE 'Unique tracks in playlists: %', unique_tracks;
  RAISE NOTICE 'Foreign key constraint now correctly points to tracks table';
  RAISE NOTICE 'Migration completed successfully at: %', NOW();
END $$;

COMMIT;
