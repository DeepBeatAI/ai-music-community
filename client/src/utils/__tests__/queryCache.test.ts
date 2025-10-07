/**
 * Query Cache Tests
 * 
 * Tests for the QueryCache utility class to ensure proper caching behavior,
 * TTL expiration, and cache invalidation.
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

  describe('Basic Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { id: 1, name: 'Test' };
      cache.set('test-key', testData);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should overwrite existing data', () => {
      cache.set('test-key', { value: 1 });
      cache.set('test-key', { value: 2 });
      
      const result = cache.get('test-key');
      expect(result).toEqual({ value: 2 });
    });
  });

  describe('TTL Expiration', () => {
    it('should return null for expired entries', async () => {
      const testData = { id: 1, name: 'Test' };
      cache.set('test-key', testData, 100); // 100ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should return data before expiration', async () => {
      const testData = { id: 1, name: 'Test' };
      cache.set('test-key', testData, 200); // 200ms TTL
      
      // Wait but not long enough to expire
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = cache.get('test-key');
      expect(result).toEqual(testData);
    });

    it('should use default TTL of 5 minutes', () => {
      const testData = { id: 1, name: 'Test' };
      cache.set('test-key', testData); // No TTL specified
      
      const result = cache.get('test-key');
      expect(result).toEqual(testData);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific key', () => {
      cache.set('test-key-1', { value: 1 });
      cache.set('test-key-2', { value: 2 });
      
      cache.invalidate('test-key-1');
      
      expect(cache.get('test-key-1')).toBeNull();
      expect(cache.get('test-key-2')).toEqual({ value: 2 });
    });

    it('should invalidate keys matching pattern', () => {
      cache.set('comments-post-1', { data: 'post1' });
      cache.set('comments-post-2', { data: 'post2' });
      cache.set('users-list', { data: 'users' });
      
      cache.invalidatePattern('comments-post');
      
      expect(cache.get('comments-post-1')).toBeNull();
      expect(cache.get('comments-post-2')).toBeNull();
      expect(cache.get('users-list')).toEqual({ data: 'users' });
    });

    it('should clear all cache entries', () => {
      cache.set('key-1', { value: 1 });
      cache.set('key-2', { value: 2 });
      cache.set('key-3', { value: 3 });
      
      cache.clear();
      
      expect(cache.get('key-1')).toBeNull();
      expect(cache.get('key-2')).toBeNull();
      expect(cache.get('key-3')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache size', () => {
      cache.set('key-1', { value: 1 });
      cache.set('key-2', { value: 2 });
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should return list of cache keys', () => {
      cache.set('key-1', { value: 1 });
      cache.set('key-2', { value: 2 });
      
      const stats = cache.getStats();
      expect(stats.entries).toContain('key-1');
      expect(stats.entries).toContain('key-2');
    });

    it('should check if key exists', () => {
      cache.set('test-key', { value: 1 });
      
      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should handle different data types', () => {
      // String
      cache.set('string-key', 'test string');
      expect(cache.get<string>('string-key')).toBe('test string');
      
      // Number
      cache.set('number-key', 42);
      expect(cache.get<number>('number-key')).toBe(42);
      
      // Array
      cache.set('array-key', [1, 2, 3]);
      expect(cache.get<number[]>('array-key')).toEqual([1, 2, 3]);
      
      // Object
      cache.set('object-key', { id: 1, name: 'Test' });
      expect(cache.get<{ id: number; name: string }>('object-key')).toEqual({ id: 1, name: 'Test' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      cache.set('null-key', null);
      cache.set('undefined-key', undefined);
      
      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
    });

    it('should handle empty strings and arrays', () => {
      cache.set('empty-string', '');
      cache.set('empty-array', []);
      
      expect(cache.get('empty-string')).toBe('');
      expect(cache.get('empty-array')).toEqual([]);
    });

    it('should handle large data sets', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
      cache.set('large-data', largeArray);
      
      const retrieved = cache.get<typeof largeArray>('large-data');
      expect(retrieved).toHaveLength(1000);
      expect(retrieved?.[0]).toEqual({ id: 0, value: 'item-0' });
    });
  });
});
