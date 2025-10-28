-- Reload PostgREST schema cache
-- This forces Supabase to recognize the new 'author' column in the tracks table

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Alternative: You can also restart PostgREST from the Supabase Dashboard
-- Go to: Project Settings > API > Restart PostgREST

-- Verify the author column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tracks' 
      AND column_name = 'author'
  ) THEN
    RAISE NOTICE 'SUCCESS: author column exists in tracks table';
  ELSE
    RAISE EXCEPTION 'ERROR: author column not found in tracks table';
  END IF;
END $$;
