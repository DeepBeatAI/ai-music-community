'use client'
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CommentWithProfile } from '@/types';
import Comment from '@/components/Comment';
import { queryCache } from '@/utils/queryCache';

/**
 * Props for the CommentList component
 */
interface CommentListProps {
  /** The ID of the post to display comments for */
  postId: string;
  /** The ID of the currently authenticated user (if any) */
  currentUserId?: string;
  /** Optional initial comments to display (for SSR or prefetching) */
  initialComments?: CommentWithProfile[];
  /** Callback function when comment count changes (for updating post comment count) */
  onCommentCountChange?: (delta: number) => void;
}

/** Number of comments to load per page */
const COMMENTS_PER_PAGE = 10;

/**
 * Recursively adds a reply to the correct parent comment in the comment tree.
 * This function traverses the comment tree to find the parent comment by ID
 * and adds the new reply to its replies array.
 * 
 * @param comment - The comment to search (and potentially add reply to)
 * @param parentId - The ID of the parent comment to add the reply to
 * @param reply - The new reply to add
 * @returns Updated comment with the reply added (if parent found)
 * 
 * @example
 * const updatedComment = addReplyToComment(topLevelComment, 'parent-id-123', newReply);
 */
function addReplyToComment(
  comment: CommentWithProfile,
  parentId: string,
  reply: CommentWithProfile
): CommentWithProfile {
  // Check if this is the parent comment
  if (comment.id === parentId) {
    return {
      ...comment,
      replies: [...(comment.replies || []), reply],
      reply_count: (comment.reply_count || 0) + 1
    };
  }
  
  // Recursively search nested replies
  if (comment.replies && comment.replies.length > 0) {
    return {
      ...comment,
      replies: comment.replies.map(r => addReplyToComment(r, parentId, reply))
    };
  }
  
  return { ...comment };
}

/**
 * Recursively replaces an optimistic comment (temporary ID) with the real comment
 * from the server (permanent ID). This is used after successful comment creation
 * to replace the optimistic UI update with real data.
 * 
 * @param comment - The comment to search
 * @param tempId - The temporary ID of the optimistic comment
 * @param realComment - The real comment data from the server
 * @returns Updated comment with optimistic comment replaced
 * 
 * @example
 * const updated = replaceOptimisticReply(comment, 'temp-123', serverComment);
 */
function replaceOptimisticReply(
  comment: CommentWithProfile,
  tempId: string,
  realComment: CommentWithProfile
): CommentWithProfile {
  // Check if this is the optimistic comment to replace
  if (comment.id === tempId) {
    return realComment;
  }
  
  // Recursively search nested replies
  if (comment.replies && comment.replies.length > 0) {
    return {
      ...comment,
      replies: comment.replies.map(r => replaceOptimisticReply(r, tempId, realComment))
    };
  }
  
  return { ...comment };
}

/**
 * Recursively removes a reply from the comment tree.
 * This is used for optimistic delete operations and rollback scenarios.
 * 
 * @param comment - The comment to search
 * @param replyId - The ID of the reply to remove
 * @returns Updated comment with the reply removed
 * 
 * @example
 * const updated = removeReplyFromComment(comment, 'reply-id-to-delete');
 */
function removeReplyFromComment(
  comment: CommentWithProfile,
  replyId: string
): CommentWithProfile {
  if (comment.replies && comment.replies.length > 0) {
    // Filter out the reply and recursively remove from nested replies
    const filteredReplies = comment.replies
      .filter(r => r.id !== replyId)
      .map(r => removeReplyFromComment(r, replyId));
    
    return {
      ...comment,
      replies: filteredReplies,
      reply_count: filteredReplies.length
    };
  }
  
  return { ...comment };
}

/**
 * CommentList Component
 * 
 * Manages the list of comments for a post, including:
 * - Fetching and displaying comments with pagination
 * - Comment creation form with validation
 * - Real-time updates via Supabase Realtime
 * - Optimistic UI updates for create/delete operations
 * - Query caching for performance
 * 
 * Features:
 * - Pagination (10 comments per page)
 * - Real-time comment synchronization across users
 * - Optimistic UI for instant feedback
 * - Character limit validation (1000 chars)
 * - Nested reply support
 * - Cache invalidation strategy
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.10, 1.12, 2.11, 4.7, 5.7, 6.1, 6.2, 6.5, 6.6, 6.7, 6.8
 */
export default function CommentList({
  postId,
  currentUserId,
  initialComments = [],
  onCommentCountChange
}: CommentListProps) {
  // State management for comments list
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // State management for comment creation form
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  
  // State management for edit mode - only one comment can be edited at a time
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  
  // Ref for textarea to enable auto-focus when replying
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  /**
   * Auto-focus and scroll to textarea when user clicks reply button.
   * This improves UX by immediately focusing the input field.
   */
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
      // Scroll textarea into view for better mobile experience
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [replyingTo]);

  /**
   * Recursively fetches all replies for a given parent comment.
   * 
   * This function implements a depth-first traversal of the comment tree:
   * 1. Fetch direct replies for the parent comment
   * 2. Fetch user profiles for all reply authors
   * 3. Recursively fetch nested replies for each reply
   * 4. Build complete comment tree with all nested data
   * 
   * The recursive approach ensures we load the complete comment thread
   * regardless of nesting depth, while maintaining proper data structure.
   * 
   * @param parentId - The ID of the parent comment to fetch replies for
   * @returns Array of comments with nested replies and user profiles
   */
  const fetchReplies = useCallback(async (parentId: string): Promise<CommentWithProfile[]> => {
    try {
      // Fetch all direct replies for this parent
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select(`
          *
        `)
        .eq('parent_comment_id', parentId)
        .order('created_at', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      // Fetch user profiles separately for better performance
      // (avoids N+1 query problem)
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);
      
      // Create a map for O(1) profile lookups
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Attach profiles to comments
      const repliesData = (data || []).map(comment => ({
        ...comment,
        user_profiles: profileMap.get(comment.user_id)
      }));

      // Recursively fetch nested replies for each reply
      // This builds the complete comment tree structure
      const repliesWithNested = await Promise.all(
        repliesData.map(async (reply) => {
          const nestedReplies = await fetchReplies(reply.id);
          return {
            ...reply,
            replies: nestedReplies,
            reply_count: nestedReplies.length
          } as CommentWithProfile;
        })
      );

      return repliesWithNested;
    } catch (err) {
      console.error('Failed to fetch replies:', err);
      return []; // Graceful degradation - return empty array on error
    }
  }, []);

  // Fetch comments with pagination
  const fetchComments = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    setError(null);

    try {
      const from = pageNum * COMMENTS_PER_PAGE;
      const to = from + COMMENTS_PER_PAGE - 1;

      // Check cache first (only for initial page load)
      const cacheKey = `comments-${postId}-page-${pageNum}`;
      if (pageNum === 0) {
        const cached = queryCache.get<CommentWithProfile[]>(cacheKey);
        if (cached) {
          setComments(cached);
          setHasMore(cached.length === COMMENTS_PER_PAGE);
          setPage(pageNum);
          setLoading(false);
          return;
        }
      }

      // Fetch top-level comments (no parent)
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      const commentsData = data || [];
      
      // Fetch user profiles separately
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        user_profiles: profileMap.get(comment.user_id)
      }));
      
      // Fetch replies for each top-level comment
      const commentsWithReplies = await Promise.all(
        commentsWithProfiles.map(async (comment) => {
          const replies = await fetchReplies(comment.id);
          return {
            ...comment,
            replies,
            reply_count: replies.length
          } as CommentWithProfile;
        })
      );

      // Cache the results (5 minutes TTL)
      if (pageNum === 0) {
        queryCache.set(cacheKey, commentsWithReplies, 5 * 60 * 1000);
      }

      // Update state based on whether this is initial load or pagination
      if (pageNum === 0) {
        setComments(commentsWithReplies);
      } else {
        setComments(prev => [...prev, ...commentsWithReplies]);
      }

      // Check if there are more comments to load
      setHasMore(commentsData.length === COMMENTS_PER_PAGE);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [postId, fetchReplies]);

  // Load more comments
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchComments(page + 1);
    }
  };

  // Handle comment submission with optimistic UI
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const characterCount = newCommentContent.length;
    const maxCharacters = 1000;
    const isOverLimit = characterCount > maxCharacters;
    const isFormValid = newCommentContent.trim().length > 0 && !isOverLimit;
    
    if (!isFormValid || !currentUserId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const now = new Date().toISOString();
    
    // Store content before clearing form
    const contentToSubmit = newCommentContent.trim();
    const parentIdToSubmit = replyingTo;

    // Create optimistic comment
    const optimisticComment: CommentWithProfile = {
      id: tempId,
      post_id: postId,
      user_id: currentUserId,
      content: contentToSubmit,
      parent_comment_id: parentIdToSubmit,
      created_at: now,
      updated_at: now,
      user_profiles: {
        id: currentUserId,
        user_id: currentUserId,
        username: 'You', // Placeholder - will be replaced with real data
        created_at: now,
        updated_at: now
      },
      replies: [],
      reply_count: 0
    };

    try {
      // Check if user is allowed to comment (Requirements 6.2, 6.6)
      const { data: canComment, error: restrictionError } = await supabase
        .rpc('can_user_comment', { p_user_id: currentUserId });

      if (restrictionError) {
        console.error('Error checking comment restrictions:', restrictionError);
        throw new Error('Failed to verify commenting permissions');
      }

      if (!canComment) {
        console.warn(`User ${currentUserId} attempted to comment while restricted`);
        throw new Error('You are currently restricted from commenting. Please contact support for more information.');
      }

      // Optimistically add comment to UI
      if (parentIdToSubmit) {
        // Add as a reply to existing comment
        setComments(prev => prev.map(comment => 
          addReplyToComment(comment, parentIdToSubmit, optimisticComment)
        ));
      } else {
        // Add as top-level comment
        setComments(prev => [optimisticComment, ...prev]);
      }
      
      // Notify parent component of count change
      onCommentCountChange?.(1);
      
      // Clear form
      setNewCommentContent('');
      setReplyingTo(null);

      // Submit to database
      const { data: commentData, error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: contentToSubmit,
          parent_comment_id: parentIdToSubmit
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      // Replace optimistic comment with real data
      if (commentData) {
        const realComment: CommentWithProfile = {
          ...commentData,
          user_profiles: profileData,
          replies: [],
          reply_count: 0
        };

        if (parentIdToSubmit) {
          setComments(prev => prev.map(comment => 
            replaceOptimisticReply(comment, tempId, realComment)
          ));
        } else {
          setComments(prev => prev.map(c => 
            c.id === tempId ? realComment : c
          ));
        }

        // Invalidate cache for this post's comments
        queryCache.invalidatePattern(`comments-${postId}`);
      }
    } catch (err) {
      console.error('Failed to create comment:', err);
      
      // Rollback optimistic update
      if (parentIdToSubmit) {
        setComments(prev => prev.map(comment => 
          removeReplyFromComment(comment, tempId)
        ));
      } else {
        setComments(prev => prev.filter(c => c.id !== tempId));
      }
      
      // Rollback count change
      onCommentCountChange?.(-1);

      // Restore form content
      setNewCommentContent(contentToSubmit);
      setReplyingTo(parentIdToSubmit);
      
      // Show error
      setSubmitError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (initialComments.length === 0) {
      fetchComments(0);
    }
  }, [fetchComments, initialComments.length]);

  /**
   * Set up Supabase Realtime subscription for live comment updates.
   * 
   * This effect establishes a WebSocket connection to receive real-time updates
   * when other users create or delete comments on this post. Key features:
   * 
   * 1. INSERT events: Add new comments from other users to the UI
   * 2. DELETE events: Remove deleted comments from the UI
   * 3. Optimistic UI filtering: Skip our own comments (already added optimistically)
   * 4. Graceful degradation: If Realtime fails, comments still work via manual refresh
   * 
   * Cache Invalidation Strategy:
   * - We don't invalidate cache on realtime updates to avoid unnecessary refetches
   * - Cache is invalidated on user actions (create/delete) in other functions
   * - This balances real-time updates with performance
   * 
   * Requirements: 1.10, 6.5, 6.6, 6.7, 6.8
   */
  useEffect(() => {
    // Subscribe to comments table changes for this specific post
    const channel = supabase
      .channel(`comments:post_id=eq.${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        async (payload) => {
          // Handle new comment from another user
          const newComment = payload.new;
          
          // Skip if this is our own comment (already added optimistically)
          // This prevents duplicate comments in the UI
          if (newComment.user_id === currentUserId) {
            return;
          }

          try {
            // Fetch the complete comment with all fields
            const { data: commentData, error: fetchError } = await supabase
              .from('comments')
              .select('*')
              .eq('id', newComment.id)
              .single();

            if (fetchError) throw fetchError;

            if (commentData) {
              // Fetch user profile for the comment author
              const { data: profileData } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', commentData.user_id)
                .single();
              
              const commentWithProfile: CommentWithProfile = {
                ...commentData,
                user_profiles: profileData,
                replies: [],
                reply_count: 0
              };

              // Add to appropriate location in the comment tree
              if (newComment.parent_comment_id) {
                // Add as reply to existing comment (nested)
                setComments(prev => prev.map(comment => 
                  addReplyToComment(comment, newComment.parent_comment_id, commentWithProfile)
                ));
              } else {
                // Add as top-level comment
                setComments(prev => [commentWithProfile, ...prev]);
              }
              
              // Notify parent component to update comment count
              onCommentCountChange?.(1);
            }
          } catch (err) {
            console.error('Failed to fetch new comment from realtime:', err);
            // Graceful degradation - user can refresh to see new comments
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          // Handle comment deletion from another user
          const deletedId = payload.old.id;
          
          // Remove from UI based on whether it's a reply or top-level comment
          if (payload.old.parent_comment_id) {
            // Remove nested reply
            setComments(prev => prev.map(comment => 
              removeReplyFromComment(comment, deletedId)
            ));
          } else {
            // Remove top-level comment
            setComments(prev => prev.filter(c => c.id !== deletedId));
          }
          
          // Notify parent component to update comment count
          // Note: This only decrements by 1, not accounting for nested replies
          // This is acceptable as the count will be corrected on next page load
          onCommentCountChange?.(-1);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to comments realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to comments realtime updates');
          // Graceful degradation - comments still work without realtime
        }
      });

    // Cleanup subscription on unmount to prevent memory leaks
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, currentUserId, onCommentCountChange]);

  // Character count
  const characterCount = newCommentContent.length;
  const maxCharacters = 1000;
  const isOverLimit = characterCount > maxCharacters;
  const isFormValid = newCommentContent.trim().length > 0 && !isOverLimit;

  return (
    <div className="comment-list-container">
      {/* Comment Creation Form - Only for authenticated users */}
      {currentUserId && (
        <div className="mb-6">
          <form onSubmit={handleSubmitComment} className="space-y-3">
            {/* Textarea Input */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={maxCharacters + 100} // Allow typing over limit to show error
                disabled={isSubmitting}
              />
              
              {/* Character Counter */}
              <div className={`absolute bottom-2 right-2 text-xs ${
                isOverLimit ? 'text-red-400' : 
                characterCount > maxCharacters * 0.9 ? 'text-yellow-400' : 
                'text-gray-500'
              }`}>
                {characterCount} / {maxCharacters}
              </div>
            </div>

            {/* Validation Error */}
            {isOverLimit && (
              <p className="text-red-400 text-xs">
                Comment exceeds maximum length of {maxCharacters} characters
              </p>
            )}

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-900/20 border border-red-500 text-red-400 px-3 py-2 rounded text-xs">
                {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {replyingTo ? 'Replying to comment' : 'Share your thoughts'}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Cancel Reply Button */}
                {replyingTo && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setNewCommentContent('');
                    }}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium min-h-[44px] md:min-h-0"
                >
                  {isSubmitting ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Posting...</span>
                    </span>
                  ) : (
                    replyingTo ? 'Post Reply' : 'Post Comment'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && comments.length === 0 && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs underline mt-1 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && comments.length === 0 && !error && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No comments yet. Be the first to comment!</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-2">
        {comments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            postId={postId}
            currentUserId={currentUserId}
            onReply={(parentId) => setReplyingTo(parentId)}
            onDelete={(commentId, totalCount = 1) => {
              // Optimistic delete - remove from UI immediately
              setComments(prev => {
                // Check if it's a top-level comment
                const isTopLevel = prev.some(c => c.id === commentId);
                
                if (isTopLevel) {
                  // Remove top-level comment
                  return prev.filter(c => c.id !== commentId);
                } else {
                  // Remove nested reply using the helper function
                  return prev.map(c => removeReplyFromComment(c, commentId));
                }
              });
              
              // Notify parent component of count change (including nested replies)
              onCommentCountChange?.(-totalCount);
            }}
            editingCommentId={editingCommentId}
            onEditStart={(commentId) => setEditingCommentId(commentId)}
            onEditEnd={() => setEditingCommentId(null)}
            depth={0}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && comments.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading...</span>
              </span>
            ) : (
              'Load More Comments'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
