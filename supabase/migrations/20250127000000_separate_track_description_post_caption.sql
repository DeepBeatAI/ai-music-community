-- Migration: Separate Track Description from Post Caption
-- Purpose: Clarify that track.description is for track metadata, not social commentary
-- Date: 2025-01-27
-- Phase: Track Metadata Enhancements - Phase 1

BEGIN;

-- Add comments to clarify field usage
DO $$
BEGIN
  EXECUTE 'COMMENT ON COLUMN public.tracks.description IS ''Description of the track itself (genre, inspiration, technical details). NOT social commentary.''';
  EXECUTE 'COMMENT ON COLUMN public.posts.content IS ''Social commentary or caption when sharing content. For audio posts, this is separate from track.description.''';
  RAISE NOTICE 'Column comments added successfully';
END $$;

-- Step 1: For audio posts with tracks, copy track.description to post.content if post.content is empty
-- This moves social commentary from track metadata to post caption where it belongs
UPDATE posts p
SET content = t.description,
    updated_at = NOW()
FROM tracks t
WHERE p.track_id = t.id
  AND p.post_type = 'audio'
  AND (p.content IS NULL OR p.content = '')
  AND t.description IS NOT NULL
  AND t.description != '';

-- Step 2: Clear track.description for tracks that were migrated
-- This ensures track.description only contains track metadata, not social commentary
UPDATE tracks t
SET description = NULL,
    updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM posts p
  WHERE p.track_id = t.id
    AND p.post_type = 'audio'
    AND p.content IS NOT NULL
    AND p.content != ''
);

-- Step 3: Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
  total_audio_posts INTEGER;
BEGIN
  -- Count audio posts that now have content
  SELECT COUNT(*) INTO migrated_count
  FROM posts p
  JOIN tracks t ON p.track_id = t.id
  WHERE p.post_type = 'audio'
    AND p.content IS NOT NULL
    AND p.content != '';
  
  -- Count total audio posts
  SELECT COUNT(*) INTO total_audio_posts
  FROM posts
  WHERE post_type = 'audio';
  
  RAISE NOTICE 'Migration complete: % audio posts with captions out of % total audio posts', migrated_count, total_audio_posts;
END $$;

COMMIT;
