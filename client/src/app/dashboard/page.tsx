"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MainLayout from "@/components/layout/MainLayout";
import PostItem from "@/components/PostItem";
import AudioUpload from "@/components/AudioUpload";
import SearchBar from "@/components/SearchBar";
import FollowButton from "@/components/FollowButton";
import CreatorFilterButton from "@/components/CreatorFilterButton";
import CreatorFilterIndicator from "@/components/CreatorFilterIndicator";
import CreatorFilterNoResults from "@/components/CreatorFilterNoResults";
import ErrorBoundary from "@/components/ErrorBoundary";
import PerformanceMonitoringPanel from "@/components/PerformanceMonitoringPanel";
import LoadMoreButton from "@/components/LoadMoreButton";
import type { SearchFilters } from "@/utils/search";
import {
  fetchPosts,
  fetchPostsByCreator,
  createTextPost,
  createAudioPost,
  deletePost,
} from "@/utils/posts";
import { searchContent } from "@/utils/search";
import { createUnifiedPaginationState } from "@/utils/unifiedPaginationState";
import { 
  optimizedCreatorFilterWithDeduplication,
  validateCreatorFilterPerformance 
} from "@/utils/creatorFilterOptimizer";
import type { PaginationState } from "@/types/pagination";
import type { UserProfile, Post } from "@/types";

// Error Boundary Components
const AudioUploadErrorBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <ErrorBoundary
    fallback={
      <div className="bg-red-900/20 border border-red-700 rounded p-4 text-center">
        <p className="text-red-400 text-sm mb-2">
          Audio upload temporarily unavailable
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
        >
          Refresh Page
        </button>
      </div>
    }
    onError={(error) => console.error("AudioUpload Error:", error)}
  >
    {children}
  </ErrorBoundary>
);

const SearchErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={
      <div className="bg-yellow-900/20 border border-yellow-700 rounded p-4 text-center">
        <p className="text-yellow-400 text-sm">
          Search temporarily unavailable
        </p>
      </div>
    }
    onError={(error) => console.error("Search Error:", error)}
  >
    {children}
  </ErrorBoundary>
);

const PostErrorBoundary = ({
  children,
  postId,
}: {
  children: React.ReactNode;
  postId: string;
}) => (
  <ErrorBoundary
    fallback={
      <div className="bg-gray-800 border border-gray-600 rounded p-4 text-center">
        <p className="text-gray-400 text-sm">Post temporarily unavailable</p>
      </div>
    }
    onError={(error) => console.error(`Post ${postId} Error:`, error)}
  >
    {children}
  </ErrorBoundary>
);

const PaginationErrorBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <ErrorBoundary
    fallback={
      <div className="bg-gray-800 border border-gray-600 rounded p-4 text-center">
        <p className="text-gray-400 text-sm mb-2">
          Posts temporarily unavailable
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
        >
          Refresh
        </button>
      </div>
    }
    onError={(error) => console.error("Pagination Error:", error)}
  >
    {children}
  </ErrorBoundary>
);

const LoadMoreErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={
      <div className="text-center py-4">
        <p className="text-gray-400 text-sm mb-2">
          Load more temporarily unavailable
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
        >
          Refresh
        </button>
      </div>
    }
    onError={(error) => console.error("LoadMore Error:", error)}
  >
    {children}
  </ErrorBoundary>
);

const POSTS_PER_PAGE = 15;

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  // Component state
  const [activeTab, setActiveTab] = useState<"text" | "audio">("text");
  const [textContent, setTextContent] = useState("");
  const [audioDescription, setAudioDescription] = useState("");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [isPostFormExpanded, setIsPostFormExpanded] = useState(false); // New state for expandable form

  // Unified pagination state
  const [paginationManager] = useState(() => createUnifiedPaginationState());
  const [paginationState, setPaginationState] = useState<PaginationState>(
    paginationManager.getState()
  );

  // Legacy state for compatibility
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");
  const [searchBarKey, setSearchBarKey] = useState(0); // Force SearchBar re-render

  // SIMPLE FILTER STATE - Direct approach
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [filterPage, setFilterPage] = useState(1);

  // Refs for tracking state
  const hasInitiallyLoaded = useRef(false);

  // Optimized deduplication with performance tracking
  const deduplicatePosts = useCallback((posts: any[]) => {
    const startTime = performance.now();
    const seen = new Set();
    const deduplicated = posts.filter((post: any) => {
      if (seen.has(post.id)) {
        return false;
      }
      seen.add(post.id);
      return true;
    });
    
    const endTime = performance.now();
    const duplicatesRemoved = posts.length - deduplicated.length;
    
    if (duplicatesRemoved > 0) {
      console.log(`🧹 Deduplication: Removed ${duplicatesRemoved} duplicates from ${posts.length} posts in ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    return deduplicated;
  }, []);

  // Apply filters directly - OPTIMIZED APPROACH
  const applyFiltersDirectly = useCallback((filters: SearchFilters, allPosts: Post[]) => {
    const startTime = performance.now();
    console.log('🔧 Applying filters:', filters, 'to', allPosts.length, 'posts');
    
    // Early return if no filters to apply
    const hasFilters = 
      (filters.query && filters.query.trim()) ||
      (filters.creatorId && filters.creatorId.trim()) ||
      (filters.postType && filters.postType !== 'all' && filters.postType !== 'creators') ||
      (filters.timeRange && filters.timeRange !== 'all');
    
    if (!hasFilters) {
      console.log('✅ No filters to apply, returning original posts');
      return allPosts;
    }
    
    let filtered = [...allPosts];
    
    // FIXED: Apply search query filter FIRST if present
    if (filters.query && filters.query.trim()) {
      const queryLower = filters.query.toLowerCase().trim();
      const before = filtered.length;
      
      filtered = filtered.filter(post => {
        // Check content
        if (post.content && post.content.toLowerCase().includes(queryLower)) return true;
        
        // Check audio filename for audio posts
        if (post.post_type === 'audio' && post.audio_filename) {
          const filename = post.audio_filename.toLowerCase();
          if (filename.includes(queryLower)) return true;
        }
        
        // Note: We don't filter by username here as per requirements
        // Users matching the search should appear in "Search Results: Creators" section
        
        return false;
      });
      
      console.log(`  ✓ Search query filter ("${filters.query}"): ${before} → ${filtered.length}`);
    }
    
    // Apply creator filter - OPTIMIZED with dedicated optimizer
    if (filters.creatorId) {
      // Use optimized creator filtering with built-in deduplication
      const { filteredPosts: creatorFiltered, totalMetrics } = optimizedCreatorFilterWithDeduplication(
        filtered, 
        filters.creatorId, 
        filters.creatorUsername
      );
      
      // Validate performance and log suggestions
      const performanceValidation = validateCreatorFilterPerformance(
        filtered.length,
        totalMetrics.processingTime,
        creatorFiltered.length
      );
      
      if (!performanceValidation.isOptimal) {
        console.warn(`⚠️ Creator filter performance grade: ${performanceValidation.performanceGrade}`);
        performanceValidation.suggestions.forEach(suggestion => {
          console.warn(`💡 Suggestion: ${suggestion}`);
        });
      }
      
      filtered = creatorFiltered;
      
      // Early return if no posts found for this creator to avoid unnecessary processing
      if (filtered.length === 0) {
        console.log('⚡ Early return: No posts found for creator, skipping remaining filters');
        return filtered;
      }
    }
    
    // Apply post type filter
    if (filters.postType && filters.postType !== 'all' && filters.postType !== 'creators') {
      const before = filtered.length;
      filtered = filtered.filter(post => post.post_type === filters.postType);
      console.log(`  ✓ Post type filter (${filters.postType}): ${before} → ${filtered.length}`);
    }
    
    // Apply time range filter (UTC-based) - FIXED: More strict filtering
    if (filters.timeRange && filters.timeRange !== 'all') {
      const now = new Date();
      const nowMs = now.getTime();
      let cutoffMs: number;
      
      switch (filters.timeRange) {
        case 'today':
          // Get start of today in UTC (00:00:00)
          const todayUTC = new Date(now);
          todayUTC.setUTCHours(0, 0, 0, 0);
          cutoffMs = todayUTC.getTime();
          break;
        case 'week':
          // Exactly 7 days ago
          cutoffMs = nowMs - (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          // Exactly 30 days ago
          cutoffMs = nowMs - (30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffMs = 0; // Unix epoch
      }
      
      const before = filtered.length;
      const cutoffDate = new Date(cutoffMs);
      
      filtered = filtered.filter(post => {
        const postDate = new Date(post.created_at);
        const postMs = postDate.getTime();
        const isAfterCutoff = postMs >= cutoffMs;
        
        if (!isAfterCutoff) {
          console.log(`  ✗ Filtered out: "${post.content.substring(0, 30)}" from ${postDate.toISOString()} (before cutoff ${cutoffDate.toISOString()})`);
        }
        
        return isAfterCutoff;
      });
      
      console.log(`  ✓ Time range filter (${filters.timeRange}): ${before} → ${filtered.length} (cutoff: ${cutoffDate.toISOString()})`);
      console.log(`  ✓ Current UTC time: ${now.toISOString()}`);
    }
    
    // Apply sorting
    const sortBy = filters.sortBy || 'recent';
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        console.log(`  ✓ Sorted by: oldest first`);
        break;
        
      case 'likes':
        // Simple sort by like count only - FIXED: Handle both like_count and likes_count
        filtered.sort((a, b) => {
          // Check both possible property names
          const aLikes = (a.like_count ?? (a as any).likes_count ?? 0);
          const bLikes = (b.like_count ?? (b as any).likes_count ?? 0);
          
          console.log(`  👍 Comparing likes: "${a.content.substring(0, 20)}" (${aLikes}) vs "${b.content.substring(0, 20)}" (${bLikes})`);
          
          const likeDiff = bLikes - aLikes;
          if (likeDiff === 0) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return likeDiff;
        });
        console.log(`  ✓ Sorted by: most liked`);
        break;
        
      case 'popular':
        // Popular algorithm: weighted score combining likes and recency - FIXED: Handle both like_count and likes_count
        filtered.sort((a, b) => {
          const now = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;
          
          // Check both possible property names
          const aLikes = (a.like_count ?? (a as any).likes_count ?? 0);
          const bLikes = (b.like_count ?? (b as any).likes_count ?? 0);
          
          // Calculate recency score (0-7 based on days old, max 7 days)
          const aDaysOld = Math.floor((now - new Date(a.created_at).getTime()) / dayMs);
          const bDaysOld = Math.floor((now - new Date(b.created_at).getTime()) / dayMs);
          const aRecencyScore = Math.max(0, 7 - aDaysOld);
          const bRecencyScore = Math.max(0, 7 - bDaysOld);
          
          // Weighted score: likes * 2 + recency score
          const aScore = (aLikes * 2) + aRecencyScore;
          const bScore = (bLikes * 2) + bRecencyScore;
          
          // If scores are equal, sort by recency (newest first)
          if (bScore === aScore) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          return bScore - aScore;
        });
        console.log(`  ✓ Sorted by: popular (likes*2 + recency)`);
        break;
        
      case 'relevance':
        // Relevance algorithm: prioritize based on search query matches - FIXED: Handle both like_count and likes_count
        if (filters.query && filters.query.trim()) {
          const queryLower = filters.query.toLowerCase();
          filtered.sort((a, b) => {
            let aScore = 0;
            let bScore = 0;
            
            // Exact matches in content get highest score
            if (a.content.toLowerCase().includes(queryLower)) aScore += 10;
            if (b.content.toLowerCase().includes(queryLower)) bScore += 10;
            
            // Audio filename matches
            if (a.audio_filename && a.audio_filename.toLowerCase().includes(queryLower)) aScore += 8;
            if (b.audio_filename && b.audio_filename.toLowerCase().includes(queryLower)) bScore += 8;
            
            // Username matches
            if (a.user_profiles?.username?.toLowerCase().includes(queryLower)) aScore += 5;
            if (b.user_profiles?.username?.toLowerCase().includes(queryLower)) bScore += 5;
            
            // Add like bonus for equal relevance (max 5 points) - check both property names
            const aLikes = (a.like_count ?? (a as any).likes_count ?? 0);
            const bLikes = (b.like_count ?? (b as any).likes_count ?? 0);
            aScore += Math.min(aLikes, 5);
            bScore += Math.min(bLikes, 5);
            
            if (bScore === aScore) {
              // If equal relevance, sort by recency
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            
            return bScore - aScore;
          });
          console.log(`  ✓ Sorted by: relevance (query-based scoring)`);
        } else {
          // No query - default to recent
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          console.log(`  ✓ Sorted by: relevance (no query, using recent)`);
        }
        break;
        
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        console.log(`  ✓ Sorted by: most recent`);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    console.log(`✅ Final filtered count: ${filtered.length} (processed in ${totalTime.toFixed(2)}ms)`);
    
    // Performance warning for slow filtering
    if (totalTime > 100) {
      console.warn(`⚠️ Slow filtering detected: ${totalTime.toFixed(2)}ms for ${allPosts.length} posts`);
    }
    
    return filtered;
  }, []);
    

    


  // Subscribe to pagination state changes
  useEffect(() => {
    const unsubscribe = paginationManager.subscribe((newState) => {
      setPaginationState(newState);
    });

    return unsubscribe;
  }, [paginationManager]);

  // Keyboard shortcut to toggle post form (Alt+N to avoid browser conflicts)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Use Alt+N instead of Ctrl+N to avoid browser new tab conflict
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        setIsPostFormExpanded(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // REMOVED: This useEffect was causing issues with filter updates
  // Filters are now managed entirely within handleFiltersChange

  // Load initial posts
  const loadPosts = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (paginationState.fetchInProgress || paginationState.isLoadingMore) return;

      try {
        paginationManager.setLoadingState(true, append);

        const { posts: newPosts, hasMore } = await fetchPosts(
          page,
          POSTS_PER_PAGE,
          user?.id
        );

        // Update pagination state with new posts
        paginationManager.updatePosts({
          newPosts,
          resetPagination: !append,
          updateMetadata: {
            totalServerPosts: hasMore ? (page * POSTS_PER_PAGE) + 1 : page * POSTS_PER_PAGE,
            loadedServerPosts: append ? paginationState.allPosts.length + newPosts.length : newPosts.length,
            currentBatch: page,
            lastFetchTimestamp: Date.now(),
          },
        });

        // Update total posts count
        if (hasMore) {
          paginationManager.updateTotalPostsCount((page * POSTS_PER_PAGE) + 1);
        } else {
          paginationManager.updateTotalPostsCount(page * POSTS_PER_PAGE);
        }


      } catch (error) {
        console.error("Error loading posts:", error);
        setError("Failed to load posts. Please try again.");
      } finally {
        paginationManager.setLoadingState(false);
      }
    },
    [user?.id, paginationState.fetchInProgress, paginationState.isLoadingMore, paginationState.allPosts.length, paginationManager]
  );

  // Initialize posts on component mount
  useEffect(() => {
    if (user && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      loadPosts(1, false);
    }
  }, [user, loadPosts]);

  // Handle search
  const handleSearch = useCallback(
    async (query: string, filters: SearchFilters) => {
      try {
        // Only update currentSearchQuery if it's actually different to prevent loops
        if (currentSearchQuery !== query) {
          setCurrentSearchQuery(query);
        }

        const results = await searchContent({ ...filters, query }, 0, 200); // Fetch more results for comprehensive filtering
        
        // Update pagination state with search results
        paginationManager.updateSearch(results, query, filters);
      } catch (error) {
        console.error("Search error:", error);
        setError("Search failed. Please try again.");
      }
    },
    [paginationManager, currentSearchQuery]
  );

  // Handle filters change - COMPLETELY REWRITTEN FOR RELIABILITY
  const handleFiltersChange = useCallback(
    async (filters: SearchFilters) => {
      const filterChangeStart = performance.now();
      console.log('🎯 Filter change started:', filters);
      console.log('🎯 Current filters before merge:', currentFilters);
      
      // CRITICAL FIX: Preserve creatorId and creatorUsername from currentFilters
      // BUT only if the incoming filters don't explicitly clear them
      const mergedFilters: SearchFilters = {
        ...filters
      };
      
      // Only preserve creator filter if:
      // 1. It exists in current state
      // 2. The incoming filters don't have creatorId (meaning they're not trying to change it)
      if (currentFilters.creatorId && currentFilters.creatorUsername && !filters.creatorId) {
        mergedFilters.creatorId = currentFilters.creatorId;
        mergedFilters.creatorUsername = currentFilters.creatorUsername;
        console.log('🎯 Preserved creator filter from current state');
      }
      
      // CRITICAL: Remove query if it's empty string (treat it as undefined)
      if (mergedFilters.query === '') {
        delete mergedFilters.query;
        console.log('🎯 Removed empty query string');
      }
      
      console.log('🎯 Merged filters (with preserved creator filter):', mergedFilters);
      
      // CRITICAL: Always update currentFilters state immediately with merged filters
      setCurrentFilters(mergedFilters);
      setFilterPage(1); // Reset to first page
      
      // Check if creator filter is active (using mergedFilters)
      if (mergedFilters.creatorId && mergedFilters.creatorId.trim()) {
        console.log('📚 Creator filter active - fetching creator posts');
        console.log('📚 Filter object:', mergedFilters);
        
        try {
          // Fetch ALL posts from the creator (increased limit)
          const { posts: creatorPosts } = await fetchPostsByCreator(
            mergedFilters.creatorId,
            1,
            200, // Increased from 100 to ensure we get all posts
            user?.id
          );
          
          console.log(`📚 Fetched ${creatorPosts.length} posts from creator`);
          
          // Apply additional filters if any
          let filtered = [...creatorPosts];
          
          // CRITICAL FIX: Only apply search query filter if it's explicitly set AND not empty
          // This prevents filtering by a stale query when switching from search to creator filter
          const hasValidQuery = mergedFilters.query && mergedFilters.query.trim() && mergedFilters.query.trim().length > 0;
          if (hasValidQuery) {
            const queryLower = mergedFilters.query!.toLowerCase().trim();
            const before = filtered.length;
            console.log(`🔍 Applying search query filter: "${mergedFilters.query}"`);
            filtered = filtered.filter(post => {
              if (post.content && post.content.toLowerCase().includes(queryLower)) return true;
              if (post.post_type === 'audio' && post.audio_filename?.toLowerCase().includes(queryLower)) return true;
              return false;
            });
            console.log(`  ✓ Applied query filter: ${before} → ${filtered.length}`);
          } else if (mergedFilters.query !== undefined) {
            console.log(`⚠️ Ignoring empty/invalid query: "${mergedFilters.query}"`);
          }
          
          // Apply post type filter
          if (mergedFilters.postType && mergedFilters.postType !== 'all' && mergedFilters.postType !== 'creators') {
            const before = filtered.length;
            filtered = filtered.filter(post => post.post_type === mergedFilters.postType);
            console.log(`  ✓ Applied type filter: ${before} → ${filtered.length}`);
          }
          
          // Apply time range filter
          if (mergedFilters.timeRange && mergedFilters.timeRange !== 'all') {
            const now = Date.now();
            let cutoffMs: number;
            
            switch (mergedFilters.timeRange) {
              case 'today':
                const todayUTC = new Date();
                todayUTC.setUTCHours(0, 0, 0, 0);
                cutoffMs = todayUTC.getTime();
                break;
              case 'week':
                cutoffMs = now - (7 * 24 * 60 * 60 * 1000);
                break;
              case 'month':
                cutoffMs = now - (30 * 24 * 60 * 60 * 1000);
                break;
              default:
                cutoffMs = 0;
            }
            
            const before = filtered.length;
            filtered = filtered.filter(post => {
              return new Date(post.created_at).getTime() >= cutoffMs;
            });
            console.log(`  ✓ Applied time filter: ${before} → ${filtered.length}`);
          }
          
          // Apply sorting
          const sortBy = mergedFilters.sortBy || 'recent';
          switch (sortBy) {
            case 'oldest':
              filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              break;
            case 'likes':
              filtered.sort((a, b) => {
                const aLikes = a.like_count ?? a.likes_count ?? 0;
                const bLikes = b.like_count ?? b.likes_count ?? 0;
                if (bLikes === aLikes) {
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                return bLikes - aLikes;
              });
              break;
            case 'popular':
              filtered.sort((a, b) => {
                const now = Date.now();
                const dayMs = 24 * 60 * 60 * 1000;
                const aDaysOld = Math.floor((now - new Date(a.created_at).getTime()) / dayMs);
                const bDaysOld = Math.floor((now - new Date(b.created_at).getTime()) / dayMs);
                const aRecencyScore = Math.max(0, 7 - aDaysOld);
                const bRecencyScore = Math.max(0, 7 - bDaysOld);
                const aLikes = a.like_count ?? a.likes_count ?? 0;
                const bLikes = b.like_count ?? b.likes_count ?? 0;
                const aScore = (aLikes * 2) + aRecencyScore;
                const bScore = (bLikes * 2) + bRecencyScore;
                if (bScore === aScore) {
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                return bScore - aScore;
              });
              break;
            case 'relevance':
              if (mergedFilters.query && mergedFilters.query.trim()) {
                const queryLower = mergedFilters.query.toLowerCase();
                filtered.sort((a, b) => {
                  let aScore = 0;
                  let bScore = 0;
                  
                  if (a.content.toLowerCase().includes(queryLower)) aScore += 10;
                  if (b.content.toLowerCase().includes(queryLower)) bScore += 10;
                  
                  if (a.audio_filename?.toLowerCase().includes(queryLower)) aScore += 8;
                  if (b.audio_filename?.toLowerCase().includes(queryLower)) bScore += 8;
                  
                  if (a.user_profiles?.username?.toLowerCase().includes(queryLower)) aScore += 5;
                  if (b.user_profiles?.username?.toLowerCase().includes(queryLower)) bScore += 5;
                  
                  const aLikes = a.like_count ?? a.likes_count ?? 0;
                  const bLikes = b.like_count ?? b.likes_count ?? 0;
                  aScore += Math.min(aLikes, 5);
                  bScore += Math.min(bLikes, 5);
                  
                  if (bScore === aScore) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  }
                  
                  return bScore - aScore;
                });
              } else {
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              }
              break;
            default:
              filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          }
          console.log(`  ✓ Applied sorting: ${sortBy}`);
          
          // Set filtered posts
          setFilteredPosts(filtered);
          console.log(`✅ Creator filter: Set ${filtered.length} filtered posts`);
          
          // Also handle search for users if query is present
          if (mergedFilters.query && mergedFilters.query.trim()) {
            try {
              const results = await searchContent(mergedFilters, 0, 200);
              paginationManager.updateSearch(results, mergedFilters.query, mergedFilters);
            } catch (error) {
              console.error('Search error:', error);
            }
          } else {
            paginationManager.clearSearch();
          }
          
        } catch (error) {
          console.error('Error fetching creator posts:', error);
          setError('Failed to load creator posts');
          setFilteredPosts([]);
        }
      } else {
        // Handle non-creator filters
        const hasActiveFilters = 
          (mergedFilters.query && mergedFilters.query.trim()) ||
          (mergedFilters.postType && mergedFilters.postType !== 'all') ||
          (mergedFilters.sortBy && mergedFilters.sortBy !== 'recent') ||
          (mergedFilters.timeRange && mergedFilters.timeRange !== 'all');
        
        console.log('🔍 Non-creator filter - hasActiveFilters:', hasActiveFilters);
        
        // Handle search for users when there's a query - FIXED: Only search if query is valid
        const hasValidQuery = mergedFilters.query && mergedFilters.query.trim() && mergedFilters.query.trim().length > 0;
        if (hasValidQuery) {
          console.log(`🔍 Non-creator path: Searching with query "${mergedFilters.query}"`);
          try {
            const results = await searchContent(mergedFilters, 0, 200);
            paginationManager.updateSearch(results, mergedFilters.query!, mergedFilters);
          } catch (error) {
            console.error('Search error:', error);
          }
        } else {
          if (mergedFilters.query !== undefined) {
            console.log(`⚠️ Non-creator path: Ignoring empty/invalid query: "${mergedFilters.query}"`);
          }
          paginationManager.clearSearch();
        }
        
        if (hasActiveFilters) {
          // CRITICAL FIX: Fetch MORE posts to ensure we have enough to filter
          console.log('📥 Fetching more posts for filtering...');
          let allPosts = deduplicatePosts(paginationState.allPosts);
          
          // ALWAYS fetch at least 100 posts for filtering to work properly
          const targetPostCount = 100;
          if (allPosts.length < targetPostCount) {
            console.log(`📥 Current posts: ${allPosts.length}, fetching more to reach ${targetPostCount}...`);
            try {
              // Calculate how many pages we need
              const postsNeeded = targetPostCount - allPosts.length;
              const pagesNeeded = Math.ceil(postsNeeded / POSTS_PER_PAGE);
              
              // Fetch multiple pages
              for (let i = 0; i < pagesNeeded; i++) {
                const page = Math.floor(allPosts.length / POSTS_PER_PAGE) + 1;
                console.log(`📥 Fetching page ${page}...`);
                const { posts: morePosts } = await fetchPosts(page, POSTS_PER_PAGE, user?.id);
                if (morePosts.length === 0) break; // No more posts available
                allPosts = deduplicatePosts([...allPosts, ...morePosts]);
                console.log(`📥 Now have ${allPosts.length} total posts`);
                if (allPosts.length >= targetPostCount) break;
              }
            } catch (error) {
              console.error('Error fetching additional posts:', error);
            }
          }
          
          console.log(`🔍 Applying filters to ${allPosts.length} posts`);
          const filtered = applyFiltersDirectly(mergedFilters, allPosts);
          const dedupedFiltered = deduplicatePosts(filtered);
          console.log(`✅ Filter result: ${dedupedFiltered.length} posts`);
          setFilteredPosts(dedupedFiltered);
        } else {
          console.log('✅ No active filters - clearing filtered posts');
          setFilteredPosts([]);
          paginationManager.clearSearch();
        }
      }
      
      const filterChangeEnd = performance.now();
      console.log(`✅ Filter change completed in ${(filterChangeEnd - filterChangeStart).toFixed(2)}ms`);
    },
    [paginationState.allPosts, user?.id, paginationManager, applyFiltersDirectly, deduplicatePosts, currentFilters]
  );
      


  // Clear search
  const clearSearch = useCallback(async () => {
    console.log('🧹 Dashboard: Clearing all search and filters');
    setCurrentSearchQuery("");
    setSearchBarKey(prev => prev + 1); // Force SearchBar re-mount
    setCurrentFilters({});
    setFilteredPosts([]);
    setFilterPage(1);
    paginationManager.clearSearch();
    // Force refresh to show unfiltered posts
    await loadPosts(1, false);
  }, [paginationManager, loadPosts]);

  // Clear post type filter while preserving other filters
  const clearPostTypeFilter = useCallback(async () => {
    console.log('🧹 Dashboard: Clearing post type filter');
    const newFilters: SearchFilters = { ...currentFilters };
    delete newFilters.postType;
    await handleFiltersChange(newFilters);
  }, [currentFilters, handleFiltersChange]);

  // Clear sort by filter while preserving other filters
  const clearSortByFilter = useCallback(async () => {
    console.log('🧹 Dashboard: Clearing sort by filter');
    const newFilters: SearchFilters = { ...currentFilters };
    delete newFilters.sortBy;
    await handleFiltersChange(newFilters);
  }, [currentFilters, handleFiltersChange]);

  // Clear time range filter while preserving other filters
  const clearTimeRangeFilter = useCallback(async () => {
    console.log('🧹 Dashboard: Clearing time range filter');
    const newFilters: SearchFilters = { ...currentFilters };
    delete newFilters.timeRange;
    await handleFiltersChange(newFilters);
  }, [currentFilters, handleFiltersChange]);

  // Clear creator filter while preserving other filters
  const clearCreatorFilter = useCallback(async () => {
    console.log('🧹 Dashboard: Clearing creator filter');
    console.log('🧹 Current filters before clear:', currentFilters);
    
    // Create new filters WITHOUT creatorId and creatorUsername
    const newFilters: SearchFilters = {
      ...currentFilters
    };
    
    // Explicitly remove creator filter properties
    delete newFilters.creatorId;
    delete newFilters.creatorUsername;
    
    console.log('🧹 New filters after removing creator:', newFilters);
    
    // If no filters remain, clear everything
    const hasRemainingFilters = 
      (newFilters.query && newFilters.query.trim()) ||
      (newFilters.postType && newFilters.postType !== 'all') ||
      (newFilters.sortBy && newFilters.sortBy !== 'recent') ||
      (newFilters.timeRange && newFilters.timeRange !== 'all');
    
    if (!hasRemainingFilters) {
      console.log('🧹 No remaining filters, clearing all');
      await clearSearch();
    } else {
      console.log('🧹 Applying remaining filters:', newFilters);
      // CRITICAL: Update currentFilters first to prevent re-merging
      setCurrentFilters(newFilters);
      setFilterPage(1);
      
      // Then apply the filters (this will now see the updated currentFilters without creator)
      // We need to bypass handleFiltersChange to avoid the merge logic
      // Instead, directly apply the remaining filters
      
      // Handle search for users when there's a query
      const hasValidQuery = newFilters.query && newFilters.query.trim() && newFilters.query.trim().length > 0;
      if (hasValidQuery) {
        try {
          const results = await searchContent(newFilters, 0, 200);
          paginationManager.updateSearch(results, newFilters.query!, newFilters);
        } catch (error) {
          console.error('Search error:', error);
        }
      } else {
        paginationManager.clearSearch();
      }
      
      // Apply filters to all posts
      const hasActiveFilters = 
        (newFilters.query && newFilters.query.trim()) ||
        (newFilters.postType && newFilters.postType !== 'all') ||
        (newFilters.sortBy && newFilters.sortBy !== 'recent') ||
        (newFilters.timeRange && newFilters.timeRange !== 'all');
      
      if (hasActiveFilters) {
        let allPosts = deduplicatePosts(paginationState.allPosts);
        
        // Fetch more posts if needed
        const targetPostCount = 100;
        if (allPosts.length < targetPostCount) {
          try {
            const postsNeeded = targetPostCount - allPosts.length;
            const pagesNeeded = Math.ceil(postsNeeded / POSTS_PER_PAGE);
            
            for (let i = 0; i < pagesNeeded; i++) {
              const page = Math.floor(allPosts.length / POSTS_PER_PAGE) + 1;
              const { posts: morePosts } = await fetchPosts(page, POSTS_PER_PAGE, user?.id);
              if (morePosts.length === 0) break;
              allPosts = deduplicatePosts([...allPosts, ...morePosts]);
              if (allPosts.length >= targetPostCount) break;
            }
          } catch (error) {
            console.error('Error fetching additional posts:', error);
          }
        }
        
        const filtered = applyFiltersDirectly(newFilters, allPosts);
        const dedupedFiltered = deduplicatePosts(filtered);
        setFilteredPosts(dedupedFiltered);
      } else {
        setFilteredPosts([]);
        paginationManager.clearSearch();
      }
    }
  }, [currentFilters, clearSearch, paginationManager, paginationState.allPosts, user?.id, deduplicatePosts, applyFiltersDirectly]);

  // Handle creator filter
  const handleCreatorFilter = useCallback(async (creatorId: string, username: string) => {
    console.log('🎯 Dashboard: Filtering by creator:', username, creatorId);
    
    // CRITICAL: Clear search query completely and force SearchBar to update
    setCurrentSearchQuery('');
    setSearchBarKey(prev => prev + 1); // Force SearchBar to re-mount with empty query
    
    // Create filter with creator info but NO search query
    const newFilters: SearchFilters = {
      creatorId,
      creatorUsername: username
      // Intentionally NOT including query - it should be empty
      // Intentionally NOT including other filters - start fresh with just creator
    };
    
    console.log('🎯 Applying creator-only filter:', newFilters);
    
    // Apply filters immediately
    await handleFiltersChange(newFilters);
  }, [handleFiltersChange]);

  // Handle load more for filtered content
  const handleFilteredLoadMore = useCallback(() => {
    setFilterPage(prev => prev + 1);
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    // If we have active filters, use simple pagination
    if (filteredPosts.length > 0) {
      handleFilteredLoadMore();
      return;
    }
    
    // Otherwise use the complex pagination system
    const { canLoadMore, strategy } = paginationManager.loadMore();
    
    if (!canLoadMore) return;

    if (strategy === 'server-fetch') {
      // Server-side pagination: fetch more posts
      await loadPosts(paginationState.currentPage + 1, true);
    }
    // Client-side pagination is handled automatically by the pagination manager
  }, [filteredPosts.length, handleFilteredLoadMore, paginationManager, paginationState.currentPage, loadPosts]);

  // Handle audio file selection
  const handleAudioFileSelect = useCallback((file: File) => {
    setSelectedAudioFile(file);
    setError(null);
  }, []);

  // Handle audio file removal
  const handleAudioFileRemove = useCallback(() => {
    setSelectedAudioFile(null);
    // Also clear the audio description when switching tabs to avoid confusion
    if (activeTab !== "audio") {
      setAudioDescription("");
    }
  }, [activeTab]);
  // Handle text post submission
  const handleTextPostSubmit = useCallback(async () => {
    if (!user || !textContent.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await createTextPost(user.id, textContent);
      setTextContent("");

      // Collapse the form after successful submission
      setIsPostFormExpanded(false);

      // Reset pagination and reload posts
      paginationManager.reset();
      await loadPosts(1, false);
    } catch (error) {
      console.error("Error creating text post:", error);
      setError("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [user, textContent, loadPosts, paginationManager]);

  // Handle audio post submission
  const handleAudioPostSubmit = useCallback(async () => {
    if (!user || !selectedAudioFile) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Upload audio file
      const fileExt = selectedAudioFile.name.split(".").pop();
      const storagePath = `${user.id}/${Date.now()}.${fileExt}`;
      const originalFileName = selectedAudioFile.name; // Keep original filename

      console.log('Uploading audio file:', storagePath, 'Original name:', originalFileName, 'Size:', selectedAudioFile.size);
      
      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(storagePath, selectedAudioFile);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully, creating post...');
      
      // Create post with additional metadata
      // Pass the storage path and original filename separately
      await createAudioPost(
        user.id, 
        storagePath, 
        audioDescription || originalFileName, // Use filename as fallback description
        selectedAudioFile.size,
        undefined, // duration will be calculated client-side if needed
        selectedAudioFile.type,
        originalFileName // Pass original filename
      );

      console.log('Audio post created successfully');
      
      setAudioDescription("");
      setSelectedAudioFile(null);

      // Collapse the form after successful submission
      setIsPostFormExpanded(false);

      // Reset pagination and reload posts
      paginationManager.reset();
      await loadPosts(1, false);
    } catch (error) {
      console.error("Error creating audio post:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload audio post. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, selectedAudioFile, audioDescription, loadPosts, paginationManager]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (activeTab === "text") {
        await handleTextPostSubmit();
      } else {
        await handleAudioPostSubmit();
      }
    },
    [activeTab, handleTextPostSubmit, handleAudioPostSubmit]
  );

  // Handle post deletion
  const handleDeletePost = useCallback(
    async (postId: string) => {
      try {
        await deletePost(postId);
        // Reset pagination and reload posts
        paginationManager.reset();
        await loadPosts(1, false);
      } catch (error) {
        console.error("Error deleting post:", error);
        setError("Failed to delete post. Please try again.");
      }
    },
    [loadPosts, paginationManager]
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  // Determine what to show - SIMPLE APPROACH WITH DEDUPLICATION
  const hasUserResults = paginationState.isSearchActive && paginationState.searchResults.users.length > 0;
  const showNoResults = paginationState.isSearchActive && paginationState.searchResults.totalResults === 0;
  
  // Use simple filtered posts if available, otherwise use pagination system
  // FIXED: Check if filters are active, including search query and creator filter
  const hasActiveFilters = 
    (currentFilters.query && currentFilters.query.trim()) ||
    (currentFilters.postType && currentFilters.postType !== 'all') ||
    (currentFilters.sortBy && currentFilters.sortBy !== 'recent') ||
    (currentFilters.timeRange && currentFilters.timeRange !== 'all') ||
    (currentFilters.creatorId && currentFilters.creatorId.trim());
  
  const isUsingSimpleFilter = hasActiveFilters;
  
  // Ensure no duplicates in display posts
  console.log(`🔍 DISPLAY DEBUG: isUsingSimpleFilter=${isUsingSimpleFilter}, hasActiveFilters=${hasActiveFilters}`);
  console.log(`🔍 DISPLAY DEBUG: filteredPosts.length=${filteredPosts.length}, filterPage=${filterPage}`);
  console.log(`🔍 DISPLAY DEBUG: currentFilters=`, currentFilters);
  
  const rawDisplayPosts = isUsingSimpleFilter 
    ? filteredPosts.slice(0, filterPage * POSTS_PER_PAGE)
    : paginationState.paginatedPosts;
  
  console.log(`🔍 DISPLAY DEBUG: rawDisplayPosts.length=${rawDisplayPosts.length}`);
  const displayPosts = deduplicatePosts(rawDisplayPosts);
  console.log(`🔍 DISPLAY DEBUG: displayPosts.length=${displayPosts.length} (after deduplication)`);
  
  const totalFilteredPosts = isUsingSimpleFilter 
    ? filteredPosts.length 
    : paginationState.displayPosts.length;
  const hasMorePosts = isUsingSimpleFilter
    ? (filterPage * POSTS_PER_PAGE) < filteredPosts.length
    : paginationState.hasMorePosts;

  return (
    <MainLayout>
      <div className="min-h-screen p-4 bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-6 text-center">Community Board</h1>



        {/* Post Creation Form - Expandable */}
        <div className="max-w-2xl mx-auto mb-8">
          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsPostFormExpanded(!isPostFormExpanded)}
            className={`w-full bg-gray-800 hover:bg-gray-750 rounded-lg shadow-lg p-4 transition-all duration-200 border ${
              isPostFormExpanded ? "border-blue-600 bg-gray-750" : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{isPostFormExpanded ? "✏️" : "➕"}</span>
                <div className="text-left">
                  <p className="text-white font-semibold flex items-center gap-2">
                    {isPostFormExpanded ? "Create New Post" : "Create a New Post"}
                    {/* Indicator badge for unsaved content */}
                    {!isPostFormExpanded && (
                      (activeTab === "text" && textContent) || 
                      (activeTab === "audio" && (selectedAudioFile || audioDescription))
                    ) && (
                      <span className="bg-yellow-600 text-white text-xs px-2 py-0.5 rounded-full">
                        Draft
                      </span>
                    )}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {isPostFormExpanded 
                      ? "Share your thoughts or music with the community" 
                      : ((activeTab === "text" && textContent) || 
                         (activeTab === "audio" && (selectedAudioFile || audioDescription))) 
                        ? "You have unsaved content - click to continue"
                        : "Click to share text or audio content"}
                    {!isPostFormExpanded && (
                      <span className="hidden md:inline text-gray-500 text-xs ml-2">
                        (Alt+N)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                  isPostFormExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {/* Expandable Content with smooth animation */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isPostFormExpanded ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0"
            }`}
            style={{
              transitionProperty: "max-height, opacity, margin-top"
            }}
          >
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("text");
                    // Clear audio-specific content when switching to text
                    if (activeTab === "audio") {
                      setSelectedAudioFile(null);
                      setAudioDescription("");
                    }
                  }}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "text"
                      ? "bg-gray-700 text-white border-b-2 border-blue-500"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-750"
                  }`}
                >
                  📝 Text Post
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("audio");
                    // Clear text content when switching to audio
                    if (activeTab === "text") {
                      setTextContent("");
                    }
                  }}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "audio"
                      ? "bg-gray-700 text-white border-b-2 border-blue-500"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-750"
                  }`}
                >
                  🎵 Audio Post
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <form onSubmit={handleSubmit}>
                  {activeTab === "text" ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="textContent"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      What&apos;s on your mind?
                    </label>
                    <textarea
                      id="textContent"
                      className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white
                        focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                      placeholder="Share your thoughts about AI music, your latest creations, or connect with the community..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      maxLength={2000}
                      required
                      disabled={isSubmitting}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-400">
                        {textContent.length}/2000 characters
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Select Audio File
                    </label>
                    <AudioUploadErrorBoundary>
                      <AudioUpload
                        onFileSelect={handleAudioFileSelect}
                        onFileRemove={handleAudioFileRemove}
                        disabled={isSubmitting}
                        enableCompression={true}
                        compressionQuality="medium"
                        maxFileSize={50 * 1024 * 1024} // 50MB limit
                      />
                    </AudioUploadErrorBoundary>
                  </div>

                  <div>
                    <label
                      htmlFor="audioDescription"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Description{" "}
                      <span className="text-gray-500">(optional)</span>
                    </label>
                    <textarea
                      id="audioDescription"
                      className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white
                        focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                      placeholder="Tell us about your AI music creation... What tools did you use? What inspired this piece?"
                      value={audioDescription}
                      onChange={(e) => setAudioDescription(e.target.value)}
                      maxLength={2000}
                      disabled={isSubmitting}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-400">
                        {audioDescription.length}/2000 characters
                      </span>
                    </div>
                  </div>
                    </div>
                  )}
                  {/* Error Display */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setIsPostFormExpanded(false)}
                      className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium
                        disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      disabled={
                        isSubmitting ||
                        (activeTab === "audio" && !selectedAudioFile)
                      }
                    >
                      {isSubmitting ? (
                        <span className="flex items-center space-x-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>
                            {activeTab === "audio" ? "Uploading..." : "Posting..."}
                          </span>
                        </span>
                      ) : (
                        `Create ${activeTab === "text" ? "Text" : "Audio"} Post`
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Discovery Section */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <SearchErrorBoundary>
            <SearchBar
              key={searchBarKey} // Force re-mount when key changes
              onSearch={(results, query) => {
                handleSearch(query, currentFilters);
              }}
              onFiltersChange={handleFiltersChange}
              className="w-full"
              currentQuery={currentSearchQuery}
              initialFilters={currentFilters}
              isLoadingMore={paginationState.fetchInProgress || paginationState.isLoadingMore}
            />
          </SearchErrorBoundary>

          {/* Active Filters Display Bar */}
          {(filteredPosts.length > 0 || 
            currentFilters.query ||
            currentFilters.creatorId ||
            (currentFilters.postType && currentFilters.postType !== 'all') ||
            (currentFilters.sortBy && currentFilters.sortBy !== 'recent') ||
            (currentFilters.timeRange && currentFilters.timeRange !== 'all')) && (
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 text-sm text-gray-300 flex-wrap gap-2">
                {/* Creator Filter Badge - MOST IMPORTANT, SHOW FIRST */}
                {currentFilters.creatorId && currentFilters.creatorUsername && (
                  <span className="bg-pink-900/30 text-pink-400 px-3 py-1 rounded-full text-xs font-medium border border-pink-700 flex items-center gap-1.5">
                    <span>👤</span>
                    <span>Creator: {currentFilters.creatorUsername}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearCreatorFilter();
                      }}
                      className="ml-1 hover:text-pink-200 transition-colors"
                      title="Clear creator filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                
                {/* Search Query Badge */}
                {currentFilters.query && (
                  <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-xs font-medium border border-blue-700">
                    🔍 Search: "{currentFilters.query}"
                  </span>
                )}
                
                {/* Content Type Badge */}
                {currentFilters.postType && currentFilters.postType !== 'all' && (
                  <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-700 flex items-center gap-1.5">
                    <span>📁</span>
                    <span>{currentFilters.postType === 'audio' ? 'Audio Posts' : currentFilters.postType === 'text' ? 'Text Posts' : 'Creators'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPostTypeFilter();
                      }}
                      className="ml-1 hover:text-green-200 transition-colors"
                      title="Clear content type filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                
                {/* Sort By Badge */}
                {currentFilters.sortBy && currentFilters.sortBy !== 'recent' && (
                  <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-xs font-medium border border-purple-700 flex items-center gap-1.5">
                    <span>⬇️</span>
                    <span>{
                      currentFilters.sortBy === 'oldest' ? 'Oldest First' :
                      currentFilters.sortBy === 'popular' ? 'Most Popular' :
                      currentFilters.sortBy === 'likes' ? 'Most Liked' :
                      currentFilters.sortBy === 'relevance' ? 'Most Relevant' :
                      'Recent'
                    }</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSortByFilter();
                      }}
                      className="ml-1 hover:text-purple-200 transition-colors"
                      title="Clear sort by filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                
                {/* Time Range Badge */}
                {currentFilters.timeRange && currentFilters.timeRange !== 'all' && (
                  <span className="bg-orange-900/30 text-orange-400 px-3 py-1 rounded-full text-xs font-medium border border-orange-700 flex items-center gap-1.5">
                    <span>📅</span>
                    <span>{
                      currentFilters.timeRange === 'today' ? 'Today' :
                      currentFilters.timeRange === 'week' ? 'This Week' :
                      'This Month'
                    }</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearTimeRangeFilter();
                      }}
                      className="ml-1 hover:text-orange-200 transition-colors"
                      title="Clear time range filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
                
                {/* REMOVED: Results Count per requirements */}
              </div>

              <button
                onClick={clearSearch}
                className="text-xs text-blue-400 hover:text-blue-300 px-3 py-1 rounded-full hover:bg-blue-900/20 transition-colors font-medium"
              >
                ✕ Clear All
              </button>
            </div>
          )}
        </div>
        {/* Search Results Users */}
        {hasUserResults && (
          <div className="max-w-2xl mx-auto mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">
              Search Results: Creators
            </h3>
            <div className="grid gap-4">
              {(paginationState.searchResults.users as (UserProfile & { posts_count: number; followers_count: number; user_id: string })[]).map((searchUser) => {
                const totalPosts = searchUser.posts_count || 0;

                return (
                  <div
                    key={searchUser.id}
                    className={`p-4 rounded-lg flex items-center justify-between transition-all duration-300 ${
                      currentFilters.creatorId === searchUser.user_id
                        ? 'bg-blue-900/30 border-2 border-blue-500 shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                        : 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {searchUser.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-gray-200 font-medium">
                            {searchUser.username}
                          </p>
                          {currentFilters.creatorId === searchUser.user_id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-blue-100 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-blue-200 rounded-full mr-1"></span>
                              Active Filter
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {totalPosts} posts
                        </p>
                        <p className="text-gray-500 text-xs">
                          Member since{" "}
                          {new Date(searchUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <CreatorFilterButton
                        creatorId={searchUser.user_id}
                        creatorUsername={searchUser.username}
                        onFilterByCreator={handleCreatorFilter}
                        isActive={currentFilters.creatorId === searchUser.user_id}
                        size="sm"
                        variant="secondary"
                      />
                      {user && user.id !== searchUser.user_id ? (
                        <FollowButton
                          userId={searchUser.user_id}
                          username={searchUser.username}
                          size="sm"
                          variant="secondary"
                          showFollowerCount={false}
                        />
                      ) : user && user.id === searchUser.user_id ? (
                        <div className="text-gray-500 text-sm px-3 py-1 bg-gray-700 rounded">
                          That&apos;s you!
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm px-3 py-1">
                          Sign in to follow
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {showNoResults && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400 mb-2">
                No results found for &quot;{currentSearchQuery}&quot;
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Try different keywords, adjust your filters, or check your
                spelling.
              </p>
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}
        {/* Creator Filter Indicator */}
        {currentFilters.creatorId && currentFilters.creatorUsername && (
          <CreatorFilterIndicator
            creatorUsername={currentFilters.creatorUsername}
            onClearFilter={clearCreatorFilter}
          />
        )}

        {/* Posts List */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-6">
            {paginationState.isSearchActive ? "Search Results: Posts" : "Community Posts"}
            {totalFilteredPosts > 0 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({totalFilteredPosts}{" "}
                {totalFilteredPosts === 1 ? "post" : "posts"})
              </span>
            )}
          </h2>

          {!showNoResults && totalFilteredPosts === 0 && !paginationState.fetchInProgress && !paginationState.isLoadingMore ? (
            // Check if this is a creator filter with no results
            currentFilters.creatorId && currentFilters.creatorUsername ? (
              <CreatorFilterNoResults
                creatorUsername={currentFilters.creatorUsername}
                onClearCreatorFilter={clearCreatorFilter}
                onClearAllFilters={clearSearch}
                hasOtherFilters={Boolean(
                  (currentFilters.query && currentFilters.query.trim() !== '') ||
                  (currentFilters.postType && currentFilters.postType !== 'all') ||
                  (currentFilters.sortBy && currentFilters.sortBy !== 'recent') ||
                  (currentFilters.timeRange && currentFilters.timeRange !== 'all')
                )}
              />
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <div className="text-4xl mb-4">🎵</div>
                <p className="text-gray-400 mb-2">
                  {paginationState.isSearchActive
                    ? "No posts match your current search and filters."
                    : "No posts yet. Be the first to share!"}
                </p>
                <p className="text-sm text-gray-500">
                  {paginationState.isSearchActive
                    ? "Try adjusting your search terms or filters."
                    : "Share your AI music creations or thoughts with the community."}
                </p>
              </div>
            )
          ) : (paginationState.fetchInProgress || paginationState.isLoadingMore) && paginationState.allPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading posts...</p>
            </div>
          ) : !showNoResults ? (
            <div className="space-y-6">
              {/* Posts Display */}
              <PaginationErrorBoundary>
                {displayPosts.map((post) => (
                  <PostErrorBoundary key={post.id} postId={post.id}>
                    <PostItem
                      post={post}
                      currentUserId={user?.id}
                      onDelete={handleDeletePost}
                      showWaveform={true}
                    />
                  </PostErrorBoundary>
                ))}
              </PaginationErrorBoundary>

              {/* Enhanced Load More Button - SIMPLE APPROACH */}
              {hasMorePosts && (
                <LoadMoreErrorBoundary>
                  {isUsingSimpleFilter ? (
                    // Simple Show More button for filtered content
                    <div className="text-center py-8">
                      <button
                        onClick={handleFilteredLoadMore}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all duration-300 flex items-center space-x-3 mx-auto"
                      >
                        <span className="text-xl">📋</span>
                        <span className="font-semibold">
                          Show More ({Math.min(POSTS_PER_PAGE, filteredPosts.length - displayPosts.length)})
                        </span>

                      </button>
                      <div className="mt-4 text-sm text-gray-400">
                        Showing {displayPosts.length} of {filteredPosts.length} filtered posts
                      </div>
                    </div>
                  ) : (
                    // Original LoadMoreButton for unfiltered content
                    <LoadMoreButton
                      paginationState={paginationState}
                      onLoadMore={handleLoadMore}
                      isLoading={paginationState.fetchInProgress || paginationState.isLoadingMore}
                      hasMorePosts={paginationState.hasMorePosts}
                      totalFilteredPosts={totalFilteredPosts}
                      currentlyShowing={displayPosts.length}
                    />
                  )}
                </LoadMoreErrorBoundary>
              )}
            </div>
          ) : null}

          {/* End of Posts Message */}
          {!paginationState.isSearchActive && !paginationState.hasMorePosts && paginationState.allPosts.length > 0 && (
            <div className="text-center py-8">
              <button
                onClick={() =>
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
              >
                Back to Top
              </button>
            </div>
          )}
        </div>


      </div>

      {/* Performance Monitoring Panel */}
      {showPerformancePanel && (
        <PerformanceMonitoringPanel
          isVisible={showPerformancePanel}
          onToggle={() => setShowPerformancePanel(!showPerformancePanel)}
        />
      )}

      {/* Floating Action Button for Mobile - Quick Post Creation */}
      <button
        onClick={() => setIsPostFormExpanded(true)}
        className={`md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-200 hover:scale-110 ${
          isPostFormExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="Create new post"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </MainLayout>
  );
}
