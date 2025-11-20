/**
 * Admin Service Tests
 * 
 * Tests for user management service functions
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { supabase } from '@/lib/supabase';
import {
  fetchAllUsers,
  fetchUserDetails,
  updateUserPlanTier,
  updateUserRoles,
  suspendUser,
  resetUserPassword,
} from '@/lib/adminService';
import { AdminError, ADMIN_ERROR_CODES } from '@/types/admin';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

// Mock admin cache
jest.mock('@/utils/adminCache', () => ({
  adminCache: {
    invalidateUserCaches: jest.fn(),
    invalidateConfigCaches: jest.fn(),
  },
  ADMIN_CACHE_KEYS: {
    USER_LIST: jest.fn((page, filters) => `user_list_${page}_${filters}`),
    USER_DETAILS: jest.fn((userId) => `user_details_${userId}`),
    PLATFORM_CONFIG: jest.fn((key) => key ? `config_${key}` : 'config_all'),
    FEATURE_FLAGS: jest.fn(() => 'feature_flags'),
    SYSTEM_METRICS: jest.fn((type) => `metrics_${type || 'all'}`),
    SYSTEM_HEALTH: jest.fn(() => 'system_health'),
    PERFORMANCE_METRICS: jest.fn(() => 'performance_metrics'),
    ANALYTICS_USER_GROWTH: jest.fn((range) => `analytics_growth_${range}`),
    ANALYTICS_CONTENT: jest.fn((range) => `analytics_content_${range}`),
  },
  ADMIN_CACHE_TTL: {
    USER_LIST: 300000,
    USER_DETAILS: 300000,
    PLATFORM_CONFIG: 86400000,
    SYSTEM_METRICS: 60000,
    SYSTEM_HEALTH: 60000,
    PERFORMANCE_METRICS: 60000,
    ANALYTICS: 900000,
  },
  cachedFetch: jest.fn((key, ttl, fn) => fn()),
}));

describe('Admin Service - User Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAllUsers', () => {
    it('should fetch users with default pagination', async () => {
      const mockUsers = [
        {
          id: '1',
          user_id: 'user-1',
          username: 'testuser1',
          email: 'test1@example.com',
          created_at: '2024-01-01T00:00:00Z',
          user_plan_tiers: { plan_tier: 'free' },
          user_roles: [],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
          count: 1,
        }),
      });

      const result = await fetchAllUsers();

      expect(result).toEqual({
        users: expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-1',
            username: 'testuser1',
            email: 'test1@example.com',
          }),
        ]),
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchAllUsers({ search: 'testuser' });

      expect(mockFrom.or).toHaveBeenCalledWith(
        expect.stringContaining('username.ilike.%testuser%')
      );
    });

    it('should apply plan tier filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchAllUsers({ planTier: 'creator_pro' });

      expect(mockFrom.eq).toHaveBeenCalledWith('user_plan_tiers.plan_tier', 'creator_pro');
    });

    it('should handle database errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0,
        }),
      });

      await expect(fetchAllUsers()).rejects.toThrow(AdminError);
      await expect(fetchAllUsers()).rejects.toThrow('Failed to fetch users');
    });
  });

  describe('fetchUserDetails', () => {
    it('should fetch user details with activity summary', async () => {
      const mockProfile = {
        id: '1',
        user_id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        user_plan_tiers: { plan_tier: 'free' },
        user_roles: [{ role_type: 'moderator', is_active: true }],
      };

      const mockActivity = {
        posts_count: 10,
        tracks_count: 5,
        albums_count: 2,
        playlists_count: 3,
        comments_count: 20,
        likes_given: 50,
        likes_received: 100,
        last_active: '2024-01-15T00:00:00Z',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockActivity,
        error: null,
      });

      const result = await fetchUserDetails('user-1');

      expect(result).toEqual(
        expect.objectContaining({
          user_id: 'user-1',
          username: 'testuser',
          roles: ['moderator'],
          activity_summary: mockActivity,
        })
      );
    });

    it('should handle user not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await expect(fetchUserDetails('nonexistent')).rejects.toThrow(AdminError);
      await expect(fetchUserDetails('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('updateUserPlanTier', () => {
    it('should update user plan tier and log action', async () => {
      const mockCurrentPlan = { plan_tier: 'free' };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCurrentPlan,
          error: null,
        }),
      });

      (supabase.rpc as jest.Mock)
        .mockResolvedValueOnce({ error: null }) // update_user_plan_tier
        .mockResolvedValueOnce({ error: null }); // log_admin_action

      await updateUserPlanTier('user-1', 'creator_pro');

      expect(supabase.rpc).toHaveBeenCalledWith('update_user_plan_tier', {
        p_user_id: 'user-1',
        p_new_plan_tier: 'creator_pro',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('log_admin_action', {
        p_action_type: 'user_plan_changed',
        p_target_resource_type: 'user',
        p_target_resource_id: 'user-1',
        p_old_value: { plan_tier: 'free' },
        p_new_value: { plan_tier: 'creator_pro' },
      });
    });

    it('should handle update errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { plan_tier: 'free' },
          error: null,
        }),
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        error: { message: 'Update failed' },
      });

      await expect(updateUserPlanTier('user-1', 'creator_pro')).rejects.toThrow(AdminError);
    });
  });

  describe('updateUserRoles', () => {
    it('should add and remove roles with audit logging', async () => {
      const mockCurrentRoles = [{ role_type: 'moderator' }];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: {
          data: mockCurrentRoles,
          error: null,
        },
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await updateUserRoles('user-1', ['tester'], ['moderator']);

      expect(supabase.rpc).toHaveBeenCalledWith('assign_user_role', {
        p_user_id: 'user-1',
        p_role_type: 'tester',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('revoke_user_role', {
        p_user_id: 'user-1',
        p_role_type: 'moderator',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('log_admin_action', expect.any(Object));
    });

    it('should handle role assignment errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: {
          data: [],
          error: null,
        },
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        error: { message: 'Role assignment failed' },
      });

      await expect(updateUserRoles('user-1', ['tester'], [])).rejects.toThrow(AdminError);
    });
  });

  describe('suspendUser', () => {
    it('should suspend user account with reason', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await suspendUser('user-1', 'Violation of terms', 30);

      expect(supabase.rpc).toHaveBeenCalledWith('suspend_user_account', {
        p_target_user_id: 'user-1',
        p_reason: 'Violation of terms',
        p_duration_days: 30,
      });
    });

    it('should handle suspension errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        error: { message: 'Suspension failed' },
      });

      await expect(suspendUser('user-1', 'Test reason')).rejects.toThrow(AdminError);
    });
  });

  describe('resetUserPassword', () => {
    it('should send password reset email and log action', async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error: null,
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await resetUserPassword('user-1', 'test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password')
        })
      );

      expect(supabase.rpc).toHaveBeenCalledWith('log_admin_action', {
        p_action_type: 'user_password_reset',
        p_target_resource_type: 'user',
        p_target_resource_id: 'user-1',
        p_old_value: null,
        p_new_value: { email: 'test@example.com' },
      });
    });

    it('should handle password reset errors', async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error: { message: 'Email send failed' },
      });

      await expect(resetUserPassword('user-1', 'test@example.com')).rejects.toThrow(AdminError);
    });
  });
});
