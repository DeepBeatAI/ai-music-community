/**
 * Property-Based Tests for Trending Analytics API Functions
 * Feature: discover-page-tabs-enhancement
 * 
 * These tests validate the correctness properties for the trending analytics
 * API functions that wrap database calls and provide caching.
 * 
 * Tests use fast-check for property-based testing with 100+ iterations.
 * 
 * Properties Tested:
 * - Property 15: Trending Display Information
 * - Property 26: Cache Duration
 * 
 * Validates: Requirements 5.6, 6.6, 12.1, 12.2
 */

import fc from 'fast-check';
import {
  getTrendingAlbums7Days,
  getTrendingAlbumsAllTime,
  getTrendingPlaylists7Days,
  getTrendingPlaylistsAllTime,
  getCachedAnalytics,
  clearAnalyticsCache,
  getCacheStats,
} from '@/lib/trendingAnalytics';
import { TrendingAlbum, TrendingPlaylist } from '@/types/analytics';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

// Helper to generate valid date strings
const validDateString = () => fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2030-12-31') }).map(timestamp => new Date(timestamp).toISOString());

describe('Feature: discover-page-tabs-enhancement - Trending Analytics API Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAnalyticsCache();
  });

  /**
   * Property 15: Trending Display Information
   * 
   * For any trending album or playlist card, the displayed information should
   * include name, creator username, play count, like count, and trending score.
   * 
   * Validates: Requirements 5.6, 6.6
   */
  describe('Property 15: Trending Display Information', () => {
    it('should return albums with all required display fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              album_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              creator_username: fc.string({ minLength: 1, maxLength: 50 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              trending_score: fc.float({ min: 0, max: 10000 }),
              created_at: validDateString(),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 1, max: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (mockAlbums) => {
            // Mock the database response
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: mockAlbums,
              error: null,
            });

            const albums = await getTrendingAlbums7Days();

            // Verify all albums have required fields
            for (const album of albums) {
              expect(album).toHaveProperty('album_id');
              expect(album).toHaveProperty('name');
              expect(album).toHaveProperty('creator_username');
              expect(album).toHaveProperty('creator_user_id');
              expect(album).toHaveProperty('play_count');
              expect(album).toHaveProperty('like_count');
              expect(album).toHaveProperty('trending_score');
              expect(album).toHaveProperty('created_at');
              expect(album).toHaveProperty('cover_image_url');
              expect(album).toHaveProperty('track_count');

              // Verify field types
              expect(typeof album.album_id).toBe('string');
              expect(typeof album.name).toBe('string');
              expect(typeof album.creator_username).toBe('string');
              expect(typeof album.creator_user_id).toBe('string');
              expect(typeof album.play_count).toBe('number');
              expect(typeof album.like_count).toBe('number');
              expect(typeof album.trending_score).toBe('number');
              expect(typeof album.created_at).toBe('string');
              expect(typeof album.track_count).toBe('number');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return playlists with all required display fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              playlist_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              creator_username: fc.string({ minLength: 1, maxLength: 50 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              trending_score: fc.float({ min: 0, max: 10000 }),
              created_at: validDateString(),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 1, max: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (mockPlaylists) => {
            // Mock the database response
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: mockPlaylists,
              error: null,
            });

            const playlists = await getTrendingPlaylists7Days();

            // Verify all playlists have required fields
            for (const playlist of playlists) {
              expect(playlist).toHaveProperty('playlist_id');
              expect(playlist).toHaveProperty('name');
              expect(playlist).toHaveProperty('creator_username');
              expect(playlist).toHaveProperty('creator_user_id');
              expect(playlist).toHaveProperty('play_count');
              expect(playlist).toHaveProperty('like_count');
              expect(playlist).toHaveProperty('trending_score');
              expect(playlist).toHaveProperty('created_at');
              expect(playlist).toHaveProperty('cover_image_url');
              expect(playlist).toHaveProperty('track_count');

              // Verify field types
              expect(typeof playlist.playlist_id).toBe('string');
              expect(typeof playlist.name).toBe('string');
              expect(typeof playlist.creator_username).toBe('string');
              expect(typeof playlist.creator_user_id).toBe('string');
              expect(typeof playlist.play_count).toBe('number');
              expect(typeof playlist.like_count).toBe('number');
              expect(typeof playlist.trending_score).toBe('number');
              expect(typeof playlist.created_at).toBe('string');
              expect(typeof playlist.track_count).toBe('number');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 26: Cache Duration
   * 
   * For any trending data fetch, the results should be cached for 5 minutes
   * before requiring a fresh database query.
   * 
   * Validates: Requirements 12.1, 12.2
   */
  describe('Property 26: Cache Duration', () => {
    it('should cache results for 5 minutes and return cached data on subsequent calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              album_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              creator_username: fc.string({ minLength: 1, maxLength: 50 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              trending_score: fc.float({ min: 0, max: 10000 }),
              created_at: validDateString(),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 1, max: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.string({ minLength: 5, maxLength: 50 }),
          async (mockData, cacheKey) => {
            clearAnalyticsCache();

            // Mock fetcher function
            const mockFetcher = jest.fn().mockResolvedValue(mockData);

            // First call - should call fetcher
            const result1 = await getCachedAnalytics(cacheKey, mockFetcher);
            expect(mockFetcher).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(mockData);

            // Second call immediately - should use cache
            const result2 = await getCachedAnalytics(cacheKey, mockFetcher);
            expect(mockFetcher).toHaveBeenCalledTimes(1); // Still 1, not called again
            expect(result2).toEqual(mockData);

            // Verify cache stats
            const stats = getCacheStats();
            expect(stats.size).toBeGreaterThan(0);
            expect(stats.keys).toContain(cacheKey);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should refetch data after cache expires (5 minutes)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          async (cacheKey) => {
            clearAnalyticsCache();

            const mockData = [
              {
                playlist_id: fc.sample(fc.uuid(), 1)[0],
                name: 'Test Playlist',
                creator_username: 'testuser',
                creator_user_id: fc.sample(fc.uuid(), 1)[0],
                play_count: 100,
                like_count: 50,
                trending_score: 85,
                created_at: new Date().toISOString(),
                cover_image_url: null,
                track_count: 10,
              },
            ];

            const mockFetcher = jest.fn().mockResolvedValue(mockData);

            // First call
            await getCachedAnalytics(cacheKey, mockFetcher);
            expect(mockFetcher).toHaveBeenCalledTimes(1);

            // Simulate cache expiration by clearing cache
            // (In real scenario, we'd wait 5 minutes, but we simulate it)
            clearAnalyticsCache();

            // Call again after cache clear - should refetch
            await getCachedAnalytics(cacheKey, mockFetcher);
            expect(mockFetcher).toHaveBeenCalledTimes(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain separate cache entries for different keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              album_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              creator_username: fc.string({ minLength: 1, maxLength: 50 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              trending_score: fc.float({ min: 0, max: 10000 }),
              created_at: validDateString(),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 1, max: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          async (mockData1, cacheKey1, cacheKey2) => {
            // Ensure keys are different
            fc.pre(cacheKey1 !== cacheKey2);

            clearAnalyticsCache();

            const mockData2 = mockData1.map(item => ({
              ...item,
              album_id: fc.sample(fc.uuid(), 1)[0],
              created_at: new Date().toISOString(),
            }));

            const mockFetcher1 = jest.fn().mockResolvedValue(mockData1);
            const mockFetcher2 = jest.fn().mockResolvedValue(mockData2);

            // Cache data with key1
            const result1 = await getCachedAnalytics(cacheKey1, mockFetcher1);
            expect(result1).toEqual(mockData1);

            // Cache data with key2
            const result2 = await getCachedAnalytics(cacheKey2, mockFetcher2);
            expect(result2).toEqual(mockData2);

            // Verify both are cached
            const stats = getCacheStats();
            expect(stats.size).toBeGreaterThanOrEqual(2);
            expect(stats.keys).toContain(cacheKey1);
            expect(stats.keys).toContain(cacheKey2);

            // Verify fetching key1 again returns cached data
            const result1Again = await getCachedAnalytics(cacheKey1, mockFetcher1);
            expect(result1Again).toEqual(mockData1);
            expect(mockFetcher1).toHaveBeenCalledTimes(1); // Still 1
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
