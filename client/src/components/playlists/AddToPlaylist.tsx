'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists, addTrackToPlaylist, isTrackInPlaylist } from '@/lib/playlists';
import type { Playlist } from '@/types/playlist';

interface AddToPlaylistProps {
  trackId: string;
  onSuccess?: () => void;
}

export function AddToPlaylist({ trackId, onSuccess }: AddToPlaylistProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsWithTrack, setPlaylistsWithTrack] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch playlists when dropdown opens
  useEffect(() => {
    async function fetchPlaylists() {
      if (!isOpen || !user) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch user's playlists
        const userPlaylists = await getUserPlaylists(user.id);
        
        if (!userPlaylists) {
          setError('Failed to load playlists');
          setPlaylists([]);
          return;
        }

        setPlaylists(userPlaylists);

        // Check which playlists already contain this track
        const trackChecks = await Promise.all(
          userPlaylists.map(async (playlist) => {
            const hasTrack = await isTrackInPlaylist(playlist.id, trackId);
            return { playlistId: playlist.id, hasTrack };
          })
        );

        const playlistsWithTrackSet = new Set<string>();
        trackChecks.forEach(({ playlistId, hasTrack }) => {
          if (hasTrack) {
            playlistsWithTrackSet.add(playlistId);
          }
        });

        setPlaylistsWithTrack(playlistsWithTrackSet);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError('Failed to load playlists');
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylists();
  }, [isOpen, user, trackId]);

  const handleAddToPlaylist = async (playlistId: string) => {
    setAddingToPlaylist(playlistId);
    setError(null);

    try {
      const result = await addTrackToPlaylist({
        playlist_id: playlistId,
        track_id: trackId,
      });

      if (result.success) {
        // Update local state to show checkmark
        setPlaylistsWithTrack((prev) => new Set(prev).add(playlistId));
        
        // Call success callback
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to add track to playlist');
      }
    } catch (err) {
      console.error('Error adding track to playlist:', err);
      setError('Failed to add track to playlist');
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Don't show button if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        aria-label="Add to playlist"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add to Playlist
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[100] max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Add to Playlist
            </h3>
          </div>

          {loading && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm">Loading playlists...</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && playlists.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              <p>No playlists yet.</p>
              <p className="mt-1">Create a playlist first!</p>
            </div>
          )}

          {!loading && !error && playlists.length > 0 && (
            <div className="py-2">
              {playlists.map((playlist) => {
                const hasTrack = playlistsWithTrack.has(playlist.id);
                const isAdding = addingToPlaylist === playlist.id;

                return (
                  <button
                    key={playlist.id}
                    onClick={() => !hasTrack && !isAdding && handleAddToPlaylist(playlist.id)}
                    disabled={hasTrack || isAdding}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                      hasTrack || isAdding
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {playlist.name}
                      </p>
                      {playlist.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {playlist.description}
                        </p>
                      )}
                    </div>

                    <div className="ml-3 flex-shrink-0">
                      {isAdding ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      ) : hasTrack ? (
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
