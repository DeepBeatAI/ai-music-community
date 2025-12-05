/**
 * ReportModal Component Tests
 * 
 * Tests for the ReportModal component that allows users to report content
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportModal } from '../ReportModal';
import { submitReport } from '@/lib/moderationService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/ToastContext');
jest.mock('@/contexts/AuthContext');

const mockSubmitReport = submitReport as jest.MockedFunction<typeof submitReport>;
const mockShowToast = jest.fn();
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ReportModal', () => {
  const mockOnClose = jest.fn();
  const mockUser = { 
    id: 'user-123', 
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z'
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ showToast: mockShowToast, dismissToast: jest.fn(), toasts: [] });
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
      const { container } = render(
        <ReportModal
          isOpen={false}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('Report Post')).toBeInTheDocument();
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

      const { container } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without selecting a reason', async () => {
      const { container } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const form = container.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('Please select a reason for reporting')).toBeInTheDocument();
      });

      expect(mockSubmitReport).not.toHaveBeenCalled();
    });

    it('should show error when selecting "Other" without description', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'other' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please provide a description when selecting "Other"')).toBeInTheDocument();
      });

      expect(mockSubmitReport).not.toHaveBeenCalled();
    });

    it('should show error when description exceeds 1000 characters', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const descriptionTextarea = screen.getByLabelText(/Additional details/i);
      const longText = 'a'.repeat(1001);
      fireEvent.change(descriptionTextarea, { target: { value: longText } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Description must be 1000 characters or less')).toBeInTheDocument();
      });

      expect(mockSubmitReport).not.toHaveBeenCalled();
    });

    it('should allow submission with valid reason and no description', async () => {
      mockSubmitReport.mockResolvedValue({} as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'post',
          targetId: 'post-123',
          reason: 'spam',
          description: undefined,
        });
      });
    });

    it('should allow submission with "Other" reason and description', async () => {
      mockSubmitReport.mockResolvedValue({} as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'other' } });

      const descriptionTextarea = screen.getByLabelText(/Additional details/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'This is a test description' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'post',
          targetId: 'post-123',
          reason: 'other',
          description: 'This is a test description',
        });
      });
    });
  });

  describe('Character Counter', () => {
    it('should display character count', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('0/1000')).toBeInTheDocument();
    });

    it('should update character count as user types', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const descriptionTextarea = screen.getByLabelText(/Additional details/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'Test' } });

      expect(screen.getByText('4/1000')).toBeInTheDocument();
    });
  });

  describe('Success Flow', () => {
    it('should show success toast and close modal on successful submission', async () => {
      mockSubmitReport.mockResolvedValue({} as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Report submitted successfully. Our moderation team will review it.',
          'success'
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should reset form after successful submission', async () => {
      mockSubmitReport.mockResolvedValue({} as any);

      const { rerender } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const descriptionTextarea = screen.getByLabelText(/Additional details/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      // Reopen modal
      rerender(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      // Form should be reset
      const newReasonSelect = screen.getByLabelText(/Reason for reporting/i) as HTMLSelectElement;
      expect(newReasonSelect.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should show error toast on rate limit exceeded', async () => {
      const rateLimitError = new Error('Rate limit exceeded') as Error & { code: string };
      rateLimitError.code = 'MODERATION_RATE_LIMIT_EXCEEDED';
      mockSubmitReport.mockRejectedValue(rateLimitError);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'You have reached the maximum number of reports (10) in 24 hours. Please try again later.',
          'error',
          6000
        );
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show generic error toast on other errors', async () => {
      mockSubmitReport.mockRejectedValue(new Error('Network error'));

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Network error',
          'error'
        );
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should disable submit button while submitting', async () => {
      mockSubmitReport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should disable close button while submitting', async () => {
      mockSubmitReport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      const submitButton = screen.getByText('Submit Report');
      fireEvent.click(submitButton);

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeDisabled();
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when clicking cancel button', () => {
      render(
        <ReportModal
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
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const backdrop = screen.getByText('Report Post').closest('div')?.parentElement?.parentElement;
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should not close modal when clicking inside modal content', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      const modalContent = screen.getByText('Report Post').closest('div');
      if (modalContent) {
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Content Type Display', () => {
    it('should display correct title for post', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('Report Post')).toBeInTheDocument();
    });

    it('should display correct title for comment', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="comment"
          targetId="comment-123"
        />
      );

      expect(screen.getByText('Report Comment')).toBeInTheDocument();
    });

    it('should display correct title for track', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      expect(screen.getByText('Report Track')).toBeInTheDocument();
    });

    it('should display correct title for user', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="user"
          targetId="user-123"
        />
      );

      expect(screen.getByText('Report User')).toBeInTheDocument();
    });
  });
});
