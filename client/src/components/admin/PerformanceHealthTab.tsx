'use client';

import { useState, useEffect } from 'react';
import {
  fetchSystemMetrics,
  fetchSystemHealth,
  clearCache,
} from '@/lib/systemHealthService';
import type { SystemHealth, SystemMetric } from '@/types/admin';
import { performanceAnalytics } from '@/utils/performanceAnalytics';

export function PerformanceHealthTab() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientMetrics, setClientMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'server' | 'client'>('server');

  const loadData = async () => {
    setError(null);

    try {
      const [healthData, metricsData] = await Promise.all([
        fetchSystemHealth(),
        fetchSystemMetrics({ metricType: undefined, limit: 100 }),
      ]);

      setSystemHealth(healthData);
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds for server metrics
    const interval = setInterval(loadData, 30000);

    // Auto-refresh every 5 seconds for client metrics
    const clientInterval = setInterval(() => {
      const analytics = performanceAnalytics.getDetailedAnalytics();
      setClientMetrics(analytics);
    }, 5000);

    // Load client metrics immediately
    const analytics = performanceAnalytics.getDetailedAnalytics();
    setClientMetrics(analytics);

    return () => {
      if (interval) clearInterval(interval);
      if (clientInterval) clearInterval(clientInterval);
    };
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all caches?')) return;

    try {
      await clearCache();
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'down':
        return '❌';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-700">Loading system health data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="text-center py-8 text-gray-700">No system health data available</div>
    );
  }

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
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const downloadClientData = () => {
    const data = performanceAnalytics.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-performance-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('server')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'server'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-700 hover:text-gray-900'
          }`}
        >
          Server Metrics
        </button>
        <button
          onClick={() => setActiveTab('client')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'client'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-700 hover:text-gray-900'
          }`}
        >
          Client Performance
        </button>
      </div>

      {/* Server Metrics Tab */}
      {activeTab === 'server' && (
        <>
      {/* System Health Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Health Overview</h3>
          <button
            onClick={loadData}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Database Health */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span>{getStatusIcon(systemHealth.database.status)}</span>
              <span className={`font-medium ${getStatusColor(systemHealth.database.status)}`}>
                Database
              </span>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Connections: {systemHealth.database.connection_count}</p>
              <p>Avg Query Time: {systemHealth.database.avg_query_time}ms</p>
              <p>Slow Queries: {systemHealth.database.slow_queries}</p>
              {systemHealth.database.avg_query_time === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Not actively tracked. Deploy collect-performance-metrics to enable.
                </p>
              )}
            </div>
          </div>

          {/* Storage Health */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span>💾</span>
              <span className="font-medium text-gray-900">Storage</span>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                Used: {systemHealth.storage.used_capacity_gb.toFixed(2)} GB /{' '}
                {systemHealth.storage.total_capacity_gb.toFixed(2)} GB
              </p>
              <p>Usage: {systemHealth.storage.usage_percentage.toFixed(1)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${systemHealth.storage.usage_percentage}%` }}
                ></div>
              </div>
              {systemHealth.storage.used_capacity_gb === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Not actively tracked. Deploy collect-performance-metrics to enable.
                </p>
              )}
            </div>
          </div>

          {/* API Health */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span>{getStatusIcon(systemHealth.api_health.supabase)}</span>
              <span className="font-medium text-gray-900">API Services</span>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                Supabase:{' '}
                <span className={getStatusColor(systemHealth.api_health.supabase)}>
                  {systemHealth.api_health.supabase}
                </span>
              </p>
              <p>
                Vercel:{' '}
                <span className={getStatusColor(systemHealth.api_health.vercel)}>
                  {systemHealth.api_health.vercel}
                </span>
              </p>
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Hardcoded values. Not actively monitored.
              </p>
            </div>
          </div>

          {/* Error Rate */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span>{getStatusIcon(systemHealth.error_rate.status)}</span>
              <span className="font-medium text-gray-900">Error Rate</span>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Current: {(systemHealth.error_rate.current_rate * 100).toFixed(2)}%</p>
              <p>Threshold: {(systemHealth.error_rate.threshold * 100).toFixed(2)}%</p>
              <p>
                Status:{' '}
                <span className={getStatusColor(systemHealth.error_rate.status)}>
                  {systemHealth.error_rate.status}
                </span>
              </p>
              {systemHealth.error_rate.current_rate === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Not actively tracked. Deploy collect-performance-metrics to enable.
                </p>
              )}
            </div>
          </div>

          {/* Uptime */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span>⏱️</span>
              <span className="font-medium text-gray-900">Uptime</span>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Percentage: {systemHealth.uptime.percentage.toFixed(2)}%</p>
              {systemHealth.uptime.last_downtime && (
                <p>
                  Last Downtime:{' '}
                  {new Date(systemHealth.uptime.last_downtime).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Hardcoded value. Not actively monitored.
              </p>
            </div>
          </div>

          {/* Cache Management */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span>🗄️</span>
              <span className="font-medium text-gray-900">Cache</span>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Manage application caches</p>
              <button
                onClick={handleClearCache}
                className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
              >
                Clear All Caches
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Performance Metrics</h3>

        {metrics.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-700 mb-2">No metrics available</p>
            <p className="text-sm text-gray-600 mb-4">
              Performance metrics are not being collected yet.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto text-left">
              <p className="text-sm text-blue-900 font-medium mb-2">
                📊 To enable automatic metric collection:
              </p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Deploy the <code className="bg-blue-100 px-1 rounded">collect-performance-metrics</code> Edge Function</li>
                <li>Set up a cron schedule to run every minute</li>
                <li>Metrics will appear here automatically</li>
              </ol>
              <p className="text-xs text-blue-700 mt-3">
                See <code className="bg-blue-100 px-1 rounded">supabase/functions/collect-performance-metrics/DEPLOYMENT.md</code> for instructions.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group metrics by type */}
            {['page_load_time', 'api_response_time', 'database_query_time', 'cache_hit_rate'].map(
              (metricType) => {
                const typeMetrics = metrics.filter((m) => m.metric_type === metricType);
                if (typeMetrics.length === 0) return null;

                const latestMetric = typeMetrics[0];
                const avgValue =
                  typeMetrics.reduce((sum, m) => sum + m.metric_value, 0) / typeMetrics.length;

                return (
                  <div key={metricType} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 capitalize">
                        {metricType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-700">
                        {typeMetrics.length} samples
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-700">Latest</p>
                        <p className="text-xl font-bold text-gray-900">
                          {latestMetric.metric_value.toFixed(2)} {latestMetric.metric_unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-700">Average</p>
                        <p className="text-xl font-bold text-gray-900">
                          {avgValue.toFixed(2)} {latestMetric.metric_unit}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-sm text-gray-700">
        Auto-refreshing every 30 seconds
      </div>
        </>
      )}

      {/* Client Performance Tab */}
      {activeTab === 'client' && clientMetrics && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={downloadClientData}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm"
            >
              📥 Export Data
            </button>
          </div>

          {/* Performance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-2">Performance Score</h3>
              <div className={`text-3xl font-bold ${getScoreColor(clientMetrics.summary.performanceScore)}`}>
                {clientMetrics.summary.performanceScore.toFixed(0)}
              </div>
              <div className="text-sm text-gray-500">out of 100</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-2">Cache Hit Rate</h3>
              <div className="text-3xl font-bold text-blue-600">
                {(clientMetrics.metrics.cacheHitRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                {clientMetrics.metrics.totalRequests} requests
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-2">Bandwidth Saved</h3>
              <div className="text-3xl font-bold text-green-600">
                {formatBytes(clientMetrics.metrics.bandwidthSaved)}
              </div>
              <div className="text-sm text-gray-500">this session</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-2">Audio Load Time</h3>
              <div className="text-3xl font-bold text-purple-600">
                {formatTime(clientMetrics.metrics.audioLoadTime)}
              </div>
              <div className="text-sm text-gray-500">average</div>
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-700 mb-1 text-sm">First Contentful Paint</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(clientMetrics.metrics.fcp)}
                </div>
                <div className="text-xs text-gray-500">Target: &lt; 1.8s</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-700 mb-1 text-sm">Largest Contentful Paint</h4>
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(clientMetrics.metrics.lcp)}
                </div>
                <div className="text-xs text-gray-500">Target: &lt; 2.5s</div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-700 mb-1 text-sm">First Input Delay</h4>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatTime(clientMetrics.metrics.fid)}
                </div>
                <div className="text-xs text-gray-500">Target: &lt; 100ms</div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-700 mb-1 text-sm">Cumulative Layout Shift</h4>
                <div className="text-2xl font-bold text-purple-600">
                  {clientMetrics.metrics.cls.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500">Target: &lt; 0.1</div>
              </div>
            </div>
          </div>

          {/* Resource Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Usage Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Audio Resources</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Loads:</span>
                    <span className="font-medium text-gray-900">{clientMetrics.summary.totalAudioLoads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Average Size:</span>
                    <span className="font-medium text-gray-900">{formatBytes(clientMetrics.summary.averageAudioSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Load Time:</span>
                    <span className="font-medium text-gray-900">{formatTime(clientMetrics.metrics.audioLoadTime)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Image Resources</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Loads:</span>
                    <span className="font-medium text-gray-900">{clientMetrics.summary.totalImageLoads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Cache Efficiency:</span>
                    <span className="font-medium text-gray-900">{(clientMetrics.metrics.cacheHitRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Error Rate:</span>
                    <span className="font-medium text-gray-900">{(clientMetrics.metrics.errorRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Session Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Duration:</span>
                    <span className="font-medium text-gray-900">{formatTime(clientMetrics.sessionDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Bandwidth:</span>
                    <span className="font-medium text-gray-900">{formatBytes(clientMetrics.summary.totalBandwidthUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Bandwidth Saved:</span>
                    <span className="font-medium text-green-600">{formatBytes(clientMetrics.metrics.bandwidthSaved)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {clientMetrics.summary.recommendations.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Recommendations</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {clientMetrics.summary.recommendations.map((rec: string, index: number) => (
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events (Last 20)</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-1 font-mono text-sm">
                {clientMetrics.events.slice(-20).reverse().map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
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

          {/* Auto-refresh indicator */}
          <div className="text-center text-sm text-gray-700 mt-4">
            Auto-refreshing every 5 seconds
          </div>
        </>
      )}
    </div>
  );
}
