'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlaylistCard } from '@/components/playlists/PlaylistCard';
import { supabase } from '@/lib/supabase';
import type { Playlist } from '@/types/playlist';

type SortOption = 'recent' | 'oldest' | 'most_tracks';

const ITEMS_PER_PAGE = 20;

/**
 * All Playlists Page
 * 
 * Displays all user playlists with pagination and sorting options.
 * Supports sorting by recent, oldest, and most tracks.
 * 
 * Features:
 * - Pagination with 20 items per page
 * - Sorting options (recent, oldest, most tracks)
 * - Reuses PlaylistCard component
 * - Loading states for pagination
 * - Authentication check
 */
export default function AllPlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
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
        router.push('/login?redirect=/library/playlists');
        return;
      }
      
      setUserId(user.id);
    };

    checkAuth();
  }, [router]);

  // Fetch playlists
  useEffect(() => {
    if (!userId) return;

    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all playlists with track counts
        const { data, error: fetchError } = await supabase
          .from('playlists')
          .select(`
            *,
            playlist_tracks (
              id
            )
          `)
          .eq('user_id', userId);

        if (fetchError) {
          console.error('Error fetching playlists:', fetchError);
          setError('Failed to load playlists');
          return;
        }

        if (!data) {
          setPlaylists([]);
          setHasMore(false);
          return;
        }

        // Transform data to include track count
        const transformedPlaylists = data.map(playlist => {
          const playlistTracks = playlist.playlist_tracks as Array<{ id: string }> | undefined;
          return {
            ...playlist,
            track_count: playlistTracks?.length || 0
          };
        }) as (Playlist & { track_count: number })[];

        // Apply sorting
        const sortedPlaylists = [...transformedPlaylists].sort((a, b) => {
          switch (sortBy) {
            case 'recent':
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'oldest':
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'most_tracks':
              // Sort by track count
              return b.track_count - a.track_count;
            default:
              return 0;
          }
        });

        // Apply pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE;
        const paginatedPlaylists = sortedPlaylists.slice(from, to);

        // Check if there are more playlists
        setHasMore(to < sortedPlaylists.length);

        // Append or replace playlists based on page
        if (currentPage === 1) {
          setPlaylists(paginatedPlaylists);
        } else {
          setPlaylists(prev => [...prev, ...paginatedPlaylists]);
        }
      } catch (err) {
        console.error('Unexpected error fetching playlists:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchPlaylists();
  }, [userId, sortBy, currentPage]);

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    setPlaylists([]);
  };

  // Handle load more
  const handleLoadMore = () => {
    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
  };

  // Handle playlist deletion
  const handlePlaylistDeleted = () => {
    // Refresh the playlists list
    setCurrentPage(1);
    setPlaylists([]);
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

          <h1 className="text-3xl font-bold text-white mb-2">All Playlists</h1>
          <p className="text-gray-400">
            {playlists.length > 0 && `Showing ${playlists.length} playlist${playlists.length !== 1 ? 's' : ''}`}
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
              onClick={() => handleSortChange('most_tracks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'most_tracks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Most Tracks
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

        {/* Playlists Grid */}
        {!loading && playlists.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {playlists.map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  isOwner={true}
                  onDelete={handlePlaylistDeleted}
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
        {!loading && playlists.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <div className="text-6xl mb-4">🎵</div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No playlists yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first playlist to organize your favorite tracks
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
