'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  getReversalHistory,
  exportReversalHistoryToCSV,
  isAdmin,
} from '@/lib/moderationService';
import {
  ReversalHistoryEntry,
  ReversalHistoryFilters,
  ACTION_TYPE_LABELS,
} from '@/types/moderation';

interface ReversalHistoryViewProps {
  onEntrySelect?: (entry: ReversalHistoryEntry) => void;
}

export function ReversalHistoryView({ onEntrySelect }: ReversalHistoryViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [entries, setEntries] = useState<ReversalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Filters
  const [filters, setFilters] = useState<ReversalHistoryFilters>({});
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reversalReasonFilter, setReversalReasonFilter] = useState('');
  const [selfReversalOnly, setSelfReversalOnly] = useState(false);

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

  // Fetch reversal history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const result = await getReversalHistory(filters);
        
        // Apply client-side filter for self-reversals if needed
        let filteredResult = result;
        if (selfReversalOnly) {
          filteredResult = result.filter((entry) => entry.isSelfReversal);
        }
        
        setEntries(filteredResult);
      } catch (error) {
        console.error('Failed to fetch reversal history:', error);
        showToast('Failed to load reversal history', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [filters, selfReversalOnly, showToast]);

  // Apply filters
  const handleApplyFilters = () => {
    const newFilters: ReversalHistoryFilters = {};

    if (actionTypeFilter) {
      newFilters.actionType = actionTypeFilter as any;
    }

    if (startDate) {
      newFilters.startDate = new Date(startDate).toISOString();
    }

    if (endDate) {
      newFilters.endDate = new Date(endDate).toISOString();
    }

    if (reversalReasonFilter.trim()) {
      newFilters.reversalReason = reversalReasonFilter.trim();
    }

    setFilters(newFilters);
  };

  // Clear filters
  const handleClearFilters = () => {
    setActionTypeFilter('');
    setStartDate('');
    setEndDate('');
    setReversalReasonFilter('');
    setSelfReversalOnly(false);
    setFilters({});
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      const csv = await exportReversalHistoryToCSV(filters);

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reversal-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Reversal history exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export reversal history:', error);
      showToast('Failed to export reversal history', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format time duration
  const formatTimeDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Action Type Filter */}
          <div>
            <label htmlFor="action-type-filter" className="block text-sm font-medium text-gray-300 mb-2">
              Action Type
            </label>
            <select
              id="action-type-filter"
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Start Date */}
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-2">
              Reversal Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-2">
              Reversal End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reversal Reason Search */}
          <div>
            <label htmlFor="reversal-reason" className="block text-sm font-medium text-gray-300 mb-2">
              Reversal Reason
            </label>
            <input
              id="reversal-reason"
              type="text"
              value={reversalReasonFilter}
              onChange={(e) => setReversalReasonFilter(e.target.value)}
              placeholder="Search reversal reason"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Self-Reversal Checkbox */}
        <div className="mb-4">
          <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={selfReversalOnly}
              onChange={(e) => setSelfReversalOnly(e.target.checked)}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm">Show only self-reversals</span>
          </label>
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
              disabled={exporting || entries.length === 0}
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

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          Showing {entries.length} reversal{entries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Reversal History Table */}
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
        ) : entries.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-700 mb-6">
              <span className="text-5xl">🔄</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No reversals found</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {Object.keys(filters).length > 0 || selfReversalOnly
                ? 'No reversals match your current filters. Try adjusting them to see more results.'
                : 'No moderation actions have been reversed yet. Reversals will appear here when moderators correct mistakes.'}
            </p>
            {(Object.keys(filters).length > 0 || selfReversalOnly) && (
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
                    Reversal Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Action Type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Original Action
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Time to Reversal
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Reversed By
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Reversal Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {entries.map((entry) => (
                  <tr
                    key={entry.action.id}
                    onClick={() => onEntrySelect?.(entry)}
                    className="hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(entry.revokedAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {/* Color coding: Requirements 15.4 - Reversed actions use Gray (#6B7280) */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-300">
                          {ACTION_TYPE_LABELS[entry.action.action_type]}
                        </span>
                        {entry.isSelfReversal && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200">
                            Self-Reversal
                          </span>
                        )}
                        {entry.wasReapplied && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-600 text-orange-200">
                            Re-applied
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-300">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400">
                          {formatDate(entry.action.created_at)}
                        </div>
                        <div className="text-xs text-gray-500">
                          By: {entry.moderatorUsername || entry.action.moderator_id.substring(0, 8) + '...'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="font-mono">
                        {formatTimeDuration(entry.timeBetweenActionAndReversal)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {entry.revokedByUsername || entry.revokedBy.substring(0, 8) + '...'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {entry.reversalReason || 'No reason provided'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Total Reversals</h4>
            {/* Color coding: Requirements 15.4 - Reversed actions use Gray (#6B7280) */}
            <div className="text-4xl font-bold" style={{ color: '#6B7280' }}>{entries.length}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Self-Reversals</h4>
            <div className="text-4xl font-bold text-yellow-400">
              {entries.filter((e) => e.isSelfReversal).length}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {((entries.filter((e) => e.isSelfReversal).length / entries.length) * 100).toFixed(1)}% of total
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Avg Time to Reversal</h4>
            {/* Color coding: Requirements 15.4 - Reversed actions use Gray (#6B7280) */}
            <div className="text-4xl font-bold" style={{ color: '#6B7280' }}>
              {formatTimeDuration(
                entries.reduce((sum, e) => sum + e.timeBetweenActionAndReversal, 0) / entries.length
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
