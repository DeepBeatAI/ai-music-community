# Load More System Troubleshooting Guide

## Quick Diagnosis

### Symptoms Checklist

Use this checklist to quickly identify the issue:

- [ ] Load More button not appearing
- [ ] Load More button not working when clicked
- [ ] Wrong pagination mode (server vs client)
- [ ] Posts not loading or displaying incorrectly
- [ ] Performance issues (slow loading, memory problems)
- [ ] State inconsistencies or errors
- [ ] Search/filter integration problems

## Common Issues and Solutions

### 1. Load More Button Not Appearing

#### Symptoms
- Button is missing even when more posts are available
- Button appears and disappears unexpectedly

#### Possible Causes
- `hasMorePosts` calculation is incorrect
- Pagination state is not properly initialized
- Component rendering conditions are wrong

#### Solutions

```typescript
// Check pagination state
const state = paginationManager.getState();
console.log('Pagination State:', {
  hasMorePosts: state.hasMorePosts,
  totalPosts: state.totalPostsCount,
  loadedPosts: state.allPosts.length,
  currentPage: state.currentPage,
});

// Verify hasMorePosts calculation
const hasMore = state.paginationMode === 'client' 
  ? state.currentPage * state.postsPerPage < state.displayPosts.length
  : state.allPosts.length < state.totalPostsCount;

console.log('Should have more posts:', hasMore);
```

#### Fix
```typescript
// Ensure proper state initialization
useEffect(() => {
  if (paginationManagerRef.current) {
    fetchPosts(); // Initial load
  }
}, [paginationManagerRef.current]);

// Verify button rendering condition
{hasMorePosts && !showNoResults && (
  <LoadMoreButton {...props} />
)}
```

### 2. Load More Button Not Working

#### Symptoms
- Button is visible but clicking does nothing
- Button shows loading state but never completes
- Error messages appear when clicking

#### Possible Causes
- Handler not properly connected
- State machine in wrong state
- Network or API issues
- Race conditions in requests

#### Solutions

```typescript
// Debug handler connection
const handleLoadMore = useCallback(async () => {
  console.log('Load More clicked');
  
  if (!loadMoreHandlerRef.current) {
    console.error('Load More handler not initialized');
    return;
  }

  try {
    const result = await loadMoreHandlerRef.current.handleLoadMore();
    console.log('Load More result:', result);
    
    if (!result.success) {
      console.error('Load More failed:', result.error);
    }
  } catch (error) {
    console.error('Load More error:', error);
  }
}, []);

// Check state machine state
const stateMachineState = stateMachineRef.current?.getCurrentState();
console.log('State machine state:', stateMachineState);
```

#### Fix
```typescript
// Ensure proper handler initialization
useEffect(() => {
  if (paginationManagerRef.current && !loadMoreHandlerRef.current) {
    loadMoreHandlerRef.current = createLoadMoreHandler(
      paginationManagerRef.current.getState(),
      stateMachineRef.current
    );
  }
}, [paginationManagerRef.current]);

// Add error handling
const handleLoadMore = useCallback(async () => {
  try {
    setError(''); // Clear previous errors
    const result = await loadMoreHandlerRef.current.handleLoadMore();
    
    if (result.success && result.strategy === 'server-fetch') {
      const nextPage = Math.ceil(currentPosts.length / 15) + 1;
      await fetchPosts(nextPage, true);
    }
  } catch (error) {
    setError('Failed to load more posts. Please try again.');
    console.error('Load More error:', error);
  }
}, [fetchPosts]);
```

### 3. Wrong Pagination Mode

#### Symptoms
- Server-side pagination when client-side expected
- Client-side pagination when server-side expected
- Mode switching unexpectedly

#### Possible Causes
- Mode detection logic issues
- Search/filter state not properly set
- Context creation problems

#### Solutions

```typescript
// Debug mode detection
const context = createModeDetectionContext({
  isSearchActive: state.isSearchActive,
  searchFilters: state.currentSearchFilters,
  filters: state.filters,
  allPosts: state.allPosts,
  displayPosts: state.displayPosts,
  currentPage: state.currentPage,
});

const detectedMode = detectPaginationMode(context);
console.log('Mode detection:', {
  context,
  detectedMode,
  currentMode: state.paginationMode,
});
```

#### Fix
```typescript
// Ensure proper search state
const handleSearch = useCallback((results, query) => {
  console.log('Search triggered:', { query, resultsCount: results.posts.length });
  
  paginationManagerRef.current.updateSearch(results, query, {});
  
  // Verify mode after search
  const newState = paginationManagerRef.current.getState();
  console.log('Mode after search:', newState.paginationMode);
}, []);

// Ensure proper filter state
const handleFiltersChange = useCallback((filters) => {
  console.log('Filters changed:', filters);
  
  paginationManagerRef.current.updateFilters(filters);
  
  // Verify mode after filter
  const newState = paginationManagerRef.current.getState();
  console.log('Mode after filter:', newState.paginationMode);
}, []);
```

### 4. Posts Not Loading Correctly

#### Symptoms
- Duplicate posts appearing
- Posts missing or not displaying
- Incorrect post order

#### Possible Causes
- State update issues
- Data fetching problems
- Post deduplication not working

#### Solutions

```typescript
// Debug post updates
const updatePosts = (newPosts, isLoadMore) => {
  console.log('Updating posts:', {
    newPostsCount: newPosts.length,
    isLoadMore,
    currentPostsCount: state.allPosts.length,
  });

  paginationManagerRef.current.updatePosts({
    newPosts,
    resetPagination: !isLoadMore,
    updateMetadata: {
      lastFetchTimestamp: Date.now(),
      currentBatch: isLoadMore ? Math.ceil(state.allPosts.length / 15) + 1 : 1,
    },
  });

  // Verify update
  const newState = paginationManagerRef.current.getState();
  console.log('Posts after update:', {
    totalPosts: newState.allPosts.length,
    displayPosts: newState.displayPosts.length,
    paginatedPosts: newState.paginatedPosts.length,
  });
};
```

#### Fix
```typescript
// Ensure proper post deduplication
const deduplicatePosts = (posts) => {
  const seen = new Set();
  return posts.filter(post => {
    if (seen.has(post.id)) {
      return false;
    }
    seen.add(post.id);
    return true;
  });
};

// Apply deduplication before updating
const newPosts = deduplicatePosts(fetchedPosts);
updatePosts(newPosts, isLoadMore);
```

### 5. Performance Issues

#### Symptoms
- Slow loading times
- High memory usage
- Browser freezing or lagging
- Poor responsiveness

#### Possible Causes
- Too many posts in memory
- Inefficient rendering
- Network request issues
- Memory leaks

#### Solutions

```typescript
// Monitor performance
import { getPerformanceMetrics, generatePerformanceReport } from '@/utils/paginationPerformanceOptimizer';

const metrics = getPerformanceMetrics();
console.log('Performance Metrics:', metrics);

if (metrics.loadTime > 3000) {
  console.warn('Load time exceeds 3 seconds');
}

if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
  console.warn('High memory usage detected');
}

console.log(generatePerformanceReport());
```

#### Fix
```typescript
// Enable memory optimization
import { optimizeMemoryUsage } from '@/utils/paginationPerformanceOptimizer';

// In your component
useEffect(() => {
  const interval = setInterval(() => {
    const state = paginationManagerRef.current?.getState();
    if (state && state.allPosts.length > 500) {
      const optimizedPosts = optimizeMemoryUsage(state.allPosts);
      paginationManagerRef.current.updatePosts({
        newPosts: optimizedPosts,
        resetPagination: true,
      });
    }
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, []);

// Optimize rendering
const MemoizedPostItem = React.memo(PostItem);

// Use virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';
```

### 6. State Inconsistencies

#### Symptoms
- Unexpected behavior
- Error messages about state validation
- Data not matching UI

#### Possible Causes
- Race conditions
- State corruption
- Validation failures

#### Solutions

```typescript
// Regular state validation
useEffect(() => {
  const interval = setInterval(() => {
    if (paginationManagerRef.current) {
      const isValid = paginationManagerRef.current.validateAndRecover();
      if (!isValid) {
        console.error('State validation failed');
        setError('Pagination state error. Please refresh the page.');
      }
    }
  }, 30000); // Check every 30 seconds

  return () => clearInterval(interval);
}, []);

// Debug state changes
paginationManagerRef.current.subscribe((newState) => {
  console.log('State changed:', {
    mode: newState.paginationMode,
    strategy: newState.loadMoreStrategy,
    postsCount: newState.allPosts.length,
    hasMore: newState.hasMorePosts,
  });
  
  setPaginationState(newState);
});
```

#### Fix
```typescript
// Implement state recovery
const recoverFromError = useCallback(() => {
  console.log('Attempting state recovery...');
  
  if (paginationManagerRef.current) {
    paginationManagerRef.current.reset();
    fetchPosts(); // Reload initial data
  }
}, [fetchPosts]);

// Add error boundary
class PaginationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Pagination error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <p>Something went wrong with pagination.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 7. Search/Filter Integration Problems

#### Symptoms
- Filters not working with Load More
- Search results not paginating correctly
- Mode not switching when expected

#### Possible Causes
- Search state not properly updated
- Filter state synchronization issues
- Mode detection not working with search/filters

#### Solutions

```typescript
// Debug search integration
const handleSearch = useCallback((results, query) => {
  console.log('Search integration debug:', {
    query,
    resultsCount: results.posts.length,
    currentMode: paginationManagerRef.current?.getState().paginationMode,
  });

  paginationManagerRef.current.updateSearch(results, query, {});
  
  const newState = paginationManagerRef.current.getState();
  console.log('After search update:', {
    mode: newState.paginationMode,
    strategy: newState.loadMoreStrategy,
    displayPosts: newState.displayPosts.length,
    isSearchActive: newState.isSearchActive,
  });
}, []);
```

#### Fix
```typescript
// Ensure proper search/filter synchronization
const handleFiltersChange = useCallback((searchFilters) => {
  console.log('Filters changed:', searchFilters);

  const currentState = paginationManagerRef.current.getState();
  paginationManagerRef.current.updateSearch(
    currentState.searchResults,
    searchQuery,
    searchFilters
  );
}, [searchQuery]);

// Clear search properly
const clearSearch = useCallback(() => {
  console.log('Clearing search');
  
  setSearchQuery('');
  paginationManagerRef.current.clearSearch();
  
  // Verify clear worked
  const newState = paginationManagerRef.current.getState();
  console.log('After clear:', {
    mode: newState.paginationMode,
    isSearchActive: newState.isSearchActive,
  });
}, []);
```

## Debug Tools

### State Inspector

```typescript
// Add to your component for debugging
const DebugPanel = () => {
  const [showDebug, setShowDebug] = useState(false);
  const state = paginationManagerRef.current?.getState();
  const metrics = paginationManagerRef.current?.getPerformanceMetrics();

  if (!showDebug) {
    return (
      <button 
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded max-w-md max-h-96 overflow-auto">
      <button onClick={() => setShowDebug(false)}>Close</button>
      
      <h3>Pagination State</h3>
      <pre>{JSON.stringify(state, null, 2)}</pre>
      
      <h3>Performance Metrics</h3>
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
      
      <button onClick={() => console.log(paginationManagerRef.current?.getDebugInfo())}>
        Log Debug Info
      </button>
    </div>
  );
};
```

### Performance Monitor

```typescript
// Add performance monitoring
const usePerformanceMonitor = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = getPerformanceMetrics();
      
      if (metrics.loadTime > 3000) {
        console.warn('⚠️ Load time warning:', metrics.loadTime);
      }
      
      if (metrics.errorRate > 0.1) {
        console.warn('⚠️ High error rate:', metrics.errorRate);
      }
      
      if (metrics.cacheHitRate < 0.5) {
        console.warn('⚠️ Low cache hit rate:', metrics.cacheHitRate);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);
};
```

## Emergency Recovery

### Complete Reset

If all else fails, use this emergency recovery:

```typescript
const emergencyReset = () => {
  console.log('🚨 Emergency pagination reset');
  
  // Clear all state
  if (paginationManagerRef.current) {
    paginationManagerRef.current.reset();
  }
  
  // Clear local state
  setPaginationState(null);
  setError('');
  setSearchQuery('');
  
  // Reinitialize
  setTimeout(() => {
    fetchPosts();
  }, 100);
};

// Add to your component
<button onClick={emergencyReset} className="emergency-reset">
  🚨 Emergency Reset
</button>
```

### Data Recovery

```typescript
const recoverData = async () => {
  try {
    console.log('🔄 Attempting data recovery');
    
    // Clear current state
    paginationManagerRef.current?.reset();
    
    // Fetch fresh data
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);
    
    if (error) throw error;
    
    // Update with fresh data
    paginationManagerRef.current?.updatePosts({
      newPosts: data,
      resetPagination: true,
    });
    
    console.log('✅ Data recovery successful');
  } catch (error) {
    console.error('❌ Data recovery failed:', error);
  }
};
```

## Prevention Tips

1. **Always validate state** after major operations
2. **Use error boundaries** around pagination components
3. **Monitor performance metrics** regularly
4. **Test edge cases** thoroughly
5. **Keep debug tools** available in development
6. **Log important state changes** for debugging
7. **Use TypeScript** for better type safety
8. **Test with realistic data volumes**
9. **Handle network failures gracefully**
10. **Provide user feedback** for all operations

## Getting Help

If you're still experiencing issues:

1. Check the console for error messages
2. Use the debug tools provided above
3. Review the performance metrics
4. Test with a clean state (emergency reset)
5. Check network requests in browser dev tools
6. Verify your configuration matches the documentation
7. Test in different browsers/devices
8. Check for any custom modifications that might interfere

Remember: Most issues are related to state management, so focus on understanding the current state and how it's being updated.