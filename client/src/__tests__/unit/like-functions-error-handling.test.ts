/**
 * Unit Tests for Album and Playlist Like Functions - Error Handling
 * 
 * Feature: discover-page-tabs-enhancement
 * 
 * This test suite validates error handling for like functions:
 * - Authentication error handling
 * - Network failure scenarios
 * - Duplicate like prevention
 * 
 * Validates Requirements: 1.3, 1.6, 2.3, 2.6
 */

import { toggleAlbumLike, getAlbumLikeStatus } from '@/lib/albums';
import { togglePlaylistLike, getPlaylistLikeStatus } from '@/lib/playlists';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Feature: discover-page-tabs-enhancement - Like Functions Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Authentication Error Handling
   * 
   * Validates: Requirements 1.3, 2.3
   */
  describe('Authentication Error Handling', () => {
    it('should return error when toggling album like without authentication', async () => {
      const albumId = 'test-album-id';
      const userId = ''; // Empty user ID simulates unauthenticated user

      const result = await toggleAlbumLike(albumId, userId, false);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Authentication required');

      // Validates: Requirements 1.3
    });

    it('should return error when toggling playlist like without authentication', async () => {
      const playlistId = 'test-playlist-id';
      const userId = ''; // Empty user ID simulates unauthenticated user

      const result = await togglePlaylistLike(playlistId, userId, false);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Authentication required');

      // Validates: Requirements 2.3
    });

    it('should handle unauthenticated users gracefully when getting album like status', async () => {
      const albumId = 'test-album-id';
      const expectedCount = 5;

      // Mock Supabase response
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: expectedCount, error: null })),
        })),
      });

      const result = await getAlbumLikeStatus(albumId); // No userId

      expect(result.data?.liked).toBe(false);
      expect(result.data?.likeCount).toBe(expectedCount);
      expect(result.error).toBeNull();

      // Validates: Requirements 1.3
    });

    it('should handle unauthenticated users gracefully when getting playlist like status', async () => {
      const playlistId = 'test-playlist-id';
      const expectedCount = 3;

      // Mock Supabase response
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: expectedCount, error: null })),
        })),
      });

      const result = await getPlaylistLikeStatus(playlistId); // No userId

      expect(result.data?.liked).toBe(false);
      expect(result.data?.likeCount).toBe(expectedCount);
      expect(result.error).toBeNull();

      // Validates: Requirements 2.3
    });
  });

  /**
   * Network Failure Scenarios
   * 
   * Validates: Requirements 1.3, 2.3
   */
  describe('Network Failure Scenarios', () => {
    it('should handle network error when toggling album like', async () => {
      const albumId = 'test-album-id';
      const userId = 'test-user-id';

      // Mock network error
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { message: 'Network error', code: 'NETWORK_ERROR' } 
        })),
      });

      const result = await toggleAlbumLike(albumId, userId, false);

      expect(result.data).toBeNull();
      expect(result.error).toContain('Failed to update like status');
      expect(result.error).toContain('Network error');

      // Validates: Requirements 1.3
    });

    it('should handle network error when toggling playlist like', async () => {
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';

      // Mock network error
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { message: 'Network error', code: 'NETWORK_ERROR' } 
        })),
      });

      const result = await togglePlaylistLike(playlistId, userId, false);

      expect(result.data).toBeNull();
      expect(result.error).toContain('Failed to update like status');
      expect(result.error).toContain('Network error');

      // Validates: Requirements 2.3
    });

    it('should handle database error when getting album like status', async () => {
      const albumId = 'test-album-id';
      const userId = 'test-user-id';

      // Mock database error
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.reject(new Error('Database connection failed'))),
            })),
          })),
        })),
      });

      const result = await getAlbumLikeStatus(albumId, userId);

      // Should return default values on error
      expect(result.data?.liked).toBe(false);
      expect(result.data?.likeCount).toBe(0);
      expect(result.error).toBeNull(); // Graceful degradation

      // Validates: Requirements 1.3
    });

    it('should handle database error when getting playlist like status', async () => {
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';

      // Mock database error
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.reject(new Error('Database connection failed'))),
            })),
          })),
        })),
      });

      const result = await getPlaylistLikeStatus(playlistId, userId);

      // Should return default values on error
      expect(result.data?.liked).toBe(false);
      expect(result.data?.likeCount).toBe(0);
      expect(result.error).toBeNull(); // Graceful degradation

      // Validates: Requirements 2.3
    });
  });

  /**
   * Duplicate Like Prevention
   * 
   * Validates: Requirements 1.6, 2.6
   */
  describe('Duplicate Like Prevention', () => {
    it('should handle duplicate album like gracefully', async () => {
      const albumId = 'test-album-id';
      const userId = 'test-user-id';

      // Mock unique constraint violation (error code 23505)
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { 
            message: 'duplicate key value violates unique constraint',
            code: '23505' 
          } 
        })),
      });

      // Mock count query for duplicate case
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const result = await toggleAlbumLike(albumId, userId, false);

      // Should treat duplicate as success (idempotent operation)
      expect(result.data?.liked).toBe(true);
      expect(result.data?.likeCount).toBe(1);
      expect(result.error).toBeNull();

      // Validates: Requirements 1.6
    });

    it('should handle duplicate playlist like gracefully', async () => {
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';

      // Mock unique constraint violation (error code 23505)
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { 
            message: 'duplicate key value violates unique constraint',
            code: '23505' 
          } 
        })),
      });

      // Mock count query for duplicate case
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const result = await togglePlaylistLike(playlistId, userId, false);

      // Should treat duplicate as success (idempotent operation)
      expect(result.data?.liked).toBe(true);
      expect(result.data?.likeCount).toBe(1);
      expect(result.error).toBeNull();

      // Validates: Requirements 2.6
    });

    it('should prevent multiple likes from same user on same album', async () => {
      const albumId = 'test-album-id';
      const userId = 'test-user-id';

      // First like should succeed
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ error: null })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const firstLike = await toggleAlbumLike(albumId, userId, false);
      expect(firstLike.data?.liked).toBe(true);

      // Second like attempt should be prevented by unique constraint
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { 
            message: 'duplicate key value violates unique constraint',
            code: '23505' 
          } 
        })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const secondLike = await toggleAlbumLike(albumId, userId, false);
      
      // Should still return liked status (idempotent)
      expect(secondLike.data?.liked).toBe(true);
      expect(secondLike.data?.likeCount).toBe(1); // Count should not increase

      // Validates: Requirements 1.6
    });

    it('should prevent multiple likes from same user on same playlist', async () => {
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';

      // First like should succeed
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ error: null })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const firstLike = await togglePlaylistLike(playlistId, userId, false);
      expect(firstLike.data?.liked).toBe(true);

      // Second like attempt should be prevented by unique constraint
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { 
            message: 'duplicate key value violates unique constraint',
            code: '23505' 
          } 
        })),
      });
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 1, error: null })),
        })),
      });

      const secondLike = await togglePlaylistLike(playlistId, userId, false);
      
      // Should still return liked status (idempotent)
      expect(secondLike.data?.liked).toBe(true);
      expect(secondLike.data?.likeCount).toBe(1); // Count should not increase

      // Validates: Requirements 2.6
    });
  });

  /**
   * Error Recovery and Logging
   * 
   * Validates: Requirements 1.3, 2.3
   */
  describe('Error Recovery and Logging', () => {
    it('should log detailed error information for album like failures', async () => {
      const albumId = 'test-album-id';
      const userId = 'test-user-id';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock error with detailed information
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { 
            message: 'Foreign key constraint violation',
            code: '23503',
            details: 'Album does not exist',
            hint: 'Check album_id reference'
          } 
        })),
      });

      await toggleAlbumLike(albumId, userId, false);

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('ERROR CAUGHT'))
      )).toBe(true);

      consoleErrorSpy.mockRestore();

      // Validates: Requirements 1.3
    });

    it('should log detailed error information for playlist like failures', async () => {
      const playlistId = 'test-playlist-id';
      const userId = 'test-user-id';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock error with detailed information
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ 
          error: { 
            message: 'Foreign key constraint violation',
            code: '23503',
            details: 'Playlist does not exist',
            hint: 'Check playlist_id reference'
          } 
        })),
      });

      await togglePlaylistLike(playlistId, userId, false);

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('ERROR CAUGHT'))
      )).toBe(true);

      consoleErrorSpy.mockRestore();

      // Validates: Requirements 2.3
    });
  });
});
