-- Fix ambiguous column references in get_user_activity_summary function
-- Issue: likes_given and likes_received columns exist in multiple tables
-- Solution: Explicitly qualify them with table alias

DROP FUNCTION IF EXISTS public.get_user_activity_summary(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_user_activity_summary(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  posts_count INTEGER,
  tracks_count INTEGER,
  albums_count INTEGER,
  playlists_count INTEGER,
  comments_count INTEGER,
  likes_given INTEGER,
  likes_received INTEGER,
  last_active TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT public.is_user_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can view user activity summaries';
  END IF;
  
  -- Validate p_days_back
  IF p_days_back < 1 OR p_days_back > 365 THEN
    RAISE EXCEPTION 'days_back must be between 1 and 365';
  END IF;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.posts 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM public.tracks 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM public.albums 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM public.playlists 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COUNT(*)::INTEGER FROM public.comments 
     WHERE user_id = p_user_id 
       AND created_at > now() - (p_days_back || ' days')::interval),
    (SELECT COALESCE(us.likes_given, 0)::INTEGER FROM public.user_stats us WHERE us.user_id = p_user_id),
    (SELECT COALESCE(us.likes_received, 0)::INTEGER FROM public.user_stats us WHERE us.user_id = p_user_id),
    (SELECT COALESCE(us.last_active, now()) FROM public.user_stats us WHERE us.user_id = p_user_id);
END;
$$;

COMMENT ON FUNCTION public.get_user_activity_summary IS 
  'Gets a summary of user activity for the admin dashboard. Only callable by admin users.
   Returns counts of posts, tracks, albums, playlists, comments, likes, and last active time.
   Fixed: Explicitly qualified column names with table alias to avoid ambiguous references.';
