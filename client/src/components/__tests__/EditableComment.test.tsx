import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Comment from '@/components/Comment';
import { CommentWithProfile } from '@/types';
import * as commentsUtils from '@/utils/comments';

// Mock the dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    removeChannel: jest.fn()
  }
}));

jest.mock('@/utils/queryCache', () => ({
  queryCache: {
    invalidatePattern: jest.fn()
  }
}));

jest.mock('@/utils/format', () => ({
  formatTimeAgo: jest.fn(() => '2 hours ago')
}));

jest.mock('@/components/EditedBadge', () => {
  return function MockEditedBadge() {
    return <span>(Edited)</span>;
  };
});

// Mock updateComment function
jest.mock('@/utils/comments', () => ({
  updateComment: jest.fn()
}));

describe('Comment - Edit Functionality', () => {
  const mockComment: CommentWithProfile = {
    id: 'comment-1',
    post_id: 'post-1',
    user_id: 'user-1',
    content: 'Original comment content',
    parent_comment_id: null,
    created_at: '2025-01-13T10:00:00Z',
    updated_at: '2025-01-13T10:00:00Z',
    user_profiles: {
      id: 'profile-1',
      user_id: 'user-1',
      username: 'testuser',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    replies: [],
    reply_count: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Edit Button Display', () => {
    it('should show edit button for comment owner', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      expect(screen.getByLabelText('Edit comment')).toBeInTheDocument();
    });

    it('should not show edit button for non-owner', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-2"
        />
      );

      expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument();
    });

    it('should not show edit button when not authenticated', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
        />
      );

      expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button is clicked', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      const editButton = screen.getByLabelText('Edit comment');
      fireEvent.click(editButton);

      // Should show textarea with current content
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe('Original comment content');

      // Should show Save and Cancel buttons
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Should hide action buttons
      expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Delete comment')).not.toBeInTheDocument();
    });

    it('should show character counter in edit mode', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      expect(screen.getByText('24 / 1000')).toBeInTheDocument();
    });

    it('should update character counter as user types', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New content' } });

      expect(screen.getByText('11 / 1000')).toBeInTheDocument();
    });

    it('should cancel edit mode when cancel button is clicked', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Modified content' } });

      fireEvent.click(screen.getByText('Cancel'));

      // Should exit edit mode and restore original content
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('Original comment content')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit comment')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error for empty content', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '   ' } });

      expect(screen.getByText('Comment cannot be empty')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeDisabled();
    });

    it('should show error for content exceeding 1000 characters', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      const textarea = screen.getByRole('textbox');
      const longContent = 'a'.repeat(1001);
      fireEvent.change(textarea, { target: { value: longContent } });

      expect(screen.getByText('Comment exceeds maximum length of 1000 characters')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeDisabled();
    });

    it('should enable save button for valid content', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Valid new content' } });

      expect(screen.getByText('Save')).not.toBeDisabled();
    });
  });

  describe('Save Functionality', () => {
    it('should save comment with optimistic update', async () => {
      const mockUpdateComment = commentsUtils.updateComment as jest.MockedFunction<typeof commentsUtils.updateComment>;
      mockUpdateComment.mockResolvedValue({ success: true });

      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        // Should exit edit mode
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        // Should show updated content
        expect(screen.getByText('Updated content')).toBeInTheDocument();
      });

      // Should call updateComment with correct parameters
      expect(mockUpdateComment).toHaveBeenCalledWith('comment-1', 'Updated content', 'user-1');
    });

    it('should handle save error and rollback', async () => {
      const mockUpdateComment = commentsUtils.updateComment as jest.MockedFunction<typeof commentsUtils.updateComment>;
      mockUpdateComment.mockResolvedValue({ 
        success: false, 
        error: 'Network error' 
      });

      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Failed update' } });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText('Network error')).toBeInTheDocument();
        // Should stay in edit mode
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // The textarea should contain the failed content for retry
      const textareaAfterError = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textareaAfterError.value).toBe('Failed update');
    });

    it('should preserve content on error for retry', async () => {
      const mockUpdateComment = commentsUtils.updateComment as jest.MockedFunction<typeof commentsUtils.updateComment>;
      mockUpdateComment.mockResolvedValue({ 
        success: false, 
        error: 'Save failed' 
      });

      render(
        <Comment
          comment={mockComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      fireEvent.click(screen.getByLabelText('Edit comment'));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Content to retry' } });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });

      // Textarea should still contain the edited content for retry
      const textareaAfterError = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textareaAfterError.value).toBe('Content to retry');
    });
  });

  describe('EditedBadge Integration', () => {
    it('should show edited badge after successful save', async () => {
      const mockUpdateComment = commentsUtils.updateComment as jest.MockedFunction<typeof commentsUtils.updateComment>;
      mockUpdateComment.mockResolvedValue({ success: true });

      const editedComment = {
        ...mockComment,
        updated_at: '2025-01-13T12:00:00Z' // Different from created_at
      };

      render(
        <Comment
          comment={editedComment}
          postId="post-1"
          currentUserId="user-1"
        />
      );

      // Should show edited badge initially
      expect(screen.getByText('(Edited)')).toBeInTheDocument();
    });
  });

  describe('Only One Comment in Edit Mode', () => {
    it('should only allow one comment to be edited at a time', () => {
      const comment1: CommentWithProfile = { ...mockComment, id: 'comment-1' };
      const comment2: CommentWithProfile = { 
        ...mockComment, 
        id: 'comment-2',
        content: 'Second comment'
      };

      render(
        <>
          <Comment comment={comment1} postId="post-1" currentUserId="user-1" />
          <Comment comment={comment2} postId="post-1" currentUserId="user-1" />
        </>
      );

      // Click edit on first comment
      const editButtons = screen.getAllByLabelText(/Edit comment/);
      fireEvent.click(editButtons[0]);

      // First comment should be in edit mode
      expect(screen.getByDisplayValue('Original comment content')).toBeInTheDocument();

      // Second comment should still show edit button (not in edit mode)
      expect(screen.getByText('Second comment')).toBeInTheDocument();
    });
  });
});
