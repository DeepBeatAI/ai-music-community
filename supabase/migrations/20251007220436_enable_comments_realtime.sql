-- Enable Realtime for comments table
-- This allows real-time subscriptions to work for comment INSERT/UPDATE/DELETE events

-- Add comments table to the realtime publication (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE comments;
    END IF;
END $$;

-- Update table comment to reflect realtime status
COMMENT ON TABLE comments IS 'Stores user comments on posts with support for nested replies up to 3 levels deep. Realtime enabled for live updates.';
