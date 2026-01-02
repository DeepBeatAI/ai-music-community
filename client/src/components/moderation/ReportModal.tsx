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
  const [errors, setErrors] = useState<{ reason?: string; description?: string; originalWorkLink?: string; audioTimestamp?: string }>({});
  
  // Evidence field state variables
  const [originalWorkLink, setOriginalWorkLink] = useState('');
  const [proofOfOwnership, setProofOfOwnership] = useState('');
  const [audioTimestamp, setAudioTimestamp] = useState('');
  const [showExamples, setShowExamples] = useState(false);

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
   * Gets examples for the selected violation type
   */
  const getExamples = (): { good: string[]; bad: string[] } | null => {
    if (!reason) return null;

    const examples: Record<ReportReason, { good: string[]; bad: string[] }> = {
      spam: {
        good: [
          'User posted the same promotional link in 5 consecutive comments within 10 minutes (2:35 PM - 2:45 PM)',
          'Profile contains multiple external links to unrelated commercial sites. Bio text is copy-pasted spam about cryptocurrency',
        ],
        bad: [
          'This is spam',
          'I don\'t like this content',
        ],
      },
      hate_speech: {
        good: [
          'Track contains slurs targeting [specific group] at timestamp 2:35. The lyrics explicitly promote hatred and violence',
          'User\'s comment uses derogatory language about [specific group] and calls for discrimination',
        ],
        bad: [
          'This is offensive',
          'I don\'t agree with this',
        ],
      },
      harassment: {
        good: [
          'User has sent me 15 threatening messages over the past 3 days. Screenshots available. Messages contain personal threats and attempts to intimidate',
          'This user is repeatedly commenting on all my tracks with personal attacks and insults (see their comment history on my profile)',
        ],
        bad: [
          'They are mean',
          'I don\'t like them',
        ],
      },
      inappropriate_content: {
        good: [
          'Track contains explicit sexual content at 1:23 without age restriction. Lyrics describe graphic sexual acts',
          'Album cover shows graphic violence that violates community guidelines. Image depicts [specific violation]',
        ],
        bad: [
          'This is inappropriate',
          'Bad content',
        ],
      },
      copyright_violation: {
        good: [
          'This track uses the melody from "Song Name" by Artist Name without permission. Original work: [link]. I am the copyright holder and can provide proof of ownership',
          'User uploaded my original composition without credit. I released this track on [date] at [link]. This is a direct copy with no transformative elements',
        ],
        bad: [
          'This is stolen music',
          'Copyright violation',
        ],
      },
      impersonation: {
        good: [
          'This account is impersonating verified artist [Name]. They are using the artist\'s photos, bio, and claiming to be them. Real artist profile: [link]',
          'User is pretending to be me and messaging my followers. They copied my profile picture and username with slight variation',
        ],
        bad: [
          'Fake account',
          'Not the real person',
        ],
      },
      self_harm: {
        good: [
          'Track lyrics explicitly encourage self-harm at 2:15. Content includes detailed methods and glorifies harmful behavior',
          'User\'s bio contains suicide instructions and links to harmful content. This poses immediate danger',
        ],
        bad: [
          'Concerning content',
          'Sad lyrics',
        ],
      },
      other: {
        good: [
          'User is exploiting a bug to artificially inflate play counts. I noticed their track went from 100 to 10,000 plays in 1 hour with no engagement',
          'This content violates [specific policy] by [detailed explanation]. Evidence: [specific details]',
        ],
        bad: [
          'Something is wrong',
          'Please review',
        ],
      },
    };

    return examples[reason as ReportReason] || null;
  };

  /**
   * Validates the form fields
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: { reason?: string; description?: string; originalWorkLink?: string; audioTimestamp?: string } = {};

    // Validate reason selection
    if (!reason) {
      newErrors.reason = 'Please select a reason for reporting';
    }

    // Validate description minimum length (20 characters)
    if (!description.trim() || description.trim().length < 20) {
      newErrors.description = 'Please provide at least 20 characters describing the violation';
    }

    // Validate description length
    if (description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
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
      // Submit the report
      await submitReport({
        reportType,
        targetId,
        reason: reason as ReportReason,
        description: description.trim() || undefined,
        metadata: {
          originalWorkLink: originalWorkLink.trim() || undefined,
          proofOfOwnership: proofOfOwnership.trim() || undefined,
          audioTimestamp: audioTimestamp.trim() || undefined,
        },
      });

      // Show success message
      showToast('Report submitted successfully. Our moderation team will review it.', 'success');

      // Reset form and close modal
      setReason('');
      setDescription('');
      setOriginalWorkLink('');
      setProofOfOwnership('');
      setAudioTimestamp('');
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
              Description of violation <span className="text-red-500">*</span>
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
              placeholder="Please provide specific details about the violation (minimum 20 characters)"
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
                  Minimum 20 characters required
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description.length}/1000
              </p>
            </div>
          </div>

          {/* Copyright Evidence Fields */}
          {reason === 'copyright_violation' && (
            <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Providing evidence helps moderators process your report faster
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
                  placeholder="Describe how you can prove ownership of the original work..."
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
                  Help moderators find the violation quickly
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your report will be reviewed by our moderation team. False reports may result in restrictions on your account.
            </p>
          </div>

          {/* User Report Warning - 24-hour duplicate prevention */}
          {reportType === 'user' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Important: One report per user per 24 hours
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    You can only report the same user once every 24 hours. Please provide detailed information to help our moderation team review this case effectively.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Examples Section - Collapsible */}
          {reason && getExamples() && (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Examples of Good Reports
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                    showExamples ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showExamples && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Good Examples */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                        Good Examples:
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {getExamples()?.good.map((example, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 pl-6 relative">
                          <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bad Examples */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Bad Examples:
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {getExamples()?.bad.map((example, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 pl-6 relative">
                          <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Copyright-specific tip */}
                  {reason === 'copyright_violation' && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          <strong>Tip:</strong> For copyright claims, providing a link to the original work and proof of ownership significantly speeds up the review process.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
