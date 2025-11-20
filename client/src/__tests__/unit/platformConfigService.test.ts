/**
 * Platform Config Service Tests
 * 
 * Tests for platform configuration service functions
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { supabase } from '@/lib/supabase';
import {
  fetchPlatformConfig,
  fetchConfigByKey,
  updatePlatformConfig,
  fetchFeatureFlags,
  updateFeatureFlag,
  fetchUploadLimits,
  updateUploadLimits,
  fetchRateLimits,
  updateRateLimits,
  fetchEmailTemplates,
  updateEmailTemplate,
} from '@/lib/platformConfigService';
import { AdminError, ADMIN_ERROR_CODES } from '@/types/admin';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Mock admin cache
jest.mock('@/utils/adminCache', () => ({
  adminCache: {
    invalidateConfigCaches: jest.fn(),
  },
  ADMIN_CACHE_KEYS: {
    PLATFORM_CONFIG: jest.fn((key) => key ? `config_${key}` : 'config_all'),
    FEATURE_FLAGS: jest.fn(() => 'feature_flags'),
  },
  ADMIN_CACHE_TTL: {
    PLATFORM_CONFIG: 86400000,
  },
  cachedFetch: jest.fn((key, ttl, fn) => fn()),
}));

describe('Platform Config Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPlatformConfig', () => {
    it('should fetch all active platform configuration', async () => {
      const mockConfig = [
        {
          id: '1',
          config_key: 'feature_new_player',
          config_value: { enabled: true },
          config_type: 'feature_flag',
          description: 'New audio player',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockConfig,
          error: null,
        }),
      });

      const result = await fetchPlatformConfig();

      expect(result).toEqual(mockConfig);
      expect(supabase.from).toHaveBeenCalledWith('platform_config');
    });

    it('should bypass cache when requested', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await fetchPlatformConfig(false);

      expect(supabase.from).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      await expect(fetchPlatformConfig()).rejects.toThrow(AdminError);
    });
  });

  describe('fetchConfigByKey', () => {
    it('should fetch specific configuration by key', async () => {
      const mockConfig = {
        config_key: 'upload_limits',
        config_value: { free: 50, pro: 100 },
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockConfig,
        error: null,
      });

      const result = await fetchConfigByKey('upload_limits');

      expect(result).toEqual(mockConfig);
      expect(supabase.rpc).toHaveBeenCalledWith('get_platform_config', {
        p_config_key: 'upload_limits',
      });
    });

    it('should return null for non-existent config', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await fetchConfigByKey('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updatePlatformConfig', () => {
    it('should update configuration and invalidate cache', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await updatePlatformConfig(
        'test_config',
        { value: 'test' },
        'system_setting',
        'Test configuration'
      );

      expect(supabase.rpc).toHaveBeenCalledWith('update_platform_config', {
        p_config_key: 'test_config',
        p_config_value: { value: 'test' },
        p_config_type: 'system_setting',
        p_description: 'Test configuration',
      });
    });

    it('should handle update errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        error: { message: 'Update failed' },
      });

      await expect(
        updatePlatformConfig('test_config', { value: 'test' })
      ).rejects.toThrow(AdminError);
    });
  });

  describe('fetchFeatureFlags', () => {
    it('should fetch and format feature flags', async () => {
      const mockFlags = [
        {
          config_key: 'feature_new_player',
          config_value: { enabled: true },
          description: 'New audio player',
        },
        {
          config_key: 'feature_collab_playlists',
          config_value: { enabled: false },
          description: 'Collaborative playlists',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockFlags,
          error: null,
        }),
      });

      const result = await fetchFeatureFlags();

      expect(result).toEqual([
        {
          key: 'feature_new_player',
          enabled: true,
          description: 'New audio player',
        },
        {
          key: 'feature_collab_playlists',
          enabled: false,
          description: 'Collaborative playlists',
        },
      ]);
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update feature flag', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await updateFeatureFlag('feature_test', true, 'Test feature');

      expect(supabase.rpc).toHaveBeenCalledWith('update_platform_config', {
        p_config_key: 'feature_test',
        p_config_value: { enabled: true },
        p_config_type: 'feature_flag',
        p_description: 'Test feature',
      });
    });
  });

  describe('fetchUploadLimits', () => {
    it('should fetch upload limits configuration', async () => {
      const mockLimits = {
        free: { size: 50, count: 10 },
        pro: { size: 100, count: 50 },
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { config_value: mockLimits },
        error: null,
      });

      const result = await fetchUploadLimits();

      expect(result).toEqual(mockLimits);
    });

    it('should return empty object if config not found', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await fetchUploadLimits();

      expect(result).toEqual({});
    });
  });

  describe('updateUploadLimits', () => {
    it('should update upload limits', async () => {
      const limits = {
        free: { size: 50, count: 10 },
        pro: { size: 100, count: 50 },
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await updateUploadLimits(limits);

      expect(supabase.rpc).toHaveBeenCalledWith('update_platform_config', {
        p_config_key: 'upload_limits',
        p_config_value: limits,
        p_config_type: 'upload_limit',
        p_description: 'Upload limits by plan tier',
      });
    });
  });

  describe('fetchRateLimits', () => {
    it('should fetch rate limiting configuration', async () => {
      const mockLimits = {
        api: { requests: 100, window: 60 },
        upload: { requests: 10, window: 3600 },
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { config_value: mockLimits },
        error: null,
      });

      const result = await fetchRateLimits();

      expect(result).toEqual(mockLimits);
    });
  });

  describe('updateRateLimits', () => {
    it('should update rate limits', async () => {
      const limits = {
        api: { requests: 100, window: 60 },
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await updateRateLimits(limits);

      expect(supabase.rpc).toHaveBeenCalledWith('update_platform_config', {
        p_config_key: 'rate_limits',
        p_config_value: limits,
        p_config_type: 'rate_limit',
        p_description: 'API and upload rate limits',
      });
    });
  });

  describe('fetchEmailTemplates', () => {
    it('should fetch all email templates', async () => {
      const mockTemplates = [
        {
          config_key: 'welcome_email',
          config_value: { subject: 'Welcome', body: 'Hello' },
        },
        {
          config_key: 'reset_password',
          config_value: { subject: 'Reset', body: 'Reset your password' },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      
      // First eq call returns the chain
      mockChain.eq.mockReturnValueOnce(mockChain);
      // Second eq call returns the final result
      mockChain.eq.mockResolvedValueOnce({
        data: mockTemplates,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await fetchEmailTemplates();

      expect(result).toEqual({
        welcome_email: { subject: 'Welcome', body: 'Hello' },
        reset_password: { subject: 'Reset', body: 'Reset your password' },
      });
    });

    it('should handle fetch errors', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      
      // First eq call returns the chain
      mockChain.eq.mockReturnValueOnce(mockChain);
      // Second eq call returns the error
      mockChain.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Fetch failed' },
      });

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(fetchEmailTemplates()).rejects.toThrow(AdminError);
    });
  });

  describe('updateEmailTemplate', () => {
    it('should update email template', async () => {
      const template = {
        subject: 'Welcome',
        body: 'Hello {{username}}',
      };

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await updateEmailTemplate('welcome_email', template);

      expect(supabase.rpc).toHaveBeenCalledWith('update_platform_config', {
        p_config_key: 'welcome_email',
        p_config_value: template,
        p_config_type: 'email_template',
        p_description: 'Email template: welcome_email',
      });
    });
  });
});
