# Fix Missing track_id in Audio Posts

## Issue

Some audio posts may have `track_id` set to NULL, causing the "Invalid playlist or track reference" error when trying to add them to playlists.

## Root Cause

The dashboard was uploading files twice:
1. Manual upload to storage
2. Upload through `uploadTrack()` function

This caused tracks to be created with different file paths, potentially leaving some posts without proper track_id references.

## Fix Applied

**File:** `client/src/app/dashboard/page.tsx`

Removed the duplicate file upload. Now the flow is:
1. Call `uploadTrack()` which handles file upload AND track creation
2. Call `createAudioPost()` with the track ID

This fix applies to NEW audio posts only.

## Database Repair for Existing Posts

If you have existing audio posts with missing `track_id`, you can repair them using this SQL query:

```sql
-- Find audio posts without track_id
SELECT id, user_id, audio_url, audio_filename, created_at
FROM posts
WHERE post_type = 'audio'
  AND track_id IS NULL;

-- Repair by matching audio_url to existing tracks
UPDATE posts p
SET track_id = t.id
FROM tracks t
WHERE p.post_type = 'audio'
  AND p.track_id IS NULL
  AND p.audio_url = t.file_url
  AND p.user_id = t.user_id;

-- Verify the fix
SELECT COUNT(*) as fixed_posts
FROM posts
WHERE post_type = 'audio'
  AND track_id IS NOT NULL;
```

## Alternative: Create Missing Tracks

If the tracks don't exist for some posts, you can create them:

```sql
-- Create tracks for audio posts that don't have them
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
    SELECT 1 FROM tracks t
    WHERE t.file_url = p.audio_url
      AND t.user_id = p.user_id
  );

-- Then update the posts to reference the new tracks
UPDATE posts p
SET track_id = t.id
FROM tracks t
WHERE p.post_type = 'audio'
  AND p.audio_url = t.file_url
  AND p.user_id = t.user_id
  AND p.track_id IS NULL;
```

## Testing

After applying the fix:

1. Check that all audio posts have track_id:
   ```sql
   SELECT COUNT(*) FROM posts WHERE post_type = 'audio' AND track_id IS NULL;
   ```
   Should return 0.

2. Try adding an audio post to a playlist - should work without errors.

## Prevention

The code fix in `dashboard/page.tsx` prevents this issue for all future audio posts.

---

*Created: January 2025*
*Status: Fixed in code, database repair may be needed for existing posts*
