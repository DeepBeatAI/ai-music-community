/**
 * Moderation System Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the moderation system,
 * including reports, actions, restrictions, and error handling.
 */

// ============================================================================
// Report Types
// ============================================================================

/**
 * Report reasons that users can select when reporting content
 */
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'copyright_violation'
  | 'impersonation'
  | 'self_harm'
  | 'other';

/**
 * Report status lifecycle states
 */
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

/**
 * Content types that can be reported
 */
export type ReportType = 'post' | 'comment' | 'track' | 'user' | 'album';

/**
 * Evidence metadata for reports
 * Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2
 */
export interface ReportMetadata {
  // Copyright evidence (Requirement 1)
  originalWorkLink?: string;
  proofOfOwnership?: string;
  
  // Audio timestamp evidence (Requirement 2)
  audioTimestamp?: string;
  
  // Reporter accuracy (for display in report cards - Requirement 5)
  reporterAccuracy?: {
    totalReports: number;
    accurateReports: number;
    accuracyRate: number;
  };
}

/**
 * Complete report record from the database
 */
export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  report_type: ReportType;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  priority: number;
  moderator_flagged: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
  metadata: ReportMetadata | null;
}

/**
 * Parameters for submitting a user report
 */
export interface ReportParams {
  reportType: ReportType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  metadata?: ReportMetadata;
}

/**
 * Parameters for moderator flagging content
 */
export interface ModeratorFlagParams {
  reportType: ReportType;
  targetId: string;
  reason: ReportReason;
  internalNotes: string;
  priority?: number;
  metadata?: ReportMetadata;
}

// ============================================================================
// Moderation Action Types
// ============================================================================

/**
 * Types of moderation actions that can be taken
 */
export type ModerationActionType =
  | 'content_removed'
  | 'content_approved'
  | 'user_warned'
  | 'user_suspended'
  | 'user_banned'
  | 'restriction_applied';

/**
 * Target types for moderation actions
 */
export type ModerationTargetType = 'post' | 'comment' | 'track' | 'user' | 'album';

/**
 * Complete moderation action record from the database
 */
export interface ModerationAction {
  id: string;
  moderator_id: string;
  target_user_id: string;
  action_type: ModerationActionType;
  target_type: ModerationTargetType | null;
  target_id: string | null;
  reason: string;
  duration_days: number | null;
  expires_at: string | null;
  related_report_id: string | null;
  internal_notes: string | null;
  notification_sent: boolean;
  notification_message: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  metadata: Record<string, any> | null;
}

/**
 * Parameters for taking a moderation action
 */
export interface ModerationActionParams {
  reportId: string;
  actionType: ModerationActionType;
  targetUserId: string;
  targetType?: ModerationTargetType;
  targetId?: string;
  reason: string;
  durationDays?: number;
  internalNotes?: string;
  notificationMessage?: string;
  restrictionType?: RestrictionType;
  cascadingOptions?: CascadingActionOptions;
}

// ============================================================================
// User Restriction Types
// ============================================================================

/**
 * Types of restrictions that can be applied to users
 */
export type RestrictionType =
  | 'posting_disabled'
  | 'commenting_disabled'
  | 'upload_disabled'
  | 'suspended';

/**
 * Complete user restriction record from the database
 */
export interface UserRestriction {
  id: string;
  user_id: string;
  restriction_type: RestrictionType;
  expires_at: string | null;
  is_active: boolean;
  reason: string;
  applied_by: string;
  related_action_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Queue and Filter Types
// ============================================================================

/**
 * Filters for the moderation queue
 */
export interface QueueFilters {
  status?: ReportStatus;
  priority?: number;
  moderatorFlagged?: boolean;
  reportType?: ReportType;
  startDate?: string;
  endDate?: string;
}

/**
 * Filters for moderation action logs
 */
export interface ActionLogFilters {
  actionType?: string;
  moderatorId?: string;
  targetUserId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  reversedOnly?: boolean;
  nonReversedOnly?: boolean;
  recentlyReversed?: boolean;
  expiredOnly?: boolean;
  nonExpiredOnly?: boolean;
}

/**
 * Sort options for the moderation queue
 */
export type QueueSortField = 'priority' | 'created_at' | 'updated_at';

export type QueueSortOrder = 'asc' | 'desc';

export interface QueueSortOptions {
  field: QueueSortField;
  order: QueueSortOrder;
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Moderation-specific error codes
 */
export const MODERATION_ERROR_CODES = {
  DATABASE_ERROR: 'MODERATION_DATABASE_ERROR',
  UNAUTHORIZED: 'MODERATION_UNAUTHORIZED',
  VALIDATION_ERROR: 'MODERATION_VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'MODERATION_RATE_LIMIT_EXCEEDED',
  NOT_FOUND: 'MODERATION_NOT_FOUND',
  CONCURRENT_MODIFICATION: 'MODERATION_CONCURRENT_MODIFICATION',
  INSUFFICIENT_PERMISSIONS: 'MODERATION_INSUFFICIENT_PERMISSIONS',
  INVALID_ACTION: 'MODERATION_INVALID_ACTION',
  RESTRICTION_ACTIVE: 'MODERATION_RESTRICTION_ACTIVE',
} as const;

export type ModerationErrorCode =
  (typeof MODERATION_ERROR_CODES)[keyof typeof MODERATION_ERROR_CODES];

/**
 * Custom error class for moderation-related errors
 */
export class ModerationError extends Error {
  code: ModerationErrorCode;
  details?: Record<string, any>;

  constructor(
    message: string,
    code: ModerationErrorCode,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ModerationError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ModerationError);
    }
  }
}

// ============================================================================
// Extended Types with Relations
// ============================================================================

/**
 * Report with reporter and reported user information
 */
export interface ReportWithUsers extends Report {
  reporter?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  reported_user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  reviewer?: {
    id: string;
    username: string;
  };
}

/**
 * Moderation action with moderator and target user information
 */
export interface ModerationActionWithUsers extends ModerationAction {
  moderator?: {
    id: string;
    username: string;
  };
  target_user?: {
    id: string;
    username: string;
  };
}

/**
 * User restriction with applied_by user information
 */
export interface UserRestrictionWithUser extends UserRestriction {
  applied_by_user?: {
    id: string;
    username: string;
  };
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

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Priority level mapping for reports
 */
export const PRIORITY_LEVELS = {
  CRITICAL: 1,
  HIGH: 2,
  STANDARD: 3,
  LOW: 4,
  MINIMAL: 5,
} as const;

/**
 * Priority labels for display
 */
export const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 - Critical',
  2: 'P2 - High',
  3: 'P3 - Standard',
  4: 'P4 - Low',
  5: 'P5 - Minimal',
};

/**
 * Reason labels for display
 */
export const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam or Misleading Content',
  harassment: 'Harassment or Bullying',
  hate_speech: 'Hate Speech',
  inappropriate_content: 'Inappropriate Content',
  copyright_violation: 'Copyright Violation',
  impersonation: 'Impersonation',
  self_harm: 'Self-Harm or Dangerous Acts',
  other: 'Other',
};

/**
 * Action type labels for display
 */
export const ACTION_TYPE_LABELS: Record<ModerationActionType, string> = {
  content_removed: 'Content Removed',
  content_approved: 'Content Approved',
  user_warned: 'User Warned',
  user_suspended: 'User Suspended',
  user_banned: 'Permanent Suspension',
  restriction_applied: 'Restriction Applied',
};

/**
 * Restriction type labels for display
 */
export const RESTRICTION_TYPE_LABELS: Record<RestrictionType, string> = {
  posting_disabled: 'Posting Disabled',
  commenting_disabled: 'Commenting Disabled',
  upload_disabled: 'Upload Disabled',
  suspended: 'Account Suspended',
};

/**
 * Status labels for display
 */
export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

// ============================================================================
// Reversal Pattern Types
// ============================================================================

/**
 * Common reversal reason with count
 * Requirements: 14.5
 */
export interface ReversalReasonPattern {
  reason: string;
  count: number;
  percentage: number;
}

/**
 * User with multiple reversed actions
 * Requirements: 14.5
 */
export interface UserReversalPattern {
  userId: string;
  username?: string;
  reversedActionCount: number;
  totalActionCount: number;
  reversalRate: number;
  mostCommonReason: string;
}

/**
 * Time pattern for reversals (day of week)
 * Requirements: 14.5
 */
export interface DayOfWeekPattern {
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  dayNumber: number; // 0-6 (Sunday = 0)
  count: number;
  percentage: number;
}

/**
 * Time pattern for reversals (hour of day)
 * Requirements: 14.5
 */
export interface HourOfDayPattern {
  hour: number; // 0-23
  count: number;
  percentage: number;
}

/**
 * Complete reversal patterns analysis
 * Requirements: 14.5
 */
export interface ReversalPatterns {
  commonReasons: ReversalReasonPattern[];
  usersWithMultipleReversals: UserReversalPattern[];
  dayOfWeekPatterns: DayOfWeekPattern[];
  hourOfDayPatterns: HourOfDayPattern[];
  totalReversals: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Filters for reversal history queries
 * Requirements: 14.5, 14.9
 */
export interface ReversalHistoryFilters {
  startDate?: string;
  endDate?: string;
  moderatorId?: string;
  actionType?: ModerationActionType;
  reversalReason?: string;
  targetUserId?: string;
  revokedBy?: string;
}

/**
 * State change action types for tracking multiple reversals
 * Requirements: 14.4
 */
export type StateChangeAction = 'applied' | 'reversed' | 'reapplied';

/**
 * Individual state change entry in the history
 * Requirements: 14.4
 */
export interface StateChangeEntry {
  timestamp: string;
  action: StateChangeAction;
  by_user_id: string;
  reason: string;
  is_self_action: boolean;
}

/**
 * Reversal history entry with complete details
 * Requirements: 14.1, 14.2, 14.5
 */
export interface ReversalHistoryEntry {
  action: ModerationAction;
  revokedAt: string;
  revokedBy: string;
  reversalReason: string | null;
  timeBetweenActionAndReversal: number; // milliseconds
  isSelfReversal: boolean;
  moderatorUsername?: string;
  revokedByUsername?: string;
  targetUsername?: string;
  stateChanges?: StateChangeEntry[]; // Complete state change history for multiple reversals
  wasReapplied?: boolean; // Whether the action was re-applied after reversal
}

// ============================================================================
// Profile Context Types
// ============================================================================

/**
 * Profile context for moderation panel
 * Requirements: 7.2, 7.3, 7.4, 7.5
 * 
 * This interface provides comprehensive context about a user profile
 * when reviewing user reports in the moderation queue.
 */
export interface ProfileContext {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  joinDate: string;
  accountAgeDays: number;
  recentReportCount: number;
  moderationHistory: Array<{
    actionType: ModerationActionType;
    reason: string;
    createdAt: string;
    expiresAt: string | null;
  }>;
}

// ============================================================================
// Album Context Types
// ============================================================================

/**
 * Album context for moderation panel
 * Requirements: 3.2, 3.4, 3.5
 * 
 * This interface provides comprehensive context about an album
 * when reviewing album reports in the moderation queue.
 */
export interface AlbumContext {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
  tracks: Array<{
    id: string;
    title: string;
    duration: number | null;
    position: number;
  }>;
  track_count: number;
  total_duration: number | null;
}

/**
 * Cascading action options for album removal
 * Requirements: 4.2, 4.3, 4.4
 * 
 * When removing an album, moderators can choose to:
 * - Remove album and all tracks (cascading deletion)
 * - Remove album only (keep tracks as standalone)
 */
export interface CascadingActionOptions {
  removeAlbum: boolean;
  removeTracks: boolean;
}
