-- Create get_trending_playlists function
-- This function calculates trending playlists based on play count and like count
-- Formula: (play_count × 0.7) + (like_count × 0.3)

CREATE OR REPLACE FUNCTION get_trending_playlists(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  playlist_id UUID,
  name VARCHAR(255),
  creator_username TEXT,
  creator_user_id UUID,
  play_count BIGINT,
  like_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  cover_image_url TEXT,
  track_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS playlist_id,
    p.name,
    up.username AS creator_username,
    p.user_id AS creator_user_id,
    COALESCE(COUNT(DISTINCT pp.id), 0) AS play_count,
    COALESCE(COUNT(DISTINCT pl.id), 0) AS like_count,
    (
      (COALESCE(COUNT(DISTINCT pp.id), 0) * 0.7) + 
      (COALESCE(COUNT(DISTINCT pl.id), 0) * 0.3)
    )::NUMERIC AS trending_score,
    p.created_at,
    p.cover_image_url,
    COALESCE(COUNT(DISTINCT pt.id), 0) AS track_count
  FROM playlists p
  JOIN user_profiles up ON up.user_id = p.user_id
  LEFT JOIN playlist_plays pp ON pp.playlist_id = p.id
  LEFT JOIN playlist_likes pl ON pl.playlist_id = p.id
  LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
  WHERE
    p.is_public = true
    AND (days_back = 0 OR p.created_at >= NOW() - (days_back || ' days')::INTERVAL)
  GROUP BY p.id, p.name, up.username, p.user_id, p.created_at, p.cover_image_url
  ORDER BY trending_score DESC, p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trending_playlists(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_playlists(INTEGER, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_trending_playlists(INTEGER, INTEGER) IS 
'Returns trending playlists based on play count and like count. 
Formula: (play_count × 0.7) + (like_count × 0.3).
Parameters:
- days_back: Number of days to look back (0 for all time)
- result_limit: Maximum number of results to return (default 10)';
