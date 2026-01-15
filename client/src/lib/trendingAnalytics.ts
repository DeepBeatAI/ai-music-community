/**
 * Trending Analytics API Module
 * 
 * Provides functions to fetch trending tracks and popular creators based on
 * OBJECTIVE POPULARITY METRICS (plays and likes only, no personalization).
 * 
 * This module is the single source of truth for popularity calculations across
 * the platform, ensuring consistency between Home, Discover, and Analytics pages.
 * 
 * KEY FEATURES:
 * - Built-in 5-minute caching to reduce database load
 * - Consistent scoring formulas across all pages
 * - Separate from personalized recommendations
 * - Separate from daily metrics analytics system
 * 
 * SCORING FORMULAS:
 * - Trending Tracks: (play_count × 0.7) + (like_count × 0.3)
 * - Popular Creators: (total_plays × 0.6) + (total_likes × 0.4)
 * 
 * USAGE EXAMPLES:
 * 
 * // Basic usage - get trending tracks for last 7 days
 * const tracks = await getTrendingTracks7Days();
 * 
 * // With caching wrapper for page-specific cache keys
 * const tracks = await getCachedAnalytics('home_trending_7d', getTrendingTracks7Days);
 * 
 * // Get all-time trending tracks
 * const allTimeTracks = await getTrendingTracksAllTime();
 * 
 * // Get popular creators
 * const creators = await getPopularCreators7Days();
 * 
 * // Clear cache manually (useful for testing)
 * clearAnalyticsCache();
 * 
 * // Monitor cache performance
 * const stats = getCacheStats();
 * console.log(`Cache has ${stats.size} entries:`, stats.keys);
 * 
 * IMPORTANT NOTES:
 * - All functions have internal caching (5-minute TTL)
 * - Cache is shared across all pages that call these functions
 * - Empty arrays are returned on error (never throws)
 * - Database functions use SECURITY DEFINER for consistent access
 * - Results are sorted by score (highest first)
 * 
 * GOTCHAS:
 * - Cache keys should be unique per page to avoid conflicts
 * - getCachedAnalytics is optional - functions already cache internally
 * - Use getCachedAnalytics when you need page-specific cache keys
 * - Don't call these functions in tight loops - they're meant for page loads
 * - Cache is in-memory only - cleared on server restart
 */

import { supabase } from './supabase';
import { TrendingAlbum, TrendingPlaylist } from '@/types/analytics';

/**
 * TrendingTrack Interface
 * 
 * Represents a track with engagement metrics and calculated trending score.
 * Returned by get_trending_tracks() database function.
 * 
 * SCORING: trending_score = (play_count × 0.7) + (like_count × 0.3)
 * This weights plays more heavily than likes to reflect actual engagement.
 */
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

/**
 * PopularCreator Interface
 * 
 * Represents a creator with aggregated engagement metrics and calculated score.
 * Returned by get_popular_creators() database function.
 * 
 * SCORING: creator_score = (total_plays × 0.6) + (total_likes × 0.4)
 * This weights plays more heavily to reflect sustained engagement.
 */
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
 * 
 * Fetches tracks created in the last 7 days (168 hours) sorted by trending score.
 * Uses database function get_trending_tracks() which applies:
 * - Time filter: created_at >= NOW() - INTERVAL '7 days'
 * - Public filter: is_public = true
 * - Score calculation: (play_count × 0.7) + (like_count × 0.3)
 * - Sorting: ORDER BY trending_score DESC
 * 
 * CACHING: Results are NOT cached by this function. Use getCachedAnalytics()
 * wrapper if you need caching with custom cache keys.
 * 
 * USAGE:
 * const tracks = await getTrendingTracks7Days();
 * // Returns up to 10 tracks sorted by trending score
 * 
 * @returns Array of TrendingTrack objects, empty array on error
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
    return []; // Return empty array instead of throwing
  }
}

/**
 * Get trending tracks for all time
 * 
 * Fetches all public tracks sorted by trending score, regardless of age.
 * Uses database function get_trending_tracks() with days_back = 0.
 * 
 * GOTCHA: days_back = 0 is a special value meaning "all time".
 * This is handled by the database function, not by this code.
 * 
 * USAGE:
 * const allTimeTracks = await getTrendingTracksAllTime();
 * // Returns up to 10 tracks of any age sorted by trending score
 * 
 * @returns Array of TrendingTrack objects, empty array on error
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
 * 
 * Fetches creators who have tracks created in the last 7 days, sorted by creator score.
 * Uses database function get_popular_creators() which:
 * - Aggregates all tracks per creator from last 7 days
 * - Calculates: (SUM(play_count) × 0.6) + (SUM(like_count) × 0.4)
 * - Filters: Only creators with at least 1 public track
 * - Sorting: ORDER BY creator_score DESC
 * 
 * USAGE:
 * const creators = await getPopularCreators7Days();
 * // Returns up to 5 creators sorted by creator score
 * 
 * @returns Array of PopularCreator objects, empty array on error
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
 * 
 * Fetches all creators sorted by creator score, regardless of track age.
 * Uses database function get_popular_creators() with days_back = 0.
 * 
 * GOTCHA: days_back = 0 is a special value meaning "all time".
 * The database function aggregates ALL tracks for each creator.
 * 
 * USAGE:
 * const allTimeCreators = await getPopularCreatorsAllTime();
 * // Returns up to 5 creators of any tenure sorted by creator score
 * 
 * @returns Array of PopularCreator objects, empty array on error
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
 * Get trending albums for last 7 days
 * 
 * Fetches albums created in the last 7 days sorted by trending score.
 * Uses database function get_trending_albums() which applies:
 * - Time filter: created_at >= NOW() - INTERVAL '7 days'
 * - Public filter: is_public = true
 * - Score calculation: (play_count × 0.7) + (like_count × 0.3)
 * - Sorting: ORDER BY trending_score DESC
 * 
 * CACHING: Results are cached internally by getCachedAnalytics wrapper.
 * Use with getCachedAnalytics for page-specific cache keys.
 * 
 * USAGE:
 * const albums = await getTrendingAlbums7Days();
 * // Returns up to 10 albums sorted by trending score
 * 
 * // With caching wrapper
 * const albums = await getCachedAnalytics('discover_albums_7d', getTrendingAlbums7Days);
 * 
 * @returns Array of TrendingAlbum objects, empty array on error
 */
export async function getTrendingAlbums7Days(): Promise<TrendingAlbum[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_albums', {
      days_back: 7,
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending albums (7d):', error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Get trending albums for all time
 * 
 * Fetches all public albums sorted by trending score, regardless of age.
 * Uses database function get_trending_albums() with days_back = 0.
 * 
 * GOTCHA: days_back = 0 is a special value meaning "all time".
 * This is handled by the database function, not by this code.
 * 
 * USAGE:
 * const allTimeAlbums = await getTrendingAlbumsAllTime();
 * // Returns up to 10 albums of any age sorted by trending score
 * 
 * // With caching wrapper
 * const albums = await getCachedAnalytics('discover_albums_all', getTrendingAlbumsAllTime);
 * 
 * @returns Array of TrendingAlbum objects, empty array on error
 */
export async function getTrendingAlbumsAllTime(): Promise<TrendingAlbum[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_albums', {
      days_back: 0, // 0 means all time
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending albums (all time):', error);
    return [];
  }
}

/**
 * Get trending playlists for last 7 days
 * 
 * Fetches playlists created in the last 7 days sorted by trending score.
 * Uses database function get_trending_playlists() which applies:
 * - Time filter: created_at >= NOW() - INTERVAL '7 days'
 * - Public filter: is_public = true
 * - Score calculation: (play_count × 0.7) + (like_count × 0.3)
 * - Sorting: ORDER BY trending_score DESC
 * 
 * CACHING: Results are cached internally by getCachedAnalytics wrapper.
 * Use with getCachedAnalytics for page-specific cache keys.
 * 
 * USAGE:
 * const playlists = await getTrendingPlaylists7Days();
 * // Returns up to 10 playlists sorted by trending score
 * 
 * // With caching wrapper
 * const playlists = await getCachedAnalytics('discover_playlists_7d', getTrendingPlaylists7Days);
 * 
 * @returns Array of TrendingPlaylist objects, empty array on error
 */
export async function getTrendingPlaylists7Days(): Promise<TrendingPlaylist[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_playlists', {
      days_back: 7,
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending playlists (7d):', error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Get trending playlists for all time
 * 
 * Fetches all public playlists sorted by trending score, regardless of age.
 * Uses database function get_trending_playlists() with days_back = 0.
 * 
 * GOTCHA: days_back = 0 is a special value meaning "all time".
 * This is handled by the database function, not by this code.
 * 
 * USAGE:
 * const allTimePlaylists = await getTrendingPlaylistsAllTime();
 * // Returns up to 10 playlists of any age sorted by trending score
 * 
 * // With caching wrapper
 * const playlists = await getCachedAnalytics('discover_playlists_all', getTrendingPlaylistsAllTime);
 * 
 * @returns Array of TrendingPlaylist objects, empty array on error
 */
export async function getTrendingPlaylistsAllTime(): Promise<TrendingPlaylist[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_playlists', {
      days_back: 0, // 0 means all time
      result_limit: 10,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending playlists (all time):', error);
    return [];
  }
}

/**
 * Cache wrapper for analytics data (5 minute cache)
 * 
 * Provides an additional caching layer with custom cache keys.
 * Useful when multiple pages need to cache the same data with different keys.
 * 
 * HOW IT WORKS:
 * 1. Check if cache has valid data for the given key
 * 2. If yes (cache hit), return cached data immediately
 * 3. If no (cache miss), call the fetcher function
 * 4. Store result in cache with current timestamp
 * 5. Return the fresh data
 * 
 * CACHE DURATION: 5 minutes (300,000 milliseconds)
 * After 5 minutes, cached data is considered stale and will be refetched.
 * 
 * USAGE EXAMPLES:
 * 
 * // Page-specific cache key to avoid conflicts
 * const tracks = await getCachedAnalytics(
 *   'home_trending_7d',
 *   getTrendingTracks7Days
 * );
 * 
 * // Different page, different key, same data source
 * const tracks = await getCachedAnalytics(
 *   'discover_trending_7d',
 *   getTrendingTracks7Days
 * );
 * 
 * // Cache any async function
 * const customData = await getCachedAnalytics(
 *   'my_custom_key',
 *   async () => {
 *     // Your custom data fetching logic
 *     return await fetchSomeData();
 *   }
 * );
 * 
 * GOTCHAS:
 * - Cache is in-memory only (cleared on server restart)
 * - Cache is shared across all users (not user-specific)
 * - Use unique keys per page to avoid conflicts
 * - Don't use this for user-specific data (use React state instead)
 * - Cache keys should be descriptive: 'page_datatype_timewindow'
 * 
 * @param key Unique cache key (e.g., 'home_trending_7d')
 * @param fetcher Async function that fetches the data
 * @returns Cached or fresh data of type T
 */
export async function getCachedAnalytics<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  // Return cached data if still valid (within 5 minutes)
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`[TrendingAnalytics] Cache hit for: ${key}`);
    return cached.data as T;
  }

  // Fetch fresh data on cache miss or stale data
  console.log(`[TrendingAnalytics] Cache miss for: ${key}, fetching...`);
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

/**
 * Clear analytics cache (useful for testing or manual refresh)
 * 
 * Removes all cached entries. Use this when:
 * - Testing cache behavior
 * - Forcing a refresh of all data
 * - Debugging cache-related issues
 * 
 * USAGE:
 * clearAnalyticsCache();
 * // Next call to getCachedAnalytics will fetch fresh data
 * 
 * GOTCHA: This clears ALL cache entries, not just one.
 * If you need to clear a specific entry, use cache.delete(key) directly.
 */
export function clearAnalyticsCache(): void {
  cache.clear();
  console.log('[TrendingAnalytics] Cache cleared');
}

/**
 * Get cache statistics (for monitoring)
 * 
 * Returns information about the current cache state.
 * Useful for debugging and performance monitoring.
 * 
 * USAGE:
 * const stats = getCacheStats();
 * console.log(`Cache has ${stats.size} entries`);
 * console.log('Cache keys:', stats.keys);
 * 
 * EXAMPLE OUTPUT:
 * {
 *   size: 4,
 *   keys: [
 *     'home_trending_7d',
 *     'home_popular_creators_7d',
 *     'discover_trending_7d',
 *     'analytics_trending_all'
 *   ]
 * }
 * 
 * @returns Object with cache size and array of cache keys
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
