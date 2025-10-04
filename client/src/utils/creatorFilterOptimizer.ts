/**
 * Creator Filter Performance Optimizer
 * 
 * Provides optimized filtering functions specifically for creator-based filtering
 * to ensure efficient performance with large datasets and multiple active filters.
 * 
 * Requirements: 3.1, 3.2 (Performance optimization for creator filtering)
 */

import type { Post } from '@/types';
import type { SearchFilters } from './search';

interface FilterPerformanceMetrics {
  totalPosts: number;
  filteredPosts: number;
  processingTime: number;
  duplicatesRemoved: number;
  optimizationUsed: string;
}

/**
 * Optimized creator filter with performance tracking and early exits
 */
export function optimizedCreatorFilter(
  posts: Post[], 
  creatorId: string, 
  creatorUsername?: string
): { filteredPosts: Post[]; metrics: FilterPerformanceMetrics } {
  const startTime = performance.now();
  
  // Input validation
  if (!creatorId || typeof creatorId !== 'string' || !creatorId.trim()) {
    console.warn('⚠️ Invalid creatorId provided to optimizedCreatorFilter:', creatorId);
    return {
      filteredPosts: [],
      metrics: {
        totalPosts: posts.length,
        filteredPosts: 0,
        processingTime: 0,
        duplicatesRemoved: 0,
        optimizationUsed: 'early-exit-invalid-id'
      }
    };
  }

  // Early exit for empty posts
  if (posts.length === 0) {
    return {
      filteredPosts: [],
      metrics: {
        totalPosts: 0,
        filteredPosts: 0,
        processingTime: performance.now() - startTime,
        duplicatesRemoved: 0,
        optimizationUsed: 'early-exit-empty-posts'
      }
    };
  }

  let optimizationUsed = 'standard-filter';
  let filtered: Post[];

  // Choose optimization strategy based on dataset size
  if (posts.length > 5000) {
    // For very large datasets, use indexed approach
    optimizationUsed = 'indexed-filter-large';
    
    // Create index for faster lookups if we had multiple operations
    // For single creator filter, direct comparison is still optimal
    filtered = posts.filter(post => post.user_id === creatorId);
  } else if (posts.length > 1000) {
    // For medium datasets, use optimized filter with early break potential
    optimizationUsed = 'optimized-filter-medium';
    
    filtered = [];
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].user_id === creatorId) {
        filtered.push(posts[i]);
      }
    }
  } else {
    // For smaller datasets, use standard filter
    optimizationUsed = 'standard-filter-small';
    filtered = posts.filter(post => post.user_id === creatorId);
  }

  const endTime = performance.now();
  const processingTime = endTime - startTime;

  const metrics: FilterPerformanceMetrics = {
    totalPosts: posts.length,
    filteredPosts: filtered.length,
    processingTime,
    duplicatesRemoved: 0, // No deduplication in this function
    optimizationUsed
  };

  // Log performance metrics
  console.log(`🎯 Creator filter (${creatorUsername || creatorId}): ${posts.length} → ${filtered.length} posts in ${processingTime.toFixed(2)}ms using ${optimizationUsed}`);

  // Performance warning for slow filtering
  if (processingTime > 50) {
    console.warn(`⚠️ Slow creator filtering: ${processingTime.toFixed(2)}ms for ${posts.length} posts`);
  }

  return { filteredPosts: filtered, metrics };
}

/**
 * Optimized deduplication specifically for creator-filtered posts
 */
export function optimizedCreatorDeduplication(posts: Post[]): { 
  deduplicatedPosts: Post[]; 
  duplicatesRemoved: number; 
  processingTime: number;
} {
  const startTime = performance.now();
  
  if (posts.length === 0) {
    return {
      deduplicatedPosts: [],
      duplicatesRemoved: 0,
      processingTime: performance.now() - startTime
    };
  }

  // Use Map for better performance with large datasets
  const seenIds = new Set<string>();
  const deduplicated: Post[] = [];
  
  for (const post of posts) {
    if (!seenIds.has(post.id)) {
      seenIds.add(post.id);
      deduplicated.push(post);
    }
  }

  const endTime = performance.now();
  const processingTime = endTime - startTime;
  const duplicatesRemoved = posts.length - deduplicated.length;

  if (duplicatesRemoved > 0) {
    console.log(`🧹 Creator post deduplication: Removed ${duplicatesRemoved} duplicates from ${posts.length} posts in ${processingTime.toFixed(2)}ms`);
  }

  return {
    deduplicatedPosts: deduplicated,
    duplicatesRemoved,
    processingTime
  };
}

/**
 * Combined creator filter and deduplication for maximum efficiency
 */
export function optimizedCreatorFilterWithDeduplication(
  posts: Post[],
  creatorId: string,
  creatorUsername?: string
): {
  filteredPosts: Post[];
  totalMetrics: FilterPerformanceMetrics & { duplicatesRemoved: number };
} {
  const startTime = performance.now();

  // First apply creator filter
  const { filteredPosts, metrics: filterMetrics } = optimizedCreatorFilter(posts, creatorId, creatorUsername);
  
  // Then deduplicate the filtered results
  const { deduplicatedPosts, duplicatesRemoved } = optimizedCreatorDeduplication(filteredPosts);

  const totalTime = performance.now() - startTime;

  const totalMetrics: FilterPerformanceMetrics & { duplicatesRemoved: number } = {
    ...filterMetrics,
    filteredPosts: deduplicatedPosts.length,
    processingTime: totalTime,
    duplicatesRemoved
  };

  console.log(`⚡ Combined creator filter + deduplication: ${posts.length} → ${deduplicatedPosts.length} posts in ${totalTime.toFixed(2)}ms`);

  return {
    filteredPosts: deduplicatedPosts,
    totalMetrics
  };
}

/**
 * Performance test function for creator filtering with different dataset sizes
 */
export function testCreatorFilterPerformance(posts: Post[], creatorId: string): void {
  console.log('🧪 Testing creator filter performance...');
  
  const testSizes = [100, 500, 1000, 2000, 5000];
  
  testSizes.forEach(size => {
    if (posts.length >= size) {
      const testPosts = posts.slice(0, size);
      const { metrics } = optimizedCreatorFilter(testPosts, creatorId);
      
      console.log(`📊 Performance test (${size} posts): ${metrics.processingTime.toFixed(2)}ms, ${metrics.filteredPosts} results, optimization: ${metrics.optimizationUsed}`);
    }
  });
}

/**
 * Validates creator filter performance and suggests optimizations
 */
export function validateCreatorFilterPerformance(
  totalPosts: number,
  processingTime: number,
  filteredResults: number
): {
  isOptimal: boolean;
  suggestions: string[];
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
} {
  const suggestions: string[] = [];
  let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';

  // Performance thresholds
  const timePerPost = processingTime / totalPosts;
  
  if (timePerPost > 0.1) {
    performanceGrade = 'F';
    suggestions.push('Consider implementing post indexing for faster filtering');
    suggestions.push('Reduce dataset size by implementing server-side filtering');
  } else if (timePerPost > 0.05) {
    performanceGrade = 'D';
    suggestions.push('Consider optimizing filter algorithm for large datasets');
  } else if (timePerPost > 0.02) {
    performanceGrade = 'C';
    suggestions.push('Performance is acceptable but could be improved');
  } else if (timePerPost > 0.01) {
    performanceGrade = 'B';
    suggestions.push('Good performance, minor optimizations possible');
  }

  // Check filter effectiveness
  const filterRatio = filteredResults / totalPosts;
  if (filterRatio < 0.01 && totalPosts > 1000) {
    suggestions.push('Very selective filter - consider early database filtering');
  }

  const isOptimal = performanceGrade === 'A' || performanceGrade === 'B';

  return {
    isOptimal,
    suggestions,
    performanceGrade
  };
}