/**
 * Unit Tests for Library API Functions
 * Task 22.1: Library API Unit Tests
 * 
 * Note: These tests use mocked Supabase client to test function logic
 * without requiring a real database connection.
 */

import { getLibraryStats, getUserTracksWithMembership } from '../library';
import { supabase } from '../supabase';

// Mock the Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Library API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLibraryStats', () => {
    it('should calculate total tracks correctly', async () => {
      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          // Tracks count
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 5,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          // Albums count
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          // Playlists count
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          // Play counts
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      expect(result.totalTracks).toBe(5);
    });

    it('should calculate total albums correctly', async () => {
      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      expect(result.totalAlbums).toBe(3);
    });

    it('should calculate total playlists correctly', async () => {
      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 4, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      expect(result.totalPlaylists).toBe(4);
    });

    it('should calculate total plays with mixed play counts', async () => {
      const mockTracks = [
        { play_count: 10 },
        { play_count: 5 },
        { play_count: 3 },
      ];

      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockTracks, error: null }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      expect(result.playsAllTime).toBe(18); // 10 + 5 + 3
    });

    it('should calculate total plays correctly', async () => {
      const mockTracks = [
        { play_count: 10, created_at: '2025-01-01' },
        { play_count: 5, created_at: '2025-01-02' },
        { play_count: 3, created_at: '2025-01-03' },
      ];

      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockTracks, error: null }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      expect(result.playsAllTime).toBe(18); // 10 + 5 + 3
    });

    it('should return correct upload remaining', async () => {
      const mockFrom = jest.fn()
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, data: [], error: null }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      expect(result.uploadRemaining).toBe('infinite');
    });

    it('should handle user with no data', async () => {
      const mockFrom = jest.fn()
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0, data: [], error: null }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      expect(result).toEqual({
        uploadRemaining: 'infinite',
        totalTracks: 0,
        totalAlbums: 0,
        totalPlaylists: 0,
        playsAllTime: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      const mockFrom = jest.fn()
        .mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getLibraryStats('user-1');

      // Should return default stats on error
      expect(result).toEqual({
        uploadRemaining: 'infinite',
        totalTracks: 0,
        totalAlbums: 0,
        totalPlaylists: 0,
        playsAllTime: 0,
      });
    });
  });

  describe('getUserTracksWithMembership', () => {
    it('should include album data for tracks', async () => {
      const mockTracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          user_id: 'user-1',
          created_at: '2025-01-01',
          album_tracks: [
            {
              album_id: 'album-1',
              albums: { name: 'Test Album' },
            },
          ],
          playlist_tracks: [],
        },
      ];

      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          // First call: tracks query
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTracks,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: user_profiles query
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-1', username: 'testuser' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Third call: posts query
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getUserTracksWithMembership('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].albumId).toBe('album-1');
      expect(result[0].albumName).toBe('Test Album');
    });

    it('should include playlist data for tracks', async () => {
      const mockTracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          user_id: 'user-1',
          created_at: '2025-01-01',
          album_tracks: [],
          playlist_tracks: [
            { playlist_id: 'playlist-1', playlists: { name: 'Playlist A' } },
            { playlist_id: 'playlist-2', playlists: { name: 'Playlist B' } },
          ],
        },
      ];

      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTracks,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-1', username: 'testuser' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getUserTracksWithMembership('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].playlistIds).toEqual(['playlist-1', 'playlist-2']);
      expect(result[0].playlistNames).toEqual(['Playlist A', 'Playlist B']);
    });

    it('should handle tracks with no memberships', async () => {
      const mockTracks = [
        {
          id: 'track-1',
          title: 'Track 1',
          user_id: 'user-1',
          created_at: '2025-01-01',
          album_tracks: [],
          playlist_tracks: [],
        },
      ];

      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTracks,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-1', username: 'testuser' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getUserTracksWithMembership('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].albumId).toBeNull();
      expect(result[0].playlistIds).toEqual([]);
    });

    it('should sort tracks by created_at desc', async () => {
      const mockTracks = [
        {
          id: 'track-2',
          title: 'Track 2',
          user_id: 'user-1',
          created_at: '2025-01-02',
          album_tracks: [],
          playlist_tracks: [],
        },
        {
          id: 'track-1',
          title: 'Track 1',
          user_id: 'user-1',
          created_at: '2025-01-01',
          album_tracks: [],
          playlist_tracks: [],
        },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockTracks,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getUserTracksWithMembership('user-1');

      // Verify order is called with correct parameters
      const orderCall = mockFrom().select().eq().order;
      expect(orderCall).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should respect limit parameter', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      await getUserTracksWithMembership('user-1', 12);

      // Verify limit was called
      const limitCall = mockFrom().select().eq().order().limit;
      expect(limitCall).toHaveBeenCalledWith(12);
    });

    it('should handle errors gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getUserTracksWithMembership('user-1');

      expect(result).toEqual([]);
    });
  });
});
