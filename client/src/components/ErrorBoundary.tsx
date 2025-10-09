import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  logErrorBoundaryError, 
  logPaginationError, 
  logLoadMoreError, 
  logSearchError, 
  logPostError, 
  logAudioUploadError 
} from '@/utils/errorLogging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary component for catching and handling React errors
 * Prevents crashes and provides fallback UI for pagination components
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error securely without exposing sensitive information
    logErrorBoundaryError(error, { componentStack: errorInfo.componentStack || '' }, 'GenericErrorBoundary');

    // Update state with error info
    this.setState({ errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      
      if (hasChanged) {
        this.setState({ 
          hasError: false, 
          error: undefined, 
          errorInfo: undefined 
        });
      }
    }
  }

  handleRetry = () => {
    // Force a re-render by updating the key
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 m-4">
          <div className="flex items-center mb-3">
            <div className="text-red-400 mr-2">⚠️</div>
            <h3 className="text-red-400 font-medium">Something went wrong</h3>
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            A component error occurred. This might be due to a temporary issue.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-red-300 mt-2 p-2 bg-gray-800 rounded overflow-auto">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
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
 * Pagination-specific error boundary with specialized fallback
 */
export function PaginationErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 m-4">
          <div className="flex items-center mb-3">
            <div className="text-yellow-400 mr-2">⚠️</div>
            <h3 className="text-yellow-400 font-medium">Pagination Error</h3>
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            There was an issue with the pagination system. The page will automatically refresh to restore functionality.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log pagination-specific errors securely
        logPaginationError(error, 'PaginationErrorBoundary', 'Pagination system error', {
          componentStack: errorInfo.componentStack
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Load More Button specific error boundary
 * Handles errors in load more functionality without breaking the entire page
 */
export function LoadMoreErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 m-4 text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="text-orange-400 mr-2">🔄</div>
            <h3 className="text-orange-400 font-medium">Load More Error</h3>
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            Unable to load more content. You can try refreshing the page or continue browsing current results.
          </p>
          
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log load more specific errors securely
        logLoadMoreError(error, 'server-fetch', 1, 'Load more button interaction failed');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Search functionality specific error boundary
 * Handles search-related errors gracefully
 */
export function SearchErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 m-4">
          <div className="flex items-center mb-3">
            <div className="text-purple-400 mr-2">🔍</div>
            <h3 className="text-purple-400 font-medium">Search Error</h3>
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            There was an issue with the search functionality. You can try refreshing the page or browse without filters.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log search-specific errors securely
        logSearchError(error, undefined, undefined, 'Search functionality failed');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Post content specific error boundary
 * Handles individual post rendering errors without affecting other posts
 */
export function PostErrorBoundary({ children, postId }: { children: ReactNode; postId?: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 m-2">
          <div className="flex items-center mb-2">
            <div className="text-red-400 mr-2">📝</div>
            <h4 className="text-red-400 font-medium text-sm">Post Display Error</h4>
          </div>
          
          <p className="text-gray-300 text-xs mb-3">
            This post couldn&apos;t be displayed properly. Other posts should still work normally.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            Refresh
          </button>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log post-specific errors securely
        logPostError(error, postId || 'unknown', undefined, 'Post rendering failed');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Audio upload specific error boundary
 * Handles audio upload errors without breaking the entire form
 */
export function AudioUploadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 m-2">
          <div className="flex items-center mb-3">
            <div className="text-indigo-400 mr-2">🎵</div>
            <h4 className="text-indigo-400 font-medium">Audio Upload Error</h4>
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            There was an issue with the audio upload component. You can try refreshing or use text posts instead.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log audio upload specific errors securely
        logAudioUploadError(error, undefined, undefined, 'Audio upload functionality failed');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;