# Reversal Immutability Constraints Migration - Usage Guide

## Overview

This migration implements database-level constraints to ensure reversal records in the `moderation_actions` table are immutable and cannot be modified or deleted once created.

## What This Migration Does

### 1. Prevents Modification of Reversal Fields
- Once `revoked_at` is set to a non-NULL value, it cannot be changed
- Once `revoked_by` is set to a non-NULL value, it cannot be changed
- Once `reversal_reason` is added to metadata, it cannot be removed

### 2. Prevents Deletion of Reversed Actions
- Any action with `revoked_at IS NOT NULL` cannot be deleted
- This ensures complete audit trail preservation

### 3. Logs Modification Attempts
- All attempts to modify or delete reversal records are logged to `security_events` table
- Includes details about who attempted the modification and what they tried to change

### 4. Ensures Field Consistency
- Adds CHECK constraint to ensure `revoked_at` and `revoked_by` are always set together
- Prevents partial reversal records

## How to Apply This Migration

### Option 1: Via Supabase Dashboard (Recommended for Remote Database)

1. **Open Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard
   - Go to SQL Editor

2. **Copy Migration SQL**
   - Open `supabase/migrations/20251204000006_add_reversal_immutability_constraints.sql`
   - Copy the entire contents

3. **Execute Migration**
   - Paste the SQL into the SQL Editor
   - Click "Run" to execute
   - Verify no errors appear

4. **Verify Migration**
   - Check that triggers were created:
     ```sql
     SELECT trigger_name, event_manipulation, event_object_table
     FROM information_schema.triggers
     WHERE trigger_name IN ('enforce_reversal_immutability', 'log_reversal_modification_attempt');
     ```
   - Check that constraint was added:
     ```sql
     SELECT constraint_name, check_clause
     FROM information_schema.check_constraints
     WHERE constraint_name = 'reversal_fields_consistency';
     ```

### Option 2: Via Supabase CLI (For Local Development)

```bash
# Ensure Supabase is running
supabase start

# Apply all pending migrations
supabase db push

# Or reset database to apply all migrations from scratch
supabase db reset
```

## Testing the Constraints

After applying the migration, you can test that the constraints work correctly:

### Test 1: Prevent Modification of revoked_at

```sql
-- Create a test action
INSERT INTO moderation_actions (
  moderator_id,
  target_user_id,
  action_type,
  reason
) VALUES (
  'some-moderator-uuid',
  'some-user-uuid',
  'user_warned',
  'Test action'
) RETURNING id;

-- Reverse the action
UPDATE moderation_actions
SET revoked_at = NOW(),
    revoked_by = 'some-moderator-uuid'
WHERE id = 'action-id-from-above';

-- Try to modify revoked_at (should fail)
UPDATE moderation_actions
SET revoked_at = NOW() + INTERVAL '1 day'
WHERE id = 'action-id-from-above';
-- Expected: ERROR: Cannot modify revoked_at once set
```

### Test 2: Prevent Deletion of Reversed Action

```sql
-- Try to delete the reversed action (should fail)
DELETE FROM moderation_actions
WHERE id = 'action-id-from-above';
-- Expected: ERROR: Cannot delete reversed actions
```

### Test 3: Verify Consistency Constraint

```sql
-- Try to set revoked_at without revoked_by (should fail)
UPDATE moderation_actions
SET revoked_at = NOW()
WHERE id = 'some-non-reversed-action-id';
-- Expected: ERROR: new row violates check constraint "reversal_fields_consistency"
```

### Test 4: Check Security Event Logging

```sql
-- After attempting modifications above, check security_events
SELECT *
FROM security_events
WHERE event_type = 'reversal_modification_attempt'
ORDER BY created_at DESC
LIMIT 5;
```

## What Happens When Constraints Are Violated

### Error Messages

When attempting to modify reversal fields, you'll see clear error messages:

```
ERROR: Cannot modify revoked_at once set. Reversal records are immutable for audit trail integrity.
HINT: Reversal timestamp cannot be changed once an action has been reversed.
```

```
ERROR: Cannot modify revoked_by once set. Reversal records are immutable for audit trail integrity.
HINT: Reversal moderator cannot be changed once an action has been reversed.
```

```
ERROR: Cannot delete reversed actions. Reversal records are immutable for audit trail integrity.
HINT: Reversed actions must be retained for audit trail. Use revoked_at to mark actions as reversed.
```

### Security Event Logging

All modification attempts are logged to `security_events` table with:
- Operation type (UPDATE or DELETE)
- Action ID being modified
- User attempting the modification
- Timestamp of attempt
- Old and new values of reversal fields

## Application Code Considerations

### Handling Constraint Errors

Your application code should handle these constraint errors gracefully:

```typescript
try {
  // Attempt to update action
  await supabase
    .from('moderation_actions')
    .update({ revoked_at: new Date() })
    .eq('id', actionId);
} catch (error) {
  if (error.code === '23502') {
    // Constraint violation - reversal field modification attempted
    console.error('Cannot modify reversal records:', error.message);
    // Show user-friendly error message
  }
}
```

### Proper Reversal Implementation

Always set both `revoked_at` and `revoked_by` together:

```typescript
// ✅ Correct - sets both fields together
await supabase
  .from('moderation_actions')
  .update({
    revoked_at: new Date().toISOString(),
    revoked_by: moderatorId,
    metadata: {
      ...existingMetadata,
      reversal_reason: reason,
      is_self_reversal: isSelfReversal
    }
  })
  .eq('id', actionId)
  .is('revoked_at', null); // Only update if not already reversed

// ❌ Incorrect - sets only one field
await supabase
  .from('moderation_actions')
  .update({ revoked_at: new Date().toISOString() })
  .eq('id', actionId);
// This will fail the reversal_fields_consistency constraint
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS log_reversal_modification_attempt ON public.moderation_actions;
DROP TRIGGER IF EXISTS enforce_reversal_immutability ON public.moderation_actions;

-- Drop functions
DROP FUNCTION IF EXISTS public.log_reversal_modification_attempt();
DROP FUNCTION IF EXISTS public.prevent_reversal_modification();

-- Drop constraint
ALTER TABLE public.moderation_actions
  DROP CONSTRAINT IF EXISTS reversal_fields_consistency;
```

**⚠️ Warning:** Removing these constraints will allow modification and deletion of reversal records, which compromises audit trail integrity. Only rollback if absolutely necessary.

## Requirements Satisfied

This migration satisfies:
- **Requirement 14.10**: Reversal record immutability
- **Task 22.5**: Data Integrity and Immutability - Implement database constraints for reversal immutability

## Next Steps

After applying this migration:

1. ✅ Test constraint enforcement with various scenarios
2. ✅ Verify error messages are clear and helpful
3. ✅ Confirm security event logging works correctly
4. ✅ Update application code to handle constraint errors
5. ✅ Document constraint behavior for developers
6. Continue with Task 22.5 remaining subtasks (database triggers and application-level checks)

## Support

If you encounter issues:
1. Check that the migration was applied successfully
2. Verify triggers and constraints exist in the database
3. Review error messages for specific constraint violations
4. Check security_events table for logged attempts
5. Consult the main migration file for detailed comments
