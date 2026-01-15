/**
 * Like Event Emitter
 * 
 * Global event system for synchronizing like button state across multiple
 * instances of the same album or playlist on the page.
 * 
 * When a user likes/unlikes content, all like buttons for that content
 * update simultaneously using CustomEvent API.
 */

export type LikeEventType = 'album' | 'playlist';

export interface LikeEventDetail {
  itemId: string;
  itemType: LikeEventType;
  liked: boolean;
  likeCount: number;
}

/**
 * Emit a like event when like status changes
 */
export function emitLikeEvent(detail: LikeEventDetail): void {
  const event = new CustomEvent('like-status-changed', { detail });
  window.dispatchEvent(event);
}

/**
 * Listen for like events
 */
export function onLikeEvent(
  callback: (detail: LikeEventDetail) => void
): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<LikeEventDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener('like-status-changed', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('like-status-changed', handler);
  };
}
