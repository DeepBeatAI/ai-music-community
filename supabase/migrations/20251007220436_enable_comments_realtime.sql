-- Enable Realtime for comments table
-- This allows real-time subscriptions to work for comment INSERT/UPDATE/DELETE events

-- Add comments table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Update table comment to reflect realtime status
COMMENT ON TABLE comments IS 'Stores user comments on posts with support for nested replies up to 3 levels deep. Realtime enabled for live updates.';
