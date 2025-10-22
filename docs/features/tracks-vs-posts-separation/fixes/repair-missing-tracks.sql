-- Repair Script: Create Missing Tracks and Link to Posts
-- This script creates tracks for posts that have audio_url but no track_id

-- Step 1: Identify posts that need repair
-- Run this first to see what will be fixed
SELECT 
  id as post_id,
  user_id,
  audio_url,
  audio_filename,
  audio_duration,
  audio_file_size,
  created_at
FROM posts
WHERE post_type = 'audio'
  AND track_id IS NULL
  AND audio_url IS NOT NULL;

-- Step 2: Create tracks for posts with missing track_id
-- This will create a track record for each post that needs one
INSERT INTO tracks (
  id,
  user_id,
  title,
  description,
  file_url,
  duration,
  file_size,
  mime_type,
  is_public,
  original_file_size,
  compression_ratio,
  compression_applied,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  p.user_id,
  COALESCE(
    NULLIF(TRIM(p.audio_filename), ''),
    'Audio Track - ' || to_char(p.created_at, 'YYYY-MM-DD HH24:MI')
  ) as title,
  CASE 
    WHEN TRIM(p.content) != '' THEN p.content
    ELSE NULL
  END as description,
  p.audio_url as file_url,
  p.audio_duration as duration,
  p.audio_file_size as file_size,
  p.audio_mime_type as mime_type,
  TRUE as is_public,
  p.audio_file_size as original_file_size,
  1.0 as compression_ratio,
  FALSE as compression_applied,
  p.created_at,
  p.updated_at
FROM posts p
WHERE p.post_type = 'audio'
  AND p.track_id IS NULL
  AND p.audio_url IS NOT NULL
  AND NOT EXISTS (
    -- Don't create duplicate tracks
    SELECT 1 FROM tracks t
    WHERE t.file_url = p.audio_url
      AND t.user_id = p.user_id
  );

-- Step 3: Link posts to their newly created tracks
UPDATE posts p
SET track_id = t.id
FROM tracks t
WHERE p.post_type = 'audio'
  AND p.track_id IS NULL
  AND p.audio_url = t.file_url
  AND p.user_id = t.user_id;

-- Step 4: Verify the repair
-- This should return 0 rows if successful
SELECT 
  id as post_id,
  track_id,
  audio_url
FROM posts
WHERE post_type = 'audio'
  AND track_id IS NULL
  AND audio_url IS NOT NULL;

-- Step 5: Summary report
SELECT 
  COUNT(*) FILTER (WHERE track_id IS NOT NULL) as posts_with_tracks,
  COUNT(*) FILTER (WHERE track_id IS NULL AND audio_url IS NOT NULL) as posts_needing_repair,
  COUNT(*) as total_audio_posts
FROM posts
WHERE post_type = 'audio';
