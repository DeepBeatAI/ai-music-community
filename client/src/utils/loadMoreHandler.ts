/**
 * Unified Load More Handler
 * 
 * Implements the strategy pattern to handle different Load More scenarios:
 * - Server-side pagination for unfiltered content
 * - Client-side pagination for filtered/searched content
 * - Auto-fetching for comprehensive filtering
 * 
 * Includes request deduplication and concurrent request prevention.
 */

import { 
  PaginationState, 
  LoadMoreResult, 
  LoadMoreStrategy as LoadMoreStrategyType, 
  ModeDetectionContext,
  PaginationStateUpdate,
  StateValidationResult
} from '@/types/pagination';
import { Post } from '@/types';
import { LoadMoreStateMachine } from './loadMoreStateMachine';

/**
 * Load More Handler interface
 */
export interface LoadMoreHandler {
  handleLoadMore(): Promise<LoadMoreResult>;
  determineStrategy(): LoadMoreStrategyType;
  validateState(): StateValidationResult;
  updatePaginationState(update: PaginationStateUpdate): void;
  cancelPendingRequests(): void;
  getRequestStatus(): RequestStatus;
}

/**
 * Request status for tracking concurrent requests
 */
interface RequestStatus {
  isActive: boolean;
  requestId: string | null;
  startTime: number;
  strategy: LoadMoreStrategyType | null;
}

/**
 * Strategy interface for different Load More approaches
 */
interface LoadMoreStrategyInterface {
  execute(context: LoadMoreContext): Promise<LoadMoreResult>;
  canExecute(context: LoadMoreContext): boolean;
  getEstimatedDuration(): number;
}

/**
 * Load More execution context
 */
interface LoadMoreContext {
  paginationState: PaginationState;
  stateMachine: LoadMoreStateMachine;
  requestId: string;
  abortController: AbortController;
}

/**
 * Server fetch strategy for unfiltered content
 */
class ServerFetchStrategy implements LoadMoreStrategyInterface {
  async execute(context: LoadMoreContext): Promise<LoadMoreResult> {
    const { paginationState, abortController } = context;
    
    try {
      // Calculate next page
      const nextPage = paginationState.currentPage + 1;
      
      // Make API request to fetch more posts
      const response = await fetch(`/api/posts?page=${nextPage}&limit=${paginationState.postsPerPage}`, {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server request failed: ${response.status}`);
      }

      const data = await response.json();
      const newPosts: Post[] = data.posts || [];
      const hasMore = data.hasMore || false;

      return {
        success: true,
        newPosts,
        hasMore,
        strategy: 'server-fetch',
      };
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError')) {
        return {
          success: false,
          newPosts: [],
          hasMore: paginationState.hasMorePosts,
          error: 'Request cancelled',
          strategy: 'server-fetch',
        };
      }

      return {
        success: false,
        newPosts: [],
        hasMore: paginationState.hasMorePosts,
        error: error instanceof Error ? error.message : 'Unknown server error',
        strategy: 'server-fetch',
      };
    }
  }

  canExecute(context: LoadMoreContext): boolean {
    const { paginationState } = context;
    return !paginationState.isSearchActive && 
           !paginationState.hasFiltersApplied && 
           paginationState.hasMorePosts;
  }

  getEstimatedDuration(): number {
    return 2000; // 2 seconds for server requests
  }
}

/**
 * Client paginate strategy for filtered/searched content
 */
class ClientPaginateStrategy implements LoadMoreStrategyInterface {
  async execute(context: LoadMoreContext): Promise<LoadMoreResult> {
    const { paginationState } = context;
    
    try {
      // Calculate pagination for filtered results
      const startIndex = paginationState.paginatedPosts.length;
      const endIndex = startIndex + paginationState.postsPerPage;
      
      // Get next batch from filtered posts
      const nextBatch = paginationState.displayPosts.slice(startIndex, endIndex);
      const hasMore = endIndex < paginationState.displayPosts.length;

      // Simulate async operation for consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        newPosts: nextBatch,
        hasMore,
        strategy: 'client-paginate',
      };
    } catch (error) {
      return {
        success: false,
        newPosts: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Client pagination error',
        strategy: 'client-paginate',
      };
    }
  }

  canExecute(context: LoadMoreContext): boolean {
    const { paginationState } = context;
    const hasFilteredContent = paginationState.displayPosts.length > paginationState.paginatedPosts.length;
    return (paginationState.isSearchActive || paginationState.hasFiltersApplied) && hasFilteredContent;
  }

  getEstimatedDuration(): number {
    return 500; // 500ms for client-side operations
  }
}

/**
 * Auto-fetch strategy for comprehensive filtering
 */
class AutoFetchStrategy implements LoadMoreStrategyInterface {
  async execute(context: LoadMoreContext): Promise<LoadMoreResult> {
    const { paginationState, abortController } = context;
    
    try {
      // Calculate how many more posts we need for comprehensive filtering
      const currentFilteredCount = paginationState.displayPosts.length;
      const targetCount = Math.min(
        currentFilteredCount + paginationState.postsPerPage * 2, // Fetch 2 pages worth
        100 // Maximum auto-fetch limit
      );
      
      const postsToFetch = targetCount - paginationState.allPosts.length;
      
      if (postsToFetch <= 0) {
        // We have enough posts, just paginate client-side
        const clientStrategy = new ClientPaginateStrategy();
        return await clientStrategy.execute(context);
      }

      // Fetch additional posts from server
      const nextPage = Math.ceil(paginationState.allPosts.length / paginationState.postsPerPage) + 1;
      
      const response = await fetch(`/api/posts?page=${nextPage}&limit=${postsToFetch}`, {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Auto-fetch request failed: ${response.status}`);
      }

      const data = await response.json();
      const newPosts: Post[] = data.posts || [];

      return {
        success: true,
        newPosts,
        hasMore: data.hasMore || false,
        strategy: 'server-fetch', // Will be processed as auto-fetch by handler
      };
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError')) {
        return {
          success: false,
          newPosts: [],
          hasMore: paginationState.hasMorePosts,
          error: 'Request cancelled',
          strategy: 'server-fetch',
        };
      }

      return {
        success: false,
        newPosts: [],
        hasMore: paginationState.hasMorePosts,
        error: error instanceof Error ? error.message : 'Auto-fetch error',
        strategy: 'server-fetch',
      };
    }
  }

  canExecute(context: LoadMoreContext): boolean {
    const { paginationState } = context;
    
    // Check if we need more posts for comprehensive filtering
    const hasFiltersOrSearch = paginationState.isSearchActive || paginationState.hasFiltersApplied;
    const insufficientFilteredResults = paginationState.displayPosts.length < paginationState.postsPerPage;
    const canFetchMore = paginationState.hasMorePosts;
    const belowMaxLimit = paginationState.allPosts.length < 100;
    
    return hasFiltersOrSearch && insufficientFilteredResults && canFetchMore && belowMaxLimit;
  }

  getEstimatedDuration(): number {
    return 3000; // 3 seconds for auto-fetch operations
  }
}

/**
 * Unified Load More Handler implementation
 */
export class UnifiedLoadMoreHandler implements LoadMoreHandler {
  private paginationState: PaginationState;
  private stateMachine: LoadMoreStateMachine;
  private strategies: Map<LoadMoreStrategyType, LoadMoreStrategyInterface>;
  private currentRequest: RequestStatus;
  private requestQueue: string[];
  private abortController: AbortController | null;

  constructor(
    initialPaginationState: PaginationState,
    stateMachine: LoadMoreStateMachine
  ) {
    this.paginationState = initialPaginationState; // Use reference, not copy
    this.stateMachine = stateMachine;
    
    // Initialize strategies
    this.strategies = new Map([
      ['server-fetch', new ServerFetchStrategy()],
      ['client-paginate', new ClientPaginateStrategy()],
    ]);
    
    // Initialize request tracking
    this.currentRequest = {
      isActive: false,
      requestId: null,
      startTime: 0,
      strategy: null,
    };
    
    this.requestQueue = [];
    this.abortController = null;
  }

  /**
   * Main Load More handler method
   */
  async handleLoadMore(): Promise<LoadMoreResult> {
    // Validate current state
    const validation = this.validateState();
    if (!validation.isValid) {
      return {
        success: false,
        newPosts: [],
        hasMore: false,
        error: `Invalid state: ${validation.errors.join(', ')}`,
        strategy: this.determineStrategy(),
      };
    }

    // Check for concurrent requests
    if (this.currentRequest.isActive) {
      return {
        success: false,
        newPosts: [],
        hasMore: this.paginationState.hasMorePosts,
        error: 'Request already in progress',
        strategy: this.determineStrategy(),
      };
    }

    // Generate request ID and setup abort controller
    const requestId = this.generateRequestId();
    this.abortController = new AbortController();
    
    // Update request status
    this.currentRequest = {
      isActive: true,
      requestId,
      startTime: Date.now(),
      strategy: this.determineStrategy(),
    };

    // Transition state machine
    const strategy = this.determineStrategy();
    const stateTransition = strategy === 'server-fetch' ? 'loading-server' : 'loading-client';
    
    if (!this.stateMachine.transition(stateTransition, {
      reason: `Load More: ${strategy}`,
      metadata: { requestId, strategy },
    })) {
      this.resetRequestStatus();
      return {
        success: false,
        newPosts: [],
        hasMore: false,
        error: 'Failed to transition to loading state',
        strategy,
      };
    }

    try {
      // Execute strategy
      const result = await this.executeStrategy(strategy, requestId);
      
      // Update state machine based on result
      if (result.success) {
        this.stateMachine.transition('complete', {
          reason: 'Load More completed successfully',
          metadata: { requestId, newPostsCount: result.newPosts.length },
        });
      } else {
        this.stateMachine.transition('error', {
          reason: 'Load More failed',
          metadata: { requestId, error: result.error },
        });
      }

      return result;
    } catch (error) {
      // Handle unexpected errors
      this.stateMachine.transition('error', {
        reason: 'Unexpected Load More error',
        metadata: { requestId, error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return {
        success: false,
        newPosts: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
        strategy,
      };
    } finally {
      // Reset request status
      this.resetRequestStatus();
      
      // Transition back to idle
      setTimeout(() => {
        this.stateMachine.transition('idle', {
          reason: 'Load More operation completed',
          metadata: { requestId },
        });
      }, 100);
    }
  }

  /**
   * Determine the appropriate strategy for current state
   */
  determineStrategy(): LoadMoreStrategyType {
    const tempAbortController = new AbortController();
    const context = {
      paginationState: this.paginationState,
      stateMachine: this.stateMachine,
      requestId: 'temp',
      abortController: tempAbortController,
    };
    
    // Check client pagination first (if we have filtered data to paginate)
    const clientStrategy = this.strategies.get('client-paginate');
    if (clientStrategy?.canExecute(context)) {
      return 'client-paginate';
    }
    
    // Check auto-fetch (if we need more data for filtering)
    const autoFetchStrategy = new AutoFetchStrategy();
    if (autoFetchStrategy.canExecute(context)) {
      return 'server-fetch'; // Auto-fetch uses server-fetch strategy
    }
    
    // Default to server fetch
    return 'server-fetch';
  }

  /**
   * Validate current pagination state
   */
  validateState(): StateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate pagination state
    if (this.paginationState.currentPage < 1) {
      errors.push('Invalid current page');
    }

    if (this.paginationState.postsPerPage < 1) {
      errors.push('Invalid posts per page');
    }

    if (!Array.isArray(this.paginationState.allPosts)) {
      errors.push('Invalid allPosts array');
    }

    if (!Array.isArray(this.paginationState.displayPosts)) {
      errors.push('Invalid displayPosts array');
    }

    if (!Array.isArray(this.paginationState.paginatedPosts)) {
      errors.push('Invalid paginatedPosts array');
    }

    // Validate state machine
    const stateMachineValidation = this.stateMachine.validateState();
    errors.push(...stateMachineValidation.errors);
    warnings.push(...stateMachineValidation.warnings);

    // Check for logical inconsistencies
    if (this.paginationState.displayPosts.length > this.paginationState.allPosts.length) {
      warnings.push('Display posts exceed all posts');
    }

    if (this.paginationState.paginatedPosts.length > this.paginationState.displayPosts.length) {
      warnings.push('Paginated posts exceed display posts');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Update pagination state
   */
  updatePaginationState(update: PaginationStateUpdate): void {
    if (update.newPosts) {
      this.paginationState.allPosts = [...this.paginationState.allPosts, ...update.newPosts];
    }

    if (update.resetPagination) {
      this.paginationState.currentPage = 1;
      this.paginationState.paginatedPosts = [];
    }

    if (update.updateMetadata) {
      this.paginationState.metadata = {
        ...this.paginationState.metadata,
        ...update.updateMetadata,
      };
    }

    if (update.forceMode) {
      this.paginationState.paginationMode = update.forceMode;
    }

    // Update timestamps
    this.paginationState.lastFetchTime = Date.now();
  }

  /**
   * Get current pagination state (for testing)
   */
  getPaginationState(): PaginationState {
    return { ...this.paginationState };
  }

  /**
   * Cancel pending requests
   */
  cancelPendingRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.resetRequestStatus();
    this.requestQueue = [];

    // Force state machine to idle
    this.stateMachine.forceRecovery();
  }

  /**
   * Get current request status
   */
  getRequestStatus(): RequestStatus {
    return { ...this.currentRequest };
  }

  // Private methods

  private async executeStrategy(strategy: LoadMoreStrategyType, requestId: string): Promise<LoadMoreResult> {
    const context = this.createContext(requestId);
    
    // Check for auto-fetch scenario
    const autoFetchStrategy = new AutoFetchStrategy();
    if (strategy === 'server-fetch' && autoFetchStrategy.canExecute(context)) {
      // Use auto-fetch strategy
      this.stateMachine.transition('auto-fetching', {
        reason: 'Switching to auto-fetch for comprehensive filtering',
        metadata: { requestId },
      });
      
      return await autoFetchStrategy.execute(context);
    }
    
    // Use regular strategy
    const strategyImpl = this.strategies.get(strategy);
    if (!strategyImpl) {
      throw new Error(`Strategy not found: ${strategy}`);
    }

    if (!strategyImpl.canExecute(context)) {
      throw new Error(`Strategy cannot execute: ${strategy}`);
    }

    return await strategyImpl.execute(context);
  }

  private createContext(requestId: string): LoadMoreContext {
    return {
      paginationState: this.paginationState,
      stateMachine: this.stateMachine,
      requestId,
      abortController: this.abortController || new AbortController(),
    };
  }

  private generateRequestId(): string {
    return `load-more-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private resetRequestStatus(): void {
    this.currentRequest = {
      isActive: false,
      requestId: null,
      startTime: 0,
      strategy: null,
    };
    
    if (this.abortController) {
      this.abortController = null;
    }
  }
}

/**
 * Factory function to create a unified Load More handler
 */
export function createLoadMoreHandler(
  paginationState: PaginationState,
  stateMachine: LoadMoreStateMachine
): UnifiedLoadMoreHandler {
  return new UnifiedLoadMoreHandler(paginationState, stateMachine);
}

/**
 * Utility function to determine Load More strategy without creating handler
 */
export function determineLoadMoreStrategy(context: ModeDetectionContext): LoadMoreStrategyType {
  // Auto-fetch scenario
  if ((context.isSearchActive || context.hasFiltersApplied) && 
      context.totalFilteredPosts < 15 && 
      context.totalLoadedPosts < 100) {
    return 'server-fetch';
  }
  
  // Client pagination scenario
  if ((context.isSearchActive || context.hasFiltersApplied || context.searchFiltersActive) && 
      context.totalFilteredPosts > context.currentPage * 15) {
    return 'client-paginate';
  }
  
  // Default server fetch
  return 'server-fetch';
}