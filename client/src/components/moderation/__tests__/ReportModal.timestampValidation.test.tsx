/**
 * Unit Tests for Timestamp Validation
 * Feature: enhanced-report-evidence
 * 
 * These tests validate timestamp format validation including:
 * - Valid formats (MM:SS, HH:MM:SS)
 * - Invalid formats
 * - Edge cases
 * 
 * Validates: Requirements 2.1, 2.2
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportModal } from '@/components/moderation/ReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');

describe('ReportModal - Timestamp Validation', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  describe('Valid Formats', () => {
    it('should accept MM:SS format', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter valid MM:SS timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '2:35' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });

    it('should accept HH:MM:SS format', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter valid HH:MM:SS timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '1:23:45' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });

    it('should accept timestamps with leading zeros', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter timestamp with leading zeros
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '01:05' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });

    it('should accept maximum valid values (59:59)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter maximum valid MM:SS
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '59:59' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });

    it('should accept maximum valid values (23:59:59)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter maximum valid HH:MM:SS
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '23:59:59' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });

    it('should accept minimum valid values (0:00)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter minimum valid timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '0:00' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });
  });

  describe('Invalid Formats', () => {
    it('should reject invalid format (no colon)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '235' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should reject invalid format (letters)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: 'abc' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should reject invalid seconds (>59)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp with seconds > 59
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '2:60' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should reject invalid minutes (>59 in MM:SS)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp with minutes > 59
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '60:30' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should reject invalid hours (>23)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp with hours > 23
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '24:00:00' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should reject single number', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '5' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should reject negative values', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '-1:30' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      unmount();
    });
  });

  describe('Edge Cases', () => {
    it('should accept empty timestamp (optional field)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Leave timestamp empty
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });

    it('should accept whitespace-only timestamp (optional field)', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter whitespace
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '   ' } });
      fireEvent.blur(timestampInput);

      // No error should appear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });

    it('should clear error when valid timestamp is entered', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter invalid timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: 'invalid' } });
      fireEvent.blur(timestampInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      // Enter valid timestamp
      fireEvent.change(timestampInput, { target: { value: '2:35' } });
      fireEvent.blur(timestampInput);

      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      });

      unmount();
    });

    it('should handle timestamp with extra whitespace', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter timestamp with whitespace
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '  2:35  ' } });
      fireEvent.blur(timestampInput);

      // Should be valid (trimmed)
      await waitFor(() => {
        expect(screen.queryByText(/Please use format MM:SS or HH:MM:SS/i)).not.toBeInTheDocument();
      }, { timeout: 500 });

      unmount();
    });
  });

  describe('Timestamp Field Display', () => {
    it('should show timestamp field for hate_speech', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Timestamp field should be visible
      expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
    });

    it('should show timestamp field for harassment', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select harassment
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'harassment' } });

      // Timestamp field should be visible
      expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
    });

    it('should show timestamp field for inappropriate_content', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select inappropriate content
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'inappropriate_content' } });

      // Timestamp field should be visible
      expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
    });

    it('should not show timestamp field for spam', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select spam
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Timestamp field should not be visible
      expect(screen.queryByLabelText(/Timestamp in audio/i)).not.toBeInTheDocument();
    });
  });
});
