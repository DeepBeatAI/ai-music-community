/**
 * Performance Optimizer Unit Tests
 * 
 * Tests the performance optimization components:
 * - Memory management and cleanup
 * - Request caching and deduplication
 * - Client-side pagination optimization
 * - Performance metrics tracking
 */

import { 
  PaginationPerformanceOptimizer,
  optimizeRequest,
  optimizeClientPagination,
  getPerformanceMetrics
} from '@/utils/paginationPerformanceOptimizer';
import { Post } from '@/types';

// Mock data generators
const createMockPost = (id: string, index: number): Post => ({
  id,
  content: `Performance test post ${index}`,
  post_type: 'text',
  created_at: new Date(Date.now() - index * 1000 * 60).toISOString(),
  updated_at: new Date(Date.now() - index * 1000 * 60).toISOString(),
  user_id: 'test-user-id',
  like_count: Math.floor(Math.random() * 10),
  liked_by_user: false,
  user_profiles: {
    username: 'testuser',
    user_id: 'test-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
});

const createMockPosts = (count: number, startIndex: number = 0): Post[] => {
  return Array.from({ length: count }, (_, i) => 
    createMockPost(`post-${startIndex + i}`, startIndex + i)
  );
};

describe('Performance Optimizer', () => {
  let optimizer: PaginationPerformanceOptimizer;

  beforeEach(() => {
    optimizer = new PaginationPerformanceOptimizer({
      maxMemoryPosts: 100,
      cleanupThreshold: 0.8,
      requestTimeout: 5000,
      cacheSize: 50,
      batchSize: 15,
    });
  });

  afterEach(() => {
    optimizer.destroy();
  });

  describe('Memory Management', () => {
    test('should cleanup posts when memory threshold exceeded', () => {
      const largeBatch = createMockPosts(150, 0);
      const optimized = optimizer.optimizeMemoryUsage(largeBatch);

      // Should reduce to reasonable size
      expect(optimized.length).toBeLessThan(largeBatch.length);
      expect(optimized.length).toBeLessThanOrEqual(100); // Max memory posts
    });

    test('should preserve recent posts during cleanup', () => {
      const largeBatch = createMockPosts(150, 0);
      const optimized = optimizer.optimizeMemoryUsage(largeBatch);

      // Should keep most recent posts (posts are ordered by creation time)
      expect(optimized[optimized.length - 1].id).toBe('post-149');
      expect(optimized[0].id).toBe('post-50'); // Should start from post 50 (150-100)
    });

    test('should track memory usage accurately', () => {
      const posts = createMockPosts(50, 0);
      optimizer.optimizeMemoryUsage(posts);

      const metrics = optimizer.getMetrics();
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    test('should not modify posts when under memory threshold', () => {
      const smallBatch = createMockPosts(50, 0);
      const optimized = optimizer.optimizeMemoryUsage(smallBatch);

      expect(optimized.length).toBe(smallBatch.length);
      expect(optimized).toEqual(smallBatch);
    });
  });

  describe('Request Optimization', () => {
    test('should cache requests with configurable duration', async () => {
      let callCount = 0;
      const mockRequest = (): Promise<{ data: string; timestamp: number }> => {
        callCount++;
        return Promise.resolve({ data: 'test-data', timestamp: Date.now() });
      };

      // First request
      const result1 = await optimizer.optimizeRequest('cache-test', mockRequest, 1000);
      expect(callCount).toBe(1);

      // Second request within cache duration should use cache
      const result2 = await optimizer.optimizeRequest('cache-test', mockRequest, 1000);
      expect(callCount).toBe(1); // Should not increment
      expect(result1).toEqual(result2);
    });

    test('should deduplicate identical requests', async () => {
      let callCount = 0;
      const mockRequest = (): Promise<{ data: string }> => {
        callCount++;
        return Promise.resolve({ data: 'test-data' });
      };

      // Make multiple identical requests simultaneously
      const promises = [
        optimizer.optimizeRequest('dedup-test', mockRequest),
        optimizer.optimizeRequest('dedup-test', mockRequest),
        optimizer.optimizeRequest('dedup-test', mockRequest),
      ];

      const results = await Promise.all(promises);

      // Should only call the function once due to deduplication
      expect(callCount).toBe(1);
      
      // All results should be identical
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });

    test('should handle request timeouts gracefully', async () => {
      const slowRequest = (): Promise<{ data: string }> => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: 'slow-data' }), 10000)
        );

      // Should timeout and throw error
      await expect(
        optimizer.optimizeRequest('timeout-test', slowRequest)
      ).rejects.toThrow('Request timeout');
    }, 8000);

    test('should refresh cache when expired', async () => {
      let callCount = 0;
      const mockRequest = (): Promise<{ data: string; count: number }> => {
        callCount++;
        return Promise.resolve({ data: 'test-data', count: callCount });
      };

      // First request
      const result1 = await optimizer.optimizeRequest('expire-test', mockRequest, 100);
      expect(callCount).toBe(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second request after expiry should make new request
      const result2 = await optimizer.optimizeRequest('expire-test', mockRequest, 100);
      expect(callCount).toBe(2);
      expect(result2.count).toBe(2);
    });
  });

  describe('Client-Side Pagination Optimization', () => {
    test('should paginate large datasets efficiently', () => {
      const largeBatch = createMockPosts(1000, 0);
      
      const startTime = performance.now();
      const result = optimizeClientPagination(largeBatch, 5, 15);
      const duration = performance.now() - startTime;
      
      // Should return correct page
      expect(result.posts.length).toBe(15);
      expect(result.posts[0].id).toBe('post-60'); // Page 5 starts at index 60
      
      // Should be fast
      expect(duration).toBeLessThan(100); // Under 100ms
      expect(result.duration).toBeLessThan(100);
    });

    test('should meet performance benchmarks (<500ms)', () => {
      const posts = createMockPosts(5000, 0); // Very large dataset
      
      const result = optimizeClientPagination(posts, 10, 15);
      
      // Should still be under 500ms even with 5000 posts
      expect(result.duration).toBeLessThan(500);
      expect(result.posts.length).toBe(15);
      expect(result.posts[0].id).toBe('post-135'); // Page 10 starts at index 135
    });

    test('should handle edge cases (empty data, invalid pages)', () => {
      // Empty data
      const emptyResult = optimizeClientPagination([], 1, 15);
      expect(emptyResult.posts.length).toBe(0);
      expect(emptyResult.duration).toBeLessThan(50);

      // Invalid page (beyond available data)
      const posts = createMockPosts(10, 0);
      const invalidPageResult = optimizeClientPagination(posts, 5, 15);
      expect(invalidPageResult.posts.length).toBe(0);
      expect(invalidPageResult.duration).toBeLessThan(50);

      // Page 1 with small dataset
      const validResult = optimizeClientPagination(posts, 1, 15);
      expect(validResult.posts.length).toBe(10);
      expect(validResult.duration).toBeLessThan(50);
    });

    test('should handle different page sizes efficiently', () => {
      const posts = createMockPosts(100, 0);
      
      // Test different page sizes
      const sizes = [5, 10, 15, 25, 50];
      
      sizes.forEach(pageSize => {
        const result = optimizeClientPagination(posts, 2, pageSize);
        expect(result.posts.length).toBe(Math.min(pageSize, posts.length - pageSize));
        expect(result.duration).toBeLessThan(100);
      });
    });
  });

  describe('Performance Metrics Tracking', () => {
    test('should track performance metrics accurately', async () => {
      const mockRequest = (): Promise<{ data: string }> => 
        Promise.resolve({ data: 'test' });
      
      // Make some requests to generate metrics
      await optimizer.optimizeRequest('metric-test-1', mockRequest);
      await optimizer.optimizeRequest('metric-test-2', mockRequest);
      
      const metrics = optimizer.getMetrics();
      
      expect(metrics.requestCount).toBeGreaterThan(0);
      expect(metrics.serverFetchTime).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.cacheHitRate).toBe('number');
    });

    test('should calculate cache hit rate correctly', async () => {
      const mockRequest = (): Promise<{ data: string }> => 
        Promise.resolve({ data: 'test' });
      
      // First request (cache miss)
      await optimizer.optimizeRequest('hit-rate-test', mockRequest);
      
      // Second request (cache hit)
      await optimizer.optimizeRequest('hit-rate-test', mockRequest);
      
      const metrics = optimizer.getMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
    });

    test('should track error rates correctly', async () => {
      const errorRequest = (): Promise<never> => 
        Promise.reject(new Error('Test error'));
      
      try {
        await optimizer.optimizeRequest('error-test', errorRequest);
      } catch {
        // Expected to fail
      }
      
      const metrics = optimizer.getMetrics();
      expect(metrics.errorRate).toBeGreaterThan(0);
    });

    test('should generate comprehensive performance report', () => {
      const report = optimizer.generatePerformanceReport();
      
      expect(report).toContain('Load More Performance Report');
      expect(report).toContain('Response Times');
      expect(report).toContain('Memory & Caching');
      expect(report).toContain('Network');
      expect(report).toContain('Optimization Status');
    });

    test('should reset metrics correctly', () => {
      // Generate some metrics
      optimizer.optimizeMemoryUsage(createMockPosts(50, 0));
      
      let metrics = optimizer.getMetrics();
      expect(metrics.requestCount).toBeGreaterThanOrEqual(0);
      
      // Reset metrics
      optimizer.resetMetrics();
      
      metrics = optimizer.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });
  });

  describe('Intelligent Batching and Prefetching', () => {
    test('should determine optimal batch sizes based on conditions', () => {
      // Test different scenarios
      const normalBatch = optimizer.optimizeBatchSize(30, 100, 'normal');
      const fastBatch = optimizer.optimizeBatchSize(30, 100, 'fast');
      const slowBatch = optimizer.optimizeBatchSize(30, 100, 'slow');
      
      expect(fastBatch).toBeGreaterThan(normalBatch);
      expect(slowBatch).toBeLessThan(normalBatch);
      
      // Should not exceed available posts
      const limitedBatch = optimizer.optimizeBatchSize(95, 100, 'fast');
      expect(limitedBatch).toBeLessThanOrEqual(5);
    });

    test('should make intelligent prefetching decisions', () => {
      // Should prefetch when user is scrolling fast
      expect(optimizer.shouldPrefetch(2, 10, 1500, 5000)).toBe(true);
      
      // Should prefetch when user has been on page for a while
      expect(optimizer.shouldPrefetch(2, 10, 500, 35000)).toBe(true);
      
      // Should prefetch when near end of content
      expect(optimizer.shouldPrefetch(8, 10, 500, 10000)).toBe(true);
      
      // Should not prefetch in normal conditions
      expect(optimizer.shouldPrefetch(2, 10, 500, 10000)).toBe(false);
      
      // Should not prefetch at end
      expect(optimizer.shouldPrefetch(10, 10, 1500, 35000)).toBe(false);
    });
  });

  describe('Global Performance Functions', () => {
    test('should provide global optimizeRequest function', async () => {
      const mockRequest = (): Promise<{ data: string }> => 
        Promise.resolve({ data: 'global-test' });
      
      const result = await optimizeRequest('global-test-key', mockRequest);
      expect(result.data).toBe('global-test');
    });

    test('should provide global optimizeClientPagination function', () => {
      const posts = createMockPosts(50, 0);
      const result = optimizeClientPagination(posts, 2, 15);
      
      expect(result.posts.length).toBe(15);
      expect(result.posts[0].id).toBe('post-15');
      expect(result.duration).toBeLessThan(100);
    });

    test('should provide global getPerformanceMetrics function', () => {
      const metrics = getPerformanceMetrics();
      
      expect(typeof metrics.requestCount).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
    });
  });
});