/**
 * Search System Tests - Track Integration
 * 
 * Tests the search system's integration with the tracks table,
 * ensuring audio posts properly join track data and search queries
 * include track title and description.
 */

import { searchContent, getTrendingContent, getPostsForFiltering } from '@/utils/search';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Search System - Track Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchContent', () => {
    it('should include track joins in post queries', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        range: mockRange,
        order: mockOrder,
      });

      await searchContent({ postType: 'all' });

      // Verify that select includes track join
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('track:tracks(*)')
      );
    });

    it('should search track title and description when query provided', async () => {
      const mockOr = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        range: mockRange,
        or: mockOr,
        order: mockOrder,
      });

      await searchContent({ query: 'test song', postType: 'all' });

      // Verify that or clause includes track.title and track.description
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('track.title.ilike')
      );
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('track.description.ilike')
      );
    });

    it('should prioritize track title matches in relevance sorting', async () => {
      const mockPosts = [
        {
          id: '1',
          content: 'Check out my song',
          post_type: 'audio',
          track: { title: 'Amazing Track', description: 'Great music' },
          user_profiles: { username: 'user1' },
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          content: 'Another post',
          post_type: 'audio',
          track: { title: 'Different Song', description: 'Amazing description' },
          user_profiles: { username: 'user2' },
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockPosts, error: null });

      // Mock post_likes count queries
      const mockPostLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: mockSelect,
            range: mockRange,
            or: mockOr,
            order: mockOrder,
          };
        }
        if (table === 'post_likes') {
          return mockPostLikesQuery;
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const results = await searchContent({ 
        query: 'amazing', 
        postType: 'all',
        sortBy: 'relevance'
      });

      // First post should rank higher because "Amazing" is in the title (score 9)
      // vs second post where "Amazing" is in description (score 7)
      expect(results.posts[0].id).toBe('1');
    });
  });

  describe('getTrendingContent', () => {
    it('should include track joins in trending queries', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        gte: mockGte,
        order: mockOrder,
        limit: mockLimit,
      });

      await getTrendingContent(10);

      // Verify that select includes track join
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('track:tracks(*)')
      );
    });

    it('should return posts with track data', async () => {
      const mockTrendingPosts = [
        {
          id: '1',
          content: 'Trending audio post',
          post_type: 'audio',
          track: {
            id: 'track1',
            title: 'Trending Song',
            file_url: 'https://example.com/song.mp3',
          },
          user_profiles: { username: 'artist1' },
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockGte = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({ 
        data: mockTrendingPosts, 
        error: null 
      });

      const mockPostLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: mockSelect,
            gte: mockGte,
            order: mockOrder,
            limit: mockLimit,
          };
        }
        if (table === 'post_likes') {
          return mockPostLikesQuery;
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const results = await getTrendingContent(10);

      expect(results).toHaveLength(1);
      expect(results[0].track).toBeDefined();
      expect(results[0].track?.title).toBe('Trending Song');
    });
  });

  describe('getPostsForFiltering', () => {
    it('should include track joins in filtering queries', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      });

      await getPostsForFiltering('all', 100);

      // Verify that select includes track join
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('track:tracks(*)')
      );
    });

    it('should filter audio posts and include track data', async () => {
      const mockAudioPosts = [
        {
          id: '1',
          content: 'Audio post',
          post_type: 'audio',
          track: {
            id: 'track1',
            title: 'My Song',
            file_url: 'https://example.com/song.mp3',
          },
          user_profiles: { username: 'artist1' },
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue({ 
        data: mockAudioPosts, 
        error: null 
      });

      const mockPostLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: mockSelect,
            eq: mockEq,
            order: mockOrder,
            limit: mockLimit,
          };
        }
        if (table === 'post_likes') {
          return mockPostLikesQuery;
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const results = await getPostsForFiltering('audio', 100);

      expect(results).toHaveLength(1);
      expect(results[0].post_type).toBe('audio');
      expect(results[0].track).toBeDefined();
      expect(results[0].track?.title).toBe('My Song');
    });
  });

  describe('Track data integration', () => {
    it('should handle posts without tracks gracefully', async () => {
      const mockPosts = [
        {
          id: '1',
          content: 'Text post without track',
          post_type: 'text',
          track: null,
          user_profiles: { username: 'user1' },
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockPosts, error: null });

      const mockPostLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: mockSelect,
            range: mockRange,
            order: mockOrder,
          };
        }
        if (table === 'post_likes') {
          return mockPostLikesQuery;
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const results = await searchContent({ postType: 'all' });

      expect(results.posts).toHaveLength(1);
      expect(results.posts[0].track).toBeNull();
    });

    it('should handle legacy audio posts with audio_filename', async () => {
      const mockPosts = [
        {
          id: '1',
          content: 'Legacy audio post',
          post_type: 'audio',
          audio_filename: 'old-song.mp3',
          track: null, // Legacy post without track
          user_profiles: { username: 'user1' },
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockPosts, error: null });

      const mockPostLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'posts') {
          return {
            select: mockSelect,
            range: mockRange,
            or: mockOr,
            order: mockOrder,
          };
        }
        if (table === 'post_likes') {
          return mockPostLikesQuery;
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const results = await searchContent({ 
        query: 'old-song',
        postType: 'all',
        sortBy: 'relevance'
      });

      // Should still find the post via audio_filename
      expect(results.posts).toHaveLength(1);
      expect(results.posts[0].audio_filename).toBe('old-song.mp3');
    });
  });
});
