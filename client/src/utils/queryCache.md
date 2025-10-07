# Query Cache Utility

## Overview

The Query Cache utility provides client-side caching for frequently accessed data to reduce database load and improve application performance. It implements a Map-based storage system with TTL (time-to-live) expiration logic.

## Features

- **Simple API**: Easy-to-use get/set interface
- **TTL Expiration**: Automatic cache invalidation after specified time
- **Pattern Matching**: Invalidate multiple cache entries at once
- **Type Safety**: Full TypeScript support with generics
- **Statistics**: Built-in cache monitoring and debugging

## Usage

### Basic Operations

```typescript
import { queryCache } from '@/utils/queryCache';

// Store data in cache (default TTL: 5 minutes)
queryCache.set('user-profile-123', userData);

// Retrieve data from cache
const cachedUser = queryCache.get<UserProfile>('user-profile-123');

if (cachedUser) {
  // Use cached data
  console.log('Cache hit!', cachedUser);
} else {
  // Fetch from database
  const freshData = await fetchUserProfile('123');
  queryCache.set('user-profile-123', freshData);
}
```

### Custom TTL

```typescript
// Cache for 1 minute (60,000 milliseconds)
queryCache.set('temporary-data', data, 60 * 1000);

// Cache for 10 minutes
queryCache.set('medium-term-data', data, 10 * 60 * 1000);

// Cache for 1 hour
queryCache.set('long-term-data', data, 60 * 60 * 1000);
```

### Cache Invalidation

```typescript
// Invalidate specific key
queryCache.invalidate('user-profile-123');

// Invalidate all keys matching pattern
queryCache.invalidatePattern('comments-post-'); // Invalidates all comment caches

// Clear entire cache
queryCache.clear();
```

### Integration Example (Comments)

```typescript
// In CommentList component
const fetchComments = async (postId: string) => {
  // Check cache first
  const cacheKey = `comments-${postId}`;
  const cached = queryCache.get<CommentWithProfile[]>(cacheKey);
  
  if (cached) {
    console.log('Using cached comments');
    return cached;
  }
  
  // Fetch from database
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId);
  
  // Cache the results (5 minutes)
  queryCache.set(cacheKey, data, 5 * 60 * 1000);
  
  return data;
};

// Invalidate cache when creating/deleting comments
const createComment = async (postId: string, content: string) => {
  await supabase.from('comments').insert({ post_id: postId, content });
  
  // Invalidate cache for this post
  queryCache.invalidatePattern(`comments-${postId}`);
};
```

## Cache Statistics

```typescript
// Get cache statistics for debugging
const stats = queryCache.getStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Cache keys:`, stats.entries);

// Check if key exists
if (queryCache.has('user-profile-123')) {
  console.log('Key exists in cache');
}
```

## Best Practices

### 1. Choose Appropriate TTL

- **Frequently changing data**: 1-5 minutes
- **Moderately stable data**: 5-15 minutes
- **Rarely changing data**: 30-60 minutes

### 2. Invalidate on Mutations

Always invalidate cache when data changes:

```typescript
// After creating/updating/deleting
queryCache.invalidatePattern(`resource-${id}`);
```

### 3. Use Descriptive Keys

Use consistent, descriptive cache keys:

```typescript
// Good
queryCache.set(`comments-${postId}-page-${page}`, data);
queryCache.set(`user-profile-${userId}`, data);

// Bad
queryCache.set('data1', data);
queryCache.set('temp', data);
```

### 4. Handle Cache Misses Gracefully

```typescript
const getData = async (key: string) => {
  const cached = queryCache.get(key);
  
  if (cached) {
    return cached;
  }
  
  try {
    const fresh = await fetchFromDatabase();
    queryCache.set(key, fresh);
    return fresh;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return null;
  }
};
```

### 5. Monitor Cache Performance

```typescript
// Log cache hits/misses for optimization
const cached = queryCache.get(key);

if (cached) {
  console.log('Cache hit:', key);
} else {
  console.log('Cache miss:', key);
}
```

## Performance Considerations

### Memory Usage

The cache stores data in memory. For large datasets:

- Use shorter TTLs to free memory faster
- Implement cache size limits if needed
- Clear cache periodically in long-running sessions

### Cache Warming

Pre-populate cache for frequently accessed data:

```typescript
// On app initialization
const warmCache = async () => {
  const popularPosts = await fetchPopularPosts();
  popularPosts.forEach(post => {
    queryCache.set(`post-${post.id}`, post, 15 * 60 * 1000);
  });
};
```

## Testing

The cache includes comprehensive tests covering:

- Basic operations (get/set)
- TTL expiration
- Cache invalidation
- Pattern matching
- Type safety
- Edge cases

Run tests:

```bash
npm test -- queryCache.test.ts
```

## Requirements Satisfied

- **Requirement 2.11**: Implements caching to reduce database load
- **Requirement 2.12**: Implements cache invalidation when data becomes stale

## Future Enhancements

Potential improvements for production:

1. **Size Limits**: Implement LRU (Least Recently Used) eviction
2. **Persistence**: Optional localStorage/sessionStorage backing
3. **Metrics**: Track hit/miss rates and performance
4. **Compression**: Compress large cached values
5. **Namespacing**: Organize cache keys by feature/module
