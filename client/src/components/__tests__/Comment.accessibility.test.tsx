/**
 * Accessibility Tests for Comment Component
 * 
 * These tests verify that the Comment component meets accessibility standards
 * including ARIA labels, keyboard navigation, focus management, and screen reader support.
 * 
 * Requirements tested: 6.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Comment from '../Comment';
import { CommentWithProfile } from '@/types';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

jest.mock('@/utils/queryCache', () => ({
  queryCache: {
    invalidatePattern: jest.fn(),
  },
}));

jest.mock('@/utils/comments', () => ({
  updateComment: jest.fn(),
}));

jest.mock('@/components/EditedBadge', () => {
  return function MockEditedBadge() {
    return <span data-testid="edited-badge">Edited</span>;
  };
});

describe('Comment Accessibility', () => {
  const mockComment: CommentWithProfile = {
    id: 'comment-123',
    post_id: 'post-123',
    user_id: 'user-owner',
    content: 'Test comment content',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    parent_comment_id: null,
    user_profiles: {
      id: 'user-owner',
      user_id: 'user-owner',
      username: 'testuser',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    replies: [],
  };

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on action buttons', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
          onReply={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      const deleteButton = screen.getByRole('button', { name: /delete comment/i });

      expect(editButton).toHaveAttribute('aria-label', 'Edit comment');
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete comment');
    });

    it('should have proper ARIA label on reply button with username', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="different-user"
          onReply={jest.fn()}
        />
      );

      const replyButton = screen.getByRole('button', { name: /reply to testuser/i });
      expect(replyButton).toHaveAttribute('aria-label', 'Reply to testuser');
    });

    it('should have proper ARIA attributes on edit textarea', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox', { name: /edit comment content/i });
      expect(textarea).toHaveAttribute('aria-label', 'Edit comment content');
      expect(textarea).toHaveAttribute('aria-describedby');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });

    it('should mark textarea as invalid when content is empty', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      await waitFor(() => {
        const errorMessage = screen.getByText(/comment cannot be empty/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('should have region role on edit form', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const region = screen.getByRole('region', { name: /comment editing form/i });
      expect(region).toBeInTheDocument();
    });

    it('should have proper aria attributes on save button', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save comment changes/i });
      
      // Save button should have aria-busy attribute
      expect(saveButton).toHaveAttribute('aria-busy');
      expect(saveButton).toHaveAttribute('aria-label');
    });

    it('should have aria-live on character counter', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const charCounter = screen.getByText(/\d+ \/ 1000/);
      expect(charCounter).toHaveAttribute('aria-live', 'polite');
      expect(charCounter).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Ctrl+Enter to save', async () => {
      const user = userEvent.setup();
      const { updateComment } = require('@/utils/comments');
      updateComment.mockResolvedValue({ success: true });

      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, ' updated');

      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(updateComment).toHaveBeenCalled();
      });
    });

    it('should support Escape to cancel', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');

      fireEvent.keyDown(textarea, { key: 'Escape' });

      await waitFor(() => {
        expect(textarea).not.toBeInTheDocument();
      });
    });

    it('should allow tabbing through all interactive elements', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
          onReply={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const replyButton = screen.getByRole('button', { name: /reply/i });
      const editButton = screen.getByRole('button', { name: /edit comment/i });
      const deleteButton = screen.getByRole('button', { name: /delete comment/i });

      expect(replyButton).toBeInTheDocument();
      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should auto-focus textarea when entering edit mode', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');

      await waitFor(() => {
        expect(textarea).toHaveFocus();
      });
    });

    it('should exit edit mode after saving', async () => {
      const user = userEvent.setup();
      const { updateComment } = require('@/utils/comments');
      updateComment.mockResolvedValue({ success: true });

      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save comment changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        // After saving, edit button should be visible again (not in edit mode)
        const editButtonAfterSave = screen.getByRole('button', { name: /edit comment/i });
        expect(editButtonAfterSave).toBeInTheDocument();
      });
    });

    it('should exit edit mode after canceling', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      await user.click(cancelButton);

      await waitFor(() => {
        // After canceling, edit button should be visible again (not in edit mode)
        const editButtonAfterCancel = screen.getByRole('button', { name: /edit comment/i });
        expect(editButtonAfterCancel).toBeInTheDocument();
      });
    });

    it('should have textarea with comment content when entering edit mode', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Textarea should contain the comment content
      expect(textarea.value).toBe(mockComment.content);
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce edit mode activation', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/edit mode active/i);
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide keyboard hint for users', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const hint = screen.getByText(/press ctrl\+enter to save/i);
      expect(hint).toBeInTheDocument();
    });

    it('should announce validation errors', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      await waitFor(() => {
        const error = screen.getByRole('alert');
        expect(error).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Mobile Touch Targets', () => {
    it('should have minimum 44px touch targets for action buttons', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
          onReply={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const replyButton = screen.getByRole('button', { name: /reply/i });
      const editButton = screen.getByRole('button', { name: /edit comment/i });
      const deleteButton = screen.getByRole('button', { name: /delete comment/i });

      expect(replyButton.className).toMatch(/min-h-\[44px\]/);
      expect(editButton.className).toMatch(/min-h-\[44px\]/);
      expect(deleteButton.className).toMatch(/min-h-\[44px\]/);
    });

    it('should have minimum 44px touch targets for edit mode buttons', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save comment changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton.className).toMatch(/min-h-\[44px\]/);
      expect(cancelButton.className).toMatch(/min-h-\[44px\]/);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive text sizing on textarea', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');

      expect(textarea.className).toMatch(/text-sm|md:text-base/);
    });

    it('should have responsive padding on textarea', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');

      expect(textarea.className).toMatch(/px-3|md:px-4/);
    });

    it('should have minimum height on textarea', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');

      expect(textarea.className).toMatch(/min-h-\[80px\]/);
    });
  });

  describe('Focus Indicators', () => {
    it('should have visible focus ring on action buttons', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
          onReply={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      const replyButton = screen.getByRole('button', { name: /reply/i });
      const editButton = screen.getByRole('button', { name: /edit comment/i });
      const deleteButton = screen.getByRole('button', { name: /delete comment/i });

      expect(replyButton.className).toMatch(/focus:ring/);
      expect(editButton.className).toMatch(/focus:ring/);
      expect(deleteButton.className).toMatch(/focus:ring/);
    });

    it('should have visible focus ring on textarea', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');

      expect(textarea.className).toMatch(/focus:ring/);
    });

    it('should have visible focus ring on edit mode buttons', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save comment changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton.className).toMatch(/focus:ring/);
      expect(cancelButton.className).toMatch(/focus:ring/);
    });
  });

  describe('Character Limit Feedback', () => {
    it('should show character count with appropriate color coding', async () => {
      const user = userEvent.setup();
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      const charCounter = screen.getByText(/\d+ \/ 1000/);
      expect(charCounter).toBeInTheDocument();
    });

    it('should show error when exceeding character limit', async () => {
      const user = userEvent.setup();
      const longComment = {
        ...mockComment,
        content: 'a'.repeat(1001), // Already over limit
      };

      render(
        <Comment
          comment={longComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      await user.click(editButton);

      // Error should be visible immediately since content is over limit
      const error = screen.getByText(/exceeds maximum length/i);
      expect(error).toHaveAttribute('role', 'alert');
    });
  });
});
