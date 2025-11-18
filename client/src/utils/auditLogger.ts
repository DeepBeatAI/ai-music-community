/**
 * Audit logging utilities for security events
 * Provides structured logging for user type modifications and authorization failures
 */

import { RoleType, PlanTier } from '@/types/userTypes';

/**
 * Audit event types
 */
export enum AuditEventType {
  // User type modifications
  PLAN_TIER_ASSIGNED = 'plan_tier_assigned',
  PLAN_TIER_CHANGED = 'plan_tier_changed',
  ROLE_GRANTED = 'role_granted',
  ROLE_REVOKED = 'role_revoked',
  
  // Authorization events
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  AUTHORIZATION_FAILURE = 'authorization_failure',
  ADMIN_ACCESS_DENIED = 'admin_access_denied',
  MODERATOR_ACCESS_DENIED = 'moderator_access_denied',
  TESTER_ACCESS_DENIED = 'tester_access_denied',
  
  // Security events
  INVALID_INPUT_DETECTED = 'invalid_input_detected',
  VALIDATION_FAILURE = 'validation_failure',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  targetUserId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Get client IP address from request headers
 * @param headers - Request headers
 * @returns IP address or 'unknown'
 */
function getClientIp(headers?: Headers): string {
  if (!headers) return 'unknown';
  
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Get user agent from request headers
 * @param headers - Request headers
 * @returns User agent or 'unknown'
 */
function getUserAgent(headers?: Headers): string {
  if (!headers) return 'unknown';
  return headers.get('user-agent') || 'unknown';
}

/**
 * Log audit event to console (structured logging)
 * In production, this should be sent to a logging service
 * @param entry - Audit log entry
 */
function logAuditEvent(entry: AuditLogEntry): void {
  const logLevel = entry.severity === AuditSeverity.CRITICAL || entry.severity === AuditSeverity.ERROR
    ? 'error'
    : entry.severity === AuditSeverity.WARNING
    ? 'warn'
    : 'info';

  console[logLevel]('[AUDIT]', JSON.stringify(entry, null, 2));
}

/**
 * Log user type modification attempt
 * @param params - Modification parameters
 */
export function logUserTypeModification(params: {
  eventType: AuditEventType;
  userId: string;
  targetUserId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  success: boolean;
  errorMessage?: string;
  headers?: Headers;
}): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType: params.eventType,
    severity: params.success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    userId: params.userId,
    targetUserId: params.targetUserId,
    action: params.action,
    details: {
      oldValue: params.oldValue,
      newValue: params.newValue,
    },
    ipAddress: getClientIp(params.headers),
    userAgent: getUserAgent(params.headers),
    success: params.success,
    errorMessage: params.errorMessage,
  };

  logAuditEvent(entry);
}

/**
 * Log authorization failure
 * @param params - Authorization failure parameters
 */
export function logAuthorizationFailure(params: {
  eventType: AuditEventType;
  userId?: string;
  action: string;
  requiredRole?: RoleType;
  requiredTier?: PlanTier;
  reason: string;
  headers?: Headers;
}): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType: params.eventType,
    severity: AuditSeverity.WARNING,
    userId: params.userId,
    action: params.action,
    details: {
      requiredRole: params.requiredRole,
      requiredTier: params.requiredTier,
      reason: params.reason,
    },
    ipAddress: getClientIp(params.headers),
    userAgent: getUserAgent(params.headers),
    success: false,
    errorMessage: params.reason,
  };

  logAuditEvent(entry);
}

/**
 * Log validation failure
 * @param params - Validation failure parameters
 */
export function logValidationFailure(params: {
  userId?: string;
  action: string;
  field: string;
  value: unknown;
  reason: string;
  headers?: Headers;
}): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType: AuditEventType.VALIDATION_FAILURE,
    severity: AuditSeverity.WARNING,
    userId: params.userId,
    action: params.action,
    details: {
      field: params.field,
      value: typeof params.value === 'string' ? params.value.substring(0, 100) : String(params.value),
      reason: params.reason,
    },
    ipAddress: getClientIp(params.headers),
    userAgent: getUserAgent(params.headers),
    success: false,
    errorMessage: params.reason,
  };

  logAuditEvent(entry);
}

/**
 * Log suspicious activity
 * @param params - Suspicious activity parameters
 */
export function logSuspiciousActivity(params: {
  userId?: string;
  action: string;
  reason: string;
  details?: Record<string, unknown>;
  headers?: Headers;
}): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
    severity: AuditSeverity.CRITICAL,
    userId: params.userId,
    action: params.action,
    details: params.details,
    ipAddress: getClientIp(params.headers),
    userAgent: getUserAgent(params.headers),
    success: false,
    errorMessage: params.reason,
  };

  logAuditEvent(entry);
}

/**
 * Log plan tier assignment
 * @param params - Assignment parameters
 */
export function logPlanTierAssignment(params: {
  adminUserId: string;
  targetUserId: string;
  oldTier?: PlanTier;
  newTier: PlanTier;
  success: boolean;
  errorMessage?: string;
  headers?: Headers;
}): void {
  logUserTypeModification({
    eventType: params.oldTier
      ? AuditEventType.PLAN_TIER_CHANGED
      : AuditEventType.PLAN_TIER_ASSIGNED,
    userId: params.adminUserId,
    targetUserId: params.targetUserId,
    action: `Assign plan tier: ${params.newTier}`,
    oldValue: params.oldTier,
    newValue: params.newTier,
    success: params.success,
    errorMessage: params.errorMessage,
    headers: params.headers,
  });
}

/**
 * Log role grant
 * @param params - Grant parameters
 */
export function logRoleGrant(params: {
  adminUserId: string;
  targetUserId: string;
  role: RoleType;
  success: boolean;
  errorMessage?: string;
  headers?: Headers;
}): void {
  logUserTypeModification({
    eventType: AuditEventType.ROLE_GRANTED,
    userId: params.adminUserId,
    targetUserId: params.targetUserId,
    action: `Grant role: ${params.role}`,
    newValue: params.role,
    success: params.success,
    errorMessage: params.errorMessage,
    headers: params.headers,
  });
}

/**
 * Log role revocation
 * @param params - Revocation parameters
 */
export function logRoleRevocation(params: {
  adminUserId: string;
  targetUserId: string;
  role: RoleType;
  success: boolean;
  errorMessage?: string;
  headers?: Headers;
}): void {
  logUserTypeModification({
    eventType: AuditEventType.ROLE_REVOKED,
    userId: params.adminUserId,
    targetUserId: params.targetUserId,
    action: `Revoke role: ${params.role}`,
    oldValue: params.role,
    success: params.success,
    errorMessage: params.errorMessage,
    headers: params.headers,
  });
}

/**
 * Log admin access denial
 * @param params - Denial parameters
 */
export function logAdminAccessDenied(params: {
  userId?: string;
  action: string;
  headers?: Headers;
}): void {
  logAuthorizationFailure({
    eventType: AuditEventType.ADMIN_ACCESS_DENIED,
    userId: params.userId,
    action: params.action,
    requiredRole: RoleType.ADMIN,
    reason: 'Admin access required',
    headers: params.headers,
  });
}

/**
 * Log moderator access denial
 * @param params - Denial parameters
 */
export function logModeratorAccessDenied(params: {
  userId?: string;
  action: string;
  headers?: Headers;
}): void {
  logAuthorizationFailure({
    eventType: AuditEventType.MODERATOR_ACCESS_DENIED,
    userId: params.userId,
    action: params.action,
    requiredRole: RoleType.MODERATOR,
    reason: 'Moderator access required',
    headers: params.headers,
  });
}

/**
 * Log tester access denial
 * @param params - Denial parameters
 */
export function logTesterAccessDenied(params: {
  userId?: string;
  action: string;
  headers?: Headers;
}): void {
  logAuthorizationFailure({
    eventType: AuditEventType.TESTER_ACCESS_DENIED,
    userId: params.userId,
    action: params.action,
    requiredRole: RoleType.TESTER,
    reason: 'Tester access required',
    headers: params.headers,
  });
}
