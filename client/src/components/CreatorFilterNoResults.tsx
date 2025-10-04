'use client';

import React from 'react';

interface CreatorFilterNoResultsProps {
  creatorUsername: string;
  onClearCreatorFilter: () => void;
  onClearAllFilters: () => void;
  hasOtherFilters: boolean;
}

export default function CreatorFilterNoResults({
  creatorUsername,
  onClearCreatorFilter,
  onClearAllFilters,
  hasOtherFilters
}: CreatorFilterNoResultsProps) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center bg-gray-800 border border-gray-600 rounded-lg p-8">
        {/* Icon */}
        <div className="mb-4">
          <span className="text-4xl">🔍</span>
        </div>
        
        {/* Main message */}
        <h3 className="text-xl font-semibold text-gray-200 mb-2">
          No posts found from {creatorUsername}
        </h3>
        
        {/* Contextual message based on other filters */}
        <p className="text-gray-400 mb-6">
          {hasOtherFilters 
            ? `${creatorUsername} doesn't have any posts matching your current filters.`
            : `${creatorUsername} hasn't posted any content yet.`
          }
        </p>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {hasOtherFilters && (
            <button
              onClick={onClearCreatorFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Keep filters, show all creators
            </button>
          )}
          
          <button
            onClick={onClearAllFilters}
            className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              hasOtherFilters
                ? 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
            }`}
          >
            {hasOtherFilters ? 'Clear all filters' : 'View all posts'}
          </button>
        </div>
        
        {/* Helpful suggestions */}
        {hasOtherFilters && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-500 mb-2">Try adjusting your filters:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Change the time range to see older posts</li>
              <li>• Switch between text and audio posts</li>
              <li>• Try a different sort order</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}