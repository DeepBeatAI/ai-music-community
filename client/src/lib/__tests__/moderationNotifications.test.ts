/**
 * Unit Tests for Moderation Notifications
 * 
 * These tests verify the notification template generation and sending functions
 * for the moderation system.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import {
  generateModerationNotification,
  generateExpirationNotification,
} from '@/lib/moderationNotifications';
import { ModerationActionType, RestrictionType } from '@/types/moderation';

describe('Moderation Notifications', () => {
  describe('generateModerationNotification', () => {
    describe('Content Removal Notifications', () => {
      it('should generate notification for content removal', () => {
        const notification = generateModerationNotification({
          actionType: 'content_removed',
          targetType: 'post',
          reason: 'Spam content',
        });

        expect(notification.title).toBe('Content Removed');
        expect(notification.message).toContain('post');
        expect(notification.message).toContain('Spam content');
        expect(notification.message).toContain('appeal');
        expect(notification.type).toBe('system');
        expect(notification.priority).toBe(2);
      });

      it('should include custom message in content removal notification', () => {
        const customMessage = 'This violates our spam policy';
        const notification = generateModerationNotification({
          actionType: 'content_removed',
          targetType: 'comment',
          reason: 'Spam',
          customMessage,
        });

        expect(notification.message).toContain(customMessage);
      });

      it('should handle different content types', () => {
        const types: Array<'post' | 'comment' | 'track'> = ['post', 'comment', 'track'];
        
        types.forEach(targetType => {
          const notification = generateModerationNotification({
            actionType: 'content_removed',
            targetType,
            reason: 'Test reason',
          });

          expect(notification.message).toContain(targetType);
        });
      });
    });

    describe('Content Removed Notifications', () => {
      it('should generate notification for content removed', () => {
        const notification = generateModerationNotification({
          actionType: 'content_removed',
          targetType: 'post',
          reason: 'Violates guidelines',
        });

        expect(notification.title).toBe('Content Removed');
        expect(notification.message).toContain('removed');
        expect(notification.message).toContain('Violates guidelines');
        expect(notification.type).toBe('system');
      });
    });

    describe('Warning Notifications', () => {
      it('should generate notification for user warning', () => {
        const notification = generateModerationNotification({
          actionType: 'user_warned',
          reason: 'Inappropriate behavior',
        });

        expect(notification.title).toBe('Warning Issued');
        expect(notification.message).toContain('warning');
        expect(notification.message).toContain('Inappropriate behavior');
        expect(notification.message).toContain('community guidelines');
        expect(notification.message).toContain('appeal');
        expect(notification.type).toBe('system');
        expect(notification.priority).toBe(1);
      });

      it('should include moderator message in warning', () => {
        const customMessage = 'Please be respectful to other users';
        const notification = generateModerationNotification({
          actionType: 'user_warned',
          reason: 'Harassment',
          customMessage,
        });

        expect(notification.message).toContain(customMessage);
      });
    });

    describe('Suspension Notifications', () => {
      it('should generate notification for temporary suspension', () => {
        const notification = generateModerationNotification({
          actionType: 'user_suspended',
          reason: 'Repeated violations',
          durationDays: 7,
          expiresAt: new Date('2025-01-15').toISOString(),
        });

        expect(notification.title).toBe('Account Suspended');
        expect(notification.message).toContain('suspended');
        expect(notification.message).toContain('Repeated violations');
        expect(notification.message).toContain('7 days');
        expect(notification.message).toContain('1/15/2025');
        expect(notification.message).toContain('appeal');
        expect(notification.type).toBe('system');
        expect(notification.priority).toBe(3);
      });

      it('should generate notification for permanent suspension', () => {
        const notification = generateModerationNotification({
          actionType: 'user_suspended',
          reason: 'Severe violation',
        });

        expect(notification.message).toContain('Permanent');
        expect(notification.message).not.toContain('days');
      });

      it('should list restricted actions during suspension', () => {
        const notification = generateModerationNotification({
          actionType: 'user_suspended',
          reason: 'Test',
          durationDays: 1,
        });

        expect(notification.message).toContain('Create posts');
        expect(notification.message).toContain('Upload tracks');
        expect(notification.message).toContain('Interact with other users');
      });
    });

    describe('Ban Notifications', () => {
      it('should generate notification for permanent ban', () => {
        const notification = generateModerationNotification({
          actionType: 'user_banned',
          reason: 'Severe repeated violations',
        });

        expect(notification.title).toBe('Account Banned');
        expect(notification.message).toContain('permanently banned');
        expect(notification.message).toContain('Severe repeated violations');
        expect(notification.message).toContain('permanent ban');
        expect(notification.message).toContain('appeal');
        expect(notification.type).toBe('system');
        expect(notification.priority).toBe(3);
      });
    });

    describe('Restriction Notifications', () => {
      it('should generate notification for posting restriction', () => {
        const notification = generateModerationNotification({
          actionType: 'restriction_applied',
          reason: 'Spam posting',
          restrictionType: 'posting_disabled',
          durationDays: 3,
          expiresAt: new Date('2025-01-10').toISOString(),
        });

        expect(notification.title).toBe('Account Restriction Applied');
        expect(notification.message).toContain('Posting Disabled');
        expect(notification.message).toContain('Spam posting');
        expect(notification.message).toContain('3 days');
        expect(notification.message).toContain('not be able to create new posts');
        expect(notification.message).toContain('1/10/2025');
        expect(notification.type).toBe('system');
        expect(notification.priority).toBe(2);
      });

      it('should generate notification for commenting restriction', () => {
        const notification = generateModerationNotification({
          actionType: 'restriction_applied',
          reason: 'Harassment in comments',
          restrictionType: 'commenting_disabled',
          durationDays: 7,
        });

        expect(notification.message).toContain('Commenting Disabled');
        expect(notification.message).toContain('not be able to create new comments');
      });

      it('should generate notification for upload restriction', () => {
        const notification = generateModerationNotification({
          actionType: 'restriction_applied',
          reason: 'Copyright violations',
          restrictionType: 'upload_disabled',
        });

        expect(notification.message).toContain('Upload Disabled');
        expect(notification.message).toContain('not be able to upload new tracks');
      });

      it('should generate notification for permanent restriction', () => {
        const notification = generateModerationNotification({
          actionType: 'restriction_applied',
          reason: 'Test',
          restrictionType: 'posting_disabled',
        });

        expect(notification.message).toContain('Permanent');
        expect(notification.message).toContain('manually removed');
      });
    });
  });

  describe('generateExpirationNotification', () => {
    it('should generate notification for suspension expiration', () => {
      const notification = generateExpirationNotification('suspended');

      expect(notification.title).toBe('Account Suspension Expired');
      expect(notification.message).toContain('suspension has expired');
      expect(notification.message).toContain('restored');
      expect(notification.message).toContain('Create posts');
      expect(notification.message).toContain('Upload tracks');
      expect(notification.message).toContain('community guidelines');
      expect(notification.type).toBe('system');
      expect(notification.priority).toBe(2);
    });

    it('should generate notification for posting restriction expiration', () => {
      const notification = generateExpirationNotification('posting_disabled');

      expect(notification.title).toBe('Account Restriction Lifted');
      expect(notification.message).toContain('posting restriction has expired');
      expect(notification.message).toContain('lifted');
      expect(notification.message).toContain('community guidelines');
    });

    it('should generate notification for commenting restriction expiration', () => {
      const notification = generateExpirationNotification('commenting_disabled');

      expect(notification.message).toContain('commenting restriction');
    });

    it('should generate notification for upload restriction expiration', () => {
      const notification = generateExpirationNotification('upload_disabled');

      expect(notification.message).toContain('upload restriction');
    });
  });

  describe('Notification Content Validation', () => {
    it('should always include appeal information', () => {
      const actionTypes: ModerationActionType[] = [
        'content_removed',
        'user_warned',
        'user_suspended',
        'user_banned',
        'restriction_applied',
      ];

      actionTypes.forEach(actionType => {
        const notification = generateModerationNotification({
          actionType,
          reason: 'Test reason',
        });

        expect(notification.message.toLowerCase()).toContain('appeal');
      });
    });

    it('should always include reason in message', () => {
      const reason = 'Specific violation reason';
      const notification = generateModerationNotification({
        actionType: 'user_warned',
        reason,
      });

      expect(notification.message).toContain(reason);
    });

    it('should have appropriate priority levels', () => {
      // High priority actions
      const highPriorityActions: ModerationActionType[] = ['user_banned', 'user_suspended'];
      highPriorityActions.forEach(actionType => {
        const notification = generateModerationNotification({
          actionType,
          reason: 'Test',
        });
        expect(notification.priority).toBe(3);
      });

      // Medium priority actions
      const mediumPriorityActions: ModerationActionType[] = ['content_removed', 'restriction_applied'];
      mediumPriorityActions.forEach(actionType => {
        const notification = generateModerationNotification({
          actionType,
          reason: 'Test',
        });
        expect(notification.priority).toBeGreaterThanOrEqual(2);
      });

      // Lower priority actions
      const lowerPriorityActions: ModerationActionType[] = ['user_warned'];
      lowerPriorityActions.forEach(actionType => {
        const notification = generateModerationNotification({
          actionType,
          reason: 'Test',
        });
        expect(notification.priority).toBeLessThanOrEqual(2);
      });
    });

    it('should always set type to system', () => {
      const notification = generateModerationNotification({
        actionType: 'user_warned',
        reason: 'Test',
      });

      expect(notification.type).toBe('system');
    });

    it('should handle missing optional parameters gracefully', () => {
      const notification = generateModerationNotification({
        actionType: 'content_removed',
        reason: 'Test reason',
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBeDefined();
      expect(notification.message).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle very long reasons', () => {
      const longReason = 'A'.repeat(500);
      const notification = generateModerationNotification({
        actionType: 'user_warned',
        reason: longReason,
      });

      expect(notification.message).toContain(longReason);
      expect(notification.message.length).toBeLessThan(2000);
    });

    it('should handle very long custom messages', () => {
      const longMessage = 'B'.repeat(500);
      const notification = generateModerationNotification({
        actionType: 'user_warned',
        reason: 'Test',
        customMessage: longMessage,
      });

      expect(notification.message).toContain(longMessage);
    });

    it('should handle special characters in reason', () => {
      const specialReason = 'Test <script>alert("xss")</script> reason';
      const notification = generateModerationNotification({
        actionType: 'user_warned',
        reason: specialReason,
      });

      expect(notification.message).toContain(specialReason);
    });
  });
});
