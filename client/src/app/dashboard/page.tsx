"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MainLayout from "@/components/layout/MainLayout";
import PostItem from "@/components/PostItem";
import AudioUpload from "@/components/AudioUpload";
import SearchBar from "@/components/SearchBar";
import ActivityFeed from "@/components/ActivityFeed";
import FollowButton from "@/components/FollowButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import PerformanceMonitoringPanel from "@/components/PerformanceMonitoringPanel";
// import { usePagination } from '@/contexts/PaginationContext';
// import { useErrorRecovery } from '@/contexts/ErrorRecoveryContext';
import type { Post, UserProfile, SearchFilters } from "@/types";
import { defaultErrorRecovery } from "@/utils/errorRecovery";

// Import pagination types
import { PaginationState, INITIAL_PAGINATION_STATE } from "@/types/pagination";

// Mock implementations for missing contexts
const usePagination = () => ({
  paginationState: INITIAL_PAGINATION_STATE as PaginationState,
  paginationManagerRef: { current: { reset: () => {} } },
  fetchPosts: async (_page: number, _reset: boolean) => {},
  handleSearch: async (_query: string, _filters: SearchFilters) => {},
  handleFiltersChange: async (_filters: SearchFilters) => {},
  clearSearch: async () => {},
  loadMore: async () => {},
});

const useErrorRecovery = () => ({
  errorState: null,
  setError: (_message: string, _type: string, _code: string) => {},
  clearError: () => {},
});

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
  const {
    paginationState,
    paginationManagerRef,
    fetchPosts,
    handleSearch: paginationHandleSearch,
    handleFiltersChange: paginationHandleFiltersChange,
    clearSearch: paginationClearSearch,
    loadMore: paginationLoadMore,
  } = usePagination();

  const { errorState, setError, clearError } = useErrorRecovery();

  // Component state
  const [activeTab, setActiveTab] = useState<"text" | "audio">("text");
  const [textContent, setTextContent] = useState("");
  const [audioDescription, setAudioDescription] = useState("");
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setLegacyError] = useState<string | null>(null);
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");
  const [currentSearchFilters, setCurrentSearchFilters] =
    useState<SearchFilters>({});
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);

  // Refs for tracking state
  const hasInitiallyLoaded = useRef(false);

  // Initialize posts on component mount
  useEffect(() => {
    if (user && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      fetchPosts(1, false);
    }
  }, [user, fetchPosts]);

  // Handle search
  const handleSearch = useCallback(
    async (query: string, filters: SearchFilters) => {
      setCurrentSearchQuery(query);
      setCurrentSearchFilters(filters);
      await paginationHandleSearch(query, filters);
    },
    [paginationHandleSearch]
  );

  // Handle filters change
  const handleFiltersChange = useCallback(
    async (filters: SearchFilters) => {
      setCurrentSearchFilters(filters);
      await paginationHandleFiltersChange(filters);
    },
    [paginationHandleFiltersChange]
  );

  // Clear search
  const clearSearch = useCallback(async () => {
    setCurrentSearchQuery("");
    setCurrentSearchFilters({});
    await paginationClearSearch();
  }, [paginationClearSearch]);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    await paginationLoadMore();
  }, [paginationLoadMore]);

  // Handle audio file selection
  const handleAudioFileSelect = useCallback(
    (file: File) => {
      setSelectedAudioFile(file);
      setLegacyError(null);
      clearError();
    },
    [clearError]
  );

  // Handle audio file removal
  const handleAudioFileRemove = useCallback(() => {
    setSelectedAudioFile(null);
  }, []);
  // Handle text post submission
  const handleTextPostSubmit = useCallback(async () => {
    if (!user || !textContent.trim()) return;

    try {
      setIsSubmitting(true);
      setLegacyError(null);
      clearError();

      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        content: textContent.trim(),
        post_type: "text",
      });

      if (insertError) throw insertError;

      setTextContent("");

      // Reset pagination and reload posts
      if (paginationManagerRef.current) {
        paginationManagerRef.current.reset();
        hasInitiallyLoaded.current = false;
        await fetchPosts(1, false);
      }
    } catch (error) {
      console.error("Error creating text post:", error);
      const textError = "Failed to create post. Please try again.";
      setError(textError, "recoverable", "POST_CREATION_ERROR");
      setLegacyError(textError);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user,
    textContent,
    clearError,
    setError,
    paginationManagerRef,
    fetchPosts,
  ]);

  // Handle audio post submission
  const handleAudioPostSubmit = useCallback(async () => {
    if (!user || !selectedAudioFile) return;

    try {
      setIsSubmitting(true);
      setLegacyError(null);
      clearError();

      // Upload audio file
      const fileExt = selectedAudioFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("audio-files")
        .upload(fileName, selectedAudioFile);

      if (uploadError) throw uploadError;

      // Create post
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        content: audioDescription.trim() || null,
        post_type: "audio",
        audio_url: fileName,
      });

      if (insertError) throw insertError;

      setAudioDescription("");
      setSelectedAudioFile(null);

      // Reset pagination and reload posts
      if (paginationManagerRef.current) {
        paginationManagerRef.current.reset();
        hasInitiallyLoaded.current = false;
        await fetchPosts(1, false);
      }
    } catch (error) {
      console.error("Error creating audio post:", error);
      const audioError = "Failed to upload audio post. Please try again.";
      setError(audioError, "recoverable", "AUDIO_POST_CREATION_ERROR");
      setLegacyError(audioError);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user,
    selectedAudioFile,
    audioDescription,
    clearError,
    setError,
    paginationManagerRef,
    fetchPosts,
  ]);

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
        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", postId);

        if (error) throw error;

        if (paginationManagerRef.current) {
          paginationManagerRef.current.reset();
          hasInitiallyLoaded.current = false;
          await fetchPosts(1, false);
        }
      } catch (error) {
        console.error("Error deleting post:", error);
        const deleteError = "Failed to delete post. Please try again.";
        setError(deleteError, "recoverable", "POST_DELETION_ERROR");
        setLegacyError(deleteError);
      }
    },
    [setError, setLegacyError, paginationManagerRef, fetchPosts]
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

  // Determine what to show using unified pagination state
  const hasSearchResults = paginationState?.isSearchActive || false;
  const hasUserResults =
    hasSearchResults && (paginationState?.searchResults.users.length || 0) > 0;
  const showNoResults =
    hasSearchResults &&
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
              Welcome back,{" "}
              <span className="text-blue-400 font-medium">
                {profile.username}
              </span>
              !
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
              onClick={() => setActiveTab("text")}
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
              onClick={() => setActiveTab("audio")}
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
              {/* Enhanced Error Display */}
              {errorState && (
                <ErrorDisplay
                  errorState={errorState}
                  errorRecovery={defaultErrorRecovery}
                  onErrorCleared={clearError}
                  onRetry={async () => {
                    if (activeTab === "text") {
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

        {/* Enhanced Discovery Section */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <SearchErrorBoundary>
            <SearchBar
              onSearch={(results, query) => {
                // Convert SearchResults to our expected format
                handleSearch(query, currentSearchFilters);
              }}
              onFiltersChange={handleFiltersChange}
              className="w-full"
              currentQuery={currentSearchQuery}
              initialFilters={currentSearchFilters}
              paginationState={paginationState || undefined}
              isLoadingMore={isLoadingMore}
            />
          </SearchErrorBoundary>

          {/* Control Buttons - Updated to show search filters */}
          {(hasSearchResults ||
            Object.keys(paginationState?.currentSearchFilters || {}).some(
              (key) => {
                const filterKey = key as keyof SearchFilters;
                const value = (
                  paginationState?.currentSearchFilters as Record<
                    string,
                    unknown
                  >
                )?.[filterKey];
                return value && value !== "all" && value !== "recent";
              }
            )) && (
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2 text-sm text-gray-300 flex-wrap gap-2">
                {paginationState?.currentSearchFilters.query && (
                  <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs">
                    Search: &ldquo;{paginationState.currentSearchFilters.query}
                    &rdquo;
                  </span>
                )}
                {paginationState?.currentSearchFilters.postType &&
                  paginationState.currentSearchFilters.postType !== "all" && (
                    <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">
                      Type:{" "}
                      {paginationState.currentSearchFilters.postType ===
                      "creators"
                        ? "Creators"
                        : paginationState.currentSearchFilters.postType ===
                          "audio"
                        ? "Audio Posts"
                        : "Text Posts"}
                    </span>
                  )}
                {paginationState?.currentSearchFilters.sortBy &&
                  paginationState.currentSearchFilters.sortBy !==
                    "relevance" && (
                    <span className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs">
                      Sort:{" "}
                      {paginationState.currentSearchFilters.sortBy === "oldest"
                        ? "Oldest First"
                        : paginationState.currentSearchFilters.sortBy ===
                          "popular"
                        ? "Most Popular"
                        : paginationState.currentSearchFilters.sortBy ===
                          "likes"
                        ? "Most Liked"
                        : "Most Relevant"}
                    </span>
                  )}
                {paginationState?.currentSearchFilters.timeRange &&
                  paginationState.currentSearchFilters.timeRange !== "all" && (
                    <span className="bg-orange-900/30 text-orange-400 px-2 py-1 rounded text-xs">
                      Time:{" "}
                      {paginationState.currentSearchFilters.timeRange ===
                      "today"
                        ? "Today"
                        : paginationState.currentSearchFilters.timeRange ===
                          "week"
                        ? "This Week"
                        : paginationState.currentSearchFilters.timeRange ===
                          "month"
                        ? "This Month"
                        : paginationState.currentSearchFilters.timeRange}
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
            <h3 className="text-lg font-semibold mb-4 text-gray-200">
              Search Results: Creators
            </h3>
            <div className="grid gap-4">
              {(paginationState?.searchResults.users || []).map(
                (searchUser: unknown) => {
                  const typedSearchUser = searchUser as UserProfile;
                  const totalPosts =
                    (typedSearchUser as UserProfile & { posts_count?: number })
                      .posts_count || 0;

                  return (
                    <div
                      key={typedSearchUser.id}
                      className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {typedSearchUser.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-200 font-medium">
                            {typedSearchUser.username}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {totalPosts} posts
                          </p>
                          <p className="text-gray-500 text-xs">
                            Member since{" "}
                            {new Date(
                              typedSearchUser.created_at
                            ).toLocaleDateString()}
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
                }
              )}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {showNoResults && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400 mb-2">
                No results found for &ldquo;{currentSearchQuery}&rdquo;
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
            {hasSearchResults ? "Search Results: Posts" : "Community Posts"}
            {totalFilteredPosts > 0 && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({totalFilteredPosts}{" "}
                {totalFilteredPosts === 1 ? "post" : "posts"})
              </span>
            )}
          </h2>

          {!showNoResults && totalFilteredPosts === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <div className="text-4xl mb-4">🎵</div>
              <p className="text-gray-400 mb-2">
                {hasSearchResults || paginationState?.hasFiltersApplied
                  ? "No posts match your current search and filters."
                  : "No posts yet. Be the first to share!"}
              </p>
              <p className="text-sm text-gray-500">
                {hasSearchResults || paginationState?.hasFiltersApplied
                  ? "Try adjusting your search terms or filters."
                  : "Share your AI music creations or thoughts with the community."}
              </p>
            </div>
          ) : !showNoResults ? (
            <div className="space-y-6">
              {/* Paginated Posts Display */}
              <PaginationErrorBoundary>
                {(paginationState?.paginatedPosts || []).map((post: Post) => (
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
                          Showing {currentlyShowing} of {totalFilteredPosts}{" "}
                          posts • Saving bandwidth by not loading{" "}
                          {bandwidthSavings} posts until needed
                        </p>
                        <p className="text-green-200 text-xs mt-1 opacity-75">
                          🎵 Audio files load only when you click play
                        </p>
                      </div>
                    )}

                    {/* Pagination Strategy Info */}
                    <div
                      className={`border rounded p-3 text-center max-w-md transition-colors ${
                        paginationState?.paginationMode === "client"
                          ? "bg-purple-900/20 border-purple-700"
                          : "bg-blue-900/20 border-blue-700"
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <span className="text-lg">
                          {paginationState?.paginationMode === "client"
                            ? "📋"
                            : "🔄"}
                        </span>
                        <p
                          className={`text-sm font-medium ${
                            paginationState?.paginationMode === "client"
                              ? "text-purple-300"
                              : "text-blue-300"
                          }`}
                        >
                          {paginationState?.paginationMode === "client"
                            ? "Client-side Pagination"
                            : "Server-side Pagination"}
                        </p>
                      </div>
                      <p
                        className={`text-xs ${
                          paginationState?.paginationMode === "client"
                            ? "text-purple-200"
                            : "text-blue-200"
                        }`}
                      >
                        {paginationState?.paginationMode === "client"
                          ? `${Math.min(
                              15,
                              totalFilteredPosts - currentlyShowing
                            )} more from filtered results`
                          : `Loading next 15 posts from database`}
                      </p>
                    </div>
                    {/* Load More Button */}
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 min-w-[200px] justify-center ${
                        isLoadingMore
                          ? "bg-gray-600 opacity-50 cursor-not-allowed"
                          : paginationState?.paginationMode === "client"
                          ? "bg-purple-600 hover:bg-purple-700 hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                          : "bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                      } text-white`}
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>
                            {paginationState?.paginationMode === "client"
                              ? "Expanding results..."
                              : "Fetching from server..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">
                            {paginationState?.paginationMode === "client"
                              ? "📋"
                              : "🔄"}
                          </span>
                          <span>
                            {paginationState?.paginationMode === "client"
                              ? `Show More (${Math.min(
                                  15,
                                  totalFilteredPosts - currentlyShowing
                                )})`
                              : "Load More Posts (15)"}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Pagination Stats */}
                    <div className="text-center text-xs text-gray-500 space-y-2">
                      <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                        {paginationState?.paginationMode === "client" ? (
                          <>
                            <p className="text-purple-300 font-medium">
                              📋 Filtered View: {currentlyShowing} of{" "}
                              {totalFilteredPosts} results
                            </p>
                            <p className="text-gray-400">
                              🔍 Filtered from{" "}
                              {paginationState?.allPosts.length || 0} loaded
                              posts ({paginationState?.totalPostsCount || 0}{" "}
                              total available)
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              Page {paginationState?.currentPage || 1} •
                              Client-side pagination
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-blue-300 font-medium">
                              🔄 Server View: {currentlyShowing} of{" "}
                              {paginationState?.totalPostsCount || 0} total
                              posts
                            </p>
                            <p className="text-gray-400">
                              📊 Loaded {paginationState?.allPosts.length || 0}{" "}
                              posts • 15 per batch
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              Batch{" "}
                              {Math.ceil(
                                (paginationState?.allPosts.length || 0) / 15
                              )}{" "}
                              • Server-side pagination
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </LoadMoreErrorBoundary>
              )}
              {/* End of Posts Message */}
              {!hasMorePosts &&
                (paginationState?.paginatedPosts.length || 0) > 0 && (
                  <div className="text-center py-8">
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="text-3xl mb-2">🎉</div>
                      <p className="text-gray-400 mb-2">
                        You&apos;ve reached the end!
                      </p>
                      <p className="text-sm text-gray-500 mb-3">
                        {paginationState?.paginationMode === "client"
                          ? `All ${totalFilteredPosts} filtered results are now visible.`
                          : `All ${
                              paginationState?.totalPostsCount || 0
                            } posts have been loaded.`}
                      </p>

                      <div className="flex justify-center space-x-3 mt-4">
                        {(hasSearchResults ||
                          paginationState?.hasFiltersApplied) && (
                          <button
                            onClick={clearSearch}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
                          >
                            Clear Filters
                          </button>
                        )}
                        <button
                          onClick={() =>
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          }
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
              console.error("❌ ActivityFeed Error:", {
                error: error.message,
                componentStack: errorInfo.componentStack,
                timestamp: new Date().toISOString(),
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
