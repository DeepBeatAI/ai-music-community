'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Base error boundary for discover page components
 * Provides common error handling functionality with retry capability
 */
class DiscoverErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('Discover component error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state
    this.setState({ hasError: false, error: undefined });
    
    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-red-400 text-center">
            <p className="text-lg font-semibold mb-2">⚠️ Something went wrong</p>
            <p className="text-sm text-gray-400">
              An error occurred while loading this content.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary for trending albums section
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
export function TrendingAlbumsErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <DiscoverErrorBoundary
      onRetry={onRetry}
      fallback={
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-red-400 text-center">
            <p className="text-lg font-semibold mb-2">⚠️ Failed to load trending albums</p>
            <p className="text-sm text-gray-400">
              There was a problem displaying the trending albums section.
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Trending albums section error:', error, errorInfo);
      }}
    >
      {children}
    </DiscoverErrorBoundary>
  );
}

/**
 * Error boundary for trending playlists section
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export function TrendingPlaylistsErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <DiscoverErrorBoundary
      onRetry={onRetry}
      fallback={
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-red-400 text-center">
            <p className="text-lg font-semibold mb-2">⚠️ Failed to load trending playlists</p>
            <p className="text-sm text-gray-400">
              There was a problem displaying the trending playlists section.
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Trending playlists section error:', error, errorInfo);
      }}
    >
      {children}
    </DiscoverErrorBoundary>
  );
}

/**
 * Error boundary for individual album cards
 * Prevents one broken card from breaking the entire list
 * Requirements: 9.4, 9.5
 */
export function AlbumCardErrorBoundary({ 
  children, 
  albumId 
}: { 
  children: ReactNode; 
  albumId?: string;
}) {
  return (
    <DiscoverErrorBoundary
      fallback={
        <div className="flex items-center gap-4 p-4 rounded-lg bg-red-900/20 border border-red-500/30">
          <div className="text-red-400 text-sm">
            Failed to load album {albumId ? `(${albumId.slice(0, 8)}...)` : ''}
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error(`Album card error (${albumId}):`, error, errorInfo);
      }}
    >
      {children}
    </DiscoverErrorBoundary>
  );
}

/**
 * Error boundary for individual playlist cards
 * Prevents one broken card from breaking the entire list
 * Requirements: 10.4, 10.5
 */
export function PlaylistCardErrorBoundary({ 
  children, 
  playlistId 
}: { 
  children: ReactNode; 
  playlistId?: string;
}) {
  return (
    <DiscoverErrorBoundary
      fallback={
        <div className="flex items-center gap-4 p-4 rounded-lg bg-red-900/20 border border-red-500/30">
          <div className="text-red-400 text-sm">
            Failed to load playlist {playlistId ? `(${playlistId.slice(0, 8)}...)` : ''}
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error(`Playlist card error (${playlistId}):`, error, errorInfo);
      }}
    >
      {children}
    </DiscoverErrorBoundary>
  );
}

export default DiscoverErrorBoundary;
