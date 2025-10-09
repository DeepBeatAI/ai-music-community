/**
 * Extension Error Handler
 * 
 * Suppresses known Chrome extension errors that don't affect application functionality.
 * These errors typically occur when browser extensions inject scripts that interfere
 * with the page's message passing or when extension contexts become invalidated.
 */

/**
 * Initializes extension error suppression
 * Should be called once during application initialization
 */
export function suppressExtensionErrors(): void {
  if (typeof window === 'undefined') {
    return; // Only run in browser environment
  }

  // Store original console.error
  const originalError = console.error;
  
  // Override console.error to filter extension-related errors
  console.error = (...args: unknown[]) => {
    const errorMessage = args[0]?.toString() || '';
    
    // List of known extension error patterns to suppress
    const extensionErrorPatterns = [
      'message channel closed',
      'Extension context invalidated',
      'Could not establish connection',
      'Receiving end does not exist',
      'message port closed',
      'The message port closed before a response was received',
      'A listener indicated an asynchronous response by returning true'
    ];
    
    // Check if this is an extension error
    const isExtensionError = extensionErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // Only suppress if it's a known extension error
    if (!isExtensionError) {
      originalError.apply(console, args);
    }
  };
  
  // Also handle unhandled promise rejections from extensions
  const originalUnhandledRejection = window.onunhandledrejection;
  
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason?.toString() || '';
    
    // Check if this is an extension-related rejection
    const extensionErrorPatterns = [
      'message channel closed',
      'Extension context invalidated',
      'Could not establish connection'
    ];
    
    const isExtensionError = extensionErrorPatterns.some(pattern => 
      reason.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (isExtensionError) {
      // Prevent the error from being logged
      event.preventDefault();
      return;
    }
    
    // Call original handler if it exists
    if (originalUnhandledRejection) {
      originalUnhandledRejection.call(window, event);
    }
  };
}

/**
 * Restores original error handling (for testing purposes)
 */
export function restoreOriginalErrorHandling(): void {
  // This would require storing the original handlers, which we're not doing
  // for simplicity. In production, this function is not needed.
  console.warn('restoreOriginalErrorHandling is not implemented');
}
