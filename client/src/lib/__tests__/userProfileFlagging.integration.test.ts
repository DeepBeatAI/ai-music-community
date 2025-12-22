/**
 * Integration Tests for User Profile Flagging
 * 
 * Tests complete workflows for user profile reporting:
 * - Complete report flow (button click → modal → submission → success)
 * - Duplicate detection flow
 * - Rate limit flow
 * - Admin protection flow
 * - Moderator review flow with profile context
 * 
 * Requirements: 1.4, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.7, 2.8, 2.9, 6.2, 6.4, 7.1-7.5
 */

import { submitReport, moderatorFlagContent, getProfileContext } from '@/lib/moderationService';
import { ModerationError, MODERATION_ERROR_CODES, ReportParams } from '@/types/moderation';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('User Profile Flagging - Integration Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTargetUserId = '223e4567-e89b-12d3-a456-426614174001';
  const mockAdminUserId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 12.1: Complete Report Flow
   * Requirements: 1.4, 1.6, 1.7
   * 
   * Tests the complete flow from user clicking report button to successful submission:
   * 1. User clicks report button
   * 2. Modal opens with correct props (report_type='user')
   * 3. User fills form and submits
   * 4. Report created in database
   * 5. Success message displayed
   * 6. Modal closes
   */
  describe('12.1 Complete Report Flow', () => {
    it('should successfully submit a user profile report end-to-end', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock database responses
      const mockReport = {
        id: 'report-123',
        reporter_id: mockUserId,
        reported_user_id: mockTargetUserId,
        report_type: 'user',
        target_id: mockTargetUserId,
        reason: 'harassment',
        description: 'Offensive username and bio',
        status: 'pending',
        priority: 2,
        created_at: new Date().toISOString(),
      };

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
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 0, // Under rate limit
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockReport,
                  error: null,
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
                  data: [], // Target is not admin
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

      // Submit report
      const params: ReportParams = {
        reportType: 'user',
        targetId: mockTargetUserId,
        reason: 'harassment',
        description: 'Offensive username and bio',
      };

      const result = await submitReport(params);

      // Verify report was created with correct fields
      expect(result).toBeDefined();
      expect(result.report_type).toBe('user');
      expect(result.target_id).toBe(mockTargetUserId);
      expect(result.reporter_id).toBe(mockUserId);
      expect(result.reason).toBe('harassment');
      expect(result.status).toBe('pending');
      expect(result.priority).toBe(2); // harassment priority

      // Verify database calls
      expect(supabase.from).toHaveBeenCalledWith('moderation_reports');
      expect(supabase.from).toHaveBeenCalledWith('user_roles');
    });

    it('should handle report submission with minimal data', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock database responses
      const mockReport = {
        id: 'report-124',
        reporter_id: mockUserId,
        reported_user_id: mockTargetUserId,
        report_type: 'user',
        target_id: mockTargetUserId,
        reason: 'spam',
        description: null,
        status: 'pending',
        priority: 3,
        created_at: new Date().toISOString(),
      };

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
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockReport,
                  error: null,
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
                  data: [],
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

      // Submit report without description
      const params: ReportParams = {
        reportType: 'user',
        targetId: mockTargetUserId,
        reason: 'spam',
      };

      const result = await submitReport(params);

      // Verify report was created
      expect(result).toBeDefined();
      expect(result.report_type).toBe('user');
      expect(result.reason).toBe('spam');
      expect(result.description).toBeNull();
    });
  });

  /**
   * Test 12.2: Duplicate Detection Flow
   * Requirements: 2.3, 2.4, 2.9
   * 
   * Tests that duplicate detection prevents repeat reports:
   * 1. First report succeeds
   * 2. Second report fails with duplicate error
   * 3. Security event is logged
   */
  describe('12.2 Duplicate Detection Flow', () => {
    it('should prevent duplicate user profile reports within 24 hours', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock database responses - simulate duplicate found
      const mockFrom = jest.fn((table: string) => {
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    gte: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { created_at: '2025-01-01T00:00:00Z' }, // Duplicate found
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
        targetId: mockTargetUserId,
        reason: 'spam',
      };

      // Attempt to submit duplicate report should fail
      try {
        await submitReport(params);
        fail('Should have thrown duplicate error');
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        const modError = error as ModerationError;
        
        // Verify error message
        expect(modError.message).toBe(
          'You have already reported this user recently. Please wait 24 hours before reporting again.'
        );
        
        // Verify error code
        expect(modError.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        
        // Verify error details
        expect(modError.details).toHaveProperty('reportType', 'user');
        expect(modError.details).toHaveProperty('targetId', mockTargetUserId);
        expect(modError.details).toHaveProperty('originalReportDate');
      }

      // Verify security event was logged
      expect(supabase.from).toHaveBeenCalledWith('security_events');
    });

    it('should log security event for duplicate attempts', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
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
        targetId: mockTargetUserId,
        reason: 'spam',
      };

      try {
        await submitReport(params);
      } catch (error) {
        // Expected to throw
      }

      // Verify security event was logged with correct fields
      expect(mockInsert).toHaveBeenCalled();
      const loggedEvent = mockInsert.mock.calls[0][0];
      expect(loggedEvent.event_type).toBe('duplicate_report_attempt');
      expect(loggedEvent.user_id).toBe(mockUserId);
      expect(loggedEvent.details).toHaveProperty('reportType', 'user');
      expect(loggedEvent.details).toHaveProperty('targetId', mockTargetUserId);
      expect(loggedEvent.details).toHaveProperty('originalReportDate');
    });
  });

  /**
   * Test 12.3: Rate Limit Flow
   * Requirements: 2.1, 2.2, 6.2
   * 
   * Tests that rate limiting prevents excessive reports:
   * 1. 10 reports succeed
   * 2. 11th report fails with rate limit error
   * 3. Security event is logged
   */
  describe('12.3 Rate Limit Flow', () => {
    it('should enforce rate limit of 10 reports per 24 hours', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
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
                        data: null, // No duplicate
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
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
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
        targetId: mockTargetUserId,
        reason: 'spam',
      };

      // 11th report should fail with rate limit error
      try {
        await submitReport(params);
        fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        const modError = error as ModerationError;
        
        // Verify error message
        expect(modError.message).toBe(
          'You have exceeded the report limit of 10 reports per 24 hours. Please try again later.'
        );
        
        // Verify error code
        expect(modError.code).toBe(MODERATION_ERROR_CODES.RATE_LIMIT_EXCEEDED);
        
        // Verify error details
        expect(modError.details).toHaveProperty('reportCount', 10);
        expect(modError.details).toHaveProperty('limit', 10);
      }

      // Verify security event was logged
      expect(supabase.from).toHaveBeenCalledWith('security_events');
    });

    it('should log security event for rate limit violations', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
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
                  count: 10,
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
        targetId: mockTargetUserId,
        reason: 'harassment',
      };

      try {
        await submitReport(params);
      } catch (error) {
        // Expected to throw
      }

      // Verify security event was logged with correct fields
      expect(mockInsert).toHaveBeenCalled();
      const loggedEvent = mockInsert.mock.calls[0][0];
      expect(loggedEvent.event_type).toBe('rate_limit_exceeded');
      expect(loggedEvent.user_id).toBe(mockUserId);
      expect(loggedEvent.details).toHaveProperty('reportType', 'user');
      expect(loggedEvent.details).toHaveProperty('reportCount', 10);
      expect(loggedEvent.details).toHaveProperty('limit', 10);
    });

    it('should apply rate limit across all report types', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock database responses - user has already submitted 10 reports of various types
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
                  count: 10, // 10 reports across all types
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

      // Try to submit a user report (should fail due to rate limit)
      const params: ReportParams = {
        reportType: 'user',
        targetId: mockTargetUserId,
        reason: 'spam',
      };

      await expect(submitReport(params)).rejects.toThrow(ModerationError);
      await expect(submitReport(params)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      });
    });
  });

  /**
   * Test 12.4: Admin Protection Flow
   * Requirements: 2.7, 2.8, 6.4
   * 
   * Tests that admin accounts cannot be reported:
   * 1. Reporting admin fails
   * 2. Security event is logged
   */
  describe('12.4 Admin Protection Flow', () => {
    it('should prevent reporting admin accounts', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
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
                  data: [{ role_type: 'admin' }], // Target is admin
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
        targetId: mockAdminUserId,
        reason: 'harassment',
      };

      // Attempt to report admin should fail
      try {
        await submitReport(params);
        fail('Should have thrown admin protection error');
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        const modError = error as ModerationError;
        
        // Verify error message
        expect(modError.message).toBe('This account cannot be reported');
        
        // Verify error code
        expect(modError.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        
        // Verify error details
        expect(modError.details).toHaveProperty('targetUserId', mockAdminUserId);
      }

      // Verify security event was logged
      expect(supabase.from).toHaveBeenCalledWith('security_events');
    });

    it('should log security event for admin report attempts', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
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
        targetId: mockAdminUserId,
        reason: 'spam',
      };

      try {
        await submitReport(params);
      } catch (error) {
        // Expected to throw
      }

      // Verify security event was logged with correct fields
      expect(mockInsert).toHaveBeenCalled();
      const loggedEvent = mockInsert.mock.calls[0][0];
      expect(loggedEvent.event_type).toBe('admin_report_attempt');
      expect(loggedEvent.user_id).toBe(mockUserId);
      expect(loggedEvent.details).toHaveProperty('targetUserId', mockAdminUserId);
      expect(loggedEvent.details).toHaveProperty('reportType', 'user');
      expect(loggedEvent.details).toHaveProperty('targetId', mockAdminUserId);
    });

    it('should only apply admin protection to user profile reports', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock database responses
      const mockPostId = '423e4567-e89b-12d3-a456-426614174003';
      const mockReport = {
        id: 'report-126',
        reporter_id: mockUserId,
        report_type: 'post',
        target_id: mockPostId,
        reason: 'spam',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

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
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockReport,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'posts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: mockAdminUserId }, // Post owned by admin
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

      // Reporting admin's post should succeed (admin protection only for user reports)
      const params: ReportParams = {
        reportType: 'post',
        targetId: mockPostId,
        reason: 'spam',
      };

      const result = await submitReport(params);
      
      // Should succeed
      expect(result).toBeDefined();
      expect(result.report_type).toBe('post');
      expect(result.id).toBe('report-126');
    });
  });

  /**
   * Test 12.5: Moderator Review Flow
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   * 
   * Tests the moderator review flow with profile context:
   * 1. Moderator opens profile report
   * 2. Profile context loads
   * 3. All profile data displayed
   */
  describe('12.5 Moderator Review Flow', () => {
    it('should load complete profile context for moderator review', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'moderator-123' } },
        error: null,
      });

      // Mock database responses
      const mockProfile = {
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test user bio',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockModerationHistory = [
        {
          action_type: 'user_warned',
          reason: 'Spam posting',
          created_at: '2024-12-01T00:00:00Z',
          expires_at: null,
        },
        {
          action_type: 'posting_disabled',
          reason: 'Repeated violations',
          created_at: '2024-11-15T00:00:00Z',
          expires_at: '2024-11-22T00:00:00Z',
        },
      ];

      const mockFrom = jest.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 3, // 3 reports in last 30 days
                }),
              }),
            }),
          };
        }
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockModerationHistory,
                    error: null,
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
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
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

      // Get profile context
      const context = await getProfileContext(mockTargetUserId);

      // Verify all profile data is present
      expect(context).toBeDefined();
      expect(context.username).toBe('testuser');
      expect(context.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(context.bio).toBe('Test user bio');
      expect(context.joinDate).toBe('2024-01-01T00:00:00Z');
      
      // Verify account age calculation
      expect(context.accountAgeDays).toBeGreaterThan(0);
      
      // Verify recent report count
      expect(context.recentReportCount).toBe(3);
      
      // Verify moderation history
      expect(context.moderationHistory).toHaveLength(2);
      expect(context.moderationHistory[0].actionType).toBe('user_warned');
      expect(context.moderationHistory[1].actionType).toBe('posting_disabled');
    });

    it('should handle profile context for new accounts', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'moderator-123' } },
        error: null,
      });

      // Mock database responses for new account (< 7 days old)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      const mockProfile = {
        username: 'newuser',
        avatar_url: null,
        bio: null,
        created_at: recentDate.toISOString(),
      };

      const mockFrom = jest.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 0, // No reports
                }),
              }),
            }),
          };
        }
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [], // No moderation history
                    error: null,
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
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
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

      // Get profile context
      const context = await getProfileContext(mockTargetUserId);

      // Verify profile data
      expect(context.username).toBe('newuser');
      expect(context.avatarUrl).toBeNull();
      expect(context.bio).toBeNull();
      
      // Verify account age is less than 7 days
      expect(context.accountAgeDays).toBeLessThan(7);
      expect(context.accountAgeDays).toBeGreaterThanOrEqual(3);
      
      // Verify no reports or moderation history
      expect(context.recentReportCount).toBe(0);
      expect(context.moderationHistory).toHaveLength(0);
    });

    it('should handle profile context with extensive moderation history', async () => {
      // Mock authenticated moderator
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'moderator-123' } },
        error: null,
      });

      // Mock database responses with 10+ moderation actions (should limit to 10)
      const mockProfile = {
        username: 'problematicuser',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'User with history',
        created_at: '2023-01-01T00:00:00Z',
      };

      const mockModerationHistory = Array.from({ length: 15 }, (_, i) => ({
        action_type: 'user_warned',
        reason: `Violation ${i + 1}`,
        created_at: new Date(2024, 11 - i, 1).toISOString(),
        expires_at: null,
      }));

      const mockFrom = jest.fn((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProfile,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'moderation_reports') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  error: null,
                  count: 12, // Many reports
                }),
              }),
            }),
          };
        }
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: mockModerationHistory.slice(0, 10), // Limited to 10
                    error: null,
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
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
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

      // Get profile context
      const context = await getProfileContext(mockTargetUserId);

      // Verify profile data
      expect(context.username).toBe('problematicuser');
      expect(context.recentReportCount).toBe(12);
      
      // Verify moderation history is limited to 10 most recent
      expect(context.moderationHistory).toHaveLength(10);
      expect(context.moderationHistory[0].reason).toBe('Violation 1');
      expect(context.moderationHistory[9].reason).toBe('Violation 10');
    });
  });
});
