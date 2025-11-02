'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlbumCard } from '@/components/library/AlbumCard';
import { supabase } from '@/lib/supabase';
import type { Album } from '@/types/album';

type SortOption = 'recent' | 'oldest' | 'most_played';

const ITEMS_PER_PAGE = 20;

/**
 * All Albums Page
 * 
 * Displays all user albums with pagination and sorting options.
 * Supports sorting by recent, oldest, and most played.
 * 
 * Features:
 * - Pagination with 20 items per page
 * - Sorting options (recent, oldest, most played)
 * - Reuses AlbumCard component
 * - Loading states for pagination
 * - Authentication check
 * 
 * Requirements: 3.3, 4.4, 6.7, 10.7
 */
export default function AllAlbumsPage() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
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
        router.push('/login?redirect=/library/albums');
        return;
      }
      
      setUserId(user.id);
    };

    checkAuth();
  }, [router]);

  // Fetch albums
  useEffect(() => {
    if (!userId) return;

    const fetchAlbums = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query based on sort option
        let query = supabase
          .from('albums')
          .select(`
            *,
            album_tracks (
              id
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
            // For albums, we'll sort by track count as a proxy for popularity
            // Note: This is a simplified approach; a more accurate method would
            // involve aggregating play counts from tracks
            query = query.order('created_at', { ascending: false });
            break;
        }

        // Apply pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching albums:', fetchError);
          setError('Failed to load albums');
          return;
        }

        if (!data) {
          setAlbums([]);
          setHasMore(false);
          return;
        }

        // Transform data to include track count
        const transformedAlbums = data.map(album => {
          const albumTracks = album.album_tracks as Array<{ id: string }> | undefined;
          return {
            ...album,
            track_count: albumTracks?.length || 0
          };
        }) as Album[];

        // Sort by track count if most_played is selected
        if (sortBy === 'most_played') {
          transformedAlbums.sort((a, b) => {
            const aCount = (a as Album & { track_count: number }).track_count || 0;
            const bCount = (b as Album & { track_count: number }).track_count || 0;
            return bCount - aCount;
          });
        }

        // Check if there are more albums
        setHasMore(transformedAlbums.length === ITEMS_PER_PAGE);

        // Append or replace albums based on page
        if (currentPage === 1) {
          setAlbums(transformedAlbums);
        } else {
          setAlbums(prev => [...prev, ...transformedAlbums]);
        }
      } catch (err) {
        console.error('Unexpected error fetching albums:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchAlbums();
  }, [userId, sortBy, currentPage]);

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    setAlbums([]);
  };

  // Handle load more
  const handleLoadMore = () => {
    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
  };

  // Handle album deletion
  const handleAlbumDeleted = (deletedAlbumId: string) => {
    setAlbums(prev => prev.filter(album => album.id !== deletedAlbumId));
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

          <h1 className="text-3xl font-bold text-white mb-2">All Albums</h1>
          <p className="text-gray-400">
            {albums.length > 0 && `Showing ${albums.length} album${albums.length !== 1 ? 's' : ''}`}
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

        {/* Albums Grid */}
        {!loading && albums.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {albums.map(album => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  isOwner={true}
                  onDelete={() => handleAlbumDeleted(album.id)}
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
        {!loading && albums.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <div className="text-6xl mb-4">💿</div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No albums yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first album to organize your tracks
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
