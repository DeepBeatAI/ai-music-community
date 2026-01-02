/**
 * Integration Tests for Report Submission with Evidence
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the complete flow of submitting reports with evidence,
 * including validation, metadata storage, and error handling.
 * 
 * Requirements: 1.2, 2.2, 3.1, 3.2, 4.2
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportModal } from '@/components/moderation/ReportModal';
import { ModeratorFlagModal } from '@/components/moderation/ModeratorFlagModal';
import * as moderationService from '@/lib/moderationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');

describe('Report Submission with Evidence - Integration Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  describe('Report submission with copyright evidence', () => {
    it('should submit report with complete copyright evidence', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
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

      // Fill in description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This track uses my copyrighted melody without permission.' } 
      });

      // Fill in copyright evidence
      const linkInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(linkInput, { 
        target: { value: 'https://example.com/my-original-song' } 
      });

      const proofTextarea = screen.getByLabelText(/Proof of ownership/i);
      fireEvent.change(proofTextarea, { 
        target: { value: 'I am the registered copyright holder. Registration number: ABC123.' } 
      });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'track',
          targetId: 'track-123',
          reason: 'copyright_violation',
          description: 'This track uses my copyrighted melody without permission.',
          metadata: {
            originalWorkLink: 'https://example.com/my-original-song',
            proofOfOwnership: 'I am the registered copyright holder. Registration number: ABC123.',
            audioTimestamp: undefined,
          },
        });
      });

      // Verify success toast
      expect(mockShowToast).toHaveBeenCalledWith(
        'Report submitted successfully. Our moderation team will review it.',
        'success'
      );

      // Verify modal closed
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should submit report with partial copyright evidence', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-456"
        />
      );

      // Select copyright violation
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Fill in description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This post contains my copyrighted image without attribution.' } 
      });

      // Fill in only link (not proof)
      const linkInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(linkInput, { 
        target: { value: 'https://example.com/my-photo' } 
      });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission with partial evidence
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'post',
          targetId: 'post-456',
          reason: 'copyright_violation',
          description: 'This post contains my copyrighted image without attribution.',
          metadata: {
            originalWorkLink: 'https://example.com/my-photo',
            proofOfOwnership: undefined,
            audioTimestamp: undefined,
          },
        });
      });
    });
  });

  describe('Report submission with audio timestamp', () => {
    it('should submit report with audio timestamp for hate speech', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-789"
        />
      );

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Fill in description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This track contains hate speech targeting a specific group at the marked timestamp.' } 
      });

      // Fill in timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '2:35' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'track',
          targetId: 'track-789',
          reason: 'hate_speech',
          description: 'This track contains hate speech targeting a specific group at the marked timestamp.',
          metadata: {
            originalWorkLink: undefined,
            proofOfOwnership: undefined,
            audioTimestamp: '2:35',
          },
        });
      });
    });

    it('should submit report with audio timestamp for harassment', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-101"
        />
      );

      // Select harassment
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'harassment' } });

      // Fill in description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This track contains harassing content directed at an individual.' } 
      });

      // Fill in timestamp with HH:MM:SS format
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '1:23:45' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'track',
          targetId: 'track-101',
          reason: 'harassment',
          description: 'This track contains harassing content directed at an individual.',
          metadata: {
            originalWorkLink: undefined,
            proofOfOwnership: undefined,
            audioTimestamp: '1:23:45',
          },
        });
      });
    });
  });

  describe('Report submission without evidence', () => {
    it('should submit report without any evidence fields', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="comment"
          targetId="comment-202"
        />
      );

      // Select spam (no evidence fields for this reason)
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Fill in description only
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This comment is spam promoting external services.' } 
      });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission without evidence
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'comment',
          targetId: 'comment-202',
          reason: 'spam',
          description: 'This comment is spam promoting external services.',
          metadata: {
            originalWorkLink: undefined,
            proofOfOwnership: undefined,
            audioTimestamp: undefined,
          },
        });
      });
    });

    it('should submit copyright report without optional evidence', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="album"
          targetId="album-303"
        />
      );

      // Select copyright violation
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Fill in description only (leave evidence fields empty)
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This album contains copyrighted material without proper licensing.' } 
      });

      // Submit without filling evidence fields
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission without evidence
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'album',
          targetId: 'album-303',
          reason: 'copyright_violation',
          description: 'This album contains copyrighted material without proper licensing.',
          metadata: {
            originalWorkLink: undefined,
            proofOfOwnership: undefined,
            audioTimestamp: undefined,
          },
        });
      });
    });
  });

  describe('Validation error handling for short descriptions', () => {
    it('should prevent submission with description under 20 characters', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="post"
          targetId="post-404"
        />
      );

      // Select reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Fill in short description (19 characters)
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'This is spam post' } }); // 17 chars

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission was prevented
      await waitFor(() => {
        expect(mockSubmitReport).not.toHaveBeenCalled();
      });

      // Verify error message
      expect(screen.getByText(/Please provide at least 20 characters describing the violation/i)).toBeInTheDocument();

      // Verify modal did not close
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show error for empty description', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="user"
          targetId="user-505"
        />
      );

      // Select reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'harassment' } });

      // Leave description empty
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { target: { value: '' } });

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission was prevented
      await waitFor(() => {
        expect(mockSubmitReport).not.toHaveBeenCalled();
      });

      // Verify error message
      expect(screen.getByText(/Please provide at least 20 characters describing the violation/i)).toBeInTheDocument();
    });

    it('should allow submission with exactly 20 characters', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-606"
        />
      );

      // Select reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'inappropriate_content' } });

      // Fill in description with exactly 20 characters
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'Inappropriate audio!' } }); // Exactly 20 chars

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify submission succeeded
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalled();
      });
    });
  });

  describe('Metadata storage and retrieval', () => {
    it('should store and retrieve complete metadata', async () => {
      const mockSubmitReport = moderationService.submitReport as jest.MockedFunction<typeof moderationService.submitReport>;
      mockSubmitReport.mockResolvedValue(undefined as any);

      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-707"
        />
      );

      // Select copyright violation
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Fill in all fields
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'Complete copyright violation with full evidence provided.' } 
      });

      const linkInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(linkInput, { target: { value: 'https://original.com/work' } });

      const proofTextarea = screen.getByLabelText(/Proof of ownership/i);
      fireEvent.change(proofTextarea, { target: { value: 'Copyright registration details' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitButton);

      // Verify complete metadata was passed
      await waitFor(() => {
        const callArgs = mockSubmitReport.mock.calls[0][0];
        expect(callArgs.metadata).toEqual({
          originalWorkLink: 'https://original.com/work',
          proofOfOwnership: 'Copyright registration details',
          audioTimestamp: undefined,
        });
      });
    });
  });

  describe('Moderator flag with evidence', () => {
    it('should submit moderator flag with evidence', async () => {
      const mockModeratorFlagContent = moderationService.moderatorFlagContent as jest.MockedFunction<typeof moderationService.moderatorFlagContent>;
      mockModeratorFlagContent.mockResolvedValue(undefined as any);

      render(
        <ModeratorFlagModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-808"
        />
      );

      // Select copyright violation
      const reasonSelect = screen.getByLabelText(/Reason for flagging/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Fill in internal notes (required for moderators)
      const notesTextarea = screen.getByLabelText(/Additional details/i);
      fireEvent.change(notesTextarea, { 
        target: { value: 'Flagging for copyright review with evidence.' } 
      });

      // Fill in evidence
      const linkInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(linkInput, { target: { value: 'https://original.com/track' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Flag Content/i });
      fireEvent.click(submitButton);

      // Verify submission
      await waitFor(() => {
        expect(mockModeratorFlagContent).toHaveBeenCalledWith({
          reportType: 'track',
          targetId: 'track-808',
          reason: 'copyright_violation',
          internalNotes: 'Flagging for copyright review with evidence.',
          priority: expect.any(Number),
          metadata: {
            originalWorkLink: 'https://original.com/track',
            proofOfOwnership: undefined,
            audioTimestamp: undefined,
          },
        });
      });
    });
  });
});
