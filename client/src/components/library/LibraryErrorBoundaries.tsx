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
  errorInfo?: ErrorInfo;
}

/**
 * Base Error Boundary for Library sections
 * Provides common error handling functionality with retry capability
 */
class LibraryErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Library Error Boundary caught error:', error, errorInfo);
    
    this.setState({ errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 m-4">
          <div className="flex items-center mb-3">
            <div className="text-red-400 mr-2 text-2xl">⚠️</div>
            <h3 className="text-red-400 font-medium text-lg">Something went wrong</h3>
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            A component error occurred. This might be due to a temporary issue.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-red-300 mt-2 p-2 bg-gray-800 rounded overflow-auto max-h-40">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Stats Section Error Boundary
 * Handles errors in the statistics display section
 * Requirements: 9.4
 */
export function StatsSectionErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <LibraryErrorBoundary
      onRetry={onRetry}
      fallback={
        <div className="mb-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-red-400 font-medium text-lg mb-2">
                Stats Section Error
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Unable to load library statistics. Your data is safe, but we couldn&apos;t display the stats right now.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Stats Section Error:', error, errorInfo);
      }}
    >
      {children}
    </LibraryErrorBoundary>
  );
}

/**
 * Track Upload Section Error Boundary
 * Handles errors in the track upload component
 * Requirements: 9.1, 9.3
 */
export function TrackUploadSectionErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <LibraryErrorBoundary
      onRetry={onRetry}
      fallback={
        <div className="mb-12">
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-6">
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl mb-3">🎵</div>
              <h3 className="text-orange-400 font-medium text-lg mb-2">
                Upload Section Error
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                The upload component encountered an error. You can try refreshing or upload tracks later.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Track Upload Section Error:', error, errorInfo);
      }}
    >
      {children}
    </LibraryErrorBoundary>
  );
}

/**
 * All Tracks Section Error Boundary
 * Handles errors in the tracks grid display
 * Requirements: 9.4
 */
export function AllTracksSectionErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <LibraryErrorBoundary
      onRetry={onRetry}
      fallback={
        <div className="mb-12">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl mb-4">📀</div>
              <h3 className="text-red-400 font-medium text-lg mb-2">
                Tracks Section Error
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Unable to load your tracks. Your music is safe, but we couldn&apos;t display it right now.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onRetry}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('All Tracks Section Error:', error, errorInfo);
      }}
    >
      {children}
    </LibraryErrorBoundary>
  );
}

/**
 * Albums Section Error Boundary
 * Handles errors in the albums grid display
 * Requirements: 9.4
 */
export function AlbumsSectionErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <LibraryErrorBoundary
      onRetry={onRetry}
      fallback={
        <div className="mb-12">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl mb-4">💿</div>
              <h3 className="text-purple-400 font-medium text-lg mb-2">
                Albums Section Error
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Unable to load your albums. Your collections are safe, but we couldn&apos;t display them right now.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onRetry}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Albums Section Error:', error, errorInfo);
      }}
    >
      {children}
    </LibraryErrorBoundary>
  );
}

/**
 * Playlists Section Error Boundary
 * Handles errors in the playlists display
 * Requirements: 9.4
 */
export function PlaylistsSectionErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void;
}) {
  return (
    <LibraryErrorBoundary
      onRetry={onRetry}
      fallback={
        <div className="mb-12">
          <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-pink-400 font-medium text-lg mb-2">
                Playlists Section Error
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Unable to load your playlists. Your collections are safe, but we couldn&apos;t display them right now.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onRetry}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('Playlists Section Error:', error, errorInfo);
      }}
    >
      {children}
    </LibraryErrorBoundary>
  );
}

export default LibraryErrorBoundary;
