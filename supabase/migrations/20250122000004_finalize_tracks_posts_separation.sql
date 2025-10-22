-- Migration: 004_finalize_tracks_posts_separation.sql
-- This migration adds final constraints and prepares for cleanup
-- Requirements: 4.2, 7.1, 9.1

BEGIN;

-- ============================================================================
-- 1. ADD CONSTRAINT: Audio posts must have track_id
-- ============================================================================

-- Add constraint to ensure data integrity
-- Audio posts MUST reference a track, text posts MUST NOT have a track
ALTER TABLE public.posts
  ADD CONSTRAINT audio_posts_must_have_track 
    CHECK (
      (post_type = 'audio' AND track_id IS NOT NULL) OR 
      (post_type = 'text' AND track_id IS NULL)
    );

COMMENT ON CONSTRAINT audio_posts_must_have_track ON public.posts IS 
  'Ensures audio posts always reference a track and text posts never do';

-- ============================================================================
-- 2. MARK DEPRECATED COLUMNS with comments
-- ============================================================================

-- Mark old audio columns as deprecated (keep for rollback capability)
-- These columns will be removed in a future migration after verification period
COMMENT ON COLUMN public.posts.audio_url IS 
  'DEPRECATED: Use track.file_url via track_id. Will be removed in future release.';

COMMENT ON COLUMN public.posts.audio_filename IS 
  'DEPRECATED: Use track.title via track_id. Will be removed in future release.';

COMMENT ON COLUMN public.posts.audio_duration IS 
  'DEPRECATED: Use track.duration via track_id. Will be removed in future release.';

COMMENT ON COLUMN public.posts.audio_file_size IS 
  'DEPRECATED: Use track.file_size via track_id. Will be removed in future release.';

COMMENT ON COLUMN public.posts.audio_mime_type IS 
  'DEPRECATED: Use track.mime_type via track_id. Will be removed in future release.';

-- ============================================================================
-- 3. ADD PERFORMANCE INDEXES for tracks table
-- ============================================================================

-- Index for user's tracks queries (already exists from earlier migration, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);

-- Index for chronological queries (recent tracks)
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON public.tracks(created_at DESC);

-- Partial index for public tracks (optimizes public track discovery)
CREATE INDEX IF NOT EXISTS idx_tracks_is_public ON public.tracks(is_public) 
  WHERE is_public = true;

-- Enable pg_trgm extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for track title searches (case-insensitive fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON public.tracks 
  USING gin(title gin_trgm_ops);

-- Index for genre filtering
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON public.tracks(genre) 
  WHERE genre IS NOT NULL;

-- Composite index for user's public tracks
CREATE INDEX IF NOT EXISTS idx_tracks_user_public ON public.tracks(user_id, is_public);

-- ============================================================================
-- 4. ADD ADDITIONAL CONSTRAINTS for data integrity
-- ============================================================================

-- Ensure track title is not empty
ALTER TABLE public.tracks
  ADD CONSTRAINT track_title_not_empty 
    CHECK (length(trim(title)) > 0);

-- Ensure track title has reasonable length
ALTER TABLE public.tracks
  ADD CONSTRAINT track_title_max_length 
    CHECK (length(title) <= 255);

-- Ensure file URL is not empty
ALTER TABLE public.tracks
  ADD CONSTRAINT track_file_url_not_empty 
    CHECK (length(trim(file_url)) > 0);

-- Ensure duration is positive if provided
ALTER TABLE public.tracks
  ADD CONSTRAINT track_duration_positive 
    CHECK (duration IS NULL OR duration > 0);

-- Ensure file size is positive if provided
ALTER TABLE public.tracks
  ADD CONSTRAINT track_file_size_positive 
    CHECK (file_size IS NULL OR file_size > 0);

-- Ensure compression ratio is reasonable if provided
ALTER TABLE public.tracks
  ADD CONSTRAINT track_compression_ratio_valid 
    CHECK (compression_ratio IS NULL OR (compression_ratio >= 0.1 AND compression_ratio <= 100));

-- ============================================================================
-- 5. VERIFY MIGRATION SUCCESS
-- ============================================================================

-- Check that all audio posts have track_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.posts
  WHERE post_type = 'audio'
    AND track_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Finalization failed: % audio posts without track_id', orphaned_count;
  END IF;
  
  RAISE NOTICE 'Verification passed: All audio posts have track_id';
END $$;

-- Check that all tracks referenced by posts exist
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.posts p
  WHERE p.track_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.tracks t WHERE t.id = p.track_id
    );
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Finalization failed: % posts reference non-existent tracks', invalid_count;
  END IF;
  
  RAISE NOTICE 'Verification passed: All post track references are valid';
END $$;

-- Check that all playlist tracks reference valid tracks
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
    RAISE EXCEPTION 'Finalization failed: % playlist tracks reference non-existent tracks', invalid_count;
  END IF;
  
  RAISE NOTICE 'Verification passed: All playlist track references are valid';
END $$;

-- ============================================================================
-- 6. ADD HELPFUL FUNCTIONS for track management
-- ============================================================================

-- Function to get track usage statistics
CREATE OR REPLACE FUNCTION public.get_track_usage_stats(track_uuid UUID)
RETURNS TABLE (
  post_count BIGINT,
  playlist_count BIGINT,
  total_usage BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.posts WHERE track_id = track_uuid) as post_count,
    (SELECT COUNT(*) FROM public.playlist_tracks WHERE track_id = track_uuid) as playlist_count,
    (SELECT COUNT(*) FROM public.posts WHERE track_id = track_uuid) + 
    (SELECT COUNT(*) FROM public.playlist_tracks WHERE track_id = track_uuid) as total_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_track_usage_stats IS 
  'Returns usage statistics for a track (how many posts and playlists use it)';

-- Function to find orphaned tracks (not used anywhere)
CREATE OR REPLACE FUNCTION public.find_orphaned_tracks()
RETURNS TABLE (
  track_id UUID,
  title TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as track_id,
    t.title,
    t.user_id,
    t.created_at
  FROM public.tracks t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.posts p WHERE p.track_id = t.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.playlist_tracks pt WHERE pt.track_id = t.id
  )
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.find_orphaned_tracks IS 
  'Finds tracks that are not referenced by any posts or playlists (user library tracks)';

-- ============================================================================
-- 7. UPDATE RLS POLICIES (ensure they are correct)
-- ============================================================================

-- Ensure posts can only reference tracks the user has access to
DROP POLICY IF EXISTS "Users can create audio posts with accessible tracks" ON public.posts;

CREATE POLICY "Users can create audio posts with accessible tracks" ON public.posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  (
    post_type = 'text' OR
    (
      post_type = 'audio' AND
      track_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.tracks t
        WHERE t.id = track_id
        AND (t.user_id = auth.uid() OR t.is_public = true)
      )
    )
  )
);

COMMENT ON POLICY "Users can create audio posts with accessible tracks" ON public.posts IS
  'Ensures users can only create audio posts with tracks they own or that are public';

-- ============================================================================
-- 8. ADD MIGRATION METADATA
-- ============================================================================

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT UNIQUE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT
);

COMMENT ON TABLE public.migration_log IS 
  'Tracks completed data migrations for auditing and rollback purposes';

-- Record migration completion
INSERT INTO public.migration_log (
  migration_name,
  completed_at,
  description
) VALUES (
  '004_finalize_tracks_posts_separation',
  NOW(),
  'Added final constraints, indexes, and helper functions for tracks-posts separation'
) ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE '=================================================================';
RAISE NOTICE 'Migration 004_finalize_tracks_posts_separation completed successfully';
RAISE NOTICE '=================================================================';
RAISE NOTICE 'Summary:';
RAISE NOTICE '- Added constraint: audio posts must have track_id';
RAISE NOTICE '- Marked deprecated audio_* columns in posts table';
RAISE NOTICE '- Added performance indexes for tracks table';
RAISE NOTICE '- Added data integrity constraints';
RAISE NOTICE '- Created helper functions for track management';
RAISE NOTICE '- Updated RLS policies';
RAISE NOTICE '=================================================================';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Monitor application for any issues';
RAISE NOTICE '2. After 2-4 weeks verification period, run migration 005 to remove deprecated columns';
RAISE NOTICE '3. Update application code to remove compatibility layer';
RAISE NOTICE '=================================================================';

COMMIT;
