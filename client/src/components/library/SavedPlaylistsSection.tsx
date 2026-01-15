'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSavedPlaylists } from '@/lib/library';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';
import { unsavePlaylist } from '@/lib/saveService';
import { onLikeEvent } from '@/utils/likeEventEmitter';
import SaveButton from '@/components/profile/SaveButton';
import PlaylistLikeButton from '@/components/playlists/PlaylistLikeButton';
import CreatorLink from '@/components/common/CreatorLink';
import type { SavedPlaylistWithCreator } from '@/types/library';

/**
 * PlaylistCardSkeleton Component
 * 
 * Loading skeleton for playlist cards during data fetch.
 */
function PlaylistCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
      {/* Cover Image Skeleton */}
      <div className="h-48 bg-gray-700"></div>
      
      {/* Content Skeleton */}
      <div className="p-4">
        {/* Title */}
        <div className="h-6 bg-gray-700 rounded mb-2"></div>
        
        {/* Creator */}
        <div className="h-4 bg-gray-700 rounded mb-2 w-2/3"></div>
        
        {/* Description */}
        <div className="h-4 bg-gray-700 rounded mb-3 w-full"></div>
        
        {/* Metadata */}
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-gray-700 rounded"></div>
          <div className="h-8 w-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * SavedPlaylistCard Component
 * 
 * Displays a saved playlist card matching creator page design with gradient placeholder,
 * SaveButton component, and navigation to playlist detail page.
 */
interface SavedPlaylistCardProps {
  playlist: SavedPlaylistWithCreator;
  onRemove: (playlistId: string) => void;
}

function SavedPlaylistCard({ playlist, onRemove }: SavedPlaylistCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(true);

  const handleCardClick = () => {
    router.push(`/playlist/${playlist.id}`);
  };

  const handleSaveToggle = async () => {
    // Optimistic update
    setIsSaved(false);
    // Call the remove handler
    await onRemove(playlist.id);
  };

  // Generate gradient placeholder if no cover image (same as creator page)
  const gradientColors = [
    'from-purple-400 to-pink-600',
    'from-blue-400 to-cyan-600',
    'from-green-400 to-teal-600',
    'from-orange-400 to-red-600',
    'from-indigo-400 to-purple-600',
  ];
  const gradientIndex = playlist.id.charCodeAt(0) % gradientColors.length;
  const gradient = gradientColors[gradientIndex];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors cursor-pointer group">
      {/* Cover Image or Gradient Placeholder */}
      <div 
        className="h-48 relative"
        onClick={handleCardClick}
      >
        {playlist.cover_image_url ? (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${playlist.cover_image_url})` }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            {/* Playlist icon */}
            <svg
              className="w-16 h-16 text-white opacity-80"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 
          className="text-lg font-semibold text-white truncate mb-2 cursor-pointer hover:text-blue-400 transition-colors"
          onClick={handleCardClick}
        >
          {playlist.name}
        </h3>
        
        {/* Creator Name */}
        <div className="text-sm text-gray-400 mb-2">
          by <CreatorLink 
            userId={playlist.creator_id}
            username={playlist.creator_username}
            displayName={playlist.creator_username}
            className="text-sm"
          />
        </div>
        
        {/* Description */}
        {playlist.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {playlist.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>
            {new Date(playlist.created_at).toLocaleDateString()}
          </span>
          <SaveButton
            itemId={playlist.id}
            itemType="playlist"
            isSaved={isSaved}
            onToggle={handleSaveToggle}
            size="sm"
          />
        </div>
        
        {/* Like Button */}
        <div className="mt-2">
          <PlaylistLikeButton playlistId={playlist.id} size="sm" />
        </div>
      </div>
    </div>
  );
}

/**
 * SavedPlaylistsSection Component
 * 
 * Displays a grid of playlists saved by the user from other creators.
 * - Desktop: 3 columns
 * - Tablet: 2 columns
 * - Mobile: 1 column
 * 
 * Features:
 * - Fetches saved playlists with creator information
 * - Displays 8 playlists initially
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state when no saved playlists exist
 * - Optimistic updates for remove actions
 * - Toast notifications for user feedback
 * - Cache integration with invalidation support
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */
interface SavedPlaylistsSectionProps {
  userId?: string;
  initialLimit?: number;
}

export default function SavedPlaylistsSection({ 
  userId, 
  initialLimit = 8 
}: SavedPlaylistsSectionProps) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<SavedPlaylistWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [totalPlaylistsCount, setTotalPlaylistsCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [displayLimit, setDisplayLimit] = useState(initialLimit);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Use provided userId or fall back to authenticated user
  const effectiveUserId = userId || user?.id;

  const fetchPlaylists = useCallback(async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.SAVED_PLAYLISTS(effectiveUserId);
    const cachedData = cache.get<{ playlists: SavedPlaylistWithCreator[]; totalCount: number }>(cacheKey);

    if (cachedData) {
      setPlaylists(cachedData.playlists);
      setTotalPlaylistsCount(cachedData.totalCount);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all saved playlists to get total count
      const allPlaylists = await getSavedPlaylists(effectiveUserId);
      setTotalPlaylistsCount(allPlaylists.length);
      
      // Store all playlists
      setPlaylists(allPlaylists);
      
      // Cache the data for 2 minutes
      cache.set(cacheKey, { playlists: allPlaylists, totalCount: allPlaylists.length }, CACHE_TTL.SAVED_PLAYLISTS);
    } catch (err) {
      console.error('Error fetching saved playlists:', err);
      setError('Failed to load saved playlists');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Listen for like events to update like counts
  useEffect(() => {
    const cleanup = onLikeEvent((detail) => {
      if (detail.itemType === 'playlist') {
        // Update the playlist in the list with new like count
        setPlaylists(prevPlaylists =>
          prevPlaylists.map(playlist =>
            playlist.id === detail.itemId
              ? { ...playlist, like_count: detail.likeCount }
              : playlist
          )
        );
      }
    });

    return cleanup;
  }, []);

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('saved-playlists-collapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Listen for cache invalidation events
  useEffect(() => {
    if (!effectiveUserId) return;

    const handleCacheInvalidated = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string }>;
      const invalidatedKey = customEvent.detail?.key;
      
      // Check if the invalidated key is relevant to this component
      if (invalidatedKey === CACHE_KEYS.SAVED_PLAYLISTS(effectiveUserId)) {
        console.log('Saved playlists cache invalidated, refetching...');
        fetchPlaylists();
      }
    };

    // Listen for cache invalidation events from the cache utility
    window.addEventListener('cache-invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('cache-invalidated', handleCacheInvalidated);
    };
  }, [effectiveUserId, fetchPlaylists]);

  // Handle playlist remove (optimistic)
  const handlePlaylistRemove = async (playlistId: string) => {
    if (!effectiveUserId) return;

    // Store the playlist for potential rollback
    const removedPlaylist = playlists.find(p => p.id === playlistId);
    if (!removedPlaylist) return;

    // Optimistic update - remove from display immediately
    setPlaylists(prevPlaylists => prevPlaylists.filter(playlist => playlist.id !== playlistId));
    setTotalPlaylistsCount(prev => prev - 1);

    try {
      // Call unsavePlaylist
      const result = await unsavePlaylist(effectiveUserId, playlistId);

      if (result.error || !result.data) {
        // Rollback on error
        setPlaylists(prevPlaylists => [...prevPlaylists, removedPlaylist]);
        setTotalPlaylistsCount(prev => prev + 1);
        handleShowToast('Failed to remove playlist. Please try again.', 'error');
        return;
      }

      // Success - invalidate cache
      cache.invalidate(CACHE_KEYS.SAVED_PLAYLISTS(effectiveUserId));
      handleShowToast('Playlist removed from saved', 'success');
    } catch (err) {
      // Rollback on exception
      setPlaylists(prevPlaylists => [...prevPlaylists, removedPlaylist]);
      setTotalPlaylistsCount(prev => prev + 1);
      console.error('Error removing playlist:', err);
      handleShowToast('Failed to remove playlist. Please try again.', 'error');
    }
  };

  // Handle toast notifications
  const handleShowToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('saved-playlists-collapsed', String(newState));
  };

  // Handle Load More
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Simulate brief loading for better UX
    setTimeout(() => {
      setDisplayLimit(prev => prev + 8);
      setIsLoadingMore(false);
    }, 300);
  };

  // Calculate if there are more playlists to load
  const hasMore = displayLimit < totalPlaylistsCount;
  const showLoadMore = totalPlaylistsCount >= 9 && hasMore;

  // Get playlists to display based on displayLimit
  const displayedPlaylists = playlists.slice(0, displayLimit);

  // Loading state - show skeleton grid
  if (loading) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            🔖 Saved Playlists
          </h2>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <PlaylistCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Error state - show error message with retry button
  if (error) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            🔖 Saved Playlists
          </h2>
        </div>

        {/* Error State */}
        <div className="bg-gray-800 rounded-lg p-8 border border-red-500/50">
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button
              onClick={fetchPlaylists}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no saved playlists exist
  if (playlists.length === 0) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            🔖 Saved Playlists (0)
          </h2>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No saved playlists yet
            </h3>
            <p className="text-gray-400">
              Save playlists from other creators to see them here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleCollapse}
            className="p-3 md:p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
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
            🔖 Saved Playlists ({totalPlaylistsCount})
          </h2>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {/* Playlists Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedPlaylists.map(playlist => (
              <SavedPlaylistCard
                key={playlist.id}
                playlist={playlist}
                onRemove={handlePlaylistRemove}
              />
            ))}
          </div>

          {/* Load More Button */}
          {showLoadMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </span>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
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
  );
}
