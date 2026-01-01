-- Migration: Add "album" to moderation report and action types
-- This extends the existing moderation system to support album flagging

-- Add "album" to report_type constraint in moderation_reports table
ALTER TABLE moderation_reports
  DROP CONSTRAINT IF EXISTS valid_report_type;

ALTER TABLE moderation_reports
  ADD CONSTRAINT valid_report_type
  CHECK (report_type = ANY (ARRAY['post'::text, 'comment'::text, 'track'::text, 'user'::text, 'album'::text]));

-- Add "album" to target_type constraint in moderation_actions table
ALTER TABLE moderation_actions
  DROP CONSTRAINT IF EXISTS valid_target_type;

ALTER TABLE moderation_actions
  ADD CONSTRAINT valid_target_type
  CHECK ((target_type = ANY (ARRAY['post'::text, 'comment'::text, 'track'::text, 'user'::text, 'album'::text])) OR (target_type IS NULL));
