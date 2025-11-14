'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSavedAlbums } from '@/lib/library';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';
import SaveButton from '@/components/profile/SaveButton';
import type { SavedAlbumWithCreator } from '@/types/library';

/**
 * AlbumCardSkeleton Component
 * 
 * Loading skeleton for album cards during data fetch.
 */
function AlbumCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
      {/* Cover Image Skeleton */}
      <div className="h-48 bg-gray-700"></div>
      
      {/* Content Skeleton */}
      <div className="p-4">
        {/* Title */}
        <div className="h-6 bg-gray-700 rounded mb-2"></div>
        
        {/* Creator */}
        <div className="h-4 bg-gray-700 rounded mb-2 w-3/4"></div>
        
        {/* Metadata */}
        <div className="flex justify-between mb-3">
          <div className="h-3 w-24 bg-gray-700 rounded"></div>
          <div className="h-3 w-16 bg-gray-700 rounded"></div>
        </div>
        
        {/* Button */}
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

/**
 * SavedAlbumCard Component
 * 
 * Displays a saved album card matching creator page design.
 */
interface SavedAlbumCardProps {
  album: SavedAlbumWithCreator;
  onSaveToggle: () => Promise<void>;
}

function SavedAlbumCard({ album, onSaveToggle }: SavedAlbumCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/album/${album.id}`);
  };

  // Generate gradient placeholder if no cover image (same as creator page)
  const gradientColors = [
    'from-purple-400 to-pink-600',
    'from-blue-400 to-cyan-600',
    'from-green-400 to-teal-600',
    'from-orange-400 to-red-600',
    'from-indigo-400 to-purple-600',
  ];
  const gradientIndex = album.id.charCodeAt(0) % gradientColors.length;
  const gradient = gradientColors[gradientIndex];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors cursor-pointer group">
      {/* Cover Image or Gradient Placeholder */}
      <div 
        className="h-48 relative"
        onClick={handleCardClick}
      >
        {album.cover_image_url ? (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${album.cover_image_url})` }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            {/* Album icon (💿) */}
            <div className="text-6xl text-white opacity-80">💿</div>
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
          {album.name}
        </h3>
        
        {/* Description */}
        {album.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {album.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {new Date(album.created_at).toLocaleDateString()}
          </span>
          <SaveButton
            itemId={album.id}
            itemType="album"
            isSaved={true}
            onToggle={onSaveToggle}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * SavedAlbumsSection Component
 * 
 * Displays a grid of albums saved by the user from other creators.
 * - Desktop: 4 columns
 * - Large tablet: 3 columns
 * - Small tablet: 2 columns
 * - Mobile: 1 column
 * 
 * Features:
 * - Fetches saved albums with creator information
 * - Displays 8 albums initially
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state when no saved albums exist
 * - Optimistic updates for remove actions
 * - Toast notifications for user feedback
 * - Cache integration with invalidation support
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */
interface SavedAlbumsSectionProps {
  userId?: string;
  initialLimit?: number;
}

export default function SavedAlbumsSection({ 
  userId, 
  initialLimit = 8 
}: SavedAlbumsSectionProps) {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<SavedAlbumWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [totalAlbumsCount, setTotalAlbumsCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Use provided userId or fall back to authenticated user
  const effectiveUserId = userId || user?.id;

  const fetchAlbums = useCallback(async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.SAVED_ALBUMS(effectiveUserId);
    const cachedData = cache.get<{ albums: SavedAlbumWithCreator[]; totalCount: number }>(cacheKey);

    if (cachedData) {
      setAlbums(cachedData.albums.slice(0, initialLimit));
      setTotalAlbumsCount(cachedData.totalCount);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all saved albums to get total count
      const allAlbums = await getSavedAlbums(effectiveUserId);
      setTotalAlbumsCount(allAlbums.length);
      
      // Limit albums for display
      const limitedAlbums = allAlbums.slice(0, initialLimit);
      setAlbums(limitedAlbums);
      
      // Cache the data for 2 minutes
      cache.set(cacheKey, { albums: allAlbums, totalCount: allAlbums.length }, CACHE_TTL.SAVED_ALBUMS);
    } catch (err) {
      console.error('Error fetching saved albums:', err);
      setError('Failed to load saved albums');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, initialLimit]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('saved-albums-collapsed');
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
      if (invalidatedKey === CACHE_KEYS.SAVED_ALBUMS(effectiveUserId)) {
        console.log('Saved albums cache invalidated, refetching...');
        fetchAlbums();
      }
    };

    // Listen for cache invalidation events from the cache utility
    window.addEventListener('cache-invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('cache-invalidated', handleCacheInvalidated);
    };
  }, [effectiveUserId, fetchAlbums]);

  // Handle save toggle (for SaveButton)
  const handleSaveToggle = async (albumId: string) => {
    if (!effectiveUserId) return;

    // Store the album for potential rollback
    const removedAlbum = albums.find(a => a.id === albumId);
    if (!removedAlbum) return;

    // Optimistic update - remove from display immediately
    setAlbums(prevAlbums => prevAlbums.filter(album => album.id !== albumId));
    setTotalAlbumsCount(prev => prev - 1);

    try {
      // The actual unsave is handled by the SaveButton component
      // Just invalidate cache on success
      cache.invalidate(CACHE_KEYS.SAVED_ALBUMS(effectiveUserId));
      handleShowToast('Album removed from saved', 'success');
    } catch (err) {
      // Rollback on exception
      setAlbums(prevAlbums => [...prevAlbums, removedAlbum]);
      setTotalAlbumsCount(prev => prev + 1);
      console.error('Error removing album:', err);
      handleShowToast('Failed to remove album. Please try again.', 'error');
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
    localStorage.setItem('saved-albums-collapsed', String(newState));
  };

  // Loading state - show skeleton grid
  if (loading) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            🔖 Saved Albums
          </h2>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <AlbumCardSkeleton key={index} />
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
            🔖 Saved Albums
          </h2>
        </div>

        {/* Error State */}
        <div className="bg-gray-800 rounded-lg p-8 border border-red-500/50">
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button
              onClick={fetchAlbums}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no saved albums exist
  if (albums.length === 0) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            🔖 Saved Albums (0)
          </h2>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No saved albums yet
            </h3>
            <p className="text-gray-400">
              Save albums from other creators to see them here
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
            🔖 Saved Albums ({totalAlbumsCount})
          </h2>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {/* Albums Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums.map(album => (
              <SavedAlbumCard
                key={album.id}
                album={album}
                onSaveToggle={() => handleSaveToggle(album.id)}
              />
            ))}
          </div>
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
