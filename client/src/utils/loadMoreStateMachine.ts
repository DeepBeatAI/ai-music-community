/**
 * Load More State Machine - FIXED TypeScript Issues
 * 
 * Manages state transitions for Load More functionality with proper validation
 * and error recovery mechanisms. Ensures consistent behavior across different
 * pagination modes and prevents invalid state transitions.
 */

import { LoadMoreState, StateValidationResult } from '@/types/pagination';

/**
 * Valid state transitions mapping
 * Each state maps to an array of valid next states
 */
const VALID_TRANSITIONS: Record<LoadMoreState, LoadMoreState[]> = {
  idle: ['loading-server', 'loading-client', 'auto-fetching', 'complete'],
  'loading-server': ['idle', 'complete', 'error'],
  'loading-client': ['idle', 'complete', 'error'],
  'auto-fetching': ['idle', 'complete', 'error'],
  complete: ['idle', 'loading-server', 'loading-client', 'auto-fetching'],
  error: ['idle', 'loading-server', 'loading-client', 'auto-fetching'],
};

/**
 * State transition context for validation and logging
 */
interface StateTransitionContext {
  reason?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  previousState: LoadMoreState;
}

/**
 * State persistence data for recovery
 */
interface StatePersistenceData {
  currentState: LoadMoreState;
  lastValidState: LoadMoreState;
  transitionHistory: StateTransitionContext[];
  errorCount: number;
  lastErrorTimestamp: number;
}

/**
 * Load More State Machine class
 * Manages state transitions with validation, persistence, and recovery
 */
export class LoadMoreStateMachine {
  private currentState: LoadMoreState = 'idle';
  private lastValidState: LoadMoreState = 'idle';
  private transitionHistory: StateTransitionContext[] = [];
  private errorCount: number = 0;
  private lastErrorTimestamp: number = 0;
  private maxHistorySize: number = 50;
  private maxErrorCount: number = 5;
  private errorResetTimeout: number = 300000; // 5 minutes

  constructor(initialState: LoadMoreState = 'idle') {
    this.currentState = initialState;
    this.lastValidState = initialState;
    this.loadPersistedState();
  }

  /**
   * Get current state
   */
  getCurrentState(): LoadMoreState {
    return this.currentState;
  }

  /**
   * Get last valid state (for recovery)
   */
  getLastValidState(): LoadMoreState {
    return this.lastValidState;
  }

  /**
   * Check if transition to target state is valid
   */
  canTransition(targetState: LoadMoreState): boolean {
    const validNextStates = VALID_TRANSITIONS[this.currentState];
    return validNextStates.includes(targetState);
  }

  /**
   * Perform state transition with validation
   */
  transition(
    targetState: LoadMoreState, 
    context?: Partial<StateTransitionContext>
  ): boolean {
    // Validate transition
    if (!this.canTransition(targetState)) {
      console.warn(
        `Invalid state transition: ${this.currentState} -> ${targetState}`
      );
      return false;
    }

    // Check error count limits
    if (targetState === 'error' && this.isErrorLimitReached()) {
      console.error('Error limit reached, forcing recovery state');
      this.forceRecovery();
      return false;
    }

    // Record transition
    const transitionContext: StateTransitionContext = {
      reason: context?.reason || 'Manual transition',
      metadata: context?.metadata || {},
      timestamp: Date.now(),
      previousState: this.currentState,
    };

    // Update state
    const previousState = this.currentState;
    this.currentState = targetState;

    // Update last valid state (don't update for error states)
    if (targetState !== 'error') {
      this.lastValidState = targetState;
    }

    // Handle error state
    if (targetState === 'error') {
      this.errorCount++;
      this.lastErrorTimestamp = Date.now();
    } else {
      // Reset error count on successful transitions
      this.resetErrorCount();
    }

    // Add to history
    this.addToHistory(transitionContext);

    // Persist state
    this.persistState();

    // Log transition
    console.log(
      `State transition: ${previousState} -> ${targetState}`,
      transitionContext
    );

    return true;
  }

  /**
   * Force transition to idle state (recovery mechanism)
   */
  forceRecovery(): void {
    console.log('Forcing state recovery to idle');
    
    const recoveryContext: StateTransitionContext = {
      reason: 'Force recovery',
      metadata: { 
        previousState: this.currentState,
        errorCount: this.errorCount,
        lastError: this.lastErrorTimestamp 
      },
      timestamp: Date.now(),
      previousState: this.currentState,
    };

    this.currentState = 'idle';
    this.lastValidState = 'idle';
    this.resetErrorCount();
    this.addToHistory(recoveryContext);
    this.persistState();
  }

  /**
   * Recover to last valid state
   */
  recoverToLastValidState(): boolean {
    if (this.lastValidState === this.currentState) {
      return true; // Already in valid state
    }

    console.log(`Recovering to last valid state: ${this.lastValidState}`);
    
    const recoveryContext: StateTransitionContext = {
      reason: 'Recovery to last valid state',
      metadata: { 
        errorState: this.currentState,
        targetState: this.lastValidState 
      },
      timestamp: Date.now(),
      previousState: this.currentState,
    };

    this.currentState = this.lastValidState;
    this.addToHistory(recoveryContext);
    this.persistState();
    
    return true;
  }

  /**
   * Validate current state consistency
   */
  validateState(): StateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if current state is valid
    if (!Object.keys(VALID_TRANSITIONS).includes(this.currentState)) {
      errors.push(`Invalid current state: ${this.currentState}`);
    }

    // Check error count
    if (this.errorCount > this.maxErrorCount) {
      errors.push(`Error count exceeded limit: ${this.errorCount}`);
    }

    // Check for stuck states - look for repeated same-state cycles
    const recentTransitions = this.getRecentTransitions(10);
    const idleTransitions = recentTransitions.filter(
      t => t.previousState === 'idle'
    );
    
    if (idleTransitions.length >= 4) {
      warnings.push('Potential stuck state detected');
    }

    // Check for rapid error transitions - look for error states in recent history
    const errorTransitions = recentTransitions.filter(
      t => this.currentState === 'error' || t.previousState === 'error'
    );
    
    if (errorTransitions.length >= 2) {
      warnings.push('Rapid error transitions detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get transition history
   */
  getTransitionHistory(): StateTransitionContext[] {
    return [...this.transitionHistory];
  }

  /**
   * Get recent transitions
   */
  getRecentTransitions(count: number = 10): StateTransitionContext[] {
    return this.transitionHistory.slice(-count);
  }

  /**
   * Clear transition history
   */
  clearHistory(): void {
    this.transitionHistory = [];
    this.persistState();
  }

  /**
   * Reset state machine to initial state
   */
  reset(): void {
    this.currentState = 'idle';
    this.lastValidState = 'idle';
    this.transitionHistory = [];
    this.errorCount = 0;
    this.lastErrorTimestamp = 0;
    this.persistState();
    
    console.log('State machine reset to initial state');
  }

  /**
   * Get state machine statistics
   */
  getStatistics(): {
    currentState: LoadMoreState;
    lastValidState: LoadMoreState;
    errorCount: number;
    transitionCount: number;
    uptime: number;
  } {
    const firstTransition = this.transitionHistory[0];
    const uptime = firstTransition 
      ? Date.now() - firstTransition.timestamp 
      : 0;

    return {
      currentState: this.currentState,
      lastValidState: this.lastValidState,
      errorCount: this.errorCount,
      transitionCount: this.transitionHistory.length,
      uptime,
    };
  }

  /**
   * Check if state machine is currently loading
   */
  isLoading(): boolean {
    return ['loading-server', 'loading-client', 'auto-fetching'].includes(this.currentState);
  }

  /**
   * Check if Load More operation can be performed
   */
  canLoadMore(): boolean {
    return ['idle', 'complete', 'error'].includes(this.currentState);
  }

  // Private methods

  private isErrorLimitReached(): boolean {
    return this.errorCount >= this.maxErrorCount;
  }

  private resetErrorCount(): void {
    // Only reset if enough time has passed since last error
    const timeSinceLastError = Date.now() - this.lastErrorTimestamp;
    if (timeSinceLastError > this.errorResetTimeout) {
      this.errorCount = 0;
    }
  }

  private addToHistory(context: StateTransitionContext): void {
    this.transitionHistory.push(context);
    
    // Trim history if it gets too long
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory = this.transitionHistory.slice(-this.maxHistorySize);
    }
  }

  private persistState(): void {
    // FIXED: Check for localStorage availability and add error handling
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return; // Skip persistence on server-side or when localStorage is not available
    }

    try {
      const persistenceData: StatePersistenceData = {
        currentState: this.currentState,
        lastValidState: this.lastValidState,
        transitionHistory: this.transitionHistory.slice(-10), // Only persist recent history
        errorCount: this.errorCount,
        lastErrorTimestamp: this.lastErrorTimestamp,
      };

      localStorage.setItem(
        'loadMoreStateMachine', 
        JSON.stringify(persistenceData)
      );
    } catch (error) {
      console.warn('Failed to persist state machine data:', error);
    }
  }

  private loadPersistedState(): void {
    // FIXED: Check for localStorage availability and add error handling
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return; // Skip loading on server-side or when localStorage is not available
    }

    try {
      const persistedData = localStorage.getItem('loadMoreStateMachine');
      if (!persistedData) return;

      const data: StatePersistenceData = JSON.parse(persistedData);
      
      // Validate persisted data
      if (data.currentState && Object.keys(VALID_TRANSITIONS).includes(data.currentState)) {
        this.currentState = data.currentState;
      }
      
      if (data.lastValidState && Object.keys(VALID_TRANSITIONS).includes(data.lastValidState)) {
        this.lastValidState = data.lastValidState;
      }
      
      if (Array.isArray(data.transitionHistory)) {
        this.transitionHistory = data.transitionHistory;
      }
      
      if (typeof data.errorCount === 'number') {
        this.errorCount = data.errorCount;
      }
      
      if (typeof data.lastErrorTimestamp === 'number') {
        this.lastErrorTimestamp = data.lastErrorTimestamp;
      }

      console.log('Loaded persisted state machine data');
    } catch (error) {
      console.warn('Failed to load persisted state machine data:', error);
      // Continue with default state
    }
  }
}

/**
 * Create a new state machine instance
 */
export function createLoadMoreStateMachine(
  initialState: LoadMoreState = 'idle'
): LoadMoreStateMachine {
  return new LoadMoreStateMachine(initialState);
}

/**
 * Utility function to check if a state transition is valid
 */
export function isValidTransition(
  fromState: LoadMoreState, 
  toState: LoadMoreState
): boolean {
  const validNextStates = VALID_TRANSITIONS[fromState];
  return validNextStates.includes(toState);
}

/**
 * Get all valid next states for a given state
 */
export function getValidNextStates(state: LoadMoreState): LoadMoreState[] {
  return [...VALID_TRANSITIONS[state]];
}
