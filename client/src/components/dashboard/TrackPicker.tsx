'use client';

import { useState, useEffect, useCallback, useMemo, forwardRef, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { TrackPickerCard } from './TrackPickerCard';
import type { TrackPickerProps, Track } from '@/types/track';

/**
 * TrackPicker Component
 * 
 * Displays user's uploaded tracks in a grid for selection when creating audio posts.
 * Replaces the file upload interface with track selection from library.
 * 
 * Features:
 * - Fetches tracks from Supabase filtered by user_id
 * - Responsive grid layout (2-4 columns based on screen size)
 * - Loading skeleton state
 * - Empty state with link to Library page
 * - Pagination support (20 tracks per page)
 * - Error handling with retry option
 * - Keyboard navigation support
 * 
 * Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 8.2
 */
export const TrackPicker = forwardRef<HTMLDivElement, TrackPickerProps>(function TrackPicker({
  userId,
  onTrackSelect,
  selectedTrackId = null,
  disabled = false,
}, ref) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const initialFetchDone = useRef(false);

  const TRACKS_PER_PAGE = 20;
  
  // Session-based cache key for this user's tracks
  const cacheKey = `track_picker_${userId}`;
  const cacheTimestampKey = `${cacheKey}_timestamp`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Load tracks from cache
  const loadFromCache = useCallback((): boolean => {
    try {
      const cachedData = sessionStorage.getItem(cacheKey);
      const cachedTimestamp = sessionStorage.getItem(cacheTimestampKey);
      
      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
          const parsed = JSON.parse(cachedData);
          setTracks(parsed.tracks);
          setHasMore(parsed.hasMore);
          setPage(parsed.page);
          console.log('✅ Loaded tracks from cache:', parsed.tracks.length, 'tracks');
          return true;
        } else {
          // Cache expired, clear it
          sessionStorage.removeItem(cacheKey);
          sessionStorage.removeItem(cacheTimestampKey);
          console.log('⏰ Cache expired, will fetch fresh data');
        }
      }
    } catch (err) {
      console.error('Error loading from cache:', err);
      // Clear corrupted cache
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(cacheTimestampKey);
    }
    return false;
  }, [cacheKey, cacheTimestampKey, CACHE_DURATION]);

  // Save tracks to cache
  const saveToCache = useCallback((tracksData: Track[], hasMoreData: boolean, currentPage: number) => {
    try {
      const cacheData = {
        tracks: tracksData,
        hasMore: hasMoreData,
        page: currentPage
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      sessionStorage.setItem(cacheTimestampKey, Date.now().toString());
      console.log('💾 Saved tracks to cache:', tracksData.length, 'tracks');
    } catch (err) {
      console.error('Error saving to cache:', err);
      // If quota exceeded, clear cache and continue
      try {
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(cacheTimestampKey);
      } catch {
        // Ignore errors when clearing
      }
    }
  }, [cacheKey, cacheTimestampKey]);

  // Fetch tracks from Supabase
  const fetchTracks = useCallback(async (pageNum: number = 1, useCache: boolean = true) => {
    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    // Try to load from cache first (only for first page)
    if (useCache && pageNum === 1) {
      const loaded = loadFromCache();
      if (loaded) {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const from = (pageNum - 1) * TRACKS_PER_PAGE;
      const to = from + TRACKS_PER_PAGE - 1;

      const { data, error: fetchError, count } = await supabase
        .from('tracks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        if (pageNum === 1) {
          setTracks(data);
          
          // Check if there are more tracks
          const totalTracks = count || 0;
          const hasMoreData = totalTracks > pageNum * TRACKS_PER_PAGE;
          setHasMore(hasMoreData);
          
          // Save to cache (only save first page to keep cache size manageable)
          saveToCache(data, hasMoreData, pageNum);
        } else {
          // Use functional update to avoid dependency on tracks
          setTracks(prev => [...prev, ...data]);
          
          // Check if there are more tracks
          const totalTracks = count || 0;
          const hasMoreData = totalTracks > pageNum * TRACKS_PER_PAGE;
          setHasMore(hasMoreData);
        }
      }
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to load tracks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, loadFromCache, saveToCache, TRACKS_PER_PAGE]);

  // Initial fetch - only fetch once when component mounts
  // The cache will prevent refetching on subsequent mounts
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchTracks(1, true); // Use cache if available
    }
  }, [fetchTracks]);

  // Handle track selection
  const handleTrackSelect = useCallback((track: Track) => {
    if (!disabled) {
      onTrackSelect(track);
    }
  }, [disabled, onTrackSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || tracks.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          // If nothing focused yet, start at first item
          if (prev === -1) return 0;
          const next = prev < tracks.length - 1 ? prev + 1 : prev;
          return next;
        });
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          // If nothing focused yet, start at first item
          if (prev === -1) return 0;
          const next = prev > 0 ? prev - 1 : prev;
          return next;
        });
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        // Move to next column (4 columns on desktop)
        setFocusedIndex(prev => {
          // If nothing focused yet, start at first item
          if (prev === -1) return 0;
          const next = prev + 1;
          return next < tracks.length ? next : prev;
        });
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        // Move to previous column
        setFocusedIndex(prev => {
          // If nothing focused yet, start at first item
          if (prev === -1) return 0;
          const next = prev - 1;
          return next >= 0 ? next : prev;
        });
        break;
      
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      
      case 'End':
        e.preventDefault();
        setFocusedIndex(tracks.length - 1);
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < tracks.length) {
          handleTrackSelect(tracks[focusedIndex]);
        }
        break;
    }
  }, [disabled, tracks, focusedIndex, handleTrackSelect]);

  // Don't auto-focus first track to avoid unwanted blue ring
  // Focus will be set when user starts keyboard navigation

  // Handle load more
  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTracks(nextPage, false); // Don't use cache for pagination
  }, [page, fetchTracks]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setPage(1);
    fetchTracks(1, false); // Force fresh fetch on retry
  }, [fetchTracks]);

  // Memoize skeleton items to avoid recreating on every render
  const skeletonItems = useMemo(() => Array.from({ length: 8 }), []);

  // Memoize active descendant ID
  const activeDescendantId = useMemo(() => {
    return focusedIndex >= 0 && tracks[focusedIndex] 
      ? `track-${tracks[focusedIndex].id}` 
      : undefined;
  }, [focusedIndex, tracks]);

  // Loading skeleton
  if (loading && tracks.length === 0) {
    return (
      <div
        role="listbox"
        aria-label="Select a track"
        className="space-y-4"
      >
        <p className="text-gray-400 mb-4">
          Select a track from your library to create an audio post
        </p>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {skeletonItems.map((_, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg p-3 sm:p-4 animate-pulse"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 sm:h-5 bg-gray-700 rounded mb-1 sm:mb-2"></div>
                  <div className="h-3 sm:h-4 bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
              <div className="h-3 sm:h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && tracks.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-400 mb-4">
          Select a track from your library to create an audio post
        </p>
        <div className="bg-gray-800 rounded-lg p-8 border border-red-500/50">
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && tracks.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-400 mb-4">
          Select a track from your library to create an audio post
        </p>
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No tracks in your library
            </h3>
            <p className="text-gray-400 mb-6">
              Upload a track to your library first before creating an audio post
            </p>
            <a
              href="/library"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-block"
            >
              Go to Library
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Tracks grid
  return (
    <div className="space-y-4">
      <p className="text-gray-400">
        Select a track from your library to create an audio post
      </p>
      
      <div
        ref={ref}
        role="listbox"
        aria-label="Select a track"
        aria-activedescendant={activeDescendantId}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg p-1"
      >
        {tracks.map((track, index) => (
          <TrackPickerCard
            key={track.id}
            id={`track-${track.id}`}
            track={track}
            isSelected={track.id === selectedTrackId}
            isFocused={index === focusedIndex}
            onSelect={handleTrackSelect}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More Tracks'}
          </button>
        </div>
      )}
    </div>
  );
});
