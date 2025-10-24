/**
 * Queue management utilities for playlist playback
 * Handles queue building, shuffling, and track navigation
 */

import type { Track } from '@/types/track';
import type { RepeatMode } from '@/contexts/PlaybackContext';

/**
 * Shuffle an array using the Fisher-Yates algorithm
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Build a queue from tracks based on shuffle mode
 * @param tracks - The tracks to build the queue from
 * @param shuffle - Whether to shuffle the queue
 * @returns The ordered queue
 */
export function buildQueue(tracks: Track[], shuffle: boolean): Track[] {
  if (shuffle) {
    return shuffleArray(tracks);
  }
  
  return [...tracks];
}

/**
 * Rebuild queue when shuffle is toggled
 * Keeps the current track at the front of the queue
 * @param tracks - The original tracks
 * @param currentTrack - The currently playing track
 * @param shuffle - Whether shuffle is enabled
 * @returns The rebuilt queue
 */
export function rebuildQueueWithCurrentTrack(
  tracks: Track[],
  currentTrack: Track,
  shuffle: boolean
): Track[] {
  if (shuffle) {
    // Remove current track from the list
    const remaining = tracks.filter(t => t.id !== currentTrack.id);
    
    // Shuffle the remaining tracks
    const shuffled = shuffleArray(remaining);
    
    // Put current track at the front
    return [currentTrack, ...shuffled];
  }
  
  // Return original order
  return [...tracks];
}

/**
 * Get the next track in the queue based on repeat mode
 * @param queue - The current queue
 * @param currentIndex - The current track index
 * @param repeatMode - The repeat mode
 * @returns The next track or null if no next track
 */
export function getNextTrack(
  queue: Track[],
  currentIndex: number,
  repeatMode: RepeatMode
): Track | null {
  // If repeat track is enabled, return the current track
  if (repeatMode === 'track') {
    return queue[currentIndex] || null;
  }
  
  // Check if there's a next track in the queue
  if (currentIndex < queue.length - 1) {
    return queue[currentIndex + 1];
  }
  
  // If repeat playlist is enabled, return the first track
  if (repeatMode === 'playlist' && queue.length > 0) {
    return queue[0];
  }
  
  // No next track
  return null;
}

/**
 * Get the previous track in the queue
 * @param queue - The current queue
 * @param currentIndex - The current track index
 * @returns The previous track or null if no previous track
 */
export function getPreviousTrack(
  queue: Track[],
  currentIndex: number
): Track | null {
  // Check if there's a previous track in the queue
  if (currentIndex > 0) {
    return queue[currentIndex - 1];
  }
  
  // No previous track
  return null;
}

/**
 * Get the next track index based on repeat mode
 * @param currentIndex - The current track index
 * @param queueLength - The length of the queue
 * @param repeatMode - The repeat mode
 * @returns The next track index or null if playback should stop
 */
export function getNextTrackIndex(
  currentIndex: number,
  queueLength: number,
  repeatMode: RepeatMode
): number | null {
  // If repeat track is enabled, stay on the same track
  if (repeatMode === 'track') {
    return currentIndex;
  }
  
  // Check if there's a next track in the queue
  if (currentIndex < queueLength - 1) {
    return currentIndex + 1;
  }
  
  // If repeat playlist is enabled, go back to the first track
  if (repeatMode === 'playlist' && queueLength > 0) {
    return 0;
  }
  
  // No next track, playback should stop
  return null;
}

/**
 * Get the previous track index
 * @param currentIndex - The current track index
 * @returns The previous track index or null if at the beginning
 */
export function getPreviousTrackIndex(
  currentIndex: number
): number | null {
  // Check if there's a previous track in the queue
  if (currentIndex > 0) {
    return currentIndex - 1;
  }
  
  // At the beginning, return null
  return null;
}

/**
 * Check if playback should continue after the current track ends
 * @param currentIndex - The current track index
 * @param queueLength - The length of the queue
 * @param repeatMode - The repeat mode
 * @returns True if playback should continue, false otherwise
 */
export function shouldContinuePlayback(
  currentIndex: number,
  queueLength: number,
  repeatMode: RepeatMode
): boolean {
  // If repeat track is enabled, always continue
  if (repeatMode === 'track') {
    return true;
  }
  
  // If there's a next track, continue
  if (currentIndex < queueLength - 1) {
    return true;
  }
  
  // If repeat playlist is enabled, continue
  if (repeatMode === 'playlist' && queueLength > 0) {
    return true;
  }
  
  // Otherwise, stop playback
  return false;
}
