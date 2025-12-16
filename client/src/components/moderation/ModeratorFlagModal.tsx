'use client';

import { useState, FormEvent } from 'react';
import { ReportType, ReportReason, REASON_LABELS, PRIORITY_LABELS } from '@/types/moderation';
import { moderatorFlagContent, PRIORITY_MAP } from '@/lib/moderationService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface ModeratorFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  targetId: string;
}

/**
 * ModeratorFlagModal Component
 * 
 * Simplified modal for moderators to flag content for review.
 * This bypasses the user report flow and creates reports with "under_review" status.
 * 
 * Features:
 * - Reason dropdown with all violation categories
 * - Required internal notes field
 * - Priority selector (P1-P5)
 * - "Moderator Flag" indicator
 * - Form validation
 * - Loading states during submission
 * - Success/error toast notifications
 * 
 * Requirements: 2.1, 2.2
 */
export function ModeratorFlagModal({ 
  isOpen, 
  onClose, 
  reportType, 
  targetId 
}: ModeratorFlagModalProps): React.ReactElement | null {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [internalNotes, setInternalNotes] = useState('');
  const [priority, setPriority] = useState<number>(3); // Default to P3 - Standard
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ reason?: string; internalNotes?: string }>({});

  // Don't render if not open
  if (!isOpen) return null;

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  /**
   * Validates the form fields
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: { reason?: string; internalNotes?: string } = {};

    // Validate reason selection
    if (!reason) {
      newErrors.reason = 'Please select a reason for flagging';
    }

    // Validate internal notes (required for moderator flags)
    if (!internalNotes.trim()) {
      newErrors.internalNotes = 'Internal notes are required for moderator flags';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit the moderator flag
      await moderatorFlagContent({
        reportType,
        targetId,
        reason: reason as ReportReason,
        internalNotes: internalNotes.trim(),
        priority,
      });

      // Show success message
      showToast('Content flagged successfully. It has been added to the moderation queue.', 'success');

      // Reset form and close modal
      setReason('');
      setInternalNotes('');
      setPriority(3);
      setErrors({});
      onClose();
    } catch (error: any) {
      // Handle unauthorized error
      if (error.code === 'MODERATION_UNAUTHORIZED') {
        showToast(
          'You do not have permission to flag content. Only moderators and admins can flag content.',
          'error',
          6000
        );
      } else {
        // Handle other errors
        showToast(
          error.message || 'Failed to flag content. Please try again.',
          'error'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles modal close
   */
  const handleClose = (): void => {
    if (!isSubmitting) {
      setReason('');
      setInternalNotes('');
      setPriority(3);
      setErrors({});
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow-xl max-w-md w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Flag {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
            </h2>
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
              Moderator Flag
            </span>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Reason Dropdown */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for flagging <span className="text-red-500">*</span>
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => {
                const selectedReason = e.target.value as ReportReason | '';
                setReason(selectedReason);
                setErrors({ ...errors, reason: undefined });
                
                // Auto-update priority based on reason's default priority
                if (selectedReason && selectedReason in PRIORITY_MAP) {
                  setPriority(PRIORITY_MAP[selectedReason]);
                }
              }}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.reason
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
              <option value="">Select a reason...</option>
              {Object.entries(REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="mt-1 text-sm text-red-500">{errors.reason}</p>
            )}
          </div>

          {/* Priority Selector */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority Level
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              P1 = Critical, P2 = High, P3 = Standard, P4 = Low, P5 = Minimal
            </p>
          </div>

          {/* Internal Notes Textarea */}
          <div>
            <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Internal Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="internalNotes"
              value={internalNotes}
              onChange={(e) => {
                setInternalNotes(e.target.value);
                setErrors({ ...errors, internalNotes: undefined });
              }}
              disabled={isSubmitting}
              rows={4}
              placeholder="Provide details about why this content is being flagged. These notes are visible to other moderators."
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
                errors.internalNotes
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
            />
            {errors.internalNotes && (
              <p className="mt-1 text-sm text-red-500">{errors.internalNotes}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Required. Visible to other moderators only.
            </p>
          </div>

          {/* Info Message */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              This flag will create a report with "under_review" status and appear at the top of the moderation queue.
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
              disabled={isSubmitting || !reason || !internalNotes.trim()}
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Flagging...
                </>
              ) : (
                'Flag Content'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
