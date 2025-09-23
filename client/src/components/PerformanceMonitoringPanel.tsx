/**
 * Performance Monitoring Panel Component
 * 
 * Displays real-time performance monitoring information for the dashboard
 * infinite loading fix validation.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  performanceMonitor, 
  generatePerformanceReport, 
  isOptimizationSuccessful,
  type PerformanceMetrics 
} from '@/utils/performanceMonitor';

interface PerformanceMonitoringPanelProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export default function PerformanceMonitoringPanel({ 
  isVisible = false, 
  onToggle 
}: PerformanceMonitoringPanelProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Update metrics periodically
  useEffect(() => {
    if (!isVisible || !autoRefresh) return;

    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
    };

    // Initial update
    updateMetrics();

    // Set up periodic updates
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isVisible, autoRefresh]);

  const handleGenerateReport = () => {
    generatePerformanceReport();
    setMetrics(performanceMonitor.getMetrics());
  };

  const handleResetMetrics = () => {
    performanceMonitor.resetMetrics();
    setMetrics(performanceMonitor.getMetrics());
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium transition-colors"
        title="Show Performance Monitor"
      >
        📊 Performance
      </button>
    );
  }

  const optimizationStatus = isOptimizationSuccessful();
  const sessionDuration = metrics ? Math.round((Date.now() - metrics.sessionStartTime) / 1000) : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
          <div className={`w-2 h-2 rounded-full ${optimizationStatus ? 'bg-green-500' : 'bg-red-500'}`} 
               title={optimizationStatus ? 'Optimization Successful' : 'Issues Detected'} />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 text-sm"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 text-sm"
            title="Hide Panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Quick Status */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Session Duration:</span>
            <span className="font-medium">{sessionDuration}s</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Optimization Status:</span>
            <span className={`font-medium ${optimizationStatus ? 'text-green-600' : 'text-red-600'}`}>
              {optimizationStatus ? '✅ Success' : '⚠️ Issues'}
            </span>
          </div>
          {metrics && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Warnings:</span>
                <span className={`font-medium ${metrics.totalWarnings > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.totalWarnings}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Errors:</span>
                <span className={`font-medium ${metrics.totalErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.totalErrors}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && metrics && (
          <div className="space-y-3 border-t border-gray-200 pt-3">
            {/* useEffect Executions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">useEffect Executions</h4>
              <div className="space-y-1 text-sm">
                {Array.from(metrics.useEffectExecutions.values()).map(effect => (
                  <div key={effect.effectId} className="flex justify-between">
                    <span className="text-gray-600 truncate">{effect.effectId}:</span>
                    <span className={`font-medium ${effect.isInfiniteLoop ? 'text-red-600' : 
                      effect.executionCount > effect.warningThreshold ? 'text-yellow-600' : 'text-green-600'}`}>
                      {effect.executionCount}
                      {effect.isInfiniteLoop && ' 🚨'}
                    </span>
                  </div>
                ))}
                {metrics.useEffectExecutions.size === 0 && (
                  <span className="text-gray-500 text-xs">No effects tracked yet</span>
                )}
              </div>
            </div>

            {/* Component Renders */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Component Renders</h4>
              <div className="space-y-1 text-sm">
                {Array.from(metrics.componentRenders.values()).map(component => (
                  <div key={component.componentName} className="flex justify-between">
                    <span className="text-gray-600 truncate">{component.componentName}:</span>
                    <span className={`font-medium ${component.isExcessiveRerendering ? 'text-red-600' : 
                      component.renderCount > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {component.renderCount}
                      {component.isExcessiveRerendering && ' 🚨'}
                    </span>
                  </div>
                ))}
                {metrics.componentRenders.size === 0 && (
                  <span className="text-gray-500 text-xs">No components tracked yet</span>
                )}
              </div>
            </div>

            {/* Recent Issues */}
            {metrics.reactWarnings.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recent Issues</h4>
                <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                  {metrics.reactWarnings.slice(-5).map((warning, index) => (
                    <div key={index} className={`p-2 rounded ${
                      warning.severity === 'critical' ? 'bg-red-50 text-red-700' :
                      warning.severity === 'high' ? 'bg-orange-50 text-orange-700' :
                      warning.severity === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      <div className="font-medium">{warning.type}: {warning.source}</div>
                      <div className="truncate">{warning.message.substring(0, 80)}...</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-1"
              />
              Auto-refresh
            </label>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleGenerateReport}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Generate detailed console report"
            >
              Report
            </button>
            <button
              onClick={handleResetMetrics}
              className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              title="Reset all metrics"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}