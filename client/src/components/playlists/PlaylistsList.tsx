'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists } from '@/lib/playlists';
import { PlaylistCard } from './PlaylistCard';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import type { Playlist } from '@/types/playlist';

interface PlaylistsListProps {
  hideMyPlaylistsHeader?: boolean;
  onPlaylistCountChange?: (count: number) => void;
  initialLimit?: number;
}

export function PlaylistsList({ hideMyPlaylistsHeader = false, onPlaylistCountChange, initialLimit = 8 }: PlaylistsListProps = {}) {
  const { user } = useAuth();
  
  // Unified state for all user playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [totalPlaylistsCount, setTotalPlaylistsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('my-playlists-collapsed');
      return saved === 'true';
    }
    return false;
  });

  const fetchPlaylists = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserPlaylists(user.id);

      if (data) {
        setTotalPlaylistsCount(data.length);
        // Limit playlists for display
        const limitedPlaylists = data.slice(0, initialLimit);
        setPlaylists(limitedPlaylists);
        onPlaylistCountChange?.(data.length);
      } else {
        setError('Failed to load your playlists');
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchPlaylists();
  };

  const handleDeleteSuccess = () => {
    fetchPlaylists();
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('my-playlists-collapsed', String(newState));
  };

  // Not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="mt-4 text-gray-900 font-medium">Please log in to view playlists</p>
        </div>
      </div>
    );
  }

  // Determine if "View All" button should show
  const showViewAll = totalPlaylistsCount > initialLimit;

  // Unified single-section layout
  return (
    <>
      <section className="mb-12">
        {!hideMyPlaylistsHeader && (
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleCollapse}
                className="p-3 md:p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
              >
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    isCollapsed ? 'rotate-0' : 'rotate-90'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              
              <h2 className="text-2xl font-bold text-white">
                My Playlists {!loading && `(${totalPlaylistsCount})`}
              </h2>
            </div>
            
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors inline-flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Create Playlist</span>
                </button>
                
                {showViewAll && (
                  <Link
                    href="/library/playlists"
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                  >
                    <span>View All</span>
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
        
        {hideMyPlaylistsHeader && (
          <div className="mb-6 flex justify-end items-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Playlist
            </button>
          </div>
        )}

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="transition-all duration-300">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-400">Loading your playlists...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="mt-4 text-gray-100 font-medium">{error}</p>
                  <button
                    onClick={fetchPlaylists}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && playlists.length === 0 && (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center max-w-md">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-semibold text-gray-100">No playlists yet</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    Create your first playlist to start organizing your favorite tracks
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors inline-flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Playlist
                  </button>
                </div>
              </div>
            )}

            {/* Playlists Grid - All playlists in single unified list */}
            {!loading && !error && playlists.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    isOwner={true}
                    onDelete={handleDeleteSuccess}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
