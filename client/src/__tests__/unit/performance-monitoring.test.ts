/**
 * Unit Tests for Performance Monitoring System
 * 
 * Tests the performance monitoring utility and hooks to ensure they properly
 * track useEffect executions, component re-renders, and React warnings/errors.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { performanceMonitor } from '@/utils/performanceMonitor';

// Mock console methods
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe('Performance Monitoring System', () => {
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleGroup: jest.SpyInstance;
  let mockConsoleGroupEnd: jest.SpyInstance;

  beforeEach(() => {
    // Reset performance monitor
    performanceMonitor.resetMetrics();
    
    // Mock console methods properly
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleGroup = jest.spyOn(console, 'group').mockImplementation(() => {});
    mockConsoleGroupEnd = jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    // Stop monitoring if running
    performanceMonitor.stopMonitoring();
    
    // Restore console methods
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleGroup.mockRestore();
    mockConsoleGroupEnd.mockRestore();
  });

  describe('Basic Monitoring Functionality', () => {
    it('should start and stop monitoring correctly', () => {
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
      
      performanceMonitor.startMonitoring();
      expect(mockConsoleLog).toHaveBeenCalledWith('🚀 Performance Monitor: Starting monitoring session');
      
      performanceMonitor.stopMonitoring();
      expect(mockConsoleLog).toHaveBeenCalledWith('🛑 Performance Monitor: Stopping monitoring session');
    });

    it('should track useEffect executions', () => {
      performanceMonitor.startMonitoring();
      
      // Track a useEffect execution
      performanceMonitor.trackUseEffect(
        'test-effect',
        'TestComponent',
        ['dependency1', 'dependency2']
      );
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.useEffectExecutions.size).toBe(1);
      
      const effectMetrics = metrics.useEffectExecutions.get('test-effect');
      expect(effectMetrics).toBeDefined();
      expect(effectMetrics?.componentName).toBe('TestComponent');
      expect(effectMetrics?.dependencies).toEqual(['dependency1', 'dependency2']);
      expect(effectMetrics?.executionCount).toBe(1);
    });

    it('should track component renders', () => {
      performanceMonitor.startMonitoring();
      
      // Track a component render
      performanceMonitor.trackComponentRender('TestComponent', ['prop1', 'prop2']);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.componentRenders.size).toBe(1);
      
      const renderMetrics = metrics.componentRenders.get('TestComponent');
      expect(renderMetrics).toBeDefined();
      expect(renderMetrics?.componentName).toBe('TestComponent');
      expect(renderMetrics?.renderCount).toBe(1);
      expect(renderMetrics?.propsChanges).toHaveLength(1);
      expect(renderMetrics?.propsChanges[0].changedProps).toEqual(['prop1', 'prop2']);
    });
  });

  describe('Infinite Loop Detection', () => {
    it('should detect infinite loops in useEffect executions', async () => {
      performanceMonitor.startMonitoring();
      
      // Simulate rapid useEffect executions (infinite loop)
      for (let i = 0; i < 12; i++) {
        performanceMonitor.trackUseEffect(
          'infinite-effect',
          'TestComponent',
          ['dependency'],
          3, // Warning threshold
          10 // Critical threshold
        );
        
        // Small delay to simulate rapid executions
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const metrics = performanceMonitor.getMetrics();
      const effectMetrics = metrics.useEffectExecutions.get('infinite-effect');
      
      expect(effectMetrics?.isInfiniteLoop).toBe(true);
      expect(metrics.infiniteLoopDetections).toBeGreaterThan(0);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Performance Monitor: INFINITE LOOP DETECTED'),
        expect.any(Object)
      );
    });

    it('should detect excessive component re-renders', async () => {
      performanceMonitor.startMonitoring();
      
      // Simulate excessive re-renders
      for (let i = 0; i < 25; i++) {
        performanceMonitor.trackComponentRender('TestComponent');
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const metrics = performanceMonitor.getMetrics();
      const renderMetrics = metrics.componentRenders.get('TestComponent');
      
      expect(renderMetrics?.isExcessiveRerendering).toBe(true);
      expect(metrics.excessiveRerenderDetections).toBeGreaterThan(0);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Performance Monitor: EXCESSIVE RE-RENDERING DETECTED'),
        expect.any(Object)
      );
    });
  });

  describe('React Warning and Error Tracking', () => {
    it('should intercept and categorize React warnings', () => {
      performanceMonitor.startMonitoring();
      
      // Clear any existing warnings first
      performanceMonitor.resetMetrics();
      
      // Simulate React warnings
      console.warn('Warning: useEffect has a missing dependency');
      console.warn('Warning: Each child in a list should have a unique "key"');
      console.error('Maximum update depth exceeded');
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.totalWarnings).toBe(2);
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.reactWarnings).toHaveLength(3);
      
      // Check severity categorization
      const criticalWarning = metrics.reactWarnings.find(w => 
        w.message.includes('Maximum update depth exceeded')
      );
      expect(criticalWarning?.severity).toBe('critical');
      
      const hookWarning = metrics.reactWarnings.find(w => 
        w.message.includes('missing dependency')
      );
      expect(hookWarning?.severity).toBe('high');
      
      const keyWarning = metrics.reactWarnings.find(w => 
        w.message.includes('unique "key"')
      );
      expect(keyWarning?.severity).toBe('medium');
    });

    it('should identify React-specific warning sources', () => {
      performanceMonitor.startMonitoring();
      
      console.warn('Warning: useEffect has a missing dependency');
      console.warn('Warning: React Hook useCallback was called conditionally');
      console.error('Maximum update depth exceeded');
      
      const metrics = performanceMonitor.getMetrics();
      
      const hookWarnings = metrics.reactWarnings.filter(w => w.source === 'react-hooks');
      expect(hookWarnings).toHaveLength(2);
      
      const infiniteLoopWarning = metrics.reactWarnings.find(w => 
        w.source === 'react-infinite-loop'
      );
      expect(infiniteLoopWarning).toBeDefined();
    });
  });

  describe('Optimization Success Validation', () => {
    it('should report optimization as successful when no issues detected', () => {
      performanceMonitor.startMonitoring();
      
      // Track normal useEffect executions
      performanceMonitor.trackUseEffect('normal-effect', 'TestComponent', ['dep1']);
      performanceMonitor.trackComponentRender('TestComponent');
      
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
    });

    it('should report optimization as failed when infinite loops detected', async () => {
      performanceMonitor.startMonitoring();
      
      // Trigger infinite loop detection
      for (let i = 0; i < 12; i++) {
        performanceMonitor.trackUseEffect(
          'infinite-effect',
          'TestComponent',
          ['dependency'],
          3,
          10
        );
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(false);
    });

    it('should report optimization as failed when critical React warnings detected', () => {
      performanceMonitor.startMonitoring();
      
      // Trigger critical React warning
      console.error('Maximum update depth exceeded');
      
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(false);
    });

    it('should report optimization as failed when excessive re-renders detected', async () => {
      performanceMonitor.startMonitoring();
      
      // Trigger excessive re-render detection
      for (let i = 0; i < 25; i++) {
        performanceMonitor.trackComponentRender('TestComponent');
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(false);
    });
  });

  describe('Metrics Management', () => {
    it('should maintain execution history with limits', () => {
      performanceMonitor.startMonitoring();
      
      // Track many executions to test history limits
      for (let i = 0; i < 60; i++) {
        performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep']);
      }
      
      const metrics = performanceMonitor.getMetrics();
      const effectMetrics = metrics.useEffectExecutions.get('test-effect');
      
      expect(effectMetrics?.executionCount).toBe(60);
      expect(effectMetrics?.executionHistory.length).toBeLessThanOrEqual(50); // History limit
    });

    it('should calculate average intervals correctly', async () => {
      performanceMonitor.startMonitoring();
      
      // Track executions with known intervals
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep']);
      await new Promise(resolve => setTimeout(resolve, 100));
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep']);
      await new Promise(resolve => setTimeout(resolve, 100));
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep']);
      
      const metrics = performanceMonitor.getMetrics();
      const effectMetrics = metrics.useEffectExecutions.get('test-effect');
      
      expect(effectMetrics?.averageInterval).toBeGreaterThan(0);
      expect(effectMetrics?.averageInterval).toBeLessThan(200); // Should be around 100ms
    });

    it('should reset metrics correctly', () => {
      performanceMonitor.startMonitoring();
      
      // Add some data
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep']);
      performanceMonitor.trackComponentRender('TestComponent');
      console.warn('Test warning');
      
      let metrics = performanceMonitor.getMetrics();
      expect(metrics.useEffectExecutions.size).toBe(1);
      expect(metrics.componentRenders.size).toBe(1);
      expect(metrics.totalWarnings).toBe(1);
      
      // Reset metrics
      performanceMonitor.resetMetrics();
      
      metrics = performanceMonitor.getMetrics();
      expect(metrics.useEffectExecutions.size).toBe(0);
      expect(metrics.componentRenders.size).toBe(0);
      expect(metrics.totalWarnings).toBe(0);
      expect(metrics.reactWarnings).toHaveLength(0);
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance reports', () => {
      performanceMonitor.startMonitoring();
      
      // Add various metrics
      performanceMonitor.trackUseEffect('effect1', 'Component1', ['dep1']);
      performanceMonitor.trackUseEffect('effect2', 'Component2', ['dep2']);
      performanceMonitor.trackComponentRender('Component1');
      performanceMonitor.trackComponentRender('Component2');
      console.warn('Test warning');
      console.error('Test error');
      
      // Generate report
      performanceMonitor.generateReport();
      
      // Verify report was logged (console.group is used for the report header)
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor Report')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⏱️ Session Duration:'),
        expect.any(Number),
        expect.stringContaining('seconds')
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle monitoring when not started', () => {
      // Try to track without starting monitoring
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep']);
      performanceMonitor.trackComponentRender('TestComponent');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.useEffectExecutions.size).toBe(0);
      expect(metrics.componentRenders.size).toBe(0);
    });

    it('should handle empty or invalid parameters', () => {
      performanceMonitor.startMonitoring();
      
      // Test with empty parameters
      performanceMonitor.trackUseEffect('', '', []);
      performanceMonitor.trackComponentRender('');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.useEffectExecutions.size).toBe(1);
      expect(metrics.componentRenders.size).toBe(1);
    });

    it('should handle rapid start/stop cycles', () => {
      for (let i = 0; i < 5; i++) {
        performanceMonitor.startMonitoring();
        performanceMonitor.stopMonitoring();
      }
      
      // Should not throw errors or cause issues
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
    });
  });
});