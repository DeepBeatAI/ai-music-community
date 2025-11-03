'use client';

import { useEffect, useRef, useState } from 'react';
import { getUserPlaylists, addTrackToPlaylist, removeTrackFromPlaylist, isTrackInPlaylist } from '@/lib/playlists';
import type { Playlist } from '@/types/playlist';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  currentPlaylistIds?: string[];
  userId: string;
  onSuccess?: (playlistIds: string[], playlistNames: string[]) => void;
  onError?: (message: string) => void;
}

export function AddToPlaylistModal({
  isOpen,
  onClose,
  trackId,
  currentPlaylistIds = [],
  userId,
  onSuccess,
  onError,
}: AddToPlaylistModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    new Set(currentPlaylistIds)
  );
  const [initialPlaylistIds, setInitialPlaylistIds] = useState<Set<string>>(
    new Set(currentPlaylistIds)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user's playlists and check which ones already contain the track
  useEffect(() => {
    if (!isOpen) return;

    const fetchPlaylists = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const userPlaylists = await getUserPlaylists(userId);
        if (!userPlaylists) {
          const errorMessage = 'Failed to load playlists';
          setError(errorMessage);
          if (onError) {
            onError(errorMessage);
          }
          return;
        }

        setPlaylists(userPlaylists);

        // Check which playlists already contain this track
        const trackInPlaylistChecks = await Promise.all(
          userPlaylists.map(async (playlist) => {
            const inPlaylist = await isTrackInPlaylist(playlist.id, trackId);
            return { playlistId: playlist.id, inPlaylist };
          })
        );

        const playlistsWithTrack = trackInPlaylistChecks
          .filter(check => check.inPlaylist)
          .map(check => check.playlistId);

        // Set both initial and selected state
        const initialSet = new Set(playlistsWithTrack);
        setInitialPlaylistIds(initialSet);
        setSelectedPlaylistIds(initialSet);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        const errorMessage = 'Failed to load playlists';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [isOpen, trackId, userId, onError]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Toggle playlist selection
  const togglePlaylist = (playlistId: string): void => {
    setSelectedPlaylistIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  // Handle save
  const handleSave = async (): Promise<void> => {
    // Store previous state for rollback
    const previousPlaylistIds = Array.from(initialPlaylistIds);
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Determine which playlists to add to and remove from
      const playlistsToAdd = Array.from(selectedPlaylistIds).filter(
        id => !initialPlaylistIds.has(id)
      );
      const playlistsToRemove = Array.from(initialPlaylistIds).filter(
        id => !selectedPlaylistIds.has(id)
      );

      // Optimistic update
      const newPlaylistIds = Array.from(selectedPlaylistIds);
      const newPlaylistNames = newPlaylistIds
        .map(id => playlists.find(p => p.id === id)?.name || '')
        .filter(name => name !== '');
      
      if (onSuccess) {
        onSuccess(newPlaylistIds, newPlaylistNames);
      }

      // Remove track from unchecked playlists
      const removePromises = playlistsToRemove.map(playlistId =>
        removeTrackFromPlaylist({
          playlist_id: playlistId,
          track_id: trackId,
        })
      );

      // Add track to newly checked playlists
      const addPromises = playlistsToAdd.map(playlistId =>
        addTrackToPlaylist({
          playlist_id: playlistId,
          track_id: trackId,
        })
      );

      // Execute all operations
      const [removeResults, addResults] = await Promise.all([
        Promise.all(removePromises),
        Promise.all(addPromises),
      ]);

      // Check for errors
      const failedRemoves = removeResults.filter(r => !r.success);
      const failedAdds = addResults.filter(r => !r.success);
      
      if (failedRemoves.length > 0 || failedAdds.length > 0) {
        const errorMessage = 
          failedRemoves.length > 0 
            ? failedRemoves[0].error || 'Failed to remove track from some playlists'
            : failedAdds[0].error || 'Failed to add track to some playlists';
        
        setError(errorMessage);
        
        // Rollback optimistic update
        if (onSuccess) {
          const previousNames = previousPlaylistIds
            .map(id => playlists.find(p => p.id === id)?.name || '')
            .filter(name => name !== '');
          onSuccess(previousPlaylistIds, previousNames);
        }
        
        if (onError) {
          onError(errorMessage);
        }
        return;
      }

      // Build success message
      const addedCount = playlistsToAdd.length;
      const removedCount = playlistsToRemove.length;
      
      if (addedCount > 0 && removedCount > 0) {
        setSuccessMessage(
          `Track added to ${addedCount} playlist${addedCount > 1 ? 's' : ''} and removed from ${removedCount} playlist${removedCount > 1 ? 's' : ''}`
        );
      } else if (addedCount > 0) {
        setSuccessMessage(
          `Track added to ${addedCount} playlist${addedCount > 1 ? 's' : ''}`
        );
      } else if (removedCount > 0) {
        setSuccessMessage(
          `Track removed from ${removedCount} playlist${removedCount > 1 ? 's' : ''}`
        );
      } else {
        setSuccessMessage('No changes made');
      }

      // Update initial state to match current state for future saves
      setInitialPlaylistIds(new Set(selectedPlaylistIds));

      // Close modal after short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving track to playlists:', err);
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      
      // Rollback optimistic update
      if (onSuccess) {
        const previousNames = previousPlaylistIds
          .map(id => playlists.find(p => p.id === id)?.name || '')
          .filter(name => name !== '');
        onSuccess(previousPlaylistIds, previousNames);
      }
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            Add to Playlists
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select playlists for this track
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Playlist Selection */}
              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                {playlists.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    You don&apos;t have any playlists yet. Create one first!
                  </p>
                ) : (
                  playlists.map((playlist) => (
                    <label
                      key={playlist.id}
                      className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaylistIds.has(playlist.id)}
                        onChange={() => togglePlaylist(playlist.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {playlist.name}
                        </p>
                        {playlist.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                      {playlist.is_public && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          Public
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>

              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || playlists.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
