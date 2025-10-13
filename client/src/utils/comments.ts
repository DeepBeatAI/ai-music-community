import { supabase } from '@/lib/supabase';
import { logger } from './logger';

export interface UpdateCommentResult {
  success: boolean;
  error?: string;
}

/**
 * Updates a comment's content with validation
 * @param commentId - The ID of the comment to update
 * @param content - The new content for the comment
 * @param userId - The ID of the user making the update (for authorization)
 * @returns Result object with success status and optional error message
 */
export async function updateComment(
  commentId: string,
  content: string,
  userId: string
): Promise<UpdateCommentResult> {
  try {
    // Validate content is not empty
    if (!content.trim()) {
      return { 
        success: false, 
        error: 'Comment cannot be empty' 
      };
    }

    // Validate character limit (1000 characters)
    if (content.length > 1000) {
      return { 
        success: false, 
        error: 'Comment exceeds 1000 character limit' 
      };
    }

    // Update comment in database
    // RLS policies will enforce that user can only update their own comments
    const { error } = await supabase
      .from('comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error updating comment:', error);
      
      // Check for authorization errors
      if (error.code === 'PGRST301' || error.message.includes('permission')) {
        return { 
          success: false, 
          error: 'You do not have permission to edit this content' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to update comment' 
      };
    }

    logger.debug(`Successfully updated comment ${commentId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error in updateComment:', error);
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { 
        success: false, 
        error: 'Failed to save changes. Please check your connection.' 
      };
    }
    
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}
