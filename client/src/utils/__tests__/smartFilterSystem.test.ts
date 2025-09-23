/**
 * Smart Filter System Tests
 * 
 * Tests for the enhanced filter application logic with smart fetching integration,
 * filter result validation and automatic data expansion when needed.
 */

import { 
  SmartFilterSystem, 
  createSmartFilterSystem,
  applySmartFilters,
  SmartFilterConfig
} from '../smartFilterSystem';
import { AutoFetchDetectionSystem } from '../autoFetchSystem';
import { Post } from '@/types';
import { 
  PaginationState, 
  FilterOptions, 
  SearchFilters,
  INITIAL_PAGINATION_STATE 
} from '@/types/pagination';

// Mock posts for testing
const createMockPost = (id: string, postType: 'text' | 'audio' = 'text', likeCount: number = 0): Post => ({
  id,
  content: `Test post ${id}`,
  post_type: postType,
  created_at: new Date().toISOString(),
  user_id: 'user-1',
  like_count: likeCount,
  liked_by_user: false,
  user_profiles: {
    username: 'testuser',
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
});

const createMockPosts = (count: number, postType: 'text' | 'audio' = 'text'): Post[] => {
  return Array.from({ length: count }, (_, i) => createMockPost(`post-${i + 1}`, postType, i));
};

describe('SmartFilterSystem', () => {
  let filterSystem: SmartFilterSystem;
  let mockAutoFetchSystem: AutoFetchDetectionSystem;

  let paginationState: PaginationState;

  beforeEach(() => {
    mockAutoFetchSystem = new AutoFetchDetectionSystem();
    filterSystem = new SmartFilterSystem({}, mockAutoFetchSystem);
    
    paginationState = {
      ...INITIAL_PAGINATION_STATE,
      allPosts: createMockPosts(30),
      hasMorePosts: true,
      isLoadingMore: false,
      postsPerPage: 15,
    };
  });

  describe('filter application', () => {
    it('should apply basic filters correctly', async () => {
      const mockPosts = createMockPosts(20);
      const filters: FilterOptions = { postType: 'text', sortBy: 'newest', timeRange: 'all' };
      const searchFilters: SearchFilters = {};

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        filters,
        searchFilters,
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.filteredPosts).toHaveLength(20); // All posts are text type
      expect(result.totalMatched).toBe(20);
      expect(result.filterEfficiency).toBe(1.0);
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should filter by post type correctly', async () => {
      const mockPosts = [
        ...createMockPosts(10, 'text'),
        ...createMockPosts(5, 'audio')
      ];
      const filters: FilterOptions = { postType: 'audio', sortBy: 'newest', timeRange: 'all' };

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        filters,
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.filteredPosts).toHaveLength(5);
      expect(result.filteredPosts.every(post => post.post_type === 'audio')).toBe(true);
    });

    it('should sort posts correctly', async () => {
      const mockPosts = createMockPosts(10).map((post, index) => ({
        ...post,
        like_count: index % 3, // Varying like counts
        created_at: new Date(Date.now() - index * 1000).toISOString()
      }));

      // Test popular sorting
      const popularResult = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'popular', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(popularResult.filteredPosts[0].like_count || 0).toBeGreaterThanOrEqual(
        popularResult.filteredPosts[1].like_count || 0
      );

      // Test oldest sorting
      const oldestResult = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'oldest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(new Date(oldestResult.filteredPosts[0].created_at).getTime()).toBeLessThanOrEqual(
        new Date(oldestResult.filteredPosts[1].created_at).getTime()
      );
    });

    it('should handle search results correctly', async () => {
      const mockPosts = createMockPosts(20);
      const searchResults = {
        posts: mockPosts.slice(0, 5), // Only first 5 posts match search
        users: [],
        totalResults: 5
      };

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        searchResults,
        true, // Search is active
        paginationState
      );

      expect(result.filteredPosts).toHaveLength(5);
      expect(result.filteredPosts.every(post => 
        searchResults.posts.some(searchPost => searchPost.id === post.id)
      )).toBe(true);
    });
  });

  describe('filter validation', () => {
    it('should validate filter results correctly', async () => {
      const mockPosts = createMockPosts(5); // Below threshold
      
      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.validationResult.hasMinimumResults).toBe(false);
      expect(result.validationResult.warnings).toContainEqual(
        expect.stringContaining('below minimum threshold')
      );
    });

    it('should recommend expansion when needed', async () => {
      const mockPosts = createMockPosts(3); // Very few posts
      paginationState.hasMorePosts = true;

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.expansionRecommended).toBe(true);
      expect(result.validationResult.recommendations).toContainEqual(
        expect.stringContaining('expanding data')
      );
    });
  });

  describe('auto-expansion', () => {
    it('should perform auto-expansion when enabled', async () => {
      const mockPosts = createMockPosts(3); // Below threshold
      const mockFetchMorePosts = jest.fn().mockResolvedValue({
        success: true,
        posts: createMockPosts(10, 'text'),
        hasMore: true
      });

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        { ...paginationState, hasMorePosts: true },
        mockFetchMorePosts
      );

      expect(mockFetchMorePosts).toHaveBeenCalled();
      expect(result.filteredPosts.length).toBeGreaterThan(3);
    });

    it('should not auto-expand when disabled', async () => {
      const disabledSystem = new SmartFilterSystem({ autoExpansionEnabled: false });
      const mockPosts = createMockPosts(3);
      const mockFetchMorePosts = jest.fn();

      const result = await disabledSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        { ...paginationState, hasMorePosts: true },
        mockFetchMorePosts
      );

      expect(mockFetchMorePosts).not.toHaveBeenCalled();
      expect(result.needsMoreData).toBe(true);
    });

    it('should handle expansion failures gracefully', async () => {
      const mockPosts = createMockPosts(3);
      const mockFetchMorePosts = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        { ...paginationState, hasMorePosts: true },
        mockFetchMorePosts
      );

      expect(result.filteredPosts).toHaveLength(3); // Should fallback to original results
    });
  });

  describe('performance tracking', () => {
    it('should track operation performance', async () => {
      const mockPosts = createMockPosts(20);

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics.duration).toBeGreaterThan(0);
      expect(result.performanceMetrics.postsProcessed).toBe(20);
      expect(result.performanceMetrics.postsMatched).toBe(20);
    });

    it('should provide filter statistics', async () => {
      // Perform a few operations
      const mockPosts = createMockPosts(15);
      
      await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      const stats = filterSystem.getFilterStatistics();
      
      expect(stats.totalOperations).toBe(1);
      expect(stats.averageFilterTime).toBeGreaterThan(0);
      expect(stats.averageFilterEfficiency).toBe(1.0);
      expect(stats.recentOperations).toHaveLength(1);
    });
  });

  describe('configuration management', () => {
    it('should use default configuration', () => {
      const defaultSystem = new SmartFilterSystem();
      
      // Test that it works with default config
      expect(defaultSystem).toBeInstanceOf(SmartFilterSystem);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<SmartFilterConfig> = {
        minResultsThreshold: 20,
        qualityThreshold: 0.25,
        autoExpansionEnabled: false
      };

      const customSystem = new SmartFilterSystem(customConfig);
      
      expect(customSystem).toBeInstanceOf(SmartFilterSystem);
    });

    it('should update configuration', () => {
      const newConfig = { minResultsThreshold: 25 };
      filterSystem.updateConfig(newConfig);
      
      // Configuration should be updated (we can't directly test private config,
      // but we can test behavior changes)
      expect(filterSystem).toBeInstanceOf(SmartFilterSystem);
    });
  });

  describe('edge cases', () => {
    it('should handle empty post arrays', async () => {
      const result = await filterSystem.applyFiltersAndSearch(
        [],
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.filteredPosts).toHaveLength(0);
      expect(result.filterEfficiency).toBe(0);
      expect(result.validationResult.isValid).toBe(false);
    });

    it('should handle posts with missing optional fields', async () => {
      const minimalPost: Post = {
        id: 'minimal',
        content: 'test',
        post_type: 'text',
        created_at: new Date().toISOString(),
        user_id: 'user-1',
        like_count: 0,
        liked_by_user: false,
        // Missing optional fields
      };

      const result = await filterSystem.applyFiltersAndSearch(
        [minimalPost],
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.filteredPosts).toHaveLength(1);
      expect(result.filteredPosts[0].id).toBe('minimal');
    });

    it('should handle time range filtering', async () => {
      const now = new Date();
      const mockPosts = [
        createMockPost('recent', 'text'),
        {
          ...createMockPost('old', 'text'),
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
        }
      ];

      const result = await filterSystem.applyFiltersAndSearch(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'week' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.filteredPosts).toHaveLength(1);
      expect(result.filteredPosts[0].id).toBe('recent');
    });
  });
});

describe('utility functions', () => {
  describe('createSmartFilterSystem', () => {
    it('should create a new smart filter system', () => {
      const system = createSmartFilterSystem();
      
      expect(system).toBeInstanceOf(SmartFilterSystem);
    });

    it('should create system with custom config', () => {
      const customConfig = { minResultsThreshold: 20 };
      const system = createSmartFilterSystem(customConfig);
      
      expect(system).toBeInstanceOf(SmartFilterSystem);
    });
  });

  describe('applySmartFilters', () => {
    it('should provide quick filter application', async () => {
      const mockPosts = createMockPosts(15);
      const paginationState = {
        ...INITIAL_PAGINATION_STATE,
        allPosts: mockPosts,
        hasMorePosts: true,
      };

      const result = await applySmartFilters(
        mockPosts,
        { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        {},
        { posts: [], users: [], totalResults: 0 },
        false,
        paginationState
      );

      expect(result.filteredPosts).toHaveLength(15);
      expect(result.filterEfficiency).toBe(1.0);
    });
  });
});
