/**
 * End-to-End Integration Tests for Tracks vs Posts Separation
 * 
 * These tests validate the complete workflow of the tracks-posts separation feature:
 * - Upload track → create post flow
 * - Track reuse across multiple posts
 * - Playlist with tracks from different sources
 * - Error scenarios and recovery
 * 
 * Requirements: 9.4
 * 
 * @group integration
 */

import { uploadTrack, getTrack, getUserTracks, deleteTrack } from '@/lib/tracks';
import { createAudioPost, fetchPosts } from '@/utils/posts';
import { addTrackToPlaylist, getPlaylistWithTracks } from '@/lib/playlists';
import { supabase } from '@/lib/supabase';

// Mock user ID for testing
const TEST_USER_ID = 'test-user-123';
const TEST_PLAYLIST_ID = 'test-playlist-123';

// Helper function to create a mock audio file
function createMockAudioFile(
  name: string = 'test-audio.mp3',
  size: number = 1024 * 1024 // 1MB
): File {
  const blob = new Blob(['mock audio data'.repeat(size / 16)], { type: 'audio/mpeg' });
  return new File([blob], name, { type: 'audio/mpeg' });
}

// Helper function to clean up test data
async function cleanupTestData(trackIds: string[], postIds: string[]) {
  // Delete posts
  if (postIds.length > 0) {
    await supabase.from('posts').delete().in('id', postIds);
  }
  
  // Delete tracks
  if (trackIds.length > 0) {
    await supabase.from('tracks').delete().in('id', trackIds);
  }
}

describe('Tracks vs Posts Separation - End-to-End Integration', () => {
  const createdTrackIds: string[] = [];
  const createdPostIds: string[] = [];

  afterAll(async () => {
    // Clean up all test data
    await cleanupTestData(createdTrackIds, createdPostIds);
  });

  describe('Complete Upload → Track → Post Flow', () => {
    it('should complete full workflow: upload → track → post', async () => {
      // 1. Upload audio file and create track
      const mockFile = createMockAudioFile('integration-test.mp3');
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: mockFile,
        title: 'Integration Test Track',
        author: 'Test Artist',
        description: 'Test track for integration testing',
        is_public: true,
      });

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.track).toBeDefined();
      expect(uploadResult.track?.title).toBe('Integration Test Track');
      expect(uploadResult.track?.user_id).toBe(TEST_USER_ID);

      const trackId = uploadResult.track!.id;
      createdTrackIds.push(trackId);

      // 2. Verify track can be retrieved
      const retrievedTrack = await getTrack(trackId);
      expect(retrievedTrack).toBeDefined();
      expect(retrievedTrack?.id).toBe(trackId);
      expect(retrievedTrack?.title).toBe('Integration Test Track');

      // 3. Create post with track
      const post = await createAudioPost(
        TEST_USER_ID,
        trackId,
        'Check out my new track! 🎵'
      );

      expect(post).toBeDefined();
      expect(post.post_type).toBe('audio');
      expect(post.track_id).toBe(trackId);
      expect(post.content).toBe('Check out my new track! 🎵');
      expect(post.track).toBeDefined();
      expect(post.track?.id).toBe(trackId);

      createdPostIds.push(post.id);

      // 4. Verify post appears in feed with track data
      const { posts } = await fetchPosts(1, 15, TEST_USER_ID);
      const createdPost = posts.find(p => p.id === post.id);

      expect(createdPost).toBeDefined();
      expect(createdPost?.track_id).toBe(trackId);
      expect(createdPost?.track).toBeDefined();
      expect(createdPost?.track?.title).toBe('Integration Test Track');

      // 5. Verify track appears in user's tracks
      const userTracks = await getUserTracks(TEST_USER_ID, true);
      const userTrack = userTracks.find(t => t.id === trackId);

      expect(userTrack).toBeDefined();
      expect(userTrack?.title).toBe('Integration Test Track');
    }, 30000); // 30 second timeout for upload operations

    it('should handle compression metadata correctly', async () => {
      const mockFile = createMockAudioFile('compression-test.mp3', 5 * 1024 * 1024); // 5MB
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: mockFile,
        title: 'Compression Test Track',
        author: 'Test Artist',
        is_public: true,
      });

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.track).toBeDefined();

      const trackId = uploadResult.track!.id;
      createdTrackIds.push(trackId);

      // Verify compression metadata is stored
      const track = await getTrack(trackId);
      expect(track).toBeDefined();
      expect(track?.original_file_size).toBeDefined();
      expect(track?.compression_applied).toBeDefined();

      // If compression was applied, verify ratio
      if (track?.compression_applied) {
        expect(track.compression_ratio).toBeGreaterThan(0);
        expect(track.file_size).toBeLessThan(track.original_file_size!);
      }
    }, 30000);
  });

  describe('Track Reuse Across Multiple Posts', () => {
    it('should allow same track in multiple posts', async () => {
      // 1. Create a track
      const mockFile = createMockAudioFile('reusable-track.mp3');
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: mockFile,
        title: 'Reusable Track',
        author: 'Test Artist',
        description: 'This track will be used in multiple posts',
        is_public: true,
      });

      expect(uploadResult.success).toBe(true);
      const trackId = uploadResult.track!.id;
      createdTrackIds.push(trackId);

      // 2. Create first post with track
      const post1 = await createAudioPost(
        TEST_USER_ID,
        trackId,
        'First post with this track'
      );
      expect(post1.track_id).toBe(trackId);
      createdPostIds.push(post1.id);

      // 3. Create second post with same track
      const post2 = await createAudioPost(
        TEST_USER_ID,
        trackId,
        'Second post with the same track'
      );
      expect(post2.track_id).toBe(trackId);
      createdPostIds.push(post2.id);

      // 4. Create third post with same track
      const post3 = await createAudioPost(
        TEST_USER_ID,
        trackId,
        'Third post - still the same track!'
      );
      expect(post3.track_id).toBe(trackId);
      createdPostIds.push(post3.id);

      // 5. Verify all posts reference the same track
      const { posts } = await fetchPosts(1, 15, TEST_USER_ID);
      const userPosts = posts.filter(p => 
        p.track_id === trackId && p.user_id === TEST_USER_ID
      );

      expect(userPosts.length).toBeGreaterThanOrEqual(3);
      userPosts.forEach(post => {
        expect(post.track_id).toBe(trackId);
        expect(post.track?.title).toBe('Reusable Track');
      });

      // 6. Verify track is only stored once
      const track = await getTrack(trackId);
      expect(track).toBeDefined();
      expect(track?.id).toBe(trackId);
    }, 30000);

    it('should maintain track data when post is deleted', async () => {
      // 1. Create track and post
      const mockFile = createMockAudioFile('persistent-track.mp3');
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: mockFile,
        title: 'Persistent Track',
        author: 'Test Artist',
        is_public: true,
      });

      const trackId = uploadResult.track!.id;
      createdTrackIds.push(trackId);

      const post = await createAudioPost(TEST_USER_ID, trackId, 'Temporary post');
      const postId = post.id;

      // 2. Delete the post
      await supabase.from('posts').delete().eq('id', postId);

      // 3. Verify track still exists
      const track = await getTrack(trackId);
      expect(track).toBeDefined();
      expect(track?.id).toBe(trackId);
      expect(track?.title).toBe('Persistent Track');
    }, 30000);
  });

  describe('Playlist with Tracks from Different Sources', () => {
    it('should add tracks to playlist from different sources', async () => {
      // 1. Create multiple tracks
      const track1Result = await uploadTrack(TEST_USER_ID, {
        file: createMockAudioFile('playlist-track-1.mp3'),
        title: 'Playlist Track 1',
        author: 'Test Artist',
        is_public: true,
      });
      const track1Id = track1Result.track!.id;
      createdTrackIds.push(track1Id);

      const track2Result = await uploadTrack(TEST_USER_ID, {
        file: createMockAudioFile('playlist-track-2.mp3'),
        title: 'Playlist Track 2',
        author: 'Test Artist',
        is_public: true,
      });
      const track2Id = track2Result.track!.id;
      createdTrackIds.push(track2Id);

      // 2. Create post with first track
      const post = await createAudioPost(TEST_USER_ID, track1Id, 'Post with track 1');
      createdPostIds.push(post.id);

      // 3. Add first track to playlist (from post)
      const addResult1 = await addTrackToPlaylist({
        playlist_id: TEST_PLAYLIST_ID,
        track_id: track1Id,
      });
      expect(addResult1.success).toBe(true);

      // 4. Add second track to playlist (directly from library)
      const addResult2 = await addTrackToPlaylist({
        playlist_id: TEST_PLAYLIST_ID,
        track_id: track2Id,
      });
      expect(addResult2.success).toBe(true);

      // 5. Verify playlist contains both tracks
      const playlist = await getPlaylistWithTracks(TEST_PLAYLIST_ID);
      expect(playlist).toBeDefined();
      
      const playlistTrackIds = playlist?.tracks.map(t => t.track_id) || [];
      expect(playlistTrackIds).toContain(track1Id);
      expect(playlistTrackIds).toContain(track2Id);

      // 6. Verify track details are correct
      const track1InPlaylist = playlist?.tracks.find(t => t.track_id === track1Id);
      expect(track1InPlaylist?.track.title).toBe('Playlist Track 1');

      const track2InPlaylist = playlist?.tracks.find(t => t.track_id === track2Id);
      expect(track2InPlaylist?.track.title).toBe('Playlist Track 2');
    }, 30000);

    it('should prevent duplicate tracks in playlist', async () => {
      // 1. Create track
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: createMockAudioFile('duplicate-test.mp3'),
        title: 'Duplicate Test Track',
        author: 'Test Artist',
        is_public: true,
      });
      const trackId = uploadResult.track!.id;
      createdTrackIds.push(trackId);

      // 2. Add track to playlist
      const addResult1 = await addTrackToPlaylist({
        playlist_id: TEST_PLAYLIST_ID,
        track_id: trackId,
      });
      expect(addResult1.success).toBe(true);

      // 3. Try to add same track again
      const addResult2 = await addTrackToPlaylist({
        playlist_id: TEST_PLAYLIST_ID,
        track_id: trackId,
      });
      expect(addResult2.success).toBe(false);
      expect(addResult2.error).toContain('already in playlist');
    }, 30000);
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle invalid track ID when creating post', async () => {
      const invalidTrackId = '00000000-0000-0000-0000-000000000000';

      await expect(
        createAudioPost(TEST_USER_ID, invalidTrackId, 'Invalid track post')
      ).rejects.toThrow();
    });

    it('should handle file size validation', async () => {
      const largeFile = createMockAudioFile('too-large.mp3', 60 * 1024 * 1024); // 60MB
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: largeFile,
        title: 'Too Large Track',
        author: 'Test Artist',
        is_public: true,
      });

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.errorCode).toBe('FILE_TOO_LARGE');
      expect(uploadResult.error).toContain('50MB');
    });

    it('should handle invalid file format', async () => {
      const invalidFile = new File(['not audio'], 'test.txt', { type: 'text/plain' });
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: invalidFile,
        title: 'Invalid Format Track',
        author: 'Test Artist',
        is_public: true,
      });

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.errorCode).toBe('INVALID_FORMAT');
      expect(uploadResult.error).toContain('format');
    });

    it('should handle missing track title', async () => {
      const mockFile = createMockAudioFile('no-title.mp3');
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: mockFile,
        title: '', // Empty title
        author: 'Test Artist',
        is_public: true,
      });

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle track deletion with cascading effects', async () => {
      // 1. Create track
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: createMockAudioFile('delete-test.mp3'),
        title: 'Track to Delete',
        author: 'Test Artist',
        is_public: true,
      });
      const trackId = uploadResult.track!.id;

      // 2. Create post with track
      const post = await createAudioPost(TEST_USER_ID, trackId, 'Post with track');
      const postId = post.id;

      // 3. Add track to playlist
      await addTrackToPlaylist({
        playlist_id: TEST_PLAYLIST_ID,
        track_id: trackId,
      });

      // 4. Delete track
      const deleteResult = await deleteTrack(trackId);
      expect(deleteResult).toBe(true);

      // 5. Verify track is deleted
      const deletedTrack = await getTrack(trackId);
      expect(deletedTrack).toBeNull();

      // 6. Verify post still exists but track_id is NULL
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      expect(postData).toBeDefined();
      expect(postData?.track_id).toBeNull();

      // 7. Verify track removed from playlist (CASCADE)
      const playlist = await getPlaylistWithTracks(TEST_PLAYLIST_ID);
      const trackInPlaylist = playlist?.tracks.find(t => t.track_id === trackId);
      expect(trackInPlaylist).toBeUndefined();

      // Clean up post
      await supabase.from('posts').delete().eq('id', postId);
    }, 30000);
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce audio posts must have track_id', async () => {
      // Try to create audio post without track_id (should fail)
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: TEST_USER_ID,
          content: 'Audio post without track',
          post_type: 'audio',
          track_id: null, // This should violate constraint
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('audio_posts_must_have_track');
    });

    it('should enforce text posts cannot have track_id', async () => {
      // Create a track first
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: createMockAudioFile('constraint-test.mp3'),
        title: 'Constraint Test Track',
        author: 'Test Artist',
        is_public: true,
      });
      const trackId = uploadResult.track!.id;
      createdTrackIds.push(trackId);

      // Try to create text post with track_id (should fail)
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: TEST_USER_ID,
          content: 'Text post with track',
          post_type: 'text',
          track_id: trackId, // This should violate constraint
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('audio_posts_must_have_track');
    });

    it('should validate track title constraints', async () => {
      // Try to create track with empty title (should fail at validation)
      const mockFile = createMockAudioFile('empty-title.mp3');
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: mockFile,
        title: '   ', // Whitespace only
        author: 'Test Artist',
        is_public: true,
      });

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should validate track title length', async () => {
      // Try to create track with title > 255 characters
      const longTitle = 'A'.repeat(300);
      const mockFile = createMockAudioFile('long-title.mp3');
      const uploadResult = await uploadTrack(TEST_USER_ID, {
        file: mockFile,
        title: longTitle,
        author: 'Test Artist',
        is_public: true,
      });

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance and Optimization', () => {
    it('should efficiently fetch posts with track data', async () => {
      const startTime = Date.now();
      
      const { posts } = await fetchPosts(1, 15);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);

      // Verify track data is included for audio posts
      const audioPosts = posts.filter(p => p.post_type === 'audio');
      audioPosts.forEach(post => {
        if (post.track_id) {
          expect(post.track).toBeDefined();
        }
      });
    });

    it('should efficiently fetch user tracks', async () => {
      const startTime = Date.now();
      
      const tracks = await getUserTracks(TEST_USER_ID, true);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);

      // Verify tracks are ordered by created_at DESC
      if (tracks.length > 1) {
        for (let i = 0; i < tracks.length - 1; i++) {
          const current = new Date(tracks[i].created_at).getTime();
          const next = new Date(tracks[i + 1].created_at).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });
});
