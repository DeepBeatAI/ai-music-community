'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  fetchModerationLogs,
  exportActionLogsToCSV,
  isAdmin,
  ActionLogFilters,
} from '@/lib/moderationService';
import {
  ModerationAction,
  ACTION_TYPE_LABELS,
  REASON_LABELS,
} from '@/types/moderation';
import { ActionStateBadge } from './ActionStateBadge';
import { supabase } from '@/lib/supabase';

interface ModerationLogsProps {
  onActionSelect?: (action: ModerationAction) => void;
}

interface ActionWithUsernames extends ModerationAction {
  targetUsername?: string;
  moderatorUsername?: string;
}

export function ModerationLogs({ onActionSelect }: ModerationLogsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [actions, setActions] = useState<ActionWithUsernames[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Filters
  const [filters, setFilters] = useState<ActionLogFilters>({});
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showReversedOnly, setShowReversedOnly] = useState(false);
  const [showNonReversedOnly, setShowNonReversedOnly] = useState(false);
  const [showRecentlyReversed, setShowRecentlyReversed] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'active' | 'reversed' | 'expired'>('all');

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

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const offset = (currentPage - 1) * itemsPerPage;
        const result = await fetchModerationLogs(filters, itemsPerPage, offset);
        
        // Fetch usernames for all actions
        const actionsWithUsernames = await Promise.all(
          result.actions.map(async (action) => {
            const actionWithUsernames: ActionWithUsernames = { ...action };

            // Fetch target username
            if (action.target_user_id) {
              const { data: targetProfile, error: targetError } = await supabase
                .from('user_profiles')
                .select('username')
                .eq('user_id', action.target_user_id)
                .maybeSingle();
              
              if (targetError) {
                console.error('Error fetching target username:', targetError);
              }
              
              actionWithUsernames.targetUsername = targetProfile?.username || 'Unknown User';
            }

            // Fetch moderator username
            if (action.moderator_id) {
              const { data: moderatorProfile, error: moderatorError } = await supabase
                .from('user_profiles')
                .select('username')
                .eq('user_id', action.moderator_id)
                .maybeSingle();
              
              if (moderatorError) {
                console.error('Error fetching moderator username:', moderatorError);
              }
              
              actionWithUsernames.moderatorUsername = moderatorProfile?.username || 'Unknown Moderator';
            }

            return actionWithUsernames;
          })
        );

        setActions(actionsWithUsernames);
        setTotal(result.total);
      } catch (error) {
        console.error('Failed to fetch moderation logs:', error);
        showToast('Failed to load action logs', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters, currentPage, itemsPerPage, showToast]);

  // Apply filters
  const handleApplyFilters = () => {
    const newFilters: ActionLogFilters = {};

    if (actionTypeFilter) {
      newFilters.actionType = actionTypeFilter;
    }

    if (searchQuery.trim()) {
      newFilters.searchQuery = searchQuery.trim();
    }

    if (startDate) {
      newFilters.startDate = new Date(startDate).toISOString();
    }

    if (endDate) {
      newFilters.endDate = new Date(endDate).toISOString();
    }

    // Handle quick filter
    if (quickFilter === 'active') {
      newFilters.nonReversedOnly = true;
      newFilters.nonExpiredOnly = true;
    } else if (quickFilter === 'reversed') {
      newFilters.reversedOnly = true;
    } else if (quickFilter === 'expired') {
      newFilters.expiredOnly = true;
    }
    // 'all' means no filter applied

    // Handle reversal filters (mutually exclusive) - only if quick filter is 'all'
    if (quickFilter === 'all') {
      if (showRecentlyReversed) {
        newFilters.recentlyReversed = true;
      } else if (showReversedOnly) {
        newFilters.reversedOnly = true;
      } else if (showNonReversedOnly) {
        newFilters.nonReversedOnly = true;
      }
    }

    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear filters
  const handleClearFilters = () => {
    setActionTypeFilter('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setShowReversedOnly(false);
    setShowNonReversedOnly(false);
    setShowRecentlyReversed(false);
    setQuickFilter('all');
    setFilters({});
    setCurrentPage(1);
  };

  // Handle quick filter button clicks
  const handleQuickFilter = (filter: 'all' | 'active' | 'reversed' | 'expired') => {
    setQuickFilter(filter);
    // Clear checkbox filters when using quick filters
    if (filter !== 'all') {
      setShowRecentlyReversed(false);
      setShowReversedOnly(false);
      setShowNonReversedOnly(false);
    }
  };

  // Handle reversal filter checkbox changes (mutually exclusive)
  const handleRecentlyReversedChange = (checked: boolean) => {
    setShowRecentlyReversed(checked);
    if (checked) {
      setShowReversedOnly(false);
      setShowNonReversedOnly(false);
      setQuickFilter('all'); // Reset quick filter when using checkboxes
    }
  };

  const handleReversedOnlyChange = (checked: boolean) => {
    setShowReversedOnly(checked);
    if (checked) {
      setShowNonReversedOnly(false);
      setShowRecentlyReversed(false);
      setQuickFilter('all'); // Reset quick filter when using checkboxes
    }
  };

  const handleNonReversedOnlyChange = (checked: boolean) => {
    setShowNonReversedOnly(checked);
    if (checked) {
      setShowReversedOnly(false);
      setShowRecentlyReversed(false);
      setQuickFilter('all'); // Reset quick filter when using checkboxes
    }
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      const csv = await exportActionLogsToCSV(filters);

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `moderation-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Action logs exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export logs:', error);
      showToast('Failed to export action logs', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Check if action is reversed
  const isReversed = (action: ModerationAction) => {
    return !!action.revoked_at;
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
    if (searchQuery.trim()) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (showRecentlyReversed || showReversedOnly || showNonReversedOnly) count++;
    if (quickFilter !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-6">
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

          {/* Reversal Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <span>Reversal Status</span>
              {(showRecentlyReversed || showReversedOnly || showNonReversedOnly) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                  ✓
                </span>
              )}
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRecentlyReversed}
                  onChange={(e) => handleRecentlyReversedChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className={`text-sm ${showRecentlyReversed ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  Recently Reversed (7 days)
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showReversedOnly}
                  onChange={(e) => handleReversedOnlyChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className={`text-sm ${showReversedOnly ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  Show Reversed Only
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNonReversedOnly}
                  onChange={(e) => handleNonReversedOnlyChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className={`text-sm ${showNonReversedOnly ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                  Show Non-Reversed Only
                </span>
              </label>
              {!showRecentlyReversed && !showReversedOnly && !showNonReversedOnly && (
                <p className="text-xs text-gray-400 italic">Showing all actions</p>
              )}
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label htmlFor="search-query" className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
              <span>Search User/Content ID</span>
              {searchQuery.trim() && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                  ✓
                </span>
              )}
            </label>
            <input
              id="search-query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter user or content ID"
              className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                searchQuery.trim() ? 'border-blue-500' : 'border-gray-600'
              }`}
            />
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
          {isAdminUser && (
            <button
              onClick={handleExport}
              disabled={exporting || actions.length === 0}
              className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Export CSV</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">Quick Filters</h4>
          {quickFilter !== 'all' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
              1 active
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              quickFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Actions
          </button>
          <button
            onClick={() => handleQuickFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
              quickFilter === 'active'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>Active Only</span>
            {quickFilter === 'active' && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-red-600 text-xs font-bold">
                ✓
              </span>
            )}
          </button>
          <button
            onClick={() => handleQuickFilter('reversed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
              quickFilter === 'reversed'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>Reversed Only</span>
            {quickFilter === 'reversed' && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-gray-600 text-xs font-bold">
                ✓
              </span>
            )}
          </button>
          <button
            onClick={() => handleQuickFilter('expired')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
              quickFilter === 'expired'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>Expired Only</span>
            {quickFilter === 'expired' && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-blue-600 text-xs font-bold">
                ✓
              </span>
            )}
          </button>
        </div>
        {quickFilter !== 'all' && (
          <p className="text-xs text-gray-400 mt-2">
            Showing {quickFilter} actions only. Click &quot;All Actions&quot; to see everything.
          </p>
        )}
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
            <h3 className="text-2xl font-bold text-white mb-3">No action logs found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {Object.keys(filters).length > 0
                ? 'No actions match your current filters. Try adjusting them to see more results.'
                : 'No moderation actions have been taken yet. Actions will appear here once moderators start reviewing reports.'}
            </p>
            {Object.keys(filters).length > 0 && (
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
            <table className="w-full min-w-[1000px]">
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
                    Moderator
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Internal Notes
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {actions.map((action) => {
                  const reversed = isReversed(action);
                  const reversalInfo = reversed ? getReversalInfo(action) : null;

                  return (
                    <tr
                      key={action.id}
                      onClick={() => onActionSelect?.(action)}
                      className={`hover:bg-gray-700 cursor-pointer transition-colors ${
                        reversed ? 'opacity-75' : ''
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
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className={reversed ? 'line-through' : ''}>
                          {action.targetUsername || 'Unknown User'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className={reversed ? 'line-through' : ''}>
                          {action.moderatorUsername || 'Unknown Moderator'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-300 max-w-xs">
                        <div className={reversed ? 'line-through' : ''}>
                          {REASON_LABELS[action.reason as keyof typeof REASON_LABELS] || action.reason}
                        </div>
                        {reversed && reversalInfo && (
                          <div className="text-xs text-gray-400 mt-1">
                            Reversed: {reversalInfo.reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-300 max-w-xs">
                        <div className={reversed ? 'line-through' : ''}>
                          {action.internal_notes || '-'}
                        </div>
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
                    </tr>
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
