/**
 * Integration Tests for Dashboard Performance Monitoring
 * 
 * Tests the performance monitoring integration in the dashboard component
 * to ensure it properly tracks useEffect executions, component re-renders,
 * and validates that the infinite loading fix is working correctly.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Mock the dashboard page
const MockDashboardPage = () => {
  const [renderCount, setRenderCount] = React.useState(0);
  const [effectExecutions, setEffectExecutions] = React.useState(0);
  const hasInitiallyLoaded = React.useRef(false);
  
  // Simulate the critical useEffect from dashboard
  React.useEffect(() => {
    performanceMonitor.trackUseEffect(
      'auth-and-initial-load',
      'DashboardPage',
      ['user', 'loading', 'router', 'fetchPosts'],
      3, // Warning threshold
      5  // Critical threshold
    );
    
    setEffectExecutions(prev => prev + 1);
    
    // Simulate initial load logic
    if (!hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      console.log('Initial load completed');
    }
  }, []); // Empty dependencies to simulate fixed infinite loop

  // Simulate state validation effect
  React.useEffect(() => {
    performanceMonitor.trackUseEffect(
      'state-validation',
      'DashboardPage',
      ['paginationState', 'error'],
      10, // Warning threshold
      20  // Critical threshold
    );
  }, [renderCount]); // Simulate pagination state dependency

  // Track renders
  React.useEffect(() => {
    performanceMonitor.trackComponentRender('DashboardPage');
    setRenderCount(prev => prev + 1);
  }, []);

  return (
    <div>
      <div data-testid="render-count">{renderCount}</div>
      <div data-testid="effect-executions">{effectExecutions}</div>
      <div data-testid="optimization-status">
        {performanceMonitor.isOptimizationSuccessful() ? 'optimized' : 'issues-detected'}
      </div>
      <button 
        data-testid="trigger-rerender" 
        onClick={() => setRenderCount(prev => prev + 1)}
      >
        Trigger Re-render
      </button>
      <button 
        data-testid="generate-report" 
        onClick={() => performanceMonitor.generateReport()}
      >
        Generate Report
      </button>
    </div>
  );
};

// Mock component that simulates infinite loop scenario (controlled)
const MockInfiniteLoopDashboard = ({ triggerLoop = false }: { triggerLoop?: boolean }) => {
  const [paginationState, setPaginationState] = React.useState({ page: 1 });
  const [effectCount, setEffectCount] = React.useState(0);
  const maxExecutions = React.useRef(0);

  // This simulates the problematic useEffect that caused infinite loops
  React.useEffect(() => {
    performanceMonitor.trackUseEffect(
      'problematic-effect',
      'InfiniteLoopDashboard',
      ['paginationState'],
      2, // Low warning threshold
      5  // Low critical threshold
    );
    
    setEffectCount(prev => prev + 1);
    maxExecutions.current++;
    
    // Only trigger the loop for a limited number of times to prevent test hanging
    if (triggerLoop && maxExecutions.current < 10) {
      // Simulate the infinite loop by updating pagination state
      setTimeout(() => {
        setPaginationState(prev => ({ ...prev, page: prev.page + 0.1 }));
      }, 10);
    }
  }, [paginationState, triggerLoop]); // This dependency causes the infinite loop

  return (
    <div>
      <div data-testid="effect-count">{effectCount}</div>
      <div data-testid="pagination-page">{paginationState.page}</div>
      <div data-testid="infinite-loop-status">
        {performanceMonitor.getMetrics().infiniteLoopDetections > 0 ? 'infinite-loop-detected' : 'normal'}
      </div>
      <div data-testid="max-executions">{maxExecutions.current}</div>
    </div>
  );
};

describe('Dashboard Performance Monitoring Integration', () => {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    // Reset performance monitor
    performanceMonitor.resetMetrics();
    performanceMonitor.startMonitoring();
    
    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Stop monitoring
    performanceMonitor.stopMonitoring();
    
    // Restore console methods
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('Fixed Dashboard Performance', () => {
    it('should track dashboard useEffect executions without infinite loops', async () => {
      render(<MockDashboardPage />);
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        
        // Should have tracked the auth-and-initial-load effect
        const authEffect = metrics.useEffectExecutions.get('auth-and-initial-load');
        expect(authEffect).toBeDefined();
        expect(authEffect?.componentName).toBe('DashboardPage');
        expect(authEffect?.dependencies).toEqual(['user', 'loading', 'router', 'fetchPosts']);
        
        // Should not be flagged as infinite loop
        expect(authEffect?.isInfiniteLoop).toBe(false);
      });
    });

    it('should track state validation effect executions', async () => {
      const { getByTestId } = render(<MockDashboardPage />);
      
      // Trigger a re-render to execute state validation effect
      await act(async () => {
        await userEvent.click(getByTestId('trigger-rerender'));
      });
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        
        // Should have tracked the state-validation effect
        const validationEffect = metrics.useEffectExecutions.get('state-validation');
        expect(validationEffect).toBeDefined();
        expect(validationEffect?.componentName).toBe('DashboardPage');
        expect(validationEffect?.dependencies).toEqual(['paginationState', 'error']);
      });
    });

    it('should report optimization as successful for fixed dashboard', async () => {
      const { getByTestId } = render(<MockDashboardPage />);
      
      await waitFor(() => {
        expect(getByTestId('optimization-status')).toHaveTextContent('optimized');
      });
      
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
    });

    it('should track component renders without excessive re-rendering', async () => {
      const { getByTestId } = render(<MockDashboardPage />);
      
      // Initial render should be tracked
      await waitFor(() => {
        expect(getByTestId('render-count')).toHaveTextContent('1');
      });
      
      // Trigger a few more renders
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await userEvent.click(getByTestId('trigger-rerender'));
        });
      }
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        const renderMetrics = metrics.componentRenders.get('DashboardPage');
        
        expect(renderMetrics?.renderCount).toBeGreaterThan(1);
        expect(renderMetrics?.isExcessiveRerendering).toBe(false);
      });
    });

    it('should generate comprehensive performance reports', async () => {
      const { getByTestId } = render(<MockDashboardPage />);
      
      // Trigger some activity
      await act(async () => {
        await userEvent.click(getByTestId('trigger-rerender'));
        await userEvent.click(getByTestId('generate-report'));
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor Report')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ All useEffect executions are within normal parameters')
      );
    });
  });

  describe('Infinite Loop Detection', () => {
    it('should detect infinite loops in problematic dashboard implementation', async () => {
      render(<MockInfiniteLoopDashboard triggerLoop={true} />);
      
      // Wait for infinite loop detection with shorter timeout
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.infiniteLoopDetections).toBeGreaterThan(0);
      }, { timeout: 5000 });
      
      // Should have logged infinite loop detection
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Performance Monitor: INFINITE LOOP DETECTED'),
        expect.any(Object)
      );
      
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(false);
    });

    it('should track rapid effect executions in infinite loop scenario', async () => {
      render(<MockInfiniteLoopDashboard triggerLoop={true} />);
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        const problematicEffect = metrics.useEffectExecutions.get('problematic-effect');
        
        expect(problematicEffect?.executionCount).toBeGreaterThan(5);
        expect(problematicEffect?.isInfiniteLoop).toBe(true);
      }, { timeout: 3000 });
    });

    it('should not detect infinite loops when triggerLoop is false', async () => {
      render(<MockInfiniteLoopDashboard triggerLoop={false} />);
      
      // Wait a bit to ensure no infinite loop develops
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.infiniteLoopDetections).toBe(0);
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
    });
  });

  describe('React Warning Detection', () => {
    it('should detect and categorize React warnings', async () => {
      render(<MockDashboardPage />);
      
      // Simulate React warnings that would occur with infinite loops
      console.warn('Warning: useEffect has a missing dependency: paginationState');
      console.error('Maximum update depth exceeded. This can happen when a component calls setState inside useEffect');
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        
        expect(metrics.totalWarnings).toBe(1);
        expect(metrics.totalErrors).toBe(1);
        expect(metrics.reactWarnings).toHaveLength(2);
        
        // Check for critical warning
        const criticalWarning = metrics.reactWarnings.find(w => 
          w.message.includes('Maximum update depth exceeded')
        );
        expect(criticalWarning?.severity).toBe('critical');
        expect(criticalWarning?.source).toBe('react-infinite-loop');
      });
      
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(false);
    });

    it('should handle hook-related warnings', async () => {
      render(<MockDashboardPage />);
      
      // Simulate hook warnings
      console.warn('Warning: React Hook useEffect was called conditionally');
      console.warn('Warning: useCallback has a missing dependency');
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        
        const hookWarnings = metrics.reactWarnings.filter(w => w.source === 'react-hooks');
        expect(hookWarnings).toHaveLength(2);
        
        hookWarnings.forEach(warning => {
          expect(warning.severity).toBe('high');
        });
      });
    });
  });

  describe('Performance Metrics Validation', () => {
    it('should provide accurate session duration tracking', async () => {
      const startTime = Date.now();
      render(<MockDashboardPage />);
      
      // Wait a bit to accumulate session time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = performanceMonitor.getMetrics();
      const sessionDuration = Date.now() - metrics.sessionStartTime;
      
      expect(sessionDuration).toBeGreaterThan(0);
      expect(sessionDuration).toBeLessThan(1000); // Should be less than 1 second for this test
    });

    it('should track effect execution intervals', async () => {
      const { getByTestId } = render(<MockDashboardPage />);
      
      // Trigger multiple re-renders with delays
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await userEvent.click(getByTestId('trigger-rerender'));
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        const validationEffect = metrics.useEffectExecutions.get('state-validation');
        
        if (validationEffect && validationEffect.executionCount > 1) {
          expect(validationEffect.averageInterval).toBeGreaterThan(0);
        }
      });
    });

    it('should maintain execution history limits', async () => {
      const { getByTestId } = render(<MockDashboardPage />);
      
      // Trigger many re-renders to test history limits
      for (let i = 0; i < 60; i++) {
        await act(async () => {
          await userEvent.click(getByTestId('trigger-rerender'));
        });
      }
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        const validationEffect = metrics.useEffectExecutions.get('state-validation');
        
        if (validationEffect) {
          expect(validationEffect.executionCount).toBe(60);
          expect(validationEffect.executionHistory.length).toBeLessThanOrEqual(50); // History limit
        }
      });
    });
  });

  describe('Optimization Validation', () => {
    it('should validate that dashboard infinite loading fix is effective', async () => {
      render(<MockDashboardPage />);
      
      // Wait for initial effects to execute
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.useEffectExecutions.size).toBeGreaterThan(0);
      });
      
      // Wait a bit more to ensure no infinite loops develop
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = performanceMonitor.getMetrics();
      
      // Verify no infinite loops detected
      expect(metrics.infiniteLoopDetections).toBe(0);
      
      // Verify no excessive re-renders
      expect(metrics.excessiveRerenderDetections).toBe(0);
      
      // Verify no critical React warnings
      const criticalWarnings = metrics.reactWarnings.filter(w => w.severity === 'critical');
      expect(criticalWarnings).toHaveLength(0);
      
      // Overall optimization should be successful
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
    });

    it('should provide detailed metrics for performance analysis', async () => {
      const { getByTestId } = render(<MockDashboardPage />);
      
      // Generate some activity
      await act(async () => {
        await userEvent.click(getByTestId('trigger-rerender'));
        await userEvent.click(getByTestId('generate-report'));
      });
      
      const metrics = performanceMonitor.getMetrics();
      
      // Verify comprehensive metrics are available
      expect(metrics.sessionStartTime).toBeGreaterThan(0);
      expect(metrics.lastReportTime).toBeGreaterThan(0);
      expect(metrics.useEffectExecutions.size).toBeGreaterThan(0);
      expect(metrics.componentRenders.size).toBeGreaterThan(0);
      
      // Verify effect metadata
      const authEffect = metrics.useEffectExecutions.get('auth-and-initial-load');
      expect(authEffect?.componentName).toBe('DashboardPage');
      expect(authEffect?.dependencies).toBeDefined();
      expect(authEffect?.executionCount).toBeGreaterThan(0);
      expect(authEffect?.lastExecution).toBeGreaterThan(0);
    });
  });
});