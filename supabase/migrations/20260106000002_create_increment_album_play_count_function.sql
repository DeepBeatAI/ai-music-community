-- =====================================================
-- Migration: Create increment_album_play_count Function
-- Description: Creates a database function to increment album play counts
--              with validation for public albums and non-owner plays
-- Requirements: 3.1, 3.2, 3.3, 3.4, 13.4
-- =====================================================

-- =====================================================
-- Function: increment_album_play_count
-- =====================================================

-- Drop the function if it already exists (idempotent migration)
DROP FUNCTION IF EXISTS increment_album_play_count(UUID, UUID);

-- Create the function to increment album play count
CREATE OR REPLACE FUNCTION increment_album_play_count(
  album_uuid UUID,
  user_uuid UUID
)
RETURNS VOID AS $$
DECLARE
  album_owner_id UUID;
  album_is_public BOOLEAN;
BEGIN
  -- Get album owner and public status
  SELECT user_id, is_public INTO album_owner_id, album_is_public
  FROM albums
  WHERE id = album_uuid;
  
  -- Only increment if album is public and user is not the owner
  IF album_is_public AND album_owner_id != user_uuid THEN
    -- Insert play record into album_plays table
    INSERT INTO album_plays (album_id, user_id)
    VALUES (album_uuid, user_uuid);
    
    -- Increment play_count on albums table
    UPDATE albums
    SET play_count = play_count + 1
    WHERE id = album_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_album_play_count(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION increment_album_play_count(UUID, UUID) IS 
'Increments the play count for an album and records the play event.
Only increments for public albums when played by non-owners.
Parameters:
  - album_uuid: UUID of the album being played
  - user_uuid: UUID of the user playing the album
Requirements: 3.1, 3.2, 3.3, 3.4, 13.4';

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Created increment_album_play_count function
-- ✓ Function validates album is public (Requirement 3.3)
-- ✓ Function validates user is not the owner (Requirement 3.2)
-- ✓ Function inserts play record into album_plays table (Requirement 3.4)
-- ✓ Function increments play_count on albums table (Requirement 3.1)
-- ✓ Function uses SECURITY DEFINER for proper permissions (Requirement 13.4)
