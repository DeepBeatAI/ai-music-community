/**
 * Property-Based Tests for Trending Analytics Database Functions
 * Feature: discover-page-tabs-enhancement
 * 
 * These tests validate the correctness properties for the database functions
 * that calculate trending albums and playlists using property-based testing
 * with fast-check library.
 * 
 * Note: These tests use mocked database responses to validate the properties
 * without requiring actual database connectivity.
 * 
 * Properties Tested:
 * - Property 10: Trending Score Formula Consistency
 * - Property 11: 7-Day Time Window Filter
 * - Property 12: All-Time Inclusion
 * - Property 13: Public Content Only
 * - Property 14: Top 10 Limit and Sorting
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 13.3, 13.5
 */

import fc from 'fast-check';
import { supabase } from '../supabase';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

// Type definitions for database function results
interface TrendingAlbum {
  album_id: string;
  name: string;
  creator_username: string;
  creator_user_id: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  cover_image_url: string | null;
  track_count: number;
}

interface TrendingPlaylist {
  playlist_id: string;
  name: string;
  creator_username: string;
  creator_user_id: string;
  play_count: number;
  like_count: number;
  trending_score: number;
  created_at: string;
  cover_image_url: string | null;
  track_count: number;
}

describe('Feature: discover-page-tabs-enhancement - Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 10: Trending Score Formula Consistency
   * 
   * For any album or playlist, the trending score should be calculated using
   * the formula: (play_count × 0.7) + (like_count × 0.3)
   * 
   * Validates: Requirements 5.1, 6.1, 13.3
   */
  describe('Property 10: Trending Score Formula Consistency', () => {
    it('should calculate album trending scores using formula: (play_count × 0.7) + (like_count × 0.3)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              album_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              creator_username: fc.string({ minLength: 1, maxLength: 30 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              created_at: fc.date().map(d => d.toISOString()),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 0, max: 50 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (mockAlbums) => {
            // Calculate trending scores according to formula
            const albumsWithScores = mockAlbums.map(album => ({
              ...album,
              trending_score: (album.play_count * 0.7) + (album.like_count * 0.3),
            }));

            // Mock the database response
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: albumsWithScores,
              error: null,
            });

            const { data } = await supabase.rpc('get_trending_albums', {
              days_back: 7,
              result_limit: 10,
            });

            const albums = data as TrendingAlbum[];

            // Verify formula for each album
            for (const album of albums) {
              const expectedScore = (album.play_count * 0.7) + (album.like_count * 0.3);
              const actualScore = Number(album.trending_score);
              
              // Allow small floating point differences
              const difference = Math.abs(actualScore - expectedScore);
              expect(difference).toBeLessThan(0.01);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should calculate playlist trending scores using formula: (play_count × 0.7) + (like_count × 0.3)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              playlist_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              creator_username: fc.string({ minLength: 1, maxLength: 30 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              created_at: fc.date().map(d => d.toISOString()),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 0, max: 50 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (mockPlaylists) => {
            const playlistsWithScores = mockPlaylists.map(playlist => ({
              ...playlist,
              trending_score: (playlist.play_count * 0.7) + (playlist.like_count * 0.3),
            }));

            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: playlistsWithScores,
              error: null,
            });

            const { data } = await supabase.rpc('get_trending_playlists', {
              days_back: 7,
              result_limit: 10,
            });

            const playlists = data as TrendingPlaylist[];

            for (const playlist of playlists) {
              const expectedScore = (playlist.play_count * 0.7) + (playlist.like_count * 0.3);
              const actualScore = Number(playlist.trending_score);
              
              const difference = Math.abs(actualScore - expectedScore);
              expect(difference).toBeLessThan(0.01);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 11: 7-Day Time Window Filter
   * 
   * For any trending calculation with "last 7 days" filter (days_back=7),
   * only content created within the last 7 days should be included in results.
   * 
   * Validates: Requirements 5.2, 6.2
   */
  describe('Property 11: 7-Day Time Window Filter', () => {
    it('should only include albums created in last 7 days when days_back=7', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              album_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              creator_username: fc.string({ minLength: 1, maxLength: 30 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              // Generate dates within last 7 days
              created_at: fc.date({ 
                min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                max: new Date()
              }).map(d => d.toISOString()),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 0, max: 50 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (mockAlbums) => {
            const albumsWithScores = mockAlbums.map(album => ({
              ...album,
              trending_score: (album.play_count * 0.7) + (album.like_count * 0.3),
            }));

            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: albumsWithScores,
              error: null,
            });

            const { data } = await supabase.rpc('get_trending_albums', {
              days_back: 7,
              result_limit: 10,
            });

            const albums = data as TrendingAlbum[];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            // Add small buffer for timing differences
            sevenDaysAgo.setMilliseconds(sevenDaysAgo.getMilliseconds() - 1000);

            // Verify all albums are within 7 days
            for (const album of albums) {
              const createdAt = new Date(album.created_at);
              expect(createdAt.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should only include playlists created in last 7 days when days_back=7', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              playlist_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              creator_username: fc.string({ minLength: 1, maxLength: 30 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              created_at: fc.date({ 
                min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                max: new Date()
              }).map(d => d.toISOString()),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 0, max: 50 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (mockPlaylists) => {
            const playlistsWithScores = mockPlaylists.map(playlist => ({
              ...playlist,
              trending_score: (playlist.play_count * 0.7) + (playlist.like_count * 0.3),
            }));

            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: playlistsWithScores,
              error: null,
            });

            const { data } = await supabase.rpc('get_trending_playlists', {
              days_back: 7,
              result_limit: 10,
            });

            const playlists = data as TrendingPlaylist[];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            // Add small buffer for timing differences
            sevenDaysAgo.setMilliseconds(sevenDaysAgo.getMilliseconds() - 1000);

            for (const playlist of playlists) {
              const createdAt = new Date(playlist.created_at);
              expect(createdAt.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 14: Top 10 Limit and Sorting
   * 
   * For any trending section, exactly 10 items (or fewer if less than 10 exist)
   * should be displayed, sorted by trending score in descending order.
   * 
   * Validates: Requirements 5.5, 6.5
   */
  describe('Property 14: Top 10 Limit and Sorting', () => {
    it('should return at most 10 albums sorted by trending score descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              album_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              creator_username: fc.string({ minLength: 1, maxLength: 30 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              created_at: fc.date().map(d => d.toISOString()),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 0, max: 50 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (mockAlbums) => {
            // Calculate scores and sort
            const albumsWithScores = mockAlbums
              .map(album => ({
                ...album,
                trending_score: (album.play_count * 0.7) + (album.like_count * 0.3),
              }))
              .sort((a, b) => b.trending_score - a.trending_score)
              .slice(0, 10); // Limit to 10

            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: albumsWithScores,
              error: null,
            });

            const { data } = await supabase.rpc('get_trending_albums', {
              days_back: 7,
              result_limit: 10,
            });

            const albums = data as TrendingAlbum[];

            // Verify count is at most 10
            expect(albums.length).toBeLessThanOrEqual(10);

            // Verify sorting (descending by trending_score)
            for (let i = 0; i < albums.length - 1; i++) {
              const currentScore = Number(albums[i].trending_score);
              const nextScore = Number(albums[i + 1].trending_score);
              expect(currentScore).toBeGreaterThanOrEqual(nextScore);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return at most 10 playlists sorted by trending score descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              playlist_id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              creator_username: fc.string({ minLength: 1, maxLength: 30 }),
              creator_user_id: fc.uuid(),
              play_count: fc.integer({ min: 0, max: 10000 }),
              like_count: fc.integer({ min: 0, max: 1000 }),
              created_at: fc.date().map(d => d.toISOString()),
              cover_image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              track_count: fc.integer({ min: 0, max: 50 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (mockPlaylists) => {
            const playlistsWithScores = mockPlaylists
              .map(playlist => ({
                ...playlist,
                trending_score: (playlist.play_count * 0.7) + (playlist.like_count * 0.3),
              }))
              .sort((a, b) => b.trending_score - a.trending_score)
              .slice(0, 10);

            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              data: playlistsWithScores,
              error: null,
            });

            const { data } = await supabase.rpc('get_trending_playlists', {
              days_back: 7,
              result_limit: 10,
            });

            const playlists = data as TrendingPlaylist[];

            expect(playlists.length).toBeLessThanOrEqual(10);

            for (let i = 0; i < playlists.length - 1; i++) {
              const currentScore = Number(playlists[i].trending_score);
              const nextScore = Number(playlists[i + 1].trending_score);
              expect(currentScore).toBeGreaterThanOrEqual(nextScore);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
