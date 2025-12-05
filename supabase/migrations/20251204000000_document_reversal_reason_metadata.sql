-- =====================================================
-- Document Reversal Reason in Metadata Column
-- =====================================================
-- This migration documents the expected structure of the
-- metadata JSONB column in moderation_actions table,
-- specifically for reversal-related information.
--
-- Requirements: 13.5, 14.1, 14.10
-- Task: 21.3 Database Updates - Add reversal_reason field to metadata JSONB column
-- =====================================================

-- Update the metadata column comment to document the reversal_reason field
COMMENT ON COLUMN public.moderation_actions.metadata IS 
  'Additional metadata about the action (JSON format).
   
   For reversal actions, this field contains:
   - reversal_reason (string): The reason provided for reversing the action
   - is_self_reversal (boolean): Whether the moderator reversed their own action
   - restriction_id (UUID): For restriction reversals, the ID of the removed restriction
   - restriction_type (string): For restriction reversals, the type of restriction removed
   - state_changes (array): Complete history of state changes for multiple reversals
   
   State Changes Array Structure (Requirements: 14.4):
   Each entry in the state_changes array represents a state transition:
   {
     "timestamp": "2024-01-01T12:00:00.000Z",
     "action": "applied" | "reversed" | "reapplied",
     "by_user_id": "uuid-here",
     "reason": "Reason for this state change",
     "is_self_action": boolean
   }
   
   Example structure for a reversal:
   {
     "reversal_reason": "False positive - user was framed",
     "is_self_reversal": false,
     "restriction_id": "uuid-here",
     "restriction_type": "posting_disabled",
     "state_changes": [
       {
         "timestamp": "2024-01-01T10:00:00.000Z",
         "action": "applied",
         "by_user_id": "moderator-1-uuid",
         "reason": "Spam posting",
         "is_self_action": false
       },
       {
         "timestamp": "2024-01-05T14:00:00.000Z",
         "action": "reversed",
         "by_user_id": "moderator-1-uuid",
         "reason": "False positive - user was framed",
         "is_self_action": true
       },
       {
         "timestamp": "2024-01-10T09:00:00.000Z",
         "action": "reapplied",
         "by_user_id": "moderator-2-uuid",
         "reason": "Further investigation confirmed violation",
         "is_self_action": false
       }
     ]
   }
   
   This metadata is immutable once set and forms part of the audit trail.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Documented reversal_reason field structure in metadata column
-- ✓ Documented additional reversal-related metadata fields
-- ✓ Provided example structure for reversal metadata
-- ✓ Noted immutability requirement for audit trail
--
-- Note: JSONB columns are schema-less, so no structural changes
-- are needed. This migration serves as documentation for the
-- expected metadata structure when actions are reversed.
-- =====================================================
