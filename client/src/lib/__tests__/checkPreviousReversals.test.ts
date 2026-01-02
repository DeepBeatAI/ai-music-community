/**
 * Tests for checkPreviousReversals function
 * Requirements: 15.9
 */

import { checkPreviousReversals } from '../moderationService';
import { supabase } from '@/lib/supabase';
import { MODERATION_ERROR_CODES } from '@/types/moderation';
import { Report } from '@/types/moderation';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('checkPreviousReversals', () => {
  const mockReport: Report = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    reporter_id: 'reporter-id',
    reported_user_id: 'user-id',
    report_type: 'post',
    target_id: 'post-id',
    reason: 'spam',
    description: 'Test report',
    status: 'pending',
    priority: 3,
    moderator_flagged: false,
    reviewed_by: null,
    reviewed_at: null,
    resolution_notes: null,
    action_taken: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    metadata: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should throw error for invalid report', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkPreviousReversals(null as any)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
        message: expect.stringContaining('Invalid report'),
      });
    });

    it('should throw error for report without ID', async () => {
      const invalidReport = { ...mockReport, id: '' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(checkPreviousReversals(invalidReport as any)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
        message: expect.stringContaining('Invalid report'),
      });
    });
  });

  describe('Query Building', () => {
    it('should query by target_user_id for user reports', async () => {
      const userReport: Report = {
        ...mockReport,
        report_type: 'user',
        reported_user_id: 'user-123',
      };

      const mockEq = jest.fn().mockReturnThis();
      const mockNot = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await checkPreviousReversals(userReport);

      expect(mockEq).toHaveBeenCalledWith('target_user_id', 'user-123');
    });

    it('should query by target_type and target_id for content reports', async () => {
      const postReport: Report = {
        ...mockReport,
        report_type: 'post',
        target_id: 'post-123',
      };

      const mockEq = jest.fn().mockReturnThis();
      const mockNot = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await checkPreviousReversals(postReport);

      expect(mockEq).toHaveBeenCalledWith('target_type', 'post');
      expect(mockEq).toHaveBeenCalledWith('target_id', 'post-123');
    });

    it('should filter for only reversed actions', async () => {
      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await checkPreviousReversals(mockReport);

      expect(mockNot).toHaveBeenCalledWith('revoked_at', 'is', null);
    });

    it('should order by revoked_at descending', async () => {
      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await checkPreviousReversals(mockReport);

      expect(mockOrder).toHaveBeenCalledWith('revoked_at', { ascending: false });
    });
  });

  describe('No Previous Reversals', () => {
    it('should return false when no reversed actions found', async () => {
      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await checkPreviousReversals(mockReport);

      expect(result).toEqual({
        hasPreviousReversals: false,
        reversalCount: 0,
        mostRecentReversal: null,
      });
    });

    it('should return false when report has no valid target', async () => {
      const invalidReport: Report = {
        ...mockReport,
        report_type: 'post',
        target_id: '',
        reported_user_id: null,
      };

      // Mock supabase even though it won't be called
      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await checkPreviousReversals(invalidReport);

      expect(result).toEqual({
        hasPreviousReversals: false,
        reversalCount: 0,
        mostRecentReversal: null,
      });
    });
  });

  describe('With Previous Reversals', () => {
    it('should return reversal information when reversed actions exist', async () => {
      const mockReversedActions = [
        {
          id: 'action-1',
          action_type: 'user_suspended',
          revoked_at: '2024-01-15T10:00:00.000Z',
          revoked_by: 'moderator-2',
          metadata: {
            reversal_reason: 'False positive - user was framed',
          },
        },
        {
          id: 'action-2',
          action_type: 'content_removed',
          revoked_at: '2024-01-10T10:00:00.000Z',
          revoked_by: 'moderator-1',
          metadata: {
            reversal_reason: 'Content was actually appropriate',
          },
        },
      ];

      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockReversedActions,
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await checkPreviousReversals(mockReport);

      expect(result).toEqual({
        hasPreviousReversals: true,
        reversalCount: 2,
        mostRecentReversal: {
          actionType: 'user_suspended',
          reversedAt: '2024-01-15T10:00:00.000Z',
          reversalReason: 'False positive - user was framed',
          moderatorId: 'moderator-2',
        },
      });
    });

    it('should handle missing reversal reason', async () => {
      const mockReversedActions = [
        {
          id: 'action-1',
          action_type: 'user_warned',
          revoked_at: '2024-01-15T10:00:00.000Z',
          revoked_by: 'moderator-1',
          metadata: {},
        },
      ];

      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockReversedActions,
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await checkPreviousReversals(mockReport);

      expect(result.mostRecentReversal?.reversalReason).toBe('No reason provided');
    });

    it('should return most recent reversal when multiple exist', async () => {
      const mockReversedActions = [
        {
          id: 'action-3',
          action_type: 'restriction_applied',
          revoked_at: '2024-01-20T10:00:00.000Z',
          revoked_by: 'moderator-3',
          metadata: {
            reversal_reason: 'Most recent reversal',
          },
        },
        {
          id: 'action-2',
          action_type: 'user_suspended',
          revoked_at: '2024-01-15T10:00:00.000Z',
          revoked_by: 'moderator-2',
          metadata: {
            reversal_reason: 'Older reversal',
          },
        },
        {
          id: 'action-1',
          action_type: 'content_removed',
          revoked_at: '2024-01-10T10:00:00.000Z',
          revoked_by: 'moderator-1',
          metadata: {
            reversal_reason: 'Oldest reversal',
          },
        },
      ];

      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockReversedActions,
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await checkPreviousReversals(mockReport);

      expect(result.reversalCount).toBe(3);
      expect(result.mostRecentReversal?.reversalReason).toBe('Most recent reversal');
      expect(result.mostRecentReversal?.actionType).toBe('restriction_applied');
    });
  });

  describe('Error Handling', () => {
    it('should throw database error when query fails', async () => {
      const mockNot = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: mockNot,
          eq: mockEq,
          order: mockOrder,
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await expect(checkPreviousReversals(mockReport)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.DATABASE_ERROR,
      });
    });

    it('should throw database error for unexpected errors', async () => {
      const mockFrom = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await expect(checkPreviousReversals(mockReport)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.DATABASE_ERROR,
        message: expect.stringContaining('unexpected error'),
      });
    });
  });
});
