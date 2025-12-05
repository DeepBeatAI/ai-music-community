'use client';

import { useState, FormEvent } from 'react';
import { ReportType, ReportReason, REASON_LABELS } from '@/types/moderation';
import { submitReport } from '@/lib/moderationService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  targetId: string;
}

/**
 * ReportModal Component
 * 
 * Modal for users to report content that violates community guidelines.
 * 
 * Features:
 * - Reason dropdown with all violation categories
 * - Optional description field (required for "Other" reason)
 * - 1000 character limit on description
 * - Form validation
 * - Loading states during submission
 * - Success/error toast notifications
 * - Rate limit handling (10 reports per 24 hours)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7
 */
export function ReportModal({ isOpen, onClose, reportType, targetId }: ReportModalProps): React.ReactElement | null {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ reason?: string; description?: string }>({});

  /**
   * Validates the form fields
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: { reason?: string; description?: string } = {};

    // Validate reason selection
    if (!reason) {
      newErrors.reason = 'Please select a reason for reporting';
    }

    // Validate description for "Other" reason
    if (reason === 'other' && !description.trim()) {
      newErrors.description = 'Please provide a description when selecting "Other"';
    }

    // Validate description length
    if (description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
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
      // Submit the report
      await submitReport({
        reportType,
        targetId,
        reason: reason as ReportReason,
        description: description.trim() || undefined,
      });

      // Show success message
      showToast('Report submitted successfully. Our moderation team will review it.', 'success');

      // Reset form and close modal
      setReason('');
      setDescription('');
      setErrors({});
      onClose();
    } catch (error: any) {
      // Handle rate limit error
      if (error.code === 'MODERATION_RATE_LIMIT_EXCEEDED') {
        showToast(
          'You have reached the maximum number of reports (10) in 24 hours. Please try again later.',
          'error',
          6000
        );
      } else {
        // Handle other errors
        showToast(
          error.message || 'Failed to submit report. Please try again.',
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
      setDescription('');
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

  // Don't render if not open
  if (!isOpen) return null;

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow-xl max-w-md w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Report {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
          </h2>
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
              Reason for reporting <span className="text-red-500">*</span>
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as ReportReason | '');
                setErrors({ ...errors, reason: undefined });
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

          {/* Description Textarea */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional details {reason === 'other' && <span className="text-red-500">*</span>}
              {reason === 'other' && <span className="text-gray-500 text-xs ml-1">(required)</span>}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors({ ...errors, description: undefined });
              }}
              disabled={isSubmitting}
              maxLength={1000}
              rows={4}
              placeholder={reason === 'other' ? 'Please describe the violation...' : 'Optional: Provide additional context...'}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
                errors.description
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description ? (
                <p className="text-sm text-red-500">{errors.description}</p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {reason === 'other' ? 'Required when selecting "Other"' : 'Optional'}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description.length}/1000
              </p>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your report will be reviewed by our moderation team. False reports may result in restrictions on your account.
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
              disabled={isSubmitting || !reason}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
