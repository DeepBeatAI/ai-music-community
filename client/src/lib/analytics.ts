/**
 * Daily Metrics Analytics API Module
 * 
 * This module handles the daily metrics collection system.
 * For trending tracks and popular creators, see trendingAnalytics.ts
 */

import { supabase } from './supabase';
import type { CurrentMetrics, ActivityDataPoint, CollectionStatus } from '@/types/analytics';

/**
 * Map error codes to user-friendly messages
 * @param error - The error object from Supabase or network request
 * @returns User-friendly error message
 */
function getErrorMessage(error: unknown): string {
  // Handle Supabase error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case '42501':
        return 'Permission denied. Please contact support.';
      case 'PGRST116':
        return 'No data available yet.';
      default:
        // Log the unknown error code for debugging
        console.warn('Unknown error code:', code);
    }
  }

  // Handle network errors
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message).toLowerCase();
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return 'Connection error. Please check your internet.';
    }
  }

  // Handle TypeError for network issues
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Connection error. Please check your internet.';
  }

  // Default error message
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Fetch real-time metrics by querying live tables
 * This provides up-to-the-second counts without waiting for collection
 */
export async function fetchRealTimeMetrics(): Promise<CurrentMetrics> {
  try {
    console.log('Fetching real-time metrics from live tables...');

    // Query all three tables in parallel for performance
    // Note: user_profiles query doesn't use head:true due to RLS policy compatibility (returns 204 with null count)
    const [usersResult, tracksResult, commentsResult] = await Promise.all([
      supabase.from('user_profiles').select('user_id', { count: 'exact' }),
      supabase.from('tracks').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
    ]);

    // Check for errors in each query
    if (usersResult.error) {
      console.error('Error fetching users count:', {
        code: usersResult.error.code,
        message: usersResult.error.message,
        details: usersResult.error.details,
        hint: usersResult.error.hint,
      });
      throw usersResult.error;
    }

    if (tracksResult.error) {
      console.error('Error fetching tracks count:', {
        code: tracksResult.error.code,
        message: tracksResult.error.message,
        details: tracksResult.error.details,
        hint: tracksResult.error.hint,
      });
      throw tracksResult.error;
    }

    if (commentsResult.error) {
      console.error('Error fetching comments count:', {
        code: commentsResult.error.code,
        message: commentsResult.error.message,
        details: commentsResult.error.details,
        hint: commentsResult.error.hint,
      });
      throw commentsResult.error;
    }

    // Build metrics object from counts
    const metrics: CurrentMetrics = {
      totalUsers: usersResult.count || 0,
      totalPosts: tracksResult.count || 0,
      totalComments: commentsResult.count || 0,
    };

    console.log('Fetched real-time metrics:', {
      totalUsers: metrics.totalUsers,
      totalPosts: metrics.totalPosts,
      totalComments: metrics.totalComments,
    });

    return metrics;
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    const userMessage = getErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Trigger metric collection and return updated data
 * This combines collection with data refresh for the refresh button
 */
export async function refreshAnalytics(): Promise<{
  metrics: CurrentMetrics;
  activityData: ActivityDataPoint[];
}> {
  try {
    console.log('Starting analytics refresh...');

    // Step 1: Trigger metric collection for today
    const today = new Date().toISOString().split('T')[0];
    console.log('Triggering metric collection for:', today);
    await triggerMetricCollection(today);

    // Step 2: Wait for collection to complete
    console.log('Waiting 500ms for collection to complete...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Fetch updated data in parallel
    console.log('Fetching updated metrics and activity data...');
    const [metrics, activityData] = await Promise.all([
      fetchRealTimeMetrics(),
      fetchActivityData(),
    ]);

    console.log('Analytics refresh completed successfully:', {
      metricsCount: Object.keys(metrics).length,
      activityDataPoints: activityData.length,
    });

    return { metrics, activityData };
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    const userMessage = getErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Fetch current platform metrics
 */
export async function fetchCurrentMetrics(): Promise<CurrentMetrics> {
  try {
    // Step 1: Get the most recent metric_date
    const { data: latestDate, error: dateError } = await supabase
      .from('daily_metrics')
      .select('metric_date')
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dateError) {
      console.error('Error fetching latest metric date:', {
        code: dateError.code,
        message: dateError.message,
        details: dateError.details,
        hint: dateError.hint,
      });
      const userMessage = getErrorMessage(dateError);
      throw new Error(userMessage);
    }

    // Handle case where no data exists
    if (!latestDate) {
      console.log('No metrics data available yet');
      return {
        totalUsers: 0,
        totalPosts: 0,
        totalComments: 0,
      };
    }

    // Step 2: Query all metrics for that date
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('metric_date', latestDate.metric_date);

    if (error) {
      console.error('Error fetching metrics for date:', {
        date: latestDate.metric_date,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const userMessage = getErrorMessage(error);
      throw new Error(userMessage);
    }

    // Step 3: Aggregate metrics by category
    const metrics: CurrentMetrics = {
      totalUsers: 0,
      totalPosts: 0,
      totalComments: 0,
    };

    data?.forEach((metric) => {
      if (metric.metric_category === 'users_total') {
        metrics.totalUsers = metric.value;
      } else if (metric.metric_category === 'posts_total') {
        metrics.totalPosts = metric.value;
      } else if (metric.metric_category === 'comments_total') {
        metrics.totalComments = metric.value;
      }
    });

    console.log('Fetched current metrics:', {
      date: latestDate.metric_date,
      metrics,
      rowCount: data?.length || 0,
    });

    return metrics;
  } catch (error) {
    console.error('Error fetching current metrics:', error);
    const userMessage = getErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Fetch activity data over time
 * @param days - Number of days to look back (defaults to 30, null for all time)
 */
export async function fetchActivityData(days: number | null = 30): Promise<ActivityDataPoint[]> {
  try {
    // Calculate start date based on days parameter
    let startDate: string | null = null;
    
    if (days !== null) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      startDate = daysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }

    console.log('Fetching activity data from:', startDate || 'all time');

    // Fetch activity data from daily_metrics table
    const query = supabase
      .from('daily_metrics')
      .select('*')
      .order('metric_date', { ascending: true });
    
    // Only add date filter if startDate is specified
    if (startDate) {
      query.gte('metric_date', startDate);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching activity data:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const userMessage = getErrorMessage(error);
      throw new Error(userMessage);
    }

    // Transform to ActivityDataPoint format
    const activityMap = new Map<string, ActivityDataPoint>();

    data?.forEach((metric) => {
      const date = metric.metric_date;
      if (!activityMap.has(date)) {
        activityMap.set(date, {
          date,
          users: 0,
          posts: 0,
          comments: 0,
        });
      }

      const activity = activityMap.get(date)!;
      if (metric.metric_category === 'users_total') {
        activity.users = metric.value;
      } else if (metric.metric_category === 'posts_created') {
        activity.posts = metric.value;
      } else if (metric.metric_category === 'comments_created') {
        activity.comments = metric.value;
      }
    });

    const result = Array.from(activityMap.values());
    console.log('Fetched activity data:', {
      startDate,
      daysReturned: result.length,
      dateRange: result.length > 0 ? `${result[0].date} to ${result[result.length - 1].date}` : 'no data',
    });

    return result;
  } catch (error) {
    console.error('Error fetching activity data:', error);
    const userMessage = getErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Trigger metric collection for a specific date
 */
export async function triggerMetricCollection(date: string): Promise<unknown> {
  try {
    console.log('Triggering metric collection for date:', date);
    
    // Call the database function to collect metrics
    const { data, error } = await supabase.rpc('collect_daily_metrics', {
      target_date: date,
    });

    if (error) {
      console.error('Error triggering metric collection:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error,
      });
      const userMessage = getErrorMessage(error);
      throw new Error(userMessage);
    }
    
    console.log('Metric collection triggered successfully:', data);
    return data;
  } catch (error) {
    console.error('Error triggering metric collection (caught):', error);
    // If it's already an Error object, re-throw it
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, create a new Error with the message
    const userMessage = getErrorMessage(error);
    throw new Error(userMessage);
  }
}

/**
 * Get collection status
 */
export async function getCollectionStatus(): Promise<CollectionStatus | null> {
  try {
    const { data, error } = await supabase
      .from('metric_collection_log')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching collection status:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const userMessage = getErrorMessage(error);
      throw new Error(userMessage);
    }
    
    // Handle null case - no collections yet
    if (!data) {
      console.log('No collection runs found in database');
      return null;
    }
    
    // Calculate duration from timestamps if both exist
    let durationMs = 0;
    if (data.started_at && data.completed_at) {
      const startTime = new Date(data.started_at).getTime();
      const endTime = new Date(data.completed_at).getTime();
      durationMs = endTime - startTime;
    }
    
    // Transform to CollectionStatus format
    const status: CollectionStatus = {
      last_run: data.completed_at || data.started_at || new Date().toISOString(),
      status: data.status || 'completed',
      metrics_collected: data.metrics_collected || 0,
      duration_ms: durationMs,
      error_message: data.error_message,
    };

    console.log('Fetched collection status:', {
      last_run: status.last_run,
      status: status.status,
      metrics_collected: status.metrics_collected,
      duration_ms: status.duration_ms,
      has_error: !!status.error_message,
      raw_data: {
        started_at: data.started_at,
        completed_at: data.completed_at,
        collection_date: data.collection_date,
      },
    });
    
    return status;
  } catch (error) {
    console.error('Error fetching collection status:', error);
    const userMessage = getErrorMessage(error);
    throw new Error(userMessage);
  }
}
