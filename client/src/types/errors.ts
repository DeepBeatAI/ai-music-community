/**
 * Error Handling Types for Load More Operations
 * 
 * This module defines comprehensive error types and interfaces for handling
 * various error scenarios in the Load More pagination system.
 */

/**
 * Base error interface for all Load More errors
 */
export interface LoadMoreError {
  code: string;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  recoverable: boolean;
  retryable: boolean;
}

/**
 * Network error types
 */
export type NetworkErrorType = 
  | 'CONNECTION_FAILED'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'NETWORK_UNAVAILABLE';

/**
 * State error types
 */
export type StateErrorType =
  | 'INVALID_STATE'
  | 'STATE_CORRUPTION'
  | 'INCONSISTENT_DATA'
  | 'MISSING_REQUIRED_DATA'
  | 'INVALID_PAGINATION_STATE'
  | 'FILTER_STATE_MISMATCH'
  | 'SEARCH_STATE_INVALID';

/**
 * Race condition error types
 */
export type RaceConditionErrorType =
  | 'CONCURRENT_REQUEST'
  | 'DUPLICATE_REQUEST'
  | 'REQUEST_QUEUE_OVERFLOW'
  | 'STATE_TRANSITION_CONFLICT'
  | 'RESOURCE_LOCK_TIMEOUT'
  | 'OPERATION_CANCELLED';

/**
 * Network error class
 */
export class NetworkError extends Error implements LoadMoreError {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly errorType: NetworkErrorType;
  public readonly statusCode?: number;
  public readonly responseBody?: string;

  constructor(
    errorType: NetworkErrorType,
    message: string,
    options: {
      statusCode?: number;
      responseBody?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'NetworkError';
    this.code = `NETWORK_${errorType}`;
    this.errorType = errorType;
    this.timestamp = Date.now();
    this.context = options.context;
    this.statusCode = options.statusCode;
    this.responseBody = options.responseBody;
    
    // Determine if error is recoverable and retryable
    this.recoverable = this.isRecoverable(errorType);
    this.retryable = this.isRetryable(errorType);
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  private isRecoverable(errorType: NetworkErrorType): boolean {
    const recoverableTypes: NetworkErrorType[] = [
      'CONNECTION_FAILED',
      'TIMEOUT',
      'SERVER_ERROR',
      'RATE_LIMITED',
      'NETWORK_UNAVAILABLE'
    ];
    return recoverableTypes.includes(errorType);
  }

  private isRetryable(errorType: NetworkErrorType): boolean {
    const retryableTypes: NetworkErrorType[] = [
      'CONNECTION_FAILED',
      'TIMEOUT',
      'SERVER_ERROR',
      'RATE_LIMITED',
      'NETWORK_UNAVAILABLE'
    ];
    return retryableTypes.includes(errorType);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      errorType: this.errorType,
      timestamp: this.timestamp,
      statusCode: this.statusCode,
      responseBody: this.responseBody,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
    };
  }
}

/**
 * State error class
 */
export class StateError extends Error implements LoadMoreError {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly errorType: StateErrorType;
  public readonly stateSnapshot?: Record<string, unknown>;

  constructor(
    errorType: StateErrorType,
    message: string,
    options: {
      stateSnapshot?: Record<string, unknown>;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'StateError';
    this.code = `STATE_${errorType}`;
    this.errorType = errorType;
    this.timestamp = Date.now();
    this.context = options.context;
    this.stateSnapshot = options.stateSnapshot;
    
    // State errors are generally recoverable but not retryable
    this.recoverable = true;
    this.retryable = false;
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      errorType: this.errorType,
      timestamp: this.timestamp,
      stateSnapshot: this.stateSnapshot,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
    };
  }
}

/**
 * Race condition error class
 */
export class RaceConditionError extends Error implements LoadMoreError {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly errorType: RaceConditionErrorType;
  public readonly conflictingOperations?: string[];

  constructor(
    errorType: RaceConditionErrorType,
    message: string,
    options: {
      conflictingOperations?: string[];
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'RaceConditionError';
    this.code = `RACE_${errorType}`;
    this.errorType = errorType;
    this.timestamp = Date.now();
    this.context = options.context;
    this.conflictingOperations = options.conflictingOperations;
    
    // Race condition errors are recoverable and retryable with delay
    this.recoverable = true;
    this.retryable = true;
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      errorType: this.errorType,
      timestamp: this.timestamp,
      conflictingOperations: this.conflictingOperations,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
    };
  }
}

/**
 * Error recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: LoadMoreError): boolean;
  recover(error: LoadMoreError, context: ErrorRecoveryContext): Promise<ErrorRecoveryResult>;
  getRecoveryTime(): number;
}

/**
 * Error recovery context
 */
export interface ErrorRecoveryContext {
  requestId: string;
  operationType: 'load-more' | 'auto-fetch' | 'client-paginate';
  attemptNumber: number;
  maxAttempts: number;
  paginationState: Record<string, unknown>;
  userContext: Record<string, unknown>;
}

/**
 * Error recovery result
 */
export interface ErrorRecoveryResult {
  success: boolean;
  action: 'retry' | 'reset' | 'fallback' | 'abort';
  delay?: number;
  message?: string;
  newState?: Record<string, unknown>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'NETWORK_CONNECTION_FAILED',
    'NETWORK_TIMEOUT',
    'NETWORK_SERVER_ERROR',
    'NETWORK_RATE_LIMITED',
    'NETWORK_NETWORK_UNAVAILABLE',
    'RACE_CONCURRENT_REQUEST',
    'RACE_DUPLICATE_REQUEST',
    'RACE_STATE_TRANSITION_CONFLICT',
  ],
};

/**
 * Error context for debugging and monitoring
 */
export interface ErrorContext {
  requestId: string;
  operationType: string;
  timestamp: number;
  userAgent: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  paginationState?: Record<string, unknown>;
  performanceMetrics?: Record<string, number>;
}

/**
 * Error reporting interface
 */
export interface ErrorReporter {
  reportError(error: LoadMoreError, context: ErrorContext): void;
  reportRecovery(error: LoadMoreError, recovery: ErrorRecoveryResult, context: ErrorContext): void;
  getErrorStats(): ErrorStats;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  recoveryRate: number;
  averageRecoveryTime: number;
  lastError?: LoadMoreError;
  errorTrends: ErrorTrend[];
}

/**
 * Error trend data
 */
export interface ErrorTrend {
  timestamp: number;
  errorCount: number;
  errorType: string;
  recoverySuccess: boolean;
}

/**
 * User feedback configuration
 */
export interface UserFeedbackConfig {
  showRetryButton: boolean;
  showErrorDetails: boolean;
  showRecoveryProgress: boolean;
  autoHideDelay: number;
  maxErrorsBeforeDisable: number;
}

/**
 * Default user feedback configuration
 */
export const DEFAULT_USER_FEEDBACK_CONFIG: UserFeedbackConfig = {
  showRetryButton: true,
  showErrorDetails: false,
  showRecoveryProgress: true,
  autoHideDelay: 5000,
  maxErrorsBeforeDisable: 5,
};