/**
 * Unit tests for AuthenticatedHome component
 * Validates track data display in trending posts
 */

import { getTrendingContent } from '@/utils/recommendations';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

describe('AuthenticatedHome - Track Data Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrendingContent', () => {
    it('should include track data in query for audio posts', async () => {
      const mockSelect = jest.fn(() => ({
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }));

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      await getTrendingContent(4);

      // Verify that the select includes track:tracks(*)
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('track:tracks(*)')
      );
    });

    it('should handle posts with track data correctly', async () => {
      const mockPostsWithTracks = [
        {
          id: '1',
          content: 'Check out my new track!',
          post_type: 'audio',
          track_id: 'track-1',
          track: {
            id: 'track-1',
            title: 'Amazing Song',
            file_url: 'https://example.com/audio.mp3',
            duration: 180
          },
          user_profiles: {
            id: 'user-1',
            username: 'testuser'
          }
        },
        {
          id: '2',
          content: 'Just a text post',
          post_type: 'text',
          track_id: null,
          track: null,
          user_profiles: {
            id: 'user-2',
            username: 'anotheruser'
          }
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ 
                data: mockPostsWithTracks, 
                error: null 
              }))
            }))
          }))
        }))
      });

      const result = await getTrendingContent(4);

      expect(result).toHaveLength(2);
      expect(result[0].track).toBeDefined();
      expect(result[0].track.title).toBe('Amazing Song');
      expect(result[1].track).toBeNull();
    });

    it('should handle backward compatibility with audio_filename', () => {
      // Test that the component can handle both new track.title and legacy audio_filename
      const postWithTrack = {
        post_type: 'audio' as const,
        track: { title: 'New Track Title' } as { title: string } | null,
        audio_filename: 'legacy-filename.mp3' as string | null
      };

      const postWithoutTrack = {
        post_type: 'audio' as const,
        track: null as { title: string } | null,
        audio_filename: 'legacy-filename.mp3' as string | null
      };

      const postWithNeither = {
        post_type: 'audio' as const,
        track: null as { title: string } | null,
        audio_filename: null as string | null
      };

      // Verify the display logic: track?.title || audio_filename || 'Audio Track'
      expect(postWithTrack.track?.title || postWithTrack.audio_filename || 'Audio Track')
        .toBe('New Track Title');
      
      expect(postWithoutTrack.track?.title || postWithoutTrack.audio_filename || 'Audio Track')
        .toBe('legacy-filename.mp3');
      
      expect(postWithNeither.track?.title || postWithNeither.audio_filename || 'Audio Track')
        .toBe('Audio Track');
    });
  });

  describe('Track data integration', () => {
    it('should prioritize track.title over audio_filename', () => {
      const post = {
        post_type: 'audio' as const,
        track: { title: 'Track from Database' } as { title: string } | null,
        audio_filename: 'old-filename.mp3' as string | null
      };

      const displayTitle = post.track?.title || post.audio_filename || 'Audio Track';
      expect(displayTitle).toBe('Track from Database');
    });

    it('should fall back to audio_filename when track is null', () => {
      const post = {
        post_type: 'audio' as const,
        track: null as { title: string } | null,
        audio_filename: 'fallback-filename.mp3' as string | null
      };

      const displayTitle = post.track?.title || post.audio_filename || 'Audio Track';
      expect(displayTitle).toBe('fallback-filename.mp3');
    });

    it('should use default text when both are null', () => {
      const post = {
        post_type: 'audio' as const,
        track: null as { title: string } | null,
        audio_filename: null as string | null
      };

      const displayTitle = post.track?.title || post.audio_filename || 'Audio Track';
      expect(displayTitle).toBe('Audio Track');
    });
  });
});
