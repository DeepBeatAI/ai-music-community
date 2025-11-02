'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAlbums } from '@/lib/albums';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';
import { AlbumCard } from './AlbumCard';
import { CreateAlbumModal } from './CreateAlbumModal';
import type { Album } from '@/types/album';

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
        
        {/* Description */}
        <div className="h-4 bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
        
        {/* Metadata */}
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-gray-700 rounded"></div>
          <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * MyAlbumsSection Component
 * 
 * Displays and manages user's albums (reusing playlist patterns).
 * - Desktop: 3-4 columns
 * - Tablet: 2-3 columns
 * - Mobile: Horizontal scroll
 * 
 * Features:
 * - Fetches user albums ordered by creation date
 * - Displays 6-8 albums initially
 * - "View All" button when more than 8 albums exist
 * - "+ New Album" button that opens CreateAlbumModal
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state with "Create your first album" message
 * - Optimistic updates for album actions
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5, 6.3, 6.4, 6.5, 9.4, 10.3
 */
interface MyAlbumsSectionProps {
  userId?: string;
  initialLimit?: number;
}

export default function MyAlbumsSection({ 
  userId, 
  initialLimit = 8 
}: MyAlbumsSectionProps) {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [totalAlbumsCount, setTotalAlbumsCount] = useState(0);

  // Use provided userId or fall back to authenticated user
  const effectiveUserId = userId || user?.id;

  const fetchAlbums = useCallback(async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.ALBUMS(effectiveUserId);
    const cachedAlbums = cache.get<Album[]>(cacheKey);

    if (cachedAlbums) {
      setTotalAlbumsCount(cachedAlbums.length);
      setAlbums(cachedAlbums.slice(0, initialLimit));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all albums to get total count
      const userAlbums = await getUserAlbums(effectiveUserId);
      setTotalAlbumsCount(userAlbums.length);
      
      // Limit albums for display
      const limitedAlbums = userAlbums.slice(0, initialLimit);
      setAlbums(limitedAlbums);
      
      // Cache the albums for 2 minutes
      cache.set(cacheKey, userAlbums, CACHE_TTL.ALBUMS);
    } catch (err) {
      console.error('Error fetching albums:', err);
      setError('Failed to load albums');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, initialLimit]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  // Handle album delete (optimistic)
  const handleAlbumDelete = (albumId: string) => {
    setAlbums(prevAlbums => prevAlbums.filter(album => album.id !== albumId));
    setTotalAlbumsCount(prev => prev - 1);
    
    // Invalidate cache on mutation
    if (effectiveUserId) {
      cache.invalidate(CACHE_KEYS.ALBUMS(effectiveUserId));
      cache.invalidate(CACHE_KEYS.STATS(effectiveUserId));
    }
  };

  // Handle successful album creation
  const handleAlbumCreated = () => {
    // Invalidate cache and refresh albums list
    if (effectiveUserId) {
      cache.invalidate(CACHE_KEYS.ALBUMS(effectiveUserId));
      cache.invalidate(CACHE_KEYS.STATS(effectiveUserId));
    }
    fetchAlbums();
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Determine if "View All" button should show
  const showViewAll = totalAlbumsCount > initialLimit;

  // Loading state - show skeleton grid
  if (loading) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            💿 My Albums
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
            💿 My Albums
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

  // Empty state - no albums exist
  if (albums.length === 0) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            💿 My Albums (0)
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>New Album</span>
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">💿</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No albums yet
            </h3>
            <p className="text-gray-400 mb-6">
              Create your first album to organize your tracks
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Album
            </button>
          </div>
        </div>

        {/* Create Album Modal */}
        <CreateAlbumModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleAlbumCreated}
        />
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
              className={`w-5 h-5 text-gray-400 transition-transform ${
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
            💿 My Albums ({totalAlbumsCount})
          </h2>
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span className="hidden sm:inline">New Album</span>
            </button>
            
            {showViewAll && (
              <Link
                href="/library/albums"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
              >
                <span>View All</span>
                <svg
                  className="w-4 h-4"
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
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {/* Albums Grid - Desktop: 3-4 columns, Tablet: 2-3 columns, Mobile: Horizontal scroll */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums.map(album => (
              <AlbumCard
                key={album.id}
                album={album}
                isOwner={true}
                onDelete={() => handleAlbumDelete(album.id)}
              />
            ))}
          </div>

          {/* Mobile: Horizontal Scroll */}
          <div className="sm:hidden overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {albums.map(album => (
                <div key={album.id} className="w-64 flex-shrink-0">
                  <AlbumCard
                    album={album}
                    isOwner={true}
                    onDelete={() => handleAlbumDelete(album.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Album Modal */}
      <CreateAlbumModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleAlbumCreated}
      />
    </div>
  );
}
