// Create: src/components/CacheTestDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { metadataCache } from '@/utils/metadataCache';
import { imageCache } from '@/utils/imageCache';
import { audioCacheManager, audioUrlCache } from '@/utils/audioCache';

export default function CacheTestDashboard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({
    metadata: metadataCache.getStats(),
    images: imageCache.getStats(),
    audio: audioCacheManager.getPerformanceStats()
  });
  const [bandwidthStats, setBandwidthStats] = useState(audioUrlCache.getCacheStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        metadata: metadataCache.getStats(),
        images: imageCache.getStats(),
        audio: audioCacheManager.getPerformanceStats()
      });
      setBandwidthStats(audioUrlCache.getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Calculate bandwidth monitoring stats
  const totalAccessCount = bandwidthStats?.entries?.reduce((sum, entry) => sum + entry.accessCount, 0) || 0;
  const estimatedSavedCalls = Math.max(0, totalAccessCount - (bandwidthStats?.size || 0));

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatHitRate = (rate: number) => (rate * 100).toFixed(1) + '%';

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white rounded-lg shadow-lg max-w-sm z-50">
      {/* Minimized Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-800 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Cache Stats</span>
          <span className="text-xs text-gray-400">
            ({stats.audio.totalRequests} reqs, {formatHitRate(stats.audio.hitRate)} hit)
          </span>
        </div>
        <span className="text-lg">{isExpanded ? '▼' : '▲'}</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0"
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-blue-400">Metadata Cache</h4>
              <p className="text-sm">Entries: {stats.metadata.totalEntries}</p>
              <p className="text-sm">Valid: {stats.metadata.validEntries}</p>
              <p className="text-sm">Memory: {formatBytes(stats.metadata.memoryUsage)}</p>
            </div>

            <div>
              <h4 className="font-semibold text-green-400">Image Cache</h4>
              <p className="text-sm">Images: {stats.images.totalImages}</p>
              <p className="text-sm">Size: {formatBytes(stats.images.totalSize)}</p>
              <p className="text-sm">Hit Rate: {formatHitRate(stats.images.hitRate)}</p>
            </div>

            <div>
              <h4 className="font-semibold text-purple-400">Audio Cache</h4>
              <p className="text-sm">Requests: {stats.audio.totalRequests}</p>
              <p className="text-sm">Hit Rate: {formatHitRate(stats.audio.hitRate)}</p>
              <p className="text-sm">Saved: {formatBytes(stats.audio.estimatedBandwidthSaved)}</p>
              <p className="text-sm">Avg Load: {stats.audio.averageLoadTime.toFixed(0)}ms</p>
            </div>

            <div>
              <h4 className="font-semibold text-yellow-400">Bandwidth Monitor</h4>
              <p className="text-sm">Cache Size: {bandwidthStats?.size || 0}</p>
              <p className="text-sm">Total Accesses: {totalAccessCount}</p>
              <p className="text-sm text-green-400">API Calls Saved: {estimatedSavedCalls}</p>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => metadataCache.clear()}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
              >
                Clear Metadata
              </button>
              <button
                onClick={() => imageCache.clearCache()}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
              >
                Clear Images
              </button>
              <button
                onClick={() => audioCacheManager.clearCache()}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
              >
                Clear Audio
              </button>
              <button
                onClick={() => audioUrlCache.clearCache()}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
              >
                Clear Bandwidth
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}