'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import { removeTrackFromPlaylist, reorderPlaylistTracks, getPlaylistWithTracks } from '@/lib/playlists';
import { usePlayback } from '@/contexts/PlaybackContext';
import { TrackReorderList } from './TrackReorderList';
import type { PlaylistWithTracks } from '@/types/playlist';

interface PlaylistDetailClientProps {
  playlist: PlaylistWithTracks;
  isOwner: boolean;
  creatorUsername?: string;
}

export function PlaylistDetailClient({ playlist: initialPlaylist, isOwner, creatorUsername }: PlaylistDetailClientProps) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [removingTrack, setRemovingTrack] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Playback context
  const { playPlaylist, updatePlaylist } = usePlayback();

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

  // Handle track reordering
  const handleReorder = async (fromIndex: number, toIndex: number) => {
    // Store original playlist for rollback
    const originalPlaylist = { ...playlist };

    try {
      // Create a copy of tracks array
      const reorderedTracks = [...playlist.tracks];
      
      // Remove the dragged item
      const [draggedTrack] = reorderedTracks.splice(fromIndex, 1);
      
      // Insert it at the new position
      reorderedTracks.splice(toIndex, 0, draggedTrack);

      // Update positions
      const trackPositions = reorderedTracks.map((track, index) => ({
        track_id: track.track_id,
        position: index,
      }));

      // Optimistic update
      setPlaylist({
        ...playlist,
        tracks: reorderedTracks.map((track, index) => ({
          ...track,
          position: index,
        })),
      });

      // Call database function
      const result = await reorderPlaylistTracks(playlist.id, trackPositions);

      if (!result.success) {
        // Rollback on error
        setPlaylist(originalPlaylist);
        alert(result.error || 'Failed to reorder tracks');
        return;
      }

      // Refresh playlist data from server to ensure consistency
      const refreshedPlaylist = await getPlaylistWithTracks(playlist.id);
      if (refreshedPlaylist) {
        setPlaylist(refreshedPlaylist);
        // Update the playback context with the new playlist order
        updatePlaylist(refreshedPlaylist);
      }
    } catch (error) {
      // Rollback on error
      setPlaylist(originalPlaylist);
      console.error('Error reordering tracks:', error);
      alert('Failed to reorder tracks');
    }
  };

  // Listen for play track events from TrackReorderList
  useEffect(() => {
    const handlePlayTrackEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ trackId: string }>;
      handlePlayTrackByTrackId(customEvent.detail.trackId);
    };

    window.addEventListener('playTrack', handlePlayTrackEvent);
    return () => {
      window.removeEventListener('playTrack', handlePlayTrackEvent);
    };
  }, [playlist]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle Play All button
  const handlePlayAll = () => {
    playPlaylist(playlist, 0);
  };

  // Handle play specific track by track ID
  const handlePlayTrackByTrackId = (trackId: string) => {
    // Find the track index in the original playlist order
    const index = playlist.tracks.findIndex(pt => pt.track.id === trackId);
    if (index >= 0) {
      playPlaylist(playlist, index);
    } else {
      console.error('Track not found in playlist:', trackId);
    }
  };



  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/library')}
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

            {/* Creator Name (for non-owners) */}
            {!isOwner && creatorUsername && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Created by <span className="font-medium text-gray-700 dark:text-gray-300">{creatorUsername}</span>
              </p>
            )}

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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Tracks
            </h2>
            
            {/* Play All Button */}
            {playlist.tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                disabled={playlist.tracks.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                <span>Play All</span>
              </button>
            )}
          </div>
        </div>

        <TrackReorderList
          playlist={playlist}
          isOwner={isOwner}
          onReorder={handleReorder}
          onRemoveTrack={handleRemoveTrack}
          removingTrack={removingTrack}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
        />
      </div>
      </div>
    </MainLayout>
  );
}
