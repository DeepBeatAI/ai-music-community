/**
 * Integration Tests for Restriction Enforcement
 * 
 * Tests that restriction checks are properly enforced at API endpoints:
 * - Post creation (text and audio)
 * - Comment creation
 * - Track upload
 * - Suspension enforcement
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { supabase } from '@/lib/supabase';
import { createTextPost, createAudioPost } from '@/utils/posts';
import { uploadTrack } from '@/lib/tracks';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Restriction Enforcement Integration Tests', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTrackId = '223e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Post Creation Restrictions', () => {
    describe('Text Posts', () => {
      it('should allow non-restricted user to create text post', async () => {
        // Mock restriction check - user is allowed
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: true,
          error: null,
        });

        // Mock post creation
        const mockPost = {
          id: 'post-123',
          user_id: mockUserId,
          content: 'Test post',
          post_type: 'text',
          created_at: new Date().toISOString(),
        };

        (supabase.from as jest.Mock).mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockPost,
                error: null,
              }),
            }),
          }),
        });

        const result = await createTextPost(mockUserId, 'Test post');

        expect(supabase.rpc).toHaveBeenCalledWith('can_user_post', {
          p_user_id: mockUserId,
        });
        expect(result).toEqual(mockPost);
      });

      it('should block restricted user from creating text post', async () => {
        // Mock restriction check - user is restricted
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: false,
          error: null,
        });

        await expect(createTextPost(mockUserId, 'Test post')).rejects.toThrow(
          'You are currently restricted from creating posts'
        );

        expect(supabase.rpc).toHaveBeenCalledWith('can_user_post', {
          p_user_id: mockUserId,
        });
        expect(supabase.from).not.toHaveBeenCalled();
      });

      it('should handle restriction check error gracefully', async () => {
        // Mock restriction check error
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        });

        await expect(createTextPost(mockUserId, 'Test post')).rejects.toThrow(
          'Failed to verify posting permissions'
        );

        expect(supabase.from).not.toHaveBeenCalled();
      });
    });

    describe('Audio Posts', () => {
      it('should allow non-restricted user to create audio post', async () => {
        // Mock restriction check - user is allowed
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: true,
          error: null,
        });

        // Mock track verification
        const mockTrack = {
          id: mockTrackId,
          user_id: mockUserId,
          is_public: true,
        };

        // Mock post creation
        const mockPost = {
          id: 'post-123',
          user_id: mockUserId,
          content: 'Check out my track!',
          post_type: 'audio',
          track_id: mockTrackId,
          created_at: new Date().toISOString(),
        };

        (supabase.from as jest.Mock)
          .mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockTrack,
                  error: null,
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockPost,
                  error: null,
                }),
              }),
            }),
          });

        const result = await createAudioPost(mockUserId, mockTrackId, 'Check out my track!');

        expect(supabase.rpc).toHaveBeenCalledWith('can_user_post', {
          p_user_id: mockUserId,
        });
        expect(result).toEqual(mockPost);
      });

      it('should block restricted user from creating audio post', async () => {
        // Mock restriction check - user is restricted
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: false,
          error: null,
        });

        await expect(
          createAudioPost(mockUserId, mockTrackId, 'Check out my track!')
        ).rejects.toThrow('You are currently restricted from creating posts');

        expect(supabase.rpc).toHaveBeenCalledWith('can_user_post', {
          p_user_id: mockUserId,
        });
        // Should not check track or create post
        expect(supabase.from).not.toHaveBeenCalled();
      });
    });
  });

  describe('Track Upload Restrictions', () => {
    const mockFile = new File(['audio content'], 'test.mp3', {
      type: 'audio/mpeg',
    });

    const mockUploadData = {
      file: mockFile,
      title: 'Test Track',
      author: 'Test Artist',
      description: 'A test track',
      is_public: true,
    };

    it('should allow non-restricted user to upload track', async () => {
      // Mock restriction check - user is allowed
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: true,
        error: null,
      });

      // Mock storage upload
      const mockStorageFrom = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.mp3' },
        }),
      });

      (supabase.storage.from as jest.Mock) = mockStorageFrom;

      // Mock database insert
      const mockTrack = {
        id: mockTrackId,
        user_id: mockUserId,
        title: 'Test Track',
        author: 'Test Artist',
        file_url: 'https://example.com/test.mp3',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrack,
              error: null,
            }),
          }),
        }),
      });

      const result = await uploadTrack(mockUserId, mockUploadData);

      expect(supabase.rpc).toHaveBeenCalledWith('can_user_upload', {
        p_user_id: mockUserId,
      });
      expect(result.success).toBe(true);
      expect(result.track).toEqual(mockTrack);
    });

    it('should block restricted user from uploading track', async () => {
      // Mock restriction check - user is restricted
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const result = await uploadTrack(mockUserId, mockUploadData);

      expect(supabase.rpc).toHaveBeenCalledWith('can_user_upload', {
        p_user_id: mockUserId,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('restricted from uploading tracks');
      // Should not upload to storage or database
      expect(supabase.storage.from).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle restriction check error gracefully', async () => {
      // Mock restriction check error
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await uploadTrack(mockUserId, mockUploadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to verify upload permissions');
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });
  });

  describe('Suspension Enforcement', () => {
    it('should block suspended user from all actions', async () => {
      // Mock restriction checks - all return false for suspended user
      (supabase.rpc as jest.Mock)
        .mockResolvedValueOnce({ data: false, error: null }) // can_user_post
        .mockResolvedValueOnce({ data: false, error: null }) // can_user_upload
        .mockResolvedValueOnce({ data: false, error: null }); // can_user_post (audio)

      // Test post creation
      await expect(createTextPost(mockUserId, 'Test post')).rejects.toThrow(
        'restricted from creating posts'
      );

      // Test track upload
      const uploadResult = await uploadTrack(mockUserId, {
        file: new File(['audio'], 'test.mp3', { type: 'audio/mpeg' }),
        title: 'Test',
        author: 'Test Artist',
        is_public: true,
      });
      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('restricted from uploading');

      // Test audio post creation
      await expect(
        createAudioPost(mockUserId, mockTrackId, 'Test')
      ).rejects.toThrow('restricted from creating posts');

      // Verify all restriction checks were called
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
    });
  });

  describe('Non-Restricted User Actions', () => {
    it('should allow non-restricted user to perform all actions', async () => {
      // Mock all restriction checks to return true
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      // Mock successful operations
      const mockPost = {
        id: 'post-123',
        user_id: mockUserId,
        content: 'Test',
        post_type: 'text',
      };

      const mockTrack = {
        id: mockTrackId,
        user_id: mockUserId,
        title: 'Test Track',
        author: 'Test Artist',
      };

      // Mock post creation
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPost,
              error: null,
            }),
          }),
        }),
      });

      // Test post creation
      const postResult = await createTextPost(mockUserId, 'Test');
      expect(postResult).toEqual(mockPost);

      // Mock storage and database for track upload
      (supabase.storage.from as jest.Mock) = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.mp3' },
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrack,
              error: null,
            }),
          }),
        }),
      });

      // Test track upload
      const uploadResult = await uploadTrack(mockUserId, {
        file: new File(['audio'], 'test.mp3', { type: 'audio/mpeg' }),
        title: 'Test Track',
        author: 'Test Artist',
        is_public: true,
      });
      expect(uploadResult.success).toBe(true);

      // Verify restriction checks were called
      expect(supabase.rpc).toHaveBeenCalledWith('can_user_post', {
        p_user_id: mockUserId,
      });
      expect(supabase.rpc).toHaveBeenCalledWith('can_user_upload', {
        p_user_id: mockUserId,
      });
    });
  });
});
