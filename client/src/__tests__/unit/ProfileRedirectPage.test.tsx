/**
 * Unit tests for ProfileRedirectPage component
 * Tests authentication-based redirects
 * 
 * Requirements: 1.2
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock child components
jest.mock('@/components/layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('ProfileRedirectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as ReturnType<typeof useAuth>);
  });

  describe('Loading State', () => {
    it('should show loading spinner when auth is loading', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      expect(screen.getByText('Redirecting to your profile...')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should render loading spinner element', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      const { container } = render(<ProfileRedirectPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Unauthenticated User Redirect', () => {
    it('should redirect to login when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?redirect=/profile');
      });
    });

    it('should redirect to login when user exists but profile is null', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        profile: null,
        loading: false,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?redirect=/profile');
      });
    });
  });

  describe('Authenticated User Redirect', () => {
    it('should redirect to own profile when user is authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        profile: { id: 'user-123', username: 'testuser' },
        loading: false,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile/testuser');
      });
    });

    it('should use correct username in redirect URL', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-456' },
        profile: { id: 'user-456', username: 'anotheruser' },
        loading: false,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile/anotheruser');
      });
    });

    it('should handle usernames with special characters', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-789' },
        profile: { id: 'user-789', username: 'user_name-123' },
        loading: false,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile/user_name-123');
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render within MainLayout', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });

    it('should have proper styling classes', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      const { container } = render(<ProfileRedirectPage />);

      const mainDiv = container.querySelector('.min-h-screen');
      expect(mainDiv).toBeInTheDocument();
      expect(mainDiv).toHaveClass('bg-gray-900', 'text-white');
    });
  });

  describe('Edge Cases', () => {
    it('should not redirect multiple times', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        profile: { id: 'user-123', username: 'testuser' },
        loading: false,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      render(<ProfileRedirectPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle auth state changes correctly', async () => {
      const { rerender } = render(<div />);

      // Start with loading
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      } as ReturnType<typeof useAuth>);

      const { default: ProfileRedirectPage } = await import('@/app/profile/page');
      rerender(<ProfileRedirectPage />);

      expect(mockPush).not.toHaveBeenCalled();

      // Then authenticated
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        profile: { id: 'user-123', username: 'testuser' },
        loading: false,
      } as ReturnType<typeof useAuth>);

      rerender(<ProfileRedirectPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profile/testuser');
      });
    });
  });
});
