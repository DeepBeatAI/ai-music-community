'use client'
import { useState, useRef, useEffect } from 'react';
import { formatTimeAgo } from '@/utils/format';
import { CommentWithProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/queryCache';
import { updateComment } from '@/utils/comments';
import EditedBadge from '@/components/EditedBadge';
import { useToast } from '@/contexts/ToastContext';

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
  /** The ID of the comment currently being edited (null if none) */
  editingCommentId?: string | null;
  /** Callback when edit mode starts */
  onEditStart?: (commentId: string) => void;
  /** Callback when edit mode ends */
  onEditEnd?: () => void;
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
  depth = 0,
  editingCommentId,
  onEditStart,
  onEditEnd
}: CommentProps) {
  // Refs for focus management
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();

  // State for managing delete operation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // State for managing edit operation
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [localComment, setLocalComment] = useState(comment);
  
  // Determine user permissions and depth constraints
  const isOwner = currentUserId === comment.user_id;
  const maxDepth = 3; // Maximum nesting level for replies
  const canReply = depth < maxDepth;

  /**
   * Handles entering edit mode for the comment.
   * Initializes edit state with current content.
   * Notifies parent to close any other open edits.
   */
  const handleEdit = () => {
    // Notify parent that this comment is being edited
    onEditStart?.(comment.id);
    setIsEditing(true);
    setEditContent(localComment.content);
    setEditError(null);
  };

  // Sync localComment with comment prop when it changes (e.g., when replies are added)
  useEffect(() => {
    setLocalComment(comment);
  }, [comment]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end of text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // Close edit mode if another comment starts editing
  useEffect(() => {
    if (isEditing && editingCommentId && editingCommentId !== comment.id) {
      // Another comment is being edited, close this one
      setIsEditing(false);
      setEditContent(localComment.content);
      setEditError(null);
    }
  }, [editingCommentId, comment.id, isEditing, localComment.content]);

  /**
   * Handles canceling edit mode.
   * Resets edit state and restores original content.
   * Notifies parent that editing has ended.
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(localComment.content);
    setEditError(null);
    
    // Notify parent that editing has ended
    onEditEnd?.();

    // Return focus to edit button after canceling
    setTimeout(() => {
      editButtonRef.current?.focus();
    }, 0);
  };

  /**
   * Handles saving edited comment with optimistic UI updates.
   * 
   * Process:
   * 1. Validate content (not empty, within character limit)
   * 2. Optimistically update UI with new content
   * 3. Attempt to save to database
   * 4. Invalidate cache on success
   * 5. Rollback and show error on failure
   * 
   * Requirements: 4.4, 6.3, 6.4, 7.1, 7.2, 7.3
   */
  const handleSaveEdit = async () => {
    if (!currentUserId || isSaving) return;

    const trimmedContent = editContent.trim();
    
    // Validate content is not empty
    if (!trimmedContent) {
      setEditError('Comment cannot be empty');
      return;
    }

    // Validate character limit
    if (trimmedContent.length > 1000) {
      setEditError('Comment exceeds 1000 character limit');
      return;
    }

    setIsSaving(true);
    setEditError(null);

    // Store original content for rollback
    const originalContent = localComment.content;
    const originalUpdatedAt = localComment.updated_at;

    try {
      // Optimistic update - update UI immediately
      const now = new Date().toISOString();
      setLocalComment({
        ...localComment,
        content: trimmedContent,
        updated_at: now
      });
      setIsEditing(false);

      // Save to database
      const result = await updateComment(comment.id, trimmedContent, currentUserId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update comment');
      }

      // Invalidate cache for this post's comments
      queryCache.invalidatePattern(`comments-${postId}`);

      // Show success toast notification
      showToast('Comment updated successfully', 'success', 4000);

      // Success - optimistic update is already applied
      // Notify parent that editing has ended
      onEditEnd?.();
      
      // Return focus to edit button after saving
      setTimeout(() => {
        editButtonRef.current?.focus();
      }, 0);
    } catch (error) {
      // Rollback optimistic update
      setLocalComment({
        ...localComment,
        content: originalContent,
        updated_at: originalUpdatedAt
      });
      setIsEditing(true);
      setEditContent(trimmedContent);
      
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes. Please try again.';
      setEditError(errorMessage);
      
      // Show error toast notification
      showToast(errorMessage, 'error', 5000);
      
      console.error('Failed to update comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles keyboard shortcuts in edit mode.
   * Ctrl/Cmd + Enter to save, Escape to cancel.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const trimmedContent = editContent.trim();
      if (!isSaving && trimmedContent && trimmedContent.length <= 1000) {
        handleSaveEdit();
      }
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

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
                {localComment.user_profiles?.username || 'Unknown User'}
              </span>
              <span className="text-gray-500 text-xs">
                {formatTimeAgo(localComment.created_at)}
              </span>
              {/* Edited Badge */}
              <EditedBadge 
                createdAt={localComment.created_at} 
                updatedAt={localComment.updated_at}
                className="ml-1"
              />
            </div>

            {/* Comment Text or Edit Mode */}
            {isEditing ? (
              <div className="space-y-2" role="region" aria-label="Comment editing form">
                {/* Screen reader announcement */}
                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  Edit mode active for comment
                </div>

                {/* Edit Textarea */}
                <div className="relative">
                  <label htmlFor={`comment-edit-${comment.id}`} className="sr-only">
                    Edit comment
                  </label>
                  <textarea
                    ref={textareaRef}
                    id={`comment-edit-${comment.id}`}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-gray-900 border border-gray-600 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm md:text-base min-h-[80px]"
                    rows={3}
                    maxLength={1100}
                    disabled={isSaving}
                    aria-label="Edit comment content"
                    aria-describedby={`char-count-${comment.id} keyboard-hint-${comment.id}${editError ? ` edit-error-${comment.id}` : ''}`}
                    aria-invalid={editError ? 'true' : 'false'}
                  />
                  {/* Character Counter */}
                  <div 
                    id={`char-count-${comment.id}`}
                    className={`absolute bottom-2 right-2 text-xs md:text-sm ${
                      editContent.length > 1000 ? 'text-red-400' : 
                      editContent.length > 900 ? 'text-yellow-400' : 
                      'text-gray-500'
                    }`}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {editContent.length} / 1000
                  </div>
                </div>

                {/* Keyboard hint */}
                <p id={`keyboard-hint-${comment.id}`} className="text-xs text-gray-500">
                  Press Ctrl+Enter to save, Escape to cancel
                </p>

                {/* Validation Error */}
                {editContent.length > 1000 && (
                  <p className="text-red-400 text-xs md:text-sm" role="alert" aria-live="polite">
                    Comment exceeds maximum length of 1000 characters
                  </p>
                )}
                {editContent.trim().length === 0 && (
                  <p className="text-red-400 text-xs md:text-sm" role="alert" aria-live="polite">
                    Comment cannot be empty
                  </p>
                )}

                {/* Edit Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving || !editContent.trim() || editContent.length > 1000}
                    className="px-4 md:px-5 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm md:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                    aria-label={isSaving ? 'Saving comment' : 'Save comment changes'}
                    aria-busy={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 md:px-5 py-2 md:py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm md:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 text-sm md:text-base break-words whitespace-pre-wrap">
                {localComment.content}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons - Only show when not editing */}
        {!isEditing && (
          <div className="flex items-center space-x-4 mt-3 ml-11 md:ml-13">
            {/* Reply Button - Only for authenticated users and if not at max depth */}
            {currentUserId && canReply && onReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-gray-400 hover:text-blue-400 text-xs md:text-sm font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded px-2"
                aria-label={`Reply to ${localComment.user_profiles?.username || 'comment'}`}
              >
                <span className="mr-1" aria-hidden="true">💬</span>
                <span className="hidden md:inline">Reply</span>
              </button>
            )}

            {/* Edit Button - Only for comment owner */}
            {isOwner && (
              <button
                ref={editButtonRef}
                onClick={handleEdit}
                className="text-gray-400 hover:text-yellow-400 text-xs md:text-sm font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded px-2"
                aria-label="Edit comment"
              >
                <span className="mr-1" aria-hidden="true">✏️</span>
                <span className="hidden md:inline">Edit</span>
              </button>
            )}

            {/* Delete Button - Only for comment owner */}
            {isOwner && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-gray-400 hover:text-red-400 text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded px-2"
                aria-label="Delete comment"
                aria-busy={isDeleting}
              >
                <span className="mr-1" aria-hidden="true">🗑️</span>
                <span className="hidden md:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
          </div>
        )}

        {/* Error Messages */}
        {editError && (
          <div 
            id={`edit-error-${comment.id}`}
            className="mt-2 ml-11 md:ml-13 text-red-400 text-xs md:text-sm"
            role="alert"
            aria-live="polite"
          >
            {editError}
          </div>
        )}
        {deleteError && (
          <div 
            className="mt-2 ml-11 md:ml-13 text-red-400 text-xs md:text-sm"
            role="alert"
            aria-live="polite"
          >
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
      {localComment.replies && localComment.replies.length > 0 && depth < maxDepth && (
        <div className="nested-replies">
          {localComment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1} // Increment depth for nested reply
              editingCommentId={editingCommentId}
              onEditStart={onEditStart}
              onEditEnd={onEditEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
