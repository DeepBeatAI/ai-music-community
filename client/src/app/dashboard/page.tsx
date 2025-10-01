"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MainLayout from "@/components/layout/MainLayout";
import PostItem from "@/components/PostItem";
import AudioUpload from "@/components/AudioUpload";
import SearchBar from "@/components/SearchBar";
import FollowButton from "@/components/FollowButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import PerformanceMonitoringPanel from "@/components/PerformanceMonitoringPanel";
import LoadMoreButton from "@/components/LoadMoreButton";
import type { SearchFilters } from "@/utils/search";
import {
  fetchPosts,
  createTextPost,
  createAudioPost,
  deletePost,
} from "@/utils/posts";
import { searchContent } from "@/utils/search";
import { createUnifiedPaginationState } from "@/utils/unifiedPaginationState";
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

  // SIMPLE FILTER STATE - Direct approach
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [filterPage, setFilterPage] = useState(1);

  // Refs for tracking state
  const hasInitiallyLoaded = useRef(false);

  // Deduplicate posts by ID
  const deduplicatePosts = useCallback((posts: any[]) => {
    const seen = new Set();
    return posts.filter((post: any) => {
      if (seen.has(post.id)) {
        return false;
      }
      seen.add(post.id);
      return true;
    });
  }, []);

  // Apply filters directly - SIMPLE APPROACH
  const applyFiltersDirectly = useCallback((filters: SearchFilters, allPosts: Post[]) => {
    console.log('🔧 Applying filters:', filters, 'to', allPosts.length, 'posts');
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
    
    console.log(`✅ Final filtered count: ${filtered.length}`);
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

  // Update filtered posts when allPosts changes (to include newly loaded posts)
  useEffect(() => {
    if (filteredPosts.length > 0 && Object.keys(currentFilters).length > 0) {
      const deduplicatedAllPosts = deduplicatePosts(paginationState.allPosts);
      const newFiltered = applyFiltersDirectly(currentFilters, deduplicatedAllPosts);
      const deduplicatedFiltered = deduplicatePosts(newFiltered);
      
      // Only update if the filtered posts actually changed
      if (deduplicatedFiltered.length !== filteredPosts.length) {
        setFilteredPosts(deduplicatedFiltered);
      }
    }
  }, [paginationState.allPosts, currentFilters, applyFiltersDirectly, deduplicatePosts]);

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

  // Handle filters change - SIMPLE APPROACH WITH MINIMAL DEBOUNCING
  const handleFiltersChange = useCallback(
    async (filters: SearchFilters) => {
      setCurrentFilters(filters);
      setFilterPage(1); // Reset to first page
      
      // FIXED: Include search query in active filters check
      const hasActiveFilters = 
        (filters.query && filters.query.trim()) ||
        (filters.postType && filters.postType !== 'all') ||
        (filters.sortBy && filters.sortBy !== 'recent') ||
        (filters.timeRange && filters.timeRange !== 'all');
      
      // FIXED: Handle search separately for creator results
      if (filters.query && filters.query.trim()) {
        // Perform search for users when there's a query
        try {
          const results = await searchContent(filters, 0, 200);
          // Update search results for displaying creators
          paginationManager.updateSearch(results, filters.query, filters);
        } catch (error) {
          console.error('Search error:', error);
        }
      } else {
        // Clear search results if no query
        paginationManager.clearSearch();
      }
      
      if (hasActiveFilters) {
        // Get current posts and ensure deduplication
        let allPosts = deduplicatePosts(paginationState.allPosts);
        
        // Ensure we have enough posts for filtering
        if (allPosts.length < 50) {
          try {
            // Track which pages we've already loaded to avoid duplicates
            const currentPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
            
            // Fetch more pages to ensure good filtering
            for (let i = currentPages + 1; i <= currentPages + 3; i++) {
              const { posts: morePosts, hasMore } = await fetchPosts(i, POSTS_PER_PAGE, user?.id);
              if (morePosts.length > 0) {
                // Add new posts and deduplicate
                const combinedPosts = [...allPosts, ...morePosts];
                allPosts = deduplicatePosts(combinedPosts);
                
                // Update pagination manager with deduplicated posts
                paginationManager.updatePosts({
                  newPosts: morePosts,
                  resetPagination: false,
                  updateMetadata: {
                    totalServerPosts: hasMore ? (i * POSTS_PER_PAGE) + 1 : i * POSTS_PER_PAGE,
                    loadedServerPosts: allPosts.length,
                    currentBatch: i,
                    lastFetchTimestamp: Date.now(),
                  },
                });
              }
              if (!hasMore) break;
            }
          } catch (error) {
            console.error('Error fetching posts for filtering:', error);
          }
        }
        
        // Apply filters directly to deduplicated posts
        const filtered = applyFiltersDirectly(filters, allPosts);
        const deduplicatedFiltered = deduplicatePosts(filtered);
        
        setFilteredPosts(deduplicatedFiltered);
      } else {
        // No active filters - clear filtered posts
        setFilteredPosts([]);
        paginationManager.clearSearch();
      }
    },
    [paginationState.allPosts, user?.id, paginationManager, applyFiltersDirectly, deduplicatePosts]
  );
      


  // Clear search
  const clearSearch = useCallback(async () => {
    console.log('🧹 Dashboard: Clearing all search and filters');
    setCurrentSearchQuery("");
    setCurrentFilters({});
    setFilteredPosts([]);
    setFilterPage(1);
    paginationManager.clearSearch();
    // Force refresh to show unfiltered posts
    await loadPosts(1, false);
  }, [paginationManager, loadPosts]);

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
  // FIXED: Check if filters are active, including search query
  const hasActiveFilters = 
    (currentFilters.query && currentFilters.query.trim()) ||
    (currentFilters.postType && currentFilters.postType !== 'all') ||
    (currentFilters.sortBy && currentFilters.sortBy !== 'recent') ||
    (currentFilters.timeRange && currentFilters.timeRange !== 'all');
  
  const isUsingSimpleFilter = hasActiveFilters;
  
  // Ensure no duplicates in display posts
  const rawDisplayPosts = isUsingSimpleFilter 
    ? filteredPosts.slice(0, filterPage * POSTS_PER_PAGE)
    : paginationState.paginatedPosts;
  const displayPosts = deduplicatePosts(rawDisplayPosts);
  
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
              onSearch={(results, query) => {
                handleSearch(query, paginationState.currentSearchFilters);
              }}
              onFiltersChange={handleFiltersChange}
              className="w-full"
              currentQuery={currentSearchQuery}
              initialFilters={paginationState.currentSearchFilters}
              isLoadingMore={paginationState.fetchInProgress || paginationState.isLoadingMore}
            />
          </SearchErrorBoundary>

          {/* Active Filters Display Bar */}
          {(filteredPosts.length > 0 || 
            currentFilters.query ||
            (currentFilters.postType && currentFilters.postType !== 'all') ||
            (currentFilters.sortBy && currentFilters.sortBy !== 'recent') ||
            (currentFilters.timeRange && currentFilters.timeRange !== 'all')) && (
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 text-sm text-gray-300 flex-wrap gap-2">
                {/* Search Query Badge */}
                {currentFilters.query && (
                  <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-xs font-medium border border-blue-700">
                    🔍 Search: "{currentFilters.query}"
                  </span>
                )}
                
                {/* Content Type Badge */}
                {currentFilters.postType && currentFilters.postType !== 'all' && (
                  <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-700">
                    📁 {currentFilters.postType === 'audio' ? 'Audio Posts' : currentFilters.postType === 'text' ? 'Text Posts' : 'Creators'}
                  </span>
                )}
                
                {/* Sort By Badge */}
                {currentFilters.sortBy && currentFilters.sortBy !== 'recent' && (
                  <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-xs font-medium border border-purple-700">
                    ⬇️ {
                      currentFilters.sortBy === 'oldest' ? 'Oldest First' :
                      currentFilters.sortBy === 'popular' ? 'Most Popular' :
                      currentFilters.sortBy === 'likes' ? 'Most Liked' :
                      currentFilters.sortBy === 'relevance' ? 'Most Relevant' :
                      'Recent'
                    }
                  </span>
                )}
                
                {/* Time Range Badge */}
                {currentFilters.timeRange && currentFilters.timeRange !== 'all' && (
                  <span className="bg-orange-900/30 text-orange-400 px-3 py-1 rounded-full text-xs font-medium border border-orange-700">
                    📅 {
                      currentFilters.timeRange === 'today' ? 'Today' :
                      currentFilters.timeRange === 'week' ? 'This Week' :
                      'This Month'
                    }
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
                    className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {searchUser.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-200 font-medium">
                          {searchUser.username}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {totalPosts} posts
                        </p>
                        <p className="text-gray-500 text-xs">
                          Member since{" "}
                          {new Date(searchUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

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
