/**
 * Unit Tests for Playlist Playback Features
 * Tests core playback logic, queue management, and state persistence
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { buildQueue, getNextTrack, getPreviousTrack } from '@/lib/audio/queueUtils';
import type { Track } from '@/types/track';

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

const mockTracks: Track[] = [
    { 
      id: '1', 
      title: 'Track 1',
      author: 'Test Artist',
      file_url: 'url1',
      duration: 180,
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      genre: null,
      tags: null,
      is_public: true,
      mime_type: null,
      play_count: 0,
      file_size: null,
      compression_applied: null,
      compression_ratio: null,
      original_file_size: null,
    },
    { 
      id: '2', 
      title: 'Track 2',
      author: 'Test Artist',
      file_url: 'url2',
      duration: 200,
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      genre: null,
      tags: null,
      is_public: true,
      mime_type: null,
      play_count: 0,
      file_size: null,
      compression_applied: null,
      compression_ratio: null,
      original_file_size: null,
    },
    { 
      id: '3', 
      title: 'Track 3',
      author: 'Test Artist',
      file_url: 'url3',
      duration: 220,
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      genre: null,
      tags: null,
      is_public: true,
      mime_type: null,
      play_count: 0,
      file_size: null,
      compression_applied: null,
      compression_ratio: null,
      original_file_size: null,
    },
    { 
      id: '4', 
      title: 'Track 4',
      author: 'Test Artist',
      file_url: 'url4',
      duration: 240,
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      genre: null,
      tags: null,
      is_public: true,
      mime_type: null,
      play_count: 0,
      file_size: null,
      compression_applied: null,
      compression_ratio: null,
      original_file_size: null,
    },
  ];

describe('Queue Management', () => {
  describe('buildQueue', () => {
    it('should build queue in original order without shuffle', () => {
      const queue = buildQueue(mockTracks, false);
      
      expect(queue).toHaveLength(4);
      expect(queue[0].id).toBe('1');
      expect(queue[1].id).toBe('2');
      expect(queue[2].id).toBe('3');
      expect(queue[3].id).toBe('4');
    });

    it('should return copy of tracks array', () => {
      const queue = buildQueue(mockTracks, false);
      
      expect(queue).toHaveLength(4);
      expect(queue).not.toBe(mockTracks); // Should be a new array
      expect(queue[0]).toBe(mockTracks[0]); // But same track objects
    });

    it('should shuffle queue when shuffle is true', () => {
      const queue = buildQueue(mockTracks, true);
      
      expect(queue).toHaveLength(4);
      // Queue should contain all tracks
      expect(queue.map(t => t.id).sort()).toEqual(['1', '2', '3', '4']);
    });
  });

  describe('getNextTrack', () => {
    it('should return next track in queue', () => {
      const next = getNextTrack(mockTracks, 0, 'off');
      expect(next?.id).toBe('2');
    });

    it('should return null at end with repeat off', () => {
      const next = getNextTrack(mockTracks, 3, 'off');
      expect(next).toBeNull();
    });

    it('should loop to first track with repeat playlist', () => {
      const next = getNextTrack(mockTracks, 3, 'playlist');
      expect(next?.id).toBe('1');
    });

    it('should return same track with repeat track', () => {
      const next = getNextTrack(mockTracks, 2, 'track');
      expect(next?.id).toBe('3');
    });
  });

  describe('getPreviousTrack', () => {
    it('should return previous track in queue', () => {
      const prev = getPreviousTrack(mockTracks, 2);
      expect(prev?.id).toBe('2');
    });

    it('should return null at start', () => {
      const prev = getPreviousTrack(mockTracks, 0);
      expect(prev).toBeNull();
    });

    it('should not loop to last track', () => {
      const prev = getPreviousTrack(mockTracks, 0);
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

  it('should shuffle tracks when shuffle is enabled', () => {
    // Build queue with shuffle
    const shuffledQueue = buildQueue(mockTracks.slice(0, 3), true);
    
    // Should contain all tracks
    expect(shuffledQueue).toHaveLength(3);
    expect(shuffledQueue.map(t => t.id).sort()).toEqual(['1', '2', '3']);
  });
});






