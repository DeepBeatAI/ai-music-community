/**
 * Tests for getUserModerationHistory function
 * Requirements: 14.2
 */

import { getUserModerationHistory } from '../moderationService';
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

describe('getUserModerationHistory', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCurrentUser = { id: 'moderator-id' };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockCurrentUser },
      error: null,
    });
  });

  describe('Validation', () => {
    it('should throw error for invalid user ID format', async () => {
      await expect(getUserModerationHistory('invalid-uuid')).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
        message: expect.stringContaining('Invalid user ID format'),
      });
    });

    it('should accept valid UUID format', async () => {
      const mockQuery = Promise.resolve({ data: [], error: null });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await getUserModerationHistory(mockUserId);

      expect(mockFrom).toHaveBeenCalledWith('moderation_actions');
    });
  });

  describe('Query Building', () => {
    it('should query moderation_actions table with correct user ID', async () => {
      const mockQuery = Promise.resolve({ data: [], error: null });
      
      const mockEq = jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(mockQuery),
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await getUserModerationHistory(mockUserId);

      expect(mockFrom).toHaveBeenCalledWith('moderation_actions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('target_user_id', mockUserId);
    });

    it('should order results by created_at descending', async () => {
      const mockQuery = Promise.resolve({ data: [], error: null });
      
      const mockOrder = jest.fn().mockReturnValue(mockQuery);

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await getUserModerationHistory(mockUserId);

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should filter out revoked actions when includeRevoked is false', async () => {
      const mockQuery = Promise.resolve({ data: [], error: null });
      
      const mockOrder = jest.fn().mockReturnValue(mockQuery);

      const mockIs = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockEq = jest.fn().mockReturnValue({
        is: mockIs,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await getUserModerationHistory(mockUserId, false);

      expect(mockIs).toHaveBeenCalledWith('revoked_at', null);
    });

    it('should include revoked actions when includeRevoked is true', async () => {
      const mockQuery = Promise.resolve({ data: [], error: null });
      
      const mockOrder = jest.fn().mockReturnValue(mockQuery);

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await getUserModerationHistory(mockUserId, true);

      // Should NOT call .is() to filter revoked actions
      expect(mockEq).not.toHaveBeenCalledWith('is', expect.anything());
    });
  });

  describe('Response Transformation', () => {
    it('should return empty array when no actions found', async () => {
      const mockQuery = Promise.resolve({ data: [], error: null });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getUserModerationHistory(mockUserId);

      expect(result).toEqual([]);
    });

    it('should transform actions into history entries with reversal info', async () => {
      const mockActions = [
        {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_suspended',
          reason: 'Spam',
          created_at: '2024-01-01T00:00:00Z',
          revoked_at: '2024-01-02T00:00:00Z',
          revoked_by: 'mod-2',
          metadata: { reversal_reason: 'False positive' },
        },
        {
          id: 'action-2',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_warned',
          reason: 'Inappropriate content',
          created_at: '2024-01-03T00:00:00Z',
          revoked_at: null,
          revoked_by: null,
          metadata: null,
        },
      ];

      const mockQuery = Promise.resolve({ data: mockActions, error: null });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getUserModerationHistory(mockUserId);

      expect(result).toHaveLength(2);
      
      // First entry (revoked action)
      // Calculate expected time difference: 2024-01-02 - 2024-01-01 = 24 hours = 86400000 ms
      const expectedTimeDiff = 24 * 60 * 60 * 1000; // 86400000 ms
      expect(result[0]).toMatchObject({
        action: mockActions[0],
        isRevoked: true,
        revokedAt: '2024-01-02T00:00:00Z',
        revokedBy: 'mod-2',
        reversalReason: 'False positive',
        timeBetweenActionAndReversal: expectedTimeDiff,
      });

      // Second entry (active action)
      expect(result[1]).toMatchObject({
        action: mockActions[1],
        isRevoked: false,
        revokedAt: null,
        revokedBy: null,
        reversalReason: null,
        timeBetweenActionAndReversal: null,
      });
    });

    it('should handle actions without metadata gracefully', async () => {
      const mockActions = [
        {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_suspended',
          reason: 'Spam',
          created_at: '2024-01-01T00:00:00Z',
          revoked_at: '2024-01-02T00:00:00Z',
          revoked_by: 'mod-2',
          metadata: null, // No metadata
        },
      ];

      const mockQuery = Promise.resolve({ data: mockActions, error: null });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getUserModerationHistory(mockUserId);

      expect(result).toHaveLength(1);
      // Calculate expected time difference: 2024-01-02 - 2024-01-01 = 24 hours = 86400000 ms
      const expectedTimeDiff = 24 * 60 * 60 * 1000; // 86400000 ms
      expect(result[0]).toMatchObject({
        action: mockActions[0],
        isRevoked: true,
        revokedAt: '2024-01-02T00:00:00Z',
        revokedBy: 'mod-2',
        reversalReason: null, // Should be null when no metadata
        timeBetweenActionAndReversal: expectedTimeDiff,
      });
    });

    it('should calculate time between action and reversal correctly', async () => {
      const mockActions = [
        {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_suspended',
          reason: 'Spam',
          created_at: '2024-01-01T10:00:00Z',
          revoked_at: '2024-01-01T12:30:00Z', // 2.5 hours later
          revoked_by: 'mod-2',
          metadata: { reversal_reason: 'Mistake' },
        },
      ];

      const mockQuery = Promise.resolve({ data: mockActions, error: null });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getUserModerationHistory(mockUserId);

      expect(result).toHaveLength(1);
      // Calculate expected time difference: 2.5 hours = 9000000 ms
      const expectedTimeDiff = 2.5 * 60 * 60 * 1000; // 9000000 ms
      expect(result[0].timeBetweenActionAndReversal).toBe(expectedTimeDiff);
    });

    it('should set timeBetweenActionAndReversal to null for non-revoked actions', async () => {
      const mockActions = [
        {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_warned',
          reason: 'Inappropriate content',
          created_at: '2024-01-01T00:00:00Z',
          revoked_at: null,
          revoked_by: null,
          metadata: null,
        },
      ];

      const mockQuery = Promise.resolve({ data: mockActions, error: null });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getUserModerationHistory(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].timeBetweenActionAndReversal).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should throw ModerationError on database error', async () => {
      const mockQuery = Promise.resolve({
        data: null,
        error: { message: 'Database error' },
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await expect(getUserModerationHistory(mockUserId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.DATABASE_ERROR,
      });
    });

    it('should wrap unexpected errors in ModerationError', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockImplementation(() => {
            throw new Error('Unexpected error');
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await expect(getUserModerationHistory(mockUserId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.DATABASE_ERROR,
        message: expect.stringContaining('unexpected error'),
      });
    });
  });
});
