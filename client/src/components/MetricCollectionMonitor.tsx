'use client';

import { useEffect, useState } from 'react';
import { getCollectionStatus, triggerMetricCollection } from '@/lib/analytics';
import type { CollectionStatus } from '@/types/analytics';

/**
 * MetricCollectionMonitor Component
 * 
 * Admin monitoring component that displays the status of the most recent
 * metric collection run and provides a manual trigger button.
 */
export default function MetricCollectionMonitor() {
  const [status, setStatus] = useState<CollectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);

  /**
   * Load collection status from the database
   */
  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const collectionStatus = await getCollectionStatus();
      setStatus(collectionStatus);
    } catch (err) {
      console.error('Error loading collection status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Trigger manual metric collection
   */
  const handleTriggerCollection = async () => {
    try {
      setTriggering(true);
      setTriggerSuccess(false);
      setError(null);

      // Trigger collection for today's date
      const today = new Date().toISOString().split('T')[0];
      await triggerMetricCollection(today);
      
      setTriggerSuccess(true);
      
      // Reload status after a short delay to show updated results
      setTimeout(() => {
        loadStatus();
      }, 1000);
    } catch (err) {
      console.error('Error triggering collection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to trigger collection: ${errorMessage}`);
    } finally {
      setTriggering(false);
    }
  };

  /**
   * Load status on mount and set up auto-refresh
   */
  useEffect(() => {
    loadStatus();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Format duration in milliseconds to human-readable format
   */
  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  /**
   * Format timestamp to relative time
   */
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  };

  /**
   * Get status badge color based on collection status
   */
  const getStatusColor = (statusValue: string): string => {
    switch (statusValue) {
      case 'completed':
        return 'bg-green-900/30 text-green-400 border-green-700';
      case 'failed':
        return 'bg-red-900/30 text-red-400 border-red-700';
      case 'running':
        return 'bg-blue-900/30 text-blue-400 border-blue-700';
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">
          Metric Collection Status
        </h2>
        <button
          onClick={handleTriggerCollection}
          disabled={triggering || status?.status === 'running'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          title="Manually trigger metric collection"
        >
          {triggering ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Collecting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Trigger Collection
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {triggerSuccess && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-4">
          <p className="text-green-400 text-sm">
            ✓ Metric collection triggered successfully
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Status Display */}
      {status ? (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-medium">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status.status)}`}>
              {status.status.toUpperCase()}
            </span>
          </div>

          {/* Last Run Time */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-medium">Last Run:</span>
            <span className="text-white text-sm">
              {formatRelativeTime(status.last_run)}
            </span>
            <span className="text-gray-500 text-xs">
              ({new Date(status.last_run).toLocaleString()})
            </span>
          </div>

          {/* Metrics Collected */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-medium">Metrics Collected:</span>
            <span className="text-white text-sm font-semibold">
              {status.metrics_collected}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-medium">Duration:</span>
            <span className="text-white text-sm">
              {formatDuration(status.duration_ms)}
            </span>
          </div>

          {/* Error Message (if failed) */}
          {status.error_message && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm font-medium mb-2">Error Details:</p>
              <p className="text-red-300 text-sm font-mono break-all">
                {status.error_message}
              </p>
            </div>
          )}

          {/* Running Indicator */}
          {status.status === 'running' && (
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-blue-400 text-sm">
                Collection is currently in progress...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">
            No collection runs found. Click &quot;Trigger Collection&quot; to start the first run.
          </p>
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs text-center">
          Status auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
}
