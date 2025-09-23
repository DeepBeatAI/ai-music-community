import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorState, ErrorRecoveryManager, defaultErrorRecovery } from '@/utils/errorRecovery';

interface UseErrorStateOptions {
  errorRecovery?: ErrorRecoveryManager;
  autoRecovery?: boolean;
  maxErrorHistory?: number;
  onError?: (errorState: ErrorState) => void;
  onRecovery?: (success: boolean) => void;
}

interface UseErrorStateReturn {
  errorState: ErrorState | null;
  setError: (error: Error | string, errorType?: ErrorState['errorType'], errorCode?: string) => void;
  clearError: () => void;
  retryLastAction: () => Promise<void>;
  isRecovering: boolean;
  errorHistory: ErrorState[];
  canRetry: boolean;
  setLastAction: (action: () => Promise<void>) => void; // Added to interface
}

/**
 * Enhanced hook for managing error state with automatic recovery
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function useErrorState(options: UseErrorStateOptions = {}): UseErrorStateReturn {
  const {
    errorRecovery = defaultErrorRecovery,
    autoRecovery = true,
    maxErrorHistory = 5,
    onError,
    onRecovery
  } = options;

  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [errorHistory, setErrorHistory] = useState<ErrorState[]>([]);
  
  const lastActionRef = useRef<(() => Promise<void>) | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-clear errors after a timeout (for non-critical errors)
  useEffect(() => {
    if (errorState && errorState.errorType !== 'critical') {
      // Clear timeout if it exists
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      // Set new timeout for auto-clearing
      errorTimeoutRef.current = setTimeout(() => {
        if (errorState.errorType === 'info' || errorState.errorType === 'warning') {
          clearError();
        }
      }, errorState.errorType === 'info' ? 3000 : 5000);
    }

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [errorState]);

  // Auto-recovery effect
  useEffect(() => {
    if (!errorState || !autoRecovery || isRecovering) {
      return;
    }

    if (errorRecovery.shouldAutoRecover(errorState)) {
      const timer = setTimeout(() => {
        attemptRecovery();
      }, 2000); // Wait 2 seconds before auto-recovery

      return () => clearTimeout(timer);
    }
  }, [errorState, autoRecovery, isRecovering]);

  const setError = useCallback((
    error: Error | string,
    errorType: ErrorState['errorType'] = 'recoverable',
    errorCode?: string
  ) => {
    // Prevent error loops by checking if the same error was just set
    const errorMessage = typeof error === 'string' ? error : error.message;
    if (errorState && errorState.errorMessage === errorMessage && 
        Date.now() - errorState.timestamp < 1000) {
      console.warn('⚠️ useErrorState: Duplicate error prevented:', errorMessage);
      return;
    }

    // Additional circuit breaker for rapid error cycles
    if (errorState && errorState.errorCode === errorCode && 
        Date.now() - errorState.timestamp < 5000) {
      console.warn('⚠️ useErrorState: Rapid error cycle prevented for code:', errorCode);
      return;
    }

    const newErrorState = errorRecovery.createErrorState(error, errorType, errorCode);
    
    setErrorState(newErrorState);
    
    // Add to history
    setErrorHistory(prev => {
      const newHistory = [...prev, newErrorState];
      return newHistory.slice(-maxErrorHistory);
    });

    // Call error callback
    onError?.(newErrorState);

    // Log error for debugging
    console.error('❌ useErrorState: Error set:', {
      message: errorMessage,
      type: errorType,
      code: errorCode,
      timestamp: new Date().toISOString()
    });
  }, [errorState, errorRecovery, maxErrorHistory, onError]);

  const clearError = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    setErrorState(null);
    setIsRecovering(false);
    
    console.log('✅ useErrorState: Error cleared');
  }, []);

  const attemptRecovery = useCallback(async () => {
    if (!errorState || isRecovering) {
      return;
    }

    setIsRecovering(true);

    try {
      const result = await errorRecovery.attemptRecovery(
        errorState,
        lastActionRef.current || undefined
      );

      if (result.success) {
        clearError();
        onRecovery?.(true);
        console.log('✅ useErrorState: Recovery successful');
      } else {
        // Update error state with recovery result
        if (result.newErrorState) {
          setErrorState(prev => prev ? { ...prev, ...result.newErrorState } : null);
        }
        
        onRecovery?.(false);
        console.error('❌ useErrorState: Recovery failed:', result.message);

        // Auto-refresh if suggested
        if (result.shouldRefresh) {
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      }
    } catch (recoveryError) {
      console.error('❌ useErrorState: Recovery attempt failed:', recoveryError);
      onRecovery?.(false);
    } finally {
      setIsRecovering(false);
    }
  }, [errorState, isRecovering, errorRecovery, clearError, onRecovery]);

  const retryLastAction = useCallback(async () => {
    if (lastActionRef.current) {
      await attemptRecovery();
    } else {
      console.warn('⚠️ useErrorState: No last action to retry');
    }
  }, [attemptRecovery]);

  // Helper to set the last action for retry purposes
  const setLastAction = useCallback((action: () => Promise<void>) => {
    lastActionRef.current = action;
  }, []);

  return {
    errorState,
    setError,
    clearError,
    retryLastAction,
    isRecovering,
    errorHistory,
    canRetry: errorState?.canRetry ?? false,
    setLastAction, // Added to return
  };
}

/**
 * Specialized hook for pagination errors
 */
export function usePaginationErrorState() {
  return useErrorState({
    autoRecovery: true,
    maxErrorHistory: 3,
    onError: (errorState) => {
      // Log pagination-specific errors
      console.error('❌ Pagination Error:', {
        message: errorState.errorMessage,
        type: errorState.errorType,
        timestamp: new Date(errorState.timestamp).toISOString()
      });
    },
    onRecovery: (success) => {
      if (success) {
        console.log('✅ Pagination error recovered successfully');
      } else {
        console.error('❌ Pagination error recovery failed');
      }
    }
  });
}

/**
 * Hook for network-related errors with retry logic
 */
export function useNetworkErrorState() {
  return useErrorState({
    autoRecovery: true,
    maxErrorHistory: 5,
    onError: (errorState) => {
      // Check network status
      if (!navigator.onLine) {
        console.warn('⚠️ Network error detected while offline');
      }
    }
  });
}

export default useErrorState;