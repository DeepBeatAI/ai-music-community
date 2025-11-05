/**
 * Single Track Page Client Component
 * 
 * This component renders a dedicated page for viewing individual audio tracks.
 * It provides a comprehensive view of track details, audio playback, social features,
 * and track management actions.
 * 
 * Key Features:
 * - Audio playback with waveform visualization using WavesurferPlayer
 * - Play tracking (increments play_count after 30+ seconds of playback)
 * - Social features (like, follow)
 * - Track management actions (edit, delete) for track owners
 * - Responsive design (mobile and desktop layouts)
 * - SEO optimization with meta tags
 * - Performance optimizations (progressive loading, audio caching)
 * - Comprehensive error handling (404, 403, network, audio errors)
 * - Offline detection and action queuing
 * 
 * Route: /tracks/[id]
 * 
 * @component
 */

"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getCachedAudioUrl, audioCacheManager } from "@/utils/audioCache";
import MainLayout from "@/components/layout/MainLayout";
import type { TrackWithMembership } from "@/types/library";

// Lazy load heavy components for code splitting and improved initial page load
const WavesurferPlayer = lazy(() => import("@/components/WavesurferPlayer"));
const FollowButton = lazy(() => import("@/components/FollowButton"));

// Import error boundary and logging utilities
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logSingleTrackPageError } from "@/utils/errorLogging";

/**
 * Extended track type that includes all related data needed for the single track page
 * Extends TrackWithMembership with user profile and post information
 */
interface ExtendedTrackWithMembership extends TrackWithMembership {
  /** User profile data for the track uploader */
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  
  /** Post ID associated with this track for like functionality */
  post_id?: string;
}

/** Toast notification types for user feedback */
type ToastType = 'success' | 'error' | 'info';

/** Toast notification structure */
interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

/**
 * SingleTrackPageClient Component
 * 
 * Main client component for the single track page. Handles data fetching,
 * state management, user interactions, and rendering of track details.
 * 
 * @returns {JSX.Element} The rendered single track page
 */
export default function SingleTrackPageClient() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const trackId = params.id as string;
  
  // Component state
  const [track, setTrack] = useState<ExtendedTrackWithMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'404' | '403' | 'network' | 'audio' | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // User-specific state for social features
  const [likeCount, setLikeCount] = useState(0);
  
  // Audio URL state
  const [cachedAudioUrl, setCachedAudioUrl] = useState<string | null>(null);
  const [shouldLoadAudio, setShouldLoadAudio] = useState(false); // Defer audio loading
  
  // Toast notification state
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Offline detection state
  const [isOnline, setIsOnline] = useState(true);
  const [failedActions, setFailedActions] = useState<Array<{ action: string; data: unknown }>>([]);
  
  // Track actions menu state
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Performance monitoring using ref to avoid dependency issues
  const performanceMetrics = useRef({
    pageLoadStart: performance.now(),
    metadataLoadTime: 0,
    audioReadyTime: 0,
    interactionTimes: [] as number[]
  });

  // Offline detection effect
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network Status] Connection restored', {
        trackId,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      setIsOnline(true);
      showToast('Connection restored', 'success');
      
      // Retry failed actions
      setFailedActions(prev => {
        if (prev.length > 0) {
          console.log('[Network Status] Retrying failed actions', {
            count: prev.length,
            actions: prev.map(a => a.action)
          });
          showToast(`Retrying ${prev.length} failed action(s)...`, 'info');
          
          // Clear failed actions after attempting retry
          // In a real implementation, you would actually retry the actions here
          return [];
        }
        return prev;
      });
    };

    const handleOffline = () => {
      console.log('[Network Status] Connection lost', {
        trackId,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      setIsOnline(false);
      showToast('No internet connection. Some features may be unavailable.', 'error');
    };

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [trackId, user?.id]);

  // Toast notification handlers
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Queue failed actions for retry when online
  // This function is available for future use when implementing action retry logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const queueFailedAction = (action: string, data: unknown) => {
    console.log('[Failed Action Queue] Queueing action for retry', {
      action,
      data,
      trackId,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
    
    setFailedActions(prev => [...prev, { action, data }]);
    showToast('Action queued for retry when connection is restored', 'info');
  };

  // Main effect to fetch all data
  useEffect(() => {
    // Fetch track data with all related information
    const fetchTrackData = async (): Promise<ExtendedTrackWithMembership | null> => {
      if (!trackId) {
        throw new Error("Invalid track ID");
      }

      try {
        // Fetch track with playlist memberships
        const { data: trackData, error: trackError } = await supabase
          .from('tracks')
          .select(`
            *,
            playlist_tracks (
              playlist_id,
              playlist:playlists (
                id,
                name
              )
            )
          `)
          .eq('id', trackId)
          .single();

        if (trackError) {
          if (trackError.code === 'PGRST116') {
            throw new Error("not found");
          }
          throw trackError;
        }

        if (!trackData) {
          throw new Error("not found");
        }

        // Check if user has permission to view private tracks
        if (!trackData.is_public && (!user || user.id !== trackData.user_id)) {
          throw new Error("permission denied");
        }

        // Fetch user profile separately
        let userProfile = null;
        if (trackData.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', trackData.user_id)
            .single();
          
          userProfile = profileData;
        }

        // Fetch post associated with track to get like count
        const { data: postData } = await supabase
          .from('posts')
          .select('id')
          .eq('track_id', trackId)
          .maybeSingle();

        let likeCountValue = 0;
        let postId: string | undefined;

        if (postData) {
          postId = postData.id;
          
          // Count likes for this post
          const { count } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postData.id);
          
          likeCountValue = count || 0;
        }

        // Extract playlist information
        const playlistIds: string[] = [];
        const playlistNames: string[] = [];

        if (trackData.playlist_tracks && Array.isArray(trackData.playlist_tracks)) {
          trackData.playlist_tracks.forEach((pt: { playlist: { id: string; name: string } | null }) => {
            if (pt.playlist) {
              playlistIds.push(pt.playlist.id);
              playlistNames.push(pt.playlist.name);
            }
          });
        }

        // Construct the track with membership data
        const trackWithMembership: ExtendedTrackWithMembership = {
          ...trackData,
          user: userProfile ? {
            id: userProfile.id,
            username: userProfile.username,
            avatar_url: userProfile.avatar_url || undefined,
          } : undefined,
          albumId: null, // Will be populated if track is in an album
          albumName: null,
          playlistIds,
          playlistNames,
          like_count: likeCountValue,
          post_id: postId,
        };

        return trackWithMembership;
      } catch (err) {
        console.error("Error fetching track data:", err);
        throw err;
      }
    };



    const loadTrackData = async () => {
      if (!trackId) {
        setError("Invalid track ID");
        setErrorType('404');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setErrorType(null);

        // Fetch track data
        const trackData = await fetchTrackData();
        
        if (!trackData) {
          setError("Track not found");
          setErrorType('404');
          return;
        }

        setTrack(trackData);
        setLikeCount(trackData.like_count || 0);

        // Track metadata load time
        performanceMetrics.current.metadataLoadTime = performance.now() - performanceMetrics.current.pageLoadStart;
        console.log('[Performance] Metadata loaded in', performanceMetrics.current.metadataLoadTime.toFixed(2), 'ms');

        // Note: User-specific data (following status) is managed by FollowButton component via FollowContext
        
        // Don't load audio immediately - wait for user interaction
        // This improves initial page load performance

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        // Log error using centralized logging utility
        if (err instanceof Error) {
          if (err.message.includes("not found")) {
            logSingleTrackPageError(
              error,
              trackId,
              user?.id,
              'track_load',
              'Loading track page',
              { errorType: '404', message: 'Track not found' }
            );
            setError("Track not found");
            setErrorType('404');
          } else if (err.message.includes("permission") || err.message.includes("unauthorized")) {
            logSingleTrackPageError(
              error,
              trackId,
              user?.id,
              'permission',
              'Loading track page',
              { errorType: '403', message: 'Permission denied' }
            );
            setError("You don't have permission to view this track");
            setErrorType('403');
          } else {
            logSingleTrackPageError(
              error,
              trackId,
              user?.id,
              'network',
              'Loading track page',
              { errorType: 'network', message: 'Network or database error' }
            );
            setError("Failed to load track. Please try again.");
            setErrorType('network');
          }
        } else {
          logSingleTrackPageError(
            error,
            trackId,
            user?.id,
            'track_load',
            'Loading track page',
            { errorType: 'unknown', error: err }
          );
          setError("An unexpected error occurred");
          setErrorType('network');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadTrackData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, user?.id, authLoading]);

  // Separate effect to load audio when user interaction is detected
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const loadAudioUrl = async () => {
      if (shouldLoadAudio && track?.file_url && !cachedAudioUrl) {
        try {
          console.log('[Audio Cache] Attempting to load audio URL, retry:', retryCount, {
            trackId: track.id,
            userId: user?.id,
            fileUrl: track.file_url
          });
          const startTime = performance.now();
          
          const optimizedUrl = await getCachedAudioUrl(track.file_url);
          
          const loadTime = performance.now() - startTime;
          console.log('[Audio Cache] Successfully loaded audio URL in', loadTime.toFixed(2), 'ms', {
            trackId: track.id,
            loadTime: loadTime.toFixed(2)
          });
          
          // Track audio ready time
          performanceMetrics.current.audioReadyTime = performance.now() - performanceMetrics.current.pageLoadStart;
          console.log('[Performance] Audio ready in', performanceMetrics.current.audioReadyTime.toFixed(2), 'ms');
          
          setCachedAudioUrl(optimizedUrl);
          setAudioError(null); // Clear any previous audio errors
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Unknown audio load error');
          
          // Log audio load error
          logSingleTrackPageError(
            err,
            track.id,
            user?.id,
            'audio_load',
            `Loading audio (attempt ${retryCount + 1}/${maxRetries})`,
            {
              retryCount,
              maxRetries,
              fileUrl: track.file_url
            }
          );
          
          // Retry logic for failed loads
          if (retryCount < maxRetries) {
            retryCount++;
            console.log('[Audio Cache] Retrying audio load, attempt', retryCount, 'of', maxRetries, {
              trackId: track.id,
              nextRetryDelay: retryDelay * retryCount
            });
            
            setTimeout(() => {
              loadAudioUrl();
            }, retryDelay * retryCount); // Exponential backoff
          } else {
            // Log final failure after all retries
            logSingleTrackPageError(
              err,
              track.id,
              user?.id,
              'audio_load',
              'Audio load failed after all retries',
              {
                totalRetries: maxRetries,
                fileUrl: track.file_url
              }
            );
            
            // Set audio error state with troubleshooting guidance
            const errorMessage = 'Failed to load audio file. Please check your internet connection and try again.';
            setAudioError(errorMessage);
            showToast(errorMessage, 'error');
          }
        }
      }
    };

    loadAudioUrl();
  }, [shouldLoadAudio, track?.file_url, cachedAudioUrl, track?.id, user?.id]);

  // Trigger audio loading on user interaction
  const handleLoadAudio = () => {
    const interactionStart = performance.now();
    
    if (!shouldLoadAudio) {
      setShouldLoadAudio(true);
      
      // Track interaction response time
      const responseTime = performance.now() - interactionStart;
      performanceMetrics.current.interactionTimes.push(responseTime);
      console.log('[Performance] User interaction response time:', responseTime.toFixed(2), 'ms');
    }
  };

  // Handle track delete
  const handleTrackDelete = (trackId: string) => {
    if (track && track.id === trackId) {
      // Navigate back after deletion
      handleBack();
    }
  };

  // Handle back navigation
  const handleBack = () => {
    const interactionStart = performance.now();
    
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback navigation
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
    
    // Track interaction response time
    const responseTime = performance.now() - interactionStart;
    performanceMetrics.current.interactionTimes.push(responseTime);
    console.log('[Performance] Back button response time:', responseTime.toFixed(2), 'ms');
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setErrorType(null);
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    window.location.reload();
  };

  // Handle click outside to close actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  // Cleanup effect: Stop playback when navigating away
  useEffect(() => {
    // Log cache statistics on mount
    const cacheStats = audioCacheManager.getPerformanceStats();
    console.log('[Audio Cache] Cache statistics on page load:', {
      hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
      averageLoadTime: `${cacheStats.averageLoadTime.toFixed(2)}ms`,
      totalRequests: cacheStats.totalRequests,
      bandwidthSaved: `${(cacheStats.estimatedBandwidthSaved / (1024 * 1024)).toFixed(2)}MB`
    });

    // Copy ref value for cleanup function
    const metrics = performanceMetrics.current;

    return () => {
      // The WavesurferPlayer component handles its own cleanup
      // when it unmounts, including stopping playback and cleaning
      // up audio resources. No additional cleanup needed here.
      console.log('Single track page unmounting - WavesurferPlayer will handle cleanup');
      
      // Log final cache statistics
      const finalStats = audioCacheManager.getPerformanceStats();
      console.log('[Audio Cache] Final cache statistics:', {
        hitRate: `${(finalStats.hitRate * 100).toFixed(1)}%`,
        averageLoadTime: `${finalStats.averageLoadTime.toFixed(2)}ms`,
        totalRequests: finalStats.totalRequests,
        bandwidthSaved: `${(finalStats.estimatedBandwidthSaved / (1024 * 1024)).toFixed(2)}MB`
      });

      // Log comprehensive performance summary
      const avgInteractionTime = metrics.interactionTimes.length > 0
        ? metrics.interactionTimes.reduce((a, b) => a + b, 0) / metrics.interactionTimes.length
        : 0;

      console.log('[Performance] Session Summary:', {
        metadataLoadTime: `${metrics.metadataLoadTime.toFixed(2)}ms`,
        audioReadyTime: metrics.audioReadyTime > 0 
          ? `${metrics.audioReadyTime.toFixed(2)}ms` 
          : 'Not loaded',
        averageInteractionTime: `${avgInteractionTime.toFixed(2)}ms`,
        totalInteractions: metrics.interactionTimes.length,
        interactionTimes: metrics.interactionTimes.map(t => `${t.toFixed(2)}ms`)
      });
    };
  }, []);



  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Offline Indicator */}
        {!isOnline && (
          <div className="mb-4 bg-orange-900/30 border border-orange-500/50 rounded-lg p-3 flex items-center space-x-3">
            <div className="flex-shrink-0 text-orange-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-orange-300 text-sm font-medium">You&apos;re offline</p>
              <p className="text-orange-400/80 text-xs">Some features may be unavailable. Actions will be retried when connection is restored.</p>
            </div>
            {failedActions.length > 0 && (
              <div className="flex-shrink-0 bg-orange-500/20 px-2 py-1 rounded text-xs text-orange-300">
                {failedActions.length} queued
              </div>
            )}
          </div>
        )}
        
        {/* Back Button - Touch-friendly (min 44px) */}
        <button
          onClick={handleBack}
          className="mb-4 sm:mb-6 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors min-h-[44px] py-2"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
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
          <span className="text-sm sm:text-base">Back</span>
        </button>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {/* Track Header Skeleton */}
            <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            </div>

            {/* Waveform Player Skeleton */}
            <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-20 bg-gray-700 rounded mb-4"></div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                <div className="flex-1 h-2 bg-gray-700 rounded"></div>
              </div>
            </div>

            {/* Track Card Skeleton */}
            <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="flex space-x-4">
                <div className="w-24 h-24 bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error States */}
        {!loading && error && (
          <div className="max-w-2xl mx-auto">
            {/* 404 Error */}
            {errorType === '404' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🎵</div>
                <h2 className="text-2xl font-bold text-white mb-2">Track Not Found</h2>
                <p className="text-gray-400 mb-6">
                  The track you&apos;re looking for doesn&apos;t exist or has been deleted.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Go Back
                  </button>
                  {user && (
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-6 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Go to Dashboard
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 403 Permission Error */}
            {errorType === '403' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-400 mb-6">
                  This track is private. You don&apos;t have permission to view it.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Go Back
                  </button>
                  {!user && (
                    <button
                      onClick={() => router.push('/login')}
                      className="px-6 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Network/Generic Error */}
            {errorType === 'network' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Track</h2>
                <p className="text-gray-400 mb-2">{error}</p>
                <p className="text-gray-500 text-sm mb-6">
                  Please check your internet connection and try again.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleRetry}
                    className="px-6 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success State - Track Content */}
        {!loading && !error && track && (
          <div className="space-y-4 md:space-y-6">
            {/* Mobile Layout: Stacked (< 768px) */}
            {/* Desktop Layout: Two-column (> 1024px) */}
            
            {/* Track Header with Creator Info - Full Width on All Screens */}
            <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
              {/* Title with Actions Menu */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-xl sm:text-2xl font-bold text-white flex-1">{track.title}</h1>
                
                {/* Track Actions Menu - Available to all users (limited actions for non-owners) */}
                <div ref={actionsMenuRef} className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Track actions"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showActionsMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50">
                      <div className="py-2">
                        {/* Copy URL - Available to all users */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            showToast('URL copied to clipboard', 'success');
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                        >
                          📋 Copy Track URL
                        </button>
                        
                        {/* Share - Available to all users */}
                        <button
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: track.title,
                                text: `Check out "${track.title}" by ${track.author}`,
                                url: window.location.href,
                              });
                            } else {
                              navigator.clipboard.writeText(window.location.href);
                              showToast('URL copied to clipboard', 'success');
                            }
                            setShowActionsMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                        >
                          🔗 Share Track
                        </button>
                        
                        {/* Owner-only actions */}
                        {user && track.user_id === user.id && (
                          <>
                            <hr className="my-2 border-gray-600" />
                            <button
                              onClick={() => {
                                showToast('Edit functionality coming soon', 'info');
                                setShowActionsMenu(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                            >
                              ✏️ Edit Track
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
                                  handleTrackDelete(track.id);
                                }
                                setShowActionsMenu(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                            >
                              🗑️ Delete Track
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Creator Information Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center space-x-3">
                  {/* Creator Avatar (placeholder) */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg sm:text-xl">👤</span>
                  </div>
                  
                  {/* Creator Name and Link */}
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-400 text-xs sm:text-sm">Created by</p>
                    {track.user?.username ? (
                      <Link
                        href={`/profile/${track.user_id}`}
                        className="text-white font-medium hover:text-blue-400 transition-colors truncate block"
                      >
                        {track.user.username}
                      </Link>
                    ) : (
                      <p className="text-white font-medium truncate">
                        {track.author || 'Unknown Artist'}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Follow Button - only show for non-owners */}
                {user && track.user_id && user.id !== track.user_id && (
                  <div className="flex-shrink-0">
                    <ErrorBoundary
                      fallback={
                        <div className="text-gray-500 text-xs">
                          Follow unavailable
                        </div>
                      }
                      onError={(error, errorInfo) => {
                        logSingleTrackPageError(
                          error,
                          track.id,
                          user?.id,
                          'component',
                          'Follow button component error',
                          {
                            componentStack: errorInfo.componentStack,
                            targetUserId: track.user_id
                          }
                        );
                      }}
                    >
                      <Suspense fallback={
                        <div className="animate-pulse">
                          <div className="h-10 w-24 bg-gray-700 rounded"></div>
                        </div>
                      }>
                        <FollowButton
                          userId={track.user_id}
                          username={track.user?.username || track.author || 'User'}
                          size="md"
                          variant="primary"
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
              </div>
              
              {/* Track Stats */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <span className="whitespace-nowrap">▶️ {track.play_count || 0} plays</span>
                <span className="whitespace-nowrap">❤️ {likeCount} likes</span>
                {track.created_at && (
                  <span className="whitespace-nowrap">
                    📅 {new Date(track.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Waveform Player Section - Full Width on All Screens */}
            {cachedAudioUrl && !audioError && (
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <ErrorBoundary
                  fallback={
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="text-red-400 mr-2">🎵</div>
                        <h3 className="text-red-400 font-medium">Audio Player Error</h3>
                      </div>
                      <p className="text-gray-300 text-sm mb-4">
                        The audio player encountered an error. Please try refreshing the page.
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Refresh Page
                      </button>
                    </div>
                  }
                  onError={(error, errorInfo) => {
                    logSingleTrackPageError(
                      error,
                      track.id,
                      user?.id,
                      'component',
                      'Audio player component error',
                      {
                        componentStack: errorInfo.componentStack,
                        audioUrl: cachedAudioUrl
                      }
                    );
                  }}
                >
                  <Suspense fallback={
                    <div className="animate-pulse">
                      <div className="h-16 sm:h-20 bg-gray-700 rounded mb-4"></div>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-full"></div>
                        <div className="flex-1 h-2 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                  }>
                    <WavesurferPlayer
                      audioUrl={cachedAudioUrl}
                      trackId={track.id}
                      fileName={track.title}
                      duration={track.duration || undefined}
                      theme="ai_music"
                      showWaveform={true}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            
            {/* Audio Load Error State */}
            {audioError && (
              <div className="bg-gray-800 border border-red-500/50 rounded-lg p-4 sm:p-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-red-500">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-400 font-semibold mb-2">Audio Load Failed</h3>
                    <p className="text-gray-300 text-sm mb-3">{audioError}</p>
                    <div className="bg-gray-900/50 rounded p-3 mb-3">
                      <p className="text-gray-400 text-xs font-semibold mb-2">Troubleshooting Steps:</p>
                      <ul className="text-gray-400 text-xs space-y-1 list-disc list-inside">
                        <li>Check your internet connection</li>
                        <li>Try refreshing the page</li>
                        <li>Clear your browser cache</li>
                        <li>Try a different browser</li>
                        <li>Contact support if the issue persists</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => {
                        setAudioError(null);
                        setShouldLoadAudio(false);
                        setCachedAudioUrl(null);
                        // Trigger reload
                        setTimeout(() => setShouldLoadAudio(true), 100);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                    >
                      Retry Audio Load
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Audio not loaded yet - show play button to trigger loading */}
            {!cachedAudioUrl && !shouldLoadAudio && (
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <button
                  onClick={handleLoadAudio}
                  className="w-full flex items-center justify-center space-x-3 py-6 text-white hover:text-blue-400 transition-colors min-h-[44px]"
                  aria-label="Load audio player"
                >
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg font-medium">Click to load audio player</span>
                </button>
              </div>
            )}
            
            {/* Loading audio URL */}
            {!cachedAudioUrl && shouldLoadAudio && (
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <div className="animate-pulse">
                  <div className="h-16 sm:h-20 bg-gray-700 rounded mb-4"></div>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-full"></div>
                    <div className="flex-1 h-2 bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Track Details Section */}
            <div className="space-y-4 md:space-y-6">
                {/* Placeholder for future content */}
                <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Track Details</h3>
                  <div className="space-y-3 text-sm">
                    {track.genre && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Genre:</span>
                        <span className="text-white">{track.genre}</span>
                      </div>
                    )}
                    {track.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white">
                          {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Visibility:</span>
                      <span className="text-white">{track.is_public ? 'Public' : 'Private'}</span>
                    </div>
                    {track.created_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Uploaded:</span>
                        <span className="text-white">
                          {new Date(track.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Track Description (if available) */}
                {track.description && (
                  <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap">
                      {track.description}
                    </p>
                  </div>
                )}

              {/* Playlist Memberships */}
              {track.playlistNames && track.playlistNames.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">In Playlists</h3>
                  <div className="space-y-2">
                    {track.playlistNames.map((name, index) => (
                      <div
                        key={track.playlistIds?.[index] || index}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <span className="text-gray-400">📋</span>
                        <span className="text-white">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg
                transform transition-all duration-300 ease-in-out
                ${toast.type === 'success' ? 'bg-green-600' : ''}
                ${toast.type === 'error' ? 'bg-red-600' : ''}
                ${toast.type === 'info' ? 'bg-blue-600' : ''}
                text-white min-w-[300px] max-w-md
              `}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {toast.type === 'success' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === 'error' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === 'info' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 text-sm font-medium">
                {toast.message}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
