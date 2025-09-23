/**
 * Task 8 Performance Monitoring Validation Tests
 * 
 * Validates that the performance monitoring implementation meets all requirements:
 * - Add console logging to track useEffect execution frequency
 * - Monitor component re-render patterns to ensure optimization
 * - Validate that React warnings and errors are eliminated
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { performanceMonitor } from '@/utils/performanceMonitor';

describe('Task 8: Performance Monitoring Implementation Validation', () => {
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleGroup: jest.SpyInstance;

  beforeEach(() => {
    performanceMonitor.resetMetrics();
    
    // Mock console methods
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleGroup = jest.spyOn(console, 'group').mockImplementation(() => {});
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
    
    // Restore console methods
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleGroup.mockRestore();
  });

  describe('Requirement 5.1: Console Logging for useEffect Execution Frequency', () => {
    it('should track and log useEffect execution frequency', () => {
      performanceMonitor.startMonitoring();
      
      // Simulate useEffect executions
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep1']);
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep1']);
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep1']);
      
      const metrics = performanceMonitor.getMetrics();
      const effectMetrics = metrics.useEffectExecutions.get('test-effect');
      
      // Validate tracking
      expect(effectMetrics).toBeDefined();
      expect(effectMetrics?.executionCount).toBe(3);
      expect(effectMetrics?.componentName).toBe('TestComponent');
      expect(effectMetrics?.dependencies).toEqual(['dep1']);
      
      // Validate console logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor: Tracking new useEffect'),
        expect.objectContaining({
          effectId: 'test-effect',
          componentName: 'TestComponent',
          dependencies: ['dep1']
        })
      );
    });

    it('should detect and log excessive useEffect executions', async () => {
      performanceMonitor.startMonitoring();
      
      // Simulate rapid useEffect executions (above warning threshold)
      for (let i = 0; i < 8; i++) {
        performanceMonitor.trackUseEffect('rapid-effect', 'TestComponent', ['dep'], 3, 10);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Should log warning for excessive executions
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Performance Monitor: Excessive useEffect executions'),
        expect.any(Object)
      );
    });

    it('should detect and log infinite loops in useEffect', async () => {
      performanceMonitor.startMonitoring();
      
      // Simulate infinite loop (above critical threshold)
      for (let i = 0; i < 12; i++) {
        performanceMonitor.trackUseEffect('infinite-effect', 'TestComponent', ['dep'], 3, 10);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const metrics = performanceMonitor.getMetrics();
      const effectMetrics = metrics.useEffectExecutions.get('infinite-effect');
      
      // Should detect infinite loop
      expect(effectMetrics?.isInfiniteLoop).toBe(true);
      expect(metrics.infiniteLoopDetections).toBeGreaterThan(0);
      
      // Should log critical error
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Performance Monitor: INFINITE LOOP DETECTED'),
        expect.any(Object)
      );
    });
  });

  describe('Requirement 5.2: Component Re-render Pattern Monitoring', () => {
    it('should track and monitor component re-render patterns', () => {
      performanceMonitor.startMonitoring();
      
      // Simulate component renders
      performanceMonitor.trackComponentRender('TestComponent', ['prop1']);
      performanceMonitor.trackComponentRender('TestComponent', ['prop2']);
      performanceMonitor.trackComponentRender('TestComponent', ['prop3']);
      
      const metrics = performanceMonitor.getMetrics();
      const renderMetrics = metrics.componentRenders.get('TestComponent');
      
      // Validate tracking
      expect(renderMetrics).toBeDefined();
      expect(renderMetrics?.renderCount).toBe(3);
      expect(renderMetrics?.propsChanges).toHaveLength(3);
      expect(renderMetrics?.isExcessiveRerendering).toBe(false);
      
      // Validate console logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor: Tracking new component'),
        expect.objectContaining({
          componentName: 'TestComponent'
        })
      );
    });

    it('should detect and log excessive re-rendering', async () => {
      performanceMonitor.startMonitoring();
      
      // Simulate excessive re-renders
      for (let i = 0; i < 25; i++) {
        performanceMonitor.trackComponentRender('TestComponent');
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const metrics = performanceMonitor.getMetrics();
      const renderMetrics = metrics.componentRenders.get('TestComponent');
      
      // Should detect excessive re-rendering
      expect(renderMetrics?.isExcessiveRerendering).toBe(true);
      expect(metrics.excessiveRerenderDetections).toBeGreaterThan(0);
      
      // Should log critical error
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Performance Monitor: EXCESSIVE RE-RENDERING DETECTED'),
        expect.any(Object)
      );
    });

    it('should calculate and track render intervals', async () => {
      performanceMonitor.startMonitoring();
      
      // Simulate renders with known intervals
      performanceMonitor.trackComponentRender('TestComponent');
      await new Promise(resolve => setTimeout(resolve, 50));
      performanceMonitor.trackComponentRender('TestComponent');
      await new Promise(resolve => setTimeout(resolve, 50));
      performanceMonitor.trackComponentRender('TestComponent');
      
      const metrics = performanceMonitor.getMetrics();
      const renderMetrics = metrics.componentRenders.get('TestComponent');
      
      // Should calculate average interval
      expect(renderMetrics?.averageRenderInterval).toBeGreaterThan(0);
      expect(renderMetrics?.renderHistory).toHaveLength(3);
    });
  });

  describe('Requirement 5.3: React Warning and Error Elimination Validation', () => {
    it('should intercept and categorize React warnings', () => {
      performanceMonitor.startMonitoring();
      
      // Simulate React warnings
      console.warn('Warning: useEffect has a missing dependency');
      console.warn('Warning: Each child in a list should have a unique "key"');
      
      const metrics = performanceMonitor.getMetrics();
      
      // Should track warnings
      expect(metrics.totalWarnings).toBe(2);
      expect(metrics.reactWarnings).toHaveLength(2);
      
      // Should categorize by severity
      const hookWarning = metrics.reactWarnings.find(w => w.message.includes('missing dependency'));
      expect(hookWarning?.severity).toBe('high');
      expect(hookWarning?.source).toBe('react-hooks');
      
      const keyWarning = metrics.reactWarnings.find(w => w.message.includes('unique "key"'));
      expect(keyWarning?.severity).toBe('medium');
      expect(keyWarning?.source).toBe('react-keys');
    });

    it('should detect critical React errors', () => {
      performanceMonitor.startMonitoring();
      
      // Simulate critical React error
      console.error('Maximum update depth exceeded');
      
      const metrics = performanceMonitor.getMetrics();
      
      // Should track error
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.reactWarnings).toHaveLength(1);
      
      // Should categorize as critical
      const criticalError = metrics.reactWarnings[0];
      expect(criticalError.severity).toBe('critical');
      expect(criticalError.source).toBe('react-infinite-loop');
      expect(criticalError.type).toBe('error');
    });

    it('should report optimization failure when critical issues detected', () => {
      performanceMonitor.startMonitoring();
      
      // Initially should be successful
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
      
      // Simulate critical React error
      console.error('Maximum update depth exceeded');
      
      // Should report optimization failure
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(false);
    });
  });

  describe('Requirement 5.4: Comprehensive Performance Report Generation', () => {
    it('should generate comprehensive performance reports', () => {
      performanceMonitor.startMonitoring();
      
      // Add some metrics
      performanceMonitor.trackUseEffect('effect1', 'Component1', ['dep1']);
      performanceMonitor.trackComponentRender('Component1');
      console.warn('Test warning');
      
      // Generate report
      performanceMonitor.generateReport();
      
      // Should log comprehensive report
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor Report')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⏱️ Session Duration:'),
        expect.any(Number),
        expect.stringContaining('seconds')
      );
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('🔄 useEffect Executions')
      );
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('🎨 Component Renders')
      );
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ React Warnings & Errors')
      );
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('🎯 Optimization Status')
      );
    });

    it('should provide optimization status validation', async () => {
      performanceMonitor.startMonitoring();
      
      // Test successful optimization
      performanceMonitor.trackUseEffect('normal-effect', 'Component', ['dep']);
      performanceMonitor.trackComponentRender('Component');
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
      
      // Test failed optimization (trigger actual infinite loop detection)
      for (let i = 0; i < 12; i++) {
        performanceMonitor.trackUseEffect('infinite-effect', 'Component', ['dep'], 3, 10);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(false);
    });

    it('should track session metrics accurately', async () => {
      const startTime = Date.now();
      performanceMonitor.startMonitoring();
      
      // Wait a bit to accumulate session time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = performanceMonitor.getMetrics();
      
      // Should track session duration
      expect(metrics.sessionStartTime).toBeGreaterThanOrEqual(startTime);
      expect(metrics.sessionStartTime).toBeLessThanOrEqual(Date.now());
      
      // Should track last report time
      expect(metrics.lastReportTime).toBeGreaterThanOrEqual(startTime);
    });
  });

  describe('Integration with Dashboard Requirements', () => {
    it('should validate dashboard infinite loading fix effectiveness', async () => {
      performanceMonitor.startMonitoring();
      
      // Simulate fixed dashboard useEffect (should not trigger infinite loop)
      performanceMonitor.trackUseEffect(
        'auth-and-initial-load',
        'DashboardPage',
        ['user', 'loading', 'router', 'fetchPosts'],
        3,
        5
      );
      
      // Simulate state validation effect (should be read-only)
      for (let i = 0; i < 5; i++) {
        performanceMonitor.trackUseEffect(
          'state-validation',
          'DashboardPage',
          ['paginationState', 'error'],
          10,
          20
        );
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const metrics = performanceMonitor.getMetrics();
      
      // Should not detect infinite loops
      expect(metrics.infiniteLoopDetections).toBe(0);
      
      // Should not detect excessive re-renders
      expect(metrics.excessiveRerenderDetections).toBe(0);
      
      // Should report optimization as successful
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
      
      // Should track both effects
      expect(metrics.useEffectExecutions.size).toBe(2);
      expect(metrics.useEffectExecutions.get('auth-and-initial-load')).toBeDefined();
      expect(metrics.useEffectExecutions.get('state-validation')).toBeDefined();
    });

    it('should provide metrics for performance monitoring panel', () => {
      performanceMonitor.startMonitoring();
      
      // Add various metrics
      performanceMonitor.trackUseEffect('effect1', 'Component1', ['dep1']);
      performanceMonitor.trackComponentRender('Component1');
      console.warn('Test warning');
      
      const metrics = performanceMonitor.getMetrics();
      
      // Should provide all necessary metrics for UI display
      expect(metrics.sessionStartTime).toBeGreaterThan(0);
      expect(metrics.useEffectExecutions.size).toBeGreaterThan(0);
      expect(metrics.componentRenders.size).toBeGreaterThan(0);
      expect(metrics.totalWarnings).toBeGreaterThan(0);
      expect(metrics.reactWarnings.length).toBeGreaterThan(0);
      
      // Should provide optimization status
      expect(typeof performanceMonitor.isOptimizationSuccessful()).toBe('boolean');
    });
  });

  describe('Performance Monitoring Requirements Compliance', () => {
    it('should meet all Task 8 requirements', async () => {
      performanceMonitor.startMonitoring();
      
      // Requirement 5.1: Console logging to track useEffect execution frequency
      performanceMonitor.trackUseEffect('test-effect', 'TestComponent', ['dep']);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor: Tracking new useEffect'),
        expect.any(Object)
      );
      
      // Requirement 5.2: Monitor component re-render patterns
      performanceMonitor.trackComponentRender('TestComponent');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor: Tracking new component'),
        expect.any(Object)
      );
      
      // Requirement 5.3: Validate React warnings and errors are eliminated
      console.warn('Test React warning');
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.reactWarnings.length).toBeGreaterThan(0);
      
      // Requirement 5.4: Ensure optimization effectiveness
      expect(performanceMonitor.isOptimizationSuccessful()).toBe(true);
      
      // Generate comprehensive report
      performanceMonitor.generateReport();
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('📊 Performance Monitor Report')
      );
    });
  });
});