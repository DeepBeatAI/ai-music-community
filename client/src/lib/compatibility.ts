/**
 * Backward Compatibility Layer for Tracks vs Posts Separation
 * 
 * This module provides compatibility functions to help transition from the old
 * posts-based audio storage to the new tracks-based system.
 * 
 * @module compatibility
 * @deprecated This entire module is deprecated and will be removed in v2.0
 * 
 * Requirements: 6.1, 6.3, 10.3
 */

import type { Post } from '@/types';
import type { Track } from '@/types/track';

/**
 * Audio data structure for backward compatibility
 */
export interface AudioData {
  url: string;
  filename: string;
  title: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Get audio data from a post using either new or old structure
 * 
 * This function provides a unified interface for accessing audio data from posts,
 * supporting both the new track-based structure and the deprecated audio_* fields.
 * 
 * @param post - The post object (may have track or audio_* fields)
 * @returns AudioData object with normalized audio information
 * 
 * @example
 * ```typescript
 * const post = await fetchPost(postId);
 * const audioData = getAudioDataFromPost(post);
 * console.log(audioData.url); // Works with both old and new structure
 * ```
 * 
 * @deprecated Use post.track directly instead. This function will be removed in v2.0
 */
export function getAudioDataFromPost(post: Post): AudioData {
  // Emit deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] getAudioDataFromPost() is deprecated. ' +
      'Access post.track directly instead. ' +
      'This function will be removed in v2.0'
    );
  }

  // Try new structure first (preferred)
  if (post.track) {
    return {
      url: post.track.file_url,
      filename: post.track.title,
      title: post.track.title,
      duration: post.track.duration || undefined,
      fileSize: post.track.file_size || undefined,
      mimeType: post.track.mime_type || undefined,
    };
  }

  // Fall back to old structure (deprecated)
  if (post.audio_url) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[DEPRECATED] Post is using deprecated audio_* fields. ' +
        'This post should be migrated to use track_id. ' +
        `Post ID: ${post.id}`
      );
    }

    return {
      url: post.audio_url,
      filename: post.audio_filename || 'Audio Track',
      title: post.audio_filename || 'Audio Track',
      duration: post.audio_duration || undefined,
      fileSize: post.audio_file_size || undefined,
      mimeType: post.audio_mime_type || undefined,
    };
  }

  // No audio data found
  throw new Error(`Post ${post.id} has no audio data (neither track nor audio_* fields)`);
}

/**
 * Check if a post has audio data (either new or old structure)
 * 
 * @param post - The post object to check
 * @returns true if post has audio data, false otherwise
 * 
 * @example
 * ```typescript
 * if (hasAudioData(post)) {
 *   const audioData = getAudioDataFromPost(post);
 *   // ... use audio data
 * }
 * ```
 * 
 * @deprecated Check post.post_type === 'audio' && post.track instead
 */
export function hasAudioData(post: Post): boolean {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] hasAudioData() is deprecated. ' +
      'Check post.post_type === "audio" && post.track instead. ' +
      'This function will be removed in v2.0'
    );
  }

  return !!(post.track || post.audio_url);
}

/**
 * Get track ID from a post (handles both new and old structures)
 * 
 * @param post - The post object
 * @returns Track ID if available, null otherwise
 * 
 * @example
 * ```typescript
 * const trackId = getTrackIdFromPost(post);
 * if (trackId) {
 *   await addTrackToPlaylist({ playlist_id, track_id: trackId });
 * }
 * ```
 * 
 * @deprecated Use post.track_id directly instead
 */
export function getTrackIdFromPost(post: Post): string | null {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] getTrackIdFromPost() is deprecated. ' +
      'Access post.track_id directly instead. ' +
      'This function will be removed in v2.0'
    );
  }

  return post.track_id || null;
}

/**
 * Get audio URL from a post (handles both new and old structures)
 * 
 * @param post - The post object
 * @returns Audio URL if available, null otherwise
 * 
 * @example
 * ```typescript
 * const audioUrl = getAudioUrlFromPost(post);
 * if (audioUrl) {
 *   // Play audio
 * }
 * ```
 * 
 * @deprecated Use post.track?.file_url directly instead
 */
export function getAudioUrlFromPost(post: Post): string | null {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] getAudioUrlFromPost() is deprecated. ' +
      'Access post.track?.file_url directly instead. ' +
      'This function will be removed in v2.0'
    );
  }

  // Try new structure first
  if (post.track?.file_url) {
    return post.track.file_url;
  }

  // Fall back to old structure
  return post.audio_url || null;
}

/**
 * Get audio duration from a post (handles both new and old structures)
 * 
 * @param post - The post object
 * @returns Duration in seconds if available, null otherwise
 * 
 * @example
 * ```typescript
 * const duration = getAudioDurationFromPost(post);
 * if (duration) {
 *   console.log(`Track is ${duration} seconds long`);
 * }
 * ```
 * 
 * @deprecated Use post.track?.duration directly instead
 */
export function getAudioDurationFromPost(post: Post): number | null {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] getAudioDurationFromPost() is deprecated. ' +
      'Access post.track?.duration directly instead. ' +
      'This function will be removed in v2.0'
    );
  }

  // Try new structure first
  if (post.track?.duration !== undefined && post.track?.duration !== null) {
    return post.track.duration;
  }

  // Fall back to old structure
  return post.audio_duration || null;
}

/**
 * Get audio title/filename from a post (handles both new and old structures)
 * 
 * @param post - The post object
 * @returns Audio title/filename if available, default string otherwise
 * 
 * @example
 * ```typescript
 * const title = getAudioTitleFromPost(post);
 * console.log(`Now playing: ${title}`);
 * ```
 * 
 * @deprecated Use post.track?.title directly instead
 */
export function getAudioTitleFromPost(post: Post): string {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[DEPRECATED] getAudioTitleFromPost() is deprecated. ' +
      'Access post.track?.title directly instead. ' +
      'This function will be removed in v2.0'
    );
  }

  // Try new structure first
  if (post.track?.title) {
    return post.track.title;
  }

  // Fall back to old structure
  return post.audio_filename || 'Audio Track';
}

/**
 * Migration status checker
 * 
 * Checks if a post has been migrated to the new track-based structure
 * 
 * @param post - The post object to check
 * @returns Migration status information
 * 
 * @example
 * ```typescript
 * const status = checkPostMigrationStatus(post);
 * if (!status.isMigrated) {
 *   console.warn('Post needs migration:', status.reason);
 * }
 * ```
 */
export function checkPostMigrationStatus(post: Post): {
  isMigrated: boolean;
  hasTrack: boolean;
  hasLegacyFields: boolean;
  reason: string;
} {
  const hasTrack = !!(post.track_id && post.track);
  const hasLegacyFields = !!(
    post.audio_url ||
    post.audio_filename ||
    post.audio_duration ||
    post.audio_file_size ||
    post.audio_mime_type
  );

  let reason = '';
  let isMigrated = false;

  if (post.post_type === 'text') {
    isMigrated = true;
    reason = 'Text post (no migration needed)';
  } else if (post.post_type === 'audio') {
    if (hasTrack && !hasLegacyFields) {
      isMigrated = true;
      reason = 'Fully migrated (uses track, no legacy fields)';
    } else if (hasTrack && hasLegacyFields) {
      isMigrated = true;
      reason = 'Migrated but legacy fields still present (can be cleaned up)';
    } else if (!hasTrack && hasLegacyFields) {
      isMigrated = false;
      reason = 'Not migrated (uses legacy audio_* fields)';
    } else {
      isMigrated = false;
      reason = 'Invalid state (no track and no legacy fields)';
    }
  }

  return {
    isMigrated,
    hasTrack,
    hasLegacyFields,
    reason,
  };
}

/**
 * Batch check migration status for multiple posts
 * 
 * @param posts - Array of posts to check
 * @returns Summary of migration status
 * 
 * @example
 * ```typescript
 * const posts = await fetchPosts();
 * const summary = checkBatchMigrationStatus(posts);
 * console.log(`${summary.migratedCount}/${summary.totalAudioPosts} posts migrated`);
 * ```
 */
export function checkBatchMigrationStatus(posts: Post[]): {
  totalPosts: number;
  totalAudioPosts: number;
  migratedCount: number;
  notMigratedCount: number;
  migrationPercentage: number;
  details: Array<{
    postId: string;
    status: ReturnType<typeof checkPostMigrationStatus>;
  }>;
} {
  const audioPosts = posts.filter(p => p.post_type === 'audio');
  const details = audioPosts.map(post => ({
    postId: post.id,
    status: checkPostMigrationStatus(post),
  }));

  const migratedCount = details.filter(d => d.status.isMigrated).length;
  const notMigratedCount = details.filter(d => !d.status.isMigrated).length;
  const migrationPercentage = audioPosts.length > 0
    ? (migratedCount / audioPosts.length) * 100
    : 100;

  return {
    totalPosts: posts.length,
    totalAudioPosts: audioPosts.length,
    migratedCount,
    notMigratedCount,
    migrationPercentage,
    details,
  };
}

/**
 * Type guard to check if a post is an audio post
 * 
 * @param post - The post to check
 * @returns true if post is an audio post
 * 
 * @example
 * ```typescript
 * if (isAudioPost(post)) {
 *   // TypeScript knows post.post_type === 'audio'
 *   const audioData = getAudioDataFromPost(post);
 * }
 * ```
 */
export function isAudioPost(post: Post): post is Post & { post_type: 'audio' } {
  return post.post_type === 'audio';
}

/**
 * Type guard to check if a post has track data
 * 
 * @param post - The post to check
 * @returns true if post has track data
 * 
 * @example
 * ```typescript
 * if (hasTrackData(post)) {
 *   // TypeScript knows post.track is defined
 *   console.log(post.track.title);
 * }
 * ```
 */
export function hasTrackData(post: Post): post is Post & { track: Track } {
  return post.track !== undefined && post.track !== null;
}

/**
 * Export all compatibility functions
 * 
 * @deprecated This entire module is deprecated and will be removed in v2.0
 * Migrate to using post.track directly instead of these compatibility functions
 */
const compatibilityFunctions = {
  getAudioDataFromPost,
  hasAudioData,
  getTrackIdFromPost,
  getAudioUrlFromPost,
  getAudioDurationFromPost,
  getAudioTitleFromPost,
  checkPostMigrationStatus,
  checkBatchMigrationStatus,
  isAudioPost,
  hasTrackData,
};

export default compatibilityFunctions;
