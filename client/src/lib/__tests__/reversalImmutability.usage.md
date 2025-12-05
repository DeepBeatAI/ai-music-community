# Reversal Immutability Application-Level Checks

## Overview

This module implements application-level checks to ensure reversal records remain immutable and to detect suspicious activity related to reversal record modifications.

**Requirements:** 14.10

## Functions

### `verifyReversalImmutability(actionId: string)`

Verifies that a reversal record has not been modified and remains immutable.

**Purpose:**
- Provides application-level verification of reversal record integrity
- Detects violations of immutability constraints
- Logs security events when violations are detected

**Checks Performed:**
1. Verifies `revoked_at` is present and valid
2. Verifies `revoked_by` is present and valid UUID
3. Verifies `reversal_reason` exists in metadata
4. Verifies consistency between `revoked_at` and `revoked_by`
5. Verifies `revoked_at` is not in the future
6. Verifies `revoked_at` is after action `created_at`

**Returns:**
```typescript
{
  isImmutable: boolean;
  violations: string[];
  action: ModerationAction | null;
}
```

**Example Usage:**
```typescript
const result = await verifyReversalImmutability(actionId);

if (!result.isImmutable) {
  console.error('Immutability violations detected:', result.violations);
  // Take appropriate action
}
```

### `attemptReversalModification(actionId: string, modifications: object)`

Attempts to modify reversal fields to verify database constraints are working correctly.

**Purpose:**
- Test that database constraints properly prevent modifications
- Detect if immutability constraints have been bypassed
- Alert admins if modifications succeed (critical security breach)

**Parameters:**
```typescript
{
  revoked_at?: string;
  revoked_by?: string;
  reversal_reason?: string;
}
```

**Returns:**
```typescript
{
  prevented: boolean;
  error: string | null;
  securityEventLogged: boolean;
}
```

**Example Usage:**
```typescript
const result = await attemptReversalModification(actionId, {
  revoked_at: '2024-01-06T10:00:00Z',
});

if (!result.prevented) {
  // CRITICAL: Immutability constraint failed!
  // Admins have been alerted automatically
}
```

**Note:** This function is primarily for testing and verification. It should always fail if database constraints are working correctly.

### `detectSuspiciousReversalActivity(userId?: string, timeWindowHours?: number)`

Analyzes security events to detect suspicious patterns related to reversal record modifications.

**Purpose:**
- Detect multiple modification attempts from same user
- Detect successful modifications (immutability breaches)
- Detect rapid-fire attempts suggesting automated attacks
- Detect immutability violations
- Alert admins when suspicious activity is detected

**Parameters:**
- `userId` (optional): Specific user to check for suspicious activity
- `timeWindowHours` (default: 24): Time window to analyze

**Returns:**
```typescript
{
  suspiciousActivityDetected: boolean;
  patterns: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    count: number;
    userIds: string[];
  }>;
}
```

**Detected Patterns:**
1. **Multiple attempts from same user** - 5+ attempts in time window
2. **Immutability breach** - Successful modification of reversal records (CRITICAL)
3. **Rapid-fire attempts** - Multiple attempts within 1 second (suggests automation)
4. **Immutability violations** - Records with integrity issues

**Example Usage:**
```typescript
// Check all users in last 24 hours
const result = await detectSuspiciousReversalActivity();

if (result.suspiciousActivityDetected) {
  console.log('Suspicious patterns detected:', result.patterns);
  // Admins have been alerted automatically
}

// Check specific user in last 48 hours
const userResult = await detectSuspiciousReversalActivity(userId, 48);
```

## Security Events Logged

The following security events are logged by these functions:

1. **`reversal_immutability_violation_detected`** - Integrity violations found in reversal record
2. **`reversal_modification_attempt`** - Attempt to modify reversal fields
3. **`reversal_modification_prevented`** - Database constraint successfully blocked modification
4. **`reversal_modification_succeeded`** - CRITICAL: Modification was not prevented
5. **`admin_alert_sent`** - Notification sent to administrators
6. **`suspicious_reversal_activity_detected`** - Suspicious patterns detected

## Admin Alerts

Administrators are automatically alerted for:

1. **Critical Events:**
   - Successful modification of reversal records (immutability breach)
   - Multiple immutability violations detected

2. **High Severity Events:**
   - Rapid-fire modification attempts (potential automated attack)
   - Multiple failed modification attempts from same user (10+)

3. **Medium Severity Events:**
   - Multiple failed modification attempts from same user (5-9)
   - Suspicious activity patterns detected

Alerts are sent as high-priority notifications to all active admin users.

## Integration with Database Constraints

These application-level checks complement the database-level constraints:

**Database Level (Primary Protection):**
- Triggers prevent modification of `revoked_at` and `revoked_by`
- Triggers prevent deletion of reversed actions
- CHECK constraints ensure field consistency
- Automatic logging of modification attempts

**Application Level (Secondary Protection):**
- Verification of reversal record integrity
- Detection of suspicious activity patterns
- Admin alerting for security events
- Forensic analysis capabilities

## Testing

Comprehensive tests are provided in `reversalImmutability.test.ts`:

- ✅ Verification of properly reversed actions
- ✅ Detection of missing reversal fields
- ✅ Detection of invalid timestamps
- ✅ Detection of field inconsistencies
- ✅ Verification that modifications are prevented
- ✅ Admin alerting when modifications succeed
- ✅ Detection of multiple modification attempts
- ✅ Detection of rapid-fire attempts
- ✅ Detection of immutability violations

## Best Practices

1. **Regular Monitoring:**
   - Run `detectSuspiciousReversalActivity()` periodically (e.g., hourly)
   - Monitor security events for reversal-related activity

2. **Incident Response:**
   - Investigate immediately if `reversal_modification_succeeded` event occurs
   - Review patterns when suspicious activity is detected
   - Verify database constraints are functioning correctly

3. **Audit Trail:**
   - All modification attempts are logged to `security_events` table
   - Maintain complete history for forensic analysis
   - Never delete security event logs

4. **Testing:**
   - Use `attemptReversalModification()` to verify constraints work
   - Test in non-production environment first
   - Verify admin alerts are received

## Compliance

These checks support compliance with:
- Data retention requirements
- Audit trail integrity requirements
- Security monitoring requirements
- Incident response requirements

## Related Documentation

- Database migration: `supabase/migrations/20251204000006_add_reversal_immutability_constraints.sql`
- Migration summary: `docs/features/moderation/database/migration-reversal-immutability-summary.md`
- Requirements: Section 14.10 in `requirements.md`
- Design: Reversal Immutability section in `design.md`
