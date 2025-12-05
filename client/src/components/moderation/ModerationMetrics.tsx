'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  calculateModerationMetrics,
  isAdmin,
  ModerationMetrics as MetricsData,
  MetricsDateRange,
} from '@/lib/moderationService';
import { REASON_LABELS, ACTION_TYPE_LABELS } from '@/types/moderation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ReversalTooltip } from './ReversalTooltip';

interface ReversalMetricsSummary {
  overallReversalRate: number;
  totalReversals: number;
  totalActions: number;
  averageTimeToReversalHours: number;
  recentReversals: Array<{
    id: string;
    action_type: string;
    target_user_id: string;
    revoked_at: string;
    revoked_by: string;
    reversal_reason: string;
  }>;
}

export function ModerationMetrics() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [dateRange, setDateRange] = useState<MetricsDateRange | undefined>(undefined);
  const [includeSLA, setIncludeSLA] = useState(false);
  const [includeTrends, setIncludeTrends] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [reversalMetrics, setReversalMetrics] = useState<ReversalMetricsSummary | null>(null);
  const [reversalLoading, setReversalLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isAdmin(user.id);
        setIsAdminUser(adminStatus);
      }
    };
    checkAdminStatus();
  }, [user]);

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await calculateModerationMetrics(dateRange, includeSLA, includeTrends);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch moderation metrics:', error);
        showToast('Failed to load metrics', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [showToast, dateRange, includeSLA, includeTrends]);

  // Fetch reversal metrics summary
  useEffect(() => {
    const fetchReversalMetrics = async () => {
      try {
        setReversalLoading(true);

        // Calculate date range (last 30 days if not specified)
        const endDate = dateRange?.endDate || new Date().toISOString();
        const startDate =
          dateRange?.startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch reversal metrics from database function
        const { data: metricsData, error: metricsError } = await supabase.rpc(
          'get_reversal_metrics',
          {
            p_start_date: startDate,
            p_end_date: endDate,
          }
        );

        if (metricsError) {
          throw metricsError;
        }

        // Fetch recent reversals (last 5)
        const { data: recentReversalsData, error: reversalsError } = await supabase
          .from('moderation_actions')
          .select('id, action_type, target_user_id, revoked_at, revoked_by, metadata')
          .not('revoked_at', 'is', null)
          .order('revoked_at', { ascending: false })
          .limit(5);

        if (reversalsError) {
          throw reversalsError;
        }

        // Extract reversal reason from metadata
        const recentReversals = (recentReversalsData || []).map((action) => ({
          id: action.id,
          action_type: action.action_type,
          target_user_id: action.target_user_id,
          revoked_at: action.revoked_at!,
          revoked_by: action.revoked_by!,
          reversal_reason:
            (action.metadata as { reversal_reason?: string })?.reversal_reason ||
            'No reason provided',
        }));

        setReversalMetrics({
          overallReversalRate: metricsData.overall_reversal_rate || 0,
          totalReversals: metricsData.total_reversals || 0,
          totalActions: metricsData.total_actions || 0,
          averageTimeToReversalHours: metricsData.time_to_reversal_stats?.average_hours || 0,
          recentReversals,
        });
      } catch (error) {
        console.error('Failed to fetch reversal metrics:', error);
        // Don't show toast for reversal metrics failure - it's supplementary
      } finally {
        setReversalLoading(false);
      }
    };

    fetchReversalMetrics();
  }, [dateRange]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const data = await calculateModerationMetrics(dateRange, includeSLA, includeTrends);
        setMetrics(data);
      } catch (error) {
        console.error('Failed to auto-refresh metrics:', error);
        // Don't show toast for auto-refresh failures to avoid spam
      }
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, dateRange, includeSLA, includeTrends]);

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-700 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  <div className="h-8 w-12 bg-gray-700 rounded"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-gray-700 rounded"></div>
                  <div className="h-8 w-12 bg-gray-700 rounded"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-700 rounded"></div>
                  <div className="h-8 w-12 bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton for charts */}
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

  // Error state with retry
  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-900/20 mb-6">
            <span className="text-5xl">⚠️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Failed to load metrics</h3>
          <p className="text-gray-400 mb-6">
            We couldn&apos;t load the moderation metrics. This might be a temporary issue.
          </p>
          <button
            onClick={async () => {
              try {
                setLoading(true);
                const data = await calculateModerationMetrics(dateRange, includeSLA, includeTrends);
                setMetrics(data);
              } catch (error) {
                console.error('Failed to refresh metrics:', error);
                showToast('Failed to refresh metrics', 'error');
              } finally {
                setLoading(false);
              }
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter and Options */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Metrics Options</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date Range (Optional)
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange?.startDate?.split('T')[0] || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateRange({
                      startDate: new Date(e.target.value).toISOString(),
                      endDate: dateRange?.endDate || new Date().toISOString(),
                    });
                  } else {
                    setDateRange(undefined);
                  }
                }}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 self-center">to</span>
              <input
                type="date"
                value={dateRange?.endDate?.split('T')[0] || ''}
                onChange={(e) => {
                  if (e.target.value && dateRange?.startDate) {
                    setDateRange({
                      startDate: dateRange.startDate,
                      endDate: new Date(e.target.value).toISOString(),
                    });
                  }
                }}
                disabled={!dateRange?.startDate}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {dateRange && (
              <button
                onClick={() => setDateRange(undefined)}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Clear date range
              </button>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSLA}
                onChange={(e) => setIncludeSLA(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Include SLA Compliance</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTrends}
                onChange={(e) => setIncludeTrends(e.target.checked)}
                disabled={!dateRange}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-300">
                Include Trends (requires date range)
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Auto-refresh</span>
            </label>
            {autoRefresh && (
              <div className="ml-6">
                <label className="block text-xs text-gray-400 mb-1">
                  Refresh interval (seconds)
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reports Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Reports Received */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Reports Received</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Today</span>
              <span className="text-2xl font-bold text-blue-400">
                {metrics.reportsReceived.today}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">This Week</span>
              <span className="text-2xl font-bold text-blue-400">
                {metrics.reportsReceived.week}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">This Month</span>
              <span className="text-2xl font-bold text-blue-400">
                {metrics.reportsReceived.month}
              </span>
            </div>
          </div>
        </div>

        {/* Reports Resolved */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Reports Resolved</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Today</span>
              <span className="text-2xl font-bold text-green-400">
                {metrics.reportsResolved.today}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">This Week</span>
              <span className="text-2xl font-bold text-green-400">
                {metrics.reportsResolved.week}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">This Month</span>
              <span className="text-2xl font-bold text-green-400">
                {metrics.reportsResolved.month}
              </span>
            </div>
          </div>
        </div>

        {/* Average Resolution Time */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Average Resolution Time
          </h3>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {metrics.averageResolutionTime.hours}h {metrics.averageResolutionTime.minutes}m
              </div>
              <p className="text-gray-400 text-sm">Last 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reversal Metrics Summary */}
      {!reversalLoading && reversalMetrics && (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Reversal Metrics</h3>
            <Link
              href="/moderation?tab=reversals"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Detailed Report →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Reversal Rate Card */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Reversal Rate</span>
                {reversalMetrics.overallReversalRate > 20 && (
                  <span className="text-red-400 text-xs">⚠️ High</span>
                )}
              </div>
              <div
                className={`text-3xl font-bold ${
                  reversalMetrics.overallReversalRate > 20
                    ? 'text-red-400'
                    : reversalMetrics.overallReversalRate > 10
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}
              >
                {reversalMetrics.overallReversalRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {reversalMetrics.totalReversals} of {reversalMetrics.totalActions} actions
              </p>
            </div>

            {/* Total Reversals Card */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <span className="text-sm text-gray-400 block mb-2">Total Reversals</span>
              <div className="text-3xl font-bold text-orange-400">
                {reversalMetrics.totalReversals}
              </div>
              <p className="text-xs text-gray-500 mt-1">Actions reversed</p>
            </div>

            {/* Avg Time to Reversal Card */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Avg Time to Reversal</span>
                {reversalMetrics.averageTimeToReversalHours > 48 && (
                  <span className="text-yellow-400 text-xs">⏰ Slow</span>
                )}
              </div>
              <div className="text-3xl font-bold text-purple-400">
                {reversalMetrics.averageTimeToReversalHours.toFixed(1)}h
              </div>
              <p className="text-xs text-gray-500 mt-1">Detection time</p>
            </div>
          </div>

          {/* Recent Reversals List */}
          {reversalMetrics.recentReversals.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Recent Reversals</h4>
              <div className="space-y-2">
                {reversalMetrics.recentReversals.map((reversal) => {
                  // Create a minimal action object for the tooltip
                  const actionForTooltip = {
                    id: reversal.id,
                    action_type: reversal.action_type,
                    target_user_id: reversal.target_user_id,
                    revoked_at: reversal.revoked_at,
                    revoked_by: reversal.revoked_by,
                    metadata: { reversal_reason: reversal.reversal_reason },
                  } as any;

                  return (
                    <ReversalTooltip key={reversal.id} action={actionForTooltip} position="left">
                      <div
                        className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-help"
                      >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-300">
                          {ACTION_TYPE_LABELS[
                            reversal.action_type as keyof typeof ACTION_TYPE_LABELS
                          ] || reversal.action_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(reversal.revoked_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {reversal.reversal_reason}
                      </p>
                    </div>
                    <Link
                      href={`/moderation?tab=logs&action=${reversal.id}`}
                      className="ml-4 text-blue-400 hover:text-blue-300 text-sm whitespace-nowrap"
                    >
                      View Details
                    </Link>
                  </div>
                    </ReversalTooltip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alert for high reversal rate */}
          {reversalMetrics.overallReversalRate > 20 && (
            <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <h5 className="text-red-400 font-semibold text-sm mb-1">
                    High Reversal Rate Detected
                  </h5>
                  <p className="text-gray-300 text-xs">
                    The reversal rate of {reversalMetrics.overallReversalRate.toFixed(1)}% exceeds
                    the recommended threshold. Consider reviewing moderation practices.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions by Type */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Actions by Type</h3>
        {Object.keys(metrics.actionsByType).length === 0 ? (
          <p className="text-gray-400 text-center py-8">No actions taken in the last 30 days</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(metrics.actionsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const total = Object.values(metrics.actionsByType).reduce(
                  (sum, val) => sum + val,
                  0
                );
                const percentage = ((count / total) * 100).toFixed(1);

                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300">
                        {ACTION_TYPE_LABELS[type as keyof typeof ACTION_TYPE_LABELS] || type}
                      </span>
                      <span className="text-gray-400">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Top Reasons for Reports */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Reasons for Reports</h3>
        {metrics.topReasons.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No reports in the last 30 days</p>
        ) : (
          <div className="space-y-3">
            {metrics.topReasons.map((item, index) => {
              const total = metrics.topReasons.reduce((sum, r) => sum + r.count, 0);
              const percentage = ((item.count / total) * 100).toFixed(1);

              return (
                <div key={item.reason}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 font-mono text-sm">#{index + 1}</span>
                      <span className="text-gray-300">
                        {REASON_LABELS[item.reason as keyof typeof REASON_LABELS] || item.reason}
                      </span>
                    </div>
                    <span className="text-gray-400">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Moderator Performance (Admin Only) */}
      {isAdminUser && metrics.moderatorPerformance && (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Moderator Performance Comparison
          </h3>
          {metrics.moderatorPerformance.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No moderator actions in the last 30 days
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Moderator ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions Taken
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Avg Resolution Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {metrics.moderatorPerformance
                    .sort((a, b) => b.actionsCount - a.actionsCount)
                    .map((mod) => (
                      <tr key={mod.moderatorId} className="hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                          {mod.moderatorId.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                            {mod.actionsCount} actions
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {mod.averageResolutionTime > 0
                            ? `${mod.averageResolutionTime.toFixed(1)}h`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SLA Compliance (if included) */}
      {includeSLA && metrics.slaCompliance && (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            SLA Compliance by Priority Level
          </h3>
          <div className="space-y-4">
            {Object.entries(metrics.slaCompliance).map(([priority, data]) => {
              const priorityLabel = priority.toUpperCase();
              const slaTarget =
                priority === 'p1'
                  ? '2h'
                  : priority === 'p2'
                  ? '8h'
                  : priority === 'p3'
                  ? '24h'
                  : priority === 'p4'
                  ? '48h'
                  : '72h';

              return (
                <div key={priority}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300 font-semibold">{priorityLabel}</span>
                      <span className="text-gray-500 text-sm">(Target: {slaTarget})</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-bold ${
                          data.percentage >= 90
                            ? 'text-green-400'
                            : data.percentage >= 70
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {data.percentage}%
                      </span>
                      <span className="text-gray-400 text-sm ml-2">
                        ({data.withinSLA}/{data.total})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        data.percentage >= 90
                          ? 'bg-green-500'
                          : data.percentage >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trends (if included) */}
      {includeTrends && metrics.trends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Report Volume Trend */}
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Report Volume Trend</h3>
            {metrics.trends.reportVolume.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-2">
                {metrics.trends.reportVolume.map((item) => (
                  <div key={item.date} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{item.date}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              (item.count /
                                Math.max(...metrics.trends!.reportVolume.map((v) => v.count))) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-gray-300 text-sm w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Rate Trend */}
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Resolution Rate Trend</h3>
            {metrics.trends.resolutionRate.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-2">
                {metrics.trends.resolutionRate.map((item) => (
                  <div key={item.date} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{item.date}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                      <span className="text-gray-300 text-sm w-8 text-right">{item.rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={async () => {
            try {
              setLoading(true);
              const data = await calculateModerationMetrics(dateRange, includeSLA, includeTrends);
              setMetrics(data);
              showToast('Metrics refreshed', 'success');
            } catch (error) {
              console.error('Failed to refresh metrics:', error);
              showToast('Failed to refresh metrics', 'error');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>
    </div>
  );
}
