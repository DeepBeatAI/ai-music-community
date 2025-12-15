/**
 * Integration Tests for Performance Monitoring Hooks
 * 
 * Tests the React hooks for performance monitoring to ensure they properly
 * integrate with React components and track performance metrics.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import React, { useEffect, useState } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { 
  usePerformanceMonitoring, 
  useEffectTracking, 
  useRenderTracking,
  useInfiniteLoopPrevention 
} from '@/hooks/usePerformanceMonitoring';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Mock console methods
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Test component using performance monitoring
interface TestComponentWithMonitoringProps {
  triggerRerender?: boolean;
  triggerInfiniteLoop?: boolean;
  dependencies?: string[];
}

function TestComponentWithMonitoring({ 
  triggerRerender = false, 
  triggerInfiniteLoop = false, 
  dependencies = ['dep1'] 
}: TestComponentWithMonitoringProps) {
  const [count, setCount] = useState(0);
  
  const monitoring = usePerformanceMonitoring({
    componentName: 'TestComponentWithMonitoring',
    trackRenders: true,
    trackEffects: true,
    autoStart: true
  });

  const renderTracking = useRenderTracking('TestComponentWithMonitoring', {
    count,
    triggerRerender
  });

  const infiniteLoopPrevention = useInfiniteLoopPrevention(
    'TestComponentWithMonitoring',
    'test-effect',
    dependencies,
    2 // Max 2 executions per second
  );

  // Normal useEffect
  useEffect(() => {
    monitoring.trackEffect('normal-effect', dependencies);
    
    if (triggerInfiniteLoop) {
      // This would cause an infinite loop in real scenarios
      setCount(prev => prev + 1);
    }
  }, triggerInfiniteLoop ? [count] : dependencies);

  // Effect that triggers re-renders when triggerRerender is true
  useEffect(() => {
    if (triggerRerender) {
      const timer = setInterval(() => {
        setCount(prev => prev + 1);
      }, 10);
      
      return () => clearInterval(timer);
    }
  }, [triggerRerender]);

  return (
    <div>
      <div data-testid="count">{count}</div>
      <div data-testid="render-count">{renderTracking.renderCount}</div>
      <div data-testid="optimization-status">
        {monitoring.isOptimizationSuccessful() ? 'optimized' : 'issues-detected'}
      </div>
      <div data-testid="infinite-loop-status">
        {infiniteLoopPrevention.isPotentialInfiniteLoop ? 'infinite-loop' : 'normal'}
      </div>
      <button 
        data-testid="generate-report" 
        onClick={monitoring.generateReport}
      >
        Generate Report
      </button>
    </div>
  );
}

// Test component for effect tracking
interface TestComponentWithEffectTrackingProps {
  dependencies: string[];
  effectId: string;
}

function TestComponentWithEffectTracking({ dependencies, effectId }: TestComponentWithEffectTrackingProps) {
  const [state, setState] = useState(0);

  useEffectTracking('TestComponentWithEffectTracking', effectId, dependencies);

  useEffect(() => {
    // Simulate some effect logic
    console.log('Effect executed');
  }, dependencies);

  return (
    <div>
      <div data-testid="state">{state}</div>
      <button 
        data-testid="update-state" 
        onClick={() => setState(prev => prev + 1)}
      >
        Update State
      </button>
    </div>
  );
}

describe('Performance Monitoring Hooks Integration', () => {
  beforeEach(() => {
    // Reset performance monitor
    performanceMonitor.resetMetrics();
    
    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Stop monitoring if running
    performanceMonitor.stopMonitoring();
    
    // Restore console methods
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('usePerformanceMonitoring Hook', () => {
    it('should automatically start monitoring when autoStart is true', async () => {
      render(<TestComponentWithMonitoring />);
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('🚀 Performance Monitoring: Starting for TestComponentWithMonitoring')
        );
      });
    });

    it('should track component renders automatically', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring />);
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.componentRenders.size).toBeGreaterThan(0);
        
        const renderMetrics = metrics.componentRenders.get('TestComponentWithMonitoring');
        expect(renderMetrics?.renderCount).toBeGreaterThan(0);
      });
      
      expect(getByTestId('render-count')).toHaveTextContent('1');
    });

    it('should track useEffect executions', async () => {
      render(<TestComponentWithMonitoring />);
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.useEffectExecutions.size).toBeGreaterThan(0);
        
        const effectMetrics = metrics.useEffectExecutions.get('normal-effect');
        expect(effectMetrics?.executionCount).toBeGreaterThan(0);
      });
    });

    it('should generate performance reports when requested', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring />);
      
      await act(async () => {
        getByTestId('generate-report').click();
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor Report')
      );
    });

    it('should stop monitoring on component unmount', async () => {
      const { unmount } = render(<TestComponentWithMonitoring />);
      
      await act(async () => {
        unmount();
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🛑 Performance Monitoring: Stopping for TestComponentWithMonitoring')
      );
    });
  });

  describe('useRenderTracking Hook', () => {
    it('should track render count accurately', async () => {
      const { getByTestId, rerender } = render(<TestComponentWithMonitoring />);
      
      // Initial render
      await waitFor(() => {
        expect(getByTestId('render-count')).toHaveTextContent('1');
      });
      
      // Force re-render
      rerender(<TestComponentWithMonitoring triggerRerender={false} />);
      
      await waitFor(() => {
        expect(getByTestId('render-count')).toHaveTextContent('2');
      });
    });

    it('should track prop changes', async () => {
      const { rerender } = render(<TestComponentWithMonitoring dependencies={['dep1']} />);
      
      // Change props
      rerender(<TestComponentWithMonitoring dependencies={['dep2']} />);
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        const renderMetrics = metrics.componentRenders.get('TestComponentWithMonitoring');
        
        expect(renderMetrics?.propsChanges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('useInfiniteLoopPrevention Hook', () => {
    it('should detect potential infinite loops', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring triggerInfiniteLoop={true} />);
      
      // Wait for infinite loop detection
      await waitFor(() => {
        expect(getByTestId('infinite-loop-status')).toHaveTextContent('infinite-loop');
      }, { timeout: 5000 });
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Infinite Loop Prevention'),
        expect.any(Object)
      );
    });

    it('should report normal execution when no infinite loop detected', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring triggerInfiniteLoop={false} />);
      
      await waitFor(() => {
        expect(getByTestId('infinite-loop-status')).toHaveTextContent('normal');
      });
    });
  });

  describe('useEffectTracking Hook', () => {
    it('should track effect executions with correct metadata', async () => {
      render(
        <TestComponentWithEffectTracking 
          dependencies={['dep1', 'dep2']} 
          effectId="test-effect-1"
        />
      );
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        const effectMetrics = metrics.useEffectExecutions.get('test-effect-1');
        
        expect(effectMetrics).toBeDefined();
        expect(effectMetrics?.componentName).toBe('TestComponentWithEffectTracking');
        expect(effectMetrics?.dependencies).toEqual(['dep1', 'dep2']);
        expect(effectMetrics?.executionCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Excessive Re-render Detection', () => {
    it('should detect excessive re-renders', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring triggerRerender={true} />);
      
      // Wait for excessive re-render detection
      await waitFor(() => {
        expect(getByTestId('optimization-status')).toHaveTextContent('issues-detected');
      }, { timeout: 10000 });
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.excessiveRerenderDetections).toBeGreaterThan(0);
    });
  });

  describe('Optimization Status Validation', () => {
    it('should report optimization as successful for normal components', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring />);
      
      await waitFor(() => {
        expect(getByTestId('optimization-status')).toHaveTextContent('optimized');
      });
    });

    it('should report optimization issues when problems detected', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring triggerInfiniteLoop={true} />);
      
      await waitFor(() => {
        expect(getByTestId('optimization-status')).toHaveTextContent('issues-detected');
      }, { timeout: 5000 });
    });
  });

  describe('Multiple Components Tracking', () => {
    it('should track multiple components independently', async () => {
      render(
        <div>
          <TestComponentWithEffectTracking 
            dependencies={['dep1']} 
            effectId="effect-1"
          />
          <TestComponentWithEffectTracking 
            dependencies={['dep2']} 
            effectId="effect-2"
          />
        </div>
      );
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        
        expect(metrics.useEffectExecutions.size).toBe(2);
        expect(metrics.useEffectExecutions.get('effect-1')).toBeDefined();
        expect(metrics.useEffectExecutions.get('effect-2')).toBeDefined();
        
        expect(metrics.componentRenders.size).toBe(1); // Same component name
        const renderMetrics = metrics.componentRenders.get('TestComponentWithEffectTracking');
        expect(renderMetrics?.renderCount).toBe(2); // Two instances rendered
      });
    });
  });

  describe('Performance Monitoring Panel Integration', () => {
    it('should provide real-time metrics for UI display', async () => {
      render(<TestComponentWithMonitoring />);
      
      await waitFor(() => {
        const metrics = performanceMonitor.getMetrics();
        
        // Verify metrics are available for UI display
        expect(metrics.sessionStartTime).toBeGreaterThan(0);
        expect(metrics.useEffectExecutions.size).toBeGreaterThan(0);
        expect(metrics.componentRenders.size).toBeGreaterThan(0);
        
        // Verify optimization status is available
        expect(typeof performanceMonitor.isOptimizationSuccessful()).toBe('boolean');
      });
    });
  });

  describe('Error Handling in Hooks', () => {
    it('should handle hook usage without monitoring started', () => {
      // Stop monitoring if it was started
      performanceMonitor.stopMonitoring();
      
      // Should not throw errors even if monitoring is not started
      expect(() => {
        render(<TestComponentWithMonitoring />);
      }).not.toThrow();
    });

    it('should handle invalid parameters gracefully', () => {
      expect(() => {
        render(
          <TestComponentWithEffectTracking 
            dependencies={[]} 
            effectId=""
          />
        );
      }).not.toThrow();
    });
  });
});