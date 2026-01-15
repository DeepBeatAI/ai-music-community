/**
 * Retry utility with exponential backoff
 * 
 * Implements retry logic for network failures with exponential backoff strategy.
 * Useful for handling transient network errors gracefully.
 * 
 * Requirements: All (error handling for network failures)
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects after all retries fail
 * 
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   () => fetchTrendingAlbums(),
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt} after error:`, error.message);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      // Call retry callback
      opts.onRetry(attempt + 1, lastError);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Check if an error is a network error that should be retried
 * 
 * @param error - The error to check
 * @returns true if the error is a network error that should be retried
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  
  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection')
  ) {
    return true;
  }

  // HTTP status codes that should be retried
  if ('status' in error) {
    const status = (error as any).status;
    // Retry on 5xx server errors and 429 rate limiting
    return status >= 500 || status === 429;
  }

  return false;
}

/**
 * Retry a function only if the error is retryable
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects if error is not retryable or all retries fail
 */
export async function retryIfRetryable<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isRetryableError(error)) {
      return await retryWithBackoff(fn, options);
    }
    throw error;
  }
}
