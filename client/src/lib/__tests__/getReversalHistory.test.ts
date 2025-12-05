/**
 * Tests for getReversalHistory function
 * Requirements: 14.5, 14.9
 */

import { getReversalHistory, ReversalHistoryFilters } from '../moderationService';
import { supabase } from '@/lib/supabase';
import { MODERATION_ERROR_CODES } from '@/types/moderation';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('getReversalHistory', () => {
  const mockCurrentUser = { id: 'moderator-id' };
  const mockStartDate = '2024-01-01T00:00:00.000Z';
  const mockEndDate = '2024-01-31T23:59:59.999Z';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockCurrentUser },
      error: null,
    });
  });

  describe('Authorization', () => {
    it('should require moderator or admin role', async () => {
      // Mock user without moderator role
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [], // No roles
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await expect(getReversalHistory()).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.UNAUTHORIZED,
        message: expect.stringContaining('Only moderators and admins'),
      });
    });

    it('should allow moderators to access reversal history', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getReversalHistory();
      expect(result).toEqual([]);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter by start date', async () => {
      const mockGte = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockNot = jest.fn().mockReturnValue({
        gte: mockGte,
      });

      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: mockNot,
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { startDate: mockStartDate };
      await getReversalHistory(filters);

      expect(mockGte).toHaveBeenCalledWith('revoked_at', mockStartDate);
    });

    it('should filter by end date', async () => {
      const mockLte = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockNot = jest.fn().mockReturnValue({
        lte: mockLte,
      });

      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: mockNot,
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { endDate: mockEndDate };
      await getReversalHistory(filters);

      expect(mockLte).toHaveBeenCalledWith('revoked_at', mockEndDate);
    });

    it('should validate date format', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        // Don't mock moderation_actions - validation should happen before query
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { startDate: 'invalid-date' };
      
      try {
        await getReversalHistory(filters);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        expect(error.message).toContain('Invalid start date format');
      }
    });

    it('should validate date range order', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = {
        startDate: '2024-12-31T23:59:59.999Z',
        endDate: '2024-01-01T00:00:00.000Z',
      };

      try {
        await getReversalHistory(filters);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        expect(error.message).toContain('Start date must be before end date');
      }
    });
  });

  describe('Moderator Filtering', () => {
    it('should filter by moderator ID', async () => {
      const mockModeratorId = '123e4567-e89b-12d3-a456-426614174000';
      const mockEq = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockNot = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: mockNot,
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { moderatorId: mockModeratorId };
      await getReversalHistory(filters);

      expect(mockEq).toHaveBeenCalledWith('moderator_id', mockModeratorId);
    });

    it('should validate moderator ID format', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { moderatorId: 'invalid-uuid' };
      
      try {
        await getReversalHistory(filters);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        expect(error.message).toContain('Invalid moderator ID format');
      }
    });
  });

  describe('Action Type Filtering', () => {
    it('should filter by action type', async () => {
      const mockEq = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockNot = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: mockNot,
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { actionType: 'user_suspended' };
      await getReversalHistory(filters);

      expect(mockEq).toHaveBeenCalledWith('action_type', 'user_suspended');
    });

    it('should validate action type', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { actionType: 'invalid_type' as any };
      
      try {
        await getReversalHistory(filters);
        fail('Should have thrown validation error');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe(MODERATION_ERROR_CODES.VALIDATION_ERROR);
        expect((error as { message: string }).message).toContain('Invalid action type');
      }
    });
  });

  describe('Reversal Reason Filtering', () => {
    it('should filter by reversal reason (case-insensitive partial match)', async () => {
      const mockActions = [
        {
          id: '1',
          moderator_id: 'mod-1',
          target_user_id: 'user-1',
          action_type: 'user_suspended',
          revoked_at: '2024-01-15T10:00:00.000Z',
          revoked_by: 'mod-2',
          created_at: '2024-01-10T10:00:00.000Z',
          metadata: { reversal_reason: 'False positive - user was framed' },
        },
        {
          id: '2',
          moderator_id: 'mod-1',
          target_user_id: 'user-2',
          action_type: 'user_warned',
          revoked_at: '2024-01-16T10:00:00.000Z',
          revoked_by: 'mod-2',
          created_at: '2024-01-11T10:00:00.000Z',
          metadata: { reversal_reason: 'Mistake in judgment' },
        },
      ];

      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockActions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const filters: ReversalHistoryFilters = { reversalReason: 'false positive' };
      const result = await getReversalHistory(filters);

      expect(result).toHaveLength(1);
      expect(result[0].reversalReason).toContain('False positive');
    });
  });

  describe('Result Transformation', () => {
    it('should return empty array when no reversals found', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getReversalHistory();
      expect(result).toEqual([]);
    });

    it('should transform actions into reversal history entries with complete details', async () => {
      const mockActions = [
        {
          id: '1',
          moderator_id: 'mod-1',
          target_user_id: 'user-1',
          action_type: 'user_suspended',
          revoked_at: '2024-01-15T10:00:00.000Z',
          revoked_by: 'mod-2',
          created_at: '2024-01-10T10:00:00.000Z',
          metadata: { reversal_reason: 'False positive' },
        },
      ];

      const mockProfiles = [
        { user_id: 'mod-1', username: 'moderator1' },
        { user_id: 'mod-2', username: 'moderator2' },
        { user_id: 'user-1', username: 'user1' },
      ];

      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockActions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getReversalHistory();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        action: expect.objectContaining({ id: '1' }),
        revokedAt: '2024-01-15T10:00:00.000Z',
        revokedBy: 'mod-2',
        reversalReason: 'False positive',
        isSelfReversal: false,
        moderatorUsername: 'moderator1',
        revokedByUsername: 'moderator2',
        targetUsername: 'user1',
      });
      expect(result[0].timeBetweenActionAndReversal).toBeGreaterThan(0);
    });

    it('should identify self-reversals correctly', async () => {
      const mockActions = [
        {
          id: '1',
          moderator_id: 'mod-1',
          target_user_id: 'user-1',
          action_type: 'user_suspended',
          revoked_at: '2024-01-15T10:00:00.000Z',
          revoked_by: 'mod-1', // Same as moderator_id
          created_at: '2024-01-10T10:00:00.000Z',
          metadata: { reversal_reason: 'Reconsidered decision' },
        },
      ];

      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockActions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [{ user_id: 'mod-1', username: 'moderator1' }],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getReversalHistory();

      expect(result).toHaveLength(1);
      expect(result[0].isSelfReversal).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await expect(getReversalHistory()).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.DATABASE_ERROR,
      });
    });

    it('should handle unexpected errors', async () => {
      const mockFrom = jest.fn().mockImplementation((table: string) => {
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
        if (table === 'moderation_actions') {
          throw new Error('Unexpected error');
        }
        return {};
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await expect(getReversalHistory()).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.DATABASE_ERROR,
        message: expect.stringContaining('unexpected error'),
      });
    });
  });
});
