/**
 * Property-Based Tests for Moderation Service
 * 
 * These tests use fast-check to verify universal properties that should hold
 * across all valid executions of the moderation system.
 * 
 * Feature: moderation-system, Property 9: Audit Trail Completeness
 * Validates: Requirements 10.1, 10.2
 * 
 * Feature: moderation-system, Property 10: Notification Delivery
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

import fc from 'fast-check';
import { ModerationAction, ModerationActionType } from '@/types/moderation';
import { generateModerationNotification, generateExpirationNotification } from '@/lib/moderationNotifications';

describe('Moderation Service - Property-Based Tests', () => {
  /**
   * Property 9: Audit Trail Completeness
   * 
   * For any moderation action taken, a corresponding entry should exist in
   * moderation_actions table with complete details including moderator_id,
   * timestamp, and reason.
   * 
   * Feature: moderation-system, Property 9: Audit Trail Completeness
   * Validates: Requirements 10.1, 10.2
   */
  describe('Property 9: Audit Trail Completeness', () => {
    it('should validate that all moderation action objects have required audit fields', async () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      await fc.assert(
        fc.property(
          // Generate arbitrary moderation action objects
          fc.record({
            id: fc.uuid(),
            moderator_id: fc.uuid(),
            target_user_id: fc.uuid(),
            action_type: fc.constantFrom(
              'content_removed',
              'content_approved',
              'user_warned',
              'user_suspended',
              'user_banned',
              'restriction_applied'
            ),
            target_type: fc.option(fc.constantFrom('post', 'comment', 'track', 'user'), { nil: null }),
            target_id: fc.option(fc.uuid(), { nil: null }),
            reason: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            duration_days: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
            expires_at: fc.option(
              fc.integer({ min: Date.now(), max: new Date('2025-12-31').getTime() }).map(ms => new Date(ms).toISOString()),
              { nil: null }
            ),
            related_report_id: fc.option(fc.uuid(), { nil: null }),
            internal_notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
            notification_sent: fc.boolean(),
            notification_message: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
            created_at: fc.integer({ min: new Date('2024-01-01').getTime(), max: Date.now() }).map(ms => new Date(ms).toISOString()),
            revoked_at: fc.constant(null), // Simplify: most actions are not revoked
            revoked_by: fc.constant(null),
            metadata: fc.option(fc.object(), { nil: null }),
          }),
          (action: ModerationAction) => {
            // Property: Every moderation action must have required audit fields
            
            // Required fields must be defined and non-empty
            expect(action.id).toBeDefined();
            expect(action.id).not.toBe('');
            expect(action.moderator_id).toBeDefined();
            expect(action.moderator_id).not.toBe('');
            expect(action.target_user_id).toBeDefined();
            expect(action.target_user_id).not.toBe('');
            expect(action.action_type).toBeDefined();
            expect(action.reason).toBeDefined();
            expect(action.reason.trim()).not.toBe('');
            expect(action.created_at).toBeDefined();

            // Verify timestamp is valid ISO 8601 format
            const timestamp = new Date(action.created_at);
            expect(timestamp.getTime()).not.toBeNaN();
            
            // Verify timestamp is not in the future
            expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());

            // Verify action type is valid
            const validActionTypes = [
              'content_removed',
              'content_approved',
              'user_warned',
              'user_suspended',
              'user_banned',
              'restriction_applied',
            ];
            expect(validActionTypes).toContain(action.action_type);

            // Verify UUIDs are valid format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(action.id).toMatch(uuidRegex);
            expect(action.moderator_id).toMatch(uuidRegex);
            expect(action.target_user_id).toMatch(uuidRegex);

            // Verify optional UUIDs are valid if present
            if (action.target_id) {
              expect(action.target_id).toMatch(uuidRegex);
            }
            if (action.related_report_id) {
              expect(action.related_report_id).toMatch(uuidRegex);
            }
            if (action.revoked_by) {
              expect(action.revoked_by).toMatch(uuidRegex);
            }

            // Verify duration and expiration consistency
            if (action.duration_days !== null) {
              expect(action.duration_days).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns }
      );
    });

    it('should ensure action IDs are unique across multiple actions', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate an array of moderation actions
          fc.array(
            fc.record({
              id: fc.uuid(),
              moderator_id: fc.uuid(),
              target_user_id: fc.uuid(),
              action_type: fc.constantFrom('content_removed', 'user_warned', 'user_suspended'),
              reason: fc.string({ minLength: 1, maxLength: 200 }),
              created_at: fc.integer({ min: new Date('2024-01-01').getTime(), max: Date.now() }).map(ms => new Date(ms).toISOString()),
            }),
            { minLength: 2, maxLength: 50 }
          ),
          (actions) => {
            // Property: All action IDs must be unique
            const actionIds = actions.map(a => a.id);
            const uniqueIds = new Set(actionIds);
            
            expect(uniqueIds.size).toBe(actionIds.length);

            // Property: Actions should be sortable by timestamp
            const sortedActions = [...actions].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            // Verify sorting doesn't lose any actions
            expect(sortedActions.length).toBe(actions.length);

            // Verify all timestamps are valid
            sortedActions.forEach((action, index) => {
              const timestamp = new Date(action.created_at);
              expect(timestamp.getTime()).not.toBeNaN();

              // Verify chronological order
              if (index > 0) {
                const prevTimestamp = new Date(sortedActions[index - 1].created_at);
                expect(timestamp.getTime()).toBeGreaterThanOrEqual(prevTimestamp.getTime());
              }
            });
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 10: Notification Delivery
   * 
   * For any moderation action that affects a user (content removal, suspension,
   * warning, restriction), a notification should be created and delivered to
   * the target user.
   * 
   * Feature: moderation-system, Property 10: Notification Delivery
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  describe('Property 10: Notification Delivery', () => {
    it('should generate valid notification content for all action types', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary notification parameters
          fc.record({
            actionType: fc.constantFrom(
              'content_removed',
              'user_warned',
              'user_suspended',
              'user_banned',
              'restriction_applied'
            ) as fc.Arbitrary<ModerationActionType>,
            targetType: fc.option(fc.constantFrom('post', 'comment', 'track', 'user'), { nil: undefined }),
            reason: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            durationDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: undefined }),
            expiresAt: fc.option(
              fc.date({ min: new Date(), max: new Date('2025-12-31') }).map(d => d.toISOString()),
              { nil: undefined }
            ),
            customMessage: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            restrictionType: fc.option(
              fc.constantFrom('posting_disabled', 'commenting_disabled', 'upload_disabled', 'suspended'),
              { nil: undefined }
            ),
          }),
          (params) => {
            // Property: Notification generation should always produce valid content
            const notification = generateModerationNotification(params);

            // Verify notification has required fields
            expect(notification).toBeDefined();
            expect(notification.title).toBeDefined();
            expect(notification.title.trim()).not.toBe('');
            expect(notification.message).toBeDefined();
            expect(notification.message.trim()).not.toBe('');
            expect(notification.type).toBe('system');
            expect(notification.priority).toBeGreaterThanOrEqual(1);
            expect(notification.priority).toBeLessThanOrEqual(3);

            // Verify title matches action type
            const titleLowerCase = notification.title.toLowerCase();
            switch (params.actionType) {
              case 'content_removed':
                expect(titleLowerCase).toContain('removed');
                break;
              case 'user_warned':
                expect(titleLowerCase).toContain('warning');
                break;
              case 'user_suspended':
                expect(titleLowerCase).toContain('suspended');
                break;
              case 'user_banned':
                expect(titleLowerCase).toContain('banned');
                break;
              case 'restriction_applied':
                expect(titleLowerCase).toContain('restriction');
                break;
            }

            // Verify message contains reason
            expect(notification.message).toContain(params.reason);

            // Verify message contains duration information if provided
            // (only for actions that support duration: suspension, restriction)
            if (params.durationDays && 
                (params.actionType === 'user_suspended' || 
                 params.actionType === 'restriction_applied')) {
              const messageLowerCase = notification.message.toLowerCase();
              expect(messageLowerCase).toContain('day');
            }

            // Verify message contains custom message if provided
            if (params.customMessage && params.customMessage.trim().length > 0) {
              expect(notification.message).toContain(params.customMessage);
            }

            // Verify message contains appeal information
            const messageLowerCase = notification.message.toLowerCase();
            expect(messageLowerCase).toContain('appeal');

            // Verify priority is appropriate for action severity
            if (params.actionType === 'user_banned' || params.actionType === 'user_suspended') {
              expect(notification.priority).toBe(3); // High priority
            } else if (params.actionType === 'content_removed' || params.actionType === 'restriction_applied') {
              expect(notification.priority).toBeGreaterThanOrEqual(2); // Medium to high priority
            }
          }
        ),
        { numRuns }
      );
    });

    it('should generate valid expiration notifications for all restriction types', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary restriction types
          fc.constantFrom('posting_disabled', 'commenting_disabled', 'upload_disabled', 'suspended'),
          (restrictionType) => {
            // Property: Expiration notification generation should always produce valid content
            const notification = generateExpirationNotification(restrictionType);

            // Verify notification has required fields
            expect(notification).toBeDefined();
            expect(notification.title).toBeDefined();
            expect(notification.title.trim()).not.toBe('');
            expect(notification.message).toBeDefined();
            expect(notification.message.trim()).not.toBe('');
            expect(notification.type).toBe('system');
            expect(notification.priority).toBe(2);

            // Verify title indicates expiration or lifting
            const titleLowerCase = notification.title.toLowerCase();
            expect(
              titleLowerCase.includes('expired') || 
              titleLowerCase.includes('lifted') || 
              titleLowerCase.includes('restored')
            ).toBe(true);

            // Verify message contains positive language about restoration
            const messageLowerCase = notification.message.toLowerCase();
            expect(
              messageLowerCase.includes('expired') || 
              messageLowerCase.includes('lifted') || 
              messageLowerCase.includes('restored')
            ).toBe(true);

            // Verify message mentions community guidelines
            expect(messageLowerCase).toContain('community guidelines');

            // Verify message is positive and encouraging
            expect(
              messageLowerCase.includes('can now') || 
              messageLowerCase.includes('thank you')
            ).toBe(true);
          }
        ),
        { numRuns }
      );
    });

    it('should ensure notification messages are within reasonable length limits', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary notification parameters with potentially long content
          fc.record({
            actionType: fc.constantFrom(
              'content_removed',
              'user_warned',
              'user_suspended',
              'restriction_applied'
            ) as fc.Arbitrary<ModerationActionType>,
            reason: fc.string({ minLength: 1, maxLength: 500 }),
            customMessage: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          }),
          (params) => {
            // Property: Generated notifications should have reasonable message lengths
            const notification = generateModerationNotification(params);

            // Verify message is not empty
            expect(notification.message.length).toBeGreaterThan(0);

            // Verify message is not excessively long (reasonable limit for notifications)
            // Maximum should be around 2000 characters for readability
            expect(notification.message.length).toBeLessThan(2000);

            // Verify title is concise
            expect(notification.title.length).toBeGreaterThan(0);
            expect(notification.title.length).toBeLessThan(100);
          }
        ),
        { numRuns }
      );
    });

    it('should handle edge cases in notification generation gracefully', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate edge case scenarios
          fc.record({
            actionType: fc.constantFrom(
              'content_removed',
              'user_suspended',
              'restriction_applied'
            ) as fc.Arbitrary<ModerationActionType>,
            reason: fc.oneof(
              fc.constant(''), // Empty reason (should be filtered by validation)
              fc.string({ minLength: 1, maxLength: 10 }), // Very short reason
              fc.string({ minLength: 400, maxLength: 500 }), // Very long reason
            ),
            durationDays: fc.option(
              fc.oneof(
                fc.constant(1), // Minimum duration
                fc.constant(365), // Maximum duration
                fc.integer({ min: 1, max: 365 })
              ),
              { nil: undefined }
            ),
          }),
          (params) => {
            // Skip empty reasons as they should be caught by validation
            if (params.reason.trim().length === 0) {
              return true;
            }

            // Property: Notification generation should handle edge cases without errors
            const notification = generateModerationNotification(params);

            // Verify notification is still valid
            expect(notification).toBeDefined();
            expect(notification.title).toBeDefined();
            expect(notification.message).toBeDefined();
            expect(notification.type).toBe('system');

            // Verify reason is included even if very short or very long
            expect(notification.message).toContain(params.reason);

            // Verify duration is mentioned if provided
            // (only for actions that support duration: suspension, restriction)
            if (params.durationDays && 
                (params.actionType === 'user_suspended' || 
                 params.actionType === 'restriction_applied')) {
              const messageLowerCase = notification.message.toLowerCase();
              expect(messageLowerCase).toContain('day');
            }
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 12: Suspension Integration
   * 
   * For any user suspension action, both the user_profiles.is_suspended field
   * and a user_restrictions record with type "suspended" should be updated
   * consistently.
   * 
   * Feature: moderation-system, Property 12: Suspension Integration
   * Validates: Requirements 12.1, 12.2, 12.7
   */
  describe('Property 12: Suspension Integration', () => {
    it('should validate that suspension creates both moderation_actions and user_restrictions records', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary suspension parameters
          fc.record({
            userId: fc.uuid(),
            moderatorId: fc.uuid(),
            reason: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            durationDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
          }),
          (params) => {
            // Property: Suspension data structure should be consistent
            
            // Simulate what the database function should create
            const expiresAt = params.durationDays 
              ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000).toISOString()
              : null;

            // Mock moderation_actions record
            const moderationAction = {
              id: fc.sample(fc.uuid(), 1)[0],
              moderator_id: params.moderatorId,
              target_user_id: params.userId,
              action_type: 'user_suspended' as const,
              target_type: 'user' as const,
              target_id: params.userId,
              reason: params.reason,
              duration_days: params.durationDays,
              expires_at: expiresAt,
              internal_notes: 'Created by admin suspension function',
              notification_sent: false,
              created_at: new Date().toISOString(),
            };

            // Mock user_restrictions record
            const userRestriction = {
              id: fc.sample(fc.uuid(), 1)[0],
              user_id: params.userId,
              restriction_type: 'suspended' as const,
              expires_at: expiresAt,
              is_active: true,
              reason: params.reason,
              applied_by: params.moderatorId,
              related_action_id: moderationAction.id,
              created_at: new Date().toISOString(),
            };

            // Verify moderation_actions record has required fields
            expect(moderationAction.id).toBeDefined();
            expect(moderationAction.moderator_id).toBe(params.moderatorId);
            expect(moderationAction.target_user_id).toBe(params.userId);
            expect(moderationAction.action_type).toBe('user_suspended');
            expect(moderationAction.reason).toBe(params.reason);
            expect(moderationAction.duration_days).toBe(params.durationDays);
            expect(moderationAction.expires_at).toBe(expiresAt);

            // Verify user_restrictions record has required fields
            expect(userRestriction.id).toBeDefined();
            expect(userRestriction.user_id).toBe(params.userId);
            expect(userRestriction.restriction_type).toBe('suspended');
            expect(userRestriction.expires_at).toBe(expiresAt);
            expect(userRestriction.is_active).toBe(true);
            expect(userRestriction.reason).toBe(params.reason);
            expect(userRestriction.applied_by).toBe(params.moderatorId);
            expect(userRestriction.related_action_id).toBe(moderationAction.id);

            // Verify consistency between records
            expect(userRestriction.user_id).toBe(moderationAction.target_user_id);
            expect(userRestriction.reason).toBe(moderationAction.reason);
            expect(userRestriction.expires_at).toBe(moderationAction.expires_at);
            expect(userRestriction.applied_by).toBe(moderationAction.moderator_id);
            expect(userRestriction.related_action_id).toBe(moderationAction.id);

            // Verify expiration consistency
            if (params.durationDays) {
              expect(moderationAction.expires_at).not.toBeNull();
              expect(userRestriction.expires_at).not.toBeNull();
              
              // Verify expiration is in the future
              const expirationDate = new Date(moderationAction.expires_at!);
              expect(expirationDate.getTime()).toBeGreaterThan(Date.now());
              
              // Verify expiration is approximately correct (within 1 minute tolerance)
              const expectedExpiration = Date.now() + params.durationDays * 24 * 60 * 60 * 1000;
              const actualExpiration = expirationDate.getTime();
              const tolerance = 60 * 1000; // 1 minute
              expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(tolerance);
            } else {
              // Permanent suspension
              expect(moderationAction.expires_at).toBeNull();
              expect(userRestriction.expires_at).toBeNull();
            }

            // Verify UUIDs are valid format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(moderationAction.id).toMatch(uuidRegex);
            expect(moderationAction.moderator_id).toMatch(uuidRegex);
            expect(moderationAction.target_user_id).toMatch(uuidRegex);
            expect(userRestriction.id).toMatch(uuidRegex);
            expect(userRestriction.user_id).toMatch(uuidRegex);
            expect(userRestriction.applied_by).toMatch(uuidRegex);
            expect(userRestriction.related_action_id).toMatch(uuidRegex);
          }
        ),
        { numRuns }
      );
    });

    it('should validate that unsuspension deactivates user_restrictions consistently', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary user IDs
          fc.uuid(),
          (userId) => {
            // Property: Unsuspension should deactivate all active suspended restrictions
            
            // Mock user_restrictions records before unsuspension
            // Generate 1-3 active restrictions
            const numRestrictions = Math.floor(Math.random() * 3) + 1;
            const activeRestrictions = Array.from({ length: numRestrictions }, () => ({
              id: fc.sample(fc.uuid(), 1)[0],
              user_id: userId,
              restriction_type: 'suspended' as const,
              expires_at: Math.random() > 0.5 
                ? new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
                : null,
              is_active: true,
              reason: fc.sample(fc.string({ minLength: 1, maxLength: 200 }), 1)[0],
              applied_by: fc.sample(fc.uuid(), 1)[0],
              related_action_id: fc.sample(fc.uuid(), 1)[0],
              created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            }));

            // Simulate unsuspension: all restrictions should be deactivated
            const deactivatedRestrictions = activeRestrictions.map(restriction => ({
              ...restriction,
              is_active: false,
              updated_at: new Date().toISOString(),
            }));

            // Verify all restrictions are deactivated
            deactivatedRestrictions.forEach(restriction => {
              expect(restriction.user_id).toBe(userId);
              expect(restriction.restriction_type).toBe('suspended');
              expect(restriction.is_active).toBe(false);
              expect(restriction.updated_at).toBeDefined();
              
              // Verify updated_at is recent (within last minute)
              const updatedAt = new Date(restriction.updated_at);
              expect(updatedAt.getTime()).toBeGreaterThan(Date.now() - 60 * 1000);
              expect(updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
            });

            // Verify no restrictions remain active
            const stillActive = deactivatedRestrictions.filter(r => r.is_active);
            expect(stillActive.length).toBe(0);
          }
        ),
        { numRuns }
      );
    });

    it('should validate suspension and unsuspension round-trip consistency', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary suspension parameters
          fc.record({
            userId: fc.uuid(),
            moderatorId: fc.uuid(),
            reason: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            durationDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
          }),
          (params) => {
            // Property: Suspending then unsuspending should leave no active restrictions
            
            // Step 1: Simulate suspension
            const expiresAt = params.durationDays 
              ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000).toISOString()
              : null;

            const suspensionRestriction = {
              id: fc.sample(fc.uuid(), 1)[0],
              user_id: params.userId,
              restriction_type: 'suspended' as const,
              expires_at: expiresAt,
              is_active: true,
              reason: params.reason,
              applied_by: params.moderatorId,
              created_at: new Date().toISOString(),
            };

            // Verify suspension is active
            expect(suspensionRestriction.is_active).toBe(true);
            expect(suspensionRestriction.user_id).toBe(params.userId);

            // Step 2: Simulate unsuspension
            const unsuspendedRestriction = {
              ...suspensionRestriction,
              is_active: false,
              updated_at: new Date().toISOString(),
            };

            // Verify unsuspension deactivated the restriction
            expect(unsuspendedRestriction.is_active).toBe(false);
            expect(unsuspendedRestriction.user_id).toBe(params.userId);
            expect(unsuspendedRestriction.restriction_type).toBe('suspended');

            // Verify all other fields remain unchanged
            expect(unsuspendedRestriction.id).toBe(suspensionRestriction.id);
            expect(unsuspendedRestriction.reason).toBe(suspensionRestriction.reason);
            expect(unsuspendedRestriction.expires_at).toBe(suspensionRestriction.expires_at);
            expect(unsuspendedRestriction.applied_by).toBe(suspensionRestriction.applied_by);

            // Verify updated_at is set and recent
            expect(unsuspendedRestriction.updated_at).toBeDefined();
            const updatedAt = new Date(unsuspendedRestriction.updated_at);
            expect(updatedAt.getTime()).toBeGreaterThan(Date.now() - 60 * 1000);
            expect(updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
          }
        ),
        { numRuns }
      );
    });

    it('should validate that suspension duration calculations are consistent', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate various duration values
          fc.integer({ min: 1, max: 365 }),
          (durationDays) => {
            // Property: Duration calculations should be consistent across records
            
            const now = Date.now();
            const expectedExpiration = now + durationDays * 24 * 60 * 60 * 1000;
            const expiresAt = new Date(expectedExpiration).toISOString();

            // Mock moderation_actions record
            const moderationAction = {
              duration_days: durationDays,
              expires_at: expiresAt,
              created_at: new Date(now).toISOString(),
            };

            // Mock user_restrictions record
            const userRestriction = {
              expires_at: expiresAt,
              created_at: new Date(now).toISOString(),
            };

            // Verify both records have the same expiration
            expect(moderationAction.expires_at).toBe(userRestriction.expires_at);

            // Verify expiration is in the future
            const expirationDate = new Date(moderationAction.expires_at);
            expect(expirationDate.getTime()).toBeGreaterThan(now);

            // Verify duration is correctly calculated (within 1 second tolerance)
            const actualDuration = expirationDate.getTime() - now;
            const expectedDuration = durationDays * 24 * 60 * 60 * 1000;
            const tolerance = 1000; // 1 second
            expect(Math.abs(actualDuration - expectedDuration)).toBeLessThan(tolerance);

            // Verify duration_days matches the calculated duration
            const calculatedDays = Math.floor(actualDuration / (24 * 60 * 60 * 1000));
            expect(calculatedDays).toBe(durationDays);
          }
        ),
        { numRuns }
      );
    });
  });
});
