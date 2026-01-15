/**
 * Cache Implementation Verification Tests
 * 
 * These tests verify that:
 * 1. getCachedAnalytics is used for all trending data
 * 2. 5-minute cache TTL is applied correctly
 * 3. Cache hit rate is measurable in development
 * 
 * Requirements: 12.1, 12.2
 */

import {
  getCachedAnalytics,
  clearAnalyticsCache,
  getCacheStats,
  getTrendingAlbums7Days,
  getTrendingAlbumsAllTime,
  getTrendingPlaylists7Days,
  getTrendingPlaylistsAllTime,
} from '../trendingAnalytics';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { supabase } from '../supabase';

describe('Caching Implementation Verification', () => {
  beforeEach(() => {
    clearAnalyticsCache();
    jest.clearAllMocks();
  });

  describe('Cache TTL Verification', () => {
    it('should cache data for 5 minutes', async () => {
      const mockData = [{ album_id: '1', name: 'Test Album' }];
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockData, error: null });

      // First call - should hit database
      const result1 = await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Second call within 5 minutes - should use cache
      const result2 = await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(supabase.rpc).toHaveBeenCalledTimes(1); // Still 1, no new call
      expect(result2).toEqual(result1);
    });

    it('should refetch data after 5 minutes', async () => {
      const mockData1 = [{ album_id: '1', name: 'Test Album 1' }];
      const mockData2 = [{ album_id: '2', name: 'Test Album 2' }];
      
      (supabase.rpc as jest.Mock)
        .mockResolvedValueOnce({ data: mockData1, error: null })
        .mockResolvedValueOnce({ data: mockData2, error: null });

      // First call
      const result1 = await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(result1).toEqual(mockData1);

      // Mock time passing (5 minutes + 1ms)
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 5 * 60 * 1000 + 1);

      // Second call after 5 minutes - should refetch
      const result2 = await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
      expect(result2).toEqual(mockData2);

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe('Cache Key Verification', () => {
    it('should use unique cache keys for different data sources', async () => {
      const mockAlbums = [{ album_id: '1', name: 'Album' }];
      const mockPlaylists = [{ playlist_id: '1', name: 'Playlist' }];

      (supabase.rpc as jest.Mock)
        .mockResolvedValueOnce({ data: mockAlbums, error: null })
        .mockResolvedValueOnce({ data: mockPlaylists, error: null });

      // Fetch albums
      await getCachedAnalytics('discover_albums_7d', getTrendingAlbums7Days);
      
      // Fetch playlists
      await getCachedAnalytics('discover_playlists_7d', getTrendingPlaylists7Days);

      // Both should have been called (different cache keys)
      expect(supabase.rpc).toHaveBeenCalledTimes(2);

      // Verify cache has both entries
      const stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('discover_albums_7d');
      expect(stats.keys).toContain('discover_playlists_7d');
    });

    it('should use correct cache keys for 7-day and all-time data', async () => {
      const mock7d = [{ album_id: '1', name: 'Recent Album' }];
      const mockAll = [{ album_id: '2', name: 'Old Album' }];

      (supabase.rpc as jest.Mock)
        .mockResolvedValueOnce({ data: mock7d, error: null })
        .mockResolvedValueOnce({ data: mockAll, error: null });

      // Fetch 7-day albums
      await getCachedAnalytics('discover_albums_7d', getTrendingAlbums7Days);
      
      // Fetch all-time albums
      await getCachedAnalytics('discover_albums_all', getTrendingAlbumsAllTime);

      // Both should have been called (different cache keys)
      expect(supabase.rpc).toHaveBeenCalledTimes(2);

      // Verify cache has both entries
      const stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('discover_albums_7d');
      expect(stats.keys).toContain('discover_albums_all');
    });
  });

  describe('Cache Hit Rate Measurement', () => {
    it('should track cache hits and misses', async () => {
      const mockData = [{ album_id: '1', name: 'Test Album' }];
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockData, error: null });

      let cacheHits = 0;
      let cacheMisses = 0;

      // Spy on console.log to track cache hits/misses
      const originalLog = console.log;
      console.log = jest.fn((message: string) => {
        if (message.includes('Cache hit')) cacheHits++;
        if (message.includes('Cache miss')) cacheMisses++;
      });

      // First call - cache miss
      await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(cacheMisses).toBe(1);
      expect(cacheHits).toBe(0);

      // Second call - cache hit
      await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(cacheMisses).toBe(1);
      expect(cacheHits).toBe(1);

      // Third call - cache hit
      await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(cacheMisses).toBe(1);
      expect(cacheHits).toBe(2);

      // Calculate hit rate: 2 hits / 3 total calls = 66.67%
      const hitRate = cacheHits / (cacheHits + cacheMisses);
      expect(hitRate).toBeGreaterThan(0.5); // > 50% hit rate

      // Restore console.log
      console.log = originalLog;
    });

    it('should provide cache statistics', async () => {
      const mockData = [{ album_id: '1', name: 'Test' }];
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockData, error: null });

      // Initially empty
      let stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);

      // Add some cached data
      await getCachedAnalytics('key1', getTrendingAlbums7Days);
      await getCachedAnalytics('key2', getTrendingPlaylists7Days);

      // Verify stats
      stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });

  describe('Cache Clear Functionality', () => {
    it('should clear all cache entries', async () => {
      const mockData = [{ album_id: '1', name: 'Test' }];
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockData, error: null });

      // Add cached data
      await getCachedAnalytics('key1', getTrendingAlbums7Days);
      await getCachedAnalytics('key2', getTrendingPlaylists7Days);

      // Verify cache has entries
      let stats = getCacheStats();
      expect(stats.size).toBe(2);

      // Clear cache
      clearAnalyticsCache();

      // Verify cache is empty
      stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should refetch data after cache clear', async () => {
      const mockData = [{ album_id: '1', name: 'Test' }];
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockData, error: null });

      // First call
      await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Clear cache
      clearAnalyticsCache();

      // Third call - should refetch
      await getCachedAnalytics('test_key', getTrendingAlbums7Days);
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });

  describe('All Trending Functions Use Caching', () => {
    it('should verify albums functions can be cached', async () => {
      const mockData = [{ album_id: '1', name: 'Test' }];
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockData, error: null });

      // Test 7-day albums
      const albums7d = await getCachedAnalytics('albums_7d', getTrendingAlbums7Days);
      expect(albums7d).toEqual(mockData);

      // Test all-time albums
      const albumsAll = await getCachedAnalytics('albums_all', getTrendingAlbumsAllTime);
      expect(albumsAll).toEqual(mockData);

      // Verify both were cached
      const stats = getCacheStats();
      expect(stats.size).toBe(2);
    });

    it('should verify playlists functions can be cached', async () => {
      const mockData = [{ playlist_id: '1', name: 'Test' }];
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockData, error: null });

      // Test 7-day playlists
      const playlists7d = await getCachedAnalytics('playlists_7d', getTrendingPlaylists7Days);
      expect(playlists7d).toEqual(mockData);

      // Test all-time playlists
      const playlistsAll = await getCachedAnalytics('playlists_all', getTrendingPlaylistsAllTime);
      expect(playlistsAll).toEqual(mockData);

      // Verify both were cached
      const stats = getCacheStats();
      expect(stats.size).toBe(2);
    });
  });
});
