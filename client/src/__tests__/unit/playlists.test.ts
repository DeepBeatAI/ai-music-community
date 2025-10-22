/**
 * Unit tests for playlist functions
 * Tests the core playlist management functionality including:
 * - Adding tracks to playlists with validation
 * - Retrieving playlists with tracks
 * - Removing tracks from playlists
 * - Checking track existence in playlists
 */

// Mock the supabase client BEFORE any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

import {
  addTrackToPlaylist,
  getPlaylistWithTracks,
  removeTrackFromPlaylist,
  isTrackInPlaylist,
} from '@/lib/playlists';
import { supabase } from '@/lib/supabase';

describe('Playlist Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTrackToPlaylist', () => {
    const mockUser = { id: 'user-123' };
    const mockTrack = {
      id: 'track-123',
      user_id: 'user-123',
      is_public: true,
    };

    beforeEach(() => {
      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should successfully add a valid public track to playlist', async () => {
      // Mock track fetch
      const mockTrackQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTrack,
          error: null,
        }),
      };

      // Mock position calculation
      const mockPositionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ position: 5 }],
          error: null,
        }),
      };

      // Mock insert
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockTrackQuery) // First call for track fetch
        .mockReturnValueOnce(mockPositionQuery) // Second call for position
        .mockReturnValueOnce(mockInsertQuery); // Third call for insert

      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-123',
        track_id: 'track-123',
      });

      expect(result.success).toBe(true);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        playlist_id: 'playlist-123',
        track_id: 'track-123',
        position: 6,
      });
    });

    it('should fail when track does not exist', async () => {
      const mockTrackQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Track not found' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockTrackQuery);

      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-123',
        track_id: 'nonexistent-track',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Track not found');
    });

    it('should fail when user does not have permission to add private track', async () => {
      const privateTrack = {
        id: 'track-456',
        user_id: 'other-user',
        is_public: false,
      };

      const mockTrackQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: privateTrack,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockTrackQuery);

      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-123',
        track_id: 'track-456',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to add this track');
    });

    it('should prevent adding duplicate tracks', async () => {
      const mockTrackQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTrack,
          error: null,
        }),
      };

      const mockPositionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key violation' },
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockTrackQuery)
        .mockReturnValueOnce(mockPositionQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-123',
        track_id: 'track-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Track is already in this playlist');
    });

    it('should allow user to add their own private track', async () => {
      const ownPrivateTrack = {
        id: 'track-789',
        user_id: 'user-123',
        is_public: false,
      };

      const mockTrackQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: ownPrivateTrack,
          error: null,
        }),
      };

      const mockPositionQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockTrackQuery)
        .mockReturnValueOnce(mockPositionQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await addTrackToPlaylist({
        playlist_id: 'playlist-123',
        track_id: 'track-789',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getPlaylistWithTracks', () => {
    it('should return playlist with sorted tracks', async () => {
      const mockPlaylistData = {
        id: 'playlist-123',
        name: 'My Playlist',
        tracks: [
          {
            id: 'pt-2',
            track_id: 'track-2',
            position: 2,
            added_at: '2024-01-02',
            track: { id: 'track-2', title: 'Track 2' },
          },
          {
            id: 'pt-1',
            track_id: 'track-1',
            position: 1,
            added_at: '2024-01-01',
            track: { id: 'track-1', title: 'Track 1' },
          },
          {
            id: 'pt-3',
            track_id: 'track-3',
            position: 3,
            added_at: '2024-01-03',
            track: { id: 'track-3', title: 'Track 3' },
          },
        ],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPlaylistData,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPlaylistWithTracks('playlist-123');

      expect(result).not.toBeNull();
      expect(result?.tracks).toHaveLength(3);
      expect(result?.tracks[0].position).toBe(1);
      expect(result?.tracks[1].position).toBe(2);
      expect(result?.tracks[2].position).toBe(3);
      expect(result?.track_count).toBe(3);
    });

    it('should return null when playlist not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPlaylistWithTracks('nonexistent-playlist');

      expect(result).toBeNull();
    });

    it('should handle empty playlist', async () => {
      const mockPlaylistData = {
        id: 'playlist-123',
        name: 'Empty Playlist',
        tracks: [],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPlaylistData,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getPlaylistWithTracks('playlist-123');

      expect(result).not.toBeNull();
      expect(result?.tracks).toHaveLength(0);
      expect(result?.track_count).toBe(0);
    });
  });

  describe('removeTrackFromPlaylist', () => {
    it('should successfully remove track from playlist', async () => {
      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'pt-123' },
          error: null,
        }),
      };

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      // Chain the eq calls properly
      mockDeleteQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockCheckQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await removeTrackFromPlaylist({
        playlist_id: 'playlist-123',
        track_id: 'track-123',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when track not in playlist', async () => {
      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockCheckQuery);

      const result = await removeTrackFromPlaylist({
        playlist_id: 'playlist-123',
        track_id: 'track-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Track not found in playlist');
    });
  });

  describe('isTrackInPlaylist', () => {
    it('should return true when track is in playlist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'pt-123' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await isTrackInPlaylist('playlist-123', 'track-123');

      expect(result).toBe(true);
    });

    it('should return false when track is not in playlist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await isTrackInPlaylist('playlist-123', 'track-123');

      expect(result).toBe(false);
    });

    it('should return null on error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await isTrackInPlaylist('playlist-123', 'track-123');

      expect(result).toBeNull();
    });
  });
});
