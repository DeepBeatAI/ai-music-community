/**
 * Unit tests for profile service functions
 * Tests the creator profile functionality including:
 * - Getting creator by username
 * - Getting creator by ID
 * - Getting creator statistics with proper calculations
 * - Getting public tracks, albums, and playlists
 */

// Mock the supabase client BEFORE any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import {
  getCreatorByUsername,
  getCreatorById,
  getCreatorStats,
  getPublicTracks,
  getPublicAlbums,
  getPublicPlaylists,
} from '@/lib/profileService';
import { supabase } from '@/lib/supabase';

describe('Profile Service Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCreatorByUsername', () => {
    it('should return creator profile when username exists', async () => {
      const mockUserProfile = {
        user_id: 'user-123',
        username: 'testuser',
        user_type: 'Creator',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserProfile,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCreatorByUsername('testuser');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
      expect(result?.username).toBe('testuser');
      expect(result?.user_type).toBe('Creator');
    });

    it('should return null when username does not exist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCreatorByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCreatorByUsername('testuser');

      expect(result).toBeNull();
    });
  });

  describe('getCreatorById', () => {
    it('should return creator profile when user ID exists', async () => {
      const mockUserProfile = {
        user_id: 'user-123',
        username: 'testuser',
        user_type: 'Creator',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserProfile,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCreatorById('user-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
      expect(result?.username).toBe('testuser');
    });

    it('should return null when user ID does not exist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getCreatorById('nonexistent-id');

      expect(result).toBeNull();
    });
  });


  describe('getCreatorStats', () => {
    it('should calculate creator score correctly: (total_plays × 0.6) + (total_likes × 0.4)', async () => {
      // Mock tracks count
      const mockTracksQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockTracksQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          count: 5,
          error: null,
        }),
      });

      // Mock albums count
      const mockAlbumsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockAlbumsQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          count: 2,
          error: null,
        }),
      });

      // Mock playlists count
      const mockPlaylistsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockPlaylistsQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      });

      // Mock play counts (total_plays = 100)
      const mockPlaysQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockPlaysQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { play_count: 50 },
            { play_count: 30 },
            { play_count: 20 },
          ],
          error: null,
        }),
      });

      // Mock followers count
      const mockFollowersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 10,
          error: null,
        }),
      };

      // Mock likes (total_likes = 50)
      const mockLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [
            { track_id: 'track-1', post_likes: new Array(20) },
            { track_id: 'track-2', post_likes: new Array(30) },
          ],
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockTracksQuery)
        .mockReturnValueOnce(mockAlbumsQuery)
        .mockReturnValueOnce(mockPlaylistsQuery)
        .mockReturnValueOnce(mockPlaysQuery)
        .mockReturnValueOnce(mockFollowersQuery)
        .mockReturnValueOnce(mockLikesQuery);

      const result = await getCreatorStats('user-123');

      // Expected: (100 × 0.6) + (50 × 0.4) = 60 + 20 = 80
      expect(result.creator_score).toBe(80);
      expect(result.total_plays).toBe(100);
      expect(result.follower_count).toBe(10);
      expect(result.track_count).toBe(5);
      expect(result.album_count).toBe(2);
      expect(result.playlist_count).toBe(3);
    });


    it('should verify follower_count comes from user_follows table', async () => {
      const mockTracksQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockTracksQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const mockAlbumsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockAlbumsQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const mockPlaylistsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockPlaylistsQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const mockPlaysQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockPlaysQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Mock followers from user_follows table
      const mockFollowersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 25,
          error: null,
        }),
      };

      const mockLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockTracksQuery)
        .mockReturnValueOnce(mockAlbumsQuery)
        .mockReturnValueOnce(mockPlaylistsQuery)
        .mockReturnValueOnce(mockPlaysQuery)
        .mockReturnValueOnce(mockFollowersQuery)
        .mockReturnValueOnce(mockLikesQuery);

      const result = await getCreatorStats('user-123');

      expect(result.follower_count).toBe(25);
      expect(mockFollowersQuery.eq).toHaveBeenCalledWith('following_id', 'user-123');
    });

    it('should verify all counts filter to is_public = true only', async () => {
      const mockTracksQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const tracksEqChain = {
        eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
      };
      mockTracksQuery.eq = jest.fn()
        .mockReturnValueOnce(tracksEqChain)
        .mockReturnValueOnce(tracksEqChain);

      const mockAlbumsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const albumsEqChain = {
        eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
      };
      mockAlbumsQuery.eq = jest.fn()
        .mockReturnValueOnce(albumsEqChain)
        .mockReturnValueOnce(albumsEqChain);

      const mockPlaylistsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const playlistsEqChain = {
        eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
      };
      mockPlaylistsQuery.eq = jest.fn()
        .mockReturnValueOnce(playlistsEqChain)
        .mockReturnValueOnce(playlistsEqChain);

      const mockPlaysQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const playsEqChain = {
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockPlaysQuery.eq = jest.fn()
        .mockReturnValueOnce(playsEqChain)
        .mockReturnValueOnce(playsEqChain);

      const mockFollowersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      };

      const mockLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockTracksQuery)
        .mockReturnValueOnce(mockAlbumsQuery)
        .mockReturnValueOnce(mockPlaylistsQuery)
        .mockReturnValueOnce(mockPlaysQuery)
        .mockReturnValueOnce(mockFollowersQuery)
        .mockReturnValueOnce(mockLikesQuery);

      await getCreatorStats('user-123');

      // Verify tracks query filters by is_public
      expect(mockTracksQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(tracksEqChain.eq).toHaveBeenCalledWith('is_public', true);

      // Verify albums query filters by is_public
      expect(mockAlbumsQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(albumsEqChain.eq).toHaveBeenCalledWith('is_public', true);

      // Verify playlists query filters by is_public
      expect(mockPlaylistsQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(playlistsEqChain.eq).toHaveBeenCalledWith('is_public', true);
    });


    it('should return default stats on error', async () => {
      // Mock all queries to throw errors
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await getCreatorStats('user-123');

      expect(result.creator_score).toBe(0);
      expect(result.follower_count).toBe(0);
      expect(result.track_count).toBe(0);
      expect(result.album_count).toBe(0);
      expect(result.playlist_count).toBe(0);
      expect(result.total_plays).toBe(0);
    });

    it('should handle zero plays and likes correctly', async () => {
      const mockTracksQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockTracksQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const mockAlbumsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockAlbumsQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const mockPlaylistsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockPlaylistsQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const mockPlaysQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockPlaysQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const mockFollowersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      };

      const mockLikesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockTracksQuery)
        .mockReturnValueOnce(mockAlbumsQuery)
        .mockReturnValueOnce(mockPlaylistsQuery)
        .mockReturnValueOnce(mockPlaysQuery)
        .mockReturnValueOnce(mockFollowersQuery)
        .mockReturnValueOnce(mockLikesQuery);

      const result = await getCreatorStats('user-123');

      // Expected: (0 × 0.6) + (0 × 0.4) = 0
      expect(result.creator_score).toBe(0);
      expect(result.total_plays).toBe(0);
    });
  });


  describe('getPublicTracks', () => {
    it('should return only public tracks for a creator', async () => {
      const mockTracks = [
        { id: 'track-1', title: 'Track 1', is_public: true },
        { id: 'track-2', title: 'Track 2', is_public: true },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockTracks,
          error: null,
        }),
      };

      // Chain the eq calls
      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPublicTracks('user-123', 12, 0);

      expect(result).toHaveLength(2);
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 11);
    });

    it('should handle pagination correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await getPublicTracks('user-123', 12, 24);

      expect(mockQuery.range).toHaveBeenCalledWith(24, 35);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPublicTracks('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getPublicAlbums', () => {
    it('should return only public albums for a creator', async () => {
      const mockAlbums = [
        { id: 'album-1', title: 'Album 1', is_public: true },
        { id: 'album-2', title: 'Album 2', is_public: true },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockAlbums,
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPublicAlbums('user-123', 8, 0);

      expect(result).toHaveLength(2);
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.range).toHaveBeenCalledWith(0, 7);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPublicAlbums('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getPublicPlaylists', () => {
    it('should return only public playlists for a creator', async () => {
      const mockPlaylists = [
        { id: 'playlist-1', name: 'Playlist 1', is_public: true },
        { id: 'playlist-2', name: 'Playlist 2', is_public: true },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockPlaylists,
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPublicPlaylists('user-123', 8, 0);

      expect(result).toHaveLength(2);
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.range).toHaveBeenCalledWith(0, 7);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPublicPlaylists('user-123');

      expect(result).toEqual([]);
    });
  });
});
