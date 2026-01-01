'use client';

import { useEffect, useRef, useState } from 'react';
import { getUserAlbums, addTrackToAlbum, removeTrackFromAlbum } from '@/lib/albums';
import type { Album } from '@/types/album';

interface AddToAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  currentAlbumId?: string | null;
  userId: string;
  onSuccess?: (albumId: string | null, albumName: string | null) => void;
  onError?: (message: string) => void;
}

export function AddToAlbumModal({
  isOpen,
  onClose,
  trackId,
  currentAlbumId,
  userId,
  onSuccess,
  onError,
}: AddToAlbumModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(currentAlbumId || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user's albums
  useEffect(() => {
    if (!isOpen) return;

    const fetchAlbums = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const userAlbums = await getUserAlbums(userId);
        setAlbums(userAlbums);
      } catch (err) {
        console.error('Error fetching albums:', err);
        const errorMessage = 'Failed to load albums';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

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

  // Handle save
  const handleSave = async (): Promise<void> => {
    // Store previous state for rollback
    const previousAlbumId = currentAlbumId;
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // If "None" is selected, remove from current album
      if (selectedAlbumId === null) {
        // Only remove if track is currently in an album
        if (!currentAlbumId) {
          setSuccessMessage('Track is not in any album');
          setTimeout(() => {
            onClose();
          }, 1000);
          return;
        }

        // Remove track from current album
        const result = await removeTrackFromAlbum({
          album_id: currentAlbumId,
          track_id: trackId,
        });

        if (!result.success) {
          const errorMessage = result.error || 'Failed to remove track from album';
          setError(errorMessage);
          
          // Rollback optimistic update
          if (onSuccess && previousAlbumId) {
            const previousAlbum = albums.find(a => a.id === previousAlbumId);
            onSuccess(previousAlbumId, previousAlbum?.name || null);
          }
          
          if (onError) {
            onError(errorMessage);
          }
          return;
        }

        // Optimistic update
        if (onSuccess) {
          onSuccess(null, null);
        }
        
        setSuccessMessage('Track removed from album');
        setTimeout(() => {
          onClose();
        }, 1000);
        return;
      }

      // Add track to selected album (will remove from previous album automatically)
      const result = await addTrackToAlbum({
        album_id: selectedAlbumId,
        track_id: trackId,
      });

      if (!result.success) {
        const errorMessage = result.error || 'Failed to add track to album';
        setError(errorMessage);
        
        // Rollback optimistic update
        if (onSuccess && previousAlbumId) {
          const previousAlbum = albums.find(a => a.id === previousAlbumId);
          onSuccess(previousAlbumId, previousAlbum?.name || null);
        }
        
        if (onError) {
          onError(errorMessage);
        }
        return;
      }

      const albumName = albums.find(a => a.id === selectedAlbumId)?.name || 'album';
      setSuccessMessage(`Track added to "${albumName}"`);

      // Optimistic update
      if (onSuccess) {
        onSuccess(selectedAlbumId, albumName);
      }

      // Close modal after short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving track to album:', err);
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      
      // Rollback optimistic update
      if (onSuccess && previousAlbumId) {
        const previousAlbum = albums.find(a => a.id === previousAlbumId);
        onSuccess(previousAlbumId, previousAlbum?.name || null);
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
            Add to Album
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
            Select an album for this track
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
              {/* Album Selection */}
              <div className="space-y-2 mb-6">
                {/* None option */}
                <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="album"
                    value=""
                    checked={selectedAlbumId === null}
                    onChange={() => setSelectedAlbumId(null)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    None (Remove from album)
                  </span>
                </label>

                {/* Album options */}
                {albums.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    You don&apos;t have any albums yet. Create one first!
                  </p>
                ) : (
                  albums.map((album) => (
                    <label
                      key={album.id}
                      className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="album"
                        value={album.id}
                        checked={selectedAlbumId === album.id}
                        onChange={() => setSelectedAlbumId(album.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {album.name}
                        </p>
                      </div>
                      {currentAlbumId === album.id && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Current
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
                  disabled={saving || albums.length === 0}
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
