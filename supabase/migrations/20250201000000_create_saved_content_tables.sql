-- Migration: Create Saved Content Tables
-- Description: Creates tables for users to save tracks, albums, and playlists from other creators
-- Date: 2025-02-01

-- Create saved_tracks table
CREATE TABLE IF NOT EXISTS saved_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Create saved_albums table
CREATE TABLE IF NOT EXISTS saved_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

-- Create saved_playlists table
CREATE TABLE IF NOT EXISTS saved_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, playlist_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_tracks_user_id ON saved_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_tracks_track_id ON saved_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_saved_tracks_created_at ON saved_tracks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_albums_user_id ON saved_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_albums_album_id ON saved_albums(album_id);
CREATE INDEX IF NOT EXISTS idx_saved_albums_created_at ON saved_albums(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_playlists_user_id ON saved_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_playlists_playlist_id ON saved_playlists(playlist_id);
CREATE INDEX IF NOT EXISTS idx_saved_playlists_created_at ON saved_playlists(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_playlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own saved tracks" ON saved_tracks;
DROP POLICY IF EXISTS "Users can save tracks" ON saved_tracks;
DROP POLICY IF EXISTS "Users can unsave their own tracks" ON saved_tracks;

DROP POLICY IF EXISTS "Users can view their own saved albums" ON saved_albums;
DROP POLICY IF EXISTS "Users can save albums" ON saved_albums;
DROP POLICY IF EXISTS "Users can unsave their own albums" ON saved_albums;

DROP POLICY IF EXISTS "Users can view their own saved playlists" ON saved_playlists;
DROP POLICY IF EXISTS "Users can save playlists" ON saved_playlists;
DROP POLICY IF EXISTS "Users can unsave their own playlists" ON saved_playlists;

-- RLS Policies for saved_tracks
-- Users can view their own saved tracks
CREATE POLICY "Users can view their own saved tracks"
  ON saved_tracks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save tracks
CREATE POLICY "Users can save tracks"
  ON saved_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own tracks
CREATE POLICY "Users can unsave their own tracks"
  ON saved_tracks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for saved_albums
-- Users can view their own saved albums
CREATE POLICY "Users can view their own saved albums"
  ON saved_albums FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save albums
CREATE POLICY "Users can save albums"
  ON saved_albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own albums
CREATE POLICY "Users can unsave their own albums"
  ON saved_albums FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for saved_playlists
-- Users can view their own saved playlists
CREATE POLICY "Users can view their own saved playlists"
  ON saved_playlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save playlists
CREATE POLICY "Users can save playlists"
  ON saved_playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own playlists
CREATE POLICY "Users can unsave their own playlists"
  ON saved_playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON saved_tracks TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_albums TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_playlists TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE saved_tracks IS 'Stores tracks that users have saved from other creators';
COMMENT ON TABLE saved_albums IS 'Stores albums that users have saved from other creators';
COMMENT ON TABLE saved_playlists IS 'Stores playlists that users have saved from other creators';
