/**
 * Cascading Action Options Component
 * 
 * This component provides radio button options for album removal actions,
 * allowing moderators to choose between:
 * - Remove album and all tracks (cascading deletion)
 * - Remove album only (keep tracks as standalone)
 * 
 * Requirements: 4.2, 4.3, 4.4
 */

'use client';

import React from 'react';
import { CascadingActionOptions as CascadingOptions } from '@/types/moderation';

interface CascadingActionOptionsProps {
  value: CascadingOptions;
  onChange: (options: CascadingOptions) => void;
  trackCount?: number;
}

export function CascadingActionOptions({
  value,
  onChange,
  trackCount = 0,
}: CascadingActionOptionsProps): React.ReactElement {
  const handleOptionChange = (removeTracks: boolean): void => {
    onChange({
      removeAlbum: true, // Always true when removing album
      removeTracks,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Cascading Action Options:
      </p>
      
      <div className="space-y-2">
        {/* Option 1: Remove album and all tracks */}
        <label className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <input
            type="radio"
            name="cascading-option"
            checked={value.removeTracks === true}
            onChange={() => handleOptionChange(true)}
            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Remove album and all tracks
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {trackCount > 0 ? (
                <>
                  This will permanently delete the album and all {trackCount} track
                  {trackCount !== 1 ? 's' : ''} contained in it. This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete the album and all tracks contained in it.
                  This action cannot be undone.
                </>
              )}
            </div>
          </div>
        </label>

        {/* Option 2: Remove album only */}
        <label className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <input
            type="radio"
            name="cascading-option"
            checked={value.removeTracks === false}
            onChange={() => handleOptionChange(false)}
            className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Remove album only (keep tracks as standalone)
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {trackCount > 0 ? (
                <>
                  This will delete the album but preserve all {trackCount} track
                  {trackCount !== 1 ? 's' : ''} as standalone tracks. Users can still access
                  the tracks individually.
                </>
              ) : (
                <>
                  This will delete the album but preserve all tracks as standalone tracks.
                  Users can still access the tracks individually.
                </>
              )}
            </div>
          </div>
        </label>
      </div>

      {/* Warning message */}
      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          <strong>Warning:</strong> Album removal actions cannot be easily undone. Please ensure
          you have selected the appropriate option before proceeding.
        </p>
      </div>
    </div>
  );
}
