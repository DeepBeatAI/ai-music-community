/**
 * Result Count Display Component
 * 
 * Displays result counts and pagination information for combined search and filter operations
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

'use client';

import { useMemo } from 'react';
import { CombinedOperationResult, CombinedMode } from '@/utils/combinedSearchFilterPagination';
import { PaginationState } from '@/types/pagination';

interface ResultCountDisplayProps {
  combinedResult?: CombinedOperationResult;
  paginationState?: PaginationState;
  isLoadingMore?: boolean;
  className?: string;
}

export default function ResultCountDisplay({
  combinedResult,
  paginationState,
  isLoadingMore = false,
  className = ''
}: ResultCountDisplayProps) {
  const displayInfo = useMemo(() => {
    if (!combinedResult || !paginationState) {
      return null;
    }

    const {
      appliedMode,
      totalResults,
      resultCount,
      performanceMetrics,
      stateTransition
    } = combinedResult;

    const {
      currentPage,
      paginatedPosts,
      hasMorePosts,
      paginationMode
    } = paginationState;

    return {
      mode: appliedMode,
      totalResults,
      visibleResults: paginatedPosts.length,
      searchMatches: resultCount.searchMatches,
      filterMatches: resultCount.filterMatches,
      combinedMatches: resultCount.combinedMatches,
      currentPage,
      hasMorePosts,
      paginationMode,
      performanceTime: performanceMetrics.totalTime,
      stateTransition: stateTransition.fromMode !== stateTransition.toMode,
      transitionInfo: stateTransition
    };
  }, [combinedResult, paginationState]);

  if (!displayInfo || displayInfo.mode === 'none') {
    return null;
  }

  const getModeIcon = (mode: CombinedMode): string => {
    switch (mode) {
      case 'search-only':
        return '🔍';
      case 'filter-only':
        return '🔧';
      case 'search-and-filter':
        return '🔍🔧';
      default:
        return '📊';
    }
  };

  const getModeLabel = (mode: CombinedMode): string => {
    switch (mode) {
      case 'search-only':
        return 'Search Results';
      case 'filter-only':
        return 'Filtered Results';
      case 'search-and-filter':
        return 'Search + Filter Results';
      default:
        return 'Results';
    }
  };

  const getPaginationModeIcon = (mode: string): string => {
    return mode === 'client' ? '🔍' : '🌐';
  };

  const getPaginationModeLabel = (mode: string): string => {
    return mode === 'client' ? 'Client-side pagination' : 'Server-side pagination';
  };

  return (
    <div className={`bg-gray-700 rounded-lg p-3 space-y-2 ${className}`}>
      {/* Main result count display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg">
            {getModeIcon(displayInfo.mode)}
          </span>
          <div>
            <div className="text-sm font-medium text-gray-200">
              {getModeLabel(displayInfo.mode)}
            </div>
            <div className="text-xs text-gray-400">
              Showing {displayInfo.visibleResults} of {displayInfo.totalResults} results
            </div>
          </div>
        </div>

        {/* Performance indicator */}
        <div className="text-xs text-gray-400">
          {displayInfo.performanceTime}ms
        </div>
      </div>

      {/* Detailed breakdown for combined mode */}
      {displayInfo.mode === 'search-and-filter' && (
        <div className="flex items-center space-x-4 text-xs text-gray-400 bg-gray-800 rounded px-3 py-2">
          <span>🔍 Search: {displayInfo.searchMatches}</span>
          <span>🔧 Filters: {displayInfo.filterMatches}</span>
          <span>🎯 Combined: {displayInfo.combinedMatches}</span>
        </div>
      )}

      {/* Pagination info */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <span>{getPaginationModeIcon(displayInfo.paginationMode)}</span>
          <span>{getPaginationModeLabel(displayInfo.paginationMode)}</span>
        </div>

        <div className="flex items-center space-x-3">
          {displayInfo.hasMorePosts && (
            <span className="text-green-400">More available</span>
          )}
          
          {isLoadingMore && (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400"></div>
              <span className="text-blue-400">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* State transition indicator */}
      {displayInfo.stateTransition && (
        <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded px-2 py-1">
          🔄 Mode changed: {displayInfo.transitionInfo.fromMode} → {displayInfo.transitionInfo.toMode}
          {displayInfo.transitionInfo.requiresPaginationReset && ' (pagination reset)'}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function CompactResultCountDisplay({
  combinedResult,
  paginationState,
  className = ''
}: Omit<ResultCountDisplayProps, 'isLoadingMore'>) {
  const displayInfo = useMemo(() => {
    if (!combinedResult || !paginationState) {
      return null;
    }

    return {
      mode: combinedResult.appliedMode,
      totalResults: combinedResult.totalResults,
      visibleResults: paginationState.paginatedPosts.length,
    };
  }, [combinedResult, paginationState]);

  if (!displayInfo || displayInfo.mode === 'none') {
    return null;
  }

  const getModeIcon = (mode: CombinedMode): string => {
    switch (mode) {
      case 'search-only':
        return '🔍';
      case 'filter-only':
        return '🔧';
      case 'search-and-filter':
        return '🔍🔧';
      default:
        return '📊';
    }
  };

  return (
    <div className={`inline-flex items-center space-x-2 text-xs text-gray-400 ${className}`}>
      <span>{getModeIcon(displayInfo.mode)}</span>
      <span>
        {displayInfo.visibleResults}/{displayInfo.totalResults}
      </span>
    </div>
  );
}