/**
 * Load More State Machine Tests
 * 
 * Comprehensive test suite for the LoadMoreStateMachine class
 * covering state transitions, validation, persistence, and recovery.
 */

import { LoadMoreStateMachine, createLoadMoreStateMachine, isValidTransition, getValidNextStates } from '../loadMoreStateMachine';
import { LoadMoreState } from '@/types/pagination';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('LoadMoreStateMachine', () => {
  let stateMachine: LoadMoreStateMachine;

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    
    // Create fresh state machine
    stateMachine = new LoadMoreStateMachine();
  });

  describe('Initialization', () => {
    it('should initialize with idle state by default', () => {
      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(stateMachine.getLastValidState()).toBe('idle');
    });

    it('should initialize with custom state', () => {
      const customStateMachine = new LoadMoreStateMachine('complete');
      expect(customStateMachine.getCurrentState()).toBe('complete');
      expect(customStateMachine.getLastValidState()).toBe('complete');
    });

    it('should create state machine using factory function', () => {
      const factoryStateMachine = createLoadMoreStateMachine('loading-server');
      expect(factoryStateMachine.getCurrentState()).toBe('loading-server');
    });
  });

  describe('State Transitions', () => {
    it('should allow valid transitions from idle', () => {
      expect(stateMachine.canTransition('loading-server')).toBe(true);
      expect(stateMachine.canTransition('loading-client')).toBe(true);
      expect(stateMachine.canTransition('auto-fetching')).toBe(true);
      expect(stateMachine.canTransition('complete')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      // From idle, cannot go directly to error without a loading state
      expect(stateMachine.canTransition('error')).toBe(false);
    });

    it('should successfully perform valid transitions', () => {
      const success = stateMachine.transition('loading-server', {
        reason: 'User clicked Load More',
        metadata: { page: 2 }
      });
      
      expect(success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('loading-server');
      expect(stateMachine.getLastValidState()).toBe('loading-server');
    });

    it('should reject invalid transitions and maintain current state', () => {
      stateMachine.transition('loading-server');
      const currentState = stateMachine.getCurrentState();
      
      const success = stateMachine.transition('auto-fetching'); // Invalid from loading-server
      
      expect(success).toBe(false);
      expect(stateMachine.getCurrentState()).toBe(currentState);
    });

    it('should update last valid state correctly', () => {
      stateMachine.transition('loading-server');
      expect(stateMachine.getLastValidState()).toBe('loading-server');
      
      stateMachine.transition('error');
      expect(stateMachine.getCurrentState()).toBe('error');
      expect(stateMachine.getLastValidState()).toBe('loading-server'); // Should not update for error
    });
  });

  describe('Error Handling', () => {
    it('should track error count', () => {
      stateMachine.transition('loading-server');
      stateMachine.transition('error');
      
      const stats = stateMachine.getStatistics();
      expect(stats.errorCount).toBe(1);
    });

    it('should force recovery when error limit is reached', () => {
      // Simulate multiple errors
      for (let i = 0; i < 6; i++) {
        stateMachine.transition('loading-server');
        stateMachine.transition('error');
        stateMachine.transition('idle'); // Reset to try again
      }
      
      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(stateMachine.getLastValidState()).toBe('idle');
    });

    it('should recover to last valid state', () => {
      stateMachine.transition('loading-server');
      stateMachine.transition('complete');
      stateMachine.transition('loading-client');
      stateMachine.transition('error');
      
      const recovered = stateMachine.recoverToLastValidState();
      
      expect(recovered).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('loading-client');
    });

    it('should force recovery to idle state', () => {
      stateMachine.transition('loading-server');
      stateMachine.transition('error');
      
      stateMachine.forceRecovery();
      
      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(stateMachine.getLastValidState()).toBe('idle');
    });
  });

  describe('State Validation', () => {
    it('should validate healthy state', () => {
      const validation = stateMachine.validateState();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect stuck states', () => {
      // Simulate stuck state by staying in same state
      for (let i = 0; i < 4; i++) {
        stateMachine.transition('loading-server');
        stateMachine.transition('idle');
      }
      
      const validation = stateMachine.validateState();
      expect(validation.warnings).toContain('Potential stuck state detected');
    });

    it('should detect rapid error transitions', () => {
      // Simulate rapid errors
      stateMachine.transition('loading-server');
      stateMachine.transition('error');
      stateMachine.transition('idle');
      stateMachine.transition('loading-client');
      stateMachine.transition('error');
      
      const validation = stateMachine.validateState();
      expect(validation.warnings).toContain('Rapid error transitions detected');
    });
  });

  describe('History Management', () => {
    it('should track transition history', () => {
      stateMachine.transition('loading-server', { reason: 'Test transition' });
      stateMachine.transition('complete');
      
      const history = stateMachine.getTransitionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].reason).toBe('Test transition');
      expect(history[0].previousState).toBe('idle');
    });

    it('should get recent transitions', () => {
      // Add multiple transitions
      for (let i = 0; i < 5; i++) {
        stateMachine.transition('loading-server');
        stateMachine.transition('idle');
      }
      
      const recent = stateMachine.getRecentTransitions(3);
      expect(recent).toHaveLength(3);
    });

    it('should clear history', () => {
      stateMachine.transition('loading-server');
      stateMachine.transition('complete');
      
      stateMachine.clearHistory();
      
      const history = stateMachine.getTransitionHistory();
      expect(history).toHaveLength(0);
    });

    it('should limit history size', () => {
      // Add more transitions than the max history size
      for (let i = 0; i < 60; i++) {
        stateMachine.transition('loading-server');
        stateMachine.transition('idle');
      }
      
      const history = stateMachine.getTransitionHistory();
      expect(history.length).toBeLessThanOrEqual(50); // Max history size
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      stateMachine.transition('loading-server');
      stateMachine.transition('error');
      stateMachine.transition('idle');
      
      const stats = stateMachine.getStatistics();
      
      expect(stats.currentState).toBe('idle');
      expect(stats.lastValidState).toBe('idle'); // Updated to idle after recovery
      expect(stats.errorCount).toBe(1);
      expect(stats.transitionCount).toBe(3);
      expect(stats.uptime).toBeGreaterThanOrEqual(0); // Allow for 0 uptime in fast tests
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      stateMachine.transition('loading-server');
      stateMachine.transition('error');
      
      stateMachine.reset();
      
      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(stateMachine.getLastValidState()).toBe('idle');
      expect(stateMachine.getTransitionHistory()).toHaveLength(0);
      expect(stateMachine.getStatistics().errorCount).toBe(0);
    });
  });

  describe('Persistence', () => {
    it('should attempt to persist state on transitions', () => {
      stateMachine.transition('loading-server');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'loadMoreStateMachine',
        expect.any(String)
      );
    });

    it('should handle persistence errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      // Should not throw error
      expect(() => {
        stateMachine.transition('loading-server');
      }).not.toThrow();
    });

    it('should load persisted state on initialization', () => {
      const persistedData = {
        currentState: 'complete',
        lastValidState: 'complete',
        transitionHistory: [],
        errorCount: 0,
        lastErrorTimestamp: 0,
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(persistedData));
      
      const newStateMachine = new LoadMoreStateMachine();
      expect(newStateMachine.getCurrentState()).toBe('complete');
    });

    it('should handle corrupted persisted data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw error and use default state
      expect(() => {
        const newStateMachine = new LoadMoreStateMachine();
        expect(newStateMachine.getCurrentState()).toBe('idle');
      }).not.toThrow();
    });
  });
});

describe('Utility Functions', () => {
  describe('isValidTransition', () => {
    it('should correctly identify valid transitions', () => {
      expect(isValidTransition('idle', 'loading-server')).toBe(true);
      expect(isValidTransition('loading-server', 'complete')).toBe(true);
      expect(isValidTransition('error', 'idle')).toBe(true);
    });

    it('should correctly identify invalid transitions', () => {
      expect(isValidTransition('idle', 'error')).toBe(false);
      expect(isValidTransition('loading-server', 'auto-fetching')).toBe(false);
      expect(isValidTransition('complete', 'error')).toBe(false);
    });
  });

  describe('getValidNextStates', () => {
    it('should return correct valid next states', () => {
      const idleNextStates = getValidNextStates('idle');
      expect(idleNextStates).toContain('loading-server');
      expect(idleNextStates).toContain('loading-client');
      expect(idleNextStates).toContain('auto-fetching');
      expect(idleNextStates).toContain('complete');
      expect(idleNextStates).not.toContain('error');
    });

    it('should return array for all states', () => {
      const states: LoadMoreState[] = ['idle', 'loading-server', 'loading-client', 'auto-fetching', 'complete', 'error'];
      
      states.forEach(state => {
        const nextStates = getValidNextStates(state);
        expect(Array.isArray(nextStates)).toBe(true);
        expect(nextStates.length).toBeGreaterThan(0);
      });
    });
  });
});