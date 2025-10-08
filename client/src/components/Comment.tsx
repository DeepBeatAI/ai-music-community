'use client'
import { useState } from 'react';
import { formatTimeAgo } from '@/utils/format';
import { CommentWithProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/queryCache';

/**
 * Props for the Comment component
 */
interface CommentProps {
  /** The comment data including user profile and nested replies */
  comment: CommentWithProfile;
  /** The ID of the post this comment belongs to */
  postId: string;
  /** The ID of the currently authenticated user (if any) */
  currentUserId?: string;
  /** Callback function when user clicks reply button */
  onReply?: (parentId: string) => void;
  /** Callback function when user deletes a comment, includes total count of deleted comments (including nested) */
  onDelete?: (commentId: string, totalCount: number) => void;
  /** Current nesting depth (0 for top-level, max 3) */
  depth?: number;
}

/**
 * Recursively counts the total number of comments including all nested replies.
 * This is used to accurately update the comment count when deleting a comment
 * that has nested replies (cascade delete).
 * 
 * @param comment - The comment to count (including its nested replies)
 * @returns Total count of the comment plus all its nested replies
 * 
 * @example
 * // Comment with 2 direct replies, one of which has 1 reply
 * // Returns: 1 (parent) + 2 (direct replies) + 1 (nested reply) = 4
 * const count = countTotalComments(comment);
 */
function countTotalComments(comment: CommentWithProfile): number {
  let count = 1; // Count the comment itself
  if (comment.replies && comment.replies.length > 0) {
    // Recursively count all nested replies
    count += comment.replies.reduce((sum, reply) => sum + countTotalComments(reply), 0);
  }
  return count;
}

/**
 * Comment Component
 * 
 * Displays an individual comment with user information, content, and action buttons.
 * Supports recursive rendering for nested replies up to 3 levels deep.
 * 
 * Features:
 * - Displays user avatar, username, timestamp, and comment content
 * - Reply button for authenticated users (if not at max depth)
 * - Delete button for comment owner
 * - Optimistic UI updates for delete operations
 * - Recursive rendering of nested replies
 * - Mobile-responsive design with proper touch targets
 * 
 * Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 5.1, 5.2, 5.3, 5.6, 6.3, 6.4, 4.6
 */
export default function Comment({
  comment,
  postId,
  currentUserId,
  onReply,
  onDelete,
  depth = 0
}: CommentProps) {
  // State for managing delete operation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Determine user permissions and depth constraints
  const isOwner = currentUserId === comment.user_id;
  const maxDepth = 3; // Maximum nesting level for replies
  const canReply = depth < maxDepth;

  /**
   * Handles comment deletion with optimistic UI updates.
   * 
   * Process:
   * 1. Immediately update UI (optimistic) by calling onDelete callback
   * 2. Attempt to delete from database
   * 3. Invalidate cache on success
   * 4. Show error and restore comment on failure (rollback)
   * 
   * Note: Database cascade delete will automatically remove nested replies.
   * We count total comments to accurately update the comment count.
   */
  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;

    // Optimistic UI update - remove from UI immediately
    setIsDeleting(true);
    setDeleteError(null);

    // Count total comments that will be deleted (including nested replies)
    // This is needed because database cascade delete will remove all nested replies
    const totalToDelete = countTotalComments(comment);

    // Call parent's onDelete callback for optimistic UI update
    onDelete(comment.id, totalToDelete);

    try {
      // Attempt to delete from database
      // The database cascade delete will automatically remove nested replies
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id)
        .eq('user_id', currentUserId); // Extra security check (in addition to RLS)

      if (error) {
        throw error;
      }

      // Invalidate cache for this post's comments to ensure fresh data on next fetch
      queryCache.invalidatePattern(`comments-${postId}`);

      // Success - the optimistic update already handled the UI
    } catch (error) {
      // Rollback - show error and restore the comment
      console.error('Failed to delete comment:', error);
      setDeleteError('Failed to delete comment. Please try again.');
      setIsDeleting(false);
      
      // Note: The parent component should handle rollback by re-adding the comment
      // This is a limitation of the current implementation - ideally we'd have a rollback callback
    }
  };

  return (
    <div 
      className={`comment-container ${depth > 0 ? 'ml-4 md:ml-8' : ''} ${isDeleting ? 'opacity-50' : ''}`}
      data-depth={depth}
    >
      {/* Comment Card */}
      <div className="bg-gray-800 rounded-lg p-4 mb-3 border border-gray-700">
        {/* Comment Header */}
        <div className="flex items-start space-x-3 mb-2">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {comment.user_profiles?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Username and Timestamp */}
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-200 text-sm md:text-base">
                {comment.user_profiles?.username || 'Unknown User'}
              </span>
              <span className="text-gray-500 text-xs">
                {formatTimeAgo(comment.created_at)}
              </span>
            </div>

            {/* Comment Text */}
            <p className="text-gray-300 text-sm md:text-base break-words whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 mt-3 ml-11 md:ml-13">
          {/* Reply Button - Only for authenticated users and if not at max depth */}
          {currentUserId && canReply && onReply && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-gray-400 hover:text-blue-400 text-xs md:text-sm font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
              aria-label={`Reply to ${comment.user_profiles?.username || 'comment'}`}
            >
              <span className="mr-1">💬</span>
              <span className="hidden md:inline">Reply</span>
            </button>
          )}

          {/* Delete Button - Only for comment owner */}
          {isOwner && onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-400 text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
              aria-label="Delete comment"
            >
              <span className="mr-1">🗑️</span>
              <span className="hidden md:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          )}
        </div>

        {/* Error Message */}
        {deleteError && (
          <div className="mt-2 ml-11 md:ml-13 text-red-400 text-xs md:text-sm">
            {deleteError}
          </div>
        )}
      </div>

      {/* 
        Nested Replies - Recursive Rendering
        
        This section implements the threaded comment system by recursively rendering
        the Comment component for each reply. Key aspects:
        
        1. Recursion: Each Comment can render child Comments, creating a tree structure
        2. Depth Tracking: The depth prop is incremented (+1) for each level
        3. Max Depth Limit: Rendering stops at depth 3 to prevent excessive nesting
        4. Visual Indentation: CSS classes (ml-4 md:ml-8) create visual hierarchy
        
        The recursive approach allows for flexible nesting without hardcoding levels,
        while the depth limit ensures the UI remains usable on mobile devices.
      */}
      {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
        <div className="nested-replies">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1} // Increment depth for nested reply
            />
          ))}
        </div>
      )}
    </div>
  );
}
