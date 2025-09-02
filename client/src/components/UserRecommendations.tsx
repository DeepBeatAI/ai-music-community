'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRecommendedUsers,
  followUser,
  unfollowUser,
  checkIfFollowing,
  RecommendedUser
} from '@/utils/recommendations';

interface UserRecommendationsProps {
  title?: string;
  limit?: number;
  showReason?: boolean;
  className?: string;
}

export default function UserRecommendations({
  title = "Suggested for you",
  limit = 6,
  showReason = true,
  className = ''
}: UserRecommendationsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user, limit]);

  const loadRecommendations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const recs = await getRecommendedUsers(user.id, limit);
      setRecommendations(recs);

      // Check follow status for each recommendation
      const followingStatus: Record<string, boolean> = {};
      await Promise.all(
        recs.map(async (rec) => {
          const isFollowing = await checkIfFollowing(user.id, rec.user_id);
          followingStatus[rec.user_id] = isFollowing;
        })
      );
      setFollowingState(followingStatus);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user || actionLoading[targetUserId]) return;

    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const isCurrentlyFollowing = followingState[targetUserId];
      const success = isCurrentlyFollowing
        ? await unfollowUser(user.id, targetUserId)
        : await followUser(user.id, targetUserId);

      if (success) {
        setFollowingState(prev => ({
          ...prev,
          [targetUserId]: !isCurrentlyFollowing
        }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUserClick = (username: string) => {
    // TODO: Navigate to user profile when implemented
    // For now, just close any modals or navigate to discover
    router.push('/discover');
  };

  if (!user || loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
            <div
              onClick={() => handleUserClick(rec.username)}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="text-white font-semibold text-sm">
                {rec.username[0].toUpperCase()}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4
                onClick={() => handleUserClick(rec.username)}
                className="font-medium text-white cursor-pointer hover:text-blue-300 transition-colors truncate"
              >
                {rec.username}
              </h4>
              
              {showReason && rec.reason && (
                <p className="text-xs text-gray-400 truncate">{rec.reason}</p>
              )}
              
              <div className="flex space-x-3 text-xs text-gray-500 mt-1">
                <span>{rec.posts_count} posts</span>
                <span>{rec.followers_count} followers</span>
                {rec.mutual_follows > 0 && (
                  <span className="text-blue-400">{rec.mutual_follows} mutual</span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => handleFollow(rec.user_id)}
              disabled={actionLoading[rec.user_id]}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                followingState[rec.user_id]
                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {actionLoading[rec.user_id] ? '...' : followingState[rec.user_id] ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
      
      {recommendations.length >= limit && (
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/discover')}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            View More Suggestions
          </button>
        </div>
      )}
    </div>
  );
}
