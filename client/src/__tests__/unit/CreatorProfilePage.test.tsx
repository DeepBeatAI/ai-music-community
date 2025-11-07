/**
 * Unit tests for CreatorProfilePage component
 * Tests loading, error, not found states, and profile display
 * 
 * Requirements: 1.1, 1.2, 7.1-7.5
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCreatorByUsername, getCreatorById } from '@/lib/profileService';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/profileService', () => ({
  getCreatorByUsername: jest.fn(),
  getCreatorById: jest.fn(),
}));

// Mock child components
jest.mock('@/components/layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

jest.mock('@/components/profile/UserTypeBadge', () => ({
  __esModule: true,
  default: ({ userType }: { userType: string }) => <div data-testid="user-type-badge">{userType}</div>,
}));

jest.mock('@/components/profile/CreatorProfileHeader', () => ({
  __esModule: true,
  default: ({ profile, isOwnProfile }: { profile: { username: string }; isOwnProfile: boolean }) => (
    <div data-testid="creator-profile-header">
      {profile.username} - {isOwnProfile ? 'Own' : 'Other'}
    </div>
  ),
}));

jest.mock('@/components/profile/CreatorStatsSection', () => ({
  __esModule: true,
  default: ({ userId }: { userId: string }) => <div data-testid="creator-stats-section">{userId}</div>,
}));

jest.mock('@/components/profile/CreatorTracksSection', () => ({
  __esModule: true,
  default: ({ userId }: { userId: string }) => <div data-testid="creator-tracks-section">{userId}</div>,
}));

jest.mock('@/components/profile/CreatorAlbumsSection', () => ({
  __esModule: true,
  default: ({ userId }: { userId: string }) => <div data-testid="creator-albums-section">{userId}</div>,
}));

jest.mock('@/components/profile/CreatorPlaylistsSection', () => ({
  __esModule: true,
  default: ({ userId }: { userId: string }) => <div data-testid="creator-playlists-section">{userId}</div>,
}));

const mockPush = jest.fn();
const mockGetCreatorByUsername = getCreatorByUsername as jest.MockedFunction<typeof getCreatorByUsername>;
const mockGetCreatorById = getCreatorById as jest.MockedFunction<typeof getCreatorById>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('CreatorProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ 
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as ReturnType<typeof useRouter>);
    mockUseParams.mockReturnValue({ username: 'testuser' });
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    } as ReturnType<typeof useAuth>);
  });

  describe('Loading State', () => {
    it('should render loading spinner when auth is loading', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      } as ReturnType<typeof useAuth>);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      expect(screen.getByText('Loading creator profile...')).toBeInTheDocument();
    });

    it('should render loading spinner when fetching creator data', async () => {
      mockGetCreatorByUsername.mockImplementation(() => new Promise(() => {}));

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Loading creator profile...')).toBeInTheDocument();
      });
    });
  });

  describe('Error State - Creator Not Found', () => {
    it('should show not found message when creator does not exist', async () => {
      mockGetCreatorByUsername.mockResolvedValue(null);
      mockGetCreatorById.mockResolvedValue(null);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Creator Not Found')).toBeInTheDocument();
      });

      expect(screen.getByText(/doesn't exist or has been removed/)).toBeInTheDocument();
    });

    it('should show Discover Creators button when creator not found', async () => {
      mockGetCreatorByUsername.mockResolvedValue(null);
      mockGetCreatorById.mockResolvedValue(null);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /discover creators/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('should redirect to discover page when button clicked', async () => {
      mockGetCreatorByUsername.mockResolvedValue(null);
      mockGetCreatorById.mockResolvedValue(null);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Creator Not Found')).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /discover creators/i });
      button.click();

      expect(mockPush).toHaveBeenCalledWith('/discover');
    });
  });

  describe('Successful Profile Load', () => {
    const mockProfile = {
      id: 'user-123',
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      website: 'https://example.com',
      user_type: 'Free User',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should render profile when creator found by username', async () => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('user-type-badge')).toBeInTheDocument();
      });

      expect(screen.getByText('Free User')).toBeInTheDocument();
      expect(screen.getByTestId('creator-profile-header')).toBeInTheDocument();
      expect(screen.getByTestId('creator-stats-section')).toBeInTheDocument();
      expect(screen.getByTestId('creator-tracks-section')).toBeInTheDocument();
      expect(screen.getByTestId('creator-albums-section')).toBeInTheDocument();
      expect(screen.getByTestId('creator-playlists-section')).toBeInTheDocument();
    });

    it('should fallback to user ID when username not found', async () => {
      mockGetCreatorByUsername.mockResolvedValue(null);
      mockGetCreatorById.mockResolvedValue(mockProfile);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('user-type-badge')).toBeInTheDocument();
      });

      expect(mockGetCreatorByUsername).toHaveBeenCalledWith('testuser');
      expect(mockGetCreatorById).toHaveBeenCalledWith('testuser');
    });

    it('should identify own profile correctly', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        profile: { id: 'user-123', username: 'testuser' },
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/testuser - Own/)).toBeInTheDocument();
      });
    });

    it('should identify other user profile correctly', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'different-user' },
        profile: { id: 'different-user', username: 'otheruser' },
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/testuser - Other/)).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    const mockProfile = {
      id: 'user-123',
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      website: 'https://example.com',
      user_type: 'Premium',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should pass correct props to UserTypeBadge', async () => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Premium')).toBeInTheDocument();
      });
    });

    it('should pass correct userId to all sections', async () => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const { default: CreatorProfilePage } = await import('@/app/profile/[username]/page');
      render(<CreatorProfilePage />);

      await waitFor(() => {
        const sections = screen.getAllByText('user-123');
        expect(sections.length).toBeGreaterThan(0);
      });
    });
  });
});
