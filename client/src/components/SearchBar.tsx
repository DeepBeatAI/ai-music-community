'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchFilters, searchContent, SearchResults } from '@/utils/search';

interface SearchBarProps {
  onSearch: (results: SearchResults, query: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
  className?: string;
  currentQuery?: string;
  showSuggestions?: boolean;
}

export default function SearchBar({ 
  onSearch, 
  onFiltersChange,
  initialFilters = {}, 
  className = '',
  currentQuery = '',
  showSuggestions = true 
}: SearchBarProps) {
  const [query, setQuery] = useState(currentQuery || initialFilters.query || '');
  const [postType, setPostType] = useState<SearchFilters['postType']>(initialFilters.postType || 'all');
  const [sortBy, setSortBy] = useState<SearchFilters['sortBy']>(initialFilters.sortBy || 'recent');
  const [timeRange, setTimeRange] = useState<SearchFilters['timeRange']>(initialFilters.timeRange || 'all');
  const [suggestions, setSuggestions] = useState<SearchResults>({ posts: [], users: [], totalResults: 0 });
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFiltersRef = useRef<string>('');
  const previousCurrentQueryRef = useRef(currentQuery);

  // FIXED: Sync with external query changes without creating loops
  useEffect(() => {
    // Only update if currentQuery actually changed from external source
    if (currentQuery !== previousCurrentQueryRef.current && currentQuery !== query) {
      setQuery(currentQuery);
      previousCurrentQueryRef.current = currentQuery;
    }
  }, [currentQuery]); // Remove query from dependencies

  // Memoized filter change callback
  const notifyFiltersChange = useCallback((filters: SearchFilters) => {
    const filtersString = JSON.stringify(filters);
    if (lastFiltersRef.current !== filtersString && onFiltersChange) {
      lastFiltersRef.current = filtersString;
      onFiltersChange(filters);
    }
  }, [onFiltersChange]);

  // Memoized search function - FIXED dependencies
  const performSearch = useCallback(async (searchFilters: SearchFilters) => {
    setShowSuggestionDropdown(false);
    
    if (!searchFilters.query?.trim() && searchFilters.postType === 'all' && searchFilters.sortBy === 'recent' && searchFilters.timeRange === 'all') {
      onSearch({ posts: [], users: [], totalResults: 0 }, '');
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchContent(searchFilters);
      
      const safeResults = results || { posts: [], users: [], totalResults: 0 };
      const safePosts = Array.isArray(safeResults.posts) ? safeResults.posts : [];
      const safeUsers = Array.isArray(safeResults.users) ? safeResults.users : [];
      
      onSearch({
        posts: safePosts,
        users: safeUsers,
        totalResults: safeResults.totalResults || (safePosts.length + safeUsers.length)
      }, searchFilters.query || '');
    } catch (error) {
      console.error('Error searching:', error);
      onSearch({ posts: [], users: [], totalResults: 0 }, searchFilters.query || '');
    } finally {
      setIsLoading(false);
    }
  }, [onSearch]);

  // Debounced search and suggestions effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const currentFilters = { query, postType, sortBy, timeRange };
      
      // Handle suggestions if enabled and query is long enough
      if (showSuggestions && query.length >= 2) {
        try {
          const results = await searchContent({ 
            query, 
            postType: 'all',
            sortBy: 'recent', 
            timeRange: 'all' 
          }, 0, 3);
          
          const safeSuggestions = {
            posts: Array.isArray(results.posts) ? results.posts.slice(0, 3) : [],
            users: Array.isArray(results.users) ? results.users.slice(0, 3) : [],
            totalResults: results.totalResults || 0
          };
          
          setSuggestions(safeSuggestions);
          setShowSuggestionDropdown(safeSuggestions.totalResults > 0);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions({ posts: [], users: [], totalResults: 0 });
          setShowSuggestionDropdown(false);
        }
      } else {
        setSuggestions({ posts: [], users: [], totalResults: 0 });
        setShowSuggestionDropdown(false);
      }

      // Trigger search if we have content or active filters
      if (query.trim() || postType !== 'all' || sortBy !== 'recent' || timeRange !== 'all') {
        console.log('🔍 SearchBar triggering search with filters:', currentFilters);
        await performSearch(currentFilters);
      } else {
        // Clear results if no query and no filters
        console.log('🧹 SearchBar clearing search - no query or filters active');
        onSearch({ posts: [], users: [], totalResults: 0 }, '');
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, postType, sortBy, timeRange, showSuggestions, performSearch, onSearch]);

  // FIXED: Notify parent of filter changes without causing loops
  useEffect(() => {
    const currentFilters = { query, postType, sortBy, timeRange };
    const filtersString = JSON.stringify(currentFilters);
    
    // Only notify if filters actually changed
    if (lastFiltersRef.current !== filtersString && onFiltersChange) {
      lastFiltersRef.current = filtersString;
      console.log('🔄 SearchBar notifying parent of filter changes:', currentFilters);
      onFiltersChange(currentFilters);
    }
  }, [query, postType, sortBy, timeRange, onFiltersChange]);

  const handleSearch = useCallback(async () => {
    const currentFilters = { query, postType, sortBy, timeRange };
    await performSearch(currentFilters);
  }, [query, postType, sortBy, timeRange, performSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestionDropdown(false);
    }
  }, [handleSearch]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestionDropdown(false);
    // The useEffect will trigger search automatically
  }, []);

  const handleInputFocus = useCallback(() => {
    if (suggestions.totalResults > 0 && query.length >= 2) {
      setShowSuggestionDropdown(true);
    }
  }, [suggestions.totalResults, query.length]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestionDropdown(false);
    }, 200);
  }, []);

  const handleClearAll = useCallback(() => {
    console.log('🧹 SearchBar handleClearAll called');
    setQuery('');
    setPostType('all');
    setSortBy('recent');
    setTimeRange('all');
    // The useEffect will trigger search automatically to clear results
    // This will also notify the parent through onFiltersChange
  }, []);

  return (
    <div className={`bg-gray-800 rounded-lg p-4 space-y-4 ${className}`}>
      {/* Search input section with Search button */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search creators, music, or content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {query.length > 0 && (
              <button
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && showSuggestionDropdown && suggestions.totalResults > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 rounded-lg border border-gray-600 shadow-lg z-50 max-h-80 overflow-y-auto">
              {suggestions.users.length > 0 && (
                <div className="p-2">
                  <div className="text-xs text-gray-400 px-2 py-1 uppercase tracking-wide">Creators</div>
                  {suggestions.users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSuggestionClick(user.username)}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-semibold">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-200">{user.username}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {suggestions.posts.length > 0 && (
                <div className="p-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400 px-2 py-1 uppercase tracking-wide">Posts</div>
                  {suggestions.posts.slice(0, 3).map((post) => (
                    <div
                      key={post.id}
                      onClick={() => handleSuggestionClick(post.content.slice(0, 50))}
                      className="px-3 py-2 hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{post.post_type === 'audio' ? '🎵' : '📝'}</span>
                        <div>
                          <div className="text-sm text-gray-200 truncate">
                            {post.content.length > 40 ? 
                              `${post.content.slice(0, 40)}...` : 
                              post.content}
                          </div>
                          <div className="text-xs text-gray-400">
                            by {post.user_profile?.username || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Search Button - Always visible */}
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Always visible filters - no toggle button */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-700 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value as SearchFilters['postType'])}
            className="w-full bg-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Content</option>
            <option value="audio">Audio Posts</option>
            <option value="text">Text Posts</option>
            <option value="creators">Creators</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SearchFilters['sortBy'])}
            className="w-full bg-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="popular">Most Popular</option>
            <option value="likes">Most Liked</option>
            <option value="relevance">Most Relevant</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as SearchFilters['timeRange'])}
            className="w-full bg-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleClearAll}
            className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
            title="Reset all search filters to default values"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}