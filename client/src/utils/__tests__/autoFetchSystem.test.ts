/**
 * Auto-Fetch System Tests
 *
 * Tests for the smart auto-fetch detection and triggering logic
 * including performance monitoring and timeout handling.
 */

import {
  AutoFetchDetectionSystem,
  createAutoFetchSystem,
  shouldAutoFetch,
  DEFAULT_AUTO_FETCH_CONFIG,
} from "../autoFetchSystem";
import {
  PaginationState,
  ModeDetectionContext,
  INITIAL_PAGINATION_STATE,
} from "@/types/pagination";
import { Post } from "@/types";

// Mock posts for testing
const createMockPost = (
  id: string,
  postType: "text" | "audio" = "text"
): Post => ({
  id,
  content: `Test post ${id}`,
  post_type: postType,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "user-1",
  like_count: 0,
  liked_by_user: false,
  user_profiles: {
    username: "testuser",
    user_id: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
});

const createMockPosts = (
  count: number,
  postType: "text" | "audio" = "text"
): Post[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockPost(`post-${i + 1}`, postType)
  );
};

describe("AutoFetchDetectionSystem", () => {
  let system: AutoFetchDetectionSystem;
  let paginationState: PaginationState;
  let context: ModeDetectionContext;

  beforeEach(() => {
    system = new AutoFetchDetectionSystem();
    paginationState = {
      ...INITIAL_PAGINATION_STATE,
      allPosts: createMockPosts(30),
      hasMorePosts: true,
      isLoadingMore: false,
    };

    context = {
      isSearchActive: false,
      hasFiltersApplied: true,
      searchFiltersActive: false,
      totalLoadedPosts: 30,
      totalFilteredPosts: 5, // Low filtered count to trigger auto-fetch
      currentPage: 1,
    };
  });

  describe("shouldAutoFetch", () => {
    it("should detect when auto-fetch is needed for insufficient filtered results", () => {
      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.shouldAutoFetch).toBe(true);
      expect(result.reason).toContain("Insufficient filtered results");
      expect(result.targetFetchCount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata.currentFilteredCount).toBe(5);
    });

    it("should not auto-fetch when sufficient filtered results exist", () => {
      context.totalFilteredPosts = 15; // Above threshold

      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.shouldAutoFetch).toBe(false);
      expect(result.reason).toContain("Sufficient filtered results available");
    });

    it("should not auto-fetch when no filters are applied", () => {
      context.hasFiltersApplied = false;
      context.isSearchActive = false;
      context.searchFiltersActive = false;

      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.shouldAutoFetch).toBe(false);
      expect(result.reason).toContain("Basic requirements not met");
    });

    it("should not auto-fetch when no more posts available on server", () => {
      paginationState.hasMorePosts = false;

      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.shouldAutoFetch).toBe(false);
      expect(result.reason).toContain("Basic requirements not met");
    });

    it("should not auto-fetch when already loading", () => {
      paginationState.isLoadingMore = true;

      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.shouldAutoFetch).toBe(false);
      expect(result.reason).toContain("Basic requirements not met");
    });

    it("should calculate appropriate target fetch count", () => {
      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.targetFetchCount).toBeGreaterThan(0);
      expect(result.targetFetchCount).toBeLessThanOrEqual(
        DEFAULT_AUTO_FETCH_CONFIG.maxAutoFetchPosts
      );
    });

    it("should provide filter efficiency metadata", () => {
      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.metadata.filterEfficiency).toBeGreaterThan(0);
      expect(result.metadata.filterEfficiency).toBeLessThanOrEqual(1);
      expect(result.metadata.totalLoadedCount).toBe(30);
      expect(result.metadata.currentFilteredCount).toBe(5);
    });
  });

  describe("fetchAdditionalPosts", () => {
    const mockFetchFunction = jest.fn();

    beforeEach(() => {
      mockFetchFunction.mockClear();
    });

    it("should successfully fetch additional posts", async () => {
      const mockPosts = createMockPosts(20);
      mockFetchFunction.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
      });

      const result = await system.fetchAdditionalPosts(
        20,
        paginationState,
        mockFetchFunction
      );

      expect(result.success).toBe(true);
      expect(result.newPosts).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(mockFetchFunction).toHaveBeenCalledWith(
        3,
        20,
        expect.any(AbortSignal)
      );
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetchFunction.mockRejectedValue(new Error("Network error"));

      const result = await system.fetchAdditionalPosts(
        20,
        paginationState,
        mockFetchFunction
      );

      expect(result.success).toBe(false);
      expect(result.newPosts).toHaveLength(0);
      expect(result.error).toContain("Network error");
      expect(result.performanceMetrics).toBeDefined();
    });

    it("should handle timeout correctly", async () => {
      // Create system with short timeout
      const shortTimeoutSystem = new AutoFetchDetectionSystem({
        timeoutMs: 100,
      });

      mockFetchFunction.mockImplementation(
        (_page: number, _limit: number, signal: AbortSignal) =>
          new Promise((resolve, reject) => {
            const timeoutId = setTimeout(
              () => resolve({ posts: [], hasMore: false }),
              200
            );

            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              const error = new Error("AbortError");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const result = await shortTimeoutSystem.fetchAdditionalPosts(
        20,
        paginationState,
        mockFetchFunction
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should retry on failure", async () => {
      const shortRetrySystem = new AutoFetchDetectionSystem({
        retryAttempts: 2,
        retryDelayMs: 10,
      });

      mockFetchFunction
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue({ posts: createMockPosts(10), hasMore: true });

      const result = await shortRetrySystem.fetchAdditionalPosts(
        20,
        paginationState,
        mockFetchFunction
      );

      expect(result.success).toBe(true);
      expect(mockFetchFunction).toHaveBeenCalledTimes(3);
    });

    it("should not retry on abort error", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      mockFetchFunction.mockRejectedValue(abortError);

      const result = await system.fetchAdditionalPosts(
        20,
        paginationState,
        mockFetchFunction
      );

      expect(result.success).toBe(false);
      expect(mockFetchFunction).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe("session management", () => {
    it("should track total auto-fetched posts", async () => {
      const mockFetchFunction = jest.fn().mockResolvedValue({
        posts: createMockPosts(20),
        hasMore: true,
      });

      await system.fetchAdditionalPosts(20, paginationState, mockFetchFunction);

      const stats = system.getStatistics();
      expect(stats.totalAutoFetched).toBe(20);
    });

    it("should respect session auto-fetch limits", () => {
      const limitedSystem = new AutoFetchDetectionSystem({
        maxTotalAutoFetched: 50,
      });

      // Simulate having already fetched 50 posts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (limitedSystem as any).totalAutoFetched = 50;

      const result = limitedSystem.shouldAutoFetch(paginationState, context);

      expect(result.shouldAutoFetch).toBe(false);
      expect(result.reason).toContain("Session auto-fetch limit reached");
    });

    it("should reset session statistics", () => {
      // Access private property for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (system as any).totalAutoFetched = 50;

      system.resetSession();

      const stats = system.getStatistics();
      expect(stats.totalAutoFetched).toBe(0);
    });
  });

  describe("performance monitoring", () => {
    it("should provide performance statistics", () => {
      const stats = system.getStatistics();

      expect(stats).toHaveProperty("totalAutoFetched");
      expect(stats).toHaveProperty("sessionDuration");
      expect(stats).toHaveProperty("averagePerformance");
      expect(stats).toHaveProperty("config");
    });

    it("should update configuration", () => {
      const newConfig = { minResultsThreshold: 20 };
      system.updateConfig(newConfig);

      const stats = system.getStatistics();
      expect(stats.config.minResultsThreshold).toBe(20);
    });
  });

  describe("edge cases", () => {
    it("should handle zero filter efficiency", () => {
      context.totalFilteredPosts = 0;
      context.totalLoadedPosts = 30;

      const result = system.shouldAutoFetch(paginationState, context);

      if (result.shouldAutoFetch) {
        expect(result.targetFetchCount).toBeGreaterThan(0);
        expect(result.metadata.filterEfficiency).toBe(0);
      }
    });

    it("should handle perfect filter efficiency", () => {
      context.totalFilteredPosts = 30;
      context.totalLoadedPosts = 30;

      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.metadata.filterEfficiency).toBe(1);
    });

    it("should handle search active scenario", () => {
      context.isSearchActive = true;
      context.hasFiltersApplied = false;

      const result = system.shouldAutoFetch(paginationState, context);

      expect(result.shouldAutoFetch).toBe(true);
    });
  });
});

describe("utility functions", () => {
  describe("createAutoFetchSystem", () => {
    it("should create system with default config", () => {
      const system = createAutoFetchSystem();
      const stats = system.getStatistics();

      expect(stats.config.minResultsThreshold).toBe(
        DEFAULT_AUTO_FETCH_CONFIG.minResultsThreshold
      );
    });

    it("should create system with custom config", () => {
      const customConfig = { minResultsThreshold: 20 };
      const system = createAutoFetchSystem(customConfig);
      const stats = system.getStatistics();

      expect(stats.config.minResultsThreshold).toBe(20);
    });
  });

  describe("shouldAutoFetch utility", () => {
    it("should provide quick auto-fetch detection", () => {
      const paginationState = {
        ...INITIAL_PAGINATION_STATE,
        allPosts: createMockPosts(30),
        hasMorePosts: true,
        isLoadingMore: false,
      };

      const context = {
        isSearchActive: false,
        hasFiltersApplied: true,
        searchFiltersActive: false,
        totalLoadedPosts: 30,
        totalFilteredPosts: 5,
        currentPage: 1,
      };

      const result = shouldAutoFetch(paginationState, context);

      expect(typeof result).toBe("boolean");
      expect(result).toBe(true);
    });
  });
});
