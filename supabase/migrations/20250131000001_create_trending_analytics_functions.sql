-- =====================================================
-- TRENDING ANALYTICS FUNCTIONS
-- =====================================================
-- Description: Creates database functions for trending tracks and popular creators
-- Version: 1.0
-- Created: 2025-01-31
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
-- =====================================================

-- =====================================================
-- FUNCTION: get_trending_tracks
-- =====================================================
-- Purpose: Get trending tracks based on play count and likes
-- Parameters:
--   - days_back: Number of days to look back (0 = all time)
--   - result_limit: Maximum number of results to return
-- Returns: Table of trending tracks with scores
-- =====================================================

CREATE OR REPLACE FUNCTION get_trending_tracks(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  track_id UUID,
  title TEXT,
  author TEXT,
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
  GROUP BY t.id, t.title, t.author, t.play_count, t.created_at, t.file_url
  -- Only include tracks with at least some engagement
  HAVING t.play_count > 0 OR COALESCE(COUNT(DISTINCT pl.id), 0) > 0
  ORDER BY trending_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add function comment for documentation
COMMENT ON FUNCTION get_trending_tracks IS 
'Returns trending tracks based on play count (70%) and likes (30%). 
Supports time-based filtering (7 days, 30 days, or all time).
Only includes public tracks with at least some engagement.';

-- =====================================================
-- FUNCTION: get_popular_creators
-- =====================================================
-- Purpose: Get popular creators based on total plays and likes
-- Parameters:
--   - days_back: Number of days to look back (0 = all time)
--   - result_limit: Maximum number of results to return
-- Returns: Table of popular creators with scores
-- =====================================================

CREATE OR REPLACE FUNCTION get_popular_creators(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_plays BIGINT,
  total_likes BIGINT,
  track_count BIGINT,
  creator_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.username,
    NULL::TEXT as avatar_url, -- avatar_url not yet implemented in user_profiles
    COALESCE(SUM(t.play_count), 0) as total_plays,
    COALESCE(COUNT(DISTINCT pl.id), 0) as total_likes,
    COUNT(DISTINCT t.id) as track_count,
    (
      (COALESCE(SUM(t.play_count), 0) * 0.6) +
      (COALESCE(COUNT(DISTINCT pl.id), 0) * 0.4)
    )::NUMERIC as creator_score
  FROM user_profiles up
  JOIN tracks t ON t.user_id = up.user_id
  LEFT JOIN posts po ON po.track_id = t.id
  LEFT JOIN post_likes pl ON pl.post_id = po.id
  WHERE
    -- Filter by time range (0 = all time)
    (days_back = 0 OR t.created_at >= NOW() - (days_back || ' days')::INTERVAL)
    -- Only public tracks
    AND t.is_public = true
  GROUP BY up.user_id, up.username
  -- Only include creators with at least some engagement
  HAVING COALESCE(SUM(t.play_count), 0) > 0 OR COALESCE(COUNT(DISTINCT pl.id), 0) > 0
  ORDER BY creator_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add function comment for documentation
COMMENT ON FUNCTION get_popular_creators IS 
'Returns popular creators based on total plays (60%) and likes (40%). 
Supports time-based filtering (7 days, 30 days, or all time).
Only includes creators with public tracks and at least some engagement.
Note: avatar_url is currently NULL as it is not yet implemented in user_profiles table.';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Get trending tracks for last 7 days
-- SELECT * FROM get_trending_tracks(7, 10);

-- Example 2: Get trending tracks for all time
-- SELECT * FROM get_trending_tracks(0, 10);

-- Example 3: Get popular creators for last 7 days
-- SELECT * FROM get_popular_creators(7, 5);

-- Example 4: Get popular creators for all time
-- SELECT * FROM get_popular_creators(0, 5);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next Steps:
-- 1. Test functions with existing data
-- 2. Verify UI displays trending tracks and popular creators
-- 3. Consider adding avatar_url to user_profiles table in future
-- 4. Monitor function performance and add indexes if needed
-- =====================================================
