/**
 * Moderation Notification Templates and Functions
 * 
 * This module provides notification templates and functions for the moderation system.
 * It integrates with the existing notification system to send notifications to users
 * when moderation actions are taken on their content or account.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { supabase } from '@/lib/supabase';
import {
  ModerationActionType,
  ModerationTargetType,
  RestrictionType,
  ModerationError,
  MODERATION_ERROR_CODES,
} from '@/types/moderation';

// ============================================================================
// Notification Template Types
// ============================================================================

/**
 * Parameters for generating notification content
 */
export interface NotificationTemplateParams {
  actionType: ModerationActionType;
  targetType?: ModerationTargetType;
  reason: string;
  durationDays?: number;
  expiresAt?: string;
  customMessage?: string;
  restrictionType?: RestrictionType;
}

/**
 * Generated notification content
 */
export interface NotificationContent {
  title: string;
  message: string;
  type: 'moderation';
  priority: number;
}

// ============================================================================
// Notification Templates
// ============================================================================

/**
 * Generate notification title based on action type
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * @param actionType - Type of moderation action
 * @returns Notification title
 */
function generateNotificationTitle(actionType: ModerationActionType): string {
  switch (actionType) {
    case 'content_removed':
      return 'Content Removed';
    case 'user_warned':
      return 'Warning Issued';
    case 'user_suspended':
      return 'Account Suspended';
    case 'user_banned':
      return 'Account Suspended Permanently';
    case 'restriction_applied':
      return 'Account Restriction Applied';
    default:
      return 'Moderation Action';
  }
}

/**
 * Generate notification message for content removal
 * Requirements: 7.1
 * 
 * @param params - Notification parameters
 * @returns Notification message
 */
function generateContentRemovedMessage(params: NotificationTemplateParams): string {
  const { targetType, reason, customMessage } = params;
  
  const contentTypeLabel = targetType === 'post' ? 'post' :
                          targetType === 'comment' ? 'comment' :
                          targetType === 'track' ? 'track' : 'content';
  
  let message = `Your ${contentTypeLabel} has been removed for violating our community guidelines.\n\n`;
  message += `Reason: ${reason}\n\n`;
  
  if (customMessage) {
    message += `Additional information: ${customMessage}\n\n`;
  }
  
  message += 'If you believe this was done in error, you may appeal this decision. ';
  message += 'Please review our community guidelines to avoid future violations.';
  
  return message;
}

/**
 * Generate notification message for user warning
 * Requirements: 7.3
 * 
 * @param params - Notification parameters
 * @returns Notification message
 */
function generateWarningMessage(params: NotificationTemplateParams): string {
  const { reason, customMessage } = params;
  
  let message = 'You have received a warning for violating our community guidelines.\n\n';
  message += `Reason: ${reason}\n\n`;
  
  if (customMessage) {
    message += `Message from moderator: ${customMessage}\n\n`;
  }
  
  message += 'Please review our community guidelines to avoid future violations. ';
  message += 'Repeated violations may result in account restrictions or suspension.\n\n';
  message += 'If you believe this warning was issued in error, you may appeal this decision.';
  
  return message;
}

/**
 * Generate notification message for account suspension
 * Requirements: 7.2
 * 
 * @param params - Notification parameters
 * @returns Notification message
 */
function generateSuspensionMessage(params: NotificationTemplateParams): string {
  const { reason, durationDays, expiresAt, customMessage } = params;
  
  let message = 'Your account has been suspended for violating our community guidelines.\n\n';
  message += `Reason: ${reason}\n\n`;
  
  if (durationDays) {
    message += `Duration: ${durationDays} day${durationDays > 1 ? 's' : ''}\n`;
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      message += `Your account will be automatically restored on ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()}.\n\n`;
    }
  } else {
    message += 'Duration: Permanent\n\n';
    message += 'This is a permanent suspension. Your account will not be automatically restored.\n\n';
  }
  
  if (customMessage) {
    message += `Additional information: ${customMessage}\n\n`;
  }
  
  message += 'During the suspension period, you will not be able to:\n';
  message += '• Create posts or comments\n';
  message += '• Upload tracks\n';
  message += '• Interact with other users\n\n';
  
  message += 'If you believe this suspension was issued in error, you may appeal this decision.';
  
  return message;
}

/**
 * Generate notification message for permanent account suspension
 * Requirements: 7.2
 * 
 * @param params - Notification parameters
 * @returns Notification message
 */
function generateBanMessage(params: NotificationTemplateParams): string {
  const { reason, customMessage } = params;
  
  let message = 'Your account has been permanently suspended for severe or repeated violations of our community guidelines.\n\n';
  message += `Reason: ${reason}\n\n`;
  
  if (customMessage) {
    message += `Additional information: ${customMessage}\n\n`;
  }
  
  message += 'This is a permanent suspension. Your account will not be restored.\n\n';
  message += 'If you believe this suspension was issued in error, you may appeal this decision within 30 days.';
  
  return message;
}

/**
 * Generate notification message for account restriction
 * Requirements: 7.4
 * 
 * @param params - Notification parameters
 * @returns Notification message
 */
function generateRestrictionMessage(params: NotificationTemplateParams): string {
  const { reason, restrictionType, durationDays, expiresAt, customMessage } = params;
  
  let restrictionLabel = 'Unknown restriction';
  let restrictionDescription = '';
  
  switch (restrictionType) {
    case 'posting_disabled':
      restrictionLabel = 'Posting Disabled';
      restrictionDescription = 'You will not be able to create new posts.';
      break;
    case 'commenting_disabled':
      restrictionLabel = 'Commenting Disabled';
      restrictionDescription = 'You will not be able to create new comments.';
      break;
    case 'upload_disabled':
      restrictionLabel = 'Upload Disabled';
      restrictionDescription = 'You will not be able to upload new tracks.';
      break;
    case 'suspended':
      restrictionLabel = 'Account Suspended';
      restrictionDescription = 'You will not be able to perform any actions on the platform.';
      break;
  }
  
  let message = `A restriction has been applied to your account: ${restrictionLabel}\n\n`;
  message += `Reason: ${reason}\n\n`;
  message += `${restrictionDescription}\n\n`;
  
  if (durationDays) {
    message += `Duration: ${durationDays} day${durationDays > 1 ? 's' : ''}\n`;
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      message += `This restriction will be automatically lifted on ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()}.\n\n`;
    }
  } else {
    message += 'Duration: Permanent\n\n';
    message += 'This restriction will remain in place until manually removed by a moderator.\n\n';
  }
  
  if (customMessage) {
    message += `Additional information: ${customMessage}\n\n`;
  }
  
  message += 'Please review our community guidelines to avoid future violations. ';
  message += 'If you believe this restriction was applied in error, you may appeal this decision.';
  
  return message;
}

/**
 * Generate notification message for suspension expiration
 * Requirements: 7.7
 * 
 * @param params - Notification parameters
 * @returns Notification message
 */
function generateSuspensionExpirationMessage(params: NotificationTemplateParams): string {
  const { restrictionType } = params;
  
  let message = '';
  
  if (restrictionType === 'suspended') {
    message = 'Your account suspension has expired. Your account has been restored.\n\n';
    message += 'You can now:\n';
    message += '• Create posts and comments\n';
    message += '• Upload tracks\n';
    message += '• Interact with other users\n\n';
  } else {
    const restrictionLabel = restrictionType === 'posting_disabled' ? 'posting restriction' :
                            restrictionType === 'commenting_disabled' ? 'commenting restriction' :
                            restrictionType === 'upload_disabled' ? 'upload restriction' : 'restriction';
    
    message = `Your ${restrictionLabel} has expired and has been lifted.\n\n`;
    message += 'You can now use all platform features normally.\n\n';
  }
  
  message += 'Please continue to follow our community guidelines to maintain your account in good standing. ';
  message += 'Thank you for your cooperation.';
  
  return message;
}

// ============================================================================
// Reversal Notification Templates
// ============================================================================

/**
 * Parameters for generating reversal notification content
 */
export interface ReversalNotificationParams {
  reversalType: 'suspension_lifted' | 'ban_removed' | 'restriction_removed';
  moderatorName: string;
  reason: string;
  originalAction?: {
    reason: string;
    appliedBy: string;
    appliedAt: string;
    durationDays?: number;
  };
  restrictionType?: RestrictionType;
}

/**
 * Generate notification message for suspension lifted
 * Requirements: 13.6, 13.15
 * 
 * @param params - Reversal notification parameters
 * @returns Notification message
 */
function generateSuspensionLiftedMessage(params: ReversalNotificationParams): string {
  const { moderatorName, reason, originalAction } = params;
  
  let message = 'Good news! Your account suspension has been lifted by a moderator.\n\n';
  
  message += `Lifted by: ${moderatorName}\n`;
  message += `Reason for reversal: ${reason}\n\n`;
  
  if (originalAction) {
    message += 'Original Suspension Details:\n';
    message += `• Reason: ${originalAction.reason}\n`;
    message += `• Applied by: ${originalAction.appliedBy}\n`;
    message += `• Applied on: ${new Date(originalAction.appliedAt).toLocaleDateString()}\n`;
    if (originalAction.durationDays) {
      message += `• Duration: ${originalAction.durationDays} day${originalAction.durationDays > 1 ? 's' : ''}\n`;
    }
    message += '\n';
  }
  
  message += 'Your account has been fully restored. You can now:\n';
  message += '• Create posts and comments\n';
  message += '• Upload tracks\n';
  message += '• Interact with other users\n\n';
  
  message += 'Please continue to follow our community guidelines to maintain your account in good standing. ';
  message += 'Thank you for your understanding.';
  
  return message;
}

/**
 * Generate notification message for permanent suspension removed
 * Requirements: 13.6, 13.15
 * 
 * @param params - Reversal notification parameters
 * @returns Notification message
 */
function generateBanRemovedMessage(params: ReversalNotificationParams): string {
  const { moderatorName, reason, originalAction } = params;
  
  let message = 'Your permanent account suspension has been removed by an administrator.\n\n';
  
  message += `Removed by: ${moderatorName}\n`;
  message += `Reason for reversal: ${reason}\n\n`;
  
  if (originalAction) {
    message += 'Original Permanent Suspension Details:\n';
    message += `• Reason: ${originalAction.reason}\n`;
    message += `• Applied by: ${originalAction.appliedBy}\n`;
    message += `• Applied on: ${new Date(originalAction.appliedAt).toLocaleDateString()}\n`;
    message += '\n';
  }
  
  message += 'Your account has been fully restored. You can now:\n';
  message += '• Create posts and comments\n';
  message += '• Upload tracks\n';
  message += '• Interact with other users\n';
  message += '• Access all platform features\n\n';
  
  message += 'This is a second chance. Please carefully review and follow our community guidelines ';
  message += 'to maintain your account in good standing. Future violations may result in permanent action. ';
  message += 'Thank you for your understanding.';
  
  return message;
}

/**
 * Generate notification message for restriction removed
 * Requirements: 13.6, 13.15
 * 
 * @param params - Reversal notification parameters
 * @returns Notification message
 */
function generateRestrictionRemovedMessage(params: ReversalNotificationParams): string {
  const { moderatorName, reason, restrictionType, originalAction } = params;
  
  let restrictionLabel = 'Unknown restriction';
  let restoredCapability = '';
  
  switch (restrictionType) {
    case 'posting_disabled':
      restrictionLabel = 'posting restriction';
      restoredCapability = 'You can now create new posts.';
      break;
    case 'commenting_disabled':
      restrictionLabel = 'commenting restriction';
      restoredCapability = 'You can now create new comments.';
      break;
    case 'upload_disabled':
      restrictionLabel = 'upload restriction';
      restoredCapability = 'You can now upload new tracks.';
      break;
    case 'suspended':
      restrictionLabel = 'account suspension';
      restoredCapability = 'You can now use all platform features.';
      break;
  }
  
  let message = `Your ${restrictionLabel} has been removed by a moderator.\n\n`;
  
  message += `Removed by: ${moderatorName}\n`;
  message += `Reason for reversal: ${reason}\n\n`;
  
  if (originalAction) {
    message += `Original Restriction Details:\n`;
    message += `• Type: ${restrictionLabel}\n`;
    message += `• Reason: ${originalAction.reason}\n`;
    message += `• Applied by: ${originalAction.appliedBy}\n`;
    message += `• Applied on: ${new Date(originalAction.appliedAt).toLocaleDateString()}\n`;
    if (originalAction.durationDays) {
      message += `• Duration: ${originalAction.durationDays} day${originalAction.durationDays > 1 ? 's' : ''}\n`;
    }
    message += '\n';
  }
  
  message += `${restoredCapability}\n\n`;
  
  message += 'Please continue to follow our community guidelines to maintain your account in good standing. ';
  message += 'Thank you for your understanding.';
  
  return message;
}

// ============================================================================
// Main Template Generation Function
// ============================================================================

/**
 * Generate notification content based on moderation action
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 * 
 * @param params - Notification template parameters
 * @returns Generated notification content
 */
export function generateModerationNotification(
  params: NotificationTemplateParams
): NotificationContent {
  const { actionType } = params;
  
  // Generate title
  const title = generateNotificationTitle(actionType);
  
  // Generate message based on action type
  let message: string;
  
  switch (actionType) {
    case 'content_removed':
      message = generateContentRemovedMessage(params);
      break;
    case 'user_warned':
      message = generateWarningMessage(params);
      break;
    case 'user_suspended':
      message = generateSuspensionMessage(params);
      break;
    case 'user_banned':
      message = generateBanMessage(params);
      break;
    case 'restriction_applied':
      message = generateRestrictionMessage(params);
      break;
    default:
      message = `A moderation action has been taken on your account.\n\nReason: ${params.reason}`;
  }
  
  // Determine priority (higher priority for more severe actions)
  const priority = actionType === 'user_banned' ? 3 :
                  actionType === 'user_suspended' ? 3 :
                  actionType === 'restriction_applied' ? 2 :
                  actionType === 'content_removed' ? 2 :
                  1;
  
  return {
    title,
    message,
    type: 'moderation',
    priority,
  };
}

/**
 * Generate notification content for action reversal
 * Requirements: 13.6, 13.15
 * 
 * @param params - Reversal notification parameters
 * @returns Generated notification content
 */
export function generateReversalNotification(
  params: ReversalNotificationParams
): NotificationContent {
  const { reversalType } = params;
  
  // Generate title based on reversal type
  let title: string;
  switch (reversalType) {
    case 'suspension_lifted':
      title = 'Suspension Lifted';
      break;
    case 'ban_removed':
      title = 'Permanent Suspension Removed';
      break;
    case 'restriction_removed':
      title = 'Restriction Removed';
      break;
    default:
      title = 'Moderation Action Reversed';
  }
  
  // Generate message based on reversal type
  let message: string;
  switch (reversalType) {
    case 'suspension_lifted':
      message = generateSuspensionLiftedMessage(params);
      break;
    case 'ban_removed':
      message = generateBanRemovedMessage(params);
      break;
    case 'restriction_removed':
      message = generateRestrictionRemovedMessage(params);
      break;
    default:
      message = `A moderation action has been reversed.\n\nReason: ${params.reason}`;
  }
  
  return {
    title,
    message,
    type: 'moderation',
    priority: 2,
  };
}

/**
 * Generate notification content for suspension/restriction expiration
 * Requirements: 7.7
 * 
 * @param restrictionType - Type of restriction that expired
 * @returns Generated notification content
 */
export function generateExpirationNotification(
  restrictionType: RestrictionType
): NotificationContent {
  const title = restrictionType === 'suspended' 
    ? 'Account Suspension Expired' 
    : 'Account Restriction Lifted';
  
  const message = generateSuspensionExpirationMessage({ 
    actionType: 'restriction_applied',
    reason: '',
    restrictionType 
  });
  
  return {
    title,
    message,
    type: 'moderation',
    priority: 2,
  };
}

// ============================================================================
// Notification Sending Function
// ============================================================================

/**
 * Send a moderation notification to a user
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * @param userId - User ID to send notification to
 * @param params - Notification template parameters
 * @returns Notification ID if sent successfully, null otherwise
 * @throws ModerationError if notification fails to send
 */
export async function sendModerationNotification(
  userId: string,
  params: NotificationTemplateParams
): Promise<string | null> {
  try {
    // Generate notification content
    const notification = generateModerationNotification(params);
    
    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new ModerationError(
        'No active session',
        MODERATION_ERROR_CODES.UNAUTHORIZED
      );
    }
    
    // Send notification via API route (uses service role key to bypass RLS)
    const response = await fetch('/api/moderation/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId,
        title: notification.title,
        message: notification.message,
        data: {
          moderation_action: params.actionType,
          target_type: params.targetType,
          reason: params.reason,
          duration_days: params.durationDays,
          expires_at: params.expiresAt,
          restriction_type: params.restrictionType,
        },
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send moderation notification:', errorData);
      throw new ModerationError(
        'Failed to send notification',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: errorData }
      );
    }
    
    const result = await response.json();
    return result.notificationId || null;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    console.error('Unexpected error sending moderation notification:', error);
    throw new ModerationError(
      'An unexpected error occurred while sending notification',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Send an expiration notification to a user
 * Requirements: 7.7
 * 
 * @param userId - User ID to send notification to
 * @param restrictionType - Type of restriction that expired
 * @returns True if notification was sent successfully
 * @throws ModerationError if notification fails to send
 */
export async function sendExpirationNotification(
  userId: string,
  restrictionType: RestrictionType
): Promise<boolean> {
  try {
    // Generate notification content
    const notification = generateExpirationNotification(restrictionType);
    
    // Insert notification into database
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        data: {
          moderation_action: 'restriction_expired',
          restriction_type: restrictionType,
        },
      });
    
    if (error) {
      console.error('Failed to send expiration notification:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      throw new ModerationError(
        'Failed to send expiration notification',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }
    
    return true;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    console.error('Unexpected error sending expiration notification:', error);
    throw new ModerationError(
      'An unexpected error occurred while sending expiration notification',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Send a reversal notification to a user
 * Requirements: 13.6, 13.15
 * 
 * @param userId - User ID to send notification to
 * @param params - Reversal notification parameters
 * @param relatedNotificationId - Optional ID of the original notification being reversed
 * @returns True if notification was sent successfully
 * @throws ModerationError if notification fails to send
 */
export async function sendReversalNotification(
  userId: string,
  params: ReversalNotificationParams,
  relatedNotificationId?: string
): Promise<boolean> {
  try {
    // Generate notification content
    const notification = generateReversalNotification(params);
    
    // Insert notification into database with related_notification_id
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        related_notification_id: relatedNotificationId || null,
        data: {
          moderation_action: 'action_reversed',
          reversal_type: params.reversalType,
          moderator_name: params.moderatorName,
          reversal_reason: params.reason,
          restriction_type: params.restrictionType,
          original_action: params.originalAction,
        },
      });
    
    if (error) {
      console.error('Failed to send reversal notification:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      throw new ModerationError(
        'Failed to send reversal notification',
        MODERATION_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }
    
    return true;
  } catch (error) {
    if (error instanceof ModerationError) {
      throw error;
    }
    console.error('Unexpected error sending reversal notification:', error);
    throw new ModerationError(
      'An unexpected error occurred while sending reversal notification',
      MODERATION_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}
