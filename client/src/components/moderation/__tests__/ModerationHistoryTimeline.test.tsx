import { render, screen, waitFor } from '@testing-library/react';
import { ModerationHistoryTimeline } from '../ModerationHistoryTimeline';
import * as moderationService from '@/lib/moderationService';

// Mock the moderation service
jest.mock('@/lib/moderationService', () => ({
  getUserModerationHistory: jest.fn(),
}));

describe('ModerationHistoryTimeline', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (moderationService.getUserModerationHistory as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(<ModerationHistoryTimeline userId={mockUserId} />);

    // Check for loading skeleton - it shows animated placeholders
    const animatedElement = container.querySelector('.animate-pulse');
    expect(animatedElement).toBeInTheDocument();
  });

  it('renders empty state when no history', async () => {
    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue([]);

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/no moderation history/i)).toBeInTheDocument();
    });
  });

  it('renders timeline with active action', async () => {
    const mockHistory = [
      {
        action: {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_warned',
          target_type: null,
          target_id: null,
          reason: 'Spam posting',
          duration_days: null,
          expires_at: null,
          related_report_id: null,
          internal_notes: null,
          notification_sent: true,
          notification_message: null,
          created_at: '2024-01-15T10:00:00Z',
          revoked_at: null,
          revoked_by: null,
          metadata: null,
        },
        isRevoked: false,
        revokedAt: null,
        revokedBy: null,
        reversalReason: null,
      },
    ];

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue(mockHistory);

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('User Warned')).toBeInTheDocument();
      expect(screen.getByText(/spam posting/i)).toBeInTheDocument();
    });
  });

  it('renders timeline with reversed action', async () => {
    const mockHistory = [
      {
        action: {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_suspended',
          target_type: null,
          target_id: null,
          reason: 'Harassment',
          duration_days: 7,
          expires_at: '2024-01-22T10:00:00Z',
          related_report_id: null,
          internal_notes: null,
          notification_sent: true,
          notification_message: null,
          created_at: '2024-01-15T10:00:00Z',
          revoked_at: '2024-01-16T14:00:00Z',
          revoked_by: 'mod-2',
          metadata: {
            reversal_reason: 'False positive - user was framed',
          },
        },
        isRevoked: true,
        revokedAt: '2024-01-16T14:00:00Z',
        revokedBy: 'mod-2',
        reversalReason: 'False positive - user was framed',
      },
    ];

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue(mockHistory);

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('User Suspended')).toBeInTheDocument();
      expect(screen.getByText('REVERSED')).toBeInTheDocument();
      expect(screen.getByText(/false positive/i)).toBeInTheDocument();
    });
  });

  it('highlights self-reversals', async () => {
    const mockHistory = [
      {
        action: {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_suspended',
          target_type: null,
          target_id: null,
          reason: 'Spam',
          duration_days: 7,
          expires_at: '2024-01-22T10:00:00Z',
          related_report_id: null,
          internal_notes: null,
          notification_sent: true,
          notification_message: null,
          created_at: '2024-01-15T10:00:00Z',
          revoked_at: '2024-01-15T11:00:00Z',
          revoked_by: 'mod-1', // Same as moderator_id
          metadata: {
            reversal_reason: 'Made a mistake',
          },
        },
        isRevoked: true,
        revokedAt: '2024-01-15T11:00:00Z',
        revokedBy: 'mod-1',
        reversalReason: 'Made a mistake',
      },
    ];

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue(mockHistory);

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('SELF-REVERSAL')).toBeInTheDocument();
      expect(screen.getByText(/moderator corrected their own action/i)).toBeInTheDocument();
    });
  });

  it('shows expired action badge', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const mockHistory = [
      {
        action: {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'restriction_applied',
          target_type: null,
          target_id: null,
          reason: 'Posting disabled',
          duration_days: 7,
          expires_at: pastDate.toISOString(),
          related_report_id: null,
          internal_notes: null,
          notification_sent: true,
          notification_message: null,
          created_at: '2024-01-08T10:00:00Z',
          revoked_at: null,
          revoked_by: null,
          metadata: null,
        },
        isRevoked: false,
        revokedAt: null,
        revokedBy: null,
        reversalReason: null,
      },
    ];

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue(mockHistory);

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('EXPIRED')).toBeInTheDocument();
    });
  });

  it('displays color legend when history exists', async () => {
    const mockHistory = [
      {
        action: {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_warned',
          target_type: null,
          target_id: null,
          reason: 'Test',
          duration_days: null,
          expires_at: null,
          related_report_id: null,
          internal_notes: null,
          notification_sent: true,
          notification_message: null,
          created_at: '2024-01-15T10:00:00Z',
          revoked_at: null,
          revoked_by: null,
          metadata: null,
        },
        isRevoked: false,
        revokedAt: null,
        revokedBy: null,
        reversalReason: null,
      },
    ];

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue(mockHistory);

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/color legend/i)).toBeInTheDocument();
      expect(screen.getByText(/active action/i)).toBeInTheDocument();
      expect(screen.getByText(/reversed action/i)).toBeInTheDocument();
      expect(screen.getByText(/expired action/i)).toBeInTheDocument();
      expect(screen.getByText(/self-reversal/i)).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const errorMessage = 'Failed to load history';
    (moderationService.getUserModerationHistory as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading timeline/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays action details correctly', async () => {
    const mockHistory = [
      {
        action: {
          id: 'action-1',
          moderator_id: 'mod-1',
          target_user_id: mockUserId,
          action_type: 'user_suspended',
          target_type: null,
          target_id: null,
          reason: 'Repeated violations',
          duration_days: 30,
          expires_at: '2024-02-15T10:00:00Z',
          related_report_id: null,
          internal_notes: 'User has been warned multiple times',
          notification_sent: true,
          notification_message: null,
          created_at: '2024-01-15T10:00:00Z',
          revoked_at: null,
          revoked_by: null,
          metadata: null,
        },
        isRevoked: false,
        revokedAt: null,
        revokedBy: null,
        reversalReason: null,
      },
    ];

    (moderationService.getUserModerationHistory as jest.Mock).mockResolvedValue(mockHistory);

    render(<ModerationHistoryTimeline userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/repeated violations/i)).toBeInTheDocument();
      expect(screen.getByText(/30 days/i)).toBeInTheDocument();
      expect(screen.getByText(/user has been warned multiple times/i)).toBeInTheDocument();
    });
  });
});
