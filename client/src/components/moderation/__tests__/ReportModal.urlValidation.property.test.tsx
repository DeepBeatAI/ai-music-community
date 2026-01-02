/**
 * Property-Based Tests for URL Validation
 * Feature: enhanced-report-evidence, Property 15
 * 
 * These tests validate URL format validation using property-based testing.
 * Tests various invalid URL formats, valid URL formats, and empty/null handling.
 * 
 * Validates: Requirements 10.1
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportModal } from '@/components/moderation/ReportModal';
import * as moderationService from '@/lib/moderationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');

describe('ReportModal - URL Validation Property Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  /**
   * Property 15: URL Format Validation
   * Feature: enhanced-report-evidence, Property 15
   * 
   * For any report submission with an original work link, the system should validate
   * that it is a properly formatted URL and reject invalid formats with a clear error message.
   * 
   * Validates: Requirements 10.1
   */
  describe('Property 15: URL Format Validation', () => {
    it('should accept valid HTTP URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http'] }),
          async (validUrl) => {
            const { unmount } = render(
              <ReportModal
                isOpen={true}
                onClose={mockOnClose}
                reportType="track"
                targetId="track-123"
              />
            );

            // Select copyright violation
            const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
            fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

            // Enter valid URL
            const urlInput = screen.getByLabelText(/Link to original work/i);
            fireEvent.change(urlInput, { target: { value: validUrl } });

            // Trigger blur to validate
            fireEvent.blur(urlInput);

            // Wait a bit to ensure no error appears
            await waitFor(() => {
              expect(screen.queryByText(/Please enter a valid URL/i)).not.toBeInTheDocument();
            }, { timeout: 500 });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid HTTPS URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['https'] }),
          async (validUrl) => {
            const { unmount } = render(
              <ReportModal
                isOpen={true}
                onClose={mockOnClose}
                reportType="track"
                targetId="track-123"
              />
            );

            // Select copyright violation
            const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
            fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

            // Enter valid URL
            const urlInput = screen.getByLabelText(/Link to original work/i);
            fireEvent.change(urlInput, { target: { value: validUrl } });

            // Trigger blur to validate
            fireEvent.blur(urlInput);

            // Wait a bit to ensure no error appears
            await waitFor(() => {
              expect(screen.queryByText(/Please enter a valid URL/i)).not.toBeInTheDocument();
            }, { timeout: 500 });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid URL formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('not-a-url'),
            fc.constant('ftp://invalid-protocol.com'),
            fc.constant('javascript:alert(1)'),
            fc.constant('file:///etc/passwd'),
            fc.constant('//missing-protocol.com'),
            fc.constant('http://'),
            fc.constant('https://'),
            fc.constant('just some text'),
            fc.constant('www.missing-protocol.com'),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('http://') && !s.includes('https://'))
          ),
          async (invalidUrl) => {
            const { unmount } = render(
              <ReportModal
                isOpen={true}
                onClose={mockOnClose}
                reportType="track"
                targetId="track-123"
              />
            );

            // Select copyright violation
            const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
            fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

            // Enter invalid URL
            const urlInput = screen.getByLabelText(/Link to original work/i);
            fireEvent.change(urlInput, { target: { value: invalidUrl } });

            // Trigger blur to validate
            fireEvent.blur(urlInput);

            // Error message should appear
            await waitFor(() => {
              expect(screen.getByText(/Please enter a valid URL/i)).toBeInTheDocument();
            });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept empty/null URLs (optional field)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '), // whitespace only
            fc.constant('\t'),
            fc.constant('\n')
          ),
          async (emptyUrl) => {
            const { unmount } = render(
              <ReportModal
                isOpen={true}
                onClose={mockOnClose}
                reportType="track"
                targetId="track-123"
              />
            );

            // Select copyright violation
            const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
            fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

            // Enter empty URL
            const urlInput = screen.getByLabelText(/Link to original work/i);
            fireEvent.change(urlInput, { target: { value: emptyUrl } });

            // Trigger blur to validate
            fireEvent.blur(urlInput);

            // No error should appear (empty is valid)
            await waitFor(() => {
              expect(screen.queryByText(/Please enter a valid URL/i)).not.toBeInTheDocument();
            }, { timeout: 500 });

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent submission with invalid URL and display error', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select copyright violation
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Enter valid description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'This is a valid description with more than 20 characters' } });

      // Enter invalid URL and trigger blur to show error
      const urlInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } });
      fireEvent.blur(urlInput);

      // Error message should appear after blur
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid URL (e.g., https://example.com)')).toBeInTheDocument();
      });

      // Try to submit - should be prevented
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Submission should not happen
      await waitFor(() => {
        expect(mockSubmitReport).not.toHaveBeenCalled();
      });

      unmount();
    });

    it('should allow submission with valid URL', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['https'] }),
          async (validUrl) => {
            const { unmount } = render(
              <ReportModal
                isOpen={true}
                onClose={mockOnClose}
                reportType="track"
                targetId="track-123"
              />
            );

            // Select copyright violation
            const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
            fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

            // Enter valid description
            const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
            fireEvent.change(descriptionTextarea, { target: { value: 'This is a valid description with more than 20 characters' } });

            // Enter valid URL
            const urlInput = screen.getByLabelText(/Link to original work/i);
            fireEvent.change(urlInput, { target: { value: validUrl } });

            // Submit
            const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
            fireEvent.click(submitButton);

            // Submission should happen
            await waitFor(() => {
              expect(mockSubmitReport).toHaveBeenCalled();
            });

            // Verify URL was included in metadata
            const callArgs = mockSubmitReport.mock.calls[0][0];
            expect(callArgs.metadata?.originalWorkLink).toBe(validUrl);

            mockSubmitReport.mockClear();
            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear URL error when valid URL is entered', async () => {
      const { unmount } = render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select copyright violation
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Enter invalid URL
      const urlInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(urlInput, { target: { value: 'not-a-url' } });
      fireEvent.blur(urlInput);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid URL/i)).toBeInTheDocument();
      });

      // Enter valid URL
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      fireEvent.blur(urlInput);

      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText(/Please enter a valid URL/i)).not.toBeInTheDocument();
      });

      unmount();
    });
  });
});
