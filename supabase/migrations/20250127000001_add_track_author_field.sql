-- Migration: Add Mandatory Track Author Field
-- Created: 2025-01-27
-- Purpose: Add explicit author field to tracks table with immutability enforcement

BEGIN;

-- Step 1: Add author column (nullable initially for migration)
ALTER TABLE tracks
ADD COLUMN IF NOT EXISTS author TEXT;

-- Step 2: Backfill author from profiles.username
UPDATE tracks t
SET author = p.username,
    updated_at = NOW()
FROM profiles p
WHERE t.user_id = p.id
  AND t.author IS NULL;

-- Step 3: Handle any tracks where user was deleted (shouldn't happen with CASCADE, but safety check)
UPDATE tracks
SET author = 'Unknown Artist',
    updated_at = NOW()
WHERE author IS NULL;

-- Step 4: Make author NOT NULL
ALTER TABLE tracks
ALTER COLUMN author SET NOT NULL;

-- Step 5: Add constraints
ALTER TABLE tracks
ADD CONSTRAINT track_author_not_empty CHECK (length(trim(author)) > 0);

ALTER TABLE tracks
ADD CONSTRAINT track_author_max_length CHECK (length(author) <= 100);

-- Step 6: Add index for search performance
CREATE INDEX IF NOT EXISTS idx_tracks_author ON tracks(author);

-- Step 7: Add comment
COMMENT ON COLUMN tracks.author IS 'Track author/artist name. Mandatory and immutable after creation. Default to username but can be customized for covers, remixes, collaborations.';

-- Step 8: Create trigger to prevent author updates
CREATE OR REPLACE FUNCTION prevent_author_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.author IS DISTINCT FROM NEW.author THEN
    RAISE EXCEPTION 'Track author cannot be modified after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_track_author_update
BEFORE UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION prevent_author_update();

-- Step 9: Log migration results
DO $$
DECLARE
  total_tracks INTEGER;
  tracks_with_author INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tracks FROM tracks;
  SELECT COUNT(*) INTO tracks_with_author FROM tracks WHERE author IS NOT NULL;
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  Total tracks: %', total_tracks;
  RAISE NOTICE '  Tracks with author: %', tracks_with_author;
  RAISE NOTICE '  Author field is now mandatory and immutable';
END $$;

COMMIT;
