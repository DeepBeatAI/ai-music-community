'use client';

import { useState, useRef, useEffect, memo } from 'react';
import type { TrackWithMembership } from '@/types/library';
import SaveButton from './SaveButton';

interface CreatorTrackCardProps {
  track: TrackWithMembership;
  onAddToPlaylist: (trackId: string) => void;
  onCopyUrl: (trackId: string) => void;
  onShare: (trackId: string) => void;
  onPlay?: (trackId: string) => void;
  isSaved: boolean;
  onSaveToggle: (trackId: string) => Promise<void>;
}

/**
 * CreatorTrackCard Component
 * 
 * Displays a track card for creator profiles with cover art, metadata, and actions menu.
 * Supports both desktop (hover) and mobile (long-press) interactions.
 * 
 * Features:
 * - Cover art display
 * - Track title and metadata
 * - Album and playlist membership badges
 * - Actions menu with hover (desktop) and long-press (mobile) triggers
 * - Play count and upload date display
 * - Save/Remove functionality
 * 
 * Differences from TrackCard:
 * - No "Add to Album" option
 * - No "Delete" option
 * - Includes "Save" option
 * - Includes SaveButton component
 * 
 * Optimized with React.memo to prevent unnecessary re-renders.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 14.1
 */
export const CreatorTrackCard = memo(function CreatorTrackCard({
  track,
  onAddToPlaylist,
  onCopyUrl,
  onShare,
  onPlay,
  isSaved,
  onSaveToggle,
}: CreatorTrackCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Format date to relative time (e.g., "2 days ago")
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  };

  // Handle click outside to close actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  // Handle long press for mobile
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      setShowActions(true);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle action menu toggle
  const handleActionsToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  // Handle action clicks
  const handleAction = (action: () => void) => {
    action();
    setShowActions(false);
  };

  return (
    <div
      ref={cardRef}
      className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors group"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Cover Art - Tracks don't have cover images, show music icon */}
      <div className="relative aspect-square bg-gray-700 group/cover">
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <svg
            className="w-16 h-16"
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
        
        {/* Play Button Overlay */}
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track.id);
            }}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 md:group-hover/cover:bg-opacity-50 transition-all opacity-100 md:opacity-0 md:group-hover/cover:opacity-100"
            aria-label="Play track"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors shadow-lg">
              <svg
                className="w-6 h-6 md:w-8 md:h-8 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Track Info */}
      <div className="p-4">
        {/* Title and Save Button */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-white truncate flex-1">
            {track.title}
          </h3>
          <SaveButton
            itemId={track.id}
            itemType="track"
            isSaved={isSaved}
            onToggle={() => onSaveToggle(track.id)}
            size="sm"
          />
        </div>
        
        {/* Author */}
        <p className="text-sm text-gray-400 truncate mb-2">
          by {track.author || 'Unknown Artist'}
        </p>

        {/* Membership Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {track.albumName && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
              <span>💿</span>
              <span className="truncate max-w-[100px]">{track.albumName}</span>
            </span>
          )}
          {track.playlistNames.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-600 text-white text-xs rounded-full">
              <span>📝</span>
              <span>{track.playlistNames.length} playlist{track.playlistNames.length > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {/* Metadata and Actions */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Play Count */}
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span>{track.play_count || 0} plays</span>
            </div>

            {/* Likes Count */}
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>{track.like_count || 0}</span>
            </div>

            {/* Upload Date */}
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{formatRelativeTime(track.created_at)}</span>
            </div>
          </div>

          {/* Actions Menu Button */}
          <div className="relative">
            <button
              onClick={handleActionsToggle}
              className="p-2 md:p-1 hover:bg-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
              aria-label="Track actions"
            >
              <svg
                className="w-5 h-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {/* Actions Dropdown */}
            {showActions && (
              <div
                ref={actionsRef}
                className="absolute right-0 bottom-full mb-2 w-48 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 z-10"
              >
                <button
                  onClick={() => handleAction(() => onSaveToggle(track.id))}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill={isSaved ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  <span>{isSaved ? 'Remove' : 'Save'}</span>
                </button>
                <button
                  onClick={() => handleAction(() => onAddToPlaylist(track.id))}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <span>📝</span>
                  <span>Add to Playlist</span>
                </button>
                <button
                  onClick={() => handleAction(() => onCopyUrl(track.id))}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Copy Track URL</span>
                </button>
                <button
                  onClick={() => handleAction(() => onShare(track.id))}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
