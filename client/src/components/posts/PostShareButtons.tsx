'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface PostShareButtonsProps {
  postId: string;
  postContent: string;
  username: string;
  postType: 'text' | 'audio';
  trackTitle?: string;
}

/**
 * PostShareButtons Component
 * 
 * Provides "Copy post url" and "Share post" buttons for sharing posts.
 * 
 * Features:
 * - Copy URL button: Copies post URL to clipboard
 * - Share button: Uses Web Share API with fallback to clipboard
 * - Manual copy modal for clipboard API failures
 * - Toast notifications for success/error states
 * - Accessibility features (ARIA labels, keyboard navigation)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function PostShareButtons({
  postId,
  postContent,
  username,
  postType,
  trackTitle,
}: PostShareButtonsProps) {
  const { showToast } = useToast();
  const [showManualCopyModal, setShowManualCopyModal] = useState(false);
  const [manualCopyUrl, setManualCopyUrl] = useState('');

  // Generate post URL
  const getPostUrl = (): string => {
    return `${window.location.origin}/posts/${postId}`;
  };

  // Generate share title
  const getShareTitle = (): string => {
    if (postType === 'audio' && trackTitle) {
      return `${username}'s post: ${trackTitle}`;
    }
    return `${username}'s post`;
  };

  /**
   * Handle Copy URL button click
   * Copies post URL to clipboard with fallback to manual copy modal
   * Requirements: 1.1, 1.2, 1.3
   */
  const handleCopyUrl = async () => {
    const postUrl = getPostUrl();

    try {
      await navigator.clipboard.writeText(postUrl);
      showToast('Post URL copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy post URL:', error);
      
      // Show fallback modal for manual copy
      setManualCopyUrl(postUrl);
      setShowManualCopyModal(true);
    }
  };

  /**
   * Handle Share button click
   * Uses Web Share API with fallback to clipboard
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  const handleShare = async () => {
    const postUrl = getPostUrl();
    const shareTitle = getShareTitle();

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: postContent ? postContent.substring(0, 160) : shareTitle,
          url: postUrl,
        });
        
        // Success - show toast
        showToast('Post shared successfully', 'success');
      } catch (error) {
        // User cancelled the share - don't show error notification
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        // Other errors - fall back to clipboard
        console.error('Share failed:', error);
        await handleCopyUrl();
      }
    } else {
      // Web Share API not supported - fall back to clipboard
      await handleCopyUrl();
    }
  };

  /**
   * Handle manual copy modal close
   */
  const handleCloseManualCopyModal = () => {
    setShowManualCopyModal(false);
  };

  /**
   * Handle manual copy button click
   */
  const handleManualCopy = () => {
    const input = document.querySelector('#manual-copy-input') as HTMLInputElement;
    if (input) {
      input.select();
      try {
        document.execCommand('copy');
        showToast('Post URL copied to clipboard', 'success');
        setShowManualCopyModal(false);
      } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy URL', 'error');
      }
    }
  };

  // Handle Escape key for manual copy modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showManualCopyModal) {
        handleCloseManualCopyModal();
      }
    };

    if (showManualCopyModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showManualCopyModal]);

  return (
    <>
      {/* Copy URL Button */}
      <button
        onClick={handleCopyUrl}
        className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors text-sm px-2 py-1 rounded hover:bg-blue-900/10"
        aria-label="Copy post URL to clipboard"
        title="Copy post url"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <span>Copy post url</span>
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors text-sm px-2 py-1 rounded hover:bg-green-900/10"
        aria-label="Share this post"
        title="Share post"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span>Share post</span>
      </button>

      {/* Manual Copy Fallback Modal */}
      {showManualCopyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={handleCloseManualCopyModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-copy-title"
          aria-describedby="manual-copy-description"
        >
          <div
            className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="manual-copy-title" className="text-lg font-semibold text-white">
                Copy Post URL
              </h3>
              <button
                onClick={handleCloseManualCopyModal}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p id="manual-copy-description" className="text-gray-300 text-sm mb-4">
              Automatic clipboard access is not available. Please copy the URL manually:
            </p>

            <div className="bg-gray-700 rounded p-3 mb-4">
              <input
                id="manual-copy-input"
                type="text"
                value={manualCopyUrl}
                readOnly
                className="w-full bg-transparent text-white text-sm focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                autoFocus
                aria-label="Post URL for manual copying"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCloseManualCopyModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Close
              </button>
              <button
                onClick={handleManualCopy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Select & Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
