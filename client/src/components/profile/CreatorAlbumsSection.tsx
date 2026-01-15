'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { getPublicAlbums } from '@/lib/profileService';
import { getBulkSavedStatus } from '@/lib/saveService';
import { cache, CACHE_TTL } from '@/utils/cache';
import { onLikeEvent } from '@/utils/likeEventEmitter';
import SaveButton from './SaveButton';
import AlbumLikeButton from '@/components/albums/AlbumLikeButton';
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
 * CreatorAlbumCard Component
 * 
 * Displays an album card for creator profiles with save functionality.
 * No edit or delete options.
 */
interface CreatorAlbumCardProps {
  album: Album;
  isSaved: boolean;
  onSaveToggle: () => Promise<void>;
  isOwnProfile?: boolean;
}

function CreatorAlbumCard({ album, isSaved, onSaveToggle, isOwnProfile = false }: CreatorAlbumCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/album/${album.id}`);
  };

  // Generate gradient placeholder if no cover image (same as library AlbumCard)
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
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>
            {new Date(album.created_at).toLocaleDateString()}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <div className="flex-1">
            <AlbumLikeButton
              albumId={album.id}
              size="sm"
            />
          </div>
          
          {/* Save Button */}
          {!isOwnProfile && (
            <SaveButton
              itemId={album.id}
              itemType="album"
              isSaved={isSaved}
              onToggle={onSaveToggle}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * CreatorAlbumsSection Component
 * 
 * Displays a grid of creator's public albums with save functionality.
 * - Desktop: 3-4 columns
 * - Tablet: 2-3 columns
 * - Mobile: Horizontal scroll
 * 
 * Features:
 * - Fetches only public albums (is_public = true)
 * - Displays albums with save functionality
 * - No edit or delete options
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state when no albums exist
 * 
 * Requirements: 2.3, 2.4, 5.1, 5.2, 5.3, 14.1, 14.3
 */
interface CreatorAlbumsSectionProps {
  userId: string;
  initialLimit?: number;
  isOwnProfile?: boolean;
  username?: string;
}

export default function CreatorAlbumsSection({ 
  userId,
  initialLimit = 8,
  isOwnProfile = false,
  username
}: CreatorAlbumsSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Restore collapse state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`creator-albums-collapsed-${userId}`);
      return saved === 'true';
    }
    return false;
  });
  const [totalAlbumsCount, setTotalAlbumsCount] = useState(0);
  const [savedAlbumIds, setSavedAlbumIds] = useState<Set<string>>(new Set());

  const fetchAlbums = useCallback(async () => {
    if (!userId) {
      setError('User ID not provided');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `creator-albums-${userId}`;
    const cachedData = cache.get<{ albums: Album[]; totalCount: number }>(cacheKey);

    if (cachedData) {
      setAlbums(cachedData.albums.slice(0, initialLimit));
      setTotalAlbumsCount(cachedData.totalCount);
      setLoading(false);
      
      // Fetch saved status for cached albums
      if (user) {
        const albumsToCheck = cachedData.albums.slice(0, initialLimit);
        fetchSavedStatus(albumsToCheck);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch public albums only
      const publicAlbums = await getPublicAlbums(userId, 100, 0); // Fetch up to 100 albums
      setTotalAlbumsCount(publicAlbums.length);
      
      // Limit albums for display
      const limitedAlbums = publicAlbums.slice(0, initialLimit);
      setAlbums(limitedAlbums);
      
      // Cache the data for 5 minutes
      cache.set(cacheKey, { albums: publicAlbums, totalCount: publicAlbums.length }, CACHE_TTL.ALBUMS);
      
      // Fetch saved status if user is authenticated
      if (user) {
        fetchSavedStatus(limitedAlbums);
      }
    } catch (err) {
      console.error('Error fetching creator albums:', err);
      setError('Failed to load albums');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialLimit, user]);

  // Fetch saved status for albums using bulk query
  const fetchSavedStatus = async (albumsToCheck: Album[]) => {
    if (!user) return;

    try {
      const albumIds = albumsToCheck.map(album => album.id);
      const result = await getBulkSavedStatus(user.id, albumIds, 'album');
      
      if (result.data) {
        const savedIds = new Set<string>();
        Object.entries(result.data).forEach(([id, isSaved]) => {
          if (isSaved) savedIds.add(id);
        });
        setSavedAlbumIds(savedIds);
      }
    } catch (err) {
      console.error('Error fetching saved status:', err);
    }
  };

  useEffect(() => {
    fetchAlbums();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialLimit]);

  // Listen for like events to update like counts
  useEffect(() => {
    const cleanup = onLikeEvent((detail) => {
      if (detail.itemType === 'album') {
        // Update the album in the list with new like count
        setAlbums(prevAlbums =>
          prevAlbums.map(album =>
            album.id === detail.itemId
              ? { ...album, like_count: detail.likeCount }
              : album
          )
        );
      }
    });

    return cleanup;
  }, []);

  // Save collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`creator-albums-collapsed-${userId}`, String(isCollapsed));
    }
  }, [isCollapsed, userId]);

  // Handle save toggle
  const handleSaveToggle = async (albumId: string) => {
    if (!user) {
      showToast('Please log in to save albums', 'info');
      router.push('/login');
      return;
    }

    // Optimistic update
    const wasSaved = savedAlbumIds.has(albumId);
    const newSavedIds = new Set(savedAlbumIds);
    
    if (wasSaved) {
      newSavedIds.delete(albumId);
    } else {
      newSavedIds.add(albumId);
    }
    
    setSavedAlbumIds(newSavedIds);

    try {
      // The actual save/unsave is handled by the SaveButton component
      // This is just for optimistic UI updates
    } catch (err) {
      // Rollback on error
      setSavedAlbumIds(savedAlbumIds);
      console.error('Error toggling save:', err);
    }
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Loading state - show skeleton grid
  if (loading) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            💿 Albums
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
            💿 Albums
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
            💿 Albums (0)
          </h2>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">💿</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No public albums yet
            </h3>
            <p className="text-gray-400">
              This creator hasn&apos;t created any public albums
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if "View All" button should show
  const showViewAll = totalAlbumsCount > initialLimit && username;

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
            💿 Albums ({totalAlbumsCount})
          </h2>
        </div>

        {!isCollapsed && showViewAll && (
          <Link
            href={`/profile/${username}/albums`}
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

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {/* Albums Grid - Desktop: 3-4 columns, Tablet: 2-3 columns, Mobile: Horizontal scroll */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums.map(album => (
              <CreatorAlbumCard
                key={album.id}
                album={album}
                isSaved={savedAlbumIds.has(album.id)}
                onSaveToggle={() => handleSaveToggle(album.id)}
                isOwnProfile={isOwnProfile}
              />
            ))}
          </div>

          {/* Mobile: Horizontal Scroll */}
          <div className="sm:hidden overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {albums.map(album => (
                <div key={album.id} className="w-64 flex-shrink-0">
                  <CreatorAlbumCard
                    album={album}
                    isSaved={savedAlbumIds.has(album.id)}
                    onSaveToggle={() => handleSaveToggle(album.id)}
                    isOwnProfile={isOwnProfile}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
