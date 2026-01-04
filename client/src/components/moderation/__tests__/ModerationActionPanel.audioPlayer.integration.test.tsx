/**
 * Integration tests for Audio Timestamp Jump functionality in ModerationActionPanel
 * 
 * Tests Requirements 10.1, 10.2, 10.5, 10.6:
 * - WavesurferPlayer renders when track report with timestamp
 * - WavesurferPlayer does not render for non-track reports
 * - WavesurferPlayer does not render when no timestamp
 * - Track audio URL is fetched correctly
 * - Jump buttons render for each timestamp
 * - Jump buttons are sorted chronologically
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModerationActionPanel } from '../ModerationActionPanel';
import { Report } from '@/types/moderation';

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

// Mock WavesurferPlayer
jest.mock('@/components/WavesurferPlayer', () => {
  return React.forwardRef((props: { audioUrl: string; trackId: string }, ref) => {
    React.useImperativeHandle(ref, () => ({
      seekTo: jest.fn(),
    }));
    return (
      <div data-testid="wavesurfer-player">
        <div data-testid="audio-url">{props.audioUrl}</div>
        <div data-testid="track-id">{props.trackId}</div>
      </div>
    );
  });
});

// Mock getCachedAudioUrl
jest.mock('@/utils/audioCache', () => ({
  getCachedAudioUrl: jest.fn((url: string) => Promise.resolve(url)),
}));

describe('ModerationActionPanel - Audio Player Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
    });
    
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });
  });

  const createMockReport = (overrides: Partial<Report> = {}): Report => ({
    id: 'report-1',
    report_type: 'track',
    target_id: 'track-123',
    reason: 'hate_speech',
    description: 'Test description',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reporter_id: 'user-1',
    reported_user_id: 'user-2',
    priority: 1,
    moderator_flagged: false,
    reviewed_by: null,
    reviewed_at: null,
    resolution_notes: null,
    action_taken: null,
    metadata: null,
    ...overrides,
  });

  /**
   * Test: WavesurferPlayer renders when track report with timestamp
   * Requirement: 10.1
   */
  it('should render WavesurferPlayer when report is track type with timestamp', async () => {
    const trackReport = createMockReport({
      metadata: {
        audioTimestamp: '2:35',
      },
    });

    // Mock track query to return audio URL
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'track-123',
          file_url: 'https://example.com/audio.mp3',
        },
        error: null,
      }),
    });

    render(
      <ModerationActionPanel
        report={trackReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Wait for audio player to load
    await waitFor(() => {
      expect(screen.getByTestId('wavesurfer-player')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify audio URL is passed correctly
    expect(screen.getByTestId('audio-url')).toHaveTextContent('https://example.com/audio.mp3');
    expect(screen.getByTestId('track-id')).toHaveTextContent('track-123');
  });

  /**
   * Test: WavesurferPlayer does not render for non-track reports
   * Requirement: 10.1
   */
  it('should not render WavesurferPlayer for post reports', () => {
    const postReport = createMockReport({
      report_type: 'post',
      target_id: 'post-123',
      metadata: {
        audioTimestamp: '2:35',
      },
    });

    render(
      <ModerationActionPanel
        report={postReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Audio player should not be present
    expect(screen.queryByTestId('wavesurfer-player')).not.toBeInTheDocument();
  });

  it('should not render WavesurferPlayer for user reports', () => {
    const userReport = createMockReport({
      report_type: 'user',
      target_id: 'user-123',
      metadata: {
        audioTimestamp: '2:35',
      },
    });

    render(
      <ModerationActionPanel
        report={userReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Audio player should not be present
    expect(screen.queryByTestId('wavesurfer-player')).not.toBeInTheDocument();
  });

  it('should not render WavesurferPlayer for album reports', () => {
    const albumReport = createMockReport({
      report_type: 'album',
      target_id: 'album-123',
      metadata: {
        audioTimestamp: '2:35',
      },
    });

    render(
      <ModerationActionPanel
        report={albumReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Audio player should not be present
    expect(screen.queryByTestId('wavesurfer-player')).not.toBeInTheDocument();
  });

  /**
   * Test: WavesurferPlayer does not render when no timestamp
   * Requirement: 10.1
   */
  it('should not render WavesurferPlayer when track report has no timestamp', () => {
    const trackReportNoTimestamp = createMockReport({
      metadata: {
        originalWorkLink: 'https://example.com/original',
      },
    });

    render(
      <ModerationActionPanel
        report={trackReportNoTimestamp}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Audio player should not be present
    expect(screen.queryByTestId('wavesurfer-player')).not.toBeInTheDocument();
  });

  it('should not render WavesurferPlayer when track report has empty timestamp', () => {
    const trackReportEmptyTimestamp = createMockReport({
      metadata: {
        audioTimestamp: '',
      },
    });

    render(
      <ModerationActionPanel
        report={trackReportEmptyTimestamp}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Audio player should not be present
    expect(screen.queryByTestId('wavesurfer-player')).not.toBeInTheDocument();
  });

  /**
   * Test: Track audio URL is fetched correctly
   * Requirement: 10.1
   */
  it('should fetch track audio URL from database', async () => {
    const trackReport = createMockReport({
      target_id: 'track-456',
      metadata: {
        audioTimestamp: '5:12',
      },
    });

    // Mock track query
    const mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'track-456',
        file_url: 'https://storage.example.com/tracks/track-456.mp3',
      },
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
    });

    render(
      <ModerationActionPanel
        report={trackReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Wait for query to complete
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('tracks');
    });

    // Verify audio URL is displayed
    await waitFor(() => {
      expect(screen.getByTestId('audio-url')).toHaveTextContent(
        'https://storage.example.com/tracks/track-456.mp3'
      );
    }, { timeout: 3000 });
  });

  /**
   * Test: Jump buttons render for each timestamp
   * Requirements: 10.2, 10.5, 10.6
   */
  it('should render jump button for single timestamp', async () => {
    const trackReport = createMockReport({
      target_id: 'track-789',
      metadata: {
        audioTimestamp: '2:35',
      },
    });

    // Mock the tracks query to return audio_url
    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'track-789',
        file_url: 'https://example.com/audio.mp3',
      },
      error: null,
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tracks') {
        return {
          select: mockSelect,
          eq: mockEq,
          single: mockSingle,
        };
      }
      // Default mock for other tables
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
      };
    });

    render(
      <ModerationActionPanel
        report={trackReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Wait for jump button to appear
    await waitFor(() => {
      const jumpButton = screen.getByText(/Jump to 2:35/i);
      expect(jumpButton).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render jump buttons for multiple timestamps', async () => {
    const trackReport = createMockReport({
      target_id: 'track-101',
      metadata: {
        audioTimestamp: '2:35, 5:12, 8:45',
      },
    });

    // Mock the tracks query
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tracks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'track-101',
              file_url: 'https://example.com/audio.mp3',
            },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
      };
    });

    render(
      <ModerationActionPanel
        report={trackReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Wait for all jump buttons to appear
    await waitFor(() => {
      expect(screen.getByText(/Jump to 2:35/i)).toBeInTheDocument();
      expect(screen.getByText(/Jump to 5:12/i)).toBeInTheDocument();
      expect(screen.getByText(/Jump to 8:45/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  /**
   * Test: Jump buttons are sorted chronologically
   * Requirements: 10.2, 10.5, 10.6
   */
  it('should sort jump buttons chronologically', async () => {
    const trackReport = createMockReport({
      target_id: 'track-202',
      metadata: {
        // Intentionally unsorted timestamps
        audioTimestamp: '8:45, 2:35, 5:12, 1:23:45, 10:00',
      },
    });

    // Mock the tracks query
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tracks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'track-202',
              file_url: 'https://example.com/audio.mp3',
            },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
      };
    });

    render(
      <ModerationActionPanel
        report={trackReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Wait for all jump buttons to appear
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /Jump to/i });
      expect(buttons).toHaveLength(5);
    }, { timeout: 5000 });

    // Get all jump buttons
    const buttons = screen.getAllByRole('button', { name: /Jump to/i });

    // Verify they are in chronological order
    expect(buttons[0]).toHaveTextContent('Jump to 2:35'); // 155 seconds
    expect(buttons[1]).toHaveTextContent('Jump to 5:12'); // 312 seconds
    expect(buttons[2]).toHaveTextContent('Jump to 8:45'); // 525 seconds
    expect(buttons[3]).toHaveTextContent('Jump to 10:00'); // 600 seconds
    expect(buttons[4]).toHaveTextContent('Jump to 1:23:45'); // 5025 seconds
  });

  it('should handle timestamps with whitespace and sort correctly', async () => {
    const trackReport = createMockReport({
      target_id: 'track-303',
      metadata: {
        // Timestamps with extra whitespace
        audioTimestamp: '  10:30  ,  2:15  ,  5:45  ',
      },
    });

    // Mock the tracks query
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tracks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'track-303',
              file_url: 'https://example.com/audio.mp3',
            },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
      };
    });

    render(
      <ModerationActionPanel
        report={trackReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Wait for all jump buttons to appear
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /Jump to/i });
      expect(buttons).toHaveLength(3);
    }, { timeout: 5000 });

    // Get all jump buttons
    const buttons = screen.getAllByRole('button', { name: /Jump to/i });

    // Verify they are in chronological order (whitespace trimmed)
    expect(buttons[0]).toHaveTextContent('Jump to 2:15');
    expect(buttons[1]).toHaveTextContent('Jump to 5:45');
    expect(buttons[2]).toHaveTextContent('Jump to 10:30');
  });

  it('should skip invalid timestamps when rendering buttons', async () => {
    const trackReport = createMockReport({
      target_id: 'track-404',
      metadata: {
        // Mix of valid and invalid timestamps
        audioTimestamp: '2:35, invalid, 5:12, 99:99, 8:45',
      },
    });

    // Mock the tracks query
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tracks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'track-404',
              file_url: 'https://example.com/audio.mp3',
            },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
      };
    });

    render(
      <ModerationActionPanel
        report={trackReport}
        onClose={jest.fn()}
        onActionComplete={jest.fn()}
      />
    );

    // Wait for valid jump buttons to appear
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /Jump to/i });
      expect(buttons).toHaveLength(3); // Only valid timestamps
    }, { timeout: 5000 });

    // Verify only valid timestamps are shown
    expect(screen.getByText(/Jump to 2:35/i)).toBeInTheDocument();
    expect(screen.getByText(/Jump to 5:12/i)).toBeInTheDocument();
    expect(screen.getByText(/Jump to 8:45/i)).toBeInTheDocument();
    expect(screen.queryByText(/Jump to invalid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Jump to 99:99/i)).not.toBeInTheDocument();
  });
});
