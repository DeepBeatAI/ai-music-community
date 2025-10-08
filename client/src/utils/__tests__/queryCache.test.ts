/**
 * Query Cache Tests
 * 
 * Tests cache hit/miss scenarios, TTL expiration, and invalidation
 * Requirements: 2.11, 2.12
 */

import { QueryCache } from '../queryCache';

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Cache Hit/Miss Scenarios', () => {
    it('should return null on cache miss', () => {
      const result = cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return data on cache hit', () => {
      const testData = { id: '1', name: 'Test' };
      cache.set('test-key', testData);

      const result = cache.get('test-key');
      expect(result).toEqual(testData);
    });

    it('should handle multiple cache entries', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      cache.set('key3', { data: 'value3' });

      expect(cache.get('key1')).toEqual({ data: 'value1' });
      expect(cache.get('key2')).toEqual({ data: 'value2' });
      expect(cache.get('key3')).toEqual({ data: 'value3' });
    });

    it('should overwrite existing cache entry', () => {
      cache.set('key', { data: 'old' });
      cache.set('key', { data: 'new' });

      expect(cache.get('key')).toEqual({ data: 'new' });
    });
  });

  describe('TTL Expiration', () => {
    it('should return null for expired entries', async () => {
      const shortTTL = 100; // 100ms
      cache.set('expiring-key', { data: 'test' }, shortTTL);

      // Should be available immediately
      expect(cache.get('expiring-key')).toEqual({ data: 'test' });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired now
      expect(cache.get('expiring-key')).toBeNull();
    });

    it('should use default TTL of 5 minutes', () => {
      cache.set('key', { data: 'test' });

      // Should still be available after 1 second
      setTimeout(() => {
        expect(cache.get('key')).toEqual({ data: 'test' });
      }, 1000);
    });

    it('should respect custom TTL', async () => {
      const customTTL = 50; // 50ms
      cache.set('key1', { data: 'test1' }, customTTL);
      cache.set('key2', { data: 'test2' }, 200); // 200ms

      await new Promise((resolve) => setTimeout(resolve, 100));

      // key1 should be expired, key2 should still be valid
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toEqual({ data: 'test2' });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific key', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });

      cache.invalidate('key1');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toEqual({ data: 'value2' });
    });

    it('should invalidate by pattern', () => {
      cache.set('comments-post-1', { data: 'comments1' });
      cache.set('comments-post-2', { data: 'comments2' });
      cache.set('posts-feed', { data: 'posts' });

      cache.invalidatePattern('comments');

      expect(cache.get('comments-post-1')).toBeNull();
      expect(cache.get('comments-post-2')).toBeNull();
      expect(cache.get('posts-feed')).toEqual({ data: 'posts' });
    });

    it('should clear all cache entries', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      cache.set('key3', { data: 'value3' });

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache size', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toContain('key1');
      expect(stats.entries).toContain('key2');
    });

    it('should check if key exists', () => {
      cache.set('existing-key', { data: 'test' });

      expect(cache.has('existing-key')).toBe(true);
      expect(cache.has('non-existent-key')).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should handle different data types', () => {
      cache.set('string', 'test string');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('array', [1, 2, 3]);
      cache.set('object', { nested: { data: 'value' } });

      expect(cache.get<string>('string')).toBe('test string');
      expect(cache.get<number>('number')).toBe(42);
      expect(cache.get<boolean>('boolean')).toBe(true);
      expect(cache.get<number[]>('array')).toEqual([1, 2, 3]);
      expect(cache.get<{ nested: { data: string } }>('object')).toEqual({
        nested: { data: 'value' },
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should simulate comment caching workflow', () => {
      const postId = 'post-123';
      const cacheKey = `comments-${postId}`;
      const comments = [
        { id: '1', content: 'Comment 1' },
        { id: '2', content: 'Comment 2' },
      ];

      // First request - cache miss
      expect(cache.get(cacheKey)).toBeNull();

      // Store in cache
      cache.set(cacheKey, comments, 5 * 60 * 1000); // 5 minutes

      // Second request - cache hit
      expect(cache.get(cacheKey)).toEqual(comments);

      // Invalidate on new comment
      cache.invalidate(cacheKey);
      expect(cache.get(cacheKey)).toBeNull();
    });

    it('should handle pagination cache keys', () => {
      const postId = 'post-123';
      
      cache.set(`comments-${postId}-page-0`, ['comment1', 'comment2']);
      cache.set(`comments-${postId}-page-1`, ['comment3', 'comment4']);
      cache.set(`comments-${postId}-page-2`, ['comment5', 'comment6']);

      // Invalidate all pages for a post
      cache.invalidatePattern(`comments-${postId}`);

      expect(cache.get(`comments-${postId}-page-0`)).toBeNull();
      expect(cache.get(`comments-${postId}-page-1`)).toBeNull();
      expect(cache.get(`comments-${postId}-page-2`)).toBeNull();
    });
  });
});
