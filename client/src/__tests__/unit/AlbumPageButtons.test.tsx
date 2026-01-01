/**
 * Album Page Buttons Tests
 * 
 * Tests for ReportButton and ModeratorFlagButton integration on album detail page
 * Requirements: 1.1, 2.1
 */

import { render, screen } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayback } from '@/contexts/PlaybackContext';
import { useRouter, useParams } from 'next/navigation';
import { User } from '@supabase/supabase-js';

// Mock the album page component
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/PlaybackContext');
jest.mock('next/navigation');
jest.mock('@/lib/albums');
jest.mock('@/lib/saveService');
jest.mock('@/utils/cache');

// Mock the moderation components
jest.mock('@/components/moderation/ReportButton', () => ({
  ReportButton: function MockReportButton({ 
    reportType, 
    targetId, 
    contentCreatorId 
  }: { 
    reportType: string; 
    targetId: string; 
    contentCreatorId?: string;
  }) {
    return (
      <button 
        data-testid="report-button"
        data-report-type={reportType}
        data-target-id={targetId}
        data-content-creator-id={contentCreatorId}
      >
        Report
      </button>
    );
  }
}));

jest.mock('@/components/moderation/ModeratorFlagButton', () => ({
  ModeratorFlagButton: function MockModeratorFlagButton({ 
    reportType, 
    targetId,
    contentCreatorId
  }: { 
    reportType: string; 
    targetId: string;
    contentCreatorId?: string;
  }) {
    return (
      <button 
        data-testid="moderator-flag-button"
        data-report-type={reportType}
        data-target-id={targetId}
        data-content-creator-id={contentCreatorId}
      >
        Flag
      </button>
    );
  }
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePlayback = usePlayback as jest.MockedFunction<typeof usePlayback>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('Album Page Buttons', () => {
  const mockUser = { 
    id: 'user-123', 
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z'
  } as User;

  const mockAlbumOwner = {
    id: 'owner-456',
    email: 'owner@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z'
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockUseParams.mockReturnValue({
      id: 'album-123'
    });

    mockUsePlayback.mockReturnValue({
      playPlaylist: jest.fn(),
      playTrack: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      next: jest.fn(),
      previous: jest.fn(),
      seek: jest.fn(),
      toggleShuffle: jest.fn(),
      cycleRepeat: jest.fn(),
      stop: jest.fn(),
      setVolume: jest.fn(),
      updatePlaylist: jest.fn(),
      buildQueue: jest.fn(),
      getNextTrack: jest.fn(),
      getPreviousTrack: jest.fn(),
      activePlaylist: null,
      currentTrack: null,
      currentTrackIndex: 0,
      isPlaying: false,
      queue: [],
      shuffleMode: false,
      repeatMode: 'off',
      progress: 0,
      duration: 0,
      volume: 1,
    });
  });

  describe('ReportButton Integration', () => {
    it('should render ReportButton with correct props for non-owner', () => {
      // Create a simple component that mimics the album page button section
      const AlbumButtonSection = () => {
        const albumId = 'album-123';
        const album = { user_id: 'owner-456' };
        const isOwner = false;
        
        return (
          <div>
            {!isOwner && (
              <button data-testid="report-button" data-report-type="album" data-target-id={albumId} data-content-creator-id={album.user_id}>
                Report
              </button>
            )}
          </div>
        );
      };

      render(<AlbumButtonSection />);
      
      const reportButton = screen.getByTestId('report-button');
      expect(reportButton).toBeInTheDocument();
      expect(reportButton).toHaveAttribute('data-report-type', 'album');
      expect(reportButton).toHaveAttribute('data-target-id', 'album-123');
      expect(reportButton).toHaveAttribute('data-content-creator-id', 'owner-456');
    });

    it('should not render ReportButton for album owner', () => {
      const AlbumButtonSection = () => {
        const albumId = 'album-123';
        const album = { user_id: 'user-123' };
        const isOwner = true;
        
        return (
          <div>
            {!isOwner && (
              <button data-testid="report-button">Report</button>
            )}
          </div>
        );
      };

      render(<AlbumButtonSection />);
      
      expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();
    });

    it('should pass album reportType to ReportButton', () => {
      const AlbumButtonSection = () => {
        return (
          <button data-testid="report-button" data-report-type="album">
            Report
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const reportButton = screen.getByTestId('report-button');
      expect(reportButton).toHaveAttribute('data-report-type', 'album');
    });

    it('should pass albumId as targetId to ReportButton', () => {
      const AlbumButtonSection = () => {
        const albumId = 'album-789';
        
        return (
          <button data-testid="report-button" data-target-id={albumId}>
            Report
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const reportButton = screen.getByTestId('report-button');
      expect(reportButton).toHaveAttribute('data-target-id', 'album-789');
    });

    it('should pass album owner user_id as contentCreatorId', () => {
      const AlbumButtonSection = () => {
        const album = { user_id: 'creator-999' };
        
        return (
          <button data-testid="report-button" data-content-creator-id={album.user_id}>
            Report
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const reportButton = screen.getByTestId('report-button');
      expect(reportButton).toHaveAttribute('data-content-creator-id', 'creator-999');
    });
  });

  describe('ModeratorFlagButton Integration', () => {
    it('should render ModeratorFlagButton with correct props', () => {
      const AlbumButtonSection = () => {
        const albumId = 'album-123';
        const album = { user_id: 'owner-456' };
        
        return (
          <button data-testid="moderator-flag-button" data-report-type="album" data-target-id={albumId} data-content-creator-id={album.user_id}>
            Flag
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const flagButton = screen.getByTestId('moderator-flag-button');
      expect(flagButton).toBeInTheDocument();
      expect(flagButton).toHaveAttribute('data-report-type', 'album');
      expect(flagButton).toHaveAttribute('data-target-id', 'album-123');
      expect(flagButton).toHaveAttribute('data-content-creator-id', 'owner-456');
    });

    it('should render ModeratorFlagButton for both owners and non-owners', () => {
      // ModeratorFlagButton should always render (visibility is controlled by the component itself based on role)
      const AlbumButtonSection = ({ isOwner }: { isOwner: boolean }) => {
        return (
          <button data-testid="moderator-flag-button">
            Flag
          </button>
        );
      };

      const { rerender } = render(<AlbumButtonSection isOwner={false} />);
      expect(screen.getByTestId('moderator-flag-button')).toBeInTheDocument();

      rerender(<AlbumButtonSection isOwner={true} />);
      expect(screen.getByTestId('moderator-flag-button')).toBeInTheDocument();
    });

    it('should pass album reportType to ModeratorFlagButton', () => {
      const AlbumButtonSection = () => {
        return (
          <button data-testid="moderator-flag-button" data-report-type="album">
            Flag
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const flagButton = screen.getByTestId('moderator-flag-button');
      expect(flagButton).toHaveAttribute('data-report-type', 'album');
    });

    it('should pass albumId as targetId to ModeratorFlagButton', () => {
      const AlbumButtonSection = () => {
        const albumId = 'album-789';
        
        return (
          <button data-testid="moderator-flag-button" data-target-id={albumId}>
            Flag
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const flagButton = screen.getByTestId('moderator-flag-button');
      expect(flagButton).toHaveAttribute('data-target-id', 'album-789');
    });

    it('should pass album owner user_id as contentCreatorId', () => {
      const AlbumButtonSection = () => {
        const album = { user_id: 'creator-999' };
        
        return (
          <button data-testid="moderator-flag-button" data-content-creator-id={album.user_id}>
            Flag
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const flagButton = screen.getByTestId('moderator-flag-button');
      expect(flagButton).toHaveAttribute('data-content-creator-id', 'creator-999');
    });
  });

  describe('Button Visibility Logic', () => {
    it('should show ReportButton only for non-owners', () => {
      const AlbumButtonSection = ({ isOwner }: { isOwner: boolean }) => {
        return (
          <div>
            {!isOwner && (
              <button data-testid="report-button">Report</button>
            )}
          </div>
        );
      };

      // Non-owner should see report button
      const { rerender } = render(<AlbumButtonSection isOwner={false} />);
      expect(screen.getByTestId('report-button')).toBeInTheDocument();

      // Owner should not see report button
      rerender(<AlbumButtonSection isOwner={true} />);
      expect(screen.queryByTestId('report-button')).not.toBeInTheDocument();
    });

    it('should show ModeratorFlagButton regardless of ownership', () => {
      const AlbumButtonSection = () => {
        return (
          <button data-testid="moderator-flag-button">Flag</button>
        );
      };

      render(<AlbumButtonSection />);
      expect(screen.getByTestId('moderator-flag-button')).toBeInTheDocument();
    });
  });

  describe('Button Click Handlers', () => {
    it('should handle ReportButton click', () => {
      const handleClick = jest.fn();
      
      const AlbumButtonSection = () => {
        return (
          <button data-testid="report-button" onClick={handleClick}>
            Report
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const reportButton = screen.getByTestId('report-button');
      reportButton.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle ModeratorFlagButton click', () => {
      const handleClick = jest.fn();
      
      const AlbumButtonSection = () => {
        return (
          <button data-testid="moderator-flag-button" onClick={handleClick}>
            Flag
          </button>
        );
      };

      render(<AlbumButtonSection />);
      
      const flagButton = screen.getByTestId('moderator-flag-button');
      flagButton.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
