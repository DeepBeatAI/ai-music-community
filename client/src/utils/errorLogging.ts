/**
 * Error Logging Utility
 * 
 * Provides secure error logging without exposing sensitive information
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

export interface ErrorLogEntry {
  timestamp: string;
  errorType: string;
  component: string;
  message: string;
  userAction?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessionId?: string;
  userId?: string; // Only log user ID, never personal info
}

export interface SanitizedError {
  message: string;
  stack?: string;
  name: string;
  timestamp: string;
}

/**
 * Sanitizes error objects to remove sensitive information
 */
export function sanitizeError(error: Error): SanitizedError {
  // Remove any potential sensitive information from error messages
  const sanitizedMessage = error.message
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]') // Remove emails
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]') // Remove credit card numbers
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]') // Remove SSNs
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]') // Remove passwords
    .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]') // Remove tokens
    .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]') // Remove API keys
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]'); // Remove secrets

  // Sanitize stack trace to remove file paths that might contain usernames
  const sanitizedStack = error.stack
    ?.replace(/\/Users\/[^\/]+/g, '/Users/[USER]')
    ?.replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\[USER]')
    ?.replace(/\/home\/[^\/]+/g, '/home/[USER]');

  return {
    message: sanitizedMessage,
    stack: sanitizedStack,
    name: error.name,
    timestamp: new Date().toISOString()
  };
}

/**
 * Logs pagination-specific errors securely
 */
export function logPaginationError(
  error: Error,
  component: string,
  userAction?: string,
  additionalContext?: Record<string, any>
): ErrorLogEntry {
  const sanitizedError = sanitizeError(error);
  
  const logEntry: ErrorLogEntry = {
    timestamp: sanitizedError.timestamp,
    errorType: 'pagination',
    component,
    message: sanitizedError.message,
    userAction,
    severity: determineSeverity(error, component),
    sessionId: generateSessionId()
  };

  // Log to console in development, would send to logging service in production
  if (process.env.NODE_ENV === 'development') {
    console.error('🔍 Pagination Error Log:', {
      ...logEntry,
      sanitizedStack: sanitizedError.stack,
      context: sanitizeContext(additionalContext)
    });
  } else {
    // In production, only log essential information
    console.error('Pagination Error:', {
      timestamp: logEntry.timestamp,
      component: logEntry.component,
      severity: logEntry.severity,
      sessionId: logEntry.sessionId
    });
  }

  return logEntry;
}

/**
 * Logs load more specific errors securely
 */
export function logLoadMoreError(
  error: Error,
  strategy: 'client-paginate' | 'server-fetch',
  currentPage: number,
  userAction?: string
): ErrorLogEntry {
  const sanitizedError = sanitizeError(error);
  
  const logEntry: ErrorLogEntry = {
    timestamp: sanitizedError.timestamp,
    errorType: 'load_more',
    component: 'LoadMoreButton',
    message: sanitizedError.message,
    userAction: userAction || `Load more using ${strategy} strategy on page ${currentPage}`,
    severity: determineSeverity(error, 'LoadMoreButton'),
    sessionId: generateSessionId()
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('🔄 Load More Error Log:', {
      ...logEntry,
      strategy,
      currentPage,
      sanitizedStack: sanitizedError.stack
    });
  } else {
    console.error('Load More Error:', {
      timestamp: logEntry.timestamp,
      strategy,
      severity: logEntry.severity,
      sessionId: logEntry.sessionId
    });
  }

  return logEntry;
}

/**
 * Logs search-related errors securely
 */
export function logSearchError(
  error: Error,
  searchQuery?: string,
  filters?: Record<string, any>,
  userAction?: string
): ErrorLogEntry {
  const sanitizedError = sanitizeError(error);
  
  // Sanitize search query to remove potential sensitive information
  const sanitizedQuery = searchQuery
    ?.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
    ?.substring(0, 100); // Limit query length in logs

  const logEntry: ErrorLogEntry = {
    timestamp: sanitizedError.timestamp,
    errorType: 'search',
    component: 'SearchBar',
    message: sanitizedError.message,
    userAction: userAction || `Search with query: "${sanitizedQuery}"`,
    severity: determineSeverity(error, 'SearchBar'),
    sessionId: generateSessionId()
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('🔍 Search Error Log:', {
      ...logEntry,
      sanitizedQuery,
      filters: sanitizeContext(filters),
      sanitizedStack: sanitizedError.stack
    });
  } else {
    console.error('Search Error:', {
      timestamp: logEntry.timestamp,
      component: logEntry.component,
      severity: logEntry.severity,
      sessionId: logEntry.sessionId
    });
  }

  return logEntry;
}

/**
 * Logs post rendering errors securely
 */
export function logPostError(
  error: Error,
  postId: string,
  postType?: string,
  userAction?: string
): ErrorLogEntry {
  const sanitizedError = sanitizeError(error);
  
  const logEntry: ErrorLogEntry = {
    timestamp: sanitizedError.timestamp,
    errorType: 'post_render',
    component: 'PostItem',
    message: sanitizedError.message,
    userAction: userAction || `Rendering ${postType || 'unknown'} post`,
    severity: determineSeverity(error, 'PostItem'),
    sessionId: generateSessionId()
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('📝 Post Error Log:', {
      ...logEntry,
      postId: postId.substring(0, 8) + '...', // Only log partial post ID
      postType,
      sanitizedStack: sanitizedError.stack
    });
  } else {
    console.error('Post Error:', {
      timestamp: logEntry.timestamp,
      component: logEntry.component,
      severity: logEntry.severity,
      sessionId: logEntry.sessionId
    });
  }

  return logEntry;
}

/**
 * Logs audio upload errors securely
 */
export function logAudioUploadError(
  error: Error,
  fileSize?: number,
  fileType?: string,
  userAction?: string
): ErrorLogEntry {
  const sanitizedError = sanitizeError(error);
  
  const logEntry: ErrorLogEntry = {
    timestamp: sanitizedError.timestamp,
    errorType: 'audio_upload',
    component: 'AudioUpload',
    message: sanitizedError.message,
    userAction: userAction || `Upload ${fileType || 'unknown'} file`,
    severity: determineSeverity(error, 'AudioUpload'),
    sessionId: generateSessionId()
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('🎵 Audio Upload Error Log:', {
      ...logEntry,
      fileSize: fileSize ? `${Math.round(fileSize / 1024)}KB` : 'unknown',
      fileType,
      sanitizedStack: sanitizedError.stack
    });
  } else {
    console.error('Audio Upload Error:', {
      timestamp: logEntry.timestamp,
      component: logEntry.component,
      severity: logEntry.severity,
      sessionId: logEntry.sessionId
    });
  }

  return logEntry;
}

/**
 * Determines error severity based on error type and component
 */
function determineSeverity(error: Error, component: string): ErrorLogEntry['severity'] {
  const errorMessage = error.message.toLowerCase();
  
  // Critical errors that break core functionality
  if (
    errorMessage.includes('maximum update depth') ||
    errorMessage.includes('infinite') ||
    errorMessage.includes('memory') ||
    errorMessage.includes('crash') ||
    component === 'PaginationErrorBoundary'
  ) {
    return 'critical';
  }
  
  // High severity errors that significantly impact user experience
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('authentication') ||
    component === 'LoadMoreButton'
  ) {
    return 'high';
  }
  
  // Medium severity errors that impact specific features
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('parse') ||
    errorMessage.includes('format') ||
    component === 'SearchBar' ||
    component === 'AudioUpload'
  ) {
    return 'medium';
  }
  
  // Low severity errors for individual components
  return 'low';
}

/**
 * Sanitizes context objects to remove sensitive information
 */
function sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
  if (!context) return undefined;
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(context)) {
    const keyLower = key.toLowerCase();
    
    // Skip sensitive keys entirely
    if (
      keyLower.includes('password') ||
      keyLower.includes('token') ||
      keyLower.includes('secret') ||
      keyLower.includes('key') ||
      keyLower.includes('email') ||
      keyLower.includes('phone')
    ) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = value
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
        .substring(0, 200); // Limit string length
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = `[Array of ${value.length} items]`;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = '[Object]';
    } else {
      sanitized[key] = String(value).substring(0, 100);
    }
  }
  
  return sanitized;
}

/**
 * Generates a session ID for error tracking
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Error boundary logging helper
 */
export function logErrorBoundaryError(
  error: Error,
  errorInfo: { componentStack: string },
  boundaryType: string,
  additionalContext?: Record<string, unknown>
): void {
  const sanitizedError = sanitizeError(error);
  
  const logData = {
    timestamp: sanitizedError.timestamp,
    boundaryType,
    error: sanitizedError.message,
    componentStack: errorInfo.componentStack
      ?.split('\n')
      ?.slice(0, 5) // Only log first 5 lines of component stack
      ?.join('\n'),
    context: sanitizeContext(additionalContext),
    sessionId: generateSessionId()
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ ${boundaryType} Error Boundary:`, {
      ...logData,
      fullStack: sanitizedError.stack
    });
  } else {
    console.error(`Error Boundary Triggered:`, {
      timestamp: logData.timestamp,
      boundaryType: logData.boundaryType,
      sessionId: logData.sessionId
    });
  }
}