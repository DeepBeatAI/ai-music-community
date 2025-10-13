/**
 * Analytics API Functions
 * 
 * Query functions for the analytics metrics system that provides
 * access to daily snapshots of platform activity.
 */

import { supabase } from '@/lib/supabase';
import type { 
  DailyMetric, 
  MetricsQueryParams, 
  ActivityDataPoint,
  CurrentMetrics,
  MetricCollectionResult,
  CollectionStatus,
  MetricCollectionLog
} from '@/types/analytics';

/**
 * Fetch metrics for a date range with optional filtering
 * 
 * @param params - Query parameters including date range and optional filters
 * @returns Array of daily metrics matching the query criteria
 * @throws Error if the query fails
 */
export async function fetchMetrics(params: MetricsQueryParams): Promise<DailyMetric[]> {
  try {
    let query = supabase
      .from('daily_metrics')
      .select('*')
      .gte('metric_date', params.startDate)
      .lte('metric_date', params.endDate)
      .order('metric_date', { ascending: true });

    // Apply category filter if provided
    if (params.categories && params.categories.length > 0) {
      query = query.in('metric_category', params.categories);
    }

    // Apply type filter if provided
    if (params.types && params.types.length > 0) {
      query = query.in('metric_type', params.types);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}

/**
 * Fetch current platform metrics (latest snapshot)
 * 
 * Retrieves the most recent values for users_total, posts_total, and comments_total
 * and transforms them into a dashboard-friendly format.
 * 
 * @returns Current metrics summary for dashboard display
 * @throws Error if the query fails
 */
export async function fetchCurrentMetrics(): Promise<CurrentMetrics> {
  try {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('metric_category, value, metric_date')
      .in('metric_category', ['users_total', 'posts_total', 'comments_total'])
      .order('metric_date', { ascending: false })
      .limit(3);

    if (error) {
      throw new Error(`Failed to fetch current metrics: ${error.message}`);
    }

    // Initialize with default values
    const metrics: CurrentMetrics = {
      totalUsers: 0,
      totalPosts: 0,
      totalComments: 0,
    };

    // Handle missing data gracefully by using defaults
    if (!data || data.length === 0) {
      console.warn('No current metrics found, returning defaults');
      return metrics;
    }

    // Transform data to expected format
    // Note: We get the latest date for each category
    const latestByCategory = new Map<string, number>();
    
    data.forEach((metric) => {
      if (!latestByCategory.has(metric.metric_category)) {
        latestByCategory.set(metric.metric_category, metric.value);
      }
    });

    metrics.totalUsers = latestByCategory.get('users_total') || 0;
    metrics.totalPosts = latestByCategory.get('posts_total') || 0;
    metrics.totalComments = latestByCategory.get('comments_total') || 0;

    return metrics;
  } catch (error) {
    console.error('Error fetching current metrics:', error);
    throw error;
  }
}

/**
 * Fetch activity data for chart (last 30 days)
 * 
 * Retrieves posts_created and comments_created metrics for the past 30 days
 * and groups them by date for chart visualization.
 * 
 * @returns Array of activity data points with posts and comments per day
 * @throws Error if the query fails
 */
export async function fetchActivityData(): Promise<ActivityDataPoint[]> {
  try {
    // Calculate 30-day date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data, error } = await supabase
      .from('daily_metrics')
      .select('metric_date, metric_category, value')
      .in('metric_category', ['posts_created', 'comments_created'])
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch activity data: ${error.message}`);
    }

    // Group data by date
    const activityMap = new Map<string, { posts: number; comments: number }>();

    // Initialize all dates in range with zero values
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      activityMap.set(dateStr, { posts: 0, comments: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate with actual data
    data?.forEach((metric) => {
      const existing = activityMap.get(metric.metric_date) || { posts: 0, comments: 0 };
      
      if (metric.metric_category === 'posts_created') {
        existing.posts = metric.value;
      } else if (metric.metric_category === 'comments_created') {
        existing.comments = metric.value;
      }
      
      activityMap.set(metric.metric_date, existing);
    });

    // Convert to array and transform to ActivityDataPoint format
    return Array.from(activityMap.entries()).map(([date, counts]) => ({
      date,
      posts: counts.posts,
      comments: counts.comments,
    }));
  } catch (error) {
    console.error('Error fetching activity data:', error);
    throw error;
  }
}

/**
 * Trigger manual metric collection (admin only)
 * 
 * Calls the collect_daily_metrics RPC function to manually trigger
 * metric collection for a specific date or the current date.
 * 
 * @param targetDate - Optional date to collect metrics for (defaults to current date)
 * @returns Collection results including metrics collected and execution time
 * @throws Error if the RPC call fails
 */
export async function triggerMetricCollection(
  targetDate?: string
): Promise<MetricCollectionResult> {
  try {
    const dateParam = targetDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase.rpc('collect_daily_metrics', {
      target_date: dateParam,
    });

    if (error) {
      throw new Error(`Failed to trigger metric collection: ${error.message}`);
    }

    // The RPC function returns an array with a single result object
    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      throw new Error('No result returned from metric collection');
    }

    return result as MetricCollectionResult;
  } catch (error) {
    console.error('Error triggering metric collection:', error);
    throw error;
  }
}

/**
 * Get collection status from the most recent metric collection run
 * 
 * Queries the metric_collection_log table to retrieve information about
 * the latest collection run including status, duration, and any errors.
 * 
 * @returns Collection status information or null if no collections have run
 * @throws Error if the query fails
 */
export async function getCollectionStatus(): Promise<CollectionStatus | null> {
  try {
    const { data, error } = await supabase
      .from('metric_collection_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no records exist, return null instead of throwing
      if (error.code === 'PGRST116') {
        console.warn('No collection log entries found');
        return null;
      }
      throw new Error(`Failed to fetch collection status: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const log = data as MetricCollectionLog;

    // Calculate duration
    let duration_ms = 0;
    if (log.completed_at) {
      const startTime = new Date(log.started_at).getTime();
      const endTime = new Date(log.completed_at).getTime();
      duration_ms = endTime - startTime;
    } else if (log.status === 'running') {
      // If still running, calculate duration from start to now
      const startTime = new Date(log.started_at).getTime();
      const now = Date.now();
      duration_ms = now - startTime;
    }

    // Format status response
    const status: CollectionStatus = {
      last_run: log.started_at,
      status: log.status,
      metrics_collected: log.metrics_collected,
      duration_ms,
      error_message: log.error_message || undefined,
    };

    return status;
  } catch (error) {
    console.error('Error fetching collection status:', error);
    throw error;
  }
}
