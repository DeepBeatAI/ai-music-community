'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Post } from '@/types';
import PostItem from './PostItem';
import EditedBadge from './EditedBadge';
import { updatePost } from '@/utils/posts';
import { useToast } from '@/contexts/ToastContext';

interface EditablePostProps {
  post: Post;
  currentUserId?: string;
  onDelete?: (postId: string) => void;
  showWaveform?: boolean;
  onUpdate?: (postId: string, newContent: string) => void;
}

interface EditState {
  isEditing: boolean;
  editedContent: string;
  isSaving: boolean;
  error: string | null;
}

export default function EditablePost({
  post,
  currentUserId,
  onDelete,
  showWaveform = true,
  onUpdate,
}: EditablePostProps) {
  const isOwner = currentUserId === post.user_id;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();
  
  const [editState, setEditState] = useState<EditState>({
    isEditing: false,
    editedContent: post.content || '',
    isSaving: false,
    error: null,
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localPost, setLocalPost] = useState(post);

  // Update local post when prop changes
  useEffect(() => {
    setLocalPost(post);
    setEditState(prev => ({
      ...prev,
      editedContent: post.content || '',
    }));
  }, [post]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(
      editState.isEditing && editState.editedContent !== (post.content || '')
    );
  }, [editState.isEditing, editState.editedContent, post.content]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleEditClick = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      isEditing: true,
      editedContent: localPost.content || '',
      error: null,
    }));
  }, [localPost.content]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (editState.isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end of text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [editState.isEditing]);

  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }

    setEditState({
      isEditing: false,
      editedContent: localPost.content || '',
      isSaving: false,
      error: null,
    });

    // Return focus to edit button after canceling
    setTimeout(() => {
      editButtonRef.current?.focus();
    }, 0);
  }, [hasUnsavedChanges, localPost.content]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditState(prev => ({
      ...prev,
      editedContent: e.target.value,
      error: null,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    // Validate content for text posts (audio posts can have empty captions)
    const isAudioPost = post.post_type === 'audio';
    if (!isAudioPost && !editState.editedContent.trim()) {
      setEditState(prev => ({
        ...prev,
        error: 'Content cannot be empty',
      }));
      return;
    }

    setEditState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const result = await updatePost(post.id, editState.editedContent, currentUserId!, post.post_type);

      if (result.success) {
        // Update local post state
        const updatedPost = {
          ...localPost,
          content: editState.editedContent,
          updated_at: new Date().toISOString(),
        };
        setLocalPost(updatedPost);

        // Exit edit mode
        setEditState({
          isEditing: false,
          editedContent: editState.editedContent,
          isSaving: false,
          error: null,
        });

        // Show success toast notification
        showToast('Post updated successfully', 'success', 4000);

        // Notify parent component
        onUpdate?.(post.id, editState.editedContent);

        // Return focus to edit button after saving
        setTimeout(() => {
          editButtonRef.current?.focus();
        }, 0);
      } else {
        setEditState(prev => ({
          ...prev,
          isSaving: false,
          error: result.error || 'Failed to save changes',
        }));
        // Show error toast notification
        showToast(result.error || 'Failed to save changes', 'error', 5000);
      }
    } catch (error) {
      console.error('Error saving post:', error);
      const errorMessage = 'Network error. Please check your connection and try again.';
      setEditState(prev => ({
        ...prev,
        isSaving: false,
        error: errorMessage,
      }));
      // Show error toast notification
      showToast(errorMessage, 'error', 5000);
    }
  }, [editState.editedContent, post.id, post.post_type, currentUserId, localPost, onUpdate, showToast]);

  const handleRetry = useCallback(() => {
    handleSave();
  }, [handleSave]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!editState.isSaving && editState.editedContent.trim()) {
        handleSave();
      }
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [editState.isSaving, editState.editedContent, handleSave, handleCancelEdit]);

  // If not in edit mode, render normal PostItem with edit button and badge
  if (!editState.isEditing) {
    return (
      <div className="relative">
        <PostItem
          post={localPost}
          currentUserId={currentUserId}
          onDelete={onDelete}
          showWaveform={showWaveform}
          editButton={
            isOwner ? (
              <button
                ref={editButtonRef}
                onClick={handleEditClick}
                className="text-gray-400 hover:text-blue-400 p-2 rounded-full hover:bg-blue-900/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                title="Edit post"
                aria-label="Edit post"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            ) : undefined
          }
          editedBadge={
            localPost.created_at && localPost.updated_at ? (
              <EditedBadge
                createdAt={localPost.created_at}
                updatedAt={localPost.updated_at}
              />
            ) : undefined
          }
        />
      </div>
    );
  }

  // Edit mode UI
  const username = post.user_profiles?.username || 'Anonymous';
  const isAudioPost = post.post_type === 'audio';

  return (
    <div 
      className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700"
      role="region"
      aria-label="Post editing form"
    >
      {/* Post Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-gray-200 font-medium">{username}</p>
              <span className="text-yellow-400 text-xs bg-yellow-900/30 px-2 py-1 rounded-full">
                ✏️ Editing
              </span>
              {isAudioPost && (
                <span className="text-blue-400 text-xs bg-blue-900/30 px-2 py-1 rounded-full">
                  🎵 Audio {isAudioPost && '(Caption Only)'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Edit mode active. {isAudioPost ? 'Editing caption only.' : 'Editing post content.'}
      </div>

      {/* Edit Form */}
      <div className="p-4 space-y-4">
        {isAudioPost && (
          <div 
            className="text-sm md:text-base text-gray-400 bg-blue-900/20 border border-blue-800 rounded p-3"
            role="note"
            aria-label="Audio post editing restriction"
          >
            ℹ️ You can only edit the caption for audio posts. The audio file cannot be changed.
          </div>
        )}

        <div>
          <label htmlFor="post-content" className="block text-sm font-medium text-gray-300 mb-2">
            {isAudioPost ? 'Caption' : 'Content'}
          </label>
          <textarea
            ref={textareaRef}
            id="post-content"
            value={editState.editedContent}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            disabled={editState.isSaving}
            className={`w-full bg-gray-700 text-gray-200 rounded-lg p-3 md:p-4 border ${
              editState.error && editState.error === 'Content cannot be empty'
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
            } focus:ring-2 outline-none resize-none min-h-[120px] md:min-h-[150px] text-base md:text-lg`}
            placeholder={isAudioPost ? 'Add a caption (optional)...' : 'What\'s on your mind?'}
            aria-label={isAudioPost ? 'Edit caption' : 'Edit content'}
            aria-describedby={editState.error ? 'validation-error keyboard-hint' : 'keyboard-hint'}
            aria-invalid={editState.error === 'Content cannot be empty' ? 'true' : 'false'}
          />
          
          {/* Inline Validation Error - Shows directly below textarea */}
          {editState.error === 'Content cannot be empty' && (
            <div 
              id="validation-error"
              role="alert"
              aria-live="assertive"
              className="flex items-start space-x-2 mt-2 text-red-400"
            >
              <svg 
                className="w-5 h-5 flex-shrink-0 mt-0.5" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span className="text-sm md:text-base font-medium">Content cannot be empty</span>
            </div>
          )}
          
          <p id="keyboard-hint" className="text-xs text-gray-500 mt-1">
            Press Ctrl+Enter to save, Escape to cancel
          </p>
        </div>

        {/* Network Error Message - Shows as separate alert box */}
        {editState.error && editState.error !== 'Content cannot be empty' && (
          <div 
            id="network-error"
            role="alert"
            aria-live="polite"
            className="bg-red-900/20 border border-red-800 rounded p-3 space-y-2"
          >
            <p className="text-red-400 text-sm md:text-base">❌ {editState.error}</p>
            {editState.error.includes('Network') && (
              <button
                onClick={handleRetry}
                className="text-sm md:text-base text-blue-400 hover:text-blue-300 underline min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Retry saving changes"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={handleCancelEdit}
            disabled={editState.isSaving}
            className="px-4 md:px-6 py-2 md:py-3 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-base md:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={editState.isSaving}
            className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 min-w-[100px] md:min-w-[120px] justify-center min-h-[44px] text-base md:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label={editState.isSaving ? 'Saving changes' : 'Save changes'}
            aria-busy={editState.isSaving}
          >
            {editState.isSaving ? (
              <>
                <div className="animate-spin w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full" aria-hidden="true"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </div>

      {/* Audio Player (if audio post) - Show in edit mode but disabled */}
      {isAudioPost && post.audio_url && (
        <div className="p-4 bg-gray-750 border-t border-gray-700">
          <div className="bg-gray-700 rounded p-4 text-center text-gray-400 text-sm">
            🎵 Audio preview disabled during editing
          </div>
        </div>
      )}
    </div>
  );
}
