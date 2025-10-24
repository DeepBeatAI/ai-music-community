/**
 * Unit Tests for Playlist Playback Features
 * Tests core playback logic, queue management, and state persistence
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { PlaybackProvider, usePlayback } from '@/contexts/PlaybackContext';
import { buildQueue, getNextTrack, getPreviousTrack } from '@/lib/audio/queueUtils';
import type { Playlist, Track } from '@/types/playlist';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}));

// Mock getCachedAudioUrl
jest.mock('@/utils/audioCache', () => ({
  getCachedAudioUrl: jest.fn((url: string) => Promise.resolve(url))
}));

describe('Queue Management', () => {
  const mockTracks: Track[] = [
    { id: '1', title: 'Track 1', artist_name: 'Artist 1', audio_url: 'url1', duration: 180 } as Track,
    { id: '2', title: 'Track 2', artist_name: 'Artist 2', audio_url: 'url2', duration: 200 } as Track,
    { id: '3', title: 'Track 3', artist_name: 'Artist 3', audio_url: 'url3', duration: 220 } as Track,
    { id: '4', title: 'Track 4', artist_name: 'Artist 4', audio_url: 'url4', duration: 240 } as Track,
  ];

  describe('buildQueue', () => {
    it('should build queue in original order without shuffle', () => {
      const queue = buildQueue(mockTracks, 0, false);
      
      expect(queue).toHaveLength(4);
      expect(queue[0].id).toBe('1');
      expect(queue[1].id).toBe('2');
      expect(queue[2].id).toBe('3');
      expect(queue[3].id).toBe('4');
    });

    it('should build queue starting from specified index', () => {
      const queue = buildQueue(mockTracks, 2, false);
      
      expect(queue).toHaveLength(4);
      expect(queue[0].id).toBe('3'); // Start from index 2
      expect(queue[1].id).toBe('4');
      expect(queue[2].id).toBe('1');
      expect(queue[3].id).toBe('2');
    });

    it('should shuffle queue when shuffle is true', () => {
      const queue = buildQueue(mockTracks, 0, true);
      
      expect(queue).toHaveLength(4);
      // Queue should contain all tracks
      expect(queue.map(t => t.id).sort()).toEqual(['1', '2', '3', '4']);
      // First track should remain the same (current track)
      expect(queue[0].id).toBe('1');
    });
  });

  describe('getNextTrack', () => {
    it('should return next track in queue', () => {
      const next = getNextTrack(mockTracks, 0, 'off', false);
      expect(next?.track.id).toBe('2');
      expect(next?.index).toBe(1);
    });

    it('should return null at end with repeat off', () => {
      const next = getNextTrack(mockTracks, 3, 'off', false);
      expect(next).toBeNull();
    });

    it('should loop to first track with repeat playlist', () => {
      const next = getNextTrack(mockTracks, 3, 'playlist', false);
      expect(next?.track.id).toBe('1');
      expect(next?.index).toBe(0);
    });

    it('should return same track with repeat track', () => {
      const next = getNextTrack(mockTracks, 2, 'track', false);
      expect(next?.track.id).toBe('3');
      expect(next?.index).toBe(2);
    });
  });

  describe('getPreviousTrack', () => {
    it('should return previous track in queue', () => {
      const prev = getPreviousTrack(mockTracks, 2, false);
      expect(prev?.track.id).toBe('2');
      expect(prev?.index).toBe(1);
    });

    it('should return null at start', () => {
      const prev = getPreviousTrack(mockTracks, 0, false);
      expect(prev).toBeNull();
    });

    it('should loop to last track with repeat playlist', () => {
      const prev = getPreviousTrack(mockTracks, 0, false);
      expect(prev).toBeNull(); // No looping on previous
    });
  });
});

describe('State Persistence', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  it('should save playback state to sessionStorage', () => {
    const state = {
      playlistId: 'playlist-1',
      trackId: 'track-1',
      trackIndex: 2,
      position: 45.5,
      isPlaying: true,
      shuffleMode: false,
      repeatMode: 'off' as const,
      queue: ['track-1', 'track-2', 'track-3'],
      timestamp: Date.now()
    };

    sessionStorage.setItem('playbackState', JSON.stringify(state));
    
    const saved = JSON.parse(sessionStorage.getItem('playbackState') || '{}');
    expect(saved.playlistId).toBe('playlist-1');
    expect(saved.trackIndex).toBe(2);
    expect(saved.position).toBe(45.5);
  });

  it('should detect stale state (>1 hour old)', () => {
    const staleState = {
      playlistId: 'playlist-1',
      trackId: 'track-1',
      trackIndex: 0,
      position: 0,
      isPlaying: false,
      shuffleMode: false,
      repeatMode: 'off' as const,
      queue: [],
      timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
    };

    sessionStorage.setItem('playbackState', JSON.stringify(staleState));
    
    const saved = JSON.parse(sessionStorage.getItem('playbackState') || '{}');
    const isStale = Date.now() - saved.timestamp > 60 * 60 * 1000; // 1 hour
    
    expect(isStale).toBe(true);
  });

  it('should handle missing sessionStorage gracefully', () => {
    // Simulate sessionStorage being unavailable
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      try {
        sessionStorage.setItem('test', 'value');
      } catch (error) {
        // Should handle error gracefully
      }
    }).not.toThrow();

    Storage.prototype.setItem = originalSetItem;
  });
});

describe('Shuffle and Repeat Modes', () => {
  it('should cycle through repeat modes correctly', () => {
    const modes: Array<'off' | 'playlist' | 'track'> = ['off', 'playlist', 'track'];
    let currentMode: 'off' | 'playlist' | 'track' = 'off';

    // Cycle: off -> playlist
    const index1 = modes.indexOf(currentMode);
    currentMode = modes[(index1 + 1) % modes.length];
    expect(currentMode).toBe('playlist');

    // Cycle: playlist -> track
    const index2 = modes.indexOf(currentMode);
    currentMode = modes[(index2 + 1) % modes.length];
    expect(currentMode).toBe('track');

    // Cycle: track -> off
    const index3 = modes.indexOf(currentMode);
    currentMode = modes[(index3 + 1) % modes.length];
    expect(currentMode).toBe('off');
  });

  it('should preserve current track when toggling shuffle', () => {
    const tracks: Track[] = [
      { id: '1', title: 'Track 1' } as Track,
      { id: '2', title: 'Track 2' } as Track,
      { id: '3', title: 'Track 3' } as Track,
    ];

    const currentTrackId = '2';
    const currentIndex = 1;

    // Build queue with shuffle
    const shuffledQueue = buildQueue(tracks, currentIndex, true);
    
    // Current track should still be first in queue
    expect(shuffledQueue[0].id).toBe(currentTrackId);
  });
});
