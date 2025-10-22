/**
 * Track Error Handling Utilities
 * 
 * This module provides comprehensive error handling for track operations,
 * including user-friendly error messages, retry logic, and error recovery.
 * 
 * Requirements: 9.1, 9.2
 * 
 * @module lib/trackErrorHandling
 */

import {
  TrackUploadError,
  TRACK_ERROR_MESSAGES,
  type TrackErrorDetails,
  type TrackOperationResult,
} from '@/types/track';

/**
 * Create a standardized error details object
 * 
 * @param code - The error code
 * @param technicalDetails - Optional technical details for debugging
 * @returns TrackErrorDetails object with user-friendly messages
 * 
 * @example
 * ```typescript
 * const error = createTrackError('FILE_TOO_LARGE', { size: 60000000 });
 * console.log(error.userMessage); // User-friendly message
 * ```
 */
export function createTrackError(
  code: TrackUploadError,
  technicalDetails?: unknown
): TrackErrorDetails {
  const errorInfo = TRACK_ERROR_MESSAGES[code];
  
  return {
    code,
    message: errorInfo.technicalMessage,
    userMessage: errorInfo.userMessage,
    technicalDetails,
    retryable: errorInfo.retryable,
    suggestedAction: errorInfo.suggestedAction,
  };
}

/**
 * Retry configuration for track operations
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Retry a track operation with exponential backoff
 * 
 * @param operation - The async operation to retry
 * @param config - Retry configuration
 * @param onRetry - Optional callback called before each retry
 * @returns Promise<T> - Result of the operation
 * 
 * @example
 * ```typescript
 * const result = await retryTrackOperation(
 *   () => uploadToStorage(file),
 *   { maxAttempts: 3, delayMs: 1000 },
 *   (attempt) => console.log(`Retry attempt ${attempt}`)
 * );
 * ```
 */
export async function retryTrackOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;
  let delay = finalConfig.delayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < finalConfig.maxAttempts) {
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
      }
    }
  }

  // All retries failed
  throw lastError;
}

/**
 * Validate track upload data before attempting upload
 * 
 * @param file - The audio file to validate
 * @param title - The track title
 * @returns TrackOperationResult with validation errors if any
 * 
 * @example
 * ```typescript
 * const validation = validateTrackUpload(file, title);
 * if (!validation.success) {
 *   console.error(validation.error?.userMessage);
 * }
 * ```
 */
export function validateTrackUpload(
  file: File,
  title: string
): TrackOperationResult<void> {
  // Validate file size
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: createTrackError(TrackUploadError.FILE_TOO_LARGE, {
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
      }),
    };
  }

  // Validate file format
  const validFormats = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp3'];
  if (!validFormats.includes(file.type)) {
    return {
      success: false,
      error: createTrackError(TrackUploadError.INVALID_FORMAT, {
        fileType: file.type,
        validFormats,
      }),
    };
  }

  // Validate title
  if (!title || title.trim().length === 0) {
    return {
      success: false,
      error: createTrackError(TrackUploadError.VALIDATION_ERROR, {
        field: 'title',
        message: 'Title is required',
      }),
    };
  }

  if (title.length > 255) {
    return {
      success: false,
      error: createTrackError(TrackUploadError.VALIDATION_ERROR, {
        field: 'title',
        message: 'Title must be 255 characters or less',
      }),
    };
  }

  return { success: true };
}

/**
 * Format file size for display
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 * 
 * @example
 * ```typescript
 * console.log(formatFileSize(2500000)); // "2.4 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration for display
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "3:45")
 * 
 * @example
 * ```typescript
 * console.log(formatDuration(225)); // "3:45"
 * ```
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if an error is retryable
 * 
 * @param error - The error to check
 * @returns true if the error is retryable
 * 
 * @example
 * ```typescript
 * if (isRetryableError(error)) {
 *   // Show retry button
 * }
 * ```
 */
export function isRetryableError(error: TrackErrorDetails): boolean {
  return error.retryable;
}

/**
 * Get user-friendly error message from any error
 * 
 * @param error - The error (can be Error, TrackErrorDetails, or string)
 * @returns User-friendly error message
 * 
 * @example
 * ```typescript
 * try {
 *   await uploadTrack(data);
 * } catch (error) {
 *   toast.error(getUserFriendlyErrorMessage(error));
 * }
 * ```
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // If it's a TrackErrorDetails object
  if (typeof error === 'object' && error !== null && 'userMessage' in error) {
    const errorObj = error as { userMessage: unknown };
    return typeof errorObj.userMessage === 'string' 
      ? errorObj.userMessage 
      : 'An unexpected error occurred';
  }

  // If it's an Error object
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred';
  }

  // If it's a string
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Log error with context for debugging
 * 
 * @param context - Context string (e.g., 'uploadTrack')
 * @param error - The error to log
 * @param additionalData - Optional additional data to log
 * 
 * @example
 * ```typescript
 * logTrackError('uploadTrack', error, { userId, fileName });
 * ```
 */
export function logTrackError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorData = {
    timestamp,
    context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error,
    ...additionalData,
  };

  console.error(`[TrackError] ${context}:`, errorData);

  // In production, you might want to send this to an error tracking service
  // e.g., Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
    // Sentry.captureException(error, { contexts: { track: errorData } });
  }
}

/**
 * Create a user-friendly error display component data
 * 
 * @param error - The error details
 * @returns Object with display properties
 * 
 * @example
 * ```typescript
 * const display = createErrorDisplay(error);
 * return (
 *   <div>
 *     <h3>{display.title}</h3>
 *     <p>{display.message}</p>
 *     {display.action && <button>{display.action}</button>}
 *   </div>
 * );
 * ```
 */
export function createErrorDisplay(error: TrackErrorDetails): {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
  severity: 'error' | 'warning' | 'info';
} {
  const isWarning = error.code === 'COMPRESSION_FAILED';
  
  return {
    title: isWarning ? 'Warning' : 'Error',
    message: error.userMessage,
    action: error.suggestedAction,
    retryable: error.retryable,
    severity: isWarning ? 'warning' : 'error',
  };
}

/**
 * Wrap a track operation with error handling
 * 
 * @param operation - The operation to wrap
 * @param context - Context string for logging
 * @returns Promise<TrackOperationResult<T>>
 * 
 * @example
 * ```typescript
 * const result = await withErrorHandling(
 *   () => uploadTrack(userId, data),
 *   'uploadTrack'
 * );
 * 
 * if (!result.success) {
 *   console.error(result.error?.userMessage);
 * }
 * ```
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<TrackOperationResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    logTrackError(context, error);
    
    // If it's already a TrackErrorDetails, use it
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return {
        success: false,
        error: error as TrackErrorDetails,
      };
    }

    // Otherwise, create a generic error
    return {
      success: false,
      error: createTrackError(TrackUploadError.NETWORK_ERROR, error),
    };
  }
}

/**
 * Progress callback type for upload operations
 */
export type ProgressCallback = (progress: {
  stage: 'validating' | 'compressing' | 'uploading' | 'saving' | 'complete';
  percentage: number;
  message: string;
}) => void;

/**
 * Create a progress tracker for upload operations
 * 
 * @param callback - Callback to receive progress updates
 * @returns Progress tracker object
 * 
 * @example
 * ```typescript
 * const progress = createProgressTracker((p) => {
 *   console.log(`${p.stage}: ${p.percentage}%`);
 * });
 * 
 * progress.update('compressing', 50, 'Compressing audio...');
 * ```
 */
export function createProgressTracker(callback: ProgressCallback) {
  return {
    update: (
      stage: 'validating' | 'compressing' | 'uploading' | 'saving' | 'complete',
      percentage: number,
      message: string
    ) => {
      callback({ stage, percentage, message });
    },
    
    validating: (percentage: number = 0) => {
      callback({
        stage: 'validating',
        percentage,
        message: 'Validating file...',
      });
    },
    
    compressing: (percentage: number) => {
      callback({
        stage: 'compressing',
        percentage,
        message: 'Compressing audio...',
      });
    },
    
    uploading: (percentage: number) => {
      callback({
        stage: 'uploading',
        percentage,
        message: 'Uploading file...',
      });
    },
    
    saving: (percentage: number = 90) => {
      callback({
        stage: 'saving',
        percentage,
        message: 'Saving track information...',
      });
    },
    
    complete: () => {
      callback({
        stage: 'complete',
        percentage: 100,
        message: 'Upload complete!',
      });
    },
  };
}

/**
 * Export all error handling utilities
 */
const trackErrorHandling = {
  createTrackError,
  retryTrackOperation,
  validateTrackUpload,
  formatFileSize,
  formatDuration,
  isRetryableError,
  getUserFriendlyErrorMessage,
  logTrackError,
  createErrorDisplay,
  withErrorHandling,
  createProgressTracker,
};

export default trackErrorHandling;
