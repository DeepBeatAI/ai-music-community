'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTracksWithMembership } from '@/lib/library';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';
import { TrackCardWithActions } from './TrackCardWithActions';
import type { TrackWithMembership } from '@/types/library';

/**
 * TrackCardSkeleton Component
 * 
 * Loading skeleton for track cards during data fetch.
 */
function TrackCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
      {/* Cover Art Skeleton */}
      <div className="aspect-square bg-gray-700"></div>
      
      {/* Content Skeleton */}
      <div className="p-4">
        {/* Title */}
        <div className="h-6 bg-gray-700 rounded mb-2"></div>
        
        {/* Badges */}
        <div className="flex gap-2 mb-3">
          <div className="h-6 w-20 bg-gray-700 rounded-full"></div>
          <div className="h-6 w-24 bg-gray-700 rounded-full"></div>
        </div>
        
        {/* Metadata */}
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-gray-700 rounded"></div>
          <div className="h-4 w-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * AllTracksSection Component
 * 
 * Displays a grid of user's uploaded tracks with management actions.
 * - Desktop: 4 columns
 * - Tablet: 3 columns
 * - Mobile: 2 columns
 * 
 * Features:
 * - Fetches tracks with album and playlist membership
 * - Displays 8-12 tracks initially
 * - "View All" button when more than 12 tracks exist
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state when no tracks exist
 * - Optimistic updates for track actions
 * - Toast notifications for user feedback
 * 
 * Requirements: 3.1, 3.2, 3.3, 6.3, 6.4, 6.9, 9.4, 10.2
 */
interface AllTracksSectionProps {
  userId?: string;
  initialLimit?: number;
}

export default function AllTracksSection({ 
  userId, 
  initialLimit = 12 
}: AllTracksSectionProps) {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<TrackWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [totalTracksCount, setTotalTracksCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Use provided userId or fall back to authenticated user
  const effectiveUserId = userId || user?.id;

  const fetchTracks = useCallback(async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.TRACKS(effectiveUserId);
    const cachedData = cache.get<{ tracks: TrackWithMembership[]; totalCount: number }>(cacheKey);

    if (cachedData) {
      setTracks(cachedData.tracks.slice(0, initialLimit));
      setTotalTracksCount(cachedData.totalCount);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all tracks to get total count
      const allTracks = await getUserTracksWithMembership(effectiveUserId);
      setTotalTracksCount(allTracks.length);
      
      // Limit tracks for display
      const limitedTracks = allTracks.slice(0, initialLimit);
      setTracks(limitedTracks);
      
      // Cache the data for 2 minutes
      cache.set(cacheKey, { tracks: allTracks, totalCount: allTracks.length }, CACHE_TTL.TRACKS);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, initialLimit]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Listen for cache invalidation events
  useEffect(() => {
    if (!effectiveUserId) return;

    const handleCacheInvalidated = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string }>;
      const invalidatedKey = customEvent.detail?.key;
      
      // Check if the invalidated key is relevant to this component
      if (invalidatedKey === CACHE_KEYS.TRACKS(effectiveUserId)) {
        console.log(`Tracks cache invalidated, refetching...`);
        fetchTracks();
      }
    };

    // Listen for cache invalidation events from the cache utility
    window.addEventListener('cache-invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('cache-invalidated', handleCacheInvalidated);
    };
  }, [effectiveUserId, fetchTracks]);

  // Handle track update (optimistic)
  const handleTrackUpdate = (trackId: string, updates: Partial<TrackWithMembership>) => {
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      )
    );
  };

  // Handle track delete (optimistic)
  const handleTrackDelete = (trackId: string) => {
    setTracks(prevTracks => prevTracks.filter(track => track.id !== trackId));
    setTotalTracksCount(prev => prev - 1);
    
    // Invalidate cache on mutation
    if (effectiveUserId) {
      cache.invalidate(CACHE_KEYS.TRACKS(effectiveUserId));
      cache.invalidate(CACHE_KEYS.STATS(effectiveUserId));
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
    setIsCollapsed(!isCollapsed);
  };

  // Determine if "View All" button should show
  const showViewAll = totalTracksCount > initialLimit;

  // Loading state - show skeleton grid
  if (loading) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            📀 All Tracks
          </h2>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <TrackCardSkeleton key={index} />
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
            📀 All Tracks
          </h2>
        </div>

        {/* Error State */}
        <div className="bg-gray-800 rounded-lg p-8 border border-red-500/50">
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button
              onClick={fetchTracks}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no tracks exist
  if (tracks.length === 0) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            📀 All Tracks (0)
          </h2>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No tracks yet
            </h3>
            <p className="text-gray-400 mb-6">
              Upload your first track to get started
            </p>
            <button
              onClick={() => {
                // Scroll to upload section (if it exists)
                const uploadSection = document.querySelector('[data-section="upload"]');
                if (uploadSection) {
                  uploadSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Upload Track
            </button>
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
            📀 All Tracks ({totalTracksCount})
          </h2>
        </div>

        {showViewAll && !isCollapsed && (
          <a
            href="/library/tracks"
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
          </a>
        )}
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {/* Tracks Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tracks.map(track => (
              <TrackCardWithActions
                key={track.id}
                track={track}
                userId={effectiveUserId!}
                onTrackUpdate={handleTrackUpdate}
                onTrackDelete={handleTrackDelete}
                onShowToast={handleShowToast}
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
