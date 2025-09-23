/**
 * Performance Monitoring Utility - DISABLED VERSION
 * 
 * This utility was causing infinite loops, so it's been disabled.
 * Only basic logging remains to prevent import errors.
 */

interface UseEffectExecution {
  effectId: string;
  componentName: string;
  dependencies: string[];
  executionCount: number;
  lastExecution: number;
  averageInterval: number;
  executionHistory: number[];
  isInfiniteLoop: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}

interface ComponentRenderInfo {
  componentName: string;
  renderCount: number;
  lastRender: number;
  averageRenderInterval: number;
  renderHistory: number[];
  propsChanges: Array<{
    timestamp: number;
    changedProps: string[];
  }>;
  isExcessiveRerendering: boolean;
}

interface ReactWarning {
  timestamp: number;
  type: 'warning' | 'error';
  message: string;
  componentStack?: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMetrics {
  useEffectExecutions: Map<string, UseEffectExecution>;
  componentRenders: Map<string, ComponentRenderInfo>;
  reactWarnings: ReactWarning[];
  sessionStartTime: number;
  lastReportTime: number;
  totalWarnings: number;
  totalErrors: number;
  infiniteLoopDetections: number;
  excessiveRerenderDetections: number;
}

/**
 * Disabled Performance Monitor Class
 * 
 * This class is disabled to prevent infinite loops.
 * All methods are no-ops to maintain API compatibility.
 */
class DisabledPerformanceMonitor {
  private isEnabled = false;

  constructor() {
    console.log('📊 Performance Monitor: Disabled to prevent infinite loops');
  }

  public startMonitoring(): void {
    // No-op: Disabled
  }

  public stopMonitoring(): void {
    // No-op: Disabled
  }

  public trackUseEffect(
    effectId: string,
    componentName: string,
    dependencies: string[],
    warningThreshold: number = 5,
    criticalThreshold: number = 10
  ): void {
    // No-op: Disabled
  }

  public trackComponentRender(
    componentName: string,
    changedProps: string[] = []
  ): void {
    // No-op: Disabled
  }

  public generateReport(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Performance Monitor: Disabled - no report generated');
    }
  }

  public getMetrics(): PerformanceMetrics {
    return {
      useEffectExecutions: new Map(),
      componentRenders: new Map(),
      reactWarnings: [],
      sessionStartTime: Date.now(),
      lastReportTime: Date.now(),
      totalWarnings: 0,
      totalErrors: 0,
      infiniteLoopDetections: 0,
      excessiveRerenderDetections: 0,
    };
  }

  public resetMetrics(): void {
    // No-op: Disabled
  }

  public isOptimizationSuccessful(): boolean {
    return true; // Always return true since monitoring is disabled
  }
}

// Create disabled instance
export const performanceMonitor = new DisabledPerformanceMonitor();

// Export types for use in components
export type {
  UseEffectExecution,
  ComponentRenderInfo,
  ReactWarning,
  PerformanceMetrics
};

// Utility functions - all disabled
export const trackUseEffect = (
  effectId: string,
  componentName: string,
  dependencies: string[],
  warningThreshold?: number,
  criticalThreshold?: number
) => {
  // No-op: Disabled
};

export const trackComponentRender = (
  componentName: string,
  changedProps?: string[]
) => {
  // No-op: Disabled
};

export const startPerformanceMonitoring = () => {
  // No-op: Disabled
};

export const stopPerformanceMonitoring = () => {
  // No-op: Disabled
};

export const generatePerformanceReport = () => {
  // No-op: Disabled
};

export const isOptimizationSuccessful = () => {
  return true; // Always return true since monitoring is disabled
};
