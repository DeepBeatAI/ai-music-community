-- Create get_trending_albums function
-- This function calculates trending albums based on play count and like count
-- Formula: (play_count × 0.7) + (like_count × 0.3)

CREATE OR REPLACE FUNCTION get_trending_albums(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  album_id UUID,
  name TEXT,
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
    a.id AS album_id,
    a.name,
    up.username AS creator_username,
    a.user_id AS creator_user_id,
    COALESCE(COUNT(DISTINCT ap.id), 0) AS play_count,
    COALESCE(COUNT(DISTINCT al.id), 0) AS like_count,
    (
      (COALESCE(COUNT(DISTINCT ap.id), 0) * 0.7) + 
      (COALESCE(COUNT(DISTINCT al.id), 0) * 0.3)
    )::NUMERIC AS trending_score,
    a.created_at,
    a.cover_image_url,
    COALESCE(COUNT(DISTINCT at.id), 0) AS track_count
  FROM albums a
  JOIN user_profiles up ON up.user_id = a.user_id
  LEFT JOIN album_plays ap ON ap.album_id = a.id
  LEFT JOIN album_likes al ON al.album_id = a.id
  LEFT JOIN album_tracks at ON at.album_id = a.id
  WHERE
    a.is_public = true
    AND (days_back = 0 OR a.created_at >= NOW() - (days_back || ' days')::INTERVAL)
  GROUP BY a.id, a.name, up.username, a.user_id, a.created_at, a.cover_image_url
  ORDER BY trending_score DESC, a.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trending_albums(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_albums(INTEGER, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION get_trending_albums(INTEGER, INTEGER) IS 
'Returns trending albums based on play count and like count. 
Formula: (play_count × 0.7) + (like_count × 0.3).
Parameters:
- days_back: Number of days to look back (0 for all time)
- result_limit: Maximum number of results to return (default 10)';
