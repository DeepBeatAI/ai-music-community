'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import { removeTrackFromPlaylist } from '@/lib/playlists';
import type { PlaylistWithTracks } from '@/types/playlist';

interface PlaylistDetailClientProps {
  playlist: PlaylistWithTracks;
  isOwner: boolean;
}

export function PlaylistDetailClient({ playlist: initialPlaylist, isOwner }: PlaylistDetailClientProps) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [removingTrack, setRemovingTrack] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleRemoveTrack = async (trackId: string) => {
    setRemovingTrack(trackId);

    // Optimistic update
    const originalPlaylist = { ...playlist };
    setPlaylist({
      ...playlist,
      tracks: playlist.tracks.filter((t) => t.track_id !== trackId),
      track_count: playlist.track_count - 1,
    });

    try {
      const result = await removeTrackFromPlaylist({
        playlist_id: playlist.id,
        track_id: trackId,
      });

      if (!result.success) {
        // Rollback on error
        setPlaylist(originalPlaylist);
        alert(result.error || 'Failed to remove track');
      }
    } catch (error) {
      // Rollback on error
      setPlaylist(originalPlaylist);
      console.error('Error removing track:', error);
      alert('Failed to remove track');
    } finally {
      setRemovingTrack(null);
      setShowDeleteConfirm(null);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/playlists')}
          className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Playlists</span>
        </button>

        {/* Playlist Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Cover Image */}
          <div className="flex-shrink-0">
            {playlist.cover_image_url ? (
              <Image
                src={playlist.cover_image_url}
                alt={playlist.name}
                width={192}
                height={192}
                className="w-48 h-48 rounded-lg object-cover"
              />
            ) : (
              <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-20 h-20 text-white opacity-50"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
          </div>

          {/* Playlist Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {playlist.name}
                </h1>
                {!playlist.is_public && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Private
                  </span>
                )}
              </div>

              {isOwner && (
                <button
                  onClick={() => router.push(`/playlists/${playlist.id}/edit`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {playlist.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {playlist.description}
              </p>
            )}

            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                <span>{playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Created {formatDate(playlist.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Tracks
          </h2>
        </div>

        {playlist.tracks.length === 0 ? (
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
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {playlist.tracks.map((playlistTrack, index) => {
              const track = playlistTrack.track;
              const isRemoving = removingTrack === track.id;
              const showConfirm = showDeleteConfirm === track.id;

              return (
                <div
                  key={playlistTrack.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Position Number */}
                    <div className="w-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                      {index + 1}
                    </div>

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
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {track.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {track.description || 'No description'}
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
                              onClick={() => handleRemoveTrack(track.id)}
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
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  );
}
