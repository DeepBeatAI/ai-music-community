/**
 * Property-Based Tests for Album Flagging System - Admin Protection
 * 
 * These tests use fast-check to verify universal properties that should hold
 * for admin protection in the album moderation system.
 * 
 * Feature: album-flagging-system, Property 13: Admin Account Protection
 * Validates: Requirements 8.5, 9.4
 */

import fc from 'fast-check';
import { takeModerationAction } from '@/lib/moderationService';
import { ModerationError, MODERATION_ERROR_CODES, ModerationActionParams } from '@/types/moderation';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('Album Flagging System - Property 13: Admin Account Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 13: Admin Account Protection for Album Actions
   * 
   * For any moderator attempting to take a moderation action on an album owned by
   * an admin account, the action should be rejected with an insufficient permissions error.
   * 
   * Feature: album-flagging-system, Property 13: Admin Account Protection
   * Validates: Requirements 8.5, 9.4
   */
  it('should prevent moderators from taking actions on admin-owned albums', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary action types
        fc.constantFrom(
          'content_removed',
          'content_approved',
          'user_warned'
        ),
        // Generate arbitrary user IDs
        fc.uuid(), // moderatorId
        fc.uuid(), // adminOwnerId
        fc.uuid(), // albumId
        fc.uuid(), // reportId
        // Generate arbitrary reason
        fc.string({ minLength: 10, maxLength: 100 }),
        async (actionType, moderatorId, adminOwnerId, albumId, reportId, reason) => {
          // Setup: Mock authenticated moderator (not admin)
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: moderatorId } },
            error: null,
          });

          // Setup: Mock database queries
          const mockFrom = jest.fn((table: string) => {
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn((field: string, value: string) => {
                      // Return moderator role for current user, admin role for target
                      const roleData = value === moderatorId 
                        ? [{ role_type: 'moderator' }]
                        : [{ role_type: 'admin' }];
                      
                      return {
                        then: jest.fn().mockResolvedValue({
                          data: roleData,
                          error: null,
                        }),
                      };
                    }),
                  }),
                }),
              };
            }
            if (table === 'moderation_reports') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      then: jest.fn().mockResolvedValue({ error: null, count: 0 }),
                    }),
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: reportId,
                        report_type: 'album',
                        target_id: albumId,
                        reporter_id: 'some-user',
                        reported_user_id: adminOwnerId,
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            if (table === 'security_events') {
              return {
                insert: jest.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          });
          (supabase.from as jest.Mock).mockImplementation(mockFrom);

          // Create moderation action params
          const params: ModerationActionParams = {
            reportId,
            actionType: actionType as ModerationActionParams['actionType'],
            targetUserId: adminOwnerId,
            targetType: 'album',
            targetId: albumId,
            reason,
          };

          // Property: Moderators cannot take actions on admin-owned albums
          try {
            await takeModerationAction(params);
            // If we reach here, the test should fail
            expect(true).toBe(false); // Force failure
          } catch (error) {
            // Verify it's a ModerationError with correct code
            expect(error).toBeInstanceOf(ModerationError);
            if (error instanceof ModerationError) {
              expect(error.code).toBe(MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS);
              expect(error.message).toContain('Moderators cannot take actions on admin accounts');
            }
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Property 13: Security Event Logging for Admin Album Action Attempts
   * 
   * For any moderator attempting to take action on an admin-owned album, a security
   * event should be logged with the appropriate event type and details.
   * 
   * Feature: album-flagging-system, Property 13: Admin Account Protection
   * Validates: Requirements 8.5, 9.4
   */
  it('should log security events for all admin album action attempts', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user IDs
        fc.uuid(), // moderatorId
        fc.uuid(), // adminOwnerId
        fc.uuid(), // albumId
        fc.uuid(), // reportId
        async (moderatorId, adminOwnerId, albumId, reportId) => {
          // Setup: Mock authenticated moderator (not admin)
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: moderatorId } },
            error: null,
          });

          const mockSecurityInsert = jest.fn().mockResolvedValue({ data: null, error: null });

          // Setup: Mock database queries
          const mockFrom = jest.fn((table: string) => {
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn((field: string, value: string) => {
                      // Return moderator role for current user, admin role for target
                      const roleData = value === moderatorId 
                        ? [{ role_type: 'moderator' }]
                        : [{ role_type: 'admin' }];
                      
                      return {
                        then: jest.fn().mockResolvedValue({
                          data: roleData,
                          error: null,
                        }),
                      };
                    }),
                  }),
                }),
              };
            }
            if (table === 'moderation_reports') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      then: jest.fn().mockResolvedValue({ error: null, count: 0 }),
                    }),
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: reportId,
                        report_type: 'album',
                        target_id: albumId,
                        reporter_id: 'some-user',
                        reported_user_id: adminOwnerId,
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            if (table === 'security_events') {
              return {
                insert: mockSecurityInsert,
              };
            }
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          });
          (supabase.from as jest.Mock).mockImplementation(mockFrom);

          // Create moderation action params
          const params: ModerationActionParams = {
            reportId,
            actionType: 'content_removed',
            targetUserId: adminOwnerId,
            targetType: 'album',
            targetId: albumId,
            reason: 'Test reason',
          };

          // Property: Security event should be logged for admin album action attempts
          try {
            await takeModerationAction(params);
          } catch (error) {
            // Expected to throw
          }

          // Verify security event was logged
          expect(mockSecurityInsert).toHaveBeenCalled();
          const loggedEvent = mockSecurityInsert.mock.calls[0][0];
          expect(loggedEvent.event_type).toBe('unauthorized_action_on_admin');
          expect(loggedEvent.user_id).toBe(moderatorId);
          expect(loggedEvent.details).toHaveProperty('targetUserId', adminOwnerId);
          expect(loggedEvent.details).toHaveProperty('attemptedAction', 'content_removed');
          expect(loggedEvent.details).toHaveProperty('reportId', reportId);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Property 13: Admins Can Take Actions on Admin-Owned Albums
   * 
   * For any admin attempting to take a moderation action on an album owned by
   * another admin account, the action should succeed (admins can moderate other admins).
   * 
   * Feature: album-flagging-system, Property 13: Admin Account Protection
   * Validates: Requirements 8.5, 9.4
   */
  it('should allow admins to take actions on admin-owned albums', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user IDs
        fc.uuid(), // adminModeratorId
        fc.uuid(), // adminOwnerId
        fc.uuid(), // albumId
        fc.uuid(), // reportId
        // Generate arbitrary reason
        fc.string({ minLength: 10, maxLength: 100 }),
        async (adminModeratorId, adminOwnerId, albumId, reportId, reason) => {
          // Setup: Mock authenticated admin
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: adminModeratorId } },
            error: null,
          });

          const mockActionInsert = jest.fn().mockResolvedValue({
            data: {
              id: 'action-123',
              moderator_id: adminModeratorId,
              target_user_id: adminOwnerId,
              action_type: 'content_removed',
              target_type: 'album',
              target_id: albumId,
              reason,
            },
            error: null,
          });

          // Setup: Mock database queries
          const mockFrom = jest.fn((table: string) => {
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn(() => {
                      // Both users are admins
                      return {
                        then: jest.fn().mockResolvedValue({
                          data: [{ role_type: 'admin' }],
                          error: null,
                        }),
                      };
                    }),
                  }),
                }),
              };
            }
            if (table === 'moderation_reports') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      then: jest.fn().mockResolvedValue({ error: null, count: 0 }),
                    }),
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: reportId,
                        report_type: 'album',
                        target_id: albumId,
                        reporter_id: 'some-user',
                        reported_user_id: adminOwnerId,
                      },
                      error: null,
                    }),
                  }),
                }),
                update: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              };
            }
            if (table === 'moderation_actions') {
              return {
                insert: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: mockActionInsert,
                  }),
                }),
                update: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              };
            }
            if (table === 'albums') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: {
                        id: albumId,
                        user_id: adminOwnerId,
                        name: 'Test Album',
                        album_tracks: [],
                      },
                      error: null,
                    }),
                  }),
                }),
                delete: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                      data: [{ id: albumId }],
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          });
          (supabase.from as jest.Mock).mockImplementation(mockFrom);

          // Mock the sendModerationNotification import
          jest.mock('@/lib/moderationNotifications', () => ({
            sendModerationNotification: jest.fn().mockResolvedValue('notification-123'),
          }));

          // Create moderation action params
          const params: ModerationActionParams = {
            reportId,
            actionType: 'content_removed',
            targetUserId: adminOwnerId,
            targetType: 'album',
            targetId: albumId,
            reason,
            cascadingOptions: {
              removeAlbum: true,
              removeTracks: false,
            },
          };

          // Property: Admins can take actions on admin-owned albums
          const result = await takeModerationAction(params);

          // Verify action was created successfully
          expect(result).toBeDefined();
          expect(result.moderator_id).toBe(adminModeratorId);
          expect(result.target_user_id).toBe(adminOwnerId);
          expect(result.target_type).toBe('album');
          expect(result.target_id).toBe(albumId);
        }
      ),
      { numRuns }
    );
  });
});
