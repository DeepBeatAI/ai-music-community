'use client'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { formatDuration, getBestAudioUrl } from '@/utils/audio';
import { getCachedAudioUrl } from '@/utils/audioCache';
import { performanceAnalytics } from '@/utils/performanceAnalytics';
import { 
  createWavesurferInstance, 
  formatWaveformError, 
  WAVESURFER_THEMES, 
  handleWavesurferError,
  createVolumeManager,
  createTimeManager
} from '@/utils/wavesurfer';

interface WavesurferPlayerProps {
  audioUrl: string;
  fileName?: string;
  duration?: number;
  className?: string;
  theme?: keyof typeof WAVESURFER_THEMES;
  showWaveform?: boolean;
}

export default function WavesurferPlayer({ 
  audioUrl, 
  fileName, 
  duration, 
  className = '',
  theme = 'ai_music',
  showWaveform = true
}: WavesurferPlayerProps) {
  // CRITICAL: Separate volume from initialization dependencies
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualAudioUrl, setActualAudioUrl] = useState<string | null>(null);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [urlProcessingComplete, setUrlProcessingComplete] = useState(false);

  // NEW: Stable managers that don't change on re-renders
  const volumeManager = useMemo(() => createVolumeManager(), []);
  const timeManager = useMemo(() => createTimeManager(), []);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const initializationRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // STEP 1: Process audio URL with smart caching and analytics tracking
  useEffect(() => {
    const initializeAudioUrl = async () => {
      const startTime = Date.now();
      console.log('🎵 Initializing audio URL with smart caching');
      setIsLoading(true);
      setError(null);
      setUrlProcessingComplete(false);
      
      try {
        // Cancel any ongoing URL processing
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        // Track cache attempt
        const optimizedUrl = await getCachedAudioUrl(audioUrl);
        const wasFromCache = optimizedUrl.includes('cached') || optimizedUrl === audioUrl;
        
        // Track analytics event
        performanceAnalytics.trackEvent({
          type: wasFromCache ? 'cache_hit' : 'cache_miss',
          url: audioUrl,
          metadata: {
            component: 'WavesurferPlayer',
            originalUrl: audioUrl,
            optimizedUrl: optimizedUrl
          }
        });
        
        if (abortControllerRef.current.signal.aborted) {
          console.log('URL processing was cancelled');
          return;
        }
        
        console.log('✅ Using optimized audio URL from cache system');
        setActualAudioUrl(optimizedUrl);
        
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          console.error('❌ Error processing audio URL:', err);
          setActualAudioUrl(audioUrl);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
          setUrlProcessingComplete(true);
        }
      }
    };

    initializeAudioUrl();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [audioUrl]); // Only audioUrl dependency - no volume

  // STEP 2: Initialize Wavesurfer (no volume dependency)
  useEffect(() => {
    if (!waveformRef.current || !actualAudioUrl || !showWaveform || !urlProcessingComplete) {
      return;
    }

    if (initializationRef.current) {
      console.warn('⚠️ Preventing duplicate Wavesurfer initialization');
      return;
    }

    const initWavesurfer = async () => {
      if (initializationRef.current) return;
      
      const startTime = Date.now();
      try {
        initializationRef.current = true;
        console.log('🌊 Initializing Wavesurfer with URL:', actualAudioUrl);
        setIsLoading(true);
        setError(null);

        // Clean container
        if (waveformRef.current) {
          waveformRef.current.innerHTML = '';
        }

        // Destroy any existing instance
        if (wavesurferRef.current) {
          try {
            // Clean up custom event listeners and intervals
            if ((wavesurferRef.current as any)._customCleanup) {
              (wavesurferRef.current as any)._customCleanup();
            }
            
            if ((wavesurferRef.current as any)._timeSyncInterval) {
              clearInterval((wavesurferRef.current as any)._timeSyncInterval);
            }
            
            wavesurferRef.current.destroy();
          } catch (destroyError) {
            console.warn('Error destroying previous instance:', destroyError);
          }
          wavesurferRef.current = null;
        }

        // Create Wavesurfer instance
        const wavesurfer = createWavesurferInstance({
          container: waveformRef.current!,
          ...WAVESURFER_THEMES[theme]
        });

        // CRITICAL: Set up managers before event listeners
        volumeManager.setWavesurfer(wavesurfer);
        timeManager.setWavesurfer(wavesurfer);

        // Set up event listeners with analytics tracking
        wavesurfer.on('ready', () => {
          const loadTime = Date.now() - startTime;
          console.log('✅ Wavesurfer ready');
          const duration = wavesurfer.getDuration();
          setIsWaveformReady(true);
          setIsLoading(false);
          setTotalDuration(duration);
          
          // Track successful audio load
          performanceAnalytics.trackEvent({
            type: 'audio_load',
            duration: loadTime,
            url: actualAudioUrl,
            metadata: {
              component: 'WavesurferPlayer',
              fromCache: actualAudioUrl.includes('cached'),
              duration: duration
            }
          });
          
          // CRITICAL: Apply current volume via manager
          volumeManager.updateVolume(volume);
          timeManager.setWavesurfer(wavesurfer);
        });

        // ENHANCED: Better time tracking
        wavesurfer.on('audioprocess', () => {
          const time = wavesurfer.getCurrentTime();
          setCurrentTime(time);
          timeManager.updateTime(time);
        });

        // CRITICAL: Handle seek events for paused state
        wavesurfer.on('interaction', () => {
          const time = wavesurfer.getCurrentTime();
          console.log('🎯 Interaction event triggered, time:', time);
          setCurrentTime(time);
          timeManager.updateTime(time);
        });

        // ENHANCED: Handle waveform clicks during pause
        wavesurfer.on('interaction', () => {
          const time = wavesurfer.getCurrentTime();
          console.log('🖱️ Waveform interaction, time:', time);
          setCurrentTime(time);
          timeManager.updateTime(time);
        });

        // ADDITIONAL: Handle direct waveform clicks
        const waveformContainer = wavesurfer.getWrapper();
        if (waveformContainer) {
          const handleWaveformClick = () => {
            // Small delay to ensure wavesurfer has processed the click
            setTimeout(() => {
              const time = wavesurfer.getCurrentTime();
              console.log('📍 Direct waveform click, time:', time);
              setCurrentTime(time);
              timeManager.updateTime(time);
            }, 50);
          };
          
          waveformContainer.addEventListener('click', handleWaveformClick);
          
          // Store cleanup function
          const cleanup = () => {
            waveformContainer.removeEventListener('click', handleWaveformClick);
          };
          
          // Add to wavesurfer for cleanup later
          (wavesurfer as any)._customCleanup = cleanup;
        }

        wavesurfer.on('play', () => setIsPlaying(true));
        wavesurfer.on('pause', () => setIsPlaying(false));

        // ENHANCED: Better error handling with analytics
        wavesurfer.on('error', (err) => {
          const loadTime = Date.now() - startTime;
          console.error('❌ Wavesurfer error:', err);
          
          // Track error
          performanceAnalytics.trackEvent({
            type: 'error',
            duration: loadTime,
            url: actualAudioUrl,
            metadata: {
              component: 'WavesurferPlayer',
              error: err.toString()
            }
          });
          
          // Use enhanced error handler
          const isRealError = handleWavesurferError(err, 'WavesurferPlayer');
          if (!isRealError) {
            // Ignore AbortErrors and 406 errors
            return;
          }
          
          setError('Waveform failed to load');
          setIsLoading(false);
        });

        wavesurfer.on('finish', () => {
          setIsPlaying(false);
          setCurrentTime(0);
          timeManager.updateTime(0);
        });

        // Store reference and load
        wavesurferRef.current = wavesurfer;
        await wavesurfer.load(actualAudioUrl);

        // ENHANCED: Add periodic time sync for better accuracy during pause
        const timeSyncInterval = setInterval(() => {
          if (wavesurferRef.current) {
            const currentWaveTime = wavesurferRef.current.getCurrentTime();
            const isCurrentlyPlaying = wavesurferRef.current.isPlaying();
            
            // Only sync when paused and there's a significant difference
            if (!isCurrentlyPlaying) {
              setCurrentTime(prev => {
                if (Math.abs(currentWaveTime - prev) > 0.1) {
                  console.log('🔄 Time sync update:', currentWaveTime);
                  timeManager.updateTime(currentWaveTime);
                  return currentWaveTime;
                }
                return prev;
              });
            }
          }
        }, 200);
        
        // Store interval for cleanup
        (wavesurfer as any)._timeSyncInterval = timeSyncInterval;

      } catch (err) {
        console.error('❌ Failed to initialize Wavesurfer:', err);
        
        // Handle AbortError specifically
        if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'))) {
          console.warn('🔄 Wavesurfer initialization cancelled');
          setIsLoading(false);
          initializationRef.current = false;
          return;
        }
        
        setError('Waveform unavailable');
        setIsLoading(false);
        initializationRef.current = false;
      }
    };

    initWavesurfer();

    return () => {
      initializationRef.current = false;
      
      // Cleanup managers
      volumeManager.cleanup();
      timeManager.cleanup();
      
      if (wavesurferRef.current) {
        try {
          // Clean up custom event listeners and intervals
          if ((wavesurferRef.current as any)._customCleanup) {
            (wavesurferRef.current as any)._customCleanup();
          }
          
          if ((wavesurferRef.current as any)._timeSyncInterval) {
            clearInterval((wavesurferRef.current as any)._timeSyncInterval);
          }
          
          wavesurferRef.current.destroy();
        } catch (err) {
          console.warn('Error destroying wavesurfer:', err);
        }
        wavesurferRef.current = null;
      }
      
      setIsWaveformReady(false);
      setIsPlaying(false);
    };
  }, [actualAudioUrl, urlProcessingComplete, showWaveform, theme]); // CRITICAL: NO volume dependency

  // STEP 3: Separate volume effect that doesn't reinitialize
  useEffect(() => {
    console.log('🔊 Updating volume to:', volume);
    volumeManager.updateVolume(volume);
  }, [volume, volumeManager]);

  // ENHANCED: Play/pause with better error handling
  const togglePlayPause = useCallback(() => {
    if (wavesurferRef.current && isWaveformReady) {
      try {
        wavesurferRef.current.playPause();
      } catch (err) {
        console.error('Wavesurfer playback error:', err);
        setError('Playback failed');
      }
    }
  }, [isWaveformReady]);

  // CRITICAL: Volume change that doesn't reinitialize
  const handleVolumeChange = useCallback((newVolume: number) => {
    console.log('🎚️ Volume change requested:', newVolume);
    setVolume(newVolume); // This will trigger the separate volume effect
  }, []);

  // ENHANCED: Progress change with waveform handling only
  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * totalDuration;
    
    if (wavesurferRef.current && totalDuration > 0) {
      // CRITICAL: Manual state update for better responsiveness
      setCurrentTime(newTime);
      timeManager.updateTime(newTime);
      wavesurferRef.current.seekTo(newTime / totalDuration);
    }
  }, [totalDuration, timeManager]);

  // ENHANCED: Rewind with manual state update
  const handleRewind = useCallback(() => {
    const newTime = Math.max(0, currentTime - 10);
    
    if (wavesurferRef.current && totalDuration > 0) {
      // CRITICAL: Update state immediately, then seek
      setCurrentTime(newTime);
      timeManager.updateTime(newTime);
      timeManager.seek(newTime);
    }
  }, [currentTime, totalDuration, timeManager]);

  // ENHANCED: Fast forward with boundary check to prevent restart
  const handleFastForward = useCallback(() => {
    const newTime = currentTime + 10;
    
    if (wavesurferRef.current && totalDuration > 0) {
      // For wavesurfer, check if we're near the end
      if (newTime >= totalDuration - 0.5) {
        // Stop playback and go to end instead of seeking past
        wavesurferRef.current.pause();
        wavesurferRef.current.seekTo(1); // Seek to 100% (end)
        setCurrentTime(totalDuration);
        setIsPlaying(false);
        timeManager.updateTime(totalDuration);
        console.log('🛑 Fast forward reached end, stopping playback');
      } else {
        // CRITICAL: Update state immediately, then seek
        setCurrentTime(newTime);
        timeManager.updateTime(newTime);
        timeManager.seek(newTime);
        console.log('⏩ Fast forward to:', newTime);
      }
    }
  }, [currentTime, totalDuration, timeManager, wavesurferRef]);

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const canPlay = isWaveformReady && actualAudioUrl;

  // Debug info (remove in production)
  console.log('WavesurferPlayer state:', {
    actualAudioUrl: actualAudioUrl?.substring(0, 50) + '...',
    urlProcessingComplete,
    showWaveform,
    isWaveformReady,
    isLoading,
    error,
    volume
  });

  // REMOVED: Fallback player to eliminate bandwidth redundancy
  // Instead, show error state and let user retry
  if (error && !showWaveform) {
    return (
      <div className={`bg-red-900/20 border border-red-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-red-400 text-xl">⚠️</div>
            <div>
              <p className="text-red-400 font-medium">Audio Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              // Trigger re-initialization
              setActualAudioUrl(null);
              setTimeout(() => setActualAudioUrl(audioUrl), 100);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-600 ${className}`}>
      {/* File Info */}
      {fileName && (
        <div className="mb-4 pb-3 border-b border-gray-600">
          <p className="text-blue-400 font-medium text-sm flex items-center space-x-2">
            <span>🎵</span>
            <span>{fileName}</span>
            {isLoading && (
              <span className="text-xs text-gray-400">(Loading...)</span>
            )}
          </p>
        </div>
      )}

      {/* Waveform */}
      {showWaveform && (
        <div className="mb-4">
          <div 
            ref={waveformRef} 
            className={`rounded ${isLoading ? 'animate-pulse bg-gray-700' : ''}`}
            style={{ minHeight: '80px' }}
          />
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-400">Loading waveform...</span>
            </div>
          )}
        </div>
      )}

      {/* Player Controls */}
      <div className="space-y-3">
        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleRewind}
            disabled={!canPlay}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white 
                      disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Rewind 10s"
          >
            <span className="text-lg">⏪</span>
          </button>

          <button
            onClick={togglePlayPause}
            disabled={!canPlay}
            className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 
                      disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : isPlaying ? (
              <span className="text-white text-xl">⏸️</span>
            ) : (
              <span className="text-white text-xl ml-0.5">▶️</span>
            )}
          </button>

          <button
            onClick={handleFastForward}
            disabled={!canPlay}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white 
                      disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Fast forward 10s"
          >
            <span className="text-lg">⏩</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleProgressChange}
              disabled={!canPlay}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #4B5563 ${progress}%, #4B5563 100%)`
              }}
            />
          </div>

          {/* Time and Volume */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 font-mono">
                {formatDuration(currentTime)} / {formatDuration(totalDuration)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-xs">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${volume * 100}%, #4B5563 ${volume * 100}%, #4B5563 100%)`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
