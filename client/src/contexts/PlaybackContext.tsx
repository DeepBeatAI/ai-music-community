'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PlaylistWithTracks, PlaylistTrackDisplay } from '@/types/playlist';
import { AudioManager } from '@/lib/audio/AudioManager';
import * as queueUtils from '@/lib/audio/queueUtils';
import { getCachedAudioUrl } from '@/utils/audioCache';
import { playTracker } from '@/lib/playTracking';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Repeat mode options for playlist playback
 */
export type RepeatMode = 'off' | 'playlist' | 'track';

/**
 * Stored playback state in sessionStorage
 */
interface StoredPlaybackState {
  playlistId: string;
  trackId: string;
  trackIndex: number;
  position: number;
  isPlaying: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  queue: string[]; // track IDs
  timestamp: number;
}

/**
 * SessionStorage key for playback state
 */
const PLAYBACK_STATE_KEY = 'playback_state';

/**
 * Global cache for current playback state
 * Stored on window object to survive component remounts and module reloads
 * This is used for temporary playlists that shouldn't be persisted to sessionStorage
 */
declare global {
  interface Window {
    __playbackCache?: {
      playlist: PlaylistWithTracks | null;
      track: PlaylistTrackDisplay | null;
      trackIndex: number;
      isPlaying: boolean;
      shuffleMode: boolean;
      repeatMode: RepeatMode;
      queue: PlaylistTrackDisplay[];
    } | null;
  }
}

// Initialize cache on window if it doesn't exist
if (typeof window !== 'undefined' && !window.__playbackCache) {
  window.__playbackCache = null;
}

/**
 * Staleness threshold (1 hour in milliseconds)
 */
const STALENESS_THRESHOLD = 3600000; // 1 hour

/**
 * Internal playback state interface (for future use)
 * Currently using individual state variables, but this interface
 * documents the complete state shape for reference
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PlaybackState {
  activePlaylist: PlaylistWithTracks | null;
  currentTrack: PlaylistTrackDisplay | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  queue: PlaylistTrackDisplay[];
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  progress: number; // 0-100
  duration: number; // seconds
}

/**
 * PlaybackContext type definition with all state and actions
 */
export interface PlaybackContextType {
  // State
  activePlaylist: PlaylistWithTracks | null;
  currentTrack: PlaylistTrackDisplay | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  queue: PlaylistTrackDisplay[];
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  progress: number;
  duration: number;
  volume: number;
  
  // Actions
  playPlaylist: (playlist: PlaylistWithTracks, startIndex?: number) => Promise<void>;
  playTrack: (track: PlaylistTrackDisplay) => Promise<void>;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  updatePlaylist: (playlist: PlaylistWithTracks) => void;
  
  // Queue management
  buildQueue: (tracks: PlaylistTrackDisplay[], shuffle: boolean) => void;
  getNextTrack: () => PlaylistTrackDisplay | null;
  getPreviousTrack: () => PlaylistTrackDisplay | null;
}

/**
 * Create React Context for playback state
 */
const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

/**
 * Custom hook to access playback context
 * @throws Error if used outside PlaybackProvider
 */
export function usePlayback(): PlaybackContextType {
  const context = useContext(PlaybackContext);
  
  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  
  return context;
}

/**
 * PlaybackProvider component props
 */
interface PlaybackProviderProps {
  children: React.ReactNode;
}

/**
 * PlaybackProvider component
 * Provides playback state and actions to all child components
 */
export function PlaybackProvider({ children }: PlaybackProviderProps): React.ReactElement {
  // Get user for play tracking
  const { user } = useAuth();
  

  
  // Initialize state from cache (survives remounts) or default values
  const [activePlaylist, setActivePlaylist] = useState<PlaylistWithTracks | null>(() => {
    const cached = typeof window !== 'undefined' ? window.__playbackCache : null;
    console.log('[PlaybackProvider] Initializing activePlaylist from cache:', cached?.playlist?.id, 'Full cache:', cached);
    return cached?.playlist || null;
  });
  const [currentTrack, setCurrentTrack] = useState<PlaylistTrackDisplay | null>(() => {
    const cached = typeof window !== 'undefined' ? window.__playbackCache : null;
    console.log('[PlaybackProvider] Initializing currentTrack from cache:', cached?.track?.id);
    return cached?.track || null;
  });
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => {
    const cached = typeof window !== 'undefined' ? window.__playbackCache : null;
    return cached?.trackIndex || 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    const cached = typeof window !== 'undefined' ? window.__playbackCache : null;
    return cached?.isPlaying || false;
  });
  const [queue, setQueue] = useState<PlaylistTrackDisplay[]>(() => {
    const cached = typeof window !== 'undefined' ? window.__playbackCache : null;
    return cached?.queue || [];
  });
  const [shuffleMode, setShuffleMode] = useState<boolean>(() => {
    const cached = typeof window !== 'undefined' ? window.__playbackCache : null;
    return cached?.shuffleMode || false;
  });
  const shuffleModeRef = useRef<boolean>(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    shuffleModeRef.current = shuffleMode;
  }, [shuffleMode]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    const cached = typeof window !== 'undefined' ? window.__playbackCache : null;
    return cached?.repeatMode || 'off';
  });
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // Track if restoration has been attempted to prevent multiple restoration attempts
  const restorationAttemptedRef = useRef<boolean>(false);
  
  const [volume, setVolumeState] = useState<number>(() => {
    // Restore volume from localStorage
    try {
      const savedVolume = localStorage.getItem('playback_volume');
      return savedVolume ? parseInt(savedVolume) : 100;
    } catch {
      return 100;
    }
  });
  
  // AudioManager instance ref
  const checkPlayIntervalRef = useRef<NodeJS.Timeout | null>(null); // NEW: For play tracking
  const userRef = useRef(user); // NEW: Ref for user to avoid dependency issues
  const audioManagerRef = useRef<AudioManager | null>(null);
  
  // Update cache whenever state changes (survives remounts)
  // Only update if there's actual content to avoid overwriting cache with empty state
  useEffect(() => {
    console.log('[PlaybackProvider] Updating cache - playlist:', activePlaylist?.id, 'track:', currentTrack?.id);
    if (typeof window !== 'undefined') {
      // Only update cache if we have active playback, or explicitly clear it if playback stopped
      if (activePlaylist && currentTrack) {
        window.__playbackCache = {
          playlist: activePlaylist,
          track: currentTrack,
          trackIndex: currentTrackIndex,
          isPlaying,
          shuffleMode,
          repeatMode,
          queue,
        };
      } else if (!activePlaylist && !currentTrack && window.__playbackCache) {
        // Only clear cache if it was previously set (playback was stopped)
        console.log('[PlaybackProvider] Clearing cache - playback stopped');
        window.__playbackCache = null;
      }
      // Don't update cache if both are null and cache is already null (initial mount)
    }
  }, [activePlaylist, currentTrack, currentTrackIndex, isPlaying, shuffleMode, repeatMode, queue]);
  
  // Debug: Log when provider mounts/unmounts
  useEffect(() => {
    console.log('[PlaybackProvider] Mounted - activePlaylist:', activePlaylist?.id, 'currentTrack:', currentTrack?.id);
    
    return () => {
      console.log('[PlaybackProvider] Unmounting');
    };
  }, [activePlaylist, currentTrack]);
  
  // Keep user ref in sync
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  // Ref to store the next function for use in event handlers
  const nextRef = useRef<(() => void) | null>(null);
  
  // Ref to store current repeat mode for event handlers
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  
  // Track navigation debouncing
  const isNavigatingRef = useRef<boolean>(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update repeatModeRef when repeatMode changes
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Initialize AudioManager on mount
  useEffect(() => {
    // Create AudioManager instance
    audioManagerRef.current = new AudioManager();
    
    // Set initial volume from state (which was restored from localStorage)
    audioManagerRef.current.setVolume(volume / 100);
    
    // Set up event handlers
    const handleEnded = (): void => {
      // Track ended - handle automatic progression based on repeat mode
      console.log('Track ended - checking repeat mode:', repeatModeRef.current);
      
      // Stop play tracking for current track
      const currentTrackId = currentTrack?.id;
      if (currentTrackId) {
        playTracker.onPlayStop(currentTrackId);
      }
      
      // Clear interval
      if (checkPlayIntervalRef.current) {
        clearInterval(checkPlayIntervalRef.current);
        checkPlayIntervalRef.current = null;
      }
      
      // If repeat track is enabled, restart the current track
      if (repeatModeRef.current === 'track' && audioManagerRef.current) {
        console.log('Repeat track enabled - restarting current track');
        audioManagerRef.current.seek(0);
        audioManagerRef.current.play().catch((error) => {
          console.error('Failed to restart track:', error);
        });
        
        // Restart play tracking
        if (currentTrackId && userRef.current?.id) {
          playTracker.onPlayStart(currentTrackId);
          checkPlayIntervalRef.current = setInterval(() => {
            const userId = userRef.current?.id;
            if (userId && currentTrackId) {
              playTracker.checkAndRecordPlay(currentTrackId, userId);
            }
          }, 5000);
        }
      } else if (nextRef.current) {
        // Otherwise, move to next track (or pause if at end)
        console.log('Moving to next track');
        nextRef.current();
      }
    };
    
    const handleTimeUpdate = (): void => {
      // Update progress
      if (audioManagerRef.current) {
        const currentTime = audioManagerRef.current.getCurrentTime();
        const totalDuration = audioManagerRef.current.getDuration();
        
        if (totalDuration > 0) {
          setProgress((currentTime / totalDuration) * 100);
        }
      }
    };
    
    const handleError = (): void => {
      // Handle playback error
      console.error('Audio playback error');
      setIsPlaying(false);
    };
    
    const handleLoadedMetadata = (): void => {
      // Update duration when metadata is loaded
      if (audioManagerRef.current) {
        const totalDuration = audioManagerRef.current.getDuration();
        setDuration(totalDuration);
      }
    };
    
    // Register event handlers
    audioManagerRef.current.on('ended', handleEnded);
    audioManagerRef.current.on('timeupdate', handleTimeUpdate);
    audioManagerRef.current.on('error', handleError);
    audioManagerRef.current.on('loadedmetadata', handleLoadedMetadata);
    
    // Cleanup on unmount
    return () => {
      // Cleanup play tracking
      if (checkPlayIntervalRef.current) {
        clearInterval(checkPlayIntervalRef.current);
        checkPlayIntervalRef.current = null;
      }
      if (currentTrack?.id) {
        playTracker.onPlayStop(currentTrack.id);
      }
      
      if (audioManagerRef.current) {
        audioManagerRef.current.destroy();
        audioManagerRef.current = null;
      }
    };
    // Note: volume is intentionally NOT in dependencies. It's only used for initial setup.
    // Volume changes are handled by the setVolume() callback to avoid recreating AudioManager.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Playback actions
  
  /**
   * Play a playlist from a specific track index
   * @param playlist - The playlist to play
   * @param startIndex - The index of the track to start from (default: 0)
   */
  const playPlaylist = useCallback(async (playlist: PlaylistWithTracks, startIndex = 0): Promise<void> => {
    try {
      // Validate inputs
      if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
        console.error('Cannot play empty playlist');
        return;
      }
      
      if (startIndex < 0 || startIndex >= playlist.tracks.length) {
        console.error('Invalid start index:', startIndex);
        startIndex = 0;
      }
      
      // Set active playlist
      setActivePlaylist(playlist);
      
      // Extract tracks from playlist
      const tracks = playlist.tracks.map(pt => pt.track);
      
      // Get the track to play (from original order)
      const trackToPlay = tracks[startIndex];
      setCurrentTrack(trackToPlay);
      
      // Build queue based on shuffle mode
      let orderedQueue: PlaylistTrackDisplay[];
      let currentIndex: number;
      
      // Use ref to get the latest shuffle mode value
      const currentShuffleMode = shuffleModeRef.current;
      console.log('[PlaybackContext] Building queue - shuffleMode:', currentShuffleMode, 'startIndex:', startIndex);
      
      if (currentShuffleMode) {
        // In shuffle mode: put selected track first, then shuffle the rest
        const remaining = tracks.filter((_, idx) => idx !== startIndex);
        const shuffled = queueUtils.shuffleArray(remaining);
        orderedQueue = [trackToPlay, ...shuffled];
        currentIndex = 0; // Selected track is always at position 0
        console.log('[PlaybackContext] Shuffle mode - Queue order:', orderedQueue.map(t => t.title));
      } else {
        // In normal mode: use original order
        orderedQueue = tracks;
        currentIndex = startIndex;
        console.log('[PlaybackContext] Normal mode - Queue order:', orderedQueue.map(t => t.title));
      }
      
      setQueue(orderedQueue);
      setCurrentTrackIndex(currentIndex);
      console.log('[PlaybackContext] Queue set with', orderedQueue.length, 'tracks, current index:', currentIndex);
      
      // Debug: Log the entire track object to see what fields it has
      console.log('[PlaybackContext] Track object:', trackToPlay);
      console.log('[PlaybackContext] Track keys:', Object.keys(trackToPlay || {}));
      
      // Try to find the audio URL from various possible field names
      const audioUrl = trackToPlay?.file_url || (trackToPlay as any)?.audio_url || (trackToPlay as any)?.audioUrl;
      console.log('[PlaybackContext] Found audio URL:', audioUrl);
      
      // Load and play the track
      if (audioManagerRef.current && trackToPlay && audioUrl) {
        // IMPORTANT: Stop tracking previous track before loading new one
        if (checkPlayIntervalRef.current) {
          clearInterval(checkPlayIntervalRef.current);
          checkPlayIntervalRef.current = null;
        }
        if (currentTrack?.id) {
          playTracker.onPlayStop(currentTrack.id);
        }
        
        console.log('[PlaybackContext] Loading track:', trackToPlay.title);
        console.log('[PlaybackContext] Original URL:', audioUrl);
        const cachedUrl = await getCachedAudioUrl(audioUrl);
        console.log('[PlaybackContext] Cached URL:', cachedUrl);
        await audioManagerRef.current.loadTrack(cachedUrl);
        console.log('[PlaybackContext] Track loaded, attempting to play...');
        await audioManagerRef.current.play();
        console.log('[PlaybackContext] Playback started successfully');
        setIsPlaying(true);
        
        // Start play tracking if track and user are available
        if (trackToPlay.id && userRef.current?.id) {
          playTracker.onPlayStart(trackToPlay.id);
          
          // Check every 5 seconds if play should be recorded
          checkPlayIntervalRef.current = setInterval(() => {
            const userId = userRef.current?.id;
            if (userId && trackToPlay.id) {
              playTracker.checkAndRecordPlay(trackToPlay.id, userId);
            }
          }, 5000);
        }
      } else {
        console.error('[PlaybackContext] Cannot play - missing requirements:', {
          hasAudioManager: !!audioManagerRef.current,
          hasTrack: !!trackToPlay,
          hasFileUrl: !!trackToPlay?.file_url,
          hasAudioUrl: !!(trackToPlay as any)?.audio_url,
          foundAudioUrl: !!audioUrl,
          trackObject: trackToPlay,
          allTrackKeys: Object.keys(trackToPlay || {})
        });
      }
    } catch (error) {
      console.error('[PlaybackContext] Failed to play playlist:', error);
      setIsPlaying(false);
      // TODO: Show user-friendly error notification
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - using shuffleModeRef to get latest value, currentTrack.id is intentionally from closure

  /**
   * Play a single track (creates a single-track playlist)
   * @param track - The track to play
   */
  const playTrack = useCallback(async (track: PlaylistTrackDisplay): Promise<void> => {
    try {
      // Create a single-track playlist
      const singleTrackPlaylist: PlaylistWithTracks = {
        id: 'single-track',
        name: 'Now Playing',
        description: null,
        cover_image_url: null,
        user_id: '',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tracks: [{
          id: 'single-track-item',
          track_id: track.id,
          position: 0,
          added_at: new Date().toISOString(),
          track: track,
        }],
        track_count: 1,
      };
      
      await playPlaylist(singleTrackPlaylist, 0);
    } catch (error) {
      console.error('Failed to play track:', error);
      setIsPlaying(false);
    }
  }, [playPlaylist]);

  /**
   * Pause playback
   */
  const pause = useCallback((): void => {
    if (audioManagerRef.current) {
      audioManagerRef.current.pause();
      setIsPlaying(false);
      
      // Stop play tracking
      if (currentTrack?.id) {
        playTracker.onPlayStop(currentTrack.id);
      }
      
      // Clear interval
      if (checkPlayIntervalRef.current) {
        clearInterval(checkPlayIntervalRef.current);
        checkPlayIntervalRef.current = null;
      }
    }
  }, [currentTrack]);

  /**
   * Resume playback
   */
  const resume = useCallback((): void => {
    if (audioManagerRef.current) {
      audioManagerRef.current.play().catch((error) => {
        console.error('Failed to resume playback:', error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
      
      // Start play tracking if track and user are available
      if (currentTrack?.id && userRef.current?.id) {
        playTracker.onPlayStart(currentTrack.id);
        
        // Check every 5 seconds if play should be recorded
        checkPlayIntervalRef.current = setInterval(() => {
          const userId = userRef.current?.id;
          if (userId && currentTrack?.id) {
            playTracker.checkAndRecordPlay(currentTrack.id, userId);
          }
        }, 5000);
      }
    }
  }, [currentTrack]);

  /**
   * Seek to a specific position in the current track
   * @param position - The position in seconds
   */
  const seek = useCallback((position: number): void => {
    if (audioManagerRef.current) {
      audioManagerRef.current.seek(position);
    }
  }, []);

  // SessionStorage persistence utilities (defined early for use in stop)
  
  /**
   * Clear playback state from sessionStorage
   */
  const clearPlaybackState = useCallback((): void => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return;
      }
      
      sessionStorage.removeItem(PLAYBACK_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear playback state:', error);
    }
  }, []);

  /**
   * Stop playback and clear all state
   */
  const stop = useCallback((): void => {
    if (audioManagerRef.current) {
      audioManagerRef.current.pause();
    }
    
    // Clear all playback state
    setIsPlaying(false);
    setActivePlaylist(null);
    setCurrentTrack(null);
    setCurrentTrackIndex(0);
    setQueue([]);
    setProgress(0);
    setDuration(0);
    
    // Clear persisted state
    clearPlaybackState();
  }, [clearPlaybackState]);

  /**
   * Skip to the next track
   * Handles repeat mode logic with debouncing to prevent rapid-fire navigation
   */
  const next = useCallback((): void => {
    if (!audioManagerRef.current || queue.length === 0) {
      return;
    }
    
    // Debounce rapid navigation attempts
    if (isNavigatingRef.current) {
      console.log('Navigation already in progress, ignoring request');
      return;
    }
    
    // Set navigation flag
    isNavigatingRef.current = true;
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    // Reset navigation flag after a delay
    navigationTimeoutRef.current = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500); // 500ms debounce
    
    // Check if we're at the last track
    const isLastTrack = currentTrackIndex >= queue.length - 1;
    
    if (isLastTrack) {
      // Handle based on repeat mode
      if (repeatMode === 'playlist') {
        // Restart playlist from beginning
        const firstTrack = queue[0];
        setCurrentTrackIndex(0);
        setCurrentTrack(firstTrack);
        
        const audioUrl = firstTrack.file_url || (firstTrack as any)?.audio_url || (firstTrack as any)?.audioUrl;
        if (audioUrl) {
          // Stop tracking previous track
          if (checkPlayIntervalRef.current) {
            clearInterval(checkPlayIntervalRef.current);
            checkPlayIntervalRef.current = null;
          }
          if (currentTrack?.id) {
            playTracker.onPlayStop(currentTrack.id);
          }
          
          getCachedAudioUrl(audioUrl)
            .then((cachedUrl) => audioManagerRef.current?.loadTrack(cachedUrl))
            .then(() => audioManagerRef.current?.play())
            .then(() => {
              setIsPlaying(true);
              // Start tracking new track
              if (firstTrack.id && userRef.current?.id) {
                playTracker.onPlayStart(firstTrack.id);
                checkPlayIntervalRef.current = setInterval(() => {
                  const userId = userRef.current?.id;
                  if (userId && firstTrack.id) {
                    playTracker.checkAndRecordPlay(firstTrack.id, userId);
                  }
                }, 5000);
              }
            })
            .catch((error) => {
              // Only log non-abort errors
              if (error?.name !== 'AbortError') {
                console.error('Failed to play next track:', error);
              }
              setIsPlaying(false);
            })
            .finally(() => {
              isNavigatingRef.current = false;
            });
        } else {
          console.error('No audio URL found for first track');
          setIsPlaying(false);
          isNavigatingRef.current = false;
        }
      } else {
        // Pause playback at end (repeat is off)
        // Don't call stop() as that would close the mini player
        if (audioManagerRef.current) {
          audioManagerRef.current.pause();
        }
        setIsPlaying(false);
        isNavigatingRef.current = false;
      }
    } else {
      // Move to next track
      const nextIndex = currentTrackIndex + 1;
      const nextTrack = queue[nextIndex];
      
      console.log('[PlaybackContext] Moving to next track - currentIndex:', currentTrackIndex, 'nextIndex:', nextIndex);
      console.log('[PlaybackContext] Next track:', nextTrack?.title);
      console.log('[PlaybackContext] Queue length:', queue.length);
      
      setCurrentTrackIndex(nextIndex);
      setCurrentTrack(nextTrack);
      
      const audioUrl = nextTrack.file_url || (nextTrack as any)?.audio_url || (nextTrack as any)?.audioUrl;
      if (audioUrl) {
        // Stop tracking previous track
        if (checkPlayIntervalRef.current) {
          clearInterval(checkPlayIntervalRef.current);
          checkPlayIntervalRef.current = null;
        }
        if (currentTrack?.id) {
          playTracker.onPlayStop(currentTrack.id);
        }
        
        getCachedAudioUrl(audioUrl)
          .then((cachedUrl) => audioManagerRef.current?.loadTrack(cachedUrl))
          .then(() => audioManagerRef.current?.play())
          .then(() => {
            setIsPlaying(true);
            // Start tracking new track
            if (nextTrack.id && userRef.current?.id) {
              playTracker.onPlayStart(nextTrack.id);
              checkPlayIntervalRef.current = setInterval(() => {
                const userId = userRef.current?.id;
                if (userId && nextTrack.id) {
                  playTracker.checkAndRecordPlay(nextTrack.id, userId);
                }
              }, 5000);
            }
          })
          .catch((error) => {
            // Only log non-abort errors
            if (error?.name !== 'AbortError') {
              console.error('Failed to play next track:', error);
            }
            setIsPlaying(false);
          })
          .finally(() => {
            isNavigatingRef.current = false;
          });
      } else {
        console.error('No audio URL found for next track');
        setIsPlaying(false);
        isNavigatingRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentTrackIndex, repeatMode]); // currentTrack.id is intentionally from closure to stop OLD track
  
  // Update nextRef whenever next function changes
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  /**
   * Skip to the previous track
   * If at the beginning, restart the current track
   * Includes debouncing to prevent rapid-fire navigation
   */
  const previous = useCallback((): void => {
    if (!audioManagerRef.current || queue.length === 0) {
      return;
    }
    
    // Debounce rapid navigation attempts
    if (isNavigatingRef.current) {
      console.log('Navigation already in progress, ignoring request');
      return;
    }
    
    // If we're at the first track, restart it (no debounce needed for seek)
    if (currentTrackIndex === 0) {
      audioManagerRef.current.seek(0);
      return;
    }
    
    // Set navigation flag
    isNavigatingRef.current = true;
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    // Reset navigation flag after a delay
    navigationTimeoutRef.current = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500); // 500ms debounce
    
    // Move to previous track
    const prevIndex = currentTrackIndex - 1;
    const prevTrack = queue[prevIndex];
    
    setCurrentTrackIndex(prevIndex);
    setCurrentTrack(prevTrack);
    
    const audioUrl = prevTrack.file_url || (prevTrack as any)?.audio_url || (prevTrack as any)?.audioUrl;
    if (audioUrl) {
      // Stop tracking previous track
      if (checkPlayIntervalRef.current) {
        clearInterval(checkPlayIntervalRef.current);
        checkPlayIntervalRef.current = null;
      }
      if (currentTrack?.id) {
        playTracker.onPlayStop(currentTrack.id);
      }
      
      getCachedAudioUrl(audioUrl)
        .then((cachedUrl) => audioManagerRef.current?.loadTrack(cachedUrl))
        .then(() => audioManagerRef.current?.play())
        .then(() => {
          setIsPlaying(true);
          // Start tracking new track
          if (prevTrack.id && userRef.current?.id) {
            playTracker.onPlayStart(prevTrack.id);
            checkPlayIntervalRef.current = setInterval(() => {
              const userId = userRef.current?.id;
              if (userId && prevTrack.id) {
                playTracker.checkAndRecordPlay(prevTrack.id, userId);
              }
            }, 5000);
          }
        })
        .catch((error) => {
          // Only log non-abort errors
          if (error?.name !== 'AbortError') {
            console.error('Failed to play previous track:', error);
          }
          setIsPlaying(false);
        })
        .finally(() => {
          isNavigatingRef.current = false;
        });
    } else {
      console.error('No audio URL found for previous track');
      setIsPlaying(false);
      isNavigatingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentTrackIndex]); // currentTrack.id is intentionally from closure to stop OLD track

  /**
   * Toggle shuffle mode
   * Rebuilds the queue when toggled
   */
  const toggleShuffle = useCallback((): void => {
    setShuffleMode(prev => {
      const newMode = !prev;
      
      // If we have an active playlist, rebuild the queue
      if (activePlaylist && currentTrack) {
        const tracks = activePlaylist.tracks.map(pt => pt.track);
        
        if (newMode) {
          // Shuffle mode enabled - shuffle the queue but keep current track at front
          const remaining = tracks.filter(t => t.id !== currentTrack.id);
          const shuffled = queueUtils.shuffleArray(remaining);
          const newQueue = [currentTrack, ...shuffled];
          setQueue(newQueue);
          setCurrentTrackIndex(0);
        } else {
          // Shuffle mode disabled - restore original order
          setQueue(tracks);
          // Find current track in original order
          const newIndex = tracks.findIndex(t => t.id === currentTrack.id);
          setCurrentTrackIndex(newIndex >= 0 ? newIndex : 0);
        }
      }
      
      return newMode;
    });
  }, [activePlaylist, currentTrack]);

  /**
   * Cycle through repeat modes: off → playlist → track → off
   */
  const cycleRepeat = useCallback((): void => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'playlist';
      if (prev === 'playlist') return 'track';
      return 'off';
    });
  }, []);

  /**
   * Update the active playlist (e.g., after reordering tracks)
   * Rebuilds the queue while maintaining the current track position
   */
  const updatePlaylist = useCallback((playlist: PlaylistWithTracks): void => {
    // Only update if this is the currently active playlist
    if (!activePlaylist || activePlaylist.id !== playlist.id) {
      return;
    }
    
    // Update the playlist reference
    setActivePlaylist(playlist);
    
    // Extract tracks from updated playlist
    const tracks = playlist.tracks.map(pt => pt.track);
    
    // If we have a current track, rebuild the queue maintaining its position
    if (currentTrack) {
      if (shuffleMode) {
        // In shuffle mode, keep current track at front and shuffle the rest
        const remaining = tracks.filter(t => t.id !== currentTrack.id);
        const shuffled = queueUtils.shuffleArray(remaining);
        const newQueue = [currentTrack, ...shuffled];
        setQueue(newQueue);
        setCurrentTrackIndex(0);
      } else {
        // In normal mode, use the new order
        setQueue(tracks);
        // Find current track in the new order
        const newIndex = tracks.findIndex(t => t.id === currentTrack.id);
        if (newIndex >= 0) {
          setCurrentTrackIndex(newIndex);
        } else {
          // Current track was removed from playlist, stop playback
          console.warn('Current track no longer in playlist');
          stop();
        }
      }
    } else {
      // No current track, just rebuild the queue
      const newQueue = shuffleMode ? queueUtils.shuffleArray([...tracks]) : tracks;
      setQueue(newQueue);
    }
  }, [activePlaylist, currentTrack, shuffleMode, stop]);

  /**
   * Set volume (0-100)
   */
  const setVolume = useCallback((newVolume: number): void => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clampedVolume);
    
    if (audioManagerRef.current) {
      audioManagerRef.current.setVolume(clampedVolume / 100);
    }
    
    // Persist volume to localStorage
    try {
      localStorage.setItem('playback_volume', clampedVolume.toString());
    } catch (error) {
      console.error('Failed to persist volume:', error);
    }
  }, []);

  const buildQueue = useCallback((tracks: PlaylistTrackDisplay[], shuffle: boolean): void => {
    const newQueue = queueUtils.buildQueue(tracks, shuffle);
    setQueue(newQueue);
  }, []);

  const getNextTrack = useCallback((): PlaylistTrackDisplay | null => {
    return queueUtils.getNextTrack(queue, currentTrackIndex, repeatMode);
  }, [queue, currentTrackIndex, repeatMode]);

  const getPreviousTrack = useCallback((): PlaylistTrackDisplay | null => {
    return queueUtils.getPreviousTrack(queue, currentTrackIndex);
  }, [queue, currentTrackIndex]);

  /**
   * Persist playback state to sessionStorage
   * @param state - The playback state to persist
   */
  const persistPlaybackState = useCallback((state: StoredPlaybackState): void => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('sessionStorage is not available');
        return;
      }
      
      sessionStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist playback state:', error);
      // Silently fail - playback should continue even if persistence fails
    }
  }, []);

  /**
   * Restore playback state from sessionStorage
   * @returns The restored playback state or null if not available/stale
   */
  const restorePlaybackState = useCallback((): StoredPlaybackState | null => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('sessionStorage is not available');
        return null;
      }
      
      const stored = sessionStorage.getItem(PLAYBACK_STATE_KEY);
      if (!stored) {
        return null;
      }
      
      const state = JSON.parse(stored) as StoredPlaybackState;
      
      // Check if state is stale (older than 1 hour)
      const now = Date.now();
      if (now - state.timestamp > STALENESS_THRESHOLD) {
        console.log('Playback state is stale, clearing...');
        clearPlaybackState();
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Failed to restore playback state:', error);
      // Clear corrupted state
      clearPlaybackState();
      return null;
    }
  }, [clearPlaybackState]);

  // State persistence effects
  
  /**
   * Throttle helper to limit persistence writes
   */
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Effect to persist state on changes (throttled)
   */
  useEffect(() => {
    // Only persist if we have an active playlist and track
    if (!activePlaylist || !currentTrack) {
      return;
    }
    
    // Clear any pending throttle
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }
    
    // Throttle persistence writes to avoid performance issues
    throttleTimeoutRef.current = setTimeout(() => {
      const state: StoredPlaybackState = {
        playlistId: activePlaylist.id,
        trackId: currentTrack.id,
        trackIndex: currentTrackIndex,
        position: audioManagerRef.current?.getCurrentTime() || 0,
        isPlaying,
        shuffleMode,
        repeatMode,
        queue: queue.map(t => t.id),
        timestamp: Date.now(),
      };
      
      persistPlaybackState(state);
    }, 500); // 500ms throttle for immediate changes
    
    // Cleanup on unmount
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [
    activePlaylist,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    shuffleMode,
    repeatMode,
    queue,
    persistPlaybackState,
  ]);
  
  /**
   * Effect to save position before page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save current position immediately before page unload
      if (activePlaylist && currentTrack && audioManagerRef.current) {
        const state: StoredPlaybackState = {
          playlistId: activePlaylist.id,
          trackId: currentTrack.id,
          trackIndex: currentTrackIndex,
          position: audioManagerRef.current.getCurrentTime(),
          isPlaying,
          shuffleMode,
          repeatMode,
          queue: queue.map(t => t.id),
          timestamp: Date.now(),
        };
        
        // Use synchronous sessionStorage.setItem for beforeunload
        try {
          sessionStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(state));
        } catch (error) {
          console.error('Failed to save state on unload:', error);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activePlaylist, currentTrack, currentTrackIndex, isPlaying, shuffleMode, repeatMode, queue]);
  
  /**
   * Effect to restore state on mount
   */
  useEffect(() => {
    // Only run restoration once per session
    if (restorationAttemptedRef.current) {
      console.log('Restoration already attempted, skipping');
      return;
    }
    
    restorationAttemptedRef.current = true;
    
    // Only run on mount
    const restoreState = async (): Promise<void> => {
      try {
        const restored = restorePlaybackState();
        
        if (!restored) {
          console.log('No playback state to restore');
          return;
        }
        
        console.log('Restoring playback state from sessionStorage:', restored);
        
        // Handle temporary playlists (single track playback) differently
        // These don't exist in the database, so we can't fetch them
        // Just clear the stale state and let the user play a new track
        if (restored.playlistId === 'temp-single-track' || restored.playlistId === 'single-track') {
          console.log('Temporary playlist detected - clearing stale state');
          clearPlaybackState();
          return;
        }
        
        // Import getPlaylistWithTracks dynamically to avoid circular dependencies
        const { getPlaylistWithTracks } = await import('@/lib/playlists');
        
        // Fetch the playlist data
        const playlist = await getPlaylistWithTracks(restored.playlistId);
        
        if (!playlist) {
          console.warn('Playlist not found, clearing stale state');
          clearPlaybackState();
          return;
        }
        
        // Validate that the stored track exists in the playlist
        const tracks = playlist.tracks.map(pt => pt.track);
        const trackIndex = tracks.findIndex(t => t.id === restored.trackId);
        
        if (trackIndex === -1) {
          console.warn('Track not found in playlist, clearing stale state');
          clearPlaybackState();
          return;
        }
        
        const track = tracks[trackIndex];
        
        // Restore the playback state
        setActivePlaylist(playlist);
        setCurrentTrack(track);
        setCurrentTrackIndex(trackIndex);
        setShuffleMode(restored.shuffleMode);
        setRepeatMode(restored.repeatMode);
        
        // Rebuild the queue based on shuffle mode
        if (restored.shuffleMode) {
          // For shuffle mode, we need to reconstruct the queue
          // We can't perfectly restore the shuffled order, so we create a new shuffle
          // but keep the current track at the front
          const remaining = tracks.filter(t => t.id !== track.id);
          const shuffled = queueUtils.shuffleArray(remaining);
          const newQueue = [track, ...shuffled];
          setQueue(newQueue);
          setCurrentTrackIndex(0);
        } else {
          // For normal mode, use the original order
          setQueue(tracks);
        }
        
        // Load the track and seek to the stored position
        if (audioManagerRef.current) {
          // Get the audio URL (try multiple field names for compatibility)
          const audioUrl = track.file_url || track.audio_url;
          
          if (audioUrl) {
            // Use cached audio URL
            const cachedUrl = await getCachedAudioUrl(audioUrl);
            await audioManagerRef.current.loadTrack(cachedUrl);
            
            // Seek to the stored position if it's valid
            if (restored.position > 0) {
              audioManagerRef.current.seek(restored.position);
            }
          } else {
            console.warn('No audio URL found for track, clearing state');
            clearPlaybackState();
            return;
          }
          
          // Don't auto-play on restoration, just restore the state
          // User can manually resume playback if desired
          setIsPlaying(false);
        }
        
        console.log('Playback state restored successfully');
      } catch (error) {
        console.error('Failed to restore playback state:', error);
        // Clear the corrupted state
        clearPlaybackState();
      }
    };
    
    // Call the async restoration function
    restoreState();
    
    // Cleanup on unmount - clear state when component unmounts
    return () => {
      // Note: We don't clear on unmount because we want state to persist
      // across page navigation. State is only cleared on browser close
      // or when it becomes stale.
    };
  }, [restorePlaybackState, clearPlaybackState]); // Add clearPlaybackState to deps

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<PlaybackContextType>(() => ({
    // State
    activePlaylist,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    queue,
    shuffleMode,
    repeatMode,
    progress,
    duration,
    volume,
    
    // Actions
    playPlaylist,
    playTrack,
    pause,
    resume,
    next,
    previous,
    seek,
    toggleShuffle,
    cycleRepeat,
    stop,
    setVolume,
    updatePlaylist,
    
    // Queue management
    buildQueue,
    getNextTrack,
    getPreviousTrack,
  }), [
    activePlaylist,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    queue,
    shuffleMode,
    repeatMode,
    progress,
    duration,
    volume,
    playPlaylist,
    playTrack,
    pause,
    resume,
    next,
    previous,
    seek,
    toggleShuffle,
    cycleRepeat,
    setVolume,
    stop,
    updatePlaylist,
    buildQueue,
    getNextTrack,
    getPreviousTrack,
  ]);

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}
