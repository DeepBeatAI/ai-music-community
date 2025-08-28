'use client'
import { useState, useCallback, useRef, useEffect } from 'react';
import { Post, UserProfile } from '@/types';
import { supabase } from '@/lib/supabase';

interface SearchBarProps {
  onSearch: (results: { posts: Post[]; users: UserProfile[] }, query: string) => void;
  currentQuery?: string;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ 
  onSearch, 
  currentQuery = '',
  placeholder = "Search posts, creators, or content...",
  className = '' 
}: SearchBarProps) {
  const [query, setQuery] = useState(currentQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ posts: Post[]; users: UserProfile[] }>({ posts: [], users: [] });
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sync with external query changes
  useEffect(() => {
    if (currentQuery !== query) {
      setQuery(currentQuery);
    }
  }, [currentQuery]);

  // Enhanced search logic with better audio post handling
  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 3) return;
    
    setIsLoading(true);
    try {
      // Search posts with improved logic for audio files
      const { data: directPosts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles!posts_user_id_fkey (username)
        `)
        .or(`content.ilike.%${searchQuery}%,audio_filename.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Search users
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (usersError) throw usersError;

      // Get ALL posts from found users for accurate counting
      let userSpecificPosts: Post[] = [];
      if (users && users.length > 0) {
        const userIds = users.map((u: UserProfile) => u.user_id);
        const { data: allUserPosts, error: userPostsError } = await supabase
          .from('posts')
          .select(`
            *,
            user_profiles!posts_user_id_fkey (username)
          `)
          .in('user_id', userIds)
          .order('created_at', { ascending: false });
        
        if (!userPostsError && allUserPosts) {
          userSpecificPosts = allUserPosts;
        }
      }

      // Combine posts: direct matches + all posts from matching users
      const combinedPosts = [...(directPosts || []), ...userSpecificPosts];
      
      // Remove duplicates based on post ID with proper TypeScript typing
      const uniquePosts = combinedPosts.reduce((acc: Post[], post: Post) => {
        if (!acc.find((p: Post) => p.id === post.id)) {
          acc.push(post);
        }
        return acc;
      }, [] as Post[]);

      // Sort by creation date with proper TypeScript typing
      uniquePosts.sort((a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const results = { 
        posts: uniquePosts, 
        users: users || [] 
      };
      
      console.log('Search results:', {
        query: searchQuery,
        totalPosts: results.posts.length,
        audioPosts: results.posts.filter((p: Post) => p.post_type === 'audio').length,
        textPosts: results.posts.filter((p: Post) => p.post_type === 'text').length,
        users: results.users.length
      });
      
      setSuggestions(results);
      setShowSuggestions(true);
      onSearch(results, searchQuery);

    } catch (error) {
      console.error('Search error:', error);
      setSuggestions({ posts: [], users: [] });
      onSearch({ posts: [], users: [] }, searchQuery);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input with debouncing
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 3) {
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else if (value.length === 0) {
      setSuggestions({ posts: [], users: [] });
      setShowSuggestions(false);
      onSearch({ posts: [], users: [] }, '');
    } else {
      setSuggestions({ posts: [], users: [] });
      setShowSuggestions(false);
    }
  }, [onSearch]);

  // Handle search submission
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.length >= 3) {
      performSearch(query);
      setShowSuggestions(false);
    }
  }, [query]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions({ posts: [], users: [] });
    setShowSuggestions(false);
    onSearch({ posts: [], users: [] }, '');
  }, [onSearch]);

  // Handle suggestion clicks with improved logic
  const handleSuggestionClick = useCallback((type: 'user' | 'post', item: UserProfile | Post) => {
    if (type === 'user') {
      const user = item as UserProfile;
      setQuery(user.username);
      performSearch(user.username);
    } else {
      const post = item as Post;
      // For audio posts, search by filename if available, otherwise by content
      const searchTerm = post.post_type === 'audio' && post.audio_filename 
        ? post.audio_filename 
        : (post.content || '').substring(0, 50);
      setQuery(searchTerm);
      performSearch(searchTerm);
    }
    setShowSuggestions(false);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-12 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-y-0 right-8 pr-3 flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          
          {/* Clear button */}
          {query.length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Enhanced Search Suggestions */}
      {showSuggestions && (suggestions.posts.length > 0 || suggestions.users.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Users Section with Post Counts */}
          {suggestions.users.length > 0 && (
            <div className="p-3 border-b border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Creators</h4>
              {suggestions.users.map((user: UserProfile) => {
                const userPosts = suggestions.posts.filter((p: Post) => p.user_id === user.user_id);
                const audioPosts = userPosts.filter((p: Post) => p.post_type === 'audio').length;
                const textPosts = userPosts.filter((p: Post) => p.post_type === 'text').length;
                
                return (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-2 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                    onClick={() => handleSuggestionClick('user', user)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-200 text-sm">{user.username}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {userPosts.length} posts ({audioPosts} audio, {textPosts} text)
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Posts Section with Better Audio Indicators */}
          {suggestions.posts.length > 0 && (
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Posts ({suggestions.posts.filter((p: Post) => p.post_type === 'audio').length} audio, {suggestions.posts.filter((p: Post) => p.post_type === 'text').length} text)
              </h4>
              {suggestions.posts.slice(0, 5).map((post: Post) => (
                <div 
                  key={post.id} 
                  className="p-2 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                  onClick={() => handleSuggestionClick('post', post)}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-blue-400 text-xs">
                      {post.post_type === 'audio' ? '🎵' : '📝'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {post.user_profiles?.username}
                    </span>
                    {post.post_type === 'audio' && post.audio_filename && (
                      <span className="text-green-400 text-xs bg-green-900/20 px-1 rounded">
                        {post.audio_filename.substring(0, 15)}...
                      </span>
                    )}
                  </div>
                  <p className="text-gray-200 text-sm line-clamp-2">
                    {post.content || post.audio_filename || 'Audio post'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}