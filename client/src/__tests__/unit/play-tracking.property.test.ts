/**
 * Property-Based Tests for Play Tracking Client Logic
 * 
 * Feature: discover-page-tabs-enhancement
 * 
 * This test suite validates the client-side play tracking logic:
 * - Property 7: 30-Second Minimum Playback
 * - Property 8: Debouncing Within 30 Seconds
 * - Property 9: Play Event Recording
 * 
 * Validates Requirements: 3.1, 3.4, 3.5, 4.1, 4.4, 4.5
 * 
 * These tests use fast-check for property-based testing to verify that
 * the recordAlbumPlay and recordPlaylistPlay functions correctly implement
 * debouncing and play event recording logic.
 */

import fc from 'fast-check';
import { albumPlayTracker, playlistPlayTracker, recordAlbumPlay, recordPlaylistPlay } from '@/lib/playTracking';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

describe('Feature: discover-page-tabs-enhancement - Play Tracking Client Logic', () => {

  beforeEach(() => {
    // Reset trackers before each test
    albumPlayTracker.reset();
    playlistPlayTracker.reset();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementation (success)
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });
  });

  afterEach(() => {
    // Additional cleanup after each test
    jest.clearAllMocks();
  });

  /**
   * Property 7: 30-Second Minimum Playback
   * 
   * For any track from a public album or playlist, the play count should only
   * increment if the track is played for at least 30 seconds by a non-owner user.
   * 
   * Note: The 30-second minimum is enforced by the PlayTracker class in playTracking.ts,
   * which checks playback duration before calling recordAlbumPlay/recordPlaylistPlay.
   * This test validates that the record functions are called correctly when the
   * 30-second threshold is met.
   * 
   * Validates: Requirements 3.1, 4.1
   */
  describe('Property 7: 30-Second Minimum Playback', () => {
    
    it('should call database function when recording album play (30+ seconds assumed)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            albumId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ albumId, userId }) => {
            // Test scenario: recordAlbumPlay is called (30+ seconds already validated by PlayTracker)
            // Expected: Database function should be called
            
            const result = await recordAlbumPlay(albumId, userId);
            
            // Should call the database function
            expect(supabase.rpc).toHaveBeenCalledWith('increment_album_play_count', {
              album_uuid: albumId,
              user_uuid: userId,
            });
            
            // Should return success
            expect(result.success).toBe(true);
            
            // Validates: Requirements 3.1
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call database function when recording playlist play (30+ seconds assumed)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlistId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ playlistId, userId }) => {
            // Test scenario: recordPlaylistPlay is called (30+ seconds already validated by PlayTracker)
            // Expected: Database function should be called
            
            const result = await recordPlaylistPlay(playlistId, userId);
            
            // Should call the database function
            expect(supabase.rpc).toHaveBeenCalledWith('increment_playlist_play_count', {
              playlist_uuid: playlistId,
              user_uuid: userId,
            });
            
            // Should return success
            expect(result.success).toBe(true);
            
            // Validates: Requirements 4.1
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Debouncing Within 30 Seconds
   * 
   * For any album or playlist, if a user plays multiple tracks from the same
   * content within 30 seconds, it should count as a single play.
   * 
   * This property tests that the debouncing logic prevents duplicate play
   * records within the 30-second window.
   * 
   * Validates: Requirements 3.5, 4.5
   */
  describe('Property 8: Debouncing Within 30 Seconds', () => {
    
    it('should debounce album plays within 30 seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            albumId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ albumId, userId }) => {
            // Reset mocks for this iteration
            jest.clearAllMocks();
            albumPlayTracker.reset();
            
            // Test scenario: Same album played twice within 30 seconds
            // Expected: Database function called only once (first call)
            
            // First play - should record
            const result1 = await recordAlbumPlay(albumId, userId);
            expect(result1.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledTimes(1);
            
            // Second play immediately after - should be debounced
            const result2 = await recordAlbumPlay(albumId, userId);
            expect(result2.success).toBe(true); // Still returns success
            expect(supabase.rpc).toHaveBeenCalledTimes(1); // But doesn't call DB again
            
            // Validates: Requirements 3.5
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should debounce playlist plays within 30 seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlistId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ playlistId, userId }) => {
            // Reset mocks for this iteration
            jest.clearAllMocks();
            playlistPlayTracker.reset();
            
            // Test scenario: Same playlist played twice within 30 seconds
            // Expected: Database function called only once (first call)
            
            // First play - should record
            const result1 = await recordPlaylistPlay(playlistId, userId);
            expect(result1.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledTimes(1);
            
            // Second play immediately after - should be debounced
            const result2 = await recordPlaylistPlay(playlistId, userId);
            expect(result2.success).toBe(true); // Still returns success
            expect(supabase.rpc).toHaveBeenCalledTimes(1); // But doesn't call DB again
            
            // Validates: Requirements 4.5
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow album plays from different users simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            albumId: fc.uuid(),
            user1Id: fc.uuid(),
            user2Id: fc.uuid(),
          }),
          async ({ albumId, user1Id, user2Id }) => {
            // Ensure different users
            fc.pre(user1Id !== user2Id);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            albumPlayTracker.reset();
            
            // Test scenario: Same album played by two different users
            // Expected: Both plays should be recorded (debouncing is per user)
            
            // User 1 plays
            const result1 = await recordAlbumPlay(albumId, user1Id);
            expect(result1.success).toBe(true);
            
            // User 2 plays (different user, same album)
            const result2 = await recordAlbumPlay(albumId, user2Id);
            expect(result2.success).toBe(true);
            
            // Both should call the database
            expect(supabase.rpc).toHaveBeenCalledTimes(2);
            
            // Validates: Requirements 3.5
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow playlist plays from different users simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlistId: fc.uuid(),
            user1Id: fc.uuid(),
            user2Id: fc.uuid(),
          }),
          async ({ playlistId, user1Id, user2Id }) => {
            // Ensure different users
            fc.pre(user1Id !== user2Id);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            playlistPlayTracker.reset();
            
            // Test scenario: Same playlist played by two different users
            // Expected: Both plays should be recorded (debouncing is per user)
            
            // User 1 plays
            const result1 = await recordPlaylistPlay(playlistId, user1Id);
            expect(result1.success).toBe(true);
            
            // User 2 plays (different user, same playlist)
            const result2 = await recordPlaylistPlay(playlistId, user2Id);
            expect(result2.success).toBe(true);
            
            // Both should call the database
            expect(supabase.rpc).toHaveBeenCalledTimes(2);
            
            // Validates: Requirements 4.5
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow same user to play different albums simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            album1Id: fc.uuid(),
            album2Id: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ album1Id, album2Id, userId }) => {
            // Ensure different albums
            fc.pre(album1Id !== album2Id);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            albumPlayTracker.reset();
            
            // Test scenario: Same user plays two different albums
            // Expected: Both plays should be recorded (debouncing is per album)
            
            // Play album 1
            const result1 = await recordAlbumPlay(album1Id, userId);
            expect(result1.success).toBe(true);
            
            // Play album 2 (same user, different album)
            const result2 = await recordAlbumPlay(album2Id, userId);
            expect(result2.success).toBe(true);
            
            // Both should call the database
            expect(supabase.rpc).toHaveBeenCalledTimes(2);
            
            // Validates: Requirements 3.5
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow same user to play different playlists simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlist1Id: fc.uuid(),
            playlist2Id: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ playlist1Id, playlist2Id, userId }) => {
            // Ensure different playlists
            fc.pre(playlist1Id !== playlist2Id);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            playlistPlayTracker.reset();
            
            // Test scenario: Same user plays two different playlists
            // Expected: Both plays should be recorded (debouncing is per playlist)
            
            // Play playlist 1
            const result1 = await recordPlaylistPlay(playlist1Id, userId);
            expect(result1.success).toBe(true);
            
            // Play playlist 2 (same user, different playlist)
            const result2 = await recordPlaylistPlay(playlist2Id, userId);
            expect(result2.success).toBe(true);
            
            // Both should call the database
            expect(supabase.rpc).toHaveBeenCalledTimes(2);
            
            // Validates: Requirements 4.5
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Play Event Recording
   * 
   * For any valid play (public content, non-owner, 30+ seconds), a play record
   * should be created with timestamp and user_id.
   * 
   * This property tests that the recordAlbumPlay and recordPlaylistPlay functions
   * correctly call the database functions with the right parameters.
   * 
   * Validates: Requirements 3.4, 4.4
   */
  describe('Property 9: Play Event Recording', () => {
    
    it('should record album play with correct parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            albumId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ albumId, userId }) => {
            // Test scenario: Valid album play
            // Expected: Database function called with correct parameters
            
            const result = await recordAlbumPlay(albumId, userId);
            
            // Should call database function with correct parameters
            expect(supabase.rpc).toHaveBeenCalledWith('increment_album_play_count', {
              album_uuid: albumId,
              user_uuid: userId,
            });
            
            // Should return success
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            
            // Validates: Requirements 3.4
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record playlist play with correct parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlistId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ playlistId, userId }) => {
            // Test scenario: Valid playlist play
            // Expected: Database function called with correct parameters
            
            const result = await recordPlaylistPlay(playlistId, userId);
            
            // Should call database function with correct parameters
            expect(supabase.rpc).toHaveBeenCalledWith('increment_playlist_play_count', {
              playlist_uuid: playlistId,
              user_uuid: userId,
            });
            
            // Should return success
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            
            // Validates: Requirements 4.4
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle database errors gracefully for album plays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            albumId: fc.uuid(),
            userId: fc.uuid(),
            errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async ({ albumId, userId, errorMessage }) => {
            // Mock database error
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              error: { message: errorMessage },
            });
            
            // Test scenario: Database error occurs
            // Expected: Function should handle gracefully and return error
            
            const result = await recordAlbumPlay(albumId, userId);
            
            // Should return failure with error message
            expect(result.success).toBe(false);
            expect(result.error).toBe(errorMessage);
            
            // Should still call the database function
            expect(supabase.rpc).toHaveBeenCalledWith('increment_album_play_count', {
              album_uuid: albumId,
              user_uuid: userId,
            });
            
            // Validates: Requirements 3.4 (error handling)
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle database errors gracefully for playlist plays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlistId: fc.uuid(),
            userId: fc.uuid(),
            errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async ({ playlistId, userId, errorMessage }) => {
            // Mock database error
            (supabase.rpc as jest.Mock).mockResolvedValueOnce({
              error: { message: errorMessage },
            });
            
            // Test scenario: Database error occurs
            // Expected: Function should handle gracefully and return error
            
            const result = await recordPlaylistPlay(playlistId, userId);
            
            // Should return failure with error message
            expect(result.success).toBe(false);
            expect(result.error).toBe(errorMessage);
            
            // Should still call the database function
            expect(supabase.rpc).toHaveBeenCalledWith('increment_playlist_play_count', {
              playlist_uuid: playlistId,
              user_uuid: userId,
            });
            
            // Validates: Requirements 4.4 (error handling)
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle exceptions gracefully for album plays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            albumId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ albumId, userId }) => {
            // Mock exception
            (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
            
            // Test scenario: Exception thrown during database call
            // Expected: Function should catch and handle gracefully
            
            const result = await recordAlbumPlay(albumId, userId);
            
            // Should return failure with error message
            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
            
            // Validates: Requirements 3.4 (error handling)
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle exceptions gracefully for playlist plays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlistId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async ({ playlistId, userId }) => {
            // Mock exception
            (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
            
            // Test scenario: Exception thrown during database call
            // Expected: Function should catch and handle gracefully
            
            const result = await recordPlaylistPlay(playlistId, userId);
            
            // Should return failure with error message
            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
            
            // Validates: Requirements 4.4 (error handling)
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Integration Tests: Combined Scenarios
   * 
   * These tests validate that the play tracking functions work correctly
   * in realistic scenarios with multiple plays and users.
   */
  describe('Integration: Combined Scenarios', () => {
    
    it('should handle multiple users playing the same album', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            albumId: fc.uuid(),
            userIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          }),
          async ({ albumId, userIds }) => {
            // Ensure all users are unique
            const uniqueUsers = [...new Set(userIds)];
            fc.pre(uniqueUsers.length === userIds.length);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            albumPlayTracker.reset();
            
            // Test scenario: Multiple users play the same album
            // Expected: Each user's play should be recorded
            
            for (const userId of userIds) {
              const result = await recordAlbumPlay(albumId, userId);
              expect(result.success).toBe(true);
            }
            
            // Should call database function for each user
            expect(supabase.rpc).toHaveBeenCalledTimes(userIds.length);
            
            // Validates: Requirements 3.4
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle multiple users playing the same playlist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            playlistId: fc.uuid(),
            userIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          }),
          async ({ playlistId, userIds }) => {
            // Ensure all users are unique
            const uniqueUsers = [...new Set(userIds)];
            fc.pre(uniqueUsers.length === userIds.length);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            playlistPlayTracker.reset();
            
            // Test scenario: Multiple users play the same playlist
            // Expected: Each user's play should be recorded
            
            for (const userId of userIds) {
              const result = await recordPlaylistPlay(playlistId, userId);
              expect(result.success).toBe(true);
            }
            
            // Should call database function for each user
            expect(supabase.rpc).toHaveBeenCalledTimes(userIds.length);
            
            // Validates: Requirements 4.4
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle one user playing multiple albums', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            albumIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          }),
          async ({ userId, albumIds }) => {
            // Ensure all albums are unique
            const uniqueAlbums = [...new Set(albumIds)];
            fc.pre(uniqueAlbums.length === albumIds.length);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            albumPlayTracker.reset();
            
            // Test scenario: One user plays multiple albums
            // Expected: Each album play should be recorded
            
            for (const albumId of albumIds) {
              const result = await recordAlbumPlay(albumId, userId);
              expect(result.success).toBe(true);
            }
            
            // Should call database function for each album
            expect(supabase.rpc).toHaveBeenCalledTimes(albumIds.length);
            
            // Validates: Requirements 3.4
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle one user playing multiple playlists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            playlistIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          }),
          async ({ userId, playlistIds }) => {
            // Ensure all playlists are unique
            const uniquePlaylists = [...new Set(playlistIds)];
            fc.pre(uniquePlaylists.length === playlistIds.length);
            
            // Reset mocks for this iteration
            jest.clearAllMocks();
            playlistPlayTracker.reset();
            
            // Test scenario: One user plays multiple playlists
            // Expected: Each playlist play should be recorded
            
            for (const playlistId of playlistIds) {
              const result = await recordPlaylistPlay(playlistId, userId);
              expect(result.success).toBe(true);
            }
            
            // Should call database function for each playlist
            expect(supabase.rpc).toHaveBeenCalledTimes(playlistIds.length);
            
            // Validates: Requirements 4.4
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
