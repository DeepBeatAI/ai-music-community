/**
 * Property-Based Tests for Album and Playlist Like Functions
 * 
 * Feature: discover-page-tabs-enhancement
 * 
 * This test suite validates the like toggle and status functions:
 * - Property 1: Like Toggle Consistency
 * - Property 3: Like Count Accuracy
 * 
 * Validates Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.4
 */

import { toggleAlbumLike, getAlbumLikeStatus } from '@/lib/albums';
import { togglePlaylistLike, getPlaylistLikeStatus } from '@/lib/playlists';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
}));

describe('Feature: discover-page-tabs-enhancement - Like Functions', () => {
  /**
   * Property 1: Like Toggle Consistency
   * 
   * For any album or playlist and any authenticated user, toggling the like status 
   * twice should return the content to its original like state 
   * (liked → unliked → liked or unliked → liked → unliked).
   * 
   * Validates: Requirements 1.2, 2.2
   */
  describe('Property 1: Like Toggle Consistency', () => {
    it('should toggle album like status consistently (unlike → like → unlike)', async () => {
      // Test case: Start unliked, toggle twice, should end unliked
      const albumId = 'test-album-id';
      const userId = 'test-user-id';

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // First toggle: unlike → like (insert)
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ error: null })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const firstToggle = await toggleAlbumLike(albumId, userId, false);
      expect(firstToggle.data?.liked).toBe(true);

      // Second toggle: like → unlike (delete)
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      });

      const secondToggle = await toggleAlbumLike(albumId, userId, true);
      expect(secondToggle.data?.liked).toBe(false);

      // Validates: Requirements 1.2
    });

    it('should toggle playlist like status consistently (unlike → like → unlike)', async () => {
      // Test case: Start unliked, toggle twice, should end unliked
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // First toggle: unlike → like (insert)
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ error: null })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const firstToggle = await togglePlaylistLike(playlistId, userId, false);
      expect(firstToggle.data?.liked).toBe(true);

      // Second toggle: like → unlike (delete)
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      });

      const secondToggle = await togglePlaylistLike(playlistId, userId, true);
      expect(secondToggle.data?.liked).toBe(false);

      // Validates: Requirements 2.2
    });

    it('should toggle album like status consistently (like → unlike → like)', async () => {
      // Test case: Start liked, toggle twice, should end liked
      const albumId = 'test-album-id';
      const userId = 'test-user-id';

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // First toggle: like → unlike (delete)
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      });

      const firstToggle = await toggleAlbumLike(albumId, userId, true);
      expect(firstToggle.data?.liked).toBe(false);

      // Second toggle: unlike → like (insert)
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ error: null })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const secondToggle = await toggleAlbumLike(albumId, userId, false);
      expect(secondToggle.data?.liked).toBe(true);

      // Validates: Requirements 1.2
    });

    it('should toggle playlist like status consistently (like → unlike → like)', async () => {
      // Test case: Start liked, toggle twice, should end liked
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // First toggle: like → unlike (delete)
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      });

      const firstToggle = await togglePlaylistLike(playlistId, userId, true);
      expect(firstToggle.data?.liked).toBe(false);

      // Second toggle: unlike → like (insert)
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ error: null })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const secondToggle = await togglePlaylistLike(playlistId, userId, false);
      expect(secondToggle.data?.liked).toBe(true);

      // Validates: Requirements 2.2
    });
  });

  /**
   * Property 3: Like Count Accuracy
   * 
   * For any album or playlist, the displayed like count should equal the number 
   * of distinct users who have liked that content.
   * 
   * Validates: Requirements 1.1, 1.4, 2.1, 2.4
   */
  describe('Property 3: Like Count Accuracy', () => {
    it('should return accurate like count for albums', async () => {
      const albumId = 'test-album-id';
      const userId = 'test-user-id';
      const expectedCount = 5;

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock like status query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: { id: 'like-id' }, error: null })),
            })),
          })),
        })),
      });

      // Mock like count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: expectedCount, error: null })),
        })),
      });

      const result = await getAlbumLikeStatus(albumId, userId);
      
      expect(result.data?.likeCount).toBe(expectedCount);
      expect(result.data?.liked).toBe(true);
      expect(result.error).toBeNull();

      // Validates: Requirements 1.1, 1.4
    });

    it('should return accurate like count for playlists', async () => {
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';
      const expectedCount = 3;

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock like status query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: { id: 'like-id' }, error: null })),
            })),
          })),
        })),
      });

      // Mock like count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: expectedCount, error: null })),
        })),
      });

      const result = await getPlaylistLikeStatus(playlistId, userId);
      
      expect(result.data?.likeCount).toBe(expectedCount);
      expect(result.data?.liked).toBe(true);
      expect(result.error).toBeNull();

      // Validates: Requirements 2.1, 2.4
    });

    it('should return zero count for albums with no likes', async () => {
      const albumId = 'test-album-id';
      const userId = 'test-user-id';

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock like status query (not liked)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      });

      // Mock like count query (zero likes)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      });

      const result = await getAlbumLikeStatus(albumId, userId);
      
      expect(result.data?.likeCount).toBe(0);
      expect(result.data?.liked).toBe(false);
      expect(result.error).toBeNull();

      // Validates: Requirements 1.1, 1.4
    });

    it('should return zero count for playlists with no likes', async () => {
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock like status query (not liked)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      });

      // Mock like count query (zero likes)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      });

      const result = await getPlaylistLikeStatus(playlistId, userId);
      
      expect(result.data?.likeCount).toBe(0);
      expect(result.data?.liked).toBe(false);
      expect(result.error).toBeNull();

      // Validates: Requirements 2.1, 2.4
    });

    it('should handle unauthenticated users for albums', async () => {
      const albumId = 'test-album-id';
      const expectedCount = 10;

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock like count query (no user check needed)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: expectedCount, error: null })),
        })),
      });

      const result = await getAlbumLikeStatus(albumId);
      
      expect(result.data?.likeCount).toBe(expectedCount);
      expect(result.data?.liked).toBe(false); // Unauthenticated users are not liked
      expect(result.error).toBeNull();

      // Validates: Requirements 1.1
    });

    it('should handle unauthenticated users for playlists', async () => {
      const playlistId = 'test-playlist-id';
      const expectedCount = 7;

      // Mock Supabase responses
      const mockSupabase = require('@/lib/supabase').supabase;
      
      // Mock like count query (no user check needed)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: expectedCount, error: null })),
        })),
      });

      const result = await getPlaylistLikeStatus(playlistId);
      
      expect(result.data?.likeCount).toBe(expectedCount);
      expect(result.data?.liked).toBe(false); // Unauthenticated users are not liked
      expect(result.error).toBeNull();

      // Validates: Requirements 2.1
    });
  });
});
