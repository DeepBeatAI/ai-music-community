-- Migration: Update posts audio fields constraint
-- This migration updates the check constraint to allow audio posts with track_id
-- instead of requiring the deprecated audio_url and audio_filename fields

BEGIN;

-- Drop the old constraint
ALTER TABLE public.posts
DROP CONSTRAINT IF EXISTS posts_audio_fields_check;

-- Add new constraint that allows either:
-- 1. Text posts with no audio fields
-- 2. Audio posts with track_id (new approach)
-- 3. Audio posts with audio_url/audio_filename (legacy approach for backward compatibility)
ALTER TABLE public.posts
ADD CONSTRAINT posts_audio_fields_check CHECK (
  (
    -- Text posts: no audio fields
    (post_type = 'text') 
    AND (audio_url IS NULL) 
    AND (audio_filename IS NULL)
    AND (track_id IS NULL)
  ) 
  OR 
  (
    -- Audio posts: must have either track_id OR audio_url/audio_filename
    (post_type = 'audio') 
    AND (
      -- New approach: track_id reference
      (track_id IS NOT NULL)
      OR
      -- Legacy approach: direct audio fields (for backward compatibility)
      (audio_url IS NOT NULL AND audio_filename IS NOT NULL)
    )
  )
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT posts_audio_fields_check ON public.posts IS 
  'Ensures audio posts have either track_id (new approach) or audio_url/audio_filename (legacy). Text posts must have no audio fields.';

COMMIT;

-- Summary:
-- ✓ Dropped old constraint that required audio_url/audio_filename for audio posts
-- ✓ Added new constraint that allows audio posts with track_id
-- ✓ Maintains backward compatibility with legacy audio posts
-- ✓ Ensures text posts have no audio fields
