/**
 * Inline Validation Error Tests for EditablePost Component
 * 
 * These tests verify that inline validation errors are displayed correctly
 * for text posts, with proper styling, ARIA attributes, and user interaction.
 * 
 * Requirements tested: 1.6, 7.3, 7.8
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('EditablePost Inline Validation Errors', () => {
  const mockTextPost: Post = {
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

  const mockAudioPost: Post = {
    ...mockTextPost,
    post_type: 'audio',
    audio_url: 'https://example.com/audio.mp3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty Content Validation for Text Posts', () => {
    it('should display inline error when trying to save empty content for text post', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Clear the textarea
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check that inline error is displayed
      await waitFor(() => {
        const errorMessage = screen.getByText('Content cannot be empty');
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should not display error for audio posts with empty caption', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockAudioPost} currentUserId="user-owner" />);
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Clear the textarea
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      // Save button should be enabled for audio posts with empty caption
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();

      // No validation error should appear
      const errorMessage = screen.queryByText('Content cannot be empty');
      expect(errorMessage).not.toBeInTheDocument();
    });

    it('should display inline error below textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Clear the textarea
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check that error is positioned correctly (has validation-error id)
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('id', 'validation-error');
      });
    });
  });

  describe('Error Styling and Visual Presentation', () => {
    it('should style error message with red color', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check error styling
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveClass('text-red-400');
      });
    });

    it('should display error icon with error message', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check that error container has icon (svg element)
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        const icon = errorElement.querySelector('svg');
        expect(icon).toBeInTheDocument();
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should apply red border to textarea when validation error is present', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check textarea has red border
      await waitFor(() => {
        expect(textarea).toHaveClass('border-red-500');
      });
    });

    it('should have proper spacing and layout for error message', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check error has proper spacing classes
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveClass('mt-2');
        expect(errorElement).toHaveClass('flex');
        expect(errorElement).toHaveClass('items-start');
        expect(errorElement).toHaveClass('space-x-2');
      });
    });
  });

  describe('ARIA Attributes and Accessibility', () => {
    it('should have proper ARIA role on error message', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check ARIA role
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });

    it('should have aria-live="assertive" for immediate announcement', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check aria-live attribute
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should update textarea aria-invalid when error is present', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      
      // Initially should be false
      expect(textarea).toHaveAttribute('aria-invalid', 'false');

      // Clear and try to save
      await user.clear(textarea);
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should update to true
      await waitFor(() => {
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should link textarea to error message with aria-describedby', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check aria-describedby includes validation-error
      await waitFor(() => {
        const describedBy = textarea.getAttribute('aria-describedby');
        expect(describedBy).toContain('validation-error');
      });
    });

    it('should have proper id on error element for aria-describedby reference', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check error has correct id
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('id', 'validation-error');
      });
    });
  });

  describe('Error Clearing Behavior', () => {
    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Content cannot be empty')).toBeInTheDocument();
      });

      // Start typing
      await user.type(textarea, 'New content');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Content cannot be empty')).not.toBeInTheDocument();
      });
    });

    it('should remove red border from textarea when error is cleared', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify red border
      await waitFor(() => {
        expect(textarea).toHaveClass('border-red-500');
      });

      // Start typing
      await user.type(textarea, 'New content');

      // Red border should be removed
      await waitFor(() => {
        expect(textarea).not.toHaveClass('border-red-500');
        expect(textarea).toHaveClass('border-gray-600');
      });
    });

    it('should update aria-invalid to false when error is cleared', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify aria-invalid is true
      await waitFor(() => {
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
      });

      // Start typing
      await user.type(textarea, 'New content');

      // aria-invalid should be false
      await waitFor(() => {
        expect(textarea).toHaveAttribute('aria-invalid', 'false');
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should have responsive text sizing on error message', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check responsive text classes
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        const textElement = errorElement.querySelector('span');
        expect(textElement).toHaveClass('text-sm');
        expect(textElement?.className).toMatch(/md:text-base/);
      });
    });

    it('should be visible and readable on mobile screens', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Error should be visible
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeVisible();
      });
    });
  });

  describe('Distinction Between Validation and Network Errors', () => {
    it('should show validation error inline below textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger validation error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check that validation error has specific id
      await waitFor(() => {
        const errorElement = document.getElementById('validation-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('Content cannot be empty');
      });
    });

    it('should show network errors in separate alert box', async () => {
      const user = userEvent.setup();
      const { updatePost } = require('@/utils/posts');
      updatePost.mockResolvedValue({ 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      });

      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      // Try to save with valid content
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check that network error has different id
      await waitFor(() => {
        const errorElement = document.getElementById('network-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/network error/i);
      });

      // Validation error should not be present
      const validationError = document.getElementById('validation-error');
      expect(validationError).not.toBeInTheDocument();
    });

    it('should not show retry button for validation errors', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockTextPost} currentUserId="user-owner" />);
      
      // Enter edit mode and trigger validation error
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Retry button should not be present for validation errors
      await waitFor(() => {
        const retryButton = screen.queryByRole('button', { name: /try again/i });
        expect(retryButton).not.toBeInTheDocument();
      });
    });
  });
});
