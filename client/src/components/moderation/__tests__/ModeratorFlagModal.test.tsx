/**
 * ModeratorFlagModal Component Tests
 * 
 * Tests for the ModeratorFlagModal component that allows moderators to flag content
 * Requirements: 2.1, 2.2
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModeratorFlagModal } from '../ModeratorFlagModal';
import { moderatorFlagContent } from '@/lib/moderationService';
import { useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');

const mockModeratorFlagContent = moderatorFlagContent as jest.MockedFunction<typeof moderatorFlagContent>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('ModeratorFlagModal', () => {
  const mockOnClose = jest.fn();
  const mockUser = { 
    id: 'moderator-123', 
    email: 'moderator@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false,
      session: null,
      profile: null,
      userTypeInfo: null,
      isAdmin: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      userTypeLoading: false,
      userTypeError: null,
      refreshProfile: jest.fn()
    });
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={false}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      // Modal content should not be visible
      expect(screen.queryByText('Flag Post')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('Flag Post')).toBeInTheDocument();
      expect(screen.getByText('Moderator Flag')).toBeInTheDocument();
    });

    it('should not render when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ 
        user: null, 
        loading: false,
        session: null,
        profile: null,
        userTypeInfo: null,
        isAdmin: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        userTypeLoading: false,
        userTypeError: null,
        refreshProfile: jest.fn()
      });

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      // Modal content should not be visible when user is not authenticated
      expect(screen.queryByText('Flag Post')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when no reason is selected', async () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const submitButton = screen.getByText('Flag Content');
      
      // Button should be disabled when no reason is selected
      expect(submitButton).toBeDisabled();
      
      expect(mockModeratorFlagContent).not.toHaveBeenCalled();
    });

    it('should disable submit button when no internal notes are provided', async () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const submitButton = screen.getByText('Flag Content');
      
      // Button should still be disabled when no internal notes
      expect(submitButton).toBeDisabled();
      
      expect(mockModeratorFlagContent).not.toHaveBeenCalled();
    });

    it('should allow submission with valid reason and internal notes', async () => {
      mockModeratorFlagContent.mockResolvedValue({} as never);

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'This is spam content' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockModeratorFlagContent).toHaveBeenCalledWith({
          reportType: 'post',
          targetId: 'post-123',
          reason: 'spam',
          internalNotes: 'This is spam content',
          priority: 3,
        });
      });
    });

    it('should include custom priority when selected', async () => {
      mockModeratorFlagContent.mockResolvedValue({} as never);

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      const prioritySelect = screen.getByLabelText(/Priority Level/i);
      fireEvent.change(prioritySelect, { target: { value: '1' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Critical hate speech content' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockModeratorFlagContent).toHaveBeenCalledWith({
          reportType: 'post',
          targetId: 'post-123',
          reason: 'hate_speech',
          internalNotes: 'Critical hate speech content',
          priority: 1,
        });
      });
    });
  });

  describe('Priority Selector', () => {
    it('should default to P3 - Standard priority', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const prioritySelect = screen.getByLabelText(/Priority Level/i) as HTMLSelectElement;
      expect(prioritySelect.value).toBe('3');
    });

    it('should display all priority options', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('P1 - Critical')).toBeInTheDocument();
      expect(screen.getByText('P2 - High')).toBeInTheDocument();
      expect(screen.getByText('P3 - Standard')).toBeInTheDocument();
      expect(screen.getByText('P4 - Low')).toBeInTheDocument();
      expect(screen.getByText('P5 - Minimal')).toBeInTheDocument();
    });
  });

  describe('Success Flow', () => {
    it('should show success toast and close modal on successful submission', async () => {
      mockModeratorFlagContent.mockResolvedValue({} as never);

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Spam content' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Content flagged successfully. It has been added to the moderation queue.')).toBeInTheDocument();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      mockModeratorFlagContent.mockResolvedValue({} as never);

      const { rerender } = renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      // Reopen modal
      rerender(
        <ToastProvider>
          <ModeratorFlagModal
            isOpen={true}
            onClose={mockOnClose}
            reportType="post"
            targetId="post-123"
          />
        </ToastProvider>
      );

      // Form should be reset
      const newReasonSelect = screen.getByLabelText(/Reason for flagging/i) as HTMLSelectElement;
      expect(newReasonSelect.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on unauthorized error', async () => {
      const unauthorizedError = new Error('Unauthorized') as Error & { code: string };
      unauthorizedError.code = 'MODERATION_UNAUTHORIZED';
      mockModeratorFlagContent.mockRejectedValue(unauthorizedError);

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Spam content' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('You do not have permission to flag content. Only moderators and admins can flag content.')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show generic error toast on other errors', async () => {
      mockModeratorFlagContent.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Spam content' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should disable submit button while submitting', async () => {
      mockModeratorFlagContent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Spam content' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      expect(screen.getByText('Flagging...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should disable close button while submitting', async () => {
      mockModeratorFlagContent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const notesTextarea = screen.getByLabelText(/Internal Notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Spam content' } });

      const submitButton = screen.getByText('Flag Content');
      fireEvent.click(submitButton);

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeDisabled();
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when clicking cancel button', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when clicking backdrop', () => {
      const { container } = renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      // Find the backdrop (the outermost div with fixed inset-0 class)
      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toBeInTheDocument();
      
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should not close modal when clicking inside modal content', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const modalContent = screen.getByText('Flag Post').closest('div');
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Content Type Display', () => {
    it('should display correct title for post', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('Flag Post')).toBeInTheDocument();
    });

    it('should display correct title for comment', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="comment"
          targetId="comment-123"
        />
      );

      expect(screen.getByText('Flag Comment')).toBeInTheDocument();
    });

    it('should display correct title for track', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      expect(screen.getByText('Flag Track')).toBeInTheDocument();
    });

    it('should display correct title for user', () => {
      renderWithProviders(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="user"
          targetId="user-123"
        />
      );

      expect(screen.getByText('Flag User')).toBeInTheDocument();
    });
  });
});
