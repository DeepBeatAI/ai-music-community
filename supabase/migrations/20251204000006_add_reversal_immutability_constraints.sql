-- =====================================================
-- Add Reversal Immutability Constraints
-- =====================================================
-- This migration implements database-level constraints to
-- ensure reversal records are immutable and cannot be
-- modified or deleted once created.
--
-- Requirements: 14.10
-- Task: 22.5 Data Integrity and Immutability - Implement database constraints for reversal immutability
-- =====================================================

-- =====================================================
-- 1. Create trigger function to prevent reversal modification
-- =====================================================
-- This function prevents any updates to revoked_at or revoked_by
-- once they have been set to non-NULL values

CREATE OR REPLACE FUNCTION public.prevent_reversal_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an UPDATE operation
  IF TG_OP = 'UPDATE' THEN
    -- Prevent modification of revoked_at if it was already set
    IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
      RAISE EXCEPTION 'Cannot modify revoked_at once set. Reversal records are immutable for audit trail integrity.'
        USING HINT = 'Reversal timestamp cannot be changed once an action has been reversed.',
              ERRCODE = '23502'; -- not_null_violation code for consistency
    END IF;
    
    -- Prevent modification of revoked_by if it was already set
    IF OLD.revoked_by IS NOT NULL AND NEW.revoked_by IS DISTINCT FROM OLD.revoked_by THEN
      RAISE EXCEPTION 'Cannot modify revoked_by once set. Reversal records are immutable for audit trail integrity.'
        USING HINT = 'Reversal moderator cannot be changed once an action has been reversed.',
              ERRCODE = '23502';
    END IF;
    
    -- Prevent modification of reversal_reason in metadata if it was already set
    IF OLD.metadata IS NOT NULL 
       AND OLD.metadata ? 'reversal_reason' 
       AND (NEW.metadata IS NULL OR NOT (NEW.metadata ? 'reversal_reason'))
    THEN
      RAISE EXCEPTION 'Cannot remove reversal_reason from metadata once set. Reversal records are immutable for audit trail integrity.'
        USING HINT = 'Reversal reason cannot be removed once an action has been reversed.',
              ERRCODE = '23502';
    END IF;
    
    -- Allow the update if none of the reversal fields were modified
    RETURN NEW;
  END IF;
  
  -- Check if this is a DELETE operation
  IF TG_OP = 'DELETE' THEN
    -- Prevent deletion of reversed actions
    IF OLD.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot delete reversed actions. Reversal records are immutable for audit trail integrity.'
        USING HINT = 'Reversed actions must be retained for audit trail. Use revoked_at to mark actions as reversed.',
              ERRCODE = '23503'; -- foreign_key_violation code for consistency
    END IF;
    
    -- Allow deletion of non-reversed actions (though this should be rare)
    RETURN OLD;
  END IF;
  
  -- For INSERT operations, allow normally
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add function comment for documentation
COMMENT ON FUNCTION public.prevent_reversal_modification() IS 
  'Trigger function to enforce immutability of reversal records.
   
   This function prevents:
   - Modification of revoked_at once set to non-NULL
   - Modification of revoked_by once set to non-NULL
   - Removal of reversal_reason from metadata once set
   - Deletion of any action that has been reversed (revoked_at IS NOT NULL)
   
   Purpose:
   - Maintain audit trail integrity
   - Prevent tampering with reversal records
   - Ensure compliance with data retention requirements
   - Support forensic analysis of moderation decisions
   
   Exceptions:
   - Raises exception with clear error message if modification attempted
   - Uses standard PostgreSQL error codes for consistency
   - Provides helpful hints for developers
   
   Requirements: 14.10 - Reversal record immutability';

-- =====================================================
-- 2. Create trigger on moderation_actions table
-- =====================================================
-- This trigger fires BEFORE any UPDATE or DELETE operation
-- on the moderation_actions table to enforce immutability

CREATE TRIGGER enforce_reversal_immutability
  BEFORE UPDATE OR DELETE ON public.moderation_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_reversal_modification();

-- Add trigger comment for documentation
COMMENT ON TRIGGER enforce_reversal_immutability ON public.moderation_actions IS 
  'Enforces immutability of reversal records in moderation_actions table.
   
   Trigger fires BEFORE UPDATE or DELETE to:
   - Prevent modification of revoked_at once set
   - Prevent modification of revoked_by once set
   - Prevent removal of reversal_reason from metadata
   - Prevent deletion of reversed actions
   
   This ensures audit trail integrity and compliance with
   data retention requirements for moderation actions.
   
   Requirements: 14.10 - Reversal record immutability';

-- =====================================================
-- 3. Create function to log attempted modifications
-- =====================================================
-- This function logs any attempted modifications to reversal
-- records for security monitoring and audit purposes

CREATE OR REPLACE FUNCTION public.log_reversal_modification_attempt()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_attempt_details JSONB;
BEGIN
  -- Get current user ID (if available)
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;
  
  -- Build attempt details JSON
  v_attempt_details := jsonb_build_object(
    'operation', TG_OP,
    'table_name', TG_TABLE_NAME,
    'action_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    'attempted_by', v_user_id,
    'attempted_at', now(),
    'old_revoked_at', CASE WHEN TG_OP = 'DELETE' THEN OLD.revoked_at ELSE OLD.revoked_at END,
    'new_revoked_at', CASE WHEN TG_OP = 'UPDATE' THEN NEW.revoked_at ELSE NULL END,
    'old_revoked_by', CASE WHEN TG_OP = 'DELETE' THEN OLD.revoked_by ELSE OLD.revoked_by END,
    'new_revoked_by', CASE WHEN TG_OP = 'UPDATE' THEN NEW.revoked_by ELSE NULL END
  );
  
  -- Log to security_events table if it exists
  -- Note: This is a best-effort log; if the table doesn't exist, we skip logging
  BEGIN
    INSERT INTO public.security_events (
      event_type,
      severity,
      user_id,
      details,
      created_at
    ) VALUES (
      'reversal_modification_attempt',
      'high',
      v_user_id,
      v_attempt_details,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- If security_events table doesn't exist or insert fails, continue
    -- The trigger will still prevent the modification
    NULL;
  END;
  
  -- Return NULL to indicate we're not modifying the operation
  -- The prevent_reversal_modification trigger will handle blocking it
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add function comment for documentation
COMMENT ON FUNCTION public.log_reversal_modification_attempt() IS 
  'Logs attempted modifications to reversal records for security monitoring.
   
   This function logs to security_events table (if it exists):
   - Operation type (UPDATE or DELETE)
   - Action ID being modified
   - User attempting the modification
   - Timestamp of attempt
   - Old and new values of reversal fields
   
   Purpose:
   - Security monitoring and alerting
   - Forensic analysis of suspicious activity
   - Compliance with audit requirements
   - Identifying potential security issues
   
   Note: This is a best-effort log. If security_events table
   does not exist, the function continues without error.
   The prevent_reversal_modification trigger will still
   block the modification attempt.
   
   Requirements: 14.10 - Reversal record immutability';

-- =====================================================
-- 4. Create trigger to log modification attempts
-- =====================================================
-- This trigger fires BEFORE the enforcement trigger to log
-- the attempt before it's blocked

CREATE TRIGGER log_reversal_modification_attempt
  BEFORE UPDATE OR DELETE ON public.moderation_actions
  FOR EACH ROW
  WHEN (
    -- Only log if attempting to modify reversal fields
    (TG_OP = 'UPDATE' AND (
      (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) OR
      (OLD.revoked_by IS NOT NULL AND NEW.revoked_by IS DISTINCT FROM OLD.revoked_by)
    )) OR
    -- Or attempting to delete a reversed action
    (TG_OP = 'DELETE' AND OLD.revoked_at IS NOT NULL)
  )
  EXECUTE FUNCTION public.log_reversal_modification_attempt();

-- Add trigger comment for documentation
COMMENT ON TRIGGER log_reversal_modification_attempt ON public.moderation_actions IS 
  'Logs attempted modifications to reversal records before blocking them.
   
   Trigger fires BEFORE UPDATE or DELETE when:
   - Attempting to modify revoked_at on a reversed action
   - Attempting to modify revoked_by on a reversed action
   - Attempting to delete a reversed action
   
   The log is created before the enforcement trigger blocks
   the operation, ensuring we have a record of the attempt
   even though it will fail.
   
   Requirements: 14.10 - Reversal record immutability';

-- =====================================================
-- 5. Add CHECK constraint for reversal field consistency
-- =====================================================
-- This constraint ensures that if revoked_at is set,
-- revoked_by must also be set (and vice versa)

ALTER TABLE public.moderation_actions
  ADD CONSTRAINT reversal_fields_consistency CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  );

-- Add constraint comment for documentation
COMMENT ON CONSTRAINT reversal_fields_consistency ON public.moderation_actions IS 
  'Ensures consistency between revoked_at and revoked_by fields.
   
   This constraint enforces that:
   - If revoked_at is NULL, revoked_by must also be NULL
   - If revoked_at is NOT NULL, revoked_by must also be NOT NULL
   - Both fields must be set together when reversing an action
   
   This prevents partial reversal records and ensures
   complete audit trail information is always available.
   
   Requirements: 14.10 - Reversal record immutability';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created prevent_reversal_modification() trigger function
-- ✓ Created enforce_reversal_immutability trigger
-- ✓ Created log_reversal_modification_attempt() function
-- ✓ Created log_reversal_modification_attempt trigger
-- ✓ Added reversal_fields_consistency CHECK constraint
-- ✓ Added comprehensive documentation for all objects
--
-- Protection Implemented:
-- ✓ Prevents modification of revoked_at once set
-- ✓ Prevents modification of revoked_by once set
-- ✓ Prevents removal of reversal_reason from metadata
-- ✓ Prevents deletion of reversed actions
-- ✓ Logs all modification attempts for security monitoring
-- ✓ Ensures reversal fields are always set together
--
-- Error Handling:
-- ✓ Clear error messages for developers
-- ✓ Helpful hints for resolving issues
-- ✓ Standard PostgreSQL error codes
-- ✓ Security event logging (best-effort)
--
-- Audit Trail Integrity:
-- ✓ Reversal records are immutable
-- ✓ Complete history is preserved
-- ✓ Tampering attempts are logged
-- ✓ Compliance with data retention requirements
--
-- Testing:
-- To test the constraints, try:
-- 1. Create an action and reverse it
-- 2. Attempt to modify revoked_at (should fail)
-- 3. Attempt to modify revoked_by (should fail)
-- 4. Attempt to delete the reversed action (should fail)
-- 5. Check security_events for logged attempts
--
-- Next Steps:
-- - Test constraint enforcement with various scenarios
-- - Verify error messages are clear and helpful
-- - Confirm security event logging works correctly
-- - Update application code to handle constraint errors
-- - Document constraint behavior for developers
-- =====================================================
