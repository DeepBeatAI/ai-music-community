'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayback } from '@/contexts/PlaybackContext';
import MainLayout from '@/components/layout/MainLayout';
import { CreatorTrackCard } from '@/components/profile/CreatorTrackCard';
import { AddToPlaylistModal } from '@/components/library/AddToPlaylistModal';
import { supabase } from '@/lib/supabase';
import { getCreatorByUsername, getCreatorById } from '@/lib/profileService';
import { saveTrack, unsaveTrack, getSavedStatus } from '@/lib/saveService';
import type { CreatorProfile } from '@/types';
import type { TrackWithMembership } from '@/types/library';

type SortOption = 'recent' | 'oldest' | 'most_played' | 'most_liked';

const ITEMS_PER_PAGE = 20;

/**
 * Creator Tracks Page
 * 
 * Displays all public tracks from a specific creator with pagination and sorting options.
 * Copied from /library/tracks page structure with modifications for creator profiles.
 * 
 * Features:
 * - Pagination with 20 items per page
 * - Sorting options (recent, oldest, most played, most liked)
 * - Uses CreatorTrackCard component
 * - Only shows public tracks (is_public = true)
 * - Save functionality for tracks
 * - Loading states for pagination
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.2
 */
export default function CreatorTracksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const { playTrack } = usePlayback();

  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [tracks, setTracks] = useState<TrackWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set());
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Fetch creator profile
  useEffect(() => {
    const fetchCreator = async () => {
      try {
        // Try fetching by username first
        let profile = await getCreatorByUsername(username);

        // If not found, try as user ID
        if (!profile) {
          profile = await getCreatorById(username);
        }

        if (!profile) {
          setError('Creator not found');
          setCreatorProfile(null);
          return;
        }

        setCreatorProfile(profile);
      } catch (err) {
        console.error('Error fetching creator profile:', err);
        setError('Failed to load creator profile');
        setCreatorProfile(null);
      }
    };

    fetchCreator();
  }, [username]);

  // Fetch tracks
  useEffect(() => {
    if (!creatorProfile) return;

    const fetchTracks = async () => {
      try {
        setLoading(currentPage === 1);
        setLoadingMore(currentPage > 1);
        setError(null);

        // Build query based on sort option - only fetch public tracks
        let query = supabase
          .from('tracks')
          .select('*')
          .eq('user_id', creatorProfile.id)
          .eq('is_public', true); // Only public tracks

        // Apply sorting (except for most_liked which is done client-side after fetching like counts)
        switch (sortBy) {
          case 'recent':
            query = query.order('created_at', { ascending: false });
            break;
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          case 'most_played':
            query = query.order('play_count', { ascending: false });
            break;
          case 'most_liked':
            // Will be sorted client-side after fetching like counts
            query = query.order('created_at', { ascending: false });
            break;
        }

        // Apply pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching tracks:', fetchError);
          setError('Failed to load tracks');
          return;
        }

        if (!data) {
          setTracks([]);
          setHasMore(false);
          return;
        }

        // Get track IDs for subsequent queries
        const trackIds = data.map(t => t.id);

        // Get like counts for all tracks from posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('track_id, post_likes(count)')
          .in('track_id', trackIds);

        // Create a map of track_id to like count
        const likeCountMap = new Map<string, number>();
        if (postsData) {
          postsData.forEach(post => {
            const postLikes = post.post_likes as unknown[];
            const currentCount = likeCountMap.get(post.track_id) || 0;
            likeCountMap.set(post.track_id, currentCount + (postLikes?.length || 0));
          });
        }

        // Fetch playlist membership
        const { data: playlistTracksData } = await supabase
          .from('playlist_tracks')
          .select('track_id, playlist_id, playlists!inner(name)')
          .in('track_id', trackIds);

        // Create a map of track_id to playlist info
        const playlistMap = new Map<string, { ids: string[]; names: string[] }>();
        if (playlistTracksData) {
          playlistTracksData.forEach(pt => {
            const existing = playlistMap.get(pt.track_id) || { ids: [], names: [] };
            existing.ids.push(pt.playlist_id);
            const playlistData = pt.playlists;
            if (playlistData && typeof playlistData === 'object' && 'name' in playlistData) {
              existing.names.push((playlistData as { name: string }).name);
            }
            playlistMap.set(pt.track_id, existing);
          });
        }

        // Transform data to include like counts, user info, and membership
        const transformedTracks = data.map(track => {
          const playlistInfo = playlistMap.get(track.id) || { ids: [], names: [] };
          
          return {
            ...track,
            user: {
              id: creatorProfile.id,
              username: creatorProfile.username
            },
            like_count: likeCountMap.get(track.id) || 0,
            albumId: null,
            albumName: null,
            playlistIds: playlistInfo.ids,
            playlistNames: playlistInfo.names
          };
        }) as TrackWithMembership[];

        // If sorting by most_liked, sort the transformed tracks client-side
        if (sortBy === 'most_liked') {
          transformedTracks.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
        }

        // Check if there are more tracks
        setHasMore(transformedTracks.length === ITEMS_PER_PAGE);

        // Append or replace tracks based on page
        if (currentPage === 1) {
          setTracks(transformedTracks);
        } else {
          setTracks(prev => [...prev, ...transformedTracks]);
        }
      } catch (err) {
        console.error('Unexpected error fetching tracks:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchTracks();
  }, [creatorProfile, sortBy, currentPage]);

  // Fetch saved status for tracks
  useEffect(() => {
    const fetchSavedStatus = async () => {
      if (!user || tracks.length === 0) return;

      const savedSet = new Set<string>();
      for (const track of tracks) {
        const isSaved = await getSavedStatus(user.id, track.id, 'track');
        if (isSaved) {
          savedSet.add(track.id);
        }
      }
      setSavedTracks(savedSet);
    };

    fetchSavedStatus();
  }, [user, tracks]);

  // Handle toast notifications
  const handleShowToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // Handle save/unsave toggle
  const handleSaveToggle = useCallback(async (trackId: string) => {
    if (!user) {
      handleShowToast('Please log in to save tracks', 'info');
      return;
    }

    const isSaved = savedTracks.has(trackId);

    try {
      if (isSaved) {
        await unsaveTrack(user.id, trackId);
        setSavedTracks(prev => {
          const newSet = new Set(prev);
          newSet.delete(trackId);
          return newSet;
        });
        handleShowToast('Track removed from saved', 'success');
      } else {
        await saveTrack(user.id, trackId);
        setSavedTracks(prev => new Set(prev).add(trackId));
        handleShowToast('Track saved', 'success');
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
      handleShowToast('Failed to update save status', 'error');
    }
  }, [user, savedTracks, handleShowToast]);

  // Handle add to playlist
  const handleAddToPlaylist = useCallback((trackId: string) => {
    if (!user) {
      handleShowToast('Please log in to add tracks to playlists', 'info');
      return;
    }
    
    setSelectedTrackId(trackId);
    setShowAddToPlaylistModal(true);
  }, [user, handleShowToast]);

  // Handle playlist assignment success
  const handlePlaylistSuccess = useCallback((playlistIds: string[], playlistNames: string[]) => {
    if (playlistIds.length > 0) {
      handleShowToast('Updated playlist membership', 'success');
    } else {
      handleShowToast('Removed from all playlists', 'success');
    }
    setShowAddToPlaylistModal(false);
  }, [handleShowToast]);

  // Handle modal error
  const handleModalError = useCallback((message: string) => {
    handleShowToast(message, 'error');
  }, [handleShowToast]);

  // Handle copy URL
  const handleCopyUrl = useCallback((trackId: string) => {
    const url = `${window.location.origin}/tracks/${trackId}`;
    navigator.clipboard.writeText(url);
    handleShowToast('Track URL copied to clipboard', 'success');
  }, [handleShowToast]);

  // Handle share
  const handleShare = useCallback((trackId: string) => {
    const url = `${window.location.origin}/tracks/${trackId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this track',
        url: url
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback to copy URL
      navigator.clipboard.writeText(url);
      handleShowToast('Track URL copied to clipboard', 'success');
    }
  }, [handleShowToast]);

  // Handle play
  const handlePlay = useCallback(async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    try {
      await playTrack(track as unknown as Parameters<typeof playTrack>[0]);
    } catch (err) {
      console.error('Error playing track:', err);
      handleShowToast('Failed to play track', 'error');
    }
  }, [tracks, playTrack, handleShowToast]);

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    setTracks([]);
  };

  // Handle load more
  const handleLoadMore = () => {
    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
  };

  // Show error if creator not found
  if (error && !creatorProfile) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto p-4 text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">
              Creator Not Found
            </h1>
            <p className="text-gray-400 mb-6">
              The creator you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Discover Creators
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!creatorProfile) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white">Loading creator profile...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push(`/profile/${username}`)}
              className="text-gray-400 hover:text-white mb-4 flex items-center gap-2 transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Profile
            </button>

            <h1 className="text-3xl font-bold text-white mb-2">
              {creatorProfile.username}&apos;s Tracks
            </h1>
            <p className="text-gray-400">
              {tracks.length > 0 && `Showing ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Sorting Options */}
          <div className="mb-6 flex items-center gap-4">
            <span className="text-gray-400 text-sm">Sort by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSortChange('recent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'recent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => handleSortChange('oldest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'oldest'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Oldest
              </button>
              <button
                onClick={() => handleSortChange('most_played')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'most_played'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Most Played
              </button>
              <button
                onClick={() => handleSortChange('most_liked')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'most_liked'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Most Liked
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && creatorProfile && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setCurrentPage(1);
                }}
                className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && currentPage === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-700"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tracks Grid */}
          {!loading && tracks.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {tracks.map(track => (
                  <CreatorTrackCard
                    key={track.id}
                    track={track}
                    onPlay={handlePlay}
                    onAddToPlaylist={handleAddToPlaylist}
                    onCopyUrl={handleCopyUrl}
                    onShare={handleShare}
                    isSaved={savedTracks.has(track.id)}
                    onSaveToggle={handleSaveToggle}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && tracks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
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
              <h3 className="text-xl font-semibold text-white mb-2">No public tracks yet</h3>
              <p className="text-gray-400 mb-6">
                This creator hasn&apos;t uploaded any public tracks yet
              </p>
              <button
                onClick={() => router.push(`/profile/${username}`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Profile
              </button>
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
              <div
                className={`px-6 py-3 rounded-lg shadow-lg border ${
                  toast.type === 'success'
                    ? 'bg-green-600 border-green-500 text-white'
                    : toast.type === 'error'
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-blue-600 border-blue-500 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {toast.type === 'success' && <span>✓</span>}
                  {toast.type === 'error' && <span>✗</span>}
                  {toast.type === 'info' && <span>ℹ</span>}
                  <span>{toast.message}</span>
                </div>
              </div>
            </div>
          )}

          {/* Add to Playlist Modal */}
          {user && selectedTrackId && (
            <AddToPlaylistModal
              isOpen={showAddToPlaylistModal}
              onClose={() => setShowAddToPlaylistModal(false)}
              trackId={selectedTrackId}
              userId={user.id}
              onSuccess={handlePlaylistSuccess}
              onError={handleModalError}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
