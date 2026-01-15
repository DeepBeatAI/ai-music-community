'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { toggleAlbumLike, getAlbumLikeStatus } from '@/lib/albums';
import { emitLikeEvent, onLikeEvent } from '@/utils/likeEventEmitter';

interface AlbumLikeButtonProps {
  albumId: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onLikeChange?: (liked: boolean, likeCount: number) => void;
}

export default function AlbumLikeButton({ 
  albumId, 
  initialLikeCount = 0, 
  initialLiked = false,
  size = 'md',
  className = '',
  onLikeChange
}: AlbumLikeButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial like status
  useEffect(() => {
    if (!albumId) return;

    const fetchLikeStatus = async () => {
      const { data, error } = await getAlbumLikeStatus(albumId, user?.id);
      if (data && !error) {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    };

    fetchLikeStatus();
  }, [albumId, user]);

  // Listen for like events from other instances
  useEffect(() => {
    if (!albumId) return;

    const cleanup = onLikeEvent((detail) => {
      // Only update if this is for the same album
      if (detail.itemType === 'album' && detail.itemId === albumId) {
        setLiked(detail.liked);
        setLikeCount(detail.likeCount);
      }
    });

    return cleanup;
  }, [albumId]);

  const handleToggleLike = async () => {
    if (!user) {
      showToast('Please sign in to like albums', 'info');
      return;
    }

    setIsLoading(true);

    // Optimistic UI update
    const newLiked = !liked;
    const newLikeCount = newLiked ? likeCount + 1 : likeCount - 1;
    
    setLiked(newLiked);
    setLikeCount(newLikeCount);

    try {
      const { data, error } = await toggleAlbumLike(albumId, user.id, liked);
      
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
          itemId: albumId,
          itemType: 'album',
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
      console.error('Album like toggle error:', err);
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
        title={user ? (liked ? 'Unlike this album' : 'Like this album') : 'Sign in to like albums'}
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
