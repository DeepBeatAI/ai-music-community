/**
 * Trending Analytics API Module
 * 
 * Provides functions to fetch trending tracks and popular creators
 * with built-in caching to reduce database load.
 * 
 * This is separate from the daily metrics analytics system.
 */

import { supabase } from './supabase';

export interface TrendingTrack {
  track_id: string;
  title: string;
  author: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  /** Audio file URL for playback in the mini player */
  file_url: string;
}

export interface PopularCreator {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_plays: number;
  total_likes: number;
  track_count: number;
  creator_score: number;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Get trending tracks for last 7 days
 */
export async function getTrendingTracks7Days(): Promise<TrendingTrack[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_tracks', {
      days_back: 7,
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending tracks (7d):', error);
    return [];
  }
}

/**
 * Get trending tracks for all time
 */
export async function getTrendingTracksAllTime(): Promise<TrendingTrack[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_tracks', {
      days_back: 0, // 0 means all time
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending tracks (all time):', error);
    return [];
  }
}

/**
 * Get popular creators for last 7 days
 */
export async function getPopularCreators7Days(): Promise<PopularCreator[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_creators', {
      days_back: 7,
      result_limit: 5,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular creators (7d):', error);
    return [];
  }
}

/**
 * Get popular creators for all time
 */
export async function getPopularCreatorsAllTime(): Promise<PopularCreator[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_creators', {
      days_back: 0, // 0 means all time
      result_limit: 5,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular creators (all time):', error);
    return [];
  }
}

/**
 * Cache wrapper for analytics data (5 minute cache)
 */
export async function getCachedAnalytics<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  // Return cached data if still valid
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`[TrendingAnalytics] Cache hit for: ${key}`);
    return cached.data as T;
  }

  // Fetch fresh data
  console.log(`[TrendingAnalytics] Cache miss for: ${key}, fetching...`);
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

/**
 * Clear analytics cache (useful for testing or manual refresh)
 */
export function clearAnalyticsCache(): void {
  cache.clear();
  console.log('[TrendingAnalytics] Cache cleared');
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
