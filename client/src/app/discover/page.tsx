'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/SearchBar';
import PostItem from '@/components/PostItem';
import { useAuth } from '@/contexts/AuthContext';
import { Post, UserProfile } from '@/types';

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<{ posts: Post[]; users: UserProfile[] }>({ posts: [], users: [] });
  const [currentQuery, setCurrentQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  const handleSearch = (results: { posts: Post[]; users: UserProfile[] }, query: string) => {
    setSearchResults(results);
    setCurrentQuery(query);
    setHasSearched(query.length > 0);
  };

  const clearSearch = () => {
    setSearchResults({ posts: [], users: [] });
    setCurrentQuery('');
    setHasSearched(false);
  };

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
          <p className="text-gray-400">Find amazing creators and AI-generated music</p>
        </div>

        {/* Search Interface - Using Your Existing Component */}
        <SearchBar 
          onSearch={handleSearch}
          currentQuery={currentQuery}
          placeholder="Search creators, music, or content..."
          className="w-full max-w-2xl mx-auto"
        />

        {/* Search Results Section */}
        {hasSearched && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Search Results ({searchResults.posts.length + searchResults.users.length})
              </h2>
              <button
                onClick={clearSearch}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Clear Search
              </button>
            </div>

            {/* User Results */}
            {searchResults.users.length > 0 && (
            <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Creators ({searchResults.users.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.users.map((userProfile) => {
            // Calculate post counts from search results (same logic as SearchBar suggestions)
            const userPosts = searchResults.posts.filter((p: Post) => p.user_id === userProfile.user_id);
            const totalPosts = userPosts.length;
            const audioPosts = userPosts.filter((p: Post) => p.post_type === 'audio').length;
            const textPosts = userPosts.filter((p: Post) => p.post_type === 'text').length;
            
            return (
            <div
            key={userProfile.id}
            className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer border border-gray-700 hover:border-gray-600"
            onClick={() => router.push(`/profile/${userProfile.username}`)}
            >
            <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">
              {userProfile.username[0].toUpperCase()}
              </span>
              </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{userProfile.username}</h4>
                      <div className="flex space-x-4 text-sm text-gray-400">
                          <span>{totalPosts} posts</span>
                            {totalPosts > 0 && (
                                <span>({audioPosts} audio, {textPosts} text)</span>
                                 )}
                               </div>
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}

            {/* Post Results */}
            {searchResults.posts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <span className="mr-2">📝</span>
                  Posts ({searchResults.posts.length})
                </h3>
                <div className="space-y-4">
                  {searchResults.posts.map((post) => (
                    <PostItem
                      key={post.id}
                      post={post}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results State */}
            {searchResults.posts.length === 0 && searchResults.users.length === 0 && (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-400 mb-2">No results found for "{currentQuery}"</p>
                <p className="text-sm text-gray-500">Try different search terms or check your spelling</p>
              </div>
            )}
          </div>
        )}

        {/* Default Discover Content */}
        {!hasSearched && (
          <div className="space-y-8">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎵</div>
              <h2 className="text-xl font-semibold text-white mb-2">Start Exploring!</h2>
              <p className="text-gray-400 mb-6">Use the search bar above to discover creators and content</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Create Your First Post
                </button>
              </div>
            </div>

            {/* Search Tips */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">💡 Search Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <h4 className="font-medium text-white mb-2">🎵 Find Audio</h4>
                  <p>Search by audio filename or content description to find specific tracks</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">👤 Find Creators</h4>
                  <p>Search by username to discover new creators and their content</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">📝 Find Posts</h4>
                  <p>Search in post content to find discussions and descriptions</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">🔍 Smart Search</h4>
                  <p>Results appear as you type with intelligent suggestions</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}