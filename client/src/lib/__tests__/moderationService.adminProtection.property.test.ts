/**
 * Property-Based Tests for Moderation Service - Admin Protection
 * 
 * These tests use fast-check to verify universal properties that should hold
 * for admin protection in the reporting system.
 * 
 * Feature: user-profile-flagging, Property 8: Admin Protection Prevents Admin Reports
 * Validates: Requirements 2.7, 2.8
 */

import fc from 'fast-check';
import { submitReport } from '@/lib/moderationService';
import { ModerationError, MODERATION_ERROR_CODES, ReportParams } from '@/types/moderation';
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

describe('Moderation Service - Property 8: Admin Protection Prevents Admin Reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 8: Admin Protection Prevents Admin Reports
   * 
   * For any user attempting to report a user profile where the target user has
   * an active admin role, the report should be rejected with an admin protection error.
   * 
   * Feature: user-profile-flagging, Property 8: Admin Protection Prevents Admin Reports
   * Validates: Requirements 2.7, 2.8
   */
  it('should prevent reporting admin accounts across all report reasons', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary report reasons
        fc.constantFrom(
          'spam',
          'harassment',
          'hate_speech',
          'inappropriate_content',
          'copyright_violation',
          'impersonation',
          'self_harm',
          'other'
        ),
        // Generate arbitrary user IDs
        fc.uuid(),
        fc.uuid(),
        // Generate arbitrary description (for 'other' reason)
        fc.string({ minLength: 1, maxLength: 100 }),
        async (reason, reporterId, adminId, description) => {
          // Setup: Mock authenticated user
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: reporterId } },
            error: null,
          });

          // Setup: Mock no duplicate report
          const mockFrom = jest.fn((table: string) => {
            if (table === 'moderation_reports') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        gte: jest.fn().mockReturnValue({
                          maybeSingle: jest.fn().mockResolvedValue({
                            data: null, // No duplicate
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      // Return admin role for target user
                      then: jest.fn().mockResolvedValue({
                        data: [{ role_type: 'admin' }],
                        error: null,
                      }),
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
                  gte: jest.fn().mockReturnValue({
                    then: jest.fn().mockResolvedValue({ error: null, count: 0 }),
                  }),
                }),
              }),
            };
          });
          (supabase.from as jest.Mock).mockImplementation(mockFrom);

          // Create report params
          const params: ReportParams = {
            reportType: 'user',
            targetId: adminId,
            reason: reason as ReportParams['reason'],
            description: reason === 'other' ? description : undefined,
          };

          // Property: Reporting admin accounts should always fail
          try {
            await submitReport(params);
            // If we reach here, the test should fail
            expect(true).toBe(false); // Force failure
          } catch (error) {
            // Verify it's a ModerationError with correct code
            expect(error).toBeInstanceOf(ModerationError);
            if (error instanceof ModerationError) {
              expect(error.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
              expect(error.message).toContain('cannot be reported');
            }
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Property 8: Security Event Logging for Admin Report Attempts
   * 
   * For any user attempting to report an admin account, a security event should
   * be logged with the appropriate event type and details.
   * 
   * Feature: user-profile-flagging, Property 8: Admin Protection Prevents Admin Reports
   * Validates: Requirements 2.7, 2.8
   */
  it('should log security events for all admin report attempts', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary user IDs
        fc.uuid(),
        fc.uuid(),
        async (reporterId, adminId) => {
          // Setup: Mock authenticated user
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: reporterId } },
            error: null,
          });

          const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

          // Setup: Mock no duplicate report and admin role check
          const mockFrom = jest.fn((table: string) => {
            if (table === 'moderation_reports') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        gte: jest.fn().mockReturnValue({
                          maybeSingle: jest.fn().mockResolvedValue({
                            data: null, // No duplicate
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      // Return admin role for target user
                      then: jest.fn().mockResolvedValue({
                        data: [{ role_type: 'admin' }],
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'security_events') {
              return {
                insert: mockInsert,
              };
            }
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    then: jest.fn().mockResolvedValue({ error: null, count: 0 }),
                  }),
                }),
              }),
            };
          });
          (supabase.from as jest.Mock).mockImplementation(mockFrom);

          // Create report params
          const params: ReportParams = {
            reportType: 'user',
            targetId: adminId,
            reason: 'spam',
          };

          // Property: Security event should be logged for admin report attempts
          try {
            await submitReport(params);
          } catch (error) {
            // Expected to throw
          }

          // Verify security event was logged
          expect(mockInsert).toHaveBeenCalled();
          const loggedEvent = mockInsert.mock.calls[0][0];
          expect(loggedEvent.event_type).toBe('admin_report_attempt');
          expect(loggedEvent.user_id).toBe(reporterId);
          expect(loggedEvent.details).toHaveProperty('targetUserId', adminId);
          expect(loggedEvent.details).toHaveProperty('reportType', 'user');
        }
      ),
      { numRuns }
    );
  });

  /**
   * Property 8: Admin Protection Only Applies to User Reports
   * 
   * For any content report (post, comment, track), admin protection should NOT
   * be applied, even if the content owner is an admin.
   * 
   * Feature: user-profile-flagging, Property 8: Admin Protection Prevents Admin Reports
   * Validates: Requirements 2.7, 2.8
   */
  it('should not apply admin protection to content reports', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.asyncProperty(
        // Generate arbitrary content types (not 'user')
        fc.constantFrom('post', 'comment', 'track'),
        // Generate arbitrary user IDs
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (contentType, reporterId, contentId, adminOwnerId) => {
          // Setup: Mock authenticated user
          (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: reporterId } },
            error: null,
          });

          const mockInsert = jest.fn().mockResolvedValue({
            data: {
              id: 'report-123',
              reporter_id: reporterId,
              report_type: contentType,
              target_id: contentId,
              reason: 'spam',
              status: 'pending',
            },
            error: null,
          });

          // Setup: Mock no duplicate report, content owned by admin
          const mockFrom = jest.fn((table: string) => {
            if (table === 'moderation_reports') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        gte: jest.fn().mockReturnValue({
                          maybeSingle: jest.fn().mockResolvedValue({
                            data: null, // No duplicate
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
                insert: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: mockInsert,
                  }),
                }),
              };
            }
            if (table === 'user_roles') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      // Return admin role for content owner
                      then: jest.fn().mockResolvedValue({
                        data: [{ role_type: 'admin' }],
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            // Mock content lookup returning admin as owner
            if (table === 'posts' || table === 'comments' || table === 'tracks') {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: { user_id: adminOwnerId },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    then: jest.fn().mockResolvedValue({ error: null, count: 0 }),
                  }),
                }),
              }),
            };
          });
          (supabase.from as jest.Mock).mockImplementation(mockFrom);

          // Create report params
          const params: ReportParams = {
            reportType: contentType as 'post' | 'comment' | 'track',
            targetId: contentId,
            reason: 'spam',
          };

          // Property: Content reports should succeed even if owner is admin
          const result = await submitReport(params);

          // Verify report was created successfully
          expect(result).toBeDefined();
          expect(result.reporter_id).toBe(reporterId);
          expect(result.report_type).toBe(contentType);
          expect(result.target_id).toBe(contentId);
        }
      ),
      { numRuns }
    );
  });
});
