'use client'
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/contexts/FollowContext';

interface FollowButtonProps {
  userId: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
  showFollowerCount?: boolean;
}

export default function FollowButton({ 
  userId, 
  username = '',
  size = 'md',
  variant = 'primary',
  className = '',
  showFollowerCount = false
}: FollowButtonProps) {
  const { user } = useAuth();
  const { getFollowStatus, toggleFollow, refreshFollowStatus, loading: followLoading } = useFollow();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Memoize follow status to prevent unnecessary re-renders
  const followStatus = useMemo(() => getFollowStatus(userId), [getFollowStatus, userId]);
  const { following, followerCount } = followStatus;

  // Fetch initial follow status when component mounts - ONLY ONCE
  useEffect(() => {
    if (user && userId && userId !== user.id && !hasInitialized) {
      setHasInitialized(true);
      refreshFollowStatus(userId);
    }
  }, [userId, user, refreshFollowStatus, hasInitialized]);

  // Don't show follow button for own profile
  if (user && user.id === userId) {
    return null;
  }

  const handleToggleFollow = async () => {
    if (!user) {
      setLocalError('Please sign in to follow users');
      return;
    }

    setIsProcessing(true);
    setLocalError(null);

    const result = await toggleFollow(userId, username);
    
    if (!result.success) {
      setLocalError(result.error || 'Failed to update follow status');
    }
    
    setIsProcessing(false);
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  };

  const variantClasses = {
    primary: following 
      ? 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600'
      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: following
      ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
      : 'border-blue-600 text-blue-400 hover:bg-blue-900/20'
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleToggleFollow}
          disabled={isProcessing || followLoading || !user}
          className={`
            flex items-center space-x-2 border rounded-md font-medium transition-all duration-200 
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${isProcessing || followLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${!user ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={user ? (following ? `Unfollow ${username}` : `Follow ${username}`) : 'Sign in to follow users'}
        >
          <span>{following ? 'Following' : 'Follow'}</span>
          {(isProcessing || followLoading) && (
            <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
          )}
        </button>
        
        {showFollowerCount && (
          <span className="text-xs text-gray-400">
            {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
          </span>
        )}
      </div>
      
      {localError && (
        <div className="absolute z-10 mt-1 text-xs text-red-400 bg-red-900/20 border border-red-700 rounded px-2 py-1 whitespace-nowrap">
          {localError}
        </div>
      )}
    </div>
  );
}