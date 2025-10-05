'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import PostItem from '@/components/PostItem';
import { useAuth } from '@/contexts/AuthContext';
import { getTrendingContent, getFeaturedCreators } from '@/utils/search';
import UserRecommendations from '@/components/UserRecommendations';

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Allow discover page to work without authentication
    loadDefaultContent();
  }, []);

  const loadDefaultContent = async () => {
    setLoading(true);
    try {
      const [trending, creators] = await Promise.all([
        getTrendingContent(8),
        getFeaturedCreators(6),
      ]);
      setTrendingPosts(trending);
      setFeaturedCreators(creators);
    } catch (error) {
      console.error('Error loading default content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
          <p className="text-gray-400">Find amazing creators and AI-generated music</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Discovery Content */}
        <div className="space-y-8">
          {/* Personalized Recommendations for Authenticated Users */}
          {user && (
            <UserRecommendations 
              title="Recommended for You" 
              limit={6} 
              className="mb-8" 
              showProfileButton={true}
            />
          )}

          {/* Trending Section */}
          {trendingPosts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">🔥 Trending This Week</h2>
              <div className="space-y-4">
                {trendingPosts.map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    currentUserId={user?.id || ''}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Creators */}
          {featuredCreators.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">⭐ Featured Creators</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => router.push(`/profile/${creator.username}`)}
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold text-xl">
                          {creator.username[0].toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-medium text-white mb-2">{creator.username}</h3>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div className="flex justify-center space-x-4">
                          <span>{creator.user_stats?.posts_count || 0} posts</span>
                          <span>{creator.user_stats?.followers_count || 0} followers</span>
                        </div>
                        <div>
                          <span>{creator.user_stats?.likes_received || 0} likes received</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {trendingPosts.length === 0 && featuredCreators.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎵</div>
              <h2 className="text-xl font-semibold text-white mb-2">Start Exploring!</h2>
              <p className="text-gray-400 mb-6">Be the first to share content in this community</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
              >
                Create Your First Post
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
