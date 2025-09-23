/**
 * Comprehensive Load More Logging System
 * 
 * Provides detailed logging for all pagination operations and state changes
 * with structured logging, debug information collection, and performance timing.
 * 
 * Requirements: 5.5 - Comprehensive logging and debugging support
 */

import { PaginationState, LoadMoreStrategy, LoadMoreState } from '@/types/pagination';

/**
 * Log levels for different types of information
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'performance';

/**
 * Load More operation types for logging
 */
export type LoadMoreOperationType = 
  | 'load-more-start'
  | 'load-more-complete'
  | 'load-more-error'
  | 'state-transition'
  | 'pagination-update'
  | 'filter-applied'
  | 'search-applied'
  | 'auto-fetch-triggered'
  | 'cache-operation'
  | 'memory-cleanup'
  | 'performance-warning'
  | 'validation-error';

/**
 * Structured log entry interface
 */
export interface LoadMoreLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  operation: LoadMoreOperationType;
  message: string;
  context: {
    strategy?: LoadMoreStrategy;
    state?: LoadMoreState;
    paginationState?: Partial<PaginationState>;
    performance?: PerformanceTimingData;
    error?: string;
    metadata?: Record<string, unknown>;
  };
  stackTrace?: string;
  sessionId: string;
}

/**
 * Performance timing data for operations
 */
export interface PerformanceTimingData {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryBefore?: number;
  memoryAfter?: number;
  networkLatency?: number;
  renderTime?: number;
  stateTransitionTime?: number;
}

/**
 * Debug information collection interface
 */
export interface DebugSnapshot {
  timestamp: number;
  paginationState: PaginationState;
  activeOperations: string[];
  memoryUsage: number;
  performanceMetrics: {
    averageLoadTime: number;
    successRate: number;
    errorCount: number;
    cacheHitRate: number;
  };
  browserInfo: {
    userAgent: string;
    viewport: { width: number; height: number };
    connectionType?: string;
  };
  recentLogs: LoadMoreLogEntry[];
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  enabled: boolean;
  logLevel: LogLevel;
  maxLogEntries: number;
  enablePerformanceLogging: boolean;
  enableDebugSnapshots: boolean;
  enableConsoleOutput: boolean;
  enableLocalStorage: boolean;
  sessionTimeout: number; // milliseconds
}

/**
 * Default logging configuration
 */
const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  enabled: true,
  logLevel: 'info',
  maxLogEntries: 1000,
  enablePerformanceLogging: true,
  enableDebugSnapshots: true,
  enableConsoleOutput: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  sessionTimeout: 3600000, // 1 hour
};

/**
 * Load More Logger Class
 * Provides comprehensive logging for all Load More operations
 */
export class LoadMoreLogger {
  private logs: LoadMoreLogEntry[] = [];
  private activeOperations: Map<string, PerformanceTimingData> = new Map();
  private config: LoggingConfig;
  private sessionId: string;
  private debugSnapshots: DebugSnapshot[] = [];

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = { ...DEFAULT_LOGGING_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    
    if (this.config.enableLocalStorage) {
      this.loadPersistedLogs();
    }
  }

  /**
   * Log a Load More operation start
   */
  logOperationStart(
    operation: LoadMoreOperationType,
    strategy: LoadMoreStrategy,
    context: Partial<PaginationState> = {}
  ): string {
    const operationId = this.generateOperationId();
    const performanceData: PerformanceTimingData = {
      startTime: performance.now(),
      memoryBefore: this.getCurrentMemoryUsage(),
    };

    this.activeOperations.set(operationId, performanceData);

    this.log('info', operation, `Starting ${operation} with ${strategy} strategy`, {
      strategy,
      paginationState: context,
      performance: performanceData,
      metadata: { operationId },
    });

    return operationId;
  }

  /**
   * Log a Load More operation completion
   */
  logOperationComplete(
    operationId: string,
    operation: LoadMoreOperationType,
    success: boolean,
    result: {
      postsLoaded?: number;
      totalPosts?: number;
      hasMore?: boolean;
      error?: string;
    } = {}
  ): void {
    const performanceData = this.activeOperations.get(operationId);
    if (performanceData) {
      performanceData.endTime = performance.now();
      performanceData.duration = performanceData.endTime - performanceData.startTime;
      performanceData.memoryAfter = this.getCurrentMemoryUsage();
    }

    const level: LogLevel = success ? 'info' : 'error';
    const message = success 
      ? `Completed ${operation} successfully`
      : `Failed ${operation}: ${result.error || 'Unknown error'}`;

    this.log(level, operation, message, {
      performance: performanceData,
      metadata: {
        operationId,
        success,
        ...result,
      },
    });

    // Check for performance warnings
    if (performanceData?.duration && performanceData.duration > 3000) {
      this.logPerformanceWarning(operationId, performanceData.duration);
    }

    this.activeOperations.delete(operationId);
  }

  /**
   * Log state transitions
   */
  logStateTransition(
    fromState: LoadMoreState,
    toState: LoadMoreState,
    reason: string,
    context: Record<string, unknown> = {}
  ): void {
    const transitionTime = performance.now();
    
    this.log('debug', 'state-transition', `State transition: ${fromState} → ${toState}`, {
      state: toState,
      performance: {
        startTime: transitionTime,
        stateTransitionTime: transitionTime,
      },
      metadata: {
        fromState,
        toState,
        reason,
        ...context,
      },
    });
  }

  /**
   * Log pagination state updates
   */
  logPaginationUpdate(
    updateType: 'posts-added' | 'filters-applied' | 'search-applied' | 'reset',
    paginationState: Partial<PaginationState>,
    details: Record<string, unknown> = {}
  ): void {
    this.log('debug', 'pagination-update', `Pagination update: ${updateType}`, {
      paginationState,
      metadata: {
        updateType,
        ...details,
      },
    });
  }

  /**
   * Log performance warnings
   */
  logPerformanceWarning(operationId: string, duration: number): void {
    this.log('warn', 'performance-warning', `Slow operation detected: ${duration}ms`, {
      performance: {
        startTime: performance.now() - duration,
        endTime: performance.now(),
        duration,
      },
      metadata: {
        operationId,
        threshold: 3000,
      },
    });
  }

  /**
   * Log validation errors
   */
  logValidationError(
    validationType: string,
    errors: string[],
    context: Record<string, unknown> = {}
  ): void {
    this.log('error', 'validation-error', `Validation failed: ${validationType}`, {
      metadata: {
        validationType,
        errors,
        ...context,
      },
    });
  }

  /**
   * Log auto-fetch operations
   */
  logAutoFetch(
    triggered: boolean,
    reason: string,
    context: {
      currentResults: number;
      targetResults: number;
      totalLoaded: number;
    }
  ): void {
    const message = triggered 
      ? `Auto-fetch triggered: ${reason}`
      : `Auto-fetch not triggered: ${reason}`;

    this.log('info', 'auto-fetch-triggered', message, {
      metadata: {
        triggered,
        reason,
        ...context,
      },
    });
  }

  /**
   * Create a debug snapshot of current state
   */
  createDebugSnapshot(paginationState: PaginationState): DebugSnapshot {
    const snapshot: DebugSnapshot = {
      timestamp: Date.now(),
      paginationState: { ...paginationState },
      activeOperations: Array.from(this.activeOperations.keys()),
      memoryUsage: this.getCurrentMemoryUsage(),
      performanceMetrics: this.calculatePerformanceMetrics(),
      browserInfo: this.getBrowserInfo(),
      recentLogs: this.getRecentLogs(20),
    };

    if (this.config.enableDebugSnapshots) {
      this.debugSnapshots.push(snapshot);
      
      // Limit snapshots
      if (this.debugSnapshots.length > 50) {
        this.debugSnapshots = this.debugSnapshots.slice(-40);
      }
    }

    this.log('debug', 'cache-operation', 'Debug snapshot created', {
      metadata: {
        snapshotId: `snapshot_${snapshot.timestamp}`,
        memoryUsage: snapshot.memoryUsage,
        activeOperations: snapshot.activeOperations.length,
      },
    });

    return snapshot;
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50): LoadMoreLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by operation type
   */
  getLogsByOperation(operation: LoadMoreOperationType): LoadMoreLogEntry[] {
    return this.logs.filter(log => log.operation === operation);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LoadMoreLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    errorCount: number;
    warningCount: number;
    slowOperations: number;
  } {
    const performanceLogs = this.logs.filter(log => 
      log.context.performance?.duration !== undefined
    );

    if (performanceLogs.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        errorCount: 0,
        warningCount: 0,
        slowOperations: 0,
      };
    }

    const totalDuration = performanceLogs.reduce((sum, log) => 
      sum + (log.context.performance?.duration || 0), 0
    );
    
    const errorCount = this.logs.filter(log => log.level === 'error').length;
    const warningCount = this.logs.filter(log => log.level === 'warn').length;
    const slowOperations = performanceLogs.filter(log => 
      (log.context.performance?.duration || 0) > 3000
    ).length;

    return {
      totalOperations: performanceLogs.length,
      averageDuration: totalDuration / performanceLogs.length,
      successRate: (performanceLogs.length - errorCount) / performanceLogs.length,
      errorCount,
      warningCount,
      slowOperations,
    };
  }

  /**
   * Export all logs for debugging
   */
  exportLogs(): {
    logs: LoadMoreLogEntry[];
    snapshots: DebugSnapshot[];
    summary: ReturnType<LoadMoreLogger['getPerformanceSummary']>;
    config: LoggingConfig;
    sessionInfo: {
      sessionId: string;
      startTime: number;
      duration: number;
    };
  } {
    return {
      logs: [...this.logs],
      snapshots: [...this.debugSnapshots],
      summary: this.getPerformanceSummary(),
      config: this.config,
      sessionInfo: {
        sessionId: this.sessionId,
        startTime: this.logs[0]?.timestamp || Date.now(),
        duration: Date.now() - (this.logs[0]?.timestamp || Date.now()),
      },
    };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.debugSnapshots = [];
    this.activeOperations.clear();
    
    if (this.config.enableLocalStorage) {
      this.clearPersistedLogs();
    }

    this.log('info', 'cache-operation', 'All logs cleared');
  }

  /**
   * Update logging configuration
   */
  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.log('info', 'cache-operation', 'Logging configuration updated', {
      metadata: { newConfig },
    });
  }

  // Private methods

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    operation: LoadMoreOperationType,
    message: string,
    context: LoadMoreLogEntry['context'] = {}
  ): void {
    if (!this.config.enabled) return;

    // Check log level
    const levelPriority = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      performance: 1,
    };

    if (levelPriority[level] < levelPriority[this.config.logLevel]) {
      return;
    }

    const logEntry: LoadMoreLogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      operation,
      message,
      context,
      sessionId: this.sessionId,
    };

    // Add stack trace for errors
    if (level === 'error') {
      logEntry.stackTrace = new Error().stack;
    }

    this.logs.push(logEntry);

    // Limit log entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-Math.floor(this.config.maxLogEntries * 0.8));
    }

    // Console output
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    // Persist to localStorage
    if (this.config.enableLocalStorage) {
      this.persistLogs();
    }
  }

  private outputToConsole(logEntry: LoadMoreLogEntry): void {
    const prefix = `[LoadMore:${logEntry.operation}]`;
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const message = `${prefix} ${logEntry.message}`;

    switch (logEntry.level) {
      case 'debug':
        console.debug(`${timestamp} ${message}`, logEntry.context);
        break;
      case 'info':
      case 'performance':
        console.info(`${timestamp} ${message}`, logEntry.context);
        break;
      case 'warn':
        console.warn(`${timestamp} ${message}`, logEntry.context);
        break;
      case 'error':
        console.error(`${timestamp} ${message}`, logEntry.context);
        if (logEntry.stackTrace) {
          console.error('Stack trace:', logEntry.stackTrace);
        }
        break;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return 0;
    }

    const memory = (performance as any).memory;
    if (memory) {
      return Math.round(memory.usedJSHeapSize / (1024 * 1024)); // Convert to MB
    }

    return 0;
  }

  private calculatePerformanceMetrics(): DebugSnapshot['performanceMetrics'] {
    const performanceLogs = this.logs.filter(log => 
      log.context.performance?.duration !== undefined
    );

    if (performanceLogs.length === 0) {
      return {
        averageLoadTime: 0,
        successRate: 0,
        errorCount: 0,
        cacheHitRate: 0,
      };
    }

    const totalDuration = performanceLogs.reduce((sum, log) => 
      sum + (log.context.performance?.duration || 0), 0
    );
    
    const errorCount = this.logs.filter(log => log.level === 'error').length;
    const cacheHits = this.logs.filter(log => 
      log.operation === 'cache-operation' && 
      log.message.includes('hit')
    ).length;

    return {
      averageLoadTime: totalDuration / performanceLogs.length,
      successRate: (performanceLogs.length - errorCount) / performanceLogs.length,
      errorCount,
      cacheHitRate: cacheHits / Math.max(performanceLogs.length, 1),
    };
  }

  private getBrowserInfo(): DebugSnapshot['browserInfo'] {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'Server-side',
        viewport: { width: 0, height: 0 },
      };
    }

    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connectionType: (navigator as any).connection?.effectiveType,
    };
  }

  private persistLogs(): void {
    try {
      const persistData = {
        logs: this.logs.slice(-100), // Only persist recent logs
        sessionId: this.sessionId,
        timestamp: Date.now(),
      };

      localStorage.setItem('loadMoreLogs', JSON.stringify(persistData));
    } catch (error) {
      console.warn('Failed to persist logs to localStorage:', error);
    }
  }

  private loadPersistedLogs(): void {
    try {
      const persistedData = localStorage.getItem('loadMoreLogs');
      if (!persistedData) return;

      const data = JSON.parse(persistedData);
      
      // Check if logs are from current session or recent enough
      const age = Date.now() - data.timestamp;
      if (age < this.config.sessionTimeout) {
        this.logs = data.logs || [];
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
    }
  }

  private clearPersistedLogs(): void {
    try {
      localStorage.removeItem('loadMoreLogs');
    } catch (error) {
      console.warn('Failed to clear persisted logs:', error);
    }
  }
}

// Create and export singleton instance
export const loadMoreLogger = new LoadMoreLogger();

// Export utility functions for easy integration
export const logLoadMoreStart = (
  operation: LoadMoreOperationType,
  strategy: LoadMoreStrategy,
  context?: Partial<PaginationState>
) => loadMoreLogger.logOperationStart(operation, strategy, context);

export const logLoadMoreComplete = (
  operationId: string,
  operation: LoadMoreOperationType,
  success: boolean,
  result?: {
    postsLoaded?: number;
    totalPosts?: number;
    hasMore?: boolean;
    error?: string;
  }
) => loadMoreLogger.logOperationComplete(operationId, operation, success, result);

export const logStateTransition = (
  fromState: LoadMoreState,
  toState: LoadMoreState,
  reason: string,
  context?: Record<string, unknown>
) => loadMoreLogger.logStateTransition(fromState, toState, reason, context);

export const logPaginationUpdate = (
  updateType: 'posts-added' | 'filters-applied' | 'search-applied' | 'reset',
  paginationState: Partial<PaginationState>,
  details?: Record<string, unknown>
) => loadMoreLogger.logPaginationUpdate(updateType, paginationState, details);

export const createDebugSnapshot = (paginationState: PaginationState) => 
  loadMoreLogger.createDebugSnapshot(paginationState);

export const exportLoadMoreLogs = () => loadMoreLogger.exportLogs();
/**
 * 
Load More Debug Tools and State Inspection Utilities
 * 
 * Provides debugging tools, state snapshot functionality, console debugging commands,
 * and performance profiling tools for Load More operations.
 * 
 * Requirements: 5.5 - Comprehensive logging and debugging support
 */

/**
 * State snapshot interface for debugging complex issues
 */
export interface StateSnapshot {
  id: string;
  timestamp: number;
  label: string;
  paginationState: PaginationState;
  stateMachineState: LoadMoreState;
  activeOperations: string[];
  memoryUsage: number;
  performanceMetrics: {
    recentOperations: LoadMoreLogEntry[];
    averageLoadTime: number;
    errorRate: number;
    cacheHitRate: number;
  };
  browserContext: {
    url: string;
    viewport: { width: number; height: number };
    userAgent: string;
    connectionType?: string;
    onlineStatus: boolean;
  };
  networkStatus: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

/**
 * Console debugging command interface
 */
export interface DebugCommand {
  name: string;
  description: string;
  execute: (...args: any[]) => any;
  examples: string[];
}

/**
 * Performance profiling data interface
 */
export interface PerformanceProfile {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  operations: {
    name: string;
    startTime: number;
    endTime: number;
    duration: number;
    memoryBefore: number;
    memoryAfter: number;
    metadata: Record<string, unknown>;
  }[];
  summary: {
    totalOperations: number;
    totalDuration: number;
    averageDuration: number;
    slowestOperation: string;
    fastestOperation: string;
    memoryDelta: number;
  };
}

/**
 * Load More Debug Tools Class
 * Provides comprehensive debugging and state inspection utilities
 */
export class LoadMoreDebugTools {
  private snapshots: StateSnapshot[] = [];
  private debugCommands: Map<string, DebugCommand> = new Map();
  private activeProfiles: Map<string, PerformanceProfile> = new Map();
  private logger: LoadMoreLogger;

  constructor(logger: LoadMoreLogger) {
    this.logger = logger;
    this.initializeDebugCommands();
    this.setupGlobalDebugInterface();
  }

  /**
   * Create a state snapshot for debugging
   */
  createStateSnapshot(
    paginationState: PaginationState,
    stateMachineState: LoadMoreState,
    label: string = 'Debug Snapshot'
  ): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      label,
      paginationState: JSON.parse(JSON.stringify(paginationState)), // Deep copy
      stateMachineState,
      activeOperations: Array.from(this.logger['activeOperations'].keys()),
      memoryUsage: this.getCurrentMemoryUsage(),
      performanceMetrics: {
        recentOperations: this.logger.getRecentLogs(10),
        averageLoadTime: this.calculateAverageLoadTime(),
        errorRate: this.calculateErrorRate(),
        cacheHitRate: this.calculateCacheHitRate(),
      },
      browserContext: this.getBrowserContext(),
      networkStatus: this.getNetworkStatus(),
    };

    this.snapshots.push(snapshot);

    // Limit snapshots
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(-80);
    }

    this.logger['log']('debug', 'cache-operation', `State snapshot created: ${label}`, {
      metadata: {
        snapshotId: snapshot.id,
        memoryUsage: snapshot.memoryUsage,
        activeOperations: snapshot.activeOperations.length,
      },
    });

    return snapshot;
  }

  /**
   * Compare two state snapshots
   */
  compareSnapshots(snapshot1Id: string, snapshot2Id: string): {
    differences: {
      field: string;
      before: any;
      after: any;
      type: 'added' | 'removed' | 'changed';
    }[];
    summary: {
      totalDifferences: number;
      memoryDelta: number;
      timeDelta: number;
      operationsDelta: number;
    };
  } {
    const snapshot1 = this.snapshots.find(s => s.id === snapshot1Id);
    const snapshot2 = this.snapshots.find(s => s.id === snapshot2Id);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    const differences = this.deepCompare(snapshot1, snapshot2);
    
    return {
      differences,
      summary: {
        totalDifferences: differences.length,
        memoryDelta: snapshot2.memoryUsage - snapshot1.memoryUsage,
        timeDelta: snapshot2.timestamp - snapshot1.timestamp,
        operationsDelta: snapshot2.activeOperations.length - snapshot1.activeOperations.length,
      },
    };
  }

  /**
   * Start performance profiling
   */
  startPerformanceProfile(label: string = 'Performance Profile'): string {
    const profileId = this.generateProfileId();
    
    const profile: PerformanceProfile = {
      id: profileId,
      startTime: performance.now(),
      operations: [],
      summary: {
        totalOperations: 0,
        totalDuration: 0,
        averageDuration: 0,
        slowestOperation: '',
        fastestOperation: '',
        memoryDelta: 0,
      },
    };

    this.activeProfiles.set(profileId, profile);

    this.logger['log']('performance', 'cache-operation', `Performance profiling started: ${label}`, {
      metadata: { profileId, label },
    });

    return profileId;
  }

  /**
   * Add operation to performance profile
   */
  profileOperation(
    profileId: string,
    operationName: string,
    operation: () => Promise<any> | any
  ): Promise<any> {
    const profile = this.activeProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Performance profile not found: ${profileId}`);
    }

    const startTime = performance.now();
    const memoryBefore = this.getCurrentMemoryUsage();

    const executeOperation = async () => {
      try {
        const result = await operation();
        const endTime = performance.now();
        const memoryAfter = this.getCurrentMemoryUsage();

        profile.operations.push({
          name: operationName,
          startTime,
          endTime,
          duration: endTime - startTime,
          memoryBefore,
          memoryAfter,
          metadata: { success: true },
        });

        return result;
      } catch (error) {
        const endTime = performance.now();
        const memoryAfter = this.getCurrentMemoryUsage();

        profile.operations.push({
          name: operationName,
          startTime,
          endTime,
          duration: endTime - startTime,
          memoryBefore,
          memoryAfter,
          metadata: { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
        });

        throw error;
      }
    };

    return executeOperation();
  }

  /**
   * Complete performance profiling
   */
  completePerformanceProfile(profileId: string): PerformanceProfile {
    const profile = this.activeProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Performance profile not found: ${profileId}`);
    }

    profile.endTime = performance.now();
    profile.duration = profile.endTime - profile.startTime;

    // Calculate summary
    if (profile.operations.length > 0) {
      const durations = profile.operations.map(op => op.duration);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      
      profile.summary = {
        totalOperations: profile.operations.length,
        totalDuration,
        averageDuration: totalDuration / profile.operations.length,
        slowestOperation: profile.operations.reduce((slowest, op) => 
          op.duration > slowest.duration ? op : slowest
        ).name,
        fastestOperation: profile.operations.reduce((fastest, op) => 
          op.duration < fastest.duration ? op : fastest
        ).name,
        memoryDelta: profile.operations[profile.operations.length - 1]?.memoryAfter - 
                    profile.operations[0]?.memoryBefore || 0,
      };
    }

    this.activeProfiles.delete(profileId);

    this.logger['log']('performance', 'cache-operation', 'Performance profiling completed', {
      performance: {
        startTime: profile.startTime,
        endTime: profile.endTime,
        duration: profile.duration,
      },
      metadata: {
        profileId,
        operationsCount: profile.operations.length,
        averageDuration: profile.summary.averageDuration,
      },
    });

    return profile;
  }

  /**
   * Get all state snapshots
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): StateSnapshot | undefined {
    return this.snapshots.find(s => s.id === id);
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
    this.logger['log']('debug', 'cache-operation', 'All state snapshots cleared');
  }

  /**
   * Export debug data
   */
  exportDebugData(): {
    snapshots: StateSnapshot[];
    logs: LoadMoreLogEntry[];
    performanceProfiles: PerformanceProfile[];
    systemInfo: {
      timestamp: number;
      memoryUsage: number;
      browserInfo: StateSnapshot['browserContext'];
      networkStatus: StateSnapshot['networkStatus'];
    };
  } {
    return {
      snapshots: this.getSnapshots(),
      logs: this.logger['logs'],
      performanceProfiles: Array.from(this.activeProfiles.values()),
      systemInfo: {
        timestamp: Date.now(),
        memoryUsage: this.getCurrentMemoryUsage(),
        browserInfo: this.getBrowserContext(),
        networkStatus: this.getNetworkStatus(),
      },
    };
  }

  /**
   * Initialize debug commands for console access
   */
  private initializeDebugCommands(): void {
    // Snapshot commands
    this.debugCommands.set('snapshot', {
      name: 'snapshot',
      description: 'Create a state snapshot',
      execute: (label?: string) => {
        // This would need access to current pagination state
        console.log('Snapshot command - requires pagination state context');
        return 'Use loadMoreDebugTools.createStateSnapshot(paginationState, stateMachineState, label)';
      },
      examples: ['snapshot("before-load-more")', 'snapshot()'],
    });

    // Log commands
    this.debugCommands.set('logs', {
      name: 'logs',
      description: 'Get recent logs',
      execute: (count: number = 20) => {
        const logs = this.logger.getRecentLogs(count);
        console.table(logs.map(log => ({
          timestamp: new Date(log.timestamp).toISOString(),
          level: log.level,
          operation: log.operation,
          message: log.message,
        })));
        return logs;
      },
      examples: ['logs()', 'logs(50)'],
    });

    // Performance commands
    this.debugCommands.set('perf', {
      name: 'perf',
      description: 'Get performance summary',
      execute: () => {
        const summary = this.logger.getPerformanceSummary();
        console.table(summary);
        return summary;
      },
      examples: ['perf()'],
    });

    // Memory commands
    this.debugCommands.set('memory', {
      name: 'memory',
      description: 'Get current memory usage',
      execute: () => {
        const memory = this.getCurrentMemoryUsage();
        console.log(`Current memory usage: ${memory}MB`);
        return memory;
      },
      examples: ['memory()'],
    });

    // Export commands
    this.debugCommands.set('export', {
      name: 'export',
      description: 'Export all debug data',
      execute: () => {
        const data = this.exportDebugData();
        console.log('Debug data exported to console');
        console.log(data);
        return data;
      },
      examples: ['export()'],
    });

    // Help command
    this.debugCommands.set('help', {
      name: 'help',
      description: 'Show available debug commands',
      execute: () => {
        const commands = Array.from(this.debugCommands.values());
        console.log('Available debug commands:');
        commands.forEach(cmd => {
          console.log(`  ${cmd.name}: ${cmd.description}`);
          console.log(`    Examples: ${cmd.examples.join(', ')}`);
        });
        return commands;
      },
      examples: ['help()'],
    });
  }

  /**
   * Setup global debug interface
   */
  private setupGlobalDebugInterface(): void {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Create global debug object
      (window as any).loadMoreDebug = {
        // Direct access to tools
        tools: this,
        logger: this.logger,
        
        // Quick access commands
        snapshot: (label?: string) => this.debugCommands.get('snapshot')?.execute(label),
        logs: (count?: number) => this.debugCommands.get('logs')?.execute(count),
        perf: () => this.debugCommands.get('perf')?.execute(),
        memory: () => this.debugCommands.get('memory')?.execute(),
        export: () => this.debugCommands.get('export')?.execute(),
        help: () => this.debugCommands.get('help')?.execute(),
        
        // Advanced functions
        compareSnapshots: (id1: string, id2: string) => this.compareSnapshots(id1, id2),
        startProfile: (label?: string) => this.startPerformanceProfile(label),
        completeProfile: (id: string) => this.completePerformanceProfile(id),
      };

      console.log('Load More Debug Tools available at window.loadMoreDebug');
      console.log('Type loadMoreDebug.help() for available commands');
    }
  }

  // Private utility methods

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return 0;
    }

    const memory = (performance as any).memory;
    if (memory) {
      return Math.round(memory.usedJSHeapSize / (1024 * 1024));
    }

    return 0;
  }

  private getBrowserContext(): StateSnapshot['browserContext'] {
    if (typeof window === 'undefined') {
      return {
        url: 'Server-side',
        viewport: { width: 0, height: 0 },
        userAgent: 'Server-side',
        onlineStatus: true,
      };
    }

    return {
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType,
      onlineStatus: navigator.onLine,
    };
  }

  private getNetworkStatus(): StateSnapshot['networkStatus'] {
    if (typeof window === 'undefined' || !(navigator as any).connection) {
      return {};
    }

    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }

  private calculateAverageLoadTime(): number {
    const performanceLogs = this.logger.getRecentLogs(50).filter(log => 
      log.context.performance?.duration !== undefined
    );

    if (performanceLogs.length === 0) return 0;

    const totalDuration = performanceLogs.reduce((sum, log) => 
      sum + (log.context.performance?.duration || 0), 0
    );

    return totalDuration / performanceLogs.length;
  }

  private calculateErrorRate(): number {
    const recentLogs = this.logger.getRecentLogs(100);
    if (recentLogs.length === 0) return 0;

    const errorCount = recentLogs.filter(log => log.level === 'error').length;
    return errorCount / recentLogs.length;
  }

  private calculateCacheHitRate(): number {
    const cacheLogs = this.logger.getRecentLogs(100).filter(log => 
      log.operation === 'cache-operation'
    );

    if (cacheLogs.length === 0) return 0;

    const hitCount = cacheLogs.filter(log => 
      log.message.toLowerCase().includes('hit')
    ).length;

    return hitCount / cacheLogs.length;
  }

  private deepCompare(obj1: any, obj2: any, path: string = ''): any[] {
    const differences: any[] = [];

    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (!(key in obj1)) {
        differences.push({
          field: currentPath,
          before: undefined,
          after: val2,
          type: 'added' as const,
        });
      } else if (!(key in obj2)) {
        differences.push({
          field: currentPath,
          before: val1,
          after: undefined,
          type: 'removed' as const,
        });
      } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        differences.push(...this.deepCompare(val1, val2, currentPath));
      } else if (val1 !== val2) {
        differences.push({
          field: currentPath,
          before: val1,
          after: val2,
          type: 'changed' as const,
        });
      }
    }

    return differences;
  }
}

// Create and export singleton instance
export const loadMoreDebugTools = new LoadMoreDebugTools(loadMoreLogger);

// Export utility functions for easy integration
export const createStateSnapshot = (
  paginationState: PaginationState,
  stateMachineState: LoadMoreState,
  label?: string
) => loadMoreDebugTools.createStateSnapshot(paginationState, stateMachineState, label);

export const compareStateSnapshots = (snapshot1Id: string, snapshot2Id: string) =>
  loadMoreDebugTools.compareSnapshots(snapshot1Id, snapshot2Id);

export const startPerformanceProfile = (label?: string) =>
  loadMoreDebugTools.startPerformanceProfile(label);

export const profileOperation = (
  profileId: string,
  operationName: string,
  operation: () => Promise<any> | any
) => loadMoreDebugTools.profileOperation(profileId, operationName, operation);

export const completePerformanceProfile = (profileId: string) =>
  loadMoreDebugTools.completePerformanceProfile(profileId);

export const exportDebugData = () => loadMoreDebugTools.exportDebugData();