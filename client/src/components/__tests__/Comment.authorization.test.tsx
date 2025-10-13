/**
 * Authorization Tests for Comment Component
 * 
 * These tests verify that the Comment component properly enforces
 * authorization rules for editing and deleting comments.
 * 
 * Requirements tested: 3.1, 3.3, 3.4, 4.8
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Comment from '../Comment';
import { CommentWithProfile } from '@/types';

// Mock the utility functions
jest.mock('@/utils/comments', () => ({
  updateComment: jest.fn(),
}));

// Mock the supabase client
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

// Mock EditedBadge component
jest.mock('../EditedBadge', () => {
  return function MockEditedBadge() {
    return <div data-testid="edited-badge">Edited</div>;
  };
});

// Mock queryCache
jest.mock('@/utils/queryCache', () => ({
  queryCache: {
    invalidatePattern: jest.fn(),
  },
}));

describe('Comment Authorization', () => {
  const mockComment: CommentWithProfile = {
    id: 'comment-123',
    post_id: 'post-123',
    user_id: 'user-owner',
    content: 'Test comment content',
    parent_comment_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_profiles: {
      id: 'profile-123',
      user_id: 'user-owner',
      username: 'testuser',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    replies: [],
  };

  describe('Requirement 3.1: Edit button visibility for comment owner', () => {
    it('should show edit button when user is the comment owner', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      // Look for the edit button
      const editButton = screen.getByRole('button', { name: /edit comment/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should not show edit button when user is not the comment owner', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="different-user"
        />
      );

      // Edit button should not be present
      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.4: Edit button visibility for unauthenticated users', () => {
    it('should not show edit button when currentUserId is undefined', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId={undefined}
        />
      );

      // Edit button should not be present
      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should not show reply button when currentUserId is undefined', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId={undefined}
          onReply={jest.fn()}
        />
      );

      // Reply button should not be present for unauthenticated users
      const replyButton = screen.queryByRole('button', { name: /reply/i });
      expect(replyButton).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.1: Delete button visibility for comment owner', () => {
    it('should show delete button when user is the comment owner', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
          onDelete={jest.fn()}
        />
      );

      // Look for the delete button
      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not show delete button when user is not the comment owner', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="different-user"
          onDelete={jest.fn()}
        />
      );

      // Delete button should not be present
      const deleteButton = screen.queryByRole('button', { name: /delete comment/i });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should not show delete button when onDelete callback is not provided', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      // Delete button should not be present without callback
      const deleteButton = screen.queryByRole('button', { name: /delete comment/i });
      expect(deleteButton).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.3: Ownership verification', () => {
    it('should correctly identify owner when user_id matches', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      // Edit button should be visible
      const editButton = screen.getByRole('button', { name: /edit comment/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should correctly identify non-owner when user_id does not match', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="different-user-id"
        />
      );

      // Edit button should not be visible
      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should handle case-sensitive user ID comparison', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="USER-OWNER" // Different case
        />
      );

      // Edit button should not be visible (case-sensitive comparison)
      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Requirement 4.8: Comment owner restrictions', () => {
    it('should only allow comment owner to see edit and delete buttons', () => {
      const { rerender } = render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="user-owner"
          onDelete={jest.fn()}
        />
      );

      // Owner should see both buttons
      expect(screen.getByRole('button', { name: /edit comment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete comment/i })).toBeInTheDocument();

      // Re-render with different user
      rerender(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId="different-user"
          onDelete={jest.fn()}
        />
      );

      // Non-owner should not see either button
      expect(screen.queryByRole('button', { name: /edit comment/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete comment/i })).not.toBeInTheDocument();
    });
  });

  describe('Nested comments authorization', () => {
    const nestedComment: CommentWithProfile = {
      ...mockComment,
      id: 'nested-comment-123',
      parent_comment_id: 'parent-comment-123',
    };

    it('should show edit button for nested comment owner', () => {
      render(
        <Comment
          comment={nestedComment}
          postId="post-123"
          currentUserId="user-owner"
          depth={1}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit comment/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should not show edit button for nested comment non-owner', () => {
      render(
        <Comment
          comment={nestedComment}
          postId="post-123"
          currentUserId="different-user"
          depth={1}
        />
      );

      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle null currentUserId', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId={null as unknown as string}
        />
      );

      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should handle comment with missing user_id', () => {
      const commentWithoutUserId = {
        ...mockComment,
        user_id: undefined as unknown as string,
      };

      render(
        <Comment
          comment={commentWithoutUserId}
          postId="post-123"
          currentUserId="user-owner"
        />
      );

      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should handle empty string currentUserId', () => {
      render(
        <Comment
          comment={mockComment}
          postId="post-123"
          currentUserId=""
        />
      );

      const editButton = screen.queryByRole('button', { name: /edit comment/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });
});
