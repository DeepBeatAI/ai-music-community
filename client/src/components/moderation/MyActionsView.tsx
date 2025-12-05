'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchModerationLogs,
  ActionLogFilters,
} from '@/lib/moderationService';
import {
  ModerationAction,
  ACTION_TYPE_LABELS,
} from '@/types/moderation';
import { ActionStateBadge } from './ActionStateBadge';
import { ReversalTooltip } from './ReversalTooltip';

interface MyActionsViewProps {
  onActionSelect?: (action: ModerationAction) => void;
}

export function MyActionsView({ onActionSelect }: MyActionsViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [reversalRate, setReversalRate] = useState(0);
  const [totalReversed, setTotalReversed] = useState(0);

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSelfReversedOnly, setShowSelfReversedOnly] = useState(false);

  // Fetch actions for current moderator
  useEffect(() => {
    const fetchMyActions = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const offset = (currentPage - 1) * itemsPerPage;

        // Build filters for current moderator
        const filters: ActionLogFilters = {
          moderatorId: user.id,
        };

        if (actionTypeFilter) {
          filters.actionType = actionTypeFilter;
        }

        if (startDate) {
          filters.startDate = new Date(startDate).toISOString();
        }

        if (endDate) {
          filters.endDate = new Date(endDate).toISOString();
        }

        const result = await fetchModerationLogs(filters, itemsPerPage, offset);
        
        // Filter for self-reversed actions if checkbox is checked
        let filteredActions = result.actions;
        if (showSelfReversedOnly) {
          filteredActions = result.actions.filter(
            (action) => action.revoked_at && action.revoked_by === user.id
          );
        }

        setActions(filteredActions);
        setTotal(showSelfReversedOnly ? filteredActions.length : result.total);

        // Calculate reversal statistics
        const reversedActions = result.actions.filter((action) => action.revoked_at);
        const reversedCount = reversedActions.length;
        const rate = result.total > 0 ? (reversedCount / result.total) * 100 : 0;
        
        setTotalReversed(reversedCount);
        setReversalRate(rate);
      } catch (error) {
        console.error('Failed to fetch my actions:', error);
        showToast('Failed to load your actions', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchMyActions();
  }, [user, currentPage, itemsPerPage, actionTypeFilter, startDate, endDate, showSelfReversedOnly, showToast]);

  // Apply filters
  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear filters
  const handleClearFilters = () => {
    setActionTypeFilter('');
    setStartDate('');
    setEndDate('');
    setShowSelfReversedOnly(false);
    setCurrentPage(1);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Check if action is reversed
  const isReversed = (action: ModerationAction) => {
    return !!action.revoked_at;
  };

  // Check if action is self-reversed
  const isSelfReversed = (action: ModerationAction) => {
    return action.revoked_at && action.revoked_by === user?.id;
  };

  // Get reversal info for tooltip
  const getReversalInfo = (action: ModerationAction) => {
    if (!action.revoked_at) return null;

    const reversalReason = action.metadata?.reversal_reason || 'No reason provided';
    const revokedBy = action.revoked_by ? action.revoked_by.substring(0, 8) + '...' : 'Unknown';
    const revokedAt = formatDate(action.revoked_at);

    return {
      reason: reversalReason,
      revokedBy,
      revokedAt,
    };
  };

  // Calculate pagination
  const totalPages = Math.ceil(total / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (actionTypeFilter) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (showSelfReversedOnly) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Actions</p>
              <p className="text-3xl font-bold text-white">{total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Reversed Actions</p>
              <p className="text-3xl font-bold text-white">{totalReversed}</p>
            </div>
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">↩️</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Reversal Rate</p>
              <p className="text-3xl font-bold text-white">{reversalRate.toFixed(1)}%</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              reversalRate < 10 ? 'bg-green-600' : reversalRate < 25 ? 'bg-yellow-600' : 'bg-red-600'
            }`}>
              <span className="text-2xl">
                {reversalRate < 10 ? '✓' : reversalRate < 25 ? '⚠' : '⚠'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {reversalRate < 10 ? 'Excellent accuracy' : reversalRate < 25 ? 'Good accuracy' : 'Review needed'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                {activeFilterCount} active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
            >
              <span>✕</span>
              <span>Reset all filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Action Type Filter */}
          <div>
            <label htmlFor="action-type-filter" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <span>Action Type</span>
              {actionTypeFilter && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                  ✓
                </span>
              )}
            </label>
            <select
              id="action-type-filter"
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                actionTypeFilter ? 'border-blue-500' : 'border-gray-600'
              }`}
            >
              <option value="">All Types</option>
              <option value="content_removed">Content Removed</option>
              <option value="content_approved">Content Approved</option>
              <option value="user_warned">User Warned</option>
              <option value="user_suspended">User Suspended</option>
              <option value="user_banned">User Banned</option>
              <option value="restriction_applied">Restriction Applied</option>
            </select>
          </div>

          {/* Self-Reversed Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <span>Reversal Status</span>
              {showSelfReversedOnly && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                  ✓
                </span>
              )}
            </label>
            <label className="flex items-center space-x-2 cursor-pointer bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={showSelfReversedOnly}
                onChange={(e) => setShowSelfReversedOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className={`text-sm ${showSelfReversedOnly ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                Show Self-Reversed Only
              </span>
            </label>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start-date" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <span>Start Date</span>
              {startDate && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                  ✓
                </span>
              )}
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                startDate ? 'border-blue-500' : 'border-gray-600'
              }`}
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end-date" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <span>End Date</span>
              {endDate && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                  ✓
                </span>
              )}
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                endDate ? 'border-blue-500' : 'border-gray-600'
              }`}
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          Showing {actions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
          {Math.min(currentPage * itemsPerPage, total)} of {total} actions
        </p>
      </div>

      {/* Action Logs Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-4 w-32 bg-gray-700 rounded"></div>
                <div className="h-4 w-24 bg-gray-700 rounded"></div>
                <div className="h-4 w-20 bg-gray-700 rounded"></div>
                <div className="h-4 flex-1 bg-gray-700 rounded"></div>
                <div className="h-4 w-16 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-700 mb-6">
              <span className="text-5xl">📋</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No actions found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {hasActiveFilters
                ? 'No actions match your current filters. Try adjusting them to see more results.'
                : 'You haven\'t taken any moderation actions yet. Actions will appear here once you start reviewing reports.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Action Type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Target User
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {actions.map((action) => {
                  const reversed = isReversed(action);
                  const selfReversed = isSelfReversed(action);
                  const reversalInfo = reversed ? getReversalInfo(action) : null;

                  return (
                    <ReversalTooltip key={action.id} action={action} position="top">
                      <tr
                        onClick={() => onActionSelect?.(action)}
                        className={`hover:bg-gray-700 cursor-pointer transition-colors ${
                          selfReversed ? 'bg-yellow-900 bg-opacity-20' : reversed ? 'opacity-75' : ''
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className={reversed ? 'line-through' : ''}>
                            {formatDate(action.created_at)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                reversed
                                  ? 'bg-gray-600 text-gray-300 line-through'
                                  : 'bg-red-900 text-red-200'
                              }`}
                            >
                              {ACTION_TYPE_LABELS[action.action_type]}
                            </span>
                            <ActionStateBadge action={action} />
                            {selfReversed && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-600 text-white">
                                Self-Reversed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                          <span className={reversed ? 'line-through' : ''}>
                            {action.target_user_id.substring(0, 8)}...
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                          <span className={reversed ? 'line-through' : ''}>
                            {action.reason}
                          </span>
                          {reversed && reversalInfo && (
                            <div className="text-xs text-gray-400 mt-1">
                              Reversed: {reversalInfo.reason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className={reversed ? 'line-through' : ''}>
                            {action.duration_days
                              ? `${action.duration_days} days`
                              : action.expires_at
                              ? 'Permanent'
                              : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {selfReversed ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-600 text-white">
                              You reversed this
                            </span>
                          ) : reversed ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-300">
                              Reversed by other
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    </ReversalTooltip>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrevPage}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={!hasNextPage}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
