'use client';

import Link from 'next/link';

interface PostNetworkErrorProps {
  onRetry?: () => void;
}

/**
 * PostNetworkError Component
 * 
 * Displayed when a post fails to load due to network or server errors.
 * Provides a retry button and navigation back to dashboard.
 */
export default function PostNetworkError({ onRetry }: PostNetworkErrorProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior: reload the page
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8 text-center border border-gray-700">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Failed to Load Post</h1>
        <p className="text-gray-400 mb-6">
          There was an error loading this post. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
