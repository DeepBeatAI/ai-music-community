'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { togglePlaylistLike, getPlaylistLikeStatus } from '@/lib/playlists';
import { emitLikeEvent, onLikeEvent } from '@/utils/likeEventEmitter';

interface PlaylistLikeButtonProps {
  playlistId: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onLikeChange?: (liked: boolean, likeCount: number) => void;
}

export default function PlaylistLikeButton({ 
  playlistId, 
  initialLikeCount = 0, 
  initialLiked = false,
  size = 'md',
  className = '',
  onLikeChange
}: PlaylistLikeButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial like status
  useEffect(() => {
    if (!playlistId) return;

    const fetchLikeStatus = async () => {
      const { data, error } = await getPlaylistLikeStatus(playlistId, user?.id);
      if (data && !error) {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    };

    fetchLikeStatus();
  }, [playlistId, user]);

  // Listen for like events from other instances
  useEffect(() => {
    if (!playlistId) return;

    const cleanup = onLikeEvent((detail) => {
      // Only update if this is for the same playlist
      if (detail.itemType === 'playlist' && detail.itemId === playlistId) {
        setLiked(detail.liked);
        setLikeCount(detail.likeCount);
      }
    });

    return cleanup;
  }, [playlistId]);

  const handleToggleLike = async () => {
    if (!user) {
      showToast('Please sign in to like playlists', 'info');
      return;
    }

    setIsLoading(true);

    // Optimistic UI update
    const newLiked = !liked;
    const newLikeCount = newLiked ? likeCount + 1 : likeCount - 1;
    
    setLiked(newLiked);
    setLikeCount(newLikeCount);

    try {
      const { data, error } = await togglePlaylistLike(playlistId, user.id, liked);
      
      if (error || !data) {
        // Revert optimistic update
        setLiked(!newLiked);
        setLikeCount(likeCount);
        showToast(error || 'Failed to update like', 'error');
      } else {
        // Confirm with server response
        setLiked(data.liked);
        setLikeCount(data.likeCount);
        
        // Emit event to sync other instances
        emitLikeEvent({
          itemId: playlistId,
          itemType: 'playlist',
          liked: data.liked,
          likeCount: data.likeCount,
        });
        
        // Notify parent component of the change
        if (onLikeChange) {
          onLikeChange(data.liked, data.likeCount);
        }
      }
    } catch (err) {
      // Revert optimistic update
      setLiked(!newLiked);
      setLikeCount(likeCount);
      showToast('Failed to update like', 'error');
      console.error('Playlist like toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <button
        onClick={handleToggleLike}
        disabled={isLoading || !user}
        className={`
          flex items-center space-x-2 rounded-md font-medium transition-all duration-200 
          ${sizeClasses[size]}
          ${liked 
            ? 'text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30' 
            : 'text-gray-400 hover:text-red-400 hover:bg-red-900/10'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${!user ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={user ? (liked ? 'Unlike this playlist' : 'Like this playlist') : 'Sign in to like playlists'}
      >
        <span className={`${iconSizes[size]} transition-transform ${liked ? 'scale-110' : ''}`}>
          {liked ? '❤️' : '🤍'}
        </span>
        <span>{likeCount}</span>
        {isLoading && (
          <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
        )}
      </button>
    </div>
  );
}
