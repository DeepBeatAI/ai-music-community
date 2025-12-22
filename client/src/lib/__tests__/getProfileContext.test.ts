/**
 * Unit tests for getProfileContext function
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */

import { getProfileContext } from '../moderationService';
import { supabase } from '../supabase';
import { ModerationError, MODERATION_ERROR_CODES } from '@/types/moderation';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('getProfileContext', () => {
  const mockModeratorId = '11111111-1111-1111-1111-111111111111';
  const mockUserId = '22222222-2222-2222-2222-222222222222';
  const mockProfile = {
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should throw validation error for invalid user ID format', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'moderator' }],
              error: null,
            }),
          }),
        }),
      });

      await expect(getProfileContext('invalid-uuid')).rejects.toThrow(ModerationError);
      await expect(getProfileContext('invalid-uuid')).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid user ID format',
      });
    });
  });

  describe('Authorization', () => {
    it('should require moderator role', async () => {
      // Mock current user (regular user)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock non-moderator role check
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      await expect(getProfileContext(mockUserId)).rejects.toThrow(ModerationError);
      await expect(getProfileContext(mockUserId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.UNAUTHORIZED,
      });
    });
  });

  describe('Profile Data Fetching', () => {
    it('should fetch user profile data successfully', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
                  count: 3,
                  error: null,
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
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await getProfileContext(mockUserId);

      expect(result.username).toBe('testuser');
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(result.bio).toBe('Test bio');
      expect(result.joinDate).toBe(mockProfile.created_at);
    });

    it('should throw error when profile not found', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'Not found' },
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      await expect(getProfileContext(mockUserId)).rejects.toThrow(ModerationError);
      await expect(getProfileContext(mockUserId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.NOT_FOUND,
        message: 'User profile not found',
      });
    });
  });

  describe('Account Age Calculation', () => {
    it('should calculate account age correctly', async () => {
      const daysAgo = 45;
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock all database calls
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockProfile, created_at: createdAt },
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
                  count: 0,
                  error: null,
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
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await getProfileContext(mockUserId);

      // Account age should be approximately daysAgo (allow for 1 day difference due to timing)
      expect(result.accountAgeDays).toBeGreaterThanOrEqual(daysAgo - 1);
      expect(result.accountAgeDays).toBeLessThanOrEqual(daysAgo + 1);
    });
  });

  describe('Recent Report Counting', () => {
    it('should count recent reports correctly', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock all database calls
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
                  count: 5,
                  error: null,
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
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await getProfileContext(mockUserId);

      expect(result.recentReportCount).toBe(5);
    });

    it('should handle zero recent reports', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock all database calls
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
                  count: 0,
                  error: null,
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
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await getProfileContext(mockUserId);

      expect(result.recentReportCount).toBe(0);
    });
  });

  describe('Moderation History Fetching', () => {
    it('should fetch moderation history successfully', async () => {
      const mockHistory = [
        {
          action_type: 'user_warned',
          reason: 'Inappropriate content',
          created_at: new Date().toISOString(),
          expires_at: null,
        },
        {
          action_type: 'user_suspended',
          reason: 'Repeated violations',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock all database calls
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
                  count: 0,
                  error: null,
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
                    data: mockHistory,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await getProfileContext(mockUserId);

      expect(result.moderationHistory).toHaveLength(2);
      expect(result.moderationHistory[0].actionType).toBe('user_warned');
      expect(result.moderationHistory[0].reason).toBe('Inappropriate content');
      expect(result.moderationHistory[1].actionType).toBe('user_suspended');
      expect(result.moderationHistory[1].reason).toBe('Repeated violations');
    });

    it('should handle empty moderation history', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock all database calls
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
                  count: 0,
                  error: null,
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
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await getProfileContext(mockUserId);

      expect(result.moderationHistory).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
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
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'DATABASE_ERROR', message: 'Database connection failed' },
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      await expect(getProfileContext(mockUserId)).rejects.toThrow(ModerationError);
      await expect(getProfileContext(mockUserId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.NOT_FOUND,
      });
    });
  });
});
