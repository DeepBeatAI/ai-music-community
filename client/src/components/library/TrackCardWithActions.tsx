'use client';

import { useState } from 'react';
import { TrackCard } from './TrackCard';
import { AddToAlbumModal } from './AddToAlbumModal';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { ShareModal } from './ShareModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { deleteTrack } from '@/lib/tracks';
import { cache, CACHE_KEYS } from '@/utils/cache';
import type { TrackWithMembership } from '@/types/library';

interface TrackCardWithActionsProps {
  track: TrackWithMembership;
  userId: string;
  onTrackUpdate: (trackId: string, updates: Partial<TrackWithMembership>) => void;
  onTrackDelete: (trackId: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * TrackCardWithActions Component
 * 
 * Wrapper component that combines TrackCard with all action modals and handlers.
 * Manages modal state and implements all track actions with optimistic updates.
 * 
 * Features:
 * - Integrates all action modals (album, playlist, share, delete)
 * - Implements action handlers with optimistic UI updates
 * - Handles errors with rollback
 * - Shows toast notifications for user feedback
 * 
 * Requirements: 3.9, 3.10, 3.11, 9.2, 9.5, 9.6
 */
export function TrackCardWithActions({
  track,
  userId,
  onTrackUpdate,
  onTrackDelete,
  onShowToast,
}: TrackCardWithActionsProps) {
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Handle add to album
  const handleAddToAlbum = () => {
    setShowAlbumModal(true);
  };

  // Handle album assignment success
  const handleAlbumSuccess = (albumId: string | null, albumName: string | null) => {
    // Optimistic update
    onTrackUpdate(track.id, {
      albumId,
      albumName,
    });
    
    // Invalidate cache on mutation
    cache.invalidate(CACHE_KEYS.TRACKS(userId));
    cache.invalidate(CACHE_KEYS.ALBUMS(userId));
    cache.invalidate(CACHE_KEYS.STATS(userId));
    
    if (albumId) {
      onShowToast(`Added to album "${albumName}"`, 'success');
    } else {
      onShowToast('Removed from album', 'success');
    }
  };

  // Handle add to playlist
  const handleAddToPlaylist = () => {
    setShowPlaylistModal(true);
  };

  // Handle playlist assignment success
  const handlePlaylistSuccess = (playlistIds: string[], playlistNames: string[]) => {
    // Optimistic update
    onTrackUpdate(track.id, {
      playlistIds,
      playlistNames,
    });
    
    // Invalidate cache on mutation
    cache.invalidate(CACHE_KEYS.TRACKS(userId));
    cache.invalidate(CACHE_KEYS.PLAYLISTS(userId));
    cache.invalidate(CACHE_KEYS.STATS(userId));
    
    if (playlistIds.length > 0) {
      onShowToast(`Updated playlist membership`, 'success');
    } else {
      onShowToast('Removed from all playlists', 'success');
    }
  };

  // Handle copy URL
  const handleCopyUrl = async () => {
    try {
      const trackUrl = `${window.location.origin}/tracks/${track.id}`;
      await navigator.clipboard.writeText(trackUrl);
      onShowToast('Track URL copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      onShowToast('Failed to copy URL', 'error');
    }
  };

  // Handle share
  const handleShare = () => {
    setShowShareModal(true);
  };

  // Handle share copy success
  const handleShareCopySuccess = () => {
    onShowToast('Track URL copied to clipboard', 'success');
  };

  // Handle delete
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      const success = await deleteTrack(track.id);
      
      if (!success) {
        onShowToast('Failed to delete track', 'error');
        throw new Error('Delete operation failed');
      }

      // Optimistic delete
      onTrackDelete(track.id);
      
      // Invalidate cache on mutation (already handled in onTrackDelete, but adding here for completeness)
      cache.invalidate(CACHE_KEYS.TRACKS(userId));
      cache.invalidate(CACHE_KEYS.ALBUMS(userId));
      cache.invalidate(CACHE_KEYS.PLAYLISTS(userId));
      cache.invalidate(CACHE_KEYS.STATS(userId));
      
      onShowToast('Track deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete track:', error);
      onShowToast('Failed to delete track', 'error');
      throw error; // Re-throw to let modal handle loading state
    }
  };

  // Handle modal errors
  const handleModalError = (message: string) => {
    onShowToast(message, 'error');
  };

  return (
    <>
      <TrackCard
        track={track}
        onAddToAlbum={handleAddToAlbum}
        onAddToPlaylist={handleAddToPlaylist}
        onCopyUrl={handleCopyUrl}
        onShare={handleShare}
        onDelete={handleDelete}
      />

      {/* Modals */}
      <AddToAlbumModal
        isOpen={showAlbumModal}
        trackId={track.id}
        currentAlbumId={track.albumId}
        userId={userId}
        onClose={() => setShowAlbumModal(false)}
        onSuccess={handleAlbumSuccess}
        onError={handleModalError}
      />

      <AddToPlaylistModal
        isOpen={showPlaylistModal}
        trackId={track.id}
        currentPlaylistIds={track.playlistIds}
        userId={userId}
        onClose={() => setShowPlaylistModal(false)}
        onSuccess={handlePlaylistSuccess}
        onError={handleModalError}
      />

      <ShareModal
        isOpen={showShareModal}
        trackId={track.id}
        trackTitle={track.title}
        onClose={() => setShowShareModal(false)}
        onCopySuccess={handleShareCopySuccess}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        trackTitle={track.title}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
