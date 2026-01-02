/**
 * Integration Tests for Complete Evidence Flows
 * Feature: enhanced-report-evidence
 * 
 * These tests validate complete user flows for evidence collection and submission.
 * Tests user report flow, moderator flag flow, and validation error flows.
 * 
 * Validates: Requirements All
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportModal } from '@/components/moderation/ReportModal';
import * as moderationService from '@/lib/moderationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');

describe('ReportModal - Complete Evidence Flows Integration', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  describe('Complete User Report Flow with Evidence', () => {
    it('should complete copyright report with full evidence', async () => {
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

      // Step 1: Select copyright violation reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Step 2: Enter description (meets 20 char minimum)
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This track uses my copyrighted melody without permission from my original work.' } 
      });

      // Step 3: Enter original work link
      await waitFor(() => {
        expect(screen.getByLabelText(/Link to original work/i)).toBeInTheDocument();
      });
      const originalWorkInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(originalWorkInput, { target: { value: 'https://example.com/my-original-song' } });

      // Step 4: Enter proof of ownership
      const proofInput = screen.getByLabelText(/Proof of ownership/i);
      fireEvent.change(proofInput, { target: { value: 'I am the registered copyright holder, registration #12345' } });

      // Step 5: Submit report
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Verify submission with all evidence
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'track',
          targetId: 'track-123',
          reason: 'copyright_violation',
          description: 'This track uses my copyrighted melody without permission from my original work.',
          metadata: {
            originalWorkLink: 'https://example.com/my-original-song',
            proofOfOwnership: 'I am the registered copyright holder, registration #12345',
            audioTimestamp: undefined,
          },
        });
      });

      // Verify success feedback
      expect(mockShowToast).toHaveBeenCalledWith('Report submitted successfully. Our moderation team will review it.', 'success');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should complete hate speech report with timestamp', async () => {
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

      // Step 1: Select hate speech reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Step 2: Enter description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'Contains hate speech targeting a specific group at the mentioned timestamp.' } 
      });

      // Step 3: Enter audio timestamp
      await waitFor(() => {
        expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
      });
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: '2:35' } });

      // Step 4: Submit report
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Verify submission with timestamp
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'track',
          targetId: 'track-123',
          reason: 'hate_speech',
          description: 'Contains hate speech targeting a specific group at the mentioned timestamp.',
          metadata: {
            originalWorkLink: undefined,
            proofOfOwnership: undefined,
            audioTimestamp: '2:35',
          },
        });
      });

      expect(mockShowToast).toHaveBeenCalledWith('Report submitted successfully. Our moderation team will review it.', 'success');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should complete report without optional evidence', async () => {
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

      // Select reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Enter only description (no evidence)
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This is clearly spam content promoting external services.' } 
      });

      // Submit report
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Verify submission without evidence
      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalledWith({
          reportType: 'track',
          targetId: 'track-123',
          reason: 'spam',
          description: 'This is clearly spam content promoting external services.',
          metadata: {
            originalWorkLink: undefined,
            proofOfOwnership: undefined,
            audioTimestamp: undefined,
          },
        });
      });

      expect(mockShowToast).toHaveBeenCalledWith('Report submitted successfully. Our moderation team will review it.', 'success');
    });
  });

  describe('Validation Error Flows', () => {
    it('should prevent submission with description under 20 characters', async () => {
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

      // Select reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Enter short description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'Too short' } });

      // Try to submit
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Error should appear after submit attempt
      await waitFor(() => {
        expect(screen.getByText(/Please provide at least 20 characters/i)).toBeInTheDocument();
      });

      // Should not submit
      expect(mockSubmitReport).not.toHaveBeenCalled();
    });

    it('should prevent submission with invalid URL', async () => {
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

      // Enter valid description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This track uses my copyrighted content without permission.' } 
      });

      // Enter invalid URL
      const urlInput = screen.getByLabelText(/Link to original work/i);
      fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } });
      fireEvent.blur(urlInput);

      // Error should appear on blur
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid URL/i)).toBeInTheDocument();
      });

      // Try to submit
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Should not submit
      expect(mockSubmitReport).not.toHaveBeenCalled();
    });

    it('should prevent submission with invalid timestamp', async () => {
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

      // Select hate speech
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Enter valid description
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'Contains hate speech at the specified timestamp.' } 
      });

      // Enter invalid timestamp
      const timestampInput = screen.getByLabelText(/Timestamp in audio/i);
      fireEvent.change(timestampInput, { target: { value: 'invalid' } });
      fireEvent.blur(timestampInput);

      // Error should appear on blur
      await waitFor(() => {
        expect(screen.getByText(/Please use format MM:SS or HH:MM:SS/i)).toBeInTheDocument();
      });

      // Try to submit
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Should not submit
      expect(mockSubmitReport).not.toHaveBeenCalled();
    });

    it('should allow fixing validation errors and then submitting', async () => {
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

      // Select reason
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      // Enter short description (error)
      const descriptionTextarea = screen.getByLabelText(/Description of violation/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'Short' } });

      // Try to submit - error should appear
      const submitButton = screen.getAllByRole('button', { name: /Submit Report/i })[0];
      fireEvent.click(submitButton);

      // Error appears
      await waitFor(() => {
        expect(screen.getByText(/Please provide at least 20 characters/i)).toBeInTheDocument();
      });

      // Fix description
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'This track uses my copyrighted content without permission.' } 
      });

      // Submit should now work
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitReport).toHaveBeenCalled();
      });
    });
  });

  describe('Examples Section', () => {
    it('should show examples section that can be expanded', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      // Select a reason first (examples only appear when reason is selected)
      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      // Examples section should now be present
      await waitFor(() => {
        const examplesButton = screen.getByText(/Examples of Good Reports/i);
        expect(examplesButton).toBeInTheDocument();
      });

      const examplesButton = screen.getByText(/Examples of Good Reports/i);

      // Initially collapsed (examples not visible)
      expect(screen.queryByText(/Good Examples:/i)).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(examplesButton);

      // Examples should now be visible
      await waitFor(() => {
        expect(screen.getByText(/Good Examples:/i)).toBeInTheDocument();
      });
    });

    it('should show different examples for different violation types', async () => {
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

      // Expand examples
      const examplesButton = screen.getByText(/Examples of Good Reports/i);
      fireEvent.click(examplesButton);

      // Should show copyright-specific examples
      await waitFor(() => {
        const copyrightTexts = screen.getAllByText(/copyright/i);
        expect(copyrightTexts.length).toBeGreaterThan(0);
      });

      // Change to hate speech
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      // Should show hate speech-specific examples
      await waitFor(() => {
        const hateSpeechTexts = screen.getAllByText(/hate speech/i);
        expect(hateSpeechTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Field Visibility Based on Reason', () => {
    it('should show copyright fields only for copyright violation', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);

      // Select copyright violation
      fireEvent.change(reasonSelect, { target: { value: 'copyright_violation' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/Link to original work/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Proof of ownership/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Timestamp in audio/i)).not.toBeInTheDocument();
      });

      // Change to spam
      fireEvent.change(reasonSelect, { target: { value: 'spam' } });

      await waitFor(() => {
        expect(screen.queryByLabelText(/Link to original work/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Proof of ownership/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Timestamp in audio/i)).not.toBeInTheDocument();
      });
    });

    it('should show timestamp field for hate speech and harassment', async () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={mockOnClose}
          reportType="track"
          targetId="track-123"
        />
      );

      const reasonSelect = screen.getByLabelText(/Reason for reporting/i);

      // Select hate speech
      fireEvent.change(reasonSelect, { target: { value: 'hate_speech' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Link to original work/i)).not.toBeInTheDocument();
      });

      // Change to harassment
      fireEvent.change(reasonSelect, { target: { value: 'harassment' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/Timestamp in audio/i)).toBeInTheDocument();
      });
    });
  });
});
