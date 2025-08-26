'use client'
import { useEffect, useState, useMemo } from 'react';
import { useFollow } from '@/contexts/FollowContext';
import { useAuth } from '@/contexts/AuthContext';

interface UserStatsCardProps {
  userId: string;
  username: string;
  className?: string;
  variant?: 'compact' | 'full';
}

export default function UserStatsCard({ 
  userId, 
  username, 
  className = '',
  variant = 'compact'
}: UserStatsCardProps) {
  const { user } = useAuth();
  const { getFollowStatus, refreshFollowStatus } = useFollow();
  const [stats, setStats] = useState({ 
    followerCount: 0, 
    followingCount: 0, 
    postCount: 0 
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  // Memoize follow status to prevent unnecessary re-renders
  const followStatus = useMemo(() => getFollowStatus(userId), [getFollowStatus, userId]);

  useEffect(() => {
    const loadStats = async () => {
      // Only refresh if this is a different user and we haven't initialized yet
      if (user && userId !== user.id && !hasInitialized) {
        setHasInitialized(true);
        await refreshFollowStatus(userId);
      }
      
      // Update stats from follow context
      setStats(prev => ({
        ...prev,
        followerCount: followStatus.followerCount,
        followingCount: followStatus.followingCount
      }));
    };

    loadStats();
  }, [userId, user, refreshFollowStatus, followStatus.followerCount, followStatus.followingCount, hasInitialized]);

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-4 text-sm text-gray-400 ${className}`}>
        <span>
          <span className="font-medium text-gray-200">{stats.followerCount}</span> followers
        </span>
        <span>
          <span className="font-medium text-gray-200">{stats.followingCount}</span> following
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-200 mb-3">{username}'s Stats</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xl font-bold text-blue-400">{stats.followerCount}</div>
          <div className="text-sm text-gray-400">Followers</div>
        </div>
        <div>
          <div className="text-xl font-bold text-green-400">{stats.followingCount}</div>
          <div className="text-sm text-gray-400">Following</div>
        </div>
        <div>
          <div className="text-xl font-bold text-purple-400">{stats.postCount}</div>
          <div className="text-sm text-gray-400">Posts</div>
        </div>
      </div>
    </div>
  );
}