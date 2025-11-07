'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { getPublicPlaylists } from '@/lib/profileService';
import { getSavedStatus } from '@/lib/saveService';
import { cache, CACHE_TTL } from '@/utils/cache';
import SaveButton from './SaveButton';
import type { Playlist } from '@/types/playlist';

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
 * CreatorPlaylistCard Component
 * 
 * Displays a playlist card for creator profiles with save functionality.
 * No edit or delete options.
 */
interface CreatorPlaylistCardProps {
  playlist: Playlist;
  isSaved: boolean;
  onSaveToggle: () => Promise<void>;
}

function CreatorPlaylistCard({ playlist, isSaved, onSaveToggle }: CreatorPlaylistCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/playlist/${playlist.id}`);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors cursor-pointer group">
      {/* Cover Image */}
      <div 
        className="h-48 bg-gray-700 bg-cover bg-center relative"
        style={playlist.cover_image_url ? { backgroundImage: `url(${playlist.cover_image_url})` } : {}}
        onClick={handleCardClick}
      >
        {!playlist.cover_image_url && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <svg
              className="w-16 h-16"
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
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title and Save Button */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 
            className="text-lg font-semibold text-white truncate flex-1 cursor-pointer hover:text-blue-400 transition-colors"
            onClick={handleCardClick}
          >
            {playlist.name}
          </h3>
          <SaveButton
            itemId={playlist.id}
            itemType="playlist"
            isSaved={isSaved}
            onToggle={onSaveToggle}
            size="sm"
          />
        </div>
        
        {/* Description */}
        {playlist.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {playlist.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {new Date(playlist.created_at).toLocaleDateString()}
          </span>
          <span className="px-2 py-1 bg-pink-600 text-white rounded-full">
            📝 Playlist
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * CreatorPlaylistsSection Component
 * 
 * Displays a grid of creator's public playlists with save functionality.
 * - Desktop: 3-4 columns
 * - Tablet: 2-3 columns
 * - Mobile: Horizontal scroll
 * 
 * Features:
 * - Fetches only public playlists (is_public = true)
 * - Displays playlists with save functionality
 * - No edit or delete options
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state when no playlists exist
 * 
 * Requirements: 2.3, 2.4, 5.1, 5.2, 5.3, 14.1, 14.3
 */
interface CreatorPlaylistsSectionProps {
  userId: string;
  initialLimit?: number;
}

export default function CreatorPlaylistsSection({ 
  userId,
  initialLimit = 8
}: CreatorPlaylistsSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Restore collapse state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`creator-playlists-collapsed-${userId}`);
      return saved === 'true';
    }
    return false;
  });
  const [totalPlaylistsCount, setTotalPlaylistsCount] = useState(0);
  const [savedPlaylistIds, setSavedPlaylistIds] = useState<Set<string>>(new Set());

  const fetchPlaylists = useCallback(async () => {
    if (!userId) {
      setError('User ID not provided');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `creator-playlists-${userId}`;
    const cachedData = cache.get<{ playlists: Playlist[]; totalCount: number }>(cacheKey);

    if (cachedData) {
      setPlaylists(cachedData.playlists.slice(0, initialLimit));
      setTotalPlaylistsCount(cachedData.totalCount);
      setLoading(false);
      
      // Fetch saved status for cached playlists
      if (user) {
        const playlistsToCheck = cachedData.playlists.slice(0, initialLimit);
        fetchSavedStatus(playlistsToCheck);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch public playlists only
      const publicPlaylists = await getPublicPlaylists(userId, 100, 0); // Fetch up to 100 playlists
      setTotalPlaylistsCount(publicPlaylists.length);
      
      // Limit playlists for display
      const limitedPlaylists = publicPlaylists.slice(0, initialLimit);
      setPlaylists(limitedPlaylists);
      
      // Cache the data for 5 minutes
      cache.set(cacheKey, { playlists: publicPlaylists, totalCount: publicPlaylists.length }, CACHE_TTL.PLAYLISTS);
      
      // Fetch saved status if user is authenticated
      if (user) {
        fetchSavedStatus(limitedPlaylists);
      }
    } catch (err) {
      console.error('Error fetching creator playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialLimit, user]);

  // Fetch saved status for playlists
  const fetchSavedStatus = async (playlistsToCheck: Playlist[]) => {
    if (!user) return;

    try {
      const savedIds = new Set<string>();
      
      // Check saved status for each playlist
      for (const playlist of playlistsToCheck) {
        const isSaved = await getSavedStatus(user.id, playlist.id, 'playlist');
        if (isSaved) {
          savedIds.add(playlist.id);
        }
      }
      
      setSavedPlaylistIds(savedIds);
    } catch (err) {
      console.error('Error fetching saved status:', err);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialLimit]);

  // Save collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`creator-playlists-collapsed-${userId}`, String(isCollapsed));
    }
  }, [isCollapsed, userId]);

  // Handle save toggle
  const handleSaveToggle = async (playlistId: string) => {
    if (!user) {
      showToast('Please log in to save playlists', 'info');
      router.push('/login');
      return;
    }

    // Optimistic update
    const wasSaved = savedPlaylistIds.has(playlistId);
    const newSavedIds = new Set(savedPlaylistIds);
    
    if (wasSaved) {
      newSavedIds.delete(playlistId);
    } else {
      newSavedIds.add(playlistId);
    }
    
    setSavedPlaylistIds(newSavedIds);

    try {
      // The actual save/unsave is handled by the SaveButton component
      // This is just for optimistic UI updates
    } catch (err) {
      // Rollback on error
      setSavedPlaylistIds(savedPlaylistIds);
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
            📝 Public Playlists
          </h2>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            📝 Public Playlists
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

  // Empty state - no playlists exist
  if (playlists.length === 0) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            📝 Public Playlists (0)
          </h2>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No public playlists yet
            </h3>
            <p className="text-gray-400">
              This creator hasn&apos;t created any public playlists
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
            📝 Public Playlists ({totalPlaylistsCount})
          </h2>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {/* Playlists Grid - Desktop: 3-4 columns, Tablet: 2-3 columns, Mobile: Horizontal scroll */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.map(playlist => (
              <CreatorPlaylistCard
                key={playlist.id}
                playlist={playlist}
                isSaved={savedPlaylistIds.has(playlist.id)}
                onSaveToggle={() => handleSaveToggle(playlist.id)}
              />
            ))}
          </div>

          {/* Mobile: Horizontal Scroll */}
          <div className="sm:hidden overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {playlists.map(playlist => (
                <div key={playlist.id} className="w-64 flex-shrink-0">
                  <CreatorPlaylistCard
                    playlist={playlist}
                    isSaved={savedPlaylistIds.has(playlist.id)}
                    onSaveToggle={() => handleSaveToggle(playlist.id)}
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
