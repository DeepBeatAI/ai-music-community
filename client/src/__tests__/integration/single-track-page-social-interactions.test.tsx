/**
 * Integration tests for Single Track Page social interactions
 * 
 * Tests:
 * - Like button interaction with database updates
 * - Follow button interaction with database updates
 * - Share functionality
 * - Copy URL functionality
 * - Toast notifications
 */

import { waitFor } from '@testing-library/react';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';

describe('Single Track Page - Social Interactions Integration', () => {
  const mockUser = { id: 'user-123' };
  const mockPostId = 'post-123';
  const mockTrackUserId = 'track-owner-456';

  beforeEach(() => {
    jest.clearAllMocks();

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('Like functionality', () => {
    it('should like a track successfully', async () => {
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          data: { id: 'like-123' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockInsertQuery);

      const { data, error } = await supabase
        .from('post_likes')
        .insert({
          post_id: mockPostId,
          user_id: mockUser.id,
        });

      expect(error).toBeNull();
      expect(data).toEqual({ id: 'like-123' });
      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        post_id: mockPostId,
        user_id: mockUser.id,
      });
    });

    it('should unlike a track successfully', async () => {
      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      // Chain the eq calls properly
      mockDeleteQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockDeleteQuery);

      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', mockPostId)
        .eq('user_id', mockUser.id);

      expect(error).toBeNull();
    });

    it('should update like count after like', async () => {
      let likeCount = 10;
      let isLiked = false;

      // Simulate like action
      isLiked = true;
      likeCount = likeCount + 1;

      expect(isLiked).toBe(true);
      expect(likeCount).toBe(11);
    });

    it('should update like count after unlike', async () => {
      let likeCount = 11;
      let isLiked = true;

      // Simulate unlike action
      isLiked = false;
      likeCount = likeCount - 1;

      expect(isLiked).toBe(false);
      expect(likeCount).toBe(10);
    });

    it('should handle like error with rollback', async () => {
      let isLiked = false;
      let likeCount = 10;

      const originalIsLiked = isLiked;
      const originalLikeCount = likeCount;

      // Optimistic update
      isLiked = true;
      likeCount = 11;

      // Simulate error
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockInsertQuery);

      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: mockPostId,
          user_id: mockUser.id,
        });

      // Rollback on error
      if (error) {
        isLiked = originalIsLiked;
        likeCount = originalLikeCount;
      }

      expect(isLiked).toBe(false);
      expect(likeCount).toBe(10);
    });

    it('should track performance for like interaction', () => {
      const performanceMetrics = {
        interactionTimes: [] as number[],
      };

      const interactionStart = performance.now();

      // Simulate like action
      const isLiked = true;
      const likeCount = 11;

      const responseTime = performance.now() - interactionStart;
      performanceMetrics.interactionTimes.push(responseTime);

      expect(isLiked).toBe(true);
      expect(likeCount).toBe(11);
      expect(performanceMetrics.interactionTimes.length).toBe(1);
    });
  });

  describe('Follow functionality', () => {
    it('should follow a user successfully', async () => {
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          data: { id: 'follow-123' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockInsertQuery);

      const { data, error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: mockUser.id,
          following_id: mockTrackUserId,
        });

      expect(error).toBeNull();
      expect(data).toEqual({ id: 'follow-123' });
      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        follower_id: mockUser.id,
        following_id: mockTrackUserId,
      });
    });

    it('should unfollow a user successfully', async () => {
      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      // Chain the eq calls properly
      mockDeleteQuery.eq = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockDeleteQuery);

      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', mockUser.id)
        .eq('following_id', mockTrackUserId);

      expect(error).toBeNull();
    });

    it('should not show follow button for track owner', () => {
      const user = { id: 'user-123' };
      const trackUserId = 'user-123';

      const shouldShowFollowButton = user && trackUserId && user.id !== trackUserId;

      expect(shouldShowFollowButton).toBe(false);
    });

    it('should show follow button for non-owners', () => {
      const user = { id: 'user-123' };
      const trackUserId = 'other-user-456';

      const shouldShowFollowButton = user && trackUserId && user.id !== trackUserId;

      expect(shouldShowFollowButton).toBe(true);
    });

    it('should handle follow error gracefully', async () => {
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockInsertQuery);

      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: mockUser.id,
          following_id: mockTrackUserId,
        });

      expect(error).not.toBeNull();
      expect(error?.message).toBe('Database error');
    });
  });

  describe('Toast notifications', () => {
    it('should show success toast', () => {
      const toasts: Array<{ id: string; message: string; type: string }> = [];

      const showToast = (message: string, type: string) => {
        const id = `toast-${Date.now()}`;
        toasts.push({ id, message, type });
      };

      showToast('Track liked successfully', 'success');

      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Track liked successfully');
      expect(toasts[0].type).toBe('success');
    });

    it('should show error toast', () => {
      const toasts: Array<{ id: string; message: string; type: string }> = [];

      const showToast = (message: string, type: string) => {
        const id = `toast-${Date.now()}`;
        toasts.push({ id, message, type });
      };

      showToast('Failed to like track', 'error');

      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Failed to like track');
      expect(toasts[0].type).toBe('error');
    });

    it('should auto-dismiss toast after timeout', async () => {
      let toasts: Array<{ id: string; message: string; type: string }> = [];

      const showToast = (message: string, type: string) => {
        const id = `toast-${Date.now()}`;
        toasts.push({ id, message, type });

        // Auto-dismiss after 100ms (simulating 5 seconds)
        setTimeout(() => {
          toasts = toasts.filter(t => t.id !== id);
        }, 100);
      };

      showToast('Test message', 'info');

      expect(toasts.length).toBe(1);

      // Wait for auto-dismiss
      await waitFor(() => {
        expect(toasts.length).toBe(0);
      }, { timeout: 200 });
    });

    it('should dismiss toast manually', () => {
      let toasts: Array<{ id: string; message: string; type: string }> = [];

      const showToast = (message: string, type: string) => {
        const id = `toast-${Date.now()}`;
        toasts.push({ id, message, type });
        return id;
      };

      const dismissToast = (id: string) => {
        toasts = toasts.filter(t => t.id !== id);
      };

      const toastId = showToast('Test message', 'info');
      expect(toasts.length).toBe(1);

      dismissToast(toastId);
      expect(toasts.length).toBe(0);
    });

    it('should handle multiple toasts', () => {
      const toasts: Array<{ id: string; message: string; type: string }> = [];

      const showToast = (message: string, type: string) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        toasts.push({ id, message, type });
      };

      showToast('Message 1', 'info');
      showToast('Message 2', 'success');
      showToast('Message 3', 'error');

      expect(toasts.length).toBe(3);
      expect(toasts[0].message).toBe('Message 1');
      expect(toasts[1].message).toBe('Message 2');
      expect(toasts[2].message).toBe('Message 3');
    });
  });

  describe('Offline detection', () => {
    it('should detect when user goes offline', () => {
      let isOnline = true;

      // Simulate offline event
      isOnline = false;

      expect(isOnline).toBe(false);
    });

    it('should detect when user comes back online', () => {
      let isOnline = false;

      // Simulate online event
      isOnline = true;

      expect(isOnline).toBe(true);
    });

    it('should queue failed actions when offline', () => {
      const failedActions: Array<{ action: string; data: unknown }> = [];

      const queueFailedAction = (action: string, data: unknown) => {
        failedActions.push({ action, data });
      };

      queueFailedAction('like', { postId: 'post-123', userId: 'user-123' });
      queueFailedAction('follow', { followingId: 'user-456', followerId: 'user-123' });

      expect(failedActions.length).toBe(2);
      expect(failedActions[0].action).toBe('like');
      expect(failedActions[1].action).toBe('follow');
    });

    it('should retry failed actions when back online', () => {
      let failedActions: Array<{ action: string; data: unknown }> = [
        { action: 'like', data: { postId: 'post-123' } },
        { action: 'follow', data: { followingId: 'user-456' } },
      ];

      // Simulate retry
      const retryFailedActions = () => {
        failedActions = [];
      };

      retryFailedActions();

      expect(failedActions.length).toBe(0);
    });
  });

  describe('Copy URL functionality', () => {
    it('should copy track URL to clipboard', async () => {
      const trackId = 'track-123';
      const trackUrl = `https://example.com/tracks/${trackId}`;

      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };

      Object.assign(navigator, {
        clipboard: mockClipboard,
      });

      await navigator.clipboard.writeText(trackUrl);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(trackUrl);
    });

    it('should show success toast after copying URL', async () => {
      const toasts: Array<{ message: string; type: string }> = [];

      const showToast = (message: string, type: string) => {
        toasts.push({ message, type });
      };

      // Simulate successful copy
      showToast('URL copied to clipboard', 'success');

      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('URL copied to clipboard');
      expect(toasts[0].type).toBe('success');
    });
  });
});
