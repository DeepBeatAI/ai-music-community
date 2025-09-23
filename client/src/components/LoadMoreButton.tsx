/**
 * Enhanced Load More Button Component
 * 
 * Provides polished UI with:
 * - Mode-specific styling and animations
 * - Performance feedback
 * - Accessibility improvements
 * - Loading states and progress indicators
 */

import React from 'react';
import { PaginationState } from '@/types/pagination';

interface LoadMoreButtonProps {
  paginationState: PaginationState | null;
  onLoadMore: () => void;
  isLoading: boolean;
  hasMorePosts: boolean;
  totalFilteredPosts: number;
  currentlyShowing: number;
  className?: string;
}

export default function LoadMoreButton({
  paginationState,
  onLoadMore,
  isLoading,
  hasMorePosts,
  totalFilteredPosts,
  currentlyShowing,
  className = '',
}: LoadMoreButtonProps) {
  if (!hasMorePosts) {
    return null;
  }

  const isClientMode = paginationState?.paginationMode === 'client';
  const bandwidthSavings = Math.max(0, totalFilteredPosts - currentlyShowing);
  const remainingPosts = isClientMode 
    ? Math.min(15, totalFilteredPosts - currentlyShowing)
    : 15;

  return (
    <div className="flex flex-col items-center space-y-4 pt-8">
      {/* Bandwidth Savings Info */}
      {bandwidthSavings > 0 && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-center max-w-md animate-fade-in">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-lg">📊</span>
            <p className="text-green-400 text-sm font-medium">
              Bandwidth Optimization Active
            </p>
          </div>
          <p className="text-green-300 text-xs">
            Showing {currentlyShowing} of {totalFilteredPosts} posts • 
            Saving bandwidth by not loading {bandwidthSavings} posts until needed
          </p>
          <p className="text-green-200 text-xs mt-1 opacity-75">
            🎵 Audio files load only when you click play
          </p>
        </div>
      )}
      
      {/* Enhanced Pagination Strategy Info */}
      <div className={`border rounded-lg p-4 text-center max-w-md transition-all duration-300 hover:scale-105 ${
        isClientMode 
          ? 'bg-purple-900/20 border-purple-700 hover:bg-purple-900/30' 
          : 'bg-blue-900/20 border-blue-700 hover:bg-blue-900/30'
      }`}>
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="text-xl animate-pulse">
            {isClientMode ? '📋' : '🔄'}
          </span>
          <p className={`text-sm font-medium ${
            isClientMode ? 'text-purple-300' : 'text-blue-300'
          }`}>
            {isClientMode ? 'Client-side Pagination' : 'Server-side Pagination'}
          </p>
        </div>
        <p className={`text-xs ${
          isClientMode ? 'text-purple-200' : 'text-blue-200'
        }`}>
          {isClientMode 
            ? `${remainingPosts} more from filtered results`
            : `Loading next ${remainingPosts} posts from database`
          }
        </p>
        {paginationState?.loadMoreStrategy && (
          <p className="text-xs text-gray-400 mt-1">
            Strategy: {paginationState.loadMoreStrategy}
          </p>
        )}
      </div>
      
      {/* Enhanced Load More Button with Mode-specific Styling */}
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className={`
          px-8 py-4 rounded-xl font-medium transition-all duration-300 
          flex items-center space-x-3 min-w-[220px] justify-center
          transform hover:scale-105 active:scale-95
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          disabled:transform-none disabled:hover:scale-100
          ${isLoading
            ? 'bg-gray-600 opacity-50 cursor-not-allowed'
            : isClientMode
            ? `bg-gradient-to-r from-purple-600 to-purple-700 
               hover:from-purple-700 hover:to-purple-800 
               shadow-lg hover:shadow-purple-500/25 
               focus:ring-purple-500`
            : `bg-gradient-to-r from-blue-600 to-blue-700 
               hover:from-blue-700 hover:to-blue-800 
               shadow-lg hover:shadow-blue-500/25 
               focus:ring-blue-500`
          } 
          text-white ${className}
        `}
        aria-label={`Load more posts using ${isClientMode ? 'client-side' : 'server-side'} pagination`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            <span className="animate-pulse">
              {isClientMode ? 'Expanding results...' : 'Fetching from server...'}
            </span>
          </>
        ) : (
          <>
            <span className="text-xl animate-bounce">
              {isClientMode ? '📋' : '🔄'}
            </span>
            <span className="font-semibold">
              {isClientMode 
                ? `Show More (${remainingPosts})`
                : `Load More Posts (${remainingPosts})`}
            </span>
            <span className="text-sm opacity-75">
              {isClientMode ? 'Instant' : '~1s'}
            </span>
          </>
        )}
      </button>
      
      {/* Auto-fetch Progress Indicator */}
      {paginationState?.loadMoreStrategy === 'server-fetch' && 
       isClientMode && 
       isLoading && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 text-center max-w-md animate-pulse">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
            <p className="text-yellow-300 text-xs font-medium">
              Auto-fetching more posts for better filtering...
            </p>
          </div>
        </div>
      )}
      
      {/* Enhanced Pagination Stats */}
      <div className="text-center text-xs text-gray-500 space-y-2">
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 max-w-md">
          {isClientMode ? (
            <>
              <p className="text-purple-300 font-medium flex items-center justify-center space-x-2">
                <span>📋</span>
                <span>Filtered View: {currentlyShowing} of {totalFilteredPosts} results</span>
              </p>
              <p className="text-gray-400 mt-1">
                🔍 Filtered from {paginationState?.allPosts.length || 0} loaded posts 
                ({paginationState?.totalPostsCount || 0} total available)
              </p>
              <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
                <span className="text-gray-500">
                  Page {paginationState?.currentPage || 1}
                </span>
                <span className="text-purple-400">•</span>
                <span className="text-gray-500">
                  Client-side pagination
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-blue-300 font-medium flex items-center justify-center space-x-2">
                <span>🔄</span>
                <span>Server View: {currentlyShowing} of {paginationState?.totalPostsCount || 0} total posts</span>
              </p>
              <p className="text-gray-400 mt-1">
                📊 Loaded {paginationState?.allPosts.length || 0} posts • {remainingPosts} per batch
              </p>
              <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
                <span className="text-gray-500">
                  Batch {Math.ceil((paginationState?.allPosts.length || 0) / 15)}
                </span>
                <span className="text-blue-400">•</span>
                <span className="text-gray-500">
                  Server-side pagination
                </span>
              </div>
            </>
          )}
        </div>
        
        {/* Performance Metrics */}
        {paginationState?.metadata && (
          <div className="text-xs text-gray-600 space-y-1 bg-gray-900/30 rounded p-2">
            <div className="flex items-center justify-center space-x-4">
              <span className="flex items-center space-x-1">
                <span>⚡</span>
                <span>
                  Last fetch: {paginationState.metadata.lastFetchTimestamp 
                    ? new Date(paginationState.metadata.lastFetchTimestamp).toLocaleTimeString()
                    : 'Never'}
                </span>
              </span>
            </div>
            {paginationState.metadata.totalServerPosts > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isClientMode ? 'bg-purple-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.round(((paginationState.metadata.loadedServerPosts || 0) / paginationState.metadata.totalServerPosts) * 100)}%`
                  }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// CSS animations (to be added to global styles)
export const loadMoreButtonStyles = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
`;