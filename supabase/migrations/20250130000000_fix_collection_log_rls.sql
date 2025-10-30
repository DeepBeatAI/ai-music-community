-- =====================================================
-- FIX COLLECTION LOG RLS POLICY
-- =====================================================
-- Description: Update RLS policy to allow authenticated users to view collection logs
--              This enables the analytics dashboard to display collection status
-- Version: 1.0
-- Created: 2025-01-30
-- Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
-- =====================================================

-- Drop the existing restrictive policy that only allows service role
DROP POLICY IF EXISTS "Service role can view collection logs" ON metric_collection_log;

-- Create new policy allowing authenticated users to view collection logs
CREATE POLICY "Authenticated users can view collection logs" 
ON metric_collection_log
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add policy comment for documentation
COMMENT ON POLICY "Authenticated users can view collection logs" ON metric_collection_log IS 
'Allows authenticated users to view collection logs for monitoring analytics system health. 
Service role can still write to the table via the "Service role can manage logs" policy.';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- After running this migration, verify:
-- 1. Authenticated users can SELECT from metric_collection_log
-- 2. Service role can still INSERT/UPDATE/DELETE (via existing policy)
-- 3. Anonymous users cannot access collection logs

-- Test query (run as authenticated user):
-- SELECT * FROM metric_collection_log ORDER BY started_at DESC LIMIT 5;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
