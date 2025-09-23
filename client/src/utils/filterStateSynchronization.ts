/**
 * Filter State Synchronization System
 *
 * This module provides a comprehensive system for synchronizing filter states
 * between SearchBar filters and dashboard filters, with change detection,
 * pagination reset logic, and state persistence mechanisms.
 *
 * Requirements: 3.3, 3.4, 3.5
 */

import { FilterOptions, SearchFilters } from "@/types/pagination";

/**
 * Filter change event types
 */
export type FilterChangeType =
  | "search-filter-change"
  | "dashboard-filter-change"
  | "filter-sync"
  | "filter-reset"
  | "filter-conflict-resolution";

/**
 * Filter change detection result
 */
export interface FilterChangeDetection {
  hasChanges: boolean;
  changedFields: string[];
  changeType: FilterChangeType;
  requiresPaginationReset: boolean;
  requiresCacheInvalidation: boolean;
  conflictResolution?: FilterConflictResolution;
}

/**
 * Filter conflict resolution information
 */
export interface FilterConflictResolution {
  conflictingFields: string[];
  resolutionStrategy:
    | "search-priority"
    | "dashboard-priority"
    | "merge"
    | "user-choice";
  resolvedValues: Record<string, string | number | boolean>;
}

/**
 * Filter state snapshot for persistence
 */
export interface FilterStateSnapshot {
  searchFilters: SearchFilters;
  dashboardFilters: FilterOptions;
  timestamp: number;
  sessionId: string;
  isActive: boolean;
}

/**
 * Filter synchronization configuration
 */
export interface FilterSyncConfig {
  searchFilterPriority: boolean;
  enablePersistence: boolean;
  persistenceKey: string;
  maxHistorySize: number;
  conflictResolutionStrategy:
    | "search-priority"
    | "dashboard-priority"
    | "merge";
  enableChangeDetection: boolean;
  debounceMs: number;
}

/**
 * Default filter synchronization configuration
 */
export const DEFAULT_FILTER_SYNC_CONFIG: FilterSyncConfig = {
  searchFilterPriority: true,
  enablePersistence: true,
  persistenceKey: "dashboard-filter-state",
  maxHistorySize: 10,
  conflictResolutionStrategy: "search-priority",
  enableChangeDetection: true,
  debounceMs: 300,
};

/**
 * Filter State Synchronization Manager
 */
export class FilterStateSynchronization {
  private config: FilterSyncConfig;
  private currentSearchFilters: SearchFilters = {};
  private currentDashboardFilters: FilterOptions = {
    postType: "all",
    sortBy: "newest",
    timeRange: "all",
  };
  private filterHistory: FilterStateSnapshot[] = [];
  private listeners: Array<(detection: FilterChangeDetection) => void> = [];
  private sessionId: string;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<FilterSyncConfig> = {}) {
    this.config = { ...DEFAULT_FILTER_SYNC_CONFIG, ...config };
    this.sessionId = this.generateSessionId();

    // Load persisted state if enabled
    if (this.config.enablePersistence) {
      this.loadPersistedState();
    }
  }

  /**
   * Subscribe to filter change events
   */
  subscribe(listener: (detection: FilterChangeDetection) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update search filters and synchronize
   */
  updateSearchFilters(newSearchFilters: SearchFilters): FilterChangeDetection {
    console.log("🔄 FilterSync: Updating search filters", newSearchFilters);

    const detection = this.detectFilterChanges(
      newSearchFilters,
      this.currentDashboardFilters,
      "search-filter-change"
    );

    if (detection.hasChanges) {
      this.currentSearchFilters = { ...newSearchFilters };

      // Handle conflicts if any
      if (detection.conflictResolution) {
        this.resolveFilterConflicts(detection.conflictResolution);
      }

      // Persist state if enabled
      if (this.config.enablePersistence) {
        this.persistCurrentState();
      }

      // Notify listeners with debouncing
      this.notifyListenersDebounced(detection);
    }

    return detection;
  }

  /**
   * Update dashboard filters and synchronize
   */
  updateDashboardFilters(
    newDashboardFilters: FilterOptions
  ): FilterChangeDetection {
    console.log(
      "🔄 FilterSync: Updating dashboard filters",
      newDashboardFilters
    );

    const detection = this.detectFilterChanges(
      this.currentSearchFilters,
      newDashboardFilters,
      "dashboard-filter-change"
    );

    if (detection.hasChanges) {
      this.currentDashboardFilters = { ...newDashboardFilters };

      // Handle conflicts if any
      if (detection.conflictResolution) {
        this.resolveFilterConflicts(detection.conflictResolution);
      }

      // Persist state if enabled
      if (this.config.enablePersistence) {
        this.persistCurrentState();
      }

      // Notify listeners with debouncing
      this.notifyListenersDebounced(detection);
    }

    return detection;
  }

  /**
   * Synchronize filters between search and dashboard
   */
  synchronizeFilters(): FilterChangeDetection {
    console.log("🔄 FilterSync: Synchronizing filters");

    const detection = this.detectFilterChanges(
      this.currentSearchFilters,
      this.currentDashboardFilters,
      "filter-sync"
    );

    if (detection.conflictResolution) {
      this.resolveFilterConflicts(detection.conflictResolution);

      // Persist state if enabled
      if (this.config.enablePersistence) {
        this.persistCurrentState();
      }

      // Notify listeners
      this.notifyListeners(detection);
    }

    return detection;
  }

  /**
   * Reset all filters to default values
   */
  resetFilters(): FilterChangeDetection {
    console.log("🧹 FilterSync: Resetting all filters");

    const defaultSearchFilters: SearchFilters = {};
    const defaultDashboardFilters: FilterOptions = {
      postType: "all",
      sortBy: "newest",
      timeRange: "all",
    };

    const detection: FilterChangeDetection = {
      hasChanges: true,
      changedFields: ["all"],
      changeType: "filter-reset",
      requiresPaginationReset: true,
      requiresCacheInvalidation: true,
    };

    this.currentSearchFilters = defaultSearchFilters;
    this.currentDashboardFilters = defaultDashboardFilters;

    // Clear persistence
    if (this.config.enablePersistence) {
      this.clearPersistedState();
    }

    // Notify listeners
    this.notifyListeners(detection);

    return detection;
  }

  /**
   * Get current synchronized filter state
   */
  getCurrentState(): {
    searchFilters: SearchFilters;
    dashboardFilters: FilterOptions;
    effectiveFilters: FilterOptions;
  } {
    const effectiveFilters = this.getEffectiveFilters();

    return {
      searchFilters: { ...this.currentSearchFilters },
      dashboardFilters: { ...this.currentDashboardFilters },
      effectiveFilters,
    };
  }

  /**
   * Get effective filters (resolved conflicts)
   */
  getEffectiveFilters(): FilterOptions {
    if (this.config.searchFilterPriority) {
      return {
        postType: this.getEffectivePostType(),
        sortBy: this.getEffectiveSortBy(),
        timeRange: this.getEffectiveTimeRange(),
      };
    } else {
      // Dashboard filters take priority
      return { ...this.currentDashboardFilters };
    }
  }

  /**
   * Check if filters are currently active (non-default)
   */
  hasActiveFilters(): boolean {
    const effective = this.getEffectiveFilters();
    return (
      effective.postType !== "all" ||
      effective.sortBy !== "newest" ||
      effective.timeRange !== "all" ||
      !!this.currentSearchFilters.query?.trim()
    );
  }

  /**
   * Get filter change history
   */
  getFilterHistory(): FilterStateSnapshot[] {
    return [...this.filterHistory];
  }

  /**
   * Restore filter state from history
   */
  restoreFromHistory(index: number): boolean {
    if (index < 0 || index >= this.filterHistory.length) {
      return false;
    }

    const snapshot = this.filterHistory[index];
    this.currentSearchFilters = { ...snapshot.searchFilters };
    this.currentDashboardFilters = { ...snapshot.dashboardFilters };

    const detection: FilterChangeDetection = {
      hasChanges: true,
      changedFields: ["restored"],
      changeType: "filter-sync",
      requiresPaginationReset: true,
      requiresCacheInvalidation: true,
    };

    this.notifyListeners(detection);
    return true;
  }

  // Private methods

  /**
   * Detect changes between current and new filter states
   */
  private detectFilterChanges(
    newSearchFilters: SearchFilters,
    newDashboardFilters: FilterOptions,
    changeType: FilterChangeType
  ): FilterChangeDetection {
    const changedFields: string[] = [];
    let requiresPaginationReset = false;
    let requiresCacheInvalidation = false;

    // Check search filter changes
    if (
      JSON.stringify(newSearchFilters) !==
      JSON.stringify(this.currentSearchFilters)
    ) {
      changedFields.push("searchFilters");
      requiresPaginationReset = true;

      // Cache invalidation needed if query changed
      if (newSearchFilters.query !== this.currentSearchFilters.query) {
        requiresCacheInvalidation = true;
      }
    }

    // Check dashboard filter changes
    if (
      JSON.stringify(newDashboardFilters) !==
      JSON.stringify(this.currentDashboardFilters)
    ) {
      changedFields.push("dashboardFilters");
      requiresPaginationReset = true;
    }

    // Detect conflicts
    const conflictResolution = this.detectFilterConflicts(
      newSearchFilters,
      newDashboardFilters
    );

    return {
      hasChanges: changedFields.length > 0,
      changedFields,
      changeType,
      requiresPaginationReset,
      requiresCacheInvalidation,
      conflictResolution:
        conflictResolution.conflictingFields.length > 0
          ? conflictResolution
          : undefined,
    };
  }

  /**
   * Detect conflicts between search and dashboard filters
   */
  private detectFilterConflicts(
    searchFilters: SearchFilters,
    dashboardFilters: FilterOptions
  ): FilterConflictResolution {
    const conflictingFields: string[] = [];
    const resolvedValues: Record<string, string | number | boolean> = {};

    // Check postType conflicts
    if (
      searchFilters.postType &&
      searchFilters.postType !== "all" &&
      dashboardFilters.postType !== "all" &&
      searchFilters.postType !== dashboardFilters.postType
    ) {
      conflictingFields.push("postType");
      resolvedValues.postType = this.config.searchFilterPriority
        ? searchFilters.postType
        : dashboardFilters.postType;
    }

    // Check sortBy conflicts
    const searchSortBy = this.mapSearchSortToDashboardSort(
      searchFilters.sortBy
    );
    if (
      searchSortBy &&
      searchSortBy !== "newest" &&
      dashboardFilters.sortBy !== "newest" &&
      searchSortBy !== dashboardFilters.sortBy
    ) {
      conflictingFields.push("sortBy");
      resolvedValues.sortBy = this.config.searchFilterPriority
        ? searchSortBy
        : dashboardFilters.sortBy;
    }

    // Check timeRange conflicts
    if (
      searchFilters.timeRange &&
      searchFilters.timeRange !== "all" &&
      dashboardFilters.timeRange !== "all" &&
      searchFilters.timeRange !== dashboardFilters.timeRange
    ) {
      conflictingFields.push("timeRange");
      resolvedValues.timeRange = this.config.searchFilterPriority
        ? searchFilters.timeRange
        : dashboardFilters.timeRange;
    }

    return {
      conflictingFields,
      resolutionStrategy: this.config.conflictResolutionStrategy,
      resolvedValues,
    };
  }

  /**
   * Resolve filter conflicts based on configuration
   */
  private resolveFilterConflicts(resolution: FilterConflictResolution): void {
    console.log("⚠️ FilterSync: Resolving conflicts", resolution);

    switch (resolution.resolutionStrategy) {
      case "search-priority":
        // Search filters override dashboard filters
        Object.entries(resolution.resolvedValues).forEach(([key, value]) => {
          if (key === "postType") {
            this.currentDashboardFilters.postType =
              value as FilterOptions["postType"];
          } else if (key === "sortBy") {
            this.currentDashboardFilters.sortBy =
              value as FilterOptions["sortBy"];
          } else if (key === "timeRange") {
            this.currentDashboardFilters.timeRange =
              value as FilterOptions["timeRange"];
          }
        });
        break;

      case "dashboard-priority":
        // Dashboard filters override search filters
        Object.entries(resolution.resolvedValues).forEach(([key, value]) => {
          if (key === "postType") {
            this.currentSearchFilters.postType =
              value as SearchFilters["postType"];
          } else if (key === "sortBy") {
            this.currentSearchFilters.sortBy =
              this.mapDashboardSortToSearchSort(value as string);
          } else if (key === "timeRange") {
            this.currentSearchFilters.timeRange =
              value as SearchFilters["timeRange"];
          }
        });
        break;

      case "merge":
        // Merge both filter sets intelligently
        // Implementation depends on specific business logic
        break;
    }
  }

  /**
   * Get effective post type considering both filter sources
   */
  private getEffectivePostType(): "all" | "text" | "audio" {
    if (
      this.currentSearchFilters.postType &&
      this.currentSearchFilters.postType !== "all" &&
      this.currentSearchFilters.postType !== "creators"
    ) {
      return this.currentSearchFilters.postType as "text" | "audio";
    }
    return this.currentDashboardFilters.postType;
  }

  /**
   * Get effective sort by considering both filter sources
   */
  private getEffectiveSortBy(): "newest" | "oldest" | "popular" {
    if (
      this.currentSearchFilters.sortBy &&
      this.currentSearchFilters.sortBy !== "recent"
    ) {
      return this.mapSearchSortToDashboardSort(
        this.currentSearchFilters.sortBy
      );
    }
    return this.currentDashboardFilters.sortBy;
  }

  /**
   * Get effective time range considering both filter sources
   */
  private getEffectiveTimeRange(): "all" | "today" | "week" | "month" {
    if (
      this.currentSearchFilters.timeRange &&
      this.currentSearchFilters.timeRange !== "all"
    ) {
      return this.currentSearchFilters.timeRange as "today" | "week" | "month";
    }
    return this.currentDashboardFilters.timeRange;
  }

  /**
   * Map search sort options to dashboard sort options
   */
  private mapSearchSortToDashboardSort(
    searchSort?: string
  ): "newest" | "oldest" | "popular" {
    switch (searchSort) {
      case "recent":
        return "newest";
      case "oldest":
        return "oldest";
      case "popular":
      case "likes":
        return "popular";
      case "relevance":
        return "newest";
      default:
        return "newest";
    }
  }

  /**
   * Map dashboard sort options to search sort options
   */
  private mapDashboardSortToSearchSort(
    dashboardSort: string
  ): SearchFilters["sortBy"] {
    switch (dashboardSort) {
      case "newest":
        return "recent";
      case "oldest":
        return "oldest";
      case "popular":
        return "popular";
      default:
        return "recent";
    }
  }

  /**
   * Notify listeners with debouncing
   */
  private notifyListenersDebounced(detection: FilterChangeDetection): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.notifyListeners(detection);
    }, this.config.debounceMs);
  }

  /**
   * Notify all listeners immediately
   */
  private notifyListeners(detection: FilterChangeDetection): void {
    this.listeners.forEach((listener) => {
      try {
        listener(detection);
      } catch (error) {
        console.error("Error in filter sync listener:", error);
      }
    });
  }

  /**
   * Persist current state to storage
   */
  private persistCurrentState(): void {
    if (!this.config.enablePersistence) return;

    const snapshot: FilterStateSnapshot = {
      searchFilters: { ...this.currentSearchFilters },
      dashboardFilters: { ...this.currentDashboardFilters },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      isActive: this.hasActiveFilters(),
    };

    // Add to history
    this.filterHistory.unshift(snapshot);
    if (this.filterHistory.length > this.config.maxHistorySize) {
      this.filterHistory = this.filterHistory.slice(
        0,
        this.config.maxHistorySize
      );
    }

    // Persist to localStorage
    try {
      localStorage.setItem(
        this.config.persistenceKey,
        JSON.stringify(snapshot)
      );
    } catch (error) {
      console.warn("Failed to persist filter state:", error);
    }
  }

  /**
   * Load persisted state from storage
   */
  private loadPersistedState(): void {
    try {
      const stored = localStorage.getItem(this.config.persistenceKey);
      if (stored) {
        const snapshot: FilterStateSnapshot = JSON.parse(stored);

        // Only restore if from recent session (within 1 hour)
        if (Date.now() - snapshot.timestamp < 60 * 60 * 1000) {
          this.currentSearchFilters = snapshot.searchFilters;
          this.currentDashboardFilters = snapshot.dashboardFilters;
          console.log("✅ FilterSync: Restored persisted state");
        }
      }
    } catch (error) {
      console.warn("Failed to load persisted filter state:", error);
    }
  }

  /**
   * Clear persisted state from storage
   */
  private clearPersistedState(): void {
    try {
      localStorage.removeItem(this.config.persistenceKey);
      this.filterHistory = [];
    } catch (error) {
      console.warn("Failed to clear persisted filter state:", error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `filter-session-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  }
}

/**
 * Factory function to create filter state synchronization manager
 */
export function createFilterStateSynchronization(
  config?: Partial<FilterSyncConfig>
): FilterStateSynchronization {
  return new FilterStateSynchronization(config);
}

/**
 * Global filter synchronization instance (singleton pattern)
 */
let globalFilterSync: FilterStateSynchronization | null = null;

/**
 * Get or create global filter synchronization instance
 */
export function getGlobalFilterSync(
  config?: Partial<FilterSyncConfig>
): FilterStateSynchronization {
  if (!globalFilterSync) {
    globalFilterSync = createFilterStateSynchronization(config);
  }
  return globalFilterSync;
}

/**
 * Reset global filter synchronization instance
 */
export function resetGlobalFilterSync(): void {
  globalFilterSync = null;
}
