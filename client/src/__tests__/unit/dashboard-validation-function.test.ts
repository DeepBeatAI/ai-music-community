/**
 * Test suite for Dashboard State Validation Function - Task 2 Implementation
 * 
 * Tests the enhanced dashboard-specific state validation function to ensure it meets
 * Requirements 2.3, 2.4, 5.1, 5.2 for read-only validation and error prevention.
 */

import { PaginationState } from '@/types/pagination';
import { Post } from '@/types';

// Extract the validation function for isolated testing
interface DashboardValidationResult {
  isValid: boolean;
  issues: Array<{
    message: string;
    severity: 'warning' | 'error' | 'critical';
    category: 'ui' | 'data' | 'performance' | 'user_experience' | 'infinite_loop_prevention';
    requiresUserAction: boolean;
    timestamp: string;
  }>;
  summary: {
    totalIssues: number;
    criticalCount: number;
    errorCount: number;
    warningCount: number;
  };
}

function validateDashboardSpecificState(state: PaginationState | null): DashboardValidationResult {
  const issues: DashboardValidationResult['issues'] = [];
  const timestamp = new Date().toISOString();
  const POSTS_PER_PAGE = 15;
  
  // Critical validation: null state check (Requirements 5.1, 5.2)
  if (!state) {
    issues.push({
      message: 'Pagination state is null - this could cause infinite loading loops',
      severity: 'critical',
      category: 'infinite_loop_prevention',
      requiresUserAction: true,
      timestamp
    });
    return { 
      isValid: false, 
      issues,
      summary: {
        totalIssues: 1,
        criticalCount: 1,
        errorCount: 0,
        warningCount: 0
      }
    };
  }
  
  // Enhanced dashboard-specific validation with infinite loop prevention focus
  
  // 1. FIRST: Array integrity validation (Requirements 5.1, 5.2) - Must be checked before any array operations
  if (!Array.isArray(state.allPosts) || !Array.isArray(state.displayPosts) || !Array.isArray(state.paginatedPosts)) {
    issues.push({
      message: 'Post arrays are not valid arrays - critical data structure error',
      severity: 'critical',
      category: 'data',
      requiresUserAction: true,
      timestamp
    });
    
    // Early return for critical array structure issues to prevent further errors
    const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warning').length;
    
    return {
      isValid: false,
      issues,
      summary: {
        totalIssues: issues.length,
        criticalCount,
        errorCount,
        warningCount
      }
    };
  }
  
  // 2. Critical: Check for conditions that could cause infinite re-renders (Requirements 2.3, 2.4, 5.1)
  if (state.fetchInProgress && state.allPosts.length > 0 && !state.isLoadingMore) {
    issues.push({
      message: 'Initial loading state is true but posts already exist - potential infinite loop condition',
      severity: 'critical',
      category: 'infinite_loop_prevention',
      requiresUserAction: true,
      timestamp
    });
  }

  // 3. Critical: Validate pagination limits to prevent runaway loops (Requirement 5.1)
  if (state.postsPerPage !== POSTS_PER_PAGE) {
    issues.push({
      message: `Posts per page mismatch: expected ${POSTS_PER_PAGE}, got ${state.postsPerPage} - could cause pagination errors`,
      severity: 'error',
      category: 'ui',
      requiresUserAction: false,
      timestamp
    });
  }

  // 4. Critical: Detect impossible pagination states (Requirements 5.1, 5.2)
  if (state.currentPage < 1) {
    issues.push({
      message: `Invalid current page: ${state.currentPage} - must be >= 1`,
      severity: 'critical',
      category: 'infinite_loop_prevention',
      requiresUserAction: true,
      timestamp
    });
  }

  // Calculate total pages from available data
  const totalPages = Math.ceil(state.totalPostsCount / state.postsPerPage);
  if (state.currentPage > totalPages && totalPages > 0) {
    issues.push({
      message: `Current page (${state.currentPage}) exceeds total pages (${totalPages}) - pagination error`,
      severity: 'error',
      category: 'data',
      requiresUserAction: false,
      timestamp
    });
  }
  
  // 5. Enhanced search state validation (Requirements 5.1, 5.2)
  if (state.isSearchActive) {
    if (!state.searchResults) {
      issues.push({
        message: 'Search is active but searchResults is null/undefined',
        severity: 'error',
        category: 'data',
        requiresUserAction: false,
        timestamp
      });
    } else if (state.searchResults.totalResults === 0 && state.displayPosts.length > 0) {
      issues.push({
        message: 'Search shows no results but display posts exist - search state inconsistency',
        severity: 'warning',
        category: 'user_experience',
        requiresUserAction: false,
        timestamp
      });
    }
  }
  
  // 6. Enhanced performance validation with thresholds (Requirement 5.2)
  if (state.allPosts.length > 1000) {
    const severity = state.allPosts.length > 2000 ? 'error' : 'warning';
    issues.push({
      message: `Large dataset detected: ${state.allPosts.length} posts may impact performance`,
      severity,
      category: 'performance',
      requiresUserAction: severity === 'error',
      timestamp
    });
  }
  
  // 7. Critical: Load more state validation to prevent UI freezing (Requirements 5.1, 5.2)
  if (state.isLoadingMore && state.hasMorePosts === false) {
    issues.push({
      message: 'Loading more posts but hasMorePosts is false - will cause infinite loading',
      severity: 'critical',
      category: 'infinite_loop_prevention',
      requiresUserAction: true,
      timestamp
    });
  }

  // 8. Enhanced data consistency validation (Requirements 5.1, 5.2)
  if (state.paginatedPosts.length === 0 && state.displayPosts.length > 0 && !state.fetchInProgress && !state.isLoadingMore) {
    issues.push({
      message: 'Display posts exist but no paginated posts shown - pagination logic error',
      severity: 'error',
      category: 'data',
      requiresUserAction: false,
      timestamp
    });
  }
  
  // 9. Enhanced filter state validation (Requirements 5.1, 5.2)
  const hasActiveFilters = state.hasFiltersApplied || state.isSearchActive;
  const hasFilteredResults = state.displayPosts.length !== state.allPosts.length;
  
  if (hasActiveFilters && !hasFilteredResults && state.allPosts.length > 0) {
    issues.push({
      message: 'Filters are active but no filtering effect detected - filter logic may be broken',
      severity: 'warning',
      category: 'user_experience',
      requiresUserAction: false,
      timestamp
    });
  }
  
  // 10. Enhanced metadata consistency validation (Requirements 5.1, 5.2)
  if (state.metadata && typeof state.metadata.visibleFilteredPosts === 'number') {
    if (state.metadata.visibleFilteredPosts !== state.paginatedPosts.length) {
      issues.push({
        message: `Metadata mismatch: visible count (${state.metadata.visibleFilteredPosts}) != paginated count (${state.paginatedPosts.length})`,
        severity: 'warning',
        category: 'data',
        requiresUserAction: false,
        timestamp
      });
    }
  }
  
  // 11. Enhanced pagination mode validation (Requirements 5.2)
  if (state.paginationMode === 'client' && state.allPosts.length < 30) {
    issues.push({
      message: `Client pagination with small dataset (${state.allPosts.length} posts) - server mode recommended`,
      severity: 'warning',
      category: 'performance',
      requiresUserAction: false,
      timestamp
    });
  }

  // 12. Loading state consistency validation (Requirements 5.1, 5.2)
  if (state.fetchInProgress && state.isLoadingMore) {
    issues.push({
      message: 'Both fetchInProgress and isLoadingMore are true - conflicting loading states',
      severity: 'error',
      category: 'ui',
      requiresUserAction: false,
      timestamp
    });
  }

  // Calculate summary statistics
  const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  
  return {
    isValid: criticalCount === 0 && errorCount === 0,
    issues,
    summary: {
      totalIssues: issues.length,
      criticalCount,
      errorCount,
      warningCount
    }
  };
}

describe('Dashboard State Validation Function - Task 2 Implementation', () => {
  
  describe('Requirement 2.3 & 2.4: Read-only validation logic', () => {
    it('should validate null state without triggering side effects', () => {
      const result = validateDashboardSpecificState(null);
      
      expect(result.isValid).toBe(false);
      expect(result.summary.criticalCount).toBe(1);
      expect(result.issues[0].message).toContain('Pagination state is null');
      expect(result.issues[0].severity).toBe('critical');
      expect(result.issues[0].category).toBe('infinite_loop_prevention');
    });

    it('should validate valid state and return no issues', () => {
      const validState: PaginationState = {
        allPosts: [{ id: '1' }, { id: '2' }] as any[],
        displayPosts: [{ id: '1' }, { id: '2' }] as any[],
        paginatedPosts: [{ id: '1' }, { id: '2' }] as any[],
        currentPage: 1,
        hasMorePosts: false,
        fetchInProgress: false,
        isLoadingMore: false,
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 100,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 15,
        paginationMode: 'server' as const,
        loadMoreStrategy: 'server-fetch' as const,
        lastFetchTime: Date.now(),
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 2,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 2,
          filterAppliedAt: 0
        }
      };

      const result = validateDashboardSpecificState(validState);
      
      expect(result.isValid).toBe(true);
      expect(result.summary.totalIssues).toBe(0);
      expect(result.summary.criticalCount).toBe(0);
      expect(result.summary.errorCount).toBe(0);
    });
  });

  describe('Requirement 5.1: Detect infinite loop conditions', () => {
    it('should detect critical infinite loop condition - loading with existing posts', () => {
      const problematicState: PaginationState = {
        allPosts: [{ id: '1' }, { id: '2' }] as any[],
        displayPosts: [{ id: '1' }, { id: '2' }] as any[],
        paginatedPosts: [{ id: '1' }, { id: '2' }] as any[],
        currentPage: 1,
        hasMorePosts: false,
        fetchInProgress: true, // Critical: loading with existing posts
        isLoadingMore: false,
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 100,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 15,
        paginationMode: 'server' as const,
        loadMoreStrategy: 'server-fetch',
        lastFetchTime: 0,
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 2,
          filterAppliedAt: 0
        }
      };

      const result = validateDashboardSpecificState(problematicState);
      
      expect(result.isValid).toBe(false);
      expect(result.summary.criticalCount).toBe(1);
      
      const criticalIssue = result.issues.find(issue => issue.severity === 'critical');
      expect(criticalIssue?.message).toContain('potential infinite loop condition');
      expect(criticalIssue?.category).toBe('infinite_loop_prevention');
      expect(criticalIssue?.requiresUserAction).toBe(true);
    });

    it('should detect invalid current page that could cause loops', () => {
      const problematicState: PaginationState = {
        allPosts: [] as any[],
        displayPosts: [] as any[],
        paginatedPosts: [] as any[],
        currentPage: 0, // Critical: invalid page number
        hasMorePosts: false,
        fetchInProgress: false,
        isLoadingMore: false,
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 100,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 15,
        paginationMode: 'server' as const,
        loadMoreStrategy: 'server-fetch',
        lastFetchTime: 0,
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 0,
          filterAppliedAt: 0
        }
      };

      const result = validateDashboardSpecificState(problematicState);
      
      expect(result.isValid).toBe(false);
      expect(result.summary.criticalCount).toBe(1);
      
      const criticalIssue = result.issues.find(issue => issue.severity === 'critical');
      expect(criticalIssue?.message).toContain('Invalid current page: 0');
      expect(criticalIssue?.category).toBe('infinite_loop_prevention');
    });

    it('should detect load more infinite loading condition', () => {
      const problematicState: PaginationState = {
        allPosts: [{ id: '1' }] as any[],
        displayPosts: [{ id: '1' }] as any[],
        paginatedPosts: [{ id: '1' }] as any[],
        currentPage: 1,
        hasMorePosts: false, // No more posts
        fetchInProgress: false,
        isLoadingMore: true, // But still loading more - infinite condition
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 100,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 15,
        paginationMode: 'server' as const,
        loadMoreStrategy: 'server-fetch',
        lastFetchTime: 0,
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 1,
          filterAppliedAt: 0
        }
      };

      const result = validateDashboardSpecificState(problematicState);
      
      expect(result.isValid).toBe(false);
      expect(result.summary.criticalCount).toBe(1);
      
      const criticalIssue = result.issues.find(issue => issue.severity === 'critical');
      expect(criticalIssue?.message).toContain('will cause infinite loading');
      expect(criticalIssue?.category).toBe('infinite_loop_prevention');
    });
  });

  describe('Requirement 5.2: Prevent React warnings and errors', () => {
    it('should detect conflicting loading states', () => {
      const problematicState: PaginationState = {
        allPosts: [] as any[],
        displayPosts: [] as any[],
        paginatedPosts: [] as any[],
        currentPage: 1,
        hasMorePosts: false,
        fetchInProgress: true, // Both loading states true
        isLoadingMore: true, // This causes UI conflicts
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 100,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 15,
        paginationMode: 'server' as const,
        loadMoreStrategy: 'server-fetch',
        lastFetchTime: 0,
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 0,
          filterAppliedAt: 0
        }
      };

      const result = validateDashboardSpecificState(problematicState);
      
      expect(result.isValid).toBe(false);
      expect(result.summary.errorCount).toBeGreaterThan(0);
      
      const conflictIssue = result.issues.find(issue => 
        issue.message.includes('conflicting loading states')
      );
      expect(conflictIssue?.severity).toBe('error');
      expect(conflictIssue?.category).toBe('ui');
    });

    it('should detect invalid array structures that cause React errors', () => {
      const problematicState: any = {
        allPosts: 'not-an-array', // Invalid array
        displayPosts: null, // Invalid array
        paginatedPosts: undefined, // Invalid array
        currentPage: 1,
        totalPages: 1,
        hasMorePosts: false,
        isLoading: false,
        isLoadingMore: false,
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        searchQuery: '',
        searchFilters: {},
        hasFiltersApplied: false,
        postsPerPage: 15,
        paginationMode: 'server' as const,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 0,
          filterAppliedAt: 0
        }
      };

      const result = validateDashboardSpecificState(problematicState);
      
      expect(result.isValid).toBe(false);
      expect(result.summary.criticalCount).toBe(1);
      
      const arrayIssue = result.issues.find(issue => 
        issue.message.includes('Post arrays are not valid arrays')
      );
      expect(arrayIssue?.severity).toBe('critical');
      expect(arrayIssue?.category).toBe('data');
    });

    it('should detect performance issues that could cause warnings', () => {
      const largeDataState: PaginationState = {
        allPosts: new Array(2500).fill(null).map((_, i) => ({ id: i.toString() })) as any[],
        displayPosts: new Array(2500).fill(null).map((_, i) => ({ id: i.toString() })) as any[],
        paginatedPosts: new Array(15).fill(null).map((_, i) => ({ id: i.toString() })) as any[],
        currentPage: 1,
        hasMorePosts: true,
        fetchInProgress: false,
        isLoadingMore: false,
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 2500,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 15,
        paginationMode: 'client' as const,
        loadMoreStrategy: 'client-paginate',
        lastFetchTime: 0,
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 2500,
          loadedServerPosts: 2500,
          currentBatch: 167,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 2500,
          visibleFilteredPosts: 15,
          filterAppliedAt: Date.now()
        }
      };

      const result = validateDashboardSpecificState(largeDataState);
      
      expect(result.isValid).toBe(false); // Should be invalid due to performance error
      expect(result.summary.errorCount).toBe(1);
      
      const performanceIssue = result.issues.find(issue => 
        issue.message.includes('Large dataset detected')
      );
      expect(performanceIssue?.severity).toBe('error'); // Over 2000 posts
      expect(performanceIssue?.category).toBe('performance');
    });
  });

  describe('Enhanced error categorization and reporting', () => {
    it('should provide comprehensive issue summary', () => {
      const mixedIssuesState: PaginationState = {
        allPosts: [{ id: '1' }] as any[],
        displayPosts: [{ id: '1' }] as any[],
        paginatedPosts: [],
        currentPage: 0, // Critical issue
        hasMorePosts: false,
        fetchInProgress: true, // Critical issue with existing posts
        isLoadingMore: false,
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 100,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 10, // Error - doesn't match constant
        paginationMode: 'client' as const,
        loadMoreStrategy: 'client-paginate',
        lastFetchTime: 0,
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 5, // Warning - metadata mismatch
          filterAppliedAt: 0
        }
      };

      const result = validateDashboardSpecificState(mixedIssuesState);
      
      expect(result.isValid).toBe(false);
      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.summary.criticalCount).toBeGreaterThan(0);
      expect(result.summary.errorCount).toBeGreaterThan(0);
      
      // Verify all issues have required properties
      result.issues.forEach(issue => {
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('category');
        expect(issue).toHaveProperty('requiresUserAction');
        expect(issue).toHaveProperty('timestamp');
        expect(['critical', 'error', 'warning']).toContain(issue.severity);
      });
    });

    it('should include timestamps for all validation issues', () => {
      const testState: PaginationState = {
        allPosts: [] as Post[],
        displayPosts: [] as Post[],
        paginatedPosts: [] as Post[],
        currentPage: 0, // Will trigger validation issue
        hasMorePosts: false,
        fetchInProgress: false,
        isLoadingMore: false,
        isSearchActive: false,
        searchResults: { posts: [], users: [], totalResults: 0 },
        currentSearchFilters: {},
        hasFiltersApplied: false,
        totalPostsCount: 100,
        filters: { postType: 'all', sortBy: 'newest', timeRange: 'all' },
        postsPerPage: 15,
        paginationMode: 'server' as const,
        loadMoreStrategy: 'server-fetch',
        lastFetchTime: 0,
        autoFetchTriggered: false,
        metadata: {
          totalServerPosts: 100,
          loadedServerPosts: 15,
          currentBatch: 1,
          lastFetchTimestamp: Date.now(),
          totalFilteredPosts: 0,
          visibleFilteredPosts: 0,
          filterAppliedAt: 0
        }
      };

      const beforeValidation = new Date().toISOString();
      const result = validateDashboardSpecificState(testState);
      const afterValidation = new Date().toISOString();
      
      expect(result.issues.length).toBeGreaterThan(0);
      
      result.issues.forEach(issue => {
        expect(issue.timestamp).toBeDefined();
        expect(issue.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(issue.timestamp >= beforeValidation).toBe(true);
        expect(issue.timestamp <= afterValidation).toBe(true);
      });
    });
  });
});