'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ModeratorReversalStats } from './ModeratorReversalStats';

interface ReversalMetrics {
  startDate: string;
  endDate: string;
  totalActions: number;
  totalReversals: number;
  overallReversalRate: number;
  perModeratorStats: Array<{
    moderatorId: string;
    totalActions: number;
    reversedActions: number;
    reversalRate: number;
    averageTimeToReversalHours: number | null;
  }>;
  timeToReversalStats: {
    averageHours: number;
    medianHours: number;
    minHours: number;
    maxHours: number;
    totalReversals: number;
  };
  reversalByActionType: Array<{
    actionType: string;
    totalActions: number;
    reversedActions: number;
    reversalRate: number;
  }>;
}

interface ReversalMetricsPanelProps {
  startDate?: string;
  endDate?: string;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  content_removed: 'Content Removed',
  content_approved: 'Content Approved',
  user_warned: 'User Warned',
  user_suspended: 'User Suspended',
  user_banned: 'User Banned',
  restriction_applied: 'Restriction Applied',
};

export function ReversalMetricsPanel({ startDate, endDate }: ReversalMetricsPanelProps) {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<ReversalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to last 30 days if no dates provided
  const effectiveEndDate = endDate || new Date().toISOString();
  const effectiveStartDate =
    startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('get_reversal_metrics', {
          p_start_date: effectiveStartDate,
          p_end_date: effectiveEndDate,
        });

        if (rpcError) {
          throw rpcError;
        }

        if (!data) {
          throw new Error('No data returned from get_reversal_metrics');
        }

        setMetrics(data as ReversalMetrics);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
        console.error('Error fetching reversal metrics:', err);
        setError(errorMessage);
        showToast('Failed to load reversal metrics', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [effectiveStartDate, effectiveEndDate, showToast]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-700 rounded mb-4"></div>
              <div className="h-10 w-20 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
        {/* Skeleton for chart */}
        <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-6 w-40 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-900/20 mb-6">
            <span className="text-5xl">⚠️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Failed to load reversal metrics</h3>
          <p className="text-gray-400 mb-6">
            {error || 'We couldn\'t load the reversal metrics. This might be a temporary issue.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate trend indicator (simplified - would need historical data for real trend)
  const getTrendIndicator = (rate: number) => {
    if (rate < 10) return { color: 'text-green-400', icon: '↓', label: 'Low' };
    if (rate < 20) return { color: 'text-yellow-400', icon: '→', label: 'Moderate' };
    return { color: 'text-red-400', icon: '↑', label: 'High' };
  };

  const trend = getTrendIndicator(metrics.overallReversalRate);

  return (
    <div className="space-y-6">
      {/* Header with date range */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Reversal Metrics</h3>
          <div className="text-sm text-gray-400">
            {new Date(effectiveStartDate).toLocaleDateString()} -{' '}
            {new Date(effectiveEndDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Reversal Rate */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Overall Reversal Rate</h4>
          <div className="flex items-baseline space-x-2">
            <span className={`text-4xl font-bold ${trend.color}`}>
              {metrics.overallReversalRate.toFixed(1)}%
            </span>
            <span className={`text-2xl ${trend.color}`}>{trend.icon}</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {metrics.totalReversals} of {metrics.totalActions} actions reversed
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                trend.label === 'Low'
                  ? 'bg-green-900/30 text-green-400'
                  : trend.label === 'Moderate'
                  ? 'bg-yellow-900/30 text-yellow-400'
                  : 'bg-red-900/30 text-red-400'
              }`}
            >
              {trend.label} reversal rate
            </span>
          </div>
        </div>

        {/* Average Time to Reversal */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Avg Time to Reversal</h4>
          <div className="text-4xl font-bold text-purple-400">
            {metrics.timeToReversalStats.averageHours.toFixed(1)}h
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Median: {metrics.timeToReversalStats.medianHours.toFixed(1)}h
          </p>
          <div className="mt-2 text-xs text-gray-500">
            Range: {metrics.timeToReversalStats.minHours.toFixed(1)}h -{' '}
            {metrics.timeToReversalStats.maxHours.toFixed(1)}h
          </div>
        </div>

        {/* Total Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Total Actions</h4>
          <div className="text-4xl font-bold text-blue-400">{metrics.totalActions}</div>
          <p className="text-sm text-gray-400 mt-2">In selected period</p>
        </div>

        {/* Total Reversals */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Total Reversals</h4>
          <div className="text-4xl font-bold text-orange-400">{metrics.totalReversals}</div>
          <p className="text-sm text-gray-400 mt-2">Actions reversed</p>
        </div>
      </div>

      {/* Reversal Rate by Action Type */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Reversal Rate by Action Type</h3>
        {metrics.reversalByActionType.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No actions in the selected period</p>
        ) : (
          <div className="space-y-4">
            {metrics.reversalByActionType
              .sort((a, b) => b.reversalRate - a.reversalRate)
              .map((actionType) => {
                const label =
                  ACTION_TYPE_LABELS[actionType.actionType] || actionType.actionType;
                const isHighRate = actionType.reversalRate > 25;

                return (
                  <div key={actionType.actionType}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-300">{label}</span>
                        {isHighRate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400">
                            High reversal rate
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${
                            isHighRate ? 'text-red-400' : 'text-gray-300'
                          }`}
                        >
                          {actionType.reversalRate.toFixed(1)}%
                        </span>
                        <span className="text-gray-400 text-sm ml-2">
                          ({actionType.reversedActions}/{actionType.totalActions})
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          isHighRate ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(actionType.reversalRate, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Top Reversal Reasons (extracted from metadata) */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Common Reversal Patterns</h3>
        <div className="space-y-3">
          {metrics.timeToReversalStats.totalReversals === 0 ? (
            <p className="text-gray-400 text-center py-8">No reversals in the selected period</p>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-300">Quick Reversals (&lt; 1 hour)</span>
                <span className="text-blue-400 font-semibold">
                  {
                    metrics.reversalByActionType.filter(
                      (at) => at.reversalRate > 0 && at.totalActions > 0
                    ).length
                  }{' '}
                  action types
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-300">Average Detection Time</span>
                <span className="text-purple-400 font-semibold">
                  {metrics.timeToReversalStats.averageHours.toFixed(1)} hours
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-300">Fastest Reversal</span>
                <span className="text-green-400 font-semibold">
                  {metrics.timeToReversalStats.minHours.toFixed(1)} hours
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span className="text-gray-300">Slowest Reversal</span>
                <span className="text-orange-400 font-semibold">
                  {metrics.timeToReversalStats.maxHours.toFixed(1)} hours
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Alert for high reversal rate */}
      {metrics.overallReversalRate > 20 && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="text-red-400 font-semibold mb-1">High Reversal Rate Detected</h4>
              <p className="text-gray-300 text-sm">
                The overall reversal rate of {metrics.overallReversalRate.toFixed(1)}% exceeds the
                recommended threshold of 20%. This may indicate issues with moderation quality or
                unclear guidelines. Consider reviewing moderation practices and providing additional
                training.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert for slow reversal time */}
      {metrics.timeToReversalStats.averageHours > 48 && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⏰</span>
            <div>
              <h4 className="text-yellow-400 font-semibold mb-1">Slow Reversal Detection</h4>
              <p className="text-gray-300 text-sm">
                The average time to reversal of {metrics.timeToReversalStats.averageHours.toFixed(1)}{' '}
                hours exceeds 48 hours. Mistakes are taking too long to correct. Consider
                implementing more frequent quality checks or peer review processes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Moderator Reversal Statistics */}
      {metrics.perModeratorStats && metrics.perModeratorStats.length > 0 && (
        <ModeratorReversalStats
          perModeratorStats={metrics.perModeratorStats}
          startDate={effectiveStartDate}
          endDate={effectiveEndDate}
        />
      )}
    </div>
  );
}
