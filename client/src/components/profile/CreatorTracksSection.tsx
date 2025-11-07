'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayback } from '@/contexts/PlaybackContext';
import { getPublicTracks } from '@/lib/profileService';
import { getSavedStatus } from '@/lib/saveService';
import { cache, CACHE_TTL } from '@/utils/cache';
import { CreatorTrackCard } from './CreatorTrackCard';
import type { TrackWithMembership } from '@/types/library';
import type { Track } from '@/types/track';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

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
 * CreatorTracksSection Component
 * 
 * Displays a grid of creator's public tracks with save functionality.
 * - Desktop: 4 columns
 * - Tablet: 3 columns
 * - Mobile: 2 columns
 * 
 * Features:
 * - Fetches only public tracks (is_public = true)
 * - Displays tracks with save functionality
 * - "View All" button when showViewAll is true
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state when no tracks exist
 * - Toast notifications for user feedback
 * 
 * Requirements: 2.5, 5.1, 5.2, 5.3, 7.1, 7.2, 14.1, 14.3
 */
interface CreatorTracksSectionProps {
  userId: string;
  username?: string;
  initialLimit?: number;
  showViewAll?: boolean;
}

export default function CreatorTracksSection({ 
  userId,
  username,
  initialLimit = 8,
  showViewAll = false
}: CreatorTracksSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { playTrack } = usePlayback();
  const [tracks, setTracks] = useState<TrackWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Restore collapse state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`creator-tracks-collapsed-${userId}`);
      return saved === 'true';
    }
    return false;
  });
  const [totalTracksCount, setTotalTracksCount] = useState(0);
  const [savedTrackIds, setSavedTrackIds] = useState<Set<string>>(new Set());

  const fetchTracks = useCallback(async () => {
    if (!userId) {
      setError('User ID not provided');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `creator-tracks-${userId}`;
    const cachedData = cache.get<{ tracks: TrackWithMembership[]; totalCount: number }>(cacheKey);

    if (cachedData) {
      setTracks(cachedData.tracks.slice(0, initialLimit));
      setTotalTracksCount(cachedData.totalCount);
      setLoading(false);
      
      // Fetch saved status for cached tracks
      if (user) {
        const tracksToCheck = cachedData.tracks.slice(0, initialLimit);
        fetchSavedStatus(tracksToCheck);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch public tracks only
      const publicTracks = await getPublicTracks(userId, 100, 0); // Fetch up to 100 tracks
      
      // Convert Track[] to TrackWithMembership[] by adding membership fields
      const tracksWithMembership: TrackWithMembership[] = publicTracks.map((track: Track) => ({
        ...track,
        albumId: null,
        albumName: null,
        playlistIds: [],
        playlistNames: [],
      }));
      
      setTotalTracksCount(tracksWithMembership.length);
      
      // Limit tracks for display
      const limitedTracks = tracksWithMembership.slice(0, initialLimit);
      setTracks(limitedTracks);
      
      // Cache the data for 5 minutes
      cache.set(cacheKey, { tracks: tracksWithMembership, totalCount: tracksWithMembership.length }, CACHE_TTL.TRACKS);
      
      // Fetch saved status if user is authenticated
      if (user) {
        fetchSavedStatus(limitedTracks);
      }
    } catch (err) {
      console.error('Error fetching creator tracks:', err);
      setError('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialLimit, user]);

  // Fetch saved status for tracks
  const fetchSavedStatus = async (tracksToCheck: TrackWithMembership[]) => {
    if (!user) return;

    try {
      const savedIds = new Set<string>();
      
      // Check saved status for each track
      for (const track of tracksToCheck) {
        const isSaved = await getSavedStatus(user.id, track.id, 'track');
        if (isSaved) {
          savedIds.add(track.id);
        }
      }
      
      setSavedTrackIds(savedIds);
    } catch (err) {
      console.error('Error fetching saved status:', err);
    }
  };

  useEffect(() => {
    fetchTracks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialLimit]);

  // Save collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`creator-tracks-collapsed-${userId}`, String(isCollapsed));
    }
  }, [isCollapsed, userId]);

  // Handle save toggle
  const handleSaveToggle = async (trackId: string) => {
    if (!user) {
      showToast('Please log in to save tracks', 'info');
      router.push('/login');
      return;
    }

    // Optimistic update
    const wasSaved = savedTrackIds.has(trackId);
    const newSavedIds = new Set(savedTrackIds);
    
    if (wasSaved) {
      newSavedIds.delete(trackId);
    } else {
      newSavedIds.add(trackId);
    }
    
    setSavedTrackIds(newSavedIds);

    try {
      // The actual save/unsave is handled by the SaveButton component
      // This is just for optimistic UI updates
    } catch (err) {
      // Rollback on error
      setSavedTrackIds(savedTrackIds);
      console.error('Error toggling save:', err);
    }
  };

  // Handle add to playlist
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddToPlaylist = (trackId: string) => {
    if (!user) {
      showToast('Please log in to add tracks to playlists', 'info');
      router.push('/login');
      return;
    }
    
    // TODO: Implement add to playlist modal
    showToast('Add to playlist feature coming soon', 'info');
  };

  // Handle copy URL
  const handleCopyUrl = (trackId: string) => {
    const url = `${window.location.origin}/tracks/${trackId}`;
    navigator.clipboard.writeText(url);
    showToast('Track URL copied to clipboard', 'success');
  };

  // Handle share
  const handleShare = (trackId: string) => {
    const url = `${window.location.origin}/tracks/${trackId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this track',
        url: url
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback to copy URL
      navigator.clipboard.writeText(url);
      showToast('Track URL copied to clipboard', 'success');
    }
  };

  // Handle play
  const handlePlay = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    try {
      await playTrack(track as any); // Cast to PlaylistTrackDisplay
    } catch (err) {
      console.error('Error playing track:', err);
      showToast('Failed to play track', 'error');
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
              No public tracks yet
            </h3>
            <p className="text-gray-400">
              This creator hasn&apos;t uploaded any public tracks
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
            📀 All Tracks ({totalTracksCount})
          </h2>
        </div>

        {showViewAll && !isCollapsed && totalTracksCount > initialLimit && username && (
          <a
            href={`/profile/${username}/tracks`}
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
              <CreatorTrackCard
                key={track.id}
                track={track}
                onPlay={handlePlay}
                onAddToPlaylist={handleAddToPlaylist}
                onCopyUrl={handleCopyUrl}
                onShare={handleShare}
                isSaved={savedTrackIds.has(track.id)}
                onSaveToggle={handleSaveToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
