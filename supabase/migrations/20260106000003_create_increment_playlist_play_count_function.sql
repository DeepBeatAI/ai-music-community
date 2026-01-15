-- =====================================================
-- Migration: Create increment_playlist_play_count Function
-- Description: Creates a database function to increment playlist play counts
--              with validation for public playlists and non-owner plays
-- Requirements: 4.1, 4.2, 4.3, 4.4, 13.4
-- =====================================================

-- =====================================================
-- Function: increment_playlist_play_count
-- =====================================================

-- Drop the function if it already exists (idempotent migration)
DROP FUNCTION IF EXISTS increment_playlist_play_count(UUID, UUID);

-- Create the function to increment playlist play count
CREATE OR REPLACE FUNCTION increment_playlist_play_count(
  playlist_uuid UUID,
  user_uuid UUID
)
RETURNS VOID AS $$$
DECLARE
  playlist_owner_id UUID;
  playlist_is_public BOOLEAN;
BEGIN
  -- Get playlist owner and public status
  SELECT user_id, is_public INTO playlist_owner_id, playlist_is_public
  FROM playlists
  WHERE id = playlist_uuid;
  
  -- Only increment if playlist is public and user is not the owner
  IF playlist_is_public AND playlist_owner_id != user_uuid THEN
    -- Insert play record into playlist_plays table
    INSERT INTO playlist_plays (playlist_id, user_id)
    VALUES (playlist_uuid, user_uuid);
    
    -- Increment play_count on playlists table
    UPDATE playlists
    SET play_count = play_count + 1
    WHERE id = playlist_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_playlist_play_count(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION increment_playlist_play_count(UUID, UUID) IS 
'Increments the play count for a playlist and records the play event.
Only increments for public playlists when played by non-owners.
Parameters:
  - playlist_uuid: UUID of the playlist being played
  - user_uuid: UUID of the user playing the playlist
Requirements: 4.1, 4.2, 4.3, 4.4, 13.4';

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Created increment_playlist_play_count function
-- ✓ Function validates playlist is public (Requirement 4.3)
-- ✓ Function validates user is not the owner (Requirement 4.2)
-- ✓ Function inserts play record into playlist_plays table (Requirement 4.4)
-- ✓ Function increments play_count on playlists table (Requirement 4.1)
-- ✓ Function uses SECURITY DEFINER for proper permissions (Requirement 13.4)

