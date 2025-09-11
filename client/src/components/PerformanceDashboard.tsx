// Create: src/components/PerformanceDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { performanceAnalytics } from '@/utils/performanceAnalytics';

interface DashboardProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function PerformanceDashboard({ isVisible, onToggle }: DashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Update immediately
      updateAnalytics();
      
      // Set up auto-refresh
      const interval = setInterval(updateAnalytics, 5000);
      setUpdateInterval(interval);

      return () => clearInterval(interval);
    } else {
      if (updateInterval) {
        clearInterval(updateInterval);
        setUpdateInterval(null);
      }
    }
  }, [isVisible]);

  const updateAnalytics = () => {
    const data = performanceAnalytics.getDetailedAnalytics();
    setAnalytics(data);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const downloadData = () => {
    const data = performanceAnalytics.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        📊 Performance
      </button>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-full overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Performance Analytics Dashboard</h2>
            <div className="flex gap-2">
              <button
                onClick={downloadData}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                📥 Export Data
              </button>
              <button
                onClick={onToggle}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Performance Score */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Performance Score</h3>
              <div className={`text-3xl font-bold ${getScoreColor(analytics.summary.performanceScore)}`}>
                {analytics.summary.performanceScore.toFixed(0)}
              </div>
              <div className="text-sm text-gray-500">out of 100</div>
            </div>

            {/* Cache Hit Rate */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Cache Hit Rate</h3>
              <div className="text-3xl font-bold text-blue-600">
                {(analytics.metrics.cacheHitRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                {analytics.metrics.totalRequests} total requests
              </div>
            </div>

            {/* Bandwidth Saved */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Bandwidth Saved</h3>
              <div className="text-3xl font-bold text-green-600">
                {formatBytes(analytics.metrics.bandwidthSaved)}
              </div>
              <div className="text-sm text-gray-500">this session</div>
            </div>

            {/* Average Audio Load */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Audio Load Time</h3>
              <div className="text-3xl font-bold text-purple-600">
                {formatTime(analytics.metrics.audioLoadTime)}
              </div>
              <div className="text-sm text-gray-500">average</div>
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Core Web Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-700 mb-1">First Contentful Paint</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(analytics.metrics.fcp)}
                </div>
                <div className="text-sm text-gray-500">Target: &lt; 1.8s</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-700 mb-1">Largest Contentful Paint</h4>
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(analytics.metrics.lcp)}
                </div>
                <div className="text-sm text-gray-500">Target: &lt; 2.5s</div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-700 mb-1">First Input Delay</h4>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatTime(analytics.metrics.fid)}
                </div>
                <div className="text-sm text-gray-500">Target: &lt; 100ms</div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-700 mb-1">Cumulative Layout Shift</h4>
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.metrics.cls.toFixed(3)}
                </div>
                <div className="text-sm text-gray-500">Target: &lt; 0.1</div>
              </div>
            </div>
          </div>

          {/* Resource Summary */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Resource Usage Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Audio Resources</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Loads:</span>
                    <span className="font-medium">{analytics.summary.totalAudioLoads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Size:</span>
                    <span className="font-medium">{formatBytes(analytics.summary.averageAudioSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load Time:</span>
                    <span className="font-medium">{formatTime(analytics.metrics.audioLoadTime)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Image Resources</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Loads:</span>
                    <span className="font-medium">{analytics.summary.totalImageLoads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Efficiency:</span>
                    <span className="font-medium">{(analytics.metrics.cacheHitRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className="font-medium">{(analytics.metrics.errorRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Session Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{formatTime(analytics.sessionDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Bandwidth:</span>
                    <span className="font-medium">{formatBytes(analytics.summary.totalBandwidthUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bandwidth Saved:</span>
                    <span className="font-medium text-green-600">{formatBytes(analytics.metrics.bandwidthSaved)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {analytics.summary.recommendations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">Performance Recommendations</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {analytics.summary.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Recent Events */}
          <div>
            <h3 className="text-xl font-bold mb-4">Recent Events (Last 20)</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-1 font-mono text-sm">
                {analytics.events.slice(-20).reverse().map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-1 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        event.type === 'error' ? 'bg-red-100 text-red-800' :
                        event.type === 'cache_hit' ? 'bg-green-100 text-green-800' :
                        event.type === 'cache_miss' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {event.type}
                      </span>
                      <span className="text-gray-600">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {event.duration && <span>{formatTime(event.duration)}</span>}
                      {event.size && <span className="ml-2">{formatBytes(event.size)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}