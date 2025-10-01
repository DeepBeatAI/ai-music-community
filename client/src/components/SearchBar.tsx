'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchFilters, searchContent, SearchResults } from '@/utils/search';
import { PaginationState } from '@/types/pagination';

interface SearchBarProps {
  onSearch: (results: SearchResults, query: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  onPaginationReset?: () => void;
  initialFilters?: SearchFilters;
  className?: string;
  currentQuery?: string;
  showSuggestions?: boolean;
  paginationState?: PaginationState;
  isLoadingMore?: boolean;
}

export default function SearchBar({ 
  onSearch, 
  onFiltersChange,
  onPaginationReset,
  initialFilters = {}, 
  className = '',
  currentQuery = '',
  showSuggestions = true,
  paginationState,
  isLoadingMore = false
}: SearchBarProps) {
  const [query, setQuery] = useState(currentQuery || initialFilters.query || '');
  const [postType, setPostType] = useState<SearchFilters['postType']>(initialFilters.postType || 'all');
  const [sortBy, setSortBy] = useState<SearchFilters['sortBy']>(initialFilters.sortBy || 'recent');
  const [timeRange, setTimeRange] = useState<SearchFilters['timeRange']>(initialFilters.timeRange || 'all');
  const [suggestions, setSuggestions] = useState<SearchResults>({ posts: [], users: [], totalResults: 0 });
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResultsCache, setSearchResultsCache] = useState<Map<string, { results: SearchResults; timestamp: number }>>(new Map());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFiltersRef = useRef<string>('');
  const previousCurrentQueryRef = useRef(currentQuery);
  const previousPostTypeRef = useRef(postType);
  const cacheExpiryTime = 5 * 60 * 1000; // 5 minutes

  // FIXED: Prevent state conflicts - only sync if it's an external change
  const isInternalUpdate = useRef(false);
  const isTyping = useRef(false);

  // FIXED: Sync with external query changes without creating loops
  useEffect(() => {
    // Only update if currentQuery actually changed from external source, 
    // it's not our own update, and user is not actively typing
    if (currentQuery !== previousCurrentQueryRef.current && 
        currentQuery !== query && 
        !isInternalUpdate.current &&
        !isTyping.current) {
      console.log('🔄 SearchBar: Syncing with external query change:', {
        currentQuery,
        previousQuery: previousCurrentQueryRef.current,
        localQuery: query,
        isInternalUpdate: isInternalUpdate.current,
        isTyping: isTyping.current
      });
      setQuery(currentQuery);
      previousCurrentQueryRef.current = currentQuery;
    } else if (currentQuery !== previousCurrentQueryRef.current) {
      // Update the ref even if we don't sync to prevent future syncs
      previousCurrentQueryRef.current = currentQuery;
    }
  }, [currentQuery, query]); // Include query to satisfy dependency array

  // Cache management functions
  const getCacheKey = useCallback((filters: SearchFilters): string => {
    return JSON.stringify({
      query: filters.query || '',
      postType: filters.postType || 'all',
      sortBy: filters.sortBy || 'recent',
      timeRange: filters.timeRange || 'all'
    });
  }, []);

  const getCachedResults = useCallback((filters: SearchFilters): SearchResults | null => {
    const key = getCacheKey(filters);
    const cached = searchResultsCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < cacheExpiryTime) {
      console.log('🎯 SearchBar: Using cached search results');
      return cached.results;
    }
    
    return null;
  }, [searchResultsCache, getCacheKey, cacheExpiryTime]);

  const setCachedResults = useCallback((filters: SearchFilters, results: SearchResults): void => {
    const key = getCacheKey(filters);
    setSearchResultsCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, { results, timestamp: Date.now() });
      
      // Clean up old entries (keep only last 10)
      if (newCache.size > 10) {
        const entries = Array.from(newCache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const newMap = new Map(entries.slice(0, 10));
        return newMap;
      }
      
      return newCache;
    });
  }, [getCacheKey]);

  const invalidateSearchCache = useCallback((): void => {
    console.log('🧹 SearchBar: Invalidating search cache');
    setSearchResultsCache(new Map());
  }, []);

  // Store callbacks in refs to avoid dependency issues
  const onSearchRef = useRef(onSearch);
  const onPaginationResetRef = useRef(onPaginationReset);
  
  // Update refs when props change
  useEffect(() => {
    onSearchRef.current = onSearch;
    onPaginationResetRef.current = onPaginationReset;
  }, [onSearch, onPaginationReset]);

  // Memoized search function with caching and pagination integration
  const performSearch = useCallback(async (searchFilters: SearchFilters, resetPagination: boolean = true) => {
    setShowSuggestionDropdown(false);
    
    const hasQuery = searchFilters.query?.trim();
    const hasFilters = searchFilters.postType !== 'all' || searchFilters.sortBy !== 'recent' || searchFilters.timeRange !== 'all';
    
    if (!hasQuery && !hasFilters) {
      console.log('🧹 SearchBar: Clearing search - no active filters');
      onSearchRef.current({ posts: [], users: [], totalResults: 0 }, '');
      if (resetPagination && onPaginationResetRef.current) {
        onPaginationResetRef.current();
      }
      return;
    }

    // For filter-only changes (no search query), let the dashboard handle it
    if (!hasQuery && hasFilters) {
      console.log('🔍 SearchBar: Filter-only change, letting dashboard handle filtering');
      // Mark as internal update to prevent sync conflicts
      isInternalUpdate.current = true;
      onSearchRef.current({ posts: [], users: [], totalResults: 0 }, '');
      setTimeout(() => { isInternalUpdate.current = false; }, 100);
      
      if (resetPagination && onPaginationResetRef.current) {
        onPaginationResetRef.current();
      }
      return;
    }

    // Check cache first for search queries
    const cachedResults = getCachedResults(searchFilters);
    if (cachedResults) {
      console.log('📋 SearchBar: Using cached results for search');
      onSearchRef.current(cachedResults, searchFilters.query || '');
      if (resetPagination && onPaginationResetRef.current) {
        onPaginationResetRef.current();
      }
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 SearchBar: Performing search with filters:', searchFilters);
      const results = await searchContent(searchFilters);
      
      const safeResults = results || { posts: [], users: [], totalResults: 0 };
      const safePosts = Array.isArray(safeResults.posts) ? safeResults.posts : [];
      const safeUsers = Array.isArray(safeResults.users) ? safeResults.users : [];
      
      const finalResults = {
        posts: safePosts,
        users: safeUsers,
        totalResults: safeResults.totalResults || (safePosts.length + safeUsers.length)
      };

      // Cache the results
      setCachedResults(searchFilters, finalResults);
      
      // Mark as internal update to prevent sync conflicts
      isInternalUpdate.current = true;
      onSearchRef.current(finalResults, searchFilters.query || '');
      setTimeout(() => { isInternalUpdate.current = false; }, 100);
      
      // Reset pagination when search changes
      if (resetPagination && onPaginationResetRef.current) {
        onPaginationResetRef.current();
      }
    } catch (error) {
      console.error('❌ SearchBar: Error searching:', error);
      onSearchRef.current({ posts: [], users: [], totalResults: 0 }, searchFilters.query || '');
      if (resetPagination && onPaginationResetRef.current) {
        onPaginationResetRef.current();
      }
    } finally {
      setIsLoading(false);
    }
  }, [getCachedResults, setCachedResults]);

  // Debounced search and suggestions effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      // Only include non-default values in filters to prevent unwanted filter display
      const currentFilters: SearchFilters = {};
      
      if (query.trim()) {
        currentFilters.query = query;
      }
      if (postType !== 'all') {
        currentFilters.postType = postType;
      }
      if (sortBy !== 'recent') {
        currentFilters.sortBy = sortBy;
      }
      if (timeRange !== 'all') {
        currentFilters.timeRange = timeRange;
      }
      
      // FIXED: Always notify parent about filter changes, even when clearing
      if (onFiltersChange) {
        onFiltersChange(currentFilters);
      }
      
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
      if (Object.keys(currentFilters).length > 0) {
        console.log('🔍 SearchBar triggering search with filters:', currentFilters);
        await performSearch(currentFilters, true);
      } else {
        // Clear results if no query and no filters
        console.log('🧹 SearchBar clearing search - no query or filters active');
        onSearchRef.current({ posts: [], users: [], totalResults: 0 }, '');
        if (onPaginationResetRef.current) {
          onPaginationResetRef.current();
        }
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [query, postType, sortBy, timeRange, showSuggestions]);
  // NOTE: performSearch, onSearch, onPaginationReset intentionally excluded to prevent infinite loops

  // Controlled filter change handlers to prevent infinite loops
  const handlePostTypeChange = useCallback((newType: SearchFilters['postType']) => {
    setPostType(newType);
    if (onFiltersChange) {
      const filters: SearchFilters = {};
      if (query.trim()) filters.query = query;
      if (newType !== 'all') filters.postType = newType;
      if (sortBy !== 'recent') filters.sortBy = sortBy;
      if (timeRange !== 'all') filters.timeRange = timeRange;
      
      // Use requestAnimationFrame to prevent blocking
      requestAnimationFrame(() => {
        onFiltersChange(filters);
      });
    }
  }, [query, sortBy, timeRange, onFiltersChange]);

  const handleSortByChange = useCallback((newSort: SearchFilters['sortBy']) => {
    setSortBy(newSort);
    if (onFiltersChange) {
      const filters: SearchFilters = {};
      if (query.trim()) filters.query = query;
      if (postType !== 'all') filters.postType = postType;
      if (newSort !== 'recent') filters.sortBy = newSort;
      if (timeRange !== 'all') filters.timeRange = timeRange;
      
      requestAnimationFrame(() => {
        onFiltersChange(filters);
      });
    }
  }, [query, postType, timeRange, onFiltersChange]);

  const handleTimeRangeChange = useCallback((newRange: SearchFilters['timeRange']) => {
    setTimeRange(newRange);
    if (onFiltersChange) {
      const filters: SearchFilters = {};
      if (query.trim()) filters.query = query;
      if (postType !== 'all') filters.postType = postType;
      if (sortBy !== 'recent') filters.sortBy = sortBy;
      if (newRange !== 'all') filters.timeRange = newRange;
      
      requestAnimationFrame(() => {
        onFiltersChange(filters);
      });
    }
  }, [query, postType, sortBy, onFiltersChange]);

  const handleSearch = useCallback(async () => {
    // Only include non-default values in filters
    const currentFilters: SearchFilters = {};
    
    if (query.trim()) {
      currentFilters.query = query;
    }
    if (postType !== 'all') {
      currentFilters.postType = postType;
    }
    if (sortBy !== 'recent') {
      currentFilters.sortBy = sortBy;
    }
    if (timeRange !== 'all') {
      currentFilters.timeRange = timeRange;
    }
    
    await performSearch(currentFilters, true);
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
    
    // Invalidate search cache
    invalidateSearchCache();
    
    // Mark as internal update to prevent sync conflicts
    isInternalUpdate.current = true;
    isTyping.current = false; // Clear typing flag
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Reset all filters
    setQuery('');
    setPostType('all');
    setSortBy('recent');
    setTimeRange('all');
    
    // Immediately notify parent of cleared filters
    if (onFiltersChange) {
      onFiltersChange({});
    }
    
    // Clear search results
    onSearchRef.current({ posts: [], users: [], totalResults: 0 }, '');
    
    // Reset pagination immediately
    if (onPaginationResetRef.current) {
      onPaginationResetRef.current();
    }
    
    // Clear internal update flag after a delay
    setTimeout(() => { isInternalUpdate.current = false; }, 100);
  }, [invalidateSearchCache, onFiltersChange]);

  // Pagination state display helpers
  const getPaginationInfo = useCallback(() => {
    if (!paginationState) return null;
    
    const { paginationMode, currentPage, paginatedPosts, displayPosts, hasMorePosts } = paginationState;
    const totalVisible = paginatedPosts.length;
    const totalFiltered = displayPosts.length;
    
    return {
      mode: paginationMode,
      currentPage,
      totalVisible,
      totalFiltered,
      hasMore: hasMorePosts,
      isClientSide: paginationMode === 'client'
    };
  }, [paginationState]);

  const paginationInfo = getPaginationInfo();

  return (
    <div className={`bg-gray-800 rounded-lg p-4 space-y-4 ${className}`}>
      {/* Pagination Status Display */}
      {paginationInfo && (query.trim() || postType !== 'all' || sortBy !== 'recent' || timeRange !== 'all') && (
        <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-700 rounded px-3 py-2">
          <div className="flex items-center space-x-4">
            <span>
              📊 Showing {paginationInfo.totalVisible} of {paginationInfo.totalFiltered} filtered results
            </span>
            <span className="text-blue-400">
              {paginationInfo.isClientSide ? '🔍 Client-side pagination' : '🌐 Server-side pagination'}
            </span>
          </div>
          {isLoadingMore && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400"></div>
              <span className="text-blue-400">Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* Search input section with Search button */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search creators, music, or content..."
            value={query}
            onChange={(e) => {
              const newValue = e.target.value;
              isTyping.current = true;
              setQuery(newValue);
              
              // Clear existing typing timeout
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              
              // Set a timeout to clear the typing flag after user stops typing
              typingTimeoutRef.current = setTimeout(() => {
                isTyping.current = false;
              }, 1500); // Longer delay to ensure user has stopped typing
            }}
            onKeyDown={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {query.length > 0 && (
              <button
                onClick={() => {
                  isTyping.current = false; // Clear typing flag
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  setQuery('');
                  
                  // FIXED: Immediately notify parent about cleared query
                  if (onFiltersChange) {
                    const clearedFilters: SearchFilters = {};
                    if (postType !== 'all') clearedFilters.postType = postType;
                    if (sortBy !== 'recent') clearedFilters.sortBy = sortBy;
                    if (timeRange !== 'all') clearedFilters.timeRange = timeRange;
                    onFiltersChange(clearedFilters);
                  }
                }}
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
            onChange={(e) => handlePostTypeChange(e.target.value as SearchFilters['postType'])}
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
            onChange={(e) => handleSortByChange(e.target.value as SearchFilters['sortBy'])}
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
            onChange={(e) => handleTimeRangeChange(e.target.value as SearchFilters['timeRange'])}
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
            title="Reset all filters and refresh results"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}