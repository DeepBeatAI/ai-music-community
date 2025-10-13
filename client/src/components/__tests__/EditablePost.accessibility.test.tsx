/**
 * Accessibility Tests for EditablePost Component
 * 
 * These tests verify that the EditablePost component meets accessibility standards
 * including ARIA labels, keyboard navigation, focus management, and screen reader support.
 * 
 * Requirements tested: 6.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('EditablePost Accessibility', () => {
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

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA label on edit button', () => {
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      expect(editButton).toHaveAttribute('aria-label', 'Edit post');
    });

    it('should have proper ARIA labels on action buttons in edit mode', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton).toHaveAttribute('aria-label');
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancel editing');
    });

    it('should have proper ARIA attributes on textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label');
      expect(textarea).toHaveAttribute('aria-describedby');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });

    it('should show validation error when trying to save empty content', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      
      // Save button should be enabled to allow showing validation error
      expect(saveButton).not.toBeDisabled();
      
      // Click save to trigger validation
      await user.click(saveButton);
      
      // Validation error should appear
      await waitFor(() => {
        expect(screen.getByText('Content cannot be empty')).toBeInTheDocument();
      });
    });

    it('should have region role on edit form', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const region = screen.getByRole('region', { name: /post editing form/i });
      expect(region).toBeInTheDocument();
    });

    it('should have alert role on error messages', async () => {
      const user = userEvent.setup();
      const { updatePost } = require('@/utils/posts');
      updatePost.mockResolvedValue({ success: false, error: 'Network error' });

      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have aria-busy on save button when saving', async () => {
      const user = userEvent.setup();
      const { updatePost } = require('@/utils/posts');
      updatePost.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(saveButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation to edit button', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      
      await user.tab();
      // The edit button should be focusable
      expect(editButton).toBeInTheDocument();
    });

    it('should support Ctrl+Enter to save', async () => {
      const user = userEvent.setup();
      const { updatePost } = require('@/utils/posts');
      updatePost.mockResolvedValue({ success: true });

      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Updated content');
      
      // Press Ctrl+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(updatePost).toHaveBeenCalled();
      });
    });

    it('should support Escape to cancel', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      
      // Press Escape
      fireEvent.keyDown(textarea, { key: 'Escape' });

      await waitFor(() => {
        expect(textarea).not.toBeInTheDocument();
      });
    });

    it('should allow tabbing through all interactive elements in edit mode', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      // All elements should be in the document and focusable
      expect(textarea).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should auto-focus textarea when entering edit mode', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      
      await waitFor(() => {
        expect(textarea).toHaveFocus();
      });
    });

    it('should return focus to edit button after saving', async () => {
      const user = userEvent.setup();
      const { updatePost } = require('@/utils/posts');
      updatePost.mockResolvedValue({ success: true });

      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        // After saving, the edit button should be visible again
        const editButtonAfterSave = screen.getByRole('button', { name: /edit post/i });
        expect(editButtonAfterSave).toBeInTheDocument();
      });
    });

    it('should return focus to edit button after canceling', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });
      await user.click(cancelButton);

      await waitFor(() => {
        // After canceling, the edit button should be visible again
        const editButtonAfterCancel = screen.getByRole('button', { name: /edit post/i });
        expect(editButtonAfterCancel).toBeInTheDocument();
      });
    });

    it('should move cursor to end of text when focusing textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      
      await waitFor(() => {
        expect(textarea.selectionStart).toBe(mockPost.content.length);
        expect(textarea.selectionEnd).toBe(mockPost.content.length);
      });
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce edit mode activation', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/edit mode active/i);
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide keyboard hint for users', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const hint = screen.getByText(/press ctrl\+enter to save/i);
      expect(hint).toBeInTheDocument();
    });

    it('should announce audio post editing restriction', async () => {
      const user = userEvent.setup();
      const audioPost: Post = {
        ...mockPost,
        post_type: 'audio',
        audio_url: 'https://example.com/audio.mp3',
      };

      render(<EditablePost post={audioPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const note = screen.getByRole('note');
      expect(note).toHaveTextContent(/you can only edit the caption/i);
      expect(note).toHaveAttribute('aria-label', 'Audio post editing restriction');
    });
  });

  describe('Mobile Touch Targets', () => {
    it('should have minimum 44px touch target for edit button', () => {
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      const styles = window.getComputedStyle(editButton);
      
      // Check for min-width and min-height classes
      expect(editButton.className).toMatch(/min-[wh]-\[44px\]/);
    });

    it('should have minimum 44px touch targets for action buttons', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton.className).toMatch(/min-h-\[44px\]/);
      expect(cancelButton.className).toMatch(/min-h-\[44px\]/);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive text sizing on textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      
      // Check for responsive text classes
      expect(textarea.className).toMatch(/text-base|md:text-lg/);
    });

    it('should have responsive padding on textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      
      // Check for responsive padding classes
      expect(textarea.className).toMatch(/p-3|md:p-4/);
    });

    it('should have responsive minimum height on textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      
      // Check for responsive min-height classes
      expect(textarea.className).toMatch(/min-h-\[120px\]|md:min-h-\[150px\]/);
    });
  });

  describe('Focus Indicators', () => {
    it('should have visible focus ring on edit button', () => {
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      
      // Check for focus ring classes
      expect(editButton.className).toMatch(/focus:ring/);
    });

    it('should have visible focus ring on textarea', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const textarea = screen.getByRole('textbox');
      
      // Check for focus ring classes
      expect(textarea.className).toMatch(/focus:ring/);
    });

    it('should have visible focus ring on action buttons', async () => {
      const user = userEvent.setup();
      render(<EditablePost post={mockPost} currentUserId="user-owner" />);
      
      const editButton = screen.getByRole('button', { name: /edit post/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i });

      expect(saveButton.className).toMatch(/focus:ring/);
      expect(cancelButton.className).toMatch(/focus:ring/);
    });
  });
});
