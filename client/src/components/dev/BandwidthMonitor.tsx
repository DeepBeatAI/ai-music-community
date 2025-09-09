'use client'
import { useState, useEffect } from 'react';
import { audioUrlCache } from '@/utils/audioCache';

// Types for cache statistics
interface CacheEntry {
  key: string;
  expires: Date;
  accessCount: number;
}

interface CacheStats {
  size: number;
  entries: CacheEntry[];
}

export default function BandwidthMonitor() {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const cacheStats = audioUrlCache.getCacheStats();
      setStats(cacheStats);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // In development mode only
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const totalAccessCount = stats?.entries?.reduce((sum: number, entry: CacheEntry) => sum + entry.accessCount, 0) || 0;
  const estimatedSavedCalls = Math.max(0, totalAccessCount - (stats?.size || 0));

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg border border-gray-600 text-xs max-w-xs z-50">
      <h4 className="font-bold mb-2">🔧 Bandwidth Monitor</h4>
      
      <div className="space-y-1">
        <div>Cache Size: {stats?.size || 0}</div>
        <div>Total Access Count: {totalAccessCount}</div>
        
        {stats?.entries?.map((entry: CacheEntry, index: number) => (
          <div key={index} className="text-xs text-gray-400">
            {entry.key}: {entry.accessCount} hits
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className="text-green-400">
          💰 Estimated API Calls Saved: {estimatedSavedCalls}
        </div>
      </div>

      <button
        onClick={() => audioUrlCache.clearCache()}
        className="mt-2 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
      >
        Clear Cache
      </button>
      
      <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-green-400">
        ✅ Live monitoring active
      </div>
    </div>
  );
}
