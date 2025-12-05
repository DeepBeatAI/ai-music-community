'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ReversalTooltip } from './ReversalTooltip';
import { ModerationAction } from '@/types/moderation';

interface ModeratorStats {
  moderatorId: string;
  moderatorUsername: string;
  totalActions: number;
  reversedActions: number;
  reversalRate: number;
  trend?: 'improving' | 'stable' | 'worsening';
}

interface ModeratorReversalStatsProps {
  perModeratorStats: Array<{
    moderatorId: string;
    totalActions: number;
    reversedActions: number;
    reversalRate: number;
  }>;
  startDate: string;
  endDate: string;
}

export function ModeratorReversalStats({
  perModeratorStats,
  startDate,
  endDate,
}: ModeratorReversalStatsProps) {
  const { showToast } = useToast();
  const [moderatorStats, setModeratorStats] = useState<ModeratorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModerator, setSelectedModerator] = useState<string | null>(null);
  const [moderatorReversals, setModeratorReversals] = useState<any[]>([]);
  const [loadingReversals, setLoadingReversals] = useState(false);

  // Fetch moderator usernames
  useEffect(() => {
    async function fetchModeratorUsernames() {
      try {
        setLoading(true);

        if (!perModeratorStats || perModeratorStats.length === 0) {
          setModeratorStats([]);
          setLoading(false);
          return;
        }

        // Get unique moderator IDs
        const moderatorIds = perModeratorStats.map((stat) => stat.moderatorId);

        // Fetch usernames from user_profiles
        const { data: profiles, error } = await supabase
          .from('user_profiles')
          .select('user_id, username')
          .in('user_id', moderatorIds);

        if (error) {
          console.error('Error fetching moderator profiles:', error);
          showToast('Failed to load moderator usernames', 'error');
          // Continue with IDs only
          setModeratorStats(
            perModeratorStats.map((stat) => ({
              ...stat,
              moderatorUsername: stat.moderatorId.substring(0, 8) + '...',
            }))
          );
          return;
        }

        // Create a map of user_id to username
        const usernameMap = new Map(
          profiles?.map((profile) => [profile.user_id, profile.username]) || []
        );

        // Combine stats with usernames
        const statsWithUsernames = perModeratorStats.map((stat) => ({
          ...stat,
          moderatorUsername: usernameMap.get(stat.moderatorId) || stat.moderatorId.substring(0, 8) + '...',
        }));

        setModeratorStats(statsWithUsernames);
      } catch (err) {
        console.error('Error in fetchModeratorUsernames:', err);
        showToast('Failed to load moderator data', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchModeratorUsernames();
  }, [perModeratorStats, showToast]);

  // Fetch specific moderator's reversals when selected
  useEffect(() => {
    async function fetchModeratorReversals() {
      if (!selectedModerator) {
        setModeratorReversals([]);
        return;
      }

      try {
        setLoadingReversals(true);

        // Fetch all reversed actions by this moderator in the date range
        const { data: reversals, error } = await supabase
          .from('moderation_actions')
          .select(`
            id,
            action_type,
            target_type,
            target_id,
            reason,
            created_at,
            revoked_at,
            revoked_by,
            metadata
          `)
          .eq('moderator_id', selectedModerator)
          .not('revoked_at', 'is', null)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('revoked_at', { ascending: false });

        if (error) {
          console.error('Error fetching moderator reversals:', error);
          showToast('Failed to load reversal details', 'error');
          return;
        }

        setModeratorReversals(reversals || []);
      } catch (err) {
        console.error('Error in fetchModeratorReversals:', err);
        showToast('Failed to load reversal details', 'error');
      } finally {
        setLoadingReversals(false);
      }
    }

    fetchModeratorReversals();
  }, [selectedModerator, startDate, endDate, showToast]);

  // Get reversal rate category
  const getReversalRateCategory = (rate: number) => {
    if (rate < 10) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-900/30' };
    if (rate < 15) return { label: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-900/30' };
    if (rate < 20) return { label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' };
    if (rate < 30) return { label: 'Concerning', color: 'text-orange-400', bgColor: 'bg-orange-900/30' };
    return { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-900/30' };
  };

  // Format action type for display
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate time to reversal
  const calculateTimeToReversal = (createdAt: string, revokedAt: string) => {
    const created = new Date(createdAt).getTime();
    const revoked = new Date(revokedAt).getTime();
    const hours = (revoked - created) / (1000 * 60 * 60);
    
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    return `${(hours / 24).toFixed(1)} days`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (moderatorStats.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Moderator Reversal Statistics</h3>
        <p className="text-gray-400 text-center py-8">
          No moderator activity in the selected period
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Moderator Stats Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Moderator Reversal Statistics
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          Click on a moderator to view their specific reversals and trends
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                  Moderator
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Total Actions
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Reversed
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Reversal Rate
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {moderatorStats.map((stat) => {
                const category = getReversalRateCategory(stat.reversalRate);
                const isHighRate = stat.reversalRate >= 20;

                return (
                  <tr
                    key={stat.moderatorId}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                      selectedModerator === stat.moderatorId ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {stat.moderatorUsername}
                        </span>
                        {isHighRate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400">
                            ⚠️ High Rate
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300">
                      {stat.totalActions}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300">
                      {stat.reversedActions}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`text-lg font-bold ${category.color}`}>
                        {stat.reversalRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${category.bgColor} ${category.color}`}
                      >
                        {category.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() =>
                          setSelectedModerator(
                            selectedModerator === stat.moderatorId
                              ? null
                              : stat.moderatorId
                          )
                        }
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        {selectedModerator === stat.moderatorId ? 'Hide' : 'View'} Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Average Reversal Rate</div>
            <div className="text-2xl font-bold text-white">
              {(
                moderatorStats.reduce((sum, stat) => sum + stat.reversalRate, 0) /
                moderatorStats.length
              ).toFixed(1)}
              %
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Moderators with High Rate</div>
            <div className="text-2xl font-bold text-red-400">
              {moderatorStats.filter((stat) => stat.reversalRate >= 20).length}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Best Performer</div>
            <div className="text-lg font-bold text-green-400">
              {moderatorStats.reduce((best, stat) =>
                stat.reversalRate < best.reversalRate ? stat : best
              ).moderatorUsername}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Moderator Details */}
      {selectedModerator && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Reversal Details for{' '}
              {moderatorStats.find((s) => s.moderatorId === selectedModerator)
                ?.moderatorUsername}
            </h3>
            <button
              onClick={() => setSelectedModerator(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {loadingReversals ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          ) : moderatorReversals.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No reversals found</p>
          ) : (
            <div className="space-y-4">
              {moderatorReversals.map((reversal) => {
                const reversalReason = reversal.metadata?.reversal_reason || 'No reason provided';
                const timeToReversal = calculateTimeToReversal(
                  reversal.created_at,
                  reversal.revoked_at
                );

                return (
                  <ReversalTooltip key={reversal.id} action={reversal as ModerationAction} position="left">
                    <div
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 cursor-help"
                    >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-medium">
                            {formatActionType(reversal.action_type)}
                          </span>
                          <span className="text-gray-400 text-sm">
                            on {reversal.target_type || 'unknown'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Original reason: {reversal.reason}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Time to reversal</div>
                        <div className="text-orange-400 font-semibold">{timeToReversal}</div>
                      </div>
                    </div>

                    <div className="bg-gray-800 rounded p-3 mb-3">
                      <div className="text-xs text-gray-400 mb-1">Reversal Reason:</div>
                      <div className="text-sm text-gray-300">{reversalReason}</div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div>
                        Created: {new Date(reversal.created_at).toLocaleString()}
                      </div>
                      <div>
                        Reversed: {new Date(reversal.revoked_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  </ReversalTooltip>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {moderatorStats.some((stat) => stat.reversalRate >= 20) && (
        <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="text-orange-400 font-semibold mb-2">
                Recommendations for Improvement
              </h4>
              <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                <li>Review moderation guidelines with moderators showing high reversal rates</li>
                <li>Implement peer review for complex cases</li>
                <li>Provide additional training on common reversal scenarios</li>
                <li>Consider implementing a mentorship program for new moderators</li>
                <li>Review and clarify ambiguous policy areas</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
