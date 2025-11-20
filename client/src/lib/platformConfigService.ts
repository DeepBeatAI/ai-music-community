/**
 * Platform Config Service
 * 
 * This service provides functions for managing platform-wide configuration settings.
 * Includes caching for performance and audit logging for all changes.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { supabase } from '@/lib/supabase';
import { AdminError, ADMIN_ERROR_CODES, PlatformConfig } from '@/types/admin';
import { 
  adminCache, 
  ADMIN_CACHE_KEYS, 
  ADMIN_CACHE_TTL,
  cachedFetch 
} from '@/utils/adminCache';

/**
 * Feature flag interface
 */
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
}

/**
 * Fetch all platform configuration with caching
 * Requirements: 4.1
 * Caching: In-memory (24 hour TTL, invalidated on changes)
 */
export async function fetchPlatformConfig(useCache = true): Promise<PlatformConfig[]> {
  try {
    if (!useCache) {
      // Bypass cache if requested
      const { data, error } = await supabase
        .from('platform_config')
        .select('*')
        .eq('is_active', true)
        .order('config_key');

      if (error) {
        throw new AdminError(
          'Failed to fetch platform configuration',
          ADMIN_ERROR_CODES.DATABASE_ERROR,
          { originalError: error }
        );
      }

      return data || [];
    }

    const cacheKey = ADMIN_CACHE_KEYS.PLATFORM_CONFIG();

    // Use cached fetch with long TTL (invalidated on changes)
    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.PLATFORM_CONFIG,
      async () => {
        const { data, error } = await supabase
          .from('platform_config')
          .select('*')
          .eq('is_active', true)
          .order('config_key');

        if (error) {
          throw new AdminError(
            'Failed to fetch platform configuration',
            ADMIN_ERROR_CODES.DATABASE_ERROR,
            { originalError: error }
          );
        }

        return data || [];
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching platform config',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch a specific configuration value by key
 * Requirements: 4.1
 * Caching: In-memory (24 hour TTL, invalidated on changes)
 */
export async function fetchConfigByKey(
  configKey: string,
  useCache = true
): Promise<PlatformConfig | null> {
  try {
    if (!useCache) {
      // Bypass cache if requested
      const { data, error } = await supabase.rpc('get_platform_config', {
        p_config_key: configKey,
      });

      if (error) {
        throw new AdminError(
          `Failed to fetch config: ${configKey}`,
          ADMIN_ERROR_CODES.DATABASE_ERROR,
          { originalError: error }
        );
      }

      return data;
    }

    const cacheKey = ADMIN_CACHE_KEYS.PLATFORM_CONFIG(configKey);

    // Use cached fetch with long TTL (invalidated on changes)
    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.PLATFORM_CONFIG,
      async () => {
        const { data, error } = await supabase.rpc('get_platform_config', {
          p_config_key: configKey,
        });

        if (error) {
          throw new AdminError(
            `Failed to fetch config: ${configKey}`,
            ADMIN_ERROR_CODES.DATABASE_ERROR,
            { originalError: error }
          );
        }

        return data;
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      `An unexpected error occurred while fetching config: ${configKey}`,
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}



/**
 * Update platform configuration with audit logging
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
export async function updatePlatformConfig(
  configKey: string,
  configValue: Record<string, unknown>,
  configType: PlatformConfig['config_type'] = 'system_setting',
  description?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_platform_config', {
      p_config_key: configKey,
      p_config_value: configValue,
      p_config_type: configType,
      p_description: description || null,
    });

    if (error) {
      throw new AdminError(
        'Failed to update platform configuration',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Invalidate all config caches
    adminCache.invalidateConfigCaches();
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while updating platform config',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch all feature flags
 * Requirements: 4.1
 * Caching: In-memory (24 hour TTL, invalidated on changes)
 */
export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const cacheKey = ADMIN_CACHE_KEYS.FEATURE_FLAGS();

    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.PLATFORM_CONFIG,
      async () => {
        const { data, error } = await supabase
          .from('platform_config')
          .select('config_key, config_value, description')
          .eq('config_type', 'feature_flag')
          .eq('is_active', true)
          .order('config_key');

        if (error) {
          throw new AdminError(
            'Failed to fetch feature flags',
            ADMIN_ERROR_CODES.DATABASE_ERROR,
            { originalError: error }
          );
        }

        return (data || []).map((item: any) => ({
          key: item.config_key,
          enabled: item.config_value?.enabled === true,
          description: item.description || '',
        }));
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching feature flags',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Update a feature flag
 * Requirements: 4.1
 */
export async function updateFeatureFlag(
  flagKey: string,
  enabled: boolean,
  description?: string
): Promise<void> {
  try {
    await updatePlatformConfig(
      flagKey,
      { enabled },
      'feature_flag',
      description
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while updating feature flag',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch upload limits by plan tier
 * Requirements: 4.2
 */
export async function fetchUploadLimits(): Promise<Record<string, any>> {
  try {
    const config = await fetchConfigByKey('upload_limits');
    return config?.config_value || {};
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching upload limits',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Update upload limits by plan tier
 * Requirements: 4.2
 */
export async function updateUploadLimits(
  limits: Record<string, any>
): Promise<void> {
  try {
    await updatePlatformConfig(
      'upload_limits',
      limits,
      'upload_limit',
      'Upload limits by plan tier'
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while updating upload limits',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch rate limiting configuration
 * Requirements: 4.6
 */
export async function fetchRateLimits(): Promise<Record<string, any>> {
  try {
    const config = await fetchConfigByKey('rate_limits');
    return config?.config_value || {};
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching rate limits',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Update rate limiting configuration
 * Requirements: 4.6
 */
export async function updateRateLimits(
  limits: Record<string, any>
): Promise<void> {
  try {
    await updatePlatformConfig(
      'rate_limits',
      limits,
      'rate_limit',
      'API and upload rate limits'
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while updating rate limits',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch email templates
 * Requirements: 4.7
 */
export async function fetchEmailTemplates(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('platform_config')
      .select('config_key, config_value')
      .eq('config_type', 'email_template')
      .eq('is_active', true);

    if (error) {
      throw new AdminError(
        'Failed to fetch email templates',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    const templates: Record<string, any> = {};
    (data || []).forEach((item: any) => {
      templates[item.config_key] = item.config_value;
    });

    return templates;
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching email templates',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Update an email template
 * Requirements: 4.7
 */
export async function updateEmailTemplate(
  templateKey: string,
  templateContent: Record<string, any>
): Promise<void> {
  try {
    await updatePlatformConfig(
      templateKey,
      templateContent,
      'email_template',
      `Email template: ${templateKey}`
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while updating email template',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Clear configuration cache
 */
export function clearConfigCache(): void {
  adminCache.invalidateConfigCaches();
}
