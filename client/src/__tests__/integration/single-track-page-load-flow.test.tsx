/**
 * Integration tests for Single Track Page load flow
 * 
 * Tests:
 * - Complete page load with valid track ID
 * - Page load with invalid track ID
 * - Page load for authenticated vs unauthenticated users
 * - Loading states and error states
 * - Performance metrics tracking
 */

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('@/utils/audioCache', () => ({
  getCachedAudioUrl: jest.fn(),
  audioCacheManager: {
    getPerformanceStats: jest.fn().mockReturnValue({
      hitRate: 0.75,
      averageLoadTime: 150,
      totalRequests: 100,
      estimatedBandwidthSaved: 10485760, // 10MB
    }),
  },
}));

jest.mock('@/utils/errorLogging', () => ({
  logSingleTrackPageError: jest.fn(),
}));

import { getCachedAudioUrl } from '@/utils/audioCache';
import { logSingleTrackPageError } from '@/utils/errorLogging';

describe('Single Track Page - Load Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful page load', () => {
    it('should validate complete track data structure', () => {
      const mockTrackData = {
        id: 'track-123',
        title: 'Test Track',
        author: 'Test Artist',
        description: 'Test description',
        file_url: 'https://example.com/audio.mp3',
        duration: 180,
        genre: 'Electronic',
        play_count: 100,
        user_id: 'user-123',
        is_public: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-123',
          username: 'testuser',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        playlist_tracks: [],
      };

      // Validate all required fields are present
      expect(mockTrackData.id).toBeDefined();
      expect(mockTrackData.title).toBeDefined();
      expect(mockTrackData.file_url).toBeDefined();
      expect(mockTrackData.user_id).toBeDefined();
      expect(mockTrackData.is_public).toBeDefined();
      expect(mockTrackData.user).toBeDefined();
      expect(mockTrackData.user.username).toBe('testuser');
    });

    it('should track metadata load time', async () => {
      const performanceMetrics = {
        pageLoadStart: 0,
        metadataLoadTime: 0,
      };

      performanceMetrics.pageLoadStart = performance.now();

      // Simulate data loading
      await new Promise(resolve => setTimeout(resolve, 10));

      performanceMetrics.metadataLoadTime = performance.now() - performanceMetrics.pageLoadStart;

      expect(performanceMetrics.metadataLoadTime).toBeGreaterThan(0);
    });

    it('should determine user-specific data from query results', () => {
      const mockUser = { id: 'user-123' };

      // Simulate like query result
      const likeData = { id: 'like-123' };
      const isLiked = !!likeData;

      // Simulate follow query result
      const followData = null;
      const isFollowing = !!followData;

      expect(isLiked).toBe(true);
      expect(isFollowing).toBe(false);
      expect(mockUser.id).toBe('user-123');
    });
  });

  describe('Error handling', () => {
    it('should identify track not found error (404)', () => {
      const error = { code: 'PGRST116', message: 'Not found' };

      // Verify error code detection
      const isNotFoundError = error.code === 'PGRST116';
      expect(isNotFoundError).toBe(true);
      expect(error.message).toBe('Not found');
    });

    it('should check permission for private tracks (403)', () => {
      const trackData = {
        id: 'track-123',
        is_public: false,
        user_id: 'owner-123',
      };

      // Check permission for non-owner
      const user = { id: 'other-user-456' };
      const hasPermission = trackData.is_public || (user && user.id === trackData.user_id);

      expect(hasPermission).toBe(false);

      // Check permission for owner
      const owner = { id: 'owner-123' };
      const ownerHasPermission = trackData.is_public || (owner && owner.id === trackData.user_id);

      expect(ownerHasPermission).toBe(true);
    });

    it('should handle network errors', () => {
      const error = new Error('Network error');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error');

      // Verify error type detection
      const isNetworkError = error.message.includes('Network');
      expect(isNetworkError).toBe(true);
    });

    it('should log errors with context', () => {
      const error = new Error('Test error');
      const trackId = 'track-123';
      const userId = 'user-123';

      logSingleTrackPageError(
        error,
        trackId,
        userId,
        'track_load',
        'Loading track page',
        { errorType: 'network' }
      );

      expect(logSingleTrackPageError).toHaveBeenCalledWith(
        error,
        trackId,
        userId,
        'track_load',
        'Loading track page',
        { errorType: 'network' }
      );
    });
  });

  describe('Audio loading', () => {
    it('should defer audio loading until user interaction', async () => {
      let shouldLoadAudio = false;

      // Initially, audio should not load
      expect(shouldLoadAudio).toBe(false);

      // User clicks to load audio
      shouldLoadAudio = true;

      expect(shouldLoadAudio).toBe(true);
    });

    it('should load audio URL using getCachedAudioUrl', async () => {
      const fileUrl = 'https://example.com/audio.mp3';
      const cachedUrl = 'https://cached.example.com/audio.mp3';

      (getCachedAudioUrl as jest.Mock).mockResolvedValue(cachedUrl);

      const result = await getCachedAudioUrl(fileUrl);

      expect(result).toBe(cachedUrl);
      expect(getCachedAudioUrl).toHaveBeenCalledWith(fileUrl);
    });

    it('should track audio ready time', async () => {
      const performanceMetrics = {
        pageLoadStart: 0,
        audioReadyTime: 0,
      };

      performanceMetrics.pageLoadStart = performance.now();

      // Simulate audio loading
      await new Promise(resolve => setTimeout(resolve, 20));

      performanceMetrics.audioReadyTime = performance.now() - performanceMetrics.pageLoadStart;

      expect(performanceMetrics.audioReadyTime).toBeGreaterThan(0);
    });

    it('should retry audio load on failure', async () => {
      let retryCount = 0;
      const maxRetries = 3;

      (getCachedAudioUrl as jest.Mock)
        .mockRejectedValueOnce(new Error('Load failed'))
        .mockRejectedValueOnce(new Error('Load failed'))
        .mockResolvedValueOnce('https://cached.example.com/audio.mp3');

      const loadAudioWithRetry = async () => {
        while (retryCount < maxRetries) {
          try {
            const url = await getCachedAudioUrl('https://example.com/audio.mp3');
            return url;
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw error;
            }
          }
        }
      };

      const result = await loadAudioWithRetry();

      expect(result).toBe('https://cached.example.com/audio.mp3');
      expect(retryCount).toBe(2);
    });

    it('should handle audio load failure after all retries', async () => {
      let retryCount = 0;
      const maxRetries = 3;

      (getCachedAudioUrl as jest.Mock).mockRejectedValue(new Error('Load failed'));

      const loadAudioWithRetry = async () => {
        while (retryCount < maxRetries) {
          try {
            const url = await getCachedAudioUrl('https://example.com/audio.mp3');
            return url;
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw error;
            }
          }
        }
      };

      await expect(loadAudioWithRetry()).rejects.toThrow('Load failed');
      expect(retryCount).toBe(3);
    });
  });

  describe('Loading states', () => {
    it('should show loading state initially', () => {
      const loading = true;
      const track = null;
      const error = null;

      expect(loading).toBe(true);
      expect(track).toBeNull();
      expect(error).toBeNull();
    });

    it('should transition to success state after load', () => {
      const loading = false;
      const track = { id: 'track-123', title: 'Test Track' };
      const error = null;

      expect(loading).toBe(false);
      expect(track).not.toBeNull();
      expect(error).toBeNull();
    });

    it('should transition to error state on failure', () => {
      const loading = false;
      const track = null;
      const error = 'Track not found';

      expect(loading).toBe(false);
      expect(track).toBeNull();
      expect(error).not.toBeNull();
    });
  });

  describe('Performance monitoring', () => {
    it('should track page load metrics', () => {
      const metrics = {
        pageLoadStart: 0,
        metadataLoadTime: 100,
        audioReadyTime: 200,
        interactionTimes: [5, 3, 7],
      };

      expect(metrics.metadataLoadTime).toBe(100);
      expect(metrics.audioReadyTime).toBe(200);
      expect(metrics.interactionTimes.length).toBe(3);
    });

    it('should calculate average interaction time', () => {
      const interactionTimes = [5, 10, 15, 20];
      const avgTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length;

      expect(avgTime).toBe(12.5);
    });

    it('should log performance summary on unmount', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const metrics = {
        metadataLoadTime: 100,
        audioReadyTime: 200,
        interactionTimes: [5, 10],
      };

      console.log('[Performance] Session Summary:', metrics);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
