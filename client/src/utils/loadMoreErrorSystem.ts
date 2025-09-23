/**
 * Load More Error Handling System
 * 
 * Comprehensive error handling system for Load More operations including
 * NetworkError, StateError, and RaceConditionError handling with exponential
 * backoff retry logic and user feedback.
 */

import {
  NetworkError,
  StateError,
  RaceConditionError,
  LoadMoreError,
  ErrorRecoveryStrategy,
  ErrorRecoveryContext,
  ErrorRecoveryResult,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  ErrorReporter,
  ErrorStats,
  ErrorTrend,
  ErrorContext,
  UserFeedbackConfig,
  DEFAULT_USER_FEEDBACK_CONFIG,
  NetworkErrorType,
  StateErrorType,
  RaceConditionErrorType,
} from '@/types/errors';

/**
 * Exponential backoff retry logic with jitter
 */
export class ExponentialBackoffRetry {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Calculate delay for retry attempt
   */
  calculateDelay(attemptNumber: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attemptNumber - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    if (this.config.jitter) {
      // Add random jitter (±25% of delay)
      const jitterRange = cappedDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, cappedDelay + jitter);
    }
    
    return cappedDelay;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: LoadMoreError, attemptNumber: number): boolean {
    if (attemptNumber >= this.config.maxAttempts) {
      return false;
    }
    
    if (!error.retryable) {
      return false;
    }
    
    return this.config.retryableErrors.includes(error.code);
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorHandler: (error: Error, attempt: number) => LoadMoreError,
    onRetry?: (error: LoadMoreError, attempt: number, delay: number) => void
  ): Promise<T> {
    let lastError: LoadMoreError | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const loadMoreError = errorHandler(error as Error, attempt);
        lastError = loadMoreError;
        
        if (!this.isRetryable(loadMoreError, attempt)) {
          throw loadMoreError;
        }
        
        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          
          if (onRetry) {
            onRetry(loadMoreError, attempt, delay);
          }
          
          await this.delay(delay);
        }
      }
    }
    
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Network error recovery strategy
 */
export class NetworkErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: LoadMoreError): boolean {
    return error instanceof NetworkError && error.recoverable;
  }

  async recover(error: LoadMoreError, context: ErrorRecoveryContext): Promise<ErrorRecoveryResult> {
    if (!(error instanceof NetworkError)) {
      return {
        success: false,
        action: 'abort',
        message: 'Cannot recover from non-network error',
      };
    }

    switch (error.errorType) {
      case 'CONNECTION_FAILED':
      case 'NETWORK_UNAVAILABLE':
        return {
          success: true,
          action: 'retry',
          delay: 2000,
          message: 'Network connection restored, retrying...',
        };

      case 'TIMEOUT':
        return {
          success: true,
          action: 'retry',
          delay: 1000,
          message: 'Request timed out, retrying with longer timeout...',
        };

      case 'SERVER_ERROR':
        if (context.attemptNumber < 2) {
          return {
            success: true,
            action: 'retry',
            delay: 3000,
            message: 'Server error, retrying...',
          };
        }
        return {
          success: false,
          action: 'fallback',
          message: 'Server temporarily unavailable, using cached data',
        };

      case 'RATE_LIMITED':
        return {
          success: true,
          action: 'retry',
          delay: 5000,
          message: 'Rate limited, waiting before retry...',
        };

      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return {
          success: false,
          action: 'abort',
          message: 'Authentication required, please log in again',
        };

      default:
        return {
          success: false,
          action: 'abort',
          message: 'Network error cannot be recovered',
        };
    }
  }

  getRecoveryTime(): number {
    return 5000; // 5 seconds max recovery time
  }
}

/**
 * State error recovery strategy
 */
export class StateErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: LoadMoreError): boolean {
    return error instanceof StateError && error.recoverable;
  }

  async recover(error: LoadMoreError, context: ErrorRecoveryContext): Promise<ErrorRecoveryResult> {
    if (!(error instanceof StateError)) {
      return {
        success: false,
        action: 'abort',
        message: 'Cannot recover from non-state error',
      };
    }

    switch (error.errorType) {
      case 'INVALID_STATE':
      case 'STATE_CORRUPTION':
        return {
          success: true,
          action: 'reset',
          message: 'State corrupted, resetting to clean state...',
          newState: this.createCleanState(context),
        };

      case 'INCONSISTENT_DATA':
        return {
          success: true,
          action: 'reset',
          message: 'Data inconsistency detected, refreshing...',
          newState: this.createCleanState(context),
        };

      case 'INVALID_PAGINATION_STATE':
        return {
          success: true,
          action: 'reset',
          message: 'Pagination state invalid, resetting to first page...',
          newState: {
            currentPage: 1,
            paginatedPosts: [],
            hasMorePosts: true,
          },
        };

      case 'FILTER_STATE_MISMATCH':
      case 'SEARCH_STATE_INVALID':
        return {
          success: true,
          action: 'reset',
          message: 'Filter state mismatch, clearing filters...',
          newState: {
            isSearchActive: false,
            hasFiltersApplied: false,
            displayPosts: context.paginationState.allPosts || [],
          },
        };

      default:
        return {
          success: false,
          action: 'abort',
          message: 'State error cannot be recovered',
        };
    }
  }

  getRecoveryTime(): number {
    return 1000; // 1 second for state recovery
  }

  private createCleanState(context: ErrorRecoveryContext): Record<string, unknown> {
    return {
      currentPage: 1,
      hasMorePosts: true,
      isLoadingMore: false,
      allPosts: [],
      displayPosts: [],
      paginatedPosts: [],
      isSearchActive: false,
      hasFiltersApplied: false,
      fetchInProgress: false,
      autoFetchTriggered: false,
    };
  }
}

/**
 * Race condition error recovery strategy
 */
export class RaceConditionErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: LoadMoreError): boolean {
    return error instanceof RaceConditionError && error.recoverable;
  }

  async recover(error: LoadMoreError, context: ErrorRecoveryContext): Promise<ErrorRecoveryResult> {
    if (!(error instanceof RaceConditionError)) {
      return {
        success: false,
        action: 'abort',
        message: 'Cannot recover from non-race-condition error',
      };
    }

    switch (error.errorType) {
      case 'CONCURRENT_REQUEST':
      case 'DUPLICATE_REQUEST':
        return {
          success: true,
          action: 'retry',
          delay: 500 + Math.random() * 1000, // Random delay to avoid thundering herd
          message: 'Concurrent request detected, retrying with delay...',
        };

      case 'REQUEST_QUEUE_OVERFLOW':
        return {
          success: true,
          action: 'retry',
          delay: 2000,
          message: 'Request queue full, waiting for queue to clear...',
        };

      case 'STATE_TRANSITION_CONFLICT':
        return {
          success: true,
          action: 'retry',
          delay: 1000,
          message: 'State transition conflict, retrying...',
        };

      case 'RESOURCE_LOCK_TIMEOUT':
        return {
          success: true,
          action: 'retry',
          delay: 1500,
          message: 'Resource lock timeout, retrying...',
        };

      case 'OPERATION_CANCELLED':
        return {
          success: false,
          action: 'abort',
          message: 'Operation was cancelled by user',
        };

      default:
        return {
          success: false,
          action: 'abort',
          message: 'Race condition cannot be recovered',
        };
    }
  }

  getRecoveryTime(): number {
    return 3000; // 3 seconds max for race condition recovery
  }
}

/**
 * Error reporter implementation
 */
export class LoadMoreErrorReporter implements ErrorReporter {
  private errorHistory: LoadMoreError[] = [];
  private recoveryHistory: { error: LoadMoreError; recovery: ErrorRecoveryResult }[] = [];
  private maxHistorySize = 100;

  reportError(error: LoadMoreError, context: ErrorContext): void {
    this.errorHistory.push(error);
    
    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Log error for debugging
    console.error('Load More Error:', {
      error: this.serializeError(error),
      context,
    });

    // Report to external monitoring service if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.reportError(error, context);
    }
  }

  reportRecovery(error: LoadMoreError, recovery: ErrorRecoveryResult, context: ErrorContext): void {
    this.recoveryHistory.push({ error, recovery });
    
    // Keep history size manageable
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory.shift();
    }

    // Log recovery for debugging
    console.info('Load More Recovery:', {
      error: this.serializeError(error),
      recovery,
      context,
    });
  }

  getErrorStats(): ErrorStats {
    const totalErrors = this.errorHistory.length;
    const errorsByType: Record<string, number> = {};
    
    this.errorHistory.forEach(error => {
      errorsByType[error.code] = (errorsByType[error.code] || 0) + 1;
    });

    const successfulRecoveries = this.recoveryHistory.filter(r => r.recovery.success).length;
    const recoveryRate = this.recoveryHistory.length > 0 ? successfulRecoveries / this.recoveryHistory.length : 0;

    const errorTrends: ErrorTrend[] = this.errorHistory.slice(-10).map(error => ({
      timestamp: error.timestamp,
      errorCount: 1,
      errorType: error.code,
      recoverySuccess: this.recoveryHistory.some(r => r.error === error && r.recovery.success),
    }));

    return {
      totalErrors,
      errorsByType,
      recoveryRate,
      averageRecoveryTime: 2000, // Placeholder
      lastError: this.errorHistory[this.errorHistory.length - 1],
      errorTrends,
    };
  }

  private serializeError(error: LoadMoreError): Record<string, unknown> {
    // Check if error has toJSON method (concrete classes)
    if ('toJSON' in error && typeof error.toJSON === 'function') {
      return error.toJSON();
    }
    
    // Fallback serialization for interface-only errors
    return {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
      recoverable: error.recoverable,
      retryable: error.retryable,
    };
  }
}

/**
 * Main error handling system
 */
export class LoadMoreErrorHandlingSystem {
  private retrySystem: ExponentialBackoffRetry;
  private recoveryStrategies: ErrorRecoveryStrategy[];
  private errorReporter: ErrorReporter;
  private userFeedbackConfig: UserFeedbackConfig;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    userFeedbackConfig: Partial<UserFeedbackConfig> = {}
  ) {
    this.retrySystem = new ExponentialBackoffRetry(retryConfig);
    this.recoveryStrategies = [
      new NetworkErrorRecoveryStrategy(),
      new StateErrorRecoveryStrategy(),
      new RaceConditionErrorRecoveryStrategy(),
    ];
    this.errorReporter = new LoadMoreErrorReporter();
    this.userFeedbackConfig = { ...DEFAULT_USER_FEEDBACK_CONFIG, ...userFeedbackConfig };
  }

  /**
   * Handle error with recovery and retry logic
   */
  async handleError(
    error: Error | LoadMoreError,
    context: ErrorRecoveryContext,
    onUserFeedback?: (message: string, showRetry: boolean) => void
  ): Promise<ErrorRecoveryResult> {
    // Convert to LoadMoreError if needed
    const loadMoreError = error instanceof Error && !(error as any).code 
      ? this.convertToLoadMoreError(error, context)
      : error as LoadMoreError;
    
    // Report error
    this.errorReporter.reportError(loadMoreError, this.convertToErrorContext(context));

    // Find appropriate recovery strategy
    const strategy = this.recoveryStrategies.find(s => s.canRecover(loadMoreError));
    
    if (!strategy) {
      const result: ErrorRecoveryResult = {
        success: false,
        action: 'abort',
        message: 'No recovery strategy available for this error',
      };
      
      if (onUserFeedback) {
        onUserFeedback(result.message || 'An error occurred', false);
      }
      
      return result;
    }

    // Attempt recovery
    const recoveryResult = await strategy.recover(loadMoreError, context);
    
    // Report recovery attempt
    this.errorReporter.reportRecovery(loadMoreError, recoveryResult, this.convertToErrorContext(context));

    // Provide user feedback
    if (onUserFeedback && recoveryResult.message) {
      const showRetry = recoveryResult.action === 'retry' && this.userFeedbackConfig.showRetryButton;
      onUserFeedback(recoveryResult.message, showRetry);
    }

    return recoveryResult;
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorRecoveryContext,
    onUserFeedback?: (message: string, showRetry: boolean) => void
  ): Promise<T> {
    return this.retrySystem.executeWithRetry(
      operation,
      (error, attempt) => this.convertToLoadMoreError(error, { ...context, attemptNumber: attempt }),
      async (error, attempt, delay) => {
        const recoveryResult = await this.handleError(error, { ...context, attemptNumber: attempt }, onUserFeedback);
        
        if (recoveryResult.action === 'abort') {
          throw error;
        }
        
        if (onUserFeedback) {
          onUserFeedback(`Retrying in ${Math.round(delay / 1000)} seconds... (Attempt ${attempt})`, false);
        }
      }
    );
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    return this.errorReporter.getErrorStats();
  }

  /**
   * Convert generic error to LoadMoreError
   */
  private convertToLoadMoreError(error: Error, context: ErrorRecoveryContext): LoadMoreError {
    if (error instanceof NetworkError || error instanceof StateError || error instanceof RaceConditionError) {
      return error;
    }

    // Analyze error to determine type
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      if (message.includes('timeout')) {
        return new NetworkError('TIMEOUT', error.message, { cause: error });
      }
      if (message.includes('unauthorized') || message.includes('401')) {
        return new NetworkError('UNAUTHORIZED', error.message, { statusCode: 401, cause: error });
      }
      if (message.includes('forbidden') || message.includes('403')) {
        return new NetworkError('FORBIDDEN', error.message, { statusCode: 403, cause: error });
      }
      if (message.includes('not found') || message.includes('404')) {
        return new NetworkError('NOT_FOUND', error.message, { statusCode: 404, cause: error });
      }
      if (message.includes('server') || message.includes('500')) {
        return new NetworkError('SERVER_ERROR', error.message, { statusCode: 500, cause: error });
      }
      return new NetworkError('CONNECTION_FAILED', error.message, { cause: error });
    }

    // State errors
    if (message.includes('state') || message.includes('invalid') || message.includes('corrupt')) {
      return new StateError('INVALID_STATE', error.message, { cause: error });
    }

    // Race condition errors
    if (message.includes('concurrent') || message.includes('duplicate') || message.includes('conflict')) {
      return new RaceConditionError('CONCURRENT_REQUEST', error.message, { cause: error });
    }

    // Default to network error
    return new NetworkError('CONNECTION_FAILED', error.message, { cause: error });
  }

  /**
   * Convert ErrorRecoveryContext to ErrorContext for reporting
   */
  private convertToErrorContext(recoveryContext: ErrorRecoveryContext): ErrorContext {
    return {
      requestId: recoveryContext.requestId,
      operationType: recoveryContext.operationType,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      method: 'POST', // Default for Load More operations
      paginationState: recoveryContext.paginationState,
      performanceMetrics: {
        attemptNumber: recoveryContext.attemptNumber,
        maxAttempts: recoveryContext.maxAttempts,
      },
    };
  }
}

/**
 * Factory function to create error handling system
 */
export function createLoadMoreErrorHandlingSystem(
  retryConfig?: Partial<RetryConfig>,
  userFeedbackConfig?: Partial<UserFeedbackConfig>
): LoadMoreErrorHandlingSystem {
  return new LoadMoreErrorHandlingSystem(retryConfig, userFeedbackConfig);
}

/**
 * Utility functions for error handling
 */
export const ErrorHandlingUtils = {
  /**
   * Create network error from fetch response
   */
  createNetworkErrorFromResponse(response: Response, requestUrl: string): NetworkError {
    let errorType: NetworkErrorType;
    
    switch (response.status) {
      case 401:
        errorType = 'UNAUTHORIZED';
        break;
      case 403:
        errorType = 'FORBIDDEN';
        break;
      case 404:
        errorType = 'NOT_FOUND';
        break;
      case 413:
        errorType = 'PAYLOAD_TOO_LARGE';
        break;
      case 429:
        errorType = 'RATE_LIMITED';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = 'SERVER_ERROR';
        break;
      default:
        errorType = 'CONNECTION_FAILED';
    }

    return new NetworkError(errorType, `Request failed: ${response.status} ${response.statusText}`, {
      statusCode: response.status,
      context: { url: requestUrl },
    });
  },

  /**
   * Create state error from validation result
   */
  createStateErrorFromValidation(errors: string[], stateSnapshot?: Record<string, unknown>): StateError {
    const errorType: StateErrorType = errors.some(e => e.includes('pagination')) 
      ? 'INVALID_PAGINATION_STATE'
      : 'INVALID_STATE';
    
    return new StateError(errorType, `State validation failed: ${errors.join(', ')}`, {
      stateSnapshot,
    });
  },

  /**
   * Create race condition error
   */
  createRaceConditionError(conflictingOperations: string[]): RaceConditionError {
    return new RaceConditionError('CONCURRENT_REQUEST', 'Concurrent operations detected', {
      conflictingOperations,
    });
  },
};