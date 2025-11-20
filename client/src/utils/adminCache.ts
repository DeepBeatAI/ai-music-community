/**
 * Admin Cache Utility
 * 
 * Provides caching for admin dashboard data with appropriate TTLs
 * to optimize performance and reduce database load.
 */

import { cache } from './cache';

// Admin cache key generators
export const ADMIN_CACHE_KEYS = {
  // User management caching (5 minute TTL)
  USER_LIST: (page: number, filters?: string) => 
    `admin:users:${page}:${filters || 'all'}`,
  USER_DETAILS: (userId: string) => 
    `admin:user:${userId}`,
  USER_ACTIVITY: (userId: string) => 
    `admin:user:activity:${userId}`,
  
  // Platform config caching (in-memory, no expiry until invalidated)
  PLATFORM_CONFIG: (configKey?: string) => 
    configKey ? `admin:config:${configKey}` : 'admin:config:all',
  FEATURE_FLAGS: () => 
    'admin:config:feature-flags',
  
  // Metrics caching (1 minute TTL)
  SYSTEM_METRICS: (metricType?: string) => 
    metricType ? `admin:metrics:${metricType}` : 'admin:metrics:all',
  SYSTEM_HEALTH: () => 
    'admin:metrics:health',
  PERFORMANCE_METRICS: () => 
    'admin:metrics:performance',
  
  // Analytics caching (15 minute TTL)
  ANALYTICS_USER_GROWTH: (dateRange: string) => 
    `admin:analytics:user-growth:${dateRange}`,
  ANALYTICS_CONTENT: (dateRange: string) => 
    `admin:analytics:content:${dateRange}`,
  ANALYTICS_ENGAGEMENT: (dateRange: string) => 
    `admin:analytics:engagement:${dateRange}`,
  ANALYTICS_PLAN_DISTRIBUTION: () => 
    'admin:analytics:plan-distribution',
  ANALYTICS_REVENUE: (dateRange: string) => 
    `admin:analytics:revenue:${dateRange}`,
  ANALYTICS_TOP_CREATORS: (limit: number) => 
    `admin:analytics:top-creators:${limit}`,
  
  // Security caching (1 minute TTL)
  SECURITY_EVENTS: (page: number, filters?: string) => 
    `admin:security:events:${page}:${filters || 'all'}`,
  AUDIT_LOGS: (page: number, filters?: string) => 
    `admin:security:audit:${page}:${filters || 'all'}`,
  ACTIVE_SESSIONS: () => 
    'admin:security:sessions',
} as const;

// Admin cache TTL constants (in milliseconds)
export const ADMIN_CACHE_TTL = {
  // User management: 5 minutes
  USER_LIST: 5 * 60 * 1000,
  USER_DETAILS: 5 * 60 * 1000,
  USER_ACTIVITY: 5 * 60 * 1000,
  
  // Platform config: in-memory (very long TTL, invalidated on changes)
  PLATFORM_CONFIG: 24 * 60 * 60 * 1000, // 24 hours (effectively permanent until invalidated)
  
  // Metrics: 1 minute
  SYSTEM_METRICS: 1 * 60 * 1000,
  SYSTEM_HEALTH: 1 * 60 * 1000,
  PERFORMANCE_METRICS: 1 * 60 * 1000,
  
  // Analytics: 15 minutes
  ANALYTICS: 15 * 60 * 1000,
  
  // Security: 1 minute
  SECURITY_EVENTS: 1 * 60 * 1000,
  AUDIT_LOGS: 1 * 60 * 1000,
  ACTIVE_SESSIONS: 1 * 60 * 1000,
} as const;

/**
 * Admin-specific cache operations
 */
export const adminCache = {
  /**
   * Get cached data with admin-specific TTL
   */
  get: <T>(key: string): T | null => {
    return cache.get<T>(key);
  },

  /**
   * Set cached data with admin-specific TTL
   */
  set: <T>(key: string, data: T, ttl: number): void => {
    cache.set(key, data, ttl);
  },

  /**
   * Check if cache key exists
   */
  has: (key: string): boolean => {
    return cache.has(key);
  },

  /**
   * Invalidate specific cache entry
   */
  invalidate: (key: string): void => {
    cache.invalidate(key);
  },

  /**
   * Invalidate all user-related caches
   * Call this when user data changes (role change, suspension, etc.)
   */
  invalidateUserCaches: (userId?: string): void => {
    if (userId) {
      // Invalidate specific user caches
      cache.invalidate(ADMIN_CACHE_KEYS.USER_DETAILS(userId));
      cache.invalidate(ADMIN_CACHE_KEYS.USER_ACTIVITY(userId));
    }
    
    // Invalidate all user list caches
    cache.invalidatePattern(/^admin:users:/);
    
    // Invalidate analytics that depend on user data
    cache.invalidatePattern(/^admin:analytics:/);
  },

  /**
   * Invalidate all platform config caches
   * Call this when platform configuration changes
   */
  invalidateConfigCaches: (): void => {
    cache.invalidatePattern(/^admin:config:/);
  },

  /**
   * Invalidate all metrics caches
   * Call this when new metrics are recorded
   */
  invalidateMetricsCaches: (): void => {
    cache.invalidatePattern(/^admin:metrics:/);
  },

  /**
   * Invalidate all analytics caches
   * Call this when analytics data needs refresh
   */
  invalidateAnalyticsCaches: (): void => {
    cache.invalidatePattern(/^admin:analytics:/);
  },

  /**
   * Invalidate all security-related caches
   * Call this when security events or audit logs change
   */
  invalidateSecurityCaches: (): void => {
    cache.invalidatePattern(/^admin:security:/);
  },

  /**
   * Clear all admin caches
   * Use sparingly - only when necessary
   */
  clearAll: (): void => {
    cache.invalidatePattern(/^admin:/);
  },

  /**
   * Get cache statistics for admin caches
   */
  getStats: (): { size: number; keys: string[] } => {
    const allStats = cache.getStats();
    const adminKeys = allStats.keys.filter(key => key.startsWith('admin:'));
    
    return {
      size: adminKeys.length,
      keys: adminKeys,
    };
  },
};

/**
 * Helper function to create a cached fetch wrapper
 * 
 * @param cacheKey - Cache key to use
 * @param ttl - Time to live in milliseconds
 * @param fetchFn - Function to fetch data if not cached
 * @returns Cached data or freshly fetched data
 */
export async function cachedFetch<T>(
  cacheKey: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = adminCache.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  adminCache.set(cacheKey, data, ttl);

  return data;
}

/**
 * Helper function to create a cached fetch wrapper with error handling
 * 
 * @param cacheKey - Cache key to use
 * @param ttl - Time to live in milliseconds
 * @param fetchFn - Function to fetch data if not cached
 * @param fallbackValue - Value to return on error
 * @returns Cached data, freshly fetched data, or fallback value
 */
export async function cachedFetchWithFallback<T>(
  cacheKey: string,
  ttl: number,
  fetchFn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    return await cachedFetch(cacheKey, ttl, fetchFn);
  } catch (error) {
    console.error(`Error fetching data for cache key ${cacheKey}:`, error);
    
    // Try to return stale cache data if available
    const staleCache = cache.get<T>(cacheKey);
    if (staleCache !== null) {
      console.warn(`Returning stale cache for ${cacheKey}`);
      return staleCache;
    }
    
    return fallbackValue;
  }
}
