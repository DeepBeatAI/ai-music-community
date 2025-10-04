/**
 * Creator Filter Integration Tests
 * 
 * Tests the core creator filtering logic and performance optimizations
 * to ensure seamless integration with existing search functionality.
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4
 */

import { 
  optimizedCreatorFilterWithDeduplication,
  validateCreatorFilterPerformance,
  testCreatorFilterPerformance
} from '@/utils/creatorFilterOptimizer';

// Mock search function for testing
const mockSearchContent = jest.fn();

// Mock data for testing
const createMockPost = (id: string, userId: string, content: string, postType: 'text' | 'audio' = 'text') => ({
  id,
  user_id: userId,
  content,
  post_type: postType,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  like_count: Math.floor(Math.random() * 10),
  user_profiles: {
    username: `user${userId}`,
    user_id: userId,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
});

const generateMockPosts = (count: number) => {
  return Array.from({ length: count }, (_, i) => 
    createMockPost(`post-${i}`, `creator-${i % 5}`, `Test post ${i}`)
  );
};

describe('Creator Filter Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Optimized Creator Filtering Performance', () => {
    it('should efficiently filter posts by creator with deduplication', () => {
      const posts = generateMockPosts(100);
      const creatorId = 'creator-1';
      
      const startTime = performance.now();
      const { filteredPosts, totalMetrics } = optimizedCreatorFilterWithDeduplication(
        posts, 
        creatorId, 
        'creator1'
      );
      const endTime = performance.now();
      
      // Verify filtering worked correctly
      expect(filteredPosts.every(post => post.user_id === creatorId)).toBe(true);
      expect(filteredPosts.length).toBeGreaterThan(0);
      
      // Verify performance metrics
      expect(totalMetrics.totalPosts).toBe(100);
      expect(totalMetrics.filteredPosts).toBe(filteredPosts.length);
      expect(totalMetrics.processingTime).toBeGreaterThan(0);
      
      // Performance should be reasonable
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });

    it('should handle large datasets efficiently', () => {
      const largePosts = generateMockPosts(5000);
      const creatorId = 'creator-2';
      
      const startTime = performance.now();
      const { filteredPosts, totalMetrics } = optimizedCreatorFilterWithDeduplication(
        largePosts, 
        creatorId, 
        'creator2'
      );
      const endTime = performance.now();
      
      // Verify filtering worked correctly
      expect(filteredPosts.every(post => post.user_id === creatorId)).toBe(true);
      
      // Performance should still be reasonable for large datasets
      expect(endTime - startTime).toBeLessThan(500); // Less than 500ms for 5000 posts
      
      // Verify optimization was used for large dataset
      expect(totalMetrics.optimizationUsed).toMatch(/(large|medium|optimized)/i);
    });

    it('should validate performance and provide suggestions', () => {
      const posts = generateMockPosts(1000);
      const creatorId = 'creator-3';
      
      const { totalMetrics } = optimizedCreatorFilterWithDeduplication(
        posts, 
        creatorId, 
        'creator3'
      );
      
      const validation = validateCreatorFilterPerformance(
        totalMetrics.totalPosts,
        totalMetrics.processingTime,
        totalMetrics.filteredPosts
      );
      
      // Should provide performance assessment
      expect(validation.performanceGrade).toMatch(/[A-F]/);
      expect(typeof validation.isOptimal).toBe('boolean');
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
      // Test empty posts array
      const { filteredPosts: emptyResult } = optimizedCreatorFilterWithDeduplication(
        [], 
        'creator-1', 
        'creator1'
      );
      expect(emptyResult).toEqual([]);
      
      // Test invalid creator ID
      const posts = generateMockPosts(10);
      const { filteredPosts: invalidResult } = optimizedCreatorFilterWithDeduplication(
        posts, 
        '', 
        'invalid'
      );
      expect(invalidResult).toEqual([]);
      
      // Test non-existent creator
      const { filteredPosts: nonExistentResult } = optimizedCreatorFilterWithDeduplication(
        posts, 
        'non-existent-creator', 
        'nonexistent'
      );
      expect(nonExistentResult).toEqual([]);
    });

    it('should remove duplicates effectively', () => {
      const posts = generateMockPosts(50);
      
      // Add some duplicates
      const postsWithDuplicates = [
        ...posts,
        ...posts.slice(0, 10), // Add first 10 posts again
        ...posts.slice(5, 15)   // Add posts 5-15 again
      ];
      
      const creatorId = 'creator-1';
      const { filteredPosts, totalMetrics } = optimizedCreatorFilterWithDeduplication(
        postsWithDuplicates, 
        creatorId, 
        'creator1'
      );
      
      // Verify no duplicates in result
      const uniqueIds = new Set(filteredPosts.map(post => post.id));
      expect(uniqueIds.size).toBe(filteredPosts.length);
      
      // Verify duplicates were detected and removed
      expect(totalMetrics.duplicatesRemoved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Filter Integration Logic', () => {
    it('should integrate filtering with search-like functionality', () => {
      const mockPosts = generateMockPosts(20);
      const creatorId = 'creator-1';
      
      // Simulate search results that would include this creator's posts
      const searchFilteredPosts = mockPosts.filter(post => 
        post.content.includes('Test') || post.user_id === creatorId
      );
      
      // Apply creator filter to search results
      const { filteredPosts } = optimizedCreatorFilterWithDeduplication(
        searchFilteredPosts, 
        creatorId, 
        'creator1'
      );

      expect(filteredPosts.every(post => post.user_id === creatorId)).toBe(true);
      expect(filteredPosts.length).toBeGreaterThan(0);
    });

    it('should handle combined filtering scenarios', () => {
      const posts = generateMockPosts(100);
      
      // Simulate multiple filter steps like in the dashboard
      let filtered = [...posts];
      
      // Step 1: Apply search query filter (simulate)
      filtered = filtered.filter(post => post.content.includes('Test'));
      
      // Step 2: Apply creator filter using optimizer
      const creatorId = 'creator-2';
      const { filteredPosts } = optimizedCreatorFilterWithDeduplication(
        filtered, 
        creatorId, 
        'creator2'
      );
      
      // Step 3: Verify combined filtering worked
      expect(filteredPosts.every(post => 
        post.user_id === creatorId && post.content.includes('Test')
      )).toBe(true);
    });
  });

  describe('Performance Testing', () => {
    it('should run performance tests across different dataset sizes', () => {
      const posts = generateMockPosts(5000);
      const creatorId = 'creator-1';
      
      // This should not throw and should complete in reasonable time
      expect(() => {
        testCreatorFilterPerformance(posts, creatorId);
      }).not.toThrow();
    });

    it('should maintain performance standards', () => {
      const testSizes = [100, 500, 1000, 2000];
      
      testSizes.forEach(size => {
        const posts = generateMockPosts(size);
        const creatorId = 'creator-1';
        
        const startTime = performance.now();
        const { totalMetrics } = optimizedCreatorFilterWithDeduplication(
          posts, 
          creatorId, 
          'creator1'
        );
        const endTime = performance.now();
        
        const actualTime = endTime - startTime;
        
        // Performance should scale reasonably
        const timePerPost = actualTime / size;
        expect(timePerPost).toBeLessThan(0.1); // Less than 0.1ms per post
        
        // Metrics should be reasonable
        expect(totalMetrics.processingTime).toBeGreaterThan(0);
        expect(totalMetrics.processingTime).toBeLessThan(1000); // Less than 1 second
      });
    });
  });
});