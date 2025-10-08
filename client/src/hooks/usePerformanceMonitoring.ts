/**
 * React Hook for Performance Monitoring - FIXED VERSION
 * 
 * This hook provides easy integration of performance monitoring into React components
 * to track useEffect executions, component re-renders, and React warnings/errors.
 * 
 * FIXES:
 * - Removed recursive tracking that was causing infinite loops
 * - Added safeguards against circular dependencies
 * - Simplified tracking to prevent performance overhead
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

interface UsePerformanceMonitoringOptions {
  componentName: string;
  trackRenders?: boolean;
  trackEffects?: boolean;
  autoStart?: boolean;
  reportInterval?: number;
}

interface UsePerformanceMonitoringReturn {
  trackEffect: (effectId: string, dependencies: string[], warningThreshold?: number, criticalThreshold?: number) => void;
  trackRender: (changedProps?: string[]) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  generateReport: () => void;
  isOptimizationSuccessful: () => boolean;
  renderCount: number;
}

// Simple performance tracking without the complex monitor that was causing loops
let globalRenderCount = 0;
const globalEffectExecutions = new Map<string, number>();

/**
 * Simplified hook for performance monitoring that doesn't cause infinite loops
 */
export function usePerformanceMonitoring(
  options: UsePerformanceMonitoringOptions
): UsePerformanceMonitoringReturn {
  const {
    componentName,
    trackRenders = false, // Disabled by default to prevent loops
    trackEffects = false, // Disabled by default to prevent loops
    autoStart = false,    // Disabled by default to prevent loops
    reportInterval = 0    // Disabled by default to prevent loops
  } = options;

  const renderCountRef = useRef(0);
  const isMonitoringRef = useRef(false);
  const lastReportTimeRef = useRef(Date.now());

  // Memoize the tracking functions to prevent recreation on every render
  const trackEffect = useCallback((
    effectId: string,
    dependencies: string[],
    warningThreshold: number = 10,
    criticalThreshold: number = 20
  ) => {
    if (!trackEffects || !isMonitoringRef.current) return;
    
    const key = `${componentName}:${effectId}`;
    const current = globalEffectExecutions.get(key) || 0;
    const newCount = current + 1;
    globalEffectExecutions.set(key, newCount);

    // Only log if thresholds are exceeded
    if (newCount === criticalThreshold) {
      console.warn(`⚠️ Performance: ${key} executed ${newCount} times - possible infinite loop`);
    } else if (newCount === warningThreshold) {
      console.warn(`⚠️ Performance: ${key} executed ${newCount} times - high frequency detected`);
    }
  }, [componentName, trackEffects]);

  const trackRender = useCallback((changedProps?: string[]) => {
    if (!trackRenders || !isMonitoringRef.current) return;
    
    renderCountRef.current++;
    globalRenderCount++;
    
    // Log excessive renders
    if (renderCountRef.current % 50 === 0) {
      console.warn(`⚠️ Performance: ${componentName} rendered ${renderCountRef.current} times`);
    }
  }, [componentName, trackRenders]);

  const startMonitoring = useCallback(() => {
    if (isMonitoringRef.current) return;
    console.log(`🚀 Performance Monitoring: Starting for ${componentName} (simplified)`);
    isMonitoringRef.current = true;
  }, [componentName]);

  const stopMonitoring = useCallback(() => {
    if (!isMonitoringRef.current) return;
    console.log(`🛑 Performance Monitoring: Stopping for ${componentName}`);
    isMonitoringRef.current = false;
  }, [componentName]);

  const generateReport = useCallback(() => {
    if (!isMonitoringRef.current) return;
    
    const now = Date.now();
    const timeSinceLastReport = now - lastReportTimeRef.current;
    
    // Only generate reports every 30 seconds to prevent spam
    if (timeSinceLastReport < 30000) return;
    
    console.group(`📊 Performance Report: ${componentName}`);
    console.log('Renders:', renderCountRef.current);
    console.log('Global renders:', globalRenderCount);
    console.log('Effect executions:', Object.fromEntries(globalEffectExecutions));
    console.groupEnd();
    
    lastReportTimeRef.current = now;
  }, [componentName]);

  const isOptimizationSuccessful = useCallback(() => {
    // Simple check: no effect should execute more than 20 times
    const maxExecutions = Math.max(0, ...Array.from(globalEffectExecutions.values()));
    return maxExecutions < 20;
  }, []);

  // Simplified auto-start that won't cause loops
  useEffect(() => {
    if (autoStart && !isMonitoringRef.current) {
      startMonitoring();
    }
    
    return () => {
      if (isMonitoringRef.current) {
        stopMonitoring();
      }
    };
  }, [autoStart, startMonitoring, stopMonitoring]);

  // Memoize the return object to prevent recreation
  return useMemo(() => ({
    trackEffect,
    trackRender,
    startMonitoring,
    stopMonitoring,
    generateReport,
    isOptimizationSuccessful,
    renderCount: renderCountRef.current
  }), [trackEffect, trackRender, startMonitoring, stopMonitoring, generateReport, isOptimizationSuccessful]);
}

/**
 * Simplified hook for tracking useEffect executions
 */
export function useEffectTracking(
  componentName: string,
  effectId: string,
  dependencies: string[],
  warningThreshold: number = 10,
  criticalThreshold: number = 20
) {
  // Only track if explicitly enabled via environment variable
  const shouldTrack = process.env.NODE_ENV === 'development' && process.env.REACT_APP_ENABLE_EFFECT_TRACKING === 'true';
  
  if (!shouldTrack) return;

  const key = `${componentName}:${effectId}`;
  const current = globalEffectExecutions.get(key) || 0;
  const newCount = current + 1;
  globalEffectExecutions.set(key, newCount);

  if (newCount === criticalThreshold) {
    console.warn(`⚠️ Effect Tracking: ${key} executed ${newCount} times - possible infinite loop`);
  }
}

/**
 * Simplified hook for tracking component render performance
 */
export function useRenderTracking(
  componentName: string,
  props?: Record<string, any>
) {
  const renderCountRef = useRef(0);
  const shouldTrack = process.env.NODE_ENV === 'development' && process.env.REACT_APP_ENABLE_RENDER_TRACKING === 'true';

  if (shouldTrack) {
    renderCountRef.current++;
    globalRenderCount++;
    
    // Log every 25 renders to avoid spam
    if (renderCountRef.current % 25 === 0) {
      console.log(`📊 Render Tracking: ${componentName} rendered ${renderCountRef.current} times`);
    }
  }

  return {
    renderCount: renderCountRef.current
  };
}

/**
 * Simplified hook for monitoring infinite loop prevention
 */
export function useInfiniteLoopPrevention(
  componentName: string,
  effectId: string,
  dependencies: string[],
  maxExecutionsPerSecond: number = 5
) {
  const executionTimesRef = useRef<number[]>([]);
  const warningShownRef = useRef(false);

  const now = Date.now();
  executionTimesRef.current.push(now);

  // Keep only executions from the last second
  executionTimesRef.current = executionTimesRef.current.filter(
    time => now - time < 1000
  );

  // Check for potential infinite loop
  if (executionTimesRef.current.length > maxExecutionsPerSecond) {
    if (!warningShownRef.current) {
      console.error(`🚨 Infinite Loop Prevention: ${componentName}:${effectId} executed ${executionTimesRef.current.length} times in 1 second`);
      warningShownRef.current = true;
    }
  } else if (executionTimesRef.current.length <= 2) {
    warningShownRef.current = false;
  }

  return {
    executionCount: executionTimesRef.current.length,
    isPotentialInfiniteLoop: executionTimesRef.current.length > maxExecutionsPerSecond
  };
}
