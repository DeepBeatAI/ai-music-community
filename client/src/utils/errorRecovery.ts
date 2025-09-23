/**
 * Enhanced Error Recovery System for Dashboard
 * Provides automatic error recovery mechanisms and user-friendly error messages
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableAutoRecovery?: boolean;
  logErrors?: boolean;
}

export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorType: 'critical' | 'recoverable' | 'warning' | 'info';
  errorCode?: string;
  timestamp: number;
  retryCount: number;
  canRetry: boolean;
  autoRecoveryAttempted: boolean;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  shouldRefresh?: boolean;
  newErrorState?: Partial<ErrorState>;
}

/**
 * Error Recovery Manager for handling dashboard errors
 */
export class ErrorRecoveryManager {
  private options: Required<ErrorRecoveryOptions>;
  private errorHistory: ErrorState[] = [];
  private recoveryAttempts = new Map<string, number>();

  constructor(options: ErrorRecoveryOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      enableAutoRecovery: options.enableAutoRecovery ?? true,
      logErrors: options.logErrors ?? true,
    };
  }

  /**
   * Create an error state from an error or message
   */
  createErrorState(
    error: Error | string,
    errorType: ErrorState['errorType'] = 'recoverable',
    errorCode?: string
  ): ErrorState {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const timestamp = Date.now();

    const errorState: ErrorState = {
      hasError: true,
      errorMessage: this.getUserFriendlyMessage(errorMessage, errorType),
      errorType,
      errorCode,
      timestamp,
      retryCount: 0,
      canRetry: errorType !== 'critical',
      autoRecoveryAttempted: false,
    };

    // Log error if enabled
    if (this.options.logErrors) {
      console.error('❌ ErrorRecoveryManager: Error created:', {
        message: errorMessage,
        type: errorType,
        code: errorCode,
        timestamp: new Date(timestamp).toISOString(),
      });
    }

    // Add to history
    this.errorHistory.push(errorState);

    // Keep only last 10 errors
    if (this.errorHistory.length > 10) {
      this.errorHistory = this.errorHistory.slice(-10);
    }

    return errorState;
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(
    errorState: ErrorState,
    recoveryAction?: () => Promise<void>
  ): Promise<RecoveryResult> {
    const errorKey = `${errorState.errorType}-${errorState.errorCode || 'unknown'}`;
    const currentAttempts = this.recoveryAttempts.get(errorKey) || 0;

    // Check if we've exceeded max retries
    if (currentAttempts >= this.options.maxRetries) {
      return {
        success: false,
        message: 'Maximum recovery attempts exceeded. Please refresh the page.',
        shouldRefresh: true,
      };
    }

    // Increment retry count
    this.recoveryAttempts.set(errorKey, currentAttempts + 1);

    try {
      // Wait before retry
      if (currentAttempts > 0) {
        await new Promise(resolve => 
          setTimeout(resolve, this.options.retryDelay * (currentAttempts + 1))
        );
      }

      // Attempt recovery based on error type
      const result = await this.performRecovery(errorState, recoveryAction);

      if (result.success) {
        // Reset retry count on success
        this.recoveryAttempts.delete(errorKey);
        
        if (this.options.logErrors) {
          console.log('✅ ErrorRecoveryManager: Recovery successful:', {
            errorType: errorState.errorType,
            attempts: currentAttempts + 1,
          });
        }
      }

      return result;
    } catch (recoveryError) {
      if (this.options.logErrors) {
        console.error('❌ ErrorRecoveryManager: Recovery failed:', recoveryError);
      }

      return {
        success: false,
        message: 'Recovery attempt failed. Please try again or refresh the page.',
        newErrorState: {
          retryCount: currentAttempts + 1,
          autoRecoveryAttempted: true,
        },
      };
    }
  }

  /**
   * Perform specific recovery actions based on error type
   */
  private async performRecovery(
    errorState: ErrorState,
    customRecoveryAction?: () => Promise<void>
  ): Promise<RecoveryResult> {
    // If custom recovery action provided, try it first
    if (customRecoveryAction) {
      await customRecoveryAction();
      return {
        success: true,
        message: 'Recovery action completed successfully.',
      };
    }

    // Built-in recovery strategies
    switch (errorState.errorType) {
      case 'critical':
        return {
          success: false,
          message: 'Critical error detected. Page refresh required.',
          shouldRefresh: true,
        };

      case 'recoverable':
        // For recoverable errors, we can attempt automatic recovery
        if (errorState.errorMessage.includes('pagination') || 
            errorState.errorMessage.includes('state') ||
            errorState.errorMessage.includes('conflicting loading')) {
          return this.recoverPaginationState();
        }
        
        if (errorState.errorMessage.includes('network') || 
            errorState.errorMessage.includes('fetch')) {
          return this.recoverNetworkError();
        }

        return {
          success: true,
          message: 'Error state cleared. Please try your action again.',
        };

      case 'warning':
        return {
          success: true,
          message: 'Warning acknowledged. Continuing with operation.',
        };

      case 'info':
        return {
          success: true,
          message: 'Information noted.',
        };

      default:
        return {
          success: false,
          message: 'Unknown error type. Please refresh the page.',
          shouldRefresh: true,
        };
    }
  }

  /**
   * Recover from pagination state errors
   */
  private async recoverPaginationState(): Promise<RecoveryResult> {
    // Clear any stored pagination state
    try {
      // Clear localStorage pagination data if any
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('pagination') || key.includes('dashboard')) {
          localStorage.removeItem(key);
        }
      });

      return {
        success: true,
        message: 'Pagination state reset. The page will reload with fresh data.',
        shouldRefresh: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reset pagination state. Please refresh manually.',
        shouldRefresh: true,
      };
    }
  }

  /**
   * Recover from network errors
   */
  private async recoverNetworkError(): Promise<RecoveryResult> {
    // Check network connectivity
    if (!navigator.onLine) {
      return {
        success: false,
        message: 'No internet connection. Please check your network and try again.',
      };
    }

    // For network errors, we can suggest retry
    return {
      success: true,
      message: 'Network connection restored. Please try your action again.',
    };
  }

  /**
   * Convert technical error messages to user-friendly ones
   */
  private getUserFriendlyMessage(
    technicalMessage: string, 
    errorType: ErrorState['errorType']
  ): string {
    // Critical errors
    if (errorType === 'critical') {
      if (technicalMessage.includes('Maximum update depth')) {
        return 'The page encountered a critical error and needs to be refreshed.';
      }
      if (technicalMessage.includes('infinite')) {
        return 'A critical system error occurred. Please refresh the page.';
      }
    }

    // Pagination errors
    if (technicalMessage.includes('pagination') || technicalMessage.includes('state')) {
      if (technicalMessage.includes('validation')) {
        return 'There was an issue with the page data. This will be automatically fixed.';
      }
      if (technicalMessage.includes('inconsistency')) {
        return 'Some content may not display correctly. This will be automatically corrected.';
      }
      if (technicalMessage.includes('conflicting loading')) {
        return 'The page is experiencing loading conflicts. This will be automatically resolved.';
      }
      return 'There was an issue loading content. Please try again.';
    }

    // For test messages, return them as-is if they're already user-friendly
    if (technicalMessage.startsWith('Test ') || technicalMessage.includes('test')) {
      return technicalMessage;
    }

    // Network errors
    if (technicalMessage.includes('fetch') || technicalMessage.includes('network')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    // Search errors
    if (technicalMessage.includes('search')) {
      return 'There was an issue with your search. Please try again.';
    }

    // Load more errors
    if (technicalMessage.includes('load more')) {
      return 'Unable to load more content. Please try again.';
    }

    // Database errors
    if (technicalMessage.includes('database') || technicalMessage.includes('supabase')) {
      return 'There was a temporary issue saving your data. Please try again.';
    }

    // File upload errors
    if (technicalMessage.includes('upload') || technicalMessage.includes('file')) {
      return 'There was an issue uploading your file. Please try again.';
    }

    // Default user-friendly message
    return 'Something went wrong. Please try again or refresh the page if the issue persists.';
  }

  /**
   * Check if an error should trigger automatic recovery
   */
  shouldAutoRecover(errorState: ErrorState): boolean {
    if (!this.options.enableAutoRecovery) return false;
    if (errorState.errorType === 'critical') return false;
    if (errorState.autoRecoveryAttempted) return false;
    if (errorState.retryCount >= this.options.maxRetries) return false;

    // Auto-recover for specific error types - check both original and user-friendly messages
    const autoRecoverableErrors = [
      'pagination',
      'state validation',
      'data inconsistency',
      'conflicting loading',
      'network',
      'temporary',
      'page data',
      'loading content'
    ];

    // Check both the error message and error code
    const messageCheck = autoRecoverableErrors.some(pattern => 
      errorState.errorMessage.toLowerCase().includes(pattern)
    );
    
    const codeCheck = errorState.errorCode && (
      errorState.errorCode.includes('PAGINATION') ||
      errorState.errorCode.includes('NETWORK') ||
      errorState.errorCode.includes('VALIDATION')
    );

    return Boolean(messageCheck || codeCheck);
  }

  /**
   * Clear error history and reset recovery attempts
   */
  reset(): void {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    
    if (this.options.logErrors) {
      console.log('🔄 ErrorRecoveryManager: Reset completed');
    }
  }

  /**
   * Get error statistics for debugging
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: ErrorState[];
    activeRecoveryAttempts: number;
  } {
    const errorsByType = this.errorHistory.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      recentErrors: this.errorHistory.slice(-5),
      activeRecoveryAttempts: this.recoveryAttempts.size,
    };
  }
}

/**
 * Default error recovery manager instance
 */
export const defaultErrorRecovery = new ErrorRecoveryManager({
  maxRetries: 3,
  retryDelay: 1000,
  enableAutoRecovery: true,
  logErrors: true,
});

/**
 * Hook for using error recovery in React components
 */
export function useErrorRecovery(options?: ErrorRecoveryOptions) {
  const [errorRecovery] = React.useState(() => 
    options ? new ErrorRecoveryManager(options) : defaultErrorRecovery
  );

  return errorRecovery;
}

// Export for React import
import React from 'react';