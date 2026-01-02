/**
 * Integration Tests for Evidence Display Flow
 * Feature: enhanced-report-evidence
 * 
 * These tests validate the complete evidence display flow from report submission
 * to display in the moderation interface.
 * 
 * Requirements: 7.1, 7.2, 8.1, 9.1
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ModerationActionPanel } from '@/components/moderation/ModerationActionPanel';
import { ReportCard } from '@/components/moderation/ReportCard';
import { Report, ReportMetadata } from '@/types/moderation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as moderationService from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/moderationService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');
jest.mock('@/lib/supabase');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('Evidence Display Integration Tests', () => {
  const mockUser = { id: 'moderator-123', email: 'moderator@example.com' };
  const mockShowToast = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnActionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
    (moderationService.isAdmin as jest.Mock).mockResolvedValue(true);
  });

  /**
   * Test: Evidence display with all field types
   * Validates that all evidence fields are displayed correctly when present
   * Requirements: 8.1
   */
  test('displays evidence with all field types', async () => {
    const mockReport: Report = {
      id: 'report-123',
      report_type: 'track',
      target_id: 'track-456',
      reported_user_id: 'user-789',
      reporter_id: 'reporter-101',
      reason: 'copyright_violation',
      description: 'Complete copyright violation with full evidence',
      status: 'pending',
      priority: 1,
      moderator_flagged: false,
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        originalWorkLink: 'https://example.com/original-work',
        proofOfOwnership: 'I am the original creator and can provide documentation',
        audioTimestamp: '2:35',
      },
    };

    // Mock Supabase queries
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    }));
    (supabase.from as jest.Mock) = mockFrom;

    // Render the action panel
    render(
      <ModerationActionPanel
        report={mockReport}
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    // Verify evidence section is displayed
    await waitFor(() => {
      expect(screen.getByText('Evidence Provided')).toBeInTheDocument();
    });

    // Verify all evidence fields are displayed
    expect(screen.getByText('Link to original work:')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/original-work')).toBeInTheDocument();
    
    expect(screen.getByText('Proof of ownership:')).toBeInTheDocument();
    expect(screen.getByText('I am the original creator and can provide documentation')).toBeInTheDocument();
    
    expect(screen.getByText('Timestamp in audio:')).toBeInTheDocument();
    expect(screen.getByText('2:35')).toBeInTheDocument();

    // Verify the link is clickable
    const link = screen.getByText('https://example.com/original-work');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com/original-work');
    expect(link).toHaveAttribute('target', '_blank');
  });

  /**
   * Test: Evidence display with partial fields
   * Validates that only provided evidence fields are displayed
   * Requirements: 8.1
   */
  test('displays evidence with partial fields', async () => {
    const mockReport: Report = {
      id: 'report-124',
      report_type: 'track',
      target_id: 'track-457',
      reported_user_id: 'user-790',
      reporter_id: 'reporter-102',
      reason: 'hate_speech',
      description: 'Hate speech at specific timestamp',
      status: 'pending',
      priority: 1,
      moderator_flagged: false,
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        audioTimestamp: '1:23:45',
      },
    };

    // Mock Supabase queries
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    }));
    (supabase.from as jest.Mock) = mockFrom;

    // Render the action panel
    render(
      <ModerationActionPanel
        report={mockReport}
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    // Verify evidence section is displayed
    await waitFor(() => {
      expect(screen.getByText('Evidence Provided')).toBeInTheDocument();
    });

    // Verify only timestamp is displayed
    expect(screen.getByText('Timestamp in audio:')).toBeInTheDocument();
    expect(screen.getByText('1:23:45')).toBeInTheDocument();

    // Verify copyright fields are NOT displayed
    expect(screen.queryByText('Link to original work:')).not.toBeInTheDocument();
    expect(screen.queryByText('Proof of ownership:')).not.toBeInTheDocument();
  });

  /**
   * Test: Evidence display with no fields
   * Validates that evidence section is not displayed when no evidence exists
   * Requirements: 8.1
   */
  test('does not display evidence section with no fields', async () => {
    const mockReport: Report = {
      id: 'report-125',
      report_type: 'post',
      target_id: 'post-458',
      reported_user_id: 'user-791',
      reporter_id: 'reporter-103',
      reason: 'spam',
      description: 'Spam post without evidence',
      status: 'pending',
      priority: 1,
      moderator_flagged: false,
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: null,
    };

    // Mock Supabase queries
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    }));
    (supabase.from as jest.Mock) = mockFrom;

    // Render the action panel
    render(
      <ModerationActionPanel
        report={mockReport}
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    // Wait for component to render
    await waitFor(() => {
      // Verify evidence section is NOT displayed
      expect(screen.queryByText('Evidence Provided')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Related reports display
   * Validates that related reports are displayed correctly
   * Requirements: 7.1, 7.2
   */
  test('displays related reports', async () => {
    const mockReport: Report = {
      id: 'report-126',
      report_type: 'track',
      target_id: 'track-459',
      reported_user_id: 'user-792',
      reporter_id: 'reporter-104',
      reason: 'spam',
      description: 'Spam track',
      status: 'pending',
      priority: 1,
      moderator_flagged: false,
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: null,
    };

    const sameContentReports = [
      {
        id: 'report-127',
        reason: 'spam',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      {
        id: 'report-128',
        reason: 'inappropriate_content',
        status: 'resolved',
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
    ];

    const sameUserReports = [
      {
        id: 'report-129',
        report_type: 'post',
        reason: 'harassment',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ];

    // Mock Supabase queries
    let callCount = 0;
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => {
                callCount++;
                // First call: same content reports
                if (callCount === 1) {
                  return Promise.resolve({ data: sameContentReports, error: null });
                }
                // Second call: same user reports
                return Promise.resolve({ data: sameUserReports, error: null });
              }),
            })),
          })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    }));
    (supabase.from as jest.Mock) = mockFrom;

    // Render the action panel
    render(
      <ModerationActionPanel
        report={mockReport}
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    // Verify related reports section is displayed
    await waitFor(() => {
      expect(screen.getByText('Related Reports:')).toBeInTheDocument();
    });

    // Verify same content reports
    expect(screen.getByText(`Same content (${sameContentReports.length}):`)).toBeInTheDocument();
    expect(screen.getByText('Spam or Misleading Content')).toBeInTheDocument();
    expect(screen.getByText('Inappropriate Content')).toBeInTheDocument();

    // Verify same user reports
    expect(screen.getByText(`Same user (${sameUserReports.length}):`)).toBeInTheDocument();
    expect(screen.getByText('post')).toBeInTheDocument();
  });

  /**
   * Test: Related reports with no matches
   * Validates that related reports section is not displayed when no matches exist
   * Requirements: 7.1, 7.2
   */
  test('does not display related reports with no matches', async () => {
    const mockReport: Report = {
      id: 'report-130',
      report_type: 'comment',
      target_id: 'comment-460',
      reported_user_id: 'user-793',
      reporter_id: 'reporter-105',
      reason: 'harassment',
      description: 'Harassing comment',
      status: 'pending',
      priority: 1,
      moderator_flagged: false,
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: null,
    };

    // Mock Supabase queries to return empty arrays
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    }));
    (supabase.from as jest.Mock) = mockFrom;

    // Render the action panel
    render(
      <ModerationActionPanel
        report={mockReport}
        onClose={mockOnClose}
        onActionComplete={mockOnActionComplete}
      />
    );

    // Wait for component to render
    await waitFor(() => {
      // Verify related reports section is NOT displayed
      expect(screen.queryByText('Related Reports:')).not.toBeInTheDocument();
      expect(screen.queryByText(/Same content/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Same user/)).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Evidence badge in report card
   * Validates that evidence badge appears in report card when evidence exists
   * Requirements: 9.1
   */
  test('displays evidence badge in report card', () => {
    const mockReport: Report = {
      id: 'report-131',
      report_type: 'track',
      target_id: 'track-461',
      reported_user_id: 'user-794',
      reporter_id: 'reporter-106',
      reason: 'copyright_violation',
      description: 'Copyright violation with evidence',
      status: 'pending',
      priority: 1,
      moderator_flagged: false,
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        originalWorkLink: 'https://example.com/original',
      },
    };

    // Render the report card
    render(
      <ReportCard
        report={mockReport}
        onSelect={() => {}}
      />
    );

    // Verify evidence badge is displayed
    const evidenceBadge = screen.getByText('📎 Evidence Provided');
    expect(evidenceBadge).toBeInTheDocument();
    expect(evidenceBadge).toHaveClass('bg-blue-900/30');
    expect(evidenceBadge).toHaveClass('text-blue-400');
  });

  /**
   * Test: No evidence badge without evidence
   * Validates that evidence badge does not appear when no evidence exists
   * Requirements: 9.1
   */
  test('does not display evidence badge without evidence', () => {
    const mockReport: Report = {
      id: 'report-132',
      report_type: 'post',
      target_id: 'post-462',
      reported_user_id: 'user-795',
      reporter_id: 'reporter-107',
      reason: 'spam',
      description: 'Spam post without evidence',
      status: 'pending',
      priority: 1,
      moderator_flagged: false,
      reviewed_by: null,
      reviewed_at: null,
      resolution_notes: null,
      action_taken: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: null,
    };

    // Render the report card
    render(
      <ReportCard
        report={mockReport}
        onSelect={() => {}}
      />
    );

    // Verify evidence badge is NOT displayed
    expect(screen.queryByText('📎 Evidence Provided')).not.toBeInTheDocument();
  });
});
