'use client'
import { useState, useRef, useEffect } from 'react';
import { formatDuration } from '@/utils/audio';
import { getCachedAudioUrl } from '@/utils/audioCache';

interface AudioPlayerProps {
  audioUrl: string;
  fileName?: string;
  duration?: number;
  className?: string;
}

export default function AudioPlayer({ 
  audioUrl, 
  fileName, 
  duration, 
  className = '' 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualAudioUrl, setActualAudioUrl] = useState(audioUrl);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get optimized URL using smart caching system
  useEffect(() => {
    const initializeAudioUrl = async () => {
      if (audioUrl.includes('/object/public/')) {
        setIsLoading(true);
        try {
          const optimizedUrl = await getCachedAudioUrl(audioUrl);
          setActualAudioUrl(optimizedUrl);
        } catch (err) {
          console.error('Error getting optimized URL:', err);
          setError('Failed to load audio file');
        } finally {
          setIsLoading(false);
        }
      } else {
        // URL is already optimized or valid
        setActualAudioUrl(audioUrl);
      }
    };

    initializeAudioUrl();
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [actualAudioUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Playback failed');
      setIsPlaying(false);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;

    const newTime = (parseFloat(e.target.value) / 100) * totalDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="text-red-400 text-xl">⚠️</div>
          <div>
            <p className="text-red-400 font-medium">Audio Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-700 rounded-lg p-4 border border-gray-600 ${className}`}>
      <audio ref={audioRef} src={actualAudioUrl} preload="metadata" />
      
      {/* File Info */}
      {fileName && (
        <div className="mb-3 pb-3 border-b border-gray-600">
          <p className="text-blue-400 font-medium text-sm flex items-center space-x-2">
            <span>🎵</span>
            <span>{fileName}</span>
          </p>
        </div>
      )}

      {/* Player Controls */}
      <div className="space-y-3">
        {/* Play Button and Time */}
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 
                      disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : isPlaying ? (
              <span className="text-white text-lg">⏸️</span>
            ) : (
              <span className="text-white text-lg ml-0.5">▶️</span>
            )}
          </button>

          <div className="flex-1 space-y-2">
            {/* Progress Bar */}
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressChange}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer
                          slider:bg-blue-500 slider:rounded-lg"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #4B5563 ${progress}%, #4B5563 100%)`
                }}
              />
            </div>

            {/* Time Display */}
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}