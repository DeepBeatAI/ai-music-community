/**
 * Error Logging Utility Test Suite
 * 
 * Tests secure error logging functionality without exposing sensitive information
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import {
  sanitizeError,
  logPaginationError,
  logLoadMoreError,
  logSearchError,
  logPostError,
  logAudioUploadError,
  logErrorBoundaryError
} from '@/utils/errorLogging';

// Mock console.error to capture logs
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;

beforeAll(() => {
  console.error = mockConsoleError;
});

afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  mockConsoleError.mockClear();
});

describe('Error Logging Utility', () => {
  describe('sanitizeError', () => {
    test('should sanitize email addresses from error messages', () => {
      const error = new Error('User john.doe@example.com not found');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('User [EMAIL_REDACTED] not found');
      expect(sanitized.message).not.toContain('john.doe@example.com');
    });

    test('should sanitize credit card numbers from error messages', () => {
      const error = new Error('Invalid card 4532-1234-5678-9012');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('Invalid card [CARD_REDACTED]');
      expect(sanitized.message).not.toContain('4532-1234-5678-9012');
    });

    test('should sanitize SSN from error messages', () => {
      const error = new Error('SSN 123-45-6789 is invalid');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('SSN [SSN_REDACTED] is invalid');
      expect(sanitized.message).not.toContain('123-45-6789');
    });

    test('should sanitize passwords from error messages', () => {
      const error = new Error('Authentication failed with password=secret123');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('Authentication failed with password=[REDACTED]');
      expect(sanitized.message).not.toContain('secret123');
    });

    test('should sanitize tokens from error messages', () => {
      const error = new Error('Invalid token: abc123xyz');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('Invalid token=[REDACTED]');
      expect(sanitized.message).not.toContain('abc123xyz');
    });

    test('should sanitize API keys from error messages', () => {
      const error = new Error('API key=sk_test_123456 is expired');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('API key=[REDACTED] is expired');
      expect(sanitized.message).not.toContain('sk_test_123456');
    });

    test('should sanitize secrets from error messages', () => {
      const error = new Error('Client secret: cs_test_secret123');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('Client secret=[REDACTED]');
      expect(sanitized.message).not.toContain('cs_test_secret123');
    });

    test('should sanitize file paths with usernames from stack traces', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
        at /Users/johndoe/project/file.js:10:5
        at C:\\Users\\janedoe\\project\\file.js:15:10
        at /home/testuser/project/file.js:20:15`;
      
      const sanitized = sanitizeError(error);
      
      expect(sanitized.stack).toContain('/Users/[USER]/project/file.js');
      expect(sanitized.stack).toContain('C:\\Users\\[USER]\\project\\file.js');
      expect(sanitized.stack).toContain('/home/[USER]/project/file.js');
      expect(sanitized.stack).not.toContain('johndoe');
      expect(sanitized.stack).not.toContain('janedoe');
      expect(sanitized.stack).not.toContain('testuser');
    });

    test('should preserve error name and add timestamp', () => {
      const error = new TypeError('Invalid type');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.name).toBe('TypeError');
      expect(sanitized.message).toBe('Invalid type');
      expect(sanitized.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should handle errors without stack traces', () => {
      const error = new Error('Simple error');
      delete error.stack;
      
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('Simple error');
      expect(sanitized.stack).toBeUndefined();
      expect(sanitized.name).toBe('Error');
    });
  });

  describe('logPaginationError', () => {
    test('should log pagination errors with correct structure', () => {
      const error = new Error('Pagination failed');
      const logEntry = logPaginationError(error, 'TestComponent', 'User clicked load more');
      
      expect(logEntry.errorType).toBe('pagination');
      expect(logEntry.component).toBe('TestComponent');
      expect(logEntry.message).toBe('Pagination failed');
      expect(logEntry.userAction).toBe('User clicked load more');
      expect(logEntry.severity).toBeDefined();
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(logEntry.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    test('should determine correct severity for pagination errors', () => {
      const criticalError = new Error('Maximum update depth exceeded');
      const highError = new Error('Network timeout');
      const mediumError = new Error('Validation failed');
      const lowError = new Error('Minor issue');
      
      expect(logPaginationError(criticalError, 'TestComponent').severity).toBe('critical');
      expect(logPaginationError(highError, 'TestComponent').severity).toBe('high');
      expect(logPaginationError(mediumError, 'TestComponent').severity).toBe('medium');
      expect(logPaginationError(lowError, 'TestComponent').severity).toBe('low');
    });

    test('should log to console in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      
      const error = new Error('Dev pagination error');
      logPaginationError(error, 'DevComponent');
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '🔍 Pagination Error Log:',
        expect.objectContaining({
          errorType: 'pagination',
          component: 'DevComponent',
          message: 'Dev pagination error'
        })
      );
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });

    test('should log minimal info in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      
      const error = new Error('Prod pagination error');
      logPaginationError(error, 'ProdComponent');
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Pagination Error:',
        expect.objectContaining({
          timestamp: expect.any(String),
          component: 'ProdComponent',
          severity: expect.any(String),
          sessionId: expect.any(String)
        })
      );
      
      // Should not contain sensitive error message in production
      const logCall = mockConsoleError.mock.calls[0][1];
      expect(logCall).not.toHaveProperty('message');
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });
  });

  describe('logLoadMoreError', () => {
    test('should log load more errors with strategy and page info', () => {
      const error = new Error('Load more failed');
      const logEntry = logLoadMoreError(error, 'client-paginate', 3, 'Button click');
      
      expect(logEntry.errorType).toBe('load_more');
      expect(logEntry.component).toBe('LoadMoreButton');
      expect(logEntry.userAction).toBe('Button click');
      expect(logEntry.severity).toBeDefined();
    });

    test('should generate default user action when not provided', () => {
      const error = new Error('Load more failed');
      const logEntry = logLoadMoreError(error, 'server-fetch', 2);
      
      expect(logEntry.userAction).toBe('Load more using server-fetch strategy on page 2');
    });
  });

  describe('logSearchError', () => {
    test('should log search errors with sanitized query', () => {
      const error = new Error('Search failed');
      const logEntry = logSearchError(error, 'test@example.com query', { type: 'audio' });
      
      expect(logEntry.errorType).toBe('search');
      expect(logEntry.component).toBe('SearchBar');
      expect(logEntry.userAction).toContain('[EMAIL_REDACTED]');
      expect(logEntry.userAction).not.toContain('test@example.com');
    });

    test('should limit search query length in logs', () => {
      const longQuery = 'a'.repeat(200);
      const error = new Error('Search failed');
      const logEntry = logSearchError(error, longQuery);
      
      expect(logEntry.userAction).toContain(longQuery.substring(0, 100));
      expect(logEntry.userAction?.length).toBeLessThan(150); // Account for prefix text
    });

    test('should generate default user action when query not provided', () => {
      const error = new Error('Search failed');
      const logEntry = logSearchError(error);
      
      expect(logEntry.userAction).toBe('Search with query: "undefined"');
    });
  });

  describe('logPostError', () => {
    test('should log post errors with partial post ID', () => {
      const error = new Error('Post render failed');
      const logEntry = logPostError(error, 'very-long-post-id-12345', 'audio');
      
      expect(logEntry.errorType).toBe('post_render');
      expect(logEntry.component).toBe('PostItem');
      expect(logEntry.severity).toBeDefined();
    });

    test('should handle unknown post ID', () => {
      const error = new Error('Post render failed');
      const logEntry = logPostError(error, '');
      
      expect(logEntry).toBeDefined();
      expect(logEntry.errorType).toBe('post_render');
    });
  });

  describe('logAudioUploadError', () => {
    test('should log audio upload errors with file info', () => {
      const error = new Error('Upload failed');
      const logEntry = logAudioUploadError(error, 1024000, 'audio/mp3', 'File selection');
      
      expect(logEntry.errorType).toBe('audio_upload');
      expect(logEntry.component).toBe('AudioUpload');
      expect(logEntry.userAction).toBe('File selection');
    });

    test('should generate default user action when not provided', () => {
      const error = new Error('Upload failed');
      const logEntry = logAudioUploadError(error, undefined, 'audio/wav');
      
      expect(logEntry.userAction).toBe('Upload audio/wav file');
    });

    test('should handle undefined file type', () => {
      const error = new Error('Upload failed');
      const logEntry = logAudioUploadError(error);
      
      expect(logEntry.userAction).toBe('Upload unknown file');
    });
  });

  describe('logErrorBoundaryError', () => {
    test('should log error boundary errors with component stack', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      
      const error = new Error('Boundary error');
      const errorInfo = {
        componentStack: `
          in TestComponent
          in ErrorBoundary
          in App`
      };
      
      logErrorBoundaryError(error, errorInfo, 'TestErrorBoundary');
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ TestErrorBoundary Error Boundary:',
        expect.objectContaining({
          boundaryType: 'TestErrorBoundary',
          error: 'Boundary error',
          componentStack: expect.stringContaining('TestComponent')
        })
      );
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });

    test('should limit component stack length', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      
      const error = new Error('Boundary error');
      const longStack = Array.from({ length: 10 }, (_, i) => `  in Component${i}`).join('\n');
      const errorInfo = { componentStack: longStack };
      
      logErrorBoundaryError(error, errorInfo, 'TestErrorBoundary');
      
      const logCall = mockConsoleError.mock.calls[mockConsoleError.mock.calls.length - 1][1];
      const stackLines = logCall.componentStack.split('\n');
      expect(stackLines.length).toBeLessThanOrEqual(5);
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });

    test('should sanitize additional context', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      
      const error = new Error('Boundary error');
      const errorInfo = { componentStack: 'test stack' };
      const context = {
        userEmail: 'test@example.com',
        password: 'secret123',
        normalData: 'safe data'
      };
      
      logErrorBoundaryError(error, errorInfo, 'TestErrorBoundary', context);
      
      const logCall = mockConsoleError.mock.calls[mockConsoleError.mock.calls.length - 1][1];
      expect(logCall.context.userEmail).toBe('[REDACTED]');
      expect(logCall.context.password).toBe('[REDACTED]');
      expect(logCall.context.normalData).toBe('safe data');
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });
  });

  describe('Context Sanitization', () => {
    test('should sanitize sensitive keys in context objects', () => {
      const error = new Error('Test error');
      const context = {
        password: 'secret',
        token: 'abc123',
        apiKey: 'key123',
        email: 'test@example.com',
        phone: '555-1234',
        normalField: 'safe value'
      };
      
      logPaginationError(error, 'TestComponent', 'test action', context);
      
      // In development mode, check the logged context
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      
      logPaginationError(error, 'TestComponent', 'test action', context);
      
      const logCall = mockConsoleError.mock.calls[mockConsoleError.mock.calls.length - 1][1];
      expect(logCall.context.password).toBe('[REDACTED]');
      expect(logCall.context.token).toBe('[REDACTED]');
      expect(logCall.context.apiKey).toBe('[REDACTED]');
      expect(logCall.context.email).toBe('[REDACTED]');
      expect(logCall.context.phone).toBe('[REDACTED]');
      expect(logCall.context.normalField).toBe('safe value');
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });

    test('should handle arrays and objects in context', () => {
      const error = new Error('Test error');
      const context = {
        arrayField: [1, 2, 3, 4, 5],
        objectField: { nested: 'value' },
        stringField: 'a'.repeat(300), // Long string
        numberField: 42,
        booleanField: true
      };
      
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
      
      logPaginationError(error, 'TestComponent', 'test action', context);
      
      const logCall = mockConsoleError.mock.calls[mockConsoleError.mock.calls.length - 1][1];
      expect(logCall.context.arrayField).toBe('[Array of 5 items]');
      expect(logCall.context.objectField).toBe('[Object]');
      expect(logCall.context.stringField).toHaveLength(200); // Truncated
      expect(logCall.context.numberField).toBe(42);
      expect(logCall.context.booleanField).toBe(true);
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });
  });

  describe('Session ID Generation', () => {
    test('should generate unique session IDs', () => {
      const error = new Error('Test error');
      const log1 = logPaginationError(error, 'Component1');
      const log2 = logPaginationError(error, 'Component2');
      
      expect(log1.sessionId).not.toBe(log2.sessionId);
      expect(log1.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(log2.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });
});