/**
 * Enhanced End of Content Component
 * 
 * Provides polished end-of-content experience with:
 * - Mode-specific messaging
 * - Action suggestions
 * - Performance statistics
 * - Smooth animations
 */

import React from 'react';
import { PaginationState } from '@/types/pagination';

interface EndOfContentProps {
  paginationState: PaginationState | null;
  totalFilteredPosts: number;
  hasSearchResults: boolean;
  hasFiltersApplied: boolean;
  onClearSearch: () => void;
  onScrollToTop: () => void;
  className?: string;
}

export default function EndOfContent({
  paginationState,
  totalFilteredPosts,
  hasSearchResults,
  hasFiltersApplied,
  onClearSearch,
  onScrollToTop,
  className = '',
}: EndOfContentProps) {
  const isClientMode = paginationState?.paginationMode === 'client';
  const totalPosts = paginationState?.totalPostsCount || 0;

  return (
    <div className={`text-center py-12 animate-fade-in ${className}`}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-8 border border-gray-700 shadow-2xl max-w-md mx-auto">
        {/* Celebration Icon */}
        <div className="text-6xl mb-4 animate-bounce">
          🎉
        </div>
        
        {/* Main Message */}
        <h3 className="text-xl font-bold text-gray-200 mb-3">
          You've reached the end!
        </h3>
        
        <p className="text-gray-400 mb-4 leading-relaxed">
          {isClientMode 
            ? `All ${totalFilteredPosts} filtered results are now visible.`
            : `All ${totalPosts} posts have been loaded.`
          }
        </p>
        
        {/* Mode-specific Information */}
        <div className={`text-sm p-4 rounded-lg mb-6 ${
          isClientMode 
            ? 'bg-purple-900/20 border border-purple-700' 
            : 'bg-blue-900/20 border border-blue-700'
        }`}>
          {isClientMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">📋</span>
                <p className="text-purple-300 font-medium">Client-side Filtering Complete</p>
              </div>
              <p className="text-purple-200 text-xs">
                Try adjusting your search or filters to see different results
              </p>
              <p className="text-purple-100 text-xs opacity-75">
                {paginationState?.allPosts.length || 0} total posts loaded from server
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🔄</span>
                <p className="text-blue-300 font-medium">Server Content Fully Loaded</p>
              </div>
              <p className="text-blue-200 text-xs">
                All posts from the database have been loaded
              </p>
              <p className="text-blue-100 text-xs opacity-75">
                Create a new post to see more content!
              </p>
            </div>
          )}
        </div>

        {/* Performance Summary */}
        {paginationState?.metadata && (
          <div className="bg-gray-900/50 rounded-lg p-3 mb-6 text-xs text-gray-400">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span>📊</span>
              <span className="font-medium">Session Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-gray-300 font-medium">
                  {paginationState.metadata.loadedServerPosts || 0}
                </p>
                <p className="text-gray-500">Posts Loaded</p>
              </div>
              <div>
                <p className="text-gray-300 font-medium">
                  {Math.ceil((paginationState.metadata.loadedServerPosts || 0) / 15)}
                </p>
                <p className="text-gray-500">Batches</p>
              </div>
            </div>
            {paginationState.metadata.lastFetchTimestamp && (
              <p className="text-center mt-2 text-gray-500">
                Last updated: {new Date(paginationState.metadata.lastFetchTimestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {(hasSearchResults || hasFiltersApplied) && (
            <button
              onClick={onClearSearch}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 
                       hover:from-purple-700 hover:to-purple-800 
                       text-white text-sm rounded-lg font-medium
                       transition-all duration-300 transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50
                       shadow-lg hover:shadow-purple-500/25"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>🧹</span>
                <span>Clear Filters & Show All</span>
              </span>
            </button>
          )}
          
          <button
            onClick={onScrollToTop}
            className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 
                     hover:from-gray-700 hover:to-gray-800 
                     text-white text-sm rounded-lg font-medium
                     transition-all duration-300 transform hover:scale-105
                     focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50
                     shadow-lg hover:shadow-gray-500/25"
          >
            <span className="flex items-center justify-center space-x-2">
              <span>⬆️</span>
              <span>Back to Top</span>
            </span>
          </button>
        </div>

        {/* Encouraging Message */}
        <div className="mt-6 p-3 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg border border-green-700/30">
          <p className="text-green-300 text-sm font-medium mb-1">
            🎵 Keep the music flowing!
          </p>
          <p className="text-green-200 text-xs">
            Share your AI music creations or discover new artists in the community.
          </p>
        </div>

        {/* Subtle Animation Elements */}
        <div className="flex justify-center space-x-2 mt-4 opacity-30">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

// CSS animations for the component
export const endOfContentStyles = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0,0,0);
  }
  40%, 43% {
    transform: translate3d(0, -10px, 0);
  }
  70% {
    transform: translate3d(0, -5px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}
`;