-- Migration: Add metadata column to moderation_reports table
-- Feature: Enhanced Report Evidence & Context
-- Date: 2026-01-02
-- Requirements: 1.2, 2.2, 4.2, 13.1

-- Add metadata JSONB column to store evidence fields
ALTER TABLE public.moderation_reports
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Add column comment for documentation
COMMENT ON COLUMN public.moderation_reports.metadata IS 
  'JSONB column storing evidence fields for enhanced report context.
   Structure: {
     originalWorkLink?: string,      -- Copyright: Link to original work
     proofOfOwnership?: string,      -- Copyright: Proof of ownership text
     audioTimestamp?: string,        -- Audio: Timestamp(s) where violation occurs
     reporterAccuracy?: {            -- Reporter: Accuracy statistics
       totalReports: number,
       accurateReports: number,
       accuracyRate: number
     }
   }';

-- Create GIN index on metadata for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_moderation_reports_metadata 
ON public.moderation_reports USING GIN (metadata);

-- Add index for reports with evidence (for filtering)
CREATE INDEX IF NOT EXISTS idx_moderation_reports_has_evidence 
ON public.moderation_reports ((metadata IS NOT NULL AND metadata != 'null'::jsonb));

COMMENT ON INDEX idx_moderation_reports_metadata IS 
  'GIN index on metadata JSONB column for efficient queries on evidence fields';

COMMENT ON INDEX idx_moderation_reports_has_evidence IS 
  'Index for filtering reports that have evidence (non-null metadata)';
