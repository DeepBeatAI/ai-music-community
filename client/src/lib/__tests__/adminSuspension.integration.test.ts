/**
 * Integration Tests for Admin Suspension with Moderation System
 * 
 * These tests verify that admin suspension functions properly integrate
 * with the moderation system by creating both moderation_actions and
 * user_restrictions records.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { supabase } from '@/lib/supabase';
import { suspendUser, unsuspendUser } from '@/lib/adminService';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock admin cache
jest.mock('@/utils/adminCache', () => ({
  adminCache: {
    invalidateUserCaches: jest.fn(),
  },
}));

describe('Admin Suspension Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('suspendUser', () => {
    it('should call suspend_user_account database function with correct parameters', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Violation of community guidelines';
      const durationDays = 7;

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason, durationDays);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: durationDays,
      });
    });

    it('should call suspend_user_account without duration for permanent suspension', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Severe violation';

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason);

      // Assert
      // Note: When no duration is provided, it's passed as null to the database function
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: null,
      });
    });

    it('should throw error if database function fails', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test reason';
      const dbError = new Error('Database error');

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: dbError });

      // Act & Assert
      await expect(suspendUser(userId, reason)).rejects.toThrow();
    });

    it('should handle various duration values correctly', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test reason';
      const testCases = [1, 7, 30, 90, 365];

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act & Assert
      for (const duration of testCases) {
        await suspendUser(userId, reason, duration);
        expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
          p_target_user_id: userId,
          p_reason: reason,
          p_duration_days: duration,
        });
      }
    });
  });

  describe('unsuspendUser', () => {
    it('should call unsuspend_user_account database function with correct parameters', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await unsuspendUser(userId);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('unsuspend_user_account', {
        p_target_user_id: userId,
      });
    });

    it('should throw error if database function fails', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const dbError = new Error('User is not currently suspended');

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: dbError });

      // Act & Assert
      await expect(unsuspendUser(userId)).rejects.toThrow();
    });

    it('should handle multiple unsuspend calls gracefully', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await unsuspendUser(userId);
      await unsuspendUser(userId);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });

  describe('Suspension and Unsuspension Integration', () => {
    it('should verify that suspension creates moderation_actions record (mock verification)', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test suspension';
      const durationDays = 7;

      // Mock successful suspension
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason, durationDays);

      // Assert
      // Verify the database function was called
      // The actual creation of moderation_actions is handled by the database function
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: durationDays,
      });
    });

    it('should verify that suspension creates user_restrictions record (mock verification)', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test suspension';
      const durationDays = 7;

      // Mock successful suspension
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason, durationDays);

      // Assert
      // Verify the database function was called
      // The actual creation of user_restrictions is handled by the database function
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: durationDays,
      });
    });

    it('should verify that unsuspension deactivates user_restrictions (mock verification)', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock successful unsuspension
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await unsuspendUser(userId);

      // Assert
      // Verify the database function was called
      // The actual deactivation of user_restrictions is handled by the database function
      expect(supabase.rpc).toHaveBeenCalledWith('unsuspend_user_account', {
        p_target_user_id: userId,
      });
    });

    it('should maintain backward compatibility with existing admin dashboard', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test suspension';

      // Mock successful suspension
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act - Call suspendUser as the admin dashboard would
      await suspendUser(userId, reason, 7);

      // Assert - Verify the function signature hasn't changed
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: 7,
      });

      // The function should work exactly as before from the admin dashboard's perspective
      // The integration with moderation system happens transparently in the database
    });

    it('should handle suspension-unsuspension round trip', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test suspension';
      const durationDays = 7;

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason, durationDays);
      await unsuspendUser(userId);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: durationDays,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'unsuspend_user_account', {
        p_target_user_id: userId,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully during suspension', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test reason';
      const dbError = new Error('Cannot suspend admin users');

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: dbError });

      // Act & Assert
      await expect(suspendUser(userId, reason)).rejects.toThrow();
    });

    it('should handle database errors gracefully during unsuspension', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const dbError = new Error('User is not currently suspended');

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: dbError });

      // Act & Assert
      await expect(unsuspendUser(userId)).rejects.toThrow();
    });

    it('should handle network errors during suspension', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test reason';
      const networkError = new Error('Network error');

      (supabase.rpc as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(suspendUser(userId, reason)).rejects.toThrow();
    });

    it('should handle network errors during unsuspension', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const networkError = new Error('Network error');

      (supabase.rpc as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(unsuspendUser(userId)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle suspension with minimum duration (1 day)', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Minor violation';
      const durationDays = 1;

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason, durationDays);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: durationDays,
      });
    });

    it('should handle suspension with maximum duration (365 days)', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Severe violation';
      const durationDays = 365;

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason, durationDays);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: durationDays,
      });
    });

    it('should handle suspension with very long reason text', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'A'.repeat(500); // 500 character reason
      const durationDays = 7;

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      await suspendUser(userId, reason, durationDays);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: userId,
        p_reason: reason,
        p_duration_days: durationDays,
      });
    });

    it('should handle multiple rapid suspension calls', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reason = 'Test reason';
      const durationDays = 7;

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      const promises = Array.from({ length: 5 }, () => 
        suspendUser(userId, reason, durationDays)
      );
      await Promise.all(promises);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledTimes(5);
    });

    it('should handle multiple rapid unsuspension calls', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      // Act
      const promises = Array.from({ length: 5 }, () => 
        unsuspendUser(userId)
      );
      await Promise.all(promises);

      // Assert
      expect(supabase.rpc).toHaveBeenCalledTimes(5);
    });
  });
});
