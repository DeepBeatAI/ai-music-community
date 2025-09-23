/**
 * Race Condition Prevention and Request Management System
 * 
 * Implements request queuing system to prevent concurrent Load More requests,
 * request cancellation logic for outdated or duplicate requests, and request
 * timeout handling with appropriate user feedback.
 */

import { RaceConditionError } from '@/types/errors';

/**
 * Request status enumeration
 */
export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

/**
 * Request priority levels
 */
export enum RequestPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Request metadata interface
 */
export interface RequestMetadata {
  id: string;
  type: 'load-more' | 'auto-fetch' | 'client-paginate' | 'search' | 'filter';
  priority: RequestPriority;
  timestamp: number;
  timeout: number;
  retryCount: number;
  maxRetries: number;
  abortController: AbortController;
  context: Record<string, unknown>;
}

/**
 * Request queue item
 */
export interface QueuedRequest {
  metadata: RequestMetadata;
  operation: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  status: RequestStatus;
  startTime?: number;
  endTime?: number;
  error?: Error;
}

/**
 * Request queue configuration
 */
export interface RequestQueueConfig {
  maxConcurrentRequests: number;
  maxQueueSize: number;
  defaultTimeout: number;
  defaultMaxRetries: number;
  enablePriorityQueue: boolean;
  enableDeduplication: boolean;
  cleanupInterval: number;
}

/**
 * Default request queue configuration
 */
export const DEFAULT_REQUEST_QUEUE_CONFIG: RequestQueueConfig = {
  maxConcurrentRequests: 1, // Only one Load More request at a time
  maxQueueSize: 10,
  defaultTimeout: 10000, // 10 seconds
  defaultMaxRetries: 3,
  enablePriorityQueue: true,
  enableDeduplication: true,
  cleanupInterval: 30000, // 30 seconds
};

/**
 * Request deduplication key generator
 */
export type DeduplicationKeyGenerator = (
  type: string,
  context: Record<string, unknown>
) => string;

/**
 * Default deduplication key generator
 */
export const defaultDeduplicationKeyGenerator: DeduplicationKeyGenerator = (type, context) => {
  const contextKey = JSON.stringify(context, Object.keys(context).sort());
  return `${type}:${contextKey}`;
};

/**
 * Request queue manager
 */
export class RequestQueueManager {
  private config: RequestQueueConfig;
  private queue: QueuedRequest[] = [];
  private activeRequests: Map<string, QueuedRequest> = new Map();
  private completedRequests: Map<string, QueuedRequest> = new Map();
  private deduplicationMap: Map<string, string> = new Map();
  private deduplicationKeyGenerator: DeduplicationKeyGenerator;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    config: Partial<RequestQueueConfig> = {},
    deduplicationKeyGenerator?: DeduplicationKeyGenerator
  ) {
    this.config = { ...DEFAULT_REQUEST_QUEUE_CONFIG, ...config };
    this.deduplicationKeyGenerator = deduplicationKeyGenerator || defaultDeduplicationKeyGenerator;
    this.startCleanupTimer();
  }

  /**
   * Add request to queue
   */
  async enqueueRequest<T>(
    type: RequestMetadata['type'],
    operation: () => Promise<T>,
    options: {
      priority?: RequestPriority;
      timeout?: number;
      maxRetries?: number;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const metadata: RequestMetadata = {
      id: this.generateRequestId(),
      type,
      priority: options.priority || RequestPriority.NORMAL,
      timestamp: Date.now(),
      timeout: options.timeout || this.config.defaultTimeout,
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.defaultMaxRetries,
      abortController: new AbortController(),
      context: options.context || {},
    };

    // Check for deduplication
    if (this.config.enableDeduplication) {
      const deduplicationKey = this.deduplicationKeyGenerator(type, metadata.context);
      const existingRequestId = this.deduplicationMap.get(deduplicationKey);
      
      if (existingRequestId) {
        const existingRequest = this.activeRequests.get(existingRequestId) || 
                              this.queue.find(r => r.metadata.id === existingRequestId);
        
        if (existingRequest && existingRequest.status === RequestStatus.IN_PROGRESS) {
          throw new RaceConditionError(
            'DUPLICATE_REQUEST',
            `Duplicate request detected for ${type}`,
            {
              conflictingOperations: [existingRequestId, metadata.id],
              context: { deduplicationKey, existingRequestId },
            }
          );
        }
      }
      
      this.deduplicationMap.set(deduplicationKey, metadata.id);
    }

    // Check queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new RaceConditionError(
        'REQUEST_QUEUE_OVERFLOW',
        'Request queue is full',
        {
          context: { queueSize: this.queue.length, maxQueueSize: this.config.maxQueueSize },
        }
      );
    }

    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        metadata,
        operation: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        status: RequestStatus.PENDING,
      };

      // Add to queue
      if (this.config.enablePriorityQueue) {
        this.insertByPriority(queuedRequest);
      } else {
        this.queue.push(queuedRequest);
      }

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Cancel request by ID
   */
  cancelRequest(requestId: string, reason = 'Request cancelled by user'): boolean {
    // Check active requests
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest) {
      activeRequest.metadata.abortController.abort();
      activeRequest.status = RequestStatus.CANCELLED;
      activeRequest.error = new RaceConditionError('OPERATION_CANCELLED', reason);
      activeRequest.reject(activeRequest.error);
      this.activeRequests.delete(requestId);
      return true;
    }

    // Check queued requests
    const queueIndex = this.queue.findIndex(r => r.metadata.id === requestId);
    if (queueIndex !== -1) {
      const queuedRequest = this.queue[queueIndex];
      queuedRequest.status = RequestStatus.CANCELLED;
      queuedRequest.error = new RaceConditionError('OPERATION_CANCELLED', reason);
      queuedRequest.reject(queuedRequest.error);
      this.queue.splice(queueIndex, 1);
      return true;
    }

    return false;
  }

  /**
   * Cancel all requests of a specific type
   */
  cancelRequestsByType(type: RequestMetadata['type'], reason = 'Requests cancelled'): number {
    let cancelledCount = 0;

    // Cancel active requests
    for (const [id, request] of this.activeRequests.entries()) {
      if (request.metadata.type === type) {
        if (this.cancelRequest(id, reason)) {
          cancelledCount++;
        }
      }
    }

    // Cancel queued requests
    const queuedRequests = this.queue.filter(r => r.metadata.type === type);
    for (const request of queuedRequests) {
      if (this.cancelRequest(request.metadata.id, reason)) {
        cancelledCount++;
      }
    }

    return cancelledCount;
  }

  /**
   * Cancel all requests
   */
  cancelAllRequests(reason = 'All requests cancelled'): number {
    let cancelledCount = 0;

    // Cancel active requests
    for (const id of this.activeRequests.keys()) {
      if (this.cancelRequest(id, reason)) {
        cancelledCount++;
      }
    }

    // Cancel queued requests
    const queuedRequests = [...this.queue];
    for (const request of queuedRequests) {
      if (this.cancelRequest(request.metadata.id, reason)) {
        cancelledCount++;
      }
    }

    return cancelledCount;
  }

  /**
   * Get request status
   */
  getRequestStatus(requestId: string): RequestStatus | null {
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest) {
      return activeRequest.status;
    }

    const queuedRequest = this.queue.find(r => r.metadata.id === requestId);
    if (queuedRequest) {
      return queuedRequest.status;
    }

    const completedRequest = this.completedRequests.get(requestId);
    if (completedRequest) {
      return completedRequest.status;
    }

    return null;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    queueSize: number;
    activeRequests: number;
    completedRequests: number;
    totalProcessed: number;
    averageProcessingTime: number;
  } {
    const completedRequestsArray = Array.from(this.completedRequests.values());
    const processingTimes = completedRequestsArray
      .filter(r => r.startTime && r.endTime)
      .map(r => r.endTime! - r.startTime!);
    
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    return {
      queueSize: this.queue.length,
      activeRequests: this.activeRequests.size,
      completedRequests: this.completedRequests.size,
      totalProcessed: this.completedRequests.size,
      averageProcessingTime,
    };
  }

  /**
   * Clear completed requests
   */
  clearCompletedRequests(): void {
    this.completedRequests.clear();
  }

  /**
   * Destroy queue manager
   */
  destroy(): void {
    this.cancelAllRequests('Queue manager destroyed');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.queue = [];
    this.activeRequests.clear();
    this.completedRequests.clear();
    this.deduplicationMap.clear();
  }

  private async processQueue(): Promise<void> {
    // Check if we can process more requests
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }

    // Get next request from queue
    const nextRequest = this.queue.shift();
    if (!nextRequest) {
      return;
    }

    // Move to active requests
    this.activeRequests.set(nextRequest.metadata.id, nextRequest);
    nextRequest.status = RequestStatus.IN_PROGRESS;
    nextRequest.startTime = Date.now();

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          nextRequest.metadata.abortController.abort();
          reject(new RaceConditionError(
            'RESOURCE_LOCK_TIMEOUT',
            `Request timeout after ${nextRequest.metadata.timeout}ms`
          ));
        }, nextRequest.metadata.timeout);
      });

      // Execute operation with timeout
      const result = await Promise.race([
        nextRequest.operation(),
        timeoutPromise,
      ]);

      // Request completed successfully
      nextRequest.status = RequestStatus.COMPLETED;
      nextRequest.endTime = Date.now();
      nextRequest.resolve(result);

    } catch (error) {
      // Handle request failure
      nextRequest.error = error as Error;
      
      if (error instanceof Error && error.name === 'AbortError') {
        nextRequest.status = RequestStatus.CANCELLED;
      } else if (error instanceof RaceConditionError && error.errorType === 'RESOURCE_LOCK_TIMEOUT') {
        nextRequest.status = RequestStatus.TIMEOUT;
      } else {
        nextRequest.status = RequestStatus.FAILED;
      }

      nextRequest.endTime = Date.now();
      nextRequest.reject(error as Error);
    } finally {
      // Move from active to completed
      this.activeRequests.delete(nextRequest.metadata.id);
      this.completedRequests.set(nextRequest.metadata.id, nextRequest);

      // Remove from deduplication map
      if (this.config.enableDeduplication) {
        const deduplicationKey = this.deduplicationKeyGenerator(
          nextRequest.metadata.type,
          nextRequest.metadata.context
        );
        this.deduplicationMap.delete(deduplicationKey);
      }

      // Process next request in queue
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private insertByPriority(request: QueuedRequest): void {
    const insertIndex = this.queue.findIndex(
      r => r.metadata.priority < request.metadata.priority
    );
    
    if (insertIndex === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(insertIndex, 0, request);
    }
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldRequests();
    }, this.config.cleanupInterval);
  }

  private cleanupOldRequests(): void {
    const cutoffTime = Date.now() - (this.config.cleanupInterval * 2);
    
    // Clean up completed requests older than cutoff
    for (const [id, request] of this.completedRequests.entries()) {
      if (request.metadata.timestamp < cutoffTime) {
        this.completedRequests.delete(id);
      }
    }
  }
}

/**
 * Concurrent request detector
 */
export class ConcurrentRequestDetector {
  private activeOperations: Map<string, Set<string>> = new Map();

  /**
   * Register operation start
   */
  registerOperation(operationType: string, operationId: string): void {
    if (!this.activeOperations.has(operationType)) {
      this.activeOperations.set(operationType, new Set());
    }
    
    const operations = this.activeOperations.get(operationType)!;
    
    if (operations.size > 0) {
      throw new RaceConditionError(
        'CONCURRENT_REQUEST',
        `Concurrent ${operationType} operation detected`,
        {
          conflictingOperations: Array.from(operations).concat(operationId),
        }
      );
    }
    
    operations.add(operationId);
  }

  /**
   * Unregister operation
   */
  unregisterOperation(operationType: string, operationId: string): void {
    const operations = this.activeOperations.get(operationType);
    if (operations) {
      operations.delete(operationId);
      if (operations.size === 0) {
        this.activeOperations.delete(operationType);
      }
    }
  }

  /**
   * Check if operation type is active
   */
  isOperationActive(operationType: string): boolean {
    const operations = this.activeOperations.get(operationType);
    return operations ? operations.size > 0 : false;
  }

  /**
   * Get active operations
   */
  getActiveOperations(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [type, operations] of this.activeOperations.entries()) {
      result[type] = Array.from(operations);
    }
    return result;
  }

  /**
   * Clear all operations
   */
  clearAllOperations(): void {
    this.activeOperations.clear();
  }
}

/**
 * Global request queue manager instance
 */
export const globalRequestQueue = new RequestQueueManager();

/**
 * Global concurrent request detector instance
 */
export const globalConcurrentRequestDetector = new ConcurrentRequestDetector();

/**
 * Utility functions for request management
 */
export const RequestManagementUtils = {
  /**
   * Execute operation with race condition protection
   */
  async executeWithRaceProtection<T>(
    operationType: string,
    operation: () => Promise<T>,
    options?: {
      priority?: RequestPriority;
      timeout?: number;
      context?: Record<string, unknown>;
    }
  ): Promise<T> {
    return globalRequestQueue.enqueueRequest(
      operationType as RequestMetadata['type'],
      operation,
      options
    );
  },

  /**
   * Cancel all Load More requests
   */
  cancelAllLoadMoreRequests(): number {
    return globalRequestQueue.cancelRequestsByType('load-more', 'New Load More request initiated');
  },

  /**
   * Check if Load More is in progress
   */
  isLoadMoreInProgress(): boolean {
    return globalConcurrentRequestDetector.isOperationActive('load-more');
  },

  /**
   * Get request queue statistics
   */
  getQueueStats() {
    return globalRequestQueue.getQueueStats();
  },
};

/**
 * Factory function to create request queue manager
 */
export function createRequestQueueManager(
  config?: Partial<RequestQueueConfig>,
  deduplicationKeyGenerator?: DeduplicationKeyGenerator
): RequestQueueManager {
  return new RequestQueueManager(config, deduplicationKeyGenerator);
}

/**
 * Factory function to create concurrent request detector
 */
export function createConcurrentRequestDetector(): ConcurrentRequestDetector {
  return new ConcurrentRequestDetector();
}