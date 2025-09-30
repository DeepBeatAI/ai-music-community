/**
 * Enhanced Load More Button Component
 * 
 * Provides polished UI with mode-specific styling and animations
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
  const remainingPosts = isClientMode 
    ? Math.min(15, totalFilteredPosts - currentlyShowing)
    : 15;

  return (
    <div className="flex flex-col items-center space-y-4 pt-8">
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
          </>
        )}
      </button>
    </div>
  );
}
