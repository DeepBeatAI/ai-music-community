'use client';

import { memo } from 'react';
import type { TrackPickerCardProps } from '@/types/track';

/**
 * TrackPickerCard Component
 * 
 * Displays an individual track in the track picker with selection state.
 * Optimized for selection workflow with clear visual feedback.
 * 
 * Features:
 * - Track title, author, and duration display
 * - Visual indicator for selected state (border, checkmark)
 * - Click handler for track selection
 * - Keyboard accessibility (Enter/Space to select)
 * - Hover effects and transitions
 * - Touch-friendly design for mobile
 * 
 * Requirements: 1.1, 1.2, 4.1, 7.1, 7.2, 8.1
 */
export const TrackPickerCard = memo(function TrackPickerCard({
  id,
  track,
  isSelected,
  isFocused = false,
  onSelect,
  disabled = false,
}: TrackPickerCardProps) {
  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle click
  const handleClick = () => {
    if (!disabled) {
      onSelect(track);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(track);
    }
  };

  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      aria-label={`${track.title} by ${track.author || 'Unknown Artist'}`}
      tabIndex={-1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative bg-gray-800 rounded-lg p-3 sm:p-4 cursor-pointer transition-all
        min-h-[120px] sm:min-h-[140px]
        ${isSelected 
          ? 'ring-2 ring-blue-500 bg-gray-750' 
          : isFocused
          ? 'ring-2 ring-blue-400 bg-gray-750'
          : 'ring-0 hover:bg-gray-750 hover:ring-1 hover:ring-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Selected Checkmark */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Music Icon */}
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {/* Track Title */}
          <h3 className="text-white text-sm sm:text-base font-semibold truncate mb-0.5 sm:mb-1">
            {track.title}
          </h3>
          
          {/* Author */}
          <p className="text-xs sm:text-sm text-gray-400 truncate">
            by {track.author || 'Unknown Artist'}
          </p>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-400">
        <svg
          className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="truncate">Duration: {formatDuration(track.duration || 0)}</span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to ensure re-render when isSelected changes
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.disabled === nextProps.disabled
  );
});
