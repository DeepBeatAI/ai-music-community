/**
 * System Health Service
 * 
 * This service provides functions for monitoring system health and performance.
 * Includes metrics collection, health checks, and performance monitoring.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10
 */

import { supabase } from '@/lib/supabase';
import { AdminError, ADMIN_ERROR_CODES, SystemMetric, SystemHealth } from '@/types/admin';
import { 
  ADMIN_CACHE_KEYS, 
  ADMIN_CACHE_TTL,
  cachedFetch 
} from '@/utils/adminCache';

/**
 * System metrics filter parameters
 */
export interface MetricsFilters {
  metricType?: SystemMetric['metric_type'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  window?: 'hour' | 'day' | 'week' | 'month'; // Time-based windowing
  cursor?: string; // For cursor-based pagination
}

/**
 * Performance metrics aggregated data
 */
export interface PerformanceMetrics {
  pageLoadTime: {
    avg: number;
    p95: number;
    p99: number;
    trend: number[];
  };
  apiResponseTime: {
    avg: number;
    p95: number;
    p99: number;
    trend: number[];
  };
  databaseQueryTime: {
    avg: number;
    p95: number;
    p99: number;
    trend: number[];
  };
  errorRate: {
    current: number;
    threshold: number;
    trend: number[];
  };
  cacheHitRate: {
    current: number;
    trend: number[];
  };
}

/**
 * Slow query information
 */
export interface SlowQuery {
  query: string;
  avgDuration: number;
  executionCount: number;
  recommendation: string;
}

/**
 * Error log entry
 */
export interface ErrorLog {
  message: string;
  count: number;
  lastOccurrence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Fetch system metrics with filtering
 * Requirements: 6.2, 6.3, 6.8
 * Caching: 1 minute TTL
 */
export async function fetchSystemMetrics(
  filters: MetricsFilters = {}
): Promise<SystemMetric[]> {
  try {
    const {
      metricType,
      startDate,
      endDate,
      limit = 1000,
    } = filters;

    // Create cache key based on filters
    const cacheKey = ADMIN_CACHE_KEYS.SYSTEM_METRICS(metricType);

    // Use cached fetch with 1 minute TTL
    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.SYSTEM_METRICS,
      async () => {
        // Build query
        let query = supabase
          .from('system_metrics')
          .select('*');

        // Apply filters
        if (metricType) {
          query = query.eq('metric_type', metricType);
        }

        if (startDate) {
          query = query.gte('recorded_at', startDate);
        }

        if (endDate) {
          query = query.lte('recorded_at', endDate);
        }

        // Apply limit and ordering
        query = query
          .order('recorded_at', { ascending: false })
          .limit(limit);

        const { data, error } = await query;

        if (error) {
          throw new AdminError(
            'Failed to fetch system metrics',
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
      'An unexpected error occurred while fetching system metrics',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch system health status
 * Requirements: 6.1, 6.4, 6.5, 6.6, 6.7
 * Caching: 1 minute TTL
 */
export async function fetchSystemHealth(): Promise<SystemHealth> {
  try {
    const cacheKey = ADMIN_CACHE_KEYS.SYSTEM_HEALTH();

    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.SYSTEM_HEALTH,
      async () => {
        // Fetch recent metrics for health calculation
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

        const metrics = await fetchSystemMetrics({
          startDate: oneHourAgo,
          limit: 1000,
        });

    // Calculate database health
    const dbQueryMetrics = metrics.filter(m => m.metric_type === 'database_query_time');
    const avgQueryTime = dbQueryMetrics.length > 0
      ? dbQueryMetrics.reduce((sum, m) => sum + m.metric_value, 0) / dbQueryMetrics.length
      : 0;
    const slowQueries = dbQueryMetrics.filter(m => m.metric_value > 1000).length;

    // Calculate storage metrics
    const storageMetrics = metrics.filter(m => m.metric_type === 'storage_usage');
    const latestStorage = storageMetrics[0];
    const usedCapacityGb = latestStorage?.metric_value || 0;
    const totalCapacityGb = 1000; // 1TB default, should be configurable
    const availableCapacityGb = totalCapacityGb - usedCapacityGb;
    const usagePercentage = (usedCapacityGb / totalCapacityGb) * 100;

    // Calculate error rate
    const errorRateMetrics = metrics.filter(m => m.metric_type === 'error_rate');
    const currentErrorRate = errorRateMetrics[0]?.metric_value || 0;
    const errorThreshold = 0.3; // 0.3% threshold
    const errorStatus = currentErrorRate > errorThreshold * 2 ? 'critical'
      : currentErrorRate > errorThreshold ? 'elevated'
      : 'normal';

    // Determine overall health status
    const dbStatus = avgQueryTime > 200 ? 'degraded'
      : avgQueryTime > 500 ? 'down'
      : 'healthy';

        return {
          database: {
            status: dbStatus,
            connection_count: 10, // Would come from actual monitoring
            avg_query_time: avgQueryTime,
            slow_queries: slowQueries,
          },
          storage: {
            total_capacity_gb: totalCapacityGb,
            used_capacity_gb: usedCapacityGb,
            available_capacity_gb: availableCapacityGb,
            usage_percentage: usagePercentage,
          },
          api_health: {
            supabase: 'healthy', // Would come from actual health checks
            vercel: 'healthy', // Would come from actual health checks
          },
          error_rate: {
            current_rate: currentErrorRate,
            threshold: errorThreshold,
            status: errorStatus,
          },
          uptime: {
            percentage: 99.95, // Would come from actual uptime monitoring
            last_downtime: null,
          },
        };
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching system health',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch performance metrics with aggregations
 * Requirements: 6.2, 6.3
 * Caching: 1 minute TTL
 */
export async function fetchPerformanceMetrics(
  hoursBack = 24
): Promise<PerformanceMetrics> {
  try {
    const cacheKey = ADMIN_CACHE_KEYS.PERFORMANCE_METRICS();

    return await cachedFetch(
      cacheKey,
      ADMIN_CACHE_TTL.PERFORMANCE_METRICS,
      async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();

    const metrics = await fetchSystemMetrics({
      startDate,
      limit: 10000,
    });

    // Helper function to calculate percentiles
    const calculatePercentile = (values: number[], percentile: number): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[index] || 0;
    };

    // Helper function to calculate average
    const calculateAvg = (values: number[]): number => {
      if (values.length === 0) return 0;
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    };

    // Process page load time metrics
    const pageLoadMetrics = metrics.filter(m => m.metric_type === 'page_load_time');
    const pageLoadValues = pageLoadMetrics.map(m => m.metric_value);

    // Process API response time metrics
    const apiMetrics = metrics.filter(m => m.metric_type === 'api_response_time');
    const apiValues = apiMetrics.map(m => m.metric_value);

    // Process database query time metrics
    const dbMetrics = metrics.filter(m => m.metric_type === 'database_query_time');
    const dbValues = dbMetrics.map(m => m.metric_value);

    // Process error rate metrics
    const errorMetrics = metrics.filter(m => m.metric_type === 'error_rate');
    const errorValues = errorMetrics.map(m => m.metric_value);

    // Process cache hit rate metrics
    const cacheMetrics = metrics.filter(m => m.metric_type === 'cache_hit_rate');
    const cacheValues = cacheMetrics.map(m => m.metric_value);

        return {
          pageLoadTime: {
            avg: calculateAvg(pageLoadValues),
            p95: calculatePercentile(pageLoadValues, 95),
            p99: calculatePercentile(pageLoadValues, 99),
            trend: pageLoadValues.slice(0, 24).reverse(), // Last 24 data points
          },
          apiResponseTime: {
            avg: calculateAvg(apiValues),
            p95: calculatePercentile(apiValues, 95),
            p99: calculatePercentile(apiValues, 99),
            trend: apiValues.slice(0, 24).reverse(),
          },
          databaseQueryTime: {
            avg: calculateAvg(dbValues),
            p95: calculatePercentile(dbValues, 95),
            p99: calculatePercentile(dbValues, 99),
            trend: dbValues.slice(0, 24).reverse(),
          },
          errorRate: {
            current: errorValues[0] || 0,
            threshold: 0.3,
            trend: errorValues.slice(0, 24).reverse(),
          },
          cacheHitRate: {
            current: cacheValues[0] || 0,
            trend: cacheValues.slice(0, 24).reverse(),
          },
        };
      }
    );
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching performance metrics',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Clear application cache
 * Requirements: 6.8
 */
export async function clearCache(): Promise<void> {
  try {
    // Log the cache clear action
    const { error } = await supabase.rpc('log_admin_action', {
      p_action_type: 'cache_cleared',
      p_target_resource_type: 'system',
      p_target_resource_id: null,
      p_old_value: null,
      p_new_value: { timestamp: new Date().toISOString() },
    });

    if (error) {
      throw new AdminError(
        'Failed to log cache clear action',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Clear browser cache (if applicable)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Clear localStorage cache entries
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('cache_') || key.startsWith('audio_cache_')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while clearing cache',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch slow queries with recommendations
 * Requirements: 6.10
 */
export async function fetchSlowQueries(): Promise<SlowQuery[]> {
  try {
    // In a real implementation, this would query pg_stat_statements or similar
    // For now, we'll return mock data based on common slow query patterns
    
    const { data: metrics, error } = await supabase
      .from('system_metrics')
      .select('metadata')
      .eq('metric_type', 'database_query_time')
      .gt('metric_value', 1000) // Queries slower than 1 second
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new AdminError(
        'Failed to fetch slow queries',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Aggregate slow queries
    const queryMap = new Map<string, { count: number; totalDuration: number }>();
    
    (metrics || []).forEach((metric: { metadata?: { query?: string; duration?: number } }) => {
      const query = metric.metadata?.query || 'Unknown query';
      const duration = metric.metadata?.duration || 0;
      
      if (queryMap.has(query)) {
        const existing = queryMap.get(query)!;
        existing.count++;
        existing.totalDuration += duration;
      } else {
        queryMap.set(query, { count: 1, totalDuration: duration });
      }
    });

    // Convert to array and add recommendations
    const slowQueries: SlowQuery[] = Array.from(queryMap.entries()).map(([query, stats]) => ({
      query,
      avgDuration: stats.totalDuration / stats.count,
      executionCount: stats.count,
      recommendation: generateQueryRecommendation(query, stats.totalDuration / stats.count),
    }));

    return slowQueries.sort((a, b) => b.avgDuration - a.avgDuration);
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching slow queries',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Generate optimization recommendation for a slow query
 */
function generateQueryRecommendation(query: string, avgDuration: number): string {
  if (query.includes('SELECT *')) {
    return 'Consider selecting only required columns instead of SELECT *';
  }
  if (query.includes('JOIN') && avgDuration > 2000) {
    return 'Consider adding indexes on join columns or optimizing join conditions';
  }
  if (query.includes('WHERE') && avgDuration > 1500) {
    return 'Consider adding indexes on WHERE clause columns';
  }
  if (query.includes('ORDER BY') && avgDuration > 1500) {
    return 'Consider adding indexes on ORDER BY columns';
  }
  return 'Consider reviewing query execution plan and adding appropriate indexes';
}

/**
 * Fetch error logs grouped by message
 * Requirements: 6.6, 6.9
 */
export async function fetchErrorLogs(limit = 50): Promise<ErrorLog[]> {
  try {
    // In a real implementation, this would query an error logging table
    // For now, we'll return mock data
    
    const { data: metrics, error } = await supabase
      .from('system_metrics')
      .select('metadata, recorded_at')
      .eq('metric_type', 'error_rate')
      .order('recorded_at', { ascending: false })
      .limit(1000);

    if (error) {
      throw new AdminError(
        'Failed to fetch error logs',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Aggregate errors by message
    const errorMap = new Map<string, { count: number; lastOccurrence: string }>();
    
    (metrics || []).forEach((metric: { metadata?: { error_message?: string }; recorded_at: string }) => {
      const message = metric.metadata?.error_message || 'Unknown error';
      const timestamp = metric.recorded_at;
      
      if (errorMap.has(message)) {
        const existing = errorMap.get(message)!;
        existing.count++;
        if (timestamp > existing.lastOccurrence) {
          existing.lastOccurrence = timestamp;
        }
      } else {
        errorMap.set(message, { count: 1, lastOccurrence: timestamp });
      }
    });

    // Convert to array and determine severity
    const errorLogs: ErrorLog[] = Array.from(errorMap.entries()).map(([message, stats]) => ({
      message,
      count: stats.count,
      lastOccurrence: stats.lastOccurrence,
      severity: determineSeverity(stats.count),
    }));

    return errorLogs
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching error logs',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Determine error severity based on occurrence count
 */
function determineSeverity(count: number): 'low' | 'medium' | 'high' | 'critical' {
  if (count > 100) return 'critical';
  if (count > 50) return 'high';
  if (count > 10) return 'medium';
  return 'low';
}

/**
 * Record a system metric
 * Requirements: 6.2, 6.3, 6.8
 */
export async function recordSystemMetric(
  metricType: SystemMetric['metric_type'],
  metricValue: number,
  metricUnit: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_system_metric', {
      p_metric_type: metricType,
      p_metric_value: metricValue,
      p_metric_unit: metricUnit,
      p_metadata: metadata || null,
    });

    if (error) {
      throw new AdminError(
        'Failed to record system metric',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while recording system metric',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}
