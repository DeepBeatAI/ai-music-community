'use client'
import { useState } from 'react';
import { formatTimeAgo } from '@/utils/format';
import { CommentWithProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/queryCache';

interface CommentProps {
  comment: CommentWithProfile;
  postId: string;
  currentUserId?: string;
  onReply?: (parentId: string) => void;
  onDelete?: (commentId: string, totalCount: number) => void;
  depth?: number;
}

// Helper function to count total comments (including nested replies)
function countTotalComments(comment: CommentWithProfile): number {
  let count = 1; // Count the comment itself
  if (comment.replies && comment.replies.length > 0) {
    count += comment.replies.reduce((sum, reply) => sum + countTotalComments(reply), 0);
  }
  return count;
}

export default function Comment({
  comment,
  postId,
  currentUserId,
  onReply,
  onDelete,
  depth = 0
}: CommentProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isOwner = currentUserId === comment.user_id;
  const maxDepth = 3;
  const canReply = depth < maxDepth;

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;

    // Optimistic UI update
    setIsDeleting(true);
    setDeleteError(null);

    // Count total comments that will be deleted (including nested replies)
    const totalToDelete = countTotalComments(comment);

    // Call parent's onDelete callback for optimistic UI
    onDelete(comment.id, totalToDelete);

    try {
      // Attempt to delete from database
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id)
        .eq('user_id', currentUserId); // Extra security check

      if (error) {
        throw error;
      }

      // Invalidate cache for this post's comments
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

      {/* Nested Replies - Recursive Rendering */}
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
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
