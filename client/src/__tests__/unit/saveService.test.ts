/**
 * Unit tests for save service functions
 * Tests the save/unsave functionality including:
 * - Saving tracks, albums, and playlists
 * - Unsaving tracks, albums, and playlists
 * - Getting saved status
 * - Bulk saved status checks
 * - Error handling and edge cases
 */

// Mock the supabase client BEFORE any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import {
  saveTrack,
  unsaveTrack,
  saveAlbum,
  unsaveAlbum,
  savePlaylist,
  unsavePlaylist,
  getSavedStatus,
  getBulkSavedStatus,
} from '@/lib/saveService';
import { supabase } from '@/lib/supabase';

describe('Save Service Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveTrack', () => {
    it('should successfully save a track', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await saveTrack('user-123', 'track-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        track_id: 'track-123',
      });
    });

    it('should handle duplicate save gracefully (unique constraint)', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key violation' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await saveTrack('user-123', 'track-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error on database failure', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await saveTrack('user-123', 'track-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });


  describe('unsaveTrack', () => {
    it('should successfully unsave a track', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await unsaveTrack('user-123', 'track-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error on database failure', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await unsaveTrack('user-123', 'track-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('saveAlbum', () => {
    it('should successfully save an album', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await saveAlbum('user-123', 'album-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        album_id: 'album-123',
      });
    });

    it('should handle duplicate save gracefully', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key violation' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await saveAlbum('user-123', 'album-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('unsaveAlbum', () => {
    it('should successfully unsave an album', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await unsaveAlbum('user-123', 'album-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('savePlaylist', () => {
    it('should successfully save a playlist', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await savePlaylist('user-123', 'playlist-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        playlist_id: 'playlist-123',
      });
    });

    it('should handle duplicate save gracefully', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key violation' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await savePlaylist('user-123', 'playlist-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('unsavePlaylist', () => {
    it('should successfully unsave a playlist', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await unsavePlaylist('user-123', 'playlist-123');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });


  describe('getSavedStatus', () => {
    it('should return true when track is saved', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'saved-123' },
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getSavedStatus('user-123', 'track-123', 'track');

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return false when track is not saved', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getSavedStatus('user-123', 'track-123', 'track');

      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should work for albums', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'saved-123' },
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getSavedStatus('user-123', 'album-123', 'album');

      expect(result.data).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('saved_albums');
    });

    it('should work for playlists', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'saved-123' },
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getSavedStatus('user-123', 'playlist-123', 'playlist');

      expect(result.data).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('saved_playlists');
    });

    it('should return error for invalid item type', async () => {
      const result = await getSavedStatus('user-123', 'item-123', 'invalid' as 'track' | 'album' | 'playlist');

      expect(result.data).toBe(false);
      expect(result.error).toBe('Invalid item type');
    });

    it('should return false on database error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockQuery),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getSavedStatus('user-123', 'track-123', 'track');

      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });
  });


  describe('getBulkSavedStatus', () => {
    it('should return saved status for multiple tracks', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { track_id: 'track-1' },
            { track_id: 'track-3' },
          ],
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue(mockQuery);

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getBulkSavedStatus(
        'user-123',
        ['track-1', 'track-2', 'track-3'],
        'track'
      );

      expect(result.data).toEqual({
        'track-1': true,
        'track-2': false,
        'track-3': true,
      });
      expect(result.error).toBeNull();
    });

    it('should return empty object for empty array', async () => {
      const result = await getBulkSavedStatus('user-123', [], 'track');

      expect(result.data).toEqual({});
      expect(result.error).toBeNull();
    });

    it('should work for albums', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ album_id: 'album-1' }],
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue(mockQuery);

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getBulkSavedStatus(
        'user-123',
        ['album-1', 'album-2'],
        'album'
      );

      expect(result.data).toEqual({
        'album-1': true,
        'album-2': false,
      });
      expect(supabase.from).toHaveBeenCalledWith('saved_albums');
    });

    it('should work for playlists', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ playlist_id: 'playlist-1' }],
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue(mockQuery);

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getBulkSavedStatus(
        'user-123',
        ['playlist-1', 'playlist-2'],
        'playlist'
      );

      expect(result.data).toEqual({
        'playlist-1': true,
        'playlist-2': false,
      });
      expect(supabase.from).toHaveBeenCalledWith('saved_playlists');
    });

    it('should return error for invalid item type', async () => {
      const result = await getBulkSavedStatus(
        'user-123',
        ['item-1'],
        'invalid' as 'track' | 'album' | 'playlist'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBe('Invalid item type');
    });

    it('should return all false on database error', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue(mockQuery);

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getBulkSavedStatus(
        'user-123',
        ['track-1', 'track-2'],
        'track'
      );

      expect(result.data).toEqual({
        'track-1': false,
        'track-2': false,
      });
      expect(result.error).toBeNull();
    });

    it('should handle all items not saved', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue(mockQuery);

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getBulkSavedStatus(
        'user-123',
        ['track-1', 'track-2', 'track-3'],
        'track'
      );

      expect(result.data).toEqual({
        'track-1': false,
        'track-2': false,
        'track-3': false,
      });
    });

    it('should handle all items saved', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { track_id: 'track-1' },
            { track_id: 'track-2' },
            { track_id: 'track-3' },
          ],
          error: null,
        }),
      };

      mockQuery.eq = jest.fn().mockReturnValue(mockQuery);

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getBulkSavedStatus(
        'user-123',
        ['track-1', 'track-2', 'track-3'],
        'track'
      );

      expect(result.data).toEqual({
        'track-1': true,
        'track-2': true,
        'track-3': true,
      });
    });
  });
});
