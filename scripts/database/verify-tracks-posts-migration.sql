-- Migration Verification Queries
-- Description: Comprehensive verification queries for tracks-posts separation migration
-- Requirements: 5.5, 9.4
--
-- These queries help verify the success of the data migration and identify any issues.
-- Run these queries after completing migrations 002 and 003.

-- ============================================================================
-- PRE-MIGRATION BASELINE QUERIES
-- Run these BEFORE migration to establish baseline counts
-- ============================================================================

-- Query 1: Count audio posts (baseline)
SELECT 
  'Audio Posts (Baseline)' as metric,
  COUNT(*) as count
FROM public.posts
WHERE post_type = 'audio';

-- Query 2: Count existing tracks (baseline)
SELECT 
  'Existing Tracks (Baseline)' as metric,
  COUNT(*) as count
FROM public.tracks;

-- Query 3: Count playlist_tracks entries (baseline)
SELECT 
  'Playlist Tracks (Baseline)' as metric,
  COUNT(*) as count
FROM public.playlist_tracks;

-- Query 4: Sample audio post data (for comparison)
SELECT 
  id,
  user_id,
  audio_url,
  audio_filename,
  audio_duration,
  created_at
FROM public.posts
WHERE post_type = 'audio'
LIMIT 5;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- Run these AFTER migration to verify success
-- ============================================================================

-- Query 5: Check for orphaned audio posts (should return 0)
SELECT 
  'Orphaned Audio Posts' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM public.posts
WHERE post_type = 'audio'
  AND track_id IS NULL;

-- Query 6: List orphaned audio posts (if any exist)
SELECT 
  id,
  user_id,
  content,
  audio_url,
  created_at
FROM public.posts
WHERE post_type = 'audio'
  AND track_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Query 7: Check for unreferenced tracks
-- These are tracks not used in any posts or playlists (could be user library tracks)
SELECT 
  'Unreferenced Tracks' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✓ INFO'
    ELSE '✗ FAIL'
  END as status
FROM public.tracks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts p WHERE p.track_id = t.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.playlist_tracks pt WHERE pt.track_id = t.id
);

-- Query 8: List unreferenced tracks (for review)
SELECT 
  t.id,
  t.user_id,
  t.title,
  t.file_url,
  t.created_at,
  'No posts or playlists reference this track' as note
FROM public.tracks t
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts p WHERE p.track_id = t.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.playlist_tracks pt WHERE pt.track_id = t.id
)
ORDER BY t.created_at DESC
LIMIT 10;

-- Query 9: Check for invalid playlist references (should return 0)
SELECT 
  'Invalid Playlist Track References' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
);

-- Query 10: List invalid playlist references (if any exist)
SELECT 
  pt.id,
  pt.playlist_id,
  pt.track_id,
  pt.position,
  'Track does not exist' as issue
FROM public.playlist_tracks pt
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id
)
ORDER BY pt.playlist_id, pt.position
LIMIT 10;

-- Query 11: Compare counts before/after migration
SELECT 
  (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio') as audio_posts,
  (SELECT COUNT(*) FROM public.tracks) as total_tracks,
  (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NOT NULL) as posts_with_tracks,
  (SELECT COUNT(*) FROM public.playlist_tracks) as playlist_tracks,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio') = 
         (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NOT NULL)
    THEN '✓ All audio posts have tracks'
    ELSE '✗ Some audio posts missing tracks'
  END as migration_status;

-- Query 12: Verify track data integrity
SELECT 
  'Tracks Without File URL' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM public.tracks
WHERE file_url IS NULL OR file_url = '';

-- Query 13: Verify track ownership
SELECT 
  'Tracks Without User ID' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM public.tracks
WHERE user_id IS NULL;

-- Query 14: Check for duplicate tracks (same file_url and user_id)
SELECT 
  'Duplicate Tracks' as issue_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '⚠ WARNING'
  END as status
FROM (
  SELECT file_url, user_id, COUNT(*) as dup_count
  FROM public.tracks
  GROUP BY file_url, user_id
  HAVING COUNT(*) > 1
) duplicates;

-- Query 15: List duplicate tracks (if any exist)
SELECT 
  t1.id,
  t1.user_id,
  t1.title,
  t1.file_url,
  t1.created_at,
  COUNT(*) OVER (PARTITION BY t1.file_url, t1.user_id) as duplicate_count
FROM public.tracks t1
WHERE EXISTS (
  SELECT 1
  FROM public.tracks t2
  WHERE t2.file_url = t1.file_url
    AND t2.user_id = t1.user_id
    AND t2.id != t1.id
)
ORDER BY t1.file_url, t1.created_at;

-- Query 16: Verify foreign key constraints exist
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✓ Constraint exists' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('posts', 'playlist_tracks')
  AND kcu.column_name = 'track_id';

-- Query 17: Sample migrated data verification
-- Compare a few audio posts with their corresponding tracks
SELECT 
  p.id as post_id,
  p.user_id as post_user_id,
  p.content as post_content,
  p.track_id,
  t.id as track_id_verify,
  t.title as track_title,
  t.file_url as track_file_url,
  t.user_id as track_user_id,
  CASE 
    WHEN p.user_id = t.user_id THEN '✓ User IDs match'
    ELSE '✗ User IDs mismatch'
  END as user_id_check,
  CASE 
    WHEN p.audio_url = t.file_url THEN '✓ URLs match'
    ELSE '✗ URLs mismatch'
  END as url_check
FROM public.posts p
INNER JOIN public.tracks t ON p.track_id = t.id
WHERE p.post_type = 'audio'
ORDER BY p.created_at DESC
LIMIT 10;

-- Query 18: Playlist integrity check
-- Verify playlists can properly join with tracks
SELECT 
  pl.id as playlist_id,
  pl.name as playlist_name,
  COUNT(pt.id) as track_count,
  COUNT(t.id) as valid_track_count,
  CASE 
    WHEN COUNT(pt.id) = COUNT(t.id) THEN '✓ All tracks valid'
    ELSE '✗ Some tracks invalid'
  END as integrity_status
FROM public.playlists pl
LEFT JOIN public.playlist_tracks pt ON pl.id = pt.playlist_id
LEFT JOIN public.tracks t ON pt.track_id = t.id
GROUP BY pl.id, pl.name
ORDER BY pl.created_at DESC
LIMIT 10;

-- Query 19: Track usage statistics
SELECT 
  t.id,
  t.title,
  t.user_id,
  COUNT(DISTINCT p.id) as used_in_posts,
  COUNT(DISTINCT pt.playlist_id) as used_in_playlists,
  t.created_at
FROM public.tracks t
LEFT JOIN public.posts p ON t.id = p.track_id
LEFT JOIN public.playlist_tracks pt ON t.id = pt.track_id
GROUP BY t.id, t.title, t.user_id, t.created_at
ORDER BY (COUNT(DISTINCT p.id) + COUNT(DISTINCT pt.playlist_id)) DESC
LIMIT 10;

-- Query 20: Migration summary report
SELECT 
  'Migration Summary' as report_type,
  json_build_object(
    'total_audio_posts', (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio'),
    'posts_with_tracks', (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NOT NULL),
    'orphaned_posts', (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NULL),
    'total_tracks', (SELECT COUNT(*) FROM public.tracks),
    'tracks_in_posts', (SELECT COUNT(DISTINCT track_id) FROM public.posts WHERE track_id IS NOT NULL),
    'tracks_in_playlists', (SELECT COUNT(DISTINCT track_id) FROM public.playlist_tracks),
    'unreferenced_tracks', (
      SELECT COUNT(*) FROM public.tracks t
      WHERE NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.track_id = t.id)
        AND NOT EXISTS (SELECT 1 FROM public.playlist_tracks pt WHERE pt.track_id = t.id)
    ),
    'total_playlist_tracks', (SELECT COUNT(*) FROM public.playlist_tracks),
    'invalid_playlist_refs', (
      SELECT COUNT(*) FROM public.playlist_tracks pt
      WHERE NOT EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id)
    ),
    'migration_success', (
      SELECT CASE 
        WHEN (SELECT COUNT(*) FROM public.posts WHERE post_type = 'audio' AND track_id IS NULL) = 0
         AND (SELECT COUNT(*) FROM public.playlist_tracks pt WHERE NOT EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = pt.track_id)) = 0
        THEN true
        ELSE false
      END
    )
  ) as summary_data;

-- ============================================================================
-- CLEANUP QUERIES (Run only after verification is complete)
-- ============================================================================

-- Query 21: Identify deprecated columns that can be removed
-- (DO NOT RUN - for information only)
-- These columns can be removed after verification period:
-- - posts.audio_url
-- - posts.audio_filename
-- - posts.audio_duration
-- - posts.audio_file_size
-- - posts.audio_mime_type

SELECT 
  'Deprecated Columns' as info,
  'Run migration 004 to add constraints and mark columns as deprecated' as next_step;

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- Query 22: Find posts with mismatched audio data
SELECT 
  p.id,
  p.user_id,
  p.audio_url as post_audio_url,
  t.file_url as track_file_url,
  CASE 
    WHEN p.audio_url != t.file_url THEN 'URL mismatch'
    WHEN p.user_id != t.user_id THEN 'User ID mismatch'
    ELSE 'Unknown issue'
  END as issue_type
FROM public.posts p
INNER JOIN public.tracks t ON p.track_id = t.id
WHERE p.post_type = 'audio'
  AND (p.audio_url != t.file_url OR p.user_id != t.user_id)
LIMIT 10;

-- Query 23: Find tracks with missing metadata
SELECT 
  id,
  user_id,
  title,
  file_url,
  CASE 
    WHEN title IS NULL OR title = '' THEN 'Missing title'
    WHEN file_url IS NULL OR file_url = '' THEN 'Missing file_url'
    WHEN user_id IS NULL THEN 'Missing user_id'
    ELSE 'Unknown issue'
  END as issue_type
FROM public.tracks
WHERE title IS NULL OR title = ''
   OR file_url IS NULL OR file_url = ''
   OR user_id IS NULL
LIMIT 10;

-- Query 24: Check RLS policies on tracks table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tracks'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

-- After successful migration, you should see:
-- ✓ Query 5: 0 orphaned audio posts
-- ✓ Query 9: 0 invalid playlist references
-- ✓ Query 11: All audio posts have tracks
-- ✓ Query 12: 0 tracks without file URL
-- ✓ Query 13: 0 tracks without user ID
-- ✓ Query 16: Foreign key constraints exist for posts.track_id and playlist_tracks.track_id
-- ✓ Query 20: migration_success = true
--
-- Acceptable results:
-- ⚠ Query 7: Some unreferenced tracks (these could be user library tracks)
-- ⚠ Query 14: Some duplicate tracks (if users uploaded same file multiple times)
