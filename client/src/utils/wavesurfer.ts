import WaveSurfer from 'wavesurfer.js';
import { formatDuration } from './audio';

export interface WavesurferConfig {
  container: HTMLElement;
  waveColor?: string;
  progressColor?: string;
  barWidth?: number;
  barGap?: number;
  height?: number;
  normalize?: boolean;
}

export const createWavesurferInstance = (config: WavesurferConfig): WaveSurfer => {
  return WaveSurfer.create({
    container: config.container,
    waveColor: config.waveColor || '#4B5563',
    progressColor: config.progressColor || '#3B82F6',
    barWidth: config.barWidth || 2,
    barGap: config.barGap || 1,
    height: config.height || 80,
    normalize: config.normalize ?? true,
    interact: true,
    cursorColor: '#3B82F6',
    cursorWidth: 2,
    backend: 'WebAudio',
    mediaControls: false,
    // CRITICAL: Prevent unnecessary network requests
    xhr: {
      cache: 'default',
      mode: 'cors',
      credentials: 'same-origin',
      headers: {
        'Accept': 'audio/*,*/*;q=0.9',
      }
    },
    // PERFORMANCE: Better decode settings
    audioContext: null, // Let wavesurfer manage this
    closeAudioContext: false, // Don't close shared context
  });
};

export const WAVESURFER_THEMES = {
  default: {
    waveColor: '#4B5563',
    progressColor: '#3B82F6',
  },
  ai_music: {
    waveColor: '#6366F1',
    progressColor: '#8B5CF6',
  },
  dark_mode: {
    waveColor: '#6B7280',
    progressColor: '#10B981',
  }
};

// ENHANCED: Better error categorization
export const formatWaveformError = (error: Error): string => {
  // Suppress AbortError completely
  if (error.name === 'AbortError' || error.message.includes('aborted')) {
    console.warn('Wavesurfer AbortError (ignored):', error.message);
    return ''; // Return empty string to indicate non-critical
  }
  
  // Suppress 406 errors as they don't affect functionality
  if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
    console.warn('Wavesurfer 406 error (non-critical):', error.message);
    return '';
  }
  
  if (error.message.includes('fetch')) {
    return 'Unable to load audio file. Please check your connection.';
  }
  if (error.message.includes('decode')) {
    return 'Audio file format not supported or corrupted.';
  }
  if (error.message.includes('CORS')) {
    return 'Audio file access denied. Please try again.';
  }
  return 'Failed to load waveform. Please try again.';
};

export const optimizeWaveformForMobile = (wavesurfer: WaveSurfer, isMobile: boolean) => {
  if (isMobile) {
    const container = wavesurfer.getWrapper();
    if (container) {
      container.style.height = '60px';
    }
  }
};

// ENHANCED: Better error handling with abort detection
export const handleWavesurferError = (error: any, componentName: string = 'WavesurferPlayer') => {
  // Ignore AbortErrors completely
  if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
    console.debug(`${componentName}: AbortError ignored (normal during re-initialization)`);
    return false;
  }
  
  // Check if it's a non-critical 406 error
  if (error?.message?.includes('406') || error?.status === 406) {
    console.warn(`${componentName}: Non-critical 406 error suppressed`);
    return false;
  }
  
  // Log other errors normally
  console.error(`${componentName} error:`, error);
  return true;
};

// NEW: Volume management utilities
export const createVolumeManager = () => {
  let currentVolume = 0.7;
  let wavesurferInstance: WaveSurfer | null = null;
  
  return {
    setWavesurfer: (instance: WaveSurfer) => {
      wavesurferInstance = instance;
      // Apply current volume to new instance
      if (instance && typeof instance.setVolume === 'function') {
        instance.setVolume(currentVolume);
      }
    },
    
    updateVolume: (newVolume: number) => {
      currentVolume = newVolume;
      if (wavesurferInstance && typeof wavesurferInstance.setVolume === 'function') {
        try {
          wavesurferInstance.setVolume(newVolume);
        } catch (err) {
          console.warn('Failed to set volume:', err);
        }
      }
    },
    
    getCurrentVolume: () => currentVolume,
    
    cleanup: () => {
      wavesurferInstance = null;
    }
  };
};

// NEW: Time management for better seeking
export const createTimeManager = () => {
  let currentTime = 0;
  let duration = 0;
  let wavesurferInstance: WaveSurfer | null = null;
  
  return {
    setWavesurfer: (instance: WaveSurfer) => {
      wavesurferInstance = instance;
      duration = instance.getDuration() || 0;
    },
    
    updateTime: (time: number) => {
      currentTime = time;
    },
    
    seek: (time: number) => {
      if (wavesurferInstance && duration > 0) {
        const percentage = time / duration;
        wavesurferInstance.seekTo(percentage);
        currentTime = time;
        return true;
      }
      return false;
    },
    
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    
    cleanup: () => {
      wavesurferInstance = null;
      currentTime = 0;
      duration = 0;
    }
  };
};
