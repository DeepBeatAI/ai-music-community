import React, { useState, useEffect, useCallback } from 'react';
import { ErrorState, ErrorRecoveryManager, RecoveryResult } from '@/utils/errorRecovery';

interface ErrorDisplayProps {
  errorState: ErrorState | null;
  errorRecovery: ErrorRecoveryManager;
  onErrorCleared?: () => void;
  onRetry?: () => Promise<void>;
  className?: string;
}

/**
 * Enhanced Error Display Component
 * Provides user-friendly error messages with recovery options
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function ErrorDisplay({
  errorState,
  errorRecovery,
  onErrorCleared,
  onRetry,
  className = ''
}: ErrorDisplayProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string>('');
  const [autoRecoveryTimer, setAutoRecoveryTimer] = useState<number | null>(null);
  const [lastProcessedErrorId, setLastProcessedErrorId] = useState<string>('');

  const handleRecoveryResult = useCallback((result: RecoveryResult) => {
    setRecoveryMessage(result.message);

    if (result.success) {
      // Clear error after showing success message briefly
      setTimeout(() => {
        onErrorCleared?.();
      }, 2000);
    }
  }, [onErrorCleared]);

  const handleAutoRecovery = useCallback(async () => {
    if (!errorState) return;

    setIsRecovering(true);
    setRecoveryMessage('Attempting automatic recovery...');

    try {
      const result = await errorRecovery.attemptRecovery(errorState);
      handleRecoveryResult(result);
    } catch (error) {
      console.error('Auto-recovery failed:', error);
      setRecoveryMessage('Automatic recovery failed. Please try manually.');
    } finally {
      setIsRecovering(false);
    }
  }, [errorState, errorRecovery, handleRecoveryResult]);

  // Auto-recovery effect with duplicate prevention
  useEffect(() => {
    if (!errorState || !errorRecovery.shouldAutoRecover(errorState)) {
      return;
    }

    // Create unique error ID to prevent duplicate processing
    const errorId = `${errorState.errorCode || 'unknown'}-${errorState.timestamp}`;
    
    // Skip if this error was already processed
    if (errorId === lastProcessedErrorId) {
      return;
    }
    
    setLastProcessedErrorId(errorId);

    // Start auto-recovery countdown
    let countdown = 5;
    setRecoveryMessage(`Attempting automatic recovery in ${countdown} seconds...`);
    
    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        setRecoveryMessage(`Attempting automatic recovery in ${countdown} seconds...`);
      } else {
        clearInterval(timer);
        handleAutoRecovery();
      }
    }, 1000);

    setAutoRecoveryTimer(timer as unknown as number);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [errorRecovery, errorState, handleAutoRecovery, lastProcessedErrorId]);

  const handleManualRetry = async () => {
    if (!errorState) return;

    setIsRecovering(true);
    setRecoveryMessage('Attempting recovery...');

    // Cancel auto-recovery if running
    if (autoRecoveryTimer) {
      clearInterval(autoRecoveryTimer);
      setAutoRecoveryTimer(null);
    }

    try {
      const result = await errorRecovery.attemptRecovery(errorState, onRetry);
      handleRecoveryResult(result);
    } catch (error) {
      console.error('Manual recovery failed:', error);
      setRecoveryMessage('Recovery failed. Please refresh the page.');
    } finally {
      setIsRecovering(false);
    }
  };



  const handleDismiss = () => {
    if (autoRecoveryTimer) {
      clearInterval(autoRecoveryTimer);
      setAutoRecoveryTimer(null);
    }
    setRecoveryMessage('');
    setLastProcessedErrorId(''); // Reset processed error ID
    onErrorCleared?.();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!errorState) {
    return null;
  }

  // Determine styling based on error type
  const getErrorStyling = (errorType: ErrorState['errorType']) => {
    switch (errorType) {
      case 'critical':
        return {
          containerClass: 'bg-red-900/30 border-red-500/50',
          iconClass: 'text-red-400',
          titleClass: 'text-red-400',
          icon: '🚨'
        };
      case 'recoverable':
        return {
          containerClass: 'bg-yellow-900/30 border-yellow-500/50',
          iconClass: 'text-yellow-400',
          titleClass: 'text-yellow-400',
          icon: '⚠️'
        };
      case 'warning':
        return {
          containerClass: 'bg-orange-900/30 border-orange-500/50',
          iconClass: 'text-orange-400',
          titleClass: 'text-orange-400',
          icon: '⚠️'
        };
      case 'info':
        return {
          containerClass: 'bg-blue-900/30 border-blue-500/50',
          iconClass: 'text-blue-400',
          titleClass: 'text-blue-400',
          icon: 'ℹ️'
        };
      default:
        return {
          containerClass: 'bg-gray-900/30 border-gray-500/50',
          iconClass: 'text-gray-400',
          titleClass: 'text-gray-400',
          icon: '❓'
        };
    }
  };

  const styling = getErrorStyling(errorState.errorType);

  return (
    <div className={`border rounded-lg p-4 m-4 ${styling.containerClass} ${className}`}>
      {/* Error Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <span className={`mr-2 ${styling.iconClass}`}>{styling.icon}</span>
          <h3 className={`font-medium ${styling.titleClass}`}>
            {errorState.errorType === 'critical' && 'Critical Error'}
            {errorState.errorType === 'recoverable' && 'Recoverable Error'}
            {errorState.errorType === 'warning' && 'Warning'}
            {errorState.errorType === 'info' && 'Information'}
          </h3>
        </div>
        
        {errorState.errorType !== 'critical' && (
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-300 text-sm"
            title="Dismiss"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Message */}
      <p className="text-gray-300 text-sm mb-4">
        {errorState.errorMessage}
      </p>

      {/* Recovery Message */}
      {recoveryMessage && (
        <div className="bg-gray-800/50 rounded p-2 mb-4">
          <p className="text-blue-300 text-sm flex items-center">
            {isRecovering && (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400 mr-2"></div>
            )}
            {recoveryMessage}
          </p>
        </div>
      )}

      {/* Error Details (Development) */}
      {process.env.NODE_ENV === 'development' && errorState.errorCode && (
        <details className="mb-4">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
            Technical Details (Development)
          </summary>
          <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded">
            <p><strong>Error Code:</strong> {errorState.errorCode}</p>
            <p><strong>Timestamp:</strong> {new Date(errorState.timestamp).toLocaleString()}</p>
            <p><strong>Retry Count:</strong> {errorState.retryCount}</p>
            <p><strong>Can Retry:</strong> {errorState.canRetry ? 'Yes' : 'No'}</p>
            <p><strong>Auto Recovery Attempted:</strong> {errorState.autoRecoveryAttempted ? 'Yes' : 'No'}</p>
          </div>
        </details>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {errorState.canRetry && !isRecovering && (
          <button
            onClick={handleManualRetry}
            disabled={isRecovering}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
          >
            Try Again
          </button>
        )}

        {errorState.errorType === 'critical' && (
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Refresh Page
          </button>
        )}

        {errorState.errorType !== 'critical' && (
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            Refresh Page
          </button>
        )}

        {/* Cancel Auto-Recovery */}
        {autoRecoveryTimer && !isRecovering && (
          <button
            onClick={() => {
              if (autoRecoveryTimer) {
                clearInterval(autoRecoveryTimer);
                setAutoRecoveryTimer(null);
              }
              setRecoveryMessage('');
            }}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            Cancel Auto-Recovery
          </button>
        )}
      </div>

      {/* Progress Indicator for Recovery */}
      {isRecovering && (
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Error Display for inline use
 */
export function CompactErrorDisplay({
  errorState,
  onRetry,
  onDismiss
}: {
  errorState: ErrorState | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  if (!errorState) return null;

  const styling = errorState.errorType === 'critical' 
    ? 'bg-red-900/20 border-red-500/30 text-red-300'
    : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300';

  return (
    <div className={`border rounded p-2 mb-2 text-sm ${styling}`}>
      <div className="flex items-center justify-between">
        <span className="flex-1">{errorState.errorMessage}</span>
        <div className="flex gap-1 ml-2">
          {errorState.canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs px-1 hover:bg-gray-700 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorDisplay;