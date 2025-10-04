'use client';

import React from 'react';

interface CreatorFilterIndicatorProps {
  creatorUsername: string;
  onClearFilter: () => void;
}

export default function CreatorFilterIndicator({ 
  creatorUsername, 
  onClearFilter 
}: CreatorFilterIndicatorProps) {
  return (
    <div className="max-w-2xl mx-auto mb-6">
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <span className="text-blue-400 text-lg">🎯</span>
          </div>
          <div>
            <p className="text-blue-300 font-medium">
              Showing posts by <span className="font-semibold text-blue-200">{creatorUsername}</span>
            </p>
            <p className="text-blue-400 text-sm">
              Only posts from this creator are displayed
            </p>
          </div>
        </div>
        <button
          onClick={onClearFilter}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          aria-label={`Clear filter for ${creatorUsername}`}
        >
          Clear Filter
        </button>
      </div>
    </div>
  );
}