'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrackCard } from '@/components/library/TrackCard';
import { supabase } from '@/lib/supabase';
import type { TrackWithMembership } from '@/types/library';

type SortOption = 'recent' | 'oldest' | 'most_played';

const ITEMS_PER_PAGE = 20;

/**
 * All Tracks Page
 * 
 * Displays all user tracks with pagination and sorting options.
 * Supports sorting by recent, oldest, and most played.
 * 
 * Features:
 * - Pagination with 20 items per page
 * - Sorting options (recent, oldest, most played)
 * - Reuses TrackCard component
 * - Loading states for pagination
 * - Authentication check
 * 
 * Requirements: 3.3, 4.4, 6.7, 10.7
 */
export default function AllTracksPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?redirect=/library/tracks');
        return;
      }
      
      setUserId(user.id);
    };

    checkAuth();
  }, [router]);

  // Fetch tracks
  useEffect(() => {
    if (!userId) return;

    const fetchTracks = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query based on sort option
        let query = supabase
          .from('tracks')
          .select(`
            *,
            album_tracks (
              album_id,
              albums (name)
            ),
            playlist_tracks (
              playlist_id,
              playlists (name)
            )
          `)
          .eq('user_id', userId);

        // Apply sorting
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

        // Transform data to include membership info
        const transformedTracks = data.map(track => {
          const albumTracks = track.album_tracks as Array<{ album_id: string; albums: { name: string } }> | undefined;
          const playlistTracks = track.playlist_tracks as Array<{ playlist_id: string; playlists: { name: string } }> | undefined;
          
          return {
            ...track,
            albumId: albumTracks?.[0]?.album_id || null,
            albumName: albumTracks?.[0]?.albums?.name || null,
            playlistIds: playlistTracks?.map(pt => pt.playlist_id) || [],
            playlistNames: playlistTracks?.map(pt => pt.playlists?.name) || []
          };
        }) as TrackWithMembership[];

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
  }, [userId, sortBy, currentPage]);

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

  // Track action handlers (placeholder implementations)
  const handleAddToAlbum = (trackId: string) => {
    console.log('Add to album:', trackId);
    // TODO: Implement in task 16
  };

  const handleAddToPlaylist = (trackId: string) => {
    console.log('Add to playlist:', trackId);
    // TODO: Implement in task 16
  };

  const handleCopyUrl = (trackId: string) => {
    const url = `${window.location.origin}/tracks/${trackId}`;
    navigator.clipboard.writeText(url);
    // TODO: Show success toast
  };

  const handleShare = (trackId: string) => {
    console.log('Share track:', trackId);
    // TODO: Implement in task 17
  };

  const handleDelete = (trackId: string) => {
    console.log('Delete track:', trackId);
    // TODO: Implement in task 18
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/library')}
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
            Back to Library
          </button>

          <h1 className="text-3xl font-bold text-white mb-2">All Tracks</h1>
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
          </div>
        </div>

        {/* Error State */}
        {error && (
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
                <TrackCard
                  key={track.id}
                  track={track}
                  onAddToAlbum={handleAddToAlbum}
                  onAddToPlaylist={handleAddToPlaylist}
                  onCopyUrl={handleCopyUrl}
                  onShare={handleShare}
                  onDelete={handleDelete}
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
            <h3 className="text-xl font-semibold text-white mb-2">No tracks yet</h3>
            <p className="text-gray-400 mb-6">
              Upload your first track to get started
            </p>
            <button
              onClick={() => router.push('/library')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
