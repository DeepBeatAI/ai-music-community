/**
 * Unit tests for CreatorTracksPage component
 * Tests pagination, sorting, loading states, and track display
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.2
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCreatorByUsername, getCreatorById } from '@/lib/profileService';
import { supabase } from '@/lib/supabase';

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

jest.mock('@/lib/saveService', () => ({
  saveTrack: jest.fn(),
  unsaveTrack: jest.fn(),
  getSavedStatus: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock child components
jest.mock('@/components/layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

jest.mock('@/components/profile/CreatorTrackCard', () => ({
  CreatorTrackCard: ({ track }: { track: { id: string; title: string } }) => (
    <div data-testid={`track-card-${track.id}`}>
      {track.title}
    </div>
  ),
}));

const mockPush = jest.fn();
const mockGetCreatorByUsername = getCreatorByUsername as jest.MockedFunction<typeof getCreatorByUsername>;
const mockGetCreatorById = getCreatorById as jest.MockedFunction<typeof getCreatorById>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockSupabaseFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;

describe('CreatorTracksPage', () => {
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

  const mockTracks = [
    {
      id: 'track-1',
      title: 'Track 1',
      user_id: 'user-123',
      is_public: true,
      play_count: 100,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'track-2',
      title: 'Track 2',
      user_id: 'user-123',
      is_public: true,
      play_count: 50,
      created_at: '2024-01-02T00:00:00Z',
    },
  ];

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
    it('should render loading message when fetching creator', async () => {
      mockGetCreatorByUsername.mockImplementation(() => new Promise(() => {}));

      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByText('Loading creator profile...')).toBeInTheDocument();
      });
    });
  });

  describe('Error State - Creator Not Found', () => {
    it('should show not found message when creator does not exist', async () => {
      mockGetCreatorByUsername.mockResolvedValue(null);
      mockGetCreatorById.mockResolvedValue(null);

      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByText('Creator Not Found')).toBeInTheDocument();
      });
    });

    it('should show Discover Creators button when creator not found', async () => {
      mockGetCreatorByUsername.mockResolvedValue(null);
      mockGetCreatorById.mockResolvedValue(null);

      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /discover creators/i });
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Successful Tracks Load', () => {
    beforeEach(() => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      // Mock Supabase query chain for tracks
      const mockRange = jest.fn().mockResolvedValue({ data: mockTracks, error: null });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      
      // Mock for posts (like counts)
      const mockIn1 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect2 = jest.fn().mockReturnValue({ in: mockIn1 });
      
      // Mock for playlist_tracks
      const mockIn2 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect3 = jest.fn().mockReturnValue({ in: mockIn2 });
      
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'tracks') {
          return { select: mockSelect } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'posts') {
          return { select: mockSelect2 } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'playlist_tracks') {
          return { select: mockSelect3 } as unknown as ReturnType<typeof supabase.from>;
        }
        return { select: jest.fn() } as unknown as ReturnType<typeof supabase.from>;
      });
    });

    it('should render tracks when data loads successfully', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByTestId('track-card-track-1')).toBeInTheDocument();
        expect(screen.getByTestId('track-card-track-2')).toBeInTheDocument();
      });
    });

    it('should show track count in header', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByText(/showing 2 tracks/i)).toBeInTheDocument();
      });
    });

    it('should show Back to Profile button', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByText('Back to Profile')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    beforeEach(() => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const mockRange = jest.fn().mockResolvedValue({ data: mockTracks, error: null });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      
      const mockIn1 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect2 = jest.fn().mockReturnValue({ in: mockIn1 });
      
      const mockIn2 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect3 = jest.fn().mockReturnValue({ in: mockIn2 });
      
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'tracks') {
          return { select: mockSelect } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'posts') {
          return { select: mockSelect2 } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'playlist_tracks') {
          return { select: mockSelect3 } as unknown as ReturnType<typeof supabase.from>;
        }
        return { select: jest.fn() } as unknown as ReturnType<typeof supabase.from>;
      });
    });

    it('should render all sorting options', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /recent/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /oldest/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /most played/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /most liked/i })).toBeInTheDocument();
      });
    });

    it('should highlight active sort option', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        const recentButton = screen.getByRole('button', { name: /recent/i });
        expect(recentButton).toHaveClass('bg-blue-600');
      });
    });

    it('should change sort when button clicked', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /oldest/i })).toBeInTheDocument();
      });

      const oldestButton = screen.getByRole('button', { name: /oldest/i });
      fireEvent.click(oldestButton);

      await waitFor(() => {
        expect(oldestButton).toHaveClass('bg-blue-600');
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      // Create 20 tracks for pagination
      const fullPageTracks = Array.from({ length: 20 }, (_, i) => ({
        id: `track-${i + 1}`,
        title: `Track ${i + 1}`,
        user_id: 'user-123',
        is_public: true,
        play_count: 100 - i,
        created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      }));

      const mockRange = jest.fn().mockResolvedValue({ data: fullPageTracks, error: null });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      
      const mockIn1 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect2 = jest.fn().mockReturnValue({ in: mockIn1 });
      
      const mockIn2 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect3 = jest.fn().mockReturnValue({ in: mockIn2 });
      
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'tracks') {
          return { select: mockSelect } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'posts') {
          return { select: mockSelect2 } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'playlist_tracks') {
          return { select: mockSelect3 } as unknown as ReturnType<typeof supabase.from>;
        }
        return { select: jest.fn() } as unknown as ReturnType<typeof supabase.from>;
      });
    });

    it('should show Load More button when there are more tracks', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
      });
    });

    it('should show loading state on Load More button when clicked', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      fireEvent.click(loadMoreButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const mockRange = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabaseFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof supabase.from>);
    });

    it('should show empty state when no tracks exist', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByText(/no public tracks yet/i)).toBeInTheDocument();
      });
    });

    it('should show Back to Profile button in empty state', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /back to profile/i });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockGetCreatorByUsername.mockResolvedValue(mockProfile);

      const mockRange = jest.fn().mockResolvedValue({ data: mockTracks, error: null });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      
      const mockIn1 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect2 = jest.fn().mockReturnValue({ in: mockIn1 });
      
      const mockIn2 = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect3 = jest.fn().mockReturnValue({ in: mockIn2 });
      
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'tracks') {
          return { select: mockSelect } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'posts') {
          return { select: mockSelect2 } as unknown as ReturnType<typeof supabase.from>;
        } else if (table === 'playlist_tracks') {
          return { select: mockSelect3 } as unknown as ReturnType<typeof supabase.from>;
        }
        return { select: jest.fn() } as unknown as ReturnType<typeof supabase.from>;
      });
    });

    it('should navigate back to profile when Back button clicked', async () => {
      const { default: CreatorTracksPage } = await import('@/app/profile/[username]/tracks/page');
      render(<CreatorTracksPage />);

      await waitFor(() => {
        expect(screen.getByText('Back to Profile')).toBeInTheDocument();
      });

      const backButton = screen.getByText('Back to Profile');
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/profile/testuser');
    });
  });
});
