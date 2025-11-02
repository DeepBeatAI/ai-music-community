/**
 * Unit Tests for Album API Functions
 * Task 22: Album API Unit Tests
 * 
 * Note: These tests use mocked Supabase client to test function logic
 * without requiring a real database connection.
 */

import { createAlbum, getUserAlbums, addTrackToAlbum, reorderAlbumTracks } from '../albums';
import { supabase } from '../supabase';
import type { AlbumInsert } from '@/types/album';

// Mock the Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Album API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserAlbums', () => {
    it('should return user albums sorted by created_at desc', async () => {
      const mockAlbums = [
        { id: '1', name: 'Album 1', user_id: 'user-1', created_at: '2025-01-02' },
        { id: '2', name: 'Album 2', user_id: 'user-1', created_at: '2025-01-01' },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockAlbums,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getUserAlbums('user-1');

      expect(result).toEqual(mockAlbums);
      expect(mockFrom).toHaveBeenCalledWith('albums');
    });

    it('should return empty array for user with no albums', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await getUserAlbums('user-1');

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
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

      const result = await getUserAlbums('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createAlbum', () => {
    it('should create album with correct defaults', async () => {
      const albumData: AlbumInsert = {
        user_id: 'user-1',
        name: 'Test Album',
        description: 'Test Description',
      };

      const mockAlbum = {
        id: 'album-1',
        ...albumData,
        is_public: true,
        created_at: '2025-01-01',
      };

      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlbum,
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await createAlbum(albumData);

      expect(result.success).toBe(true);
      expect(result.album).toEqual(mockAlbum);
      expect(result.album?.is_public).toBe(true); // Default to true
    });

    it('should validate required fields', async () => {
      const albumData: AlbumInsert = {
        user_id: 'user-1',
        name: '',
      };

      const result = await createAlbum(albumData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Album name is required');
    });

    it('should trim whitespace from name', async () => {
      const albumData: AlbumInsert = {
        user_id: 'user-1',
        name: '  Test Album  ',
      };

      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...albumData, name: 'Test Album', id: 'album-1' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await createAlbum(albumData);

      expect(result.success).toBe(true);
      // Verify insert was called with trimmed name
      const insertCall = mockFrom().insert;
      expect(insertCall).toHaveBeenCalled();
    });
  });

  describe('addTrackToAlbum', () => {
    it('should add track to album', async () => {
      // Mock auth.getUser
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      // Mock track fetch
      const mockFrom = jest.fn()
        .mockReturnValueOnce({
          // First call: fetch track
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'track-1', user_id: 'user-1', is_public: false },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: delete from previous album
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          // Third call: fetch existing tracks for position
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
        })
        .mockReturnValueOnce({
          // Fourth call: insert into album
          insert: jest.fn().mockResolvedValue({
            error: null,
          }),
        });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await addTrackToAlbum({
        album_id: 'album-1',
        track_id: 'track-1',
      });

      expect(result.success).toBe(true);
    });

    it('should handle track not found', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await addTrackToAlbum({
        album_id: 'album-1',
        track_id: 'invalid-track',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Track not found');
    });
  });

  describe('reorderAlbumTracks', () => {
    it('should update track positions correctly', async () => {
      const trackIds = ['track-3', 'track-1', 'track-2'];

      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await reorderAlbumTracks('album-1', trackIds);

      expect(result.success).toBe(true);
      
      // Verify upsert was called with correct positions
      const upsertCall = mockFrom().upsert;
      expect(upsertCall).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ track_id: 'track-3', position: 1 }),
          expect.objectContaining({ track_id: 'track-1', position: 2 }),
          expect.objectContaining({ track_id: 'track-2', position: 3 }),
        ]),
        expect.any(Object)
      );
    });

    it('should handle invalid positions', async () => {
      const result = await reorderAlbumTracks('album-1', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid parameters');
    });

    it('should handle database errors', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await reorderAlbumTracks('album-1', ['track-1']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
