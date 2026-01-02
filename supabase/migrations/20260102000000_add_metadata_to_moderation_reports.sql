-- =====================================================
-- Add metadata column to moderation_reports table
-- =====================================================
-- This migration adds the metadata JSONB column to store
-- evidence fields for reports (copyright evidence, timestamps, etc.)
--
-- Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2
-- Feature: enhanced-report-evidence
-- =====================================================

-- Add metadata column to moderation_reports table
ALTER TABLE public.moderation_reports
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.moderation_reports.metadata IS 
  'JSONB column storing evidence fields for reports:
   - originalWorkLink: URL to original copyrighted work
   - proofOfOwnership: Text describing proof of ownership
   - audioTimestamp: Timestamp in audio where violation occurs (MM:SS or HH:MM:SS)
   - reporterAccuracy: Calculated reporter accuracy metrics (for display)';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_moderation_reports_metadata_gin
  ON public.moderation_reports USING GIN (metadata);

-- Create index for reports with evidence (for report quality metrics)
CREATE INDEX IF NOT EXISTS idx_moderation_reports_with_evidence
  ON public.moderation_reports ((metadata IS NOT NULL AND metadata != 'null'::jsonb))
  WHERE metadata IS NOT NULL;
