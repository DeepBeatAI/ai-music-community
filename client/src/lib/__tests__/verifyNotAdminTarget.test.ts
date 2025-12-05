/**
 * Tests for verifyNotAdminTarget helper function
 * Requirements: 13.8, 13.11, 13.13
 */

import { verifyNotAdminTarget } from '../moderationService';
import { ModerationError, MODERATION_ERROR_CODES } from '@/types/moderation';

// Mock the dependencies
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Import mocked supabase
import { supabase } from '../supabase';

describe('verifyNotAdminTarget', () => {
  const mockCurrentUserId = 'current-user-id';
  const mockTargetUserId = 'target-user-id';
  const mockAdminUserId = 'admin-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should throw validation error for invalid user ID format', async () => {
      // Mock current user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockCurrentUserId } },
        error: null,
      });

      await expect(verifyNotAdminTarget('invalid-uuid')).rejects.toThrow(
        ModerationError
      );

      try {
        await verifyNotAdminTarget('invalid-uuid');
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        expect((error as ModerationError).code).toBe(
          MODERATION_ERROR_CODES.VALIDATION_ERROR
        );
        expect((error as ModerationError).message).toContain('Invalid user ID format');
      }
    });
  });

  describe('Authorization for Regular Users', () => {
    it('should allow moderator to act on regular user', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockCurrentUserId } },
        error: null,
      });

      // Mock target user roles (not admin)
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [], // No admin role
              error: null,
            }),
          }),
        }),
      });

      // Should not throw
      await expect(verifyNotAdminTarget(mockTargetUserId)).resolves.toBeUndefined();
    });

    it('should allow admin to act on regular user', async () => {
      // Mock current user (admin)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      });

      // Mock target user roles (not admin)
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [], // No admin role
              error: null,
            }),
          }),
        }),
      });

      // Should not throw
      await expect(verifyNotAdminTarget(mockTargetUserId)).resolves.toBeUndefined();
    });
  });

  describe('Authorization for Admin Users', () => {
    it('should block moderator from acting on admin user', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockCurrentUserId } },
        error: null,
      });

      // Mock role checks
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation(() => {
              callCount++;
              // First call: check if target is admin (yes)
              if (callCount === 1) {
                return Promise.resolve({
                  data: [{ role_type: 'admin' }],
                  error: null,
                });
              }
              // Second call: check if current user is admin (no)
              return Promise.resolve({
                data: [{ role_type: 'moderator' }],
                error: null,
              });
            }),
          }),
        }),
      }));

      // Mock security event logging
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'security_events') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                  return Promise.resolve({
                    data: [{ role_type: 'admin' }],
                    error: null,
                  });
                }
                return Promise.resolve({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                });
              }),
            }),
          }),
        };
      });

      await expect(verifyNotAdminTarget(mockAdminUserId)).rejects.toThrow(
        ModerationError
      );

      try {
        await verifyNotAdminTarget(mockAdminUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        expect((error as ModerationError).code).toBe(
          MODERATION_ERROR_CODES.INSUFFICIENT_PERMISSIONS
        );
        expect((error as ModerationError).message).toContain(
          'Moderators cannot reverse actions on admin accounts'
        );
      }
    });

    it('should allow admin to act on admin user', async () => {
      // Mock current user (admin)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      });

      // Mock role checks - both users are admins
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'admin' }],
              error: null,
            }),
          }),
        }),
      });

      // Should not throw
      await expect(verifyNotAdminTarget(mockAdminUserId)).resolves.toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock current user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockCurrentUserId } },
        error: null,
      });

      // Mock database error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      });

      await expect(verifyNotAdminTarget(mockTargetUserId)).rejects.toThrow(
        ModerationError
      );

      try {
        await verifyNotAdminTarget(mockTargetUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        expect((error as ModerationError).code).toBe(
          MODERATION_ERROR_CODES.DATABASE_ERROR
        );
      }
    });

    it('should handle authentication errors', async () => {
      // Mock authentication error
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await expect(verifyNotAdminTarget(mockTargetUserId)).rejects.toThrow(
        ModerationError
      );

      try {
        await verifyNotAdminTarget(mockTargetUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(ModerationError);
        expect((error as ModerationError).code).toBe(
          MODERATION_ERROR_CODES.UNAUTHORIZED
        );
      }
    });
  });

  describe('Security Event Logging', () => {
    it('should log security event when moderator attempts to act on admin', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockCurrentUserId } },
        error: null,
      });

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

      // Mock role checks and security event logging
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'security_events') {
          return { insert: mockInsert };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation(() => {
                callCount++;
                // First call: target is admin
                if (callCount === 1) {
                  return Promise.resolve({
                    data: [{ role_type: 'admin' }],
                    error: null,
                  });
                }
                // Second call: current user is moderator
                return Promise.resolve({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                });
              }),
            }),
          }),
        };
      });

      try {
        await verifyNotAdminTarget(mockAdminUserId);
      } catch {
        // Expected to throw
      }

      // Verify security event was logged
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'unauthorized_action_on_admin_target',
          user_id: mockCurrentUserId,
          details: expect.objectContaining({
            targetUserId: mockAdminUserId,
            action: 'reversal_attempt',
          }),
        })
      );
    });
  });
});
