-- Migration: Add foreign key relationship between playlists and user_profiles
-- This allows Supabase to automatically join playlists with profile information

-- Add foreign key constraint from playlists.user_id to user_profiles.user_id
-- Note: This assumes user_profiles table exists and has user_id column matching auth.users.id
-- The constraint is named for easy reference in queries

DO $
BEGIN
    -- Check if the foreign key already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'playlists_user_id_user_profiles_fkey'
        AND table_name = 'playlists'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.playlists
        ADD CONSTRAINT playlists_user_id_user_profiles_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.user_profiles(user_id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint playlists_user_id_user_profiles_fkey created successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint playlists_user_id_user_profiles_fkey already exists';
    END IF;
END $;

-- Add comment for documentation
COMMENT ON CONSTRAINT playlists_user_id_user_profiles_fkey ON public.playlists IS 
'Links playlists to user profiles for automatic joining in queries. Cascades deletes to maintain referential integrity.';
