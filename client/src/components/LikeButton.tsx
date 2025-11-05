'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { togglePostLike, getPostLikeStatus } from '@/utils/community';

interface LikeButtonProps {
  postId: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onLikeChange?: (liked: boolean, likeCount: number) => void;
}

export default function LikeButton({ 
  postId, 
  initialLikeCount = 0, 
  initialLiked = false,
  size = 'md',
  className = '',
  onLikeChange
}: LikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial like status
  useEffect(() => {
    if (!user || !postId) return;

    const fetchLikeStatus = async () => {
      const { data, error } = await getPostLikeStatus(postId, user.id);
      if (data && !error) {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    };

    fetchLikeStatus();
  }, [postId, user]);

  const handleToggleLike = async () => {
    if (!user) {
      setError('Please sign in to like posts');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Optimistic UI update
    const newLiked = !liked;
    const newLikeCount = newLiked ? likeCount + 1 : likeCount - 1;
    
    setLiked(newLiked);
    setLikeCount(newLikeCount);

    try {
      const { data, error } = await togglePostLike(postId, user.id, liked);
      
      if (error || !data) {
        // Revert optimistic update
        setLiked(!newLiked);
        setLikeCount(likeCount);
        setError(error || 'Failed to update like');
      } else {
        // Confirm with server response
        setLiked(data.liked);
        setLikeCount(data.likeCount);
        // Notify parent component of the change
        if (onLikeChange) {
          onLikeChange(data.liked, data.likeCount);
        }
      }
    } catch (err) {
      // Revert optimistic update
      setLiked(!newLiked);
      setLikeCount(likeCount);
      setError('Failed to update like');
      console.error('Like toggle error:', err);
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
        title={user ? (liked ? 'Unlike this post' : 'Like this post') : 'Sign in to like posts'}
      >
        <span className={`${iconSizes[size]} transition-transform ${liked ? 'scale-110' : ''}`}>
          {liked ? '❤️' : '🤍'}
        </span>
        <span>{likeCount}</span>
        {isLoading && (
          <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
        )}
      </button>
      
      {error && (
        <div className="absolute z-10 mt-1 text-xs text-red-400 bg-red-900/20 border border-red-700 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  );
}