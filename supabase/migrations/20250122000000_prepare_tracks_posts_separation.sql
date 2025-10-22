-- Migration: Prepare Tracks-Posts Separation
-- This migration prepares the database schema for separating tracks from posts
-- by adding necessary columns and relationships while maintaining backward compatibility.

-- ============================================================================
-- 1. Add missing columns to tracks table
-- ============================================================================

-- Add file_size column (in bytes)
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add mime_type column
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Add compression metadata columns (NEW - CRITICAL for cost optimization)
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS original_file_size INTEGER;

ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS compression_ratio DECIMAL(4,2);

ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS compression_applied BOOLEAN DEFAULT FALSE;

-- Add constraints for the new columns (with safe handling for existing constraints)
DO $constraint_block$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'track_file_size_positive'
  ) THEN
    ALTER TABLE public.tracks
    ADD CONSTRAINT track_file_size_positive 
      CHECK (file_size IS NULL OR file_size > 0);
  END IF;
END $constraint_block$;

DO $constraint_block$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'track_original_file_size_positive'
  ) THEN
    ALTER TABLE public.tracks
    ADD CONSTRAINT track_original_file_size_positive 
      CHECK (original_file_size IS NULL OR original_file_size > 0);
  END IF;
END $constraint_block$;

DO $constraint_block$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'track_compression_ratio_positive'
  ) THEN
    ALTER TABLE public.tracks
    ADD CONSTRAINT track_compression_ratio_positive 
      CHECK (compression_ratio IS NULL OR compression_ratio > 0);
  END IF;
END $constraint_block$;

-- Add comment for documentation
COMMENT ON COLUMN public.tracks.file_size IS 'Size of the audio file in bytes (after compression if applied)';
COMMENT ON COLUMN public.tracks.mime_type IS 'MIME type of the audio file (e.g., audio/mpeg, audio/wav)';
COMMENT ON COLUMN public.tracks.original_file_size IS 'Original file size before compression (bytes). Used to calculate bandwidth savings.';
COMMENT ON COLUMN public.tracks.compression_ratio IS 'Compression ratio (e.g., 2.5 means file is 2.5x smaller). NULL if no compression.';
COMMENT ON COLUMN public.tracks.compression_applied IS 'Whether audio compression was applied to this track. FALSE for uncompressed files.';

-- ============================================================================
-- 2. Add track_id column to posts table
-- ============================================================================

-- Add track_id column (nullable for backward compatibility)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS track_id UUID;

-- Add comment for documentation
COMMENT ON COLUMN public.posts.track_id IS 'Reference to tracks table for audio posts. Replaces direct audio_* columns.';

-- ============================================================================
-- 3. Create index on posts.track_id
-- ============================================================================

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_posts_track_id ON public.posts(track_id);

-- ============================================================================
-- 4. Add foreign key constraint (NOT VALID initially)
-- ============================================================================

-- Add foreign key constraint without validating existing data
-- This allows us to add the constraint without blocking writes
-- and without failing on existing NULL values
DO $fkey_block$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_track_id_fkey'
  ) THEN
    ALTER TABLE public.posts
    ADD CONSTRAINT posts_track_id_fkey
      FOREIGN KEY (track_id) 
      REFERENCES public.tracks(id) 
      ON DELETE SET NULL
      NOT VALID;
    
    -- Add comment explaining the constraint
    COMMENT ON CONSTRAINT posts_track_id_fkey ON public.posts IS 
      'Foreign key to tracks table. ON DELETE SET NULL ensures post remains if track is deleted.';
  END IF;
END $fkey_block$;

-- ============================================================================
-- 5. Validate the constraint
-- ============================================================================

-- Validate the constraint (this checks existing data)
-- Since all existing track_id values are NULL, this should succeed immediately
DO $validate_block$ 
BEGIN
  -- Only validate if constraint exists and is not already validated
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'posts_track_id_fkey' 
    AND convalidated = false
  ) THEN
    ALTER TABLE public.posts
    VALIDATE CONSTRAINT posts_track_id_fkey;
  END IF;
END $validate_block$;

-- ============================================================================
-- 6. Add deprecation comments to audio_* columns
-- ============================================================================

-- Mark old audio columns as deprecated
COMMENT ON COLUMN public.posts.audio_url IS 'DEPRECATED: Use track_id to reference tracks table instead';
COMMENT ON COLUMN public.posts.audio_filename IS 'DEPRECATED: Use track_id to reference tracks table instead';
COMMENT ON COLUMN public.posts.audio_duration IS 'DEPRECATED: Use track_id to reference tracks table instead';
COMMENT ON COLUMN public.posts.audio_file_size IS 'DEPRECATED: Use track_id to reference tracks table instead';
COMMENT ON COLUMN public.posts.audio_mime_type IS 'DEPRECATED: Use track_id to reference tracks table instead';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary:
-- ✓ Added file_size and mime_type columns to tracks table
-- ✓ Added compression metadata columns (original_file_size, compression_ratio, compression_applied)
-- ✓ Added track_id column to posts table (nullable)
-- ✓ Created index on posts.track_id for performance
-- ✓ Added foreign key constraint with ON DELETE SET NULL
-- ✓ Validated constraint (succeeds because all track_id values are NULL)
-- ✓ Marked old audio_* columns as deprecated
--
-- Next Steps:
-- - Data migration to populate track_id from existing audio posts
-- - Update application code to use track_id instead of audio_* columns
-- - Eventually remove audio_* columns after full migration
