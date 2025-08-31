'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/SearchBar';
import PostItem from '@/components/PostItem';
import { useAuth } from '@/contexts/AuthContext';
import { searchContent, getTrendingContent, getFeaturedCreators, SearchFilters, SearchResults } from '@/utils/search';

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<SearchResults>({ posts: [], users: [], totalResults: 0 });
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});

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

  const handleSearch = async (results: SearchResults, query: string) => {
    try {
      // Ensure we have valid results
      const safeResults = {
        posts: Array.isArray(results.posts) ? results.posts : [],
        users: Array.isArray(results.users) ? results.users : [],
        totalResults: results.totalResults || 0
      };
      
      setSearchResults(safeResults);
      setHasSearched(query.length > 0 || currentFilters.postType !== 'all' || currentFilters.sortBy !== 'recent' || currentFilters.timeRange !== 'all');
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ posts: [], users: [], totalResults: 0 });
      setHasSearched(false);
    }
  };

  const handleFiltersChange = (filters: SearchFilters) => {
    setCurrentFilters(filters);
    // The search will be triggered automatically by the SearchBar component
  };

  const clearSearch = () => {
    setSearchResults({ posts: [], users: [], totalResults: 0 });
    setHasSearched(false);
    setCurrentFilters({});
    loadDefaultContent();
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
          <p className="text-gray-400">Find amazing creators and AI-generated music</p>
        </div>

        {/* Search Interface with dynamic filtering */}
        <SearchBar 
          onSearch={handleSearch} 
          onFiltersChange={handleFiltersChange}
          initialFilters={currentFilters} 
        />
        
        {/* Search Status Line */}
        {hasSearched && (
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              {currentFilters.query && (
                <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">
                  Search: "{currentFilters.query}"
                </span>
              )}
              {currentFilters.postType && currentFilters.postType !== 'all' && (
                <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">
                  Type: {currentFilters.postType}
                </span>
              )}
              {currentFilters.sortBy && currentFilters.sortBy !== 'recent' && (
                <span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs">
                  Sort: {currentFilters.sortBy}
                </span>
              )}
              {currentFilters.timeRange && currentFilters.timeRange !== 'all' && (
                <span className="bg-orange-900/30 text-orange-400 px-2 py-1 rounded text-xs">
                  Time: {currentFilters.timeRange}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={clearSearch}
                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Search Results Section */}
        {hasSearched && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Search Results ({searchResults.totalResults})
              </h2>
              <button
                onClick={clearSearch}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Clear Search
              </button>
            </div>

            {/* Creator Results */}
            {searchResults.users.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Creators</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.users.map((userProfile) => (
                    <div
                      key={userProfile.id}
                      className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => router.push(`/profile/${userProfile.username}`)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {userProfile.username[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{userProfile.username}</h4>
                          <div className="flex space-x-4 text-sm text-gray-400">
                            <span>{userProfile.posts_count || 0} posts</span>
                            <span>{userProfile.followers_count || 0} followers</span>
                          </div>
                          {userProfile.audio_posts_count !== undefined && userProfile.text_posts_count !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              {userProfile.audio_posts_count || 0} audio, {userProfile.text_posts_count || 0} text
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post Results */}
            {searchResults.posts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Posts</h3>
                <div className="space-y-4">
                  {searchResults.posts.map((post) => (
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

            {/* No Results State */}
            {searchResults.totalResults === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">No results found</p>
                <p className="text-sm text-gray-500">Try adjusting your search terms or filters</p>
              </div>
            )}
          </div>
        )}

        {/* Default Discovery Content */}
        {!hasSearched && (
          <div className="space-y-8">
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
                <p className="text-gray-400 mb-6">Use the search bar above to discover creators and content</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Create Your First Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}