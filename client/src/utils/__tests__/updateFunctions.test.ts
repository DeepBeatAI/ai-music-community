/**
 * Update Functions Tests
 * 
 * Tests for updatePost() and updateComment() functions
 * Requirements: 7.1, 7.2, 7.3
 */

import { updatePost } from '../posts';
import { updateComment } from '../comments';
import { supabase } from '@/lib/supabase';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('updatePost', () => {
  const mockPostId = 'post-123';
  const mockUserId = 'user-456';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Validation', () => {
    it('should reject empty content for text posts', async () => {
      const result = await updatePost(mockPostId, '', mockUserId, 'text');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Content cannot be empty');
    });

    it('should reject whitespace-only content for text posts', async () => {
      const result = await updatePost(mockPostId, '   ', mockUserId, 'text');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Content cannot be empty');
    });

    it('should reject empty content when post type is not specified', async () => {
      const result = await updatePost(mockPostId, '', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Content cannot be empty');
    });

    it('should accept valid content', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await updatePost(mockPostId, 'Valid content', mockUserId);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should trim whitespace from content', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await updatePost(mockPostId, '  Content with spaces  ', mockUserId);
      
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'Content with spaces' });
    });
  });

  describe('Audio Post Caption Validation', () => {
    it('should allow empty caption for audio posts', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await updatePost(mockPostId, '', mockUserId, 'audio');
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledWith({ content: '' });
    });

    it('should allow whitespace-only caption for audio posts', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await updatePost(mockPostId, '   ', mockUserId, 'audio');
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      // Should still trim whitespace
      expect(mockUpdate).toHaveBeenCalledWith({ content: '' });
    });

    it('should accept valid caption for audio posts', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await updatePost(mockPostId, 'Audio caption', mockUserId, 'audio');
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'Audio caption' });
    });
  });

  describe('Database Operations', () => {
    it('should call Supabase with correct parameters', async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await updatePost(mockPostId, 'Test content', mockUserId);
      
      expect(supabase.from).toHaveBeenCalledWith('posts');
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'Test content' });
      expect(mockEq1).toHaveBeenCalledWith('id', mockPostId);
      expect(mockEq2).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: mockError }),
          }),
        }),
      });

      const result = await updatePost(mockPostId, 'Test content', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle authorization errors', async () => {
      const mockError = { message: 'Permission denied', code: 'PGRST301' };
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: mockError }),
          }),
        }),
      });

      const result = await updatePost(mockPostId, 'Test content', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to edit this content');
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new TypeError('fetch failed')),
          }),
        }),
      });

      const result = await updatePost(mockPostId, 'Test content', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save changes. Please check your connection.');
    });

    it('should handle unexpected errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Unexpected error')),
          }),
        }),
      });

      const result = await updatePost(mockPostId, 'Test content', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred. Please try again.');
    });
  });
});

describe('updateComment', () => {
  const mockCommentId = 'comment-123';
  const mockUserId = 'user-456';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Validation', () => {
    it('should reject empty content', async () => {
      const result = await updateComment(mockCommentId, '', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment cannot be empty');
    });

    it('should reject whitespace-only content', async () => {
      const result = await updateComment(mockCommentId, '   ', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment cannot be empty');
    });

    it('should enforce 1000 character limit', async () => {
      const longContent = 'a'.repeat(1001);
      const result = await updateComment(mockCommentId, longContent, mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment exceeds 1000 character limit');
    });

    it('should accept content at exactly 1000 characters', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const exactContent = 'a'.repeat(1000);
      const result = await updateComment(mockCommentId, exactContent, mockUserId);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid content', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await updateComment(mockCommentId, 'Valid comment', mockUserId);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should trim whitespace from content', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await updateComment(mockCommentId, '  Comment with spaces  ', mockUserId);
      
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'Comment with spaces' });
    });
  });

  describe('Database Operations', () => {
    it('should call Supabase with correct parameters', async () => {
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await updateComment(mockCommentId, 'Test comment', mockUserId);
      
      expect(supabase.from).toHaveBeenCalledWith('comments');
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'Test comment' });
      expect(mockEq1).toHaveBeenCalledWith('id', mockCommentId);
      expect(mockEq2).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should handle database errors', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: mockError }),
          }),
        }),
      });

      const result = await updateComment(mockCommentId, 'Test comment', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle authorization errors', async () => {
      const mockError = { message: 'Permission denied', code: 'PGRST301' };
      
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: mockError }),
          }),
        }),
      });

      const result = await updateComment(mockCommentId, 'Test comment', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not have permission to edit this content');
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new TypeError('fetch failed')),
          }),
        }),
      });

      const result = await updateComment(mockCommentId, 'Test comment', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save changes. Please check your connection.');
    });

    it('should handle unexpected errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Unexpected error')),
          }),
        }),
      });

      const result = await updateComment(mockCommentId, 'Test comment', mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Character Limit Edge Cases', () => {
    it('should accept content with 999 characters', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const content = 'a'.repeat(999);
      const result = await updateComment(mockCommentId, content, mockUserId);
      
      expect(result.success).toBe(true);
    });

    it('should reject content with 1001 characters', async () => {
      const content = 'a'.repeat(1001);
      const result = await updateComment(mockCommentId, content, mockUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment exceeds 1000 character limit');
    });

    it('should count characters before trimming for limit check', async () => {
      // Content is 1001 chars including spaces, but would be under 1000 after trim
      const content = ' ' + 'a'.repeat(999) + ' ';
      const result = await updateComment(mockCommentId, content, mockUserId);
      
      // Should fail because we check length before trimming
      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment exceeds 1000 character limit');
    });
  });
});
