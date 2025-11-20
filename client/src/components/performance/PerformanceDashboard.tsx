'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { metadataCache } from '@/utils/metadataCache';
import { imageCache } from '@/utils/imageCache';
import { audioCacheManager, audioUrlCache } from '@/utils/audioCache';

type TabType = 'overview' | 'performance' | 'cache' | 'bandwidth';

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// MetricCard component
function MetricCard({ 
  label, 
  value, 
  color = 'blue',
  icon 
}: { 
  label: string; 
  value: string | number; 
  color?: 'blue' | 'green' | 'yellow' | 'red';
  icon?: React.ReactNode;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function PerformanceDashboard() {
  const { isAdmin } = useAdmin();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!autoRefresh || !isExpanded) return;

    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, isExpanded]);

  const handleGenerateReport = () => {
    console.log('=== Performance Report ===');
    console.log('Session Duration:', getSessionDuration());
    console.log('Cache Stats:', getCacheStats());
    console.log('Performance Metrics:', getPerformanceMetrics());
    console.log('Bandwidth Stats:', getBandwidthStats());
    console.log('========================');
    alert('Performance report generated in console');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all performance data?')) {
      // Clear localStorage/sessionStorage
      localStorage.removeItem('cacheStats');
      localStorage.removeItem('performanceMetrics');
      localStorage.removeItem('bandwidthStats');
      sessionStorage.removeItem('sessionStart');
      
      // Clear actual cache utilities
      metadataCache.clear();
      imageCache.clearCache();
      audioCacheManager.clearCache();
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      alert('Performance data reset successfully');
    }
  };

  // Helper functions to get metrics from localStorage
  function getSessionDuration(): number {
    const sessionStart = sessionStorage.getItem('sessionStart');
    if (!sessionStart) {
      sessionStorage.setItem('sessionStart', Date.now().toString());
      return 0;
    }
    return Math.floor((Date.now() - parseInt(sessionStart)) / 1000);
  }

  function getCacheStats() {
    try {
      // Get stats from actual cache utilities
      const audioStats = audioCacheManager.getPerformanceStats();
      const imageStats = imageCache.getStats();
      
      // Calculate combined hits and misses
      const audioHits = Math.round(audioStats.totalRequests * audioStats.hitRate);
      const audioMisses = audioStats.totalRequests - audioHits;
      const imageHits = Math.round(imageStats.totalImages * imageStats.hitRate);
      const imageMisses = imageStats.totalImages - imageHits;
      
      return {
        hits: audioHits + imageHits,
        misses: audioMisses + imageMisses
      };
    } catch {
      return { hits: 0, misses: 0 };
    }
  }

  function getPerformanceMetrics() {
    try {
      return JSON.parse(localStorage.getItem('performanceMetrics') || '{"renders":0,"effects":0,"warnings":[]}');
    } catch {
      return { renders: 0, effects: 0, warnings: [] };
    }
  }

  function getBandwidthStats() {
    try {
      // Get stats from actual audio cache
      const audioStats = audioCacheManager.getPerformanceStats();
      const urlCacheStats = audioUrlCache.getCacheStats();
      
      // Calculate bandwidth metrics
      const estimatedAudioSize = 3 * 1024 * 1024; // 3MB average per audio file
      const totalTransfer = audioStats.totalRequests * estimatedAudioSize;
      const cachedTransfer = Math.round(audioStats.totalRequests * audioStats.hitRate * estimatedAudioSize);
      const savedBandwidth = audioStats.estimatedBandwidthSaved;
      
      // Build resources array from URL cache
      const resources = (urlCacheStats?.entries || []).map((entry: { key: string; expires: Date; accessCount: number }) => ({
        url: entry.key.length > 30 ? entry.key.substring(0, 30) + '...' : entry.key,
        size: estimatedAudioSize,
        cached: entry.accessCount > 1
      }));
      
      return {
        total: totalTransfer,
        cached: cachedTransfer,
        saved: savedBandwidth,
        resources: resources.slice(0, 10) // Top 10
      };
    } catch (error) {
      console.error('Error getting bandwidth stats:', error);
      return { total: 0, cached: 0, saved: 0, resources: [] };
    }
  }

  function getCacheData(key: string) {
    try {
      // Map localStorage keys to actual cache utilities
      if (key === 'metadataCache') {
        return metadataCache.getStats();
      } else if (key === 'imagesCache') {
        return imageCache.getStats();
      } else if (key === 'audioCache') {
        return audioCacheManager.getPerformanceStats();
      }
      
      // Fallback to localStorage for other keys
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  function calculateCacheSize(cacheData: unknown): number {
    if (!cacheData) return 0;
    
    // Handle actual cache stats objects
    if (typeof cacheData === 'object' && cacheData !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = cacheData as any;
      
      // For image cache stats
      if ('totalSize' in data) {
        return data.totalSize;
      }
      
      // For metadata cache stats
      if ('memoryUsage' in data) {
        return data.memoryUsage;
      }
      
      // For audio cache stats - estimate based on requests
      if ('totalRequests' in data) {
        // Rough estimate: assume average audio file is 3MB
        return data.totalRequests * 3 * 1024 * 1024;
      }
    }
    
    // Fallback: calculate from JSON string
    const str = JSON.stringify(cacheData);
    return new Blob([str]).size;
  }

  function clearCache(key: string) {
    // Clear actual cache utilities
    if (key === 'metadataCache') {
      metadataCache.clear();
    } else if (key === 'imagesCache') {
      imageCache.clearCache();
    } else if (key === 'audioCache') {
      audioCacheManager.clearCache();
    } else {
      // Fallback to localStorage
      localStorage.removeItem(key);
    }
    
    setRefreshTrigger(prev => prev + 1);
  }

  // OverviewTab Component
  function OverviewTab() {
    const [metrics, setMetrics] = useState({
      sessionDuration: 0,
      cacheHitRate: 0,
      apiCallsSaved: 0,
      optimizationStatus: 'Poor'
    });

    useEffect(() => {
      const updateMetrics = () => {
        const duration = getSessionDuration();
        const cacheStats = getCacheStats();
        const total = cacheStats.hits + cacheStats.misses;
        const hitRate = total > 0 ? Math.round((cacheStats.hits / total) * 100) : 0;
        
        let status = 'Poor';
        if (hitRate >= 80) status = 'Excellent';
        else if (hitRate >= 50) status = 'Good';

        setMetrics({
          sessionDuration: duration,
          cacheHitRate: hitRate,
          apiCallsSaved: cacheStats.hits,
          optimizationStatus: status
        });
      };

      updateMetrics();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const statusColor = metrics.optimizationStatus === 'Excellent' ? 'green' : 
                       metrics.optimizationStatus === 'Good' ? 'blue' : 'yellow';

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Session Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard 
            label="Session Duration" 
            value={formatDuration(metrics.sessionDuration)}
            color="blue"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
          <MetricCard 
            label="Cache Hit Rate" 
            value={`${metrics.cacheHitRate}%`}
            color={statusColor}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>}
          />
          <MetricCard 
            label="API Calls Saved" 
            value={metrics.apiCallsSaved}
            color="green"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
          <MetricCard 
            label="Optimization Status" 
            value={metrics.optimizationStatus}
            color={statusColor}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>}
          />
        </div>
      </div>
    );
  }

  // PerformanceTab Component
  function PerformanceTab() {
    const [metrics, setMetrics] = useState({
      renders: 0,
      effects: 0,
      warnings: [] as string[]
    });

    useEffect(() => {
      const updateMetrics = () => {
        const perfMetrics = getPerformanceMetrics();
        setMetrics(perfMetrics);
      };

      updateMetrics();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard 
            label="Component Renders" 
            value={metrics.renders}
            color="blue"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>}
          />
          <MetricCard 
            label="Effect Executions" 
            value={metrics.effects}
            color="blue"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>}
          />
        </div>
        {metrics.warnings.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Performance Warnings</h4>
            <div className="space-y-2">
              {metrics.warnings.map((warning, index) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}
        {metrics.warnings.length === 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            No performance warnings detected
          </div>
        )}
      </div>
    );
  }

  // CacheTab Component
  function CacheTab() {
    const [cacheStats, setCacheStats] = useState({
      metadata: { size: 0, items: 0, hits: 0 },
      images: { size: 0, items: 0, hits: 0 },
      audio: { size: 0, items: 0, hits: 0 }
    });

    useEffect(() => {
      const updateStats = () => {
        const metadataStats = getCacheData('metadataCache');
        const imagesStats = getCacheData('imagesCache');
        const audioStats = getCacheData('audioCache');

        setCacheStats({
          metadata: {
            size: calculateCacheSize(metadataStats),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: (metadataStats as any)?.totalEntries || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hits: (metadataStats as any)?.validEntries || 0
          },
          images: {
            size: calculateCacheSize(imagesStats),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: (imagesStats as any)?.totalImages || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hits: Math.round(((imagesStats as any)?.totalImages || 0) * ((imagesStats as any)?.hitRate || 0))
          },
          audio: {
            size: calculateCacheSize(audioStats),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: (audioStats as any)?.totalRequests || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hits: Math.round(((audioStats as any)?.totalRequests || 0) * ((audioStats as any)?.hitRate || 0))
          }
        });
      };

      updateStats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const CacheTypeCard = ({ 
      title, 
      stats, 
      cacheKey 
    }: { 
      title: string; 
      stats: { size: number; items: number; hits: number }; 
      cacheKey: string;
    }) => (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <button
            onClick={() => clearCache(cacheKey)}
            className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Size:</span>
            <span className="font-medium text-gray-900">{formatBytes(stats.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Items:</span>
            <span className="font-medium text-gray-900">{stats.items}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Hits:</span>
            <span className="font-medium text-gray-900">{stats.hits}</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Cache Statistics</h3>
        <div className="space-y-3">
          <CacheTypeCard title="Metadata Cache" stats={cacheStats.metadata} cacheKey="metadataCache" />
          <CacheTypeCard title="Images Cache" stats={cacheStats.images} cacheKey="imagesCache" />
          <CacheTypeCard title="Audio Cache" stats={cacheStats.audio} cacheKey="audioCache" />
        </div>
      </div>
    );
  }

  // BandwidthTab Component
  function BandwidthTab() {
    const [bandwidthStats, setBandwidthStats] = useState({
      total: 0,
      cached: 0,
      saved: 0,
      resources: [] as Array<{ url: string; size: number; cached: boolean }>
    });

    useEffect(() => {
      const updateStats = () => {
        const stats = getBandwidthStats();
        setBandwidthStats(stats);
      };

      updateStats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const clearBandwidthData = () => {
      localStorage.removeItem('bandwidthStats');
      setRefreshTrigger(prev => prev + 1);
    };

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Bandwidth Usage</h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard 
            label="Total Transfer" 
            value={formatBytes(bandwidthStats.total)}
            color="blue"
          />
          <MetricCard 
            label="Cached Transfer" 
            value={formatBytes(bandwidthStats.cached)}
            color="green"
          />
          <MetricCard 
            label="Saved Bandwidth" 
            value={formatBytes(bandwidthStats.saved)}
            color="green"
          />
        </div>

        {bandwidthStats.resources.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">Top Resources</h4>
              <button
                onClick={clearBandwidthData}
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                Clear Data
              </button>
            </div>
            <div className="space-y-2">
              {bandwidthStats.resources.slice(0, 5).map((resource, index) => (
                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {resource.cached && (
                        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span className="text-sm text-gray-700 truncate">{resource.url}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 ml-2">{formatBytes(resource.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bandwidthStats.resources.length === 0 && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            No bandwidth data available yet
          </div>
        )}
      </div>
    );
  }

  // Hide from non-admin users
  if (!isAdmin) {
    return null;
  }

  // Collapsed state - fixed button in bottom-right (above mini player)
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-24 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg shadow-lg transition-colors z-50 flex items-center gap-2"
        aria-label="Open Performance Dashboard"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span className="font-medium">Performance</span>
      </button>
    );
  }

  // Expanded state - panel with tabs (above mini player)
  return (
    <div className="fixed bottom-24 right-4 bg-white rounded-lg shadow-2xl z-50 w-[600px] max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            Performance Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>

          {/* Close button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close Dashboard"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'performance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('cache')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'cache'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          Cache
        </button>
        <button
          onClick={() => setActiveTab('bandwidth')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bandwidth'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          Bandwidth
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'performance' && <PerformanceTab />}
        {activeTab === 'cache' && <CacheTab />}
        {activeTab === 'bandwidth' && <BandwidthTab />}
      </div>

      {/* Footer with action buttons */}
      <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleGenerateReport}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}
