import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/contexts/ToastContext';
import { Post, CommentWithProfile } from '@/types';
import * as postsUtils from '@/utils/posts';
import * as commentsUtils from '@/utils/comments';

// Mock all the dependencies
jest.mock('@/utils/posts');
jest.mock('@/utils/comments');
jest.mock('@/utils/queryCache', () => ({
  queryCache: {
    invalidatePattern: jest.fn(),
  },
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));
jest.mock('@/components/PostItem', () => ({
  __esModule: true,
  default: () => <div>PostItem Mock</div>,
}));
jest.mock('@/components/EditedBadge', () => ({
  __esModule: true,
  default: () => <div>EditedBadge Mock</div>,
}));
jest.mock('@/utils/format', () => ({
  formatTimeAgo: jest.fn(() => '1 hour ago'),
}));

// Import components after mocks
const EditablePost = require('@/components/EditablePost').default;
const Comment = require('@/components/Comment').default;

const mockUpdatePost = postsUtils.updatePost as jest.MockedFunction<typeof postsUtils.updatePost>;
const mockUpdateComment = commentsUtils.updateComment as jest.MockedFunction<typeof commentsUtils.updateComment>;

describe('Toast Integration with Edit Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('EditablePost Toast Integration', () => {
    const mockPost: Post = {
      id: 'post-1',
      user_id: 'user-1',
      content: 'Original post content',
      post_type: 'text',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_profiles: {
        user_id: 'user-1',
        username: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    };

    it('shows success toast when post is updated successfully', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdatePost.mockResolvedValue({ success: true });

      render(
        <ToastProvider>
          <EditablePost post={mockPost} currentUserId="user-1" />
        </ToastProvider>
      );

      // Click edit button
      const editButton = screen.getByLabelText('Edit post');
      await user.click(editButton);

      // Modify content
      const textarea = screen.getByLabelText('Edit content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated post content');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify success toast appears
      await waitFor(() => {
        expect(screen.getByText('Post updated successfully')).toBeInTheDocument();
      });

      // Verify toast has success styling
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-green-600');
    });

    it('shows error toast when post update fails', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdatePost.mockResolvedValue({ 
        success: false, 
        error: 'Failed to update post' 
      });

      render(
        <ToastProvider>
          <EditablePost post={mockPost} currentUserId="user-1" />
        </ToastProvider>
      );

      // Click edit button
      const editButton = screen.getByLabelText('Edit post');
      await user.click(editButton);

      // Modify content
      const textarea = screen.getByLabelText('Edit content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify error toast appears (there will be 2 alerts: inline error + toast)
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        // Toast should be one of the alerts with bg-red-600 class
        const toast = alerts.find(alert => alert.classList.contains('bg-red-600'));
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent('Failed to update post');
      });
    });

    it('shows error toast for network failures', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdatePost.mockRejectedValue(new Error('Network error'));

      render(
        <ToastProvider>
          <EditablePost post={mockPost} currentUserId="user-1" />
        </ToastProvider>
      );

      // Click edit button
      const editButton = screen.getByLabelText('Edit post');
      await user.click(editButton);

      // Modify content
      const textarea = screen.getByLabelText('Edit content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify error toast appears (there will be 2 alerts: inline error + toast)
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        // Toast should be one of the alerts with bg-red-600 class
        const toast = alerts.find(alert => alert.classList.contains('bg-red-600'));
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent(/network error/i);
      });
    });

    it('allows empty captions for audio posts without error', async () => {
      const user = userEvent.setup({ delay: null });
      const audioPost: Post = {
        ...mockPost,
        post_type: 'audio',
        audio_url: 'https://example.com/audio.mp3',
        content: 'Original caption',
      };
      mockUpdatePost.mockResolvedValue({ success: true });

      render(
        <ToastProvider>
          <EditablePost post={audioPost} currentUserId="user-1" />
        </ToastProvider>
      );

      // Click edit button
      const editButton = screen.getByLabelText('Edit post');
      await user.click(editButton);

      // Clear caption (make it empty)
      const textarea = screen.getByLabelText('Edit caption');
      await user.clear(textarea);

      // Save button should be enabled for audio posts with empty caption
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();

      // Save changes
      await user.click(saveButton);

      // Verify success toast appears
      await waitFor(() => {
        expect(screen.getByText('Post updated successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Toast Integration', () => {
    const mockComment: CommentWithProfile = {
      id: 'comment-1',
      post_id: 'post-1',
      user_id: 'user-1',
      content: 'Original comment',
      parent_comment_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_profiles: {
        id: 'profile-1',
        user_id: 'user-1',
        username: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    };

    it('shows success toast when comment is updated successfully', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdateComment.mockResolvedValue({ success: true });

      render(
        <ToastProvider>
          <Comment 
            comment={mockComment} 
            postId="post-1" 
            currentUserId="user-1" 
          />
        </ToastProvider>
      );

      // Click edit button
      const editButton = screen.getByLabelText('Edit comment');
      await user.click(editButton);

      // Modify content
      const textarea = screen.getByLabelText('Edit comment content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated comment');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify success toast appears
      await waitFor(() => {
        expect(screen.getByText('Comment updated successfully')).toBeInTheDocument();
      });

      // Verify toast has success styling
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-green-600');
    });

    it('shows error toast when comment update fails', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdateComment.mockResolvedValue({ 
        success: false, 
        error: 'Failed to update comment' 
      });

      render(
        <ToastProvider>
          <Comment 
            comment={mockComment} 
            postId="post-1" 
            currentUserId="user-1" 
          />
        </ToastProvider>
      );

      // Click edit button
      const editButton = screen.getByLabelText('Edit comment');
      await user.click(editButton);

      // Modify content
      const textarea = screen.getByLabelText('Edit comment content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated comment');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify error toast appears (there will be 2 alerts: inline error + toast)
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        // Toast should be one of the alerts with bg-red-600 class
        const toast = alerts.find(alert => alert.classList.contains('bg-red-600'));
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent('Failed to update comment');
      });
    });

    it('shows error toast for network failures', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdateComment.mockRejectedValue(new Error('Network error'));

      render(
        <ToastProvider>
          <Comment 
            comment={mockComment} 
            postId="post-1" 
            currentUserId="user-1" 
          />
        </ToastProvider>
      );

      // Click edit button
      const editButton = screen.getByLabelText('Edit comment');
      await user.click(editButton);

      // Modify content
      const textarea = screen.getByLabelText('Edit comment content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated comment');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify error toast appears (there will be 2 alerts: inline error + toast)
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        // Toast should be one of the alerts with bg-red-600 class
        const toast = alerts.find(alert => alert.classList.contains('bg-red-600'));
        expect(toast).toBeInTheDocument();
        // The error message from Comment component is just "Network error"
        expect(toast).toHaveTextContent('Network error');
      });
    });
  });

  describe('Toast Auto-Dismiss', () => {
    const mockPost: Post = {
      id: 'post-1',
      user_id: 'user-1',
      content: 'Original post content',
      post_type: 'text',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_profiles: {
        user_id: 'user-1',
        username: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    };

    it('auto-dismisses success toast after 4 seconds', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdatePost.mockResolvedValue({ success: true });

      render(
        <ToastProvider>
          <EditablePost post={mockPost} currentUserId="user-1" />
        </ToastProvider>
      );

      // Trigger successful update
      const editButton = screen.getByLabelText('Edit post');
      await user.click(editButton);
      const textarea = screen.getByLabelText('Edit content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify toast appears
      await waitFor(() => {
        expect(screen.getByText('Post updated successfully')).toBeInTheDocument();
      });

      // Fast-forward time by 4 seconds + animation time
      jest.advanceTimersByTime(4000 + 300);

      // Verify toast is dismissed
      await waitFor(() => {
        expect(screen.queryByText('Post updated successfully')).not.toBeInTheDocument();
      });
    });

    it('auto-dismisses error toast after 5 seconds', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdatePost.mockResolvedValue({ 
        success: false, 
        error: 'Update failed' 
      });

      render(
        <ToastProvider>
          <EditablePost post={mockPost} currentUserId="user-1" />
        </ToastProvider>
      );

      // Trigger failed update
      const editButton = screen.getByLabelText('Edit post');
      await user.click(editButton);
      const textarea = screen.getByLabelText('Edit content');
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify toast appears
      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });

      // Fast-forward time by 5 seconds + animation time
      jest.advanceTimersByTime(5000 + 300);

      // Verify toast is dismissed
      await waitFor(() => {
        expect(screen.queryByText('Update failed')).not.toBeInTheDocument();
      });
    });
  });
});
