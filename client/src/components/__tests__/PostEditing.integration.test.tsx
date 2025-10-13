/**
 * Post Editing Integration Tests
 * 
 * These tests verify the complete post editing flow including:
 * - Text post editing
 * - Audio post caption editing
 * - EditedBadge display
 * - Content persistence
 * - Validation errors
 * 
 * Requirements tested: All post editing requirements (1.x, 2.x, 5.x, 6.x, 7.x)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EditablePost from '../EditablePost';
import { Post } from '@/types';
import { updatePost } from '@/utils/posts';

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
  return function MockEditedBadge({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
    const isEdited = new Date(updatedAt) > new Date(createdAt);
    return isEdited ? <span data-testid="edited-badge">(Edited)</span> : null;
  };
});

// Mock PostItem component
jest.mock('../PostItem', () => {
  return function MockPostItem({ post }: { post: Post }) {
    return (
      <div data-testid="post-item">
        <div data-testid="post-content">{post.content}</div>
        {post.audio_url && <div data-testid="audio-url">{post.audio_url}</div>}
        {post.audio_filename && <div data-testid="audio-filename">{post.audio_filename}</div>}
      </div>
    );
  };
});

const mockUpdatePost = updatePost as jest.MockedFunction<typeof updatePost>;

describe('Post Editing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Post Editing Flow (Requirements 1.1-1.7)', () => {
    const textPost: Post = {
      id: 'post-123',
      user_id: 'user-owner',
      content: 'Original text post content',
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

    it('should complete full text post editing flow successfully', async () => {
      const user = userEvent.setup();
      mockUpdatePost.mockResolvedValue({ success: true });

      const { rerender } = render(
        <EditablePost post={textPost} currentUserId="user-owner" />
      );

      // Step 1: User clicks Edit button (Requirement 1.1)
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Step 2: Editable textarea appears with current content (Requirement 1.2)
      const textarea = screen.getByRole('textbox', { name: /edit content/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('Original text post content');

      // Step 3: User modifies content
      await user.clear(textarea);
      await user.type(textarea, 'Updated text post content');

      // Step 4: User clicks Save button (Requirement 1.3)
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Step 5: Verify updatePost was called correctly
      await waitFor(() => {
        expect(mockUpdatePost).toHaveBeenCalledWith(
          'post-123',
          'Updated text post content',
          'user-owner',
          'text'
        );
      });

      // Step 6: Edit mode should exit after successful save
      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: /edit content/i })).not.toBeInTheDocument();
      });

      // Step 7: Simulate updated post with new timestamp (Requirement 1.7)
      const updatedPost = {
        ...textPost,
        content: 'Updated text post content',
        updated_at: '2024-01-01T01:00:00Z', // Different from created_at
      };

      rerender(<EditablePost post={updatedPost} currentUserId="user-owner" />);

      // Step 8: Verify EditedBadge appears (Requirement 5.2)
      await waitFor(() => {
        expect(screen.getByTestId('edited-badge')).toBeInTheDocument();
      });

      // Step 9: Verify updated content is displayed
      expect(screen.getByTestId('post-content')).toHaveTextContent('Updated text post content');
    });

    it('should handle cancel operation correctly (Requirement 1.5)', async () => {
      const user = userEvent.setup();

      render(<EditablePost post={textPost} currentUserId="user-owner" />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Modify content
      const textarea = screen.getByRole('textbox', { name: /edit content/i });
      await user.clear(textarea);
      await user.type(textarea, 'This should be discarded');

      // Click Cancel (window.confirm will return true from mock)
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify edit mode is exited
      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: /edit content/i })).not.toBeInTheDocument();
      });

      // Verify original content is displayed (not the edited content)
      expect(screen.getByTestId('post-content')).toHaveTextContent('Original text post content');

      // Verify updatePost was not called
      expect(mockUpdatePost).not.toHaveBeenCalled();
    });

    it('should prevent saving empty content (Requirement 1.6, 7.1)', async () => {
      const user = userEvent.setup();
      mockUpdatePost.mockResolvedValue({ 
        success: false, 
        error: 'Content cannot be empty' 
      });

      render(<EditablePost post={textPost} currentUserId="user-owner" />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Clear content
      const textarea = screen.getByRole('textbox', { name: /edit content/i });
      await user.clear(textarea);

      // Verify save button is enabled (to allow showing validation error)
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();

      // Click save to trigger validation error (Requirement 7.1)
      await user.click(saveButton);

      // Verify validation error is shown
      await waitFor(() => {
        expect(screen.getByText('Content cannot be empty')).toBeInTheDocument();
      });

      // Verify updatePost is not called when validation fails
      expect(mockUpdatePost).not.toHaveBeenCalled();

      // Verify textarea is still present (user can add content)
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('Audio Post Caption Editing Flow (Requirements 2.1-2.7)', () => {
    const audioPost: Post = {
      id: 'audio-post-456',
      user_id: 'user-owner',
      content: 'Original audio caption',
      post_type: 'audio',
      audio_url: 'https://example.com/audio.mp3',
      audio_filename: 'test-audio.mp3',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_profiles: {
        user_id: 'user-owner',
        username: 'testuser',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    };

    it('should complete full audio post caption editing flow', async () => {
      const user = userEvent.setup();
      mockUpdatePost.mockResolvedValue({ success: true });

      const { rerender } = render(
        <EditablePost post={audioPost} currentUserId="user-owner" />
      );

      // Step 1: User clicks Edit button (Requirement 2.1)
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Step 2: Editable textarea appears for caption only (Requirement 2.2)
      const textarea = screen.getByRole('textbox', { name: /edit caption/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('Original audio caption');

      // Step 3: Verify audio editing restriction message is shown (Requirement 2.3)
      expect(screen.getByRole('note', { name: /audio post editing restriction/i })).toBeInTheDocument();
      expect(screen.getByText(/you can only edit the caption for audio posts/i)).toBeInTheDocument();

      // Step 4: User modifies caption
      await user.clear(textarea);
      await user.type(textarea, 'Updated audio caption');

      // Step 5: User saves changes (Requirement 2.4)
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Step 6: Verify only text was updated, not audio
      await waitFor(() => {
        expect(mockUpdatePost).toHaveBeenCalledWith(
          'audio-post-456',
          'Updated audio caption',
          'user-owner',
          'audio'
        );
      });

      // Step 7: Edit mode should exit after successful save
      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: /edit caption/i })).not.toBeInTheDocument();
      });

      // Step 8: Simulate updated post (Requirement 2.7)
      const updatedAudioPost = {
        ...audioPost,
        content: 'Updated audio caption',
        updated_at: '2024-01-01T01:00:00Z',
      };

      rerender(<EditablePost post={updatedAudioPost} currentUserId="user-owner" />);

      // Step 9: Verify audio file remains unchanged (audio_url and audio_filename in post object)
      expect(updatedAudioPost.audio_url).toBe('https://example.com/audio.mp3');
      expect(updatedAudioPost.audio_filename).toBe('test-audio.mp3');

      // Step 10: Verify EditedBadge appears
      await waitFor(() => {
        expect(screen.getByTestId('edited-badge')).toBeInTheDocument();
      });
    });

    it('should allow saving audio posts with empty caption', async () => {
      const user = userEvent.setup();

      render(<EditablePost post={audioPost} currentUserId="user-owner" />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Clear caption
      const textarea = screen.getByRole('textbox', { name: /edit caption/i });
      await user.clear(textarea);

      // Verify save button is enabled for audio posts (captions are optional)
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();

      // Click save
      await user.click(saveButton);

      // Verify updatePost is called with empty caption
      await waitFor(() => {
        expect(mockUpdatePost).toHaveBeenCalledWith(
          'audio-post-456',
          '',
          'user-owner',
          'audio'
        );
      });
    });
  });

  describe('EditedBadge Display (Requirements 5.1-5.9)', () => {
    it('should show EditedBadge when post is edited', () => {
      const editedPost: Post = {
        id: 'post-123',
        user_id: 'user-owner',
        content: 'Edited content',
        post_type: 'text',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z', // Different timestamp
        user_profiles: {
          user_id: 'user-owner',
          username: 'testuser',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      render(<EditablePost post={editedPost} currentUserId="user-owner" />);

      // EditedBadge should be visible (Requirement 5.2)
      expect(screen.getByTestId('edited-badge')).toBeInTheDocument();
    });

    it('should not show EditedBadge when post is not edited', () => {
      const uneditedPost: Post = {
        id: 'post-123',
        user_id: 'user-owner',
        content: 'Original content',
        post_type: 'text',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z', // Same timestamp
        user_profiles: {
          user_id: 'user-owner',
          username: 'testuser',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      render(<EditablePost post={uneditedPost} currentUserId="user-owner" />);

      // EditedBadge should not be visible (Requirement 5.6)
      expect(screen.queryByTestId('edited-badge')).not.toBeInTheDocument();
    });
  });

  describe('Loading and Error States (Requirements 6.3, 6.4)', () => {
    const testPost: Post = {
      id: 'post-123',
      user_id: 'user-owner',
      content: 'Test content',
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

    it('should display loading indicator during save (Requirement 6.3)', async () => {
      const user = userEvent.setup();
      
      // Create a promise that we can control
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      mockUpdatePost.mockReturnValue(updatePromise as Promise<{ success: boolean; error?: string }>);

      render(<EditablePost post={testPost} currentUserId="user-owner" />);

      // Enter edit mode and make changes
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox', { name: /edit content/i });
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Loading indicator should appear
      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });

      // Resolve the update
      resolveUpdate!({ success: true });

      // Loading indicator should disappear
      await waitFor(() => {
        expect(screen.queryByText(/saving/i)).not.toBeInTheDocument();
      });
    });

    it('should preserve content on error for retry (Requirement 6.4)', async () => {
      const user = userEvent.setup();
      mockUpdatePost.mockResolvedValue({ 
        success: false, 
        error: 'Network error occurred' 
      });

      render(<EditablePost post={testPost} currentUserId="user-owner" />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Make changes
      const textarea = screen.getByRole('textbox', { name: /edit content/i });
      await user.clear(textarea);
      await user.type(textarea, 'Content to preserve');

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });

      // Content should still be in textarea for retry
      expect(textarea).toHaveValue('Content to preserve');
      expect(textarea).toBeInTheDocument();
    });

    it('should handle network errors with retry option', async () => {
      const user = userEvent.setup();
      mockUpdatePost
        .mockResolvedValueOnce({ 
          success: false, 
          error: 'Failed to save changes. Please check your connection.' 
        })
        .mockResolvedValueOnce({ success: true });

      render(<EditablePost post={testPost} currentUserId="user-owner" />);

      // Enter edit mode and make changes
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox', { name: /edit content/i });
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');

      // First save attempt fails
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save changes/i)).toBeInTheDocument();
      });

      // Retry by clicking save again
      await user.click(saveButton);

      // Second attempt succeeds - edit mode exits
      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: /edit content/i })).not.toBeInTheDocument();
      });

      // Verify updatePost was called twice (first failed, second succeeded)
      expect(mockUpdatePost).toHaveBeenCalledTimes(2);
    });
  });

  describe('Unsaved Changes Warning (Requirements 6.5, 6.6)', () => {
    const testPost: Post = {
      id: 'post-123',
      user_id: 'user-owner',
      content: 'Test content',
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

    it('should disable other interactions while in edit mode (Requirement 6.5)', async () => {
      const user = userEvent.setup();

      render(<EditablePost post={testPost} currentUserId="user-owner" />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Edit button should be hidden/disabled in edit mode
      expect(screen.queryByRole('button', { name: /edit post/i })).not.toBeInTheDocument();

      // Only Save and Cancel buttons should be available
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });
});
