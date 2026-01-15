-- =====================================================
-- Migration: Add user_id to get_trending_tracks function
-- =====================================================
-- Purpose: Include user_id in trending tracks to enable hiding save button for own content
-- Date: 2026-01-15
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_trending_tracks(INTEGER, INTEGER);

-- Recreate function with user_id in return type
CREATE OR REPLACE FUNCTION get_trending_tracks(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  track_id UUID,
  title TEXT,
  author TEXT,
  user_id UUID,
  play_count INTEGER,
  like_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMPTZ,
  file_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as track_id,
    t.title,
    t.author,
    t.user_id,
    t.play_count,
    COALESCE(COUNT(DISTINCT pl.id), 0) as like_count,
    (
      (t.play_count * 0.7) +
      (COALESCE(COUNT(DISTINCT pl.id), 0) * 0.3)
    )::NUMERIC as trending_score,
    t.created_at,
    t.file_url
  FROM tracks t
  LEFT JOIN posts po ON po.track_id = t.id
  LEFT JOIN post_likes pl ON pl.post_id = po.id
  WHERE
    -- Filter by time range (0 = all time)
    (days_back = 0 OR t.created_at >= NOW() - (days_back || ' days')::INTERVAL)
    -- Only public tracks
    AND t.is_public = true
  GROUP BY t.id, t.title, t.author, t.user_id, t.play_count, t.created_at, t.file_url
  -- Only include tracks with at least some engagement
  HAVING t.play_count > 0 OR COALESCE(COUNT(DISTINCT pl.id), 0) > 0
  ORDER BY trending_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION get_trending_tracks IS 
'Returns trending tracks based on play count (70%) and likes (30%). 
Supports time-based filtering (7 days, 30 days, or all time).
Only includes public tracks with at least some engagement.
Includes user_id to enable hiding save button for own content.';
