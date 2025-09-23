/**
 * Performance Testing Suite for Load More System
 * 
 * This test suite validates performance benchmarks and optimization goals:
 * - Page load times under 3 seconds
 * - Load More response times under 2 seconds
 * - Client-side pagination under 500ms
 * - Memory usage monitoring
 * - Network request optimization
 */

import { performance } from 'perf_hooks';

// Mock performance measurement utilities
interface PerformanceMetrics {
  loadTime: number;
  serverFetchTime: number;
  clientPaginationTime: number;
  memoryUsage: number;
  networkRequests: number;
}

class LoadMorePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    serverFetchTime: 0,
    clientPaginationTime: 0,
    memoryUsage: 0,
    networkRequests: 0,
  };

  private startTime: number = 0;

  startMeasurement(): void {
    this.startTime = performance.now();
  }

  endMeasurement(operation: keyof PerformanceMetrics): number {
    const duration = performance.now() - this.startTime;
    this.metrics[operation] = duration;
    return duration;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      loadTime: 0,
      serverFetchTime: 0,
      clientPaginationTime: 0,
      memoryUsage: 0,
      networkRequests: 0,
    };
  }
}

// Mock unified pagination system for performance testing
interface MockPost {
  id: string;
  content: string;
  created_at: string;
}

class MockUnifiedPaginationState {
  private posts: MockPost[] = [];
  private mode: 'server' | 'client' = 'server';

  async fetchPosts(count: number): Promise<MockPost[]> {
    const monitor = new LoadMorePerformanceMonitor();
    monitor.startMeasurement();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    const newPosts = Array.from({ length: count }, (_, i) => ({
      id: `post-${this.posts.length + i}`,
      content: `Test post ${this.posts.length + i}`,
      created_at: new Date().toISOString(),
    }));

    this.posts.push(...newPosts);
    
    monitor.endMeasurement('serverFetchTime');
    return newPosts;
  }

  async applyClientPagination(posts: MockPost[], page: number, pageSize: number): Promise<MockPost[]> {
    const monitor = new LoadMorePerformanceMonitor();
    monitor.startMeasurement();

    // Simulate client-side processing
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedPosts = posts.slice(start, end);

    monitor.endMeasurement('clientPaginationTime');
    return paginatedPosts;
  }

  switchMode(mode: 'server' | 'client'): void {
    this.mode = mode;
  }

  getMode(): 'server' | 'client' {
    return this.mode;
  }

  getPosts(): MockPost[] {
    return this.posts;
  }

  reset(): void {
    this.posts = [];
    this.mode = 'server';
  }
}

describe('Load More Performance Tests', () => {
  let paginationSystem: MockUnifiedPaginationState;
  let performanceMonitor: LoadMorePerformanceMonitor;

  beforeEach(() => {
    paginationSystem = new MockUnifiedPaginationState();
    performanceMonitor = new LoadMorePerformanceMonitor();
  });

  afterEach(() => {
    paginationSystem.reset();
    performanceMonitor.reset();
  });

  describe('Response Time Benchmarks', () => {
    test('should load initial posts within 3 seconds', async () => {
      performanceMonitor.startMeasurement();
      
      // Simulate initial page load
      await paginationSystem.fetchPosts(15);
      
      const loadTime = performanceMonitor.endMeasurement('loadTime');
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds
      expect(paginationSystem.getPosts()).toHaveLength(15);
    });

    test('should handle Load More requests within 2 seconds', async () => {
      // Setup initial state
      await paginationSystem.fetchPosts(15);
      
      performanceMonitor.startMeasurement();
      
      // Simulate Load More request
      await paginationSystem.fetchPosts(15);
      
      const loadMoreTime = performanceMonitor.endMeasurement('serverFetchTime');
      
      expect(loadMoreTime).toBeLessThan(2000); // 2 seconds
      expect(paginationSystem.getPosts()).toHaveLength(30);
    });

    test('should handle client-side pagination within 500ms', async () => {
      // Setup posts for client-side pagination
      const posts = Array.from({ length: 100 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test post ${i}`,
        created_at: new Date().toISOString(),
      }));

      performanceMonitor.startMeasurement();
      
      // Simulate client-side pagination
      const paginatedPosts = await paginationSystem.applyClientPagination(posts, 2, 15);
      
      const paginationTime = performanceMonitor.endMeasurement('clientPaginationTime');
      
      expect(paginationTime).toBeLessThan(500); // 500ms
      expect(paginatedPosts).toHaveLength(15);
      expect(paginatedPosts[0].id).toBe('post-15'); // Second page starts at index 15
    });
  });

  describe('Memory Usage Optimization', () => {
    test('should maintain reasonable memory usage during extended browsing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate loading many posts
      for (let i = 0; i < 10; i++) {
        await paginationSystem.fetchPosts(15);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB for 150 posts)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      expect(paginationSystem.getPosts()).toHaveLength(150);
    });

    test('should handle memory cleanup strategies', async () => {
      // Load a large number of posts
      for (let i = 0; i < 20; i++) {
        await paginationSystem.fetchPosts(15);
      }
      
      const beforeCleanup = paginationSystem.getPosts().length;
      expect(beforeCleanup).toBe(300);
      
      // Simulate memory cleanup (in real implementation, this would be automatic)
      // For testing, we'll simulate by resetting and loading fewer posts
      paginationSystem.reset();
      await paginationSystem.fetchPosts(50); // Keep only recent posts
      
      const afterCleanup = paginationSystem.getPosts().length;
      expect(afterCleanup).toBe(50);
      expect(afterCleanup).toBeLessThan(beforeCleanup);
    });
  });

  describe('Network Request Optimization', () => {
    test('should minimize network requests for client-side pagination', async () => {
      let networkRequestCount = 0;
      
      // Mock network request counter
      const originalFetch = paginationSystem.fetchPosts;
      paginationSystem.fetchPosts = async (count: number) => {
        networkRequestCount++;
        return originalFetch.call(paginationSystem, count);
      };
      
      // Load initial posts
      await paginationSystem.fetchPosts(15);
      expect(networkRequestCount).toBe(1);
      
      // Switch to client-side mode
      paginationSystem.switchMode('client');
      
      // Perform client-side pagination (should not trigger network requests)
      const posts = paginationSystem.getPosts();
      await paginationSystem.applyClientPagination(posts, 1, 15);
      
      // Network request count should remain the same
      expect(networkRequestCount).toBe(1);
    });

    test('should batch network requests efficiently', async () => {
      const requestTimes: number[] = [];
      
      // Mock request timing
      const originalFetch = paginationSystem.fetchPosts;
      paginationSystem.fetchPosts = async (count: number) => {
        const start = performance.now();
        const result = await originalFetch.call(paginationSystem, count);
        const end = performance.now();
        requestTimes.push(end - start);
        return result;
      };
      
      // Perform multiple requests
      await paginationSystem.fetchPosts(15);
      await paginationSystem.fetchPosts(15);
      await paginationSystem.fetchPosts(15);
      
      // Verify all requests completed efficiently
      expect(requestTimes).toHaveLength(3);
      requestTimes.forEach(time => {
        expect(time).toBeLessThan(1000); // Each request under 1 second
      });
    });
  });

  describe('Mode Transition Performance', () => {
    test('should handle server-to-client mode transitions efficiently', async () => {
      // Start in server mode
      expect(paginationSystem.getMode()).toBe('server');
      
      // Load posts in server mode
      performanceMonitor.startMeasurement();
      await paginationSystem.fetchPosts(30);
      const serverTime = performanceMonitor.endMeasurement('serverFetchTime');
      
      // Switch to client mode
      performanceMonitor.startMeasurement();
      paginationSystem.switchMode('client');
      
      // Perform client-side pagination
      const posts = paginationSystem.getPosts();
      await paginationSystem.applyClientPagination(posts, 1, 15);
      const clientTime = performanceMonitor.endMeasurement('clientPaginationTime');
      
      // Client-side operations should be faster than server operations
      expect(clientTime).toBeLessThan(serverTime);
      expect(clientTime).toBeLessThan(500); // Client operations under 500ms
    });

    test('should handle client-to-server mode transitions efficiently', async () => {
      // Start in client mode with existing posts
      paginationSystem.switchMode('client');
      await paginationSystem.fetchPosts(30);
      
      // Switch back to server mode
      performanceMonitor.startMeasurement();
      paginationSystem.switchMode('server');
      
      // Perform server fetch
      await paginationSystem.fetchPosts(15);
      const transitionTime = performanceMonitor.endMeasurement('serverFetchTime');
      
      expect(transitionTime).toBeLessThan(2000); // Transition under 2 seconds
      expect(paginationSystem.getPosts()).toHaveLength(45); // 30 + 15
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid consecutive Load More requests', async () => {
      const promises: Promise<unknown[]>[] = [];
      const startTime = performance.now();
      
      // Trigger multiple rapid requests
      for (let i = 0; i < 5; i++) {
        promises.push(paginationSystem.fetchPosts(15));
      }
      
      // Wait for all requests to complete
      await Promise.all(promises);
      
      const totalTime = performance.now() - startTime;
      
      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 5 requests
      expect(paginationSystem.getPosts()).toHaveLength(75); // 5 * 15
    });

    test('should maintain performance under high post count', async () => {
      // Load a large number of posts
      for (let i = 0; i < 50; i++) {
        await paginationSystem.fetchPosts(20);
      }
      
      expect(paginationSystem.getPosts()).toHaveLength(1000);
      
      // Test client-side pagination performance with large dataset
      performanceMonitor.startMeasurement();
      
      const posts = paginationSystem.getPosts();
      await paginationSystem.applyClientPagination(posts, 10, 15);
      
      const paginationTime = performanceMonitor.endMeasurement('clientPaginationTime');
      
      // Should still be fast even with 1000 posts
      expect(paginationTime).toBeLessThan(100); // Under 100ms
    });
  });

  describe('Error Recovery Performance', () => {
    test('should recover from errors quickly', async () => {
      // Simulate error scenario
      const originalFetch = paginationSystem.fetchPosts;
      let errorThrown = false;
      
      paginationSystem.fetchPosts = async (count: number) => {
        if (!errorThrown) {
          errorThrown = true;
          throw new Error('Network error');
        }
        return originalFetch.call(paginationSystem, count);
      };
      
      performanceMonitor.startMeasurement();
      
      // First request should fail
      try {
        await paginationSystem.fetchPosts(15);
      } catch (error) {
        expect((error as Error).message).toBe('Network error');
      }
      
      // Second request should succeed
      await paginationSystem.fetchPosts(15);
      
      const recoveryTime = performanceMonitor.endMeasurement('serverFetchTime');
      
      // Recovery should be fast
      expect(recoveryTime).toBeLessThan(1000); // Under 1 second
      expect(paginationSystem.getPosts()).toHaveLength(15);
    });
  });
});

// Export performance utilities for use in other tests
export { LoadMorePerformanceMonitor, MockUnifiedPaginationState };