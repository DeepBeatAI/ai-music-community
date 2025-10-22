'use client'
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserStats, getActivityFeed } from '@/utils/activity';
import { formatTimeAgo } from '@/utils/format';
import { UserProfile, UserStats, ActivityFeedItem } from '@/types';
import FollowButton from './FollowButton';

interface UserProfileProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
}

export default function UserProfileComponent({ profile, isOwnProfile = false }: UserProfileProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Fetch user stats
        const { data: statsData } = await getUserStats(profile.user_id);
        if (statsData) {
          setStats(statsData);
        }

        // Fetch recent public activities
        const { data: activitiesData } = await getActivityFeed(profile.user_id, 5);
        if (activitiesData) {
          setRecentActivities(activitiesData);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [profile.user_id]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-20 h-20 bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-gray-800">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
              <p className="text-blue-100">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
              {stats?.last_active && (
                <p className="text-blue-200 text-sm">
                  Last active {formatTimeAgo(stats.last_active)}
                </p>
              )}
            </div>
          </div>
          
          {!isOwnProfile && user && (
            <FollowButton
              userId={profile.user_id}
              username={profile.username}
              size="md"
              variant="primary"
            />
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">
              {stats?.posts_count || 0}
            </div>
            <div className="text-sm text-gray-400">Total Posts</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-400">
              {stats?.audio_posts_count || 0}
            </div>
            <div className="text-sm text-gray-400">Audio Posts</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats?.followers_count || 0}
            </div>
            <div className="text-sm text-gray-400">Followers</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {stats?.following_count || 0}
            </div>
            <div className="text-sm text-gray-400">Following</div>
          </div>
        </div>
        
        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-pink-400">
              {stats?.likes_received || 0}
            </div>
            <div className="text-sm text-gray-400">Likes Received</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-orange-400">
              {stats?.total_plays || 0}
            </div>
            <div className="text-sm text-gray-400">Total Plays</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-indigo-400">
              {stats?.likes_given || 0}
            </div>
            <div className="text-sm text-gray-400">Likes Given</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Recent Activity</h2>
        {recentActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm">
                    {item.activity.activity_type === 'post_created' ? '📝' :
                     item.activity.activity_type === 'post_liked' ? '❤️' :
                     item.activity.activity_type === 'user_followed' ? '👥' : '📢'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-200 text-sm">
                    {item.activity.activity_type === 'post_created' && 'Created a new post'}
                    {item.activity.activity_type === 'post_liked' && 'Liked a post'}
                    {item.activity.activity_type === 'user_followed' && 'Followed a user'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {formatTimeAgo(item.activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}