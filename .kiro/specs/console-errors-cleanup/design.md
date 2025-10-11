# Design Document

## Overview

This design document outlines the technical approach to eliminate console errors and warnings across the AI Music Community Platform. The solution focuses on fixing query syntax errors, replacing deprecated functions, improving state management, and implementing comprehensive logging standards.

## Architecture

### High-Level Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    Console Error Fixes                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Query Fixes     │  │  Audio Utils     │                │
│  │  - Post Likes    │  │  - Remove Legacy │                │
│  │  - Proper Select │  │  - Use Best URL  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  State Mgmt      │  │  Logging         │                │
│  │  - Pagination    │  │  - Cleanup       │                │
│  │  - Sync Flags    │  │  - Standards     │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Error Handling  │  │  Extension Compat│                │
│  │  - Boundaries    │  │  - Message Chan. │                │
│  │  - Graceful Fail │  │  - Timeout Handle│                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Post Likes Query Fixes

**Problem Analysis:**
- 400 Bad Request: Invalid query syntax `select=post_likes.id&posts.user_id=eq.XXX`
- 406 Not Acceptable: Content negotiation issue with query headers

**Root Cause:**
The queries are using incorrect Supabase PostgREST syntax. The select parameter is trying to access nested relationships incorrectly.

**Solution:**
```typescript
// INCORRECT (Current - causes 400/406 errors)
.from('post_likes')
.select('post_likes.id')
.eq('posts.user_id', userId)

// CORRECT (Fixed)
.from('post_likes')
.select('id')
.eq('post_id', postId)
.eq('user_id', userId)
```

**Files to Modify:**
- `client/src/utils/posts.ts` - Fix fetchPosts and fetchPostsByCreator
- `client/src/components/LikeButton.tsx` - Verify query syntax
- `client/src/utils/search.ts` - Fix getTrendingContent and getFeaturedCreators

**Implementation Details:**
1. Remove invalid nested select syntax
2. Use proper column names directly
3. Add proper error handling for query failures
4. Implement retry logic for transient failures

### 2. Audio URL Function Migration

**Problem Analysis:**
The `getAudioSignedUrl` function in `audioCache.ts` is calling the deprecated function from `audio.ts`, triggering warnings.

**Solution:**
```typescript
// BEFORE (in audioCache.ts)
private async generateSignedUrl(originalUrl: string): Promise<string | null> {
  try {
    const { getAudioSignedUrl } = await import('./audio');
    return await getAudioSignedUrl(originalUrl);
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    return null;
  }
}

// AFTER
private async generateSignedUrl(originalUrl: string): Promise<string | null> {
  try {
    const { getBestAudioUrl } = await import('./audio');
    return await getBestAudioUrl(originalUrl);
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    return null;
  }
}
```

**Files to Modify:**
- `client/src/utils/audioCache.ts` - Update generateSignedUrl method
- `client/src/utils/audio.ts` - Mark getAudioSignedUrl as truly deprecated (add JSDoc)

### 3. Pagination State Management

**Problem Analysis:**
Warning: `fetchInProgress is true but isLoadingMore is false` indicates state synchronization issues.

**Root Cause:**
The pagination manager is setting `fetchInProgress` without properly coordinating with `isLoadingMore` flag.

**Solution:**
```typescript
// Add state validation and auto-correction
setLoadingState(isLoading: boolean, isLoadMore: boolean = false) {
  // Ensure consistent state
  if (isLoading && isLoadMore) {
    this.state.fetchInProgress = true;
    this.state.isLoadingMore = true;
  } else if (isLoading && !isLoadMore) {
    this.state.fetchInProgress = true;
    this.state.isLoadingMore = false;
  } else {
    // Clearing state
    this.state.fetchInProgress = false;
    this.state.isLoadingMore = false;
  }
  
  this.notifySubscribers();
}
```

**Files to Modify:**
- `client/src/utils/unifiedPaginationState.ts` - Fix setLoadingState method
- `client/src/utils/paginationStateValidation.ts` - Reduce warning verbosity

### 4. Console Logging Standards

**Problem Analysis:**
Excessive logging throughout the codebase makes it difficult to identify real issues.

**Solution - Implement Logging Utility:**
```typescript
// client/src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabledInProduction: boolean;
}

class Logger {
  private config: LoggerConfig;
  
  constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      enabledInProduction: false
    };
  }
  
  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`🔍 ${message}`, ...args);
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }
  
  error(message: string, error?: Error, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`❌ ${message}`, error, ...args);
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);
    
    if (process.env.NODE_ENV === 'production' && !this.config.enabledInProduction) {
      return level === 'error' || level === 'warn';
    }
    
    return requestedLevelIndex >= currentLevelIndex;
  }
}

export const logger = new Logger();
```

**Logging Cleanup Strategy:**
1. Replace verbose console.log with logger.debug
2. Keep critical errors as logger.error
3. Use logger.warn for deprecation warnings
4. Remove redundant success logs (✅ messages)
5. Consolidate filter logging into single summary log

**Files to Modify:**
- Create `client/src/utils/logger.ts`
- Update `client/src/utils/audioCache.ts` - Reduce cache logging
- Update `client/src/app/dashboard/page.tsx` - Reduce filter logging
- Update `client/src/utils/posts.ts` - Use logger instead of console
- Update `client/src/utils/audio.ts` - Use logger for deprecation warnings

### 5. Chrome Extension Error Handling

**Problem Analysis:**
Error: "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"

**Root Cause:**
This is a common Chrome extension conflict where extensions inject scripts that interfere with the page's message passing.

**Solution:**
```typescript
// client/src/utils/extensionErrorHandler.ts
export function suppressExtensionErrors() {
  // Catch and suppress extension-related errors
  const originalError = console.error;
  
  console.error = (...args: any[]) => {
    const errorMessage = args[0]?.toString() || '';
    
    // Suppress known extension errors
    const extensionErrors = [
      'message channel closed',
      'Extension context invalidated',
      'Could not establish connection'
    ];
    
    const isExtensionError = extensionErrors.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (!isExtensionError) {
      originalError.apply(console, args);
    }
  };
}

// Initialize in app
if (typeof window !== 'undefined') {
  suppressExtensionErrors();
}
```

**Files to Modify:**
- Create `client/src/utils/extensionErrorHandler.ts`
- Update `client/src/app/layout.tsx` - Initialize error suppression

### 6. Error Boundary Enhancements

**Current State:**
Error boundaries exist but may not catch all async errors.

**Enhancement:**
```typescript
// client/src/components/ErrorBoundary.tsx
interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: any[];
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console with context
    logger.error('Component Error Boundary caught error:', error, {
      componentStack: errorInfo.componentStack
    });
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }
  
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      
      if (hasChanged) {
        this.setState({ hasError: false, error: null });
      }
    }
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}
```

**Files to Modify:**
- Update `client/src/components/ErrorBoundary.tsx` - Add resetKeys support
- Update `client/src/app/dashboard/page.tsx` - Add resetKeys to error boundaries

## Data Models

No database schema changes required. All fixes are client-side code improvements.

## Error Handling

### Query Error Handling Pattern
```typescript
async function fetchWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Query attempt ${i + 1} failed:`, error);
      
      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError!;
}
```

### Graceful Degradation
- If like counts fail to load, show "—" instead of error
- If audio URL generation fails, fall back to original URL
- If pagination fails, show retry button instead of infinite loading

## Testing Strategy

### Unit Tests
1. Test query syntax corrections with mock Supabase client
2. Test logger utility with different log levels
3. Test pagination state transitions
4. Test error boundary reset functionality

### Integration Tests
1. Verify like counts load correctly on /discover/ and /dashboard/
2. Verify audio playback works without warnings
3. Verify load more button works without state warnings
4. Verify error boundaries catch and display errors appropriately

### Manual Testing Checklist
- [ ] Navigate to /discover/ - no 400 errors in console
- [ ] Navigate to /dashboard/ - no 406 errors in console
- [ ] Play audio - no legacy function warnings
- [ ] Click load more - no pagination warnings
- [ ] Check console - only essential logs visible
- [ ] Test with Chrome extensions - no message channel errors
- [ ] Trigger error - error boundary shows fallback UI

## Performance Considerations

- Logger utility adds minimal overhead (~1ms per log call)
- Query fixes may slightly improve performance by reducing failed requests
- Error suppression has negligible performance impact
- No impact on bundle size (all changes are code improvements)

## Security Considerations

- No security implications - all changes are internal code improvements
- Error messages should not expose sensitive data
- Logger should sanitize any user data before logging

## Migration Strategy

### Phase 1: Critical Fixes (Priority 1)
1. Fix post likes query syntax
2. Update audio cache to use getBestAudioUrl
3. Fix pagination state management

### Phase 2: Logging Cleanup (Priority 2)
4. Implement logger utility
5. Replace console.log with logger calls
6. Reduce verbose logging

### Phase 3: Polish (Priority 3)
7. Implement extension error suppression
8. Enhance error boundaries
9. Add comprehensive error handling

## Rollback Plan

All changes are backwards compatible. If issues arise:
1. Revert specific file changes via git
2. No database migrations to rollback
3. No breaking API changes

## Success Metrics

- Zero 400/406 errors in console on /discover/ and /dashboard/
- Zero legacy function warnings
- Zero pagination state warnings
- Console log volume reduced by 70%
- No unhandled promise rejections
- Error boundaries catch 100% of component errors

## Future Enhancements

- Integrate Sentry for production error tracking
- Add performance monitoring for slow queries
- Implement request deduplication for like counts
- Add telemetry for error rates and types
