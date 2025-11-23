'use client';

import { useState, useEffect } from 'react';
import {
  fetchSystemMetrics,
  fetchSystemHealth,
  clearCache,
} from '@/lib/systemHealthService';
import type { SystemHealth, SystemMetric } from '@/types/admin';

export function PerformanceHealthTab() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all caches?')) return;

    try {
      await clearCache();
      alert('Cache cleared successfully');
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

  return (
    <div className="space-y-6">
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
          <p className="text-gray-700 text-center py-4">No metrics available</p>
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
    </div>
  );
}
