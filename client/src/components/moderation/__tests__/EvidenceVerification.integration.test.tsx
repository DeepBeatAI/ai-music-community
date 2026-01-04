/**
 * Integration tests for Evidence Verification UI
 * Requirements: 9.6, 9.7
 * 
 * Tests:
 * - Checkbox appears when evidence exists
 * - Checkbox does not appear when no evidence
 * - Notes field character limit
 * - Verification data is saved correctly
 * - Verification status displays in history
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModerationActionPanel } from '../ModerationActionPanel';

// Mock contexts
const mockAuthContext = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'moderator@test.com',
  },
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
};

const mockToastContext = {
  showToast: jest.fn(),
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => mockToastContext,
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

// Mock moderation service
jest.mock('@/lib/moderationService', () => ({
  ...jest.requireActual('@/lib/moderationService'),
  takeModerationAction: jest.fn(),
  getUserModerationHistory: jest.fn(),
  calculateReporterAccuracy: jest.fn(),
  detectRepeatOffender: jest.fn(),
  calculateViolationTimeline: jest.fn(),
}));

import { takeModerationAction } from '@/lib/moderationService';

describe('Evidence Verification Integration Tests', () => {
  const mockUser = mockAuthContext.user;
  const mockShowToast = mockToastContext.showToast;

  const mockReportWithEvidence = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    report_type: 'track' as const,
    target_id: '550e8400-e29b-41d4-a716-446655440003',
    reason: 'copyright_violation' as const,
    description: 'This track uses copyrighted material',
    status: 'pending' as const,
    reporter_id: '550e8400-e29b-41d4-a716-446655440004',
    reported_user_id: '550e8400-e29b-41d4-a716-446655440005',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    priority: 1,
    moderator_flagged: false,
    reviewed_by: null,
    reviewed_at: null,
    resolution_notes: null,
    action_taken: null,
    metadata: {
      originalWorkLink: 'https://example.com/original',
      proofOfOwnership: 'I am the copyright holder',
    },
  };

  const mockReportWithoutEvidence = {
    ...mockReportWithEvidence,
    metadata: null,
  };

  const mockUserHistory = {
    total_reports: 5,
    total_actions: 3,
    recent_actions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserHistory,
            error: null,
          }),
        }),
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });

    (takeModerationAction as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Checkbox appears when evidence exists', () => {
    it('should display evidence verification checkbox when report has evidence', () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Check for evidence verification section
      expect(screen.getByText('Evidence Verification')).toBeInTheDocument();
      expect(screen.getByLabelText(/Evidence Verified/i)).toBeInTheDocument();
    });

    it('should display verification notes field when evidence exists', () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      expect(screen.getByPlaceholderText(/Add notes about evidence verification/i)).toBeInTheDocument();
    });
  });

  describe('Checkbox does not appear when no evidence', () => {
    it('should not display evidence verification section when report has no evidence', () => {
      render(
        <ModerationActionPanel
          report={mockReportWithoutEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Evidence verification section should not be present
      expect(screen.queryByText('Evidence Verification')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Evidence Verified/i)).not.toBeInTheDocument();
    });
  });

  describe('Notes field character limit', () => {
    it('should display character counter for verification notes', () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Check for character counter
      expect(screen.getByText(/0 \/ 500/)).toBeInTheDocument();
    });

    it('should update character counter as user types', () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      const notesField = screen.getByPlaceholderText(/Add notes about evidence verification/i);
      fireEvent.change(notesField, { target: { value: 'Test notes' } });

      expect(screen.getByText(/10 \/ 500/)).toBeInTheDocument();
    });

    it('should prevent input beyond 500 characters', () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      const notesField = screen.getByPlaceholderText(/Add notes about evidence verification/i) as HTMLTextAreaElement;
      const longText = 'a'.repeat(501);
      
      fireEvent.change(notesField, { target: { value: longText } });

      // Should be truncated to 500 characters
      expect(notesField.value.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Verification data is saved correctly', () => {
    it('should include evidenceVerified when checkbox is checked', async () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Check the evidence verified checkbox
      const checkbox = screen.getByLabelText(/Evidence Verified/i);
      fireEvent.click(checkbox);

      // Select an action and submit
      const actionSelect = screen.getByLabelText(/Action/i);
      fireEvent.change(actionSelect, { target: { value: 'content_removed' } });

      const submitButton = screen.getByText(/Take Action/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(takeModerationAction).toHaveBeenCalledWith(
          expect.objectContaining({
            evidenceVerified: true,
          })
        );
      });
    });

    it('should include verificationNotes when notes are provided', async () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Add verification notes
      const notesField = screen.getByPlaceholderText(/Add notes about evidence verification/i);
      fireEvent.change(notesField, { target: { value: 'Verified with original work link' } });

      // Select an action and submit
      const actionSelect = screen.getByLabelText(/Action/i);
      fireEvent.change(actionSelect, { target: { value: 'content_removed' } });

      const submitButton = screen.getByText(/Take Action/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(takeModerationAction).toHaveBeenCalledWith(
          expect.objectContaining({
            verificationNotes: 'Verified with original work link',
          })
        );
      });
    });

    it('should include both evidenceVerified and verificationNotes', async () => {
      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Check the checkbox
      const checkbox = screen.getByLabelText(/Evidence Verified/i);
      fireEvent.click(checkbox);

      // Add notes
      const notesField = screen.getByPlaceholderText(/Add notes about evidence verification/i);
      fireEvent.change(notesField, { target: { value: 'Verified copyright claim' } });

      // Select an action and submit
      const actionSelect = screen.getByLabelText(/Action/i);
      fireEvent.change(actionSelect, { target: { value: 'content_removed' } });

      const submitButton = screen.getByText(/Take Action/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(takeModerationAction).toHaveBeenCalledWith(
          expect.objectContaining({
            evidenceVerified: true,
            verificationNotes: 'Verified copyright claim',
          })
        );
      });
    });
  });

  describe('Verification status displays in history', () => {
    it('should display "Evidence Verified" badge for verified actions', () => {
      const mockActionWithVerification = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        action_type: 'content_removed',
        reason: 'copyright',
        created_at: new Date().toISOString(),
        internal_notes: 'Removed copyrighted content',
        metadata: {
          evidence_verification: {
            verified: true,
            notes: 'Verified with original work link',
            verified_at: new Date().toISOString(),
            verified_by: mockUser.id,
          },
        },
      };

      const mockHistoryWithVerification = {
        ...mockUserHistory,
        recent_actions: [mockActionWithVerification],
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockHistoryWithVerification,
              error: null,
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Check for verification badge in history
      expect(screen.getByText(/✁EEvidence Verified/i)).toBeInTheDocument();
    });

    it('should display verification notes in expandable section', () => {
      const mockActionWithVerification = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        action_type: 'content_removed',
        reason: 'copyright',
        created_at: new Date().toISOString(),
        internal_notes: 'Removed copyrighted content',
        metadata: {
          evidence_verification: {
            verified: true,
            notes: 'Verified with original work link and proof of ownership',
            verified_at: new Date().toISOString(),
            verified_by: mockUser.id,
          },
        },
      };

      const mockHistoryWithVerification = {
        ...mockUserHistory,
        recent_actions: [mockActionWithVerification],
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockHistoryWithVerification,
              error: null,
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Check for verification notes details
      const detailsElement = screen.getByText(/Verification Notes/i);
      expect(detailsElement).toBeInTheDocument();

      // Click to expand
      fireEvent.click(detailsElement);

      // Check that notes are displayed
      expect(screen.getByText(/Verified with original work link and proof of ownership/i)).toBeInTheDocument();
    });

    it('should not display verification badge for unverified actions', () => {
      const mockActionWithoutVerification = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        action_type: 'content_removed',
        reason: 'copyright',
        created_at: new Date().toISOString(),
        internal_notes: 'Removed copyrighted content',
        metadata: null,
      };

      const mockHistoryWithoutVerification = {
        ...mockUserHistory,
        recent_actions: [mockActionWithoutVerification],
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockHistoryWithoutVerification,
              error: null,
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      render(
        <ModerationActionPanel
          report={mockReportWithEvidence}
          onClose={jest.fn()}
          onActionComplete={jest.fn()}
        />
      );

      // Verification badge should not be present
      expect(screen.queryByText(/✁EEvidence Verified/i)).not.toBeInTheDocument();
    });
  });
});
