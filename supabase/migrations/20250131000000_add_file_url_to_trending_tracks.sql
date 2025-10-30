-- Migration: Add file_url to get_trending_tracks RPC Function
-- Created: 2025-01-31
-- Description: Updates get_trending_tracks function to include file_url in the return
--              This eliminates the need for an extra database query when playing tracks
--              from the analytics page trending section.

BEGIN;

-- ============================================================================
-- Update get_trending_tracks Function to Include file_url
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_trending_tracks(INTEGER, INTEGER);

-- Recreate function with file_url in return type
CREATE OR REPLACE FUNCTION get_trending_tracks(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  track_id UUID,
  title TEXT,
  author TEXT,
  file_url TEXT,
  play_count INTEGER,
  like_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT
    t.id as track_id,
    t.title,
    t.author,
    t.file_url,
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
  GROUP BY t.id, t.title, t.author, t.file_url, t.play_count, t.created_at
  ORDER BY trending_score DESC
  LIMIT result_limit;
END;
$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_trending_tracks(INTEGER, INTEGER) IS 
'Calculates trending tracks based on play count (60%), likes (30%), and recency (10%). 
Parameters: days_back (0 for all time), result_limit (max results to return).
Returns: track details including file_url for playback, with calculated trending score.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trending_tracks(INTEGER, INTEGER) TO authenticated;

-- Also grant to anon for public discovery pages
GRANT EXECUTE ON FUNCTION get_trending_tracks(INTEGER, INTEGER) TO anon;

-- ============================================================================
-- Verification
-- ============================================================================

DO $ 
BEGIN
  RAISE NOTICE '=== get_trending_tracks Function Updated ===';
  RAISE NOTICE 'Added file_url to return type';
  RAISE NOTICE 'Function now returns: track_id, title, author, file_url, play_count, like_count, trending_score, created_at';
  RAISE NOTICE 'Permissions granted to: authenticated, anon';
END $;

COMMIT;
