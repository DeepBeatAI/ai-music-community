'use client';

import { useState, DragEvent } from 'react';
import { usePlayback } from '@/contexts/PlaybackContext';
import type { PlaylistWithTracks } from '@/types/playlist';

interface TrackReorderListProps {
  playlist: PlaylistWithTracks;
  isOwner: boolean;
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>;
  onRemoveTrack: (trackId: string) => Promise<void>;
  removingTrack: string | null;
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (trackId: string | null) => void;
}

export function TrackReorderList({
  playlist,
  isOwner,
  onReorder,
  onRemoveTrack,
  removingTrack,
  showDeleteConfirm,
  setShowDeleteConfirm,
}: TrackReorderListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const { pause, activePlaylist, currentTrack, isPlaying } = usePlayback();

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if this playlist is currently playing
  const isThisPlaylistPlaying = activePlaylist?.id === playlist.id;

  // Check if a specific track is currently playing
  const isTrackPlaying = (trackId: string): boolean => {
    return isThisPlaylistPlaying && currentTrack?.id === trackId && isPlaying;
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!isOwner) return;
    
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    
    // Store reference to the element before setTimeout
    const element = e.currentTarget;
    
    // Add dragging class after a small delay to avoid flickering
    setTimeout(() => {
      if (element) {
        element.classList.add('dragging');
      }
    }, 0);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!isOwner || draggedIndex === null) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (!isOwner || draggedIndex === null) return;
    
    e.preventDefault();
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    
    // Only clear if we're leaving the track item entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    if (!isOwner || draggedIndex === null) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Remove dragging class
    const draggedElement = document.querySelector('.dragging');
    if (draggedElement) {
      draggedElement.classList.remove('dragging');
    }
    
    if (draggedIndex !== dropIndex) {
      setIsReordering(true);
      try {
        await onReorder(draggedIndex, dropIndex);
      } catch (error) {
        console.error('Failed to reorder tracks:', error);
      } finally {
        setIsReordering(false);
      }
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    
    // Remove dragging class
    e.currentTarget.classList.remove('dragging');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (playlist.tracks.length === 0) {
    return (
      <div className="p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No tracks yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {isOwner
            ? 'Add tracks to your playlist to get started'
            : 'This playlist is empty'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {playlist.tracks.map((playlistTrack, index) => {
        const track = playlistTrack.track;
        const isRemoving = removingTrack === track.id;
        const showConfirm = showDeleteConfirm === track.id;
        const trackIsPlaying = isTrackPlaying(track.id);
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={playlistTrack.id}
            draggable={isOwner && !isReordering}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`p-4 transition-all ${
              trackIsPlaying
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            } ${isDragging ? 'opacity-50' : ''} ${
              isDragOver && draggedIndex !== null && draggedIndex < index
                ? 'border-b-4 border-blue-500'
                : ''
            } ${
              isDragOver && draggedIndex !== null && draggedIndex > index
                ? 'border-t-4 border-blue-500'
                : ''
            } ${isOwner && !isReordering ? 'cursor-move' : ''}`}
          >
            <div className="flex items-center gap-4">
              {/* Drag Handle (Owner Only) */}
              {isOwner && (
                <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                  </svg>
                </div>
              )}

              {/* Position Number */}
              <div className="w-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                {index + 1}
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={() => {
                  if (isTrackPlaying(track.id)) {
                    pause();
                  } else {
                    // This will be handled by parent component
                    const event = new CustomEvent('playTrack', { detail: { index } });
                    window.dispatchEvent(event);
                  }
                }}
                className="flex-shrink-0 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                aria-label={isTrackPlaying(track.id) ? 'Pause track' : 'Play track'}
              >
                {isTrackPlaying(track.id) ? (
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>

              {/* Track Cover */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-medium truncate ${
                      trackIsPlaying
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {track.title}
                  </h3>
                  {trackIsPlaying && (
                    <div className="flex items-center gap-1">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {track.artist_name && track.description 
                    ? `${track.artist_name} • ${track.description}`
                    : track.artist_name || track.description || 'No description'}
                </p>
              </div>

              {/* Duration */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatDuration(track.duration ?? undefined)}
              </div>

              {/* Remove Button (Owner Only) */}
              {isOwner && (
                <div className="flex-shrink-0">
                  {showConfirm ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRemoveTrack(track.id)}
                        disabled={isRemoving}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isRemoving ? 'Removing...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        disabled={isRemoving}
                        className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(track.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      aria-label="Remove track"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Reordering Overlay */}
      {isReordering && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-4">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">
              Reordering tracks...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
