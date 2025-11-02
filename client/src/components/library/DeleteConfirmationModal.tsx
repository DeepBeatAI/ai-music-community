'use client';

import { useState, useEffect, useRef } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  trackTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * DeleteConfirmationModal Component
 * 
 * Modal for confirming track deletion.
 * Warns user about consequences (removal from albums/playlists).
 * 
 * Features:
 * - Clear warning message
 * - Confirmation and cancel buttons
 * - Loading state during deletion
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * 
 * Requirements: 3.11, 9.2, 9.5
 */
export function DeleteConfirmationModal({
  isOpen,
  trackTitle,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const [deleting, setDeleting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deleting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, deleting, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !deleting) {
      onClose();
    }
  };

  // Handle confirm deletion
  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Failed to delete track:', error);
      // Error is handled by parent component
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-red-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 id="modal-title" className="text-xl font-semibold text-white">
              Delete Track
            </h2>
          </div>
          {!deleting && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-colors"
              aria-label="Close modal"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-white mb-4">
            Are you sure you want to delete <span className="font-semibold">&quot;{trackTitle}&quot;</span>?
          </p>
          <div className="bg-red-900 bg-opacity-20 border border-red-900 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              <strong>Warning:</strong> This action cannot be undone. The track will be:
            </p>
            <ul className="text-red-400 text-sm mt-2 ml-4 list-disc space-y-1">
              <li>Permanently deleted from your library</li>
              <li>Removed from all albums</li>
              <li>Removed from all playlists</li>
              <li>No longer accessible to anyone</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete Track</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
