/**
 * Unit Tests for Trending Analytics API Functions
 * Feature: discover-page-tabs-enhancement
 * 
 * These tests validate specific examples and edge cases for the trending
 * analytics API functions.
 * 
 * Test Coverage:
 * - Empty results handling
 * - Network failure scenarios
 * - Cache hit/miss behavior
 * 
 * Validates: Requirements 12.1, 12.2, 12.3
 */

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

describe('Trending Analytics API - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAnalyticsCache();
  });

  describe('Empty Results Handling', () => {
    it('should return empty array when no albums are found', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const albums = await getTrendingAlbums7Days();

      expect(albums).toEqual([]);
      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_albums', {
        days_back: 7,
        result_limit: 10,
      });
    });

    it('should return empty array when no playlists are found', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const playlists = await getTrendingPlaylists7Days();

      expect(playlists).toEqual([]);
      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_playlists', {
        days_back: 7,
        result_limit: 10,
      });
    });

    it('should return empty array when data is null', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const albums = await getTrendingAlbumsAllTime();

      expect(albums).toEqual([]);
    });

    it('should return empty array when data is undefined', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: undefined,
        error: null,
      });

      const playlists = await getTrendingPlaylistsAllTime();

      expect(playlists).toEqual([]);
    });
  });

  describe('Network Failure Scenarios', () => {
    it('should return empty array on database error for albums', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed'),
      });

      const albums = await getTrendingAlbums7Days();

      expect(albums).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching trending albums (7d):',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return empty array on database error for playlists', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('Network timeout'),
      });

      const playlists = await getTrendingPlaylists7Days();

      expect(playlists).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching trending playlists (7d):',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return empty array on exception during fetch', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (supabase.rpc as jest.Mock).mockRejectedValueOnce(
        new Error('Unexpected error')
      );

      const albums = await getTrendingAlbumsAllTime();

      expect(albums).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle network timeout gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (supabase.rpc as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const playlists = await getTrendingPlaylistsAllTime();

      expect(playlists).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cache Hit/Miss Behavior', () => {
    it('should cache results and return cached data on second call', async () => {
      const mockAlbums: TrendingAlbum[] = [
        {
          album_id: '123',
          name: 'Test Album',
          creator_username: 'testuser',
          creator_user_id: '456',
          play_count: 100,
          like_count: 50,
          trending_score: 85,
          created_at: new Date().toISOString(),
          cover_image_url: null,
          track_count: 10,
        },
      ];

      const mockFetcher = jest.fn().mockResolvedValue(mockAlbums);

      // First call - cache miss
      const result1 = await getCachedAnalytics('test_key', mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockAlbums);

      // Second call - cache hit
      const result2 = await getCachedAnalytics('test_key', mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(mockAlbums);
    });

    it('should track cache statistics correctly', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      const mockFetcher = jest.fn().mockResolvedValue(mockData);

      // Initially empty
      let stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);

      // Add first entry
      await getCachedAnalytics('key1', mockFetcher);
      stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('key1');

      // Add second entry
      await getCachedAnalytics('key2', mockFetcher);
      stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('should clear all cache entries when clearAnalyticsCache is called', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      const mockFetcher = jest.fn().mockResolvedValue(mockData);

      // Add entries
      await getCachedAnalytics('key1', mockFetcher);
      await getCachedAnalytics('key2', mockFetcher);

      let stats = getCacheStats();
      expect(stats.size).toBe(2);

      // Clear cache
      clearAnalyticsCache();

      stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should refetch data after cache is cleared', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      const mockFetcher = jest.fn().mockResolvedValue(mockData);

      // First call
      await getCachedAnalytics('test_key', mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Clear cache
      clearAnalyticsCache();

      // Second call after clear - should refetch
      await getCachedAnalytics('test_key', mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should maintain separate caches for different keys', async () => {
      const mockData1 = [{ id: '1', name: 'Data 1' }];
      const mockData2 = [{ id: '2', name: 'Data 2' }];

      const mockFetcher1 = jest.fn().mockResolvedValue(mockData1);
      const mockFetcher2 = jest.fn().mockResolvedValue(mockData2);

      // Cache with different keys
      const result1 = await getCachedAnalytics('key1', mockFetcher1);
      const result2 = await getCachedAnalytics('key2', mockFetcher2);

      expect(result1).toEqual(mockData1);
      expect(result2).toEqual(mockData2);

      // Verify both fetchers were called once
      expect(mockFetcher1).toHaveBeenCalledTimes(1);
      expect(mockFetcher2).toHaveBeenCalledTimes(1);

      // Verify cache has both entries
      const stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });

  describe('Database Function Parameters', () => {
    it('should call get_trending_albums with correct parameters for 7 days', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getTrendingAlbums7Days();

      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_albums', {
        days_back: 7,
        result_limit: 10,
      });
    });

    it('should call get_trending_albums with correct parameters for all time', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getTrendingAlbumsAllTime();

      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_albums', {
        days_back: 0,
        result_limit: 10,
      });
    });

    it('should call get_trending_playlists with correct parameters for 7 days', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getTrendingPlaylists7Days();

      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_playlists', {
        days_back: 7,
        result_limit: 10,
      });
    });

    it('should call get_trending_playlists with correct parameters for all time', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await getTrendingPlaylistsAllTime();

      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_playlists', {
        days_back: 0,
        result_limit: 10,
      });
    });
  });

  describe('Data Type Validation', () => {
    it('should return albums with correct data structure', async () => {
      const mockAlbums: TrendingAlbum[] = [
        {
          album_id: '123',
          name: 'Test Album',
          creator_username: 'testuser',
          creator_user_id: '456',
          play_count: 100,
          like_count: 50,
          trending_score: 85,
          created_at: '2024-01-01T00:00:00Z',
          cover_image_url: 'https://example.com/cover.jpg',
          track_count: 10,
        },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockAlbums,
        error: null,
      });

      const albums = await getTrendingAlbums7Days();

      expect(albums).toHaveLength(1);
      expect(albums[0]).toMatchObject({
        album_id: expect.any(String),
        name: expect.any(String),
        creator_username: expect.any(String),
        creator_user_id: expect.any(String),
        play_count: expect.any(Number),
        like_count: expect.any(Number),
        trending_score: expect.any(Number),
        created_at: expect.any(String),
        track_count: expect.any(Number),
      });
    });

    it('should return playlists with correct data structure', async () => {
      const mockPlaylists: TrendingPlaylist[] = [
        {
          playlist_id: '789',
          name: 'Test Playlist',
          creator_username: 'testuser',
          creator_user_id: '456',
          play_count: 200,
          like_count: 75,
          trending_score: 162.5,
          created_at: '2024-01-01T00:00:00Z',
          cover_image_url: null,
          track_count: 15,
        },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockPlaylists,
        error: null,
      });

      const playlists = await getTrendingPlaylists7Days();

      expect(playlists).toHaveLength(1);
      expect(playlists[0]).toMatchObject({
        playlist_id: expect.any(String),
        name: expect.any(String),
        creator_username: expect.any(String),
        creator_user_id: expect.any(String),
        play_count: expect.any(Number),
        like_count: expect.any(Number),
        trending_score: expect.any(Number),
        created_at: expect.any(String),
        track_count: expect.any(Number),
      });
    });
  });
});
