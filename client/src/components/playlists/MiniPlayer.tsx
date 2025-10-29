'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePlayback } from '@/contexts/PlaybackContext';

/**
 * Format time in seconds to mm:ss format
 * @param seconds - Time in seconds
 * @returns Formatted time string (mm:ss)
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * TrackInfo sub-component
 * Displays current track cover image, title, and artist name
 */
function TrackInfo(): React.ReactElement {
  const { currentTrack } = usePlayback();
  
  if (!currentTrack) {
    return <div className="flex items-center gap-3" />;
  }
  
  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Music Icon (no cover image for tracks) */}
      <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-800">
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
      </div>
      
      {/* Track Info */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white truncate">
          {currentTrack.title}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {currentTrack.author || 'Unknown Artist'}
        </div>
      </div>
    </div>
  );
}

/**
 * PlaybackControls sub-component
 * Previous, play/pause, and next track buttons
 */
function PlaybackControls(): React.ReactElement {
  const { isPlaying, pause, resume, previous, next } = usePlayback();
  
  const handlePlayPause = (): void => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      {/* Previous Button */}
      <button
        onClick={previous}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Previous track"
        type="button"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>
      
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        className="p-2 bg-white text-black rounded-full hover:scale-105 transition-transform"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        type="button"
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      
      {/* Next Button */}
      <button
        onClick={next}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Next track"
        type="button"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z" />
        </svg>
      </button>
    </div>
  );
}

/**
 * ProgressBar sub-component
 * Displays current time, total duration, and seekable progress bar
 */
function ProgressBar(): React.ReactElement {
  const { progress, duration, seek } = usePlayback();
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  
  // Update local progress when prop changes (unless dragging)
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);
  
  const currentTime = (localProgress / 100) * duration;
  
  const handleSeek = useCallback((clientX: number): void => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newTime = (percentage / 100) * duration;
    
    setLocalProgress(percentage);
    seek(newTime);
  }, [duration, seek]);
  
  const handleMouseDown = (e: React.MouseEvent): void => {
    setIsDragging(true);
    handleSeek(e.clientX);
  };
  
  // Add/remove global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent): void => {
        handleSeek(e.clientX);
      };
      
      const handleUp = (): void => {
        setIsDragging(false);
      };
      
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, handleSeek]);
  
  return (
    <div className="flex items-center gap-2 w-full">
      {/* Current Time */}
      <div className="text-xs text-gray-400 w-10 text-right">
        {formatTime(currentTime)}
      </div>
      
      {/* Progress Bar */}
      <div
        ref={progressBarRef}
        className="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer relative group"
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={localProgress}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            const newTime = Math.max(0, currentTime - 5);
            seek(newTime);
          } else if (e.key === 'ArrowRight') {
            const newTime = Math.min(duration, currentTime + 5);
            seek(newTime);
          }
        }}
      >
        {/* Progress Fill */}
        <div
          className="absolute top-0 left-0 h-full bg-white rounded-full transition-all"
          style={{ width: `${localProgress}%` }}
        />
        
        {/* Hover Effect */}
        <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        {/* Seek Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${localProgress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      
      {/* Total Duration */}
      <div className="text-xs text-gray-400 w-10">
        {formatTime(duration)}
      </div>
    </div>
  );
}

/**
 * VolumeControl sub-component
 * Volume slider with mute toggle
 */
function VolumeControl(): React.ReactElement {
  const { volume, setVolume } = usePlayback();
  const [isMuted, setIsMuted] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(100);
  const volumeRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Close slider when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setShowSlider(false);
      }
    };
    
    if (showSlider) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSlider]);
  
  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowSlider(true);
  };
  
  const handleMouseLeave = () => {
    // Delay hiding to allow moving to the slider
    hideTimeoutRef.current = setTimeout(() => {
      setShowSlider(false);
    }, 200);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (newVolume > 0) {
      setPreviousVolume(newVolume);
    }
  };
  
  const toggleMute = () => {
    if (isMuted) {
      // Unmute - restore previous volume
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      // Mute - save current volume and set to 0
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };
  
  const displayVolume = isMuted ? 0 : volume;
  
  return (
    <div 
      className="relative" 
      ref={volumeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={toggleMute}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
        type="button"
      >
        {displayVolume === 0 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ) : displayVolume < 50 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 9v6h4l5 5V4l-5 5H7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        )}
      </button>
      
      {/* Volume Slider */}
      {showSlider && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 rounded-lg p-2 shadow-lg"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <input
            type="range"
            min="0"
            max="100"
            value={displayVolume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
            style={{
              background: `linear-gradient(to right, white ${displayVolume}%, rgb(75, 85, 99) ${displayVolume}%)`
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * ModeControls sub-component
 * Shuffle toggle, repeat mode cycle, volume control, playlist link, and close buttons
 */
function ModeControls(): React.ReactElement {
  const { shuffleMode, repeatMode, toggleShuffle, cycleRepeat, stop, activePlaylist } = usePlayback();
  
  return (
    <div className="flex items-center gap-1">
      {/* Go to Playlist Button */}
      {activePlaylist && activePlaylist.id !== 'single-track' && (
        <Link
          href={`/playlists/${activePlaylist.id}`}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Go to playlist"
          title="Go to playlist"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          </svg>
        </Link>
      )}
      
      {/* Volume Control */}
      <VolumeControl />
      
      {/* Shuffle Button */}
      <button
        onClick={toggleShuffle}
        className={`p-2 transition-colors ${
          shuffleMode ? 'text-green-500' : 'text-gray-400 hover:text-white'
        }`}
        aria-label={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
        title={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
        type="button"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
      </button>
      
      {/* Repeat Button */}
      <button
        onClick={cycleRepeat}
        className={`p-2 transition-colors ${
          repeatMode !== 'off' ? 'text-green-500' : 'text-gray-400 hover:text-white'
        }`}
        aria-label={`Repeat ${repeatMode}`}
        title={`Repeat ${repeatMode}`}
        type="button"
      >
        {repeatMode === 'track' ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
          </svg>
        )}
      </button>
      
      {/* Close Button */}
      <button
        onClick={stop}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Close player"
        title="Close player"
        type="button"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * MiniPlayer component
 * Persistent audio player that remains visible across all pages during playback
 */
export function MiniPlayer(): React.ReactElement | null {
  const { activePlaylist, currentTrack } = usePlayback();
  const [isVisible, setIsVisible] = useState(false);
  
  // Show/hide with animation
  useEffect(() => {
    if (activePlaylist && currentTrack) {
      // Small delay to trigger animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [activePlaylist, currentTrack]);
  
  // Don't render if no active playback
  if (!activePlaylist || !currentTrack) {
    return null;
  }
  
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      data-testid="mini-player"
    >
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Left: Track Info */}
            <div className="w-1/4 min-w-0">
              <TrackInfo />
            </div>
            
            {/* Center: Playback Controls and Progress */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <PlaybackControls />
              <div className="w-full max-w-2xl">
                <ProgressBar />
              </div>
            </div>
            
            {/* Right: Mode Controls */}
            <div className="w-1/4 flex justify-end">
              <ModeControls />
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="px-4 py-3 space-y-2">
          {/* Track Info and Mode Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <TrackInfo />
            </div>
            <ModeControls />
          </div>
          
          {/* Playback Controls */}
          <div className="flex justify-center">
            <PlaybackControls />
          </div>
          
          {/* Progress Bar */}
          <ProgressBar />
        </div>
      </div>
    </div>
  );
}
