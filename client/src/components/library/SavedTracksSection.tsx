'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayback } from '@/contexts/PlaybackContext';
import { getSavedTracks } from '@/lib/library';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';
import { unsaveTrack } from '@/lib/saveService';
import { AddToPlaylistModal } from '@/components/library/AddToPlaylistModal';
import type { SavedTrackWithUploader } from '@/types/library';
import type { PlaylistTrackDisplay } from '@/types/playlist';

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
        
        {/* Author */}
        <div className="h-4 bg-gray-700 rounded mb-2 w-3/4"></div>
        
        {/* Uploader */}
        <div className="h-3 bg-gray-700 rounded mb-3 w-1/2"></div>
        
        {/* Metadata */}
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-gray-700 rounded"></div>
          <div className="h-4 w-16 bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * SavedTrackCard Component
 * 
 * Displays a saved track card with author, uploader info, and remove button.
 */
interface SavedTrackCardProps {
  track: SavedTrackWithUploader;
  onRemove: (trackId: string) => void;
  onPlay: (trackId: string) => void;
  onAddToPlaylist: (trackId: string) => void;
  onCopyUrl: (trackId: string) => void;
  onShare: (trackId: string) => void;
}

function SavedTrackCard({ track, onRemove, onPlay, onAddToPlaylist, onCopyUrl, onShare }: SavedTrackCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  // Handle long press for mobile
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      setShowActions(true);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handle action menu toggle
  const handleActionsToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  // Handle action clicks
  const handleAction = (action: () => void) => {
    action();
    setShowActions(false);
  };

  // Format date to relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  };

  return (
    <div
      ref={cardRef}
      className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors group"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Cover Art - Tracks don't have cover images, show music icon */}
      <div className="relative aspect-square bg-gray-700 group/cover">
        <div className="w-full h-full flex items-center justify-center text-gray-500">
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
        
        {/* Play Button Overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(track.id);
          }}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 md:group-hover/cover:bg-opacity-50 transition-all opacity-100 md:opacity-0 md:group-hover/cover:opacity-100"
          aria-label="Play track"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors shadow-lg">
            <svg
              className="w-6 h-6 md:w-8 md:h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>
      </div>

      {/* Track Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-white truncate mb-1">
          {track.title}
        </h3>
        
        {/* Author (Artist) - Primary Attribution */}
        <p className="text-sm text-gray-400 truncate mb-3">
          by {track.author || 'Unknown Artist'}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-3 flex-wrap text-sm text-gray-400 mb-3">
          {/* Play Count */}
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>{track.play_count || 0} plays</span>
          </div>

          {/* Like Count */}
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>{track.like_count || 0}</span>
          </div>
        </div>

        {/* Bottom Row: Upload Date, Remove Button, and Actions Menu */}
        <div className="flex items-center justify-between">
          {/* Upload Date - Bottom Left */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatRelativeTime(track.created_at)}</span>
          </div>

          {/* Remove Button and Actions Menu - Bottom Right */}
          <div className="flex items-center gap-2">
            {/* Remove Button - Same style as SaveButton */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(track.id);
              }}
              className="flex items-center space-x-2 border rounded-md font-medium transition-all duration-200 text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white border-gray-600 cursor-pointer"
              aria-label="Remove track"
            >
              <svg
                className="w-3 h-3"
                fill="currentColor"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span>Remove</span>
            </button>

            {/* Actions Menu Button */}
            <div className="relative">
              <button
                onClick={handleActionsToggle}
                className="p-2 md:p-1 hover:bg-gray-700 rounded transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                aria-label="Track actions"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>

              {/* Actions Dropdown */}
              {showActions && (
                <div
                  ref={actionsRef}
                  className="absolute right-0 bottom-full mb-2 w-48 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 z-10"
                >
                  <button
                    onClick={() => handleAction(() => onRemove(track.id))}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                    <span>Remove</span>
                  </button>
                  <button
                    onClick={() => handleAction(() => onAddToPlaylist(track.id))}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <span>📝</span>
                    <span>Add to Playlist</span>
                  </button>
                  <button
                    onClick={() => handleAction(() => onCopyUrl(track.id))}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Copy Track URL</span>
                  </button>
                  <button
                    onClick={() => handleAction(() => onShare(track.id))}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
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
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    <span>Share</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SavedTracksSection Component
 * 
 * Displays a grid of tracks saved by the user from other creators.
 * - Desktop: 4 columns
 * - Tablet: 3 columns
 * - Mobile: 2 columns
 * 
 * Features:
 * - Fetches saved tracks with uploader information
 * - Displays 8 tracks initially
 * - Collapsible section with expand/collapse toggle
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state when no saved tracks exist
 * - Optimistic updates for remove actions
 * - Toast notifications for user feedback
 * - Cache integration with invalidation support
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */
interface SavedTracksSectionProps {
  userId?: string;
  initialLimit?: number;
}

export default function SavedTracksSection({ 
  userId, 
  initialLimit = 8 
}: SavedTracksSectionProps) {
  const { user } = useAuth();
  const { playTrack } = usePlayback();
  const [tracks, setTracks] = useState<SavedTrackWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [totalTracksCount, setTotalTracksCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Use provided userId or fall back to authenticated user
  const effectiveUserId = userId || user?.id;

  const fetchTracks = useCallback(async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.SAVED_TRACKS(effectiveUserId);
    const cachedData = cache.get<{ tracks: SavedTrackWithUploader[]; totalCount: number }>(cacheKey);

    if (cachedData) {
      setTracks(cachedData.tracks.slice(0, initialLimit));
      setTotalTracksCount(cachedData.totalCount);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all saved tracks to get total count
      const allTracks = await getSavedTracks(effectiveUserId);
      setTotalTracksCount(allTracks.length);
      
      // Limit tracks for display
      const limitedTracks = allTracks.slice(0, initialLimit);
      setTracks(limitedTracks);
      
      // Cache the data for 2 minutes
      cache.set(cacheKey, { tracks: allTracks, totalCount: allTracks.length }, CACHE_TTL.SAVED_TRACKS);
    } catch (err) {
      console.error('Error fetching saved tracks:', err);
      setError('Failed to load saved tracks');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, initialLimit]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('saved-tracks-collapsed');
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
      if (invalidatedKey === CACHE_KEYS.SAVED_TRACKS(effectiveUserId)) {
        console.log('Saved tracks cache invalidated, refetching...');
        fetchTracks();
      }
    };

    // Listen for cache invalidation events from the cache utility
    window.addEventListener('cache-invalidated', handleCacheInvalidated);

    return () => {
      window.removeEventListener('cache-invalidated', handleCacheInvalidated);
    };
  }, [effectiveUserId, fetchTracks]);

  // Handle track play
  const handleTrackPlay = useCallback((trackId: string) => {
    const trackToPlay = tracks.find(t => t.id === trackId);
    if (!trackToPlay) return;

    // Convert SavedTrackWithUploader to PlaylistTrackDisplay format
    const playlistTrack: PlaylistTrackDisplay = {
      id: trackToPlay.id,
      title: trackToPlay.title,
      author: trackToPlay.author,
      file_url: trackToPlay.file_url,
      duration: trackToPlay.duration,
      created_at: trackToPlay.created_at,
      user_id: trackToPlay.user_id,
      play_count: trackToPlay.play_count || 0,
      like_count: trackToPlay.like_count || 0,
    };

    playTrack(playlistTrack);
  }, [tracks, playTrack]);

  // Handle add to playlist
  const handleAddToPlaylist = useCallback((trackId: string) => {
    setSelectedTrackId(trackId);
    setShowAddToPlaylistModal(true);
  }, []);

  // Handle copy URL
  const handleCopyUrl = useCallback((trackId: string) => {
    const trackUrl = `${window.location.origin}/tracks/${trackId}`;
    navigator.clipboard.writeText(trackUrl).then(() => {
      handleShowToast('Track URL copied to clipboard', 'success');
    }).catch(() => {
      handleShowToast('Failed to copy URL', 'error');
    });
  }, []);

  // Handle share
  const handleShare = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const trackUrl = `${window.location.origin}/tracks/${trackId}`;
    
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: `Check out "${track.title}" by ${track.author || 'Unknown Artist'}`,
        url: trackUrl,
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          handleShowToast('Failed to share track', 'error');
        }
      });
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(trackUrl).then(() => {
        handleShowToast('Track URL copied to clipboard', 'success');
      }).catch(() => {
        handleShowToast('Failed to copy URL', 'error');
      });
    }
  }, [tracks]);

  // Handle track remove (optimistic)
  const handleTrackRemove = async (trackId: string) => {
    if (!effectiveUserId) return;

    // Store the track for potential rollback
    const removedTrack = tracks.find(t => t.id === trackId);
    if (!removedTrack) return;

    // Optimistic update - remove from display immediately
    setTracks(prevTracks => prevTracks.filter(track => track.id !== trackId));
    setTotalTracksCount(prev => prev - 1);

    try {
      // Call unsaveTrack
      const result = await unsaveTrack(effectiveUserId, trackId);

      if (result.error || !result.data) {
        // Rollback on error
        setTracks(prevTracks => [...prevTracks, removedTrack]);
        setTotalTracksCount(prev => prev + 1);
        handleShowToast('Failed to remove track. Please try again.', 'error');
        return;
      }

      // Success - invalidate cache
      cache.invalidate(CACHE_KEYS.SAVED_TRACKS(effectiveUserId));
      handleShowToast('Track removed from saved', 'success');
    } catch (err) {
      // Rollback on exception
      setTracks(prevTracks => [...prevTracks, removedTrack]);
      setTotalTracksCount(prev => prev + 1);
      console.error('Error removing track:', err);
      handleShowToast('Failed to remove track. Please try again.', 'error');
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
    localStorage.setItem('saved-tracks-collapsed', String(newState));
  };

  // Loading state - show skeleton grid
  if (loading) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            🔖 Saved Tracks
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
            🔖 Saved Tracks
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

  // Empty state - no saved tracks exist
  if (tracks.length === 0) {
    return (
      <div className="mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            🔖 Saved Tracks (0)
          </h2>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No saved tracks yet
            </h3>
            <p className="text-gray-400">
              Save tracks from other creators to see them here
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
            🔖 Saved Tracks ({totalTracksCount})
          </h2>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {/* Tracks Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tracks.map(track => (
              <SavedTrackCard
                key={track.id}
                track={track}
                onRemove={handleTrackRemove}
                onPlay={handleTrackPlay}
                onAddToPlaylist={handleAddToPlaylist}
                onCopyUrl={handleCopyUrl}
                onShare={handleShare}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylistModal && selectedTrackId && effectiveUserId && (
        <AddToPlaylistModal
          isOpen={showAddToPlaylistModal}
          onClose={() => {
            setShowAddToPlaylistModal(false);
            setSelectedTrackId(null);
          }}
          trackId={selectedTrackId}
          userId={effectiveUserId}
          onSuccess={() => {
            handleShowToast('Track added to playlist', 'success');
          }}
          onError={(message) => {
            handleShowToast(message, 'error');
          }}
        />
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
