/**
 * Play Tracking System
 * 
 * Tracks when users play audio tracks and records play counts to the database.
 * Only counts plays that last 30+ seconds to ensure meaningful engagement.
 * Implements debouncing to prevent duplicate counts and retry queue for failed events.
 */

import { supabase } from './supabase';

interface PlayEvent {
  track_id: string;
  user_id: string;
  timestamp: number;
}

class PlayTracker {
  private playStartTimes: Map<string, number> = new Map();
  private recordedPlays: Set<string> = new Set();
  private readonly MINIMUM_PLAY_DURATION = 30000; // 30 seconds in ms
  private readonly DEBOUNCE_DURATION = 30000; // 30 seconds between plays

  /**
   * Called when track starts playing
   */
  onPlayStart(trackId: string): void {
    const now = Date.now();
    this.playStartTimes.set(trackId, now);
    console.log(`[PlayTracker] Play started for track: ${trackId}`);
  }

  /**
   * Called periodically while track is playing (e.g., every 5 seconds)
   * Records play if minimum duration reached
   */
  async checkAndRecordPlay(trackId: string, userId: string): Promise<void> {
    const startTime = this.playStartTimes.get(trackId);
    if (!startTime) return;

    const playDuration = Date.now() - startTime;
    
    // Check if minimum duration reached
    if (playDuration < this.MINIMUM_PLAY_DURATION) {
      return;
    }

    // Check if already recorded recently (debounce)
    const playKey = `${trackId}-${userId}`;
    if (this.recordedPlays.has(playKey)) {
      return;
    }

    // Record the play
    await this.recordPlay(trackId, userId);
    
    // Mark as recorded
    this.recordedPlays.add(playKey);
    console.log(`[PlayTracker] Play recorded for track: ${trackId}`);
    
    // Clear debounce after duration
    setTimeout(() => {
      this.recordedPlays.delete(playKey);
    }, this.DEBOUNCE_DURATION);
  }

  /**
   * Called when track stops playing
   */
  onPlayStop(trackId: string): void {
    this.playStartTimes.delete(trackId);
    console.log(`[PlayTracker] Play stopped for track: ${trackId}`);
  }

  /**
   * Record play event to database
   */
  private async recordPlay(trackId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_play_count', {
        track_uuid: trackId,
      });

      if (error) {
        console.error('[PlayTracker] Failed to record play:', error);
        // Queue for retry
        this.queueFailedPlay({ track_id: trackId, user_id: userId, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('[PlayTracker] Error recording play:', error);
      this.queueFailedPlay({ track_id: trackId, user_id: userId, timestamp: Date.now() });
    }
  }

  /**
   * Queue failed play events for retry
   */
  private queueFailedPlay(event: PlayEvent): void {
    try {
      const queue = this.getFailedPlaysQueue();
      queue.push(event);
      localStorage.setItem('failed_plays', JSON.stringify(queue));
      console.log(`[PlayTracker] Queued failed play for retry. Queue size: ${queue.length}`);
    } catch (error) {
      console.error('[PlayTracker] Failed to queue play event:', error);
    }
  }

  /**
   * Get failed plays queue from localStorage
   */
  private getFailedPlaysQueue(): PlayEvent[] {
    try {
      const stored = localStorage.getItem('failed_plays');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retry failed play events
   */
  async retryFailedPlays(): Promise<void> {
    const queue = this.getFailedPlaysQueue();
    if (queue.length === 0) return;

    console.log(`[PlayTracker] Retrying ${queue.length} failed play events...`);
    const successful: number[] = [];

    for (let i = 0; i < queue.length; i++) {
      const event = queue[i];
      try {
        const { error } = await supabase.rpc('increment_play_count', {
          track_uuid: event.track_id,
        });

        if (!error) {
          successful.push(i);
          console.log(`[PlayTracker] Successfully retried play for track: ${event.track_id}`);
        }
      } catch (error) {
        console.error(`[PlayTracker] Retry failed for track ${event.track_id}:`, error);
        // Keep in queue for next retry
      }
    }

    // Remove successful retries from queue
    const remaining = queue.filter((_, i) => !successful.includes(i));
    localStorage.setItem('failed_plays', JSON.stringify(remaining));
    
    if (successful.length > 0) {
      console.log(`[PlayTracker] Retry complete. ${successful.length} succeeded, ${remaining.length} remaining in queue.`);
    }
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.getFailedPlaysQueue().length;
  }

  /**
   * Clear all tracking state (useful for testing)
   */
  reset(): void {
    this.playStartTimes.clear();
    this.recordedPlays.clear();
    localStorage.removeItem('failed_plays');
    console.log('[PlayTracker] Reset complete');
  }
}

// Export singleton instance
export const playTracker = new PlayTracker();

// Retry failed plays on page load
if (typeof window !== 'undefined') {
  playTracker.retryFailedPlays().catch(error => {
    console.error('[PlayTracker] Failed to retry plays on load:', error);
  });
}

/**
 * Album Play Tracking
 * 
 * Records play events for albums when users play tracks from albums.
 * Implements debouncing to prevent duplicate counts within 30 seconds.
 */

interface AlbumPlayEvent {
  album_id: string;
  user_id: string;
  timestamp: number;
}

class AlbumPlayTracker {
  private lastPlayTimes: Map<string, number> = new Map();
  private readonly DEBOUNCE_DURATION = 30000; // 30 seconds

  /**
   * Record album play event
   * @param albumId - The album ID
   * @param userId - The user ID
   * @returns Promise with success status
   */
  async recordPlay(albumId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check debouncing - prevent recording same album play within 30 seconds
      const playKey = `${albumId}-${userId}`;
      const lastPlayTime = this.lastPlayTimes.get(playKey);
      const now = Date.now();

      if (lastPlayTime && (now - lastPlayTime) < this.DEBOUNCE_DURATION) {
        console.log(`[AlbumPlayTracker] Debounced play for album ${albumId} (last play was ${now - lastPlayTime}ms ago)`);
        return { success: true }; // Return success but don't record
      }

      // Call database function to increment play count
      const { error } = await supabase.rpc('increment_album_play_count', {
        album_uuid: albumId,
        user_uuid: userId,
      });

      if (error) {
        console.error('[AlbumPlayTracker] Failed to record album play:', error);
        // Log but don't block playback
        return { success: false, error: error.message };
      }

      // Update last play time
      this.lastPlayTimes.set(playKey, now);
      console.log(`[AlbumPlayTracker] Successfully recorded play for album: ${albumId}`);

      // Clean up old entries after debounce duration
      setTimeout(() => {
        this.lastPlayTimes.delete(playKey);
      }, this.DEBOUNCE_DURATION);

      return { success: true };
    } catch (error) {
      console.error('[AlbumPlayTracker] Error recording album play:', error);
      // Log but don't block playback
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clear all tracking state (useful for testing)
   */
  reset(): void {
    this.lastPlayTimes.clear();
    console.log('[AlbumPlayTracker] Reset complete');
  }
}

// Export singleton instance
export const albumPlayTracker = new AlbumPlayTracker();

/**
 * Record album play (public API)
 * @param albumId - The album ID
 * @param userId - The user ID
 * @returns Promise with success status
 */
export async function recordAlbumPlay(
  albumId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return albumPlayTracker.recordPlay(albumId, userId);
}

/**
 * Playlist Play Tracking
 * 
 * Records play events for playlists when users play tracks from playlists.
 * Implements debouncing to prevent duplicate counts within 30 seconds.
 */

interface PlaylistPlayEvent {
  playlist_id: string;
  user_id: string;
  timestamp: number;
}

class PlaylistPlayTracker {
  private lastPlayTimes: Map<string, number> = new Map();
  private readonly DEBOUNCE_DURATION = 30000; // 30 seconds

  /**
   * Record playlist play event
   * @param playlistId - The playlist ID
   * @param userId - The user ID
   * @returns Promise with success status
   */
  async recordPlay(playlistId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check debouncing - prevent recording same playlist play within 30 seconds
      const playKey = `${playlistId}-${userId}`;
      const lastPlayTime = this.lastPlayTimes.get(playKey);
      const now = Date.now();

      if (lastPlayTime && (now - lastPlayTime) < this.DEBOUNCE_DURATION) {
        console.log(`[PlaylistPlayTracker] Debounced play for playlist ${playlistId} (last play was ${now - lastPlayTime}ms ago)`);
        return { success: true }; // Return success but don't record
      }

      // Call database function to increment play count
      const { error } = await supabase.rpc('increment_playlist_play_count', {
        playlist_uuid: playlistId,
        user_uuid: userId,
      });

      if (error) {
        console.error('[PlaylistPlayTracker] Failed to record playlist play:', error);
        // Log but don't block playback
        return { success: false, error: error.message };
      }

      // Update last play time
      this.lastPlayTimes.set(playKey, now);
      console.log(`[PlaylistPlayTracker] Successfully recorded play for playlist: ${playlistId}`);

      // Clean up old entries after debounce duration
      setTimeout(() => {
        this.lastPlayTimes.delete(playKey);
      }, this.DEBOUNCE_DURATION);

      return { success: true };
    } catch (error) {
      console.error('[PlaylistPlayTracker] Error recording playlist play:', error);
      // Log but don't block playback
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clear all tracking state (useful for testing)
   */
  reset(): void {
    this.lastPlayTimes.clear();
    console.log('[PlaylistPlayTracker] Reset complete');
  }
}

// Export singleton instance
export const playlistPlayTracker = new PlaylistPlayTracker();

/**
 * Record playlist play (public API)
 * @param playlistId - The playlist ID
 * @param userId - The user ID
 * @returns Promise with success status
 */
export async function recordPlaylistPlay(
  playlistId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return playlistPlayTracker.recordPlay(playlistId, userId);
}
