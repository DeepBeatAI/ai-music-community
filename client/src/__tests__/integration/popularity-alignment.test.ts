/**
 * Integration tests for Popularity Alignment feature
 * Tests Home Page and Discover Page data fetching with new trending analytics
 */

import { getTrendingTracks7Days, getPopularCreators7Days } from '@/lib/trendingAnalytics';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

describe('Popularity Alignment - Home Page Data Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrendingTracks7Days() integration', () => {
    it('should fetch trending tracks using database function', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockTrendingTracks = [
        {
          track_id: 'track-1',
          title: 'Trending Song 1',
          author: 'artist1',
          play_count: 100,
          like_count: 50,
          created_at: new Date().toISOString(),
          trending_score: 250,
          file_url: 'https://example.com/track1.mp3',
        },
        {
          track_id: 'track-2',
          title: 'Trending Song 2',
          author: 'artist2',
          play_count: 80,
          like_count: 40,
          created_at: new Date().toISOString(),
          trending_score: 200,
          file_url: 'https://example.com/track2.mp3',
        },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockTrendingTracks,
        error: null,
      });

      const result = await getTrendingTracks7Days();

      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_tracks', {
        days_back: 7,
        result_limit: 10,
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Trending Song 1');
      expect(result[0].trending_score).toBe(250);
    });

    it('should handle empty results gracefully', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getTrendingTracks7Days();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getTrendingTracks7Days();

      expect(result).toEqual([]);
    });
  });

  describe('getPopularCreators7Days() integration', () => {
    it('should fetch popular creators using database function', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockPopularCreators = [
        {
          user_id: 'user-1',
          username: 'popular_artist1',
          avatar_url: null,
          track_count: 10,
          total_plays: 500,
          total_likes: 200,
          creator_score: 1200,
        },
        {
          user_id: 'user-2',
          username: 'popular_artist2',
          avatar_url: null,
          track_count: 8,
          total_plays: 400,
          total_likes: 150,
          creator_score: 950,
        },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockPopularCreators,
        error: null,
      });

      const result = await getPopularCreators7Days();

      expect(supabase.rpc).toHaveBeenCalledWith('get_popular_creators', {
        days_back: 7,
        result_limit: 5,
      });
      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('popular_artist1');
      expect(result[0].creator_score).toBe(1200);
    });

    it('should handle empty results gracefully', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getPopularCreators7Days();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getPopularCreators7Days();

      expect(result).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors in getTrendingTracks7Days', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockRejectedValue(new Error('Network error'));

      const result = await getTrendingTracks7Days();

      expect(result).toEqual([]);
    });

    it('should handle network errors in getPopularCreators7Days', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockRejectedValue(new Error('Network error'));

      const result = await getPopularCreators7Days();

      expect(result).toEqual([]);
    });
  });

  describe('Empty state handling', () => {
    it('should return empty array when no trending tracks exist', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getTrendingTracks7Days();

      expect(result).toEqual([]);
    });

    it('should return empty array when no popular creators exist', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getPopularCreators7Days();

      expect(result).toEqual([]);
    });
  });
});

describe('Popularity Alignment - Discover Page Data Fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrendingTracks7Days() integration', () => {
    it('should return same data as Home Page', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockData = [
        {
          track_id: 'track-1',
          title: 'Consistent Track',
          author: 'artist1',
          play_count: 100,
          like_count: 50,
          created_at: new Date().toISOString(),
          trending_score: 250,
          file_url: 'https://example.com/track.mp3',
        },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const homeResult = await getTrendingTracks7Days();
      const discoverResult = await getTrendingTracks7Days();

      expect(homeResult).toEqual(discoverResult);
    });
  });

  describe('getPopularCreators7Days() integration', () => {
    it('should return same data as Home Page', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockData = [
        {
          user_id: 'user-1',
          username: 'consistent_artist',
          avatar_url: null,
          track_count: 10,
          total_plays: 500,
          total_likes: 200,
          creator_score: 1200,
        },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const homeResult = await getPopularCreators7Days();
      const discoverResult = await getPopularCreators7Days();

      expect(homeResult).toEqual(discoverResult);
    });
  });
});

describe('Popularity Alignment - Cross-Page Consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Trending tracks consistency', () => {
    it('should use same database function across all pages', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await getTrendingTracks7Days();
      await getTrendingTracks7Days();
      await getTrendingTracks7Days();

      // All calls should use the same database function
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'get_trending_tracks', {
        days_back: 7,
        result_limit: 10,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_trending_tracks', {
        days_back: 7,
        result_limit: 10,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(3, 'get_trending_tracks', {
        days_back: 7,
        result_limit: 10,
      });
    });
  });

  describe('Popular creators consistency', () => {
    it('should use same database function across all pages', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await getPopularCreators7Days();
      await getPopularCreators7Days();
      await getPopularCreators7Days();

      // All calls should use the same database function
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'get_popular_creators', {
        days_back: 7,
        result_limit: 5,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_popular_creators', {
        days_back: 7,
        result_limit: 5,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(3, 'get_popular_creators', {
        days_back: 7,
        result_limit: 5,
      });
    });
  });

  describe('7-day time window consistency', () => {
    it('should apply same time filtering for trending tracks', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockData = [
        {
          track_id: 'track-1',
          title: 'Recent Track',
          author: 'artist',
          play_count: 50,
          like_count: 50,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          trending_score: 100,
          file_url: 'https://example.com/track.mp3',
        },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getTrendingTracks7Days();

      // Verify the function uses 7-day time window
      expect(supabase.rpc).toHaveBeenCalledWith('get_trending_tracks', {
        days_back: 7,
        result_limit: 10,
      });
      expect(result[0].created_at).toBeDefined();
    });
  });

  describe('Scoring formula consistency', () => {
    it('should use consistent popularity scoring', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockTracks = [
        {
          track_id: 'track-1',
          title: 'Track 1',
          author: 'artist1',
          play_count: 100,
          like_count: 50,
          trending_score: 250, // (100 * 2) + 50
          created_at: new Date().toISOString(),
          file_url: 'https://example.com/track1.mp3',
        },
        {
          track_id: 'track-2',
          title: 'Track 2',
          author: 'artist2',
          play_count: 80,
          like_count: 40,
          trending_score: 200, // (80 * 2) + 40
          created_at: new Date().toISOString(),
          file_url: 'https://example.com/track2.mp3',
        },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockTracks,
        error: null,
      });

      const result = await getTrendingTracks7Days();

      // Verify scores are calculated consistently
      expect(result[0].trending_score).toBe(250);
      expect(result[1].trending_score).toBe(200);
      // Higher score should come first
      expect(result[0].trending_score).toBeGreaterThan(result[1].trending_score);
    });
  });
});
