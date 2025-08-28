'use client'
import { useEffect, useState, useMemo } from 'react';
import { useFollow } from '@/contexts/FollowContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserStats, calculateUserStatsFromDatabase } from '@/utils/userStats';

interface UserStats {
  posts_count: number;
  audio_posts_count: number;
  likes_given: number;
  likes_received: number;
  followers_count: number;
  following_count: number;
  total_plays: number;
}

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
  const [stats, setStats] = useState<UserStats>({ 
    posts_count: 0,
    audio_posts_count: 0,
    likes_given: 0,
    likes_received: 0,
    followers_count: 0, 
    following_count: 0,
    total_plays: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize follow status to prevent unnecessary re-renders
  const followStatus = useMemo(() => getFollowStatus(userId), [getFollowStatus, userId]);

  useEffect(() => {
    const loadUserStats = async () => {
      setLoading(true);
      setError(null);

      try {
        // Always calculate from database to ensure accuracy
        const { data: calculatedStats, error: calcError } = await calculateUserStatsFromDatabase(userId);
        
        if (calcError) {
          throw new Error(calcError);
        }

        if (calculatedStats) {
          setStats({
            posts_count: calculatedStats.posts_count,
            audio_posts_count: calculatedStats.audio_posts_count,
            likes_given: calculatedStats.likes_given,
            likes_received: calculatedStats.likes_received,
            followers_count: calculatedStats.followers_count,
            following_count: calculatedStats.following_count,
            total_plays: calculatedStats.total_plays
          });
        }

        // If this is not the current user, refresh follow status
        if (user && userId !== user.id) {
          await refreshFollowStatus(userId);
        }

      } catch (err) {
        console.error('Error loading user stats:', err);
        setError('Failed to load user statistics');
        
        // Fallback to follow context data if available
        setStats(prev => ({
          ...prev,
          followers_count: followStatus.followerCount || 0,
          following_count: followStatus.followingCount || 0
        }));
      } finally {
        setLoading(false);
      }
    };

    loadUserStats();
  }, [userId, user, refreshFollowStatus, followStatus.followerCount, followStatus.followingCount]);

  // Show loading state
  if (loading) {
    return (
      <div className={`${variant === 'full' ? 'bg-gray-700 rounded-lg p-4' : 'flex items-center space-x-4 text-sm text-gray-400'} ${className}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="h-4 bg-gray-600 rounded w-20"></div>
          <div className="h-4 bg-gray-600 rounded w-20"></div>
          <div className="h-4 bg-gray-600 rounded w-20"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`${variant === 'full' ? 'bg-gray-700 rounded-lg p-4' : ''} ${className}`}>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-4 text-sm text-gray-400 ${className}`}>
        <span>
          <span className="font-medium text-gray-200">{stats.followers_count}</span> followers
        </span>
        <span>
          <span className="font-medium text-gray-200">{stats.following_count}</span> following
        </span>
        <span>
          <span className="font-medium text-gray-200">{stats.posts_count}</span> posts
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-200 mb-3">{username}'s Stats</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-xl font-bold text-blue-400">{stats.followers_count}</div>
          <div className="text-sm text-gray-400">Followers</div>
        </div>
        <div>
          <div className="text-xl font-bold text-green-400">{stats.following_count}</div>
          <div className="text-sm text-gray-400">Following</div>
        </div>
        <div>
          <div className="text-xl font-bold text-purple-400">{stats.posts_count}</div>
          <div className="text-sm text-gray-400">Posts</div>
        </div>
        <div>
          <div className="text-xl font-bold text-yellow-400">{stats.likes_received}</div>
          <div className="text-sm text-gray-400">Likes</div>
        </div>
      </div>
      
      {/* Additional stats for full variant */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-lg font-medium text-cyan-400">{stats.audio_posts_count}</div>
            <div className="text-xs text-gray-400">Audio Posts</div>
          </div>
          <div>
            <div className="text-lg font-medium text-pink-400">{stats.likes_given}</div>
            <div className="text-xs text-gray-400">Likes Given</div>
          </div>
          <div>
            <div className="text-lg font-medium text-orange-400">{stats.total_plays}</div>
            <div className="text-xs text-gray-400">Total Plays</div>
          </div>
        </div>
      </div>
    </div>
  );
}
