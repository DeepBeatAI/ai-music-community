'use client';

import { useState, FormEvent } from 'react';
import { ACTION_TYPE_LABELS } from '@/types/moderation';

/**
 * Props for the original action details to display
 */
export interface OriginalActionDetails {
  actionType: string;
  reason: string;
  appliedBy?: string;
  appliedAt: string;
  duration?: string;
  expiresAt?: string;
  targetUser?: string;
}

/**
 * Props for the ReversalConfirmationDialog component
 */
interface ReversalConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title: string;
  originalAction: OriginalActionDetails;
  confirmButtonText?: string;
  warningMessage?: string;
  isIrreversible?: boolean;
}

/**
 * ReversalConfirmationDialog Component
 * 
 * A reusable dialog for confirming the reversal of moderation actions.
 * 
 * Features:
 * - Display original action details (who, when, why, duration)
 * - Require reason input (textarea, required)
 * - Show warning for irreversible actions
 * - Implement loading state during reversal
 * - Show success/error messages
 * 
 * Requirements: 13.4, 13.14
 */
export function ReversalConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  originalAction,
  confirmButtonText = 'Confirm Reversal',
  warningMessage,
  isIrreversible = false,
}: ReversalConfirmationDialogProps): React.ReactElement | null {
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Validates the reversal reason
   */
  const validateReason = (): boolean => {
    if (!reversalReason.trim()) {
      setError('Reason for reversal is required');
      return false;
    }

    if (reversalReason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return false;
    }

    if (reversalReason.length > 1000) {
      setError('Reason must be 1000 characters or less');
      return false;
    }

    return true;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    // Validate reason
    if (!validateReason()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call the onConfirm callback with the reason
      await onConfirm(reversalReason.trim());

      // Show success state
      setSuccess(true);

      // Close dialog after a short delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to reverse action:', err);
      setError(err instanceof Error ? err.message : 'Failed to reverse action. Please try again.');
      setIsSubmitting(false);
    }
  };

  /**
   * Handles dialog close
   */
  const handleClose = (): void => {
    if (!isSubmitting) {
      setReversalReason('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  /**
   * Handles backdrop click
   */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  /**
   * Formats a date string for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Gets the action type label for display
   */
  const getActionTypeLabel = (actionType: string): string => {
    return ACTION_TYPE_LABELS[actionType as keyof typeof ACTION_TYPE_LABELS] || actionType;
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow-xl max-w-md w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {success && (
          <div className="p-4 sm:p-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <svg
                className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-lg font-semibold text-green-800 dark:text-green-300">
                Action Reversed Successfully
              </p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                The user has been notified of the reversal.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are about to reverse this moderation action. The user will be notified of the reversal.
            </p>

            {/* Irreversible Warning */}
            {isIrreversible && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
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
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <span className="font-semibold">Warning:</span> This action cannot be undone. Please ensure you have reviewed all details carefully.
                  </p>
                </div>
              </div>
            )}

            {/* Custom Warning Message */}
            {warningMessage && !isIrreversible && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  {warningMessage}
                </p>
              </div>
            )}

            {/* Original Action Details */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Original Action Details:
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Action Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getActionTypeLabel(originalAction.actionType)}
                  </span>
                </div>

                {originalAction.targetUser && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Target User:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {originalAction.targetUser}
                    </span>
                  </div>
                )}

                {originalAction.appliedBy && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Applied By:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {originalAction.appliedBy}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Applied On:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(originalAction.appliedAt)}
                  </span>
                </div>

                {originalAction.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {originalAction.duration}
                    </span>
                  </div>
                )}

                {originalAction.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(originalAction.expiresAt)}
                    </span>
                  </div>
                )}

                {originalAction.reason && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">Reason:</span>
                    <p className="text-gray-900 dark:text-white">
                      {originalAction.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Reversal Reason Input */}
            <div>
              <label
                htmlFor="reversalReason"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Reason for reversal <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reversalReason"
                value={reversalReason}
                onChange={(e) => {
                  setReversalReason(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                maxLength={1000}
                rows={4}
                placeholder="Explain why this action is being reversed (minimum 10 characters)..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
                  error
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              />
              <div className="flex justify-between items-center mt-1">
                {error ? (
                  <p className="text-sm text-red-500">{error}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Minimum 10 characters required
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {reversalReason.length}/1000
                </p>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                The user will receive a notification explaining that this action has been reversed, including your reason for the reversal.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reversalReason.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  confirmButtonText
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
