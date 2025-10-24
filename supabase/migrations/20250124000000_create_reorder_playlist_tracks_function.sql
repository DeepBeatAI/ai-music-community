-- Migration: Create reorder_playlist_tracks function for batch position updates
-- Description: Allows efficient reordering of tracks within a playlist by updating positions in a single transaction

-- Create function to reorder playlist tracks
CREATE OR REPLACE FUNCTION reorder_playlist_tracks(
  p_playlist_id UUID,
  p_track_positions JSONB -- Array of {track_id: uuid, position: int}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  track_update JSONB;
  v_user_id UUID;
  v_playlist_owner UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get the playlist owner
  SELECT user_id INTO v_playlist_owner
  FROM playlists
  WHERE id = p_playlist_id;
  
  -- Check if playlist exists
  IF v_playlist_owner IS NULL THEN
    RAISE EXCEPTION 'Playlist not found';
  END IF;
  
  -- Check if user owns the playlist
  IF v_playlist_owner != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to reorder tracks in this playlist';
  END IF;
  
  -- Update each track position
  FOR track_update IN SELECT * FROM jsonb_array_elements(p_track_positions)
  LOOP
    UPDATE playlist_tracks
    SET position = (track_update->>'position')::INTEGER,
        updated_at = NOW()
    WHERE playlist_id = p_playlist_id
      AND track_id = (track_update->>'track_id')::UUID;
  END LOOP;
  
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION reorder_playlist_tracks(UUID, JSONB) IS 
  'Reorders tracks within a playlist by updating their positions. Only the playlist owner can reorder tracks.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reorder_playlist_tracks(UUID, JSONB) TO authenticated;
