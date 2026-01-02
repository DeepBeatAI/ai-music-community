/**
 * Property-Based Tests for ReportModal Evidence Fields
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the correctness properties defined in the design document
 * using property-based testing with fast-check library.
 * 
 * Each test runs 100 iterations with randomly generated inputs to ensure
 * universal properties hold across all valid inputs.
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

describe('ReportModal - Evidence Fields Property Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  /**
   * Property 1: Evidence Metadata Round-Trip
   * Feature: enhanced-report-evidence, Property 1
   * 
   * For any report with evidence fields (copyright link, proof of ownership, or audio timestamp),
   * submitting the report should preserve all provided evidence in the metadata field.
   * 
   * Validates: Requirements 1.2, 2.2, 4.2
   */
  test('Property 1: Evidence metadata round-trip', async () => {
    const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
    mockSubmitReport.mockResolvedValue(undefined as any);

    await fc.assert(
      fc.asyncProperty(
        // Generate random evidence data
        fc.record({
          originalWorkLink: fc.option(fc.webUrl(), { nil: undefined }),
          proofOfOwnership: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          audioTimestamp: fc.option(
            fc.oneof(
              fc.tuple(fc.integer({ min: 0, max: 59 }), fc.integer({ min: 0, max: 59 }))
                .map(([m, s]) => `${m}:${s.toString().padStart(2, '0')}`),
              fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }), fc.integer({ min: 0, max: 59 }))
                .map(([h, m, s]) => `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
            ),
            { nil: undefined }
          ),
        }),
        fc.constantFrom('copyright_violation', 'hate_speech', 'harassment'),
        fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length >= 20), // Valid description with non-whitespace content
        async (evidence, reason, description) => {
          // Render the modal
          const { unmount } = render(
            <ReportModal
              isOpen={true}
              onClose={mockOnClose}
              reportType="track"
              targetId="track-123"
            />
          );

          // Select reason
          const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
          fireEvent.change(reasonSelect, { target: { value: reason } });

          // Fill in description
          const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
          fireEvent.change(descriptionTextarea, { target: { value: description } });

          // Fill in evidence fields based on reason
          if (reason === 'copyright_violation' && evidence.originalWorkLink) {
            const linkInput = screen.getByLabelText(/Link to original work/i);
            fireEvent.change(linkInput, { target: { value: evidence.originalWorkLink } });
          }

          if (reason === 'copyright_violation' && evidence.proofOfOwnership) {
            const proofTextarea = screen.getByLabelText(/Proof of ownership/i);
            fireEvent.change(proofTextarea, { target: { value: evidence.proofOfOwnership } });
          }

          if ((reason === 'hate_speech' || reason === 'harassment') && evidence.audioTimestamp) {
            const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
            fireEvent.change(timestampInput, { target: { value: evidence.audioTimestamp } });
          }

          // Submit the form
          const submitButtons = screen.getAllByRole('button', { name: /Submit Report/i });
          fireEvent.click(submitButtons[0]);

          // Wait for submission
          await waitFor(() => {
            expect(mockSubmitReport).toHaveBeenCalled();
          });

          // Verify the metadata was passed correctly
          const callArgs = mockSubmitReport.mock.calls[0][0];
          
          // Build expected metadata based on reason (matching component's trim behavior)
          const expectedMetadata: any = {};
          if (reason === 'copyright_violation') {
            // Component trims and converts empty strings to undefined
            const trimmedLink = evidence.originalWorkLink?.trim();
            const trimmedProof = evidence.proofOfOwnership?.trim();
            
            if (trimmedLink) {
              expectedMetadata.originalWorkLink = trimmedLink;
            }
            if (trimmedProof) {
              expectedMetadata.proofOfOwnership = trimmedProof;
            }
          }
          if (reason === 'hate_speech' || reason === 'harassment') {
            const trimmedTimestamp = evidence.audioTimestamp?.trim();
            if (trimmedTimestamp) {
              expectedMetadata.audioTimestamp = trimmedTimestamp;
            }
          }

          // Verify metadata matches expected
          if (Object.keys(expectedMetadata).length > 0) {
            expect(callArgs.metadata).toBeDefined();
            if (callArgs.metadata) {
              Object.keys(expectedMetadata).forEach(key => {
                expect(callArgs.metadata![key as keyof typeof callArgs.metadata]).toEqual(expectedMetadata[key]);
              });
            }
          }

          // Clean up for next iteration
          mockSubmitReport.mockClear();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Copyright Evidence Fields Display
   * Feature: enhanced-report-evidence, Property 2
   * 
   * For any report form where copyright violation is selected as the reason,
   * the form should display optional fields for original work link and proof of ownership.
   * 
   * Validates: Requirements 1.1
   */
  test('Property 2: Copyright evidence fields display', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('track', 'post', 'comment', 'album', 'user'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (reportType, targetId) => {
          // Render the modal
          const { unmount } = render(
            <ReportModal
              isOpen={true}
              onClose={mockOnClose}
              reportType={reportType as any}
              targetId={targetId}
            />
          );

          // Select copyright violation reason
          const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
          fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

          // Wait for evidence fields to appear
          await waitFor(() => {
            // Verify copyright evidence fields are displayed
            expect(screen.getByLabelText(/Link to original work/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Proof of ownership/i)).toBeInTheDocument();
          });

          // Verify the fields are optional (no required indicator)
          const linkInput = screen.getByLabelText(/Link to original work/i);
          const proofTextarea = screen.getByLabelText(/Proof of ownership/i);
          
          expect(linkInput).not.toBeRequired();
          expect(proofTextarea).not.toBeRequired();

          // Verify helper text is present
          expect(screen.getByText(/Providing evidence helps moderators process your report faster/i)).toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Audio Timestamp Field Display
   * Feature: enhanced-report-evidence, Property 3
   * 
   * For any audio content report where hate speech, harassment, or inappropriate content is selected as the reason,
   * the form should display an optional timestamp field.
   * 
   * Validates: Requirements 2.1
   */
  test('Property 3: Audio timestamp field display', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('hate_speech', 'harassment', 'inappropriate_content'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (reason, targetId) => {
          // Render the modal for track (audio content)
          const { unmount } = render(
            <ReportModal
              isOpen={true}
              onClose={mockOnClose}
              reportType="track"
              targetId={targetId}
            />
          );

          // Select the reason
          const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
          fireEvent.change(reasonSelect, { target: { value: reason } });

          // Wait for timestamp field to appear
          await waitFor(() => {
            // Verify timestamp field is displayed
            expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
          });

          // Verify the field is optional
          const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
          expect(timestampInput).not.toBeRequired();

          // Verify helper text is present
          expect(screen.getByText(/Help moderators find the violation quickly/i)).toBeInTheDocument();
          expect(screen.getByText(/Format: MM:SS or HH:MM:SS/i)).toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Description Minimum Length Validation
   * Feature: enhanced-report-evidence, Property 4
   * 
   * For any report submission with a description shorter than 20 characters,
   * the system should reject the submission.
   * 
   * Validates: Requirements 3.1
   */
  test('Property 4: Description minimum length validation', async () => {
    const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
    mockSubmitReport.mockResolvedValue(undefined as any);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 19 }), // Strings shorter than 20 chars
        fc.constantFrom('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'copyright_violation', 'other'),
        async (shortDescription, reason) => {
          // Render the modal
          const { unmount } = render(
            <ReportModal
              isOpen={true}
              onClose={mockOnClose}
              reportType="track"
              targetId="track-123"
            />
          );

          // Select reason
          const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
          fireEvent.change(reasonSelect, { target: { value: reason } });

          // Fill in short description
          const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
          fireEvent.change(descriptionTextarea, { target: { value: shortDescription } });

          // Try to submit
          const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
          fireEvent.click(submitButton);

          // Wait a bit to ensure no submission happens
          await waitFor(() => {
            // Verify submitReport was NOT called
            expect(mockSubmitReport).not.toHaveBeenCalled();
          });

          // Verify error message is displayed
          expect(screen.getByText(/Please provide at least 20 characters describing the violation/i)).toBeInTheDocument();

          // Clean up
          mockSubmitReport.mockClear();
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Description Validation Error Message
   * Feature: enhanced-report-evidence, Property 5
   * 
   * For any report submission rejected due to insufficient description length,
   * the system should display a clear error message indicating the 20-character minimum.
   * 
   * Validates: Requirements 3.2
   */
  test('Property 5: Description validation error message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 19 }), // Strings shorter than 20 chars
        fc.constantFrom('spam', 'harassment', 'hate_speech'),
        async (shortDescription, reason) => {
          // Render the modal
          const { unmount } = render(
            <ReportModal
              isOpen={true}
              onClose={mockOnClose}
              reportType="post"
              targetId="post-123"
            />
          );

          // Select reason
          const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
          fireEvent.change(reasonSelect, { target: { value: reason } });

          // Fill in short description
          const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
          fireEvent.change(descriptionTextarea, { target: { value: shortDescription } });

          // Try to submit
          const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
          fireEvent.click(submitButton);

          // Verify error message appears
          await waitFor(() => {
            const errorMessage = screen.getByText(/Please provide at least 20 characters describing the violation/i);
            expect(errorMessage).toBeInTheDocument();
            expect(errorMessage).toHaveClass('text-red-500');
          });

          // Note: The "Minimum 20 characters required" helper text is replaced by the error message
          // when validation fails, so we don't check for it here

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
