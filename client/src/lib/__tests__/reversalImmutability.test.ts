/**
 * Tests for Reversal Immutability Application-Level Checks
 * Requirements: 14.10
 * 
 * These tests verify that application-level checks properly:
 * 1. Verify reversal records cannot be modified
 * 2. Log any attempted modifications
 * 3. Alert admins of suspicious activity
 */

import { supabase } from '@/lib/supabase';
import {
  verifyReversalImmutability,
  attemptReversalModification,
  detectSuspiciousReversalActivity,
} from '../moderationService';

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

describe('Reversal Immutability Application-Level Checks', () => {
  const mockActionId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
  const mockModeratorId = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
  });

  describe('verifyReversalImmutability', () => {
    it('should verify immutability of a properly reversed action', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: '2024-01-05T15:30:00Z',
        revoked_by: mockModeratorId,
        metadata: {
          reversal_reason: 'False positive',
          is_self_reversal: true,
        },
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await verifyReversalImmutability(mockActionId);

      expect(result.isImmutable).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.action).toEqual(mockAction);
    });

    it('should detect missing revoked_by field', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: '2024-01-05T15:30:00Z',
        revoked_by: null, // Missing!
        metadata: {
          reversal_reason: 'False positive',
        },
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await verifyReversalImmutability(mockActionId);

      expect(result.isImmutable).toBe(false);
      expect(result.violations).toContain('revoked_by field is missing on reversed action');
      expect(result.violations).toContain('Inconsistency: revoked_at and revoked_by must both be set or both be null');
    });

    it('should detect missing reversal_reason in metadata', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: '2024-01-05T15:30:00Z',
        revoked_by: mockModeratorId,
        metadata: {}, // Missing reversal_reason!
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await verifyReversalImmutability(mockActionId);

      expect(result.isImmutable).toBe(false);
      expect(result.violations).toContain('reversal_reason is missing from metadata');
    });

    it('should detect revoked_at in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: futureDate.toISOString(),
        revoked_by: mockModeratorId,
        metadata: {
          reversal_reason: 'False positive',
        },
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await verifyReversalImmutability(mockActionId);

      expect(result.isImmutable).toBe(false);
      expect(result.violations).toContain('revoked_at timestamp is in the future');
    });

    it('should detect revoked_at before created_at', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-05T10:00:00Z',
        revoked_at: '2024-01-01T15:30:00Z', // Before created_at!
        revoked_by: mockModeratorId,
        metadata: {
          reversal_reason: 'False positive',
        },
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await verifyReversalImmutability(mockActionId);

      expect(result.isImmutable).toBe(false);
      expect(result.violations).toContain('revoked_at timestamp is before action creation timestamp');
    });

    it('should return immutable for non-reversed actions', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: null, // Not reversed
        revoked_by: null,
        metadata: {},
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await verifyReversalImmutability(mockActionId);

      expect(result.isImmutable).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('attemptReversalModification', () => {
    it('should detect when modification is prevented by database constraints', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: '2024-01-05T15:30:00Z',
        revoked_by: mockModeratorId,
        metadata: {
          reversal_reason: 'False positive',
        },
      };

      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAction,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  code: '23502',
                  message: 'Cannot modify revoked_at once set. Reversal records are immutable for audit trail integrity.',
                },
              }),
            }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await attemptReversalModification(mockActionId, {
        revoked_at: '2024-01-06T10:00:00Z',
      });

      expect(result.prevented).toBe(true);
      expect(result.error).toContain('Cannot modify revoked_at once set');
      expect(result.securityEventLogged).toBe(true);
    });

    it('should alert admins if modification succeeds (immutability breach)', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: '2024-01-05T15:30:00Z',
        revoked_by: mockModeratorId,
        metadata: {
          reversal_reason: 'False positive',
        },
      };

      const mockAdminRoles = [
        { user_id: '123e4567-e89b-12d3-a456-426614174010' },
        { user_id: '123e4567-e89b-12d3-a456-426614174011' },
      ];

      const mockFrom = jest.fn().mockImplementation((table: string) => {
        if (table === 'moderation_actions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAction,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockAction, // Modification succeeded!
                error: null,
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: mockAdminRoles,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await attemptReversalModification(mockActionId, {
        revoked_at: '2024-01-06T10:00:00Z',
      });

      expect(result.prevented).toBe(false);
      expect(result.error).toContain('CRITICAL');
      expect(result.securityEventLogged).toBe(true);
    });

    it('should return error for non-reversed actions', async () => {
      const mockAction = {
        id: mockActionId,
        action_type: 'user_suspended',
        moderator_id: mockModeratorId,
        target_user_id: mockUserId,
        reason: 'Spam posting',
        created_at: '2024-01-01T10:00:00Z',
        revoked_at: null, // Not reversed
        revoked_by: null,
        metadata: {},
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await attemptReversalModification(mockActionId, {
        revoked_at: '2024-01-06T10:00:00Z',
      });

      expect(result.prevented).toBe(false);
      expect(result.error).toContain('Action is not reversed');
      expect(result.securityEventLogged).toBe(false);
    });
  });

  describe('detectSuspiciousReversalActivity', () => {
    it('should detect multiple modification attempts from same user', async () => {
      const mockEvents = Array(6)
        .fill(null)
        .map((_, i) => ({
          id: `event-${i}`,
          event_type: 'reversal_modification_attempt',
          user_id: mockUserId,
          created_at: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
          details: {},
        }));

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockEvents,
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await detectSuspiciousReversalActivity(mockUserId, 24);

      expect(result.suspiciousActivityDetected).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].type).toBe('multiple_attempts_same_user');
      expect(result.patterns[0].severity).toBe('medium');
      expect(result.patterns[0].count).toBe(6);
    });

    it('should detect successful modifications as critical breach', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          event_type: 'reversal_modification_succeeded',
          user_id: mockUserId,
          created_at: new Date().toISOString(),
          details: {},
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: mockEvents,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await detectSuspiciousReversalActivity(undefined, 24);

      expect(result.suspiciousActivityDetected).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].type).toBe('immutability_breach');
      expect(result.patterns[0].severity).toBe('critical');
    });

    it('should detect rapid-fire attempts suggesting automated attack', async () => {
      const baseTime = Date.now();
      const mockEvents = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `event-${i}`,
          event_type: 'reversal_modification_attempt',
          user_id: mockUserId,
          created_at: new Date(baseTime + i * 500).toISOString(), // 500ms apart
          details: {},
        }));

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: mockEvents,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await detectSuspiciousReversalActivity(undefined, 24);

      expect(result.suspiciousActivityDetected).toBe(true);
      const rapidFirePattern = result.patterns.find((p) => p.type === 'rapid_fire_attempts');
      expect(rapidFirePattern).toBeDefined();
      expect(rapidFirePattern?.severity).toBe('high');
    });

    it('should detect immutability violations', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          event_type: 'reversal_immutability_violation_detected',
          user_id: mockUserId,
          created_at: new Date().toISOString(),
          details: {},
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: mockEvents,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await detectSuspiciousReversalActivity(undefined, 24);

      expect(result.suspiciousActivityDetected).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].type).toBe('immutability_violations');
      expect(result.patterns[0].severity).toBe('high');
    });

    it('should return no suspicious activity when no events found', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await detectSuspiciousReversalActivity(undefined, 24);

      expect(result.suspiciousActivityDetected).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });
  });
});
