/**
 * Unit Tests for ReportModal Examples Section
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the examples section functionality including:
 * - Collapsible functionality
 * - Example content rendering
 * - Conditional display by violation type
 * 
 * Validates: Requirements 3.1, 3.2
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportModal } from '@/components/moderation/ReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');

describe('ReportModal - Examples Section', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  describe('Collapsible Functionality', () => {
    it('should initially hide examples content', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select a reason to show examples section
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Examples header should be visible
      expect(screen.getByText('Examples of Good Reports')).toBeInTheDocument();

      // Examples content should be hidden initially
      expect(screen.queryByText(/Good Examples:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Bad Examples:/i)).not.toBeInTheDocument();
    });

    it('should expand examples when clicked', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select a reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Click the examples header to expand
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Examples content should now be visible
      await waitFor(() => {
        expect(screen.getByText(/Good Examples:/i)).toBeInTheDocument();
        expect(screen.getByText(/Bad Examples:/i)).toBeInTheDocument();
      });
    });

    it('should collapse examples when clicked again', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select a reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Expand examples
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      await waitFor(() => {
        expect(screen.getByText(/Good Examples:/i)).toBeInTheDocument();
      });

      // Collapse examples
      fireEvent.click(examplesButton);

      await waitFor(() => {
        expect(screen.queryByText(/Good Examples:/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Bad Examples:/i)).not.toBeInTheDocument();
      });
    });

    it('should toggle arrow icon when expanding/collapsing', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select a reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Get the button and its arrow icon
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      const arrowIcon = examplesButton.querySelector('svg:last-child');

      // Initially not rotated
      expect(arrowIcon).not.toHaveClass('rotate-180');

      // Click to expand
      fireEvent.click(examplesButton);

      // Should be rotated
      expect(arrowIcon).toHaveClass('rotate-180');

      // Click to collapse
      fireEvent.click(examplesButton);

      // Should not be rotated
      expect(arrowIcon).not.toHaveClass('rotate-180');
    });
  });

  describe('Example Content Rendering', () => {
    it('should render good examples for spam', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select spam reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Expand examples
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Check for good examples
      await waitFor(() => {
        expect(screen.getByText(/User posted the same promotional link/i)).toBeInTheDocument();
        expect(screen.getByText(/Profile contains multiple external links/i)).toBeInTheDocument();
      });
    });

    it('should render bad examples for spam', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select spam reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Expand examples
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Check for bad examples
      await waitFor(() => {
        expect(screen.getByText(/This is spam/i)).toBeInTheDocument();
        expect(screen.getByText(/I don't like this content/i)).toBeInTheDocument();
      });
    });

    it('should render copyright-specific tip for copyright violations', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select copyright violation reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Expand examples
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Check for copyright-specific tip
      await waitFor(() => {
        expect(screen.getByText(/For copyright claims, providing a link to the original work/i)).toBeInTheDocument();
      });
    });

    it('should not render copyright tip for non-copyright violations', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select spam reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Expand examples
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Copyright tip should not be present
      await waitFor(() => {
        expect(screen.queryByText(/For copyright claims/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Conditional Display by Violation Type', () => {
    const violationTypes = [
      'spam',
      'hate_speech',
      'harassment',
      'inappropriate_content',
      'copyright_violation',
      'impersonation',
      'self_harm',
      'other',
    ];

    violationTypes.forEach((violationType) => {
      it(`should display examples for ${violationType}`, async () => {
        render(
          <ReportModal
            isOpen={true}
            onClose={mockOnClose}
            reportType="track"
            targetId="track-123"
          />
        );

        // Select the violation type
        const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
        fireEvent.change(reasonSelect, { target: { value: violationType } });

        // Examples section should be visible
        expect(screen.getByText('Examples of Good Reports')).toBeInTheDocument();

        // Expand examples
        const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
        fireEvent.click(examplesButton);

        // Good and bad examples should be visible
        await waitFor(() => {
          expect(screen.getByText(/Good Examples:/i)).toBeInTheDocument();
          expect(screen.getByText(/Bad Examples:/i)).toBeInTheDocument();
        });
      });
    });

    it('should not display examples when no reason is selected', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Examples section should not be visible
      expect(screen.queryByText('Examples of Good Reports')).not.toBeInTheDocument();
    });

    it('should update examples when reason changes', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);

      // Select spam
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });
      let examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Check for spam examples
      await waitFor(() => {
        expect(screen.getByText(/User posted the same promotional link/i)).toBeInTheDocument();
      });

      // Collapse examples before changing reason
      fireEvent.click(examplesButton);

      // Change to copyright violation
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Spam examples should be gone
      expect(screen.queryByText(/User posted the same promotional link/i)).not.toBeInTheDocument();

      // Expand examples again to see copyright examples
      examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      await waitFor(() => {
        expect(screen.getByText(/This track uses the melody from/i)).toBeInTheDocument();
      });
    });
  });

  describe('Visual Styling', () => {
    it('should have proper styling for good examples', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select a reason and expand examples
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Check for green styling on good examples header
      await waitFor(() => {
        const goodExamplesHeader = screen.getByText(/Good Examples:/i);
        expect(goodExamplesHeader).toHaveClass('text-green-700');
      });
    });

    it('should have proper styling for bad examples', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select a reason and expand examples
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Check for red styling on bad examples header
      await waitFor(() => {
        const badExamplesHeader = screen.getByText(/Bad Examples:/i);
        expect(badExamplesHeader).toHaveClass('text-red-700');
      });
    });

    it('should have proper styling for copyright tip', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select copyright violation and expand examples
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });
      const examplesButton = screen.getByRole('button', { name: /Examples of Good Reports/i });
      fireEvent.click(examplesButton);

      // Check for blue styling on copyright tip - find the parent div with the bg-blue-50 class
      await waitFor(() => {
        const tipText = screen.getByText(/For copyright claims/i);
        const tipContainer = tipText.closest('.bg-blue-50');
        expect(tipContainer).toBeInTheDocument();
      });
    });
  });
});
