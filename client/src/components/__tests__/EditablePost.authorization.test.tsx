/**
 * Authorization Tests for EditablePost Component
 * 
 * These tests verify that the EditablePost component properly enforces
 * authorization rules for editing posts.
 * 
 * Requirements tested: 3.1, 3.3, 3.4
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditablePost from '../EditablePost';
import { Post } from '@/types';

// Mock the ToastContext
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock the utility functions
jest.mock('@/utils/posts', () => ({
  updatePost: jest.fn(),
}));

// Mock EditedBadge component
jest.mock('../EditedBadge', () => {
  return function MockEditedBadge() {
    return <div data-testid="edited-badge">Edited</div>;
  };
});

// Mock PostItem component
jest.mock('../PostItem', () => {
  return function MockPostItem({ post }: { post: Post }) {
    return (
      <div data-testid="post-item">
        <div>{post.content}</div>
      </div>
    );
  };
});

describe('EditablePost Authorization', () => {
  const mockPost: Post = {
    id: 'post-123',
    user_id: 'user-owner',
    content: 'Test post content',
    post_type: 'text',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_profiles: {
      user_id: 'user-owner',
      username: 'testuser',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  };

  describe('Requirement 3.1: Edit button visibility for post owner', () => {
    it('should show edit button when user is the post owner', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId="user-owner"
        />
      );

      // Look for the edit button
      const editButton = screen.getByRole('button', { name: /edit post/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should not show edit button when user is not the post owner', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId="different-user"
        />
      );

      // Edit button should not be present
      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.4: Edit button visibility for unauthenticated users', () => {
    it('should not show edit button when currentUserId is undefined', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId={undefined}
        />
      );

      // Edit button should not be present
      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should not show edit button when currentUserId is empty string', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId=""
        />
      );

      // Edit button should not be present
      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.3: Ownership verification', () => {
    it('should correctly identify owner when user_id matches', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId="user-owner"
        />
      );

      // Edit button should be visible
      const editButton = screen.getByRole('button', { name: /edit post/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should correctly identify non-owner when user_id does not match', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId="different-user-id"
        />
      );

      // Edit button should not be visible
      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should handle case-sensitive user ID comparison', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId="USER-OWNER" // Different case
        />
      );

      // Edit button should not be visible (case-sensitive comparison)
      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Audio post authorization', () => {
    const audioPost: Post = {
      ...mockPost,
      post_type: 'audio',
      audio_url: 'https://example.com/audio.mp3',
      audio_filename: 'test-audio.mp3',
    };

    it('should show edit button for audio post owner', () => {
      render(
        <EditablePost
          post={audioPost}
          currentUserId="user-owner"
        />
      );

      const editButton = screen.getByRole('button', { name: /edit post/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should not show edit button for audio post non-owner', () => {
      render(
        <EditablePost
          post={audioPost}
          currentUserId="different-user"
        />
      );

      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle null currentUserId', () => {
      render(
        <EditablePost
          post={mockPost}
          currentUserId={null as unknown as string}
        />
      );

      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('should handle post with missing user_id', () => {
      const postWithoutUserId = {
        ...mockPost,
        user_id: undefined as unknown as string,
      };

      render(
        <EditablePost
          post={postWithoutUserId}
          currentUserId="user-owner"
        />
      );

      const editButton = screen.queryByRole('button', { name: /edit post/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });
});
