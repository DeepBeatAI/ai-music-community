/**
 * Integration Tests for PlaybackContext
 * Tests the full playback context with state management
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { PlaybackProvider, usePlayback } from '@/contexts/PlaybackContext';
import type { PlaylistWithTracks } from '@/types/playlist';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/utils/audioCache', () => ({
  getCachedAudioUrl: jest.fn((url: string) => Promise.resolve(url))
}));

// Mock AudioManager
jest.mock('@/lib/audio/AudioManager', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      // @ts-expect-error - Mock returns undefined for Promise<void>
      loadTrack: jest.fn().mockResolvedValue(undefined),
      // @ts-expect-error - Mock returns undefined for Promise<void>
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      resume: jest.fn(),
      seek: jest.fn(),
      getCurrentTime: jest.fn().mockReturnValue(0),
      getDuration: jest.fn().mockReturnValue(180),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }))
  };
});

const mockPlaylist: PlaylistWithTracks = {
  id: 'playlist-1',
  name: 'Test Playlist',
  description: 'Test Description',
  user_id: 'user-1',
  is_public: true,
  cover_image_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  track_count: 3,
  tracks: [
    {
      id: 'pt-1',
      track_id: 'track-1',
      position: 0,
      added_at: new Date().toISOString(),
      track: {
        id: 'track-1',
        title: 'Track 1',
        file_url: 'https://example.com/track1.mp3',
        duration: 180,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: null,
        genre: null,
        tags: null,
        is_public: true,
mime_type: null,
play_count: null,
        file_size: null,
compression_applied: null,
compression_ratio: null,
original_file_size: null,
        }
    },
    {
      id: 'pt-2',
      track_id: 'track-2',
      position: 1,
      added_at: new Date().toISOString(),
      track: {
        id: 'track-2',
        title: 'Track 2',
        file_url: 'https://example.com/track2.mp3',
        duration: 200,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: null,
        genre: null,
        tags: null,
        is_public: true,
mime_type: null,
play_count: null,
        file_size: null,
compression_applied: null,
compression_ratio: null,
original_file_size: null,
        }
    },
    {
      id: 'pt-3',
      track_id: 'track-3',
      position: 2,
      added_at: new Date().toISOString(),
      track: {
        id: 'track-3',
        title: 'Track 3',
        file_url: 'https://example.com/track3.mp3',
        duration: 220,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: null,
        genre: null,
        tags: null,
        is_public: true,
mime_type: null,
play_count: null,
        file_size: null,
compression_applied: null,
compression_ratio: null,
original_file_size: null,
        }
    }
  ]
};

describe('PlaybackContext Integration', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should provide initial state', () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    expect(result.current.activePlaylist).toBeNull();
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.currentTrackIndex).toBe(-1);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.queue).toEqual([]);
    expect(result.current.shuffleMode).toBe(false);
    expect(result.current.repeatMode).toBe('off');
  });

  it('should start playlist playback', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
    });

    await waitFor(() => {
      expect(result.current.activePlaylist).not.toBeNull();
      expect(result.current.currentTrack).not.toBeNull();
      expect(result.current.currentTrackIndex).toBe(0);
      expect(result.current.queue.length).toBe(3);
    });
  });

  it('should play specific track from playlist', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 1);
    });

    await waitFor(() => {
      expect(result.current.currentTrackIndex).toBe(1);
      expect(result.current.currentTrack?.id).toBe('track-2');
    });
  });

  it('should navigate to next track', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
    });

    await waitFor(() => {
      expect(result.current.currentTrackIndex).toBe(0);
    });

    await act(async () => {
      await result.current.next();
    });

    await waitFor(() => {
      expect(result.current.currentTrackIndex).toBe(1);
      expect(result.current.currentTrack?.id).toBe('track-2');
    });
  });

  it('should navigate to previous track', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 1);
    });

    await waitFor(() => {
      expect(result.current.currentTrackIndex).toBe(1);
    });

    await act(async () => {
      await result.current.previous();
    });

    await waitFor(() => {
      expect(result.current.currentTrackIndex).toBe(0);
      expect(result.current.currentTrack?.id).toBe('track-1');
    });
  });

  it('should toggle shuffle mode', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
    });

    expect(result.current.shuffleMode).toBe(false);

    act(() => {
      result.current.toggleShuffle();
    });

    await waitFor(() => {
      expect(result.current.shuffleMode).toBe(true);
    });

    act(() => {
      result.current.toggleShuffle();
    });

    await waitFor(() => {
      expect(result.current.shuffleMode).toBe(false);
    });
  });

  it('should cycle repeat modes', () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    expect(result.current.repeatMode).toBe('off');

    act(() => {
      result.current.cycleRepeat();
    });
    expect(result.current.repeatMode).toBe('playlist');

    act(() => {
      result.current.cycleRepeat();
    });
    expect(result.current.repeatMode).toBe('track');

    act(() => {
      result.current.cycleRepeat();
    });
    expect(result.current.repeatMode).toBe('off');
  });

  it('should pause and resume playback', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
    });

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true);
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.resume();
    });

    expect(result.current.isPlaying).toBe(true);
  });

  it('should stop playback', async () => {
    const { result } = renderHook(() => usePlayback(), {
      wrapper: PlaybackProvider
    });

    await act(async () => {
      await result.current.playPlaylist(mockPlaylist, 0);
    });

    await waitFor(() => {
      expect(result.current.activePlaylist).not.toBeNull();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.activePlaylist).toBeNull();
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });
});







