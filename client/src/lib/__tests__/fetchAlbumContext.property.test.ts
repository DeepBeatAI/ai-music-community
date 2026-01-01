/**
 * Property-based tests for fetchAlbumContext function
 * Feature: album-flagging-system, Property 5: Album Context Completeness
 * 
 * Property 5: Album Context Completeness
 * For any album report displayed in the moderation queue, the album context should 
 * include all tracks contained in the album with correct track count and total 
 * duration calculations.
 * 
 * Validates: Requirements 3.2, 3.4, 3.5
 */

import fc from 'fast-check';
import { fetchAlbumContext } from '../moderationService';
import { supabase } from '../supabase';
import { ModerationError } from '@/types/moderation';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('Property 5: Album Context Completeness', () => {
  const mockModeratorId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock current user (moderator)
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: mockModeratorId } },
      error: null,
    });
  });

  /**
   * Property Test: Album context includes all tracks with correct count
   * 
   * For any album with N tracks, fetchAlbumContext should return:
   * - All N tracks in the tracks array
   * - track_count equal to N
   * - Tracks sorted by position
   */
  it('should include all tracks with correct track count for any album', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate album ID
        fc.uuid(),
        // Generate album name
        fc.string({ minLength: 1, maxLength: 100 }),
        // Generate array of tracks (0 to 20 tracks)
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            duration: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: null }),
            position: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (albumId, albumName, tracks) => {
          // Create mock album with tracks
          const mockAlbum = {
            id: albumId,
            name: albumName,
            description: 'Test description',
            cover_image_url: null,
            user_id: fc.sample(fc.uuid(), 1)[0],
            is_public: true,
            created_at: new Date().toISOString(),
            album_tracks: tracks.map((track) => ({
              position: track.position,
              track: {
                id: track.id,
                title: track.title,
                duration: track.duration,
              },
            })),
          };

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

          const result = await fetchAlbumContext(albumId);

          // Property: track_count should equal the number of tracks
          expect(result.track_count).toBe(tracks.length);

          // Property: tracks array should contain all tracks
          expect(result.tracks).toHaveLength(tracks.length);

          // Property: all track IDs should be present
          const resultTrackIds = result.tracks.map((t) => t.id);
          const expectedTrackIds = tracks.map((t) => t.id);
          expect(resultTrackIds.sort()).toEqual(expectedTrackIds.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Total duration calculation is correct
   * 
   * For any album with tracks, the total_duration should equal the sum of all
   * track durations (treating null as 0), or null if the sum is 0.
   */
  it('should calculate total duration correctly for any album', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate album ID
        fc.uuid(),
        // Generate album name
        fc.string({ minLength: 1, maxLength: 100 }),
        // Generate array of tracks with various duration values
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            duration: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: null }),
            position: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (albumId, albumName, tracks) => {
          // Create mock album with tracks
          const mockAlbum = {
            id: albumId,
            name: albumName,
            description: 'Test description',
            cover_image_url: null,
            user_id: fc.sample(fc.uuid(), 1)[0],
            is_public: true,
            created_at: new Date().toISOString(),
            album_tracks: tracks.map((track) => ({
              position: track.position,
              track: {
                id: track.id,
                title: track.title,
                duration: track.duration,
              },
            })),
          };

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

          const result = await fetchAlbumContext(albumId);

          // Calculate expected total duration
          const expectedTotalDuration = tracks.reduce(
            (sum, track) => sum + (track.duration || 0),
            0
          );

          // Property: total_duration should equal sum of all durations (or null if 0)
          if (expectedTotalDuration > 0) {
            expect(result.total_duration).toBe(expectedTotalDuration);
          } else {
            expect(result.total_duration).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Tracks are sorted by position
   * 
   * For any album with tracks, the tracks array should be sorted by position
   * in ascending order.
   */
  it('should sort tracks by position for any album', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate album ID
        fc.uuid(),
        // Generate album name
        fc.string({ minLength: 1, maxLength: 100 }),
        // Generate array of tracks with random positions
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            duration: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: null }),
            position: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (albumId, albumName, tracks) => {
          // Create mock album with tracks
          const mockAlbum = {
            id: albumId,
            name: albumName,
            description: 'Test description',
            cover_image_url: null,
            user_id: fc.sample(fc.uuid(), 1)[0],
            is_public: true,
            created_at: new Date().toISOString(),
            album_tracks: tracks.map((track) => ({
              position: track.position,
              track: {
                id: track.id,
                title: track.title,
                duration: track.duration,
              },
            })),
          };

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

          const result = await fetchAlbumContext(albumId);

          // Property: tracks should be sorted by position in ascending order
          for (let i = 1; i < result.tracks.length; i++) {
            expect(result.tracks[i].position).toBeGreaterThanOrEqual(
              result.tracks[i - 1].position
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Album context includes all required fields
   * 
   * For any album, the returned context should include all required fields
   * from the AlbumContext interface.
   */
  it('should include all required fields for any album', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate album data
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          cover_image_url: fc.option(fc.webUrl(), { nil: null }),
          user_id: fc.uuid(),
          is_public: fc.boolean(),
          tracks: fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              duration: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: null }),
              position: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
        }),
        async (albumData) => {
          // Create mock album with tracks
          const mockAlbum = {
            id: albumData.id,
            name: albumData.name,
            description: albumData.description,
            cover_image_url: albumData.cover_image_url,
            user_id: albumData.user_id,
            is_public: albumData.is_public,
            created_at: new Date().toISOString(),
            album_tracks: albumData.tracks.map((track) => ({
              position: track.position,
              track: {
                id: track.id,
                title: track.title,
                duration: track.duration,
              },
            })),
          };

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

          const result = await fetchAlbumContext(albumData.id);

          // Property: all required fields should be present
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('description');
          expect(result).toHaveProperty('cover_image_url');
          expect(result).toHaveProperty('user_id');
          expect(result).toHaveProperty('is_public');
          expect(result).toHaveProperty('created_at');
          expect(result).toHaveProperty('tracks');
          expect(result).toHaveProperty('track_count');
          expect(result).toHaveProperty('total_duration');

          // Property: field values should match input
          expect(result.id).toBe(albumData.id);
          expect(result.name).toBe(albumData.name);
          expect(result.description).toBe(albumData.description);
          expect(result.cover_image_url).toBe(albumData.cover_image_url);
          expect(result.user_id).toBe(albumData.user_id);
          expect(result.is_public).toBe(albumData.is_public);
        }
      ),
      { numRuns: 100 }
    );
  });
});
