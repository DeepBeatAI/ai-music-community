-- Migration: Play Count Tracking and Analytics
-- Phase 3: Track Metadata Enhancements
-- Created: 2025-01-27
-- Description: Implements play count tracking with atomic increment function,
--              trending tracks calculation, and popular creators analytics

BEGIN;

-- ============================================================================
-- STEP 1: Verify and Configure play_count Column
-- ============================================================================

-- Ensure play_count column exists with proper default
-- (Should already exist from initial schema, but verify)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'play_count'
  ) THEN
    ALTER TABLE tracks ADD COLUMN play_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Ensure default is set
ALTER TABLE tracks ALTER COLUMN play_count SET DEFAULT 0;

-- Ensure NOT NULL constraint
ALTER TABLE tracks ALTER COLUMN play_count SET NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN tracks.play_count IS 'Number of times this track has been played for 30+ seconds. Incremented atomically via increment_play_count() function.';

-- ============================================================================
-- STEP 2: Add Performance Indexes
-- ============================================================================

-- Index for sorting by play count (descending)
CREATE INDEX IF NOT EXISTS idx_tracks_play_count 
ON tracks(play_count DESC);

-- Composite index for trending queries (play count + recency)
CREATE INDEX IF NOT EXISTS idx_tracks_trending 
ON tracks(play_count DESC, created_at DESC);

-- Index for public tracks filtering (used in analytics)
CREATE INDEX IF NOT EXISTS idx_tracks_public 
ON tracks(is_public) WHERE is_public = true;

-- ============================================================================
-- STEP 3: Create Atomic Play Count Increment Function
-- ============================================================================

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS increment_play_count(UUID);

-- Create function to atomically increment play count
CREATE OR REPLACE FUNCTION increment_play_count(track_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atomically increment play_count and update timestamp
  UPDATE tracks
  SET 
    play_count = play_count + 1,
    updated_at = NOW()
  WHERE id = track_uuid;
  
  -- Note: No error if track doesn't exist (silent failure for robustness)
  -- The calling code should validate track existence before calling
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION increment_play_count(UUID) IS 
'Atomically increments the play count for a track. Called when a track has been played for 30+ seconds. Uses SECURITY DEFINER to allow authenticated users to increment counts.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_play_count(UUID) TO authenticated;

-- ============================================================================
-- STEP 4: Create Trending Tracks Function
-- ============================================================================

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS get_trending_tracks(INTEGER, INTEGER);

-- Create function to calculate and return trending tracks
CREATE OR REPLACE FUNCTION get_trending_tracks(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  track_id UUID,
  title TEXT,
  author TEXT,
  play_count INTEGER,
  like_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as track_id,
    t.title,
    t.author,
    t.play_count,
    COALESCE(COUNT(DISTINCT pl.id), 0) as like_count,
    (
      (t.play_count * 0.6) +
      (COALESCE(COUNT(DISTINCT pl.id), 0) * 0.3) +
      (GREATEST(0, 100 - EXTRACT(DAY FROM NOW() - t.created_at)::INTEGER) * 0.1)
    )::NUMERIC as trending_score,
    t.created_at
  FROM tracks t
  LEFT JOIN posts p ON p.track_id = t.id
  LEFT JOIN post_likes pl ON pl.post_id = p.id
  WHERE
    -- Filter by time range (0 = all time)
    (days_back = 0 OR t.created_at >= NOW() - (days_back || ' days')::INTERVAL)
    -- Only public tracks
    AND t.is_public = true
  GROUP BY t.id, t.title, t.author, t.play_count, t.created_at
  ORDER BY trending_score DESC
  LIMIT result_limit;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_trending_tracks(INTEGER, INTEGER) IS 
'Calculates trending tracks based on play count (60%), likes (30%), and recency (10%). 
Parameters: days_back (0 for all time), result_limit (max results to return).
Returns: track details with calculated trending score.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trending_tracks(INTEGER, INTEGER) TO authenticated;

-- Also grant to anon for public discovery pages
GRANT EXECUTE ON FUNCTION get_trending_tracks(INTEGER, INTEGER) TO anon;

-- ============================================================================
-- STEP 5: Create Popular Creators Function
-- ============================================================================

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS get_popular_creators(INTEGER, INTEGER);

-- Create function to calculate and return popular creators
CREATE OR REPLACE FUNCTION get_popular_creators(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_plays BIGINT,
  total_likes BIGINT,
  track_count BIGINT,
  creator_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.username,
    p.avatar_url,
    COALESCE(SUM(t.play_count), 0) as total_plays,
    COALESCE(COUNT(DISTINCT pl.id), 0) as total_likes,
    COUNT(DISTINCT t.id) as track_count,
    (
      (COALESCE(SUM(t.play_count), 0) * 0.6) +
      (COALESCE(COUNT(DISTINCT pl.id), 0) * 0.4)
    )::NUMERIC as creator_score
  FROM profiles p
  JOIN tracks t ON t.user_id = p.id
  LEFT JOIN posts po ON po.track_id = t.id
  LEFT JOIN post_likes pl ON pl.post_id = po.id
  WHERE
    -- Filter by time range (0 = all time)
    (days_back = 0 OR t.created_at >= NOW() - (days_back || ' days')::INTERVAL)
    -- Only public tracks
    AND t.is_public = true
  GROUP BY p.id, p.username, p.avatar_url
  -- Only include creators with at least some engagement
  HAVING COALESCE(SUM(t.play_count), 0) > 0 OR COALESCE(COUNT(DISTINCT pl.id), 0) > 0
  ORDER BY creator_score DESC
  LIMIT result_limit;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_popular_creators(INTEGER, INTEGER) IS 
'Calculates popular creators based on total plays (60%) and total likes (40%) across all their tracks.
Parameters: days_back (0 for all time), result_limit (max results to return).
Returns: creator details with aggregated stats and calculated creator score.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_popular_creators(INTEGER, INTEGER) TO authenticated;

-- Also grant to anon for public discovery pages
GRANT EXECUTE ON FUNCTION get_popular_creators(INTEGER, INTEGER) TO anon;

-- ============================================================================
-- STEP 6: Verification and Logging
-- ============================================================================

DO $$ 
DECLARE
  track_count INTEGER;
  avg_play_count NUMERIC;
BEGIN
  -- Count total tracks
  SELECT COUNT(*) INTO track_count FROM tracks;
  
  -- Calculate average play count
  SELECT AVG(play_count) INTO avg_play_count FROM tracks;
  
  RAISE NOTICE '=== Play Count Tracking Migration Complete ===';
  RAISE NOTICE 'Total tracks: %', track_count;
  RAISE NOTICE 'Average play count: %', COALESCE(avg_play_count, 0);
  RAISE NOTICE 'Indexes created: idx_tracks_play_count, idx_tracks_trending, idx_tracks_public';
  RAISE NOTICE 'Functions created: increment_play_count, get_trending_tracks, get_popular_creators';
  RAISE NOTICE 'Permissions granted to: authenticated, anon (for trending/popular functions)';
END $$;

COMMIT;
