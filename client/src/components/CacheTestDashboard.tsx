// Create: src/components/CacheTestDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { metadataCache } from '@/utils/metadataCache';
import { imageCache } from '@/utils/imageCache';
import { audioCacheManager } from '@/utils/audioCache';

export default function CacheTestDashboard() {
  const [stats, setStats] = useState({
    metadata: metadataCache.getStats(),
    images: imageCache.getStats(),
    audio: audioCacheManager.getPerformanceStats()
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        metadata: metadataCache.getStats(),
        images: imageCache.getStats(),
        audio: audioCacheManager.getPerformanceStats()
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatHitRate = (rate: number) => (rate * 100).toFixed(1) + '%';

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <h3 className="text-lg font-bold mb-3">Cache Performance</h3>
      
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

        <div className="flex gap-2 mt-3">
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
        </div>
      </div>
    </div>
  );
}