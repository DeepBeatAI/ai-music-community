/**
 * State Consistency Validation and Recovery System
 * 
 * Implements validateStateConsistency and recoverFromInconsistentState functions
 * with state snapshot and restoration capabilities for debugging Load More operations.
 */

import { PaginationState, StateValidationResult } from '@/types/pagination';
import { Post } from '@/types';
import { StateError } from '@/types/errors';

/**
 * State snapshot interface for debugging and recovery
 */
export interface StateSnapshot {
  id: string;
  timestamp: number;
  state: PaginationState;
  metadata: {
    operation: string;
    reason: string;
    userAgent: string;
    url: string;
  };
  validationResult?: StateValidationResult;
}

/**
 * State recovery options
 */
export interface StateRecoveryOptions {
  preserveUserData: boolean;
  resetToCleanState: boolean;
  restoreFromSnapshot: boolean;
  snapshotId?: string;
  fallbackToDefaults: boolean;
}

/**
 * State consistency validation rules
 */
interface ValidationRule {
  name: string;
  validate: (state: PaginationState) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  context?: Record<string, unknown>;
}

/**
 * State snapshot manager
 */
export class StateSnapshotManager {
  private snapshots: Map<string, StateSnapshot> = new Map();
  private maxSnapshots = 10;

  /**
   * Create a state snapshot
   */
  createSnapshot(
    state: PaginationState,
    operation: string,
    reason: string
  ): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      state: this.deepClone(state),
      metadata: {
        operation,
        reason,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      },
    };

    this.snapshots.set(snapshot.id, snapshot);

    // Keep only the most recent snapshots
    if (this.snapshots.size > this.maxSnapshots) {
      const oldestId = Array.from(this.snapshots.keys())[0];
      this.snapshots.delete(oldestId);
    }

    return snapshot;
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): StateSnapshot | null {
    return this.snapshots.get(id) || null;
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): StateSnapshot[] {
    return Array.from(this.snapshots.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): StateSnapshot | null {
    const snapshots = this.getAllSnapshots();
    return snapshots.length > 0 ? snapshots[0] : null;
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }

  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * State consistency validator
 */
export class StateConsistencyValidator {
  private validationRules: ValidationRule[];
  private snapshotManager: StateSnapshotManager;

  constructor() {
    this.snapshotManager = new StateSnapshotManager();
    this.validationRules = this.createValidationRules();
  }

  /**
   * Validate state consistency
   */
  validateStateConsistency(state: PaginationState): StateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    // Create snapshot before validation
    const snapshot = this.snapshotManager.createSnapshot(
      state,
      'validation',
      'State consistency check'
    );

    // Run all validation rules
    for (const rule of this.validationRules) {
      try {
        const result = rule.validate(state);
        
        if (!result.isValid && result.message) {
          switch (rule.severity) {
            case 'error':
              errors.push(`${rule.name}: ${result.message}`);
              break;
            case 'warning':
              warnings.push(`${rule.name}: ${result.message}`);
              break;
            case 'info':
              info.push(`${rule.name}: ${result.message}`);
              break;
          }
        }
      } catch (error) {
        errors.push(`${rule.name}: Validation rule failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const validationResult: StateValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    // Update snapshot with validation result
    snapshot.validationResult = validationResult;

    return validationResult;
  }

  /**
   * Recover from inconsistent state
   */
  recoverFromInconsistentState(
    state: PaginationState,
    options: StateRecoveryOptions = {
      preserveUserData: true,
      resetToCleanState: false,
      restoreFromSnapshot: false,
      fallbackToDefaults: true,
    }
  ): PaginationState {
    // Create snapshot before recovery
    this.snapshotManager.createSnapshot(
      state,
      'recovery',
      'State recovery operation'
    );

    // Try to restore from snapshot if requested
    if (options.restoreFromSnapshot && options.snapshotId) {
      const snapshot = this.snapshotManager.getSnapshot(options.snapshotId);
      if (snapshot) {
        const validation = this.validateStateConsistency(snapshot.state);
        if (validation.isValid) {
          return this.deepClone(snapshot.state);
        }
      }
    }

    // Reset to clean state if requested
    if (options.resetToCleanState) {
      return this.createCleanState(options.preserveUserData ? state : undefined);
    }

    // Attempt incremental recovery
    const recoveredState = this.performIncrementalRecovery(state, options);

    // Validate recovered state
    const validation = this.validateStateConsistency(recoveredState);
    if (!validation.isValid && options.fallbackToDefaults) {
      // Fall back to clean state if recovery failed
      return this.createCleanState(options.preserveUserData ? state : undefined);
    }

    return recoveredState;
  }

  /**
   * Get state snapshots for debugging
   */
  getStateSnapshots(): StateSnapshot[] {
    return this.snapshotManager.getAllSnapshots();
  }

  /**
   * Restore state from snapshot
   */
  restoreFromSnapshot(snapshotId: string): PaginationState | null {
    const snapshot = this.snapshotManager.getSnapshot(snapshotId);
    return snapshot ? this.deepClone(snapshot.state) : null;
  }

  private createValidationRules(): ValidationRule[] {
    return [
      {
        name: 'Basic State Structure',
        severity: 'error',
        recoverable: true,
        validate: (state) => {
          if (!state || typeof state !== 'object') {
            return { isValid: false, message: 'State is null or not an object' };
          }
          return { isValid: true };
        },
      },
      {
        name: 'Pagination Properties',
        severity: 'error',
        recoverable: true,
        validate: (state) => {
          if (typeof state.currentPage !== 'number' || state.currentPage < 1) {
            return { isValid: false, message: 'Invalid currentPage value' };
          }
          if (typeof state.postsPerPage !== 'number' || state.postsPerPage < 1) {
            return { isValid: false, message: 'Invalid postsPerPage value' };
          }
          if (typeof state.hasMorePosts !== 'boolean') {
            return { isValid: false, message: 'Invalid hasMorePosts value' };
          }
          return { isValid: true };
        },
      },
      {
        name: 'Post Arrays',
        severity: 'error',
        recoverable: true,
        validate: (state) => {
          if (!Array.isArray(state.allPosts)) {
            return { isValid: false, message: 'allPosts is not an array' };
          }
          if (!Array.isArray(state.displayPosts)) {
            return { isValid: false, message: 'displayPosts is not an array' };
          }
          if (!Array.isArray(state.paginatedPosts)) {
            return { isValid: false, message: 'paginatedPosts is not an array' };
          }
          return { isValid: true };
        },
      },
      {
        name: 'Post Array Consistency',
        severity: 'warning',
        recoverable: true,
        validate: (state) => {
          if (state.displayPosts.length > state.allPosts.length) {
            return { 
              isValid: false, 
              message: 'displayPosts contains more items than allPosts',
              context: {
                allPostsCount: state.allPosts.length,
                displayPostsCount: state.displayPosts.length,
              },
            };
          }
          if (state.paginatedPosts.length > state.displayPosts.length) {
            return { 
              isValid: false, 
              message: 'paginatedPosts contains more items than displayPosts',
              context: {
                displayPostsCount: state.displayPosts.length,
                paginatedPostsCount: state.paginatedPosts.length,
              },
            };
          }
          return { isValid: true };
        },
      },
      {
        name: 'Filter State Consistency',
        severity: 'warning',
        recoverable: true,
        validate: (state) => {
          if (state.hasFiltersApplied && state.displayPosts.length === state.allPosts.length) {
            return { 
              isValid: false, 
              message: 'hasFiltersApplied is true but displayPosts equals allPosts',
            };
          }
          if (!state.hasFiltersApplied && state.isSearchActive && state.displayPosts.length === state.allPosts.length) {
            return { 
              isValid: false, 
              message: 'Search is active but displayPosts equals allPosts',
            };
          }
          return { isValid: true };
        },
      },
      {
        name: 'Pagination Mode Consistency',
        severity: 'info',
        recoverable: true,
        validate: (state) => {
          if (state.paginationMode === 'client' && !state.isSearchActive && !state.hasFiltersApplied) {
            return { 
              isValid: false, 
              message: 'Client pagination mode without search or filters',
            };
          }
          if (state.paginationMode === 'server' && (state.isSearchActive || state.hasFiltersApplied)) {
            return { 
              isValid: false, 
              message: 'Server pagination mode with search or filters active',
            };
          }
          return { isValid: true };
        },
      },
      {
        name: 'Loading State Consistency',
        severity: 'warning',
        recoverable: true,
        validate: (state) => {
          if (state.isLoadingMore && state.fetchInProgress) {
            return { 
              isValid: false, 
              message: 'Both isLoadingMore and fetchInProgress are true',
            };
          }
          if (state.isLoadingMore && !state.hasMorePosts) {
            return { 
              isValid: false, 
              message: 'Loading more posts but hasMorePosts is false',
            };
          }
          return { isValid: true };
        },
      },
      {
        name: 'Metadata Consistency',
        severity: 'info',
        recoverable: true,
        validate: (state) => {
          if (!state.metadata) {
            return { isValid: false, message: 'Metadata is missing' };
          }
          if (state.metadata.loadedServerPosts > state.allPosts.length) {
            return { 
              isValid: false, 
              message: 'Metadata shows more loaded posts than actual posts',
            };
          }
          return { isValid: true };
        },
      },
    ];
  }

  private performIncrementalRecovery(
    state: PaginationState,
    options: StateRecoveryOptions
  ): PaginationState {
    const recoveredState = this.deepClone(state);

    // Fix basic pagination properties
    if (typeof recoveredState.currentPage !== 'number' || recoveredState.currentPage < 1) {
      recoveredState.currentPage = 1;
    }
    if (typeof recoveredState.postsPerPage !== 'number' || recoveredState.postsPerPage < 1) {
      recoveredState.postsPerPage = 15;
    }
    if (typeof recoveredState.hasMorePosts !== 'boolean') {
      recoveredState.hasMorePosts = true;
    }

    // Fix post arrays
    if (!Array.isArray(recoveredState.allPosts)) {
      recoveredState.allPosts = [];
    }
    if (!Array.isArray(recoveredState.displayPosts)) {
      recoveredState.displayPosts = [...recoveredState.allPosts];
    }
    if (!Array.isArray(recoveredState.paginatedPosts)) {
      recoveredState.paginatedPosts = [];
    }

    // Fix array consistency
    if (recoveredState.displayPosts.length > recoveredState.allPosts.length) {
      recoveredState.displayPosts = [...recoveredState.allPosts];
    }
    if (recoveredState.paginatedPosts.length > recoveredState.displayPosts.length) {
      const maxPaginated = Math.min(
        recoveredState.displayPosts.length,
        recoveredState.currentPage * recoveredState.postsPerPage
      );
      recoveredState.paginatedPosts = recoveredState.displayPosts.slice(0, maxPaginated);
    }

    // Fix loading states
    if (recoveredState.isLoadingMore && recoveredState.fetchInProgress) {
      recoveredState.fetchInProgress = false;
    }
    if (recoveredState.isLoadingMore && !recoveredState.hasMorePosts) {
      recoveredState.isLoadingMore = false;
    }

    // Fix metadata
    if (!recoveredState.metadata) {
      recoveredState.metadata = {
        totalServerPosts: recoveredState.allPosts.length,
        loadedServerPosts: recoveredState.allPosts.length,
        currentBatch: Math.ceil(recoveredState.allPosts.length / recoveredState.postsPerPage),
        lastFetchTimestamp: Date.now(),
        totalFilteredPosts: recoveredState.displayPosts.length,
        visibleFilteredPosts: recoveredState.paginatedPosts.length,
        filterAppliedAt: Date.now(),
      };
    } else {
      if (recoveredState.metadata.loadedServerPosts > recoveredState.allPosts.length) {
        recoveredState.metadata.loadedServerPosts = recoveredState.allPosts.length;
      }
    }

    // Reset timestamps
    recoveredState.lastFetchTime = Date.now();

    return recoveredState;
  }

  private createCleanState(preserveFrom?: PaginationState): PaginationState {
    const cleanState: PaginationState = {
      currentPage: 1,
      hasMorePosts: true,
      isLoadingMore: false,
      
      allPosts: preserveFrom?.allPosts || [],
      displayPosts: preserveFrom?.allPosts || [],
      paginatedPosts: [],
      
      isSearchActive: false,
      hasFiltersApplied: false,
      totalPostsCount: preserveFrom?.totalPostsCount || 0,
      
      filters: {
        postType: 'all',
        sortBy: 'newest',
        timeRange: 'all',
      },
      searchResults: { posts: [], users: [], totalResults: 0 },
      currentSearchFilters: {},
      
      postsPerPage: 15,
      
      paginationMode: 'server',
      loadMoreStrategy: 'server-fetch',
      
      lastFetchTime: Date.now(),
      fetchInProgress: false,
      autoFetchTriggered: false,
      
      metadata: {
        totalServerPosts: preserveFrom?.allPosts?.length || 0,
        loadedServerPosts: preserveFrom?.allPosts?.length || 0,
        currentBatch: 0,
        lastFetchTimestamp: Date.now(),
        totalFilteredPosts: preserveFrom?.allPosts?.length || 0,
        visibleFilteredPosts: 0,
        filterAppliedAt: Date.now(),
      },
    };

    return cleanState;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Global state validator instance
 */
export const stateValidator = new StateConsistencyValidator();

/**
 * Utility functions for state validation
 */
export const StateValidationUtils = {
  /**
   * Quick validation check
   */
  isStateValid(state: PaginationState): boolean {
    const result = stateValidator.validateStateConsistency(state);
    return result.isValid;
  },

  /**
   * Get validation errors
   */
  getValidationErrors(state: PaginationState): string[] {
    const result = stateValidator.validateStateConsistency(state);
    return result.errors;
  },

  /**
   * Auto-recover state if invalid
   */
  autoRecoverState(state: PaginationState): PaginationState {
    const validation = stateValidator.validateStateConsistency(state);
    if (!validation.isValid) {
      return stateValidator.recoverFromInconsistentState(state);
    }
    return state;
  },

  /**
   * Create state error from validation
   */
  createStateErrorFromValidation(validation: StateValidationResult): StateError {
    return new StateError(
      'INVALID_STATE',
      `State validation failed: ${validation.errors.join(', ')}`,
      {
        context: { validation },
      }
    );
  },
};

/**
 * Factory function to create state validator
 */
export function createStateValidator(): StateConsistencyValidator {
  return new StateConsistencyValidator();
}

/**
 * Main validation function (as required by task)
 */
export function validateStateConsistency(state: PaginationState): StateValidationResult {
  return stateValidator.validateStateConsistency(state);
}

/**
 * Main recovery function (as required by task)
 */
export function recoverFromInconsistentState(
  state: PaginationState,
  options?: StateRecoveryOptions
): PaginationState {
  return stateValidator.recoverFromInconsistentState(state, options);
}