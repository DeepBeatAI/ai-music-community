-- ============================================================================
-- Verification Script for Tracks-Posts Separation Migration
-- ============================================================================
-- This script verifies that migration 20250122000000 was applied successfully
-- Run this in the Supabase SQL Editor after applying the migration
-- ============================================================================

\echo '========================================='
\echo 'Migration Verification Report'
\echo '========================================='
\echo ''

-- ============================================================================
-- 1. Check tracks table columns
-- ============================================================================

\echo '1. Tracks Table Columns'
\echo '-----------------------'

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tracks'
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- 2. Verify compression columns exist
-- ============================================================================

\echo '2. Compression Columns Check'
\echo '----------------------------'

SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'file_size') as has_file_size,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'mime_type') as has_mime_type,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'original_file_size') as has_original_file_size,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'compression_ratio') as has_compression_ratio,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'compression_applied') as has_compression_applied;

\echo ''
\echo 'Expected: All columns should return true'
\echo ''

-- ============================================================================
-- 3. Check posts table has track_id
-- ============================================================================

\echo '3. Posts Table track_id Column'
\echo '------------------------------'

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'track_id';

\echo ''
\echo 'Expected: track_id column exists with type uuid'
\echo ''

-- ============================================================================
-- 4. Check indexes
-- ============================================================================

\echo '4. Index Verification'
\echo '--------------------'

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'posts'
  AND indexname = 'idx_posts_track_id';

\echo ''
\echo 'Expected: idx_posts_track_id index exists'
\echo ''

-- ============================================================================
-- 5. Check foreign key constraints
-- ============================================================================

\echo '5. Foreign Key Constraints'
\echo '-------------------------'

SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'posts'
  AND tc.constraint_name = 'posts_track_id_fkey';

\echo ''
\echo 'Expected: posts_track_id_fkey constraint exists with ON DELETE SET NULL'
\echo ''

-- ============================================================================
-- 6. Check constraints on tracks table
-- ============================================================================

\echo '6. Tracks Table Constraints'
\echo '---------------------------'

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.tracks'::regclass
  AND conname IN (
    'track_file_size_positive',
    'track_original_file_size_positive',
    'track_compression_ratio_positive'
  )
ORDER BY conname;

\echo ''
\echo 'Expected: Three check constraints for positive values'
\echo ''

-- ============================================================================
-- 7. Check column comments
-- ============================================================================

\echo '7. Column Comments (Compression Metadata)'
\echo '-----------------------------------------'

SELECT 
  cols.column_name,
  pg_catalog.col_description(c.oid, cols.ordinal_position::int) as column_comment
FROM information_schema.columns cols
JOIN pg_catalog.pg_class c ON c.relname = cols.table_name
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace AND n.nspname = cols.table_schema
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'tracks'
  AND cols.column_name IN ('original_file_size', 'compression_ratio', 'compression_applied', 'file_size', 'mime_type')
ORDER BY cols.ordinal_position;

\echo ''

-- ============================================================================
-- 8. Check deprecation comments on posts audio columns
-- ============================================================================

\echo '8. Deprecation Comments on Posts Audio Columns'
\echo '----------------------------------------------'

SELECT 
  cols.column_name,
  pg_catalog.col_description(c.oid, cols.ordinal_position::int) as column_comment
FROM information_schema.columns cols
JOIN pg_catalog.pg_class c ON c.relname = cols.table_name
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace AND n.nspname = cols.table_schema
WHERE cols.table_schema = 'public'
  AND cols.table_name = 'posts'
  AND cols.column_name IN ('audio_url', 'audio_filename', 'audio_duration', 'audio_file_size', 'audio_mime_type')
ORDER BY cols.ordinal_position;

\echo ''
\echo 'Expected: All audio_* columns should have DEPRECATED comment'
\echo ''

-- ============================================================================
-- 9. Data integrity checks
-- ============================================================================

\echo '9. Data Integrity Checks'
\echo '-----------------------'

-- Count audio posts
SELECT 
  'Audio posts' as check_name,
  COUNT(*) as count
FROM public.posts
WHERE post_type = 'audio';

-- Count posts with track_id
SELECT 
  'Posts with track_id' as check_name,
  COUNT(*) as count
FROM public.posts
WHERE track_id IS NOT NULL;

-- Count orphaned audio posts (should be 0 after migration 002)
SELECT 
  'Orphaned audio posts' as check_name,
  COUNT(*) as count
FROM public.posts
WHERE post_type = 'audio' AND track_id IS NULL;

-- Count tracks
SELECT 
  'Total tracks' as check_name,
  COUNT(*) as count
FROM public.tracks;

\echo ''
\echo 'Expected: Orphaned audio posts should be 0 after full migration'
\echo ''

-- ============================================================================
-- 10. Summary
-- ============================================================================

\echo '========================================='
\echo 'Verification Complete'
\echo '========================================='
\echo ''
\echo 'Review the results above to confirm:'
\echo '  ✓ All compression columns exist in tracks table'
\echo '  ✓ track_id column exists in posts table'
\echo '  ✓ Index idx_posts_track_id exists'
\echo '  ✓ Foreign key constraint posts_track_id_fkey exists'
\echo '  ✓ Check constraints exist for positive values'
\echo '  ✓ Column comments are present'
\echo '  ✓ Deprecation comments on audio_* columns'
\echo ''
\echo 'If all checks pass, mark task 1.1 as complete!'
\echo ''
