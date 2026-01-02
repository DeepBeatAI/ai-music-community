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
 * - Required additional details field
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
  const [errors, setErrors] = useState<{ reason?: string; internalNotes?: string; originalWorkLink?: string; audioTimestamp?: string }>({});
  
  // Evidence field state variables
  const [originalWorkLink, setOriginalWorkLink] = useState('');
  const [proofOfOwnership, setProofOfOwnership] = useState('');
  const [audioTimestamp, setAudioTimestamp] = useState('');

  // Don't render if not open
  if (!isOpen) return null;

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  /**
   * Validates URL format
   * Returns true if valid or empty, false otherwise
   */
  const validateURL = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    
    try {
      const urlObj = new URL(url);
      // Check for valid protocol (http or https)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  /**
   * Validates timestamp format (MM:SS or HH:MM:SS)
   * Returns true if valid or empty, false otherwise
   */
  const validateTimestamp = (timestamp: string): boolean => {
    if (!timestamp.trim()) return true; // Empty is valid (optional field)
    
    // Split by comma to support multiple timestamps
    const timestamps = timestamp.split(',').map(t => t.trim());
    
    // Match MM:SS or HH:MM:SS format
    const timestampRegex = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;
    
    // Validate each timestamp
    for (const ts of timestamps) {
      if (!ts) continue; // Skip empty entries (e.g., trailing comma)
      
      const match = ts.match(timestampRegex);
      if (!match) return false;
      
      const hours = match[3] ? parseInt(match[1], 10) : 0;
      const minutes = match[3] ? parseInt(match[2], 10) : parseInt(match[1], 10);
      const seconds = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10);
      
      // Validate ranges
      if (match[3]) {
        // HH:MM:SS format
        if (!(hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59)) {
          return false;
        }
      } else {
        // MM:SS format
        if (!(minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59)) {
          return false;
        }
      }
    }
    
    return true;
  };

  /**
   * Validates the form fields
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: { reason?: string; internalNotes?: string; originalWorkLink?: string; audioTimestamp?: string } = {};

    // Validate reason selection
    if (!reason) {
      newErrors.reason = 'Please select a reason for flagging';
    }

    // Validate additional details (required for moderator flags)
    if (!internalNotes.trim()) {
      newErrors.internalNotes = 'Additional details are required for moderator flags';
    } else if (internalNotes.trim().length < 10) {
      newErrors.internalNotes = 'Additional details must be at least 10 characters';
    }

    // Validate URL format if provided
    if (originalWorkLink.trim() && !validateURL(originalWorkLink)) {
      newErrors.originalWorkLink = 'Please enter a valid URL (e.g., https://example.com)';
    }

    // Validate timestamp format if provided
    if (audioTimestamp.trim() && !validateTimestamp(audioTimestamp)) {
      newErrors.audioTimestamp = 'Please use format MM:SS or HH:MM:SS. Multiple timestamps can be separated by commas (e.g., 2:35, 5:12, 8:45)';
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
        metadata: {
          originalWorkLink: originalWorkLink.trim() || undefined,
          proofOfOwnership: proofOfOwnership.trim() || undefined,
          audioTimestamp: audioTimestamp.trim() || undefined,
        },
      });

      // Show success message
      showToast('Content flagged successfully. It has been added to the moderation queue.', 'success');

      // Reset form and close modal
      setReason('');
      setInternalNotes('');
      setPriority(3);
      setOriginalWorkLink('');
      setProofOfOwnership('');
      setAudioTimestamp('');
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
      setOriginalWorkLink('');
      setProofOfOwnership('');
      setAudioTimestamp('');
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

          {/* Additional details Textarea */}
          <div>
            <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional details <span className="text-red-500">*</span>
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

          {/* Copyright Evidence Fields */}
          {reason === 'copyright_violation' && (
            <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Providing evidence helps with faster resolution
                </p>
              </div>

              <div>
                <label htmlFor="originalWorkLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to original work (optional)
                </label>
                <input
                  type="url"
                  id="originalWorkLink"
                  value={originalWorkLink}
                  onChange={(e) => {
                    setOriginalWorkLink(e.target.value);
                    setErrors({ ...errors, originalWorkLink: undefined });
                  }}
                  onBlur={() => {
                    if (originalWorkLink.trim() && !validateURL(originalWorkLink)) {
                      setErrors({ ...errors, originalWorkLink: 'Please enter a valid URL (e.g., https://example.com)' });
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="https://example.com/original-work"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors.originalWorkLink
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.originalWorkLink ? (
                  <p className="mt-1 text-sm text-red-500">{errors.originalWorkLink}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    URL to the original copyrighted work
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="proofOfOwnership" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proof of ownership (optional)
                </label>
                <textarea
                  id="proofOfOwnership"
                  value={proofOfOwnership}
                  onChange={(e) => setProofOfOwnership(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe how ownership can be verified..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {proofOfOwnership.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {/* Audio Timestamp Field */}
          {(reason === 'hate_speech' || reason === 'harassment' || reason === 'inappropriate_content') && reportType === 'track' && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  Specify where the violation occurs in the audio
                </p>
              </div>

              <div>
                <label htmlFor="audioTimestamp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timestamp in audio (optional)
                </label>
                <input
                  type="text"
                  id="audioTimestamp"
                  value={audioTimestamp}
                  onChange={(e) => {
                    setAudioTimestamp(e.target.value);
                    setErrors({ ...errors, audioTimestamp: undefined });
                  }}
                  onBlur={() => {
                    if (audioTimestamp.trim() && !validateTimestamp(audioTimestamp)) {
                      setErrors({ ...errors, audioTimestamp: 'Please use format MM:SS or HH:MM:SS. Multiple timestamps can be separated by commas (e.g., 2:35, 5:12, 8:45)' });
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="e.g., 2:35 or 1:23:45 (multiple: 2:35, 5:12, 8:45)"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors.audioTimestamp
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.audioTimestamp ? (
                  <p className="mt-1 text-sm text-red-500">{errors.audioTimestamp}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Format: MM:SS or HH:MM:SS. Separate multiple timestamps with commas (e.g., 2:35, 5:12, 8:45)
                  </p>
                )}
              </div>
            </div>
          )}

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
