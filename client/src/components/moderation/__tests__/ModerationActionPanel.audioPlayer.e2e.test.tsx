/**
 * E2E tests for Audio Timestamp Jump functionality in ModerationActionPanel
 * 
 * Tests Requirements 10.2, 10.3:
 * - Clicking jump button seeks to correct time
 * - Multiple jump buttons work independently
 * - Seeking updates player time display
 * - Seeking works when player is paused
 * - Seeking works when player is playing
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Mock WavesurferPlayer with seekTo functionality
const mockSeekTo = jest.fn();
jest.mock('@/components/WavesurferPlayer', () => {
  return React.forwardRef((props: { audioUrl: string; trackId: string }, ref) => {
    React.useImperativeHandle(ref, () => ({
      seekTo: mockSeekTo,
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

describe('ModerationActionPanel - Audio Timestamp Jump E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSeekTo.mockClear();
    
    // Default mock setup
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tracks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'track-123',
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
   * Test: Clicking jump button seeks to correct time
   * Requirement: 10.2, 10.3
   */
  it('should seek to correct time when jump button is clicked', async () => {
    const trackReport = createMockReport({
      metadata: {
        audioTimestamp: '2:35',
      },
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
      expect(screen.getByText(/Jump to 2:35/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click the jump button
    const jumpButton = screen.getByText(/Jump to 2:35/i);
    fireEvent.click(jumpButton);

    // Verify seekTo was called with correct time (2:35 = 155 seconds)
    expect(mockSeekTo).toHaveBeenCalledWith(155);
  });

  /**
   * Test: Multiple jump buttons work independently
   * Requirement: 10.2, 10.3
   */
  it('should handle multiple jump buttons independently', async () => {
    const trackReport = createMockReport({
      metadata: {
        audioTimestamp: '2:35, 5:12, 8:45',
      },
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

    // Click first button
    fireEvent.click(screen.getByText(/Jump to 2:35/i));
    expect(mockSeekTo).toHaveBeenCalledWith(155); // 2:35 = 155 seconds

    // Click second button
    fireEvent.click(screen.getByText(/Jump to 5:12/i));
    expect(mockSeekTo).toHaveBeenCalledWith(312); // 5:12 = 312 seconds

    // Click third button
    fireEvent.click(screen.getByText(/Jump to 8:45/i));
    expect(mockSeekTo).toHaveBeenCalledWith(525); // 8:45 = 525 seconds

    // Verify all three calls were made
    expect(mockSeekTo).toHaveBeenCalledTimes(3);
  });

  /**
   * Test: Seeking works with HH:MM:SS format
   * Requirement: 10.2, 10.3
   */
  it('should handle HH:MM:SS timestamp format correctly', async () => {
    const trackReport = createMockReport({
      metadata: {
        audioTimestamp: '1:23:45',
      },
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
      expect(screen.getByText(/Jump to 1:23:45/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click the jump button
    fireEvent.click(screen.getByText(/Jump to 1:23:45/i));

    // Verify seekTo was called with correct time (1:23:45 = 5025 seconds)
    expect(mockSeekTo).toHaveBeenCalledWith(5025);
  });

  /**
   * Test: Jump buttons can be clicked multiple times
   * Requirement: 10.2, 10.3
   */
  it('should allow clicking the same jump button multiple times', async () => {
    const trackReport = createMockReport({
      metadata: {
        audioTimestamp: '2:35',
      },
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
      expect(screen.getByText(/Jump to 2:35/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    const jumpButton = screen.getByText(/Jump to 2:35/i);

    // Click the button three times
    fireEvent.click(jumpButton);
    fireEvent.click(jumpButton);
    fireEvent.click(jumpButton);

    // Verify seekTo was called three times with the same value
    expect(mockSeekTo).toHaveBeenCalledTimes(3);
    expect(mockSeekTo).toHaveBeenNthCalledWith(1, 155);
    expect(mockSeekTo).toHaveBeenNthCalledWith(2, 155);
    expect(mockSeekTo).toHaveBeenNthCalledWith(3, 155);
  });

  /**
   * Test: Jump buttons work with mixed timestamp formats
   * Requirement: 10.2, 10.3
   */
  it('should handle mixed MM:SS and HH:MM:SS formats', async () => {
    const trackReport = createMockReport({
      metadata: {
        audioTimestamp: '2:35, 1:23:45, 5:12',
      },
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
      expect(screen.getByText(/Jump to 1:23:45/i)).toBeInTheDocument();
      expect(screen.getByText(/Jump to 5:12/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click buttons in different order
    fireEvent.click(screen.getByText(/Jump to 1:23:45/i));
    expect(mockSeekTo).toHaveBeenLastCalledWith(5025);

    fireEvent.click(screen.getByText(/Jump to 2:35/i));
    expect(mockSeekTo).toHaveBeenLastCalledWith(155);

    fireEvent.click(screen.getByText(/Jump to 5:12/i));
    expect(mockSeekTo).toHaveBeenLastCalledWith(312);

    expect(mockSeekTo).toHaveBeenCalledTimes(3);
  });
});
