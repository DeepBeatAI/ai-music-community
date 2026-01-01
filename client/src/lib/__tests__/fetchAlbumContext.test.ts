/**
 * Unit tests for fetchAlbumContext function
 * Requirements: 3.4, 3.5
 */

import { fetchAlbumContext } from '../moderationService';
import { supabase } from '../supabase';
import { ModerationError, MODERATION_ERROR_CODES } from '@/types/moderation';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('fetchAlbumContext', () => {
  const mockModeratorId = '11111111-1111-1111-1111-111111111111';
  const mockAlbumId = '22222222-2222-2222-2222-222222222222';
  const mockAlbum = {
    id: mockAlbumId,
    name: 'Test Album',
    description: 'Test album description',
    cover_image_url: 'https://example.com/cover.jpg',
    user_id: '33333333-3333-3333-3333-333333333333',
    is_public: true,
    created_at: new Date().toISOString(),
    album_tracks: [
      {
        position: 1,
        track: {
          id: 'track-1',
          title: 'Track 1',
          duration: 180,
        },
      },
      {
        position: 2,
        track: {
          id: 'track-2',
          title: 'Track 2',
          duration: 240,
        },
      },
      {
        position: 3,
        track: {
          id: 'track-3',
          title: 'Track 3',
          duration: 200,
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should throw validation error for invalid album ID format', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role_type: 'moderator' }],
              error: null,
            }),
          }),
        }),
      });

      await expect(fetchAlbumContext('invalid-uuid')).rejects.toThrow(ModerationError);
      await expect(fetchAlbumContext('invalid-uuid')).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid album ID format',
      });
    });
  });

  describe('Authorization', () => {
    it('should require moderator role', async () => {
      // Mock current user (regular user)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock non-moderator role check
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      await expect(fetchAlbumContext(mockAlbumId)).rejects.toThrow(ModerationError);
      await expect(fetchAlbumContext(mockAlbumId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.UNAUTHORIZED,
      });
    });
  });

  describe('Album Data Fetching', () => {
    it('should fetch album data with tracks successfully', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album fetch
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockAlbum,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await fetchAlbumContext(mockAlbumId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockAlbumId);
      expect(result!.name).toBe('Test Album');
      expect(result!.description).toBe('Test album description');
      expect(result!.cover_image_url).toBe('https://example.com/cover.jpg');
      expect(result!.user_id).toBe('33333333-3333-3333-3333-333333333333');
      expect(result!.is_public).toBe(true);
      expect(result!.tracks).toHaveLength(3);
    });

    it('should throw error when album not found', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album not found
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      await expect(fetchAlbumContext(mockAlbumId)).rejects.toThrow(ModerationError);
      await expect(fetchAlbumContext(mockAlbumId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.NOT_FOUND,
        message: 'Album not found',
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and database error
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'DATABASE_ERROR', message: 'Database connection failed' },
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      await expect(fetchAlbumContext(mockAlbumId)).rejects.toThrow(ModerationError);
      await expect(fetchAlbumContext(mockAlbumId)).rejects.toMatchObject({
        code: MODERATION_ERROR_CODES.DATABASE_ERROR,
      });
    });
  });

  describe('Track Count Calculation', () => {
    it('should calculate track count correctly', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album fetch
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockAlbum,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await fetchAlbumContext(mockAlbumId);

      expect(result).not.toBeNull();
      expect(result!.track_count).toBe(3);
    });

    it('should handle albums with no tracks', async () => {
      const albumWithNoTracks = {
        ...mockAlbum,
        album_tracks: [],
      };

      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album fetch
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: albumWithNoTracks,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await fetchAlbumContext(mockAlbumId);

      expect(result).not.toBeNull();
      expect(result!.track_count).toBe(0);
      expect(result!.tracks).toHaveLength(0);
    });
  });

  describe('Total Duration Calculation', () => {
    it('should calculate total duration correctly', async () => {
      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album fetch
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockAlbum,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await fetchAlbumContext(mockAlbumId);

      // Total duration should be 180 + 240 + 200 = 620
      expect(result).not.toBeNull();
      expect(result!.total_duration).toBe(620);
    });

    it('should handle tracks with null duration', async () => {
      const albumWithNullDurations = {
        ...mockAlbum,
        album_tracks: [
          {
            position: 1,
            track: {
              id: 'track-1',
              title: 'Track 1',
              duration: null,
            },
          },
          {
            position: 2,
            track: {
              id: 'track-2',
              title: 'Track 2',
              duration: 240,
            },
          },
        ],
      };

      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album fetch
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: albumWithNullDurations,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await fetchAlbumContext(mockAlbumId);

      // Total duration should be 0 + 240 = 240
      expect(result).not.toBeNull();
      expect(result!.total_duration).toBe(240);
    });

    it('should return null for total duration when all tracks have null duration', async () => {
      const albumWithAllNullDurations = {
        ...mockAlbum,
        album_tracks: [
          {
            position: 1,
            track: {
              id: 'track-1',
              title: 'Track 1',
              duration: null,
            },
          },
          {
            position: 2,
            track: {
              id: 'track-2',
              title: 'Track 2',
              duration: null,
            },
          },
        ],
      };

      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album fetch
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: albumWithAllNullDurations,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await fetchAlbumContext(mockAlbumId);

      // Total duration should be null when sum is 0
      expect(result).not.toBeNull();
      expect(result!.total_duration).toBeNull();
    });
  });

  describe('Track Sorting', () => {
    it('should sort tracks by position', async () => {
      const albumWithUnsortedTracks = {
        ...mockAlbum,
        album_tracks: [
          {
            position: 3,
            track: {
              id: 'track-3',
              title: 'Track 3',
              duration: 200,
            },
          },
          {
            position: 1,
            track: {
              id: 'track-1',
              title: 'Track 1',
              duration: 180,
            },
          },
          {
            position: 2,
            track: {
              id: 'track-2',
              title: 'Track 2',
              duration: 240,
            },
          },
        ],
      };

      // Mock current user (moderator)
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockModeratorId } },
        error: null,
      });

      // Mock moderator role check and album fetch
      const mockFrom = jest.fn();
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ role_type: 'moderator' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'albums') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: albumWithUnsortedTracks,
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom(table);
      });

      const result = await fetchAlbumContext(mockAlbumId);

      expect(result).not.toBeNull();
      expect(result!.tracks[0].position).toBe(1);
      expect(result!.tracks[0].title).toBe('Track 1');
      expect(result!.tracks[1].position).toBe(2);
      expect(result!.tracks[1].title).toBe('Track 2');
      expect(result!.tracks[2].position).toBe(3);
      expect(result!.tracks[2].title).toBe('Track 3');
    });
  });
});
