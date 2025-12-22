/**
 * Security Tests for Moderation Service
 * 
 * Tests for:
 * - SQL injection prevention
 * - XSS prevention
 * - Input validation
 * - Authorization checks
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 * 
 * Note: These tests focus on input validation and sanitization logic.
 * Integration tests for authorization and RLS policies are in separate files.
 */

import {
  submitReport,
  takeModerationAction,
  applyRestriction,
} from '@/lib/moderationService';
import {
  ModerationError,
  MODERATION_ERROR_CODES,
  ReportParams,
  ModerationActionParams,
} from '@/types/moderation';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

describe('Moderation Service - Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in UUID parameters', async () => {
      const invalidUUID = "12345678-1234-1234-1234-123456789012'; DROP TABLE users; --";

      const params: ReportParams = {
        reportType: 'post',
        targetId: invalidUUID,
        reason: 'spam',
      };

      await expect(submitReport(params)).rejects.toThrow(ModerationError);
      await expect(submitReport(params)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('should validate UUID format strictly', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '12345678-1234-1234-1234-12345678901', // Too short
        '12345678-1234-1234-1234-1234567890123', // Too long
      ];

      for (const invalidUUID of invalidUUIDs) {
        const params: ReportParams = {
          reportType: 'post',
          targetId: invalidUUID,
          reason: 'spam',
        };

        await expect(submitReport(params)).rejects.toThrow(ModerationError);
        await expect(submitReport(params)).rejects.toMatchObject({
          code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
        });
      }
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid action types', async () => {
      const params = {
        reportId: '12345678-1234-1234-1234-123456789012',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actionType: 'invalid_action' as any,
        targetUserId: '87654321-4321-4321-4321-210987654321',
        reason: 'Test reason',
      };

      await expect(takeModerationAction(params)).rejects.toThrow(ModerationError);
      await expect(takeModerationAction(params)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('should reject invalid report types', async () => {
      const params = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reportType: 'invalid_type' as any,
        targetId: '12345678-1234-1234-1234-123456789012',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reason: 'spam' as any,
      };

      await expect(submitReport(params)).rejects.toThrow(ModerationError);
      await expect(submitReport(params)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('should reject invalid restriction types', async () => {
      const mockUser = { id: 'moderator-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Test with an invalid restriction type by casting
      const invalidType = 'invalid_restriction' as 'posting_disabled';
      
      await expect(
        applyRestriction(
          '87654321-4321-4321-4321-210987654321',
          invalidType,
          'Test reason'
        )
      ).rejects.toThrow();
    });

    it('should enforce text length limits', async () => {
      const mockUser = { id: 'user-123' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const longDescription = 'a'.repeat(1001);

      const params: ReportParams = {
        reportType: 'post',
        targetId: '12345678-1234-1234-1234-123456789012',
        reason: 'other',
        description: longDescription,
      };

      await expect(submitReport(params)).rejects.toThrow(ModerationError);
      await expect(submitReport(params)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('should require description when reason is "other"', async () => {
      const params: ReportParams = {
        reportType: 'post',
        targetId: '12345678-1234-1234-1234-123456789012',
        reason: 'other',
      };

      await expect(submitReport(params)).rejects.toThrow(ModerationError);
      await expect(submitReport(params)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('should validate duration days range', async () => {
      const params: ModerationActionParams = {
        reportId: '12345678-1234-1234-1234-123456789012',
        actionType: 'user_suspended',
        targetUserId: '87654321-4321-4321-4321-210987654321',
        reason: 'Test reason',
        durationDays: 400, // Exceeds max of 365
      };

      await expect(takeModerationAction(params)).rejects.toThrow(ModerationError);
      await expect(takeModerationAction(params)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
      });
    });
  });

  /**
   * Security Event Logging Tests
   * Requirements: 2.9, 2.10, 6.2, 6.3, 6.4, 6.7
   */
  describe('Security Event Logging', () => {
    /**
     * Test duplicate attempt logging
     * Requirements: 2.9, 2.10, 6.3, 6.7
     */
    it('should log security event for duplicate report attempts with all required fields', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database responses
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { created_at: '2025-01-01T00:00:00Z' },
                        error: null,
                      }),
                    }),
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
        // Mock content lookup tables (posts, comments, tracks)
        if (table === 'posts' || table === 'comments' || table === 'tracks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: 'other-user-id' }, // Different user owns the content
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const params: ReportParams = {
        reportType: 'post',
        targetId: '12345678-1234-1234-1234-123456789012',
        reason: 'spam',
      };

      try {
        await submitReport(params);
      } catch (error) {
        // Expected to throw duplicate error
      }

      // Verify security event was logged with required fields
      expect(mockInsert).toHaveBeenCalled();
      const loggedEvent = mockInsert.mock.calls[0][0];
      expect(loggedEvent.event_type).toBe('duplicate_report_attempt');
      expect(loggedEvent.user_id).toBe('user-123');
      expect(loggedEvent.details).toHaveProperty('reportType', 'post');
      expect(loggedEvent.details).toHaveProperty('targetId', '12345678-1234-1234-1234-123456789012');
      expect(loggedEvent.details).toHaveProperty('originalReportDate');
      expect(loggedEvent.details).toHaveProperty('timestamp');
    });

    /**
     * Test rate limit logging
     * Requirements: 2.9, 2.10, 6.2, 6.7
     */
    it('should log security event for rate limit violations with report_type', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database responses
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 10, // At rate limit
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
              gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const params: ReportParams = {
        reportType: 'comment',
        targetId: '12345678-1234-1234-1234-123456789012',
        reason: 'harassment',
      };

      try {
        await submitReport(params);
      } catch (error) {
        // Expected to throw rate limit error
      }

      // Verify security event was logged with report_type
      expect(mockInsert).toHaveBeenCalled();
      const loggedEvent = mockInsert.mock.calls[0][0];
      expect(loggedEvent.event_type).toBe('rate_limit_exceeded');
      expect(loggedEvent.user_id).toBe('user-123');
      expect(loggedEvent.details).toHaveProperty('reportType', 'comment');
      expect(loggedEvent.details).toHaveProperty('reportCount', 10);
      expect(loggedEvent.details).toHaveProperty('limit', 10);
      expect(loggedEvent.details).toHaveProperty('timestamp');
    });

    /**
     * Test admin protection logging
     * Requirements: 2.9, 2.10, 6.4, 6.7
     */
    it('should log security event for admin report attempts with all required fields', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database responses
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 0,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'admin' }],
                  error: null,
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
              gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const params: ReportParams = {
        reportType: 'user',
        targetId: 'admin-user-id',
        reason: 'spam',
      };

      try {
        await submitReport(params);
        fail('Should have thrown admin protection error');
      } catch (error) {
        // Expected to throw admin protection error
      }

      // Verify security event was logged with all required fields
      expect(mockInsert).toHaveBeenCalled();
      const loggedEvent = mockInsert.mock.calls[0][0];
      expect(loggedEvent.event_type).toBe('admin_report_attempt');
      expect(loggedEvent.user_id).toBe('user-123');
      expect(loggedEvent.details).toHaveProperty('targetUserId', 'admin-user-id');
      expect(loggedEvent.details).toHaveProperty('reportType', 'user');
      expect(loggedEvent.details).toHaveProperty('targetId', 'admin-user-id');
      expect(loggedEvent.details).toHaveProperty('timestamp');
    });

    /**
     * Test that user_agent is included when available
     * Requirements: 6.5, 6.7
     */
    it('should include user_agent in security event logs when available', async () => {
      // Mock window.navigator.userAgent
      const originalWindow = global.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).window = {
        navigator: { userAgent: 'Mozilla/5.0 Test Browser' },
      };

      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database responses for duplicate detection
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { created_at: '2025-01-01T00:00:00Z' },
                        error: null,
                      }),
                    }),
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
        // Mock content lookup tables
        if (table === 'tracks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: 'other-user-id' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const params: ReportParams = {
        reportType: 'track',
        targetId: '12345678-1234-1234-1234-123456789012',
        reason: 'copyright_violation',
      };

      try {
        await submitReport(params);
      } catch (error) {
        // Expected to throw duplicate error
      }

      // Verify user_agent was included
      expect(mockInsert).toHaveBeenCalled();
      const loggedEvent = mockInsert.mock.calls[0][0];
      expect(loggedEvent.details).toHaveProperty('user_agent');
      expect(typeof loggedEvent.details.user_agent).toBe('string');
      expect(loggedEvent.details.user_agent.length).toBeGreaterThan(0);

      // Restore original window
      global.window = originalWindow;
    });
  });

  /**
   * Error Message Consistency Tests
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8
   */
  describe('Error Message Consistency', () => {
    /**
     * Test duplicate error messages for all report types
     * Requirements: 8.3, 8.8
     */
    it('should have consistent duplicate error message format for all report types', async () => {
      const reportTypes: Array<'post' | 'comment' | 'track' | 'user'> = ['post', 'comment', 'track', 'user'];
      const expectedLabels = {
        post: 'post',
        comment: 'comment',
        track: 'track',
        user: 'user',
      };

      for (const reportType of reportTypes) {
        // Mock authenticated user
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        // Mock database responses for duplicate detection
        const mockFrom = jest.fn((table: string) => {
          if (table === 'moderation_reports') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      gte: jest.fn().mockReturnValue({
                        maybeSingle: jest.fn().mockResolvedValue({
                          data: { created_at: '2025-01-01T00:00:00Z' },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'security_events') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            };
          }
          // Mock content lookup tables
          if (table === 'posts' || table === 'comments' || table === 'tracks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { user_id: 'other-user-id' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
              }),
            }),
          };
        });
        (supabase.from as jest.Mock).mockImplementation(mockFrom);

        const params: ReportParams = {
          reportType,
          targetId: '12345678-1234-1234-1234-123456789012',
          reason: 'spam',
        };

        try {
          await submitReport(params);
          fail('Should have thrown duplicate error');
        } catch (error) {
          expect(error).toBeInstanceOf(ModerationError);
          const modError = error as ModerationError;
          
          // Verify error message format is consistent
          const expectedMessage = `You have already reported this ${expectedLabels[reportType]} recently. Please wait 24 hours before reporting again.`;
          expect(modError.message).toBe(expectedMessage);
          
          // Verify error code
          expect(modError.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
          
          // Verify error details
          expect(modError.details).toHaveProperty('reportType', reportType);
          expect(modError.details).toHaveProperty('targetId');
          expect(modError.details).toHaveProperty('originalReportDate');
        }
      }
    });

    /**
     * Test rate limit error message format
     * Requirements: 8.2, 8.7
     */
    it('should have consistent rate limit error message format', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database responses for rate limit
      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 10, // At rate limit
                }),
              }),
            }),
          };
        }
        if (table === 'security_events') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        // Mock content lookup tables
        if (table === 'posts' || table === 'comments' || table === 'tracks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: 'other-user-id' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const params: ReportParams = {
        reportType: 'post',
        targetId: '12345678-1234-1234-1234-123456789012',
        reason: 'spam',
      };

      try {
        await submitReport(params);
        fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        const modError = error as ModerationError;
        
        // Verify error message format
        expect(modError.message).toBe('You have exceeded the report limit of 10 reports per 24 hours. Please try again later.');
        
        // Verify error code
        expect(modError.code).toBe(MODERATION_ERROR_CODES.RATE_LIMIT_EXCEEDED);
        
        // Verify error details
        expect(modError.details).toHaveProperty('reportCount', 10);
        expect(modError.details).toHaveProperty('limit', 10);
      }
    });

    /**
     * Test self-report error messages for all content types
     * Requirements: 8.5, 8.6, 8.7
     */
    it('should have consistent self-report error message format for all content types', async () => {
      const contentTypes: Array<'post' | 'comment' | 'track'> = ['post', 'comment', 'track'];
      const expectedLabels = {
        post: 'post',
        comment: 'comment',
        track: 'track',
      };

      for (const reportType of contentTypes) {
        // Mock authenticated user
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        // Mock database responses
        const mockFrom = jest.fn((table: string) => {
          if (table === 'moderation_reports') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      gte: jest.fn().mockReturnValue({
                        maybeSingle: jest.fn().mockResolvedValue({
                          data: null,
                          error: null,
                        }),
                      }),
                    }),
                  }),
                  gte: jest.fn().mockResolvedValue({
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            };
          }
          // Mock content lookup to return user as owner
          if (table === 'posts' || table === 'comments' || table === 'tracks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { user_id: 'user-123' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
              }),
            }),
          };
        });
        (supabase.from as jest.Mock).mockImplementation(mockFrom);

        const params: ReportParams = {
          reportType,
          targetId: '12345678-1234-1234-1234-123456789012',
          reason: 'spam',
        };

        try {
          await submitReport(params);
          fail('Should have thrown self-report error');
        } catch (error) {
          expect(error).toBeInstanceOf(ModerationError);
          const modError = error as ModerationError;
          
          // Verify error message format is consistent
          const expectedMessage = `You cannot report your own ${expectedLabels[reportType]}`;
          expect(modError.message).toBe(expectedMessage);
          
          // Verify error code
          expect(modError.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
          
          // Verify error details
          expect(modError.details).toHaveProperty('userId', 'user-123');
          expect(modError.details).toHaveProperty('targetId');
        }
      }
    });

    /**
     * Test self-report error message for user profile
     * Requirements: 8.5, 8.7
     */
    it('should have consistent self-report error message for user profiles', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: '12345678-1234-1234-1234-123456789012' } },
        error: null,
      });

      const params: ReportParams = {
        reportType: 'user',
        targetId: '12345678-1234-1234-1234-123456789012', // Same as authenticated user
        reason: 'spam',
      };

      try {
        await submitReport(params);
        fail('Should have thrown self-report error');
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        const modError = error as ModerationError;
        
        // Verify error message format
        expect(modError.message).toBe('You cannot report your own profile');
        
        // Verify error code
        expect(modError.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        
        // Verify error details
        expect(modError.details).toHaveProperty('userId', '12345678-1234-1234-1234-123456789012');
        expect(modError.details).toHaveProperty('targetId', '12345678-1234-1234-1234-123456789012');
      }
    });

    /**
     * Test admin protection error message
     * Requirements: 8.4, 8.7
     */
    it('should have consistent admin protection error message', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock database responses
      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 0,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'admin' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'security_events') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
            }),
          }),
        };
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const params: ReportParams = {
        reportType: 'user',
        targetId: '12345678-1234-1234-1234-123456789012',
        reason: 'spam',
      };

      try {
        await submitReport(params);
        fail('Should have thrown admin protection error');
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        const modError = error as ModerationError;
        
        // Verify error message format
        expect(modError.message).toBe('This account cannot be reported');
        
        // Verify error code
        expect(modError.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        
        // Verify error details
        expect(modError.details).toHaveProperty('targetUserId', '12345678-1234-1234-1234-123456789012');
      }
    });

    /**
     * Test that content type labels are correctly capitalized
     * Requirements: 8.1, 8.7
     */
    it('should use correct capitalization for content type labels in error messages', async () => {
      const testCases = [
        { reportType: 'post' as const, expectedLabel: 'post' },
        { reportType: 'comment' as const, expectedLabel: 'comment' },
        { reportType: 'track' as const, expectedLabel: 'track' },
        { reportType: 'user' as const, expectedLabel: 'user' },
      ];

      for (const testCase of testCases) {
        // Mock authenticated user
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        // Mock database responses for duplicate detection
        const mockFrom = jest.fn((table: string) => {
          if (table === 'moderation_reports') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      gte: jest.fn().mockReturnValue({
                        maybeSingle: jest.fn().mockResolvedValue({
                          data: { created_at: '2025-01-01T00:00:00Z' },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'security_events') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            };
          }
          // Mock content lookup tables
          if (table === 'posts' || table === 'comments' || table === 'tracks') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { user_id: 'other-user-id' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ error: null, count: 0 }),
              }),
            }),
          };
        });
        (supabase.from as jest.Mock).mockImplementation(mockFrom);

        const params: ReportParams = {
          reportType: testCase.reportType,
          targetId: '12345678-1234-1234-1234-123456789012',
          reason: 'spam',
        };

        try {
          await submitReport(params);
          fail('Should have thrown duplicate error');
        } catch (error) {
          expect(error).toBeInstanceOf(ModerationError);
          const modError = error as ModerationError;
          
          // Verify the error message contains the correctly formatted label
          expect(modError.message).toContain(testCase.expectedLabel);
          
          // Verify it's lowercase in the message
          expect(modError.message).toMatch(new RegExp(`this ${testCase.expectedLabel} recently`));
        }
      }
    });
  });
});
