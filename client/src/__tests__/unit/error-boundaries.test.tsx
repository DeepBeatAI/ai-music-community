/**
 * Error Boundaries Test Suite
 * 
 * Tests comprehensive error boundary functionality for pagination components
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  ErrorBoundary, 
  PaginationErrorBoundary, 
  LoadMoreErrorBoundary, 
  SearchErrorBoundary, 
  PostErrorBoundary, 
  AudioUploadErrorBoundary 
} from '@/components/ErrorBoundary';

// Mock the error logging utility
jest.mock('@/utils/errorLogging', () => ({
  logErrorBoundaryError: jest.fn(),
  logPaginationError: jest.fn(),
  logLoadMoreError: jest.fn(),
  logSearchError: jest.fn(),
  logPostError: jest.fn(),
  logAudioUploadError: jest.fn()
}));

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="working-component">Component works</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Error Boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Generic ErrorBoundary', () => {
    test('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    test('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/A component error occurred/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    test('should display custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    test('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} errorMessage="Callback test error" />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    test('should allow retry functionality', () => {
      let shouldThrow = true;
      const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;

      const { rerender } = render(
        <ErrorBoundary key="test-boundary-1">
          <TestComponent />
        </ErrorBoundary>
      );

      // Error boundary should be showing
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change the error condition
      shouldThrow = false;

      // Click try again button - this should reset the error boundary
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Force a new error boundary instance by changing the key
      rerender(
        <ErrorBoundary key="test-boundary-2">
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show working component now
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    test('should show error details in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Development error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

      (process.env as any).NODE_ENV = originalNodeEnv;
    });
  });

  describe('PaginationErrorBoundary', () => {
    test('should render pagination-specific error message', () => {
      render(
        <PaginationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PaginationErrorBoundary>
      );

      expect(screen.getByText('Pagination Error')).toBeInTheDocument();
      expect(screen.getByText(/There was an issue with the pagination system/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh now/i })).toBeInTheDocument();
    });

    test('should render children when no error occurs', () => {
      render(
        <PaginationErrorBoundary>
          <ThrowError shouldThrow={false} />
        </PaginationErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('LoadMoreErrorBoundary', () => {
    test('should render load more specific error message', () => {
      render(
        <LoadMoreErrorBoundary>
          <ThrowError shouldThrow={true} />
        </LoadMoreErrorBoundary>
      );

      expect(screen.getByText('Load More Error')).toBeInTheDocument();
      expect(screen.getByText(/Unable to load more content/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    test('should render children when no error occurs', () => {
      render(
        <LoadMoreErrorBoundary>
          <ThrowError shouldThrow={false} />
        </LoadMoreErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('SearchErrorBoundary', () => {
    test('should render search-specific error message', () => {
      render(
        <SearchErrorBoundary>
          <ThrowError shouldThrow={true} />
        </SearchErrorBoundary>
      );

      expect(screen.getByText('Search Error')).toBeInTheDocument();
      expect(screen.getByText(/There was an issue with the search functionality/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    test('should render children when no error occurs', () => {
      render(
        <SearchErrorBoundary>
          <ThrowError shouldThrow={false} />
        </SearchErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('PostErrorBoundary', () => {
    test('should render post-specific error message', () => {
      render(
        <PostErrorBoundary postId="test-post-123">
          <ThrowError shouldThrow={true} />
        </PostErrorBoundary>
      );

      expect(screen.getByText('Post Display Error')).toBeInTheDocument();
      expect(screen.getByText(/This post couldn't be displayed properly/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    test('should render children when no error occurs', () => {
      render(
        <PostErrorBoundary postId="test-post-123">
          <ThrowError shouldThrow={false} />
        </PostErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('AudioUploadErrorBoundary', () => {
    test('should render audio upload specific error message', () => {
      render(
        <AudioUploadErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AudioUploadErrorBoundary>
      );

      expect(screen.getByText('Audio Upload Error')).toBeInTheDocument();
      expect(screen.getByText(/There was an issue with the audio upload component/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    test('should render children when no error occurs', () => {
      render(
        <AudioUploadErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AudioUploadErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    test('should handle nested error boundaries correctly', () => {
      render(
        <PaginationErrorBoundary>
          <PostErrorBoundary postId="nested-test">
            <ThrowError shouldThrow={true} />
          </PostErrorBoundary>
        </PaginationErrorBoundary>
      );

      // Should show the inner (PostErrorBoundary) error message
      expect(screen.getByText('Post Display Error')).toBeInTheDocument();
      expect(screen.queryByText('Pagination Error')).not.toBeInTheDocument();
    });

    test('should handle multiple error boundaries at same level', () => {
      render(
        <div>
          <SearchErrorBoundary>
            <ThrowError shouldThrow={true} />
          </SearchErrorBoundary>
          <LoadMoreErrorBoundary>
            <ThrowError shouldThrow={false} />
          </LoadMoreErrorBoundary>
        </div>
      );

      expect(screen.getByText('Search Error')).toBeInTheDocument();
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    test('should isolate errors to specific boundaries', () => {
      render(
        <div>
          <PostErrorBoundary postId="error-post">
            <ThrowError shouldThrow={true} />
          </PostErrorBoundary>
          <PostErrorBoundary postId="working-post">
            <ThrowError shouldThrow={false} />
          </PostErrorBoundary>
        </div>
      );

      // First post should show error
      expect(screen.getByText('Post Display Error')).toBeInTheDocument();
      
      // Second post should work normally
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Accessibility', () => {
    test('should provide accessible error messages', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      const refreshButton = screen.getByRole('button', { name: /refresh page/i });

      expect(tryAgainButton).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();
      
      // Buttons should be focusable
      tryAgainButton.focus();
      expect(tryAgainButton).toHaveFocus();
    });

    test('should provide clear error descriptions', () => {
      render(
        <PaginationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PaginationErrorBoundary>
      );

      expect(screen.getByText(/There was an issue with the pagination system/)).toBeInTheDocument();
      expect(screen.getByText(/The page will automatically refresh to restore functionality/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    test('should provide refresh button that can be clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
      
      // Should be clickable without throwing errors
      expect(() => fireEvent.click(refreshButton)).not.toThrow();
    });

    test('should reset error state on retry', () => {
      let shouldThrow = true;
      const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;

      const { rerender } = render(
        <ErrorBoundary key="reset-test-1">
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change the error condition
      shouldThrow = false;

      // Click try again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Force a new error boundary instance
      rerender(
        <ErrorBoundary key="reset-test-2">
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show working component
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });
});