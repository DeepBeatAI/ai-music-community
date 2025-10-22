-- Migration: Create Playlist System
-- This migration creates the playlists and playlist_tracks tables with full RLS policies,
-- indexes, triggers, and helper functions for the playlist management system.

-- ============================================================================
-- 1. Create playlists table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false NOT NULL,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT name_max_length CHECK (length(name) <= 255),
    CONSTRAINT description_max_length CHECK (description IS NULL OR length(description) <= 5000)
);

-- Add indexes for playlists table
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON public.playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON public.playlists(is_public) WHERE is_public = true;

-- Add table comment for documentation
COMMENT ON TABLE public.playlists IS 'Stores user-created playlists with public/private visibility controls. Includes edit tracking via updated_at timestamp.';
COMMENT ON COLUMN public.playlists.is_public IS 'Controls playlist visibility: true = viewable by all users, false = viewable only by owner';
COMMENT ON COLUMN public.playlists.updated_at IS 'Timestamp of last update. Automatically updated by trigger on UPDATE operations.';

-- ============================================================================
-- 2. Create playlist_tracks junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_playlist_track UNIQUE(playlist_id, track_id),
    CONSTRAINT position_positive CHECK (position >= 0)
);

-- Add indexes for playlist_tracks table
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON public.playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON public.playlist_tracks(playlist_id, position);

-- Add table comment for documentation
COMMENT ON TABLE public.playlist_tracks IS 'Junction table linking tracks to playlists with position ordering. Prevents duplicate tracks in same playlist via unique constraint.';
COMMENT ON COLUMN public.playlist_tracks.position IS 'Zero-based position of track in playlist for ordering';

-- ============================================================================
-- 3. Create trigger function to auto-update updated_at timestamp
-- ============================================================================

-- Create or replace the trigger function for playlists
CREATE OR REPLACE FUNCTION public.update_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Add trigger to playlists table
-- ============================================================================

-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;

-- Create trigger for playlists table
CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_playlist_updated_at();

-- ============================================================================
-- 5. Create helper function to get playlist track count
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_playlist_track_count(playlist_uuid UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.playlist_tracks
    WHERE playlist_id = playlist_uuid;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION public.get_playlist_track_count(UUID) IS 'Returns the number of tracks in a given playlist';

-- ============================================================================
-- 6. Enable Row Level Security for playlists table
-- ============================================================================

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own playlists
CREATE POLICY "Users can view own playlists" ON public.playlists
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Users can view public playlists
CREATE POLICY "Users can view public playlists" ON public.playlists
    FOR SELECT 
    USING (is_public = true);

-- Policy: Authenticated users can create playlists
CREATE POLICY "Authenticated users can create playlists" ON public.playlists
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own playlists
CREATE POLICY "Users can update own playlists" ON public.playlists
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own playlists
CREATE POLICY "Users can delete own playlists" ON public.playlists
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- 7. Enable Row Level Security for playlist_tracks table
-- ============================================================================

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tracks in their own playlists or public playlists
CREATE POLICY "Users can view tracks in accessible playlists" ON public.playlist_tracks
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE playlists.id = playlist_tracks.playlist_id
            AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
        )
    );

-- Policy: Users can add tracks to their own playlists
CREATE POLICY "Users can add tracks to own playlists" ON public.playlist_tracks
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE playlists.id = playlist_tracks.playlist_id
            AND playlists.user_id = auth.uid()
        )
    );

-- Policy: Users can remove tracks from their own playlists
CREATE POLICY "Users can remove tracks from own playlists" ON public.playlist_tracks
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE playlists.id = playlist_tracks.playlist_id
            AND playlists.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 8. Add tables to realtime publication (optional, for future use)
-- ============================================================================

-- Enable realtime for playlists table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'playlists'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Publication doesn't exist, skip
        NULL;
END $$;

-- Enable realtime for playlist_tracks table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'playlist_tracks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_tracks;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Publication doesn't exist, skip
        NULL;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary:
-- ✓ Created playlists table with proper constraints and indexes
-- ✓ Created playlist_tracks junction table with unique constraint
-- ✓ Added trigger to auto-update updated_at timestamp
-- ✓ Created helper function to get playlist track count
-- ✓ Implemented comprehensive RLS policies for data protection
-- ✓ Added indexes for query performance optimization
-- ✓ Enabled realtime subscriptions (optional)
