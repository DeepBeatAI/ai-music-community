'use client'
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import PostItem from '@/components/PostItem';
import AudioUpload from '@/components/AudioUpload';
import SearchBar from '@/components/SearchBar';
import ActivityFeed from '@/components/ActivityFeed';
import FollowButton from '@/components/FollowButton';
import PerformanceMonitoringPanel from '@/components/PerformanceMonitoringPanel';
import { supabase } from '@/lib/supabase';
import { Post, UserProfile } from '@/types';
import { SearchResults, SearchFilters } from '@/utils/search';
import { validatePostContent } from '@/utils/validation';
import { uploadAudioFile } from '@/utils/audio';
import type { CompressionResult } from '@/utils/serverAudioCompression';

// Enhanced error handling imports
import { 
  ErrorBoundary, 
  PaginationErrorBoundary, 
  LoadMoreErrorBoundary, 
  SearchErrorBoundary, 
  PostErrorBoundary, 
  AudioUploadErrorBoundary 
} from '@/components/ErrorBoundary';
import ErrorDisplay from '@/components/ErrorDisplay';
import { usePaginationErrorState } from '@/hooks/useErrorState';
import { defaultErrorRecovery } from '@/utils/errorRecovery';

// Simplified performance monitoring imports - FIXED
import { 
  usePerformanceMonitoring
} from '@/hooks/usePerformanceMonitoring';

// Import unified pagination system
import { UnifiedPaginationStateManager, createUnifiedPaginationState } from '@/utils/unifiedPaginationState';
import { UnifiedLoadMoreHandler, createLoadMoreHandler } from '@/utils/loadMoreHandler';
import { LoadMoreStateMachine, createLoadMoreStateMachine } from '@/utils/loadMoreStateMachine';
import { PaginationState, LoadMoreResult } from '@/types/pagination';

type PostType = 'text' | 'audio';

// Constants
const POSTS_PER_PAGE = 15;

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // Simplified performance monitoring setup - FIXED
  const performanceMonitoring = usePerformanceMonitoring({
    componentName: 'DashboardPage',
    trackRenders: false,  // Disabled to prevent loops
    trackEffects: false,  // Disabled to prevent loops
    autoStart: false,     // Disabled to prevent loops
    reportInterval: 0     // Disabled to prevent loops
  });

  // Performance monitoring panel state
  const [showPerformancePanel, setShowPerformancePanel] = useState(
    process.env.NODE_ENV === 'development' && process.env.REACT_APP_SHOW_PERFORMANCE_PANEL === 'true'
  );
  
  // Post creation state
  const [activeTab, setActiveTab] = useState<PostType>('text');
  const [textContent, setTextContent] = useState('');
  const [audioDescription, setAudioDescription] = useState('');
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | undefined>();
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  
  // Unified pagination system state
  const paginationManagerRef = useRef<UnifiedPaginationStateManager | null>(null);
  const loadMoreHandlerRef = useRef<UnifiedLoadMoreHandler | null>(null);
  const stateMachineRef = useRef<LoadMoreStateMachine | null>(null);
  
  // Local state for UI
  const [paginationState, setPaginationState] = useState<PaginationState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Enhanced error state management
  const {
    errorState,
    setError,
    clearError
  } = usePaginationErrorState();
  
  // Legacy error state for backward compatibility
  const [error, setLegacyError] = useState('');
  
  // Enhanced ref-based initial load tracking to prevent multiple fetches
  const hasInitiallyLoaded = useRef(false);
  const initialLoadAttempted = useRef(false);
  
  // Search state (still needed for UI)
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize unified pagination system - FIXED: Only run once
  useEffect(() => {
    if (!paginationManagerRef.current) {
      console.log('🚀 Dashboard: Initializing pagination system');
      
      // Create pagination manager
      paginationManagerRef.current = createUnifiedPaginationState({
        postsPerPage: 15,
        minResultsForFilter: 10,
        maxAutoFetchPosts: 100,
        fetchTimeout: 10000,
      });

      // Create state machine
      stateMachineRef.current = createLoadMoreStateMachine('idle');

      // Create load more handler
      loadMoreHandlerRef.current = createLoadMoreHandler(
        paginationManagerRef.current.getState(),
        stateMachineRef.current
      );

      // Subscribe to state changes
      paginationManagerRef.current.subscribe((newState) => {
        setPaginationState(newState);
      });

      // Set initial state
      setPaginationState(paginationManagerRef.current.getState());
    }
    
    // Cleanup on unmount
    return () => {
      if (paginationManagerRef.current) {
        paginationManagerRef.current.cleanup();
      }
    };
  }, []); // Empty dependency array - runs only once

  const fetchPosts = useCallback(async (page: number = 1, isLoadMore: boolean = false) => {
    if (!paginationManagerRef.current) {
      console.warn('⚠️ Dashboard: fetchPosts called but pagination manager not initialized');
      return;
    }

    // Enhanced initial load tracking validation
    if (!isLoadMore && hasInitiallyLoaded.current && page === 1) {
      console.warn('⚠️ Dashboard: Attempted duplicate initial load prevented');
      return;
    }

    try {
      // Set loading state with discrimination between load more and initial fetch
      paginationManagerRef.current.setLoadingState(true, isLoadMore);
      
      console.log(`📊 Fetching posts - Page ${page} (15 per page) - Load More: ${isLoadMore}`);
      
      // EGRESS OPTIMIZATION: Only fetch the posts we need
      const startRange = (page - 1) * 15;
      const endRange = startRange + 15 - 1;
      
      console.log(`🎯 Egress optimization: Fetching posts ${startRange}-${endRange}`);
      
      // Use manual join approach since foreign key relationship might not be properly configured
      const { data: postsData, error: postsError, count } = await supabase
        .from('posts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(startRange, endRange);

      if (postsError) throw postsError;

      let data: any[] = [];
      let error: any = null;
      
      if (postsData && postsData.length > 0) {
        // Get unique user IDs from posts
        const userIds = [...new Set(postsData.map(post => post.user_id))];
        
        // Fetch usernames for these user IDs
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('user_id, username')
          .in('user_id', userIds);

        if (usersError) {
          console.warn('Could not fetch user profiles:', usersError);
          // Continue with posts but without usernames
          data = postsData.map(post => ({
            ...post,
            user_profiles: { username: 'Unknown User', user_id: post.user_id, created_at: '', updated_at: '' }
          }));
        } else {
          // Create a map for quick lookup
          const usersMap = (usersData || []).reduce((acc: Record<string, any>, user: any) => {
            acc[user.user_id] = user;
            return acc;
          }, {} as Record<string, any>);
          
          // Join the data manually
          data = postsData.map(post => ({
            ...post,
            user_profiles: usersMap[post.user_id] || { username: 'Unknown User', user_id: post.user_id, created_at: '', updated_at: '' }
          }));
        }
      } else {
        data = postsData || [];
      }

      if (error) throw error;
      
      // Update total count
      if (count !== null) {
        paginationManagerRef.current.updateTotalPostsCount(count);
        console.log(`📊 Total posts: ${count}`);
      }
      
      // Add interaction data for each post with better error handling
      const postsWithInteractions = await Promise.all(
        (data || []).map(async (post) => {
          try {
            // Initialize default values
            let likeCount = 0;
            let userLiked = false;

            // Try to get like count - use a more specific approach
            try {
              const { count, error: likeCountError } = await supabase
                .from('post_likes')
                .select('id', { count: 'exact', head: true })
                .eq('post_id', post.id);

              if (!likeCountError) {
                likeCount = count || 0;
              }
            } catch (likeError) {
              console.warn('Could not fetch like count for post:', post.id);
              // Use default value of 0
            }

            // Try to get user's like status only if user exists
            if (user) {
              try {
                const { data: likeData, error: userLikeError } = await supabase
                  .from('post_likes')
                  .select('id')
                  .eq('post_id', post.id)
                  .eq('user_id', user.id)
                  .limit(1)
                  .maybeSingle();

                if (!userLikeError && likeData) {
                  userLiked = true;
                }
              } catch (userLikeError) {
                console.warn('Could not fetch user like status for post:', post.id);
                // Use default value of false
              }
            }

            return {
              ...post,
              like_count: likeCount,
              liked_by_user: userLiked
            };
          } catch (interactionError) {
            console.warn('Error fetching interaction data for post:', post.id, interactionError);
            return {
              ...post,
              like_count: 0,
              liked_by_user: false
            };
          }
        })
      );

      // Update pagination state with new posts
      paginationManagerRef.current.updatePosts({
        newPosts: postsWithInteractions,
        resetPagination: !isLoadMore,
        updateMetadata: {
          lastFetchTimestamp: Date.now(),
          currentBatch: page,
        },
      });

      console.log(`${isLoadMore ? '📈 Appended' : '🔄 Loaded'} ${postsWithInteractions.length} posts`);
      
    } catch (error) {
      console.error('❌ Dashboard: Error fetching posts:', error);
      
      // Enhanced error handling for initial load failures
      if (!isLoadMore && page === 1) {
        console.error('❌ Dashboard: Initial load failed, resetting tracking flags for retry');
        // Reset tracking flags to allow retry on initial load failure
        hasInitiallyLoaded.current = false;
        initialLoadAttempted.current = false;
      }
      
      // Enhanced error handling with recovery
      const errorMessage = 'Failed to fetch posts. Please try again.';
      setError(error instanceof Error ? error : new Error(String(error)), 'recoverable', 'FETCH_POSTS_FAILED');
      setLegacyError(errorMessage);
    } finally {
      // Clear loading state
      if (paginationManagerRef.current) {
        paginationManagerRef.current.setLoadingState(false);
      }
    }
  }, [user, setError]);

  // Enhanced auth and initial data loading - FIXED: Removed problematic dependencies
  useEffect(() => {
    // Early return if still loading authentication
    if (loading) {
      console.log('🔄 Dashboard: Waiting for auth to complete...');
      return;
    }
    
    // Redirect unauthenticated users
    if (!user) {
      console.log('🚫 Dashboard: No user found, redirecting to login');
      router.replace('/login');
      return;
    }
    
    // Enhanced initial load tracking with multiple safeguards
    const shouldPerformInitialLoad = (
      paginationManagerRef.current && // Pagination system must be initialized
      !hasInitiallyLoaded.current && // Haven't loaded yet
      !initialLoadAttempted.current   // Haven't even attempted to load
    );
    
    if (shouldPerformInitialLoad) {
      console.log('🚀 Dashboard: Performing initial data load');
      
      // Set attempt flag first, but wait to set loaded flag until after fetch
      initialLoadAttempted.current = true;
      
      // Perform the initial fetch
      fetchPosts().then(() => {
        console.log('✅ Dashboard: Initial data load completed successfully');
        // Set loaded flag only after successful fetch
        hasInitiallyLoaded.current = true;
      }).catch((error) => {
        console.error('❌ Dashboard: Initial data load failed:', error);
        // Reset flags on failure to allow retry
        initialLoadAttempted.current = false;
        hasInitiallyLoaded.current = false;
      });
    }
  }, [user, loading, router, fetchPosts]); // FIXED: Removed paginationState from dependencies

  // REMOVED: The problematic state validation useEffect that was causing infinite loops
  // State validation is now handled internally by the UnifiedPaginationStateManager

  // Unified Load More handler
  const handleLoadMore = useCallback(async () => {
    if (!loadMoreHandlerRef.current || !paginationManagerRef.current) {
      console.log('🚫 Load more blocked: Handlers not initialized');
      return;
    }

    console.log('🚀 Load more triggered');
    
    try {
      // Use unified handler to determine strategy and execute
      const result: LoadMoreResult = await loadMoreHandlerRef.current.handleLoadMore();
      
      if (result.success) {
        console.log(`✅ Load more successful: ${result.strategy}, ${result.newPosts.length} new posts`);
        
        // For server-fetch strategy, we need to fetch the actual posts
        if (result.strategy === 'server-fetch') {
          const currentState = paginationManagerRef.current.getState();
          const nextPage = Math.ceil(currentState.allPosts.length / 15) + 1;
          await fetchPosts(nextPage, true);
        }
        // For client-paginate, the unified system handles everything internally
        
      } else {
        console.error('❌ Load more failed:', result.error);
        const loadMoreError = result.error || 'Failed to load more posts';
        setError(loadMoreError, 'recoverable', 'LOAD_MORE_FAILED');
        setLegacyError(loadMoreError);
      }
    } catch (error) {
      console.error('❌ Load more error:', error);
      const loadMoreException = 'Failed to load more posts. Please try again.';
      setError(loadMoreException, 'recoverable', 'LOAD_MORE_EXCEPTION');
      setLegacyError(loadMoreException);
    }
  }, [fetchPosts, setError]);
  
  // Search and filter handlers (simplified)
  const handleSearch = useCallback((results: SearchResults, query: string) => {
    if (!paginationManagerRef.current) return;
    try {
      const safeResults = results || { posts: [], users: [], totalResults: 0 };
      const safePosts = Array.isArray(safeResults.posts) ? safeResults.posts : [];
      const safeUsers = Array.isArray(safeResults.users) ? safeResults.users : [];
      
      const searchResults = {
        posts: safePosts,
        users: safeUsers,
        totalResults: safeResults.totalResults || (safePosts.length + safeUsers.length)
      };

      setSearchQuery(query || '');
      paginationManagerRef.current.updateSearch(searchResults, query || '', {});
    } catch (error) {
      console.error('❌ Dashboard: Search handling error:', error);
      const searchHandlingError = 'Failed to update search. Please try again.';
      setError(searchHandlingError, 'recoverable', 'SEARCH_HANDLING_ERROR');
      setLegacyError(searchHandlingError);
    }
  }, [setError]);

  const handleFiltersChange = useCallback((searchFilters: SearchFilters) => {
    if (!paginationManagerRef.current) return;
    try {
      const currentState = paginationManagerRef.current.getState();
      paginationManagerRef.current.updateSearch(
        currentState.searchResults,
        searchQuery,
        searchFilters
      );
    } catch (error) {
      console.error('❌ Dashboard: Filter handling error:', error);
      const filterHandlingError = 'Failed to update filters. Please try again.';
      setError(filterHandlingError, 'recoverable', 'FILTER_HANDLING_ERROR');
      setLegacyError(filterHandlingError);
    }
  }, [searchQuery, setError]);

  const clearSearch = useCallback(() => {
    if (!paginationManagerRef.current) return;
    setSearchQuery('');
    paginationManagerRef.current.clearSearch();
  }, []);

  // Post creation handlers (simplified)
  const handleAudioFileSelect = (file: File, duration?: number, compressionResult?: CompressionResult) => {
    setSelectedAudioFile(file);
    setAudioDuration(duration);
    setCompressionInfo(compressionResult || null);
    clearError();
    setLegacyError('');
  };

  const handleAudioFileRemove = () => {
    setSelectedAudioFile(null);
    setAudioDuration(undefined);
    setCompressionInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();
    setLegacyError('');

    if (!user) {
      const authError = 'You must be logged in to create a post.';
      setError(authError, 'recoverable', 'AUTH_REQUIRED');
      setLegacyError(authError);
      setIsSubmitting(false);
      return;
    }

    try {
      if (activeTab === 'text') {
        await handleTextPostSubmit();
      } else {
        await handleAudioPostSubmit();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextPostSubmit = async () => {
    try {
      const validationErrors = validatePostContent(textContent, 'text');
      if (validationErrors.length > 0) {
        const validationError = validationErrors[0];
        setError(validationError, 'recoverable', 'TEXT_CONTENT_VALIDATION_ERROR');
        setLegacyError(validationError);
        return;
      }

      if (!user?.id) {
        throw new Error('User ID is missing. Please log out and log back in.');
      }

      const postData = {
        content: textContent.trim(),
        user_id: user.id,
        post_type: 'text' as const
      };

      const { error: insertError } = await supabase
        .from('posts')
        .insert(postData);

      if (insertError) {
        // Handle specific errors but continue if it's just the trigger function missing
        if (insertError.code === '42883' || insertError.message?.includes('create_activity')) {
          console.log('Function error detected - checking if post was created anyway...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: existingPosts } = await supabase
            .from('posts')
            .select('id, content, created_at')
            .eq('user_id', user.id)
            .eq('content', textContent.trim())
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (existingPosts && existingPosts.length > 0) {
            console.log('Success! Post was created despite the trigger error');
            setTextContent('');
            await fetchPosts();
            return;
          }
        }
        
        throw new Error(`Database error: ${insertError.message || insertError.code || 'Unknown database error'}`);
      }

      setTextContent('');
      if (paginationManagerRef.current) {
        paginationManagerRef.current.reset();
        hasInitiallyLoaded.current = false;
        await fetchPosts(1, false);
      }
      
    } catch (error) {
      console.error('Error in handleTextPostSubmit:', error);
      if (error instanceof Error) {
        setError(error.message, 'recoverable', 'POST_CREATION_ERROR');
        setLegacyError(error.message);
      } else {
        const genericError = 'Failed to create post. Please try again.';
        setError(genericError, 'recoverable', 'POST_CREATION_UNKNOWN_ERROR');
        setLegacyError(genericError);
      }
      throw error;
    }
  };

  const handleAudioPostSubmit = async () => {
    try {
      if (!selectedAudioFile) {
        const fileError = 'Please select an audio file.';
        setError(fileError, 'recoverable', 'AUDIO_FILE_REQUIRED');
        setLegacyError(fileError);
        return;
      }

      const validationErrors = validatePostContent(audioDescription, 'audio');
      if (validationErrors.length > 0) {
        const validationError = validationErrors[0];
        setError(validationError, 'recoverable', 'AUDIO_CONTENT_VALIDATION_ERROR');
        setLegacyError(validationError);
        return;
      }

      const uploadResult = await uploadAudioFile(
        selectedAudioFile, 
        user!.id,
        compressionInfo || undefined
      );
      
      if (!uploadResult.success) {
        const uploadError = uploadResult.error || 'Failed to upload audio file.';
        setError(uploadError, 'recoverable', 'AUDIO_UPLOAD_ERROR');
        setLegacyError(uploadError);
        return;
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          content: audioDescription.trim(),
          user_id: user!.id,
          post_type: 'audio',
          audio_url: uploadResult.audioUrl,
          audio_filename: uploadResult.fileName,
          audio_file_size: uploadResult.fileSize,
          audio_duration: uploadResult.duration,
          audio_mime_type: uploadResult.mimeType
        });

      if (insertError && !insertError.message?.includes('function create_activity')) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      setAudioDescription('');
      setSelectedAudioFile(null);
      setAudioDuration(undefined);
      if (paginationManagerRef.current) {
        paginationManagerRef.current.reset();
        hasInitiallyLoaded.current = false;
        await fetchPosts(1, false);
      }
      
    } catch (error) {
      console.error('Error in handleAudioPostSubmit:', error);
      if (error instanceof Error) {
        setError(error.message, 'recoverable', 'AUDIO_POST_CREATION_ERROR');
        setLegacyError(error.message);
      } else {
        const genericError = 'Failed to create audio post. Please try again.';
        setError(genericError, 'recoverable', 'AUDIO_POST_CREATION_UNKNOWN_ERROR');
        setLegacyError(genericError);
      }
      throw error;
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      if (paginationManagerRef.current) {
        paginationManagerRef.current.reset();
        hasInitiallyLoaded.current = false;
        await fetchPosts(1, false);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      const deleteError = 'Failed to delete post. Please try again.';
      setError(deleteError, 'recoverable', 'POST_DELETION_ERROR');
      setLegacyError(deleteError);
    }
  };

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

  // Determine what to show using unified pagination state
  const hasSearchResults = paginationState?.isSearchActive || false;
  const hasUserResults = hasSearchResults && (paginationState?.searchResults.users.length || 0) > 0;
  const showNoResults = hasSearchResults && 
    (paginationState?.searchResults.posts.length || 0) === 0 && 
    (paginationState?.searchResults.users.length || 0) === 0;
  
  // Calculate pagination stats for egress optimization display
  const totalFilteredPosts = paginationState?.displayPosts.length || 0;
  const currentlyShowing = paginationState?.paginatedPosts.length || 0;
  const bandwidthSavings = Math.max(0, totalFilteredPosts - currentlyShowing);
  const isLoadingMore = paginationState?.isLoadingMore || false;
  const hasMorePosts = paginationState?.hasMorePosts || false;

  return (
    <MainLayout>
      <div className="min-h-screen p-4 bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-6 text-center">Dashboard</h1>
        
        {profile && (
          <div className="text-center text-gray-300 mb-8">
            <p>
              Welcome back, <span className="text-blue-400 font-medium">{profile.username}</span>!
            </p>
            <div className="mt-2 text-xs text-green-400">
              🎯 Bandwidth optimized: Loading {POSTS_PER_PAGE} posts at a time • 
              Audio files load only when played
            </div>
          </div>
        )}

        {/* Post Creation Form */}
        <div className="max-w-2xl mx-auto mb-8 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-700">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'text'
                  ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
              }`}
            >
              📝 Text Post
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'audio'
                  ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
              }`}
            >
              🎵 Audio Post
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {activeTab === 'text' ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="textContent" className="block text-sm font-medium text-gray-300 mb-2">
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
                    <label htmlFor="audioDescription" className="block text-sm font-medium text-gray-300 mb-2">
                      Description <span className="text-gray-500">(optional)</span>
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

              {/* Enhanced Error Display */}
              {errorState && (
                <ErrorDisplay
                  errorState={errorState}
                  errorRecovery={defaultErrorRecovery}
                  onErrorCleared={clearError}
                  onRetry={async () => {
                    if (activeTab === 'text') {
                      await handleTextPostSubmit();
                    } else {
                      await handleAudioPostSubmit();
                    }
                  }}
                  className="mt-4"
                />
              )}
              
              {/* Legacy Error Display for backward compatibility */}
              {!errorState && error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={isSubmitting || (activeTab === 'audio' && !selectedAudioFile)}
                >
                  {isSubmitting ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>{activeTab === 'audio' ? 'Uploading...' : 'Posting...'}</span>
                    </span>
                  ) : (
                    `Create ${activeTab === 'text' ? 'Text' : 'Audio'} Post`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Enhanced Discovery Section */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <SearchErrorBoundary>
            <SearchBar 
              onSearch={handleSearch} 
              onFiltersChange={handleFiltersChange}
              className="w-full"
            />
          </SearchErrorBoundary>
          
          {/* Control Buttons - Updated to show search filters */}
          {(hasSearchResults || Object.keys(paginationState?.currentSearchFilters || {}).some(key => {
            const filterKey = key as keyof SearchFilters;
            const value = (paginationState?.currentSearchFilters as any)?.[filterKey];
            return value && value !== 'all' && value !== 'recent';
          })) && (
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 text-sm text-gray-300 flex-wrap gap-2">
                {paginationState?.currentSearchFilters.query && (
                  <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">
                    Search: &ldquo;{paginationState.currentSearchFilters.query}&rdquo;
                  </span>
                )}
                {paginationState?.currentSearchFilters.postType && paginationState.currentSearchFilters.postType !== 'all' && (
                  <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">
                    Type: {paginationState.currentSearchFilters.postType === 'creators' ? 'Creators' : paginationState.currentSearchFilters.postType === 'audio' ? 'Audio Posts' : 'Text Posts'}
                  </span>
                )}
                {paginationState?.currentSearchFilters.sortBy && paginationState.currentSearchFilters.sortBy !== 'relevance' && (
                  <span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs">
                    Sort: {paginationState.currentSearchFilters.sortBy === 'oldest' ? 'Oldest First' : 
                           paginationState.currentSearchFilters.sortBy === 'popular' ? 'Most Popular' : 
                           paginationState.currentSearchFilters.sortBy === 'likes' ? 'Most Liked' : 
                           'Most Relevant'}
                  </span>
                )}
                {paginationState?.currentSearchFilters.timeRange && paginationState.currentSearchFilters.timeRange !== 'all' && (
                  <span className="bg-orange-900/30 text-orange-400 px-2 py-1 rounded text-xs">
                    Time: {paginationState.currentSearchFilters.timeRange === 'today' ? 'Today' : 
                           paginationState.currentSearchFilters.timeRange === 'week' ? 'This Week' : 
                           paginationState.currentSearchFilters.timeRange === 'month' ? 'This Month' : paginationState.currentSearchFilters.timeRange}
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
        </div>

        {/* Search Results Users */}
        {hasUserResults && (
          <div className="max-w-2xl mx-auto mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Search Results: Creators</h3>
            <div className="grid gap-4">
              {(paginationState?.searchResults.users || []).map((searchUser: unknown) => {
                const typedSearchUser = searchUser as UserProfile;
                const totalPosts = (typedSearchUser as any).posts_count || 0;
                
                return (
                  <div key={typedSearchUser.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {typedSearchUser.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-200 font-medium">{typedSearchUser.username}</p>
                        <p className="text-gray-400 text-sm">
                          {totalPosts} posts
                        </p>
                        <p className="text-gray-500 text-xs">
                          Member since {new Date(typedSearchUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {user && user.id !== typedSearchUser.user_id ? (
                      <FollowButton
                        userId={typedSearchUser.user_id}
                        username={typedSearchUser.username}
                        size="sm"
                        variant="secondary"
                        showFollowerCount={false}
                      />
                    ) : user && user.id === typedSearchUser.user_id ? (
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
              <p className="text-gray-400 mb-2">No results found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-sm text-gray-500 mb-4">
                Try different keywords, adjust your filters, or check your spelling.
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
            {hasSearchResults ? 'Search Results: Posts' : 'Community Posts'}
            {totalFilteredPosts > 0 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({totalFilteredPosts} {totalFilteredPosts === 1 ? 'post' : 'posts'})
              </span>
            )}
          </h2>
          
          {!showNoResults && totalFilteredPosts === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <div className="text-4xl mb-4">🎵</div>
              <p className="text-gray-400 mb-2">
                {hasSearchResults || paginationState?.hasFiltersApplied ? 'No posts match your current search and filters.' : 'No posts yet. Be the first to share!'}
              </p>
              <p className="text-sm text-gray-500">
                {hasSearchResults || paginationState?.hasFiltersApplied ? 'Try adjusting your search terms or filters.' : 'Share your AI music creations or thoughts with the community.'}
              </p>
            </div>
          ) : !showNoResults ? (
            <div className="space-y-6">
              {/* Paginated Posts Display */}
              <PaginationErrorBoundary>
                {(paginationState?.paginatedPosts || []).map(post => (
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
              
              {/* Load More Button */}
              {hasMorePosts && (
                <LoadMoreErrorBoundary>
                  <div className="flex flex-col items-center space-y-4 pt-8">
                    {/* Bandwidth Savings Info */}
                    {bandwidthSavings > 0 && (
                      <div className="bg-green-900/20 border border-green-700 rounded p-3 text-center max-w-md">
                        <p className="text-green-400 text-sm font-medium">
                          📊 Bandwidth Optimization Active
                        </p>
                        <p className="text-green-300 text-xs mt-1">
                          Showing {currentlyShowing} of {totalFilteredPosts} posts • 
                          Saving bandwidth by not loading {bandwidthSavings} posts until needed
                        </p>
                        <p className="text-green-200 text-xs mt-1 opacity-75">
                          🎵 Audio files load only when you click play
                        </p>
                      </div>
                    )}
                    
                    {/* Pagination Strategy Info */}
                    <div className={`border rounded p-3 text-center max-w-md transition-colors ${
                      paginationState?.paginationMode === 'client' 
                        ? 'bg-purple-900/20 border-purple-700' 
                        : 'bg-blue-900/20 border-blue-700'
                    }`}>
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <span className="text-lg">
                          {paginationState?.paginationMode === 'client' ? '📋' : '🔄'}
                        </span>
                        <p className={`text-sm font-medium ${
                          paginationState?.paginationMode === 'client' 
                            ? 'text-purple-300' 
                            : 'text-blue-300'
                        }`}>
                          {paginationState?.paginationMode === 'client' 
                            ? 'Client-side Pagination' 
                            : 'Server-side Pagination'}
                        </p>
                      </div>
                      <p className={`text-xs ${
                        paginationState?.paginationMode === 'client' 
                          ? 'text-purple-200' 
                          : 'text-blue-200'
                      }`}>
                        {paginationState?.paginationMode === 'client' 
                          ? `${Math.min(15, totalFilteredPosts - currentlyShowing)} more from filtered results`
                          : `Loading next 15 posts from database`
                        }
                      </p>
                    </div>
                    
                    {/* Load More Button */}
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 min-w-[200px] justify-center ${
                        isLoadingMore
                          ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                          : paginationState?.paginationMode === 'client'
                          ? 'bg-purple-600 hover:bg-purple-700 hover:scale-105 shadow-lg hover:shadow-purple-500/25'
                          : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-lg hover:shadow-blue-500/25'
                      } text-white`}
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>
                            {paginationState?.paginationMode === 'client' 
                              ? 'Expanding results...' 
                              : 'Fetching from server...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">
                            {paginationState?.paginationMode === 'client' ? '📋' : '🔄'}
                          </span>
                          <span>
                            {paginationState?.paginationMode === 'client' 
                              ? `Show More (${Math.min(15, totalFilteredPosts - currentlyShowing)})`
                              : 'Load More Posts (15)'}
                          </span>
                        </>
                      )}
                    </button>
                    
                    {/* Pagination Stats */}
                    <div className="text-center text-xs text-gray-500 space-y-2">
                      <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                        {paginationState?.paginationMode === 'client' ? (
                          <>
                            <p className="text-purple-300 font-medium">
                              📋 Filtered View: {currentlyShowing} of {totalFilteredPosts} results
                            </p>
                            <p className="text-gray-400">
                              🔍 Filtered from {paginationState?.allPosts.length || 0} loaded posts 
                              ({paginationState?.totalPostsCount || 0} total available)
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              Page {paginationState?.currentPage || 1} • Client-side pagination
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-blue-300 font-medium">
                              🔄 Server View: {currentlyShowing} of {paginationState?.totalPostsCount || 0} total posts
                            </p>
                            <p className="text-gray-400">
                              📊 Loaded {paginationState?.allPosts.length || 0} posts • 15 per batch
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              Batch {Math.ceil((paginationState?.allPosts.length || 0) / 15)} • Server-side pagination
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </LoadMoreErrorBoundary>
              )}
              
              {/* End of Posts Message */}
              {!hasMorePosts && (paginationState?.paginatedPosts.length || 0) > 0 && (
                <div className="text-center py-8">
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="text-gray-400 mb-2">You&apos;ve reached the end!</p>
                    <p className="text-sm text-gray-500 mb-3">
                      {paginationState?.paginationMode === 'client' 
                        ? `All ${totalFilteredPosts} filtered results are now visible.`
                        : `All ${paginationState?.totalPostsCount || 0} posts have been loaded.`
                      }
                    </p>
                    
                    <div className="flex justify-center space-x-3 mt-4">
                      {(hasSearchResults || paginationState?.hasFiltersApplied) && (
                        <button
                          onClick={clearSearch}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        Back to Top
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Activity Feed Section */}
        <div className="max-w-2xl mx-auto mt-12">
          <ErrorBoundary
            fallback={
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
                <div className="text-gray-400 mb-2">📱</div>
                <p className="text-gray-400 text-sm mb-3">
                  Activity feed temporarily unavailable
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Refresh
                </button>
              </div>
            }
            onError={(error, errorInfo) => {
              console.error('❌ ActivityFeed Error:', {
                error: error.message,
                componentStack: errorInfo.componentStack,
                timestamp: new Date().toISOString()
              });
            }}
          >
            <ActivityFeed showHeader={true} maxItems={10} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Performance Monitoring Panel */}
      {showPerformancePanel && (
        <PerformanceMonitoringPanel
          isVisible={showPerformancePanel}
          onToggle={() => setShowPerformancePanel(!showPerformancePanel)}
        />
      )}
    </MainLayout>
  );
}
