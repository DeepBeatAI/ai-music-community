/**
 * Daily Metrics Analytics API Module
 * 
 * This module handles the daily metrics collection system.
 * For trending tracks and popular creators, see trendingAnalytics.ts
 */

import { supabase } from './supabase';
import type { CurrentMetrics, ActivityDataPoint } from '@/types/analytics';

/**
 * Fetch current platform metrics
 */
export async function fetchCurrentMetrics(): Promise<CurrentMetrics> {
  try {
    // Fetch latest metrics from daily_metrics table
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('metric_date', { ascending: false })
      .limit(1);

    if (error) throw error;

    // Transform to CurrentMetrics format
    const metrics: CurrentMetrics = {
      totalUsers: 0,
      totalPosts: 0,
      totalComments: 0,
    };

    if (data && data.length > 0) {
      // Extract metrics from the data
      // This is a simplified version - adjust based on your actual schema
      data.forEach((metric: any) => {
        if (metric.metric_category === 'users_total') {
          metrics.totalUsers = metric.value;
        } else if (metric.metric_category === 'posts_total') {
          metrics.totalPosts = metric.value;
        } else if (metric.metric_category === 'comments_total') {
          metrics.totalComments = metric.value;
        }
      });
    }

    return metrics;
  } catch (error) {
    console.error('Error fetching current metrics:', error);
    throw error;
  }
}

/**
 * Fetch activity data over time
 */
export async function fetchActivityData(): Promise<ActivityDataPoint[]> {
  try {
    // Fetch activity data from daily_metrics table
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('metric_date', { ascending: true })
      .limit(30); // Last 30 days

    if (error) throw error;

    // Transform to ActivityDataPoint format
    const activityMap = new Map<string, ActivityDataPoint>();

    data?.forEach((metric: any) => {
      const date = metric.metric_date;
      if (!activityMap.has(date)) {
        activityMap.set(date, {
          date,
          posts: 0,
          comments: 0,
        });
      }

      const activity = activityMap.get(date)!;
      if (metric.metric_category === 'posts_created') {
        activity.posts = metric.value;
      } else if (metric.metric_category === 'comments_created') {
        activity.comments = metric.value;
      }
    });

    return Array.from(activityMap.values());
  } catch (error) {
    console.error('Error fetching activity data:', error);
    throw error;
  }
}

/**
 * Trigger metric collection for a specific date
 */
export async function triggerMetricCollection(date: string): Promise<any> {
  try {
    // Call the database function to collect metrics
    const { data, error } = await supabase.rpc('collect_daily_metrics', {
      collection_date: date,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error triggering metric collection:', error);
    throw error;
  }
}

/**
 * Get collection status
 */
export async function getCollectionStatus(): Promise<unknown> {
  try {
    const { data, error } = await supabase
      .from('metric_collection_log')
      .select('*')
      .order('collection_date', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching collection status:', error);
    throw error;
  }
}
