'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { TrackCardWithActions } from '@/components/library/TrackCardWithActions';
import { supabase } from '@/lib/supabase';
import { cache, CACHE_KEYS } from '@/utils/cache';
import type { TrackWithMembership } from '@/types/library';

type SortOption = 'recent' | 'oldest' | 'most_played' | 'most_liked';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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
            )
          `)
          .eq('user_id', userId);

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

        // Fetch user profile data
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, username')
          .eq('id', userId)
          .single();

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

        // Fetch playlist membership separately to avoid join issues
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
            // Handle the playlists data which could be an object or array
            const playlistData = pt.playlists;
            if (playlistData && typeof playlistData === 'object' && 'name' in playlistData) {
              existing.names.push((playlistData as { name: string }).name);
            }
            playlistMap.set(pt.track_id, existing);
          });
        }

        // Transform data to include membership info and like counts
        const transformedTracks = data.map(track => {
          const albumTracks = track.album_tracks as Array<{ album_id: string; albums: { name: string } }> | undefined;
          const playlistInfo = playlistMap.get(track.id) || { ids: [], names: [] };
          
          return {
            ...track,
            user: userProfile || undefined,
            albumId: albumTracks?.[0]?.album_id || null,
            albumName: albumTracks?.[0]?.albums?.name || null,
            playlistIds: playlistInfo.ids,
            playlistNames: playlistInfo.names,
            like_count: likeCountMap.get(track.id) || 0
          };
        }) as TrackWithMembership[];

        // If sorting by most_liked, sort the transformed tracks client-side
        // (since we can't sort by like_count in the database query)
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

  // Handle track update (optimistic)
  const handleTrackUpdate = useCallback((trackId: string, updates: Partial<TrackWithMembership>) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      )
    );
  }, []);

  // Handle track delete (optimistic)
  const handleTrackDelete = useCallback((trackId: string) => {
    setTracks(prevTracks => prevTracks.filter(track => track.id !== trackId));
    
    // Invalidate cache on mutation
    if (userId) {
      cache.invalidate(CACHE_KEYS.TRACKS(userId));
      cache.invalidate(CACHE_KEYS.STATS(userId));
      cache.invalidate(CACHE_KEYS.ALBUMS(userId));
      cache.invalidate(CACHE_KEYS.PLAYLISTS(userId));
    }
  }, [userId]);

  // Handle toast notifications
  const handleShowToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  if (!userId) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white">Checking authentication...</div>
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
                <TrackCardWithActions
                  key={track.id}
                  track={track}
                  userId={userId}
                  onTrackUpdate={handleTrackUpdate}
                  onTrackDelete={handleTrackDelete}
                  onShowToast={handleShowToast}
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
      </div>
    </div>
    </MainLayout>
  );
}
