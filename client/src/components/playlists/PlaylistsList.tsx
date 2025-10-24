'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists, getPublicPlaylists } from '@/lib/playlists';
import { PlaylistCard } from './PlaylistCard';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import type { Playlist, PlaylistWithOwner } from '@/types/playlist';

export function PlaylistsList() {
  const { user } = useAuth();
  
  // Separate state for my playlists and public playlists
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [publicPlaylists, setPublicPlaylists] = useState<PlaylistWithOwner[]>([]);
  
  // Separate loading states
  const [myPlaylistsLoading, setMyPlaylistsLoading] = useState(true);
  const [publicPlaylistsLoading, setPublicPlaylistsLoading] = useState(true);
  
  // Separate error states
  const [myPlaylistsError, setMyPlaylistsError] = useState<string | null>(null);
  const [publicPlaylistsError, setPublicPlaylistsError] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchMyPlaylists = async () => {
    if (!user) {
      setMyPlaylistsLoading(false);
      return;
    }

    setMyPlaylistsLoading(true);
    setMyPlaylistsError(null);

    try {
      const data = await getUserPlaylists(user.id);

      if (data) {
        setMyPlaylists(data);
      } else {
        setMyPlaylistsError('Failed to load your playlists');
      }
    } catch (err) {
      console.error('Error fetching my playlists:', err);
      setMyPlaylistsError('An unexpected error occurred');
    } finally {
      setMyPlaylistsLoading(false);
    }
  };

  const fetchPublicPlaylists = async () => {
    if (!user) {
      setPublicPlaylistsLoading(false);
      return;
    }

    setPublicPlaylistsLoading(true);
    setPublicPlaylistsError(null);

    try {
      const data = await getPublicPlaylists(user.id);

      if (data) {
        setPublicPlaylists(data);
      } else {
        setPublicPlaylistsError('Failed to load public playlists');
      }
    } catch (err) {
      console.error('Error fetching public playlists:', err);
      setPublicPlaylistsError('An unexpected error occurred');
    } finally {
      setPublicPlaylistsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch both datasets independently
    fetchMyPlaylists();
    fetchPublicPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchMyPlaylists(); // Refresh my playlists
  };

  const handleDeleteSuccess = () => {
    fetchMyPlaylists(); // Refresh my playlists after deletion
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

  // Two-section layout
  return (
    <>
      {/* My Playlists Section */}
      <section className="mb-12">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            My Playlists {!myPlaylistsLoading && `(${myPlaylists.length})`}
          </h2>
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

        {/* My Playlists Loading State */}
        {myPlaylistsLoading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-400">Loading your playlists...</p>
            </div>
          </div>
        )}

        {/* My Playlists Error State */}
        {!myPlaylistsLoading && myPlaylistsError && (
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
              <p className="mt-4 text-gray-100 font-medium">{myPlaylistsError}</p>
              <button
                onClick={fetchMyPlaylists}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* My Playlists Empty State */}
        {!myPlaylistsLoading && !myPlaylistsError && myPlaylists.length === 0 && (
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

        {/* My Playlists Grid */}
        {!myPlaylistsLoading && !myPlaylistsError && myPlaylists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                isOwner={true}
                onDelete={handleDeleteSuccess}
              />
            ))}
          </div>
        )}
      </section>

      {/* Public Playlists Section */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">
            Public Playlists {!publicPlaylistsLoading && `(${publicPlaylists.length})`}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Discover playlists created by the community
          </p>
        </div>

        {/* Public Playlists Loading State */}
        {publicPlaylistsLoading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-400">Loading public playlists...</p>
            </div>
          </div>
        )}

        {/* Public Playlists Error State */}
        {!publicPlaylistsLoading && publicPlaylistsError && (
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
              <p className="mt-4 text-gray-100 font-medium">{publicPlaylistsError}</p>
              <button
                onClick={fetchPublicPlaylists}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Public Playlists Empty State */}
        {!publicPlaylistsLoading && !publicPlaylistsError && publicPlaylists.length === 0 && (
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-100">No public playlists available</h3>
            </div>
          </div>
        )}

        {/* Public Playlists Grid */}
        {!publicPlaylistsLoading && !publicPlaylistsError && publicPlaylists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                isOwner={false}
                onDelete={handleDeleteSuccess}
              />
            ))}
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
