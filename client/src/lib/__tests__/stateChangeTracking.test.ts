/**
 * Tests for state change tracking functionality
 * Requirements: 14.4
 * 
 * This test file verifies that state changes are properly tracked
 * when actions are reversed and re-applied multiple times.
 */

import { supabase } from '@/lib/supabase';
import { revokeAction } from '../moderationService';
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

describe('State Change Tracking', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockActionId = '223e4567-e89b-12d3-a456-426614174000';
  const mockTargetUserId = '323e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state change tracking', () => {
    it('should initialize state_changes array when reversing an action without existing state changes', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock user roles check (moderator)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'moderator' }],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        single: jest.fn(),
      });

      // Mock fetching the action (no existing state_changes)
      mockFrom().single.mockResolvedValueOnce({
        data: {
          id: mockActionId,
          moderator_id: '523e4567-e89b-12d3-a456-426614174000',
          target_user_id: mockTargetUserId,
          action_type: 'user_warned',
          reason: 'Original warning reason',
          created_at: '2024-01-01T10:00:00.000Z',
          revoked_at: null,
          metadata: null, // No existing metadata
        },
        error: null,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await revokeAction(mockActionId, 'False positive');

      // Verify that update was called with state_changes array
      const updateCall = mockFrom().update.mock.calls[0][0];
      expect(updateCall.metadata).toBeDefined();
      expect(updateCall.metadata.state_changes).toBeDefined();
      expect(Array.isArray(updateCall.metadata.state_changes)).toBe(true);
      
      // Should have 2 entries: original application + reversal
      expect(updateCall.metadata.state_changes).toHaveLength(2);
      
      // First entry should be the original application
      expect(updateCall.metadata.state_changes[0]).toMatchObject({
        action: 'applied',
        by_user_id: '523e4567-e89b-12d3-a456-426614174000',
        reason: 'Original warning reason',
        is_self_action: false,
      });
      
      // Second entry should be the reversal
      expect(updateCall.metadata.state_changes[1]).toMatchObject({
        action: 'reversed',
        by_user_id: mockUserId,
        reason: 'False positive',
        is_self_action: false,
      });
    });

    it('should append to existing state_changes array when reversing', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock user roles check (moderator)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'moderator' }],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        single: jest.fn(),
      });

      // Mock fetching the action with existing state_changes
      const originalModeratorId = '623e4567-e89b-12d3-a456-426614174000';
      const existingStateChanges = [
        {
          timestamp: '2024-01-01T10:00:00.000Z',
          action: 'applied',
          by_user_id: originalModeratorId,
          reason: 'Original warning reason',
          is_self_action: false,
        },
      ];

      mockFrom().single.mockResolvedValueOnce({
        data: {
          id: mockActionId,
          moderator_id: originalModeratorId,
          target_user_id: mockTargetUserId,
          action_type: 'user_warned',
          reason: 'Original warning reason',
          created_at: '2024-01-01T10:00:00.000Z',
          revoked_at: null,
          metadata: {
            state_changes: existingStateChanges,
          },
        },
        error: null,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await revokeAction(mockActionId, 'False positive');

      // Verify that update was called with appended state_changes
      const updateCall = mockFrom().update.mock.calls[0][0];
      expect(updateCall.metadata.state_changes).toHaveLength(2);
      
      // First entry should be preserved
      expect(updateCall.metadata.state_changes[0]).toEqual(existingStateChanges[0]);
      
      // Second entry should be the new reversal
      expect(updateCall.metadata.state_changes[1]).toMatchObject({
        action: 'reversed',
        by_user_id: mockUserId,
        reason: 'False positive',
      });
    });
  });

  describe('Self-reversal tracking', () => {
    it('should mark self-reversal in state_changes', async () => {
      const sameModerator = '423e4567-e89b-12d3-a456-426614174000';

      // Mock authenticated user (same as original moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: sameModerator } },
        error: null,
      });

      // Mock user roles check (moderator)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'moderator' }],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        single: jest.fn(),
      });

      // Mock fetching the action
      mockFrom().single.mockResolvedValueOnce({
        data: {
          id: mockActionId,
          moderator_id: sameModerator, // Same as current user
          target_user_id: mockTargetUserId,
          action_type: 'user_warned',
          reason: 'Original warning reason',
          created_at: '2024-01-01T10:00:00.000Z',
          revoked_at: null,
          metadata: null,
        },
        error: null,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await revokeAction(mockActionId, 'I made a mistake');

      // Verify that self-reversal is marked
      const updateCall = mockFrom().update.mock.calls[0][0];
      expect(updateCall.metadata.is_self_reversal).toBe(true);
      expect(updateCall.metadata.state_changes[1].is_self_action).toBe(true);
    });
  });

  describe('State change history validation', () => {
    it('should maintain chronological order of state changes', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock user roles check (moderator)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'moderator' }],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        single: jest.fn(),
      });

      // Mock fetching the action with multiple existing state changes
      const moderator1 = '723e4567-e89b-12d3-a456-426614174000';
      const moderator2 = '823e4567-e89b-12d3-a456-426614174000';
      const moderator3 = '923e4567-e89b-12d3-a456-426614174000';
      
      const existingStateChanges = [
        {
          timestamp: '2024-01-01T10:00:00.000Z',
          action: 'applied',
          by_user_id: moderator1,
          reason: 'Original reason',
          is_self_action: false,
        },
        {
          timestamp: '2024-01-05T14:00:00.000Z',
          action: 'reversed',
          by_user_id: moderator2,
          reason: 'First reversal',
          is_self_action: false,
        },
        {
          timestamp: '2024-01-10T09:00:00.000Z',
          action: 'reapplied',
          by_user_id: moderator3,
          reason: 'Re-applied after review',
          is_self_action: false,
        },
      ];

      mockFrom().single.mockResolvedValueOnce({
        data: {
          id: mockActionId,
          moderator_id: moderator3,
          target_user_id: mockTargetUserId,
          action_type: 'user_suspended',
          reason: 'Re-applied after review',
          created_at: '2024-01-10T09:00:00.000Z',
          revoked_at: null,
          metadata: {
            state_changes: existingStateChanges,
          },
        },
        error: null,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      await revokeAction(mockActionId, 'Second reversal');

      // Verify that all state changes are preserved in order
      const updateCall = mockFrom().update.mock.calls[0][0];
      expect(updateCall.metadata.state_changes).toHaveLength(4);
      
      // Verify chronological order
      const timestamps = updateCall.metadata.state_changes.map((sc: { timestamp: string }) => 
        new Date(sc.timestamp).getTime()
      );
      
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });
});
