/**
 * Property-Based Tests for Album Flagging System - Authorization Verification
 * 
 * These tests use fast-check to verify universal properties that should hold
 * for authorization checks in the album moderation system.
 * 
 * Feature: album-flagging-system, Property 14: Authorization Verification
 * Validates: Requirements 9.1
 */

import fc from 'fast-check';
import { takeModerationAction, fetchAlbumContext } from '@/lib/moderationService';
import { ModerationError, MODERATION_ERROR_CODES, ModerationActionParams } from '@/types/moderation';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('Album Flagging System - Property 14: Authorization Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 14: Authorization Verification for Album Actions
   * 
   * For any user attempting to take a moderation action on an album without
   * moderator or admin role, the action should be rejected with an unauthorized error.
   * 
   * Feature: album-flagging-system, Property 14: Authorization Verification
   * Validates: Requirements 9.1
   */
  it('should reject album moderation actions from non-moderators', () => {
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
        fc.uuid(), // regularUserId
        fc.uuid(), // targetUserId
        fc.uuid(), // albumId
        fc.uuid(), // reportId
        // Generate arbitrary reason
        fc.string({ minLength: 10, maxLength: 100 }),
        async (actionType, regularUserId, targetUserId, albumId, reportId, reason) => {
          // Setup: Mock authenticated regular user (not moderator/admin)
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: regularUserId } },
            error: null,
          });

          // Setup: Mock database queries
          const mockFrom = jest.fn((table: string) => {
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      // Return empty array (no moderator/admin role)
                      then: jest.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
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
                        reported_user_id: targetUserId,
                      },
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

          // Create moderation action params
          const params: ModerationActionParams = {
            reportId,
            actionType: actionType as ModerationActionParams['actionType'],
            targetUserId,
            targetType: 'album',
            targetId: albumId,
            reason,
          };

          // Property: Non-moderators cannot take album moderation actions
          try {
            await takeModerationAction(params);
            // If we reach here, the test should fail
            expect(true).toBe(false); // Force failure
          } catch (error) {
            // Verify it's a ModerationError with correct code
            expect(error).toBeInstanceOf(ModerationError);
            if (error instanceof ModerationError) {
              expect(error.code).toBe(MODERATION_ERROR_CODES.UNAUTHORIZED);
              expect(error.message).toContain('Only moderators and admins can take moderation actions');
            }
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Property 14: Authorization Verification for Album Context Access
   * 
   * For any user attempting to fetch album context without moderator or admin role,
   * the request should be rejected with an unauthorized error.
   * 
   * Feature: album-flagging-system, Property 14: Authorization Verification
   * Validates: Requirements 9.1
   */
  it('should reject album context access from non-moderators', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user IDs
        fc.uuid(), // regularUserId
        fc.uuid(), // albumId
        async (regularUserId, albumId) => {
          // Setup: Mock authenticated regular user (not moderator/admin)
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: regularUserId } },
            error: null,
          });

          // Setup: Mock database queries
          const mockFrom = jest.fn((table: string) => {
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      // Return empty array (no moderator/admin role)
                      then: jest.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
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

          // Property: Non-moderators cannot access album context
          try {
            await fetchAlbumContext(albumId);
            // If we reach here, the test should fail
            expect(true).toBe(false); // Force failure
          } catch (error) {
            // Verify it's a ModerationError with correct code
            expect(error).toBeInstanceOf(ModerationError);
            if (error instanceof ModerationError) {
              expect(error.code).toBe(MODERATION_ERROR_CODES.UNAUTHORIZED);
              expect(error.message).toContain('Only moderators and admins');
            }
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Property 14: Moderators Can Take Album Actions
   * 
   * For any user with moderator role attempting to take a moderation action on an album,
   * the action should succeed (assuming no other restrictions like admin protection).
   * 
   * Feature: album-flagging-system, Property 14: Authorization Verification
   * Validates: Requirements 9.1
   */
  it('should allow moderators to take album moderation actions', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user IDs
        fc.uuid(), // moderatorId
        fc.uuid(), // targetUserId (not admin)
        fc.uuid(), // albumId
        fc.uuid(), // reportId
        // Generate arbitrary reason
        fc.string({ minLength: 10, maxLength: 100 }),
        async (moderatorId, targetUserId, albumId, reportId, reason) => {
          // Setup: Mock authenticated moderator
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: moderatorId } },
            error: null,
          });

          const mockActionInsert = jest.fn().mockResolvedValue({
            data: {
              id: 'action-123',
              moderator_id: moderatorId,
              target_user_id: targetUserId,
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
                    eq: jest.fn((field: string, value: string) => {
                      // Return moderator role for current user, no role for target
                      const roleData = value === moderatorId 
                        ? [{ role_type: 'moderator' }]
                        : [];
                      
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
                        reported_user_id: targetUserId,
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
                        user_id: targetUserId,
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
            targetUserId,
            targetType: 'album',
            targetId: albumId,
            reason,
            cascadingOptions: {
              removeAlbum: true,
              removeTracks: false,
            },
          };

          // Property: Moderators can take album moderation actions
          const result = await takeModerationAction(params);

          // Verify action was created successfully
          expect(result).toBeDefined();
          expect(result.moderator_id).toBe(moderatorId);
          expect(result.target_user_id).toBe(targetUserId);
          expect(result.target_type).toBe('album');
          expect(result.target_id).toBe(albumId);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Property 14: Admins Can Take Album Actions
   * 
   * For any user with admin role attempting to take a moderation action on an album,
   * the action should succeed.
   * 
   * Feature: album-flagging-system, Property 14: Authorization Verification
   * Validates: Requirements 9.1
   */
  it('should allow admins to take album moderation actions', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user IDs
        fc.uuid(), // adminId
        fc.uuid(), // targetUserId
        fc.uuid(), // albumId
        fc.uuid(), // reportId
        // Generate arbitrary reason
        fc.string({ minLength: 10, maxLength: 100 }),
        async (adminId, targetUserId, albumId, reportId, reason) => {
          // Setup: Mock authenticated admin
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: adminId } },
            error: null,
          });

          const mockActionInsert = jest.fn().mockResolvedValue({
            data: {
              id: 'action-123',
              moderator_id: adminId,
              target_user_id: targetUserId,
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
                    eq: jest.fn((field: string, value: string) => {
                      // Return admin role for current user, no role for target
                      const roleData = value === adminId 
                        ? [{ role_type: 'admin' }]
                        : [];
                      
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
                        reported_user_id: targetUserId,
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
                        user_id: targetUserId,
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
            targetUserId,
            targetType: 'album',
            targetId: albumId,
            reason,
            cascadingOptions: {
              removeAlbum: true,
              removeTracks: false,
            },
          };

          // Property: Admins can take album moderation actions
          const result = await takeModerationAction(params);

          // Verify action was created successfully
          expect(result).toBeDefined();
          expect(result.moderator_id).toBe(adminId);
          expect(result.target_user_id).toBe(targetUserId);
          expect(result.target_type).toBe('album');
          expect(result.target_id).toBe(albumId);
        }
      ),
      { numRuns }
    );
  });
});
