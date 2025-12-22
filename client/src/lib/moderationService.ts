/**
 * Moderation Service
 * 
 * This service provides functions for the moderation system including:
 * - User reporting
 * - Moderator flagging
 * - Moderation queue management
 * - Moderation actions
 * - Restriction management
 * 
 * Requirements: 1.1, 1.4, 2.1, 4.1, 5.1, 6.1, 11.1, 12.1
 */

import { supabase } from '@/lib/supabase';
import {
  Report,
  ReportParams,
  ReportType,
  ModeratorFlagParams,
  ModerationAction,
  ModerationActionParams,
  ModerationActionType,
  UserRestriction,
  QueueFilters,
  ReportReason,
  RestrictionType,
  ModerationError,
  MODERATION_ERROR_CODES,
  ReversalHistoryFilters,
  ReversalHistoryEntry,
  StateChangeEntry,
  StateChangeAction,
  ProfileContext,
} from '@/types/moderation';

// ============================================================================
// Constants
// ============================================================================

/**
 * Priority mapping based on report reason
 * Requirements: 1.4
 */
export const PRIORITY_MAP: Record<ReportReason, number> = {
  self_harm: 1,              // P1 - Critical
  hate_speech: 2,            // P2 - High
  harassment: 2,             // P2 - High
  inappropriate_content: 3,  // P3 - Standard
  spam: 3,                   // P3 - Standard
  copyright_violation: 3,    // P3 - Standard
  impersonation: 3,          // P3 - Standard
  other: 4,                  // P4 - Low
};

/**
 * Rate limit for user reports (reports per 24 hours)
 * Requirements: 1.6
 */
export const REPORT_RATE_LIMIT = 10;

/**
 * Rate limit window in milliseconds (24 hours)
 */
export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Rate limit for moderation actions per moderator (actions per hour)
 * Requirements: 11.7
 */
export const MODERATION_ACTION_RATE_LIMIT = 100;

/**
 * Rate limit window for moderation actions in milliseconds (1 hour)
 * Requirements: 11.7
 */
export const MODERATION_ACTION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get standardized content type label for error messages
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8
 * 
 * This function ensures consistent content type labels across all error messages.
 * It capitalizes the first letter and keeps the rest lowercase for consistency.
 * 
 * @param reportType - The report type (post, comment, track, user)
 * @returns Standardized content type label
 */
function getContentTypeLabel(reportType: ReportType): string {
  // Map report types to their display labels
  const labels: Record<ReportType, string> = {
    post: 'Post',
    comment: 'Comment',
    track: 'Track',
    user: 'User',
  };

  return labels[reportType] || reportType.charAt(0).toUpperCase() + reportType.slice(1);
}

/**
 * Sanitize user-provided text to prevent XSS attacks
 * Requirements: 11.6
 * 
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
function sanitizeText(text: string): string {
  if (!text) return '';

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate and sanitize UUID format
 * Requirements: 11.6
 * 
 * @param uuid - UUID string to validate
 * @returns True if valid UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate text length
 * Requirements: 11.6
 * 
 * @param text - Text to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @throws ModerationError if text exceeds max length
 */
function validateTextLength(text: string, maxLength: number, fieldName: string): void {
  if (text && text.length > maxLength) {
    throw new ModerationError(
      `${fieldName} must be ${maxLength} characters or less`,
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { fieldName, length: text.length, maxLength }
    );
  }
}

/**
 * Calculate priority based on report reason
 * Requirements: 1.4
 * 
 * @param reason - The report reason
 * @returns Priority level (1-5, where 1 is highest priority)
 */
export function calculatePriority(reason: ReportReason): number {
  return PRIORITY_MAP[reason] || 4;
}

/**
 * Send notifications to all moderators and admins for high priority reports
 * Requirements: Notification system for P1 and P2 reports
 * 
 * @param report - The created report
 * @param priority - Priority level (1 or 2)
 */
async function notifyModeratorsOfHighPriorityReport(report: Report, priority: number): Promise<void> {
  try {
    // Get all users with moderator or admin roles (excluding the report creator)
    const { data: moderatorRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role_type', ['moderator', 'admin'])
      .eq('is_active', true)
      .neq('user_id', report.reporter_id); // Exclude the person who created the report

    if (rolesError) {
      console.error('Failed to fetch moderator roles for notification:', rolesError);
      return;
    }

    if (!moderatorRoles || moderatorRoles.length === 0) {
      console.log('No other moderators or admins found to notify');
      return;
    }

    // Deduplicate user_ids (in case a user has both moderator and admin roles)
    const uniqueUserIds = [...new Set(moderatorRoles.map(role => role.user_id))];

    if (uniqueUserIds.length === 0) {
      console.log('No unique users to notify after deduplication');
      return;
    }

    // Get report type label
    const reportTypeLabel = report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1);
    
    // Get reason label from REASON_LABELS
    const reasonLabels: Record<string, string> = {
      spam: 'Spam or Misleading Content',
      harassment: 'Harassment or Bullying',
      hate_speech: 'Hate Speech or Discrimination',
      inappropriate_content: 'Inappropriate or Offensive Content',
      copyright_violation: 'Copyright Violation',
      impersonation: 'Impersonation or Identity Theft',
      self_harm: 'Self-Harm or Suicide Content',
      other: 'Other Violation',
    };
    const reasonLabel = reasonLabels[report.reason] || report.reason;

    // Create notification title based on priority
    const priorityLabel = priority === 1 ? 'P1 Critical' : 'P2 High Priority';
    const priorityEmoji = priority === 1 ? '🚨' : '⚠️';
    const title = `${priorityEmoji} ${priorityLabel} Report: ${reportTypeLabel} - ${reasonLabel}`;
    const message = priority === 1 ? 'Requires immediate attention' : 'Review needed';

    // Create notifications for all unique moderators and admins
    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      type: 'moderation' as const,
      title,
      message,
      related_post_id: null,
      related_user_id: report.reported_user_id,
      data: {
        report_id: report.id,
        priority,
        report_type: report.report_type,
        reason: report.reason,
      },
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Failed to create notifications for high priority report:', notificationError);
    } else {
      console.log(`Sent ${notifications.length} notifications for ${priorityLabel} report`);
    }
  } catch (error) {
    console.error('Error sending notifications to moderators:', error);
    // Don't throw - notification failure shouldn't block report creation
  }
}

/**
 * Validate report parameters
 * Requirements: 11.6
 * 
 * @param params - Report parameters to validate
 * @throws ModerationError if validation fails
 */
function validateReportParams(params: ReportParams): void {
  // Validate report type
  const validReportTypes = ['post', 'comment', 'track', 'user'];
  if (!validReportTypes.includes(params.reportType)) {
    throw new ModerationError(
      'Invalid report type',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { reportType: params.reportType }
    );
  }

  // Validate reason
  const validReasons: ReportReason[] = [
    'spam',
    'harassment',
    'hate_speech',
    'inappropriate_content',
    'copyright_violation',
    'impersonation',
    'self_harm',
    'other',
  ];
  if (!validReasons.includes(params.reason)) {
    throw new ModerationError(
      'Invalid report reason',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { reason: params.reason }
    );
  }

  // Validate target ID (must be a valid UUID format)
  if (!isValidUUID(params.targetId)) {
    throw new ModerationError(
      'Invalid target ID format',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { targetId: params.targetId }
    );
  }

  // Validate description if reason is "other"
  if (params.reason === 'other' && (!params.description || params.description.trim().length === 0)) {
    throw new ModerationError(
      'Description is required when reason is "other"',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { reason: params.reason }
    );
  }

  // Validate and sanitize description length if provided
  if (params.description) {
    validateTextLength(params.description, 1000, 'Description');
    // Sanitize the description
    params.description = sanitizeText(params.description);
  }
}

/**
 * Validate moderator flag parameters
 * Requirements: 11.6
 * 
 * @param params - Moderator flag parameters to validate
 * @throws ModerationError if validation fails
 */
function validateModeratorFlagParams(params: ModeratorFlagParams): void {
  // Validate report type
  const validReportTypes = ['post', 'comment', 'track', 'user'];
  if (!validReportTypes.includes(params.reportType)) {
    throw new ModerationError(
      'Invalid report type',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { reportType: params.reportType }
    );
  }

  // Validate reason
  const validReasons: ReportReason[] = [
    'spam',
    'harassment',
    'hate_speech',
    'inappropriate_content',
    'copyright_violation',
    'impersonation',
    'self_harm',
    'other',
  ];
  if (!validReasons.includes(params.reason)) {
    throw new ModerationError(
      'Invalid report reason',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { reason: params.reason }
    );
  }

  // Validate target ID (must be a valid UUID format)
  if (!isValidUUID(params.targetId)) {
    throw new ModerationError(
      'Invalid target ID format',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { targetId: params.targetId }
    );
  }

  // Validate internal notes (required for moderator flags)
  if (!params.internalNotes || params.internalNotes.trim().length === 0) {
    throw new ModerationError(
      'Internal notes are required for moderator flags',
      MODERATION_ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate and sanitize internal notes length
  validateTextLength(params.internalNotes, 5000, 'Internal notes');
  params.internalNotes = sanitizeText(params.internalNotes);

  // Validate priority if provided
  if (params.priority !== undefined && (params.priority < 1 || params.priority > 5)) {
    throw new ModerationError(
      'Priority must be between 1 and 5',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { priority: params.priority }
    );
  }
}

/**
 * Get current authenticated user
 * Requirements: 11.1
 * 
 * @returns Current user or throws error if not authenticated
 * @throws ModerationError if user is not authenticated
 */
async function getCurrentUser(): Promise<{ id: string }> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ModerationError(
      'User not authenticated',
      MODERATION_ERROR_CODES.UNAUTHORIZED
    );
  }

  return user;
}

/**
 * Check if user has moderator or admin role
 * Requirements: 11.1, 11.2
 * 
 * @param userId - User ID to check
 * @returns True if user is moderator or admin
 * @throws ModerationError if database query fails
 */
export async function isModeratorOrAdmin(userId: string): Promise<boolean> {
  try {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new ModerationError(
        'Failed to check user roles',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return roles?.some((r) => ['moderator', 'admin'].includes(r.role_type)) || false;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking user roles',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Check if user is admin
 * Requirements: 11.1
 * 
 * @param userId - User ID to check
 * @returns True if user is admin
 * @throws ModerationError if database query fails
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new ModerationError(
        'Failed to check user roles',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return roles?.some((r) => r.role_type === 'admin') || false;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking admin role',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Verify that the current user has moderator or admin role
 * Requirements: 13.8, 13.11
 * 
 * This helper function verifies that the current authenticated user has
 * moderator or admin privileges. It's used throughout the reversal system
 * to ensure only authorized users can perform reversal actions.
 * 
 * @returns The current user if they have moderator/admin role
 * @throws ModerationError if user is not authenticated or lacks moderator role
 */
export async function verifyModeratorRole(): Promise<{ id: string }> {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();

    // Check if user has moderator or admin role
    const isMod = await isModeratorOrAdmin(user.id);
    
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can perform this action',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    return user;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while verifying moderator role',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Verify that the current user has admin role
 * Requirements: 13.3, 13.8, 13.13
 * 
 * This helper function verifies that the current authenticated user has
 * admin privileges. It's used throughout the reversal system to ensure
 * only admins can perform admin-only actions like removing permanent suspensions.
 * 
 * @returns The current user if they have admin role
 * @throws ModerationError if user is not authenticated or lacks admin role
 */
export async function verifyAdminRole(): Promise<{ id: string }> {
  try {
    // Get current authenticated user
    const user = await getCurrentUser();

    // Check if user has admin role
    const isAdminUser = await isAdmin(user.id);
    
    if (!isAdminUser) {
      throw new ModerationError(
        'Only admins can perform this action',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    return user;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while verifying admin role',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Verify that the target user is not an admin account
 * Requirements: 13.8, 13.11, 13.13
 * 
 * This helper function prevents moderators from reversing actions on admin accounts
 * while allowing admins to reverse any action. It's used throughout the reversal
 * system to enforce proper authorization boundaries.
 * 
 * The function checks:
 * 1. If the target user is an admin
 * 2. If the current user is also an admin
 * 3. Allows the action if current user is admin (admins can reverse any action)
 * 4. Blocks the action if current user is moderator and target is admin
 * 
 * @param userId - Target user ID to check
 * @returns void if authorization check passes
 * @throws ModerationError if moderator attempts to act on admin account
 */
export async function verifyNotAdminTarget(userId: string): Promise<void> {
  try {
    // Validate user ID format
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Get current authenticated user
    const currentUser = await getCurrentUser();

    // Check if target user is an admin
    const targetIsAdmin = await isAdmin(userId);
    
    // If target is not an admin, allow the action
    if (!targetIsAdmin) {
      return;
    }

    // Target is an admin - check if current user is also an admin
    const currentUserIsAdmin = await isAdmin(currentUser.id);
    
    // If current user is admin, allow the action (admins can reverse any action)
    if (currentUserIsAdmin) {
      return;
    }

    // Current user is moderator and target is admin - block the action
    // Log failed authorization attempt
    await logSecurityEvent('unauthorized_action_on_admin_target', currentUser.id, {
      targetUserId: userId,
      action: 'reversal_attempt',
    });

    throw new ModerationError(
      'Moderators cannot reverse actions on admin accounts',
      MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      { targetUserId: userId }
    );
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while verifying target user authorization',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Check if the current user is the original moderator who took the action
 * Requirements: 13.12
 * 
 * This helper function checks if the current authenticated user is the same
 * moderator who originally took the moderation action. This is used to allow
 * self-reversal (moderators reversing their own actions) and to log self-reversals
 * distinctly for audit purposes.
 * 
 * @param actionId - Moderation action ID to check
 * @returns Object with isSelfReversal boolean and original moderator ID
 * @throws ModerationError if action not found or database error
 */
export async function checkSelfReversal(
  actionId: string
): Promise<{ isSelfReversal: boolean; originalModeratorId: string }> {
  try {
    // Validate action ID format
    if (!isValidUUID(actionId)) {
      throw new ModerationError(
        'Invalid action ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { actionId }
      );
    }

    // Get current authenticated user
    const currentUser = await getCurrentUser();

    // Fetch the action to get the original moderator ID
    const { data: action, error } = await supabase
      .from('moderation_actions')
      .select('moderator_id')
      .eq('id', actionId)
      .single();

    if (error || !action) {
      throw new ModerationError(
        'Moderation action not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { actionId }
      );
    }

    const isSelfReversal = action.moderator_id === currentUser.id;

    return {
      isSelfReversal,
      originalModeratorId: action.moderator_id,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking self-reversal',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Handle database errors with proper error wrapping
 * Requirements: Error Handling
 * 
 * @param error - The error to handle
 * @param context - Context about where the error occurred
 * @throws ModerationError with appropriate error code
 */
function handleDatabaseError(error: unknown, context: string): never {
  console.error(`Database error in ${context}:`, error);
  
  throw new ModerationError(
    `Failed to ${context}`,
    MODERATION_ERROR_CODES.DATABASE_ERROR,
    { originalError: error }
  );
}

// ============================================================================
// User Reporting Functions
// ============================================================================

/**
 * Log security event to security_events table
 * Requirements: 11.5, 11.7
 * 
 * @param eventType - Type of security event
 * @param userId - User ID associated with the event
 * @param details - Additional details about the event
 */
async function logSecurityEvent(
  eventType: string,
  userId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      user_id: userId,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log to console but don't throw - security logging shouldn't break functionality
    console.error('Failed to log security event:', error);
  }
}

/**
 * Check if user has exceeded rate limit for reports
 * Requirements: 1.6
 * 
 * @param userId - User ID to check
 * @returns Number of reports submitted in the last 24 hours
 * @throws ModerationError if database query fails
 */
async function checkReportRateLimit(userId: string): Promise<number> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { error, count } = await supabase
      .from('moderation_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', userId)
      .gte('created_at', twentyFourHoursAgo);

    if (error) {
      throw new ModerationError(
        'Failed to check report rate limit',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return count || 0;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking rate limit',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Check if moderator has exceeded rate limit for moderation actions
 * Requirements: 11.7
 * 
 * @param moderatorId - Moderator ID to check
 * @returns Number of actions taken in the last hour
 * @throws ModerationError if database query fails
 */
async function checkModerationActionRateLimit(moderatorId: string): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - MODERATION_ACTION_RATE_LIMIT_WINDOW_MS).toISOString();

    const { error, count } = await supabase
      .from('moderation_actions')
      .select('id', { count: 'exact', head: true })
      .eq('moderator_id', moderatorId)
      .gte('created_at', oneHourAgo);

    if (error) {
      throw new ModerationError(
        'Failed to check moderation action rate limit',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return count || 0;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking action rate limit',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Get reported user ID based on content type and target ID
 * Requirements: 1.1
 * 
 * @param reportType - Type of content being reported
 * @param targetId - ID of the content being reported
 * @returns User ID of the content owner, or null if not applicable
 * @throws ModerationError if database query fails
 */
async function getReportedUserId(
  reportType: string,
  targetId: string
): Promise<string | null> {
  try {
    // For user reports, the target ID is the user ID
    if (reportType === 'user') {
      return targetId;
    }

    // For other content types, look up the owner
    let tableName: string;
    let userIdColumn: string;

    switch (reportType) {
      case 'post':
        tableName = 'posts';
        userIdColumn = 'user_id';
        break;
      case 'comment':
        tableName = 'comments';
        userIdColumn = 'user_id';
        break;
      case 'track':
        tableName = 'tracks';
        userIdColumn = 'user_id';
        break;
      default:
        return null;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select(userIdColumn)
      .eq('id', targetId)
      .maybeSingle();

    if (error) {
      // If content not found, that's okay - it might have been deleted
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new ModerationError(
        'Failed to look up reported user',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return data ? (data as unknown as { [key: string]: string | null })[userIdColumn] : null;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while looking up reported user',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Check if user has already reported this target within 24 hours
 * Requirements: 2.3, 2.5, 10.1, 10.2, 10.3
 * 
 * This function implements duplicate detection to prevent users from spamming
 * reports for the same target. It checks if the same user has reported the same
 * target (with the same report_type) within the last 24 hours.
 * 
 * @param userId - Reporter user ID
 * @param reportType - Type of content being reported
 * @param targetId - ID of the target being reported
 * @returns Object with isDuplicate flag and original report timestamp
 * @throws ModerationError if database query fails
 */
async function checkDuplicateReport(
  userId: string,
  reportType: ReportType,
  targetId: string
): Promise<{ isDuplicate: boolean; originalReportDate?: string }> {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MS
    ).toISOString();

    const { data, error } = await supabase
      .from('moderation_reports')
      .select('created_at')
      .eq('reporter_id', userId)
      .eq('report_type', reportType)
      .eq('target_id', targetId)
      .gte('created_at', twentyFourHoursAgo)
      .maybeSingle();

    if (error) {
      throw new ModerationError(
        'Failed to check for duplicate report',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    if (data) {
      return {
        isDuplicate: true,
        originalReportDate: data.created_at,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking for duplicate report',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Submit a user report
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 * 
 * @param params - Report parameters
 * @returns Created report
 * @throws ModerationError if validation fails, rate limit exceeded, or database error
 */
export async function submitReport(params: ReportParams): Promise<Report> {
  try {
    // Validate parameters
    validateReportParams(params);

    // Get current user
    const user = await getCurrentUser();

    // Check for self-report prevention
    // Requirements: 8.5, 8.6
    if (params.reportType === 'user') {
      // For user reports, check if reporter is reporting themselves
      if (user.id === params.targetId) {
        throw new ModerationError(
          'You cannot report your own profile',
          MODERATION_ERROR_CODES.VALIDATION_ERROR,
          { userId: user.id, targetId: params.targetId }
        );
      }
    } else {
      // For content reports (post, comment, track), check if reporter owns the content
      const contentOwnerId = await getReportedUserId(params.reportType, params.targetId);
      if (contentOwnerId && user.id === contentOwnerId) {
        const contentTypeLabel = getContentTypeLabel(params.reportType);
        throw new ModerationError(
          `You cannot report your own ${contentTypeLabel.toLowerCase()}`,
          MODERATION_ERROR_CODES.VALIDATION_ERROR,
          { userId: user.id, targetId: params.targetId }
        );
      }
    }

    // Check for duplicate report (before rate limit check)
    // Requirements: 2.3, 2.4, 10.4, 10.7, 10.8
    const duplicateCheck = await checkDuplicateReport(
      user.id,
      params.reportType,
      params.targetId
    );

    if (duplicateCheck.isDuplicate) {
      // Log duplicate attempt
      // Requirements: 2.9, 2.10, 6.3, 6.7
      await logSecurityEvent('duplicate_report_attempt', user.id, {
        reportType: params.reportType,
        targetId: params.targetId,
        originalReportDate: duplicateCheck.originalReportDate,
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      });

      // Format content type label for error message
      const contentTypeLabel = getContentTypeLabel(params.reportType);
      
      throw new ModerationError(
        `You have already reported this ${contentTypeLabel.toLowerCase()} recently. Please wait 24 hours before reporting again.`,
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        {
          reportType: params.reportType,
          targetId: params.targetId,
          originalReportDate: duplicateCheck.originalReportDate,
        }
      );
    }

    // Check rate limit
    const reportCount = await checkReportRateLimit(user.id);
    if (reportCount >= REPORT_RATE_LIMIT) {
      // Log rate limit violation
      // Requirements: 2.9, 2.10, 6.2, 6.7
      await logSecurityEvent('rate_limit_exceeded', user.id, {
        reportType: params.reportType,
        reportCount,
        limit: REPORT_RATE_LIMIT,
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      });

      throw new ModerationError(
        `You have exceeded the report limit of ${REPORT_RATE_LIMIT} reports per 24 hours. Please try again later.`,
        MODERATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
        { reportCount, limit: REPORT_RATE_LIMIT }
      );
    }

    // Get reported user ID
    const reportedUserId = await getReportedUserId(params.reportType, params.targetId);

    // Check admin protection (only for user reports)
    // Requirements: 2.7, 2.8, 6.4
    if (params.reportType === 'user' && reportedUserId) {
      const targetIsAdmin = await isAdmin(reportedUserId);
      if (targetIsAdmin) {
        // Log admin report attempt
        // Requirements: 2.9, 2.10, 6.4, 6.7
        await logSecurityEvent('admin_report_attempt', user.id, {
          targetUserId: reportedUserId,
          reportType: params.reportType,
          targetId: params.targetId,
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        });

        throw new ModerationError(
          'This account cannot be reported',
          MODERATION_ERROR_CODES.VALIDATION_ERROR,
          { targetUserId: reportedUserId }
        );
      }
    }

    // Calculate priority
    const priority = calculatePriority(params.reason);

    // Create report
    const { data, error } = await supabase
      .from('moderation_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        report_type: params.reportType,
        target_id: params.targetId,
        reason: params.reason,
        description: params.description || null,
        status: 'pending',
        priority,
        moderator_flagged: false,
      })
      .select()
      .single();

    if (error) {
      handleDatabaseError(error, 'create report');
    }

    if (!data) {
      throw new ModerationError(
        'Failed to create report - no data returned',
        MODERATION_ERROR_CODES.DATABASE_ERROR
      );
    }

    // Send notifications to moderators and admins for P1 and P2 reports
    if (priority === 1 || priority === 2) {
      await notifyModeratorsOfHighPriorityReport(data as Report, priority);
    }

    return data as Report;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while submitting report',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Moderator Flagging Functions
// ============================================================================

/**
 * Moderator flag content for review
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 10.9
 * 
 * @param params - Moderator flag parameters
 * @returns Created report with moderator flag
 * @throws ModerationError if validation fails, unauthorized, or database error
 */
export async function moderatorFlagContent(params: ModeratorFlagParams): Promise<Report> {
  try {
    // Validate parameters
    validateModeratorFlagParams(params);

    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can flag content',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check for duplicate report (before creating the flag)
    // Requirements: 10.9
    const duplicateCheck = await checkDuplicateReport(
      user.id,
      params.reportType,
      params.targetId
    );

    if (duplicateCheck.isDuplicate) {
      // Log duplicate attempt for moderator flags
      // Requirements: 2.9, 2.10, 6.3, 6.7, 10.9
      await logSecurityEvent('duplicate_report_attempt', user.id, {
        reportType: params.reportType,
        targetId: params.targetId,
        originalReportDate: duplicateCheck.originalReportDate,
        moderatorFlag: true,
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      });

      const contentTypeLabel = getContentTypeLabel(params.reportType);
      
      throw new ModerationError(
        `You have already reported this ${contentTypeLabel.toLowerCase()} recently. Please wait 24 hours before reporting again.`,
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        {
          reportType: params.reportType,
          targetId: params.targetId,
          originalReportDate: duplicateCheck.originalReportDate,
        }
      );
    }

    // Get reported user ID
    const reportedUserId = await getReportedUserId(params.reportType, params.targetId);

    // Calculate priority (use provided priority or calculate from reason)
    const priority = params.priority !== undefined 
      ? params.priority 
      : Math.min(calculatePriority(params.reason), 2); // Moderator flags are at least P2

    // Create report with moderator flag
    const { data, error } = await supabase
      .from('moderation_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        report_type: params.reportType,
        target_id: params.targetId,
        reason: params.reason,
        description: params.internalNotes,
        status: 'under_review', // Moderator flags go directly to under_review
        priority,
        moderator_flagged: true,
      })
      .select()
      .single();

    if (error) {
      handleDatabaseError(error, 'create moderator flag');
    }

    if (!data) {
      throw new ModerationError(
        'Failed to create moderator flag - no data returned',
        MODERATION_ERROR_CODES.DATABASE_ERROR
      );
    }

    // Send notifications to moderators and admins for P1 and P2 flags
    if (priority === 1 || priority === 2) {
      await notifyModeratorsOfHighPriorityReport(data as Report, priority);
    }

    return data as Report;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while flagging content',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Moderation Queue Functions
// ============================================================================

/**
 * Fetch moderation queue with filtering and sorting
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * @param filters - Optional filters for the queue
 * @returns Array of reports matching the filters
 * @throws ModerationError if unauthorized or database error
 */
export async function fetchModerationQueue(filters: QueueFilters = {}): Promise<Report[]> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access the moderation queue',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Build query
    let query = supabase
      .from('moderation_reports')
      .select('*');

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority !== undefined) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.moderatorFlagged !== undefined) {
      query = query.eq('moderator_flagged', filters.moderatorFlagged);
    }

    if (filters.reportType) {
      query = query.eq('report_type', filters.reportType);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply sorting
    // Moderator-flagged reports appear first, then sort by priority (ascending), then by date (ascending)
    query = query
      .order('moderator_flagged', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    // Execute query
    const { data, error } = await query;

    if (error) {
      handleDatabaseError(error, 'fetch moderation queue');
    }

    return (data as Report[]) || [];
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while fetching moderation queue',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Get profile context for moderation panel
 * Requirements: 7.2, 7.3, 7.4, 7.5
 * 
 * This function fetches comprehensive context about a user profile for display
 * in the moderation panel when reviewing user reports. It includes profile data,
 * account age, recent report count, and moderation history.
 * 
 * @param userId - User ID to get context for
 * @returns Profile context data
 * @throws ModerationError if database query fails or user not found
 */
export async function getProfileContext(userId: string): Promise<ProfileContext> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Verify moderator role
    await verifyModeratorRole();

    // Fetch user profile
    // Note: userId can be either user_id or profile id, so we try both
    // Note: user_profiles table does not have avatar_url or bio columns
    let profile = null;
    let profileError = null;
    
    // First try with user_id
    const { data: profileByUserId, error: errorByUserId } = await supabase
      .from('user_profiles')
      .select('username, created_at, user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (profileByUserId) {
      profile = profileByUserId;
    } else if (!errorByUserId) {
      // If not found by user_id (and no error), try with id (profile id)
      const { data: profileById, error: errorById } = await supabase
        .from('user_profiles')
        .select('username, created_at, user_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileById) {
        profile = profileById;
      } else {
        profileError = errorById;
      }
    } else {
      // There was an error in the first query
      profileError = errorByUserId;
    }

    if (profileError || !profile) {
      throw new ModerationError(
        'User profile not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { userId, error: profileError }
      );
    }
    
    // Use the actual user_id from the profile for subsequent queries
    const actualUserId = profile.user_id || userId;

    // Calculate account age
    const joinDate = new Date(profile.created_at);
    const accountAgeDays = Math.floor(
      (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Count recent reports (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count: recentReportCount } = await supabase
      .from('moderation_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reported_user_id', actualUserId)
      .gte('created_at', thirtyDaysAgo);

    // Fetch moderation history (last 10 actions)
    const { data: moderationHistory, error: historyError } = await supabase
      .from('moderation_actions')
      .select('action_type, reason, created_at, expires_at')
      .eq('target_user_id', actualUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Failed to fetch moderation history:', historyError);
    }

    // Map database fields to interface fields
    const mappedHistory = (moderationHistory || []).map((action) => ({
      actionType: action.action_type as ModerationActionType,
      reason: action.reason,
      createdAt: action.created_at,
      expiresAt: action.expires_at,
    }));

    return {
      username: profile.username,
      avatarUrl: null, // user_profiles table does not have avatar_url column
      bio: null, // user_profiles table does not have bio column
      joinDate: profile.created_at,
      accountAgeDays,
      recentReportCount: recentReportCount || 0,
      moderationHistory: mappedHistory,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while fetching profile context',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Moderation Action Functions
// ============================================================================

/**
 * Validate moderation action parameters
 * Requirements: 11.6
 * 
 * @param params - Moderation action parameters to validate
 * @throws ModerationError if validation fails
 */
function validateModerationActionParams(params: ModerationActionParams): void {
  // Validate report ID
  if (!isValidUUID(params.reportId)) {
    throw new ModerationError(
      'Invalid report ID format',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { reportId: params.reportId }
    );
  }

  // Validate action type
  const validActionTypes = [
    'content_removed',
    'content_approved',
    'user_warned',
    'user_suspended',
    'user_banned',
    'restriction_applied',
  ];
  if (!validActionTypes.includes(params.actionType)) {
    throw new ModerationError(
      'Invalid action type',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { actionType: params.actionType }
    );
  }

  // Validate target user ID
  if (!isValidUUID(params.targetUserId)) {
    throw new ModerationError(
      'Invalid target user ID format',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { targetUserId: params.targetUserId }
    );
  }

  // Validate target type if provided
  if (params.targetType) {
    const validTargetTypes = ['post', 'comment', 'track', 'user'];
    if (!validTargetTypes.includes(params.targetType)) {
      throw new ModerationError(
        'Invalid target type',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { targetType: params.targetType }
      );
    }
  }

  // Validate target ID if provided
  if (params.targetId && !isValidUUID(params.targetId)) {
    throw new ModerationError(
      'Invalid target ID format',
      MODERATION_ERROR_CODES.VALIDATION_ERROR,
      { targetId: params.targetId }
    );
  }

  // Validate and sanitize reason
  if (!params.reason || params.reason.trim().length === 0) {
    throw new ModerationError(
      'Reason is required for moderation actions',
      MODERATION_ERROR_CODES.VALIDATION_ERROR
    );
  }
  validateTextLength(params.reason, 1000, 'Reason');
  params.reason = sanitizeText(params.reason);

  // Validate duration days if provided
  if (params.durationDays !== undefined) {
    if (params.durationDays < 0 || params.durationDays > 365) {
      throw new ModerationError(
        'Duration must be between 0 and 365 days',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { durationDays: params.durationDays }
      );
    }
  }

  // Validate and sanitize internal notes if provided
  if (params.internalNotes) {
    validateTextLength(params.internalNotes, 5000, 'Internal notes');
    params.internalNotes = sanitizeText(params.internalNotes);
  }

  // Validate and sanitize notification message if provided
  if (params.notificationMessage) {
    validateTextLength(params.notificationMessage, 2000, 'Notification message');
    params.notificationMessage = sanitizeText(params.notificationMessage);
  }
}

/**
 * Execute a specific moderation action
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @param params - Moderation action parameters
 * @param actionId - Optional action ID for suspensions (to prevent duplicates)
 * @returns void
 * @throws ModerationError if action fails
 */
async function executeAction(params: ModerationActionParams, actionId?: string): Promise<void> {
  const { actionType, targetType, targetId, targetUserId, durationDays } = params;

  switch (actionType) {
    case 'content_removed':
      // Delete the content permanently
      if (targetType && targetId) {
        await removeContent(targetType, targetId);
      }
      break;

    case 'content_approved':
      // No action needed - report will be marked as dismissed
      break;

    case 'user_warned':
      // Warning is handled through notification system
      break;

    case 'user_suspended':
      // Use existing suspendUser function from adminService
      // Pass actionId to prevent duplicate moderation_actions record
      if (targetUserId) {
        const { suspendUser } = await import('@/lib/adminService');
        await suspendUser(targetUserId, params.reason, durationDays, actionId);
      }
      break;

    case 'user_banned':
      // Permanent suspension (suspension with no expiration)
      // Pass actionId to prevent duplicate moderation_actions record
      if (targetUserId) {
        const { suspendUser } = await import('@/lib/adminService');
        await suspendUser(targetUserId, params.reason, undefined, actionId); // No duration = permanent
      }
      break;

    case 'restriction_applied':
      // Apply the restriction to the user
      if (targetUserId && params.restrictionType) {
        await applyRestriction(
          targetUserId,
          params.restrictionType,
          params.reason,
          durationDays,
          undefined, // relatedActionId will be set after action is created
          false // Don't send notification here - it's handled by takeModerationAction
        );
      }
      break;

    default:
      throw new ModerationError(
        `Unknown action type: ${actionType}`,
        MODERATION_ERROR_CODES.INVALID_ACTION,
        { actionType }
      );
  }
}

/**
 * Take a moderation action on a report
 * Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 7.1, 7.2, 7.3, 7.4, 12.1, 12.2
 * 
 * @param params - Moderation action parameters
 * @returns Created moderation action record
 * @throws ModerationError if unauthorized, validation fails, or database error
 */
export async function takeModerationAction(
  params: ModerationActionParams
): Promise<ModerationAction> {
  try {
    // Validate and sanitize parameters
    // Requirements: 11.6
    validateModerationActionParams(params);

    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can take moderation actions',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check rate limit for moderation actions
    // Requirements: 11.7
    const actionCount = await checkModerationActionRateLimit(user.id);
    if (actionCount >= MODERATION_ACTION_RATE_LIMIT) {
      // Log rate limit violation
      await logSecurityEvent('moderation_action_rate_limit_exceeded', user.id, {
        actionCount,
        limit: MODERATION_ACTION_RATE_LIMIT,
        attemptedAction: params.actionType,
        reportId: params.reportId,
      });

      throw new ModerationError(
        `You have exceeded the moderation action limit of ${MODERATION_ACTION_RATE_LIMIT} actions per hour. Please try again later.`,
        MODERATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
        { actionCount, limit: MODERATION_ACTION_RATE_LIMIT }
      );
    }

    // Check if action is admin-only (permanent suspension)
    if (params.actionType === 'user_banned') {
      const isAdminUser = await isAdmin(user.id);
      if (!isAdminUser) {
        throw new ModerationError(
          'Only admins can permanently suspend users',
          MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS
        );
      }
    }

    // Verify moderators cannot act on admin accounts
    // Requirements: 11.4
    const targetIsAdmin = await isAdmin(params.targetUserId);
    if (targetIsAdmin) {
      const currentUserIsAdmin = await isAdmin(user.id);
      if (!currentUserIsAdmin) {
        // Log failed authorization attempt
        await logSecurityEvent('unauthorized_action_on_admin', user.id, {
          targetUserId: params.targetUserId,
          attemptedAction: params.actionType,
          reportId: params.reportId,
        });

        throw new ModerationError(
          'Moderators cannot take actions on admin accounts',
          MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          { targetUserId: params.targetUserId }
        );
      }
    }

    // Fetch the report to get target information
    const { data: report, error: reportError } = await supabase
      .from('moderation_reports')
      .select('*')
      .eq('id', params.reportId)
      .single();

    if (reportError || !report) {
      throw new ModerationError(
        'Report not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { reportId: params.reportId }
      );
    }

    // Calculate expiration date if duration is provided
    let expiresAt: string | null = null;
    if (params.durationDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + params.durationDays);
      expiresAt = expirationDate.toISOString();
    }

    // For suspensions and bans, create action record first so we can pass the ID
    // This prevents duplicate moderation_actions records
    let action: ModerationAction | null = null;
    const needsActionFirst = params.actionType === 'user_suspended' || params.actionType === 'user_banned';
    
    if (needsActionFirst) {
      // Create moderation action record first
      const { data: createdAction, error: actionError } = await supabase
        .from('moderation_actions')
        .insert({
          moderator_id: user.id,
          target_user_id: params.targetUserId,
          action_type: params.actionType,
          target_type: params.targetType || null,
          target_id: params.targetId || null,
          reason: params.reason,
          duration_days: params.durationDays || null,
          expires_at: expiresAt,
          related_report_id: params.reportId,
          internal_notes: params.internalNotes || null,
          notification_sent: false,
          notification_message: params.notificationMessage || null,
        })
        .select()
        .single();

      if (actionError) {
        handleDatabaseError(actionError, 'create moderation action');
      }

      if (!createdAction) {
        throw new ModerationError(
          'Failed to create moderation action - no data returned',
          MODERATION_ERROR_CODES.DATABASE_ERROR
        );
      }
      
      action = createdAction;
      
      // Execute the action with the action ID (action is guaranteed non-null here)
      await executeAction(params, createdAction.id);
    } else {
      // Execute the action first for other action types
      await executeAction(params);

      // Create moderation action record
      const { data: createdAction, error: actionError } = await supabase
        .from('moderation_actions')
        .insert({
          moderator_id: user.id,
          target_user_id: params.targetUserId,
          action_type: params.actionType,
          target_type: params.targetType || null,
          target_id: params.targetId || null,
          reason: params.reason,
          duration_days: params.durationDays || null,
          expires_at: expiresAt,
          related_report_id: params.reportId,
          internal_notes: params.internalNotes || null,
          notification_sent: false,
          notification_message: params.notificationMessage || null,
        })
        .select()
        .single();

      if (actionError) {
        handleDatabaseError(actionError, 'create moderation action');
      }

      if (!createdAction) {
        throw new ModerationError(
          'Failed to create moderation action - no data returned',
          MODERATION_ERROR_CODES.DATABASE_ERROR
        );
      }
      
      action = createdAction;
    }

    // TypeScript assertion: action is guaranteed to be non-null here
    if (!action) {
      throw new ModerationError(
        'Failed to create moderation action',
        MODERATION_ERROR_CODES.DATABASE_ERROR
      );
    }

    // Link restriction to action if this was a restriction_applied action
    // Requirements: 13.5
    if (params.actionType === 'restriction_applied' && params.restrictionType && params.targetUserId) {
      const { error: linkError } = await supabase
        .from('user_restrictions')
        .update({ related_action_id: action.id })
        .eq('user_id', params.targetUserId)
        .eq('restriction_type', params.restrictionType)
        .eq('is_active', true)
        .is('related_action_id', null);

      if (linkError) {
        console.error('Failed to link restriction to action:', linkError);
        // Don't throw - action was already taken
      }
    }

    // Update report status
    const newStatus = params.actionType === 'content_approved' ? 'dismissed' : 'resolved';
    const { error: updateError } = await supabase
      .from('moderation_reports')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        resolution_notes: params.internalNotes || null,
        action_taken: params.actionType,
      })
      .eq('id', params.reportId);

    if (updateError) {
      console.error('Failed to update report status:', updateError);
      // Don't throw - action was already taken
    }

    // Send notification to the target user (if action affects them)
    // Requirements: 7.1, 7.2, 7.3, 7.4
    if (params.targetUserId && params.actionType !== 'content_approved') {
      try {
        const { sendModerationNotification } = await import('@/lib/moderationNotifications');
        
        const notificationId = await sendModerationNotification(params.targetUserId, {
          actionType: params.actionType,
          targetType: params.targetType,
          reason: params.reason, // Always use the actual reason
          durationDays: params.durationDays,
          expiresAt: expiresAt || undefined,
          customMessage: params.notificationMessage, // Use notification message as additional info
          restrictionType: params.restrictionType,
        });

        // Update notification_sent flag and notification_id
        if (notificationId) {
          await supabase
            .from('moderation_actions')
            .update({ 
              notification_sent: true,
              notification_id: notificationId,
            })
            .eq('id', action.id);
        }
      } catch (notificationError) {
        // Log error but don't fail the action
        console.error('Failed to send moderation notification:', notificationError);
        console.error('Notification error details:', {
          message: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          stack: notificationError instanceof Error ? notificationError.stack : undefined,
          userId: params.targetUserId,
          actionType: params.actionType,
          targetType: params.targetType,
          errorType: typeof notificationError,
          errorConstructor: notificationError?.constructor?.name,
        });
        // Don't throw - notification failure shouldn't block the action
      }
    }

    return action as ModerationAction;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    console.error('Unexpected error in takeModerationAction:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new ModerationError(
      'An unexpected error occurred while taking moderation action',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Restriction Management Functions
// ============================================================================

/**
 * Remove content permanently
 * Requirements: 5.2
 * 
 * @param contentType - Type of content to remove
 * @param contentId - ID of content to remove
 * @throws ModerationError if deletion fails
 */
async function removeContent(contentType: string, contentId: string): Promise<void> {
  try {
    const tableName = contentType === 'post' ? 'posts' : 
                     contentType === 'comment' ? 'comments' : 
                     contentType === 'track' ? 'tracks' : null;

    if (!tableName) {
      throw new ModerationError(
        `Cannot remove content of type: ${contentType}`,
        MODERATION_ERROR_CODES.INVALID_ACTION,
        { contentType }
      );
    }

    console.log(`[Moderation] Attempting to remove ${contentType} with ID: ${contentId} from table: ${tableName}`);

    const { data, error, count } = await supabase
      .from(tableName)
      .delete()
      .eq('id', contentId)
      .select();

    if (error) {
      console.error(`[Moderation] Failed to remove ${contentType}:`, {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        contentType,
        contentId,
        tableName,
      });
      handleDatabaseError(error, 'remove content');
    }

    if (!data || data.length === 0) {
      console.warn(`[Moderation] No ${contentType} was deleted. It may not exist or RLS policies may be blocking deletion.`, {
        contentId,
        tableName,
        count,
      });
      // Don't throw an error - content might already be deleted
    } else {
      console.log(`[Moderation] Successfully removed ${contentType}:`, {
        contentId,
        tableName,
        deletedCount: data.length,
      });
    }
  } catch (error) {
    console.error(`Exception while removing ${contentType}:`, error);
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while removing content',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Apply a restriction to a user
 * Requirements: 5.2, 5.4, 6.1, 6.2, 6.3, 6.4, 7.4
 * 
 * @param userId - User ID to restrict
 * @param restrictionType - Type of restriction to apply
 * @param reason - Reason for the restriction
 * @param durationDays - Optional duration in days (null = permanent)
 * @param relatedActionId - Optional related moderation action ID
 * @param sendNotification - Whether to send notification to user (default: true)
 * @returns Created user restriction record
 * @throws ModerationError if unauthorized or database error
 */
export async function applyRestriction(
  userId: string,
  restrictionType: RestrictionType,
  reason: string,
  durationDays?: number,
  relatedActionId?: string,
  sendNotification: boolean = true
): Promise<UserRestriction> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Validate and sanitize reason
    if (!reason || reason.trim().length === 0) {
      throw new ModerationError(
        'Reason is required for restrictions',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
    validateTextLength(reason, 1000, 'Reason');
    reason = sanitizeText(reason);

    // Get current user
    const user = await getCurrentUser();

    // Verify moderators cannot act on admin accounts
    // Requirements: 11.4
    const targetIsAdmin = await isAdmin(userId);
    if (targetIsAdmin) {
      const currentUserIsAdmin = await isAdmin(user.id);
      if (!currentUserIsAdmin) {
        // Log failed authorization attempt
        await logSecurityEvent('unauthorized_restriction_on_admin', user.id, {
          targetUserId: userId,
          restrictionType,
        });

        throw new ModerationError(
          'Moderators cannot apply restrictions to admin accounts',
          MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          { targetUserId: userId }
        );
      }
    }

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can apply restrictions',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check for existing active restriction of the same type
    // Requirements: Database constraint enforcement
    const { data: existingRestriction, error: checkError } = await supabase
      .from('user_restrictions')
      .select('id, expires_at, reason')
      .eq('user_id', userId)
      .eq('restriction_type', restrictionType)
      .eq('is_active', true)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing restriction:', checkError);
      throw new ModerationError(
        'Failed to check for existing restrictions',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: checkError }
      );
    }

    if (existingRestriction) {
      const expirationInfo = existingRestriction.expires_at
        ? ` (expires ${new Date(existingRestriction.expires_at).toLocaleString()})`
        : ' (permanent)';
      
      throw new ModerationError(
        `This user already has an active ${restrictionType.replace('_', ' ')} restriction${expirationInfo}. Please remove the existing restriction before applying a new one.`,
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { 
          existingRestrictionId: existingRestriction.id,
          existingReason: existingRestriction.reason,
          expiresAt: existingRestriction.expires_at
        }
      );
    }

    // Calculate expiration date if duration is provided
    let expiresAt: string | null = null;
    if (durationDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + durationDays);
      expiresAt = expirationDate.toISOString();
    }

    // Create restriction record
    const { data, error } = await supabase
      .from('user_restrictions')
      .insert({
        user_id: userId,
        restriction_type: restrictionType,
        expires_at: expiresAt,
        is_active: true,
        reason,
        applied_by: user.id,
        related_action_id: relatedActionId || null,
      })
      .select()
      .single();

    if (error) {
      handleDatabaseError(error, 'apply restriction');
    }

    if (!data) {
      throw new ModerationError(
        'Failed to apply restriction - no data returned',
        MODERATION_ERROR_CODES.DATABASE_ERROR
      );
    }

    // Send notification to the user
    // Requirements: 7.4
    if (sendNotification) {
      try {
        const { sendModerationNotification } = await import('@/lib/moderationNotifications');
        
        await sendModerationNotification(userId, {
          actionType: 'restriction_applied',
          reason,
          durationDays,
          expiresAt: expiresAt || undefined,
          restrictionType,
        });
      } catch (notificationError) {
        // Log error but don't fail the restriction
        console.error('Failed to send restriction notification:', notificationError);
      }
    }

    return data as UserRestriction;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while applying restriction',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Check if user has any active restrictions
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @param userId - User ID to check
 * @returns Array of active restrictions
 * @throws ModerationError if database error
 */
export async function checkUserRestrictions(userId: string): Promise<UserRestriction[]> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    const { data, error } = await supabase
      .from('user_restrictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      handleDatabaseError(error, 'check user restrictions');
    }

    return (data as UserRestriction[]) || [];
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking restrictions',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Remove a user restriction (admin/moderator only) - Enhanced with reversal tracking
 * Requirements: 11.3, 13.2, 13.4, 13.5, 13.6
 * 
 * This function performs a complete restriction reversal workflow:
 * 1. Validates authorization and restriction existence
 * 2. Marks restriction as inactive in user_restrictions
 * 3. Updates related moderation_action with reversal details
 * 4. Sends appropriate notification based on restriction type
 * 5. Logs audit event
 * 
 * @param restrictionId - Restriction ID to remove
 * @param reason - Reason for removing the restriction (required)
 * @returns void
 * @throws ModerationError if unauthorized or database error
 */
export async function removeUserRestriction(restrictionId: string, reason: string): Promise<void> {
  try {
    // Validate restriction ID
    if (!isValidUUID(restrictionId)) {
      throw new ModerationError(
        'Invalid restriction ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { restrictionId }
      );
    }

    // Validate and sanitize reason
    // Requirements: 13.4
    if (!reason || reason.trim().length === 0) {
      throw new ModerationError(
        'Reason is required for removing restriction',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
    validateTextLength(reason, 1000, 'Reason');
    reason = sanitizeText(reason);

    // Verify moderator role (throws if unauthorized)
    // Requirements: 13.8, 13.11
    const user = await verifyModeratorRole();

    // Fetch the restriction to check ownership and get details
    // Requirements: 13.2
    const { data: restriction, error: fetchError } = await supabase
      .from('user_restrictions')
      .select('user_id, restriction_type, related_action_id, reason, is_active')
      .eq('id', restrictionId)
      .single();

    if (fetchError || !restriction) {
      throw new ModerationError(
        'Restriction not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { restrictionId }
      );
    }

    // Check if restriction is already inactive
    if (!restriction.is_active) {
      throw new ModerationError(
        'Restriction is already inactive',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { restrictionId }
      );
    }

    // Verify users cannot modify their own restrictions
    // Requirements: 11.3, 13.11
    if (restriction.user_id === user.id) {
      // Log failed authorization attempt
      await logSecurityEvent('unauthorized_self_restriction_modification', user.id, {
        restrictionId,
        action: 'remove',
      });

      throw new ModerationError(
        'Users cannot modify their own restrictions',
        MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        { restrictionId }
      );
    }

    // Verify moderators cannot remove restrictions from admin accounts
    // Requirements: 13.8, 13.11
    await verifyNotAdminTarget(restriction.user_id);

    // Step 1: Mark restriction as inactive
    // Requirements: 13.5
    const { error: updateError } = await supabase
      .from('user_restrictions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', restrictionId);

    if (updateError) {
      handleDatabaseError(updateError, 'remove restriction');
    }

    // Step 2: Update related moderation_action with reversal details
    // Requirements: 13.4, 13.5, 13.12
    if (restriction.related_action_id) {
      // Fetch the action to check if this is a self-reversal
      const { data: relatedAction, error: fetchActionError } = await supabase
        .from('moderation_actions')
        .select('moderator_id')
        .eq('id', restriction.related_action_id)
        .single();

      if (fetchActionError) {
        console.error('Failed to fetch related action:', fetchActionError);
      }

      // Check if this is a self-reversal
      const isSelfReversal = relatedAction && relatedAction.moderator_id === user.id;

      const { error: updateActionError } = await supabase
        .from('moderation_actions')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          metadata: {
            reversal_reason: reason,
            restriction_id: restrictionId,
            restriction_type: restriction.restriction_type,
            is_self_reversal: isSelfReversal,
          },
        })
        .eq('id', restriction.related_action_id);

      if (updateActionError) {
        console.error('Failed to update moderation action with reversal:', updateActionError);
        // Don't throw - restriction was already removed
      }

      // Log self-reversal distinctly for audit purposes
      // Requirements: 13.12
      if (isSelfReversal) {
        await logSecurityEvent('self_reversal_restriction_removal', user.id, {
          actionId: restriction.related_action_id,
          restrictionId,
          targetUserId: restriction.user_id,
          restrictionType: restriction.restriction_type,
          reason,
        });
      }
    }

    // Step 3: Send appropriate notification based on restriction type
    // Requirements: 13.6, 13.15
    try {
      // Fetch moderator profile for notification
      const { data: moderatorProfile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      // Fetch original action details for notification
      let originalAction;
      let originalNotificationId: string | undefined;
      if (restriction.related_action_id) {
        const { data: actionDetails } = await supabase
          .from('moderation_actions')
          .select('reason, moderator_id, created_at, duration_days, notification_id')
          .eq('id', restriction.related_action_id)
          .single();

        if (actionDetails) {
          const { data: originalModeratorProfile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('user_id', actionDetails.moderator_id)
            .single();

          originalAction = {
            reason: actionDetails.reason,
            appliedBy: originalModeratorProfile?.username || 'Unknown',
            appliedAt: actionDetails.created_at,
            durationDays: actionDetails.duration_days,
          };
          
          // Store the notification ID to link the reversal notification
          originalNotificationId = actionDetails.notification_id || undefined;
        }
      }

      // Use the sendReversalNotification function with related notification ID
      const { sendReversalNotification } = await import('@/lib/moderationNotifications');
      await sendReversalNotification(
        restriction.user_id,
        {
          reversalType: 'restriction_removed',
          moderatorName: moderatorProfile?.username || 'Moderator',
          reason: reason,
          restrictionType: restriction.restriction_type,
          originalAction,
        },
        originalNotificationId
      );
    } catch (notificationError) {
      // Log error but don't fail the reversal
      console.error('Failed to send restriction removal notification:', notificationError);
    }

    // Step 4: Log audit event
    // Requirements: 13.6
    try {
      await supabase.rpc('log_admin_action', {
        p_action_type: 'restriction_removed',
        p_target_resource_type: 'user_restriction',
        p_target_resource_id: restrictionId,
        p_old_value: {
          user_id: restriction.user_id,
          restriction_type: restriction.restriction_type,
          is_active: true,
          original_reason: restriction.reason,
        },
        p_new_value: {
          reason: reason,
          removed_by: user.id,
          is_active: false,
        },
      });
    } catch (auditError) {
      // Log error but don't fail the reversal
      console.error('Failed to log restriction removal audit event:', auditError);
    }

    // Invalidate user caches
    const { adminCache } = await import('@/utils/adminCache');
    adminCache.invalidateUserCaches(restriction.user_id);
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while removing restriction',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Check if user can perform a specific action based on restrictions
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @param userId - User ID to check
 * @param action - Action to check ('post', 'comment', 'upload')
 * @returns True if user can perform the action
 * @throws ModerationError if database error
 */
export async function canUserPerformAction(
  userId: string,
  action: 'post' | 'comment' | 'upload'
): Promise<boolean> {
  try {
    const restrictions = await checkUserRestrictions(userId);

    // Check for suspended status (blocks all actions)
    if (restrictions.some((r) => r.restriction_type === 'suspended')) {
      return false;
    }

    // Check for specific action restrictions
    const restrictionMap: Record<string, RestrictionType> = {
      post: 'posting_disabled',
      comment: 'commenting_disabled',
      upload: 'upload_disabled',
    };

    const relevantRestriction = restrictionMap[action];
    if (restrictions.some((r) => r.restriction_type === relevantRestriction)) {
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking user permissions',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// State Change Tracking Functions
// ============================================================================

/**
 * Initialize state changes array for a new action
 * Requirements: 14.4
 * 
 * Creates the initial state change entry when an action is first applied.
 * This forms the foundation of the complete state change history.
 * 
 * @param moderatorId - ID of the moderator applying the action
 * @param reason - Reason for applying the action
 * @returns Initial state changes array
 */
function initializeStateChanges(moderatorId: string, reason: string): StateChangeEntry[] {
  return [
    {
      timestamp: new Date().toISOString(),
      action: 'applied',
      by_user_id: moderatorId,
      reason,
      is_self_action: false, // Initial application is never a self-action
    },
  ];
}

/**
 * Add a state change entry to the existing history
 * Requirements: 14.4
 * 
 * Appends a new state change to the history, maintaining chronological order.
 * Used when an action is reversed or re-applied.
 * 
 * @param existingStateChanges - Existing state changes array (or null)
 * @param action - Type of state change (reversed or reapplied)
 * @param userId - ID of the user performing the action
 * @param reason - Reason for the state change
 * @param isSelfAction - Whether this is a self-action (same user as previous action)
 * @returns Updated state changes array
 */
function addStateChange(
  existingStateChanges: StateChangeEntry[] | null | undefined,
  action: StateChangeAction,
  userId: string,
  reason: string,
  isSelfAction: boolean
): StateChangeEntry[] {
  const stateChanges = existingStateChanges || [];
  
  const newEntry: StateChangeEntry = {
    timestamp: new Date().toISOString(),
    action,
    by_user_id: userId,
    reason,
    is_self_action: isSelfAction,
  };

  return [...stateChanges, newEntry];
}

/**
 * Check if an action was re-applied after being reversed
 * Requirements: 14.4
 * 
 * Analyzes the state change history to determine if the action has been
 * re-applied after a reversal. This is important for tracking multiple
 * reversal cycles.
 * 
 * @param stateChanges - State changes array from metadata
 * @returns True if the action was re-applied after reversal
 */
function wasActionReapplied(stateChanges: StateChangeEntry[] | null | undefined): boolean {
  if (!stateChanges || stateChanges.length === 0) {
    return false;
  }

  // Check if there's a 'reapplied' action in the history
  return stateChanges.some((change) => change.action === 'reapplied');
}

/**
 * Get the complete state change history from metadata
 * Requirements: 14.4
 * 
 * Extracts and validates the state change history from action metadata.
 * Returns an empty array if no history exists.
 * 
 * @param metadata - Action metadata object
 * @returns Array of state change entries
 */
function getStateChangeHistory(metadata: Record<string, unknown> | null): StateChangeEntry[] {
  if (!metadata || !metadata.state_changes) {
    return [];
  }

  // Validate that state_changes is an array
  if (!Array.isArray(metadata.state_changes)) {
    console.warn('[Moderation] Invalid state_changes format in metadata - expected array');
    return [];
  }

  return metadata.state_changes as StateChangeEntry[];
}

// ============================================================================
// Action Reversal Functions
// ============================================================================

/**
 * Lift a user suspension (reversal action)
 * Requirements: 13.1, 13.4, 13.5, 13.6
 * 
 * This function performs a complete suspension reversal workflow:
 * 1. Clears user_profiles.suspended_until and suspension_reason
 * 2. Deactivates suspension restriction in user_restrictions
 * 3. Updates moderation_actions with revoked_at, revoked_by, and reversal_reason
 * 4. Sends notification to the user
 * 5. Logs audit event
 * 
 * @param userId - User ID to lift suspension from
 * @param reason - Reason for lifting the suspension (required)
 * @returns void
 * @throws ModerationError if unauthorized, validation fails, or database error
 */
export async function liftSuspension(userId: string, reason: string): Promise<void> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Validate and sanitize reason
    if (!reason || reason.trim().length === 0) {
      throw new ModerationError(
        'Reason is required for lifting suspension',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
    validateTextLength(reason, 1000, 'Reason');
    reason = sanitizeText(reason);

    // Verify moderator role (throws if unauthorized)
    // Requirements: 13.8, 13.11
    const user = await verifyModeratorRole();

    // Verify moderators cannot act on admin accounts
    // Requirements: 13.8, 13.11
    await verifyNotAdminTarget(userId);

    // Check if user is actually suspended
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('suspended_until, suspension_reason')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      handleDatabaseError(profileError, 'fetch user profile');
    }

    if (!profile || !profile.suspended_until) {
      throw new ModerationError(
        'User is not currently suspended',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Step 1: Clear user_profiles.suspended_until and suspension_reason
    // Requirements: 13.1, 13.5
    const { error: clearSuspensionError } = await supabase
      .from('user_profiles')
      .update({
        suspended_until: null,
        suspension_reason: null,
      })
      .eq('user_id', userId);

    if (clearSuspensionError) {
      handleDatabaseError(clearSuspensionError, 'clear suspension from user profile');
    }

    // Step 2: Deactivate suspension restriction in user_restrictions
    // Requirements: 13.5
    const { error: deactivateRestrictionError } = await supabase
      .from('user_restrictions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('restriction_type', 'suspended')
      .eq('is_active', true);

    if (deactivateRestrictionError) {
      console.error('Failed to deactivate suspension restriction:', deactivateRestrictionError);
      // Don't throw - suspension was already cleared from profile
    }

    // Step 3: Find and update the most recent suspension action with reversal details
    // Requirements: 13.4, 13.5, 13.12
    const { data: suspensionActions, error: fetchActionsError } = await supabase
      .from('moderation_actions')
      .select('id, moderator_id')
      .eq('target_user_id', userId)
      .in('action_type', ['user_suspended', 'user_banned'])
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchActionsError) {
      console.error('Failed to fetch suspension actions:', fetchActionsError);
      // Don't throw - suspension was already cleared
    }

    if (suspensionActions && suspensionActions.length > 0) {
      const actionId = suspensionActions[0].id;
      const originalModeratorId = suspensionActions[0].moderator_id;

      // Check if this is a self-reversal
      // Requirements: 13.12
      const isSelfReversal = originalModeratorId === user.id;

      // Update the action with reversal information
      const { error: updateActionError } = await supabase
        .from('moderation_actions')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          metadata: {
            reversal_reason: reason,
            is_self_reversal: isSelfReversal,
          },
        })
        .eq('id', actionId);

      if (updateActionError) {
        console.error('Failed to update moderation action with reversal:', updateActionError);
        // Don't throw - suspension was already cleared
      }

      // Log self-reversal distinctly for audit purposes
      // Requirements: 13.12
      if (isSelfReversal) {
        await logSecurityEvent('self_reversal_suspension_lift', user.id, {
          actionId,
          targetUserId: userId,
          reason,
          actionType: 'suspension_lift',
        });
      }
    }

    // Step 4: Send notification to the user
    // Requirements: 13.6, 13.15
    try {
      // Fetch moderator profile for notification
      const { data: moderatorProfile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      // Fetch original action details for notification
      let originalAction;
      let originalNotificationId: string | undefined;
      if (suspensionActions && suspensionActions.length > 0) {
        const { data: actionDetails } = await supabase
          .from('moderation_actions')
          .select('reason, moderator_id, created_at, duration_days, notification_id')
          .eq('id', suspensionActions[0].id)
          .single();

        if (actionDetails) {
          const { data: originalModeratorProfile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('user_id', actionDetails.moderator_id)
            .single();

          originalAction = {
            reason: actionDetails.reason,
            appliedBy: originalModeratorProfile?.username || 'Unknown',
            appliedAt: actionDetails.created_at,
            durationDays: actionDetails.duration_days,
          };
          
          // Store the notification ID to link the reversal notification
          originalNotificationId = actionDetails.notification_id || undefined;
        }
      }

      // Use the sendReversalNotification function with related notification ID
      const { sendReversalNotification } = await import('@/lib/moderationNotifications');
      await sendReversalNotification(
        userId,
        {
          reversalType: 'suspension_lifted',
          moderatorName: moderatorProfile?.username || 'Moderator',
          reason: reason,
          originalAction,
        },
        originalNotificationId
      );
    } catch (notificationError) {
      // Log error but don't fail the reversal
      console.error('Failed to send suspension lift notification:', notificationError);
    }

    // Step 5: Log audit event
    // Requirements: 13.6
    try {
      await supabase.rpc('log_admin_action', {
        p_action_type: 'suspension_lifted',
        p_target_resource_type: 'user',
        p_target_resource_id: userId,
        p_old_value: {
          suspended_until: profile.suspended_until,
          suspension_reason: profile.suspension_reason,
        },
        p_new_value: {
          reason: reason,
          lifted_by: user.id,
        },
      });
    } catch (auditError) {
      // Log error but don't fail the reversal
      console.error('Failed to log suspension lift audit event:', auditError);
    }

    // Invalidate user caches
    const { adminCache } = await import('@/utils/adminCache');
    adminCache.invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while lifting suspension',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Remove a permanent suspension from a user (admin only)
 * Requirements: 13.3, 13.4, 13.5, 13.6, 13.13
 * 
 * This function performs a complete permanent suspension reversal workflow:
 * 1. Verifies admin-only authorization
 * 2. Clears user_profiles.suspended_until and suspension_reason (handles far future dates)
 * 3. Deactivates suspension restriction in user_restrictions
 * 4. Updates moderation_actions with revoked_at, revoked_by, and reversal_reason
 * 5. Sends notification to the user
 * 6. Logs audit event
 * 
 * @param userId - User ID to remove permanent suspension from
 * @param reason - Reason for removing the permanent suspension (required)
 * @returns void
 * @throws ModerationError if unauthorized, validation fails, or database error
 */
export async function removeBan(userId: string, reason: string): Promise<void> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Validate and sanitize reason
    if (!reason || reason.trim().length === 0) {
      throw new ModerationError(
        'Reason is required for removing permanent suspension',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
    validateTextLength(reason, 1000, 'Reason');
    reason = sanitizeText(reason);

    // Verify admin role (permanent suspension removal is admin-only, throws if unauthorized)
    // Requirements: 13.3, 13.8, 13.13
    const user = await verifyAdminRole();

    // Check if user is actually permanently suspended (suspended with far future date or null)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('suspended_until, suspension_reason')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      handleDatabaseError(profileError, 'fetch user profile');
    }

    if (!profile || !profile.suspended_until) {
      throw new ModerationError(
        'User is not currently permanently suspended',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Check if this is a permanent suspension (far future date indicates permanent suspension)
    // Permanent suspensions typically have a date far in the future (e.g., year 9999)
    const suspendedUntil = new Date(profile.suspended_until);
    const farFutureThreshold = new Date('2100-01-01'); // Any date beyond 2100 is considered permanent
    const isPermanentBan = suspendedUntil > farFutureThreshold;

    if (!isPermanentBan) {
      // This is a temporary suspension, not a permanent suspension
      throw new ModerationError(
        'User has a temporary suspension, not a permanent suspension. Use liftSuspension instead.',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId, suspendedUntil: profile.suspended_until }
      );
    }

    // Step 1: Clear user_profiles.suspended_until and suspension_reason
    // Requirements: 13.3, 13.5
    const { error: clearBanError } = await supabase
      .from('user_profiles')
      .update({
        suspended_until: null,
        suspension_reason: null,
      })
      .eq('user_id', userId);

    if (clearBanError) {
      handleDatabaseError(clearBanError, 'clear permanent suspension from user profile');
    }

    // Step 2: Deactivate suspension restriction in user_restrictions
    // Requirements: 13.5
    const { error: deactivateRestrictionError } = await supabase
      .from('user_restrictions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('restriction_type', 'suspended')
      .eq('is_active', true);

    if (deactivateRestrictionError) {
      console.error('Failed to deactivate suspension restriction:', deactivateRestrictionError);
      // Don't throw - permanent suspension was already cleared from profile
    }

    // Step 3: Find and update the most recent permanent suspension action with reversal details
    // Requirements: 13.4, 13.5, 13.12
    const { data: banActions, error: fetchActionsError } = await supabase
      .from('moderation_actions')
      .select('id, moderator_id')
      .eq('target_user_id', userId)
      .eq('action_type', 'user_banned')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchActionsError) {
      console.error('Failed to fetch permanent suspension actions:', fetchActionsError);
      // Don't throw - permanent suspension was already cleared
    }

    if (banActions && banActions.length > 0) {
      const actionId = banActions[0].id;
      const originalModeratorId = banActions[0].moderator_id;

      // Check if this is a self-reversal
      // Requirements: 13.12
      const isSelfReversal = originalModeratorId === user.id;

      // Update the action with reversal information
      const { error: updateActionError } = await supabase
        .from('moderation_actions')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          metadata: {
            reversal_reason: reason,
            is_self_reversal: isSelfReversal,
          },
        })
        .eq('id', actionId);

      if (updateActionError) {
        console.error('Failed to update moderation action with reversal:', updateActionError);
        // Don't throw - permanent suspension was already cleared
      }

      // Log self-reversal distinctly for audit purposes
      // Requirements: 13.12
      if (isSelfReversal) {
        await logSecurityEvent('self_reversal_permanent_suspension_removal', user.id, {
          actionId,
          targetUserId: userId,
          reason,
          actionType: 'permanent_suspension_removal',
        });
      }
    }

    // Step 4: Send notification to the user
    // Requirements: 13.6, 13.15
    try {
      // Fetch admin profile for notification
      const { data: adminProfile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      // Fetch original action details for notification
      let originalAction;
      let originalNotificationId: string | undefined;
      if (banActions && banActions.length > 0) {
        const { data: actionDetails } = await supabase
          .from('moderation_actions')
          .select('reason, moderator_id, created_at, duration_days, notification_id')
          .eq('id', banActions[0].id)
          .single();

        if (actionDetails) {
          const { data: originalModeratorProfile } = await supabase
            .from('user_profiles')
            .select('username')
            .eq('user_id', actionDetails.moderator_id)
            .single();

          originalAction = {
            reason: actionDetails.reason,
            appliedBy: originalModeratorProfile?.username || 'Unknown',
            appliedAt: actionDetails.created_at,
            durationDays: actionDetails.duration_days,
          };
          
          // Store the notification ID to link the reversal notification
          originalNotificationId = actionDetails.notification_id || undefined;
        }
      }

      // Use the sendReversalNotification function with related notification ID
      const { sendReversalNotification } = await import('@/lib/moderationNotifications');
      await sendReversalNotification(
        userId,
        {
          reversalType: 'ban_removed',
          moderatorName: adminProfile?.username || 'Administrator',
          reason: reason,
          originalAction,
        },
        originalNotificationId
      );
    } catch (notificationError) {
      // Log error but don't fail the reversal
      console.error('Failed to send ban removal notification:', notificationError);
    }

    // Step 5: Log audit event
    // Requirements: 13.6
    try {
      await supabase.rpc('log_admin_action', {
        p_action_type: 'ban_removed',
        p_target_resource_type: 'user',
        p_target_resource_id: userId,
        p_old_value: {
          suspended_until: profile.suspended_until,
          suspension_reason: profile.suspension_reason,
        },
        p_new_value: {
          reason: reason,
          removed_by: user.id,
        },
      });
    } catch (auditError) {
      // Log error but don't fail the reversal
      console.error('Failed to log ban removal audit event:', auditError);
    }

    // Invalidate user caches
    const { adminCache } = await import('@/utils/adminCache');
    adminCache.invalidateUserCaches(userId);
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while removing ban',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Revoke any moderation action (generic reversal function)
 * Requirements: 13.4, 13.5, 13.7
 * 
 * This function provides a generic way to revoke any moderation action by:
 * 1. Fetching the action details to determine action type
 * 2. Performing action-specific cleanup based on action type
 * 3. Updating moderation_actions with revoked_at, revoked_by, and reversal_reason
 * 4. Preventing double-reversal by checking if action is already revoked
 * 5. Sending appropriate notification to the affected user
 * 6. Logging audit event
 * 
 * @param actionId - Moderation action ID to revoke
 * @param reason - Reason for revoking the action (required)
 * @returns void
 * @throws ModerationError if unauthorized, validation fails, already revoked, or database error
 */
export async function revokeAction(actionId: string, reason: string): Promise<void> {
  try {
    // Validate action ID
    if (!isValidUUID(actionId)) {
      throw new ModerationError(
        'Invalid action ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { actionId }
      );
    }

    // Validate and sanitize reason
    // Requirements: 13.4
    if (!reason || reason.trim().length === 0) {
      throw new ModerationError(
        'Reason is required for revoking action',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
    validateTextLength(reason, 1000, 'Reason');
    reason = sanitizeText(reason);

    // Verify moderator role (throws if unauthorized)
    // Requirements: 13.8, 13.11
    const user = await verifyModeratorRole();

    // Step 1: Fetch the action to get details and check if already revoked
    // Requirements: 13.7
    const { data: action, error: fetchError } = await supabase
      .from('moderation_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError || !action) {
      throw new ModerationError(
        'Moderation action not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { actionId }
      );
    }

    // Prevent double-reversal
    // Requirements: 13.7
    if (action.revoked_at) {
      throw new ModerationError(
        'This action has already been revoked',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { 
          actionId, 
          revokedAt: action.revoked_at,
          revokedBy: action.revoked_by 
        }
      );
    }

    // Check if action type is ban - only admins can revoke bans
    // Requirements: 13.3, 13.13
    if (action.action_type === 'user_banned') {
      const currentUserIsAdmin = await isAdmin(user.id);
      if (!currentUserIsAdmin) {
        // Log failed authorization attempt
        await logSecurityEvent('unauthorized_ban_revoke_attempt', user.id, {
          targetUserId: action.target_user_id,
          actionId,
        });

        throw new ModerationError(
          'Only admins can revoke permanent bans',
          MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          { actionId }
        );
      }
    }

    // Verify moderators cannot revoke actions on admin accounts
    // Requirements: 13.8, 13.11
    await verifyNotAdminTarget(action.target_user_id);

    // Step 2: Perform action-specific cleanup based on action type
    // Requirements: 13.4, 13.5
    switch (action.action_type) {
      case 'user_suspended':
      case 'user_banned':
        // Clear suspension from user profile
        await supabase
          .from('user_profiles')
          .update({
            suspended_until: null,
            suspension_reason: null,
          })
          .eq('user_id', action.target_user_id);

        // Deactivate suspension restriction
        await supabase
          .from('user_restrictions')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', action.target_user_id)
          .eq('restriction_type', 'suspended')
          .eq('is_active', true);
        break;

      case 'restriction_applied':
        // Find and deactivate the related restriction
        if (action.metadata && action.metadata.restriction_type) {
          await supabase
            .from('user_restrictions')
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', action.target_user_id)
            .eq('restriction_type', action.metadata.restriction_type)
            .eq('related_action_id', actionId)
            .eq('is_active', true);
        } else {
          // If no specific restriction type in metadata, deactivate all restrictions related to this action
          await supabase
            .from('user_restrictions')
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('related_action_id', actionId)
            .eq('is_active', true);
        }
        break;

      case 'content_removed':
        // Content removal cannot be undone (content is permanently deleted)
        // We can only mark the action as revoked for audit purposes
        console.warn(`[Moderation] Revoking content_removed action ${actionId} - content cannot be restored`);
        break;

      case 'user_warned':
        // Warnings don't have state to clean up, just mark as revoked
        break;

      case 'content_approved':
        // Content approval doesn't have state to clean up
        break;

      default:
        console.warn(`[Moderation] Unknown action type for reversal: ${action.action_type}`);
        break;
    }

    // Step 3: Update moderation_actions with reversal details
    // Requirements: 13.4, 13.5, 13.12, 14.4
    
    // Check if this is a self-reversal
    const isSelfReversal = action.moderator_id === user.id;

    // Get existing state changes or initialize if this is the first state change
    const existingStateChanges = getStateChangeHistory(action.metadata);
    
    // If no state changes exist, initialize with the original application
    let stateChanges: StateChangeEntry[];
    if (existingStateChanges.length === 0) {
      // Initialize with original application
      stateChanges = initializeStateChanges(action.moderator_id, action.reason);
    } else {
      stateChanges = existingStateChanges;
    }
    
    // Add the reversal state change
    stateChanges = addStateChange(
      stateChanges,
      'reversed',
      user.id,
      reason,
      isSelfReversal
    );

    const { error: updateError } = await supabase
      .from('moderation_actions')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        metadata: {
          ...action.metadata,
          reversal_reason: reason,
          is_self_reversal: isSelfReversal,
          state_changes: stateChanges, // Complete state change history
        },
      })
      .eq('id', actionId);

    if (updateError) {
      handleDatabaseError(updateError, 'update action with reversal details');
    }

    // Log self-reversal distinctly for audit purposes
    // Requirements: 13.12
    if (isSelfReversal) {
      await logSecurityEvent('self_reversal_action_revoke', user.id, {
        actionId,
        targetUserId: action.target_user_id,
        actionType: action.action_type,
        reason,
      });
    }

    // Step 4: Send appropriate notification to the affected user
    // Requirements: 13.4
    try {
      // Map action types to user-friendly notification messages
      const actionTypeMessages: Record<string, { title: string; messagePrefix: string }> = {
        user_suspended: {
          title: 'Suspension Lifted',
          messagePrefix: 'Your account suspension has been lifted',
        },
        user_banned: {
          title: 'Ban Removed',
          messagePrefix: 'Your permanent ban has been removed',
        },
        restriction_applied: {
          title: 'Restriction Removed',
          messagePrefix: 'A restriction on your account has been removed',
        },
        user_warned: {
          title: 'Warning Revoked',
          messagePrefix: 'A warning on your account has been revoked',
        },
        content_removed: {
          title: 'Content Removal Revoked',
          messagePrefix: 'A content removal action has been revoked (note: content cannot be restored)',
        },
      };

      const notificationInfo = actionTypeMessages[action.action_type] || {
        title: 'Moderation Action Revoked',
        messagePrefix: 'A moderation action on your account has been revoked',
      };

      await supabase.from('notifications').insert({
        user_id: action.target_user_id,
        type: 'moderation',
        title: notificationInfo.title,
        message: `${notificationInfo.messagePrefix}.\n\nReason: ${reason}\n\nOriginal action reason: ${action.reason}\n\nPlease continue to follow our community guidelines to maintain your account in good standing.`,
        read: false,
        data: {
          moderation_action: 'action_revoked',
          original_action_type: action.action_type,
          action_id: actionId,
          reason: reason,
          revoked_by: user.id,
          original_reason: action.reason,
        },
      });
    } catch (notificationError) {
      // Log error but don't fail the reversal
      console.error('Failed to send action revoke notification:', notificationError);
    }

    // Step 5: Log audit event
    // Requirements: 13.4
    try {
      await supabase.rpc('log_admin_action', {
        p_action_type: 'moderation_action_revoked',
        p_target_resource_type: 'moderation_action',
        p_target_resource_id: actionId,
        p_old_value: {
          action_type: action.action_type,
          target_user_id: action.target_user_id,
          reason: action.reason,
          revoked_at: null,
        },
        p_new_value: {
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          reversal_reason: reason,
        },
      });
    } catch (auditError) {
      // Log error but don't fail the reversal
      console.error('Failed to log action revoke audit event:', auditError);
    }

    // Invalidate user caches
    const { adminCache } = await import('@/utils/adminCache');
    adminCache.invalidateUserCaches(action.target_user_id);
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while revoking action',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Get all active restrictions for a user (helper function)
 * Requirements: 13.2
 * 
 * This helper function returns all active, non-expired restrictions for a user.
 * It's useful for displaying the current restriction status on user profiles
 * and for determining what reversal actions are available.
 * 
 * @param userId - User ID to get restrictions for
 * @returns Array of active, non-expired user restrictions
 * @throws ModerationError if validation fails or database error
 */
export async function getUserActiveRestrictions(userId: string): Promise<UserRestriction[]> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Query for active restrictions that are either:
    // 1. Permanent (expires_at is null)
    // 2. Not yet expired (expires_at is in the future)
    const { data, error } = await supabase
      .from('user_restrictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      handleDatabaseError(error, 'get user active restrictions');
    }

    return (data as UserRestriction[]) || [];
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while getting user active restrictions',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Suspension status information for a user
 * Requirements: 13.1, 13.3
 */
export interface UserSuspensionStatus {
  isSuspended: boolean;
  suspendedUntil: string | null;
  suspensionReason: string | null;
  isPermanent: boolean;
  daysRemaining: number | null;
}

/**
 * Get user suspension status with expiration details
 * Requirements: 13.1, 13.3
 * 
 * This helper function returns the current suspension status for a user,
 * including whether they are suspended, when the suspension expires,
 * and whether it's a permanent ban. It's useful for displaying suspension
 * information on user profiles and determining what reversal actions are available.
 * 
 * A permanent ban is distinguished by having a suspended_until date far in the future
 * (typically 100+ years from now) or being explicitly marked as permanent.
 * 
 * @param userId - User ID to get suspension status for
 * @returns Suspension status information
 * @throws ModerationError if validation fails or database error
 */
export async function getUserSuspensionStatus(userId: string): Promise<UserSuspensionStatus> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Query user profile for suspension information
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('suspended_until, suspension_reason')
      .eq('user_id', userId)
      .single();

    if (error) {
      handleDatabaseError(error, 'get user suspension status');
    }

    // If no profile, return not suspended
    if (!profile) {
      return {
        isSuspended: false,
        suspendedUntil: null,
        suspensionReason: null,
        isPermanent: false,
        daysRemaining: null,
      };
    }

    // Check if user has a suspension reason (indicates they are or were suspended)
    if (!profile.suspension_reason) {
      return {
        isSuspended: false,
        suspendedUntil: null,
        suspensionReason: null,
        isPermanent: false,
        daysRemaining: null,
      };
    }

    // If suspended_until is NULL, it's a permanent suspension
    if (!profile.suspended_until) {
      return {
        isSuspended: true,
        suspendedUntil: null,
        suspensionReason: profile.suspension_reason,
        isPermanent: true,
        daysRemaining: null,
      };
    }

    const suspendedUntil = new Date(profile.suspended_until);
    const now = new Date();

    // Check if suspension has already expired
    if (suspendedUntil <= now) {
      return {
        isSuspended: false,
        suspendedUntil: profile.suspended_until,
        suspensionReason: profile.suspension_reason,
        isPermanent: false,
        daysRemaining: 0,
      };
    }

    // Calculate days remaining
    const msRemaining = suspendedUntil.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    return {
      isSuspended: true,
      suspendedUntil: profile.suspended_until,
      suspensionReason: profile.suspension_reason,
      isPermanent: false,
      daysRemaining,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while getting user suspension status',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Moderation history entry combining action and reversal information
 * Requirements: 14.2, 14.4
 */
export interface ModerationHistoryEntry {
  action: ModerationAction;
  isRevoked: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  reversalReason: string | null;
  timeBetweenActionAndReversal: number | null; // Time in milliseconds between action and reversal
  stateChanges?: StateChangeEntry[]; // Complete state change history for multiple reversals
  wasReapplied?: boolean; // Whether the action was re-applied after reversal
}

/**
 * Get complete moderation history for a user
 * Requirements: 14.2
 * 
 * This function returns the complete moderation history for a user,
 * including both original actions and their reversals. It provides
 * a chronological view of all moderation actions taken on a user's account.
 * 
 * The history includes:
 * - All moderation actions (warnings, suspensions, bans, restrictions, content removals)
 * - Reversal information (if action was revoked, when, by whom, and why)
 * - Time between action and reversal (in milliseconds)
 * - Chronological ordering (most recent first)
 * 
 * @param userId - User ID to get moderation history for
 * @param includeRevoked - Whether to include revoked actions (default: true)
 * @returns Array of moderation history entries with complete reversal details
 * @throws ModerationError if validation fails or database error
 */
export async function getUserModerationHistory(
  userId: string,
  includeRevoked: boolean = true
): Promise<ModerationHistoryEntry[]> {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      throw new ModerationError(
        'Invalid user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { userId }
      );
    }

    // Build query for moderation actions
    let query = supabase
      .from('moderation_actions')
      .select('*')
      .eq('target_user_id', userId);

    // Filter by revoked status if requested
    if (!includeRevoked) {
      query = query.is('revoked_at', null);
    }

    // Order by creation date (most recent first)
    query = query.order('created_at', { ascending: false });

    // Execute query
    const { data: actions, error } = await query;

    if (error) {
      handleDatabaseError(error, 'get user moderation history');
    }

    if (!actions || actions.length === 0) {
      return [];
    }

    // Transform actions into history entries with reversal information
    // Requirements: 14.2, 14.4
    const historyEntries: ModerationHistoryEntry[] = actions.map((action) => {
      const isRevoked = action.revoked_at !== null;
      const reversalReason = action.metadata?.reversal_reason || null;

      // Calculate time between action and reversal if action was revoked
      let timeBetweenActionAndReversal: number | null = null;
      if (isRevoked && action.revoked_at && action.created_at) {
        const actionTime = new Date(action.created_at).getTime();
        const reversalTime = new Date(action.revoked_at).getTime();
        timeBetweenActionAndReversal = reversalTime - actionTime;
      }

      // Get state change history from metadata
      // Requirements: 14.4
      const stateChanges = getStateChangeHistory(action.metadata);
      
      // Check if action was re-applied after reversal
      // Requirements: 14.4
      const wasReapplied = wasActionReapplied(stateChanges);

      return {
        action: action as ModerationAction,
        isRevoked,
        revokedAt: action.revoked_at,
        revokedBy: action.revoked_by,
        reversalReason,
        timeBetweenActionAndReversal,
        stateChanges: stateChanges.length > 0 ? stateChanges : undefined,
        wasReapplied,
      };
    });

    return historyEntries;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while getting user moderation history',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Action Logs Functions
// ============================================================================

/**
 * Filters for moderation action logs
 */
export interface ActionLogFilters {
  actionType?: string;
  moderatorId?: string;
  targetUserId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string; // For searching by user ID or content ID
  reversedOnly?: boolean;
  nonReversedOnly?: boolean;
  recentlyReversed?: boolean;
  expiredOnly?: boolean;
  nonExpiredOnly?: boolean;
}

/**
 * Fetch moderation action logs with filtering and pagination
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.6
 * 
 * @param filters - Optional filters for the logs
 * @param limit - Maximum number of records to return (default: 100)
 * @param offset - Number of records to skip for pagination (default: 0)
 * @returns Array of moderation actions matching the filters
 * @throws ModerationError if unauthorized or database error
 */
export async function fetchModerationLogs(
  filters: ActionLogFilters = {},
  limit: number = 100,
  offset: number = 0
): Promise<{ actions: ModerationAction[]; total: number }> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access action logs',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Build query for count
    let countQuery = supabase
      .from('moderation_actions')
      .select('*', { count: 'exact', head: true });

    // Build query for data
    let dataQuery = supabase
      .from('moderation_actions')
      .select('*');

    // Apply filters to both queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilters = (query: any) => {
      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      if (filters.moderatorId) {
        query = query.eq('moderator_id', filters.moderatorId);
      }

      if (filters.targetUserId) {
        query = query.eq('target_user_id', filters.targetUserId);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.searchQuery) {
        // Search in target_user_id or target_id
        query = query.or(
          `target_user_id.eq.${filters.searchQuery},target_id.eq.${filters.searchQuery}`
        );
      }

      // Reversal filters
      if (filters.reversedOnly) {
        query = query.not('revoked_at', 'is', null);
      }

      if (filters.nonReversedOnly) {
        query = query.is('revoked_at', null);
      }

      if (filters.recentlyReversed) {
        // Get actions reversed in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query
          .not('revoked_at', 'is', null)
          .gte('revoked_at', sevenDaysAgo.toISOString());
      }

      // Expiration filters
      if (filters.expiredOnly) {
        // Show only actions with expires_at in the past
        const now = new Date().toISOString();
        query = query
          .not('expires_at', 'is', null)
          .lt('expires_at', now);
      }

      if (filters.nonExpiredOnly) {
        // Show only actions that haven't expired (no expires_at or expires_at in future)
        const now = new Date().toISOString();
        query = query.or(`expires_at.is.null,expires_at.gt.${now}`);
      }

      return query;
    };

    countQuery = applyFilters(countQuery);
    dataQuery = applyFilters(dataQuery);

    // Apply sorting (most recent first)
    dataQuery = dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError) {
      handleDatabaseError(countError, 'fetch action logs count');
    }

    if (dataError) {
      handleDatabaseError(dataError, 'fetch action logs');
    }

    return {
      actions: (data as ModerationAction[]) || [],
      total: count || 0,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while fetching action logs',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Export moderation action logs to CSV format
 * Requirements: 8.5
 * 
 * @param filters - Optional filters for the logs
 * @returns CSV string of action logs
 * @throws ModerationError if unauthorized or database error
 */
export async function exportActionLogsToCSV(filters: ActionLogFilters = {}): Promise<string> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify admin role (CSV export is admin-only)
    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      throw new ModerationError(
        'Only admins can export action logs',
        MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    }

    // Fetch all matching logs (no pagination for export)
    const { actions } = await fetchModerationLogs(filters, 10000, 0);

    // Generate CSV header
    // Requirements: 14.8 - Include reversal columns
    const headers = [
      'ID',
      'Moderator ID',
      'Target User ID',
      'Action Type',
      'Target Type',
      'Target ID',
      'Reason',
      'Duration (Days)',
      'Expires At',
      'Related Report ID',
      'Internal Notes',
      'Notification Sent',
      'Created At',
      'Revoked At',
      'Revoked By',
      'Reversal Reason',
      'Time to Reversal (Hours)',
    ];

    // Generate CSV rows
    const rows = actions.map((action) => {
      // Extract reversal reason from metadata
      const reversalReason = action.metadata?.reversal_reason || '';
      
      // Calculate time-to-reversal in hours
      // Requirements: 14.8 - Include time-to-reversal calculation
      let timeToReversalHours = '';
      if (action.revoked_at && action.created_at) {
        const createdTime = new Date(action.created_at).getTime();
        const revokedTime = new Date(action.revoked_at).getTime();
        const hours = (revokedTime - createdTime) / (1000 * 60 * 60);
        timeToReversalHours = hours.toFixed(2);
      }

      return [
        action.id,
        action.moderator_id,
        action.target_user_id,
        action.action_type,
        action.target_type || '',
        action.target_id || '',
        action.reason,
        action.duration_days?.toString() || '',
        action.expires_at || '',
        action.related_report_id || '',
        action.internal_notes || '',
        action.notification_sent ? 'Yes' : 'No',
        action.created_at,
        action.revoked_at || '',
        action.revoked_by || '',
        reversalReason,
        timeToReversalHours,
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while exporting action logs',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Metrics Functions
// ============================================================================

/**
 * Moderation metrics data structure
 */
export interface ModerationMetrics {
  reportsReceived: {
    today: number;
    week: number;
    month: number;
  };
  reportsResolved: {
    today: number;
    week: number;
    month: number;
  };
  averageResolutionTime: {
    hours: number;
    minutes: number;
  };
  actionsByType: Record<string, number>;
  topReasons: Array<{ reason: string; count: number }>;
  moderatorPerformance?: Array<{
    moderatorId: string;
    actionsCount: number;
    averageResolutionTime: number;
  }>;
  slaCompliance?: {
    p1: { total: number; withinSLA: number; percentage: number };
    p2: { total: number; withinSLA: number; percentage: number };
    p3: { total: number; withinSLA: number; percentage: number };
    p4: { total: number; withinSLA: number; percentage: number };
    p5: { total: number; withinSLA: number; percentage: number };
  };
  trends?: {
    reportVolume: Array<{ date: string; count: number }>;
    resolutionRate: Array<{ date: string; rate: number }>;
  };
}

/**
 * Date range for metrics calculation
 */
export interface MetricsDateRange {
  startDate: string;
  endDate: string;
}

/**
 * SLA targets in hours for each priority level
 * Requirements: 9.6
 */
export const SLA_TARGETS: Record<number, number> = {
  1: 2,   // P1 - 2 hours
  2: 8,   // P2 - 8 hours
  3: 24,  // P3 - 24 hours
  4: 48,  // P4 - 48 hours
  5: 72,  // P5 - 72 hours
};

/**
 * Calculate SLA compliance for reports by priority level
 * Requirements: 9.6
 * 
 * @param dateRange - Optional date range for filtering
 * @returns SLA compliance data by priority level
 * @throws ModerationError if database error
 */
export async function calculateSLACompliance(
  dateRange?: MetricsDateRange
): Promise<ModerationMetrics['slaCompliance']> {
  try {
    // Build query for resolved reports
    let query = supabase
      .from('moderation_reports')
      .select('priority, created_at, reviewed_at')
      .in('status', ['resolved', 'dismissed'])
      .not('reviewed_at', 'is', null);

    // Apply date range filter if provided
    if (dateRange) {
      query = query
        .gte('reviewed_at', dateRange.startDate)
        .lte('reviewed_at', dateRange.endDate);
    }

    const { data: reports, error } = await query;

    if (error) {
      handleDatabaseError(error, 'calculate SLA compliance');
    }

    // Initialize SLA compliance data
    const slaCompliance = {
      p1: { total: 0, withinSLA: 0, percentage: 0 },
      p2: { total: 0, withinSLA: 0, percentage: 0 },
      p3: { total: 0, withinSLA: 0, percentage: 0 },
      p4: { total: 0, withinSLA: 0, percentage: 0 },
      p5: { total: 0, withinSLA: 0, percentage: 0 },
    };

    if (!reports || reports.length === 0) {
      return slaCompliance;
    }

    // Calculate SLA compliance for each report
    reports.forEach((report) => {
      const priority = report.priority;
      const created = new Date(report.created_at).getTime();
      const reviewed = new Date(report.reviewed_at!).getTime();
      const resolutionTimeHours = (reviewed - created) / (1000 * 60 * 60);
      const slaTarget = SLA_TARGETS[priority] || 72;

      const priorityKey = `p${priority}` as keyof typeof slaCompliance;
      slaCompliance[priorityKey].total++;

      if (resolutionTimeHours <= slaTarget) {
        slaCompliance[priorityKey].withinSLA++;
      }
    });

    // Calculate percentages
    Object.keys(slaCompliance).forEach((key) => {
      const priorityData = slaCompliance[key as keyof typeof slaCompliance];
      if (priorityData.total > 0) {
        priorityData.percentage = Math.round(
          (priorityData.withinSLA / priorityData.total) * 100
        );
      }
    });

    return slaCompliance;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while calculating SLA compliance',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Calculate trends over time for report volume and resolution rates
 * Requirements: 9.7
 * 
 * @param dateRange - Date range for trend calculation
 * @param intervalDays - Number of days per data point (default: 1)
 * @returns Trend data for report volume and resolution rates
 * @throws ModerationError if database error
 */
export async function calculateMetricsTrends(
  dateRange: MetricsDateRange,
  intervalDays: number = 1
): Promise<ModerationMetrics['trends']> {
  try {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Generate date intervals
    const intervals: Array<{ start: string; end: string; label: string }> = [];
    for (let i = 0; i < totalDays; i += intervalDays) {
      const intervalStart = new Date(startDate);
      intervalStart.setDate(intervalStart.getDate() + i);
      
      const intervalEnd = new Date(intervalStart);
      intervalEnd.setDate(intervalEnd.getDate() + intervalDays);
      
      // Don't go past the end date
      if (intervalEnd > endDate) {
        intervalEnd.setTime(endDate.getTime());
      }

      intervals.push({
        start: intervalStart.toISOString(),
        end: intervalEnd.toISOString(),
        label: intervalStart.toISOString().split('T')[0],
      });
    }

    // Fetch report volume for each interval
    const reportVolumePromises = intervals.map(async (interval) => {
      const { count, error } = await supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', interval.start)
        .lt('created_at', interval.end);

      if (error) {
        console.error('Error fetching report volume:', error);
        return { date: interval.label, count: 0 };
      }

      return { date: interval.label, count: count || 0 };
    });

    // Fetch resolution rate for each interval
    const resolutionRatePromises = intervals.map(async (interval) => {
      // Get total reports created in this interval
      const { count: totalReports, error: totalError } = await supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', interval.start)
        .lt('created_at', interval.end);

      if (totalError) {
        console.error('Error fetching total reports:', totalError);
        return { date: interval.label, rate: 0 };
      }

      // Get resolved reports from this interval
      const { count: resolvedReports, error: resolvedError } = await supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', interval.start)
        .lt('created_at', interval.end)
        .in('status', ['resolved', 'dismissed']);

      if (resolvedError) {
        console.error('Error fetching resolved reports:', resolvedError);
        return { date: interval.label, rate: 0 };
      }

      const rate =
        totalReports && totalReports > 0
          ? Math.round((resolvedReports || 0) / totalReports * 100)
          : 0;

      return { date: interval.label, rate };
    });

    const [reportVolume, resolutionRate] = await Promise.all([
      Promise.all(reportVolumePromises),
      Promise.all(resolutionRatePromises),
    ]);

    return {
      reportVolume,
      resolutionRate,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while calculating trends',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Reversal rate result interface
 * Requirements: 14.3
 */
export interface ReversalRateResult {
  overallReversalRate: number; // Percentage of actions that were reversed
  totalActions: number;
  totalReversals: number;
  reversalRateByActionType: Array<{
    actionType: string;
    totalActions: number;
    reversedActions: number;
    reversalRate: number; // Percentage
  }>;
  reversalRateByPriority: Array<{
    priority: number;
    totalActions: number;
    reversedActions: number;
    reversalRate: number; // Percentage
  }>;
}

/**
 * Calculate reversal rate for a given date range
 * Requirements: 14.3
 * 
 * This function calculates reversal rate statistics including:
 * - Overall reversal rate (percentage of actions that were reversed)
 * - Reversal rate by action type
 * - Reversal rate by priority level
 * 
 * @param startDate - Start date for calculation (ISO string)
 * @param endDate - End date for calculation (ISO string)
 * @returns Reversal rate data
 * @throws ModerationError if unauthorized or database error
 */
export async function calculateReversalRate(
  startDate: string,
  endDate: string
): Promise<ReversalRateResult> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can calculate reversal rates',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Validate date parameters
    if (!startDate || !endDate) {
      throw new ModerationError(
        'Start date and end date are required',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Validate date format (basic ISO string check)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new ModerationError(
        'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    if (startDateObj > endDateObj) {
      throw new ModerationError(
        'Start date must be before end date',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Fetch all moderation actions in the date range with related report data for priority
    // We need to join with moderation_reports to get priority information
    const { data: allActions, error: allActionsError } = await supabase
      .from('moderation_actions')
      .select(`
        id,
        action_type,
        created_at,
        revoked_at,
        related_report_id,
        moderation_reports!related_report_id (
          priority
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (allActionsError) {
      handleDatabaseError(allActionsError, 'fetch moderation actions for reversal rate calculation');
    }

    const totalActions = allActions?.length || 0;

    // Filter reversed actions (those with revoked_at set)
    const reversedActions = allActions?.filter((action) => action.revoked_at !== null) || [];
    const totalReversals = reversedActions.length;

    // Calculate overall reversal rate
    const overallReversalRate = totalActions > 0 
      ? Math.round((totalReversals / totalActions) * 100 * 100) / 100 // Round to 2 decimal places
      : 0;

    // Calculate reversal rate by action type
    const actionTypeStats: Record<string, { total: number; reversed: number }> = {};

    if (allActions) {
      allActions.forEach((action) => {
        const actionType = action.action_type;
        if (!actionTypeStats[actionType]) {
          actionTypeStats[actionType] = { total: 0, reversed: 0 };
        }
        actionTypeStats[actionType].total++;
        
        if (action.revoked_at) {
          actionTypeStats[actionType].reversed++;
        }
      });
    }

    const reversalRateByActionType = Object.entries(actionTypeStats).map(([actionType, stats]) => ({
      actionType,
      totalActions: stats.total,
      reversedActions: stats.reversed,
      reversalRate: stats.total > 0 
        ? Math.round((stats.reversed / stats.total) * 100 * 100) / 100 // Round to 2 decimal places
        : 0,
    }));

    // Sort by reversal rate descending (highest reversal rate first)
    reversalRateByActionType.sort((a, b) => b.reversalRate - a.reversalRate);

    // Calculate reversal rate by priority level
    const priorityStats: Record<number, { total: number; reversed: number }> = {};

    if (allActions) {
      allActions.forEach((action) => {
        // Get priority from the related report, default to 3 if not available
        const priority = (action.moderation_reports as unknown as { priority?: number } | null)?.priority || 3;
        
        if (!priorityStats[priority]) {
          priorityStats[priority] = { total: 0, reversed: 0 };
        }
        priorityStats[priority].total++;
        
        if (action.revoked_at) {
          priorityStats[priority].reversed++;
        }
      });
    }

    const reversalRateByPriority = Object.entries(priorityStats).map(([priority, stats]) => ({
      priority: parseInt(priority, 10),
      totalActions: stats.total,
      reversedActions: stats.reversed,
      reversalRate: stats.total > 0 
        ? Math.round((stats.reversed / stats.total) * 100 * 100) / 100 // Round to 2 decimal places
        : 0,
    }));

    // Sort by priority ascending (P1 first)
    reversalRateByPriority.sort((a, b) => a.priority - b.priority);

    return {
      overallReversalRate,
      totalActions,
      totalReversals,
      reversalRateByActionType,
      reversalRateByPriority,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while calculating reversal rate',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Reversal metrics interface
 * Requirements: 14.3, 14.6, 14.7
 */
export interface ReversalMetrics {
  overallReversalRate: number; // Percentage of actions that were reversed
  totalActions: number;
  totalReversals: number;
  perModeratorStats: Array<{
    moderatorId: string;
    totalActions: number;
    reversedActions: number;
    reversalRate: number; // Percentage
  }>;
  timeToReversalStats: {
    averageHours: number;
    medianHours: number;
    fastestHours: number;
    slowestHours: number;
  };
}

/**
 * Get reversal metrics for a given date range
 * Requirements: 14.3, 14.6, 14.7
 * 
 * This function calculates comprehensive reversal statistics including:
 * - Overall reversal rate (percentage of actions that were reversed)
 * - Per-moderator reversal rates
 * - Time-to-reversal statistics (average, median, fastest, slowest)
 * 
 * @param startDate - Start date for metrics calculation (ISO string)
 * @param endDate - End date for metrics calculation (ISO string)
 * @returns Reversal metrics data
 * @throws ModerationError if unauthorized or database error
 */
export async function getReversalMetrics(
  startDate: string,
  endDate: string
): Promise<ReversalMetrics> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access reversal metrics',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Validate date parameters
    if (!startDate || !endDate) {
      throw new ModerationError(
        'Start date and end date are required',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Validate date format (basic ISO string check)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new ModerationError(
        'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    if (startDateObj > endDateObj) {
      throw new ModerationError(
        'Start date must be before end date',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Fetch all moderation actions in the date range
    // Requirements: 14.3
    const { data: allActions, error: allActionsError } = await supabase
      .from('moderation_actions')
      .select('id, moderator_id, created_at, revoked_at, revoked_by')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (allActionsError) {
      handleDatabaseError(allActionsError, 'fetch moderation actions for reversal metrics');
    }

    const totalActions = allActions?.length || 0;

    // Filter reversed actions (those with revoked_at set)
    const reversedActions = allActions?.filter((action) => action.revoked_at !== null) || [];
    const totalReversals = reversedActions.length;

    // Calculate overall reversal rate
    // Requirements: 14.3
    const overallReversalRate = totalActions > 0 
      ? Math.round((totalReversals / totalActions) * 100 * 100) / 100 // Round to 2 decimal places
      : 0;

    // Calculate per-moderator reversal rates
    // Requirements: 14.7
    const moderatorStats: Record<string, { total: number; reversed: number }> = {};

    if (allActions) {
      allActions.forEach((action) => {
        const modId = action.moderator_id;
        if (!moderatorStats[modId]) {
          moderatorStats[modId] = { total: 0, reversed: 0 };
        }
        moderatorStats[modId].total++;
        
        if (action.revoked_at) {
          moderatorStats[modId].reversed++;
        }
      });
    }

    const perModeratorStats = Object.entries(moderatorStats).map(([moderatorId, stats]) => ({
      moderatorId,
      totalActions: stats.total,
      reversedActions: stats.reversed,
      reversalRate: stats.total > 0 
        ? Math.round((stats.reversed / stats.total) * 100 * 100) / 100 // Round to 2 decimal places
        : 0,
    }));

    // Sort by reversal rate descending (highest reversal rate first)
    perModeratorStats.sort((a, b) => b.reversalRate - a.reversalRate);

    // Calculate time-to-reversal statistics
    // Requirements: 14.6
    const timeToReversalHours: number[] = [];

    reversedActions.forEach((action) => {
      if (action.created_at && action.revoked_at) {
        const createdTime = new Date(action.created_at).getTime();
        const revokedTime = new Date(action.revoked_at).getTime();
        const hoursToReversal = (revokedTime - createdTime) / (1000 * 60 * 60);
        timeToReversalHours.push(hoursToReversal);
      }
    });

    let timeToReversalStats = {
      averageHours: 0,
      medianHours: 0,
      fastestHours: 0,
      slowestHours: 0,
    };

    if (timeToReversalHours.length > 0) {
      // Calculate average
      const sum = timeToReversalHours.reduce((acc, val) => acc + val, 0);
      const averageHours = sum / timeToReversalHours.length;

      // Calculate median
      const sortedTimes = [...timeToReversalHours].sort((a, b) => a - b);
      const mid = Math.floor(sortedTimes.length / 2);
      const medianHours = sortedTimes.length % 2 === 0
        ? (sortedTimes[mid - 1] + sortedTimes[mid]) / 2
        : sortedTimes[mid];

      // Get fastest and slowest
      const fastestHours = sortedTimes[0];
      const slowestHours = sortedTimes[sortedTimes.length - 1];

      timeToReversalStats = {
        averageHours: Math.round(averageHours * 100) / 100, // Round to 2 decimal places
        medianHours: Math.round(medianHours * 100) / 100,
        fastestHours: Math.round(fastestHours * 100) / 100,
        slowestHours: Math.round(slowestHours * 100) / 100,
      };
    }

    return {
      overallReversalRate,
      totalActions,
      totalReversals,
      perModeratorStats,
      timeToReversalStats,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while calculating reversal metrics',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Moderator-specific reversal statistics interface
 * Requirements: 14.7
 */
export interface ModeratorReversalStats {
  moderatorId: string;
  totalActions: number;
  reversedActions: number;
  reversalRate: number; // Percentage
  averageTimeToReversalHours: number;
  selfReversals: number;
  reversalsByOthers: number;
  actionsByType: Record<string, { total: number; reversed: number }>;
}

/**
 * Get reversal statistics for a specific moderator
 * Requirements: 14.7
 * 
 * This function calculates detailed reversal statistics for a specific moderator including:
 * - Total actions taken and how many were reversed
 * - Reversal rate (percentage)
 * - Average time-to-reversal
 * - Self-reversals vs reversals by others
 * - Breakdown by action type
 * 
 * @param moderatorId - Moderator ID to get stats for
 * @param startDate - Start date for metrics calculation (ISO string)
 * @param endDate - End date for metrics calculation (ISO string)
 * @returns Moderator-specific reversal statistics
 * @throws ModerationError if unauthorized, invalid parameters, or database error
 */
export async function getModeratorReversalStats(
  moderatorId: string,
  startDate: string,
  endDate: string
): Promise<ModeratorReversalStats> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access reversal statistics',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Validate moderator ID format
    if (!isValidUUID(moderatorId)) {
      throw new ModerationError(
        'Invalid moderator ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { moderatorId }
      );
    }

    // Validate date parameters
    if (!startDate || !endDate) {
      throw new ModerationError(
        'Start date and end date are required',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Validate date format (basic ISO string check)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new ModerationError(
        'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    if (startDateObj > endDateObj) {
      throw new ModerationError(
        'Start date must be before end date',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Fetch all actions by this moderator in the date range
    const { data: moderatorActions, error: actionsError } = await supabase
      .from('moderation_actions')
      .select('id, action_type, created_at, revoked_at, revoked_by')
      .eq('moderator_id', moderatorId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (actionsError) {
      handleDatabaseError(actionsError, 'fetch moderator actions for reversal stats');
    }

    const totalActions = moderatorActions?.length || 0;

    // Filter reversed actions
    const reversedActions = moderatorActions?.filter((action) => action.revoked_at !== null) || [];
    const reversedActionsCount = reversedActions.length;

    // Calculate reversal rate
    const reversalRate = totalActions > 0 
      ? Math.round((reversedActionsCount / totalActions) * 100 * 100) / 100 // Round to 2 decimal places
      : 0;

    // Calculate self-reversals (actions reversed by the same moderator who took them)
    const selfReversals = reversedActions.filter(
      (action) => action.revoked_by === moderatorId
    ).length;

    // Calculate reversals by others
    const reversalsByOthers = reversedActionsCount - selfReversals;

    // Calculate average time-to-reversal
    const timeToReversalHours: number[] = [];

    reversedActions.forEach((action) => {
      if (action.created_at && action.revoked_at) {
        const createdTime = new Date(action.created_at).getTime();
        const revokedTime = new Date(action.revoked_at).getTime();
        const hoursToReversal = (revokedTime - createdTime) / (1000 * 60 * 60);
        timeToReversalHours.push(hoursToReversal);
      }
    });

    const averageTimeToReversalHours = timeToReversalHours.length > 0
      ? Math.round((timeToReversalHours.reduce((acc, val) => acc + val, 0) / timeToReversalHours.length) * 100) / 100
      : 0;

    // Calculate breakdown by action type
    const actionsByType: Record<string, { total: number; reversed: number }> = {};

    if (moderatorActions) {
      moderatorActions.forEach((action) => {
        const actionType = action.action_type;
        
        if (!actionsByType[actionType]) {
          actionsByType[actionType] = { total: 0, reversed: 0 };
        }
        
        actionsByType[actionType].total++;
        
        if (action.revoked_at) {
          actionsByType[actionType].reversed++;
        }
      });
    }

    return {
      moderatorId,
      totalActions,
      reversedActions: reversedActionsCount,
      reversalRate,
      averageTimeToReversalHours,
      selfReversals,
      reversalsByOthers,
      actionsByType,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while calculating moderator reversal statistics',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Time metrics for reversals interface
 * Requirements: 14.6
 */
export interface ReversalTimeMetrics {
  averageHours: number;
  medianHours: number;
  fastestHours: number;
  slowestHours: number;
  byActionType: Record<string, {
    averageHours: number;
    medianHours: number;
    fastestHours: number;
    slowestHours: number;
    count: number;
  }>;
}

/**
 * Get detailed time-to-reversal metrics
 * Requirements: 14.6
 * 
 * This function calculates comprehensive time-based metrics for action reversals including:
 * - Average time between action and reversal
 * - Median time to reversal
 * - Fastest and slowest reversals
 * - Breakdown by action type
 * 
 * @param startDate - Start date for metrics calculation (ISO string)
 * @param endDate - End date for metrics calculation (ISO string)
 * @returns Detailed time-to-reversal metrics
 * @throws ModerationError if unauthorized or database error
 */
export async function getReversalTimeMetrics(
  startDate: string,
  endDate: string
): Promise<ReversalTimeMetrics> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access reversal time metrics',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Validate date parameters
    if (!startDate || !endDate) {
      throw new ModerationError(
        'Start date and end date are required',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Validate date format (basic ISO string check)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new ModerationError(
        'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    if (startDateObj > endDateObj) {
      throw new ModerationError(
        'Start date must be before end date',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Fetch all reversed actions in the date range
    // Requirements: 14.6
    const { data: reversedActions, error: actionsError } = await supabase
      .from('moderation_actions')
      .select('id, action_type, created_at, revoked_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('revoked_at', 'is', null);

    if (actionsError) {
      handleDatabaseError(actionsError, 'fetch reversed actions for time metrics');
    }

    if (!reversedActions || reversedActions.length === 0) {
      // No reversed actions in this time period
      return {
        averageHours: 0,
        medianHours: 0,
        fastestHours: 0,
        slowestHours: 0,
        byActionType: {},
      };
    }

    // Calculate time-to-reversal for all actions
    const timeToReversalHours: number[] = [];
    const timeByActionType: Record<string, number[]> = {};

    reversedActions.forEach((action) => {
      if (action.created_at && action.revoked_at) {
        const createdTime = new Date(action.created_at).getTime();
        const revokedTime = new Date(action.revoked_at).getTime();
        const hoursToReversal = (revokedTime - createdTime) / (1000 * 60 * 60);
        
        // Add to overall metrics
        timeToReversalHours.push(hoursToReversal);
        
        // Add to action type specific metrics
        const actionType = action.action_type;
        if (!timeByActionType[actionType]) {
          timeByActionType[actionType] = [];
        }
        timeByActionType[actionType].push(hoursToReversal);
      }
    });

    // Calculate overall statistics
    const sortedTimes = [...timeToReversalHours].sort((a, b) => a - b);
    const sum = timeToReversalHours.reduce((acc, val) => acc + val, 0);
    const averageHours = sum / timeToReversalHours.length;

    // Calculate median
    const mid = Math.floor(sortedTimes.length / 2);
    const medianHours = sortedTimes.length % 2 === 0
      ? (sortedTimes[mid - 1] + sortedTimes[mid]) / 2
      : sortedTimes[mid];

    // Get fastest and slowest
    const fastestHours = sortedTimes[0];
    const slowestHours = sortedTimes[sortedTimes.length - 1];

    // Calculate statistics by action type
    const byActionType: Record<string, {
      averageHours: number;
      medianHours: number;
      fastestHours: number;
      slowestHours: number;
      count: number;
    }> = {};

    Object.entries(timeByActionType).forEach(([actionType, times]) => {
      if (times.length === 0) return;

      const sortedActionTimes = [...times].sort((a, b) => a - b);
      const actionSum = times.reduce((acc, val) => acc + val, 0);
      const actionAverage = actionSum / times.length;

      const actionMid = Math.floor(sortedActionTimes.length / 2);
      const actionMedian = sortedActionTimes.length % 2 === 0
        ? (sortedActionTimes[actionMid - 1] + sortedActionTimes[actionMid]) / 2
        : sortedActionTimes[actionMid];

      byActionType[actionType] = {
        averageHours: Math.round(actionAverage * 100) / 100, // Round to 2 decimal places
        medianHours: Math.round(actionMedian * 100) / 100,
        fastestHours: Math.round(sortedActionTimes[0] * 100) / 100,
        slowestHours: Math.round(sortedActionTimes[sortedActionTimes.length - 1] * 100) / 100,
        count: times.length,
      };
    });

    return {
      averageHours: Math.round(averageHours * 100) / 100, // Round to 2 decimal places
      medianHours: Math.round(medianHours * 100) / 100,
      fastestHours: Math.round(fastestHours * 100) / 100,
      slowestHours: Math.round(slowestHours * 100) / 100,
      byActionType,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while calculating reversal time metrics',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Get reversal patterns including common reasons, users with multiple reversals, and time patterns
 * Requirements: 14.5
 * 
 * This function analyzes reversal patterns to identify:
 * - Common reversal reasons (from metadata.reversal_reason)
 * - Users with multiple reversed actions
 * - Time patterns (day of week and hour of day when reversals occur)
 * 
 * @param startDate - Start date for pattern analysis (ISO string)
 * @param endDate - End date for pattern analysis (ISO string)
 * @returns Reversal patterns analysis
 * @throws ModerationError if unauthorized or database error
 */
export async function getReversalPatterns(
  startDate: string,
  endDate: string
): Promise<import('@/types/moderation').ReversalPatterns> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access reversal patterns',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Validate date parameters
    if (!startDate || !endDate) {
      throw new ModerationError(
        'Start date and end date are required',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Validate date format (basic ISO string check)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new ModerationError(
        'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    if (startDateObj > endDateObj) {
      throw new ModerationError(
        'Start date must be before end date',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { startDate, endDate }
      );
    }

    // Fetch all reversed actions in the date range with metadata
    // Requirements: 14.5
    const { data: reversedActions, error: actionsError } = await supabase
      .from('moderation_actions')
      .select('id, target_user_id, revoked_at, revoked_by, metadata')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('revoked_at', 'is', null);

    if (actionsError) {
      handleDatabaseError(actionsError, 'fetch reversed actions for pattern analysis');
    }

    const totalReversals = reversedActions?.length || 0;

    if (!reversedActions || reversedActions.length === 0) {
      // No reversed actions in this time period
      return {
        commonReasons: [],
        usersWithMultipleReversals: [],
        dayOfWeekPatterns: [],
        hourOfDayPatterns: [],
        totalReversals: 0,
        dateRange: {
          startDate,
          endDate,
        },
      };
    }

    // 1. Identify common reversal reasons
    // Requirements: 14.5
    const reasonCounts: Record<string, number> = {};

    reversedActions.forEach((action) => {
      // Extract reversal_reason from metadata JSONB column
      const reason = action.metadata?.reversal_reason || 'No reason provided';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const commonReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: Math.round((count / totalReversals) * 100 * 100) / 100, // Round to 2 decimal places
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // 2. Identify users with multiple reversed actions
    // Requirements: 14.5
    const userReversalCounts: Record<string, {
      reversedCount: number;
      reasons: string[];
    }> = {};

    reversedActions.forEach((action) => {
      const userId = action.target_user_id;
      if (!userId) return;

      if (!userReversalCounts[userId]) {
        userReversalCounts[userId] = {
          reversedCount: 0,
          reasons: [],
        };
      }

      userReversalCounts[userId].reversedCount++;
      
      const reason = action.metadata?.reversal_reason || 'No reason provided';
      userReversalCounts[userId].reasons.push(reason);
    });

    // Filter users with multiple reversals (2 or more)
    const usersWithMultipleReversalsData = Object.entries(userReversalCounts)
      .filter(([, data]) => data.reversedCount >= 2)
      .map(([userId, data]) => {
        // Find most common reason for this user
        const reasonCounts: Record<string, number> = {};
        data.reasons.forEach((reason) => {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        const mostCommonReason = Object.entries(reasonCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

        return {
          userId,
          reversedActionCount: data.reversedCount,
          mostCommonReason,
        };
      })
      .sort((a, b) => b.reversedActionCount - a.reversedActionCount); // Sort by count descending

    // Fetch usernames for users with multiple reversals
    const userIds = usersWithMultipleReversalsData.map((u) => u.userId);
    let userProfiles: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      if (!profilesError && profiles) {
        userProfiles = profiles.reduce((acc, profile) => {
          acc[profile.user_id] = profile.username;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Fetch total action counts for these users to calculate reversal rate
    const userTotalActions: Record<string, number> = {};

    if (userIds.length > 0) {
      const { data: allUserActions, error: allActionsError } = await supabase
        .from('moderation_actions')
        .select('target_user_id')
        .in('target_user_id', userIds)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (!allActionsError && allUserActions) {
        allUserActions.forEach((action) => {
          const userId = action.target_user_id;
          if (userId) {
            userTotalActions[userId] = (userTotalActions[userId] || 0) + 1;
          }
        });
      }
    }

    const usersWithMultipleReversals = usersWithMultipleReversalsData.map((user) => ({
      userId: user.userId,
      username: userProfiles[user.userId],
      reversedActionCount: user.reversedActionCount,
      totalActionCount: userTotalActions[user.userId] || user.reversedActionCount,
      reversalRate: userTotalActions[user.userId]
        ? Math.round((user.reversedActionCount / userTotalActions[user.userId]) * 100 * 100) / 100
        : 100, // If we only have reversed actions, rate is 100%
      mostCommonReason: user.mostCommonReason,
    }));

    // 3. Identify time patterns - day of week
    // Requirements: 14.5
    const dayOfWeekCounts: Record<number, number> = {
      0: 0, // Sunday
      1: 0, // Monday
      2: 0, // Tuesday
      3: 0, // Wednesday
      4: 0, // Thursday
      5: 0, // Friday
      6: 0, // Saturday
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    reversedActions.forEach((action) => {
      if (action.revoked_at) {
        const revokedDate = new Date(action.revoked_at);
        const dayOfWeek = revokedDate.getDay(); // 0-6 (Sunday = 0)
        dayOfWeekCounts[dayOfWeek]++;
      }
    });

    const dayOfWeekPatterns = Object.entries(dayOfWeekCounts)
      .map(([dayNumber, count]) => ({
        dayOfWeek: dayNames[parseInt(dayNumber)],
        dayNumber: parseInt(dayNumber),
        count,
        percentage: Math.round((count / totalReversals) * 100 * 100) / 100, // Round to 2 decimal places
      }))
      .sort((a, b) => a.dayNumber - b.dayNumber); // Sort by day number (Sunday to Saturday)

    // 4. Identify time patterns - hour of day
    // Requirements: 14.5
    const hourOfDayCounts: Record<number, number> = {};

    // Initialize all hours (0-23)
    for (let i = 0; i < 24; i++) {
      hourOfDayCounts[i] = 0;
    }

    reversedActions.forEach((action) => {
      if (action.revoked_at) {
        const revokedDate = new Date(action.revoked_at);
        const hour = revokedDate.getUTCHours(); // Use UTC hours for consistency
        hourOfDayCounts[hour]++;
      }
    });

    const hourOfDayPatterns = Object.entries(hourOfDayCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        percentage: Math.round((count / totalReversals) * 100 * 100) / 100, // Round to 2 decimal places
      }))
      .sort((a, b) => a.hour - b.hour); // Sort by hour (0-23)

    return {
      commonReasons,
      usersWithMultipleReversals,
      dayOfWeekPatterns,
      hourOfDayPatterns,
      totalReversals,
      dateRange: {
        startDate,
        endDate,
      },
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while analyzing reversal patterns',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Calculate moderation metrics with optional date range filtering
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 * 
 * @param dateRange - Optional date range for filtering metrics
 * @param includeSLA - Whether to include SLA compliance data (default: false)
 * @param includeTrends - Whether to include trend data (default: false)
 * @returns Moderation metrics data
 * @throws ModerationError if unauthorized or database error
 */
export async function calculateModerationMetrics(
  dateRange?: MetricsDateRange,
  includeSLA: boolean = false,
  includeTrends: boolean = false
): Promise<ModerationMetrics> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access metrics',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Check if user is admin for moderator performance data
    const isAdminUser = await isAdmin(user.id);

    // Calculate date ranges (use provided range or default to standard periods)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Use custom date range if provided, otherwise use default ranges
    const effectiveStartDate = dateRange?.startDate || monthStart;
    const effectiveEndDate = dateRange?.endDate || now.toISOString();

    // Fetch reports received counts
    const [todayReports, weekReports, monthReports] = await Promise.all([
      supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', effectiveEndDate),
      supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekStart)
        .lte('created_at', effectiveEndDate),
      supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', effectiveStartDate)
        .lte('created_at', effectiveEndDate),
    ]);

    // Fetch reports resolved counts
    const [todayResolved, weekResolved, monthResolved] = await Promise.all([
      supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .in('status', ['resolved', 'dismissed'])
        .gte('reviewed_at', todayStart)
        .lte('reviewed_at', effectiveEndDate),
      supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .in('status', ['resolved', 'dismissed'])
        .gte('reviewed_at', weekStart)
        .lte('reviewed_at', effectiveEndDate),
      supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .in('status', ['resolved', 'dismissed'])
        .gte('reviewed_at', effectiveStartDate)
        .lte('reviewed_at', effectiveEndDate),
    ]);

    // Calculate average resolution time
    const { data: resolvedReports } = await supabase
      .from('moderation_reports')
      .select('created_at, reviewed_at')
      .in('status', ['resolved', 'dismissed'])
      .not('reviewed_at', 'is', null)
      .gte('reviewed_at', effectiveStartDate)
      .lte('reviewed_at', effectiveEndDate);

    let averageResolutionMs = 0;
    if (resolvedReports && resolvedReports.length > 0) {
      const totalResolutionTime = resolvedReports.reduce((sum, report) => {
        const created = new Date(report.created_at).getTime();
        const reviewed = new Date(report.reviewed_at!).getTime();
        return sum + (reviewed - created);
      }, 0);
      averageResolutionMs = totalResolutionTime / resolvedReports.length;
    }

    const averageResolutionHours = Math.floor(averageResolutionMs / (1000 * 60 * 60));
    const averageResolutionMinutes = Math.floor(
      (averageResolutionMs % (1000 * 60 * 60)) / (1000 * 60)
    );

    // Fetch actions by type
    const { data: actions } = await supabase
      .from('moderation_actions')
      .select('action_type')
      .gte('created_at', effectiveStartDate)
      .lte('created_at', effectiveEndDate);

    const actionsByType: Record<string, number> = {};
    if (actions) {
      actions.forEach((action) => {
        actionsByType[action.action_type] = (actionsByType[action.action_type] || 0) + 1;
      });
    }

    // Fetch top reasons
    const { data: reports } = await supabase
      .from('moderation_reports')
      .select('reason')
      .gte('created_at', effectiveStartDate)
      .lte('created_at', effectiveEndDate);

    const reasonCounts: Record<string, number> = {};
    if (reports) {
      reports.forEach((report) => {
        reasonCounts[report.reason] = (reasonCounts[report.reason] || 0) + 1;
      });
    }

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Fetch moderator performance (admin only)
    let moderatorPerformance: Array<{
      moderatorId: string;
      actionsCount: number;
      averageResolutionTime: number;
    }> | undefined;

    if (isAdminUser) {
      const { data: moderatorActions } = await supabase
        .from('moderation_actions')
        .select('moderator_id, created_at, related_report_id')
        .gte('created_at', effectiveStartDate)
        .lte('created_at', effectiveEndDate);

      if (moderatorActions) {
        const moderatorStats: Record<
          string,
          { count: number; totalResolutionTime: number; resolutionCount: number }
        > = {};

        for (const action of moderatorActions) {
          if (!moderatorStats[action.moderator_id]) {
            moderatorStats[action.moderator_id] = {
              count: 0,
              totalResolutionTime: 0,
              resolutionCount: 0,
            };
          }

          moderatorStats[action.moderator_id].count++;

          // Calculate resolution time if related report exists
          if (action.related_report_id) {
            const { data: report } = await supabase
              .from('moderation_reports')
              .select('created_at, reviewed_at')
              .eq('id', action.related_report_id)
              .single();

            if (report && report.reviewed_at) {
              const created = new Date(report.created_at).getTime();
              const reviewed = new Date(report.reviewed_at).getTime();
              moderatorStats[action.moderator_id].totalResolutionTime += reviewed - created;
              moderatorStats[action.moderator_id].resolutionCount++;
            }
          }
        }

        moderatorPerformance = Object.entries(moderatorStats).map(([moderatorId, stats]) => ({
          moderatorId,
          actionsCount: stats.count,
          averageResolutionTime:
            stats.resolutionCount > 0
              ? stats.totalResolutionTime / stats.resolutionCount / (1000 * 60 * 60) // Convert to hours
              : 0,
        }));
      }
    }

    // Calculate SLA compliance if requested
    let slaCompliance: ModerationMetrics['slaCompliance'];
    if (includeSLA) {
      slaCompliance = await calculateSLACompliance(dateRange);
    }

    // Calculate trends if requested
    let trends: ModerationMetrics['trends'];
    if (includeTrends && dateRange) {
      trends = await calculateMetricsTrends(dateRange);
    }

    return {
      reportsReceived: {
        today: todayReports.count || 0,
        week: weekReports.count || 0,
        month: monthReports.count || 0,
      },
      reportsResolved: {
        today: todayResolved.count || 0,
        week: weekResolved.count || 0,
        month: monthResolved.count || 0,
      },
      averageResolutionTime: {
        hours: averageResolutionHours,
        minutes: averageResolutionMinutes,
      },
      actionsByType,
      topReasons,
      moderatorPerformance,
      slaCompliance,
      trends,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while calculating metrics',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Reversal History Functions
// ============================================================================

/**
 * Get reversal history with filtering support
 * Requirements: 14.5, 14.9
 * 
 * This function retrieves a complete history of all reversed moderation actions
 * with support for filtering by date range, moderator, action type, and reversal reason.
 * It provides detailed information about each reversal including timing, who performed
 * the reversal, and whether it was a self-reversal.
 * 
 * @param filters - Optional filters for the reversal history
 * @returns Array of reversal history entries with complete details
 * @throws ModerationError if unauthorized or database error
 */
export async function getReversalHistory(
  filters: ReversalHistoryFilters = {}
): Promise<ReversalHistoryEntry[]> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify moderator role
    const isMod = await isModeratorOrAdmin(user.id);
    if (!isMod) {
      throw new ModerationError(
        'Only moderators and admins can access reversal history',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }

    // Validate ALL filter parameters BEFORE building query
    // This ensures validation errors are thrown before any database operations
    
    // Validate date formats
    if (filters.startDate) {
      const startDateObj = new Date(filters.startDate);
      if (isNaN(startDateObj.getTime())) {
        throw new ModerationError(
          'Invalid start date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
          MODERATION_ERROR_CODES.VALIDATION_ERROR,
          { startDate: filters.startDate }
        );
      }
    }

    if (filters.endDate) {
      const endDateObj = new Date(filters.endDate);
      if (isNaN(endDateObj.getTime())) {
        throw new ModerationError(
          'Invalid end date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
          MODERATION_ERROR_CODES.VALIDATION_ERROR,
          { endDate: filters.endDate }
        );
      }
    }

    // Validate date range if both provided
    if (filters.startDate && filters.endDate) {
      const startDateObj = new Date(filters.startDate);
      const endDateObj = new Date(filters.endDate);
      if (startDateObj > endDateObj) {
        throw new ModerationError(
          'Start date must be before end date',
          MODERATION_ERROR_CODES.VALIDATION_ERROR,
          { startDate: filters.startDate, endDate: filters.endDate }
        );
      }
    }

    // Validate UUID formats
    if (filters.moderatorId && !isValidUUID(filters.moderatorId)) {
      throw new ModerationError(
        'Invalid moderator ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { moderatorId: filters.moderatorId }
      );
    }

    if (filters.targetUserId && !isValidUUID(filters.targetUserId)) {
      throw new ModerationError(
        'Invalid target user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { targetUserId: filters.targetUserId }
      );
    }

    if (filters.revokedBy && !isValidUUID(filters.revokedBy)) {
      throw new ModerationError(
        'Invalid revoked by user ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { revokedBy: filters.revokedBy }
      );
    }

    // Validate action type
    if (filters.actionType) {
      const validActionTypes: ModerationActionType[] = [
        'content_removed',
        'content_approved',
        'user_warned',
        'user_suspended',
        'user_banned',
        'restriction_applied',
      ];
      if (!validActionTypes.includes(filters.actionType)) {
        throw new ModerationError(
          'Invalid action type',
          MODERATION_ERROR_CODES.VALIDATION_ERROR,
          { actionType: filters.actionType }
        );
      }
    }

    // Build query for reversed actions (those with revoked_at set)
    let query = supabase
      .from('moderation_actions')
      .select('*')
      .not('revoked_at', 'is', null); // Only get reversed actions

    // Apply filters to query
    if (filters.startDate) {
      query = query.gte('revoked_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('revoked_at', filters.endDate);
    }

    if (filters.moderatorId) {
      query = query.eq('moderator_id', filters.moderatorId);
    }

    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters.targetUserId) {
      query = query.eq('target_user_id', filters.targetUserId);
    }

    if (filters.revokedBy) {
      query = query.eq('revoked_by', filters.revokedBy);
    }

    // Order by reversal date (most recent first)
    query = query.order('revoked_at', { ascending: false });

    // Execute query
    const { data: actions, error } = await query;

    if (error) {
      handleDatabaseError(error, 'get reversal history');
    }

    if (!actions || actions.length === 0) {
      return [];
    }

    // Filter by reversal reason if provided (stored in metadata)
    let filteredActions = actions;
    if (filters.reversalReason) {
      filteredActions = actions.filter((action) => {
        const reversalReason = action.metadata?.reversal_reason;
        if (!reversalReason) return false;
        
        // Case-insensitive partial match
        return reversalReason.toLowerCase().includes(filters.reversalReason!.toLowerCase());
      });
    }

    // Fetch user information for all unique user IDs
    const moderatorIds = new Set<string>();
    const revokedByIds = new Set<string>();
    const targetUserIds = new Set<string>();

    filteredActions.forEach((action) => {
      if (action.moderator_id) moderatorIds.add(action.moderator_id);
      if (action.revoked_by) revokedByIds.add(action.revoked_by);
      if (action.target_user_id) targetUserIds.add(action.target_user_id);
    });

    // Combine all user IDs
    const allUserIds = new Set([...moderatorIds, ...revokedByIds, ...targetUserIds]);

    // Fetch user profiles for all users
    const userProfiles: Record<string, string> = {};
    if (allUserIds.size > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', Array.from(allUserIds));

      if (!profilesError && profiles) {
        profiles.forEach((profile) => {
          userProfiles[profile.user_id] = profile.username;
        });
      }
    }

    // Transform actions into reversal history entries
    // Requirements: 14.1, 14.2, 14.4, 14.5
    const historyEntries: ReversalHistoryEntry[] = filteredActions.map((action) => {
      const reversalReason = action.metadata?.reversal_reason || null;
      const isSelfReversal = action.moderator_id === action.revoked_by;

      // Calculate time between action and reversal
      let timeBetweenActionAndReversal = 0;
      if (action.revoked_at && action.created_at) {
        const actionTime = new Date(action.created_at).getTime();
        const reversalTime = new Date(action.revoked_at).getTime();
        timeBetweenActionAndReversal = reversalTime - actionTime;
      }

      // Get state change history from metadata
      // Requirements: 14.4
      const stateChanges = getStateChangeHistory(action.metadata);
      
      // Check if action was re-applied after reversal
      // Requirements: 14.4
      const wasReapplied = wasActionReapplied(stateChanges);

      return {
        action: action as ModerationAction,
        revokedAt: action.revoked_at!,
        revokedBy: action.revoked_by!,
        reversalReason,
        timeBetweenActionAndReversal,
        isSelfReversal,
        moderatorUsername: action.moderator_id ? userProfiles[action.moderator_id] : undefined,
        revokedByUsername: action.revoked_by ? userProfiles[action.revoked_by] : undefined,
        targetUsername: action.target_user_id ? userProfiles[action.target_user_id] : undefined,
        stateChanges: stateChanges.length > 0 ? stateChanges : undefined,
        wasReapplied,
      };
    });

    return historyEntries;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while getting reversal history',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}


/**
 * Export reversal history to CSV format
 * Requirements: 14.8
 * 
 * This function exports the complete reversal history to CSV format for analysis
 * and reporting purposes. Only admins can export reversal history.
 * 
 * @param filters - Optional filters for the reversal history
 * @returns CSV string with reversal history data
 * @throws ModerationError if unauthorized or database error
 */
export async function exportReversalHistoryToCSV(
  filters: ReversalHistoryFilters = {}
): Promise<string> {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Verify admin role (CSV export is admin-only)
    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      throw new ModerationError(
        'Only admins can export reversal history',
        MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    }

    // Fetch all matching reversal history entries
    const historyEntries = await getReversalHistory(filters);

    // Generate CSV header
    const headers = [
      'Action ID',
      'Action Type',
      'Original Moderator ID',
      'Original Moderator Username',
      'Target User ID',
      'Target Username',
      'Action Created At',
      'Action Reason',
      'Duration (Days)',
      'Revoked At',
      'Revoked By ID',
      'Revoked By Username',
      'Reversal Reason',
      'Time to Reversal (Hours)',
      'Is Self Reversal',
      'Was Reapplied',
      'Related Report ID',
    ];

    // Generate CSV rows
    const rows = historyEntries.map((entry) => {
      // Calculate time to reversal in hours
      const timeToReversalHours = entry.timeBetweenActionAndReversal
        ? (entry.timeBetweenActionAndReversal / (1000 * 60 * 60)).toFixed(2)
        : '';

      return [
        entry.action.id,
        entry.action.action_type,
        entry.action.moderator_id,
        entry.moderatorUsername || '',
        entry.action.target_user_id,
        entry.targetUsername || '',
        entry.action.created_at,
        entry.action.reason,
        entry.action.duration_days?.toString() || '',
        entry.revokedAt,
        entry.revokedBy,
        entry.revokedByUsername || '',
        entry.reversalReason || '',
        timeToReversalHours,
        entry.isSelfReversal ? 'Yes' : 'No',
        entry.wasReapplied ? 'Yes' : 'No',
        entry.action.related_report_id || '',
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while exporting reversal history',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Reversal Immutability Checks
// ============================================================================

/**
 * Verify that a reversal record has not been modified
 * Requirements: 14.10
 * 
 * This function performs application-level verification that reversal records
 * remain immutable. It checks that once an action is reversed (revoked_at is set),
 * the reversal fields (revoked_at, revoked_by, reversal_reason) have not been
 * modified from their original values.
 * 
 * This provides an additional layer of protection beyond database constraints,
 * allowing the application to detect and respond to any tampering attempts.
 * 
 * @param actionId - Moderation action ID to verify
 * @returns Object with verification result and details
 * @throws ModerationError if validation fails or database error
 */
export async function verifyReversalImmutability(
  actionId: string
): Promise<{
  isImmutable: boolean;
  violations: string[];
  action: ModerationAction | null;
}> {
  try {
    // Validate action ID
    if (!isValidUUID(actionId)) {
      throw new ModerationError(
        'Invalid action ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { actionId }
      );
    }

    // Fetch the action with its complete history
    const { data: action, error } = await supabase
      .from('moderation_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (error) {
      handleDatabaseError(error, 'verify reversal immutability');
    }

    if (!action) {
      throw new ModerationError(
        'Moderation action not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { actionId }
      );
    }

    // If action is not reversed, immutability check is not applicable
    if (!action.revoked_at) {
      return {
        isImmutable: true,
        violations: [],
        action: action as ModerationAction,
      };
    }

    const violations: string[] = [];

    // Check 1: Verify revoked_at is present and valid
    if (!action.revoked_at) {
      violations.push('revoked_at field is missing on reversed action');
    } else {
      // Verify it's a valid timestamp
      const revokedAtDate = new Date(action.revoked_at);
      if (isNaN(revokedAtDate.getTime())) {
        violations.push('revoked_at contains invalid timestamp');
      }
    }

    // Check 2: Verify revoked_by is present and valid
    if (!action.revoked_by) {
      violations.push('revoked_by field is missing on reversed action');
    } else if (!isValidUUID(action.revoked_by)) {
      violations.push('revoked_by contains invalid UUID');
    }

    // Check 3: Verify reversal_reason exists in metadata
    if (!action.metadata || !action.metadata.reversal_reason) {
      violations.push('reversal_reason is missing from metadata');
    } else if (typeof action.metadata.reversal_reason !== 'string') {
      violations.push('reversal_reason in metadata is not a string');
    } else if (action.metadata.reversal_reason.trim().length === 0) {
      violations.push('reversal_reason in metadata is empty');
    }

    // Check 4: Verify consistency between revoked_at and revoked_by
    // Both should be set together or both should be null
    const hasRevokedAt = action.revoked_at !== null;
    const hasRevokedBy = action.revoked_by !== null;
    if (hasRevokedAt !== hasRevokedBy) {
      violations.push('Inconsistency: revoked_at and revoked_by must both be set or both be null');
    }

    // Check 5: Verify revoked_at is not in the future
    if (action.revoked_at) {
      const revokedAtDate = new Date(action.revoked_at);
      const now = new Date();
      if (revokedAtDate > now) {
        violations.push('revoked_at timestamp is in the future');
      }
    }

    // Check 6: Verify revoked_at is after action created_at
    if (action.revoked_at && action.created_at) {
      const revokedAtDate = new Date(action.revoked_at);
      const createdAtDate = new Date(action.created_at);
      if (revokedAtDate < createdAtDate) {
        violations.push('revoked_at timestamp is before action creation timestamp');
      }
    }

    const isImmutable = violations.length === 0;

    // If violations detected, log security event
    if (!isImmutable) {
      await logSecurityEvent('reversal_immutability_violation_detected', action.revoked_by || 'unknown', {
        actionId,
        violations,
        action: {
          id: action.id,
          action_type: action.action_type,
          target_user_id: action.target_user_id,
          revoked_at: action.revoked_at,
          revoked_by: action.revoked_by,
          metadata: action.metadata,
        },
      });
    }

    return {
      isImmutable,
      violations,
      action: action as ModerationAction,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while verifying reversal immutability',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Attempt to modify a reversal record (for testing immutability)
 * Requirements: 14.10
 * 
 * This function attempts to modify reversal fields on a moderation action
 * to verify that database constraints properly prevent such modifications.
 * It should always fail if the database constraints are working correctly.
 * 
 * This is primarily used for testing and verification purposes, not for
 * actual modification attempts in production code.
 * 
 * @param actionId - Moderation action ID to attempt modification on
 * @param modifications - Fields to attempt to modify
 * @returns Object indicating whether modification was prevented
 * @throws ModerationError if validation fails or database error
 */
export async function attemptReversalModification(
  actionId: string,
  modifications: {
    revoked_at?: string;
    revoked_by?: string;
    reversal_reason?: string;
  }
): Promise<{
  prevented: boolean;
  error: string | null;
  securityEventLogged: boolean;
}> {
  try {
    // Validate action ID
    if (!isValidUUID(actionId)) {
      throw new ModerationError(
        'Invalid action ID format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        { actionId }
      );
    }

    // Get current user for logging
    const user = await getCurrentUser();

    // Fetch the current action to verify it's reversed
    const { data: action, error: fetchError } = await supabase
      .from('moderation_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError || !action) {
      throw new ModerationError(
        'Moderation action not found',
        MODERATION_ERROR_CODES.NOT_FOUND,
        { actionId }
      );
    }

    // If action is not reversed, cannot test modification
    if (!action.revoked_at) {
      return {
        prevented: false,
        error: 'Action is not reversed, cannot test reversal modification',
        securityEventLogged: false,
      };
    }

    // Log the modification attempt before trying
    await logSecurityEvent('reversal_modification_attempt', user.id, {
      actionId,
      attemptedModifications: modifications,
      originalValues: {
        revoked_at: action.revoked_at,
        revoked_by: action.revoked_by,
        reversal_reason: action.metadata?.reversal_reason,
      },
    });

    // Prepare update object
    const updateData: Record<string, unknown> = {};
    
    if (modifications.revoked_at !== undefined) {
      updateData.revoked_at = modifications.revoked_at;
    }
    
    if (modifications.revoked_by !== undefined) {
      updateData.revoked_by = modifications.revoked_by;
    }
    
    if (modifications.reversal_reason !== undefined) {
      // Update metadata with new reversal_reason
      updateData.metadata = {
        ...action.metadata,
        reversal_reason: modifications.reversal_reason,
      };
    }

    // Attempt the modification (should be prevented by database constraints)
    const { error: updateError } = await supabase
      .from('moderation_actions')
      .update(updateData)
      .eq('id', actionId);

    if (updateError) {
      // Modification was prevented - this is the expected behavior
      // Log that the constraint worked
      await logSecurityEvent('reversal_modification_prevented', user.id, {
        actionId,
        attemptedModifications: modifications,
        errorCode: updateError.code,
        errorMessage: updateError.message,
      });

      return {
        prevented: true,
        error: updateError.message,
        securityEventLogged: true,
      };
    }

    // If we reach here, modification was NOT prevented - this is a security issue!
    // Log critical security event and alert admins
    await logSecurityEvent('reversal_modification_succeeded', user.id, {
      actionId,
      attemptedModifications: modifications,
      severity: 'critical',
      alert: 'IMMUTABILITY CONSTRAINT FAILED - IMMEDIATE INVESTIGATION REQUIRED',
    });

    // Alert admins of the security issue
    await alertAdminsOfSuspiciousActivity({
      eventType: 'reversal_immutability_breach',
      severity: 'critical',
      actionId,
      userId: user.id,
      details: {
        message: 'Reversal record was successfully modified despite immutability constraints',
        attemptedModifications: modifications,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      prevented: false,
      error: 'CRITICAL: Modification was not prevented by database constraints',
      securityEventLogged: true,
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while attempting reversal modification',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Alert administrators of suspicious activity related to reversal records
 * Requirements: 14.10
 * 
 * This function creates high-priority notifications for administrators when
 * suspicious activity is detected related to reversal record modifications.
 * This includes:
 * - Successful modification of reversal records (immutability breach)
 * - Multiple failed modification attempts from the same user
 * - Attempts to delete reversed actions
 * - Any other suspicious patterns
 * 
 * @param details - Details about the suspicious activity
 * @returns void
 */
async function alertAdminsOfSuspiciousActivity(details: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionId?: string;
  userId?: string;
  details: Record<string, unknown>;
}): Promise<void> {
  try {
    // Fetch all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_type', 'admin')
      .eq('is_active', true);

    if (rolesError) {
      console.error('Failed to fetch admin users for alert:', rolesError);
      return;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.warn('No admin users found to alert about suspicious activity');
      return;
    }

    // Create notification for each admin
    const notifications = adminRoles.map((role) => ({
      user_id: role.user_id,
      type: 'security_alert',
      title: `🚨 Security Alert: ${details.eventType}`,
      message: `Suspicious activity detected related to moderation reversal records.\n\nSeverity: ${details.severity.toUpperCase()}\n\nDetails: ${JSON.stringify(details.details, null, 2)}\n\nPlease investigate immediately.`,
      read: false,
      data: {
        event_type: details.eventType,
        severity: details.severity,
        action_id: details.actionId,
        user_id: details.userId,
        details: details.details,
        timestamp: new Date().toISOString(),
        requires_immediate_action: details.severity === 'critical',
      },
    }));

    // Insert notifications
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Failed to create admin alert notifications:', notificationError);
    }

    // Also log to security_events for audit trail
    await logSecurityEvent('admin_alert_sent', 'system', {
      eventType: details.eventType,
      severity: details.severity,
      adminCount: adminRoles.length,
      details: details.details,
    });
  } catch (error) {
    // Log error but don't throw - alerting failure shouldn't break the application
    console.error('Failed to alert admins of suspicious activity:', error);
  }
}

/**
 * Check for suspicious patterns in reversal modification attempts
 * Requirements: 14.10
 * 
 * This function analyzes security events to detect suspicious patterns
 * such as:
 * - Multiple modification attempts from the same user
 * - Modification attempts on multiple actions in short time period
 * - Attempts to modify recently reversed actions
 * - Patterns suggesting automated tampering attempts
 * 
 * @param userId - Optional user ID to check for suspicious activity
 * @param timeWindowHours - Time window to analyze (default: 24 hours)
 * @returns Object with suspicious activity detection results
 */
export async function detectSuspiciousReversalActivity(
  userId?: string,
  timeWindowHours: number = 24
): Promise<{
  suspiciousActivityDetected: boolean;
  patterns: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    count: number;
    userIds: string[];
  }>;
}> {
  try {
    const timeWindowStart = new Date();
    timeWindowStart.setHours(timeWindowStart.getHours() - timeWindowHours);

    // Query security events for reversal modification attempts
    let query = supabase
      .from('security_events')
      .select('*')
      .in('event_type', [
        'reversal_modification_attempt',
        'reversal_modification_prevented',
        'reversal_modification_succeeded',
        'reversal_immutability_violation_detected',
      ])
      .gte('created_at', timeWindowStart.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Failed to fetch security events:', error);
      return {
        suspiciousActivityDetected: false,
        patterns: [],
      };
    }

    if (!events || events.length === 0) {
      return {
        suspiciousActivityDetected: false,
        patterns: [],
      };
    }

    const patterns: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      count: number;
      userIds: string[];
    }> = [];

    // Pattern 1: Multiple modification attempts from same user
    const attemptsByUser: Record<string, number> = {};
    events.forEach((event) => {
      if (event.user_id) {
        attemptsByUser[event.user_id] = (attemptsByUser[event.user_id] || 0) + 1;
      }
    });

    Object.entries(attemptsByUser).forEach(([uid, count]) => {
      if (count >= 5) {
        patterns.push({
          type: 'multiple_attempts_same_user',
          severity: count >= 10 ? 'high' : 'medium',
          description: `User ${uid} attempted to modify reversal records ${count} times in ${timeWindowHours} hours`,
          count,
          userIds: [uid],
        });
      }
    });

    // Pattern 2: Successful modifications (critical security breach)
    const successfulModifications = events.filter(
      (e) => e.event_type === 'reversal_modification_succeeded'
    );
    if (successfulModifications.length > 0) {
      patterns.push({
        type: 'immutability_breach',
        severity: 'critical',
        description: `${successfulModifications.length} reversal record(s) were successfully modified despite immutability constraints`,
        count: successfulModifications.length,
        userIds: successfulModifications
          .map((e) => e.user_id)
          .filter((id): id is string => id !== null),
      });
    }

    // Pattern 3: Rapid-fire attempts (potential automated attack)
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let rapidFireCount = 0;
    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff =
        new Date(sortedEvents[i].created_at).getTime() -
        new Date(sortedEvents[i - 1].created_at).getTime();
      if (timeDiff < 1000) {
        // Less than 1 second apart
        rapidFireCount++;
      }
    }
    if (rapidFireCount >= 3) {
      patterns.push({
        type: 'rapid_fire_attempts',
        severity: 'high',
        description: `${rapidFireCount} modification attempts occurred within 1 second of each other, suggesting automated attack`,
        count: rapidFireCount,
        userIds: events
          .map((e) => e.user_id)
          .filter((id): id is string => id !== null)
          .filter((id, index, self) => self.indexOf(id) === index),
      });
    }

    // Pattern 4: Immutability violations detected
    const violations = events.filter(
      (e) => e.event_type === 'reversal_immutability_violation_detected'
    );
    if (violations.length > 0) {
      patterns.push({
        type: 'immutability_violations',
        severity: 'high',
        description: `${violations.length} reversal record(s) have immutability violations`,
        count: violations.length,
        userIds: violations
          .map((e) => e.user_id)
          .filter((id): id is string => id !== null),
      });
    }

    const suspiciousActivityDetected = patterns.length > 0;

    // If suspicious activity detected, alert admins
    if (suspiciousActivityDetected) {
      await alertAdminsOfSuspiciousActivity({
        eventType: 'suspicious_reversal_activity_detected',
        severity: patterns.some((p) => p.severity === 'critical')
          ? 'critical'
          : patterns.some((p) => p.severity === 'high')
          ? 'high'
          : 'medium',
        details: {
          timeWindowHours,
          patternsDetected: patterns.length,
          patterns,
          totalEvents: events.length,
        },
      });
    }

    return {
      suspiciousActivityDetected,
      patterns,
    };
  } catch (error) {
    console.error('Failed to detect suspicious reversal activity:', error);
    return {
      suspiciousActivityDetected: false,
      patterns: [],
    };
  }
}

// ============================================================================
// Previous Reversal Detection
// ============================================================================

/**
 * Check if there are previous reversed actions related to a report
 * Requirements: 15.9
 * 
 * This function checks if there have been previous moderation actions on the same
 * target (user or content) that were later reversed. This helps moderators avoid
 * repeating mistakes by providing context about past false positives.
 * 
 * @param report - The report to check for previous reversals
 * @returns Object with reversal information
 * @throws ModerationError if validation fails or database error
 */
export async function checkPreviousReversals(report: Report): Promise<{
  hasPreviousReversals: boolean;
  reversalCount: number;
  mostRecentReversal: {
    actionType: string;
    reversedAt: string;
    reversalReason: string;
    moderatorId: string;
  } | null;
}> {
  try {
    // Validate report
    if (!report || !report.id) {
      throw new ModerationError(
        'Invalid report',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Build query to find previous reversed actions
    let query = supabase
      .from('moderation_actions')
      .select('*')
      .not('revoked_at', 'is', null); // Only reversed actions

    // Filter based on report type
    if (report.report_type === 'user' && report.reported_user_id) {
      // For user reports, check actions on that user
      query = query.eq('target_user_id', report.reported_user_id);
    } else if (report.target_id) {
      // For content reports, check actions on that specific content
      query = query
        .eq('target_type', report.report_type)
        .eq('target_id', report.target_id);
    } else {
      // No valid target to check
      return {
        hasPreviousReversals: false,
        reversalCount: 0,
        mostRecentReversal: null,
      };
    }

    // Order by reversal date (most recent first)
    query = query.order('revoked_at', { ascending: false });

    const { data: reversedActions, error } = await query;

    if (error) {
      handleDatabaseError(error, 'check previous reversals');
    }

    if (!reversedActions || reversedActions.length === 0) {
      return {
        hasPreviousReversals: false,
        reversalCount: 0,
        mostRecentReversal: null,
      };
    }

    // Get the most recent reversal
    const mostRecent = reversedActions[0];
    const reversalReason = mostRecent.metadata?.reversal_reason || 'No reason provided';

    return {
      hasPreviousReversals: true,
      reversalCount: reversedActions.length,
      mostRecentReversal: {
        actionType: mostRecent.action_type,
        reversedAt: mostRecent.revoked_at!,
        reversalReason,
        moderatorId: mostRecent.revoked_by!,
      },
    };
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    throw new ModerationError(
      'An unexpected error occurred while checking previous reversals',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

// ============================================================================
// Re-export types for convenience
// ============================================================================

export type { ReversalHistoryFilters, ReversalHistoryEntry } from '@/types/moderation';
