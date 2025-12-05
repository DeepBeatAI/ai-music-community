'use client';

import { useEffect, useState } from 'react';
import {
  Report,
  QueueFilters,
  ReportStatus,
  ReportType,
} from '@/types/moderation';
import { fetchModerationQueue } from '@/lib/moderationService';
import { ReportCard } from './ReportCard';
import { ModerationActionPanel } from './ModerationActionPanel';

interface ModerationQueueProps {
  onReportSelect?: (report: Report) => void;
}

export function ModerationQueue({ onReportSelect }: ModerationQueueProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QueueFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionIdToReverse, setActionIdToReverse] = useState<string | undefined>(undefined);
  const reportsPerPage = 20;

  // Fetch reports when filters change
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchModerationQueue(filters);
      setReports(data);
    } catch (err) {
      console.error('Failed to load moderation queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(reports.length / reportsPerPage);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const currentReports = reports.slice(startIndex, endIndex);

  // Filter handlers
  const handleStatusFilter = (status: ReportStatus | '') => {
    setFilters((prev) => ({
      ...prev,
      status: status || undefined,
    }));
    setCurrentPage(1);
  };

  const handlePriorityFilter = (priority: number | '') => {
    setFilters((prev) => ({
      ...prev,
      priority: priority || undefined,
    }));
    setCurrentPage(1);
  };

  const handleSourceFilter = (moderatorFlagged: boolean | '') => {
    setFilters((prev) => ({
      ...prev,
      moderatorFlagged: moderatorFlagged === '' ? undefined : moderatorFlagged,
    }));
    setCurrentPage(1);
  };

  const handleTypeFilter = (reportType: ReportType | '') => {
    setFilters((prev) => ({
      ...prev,
      reportType: reportType || undefined,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleReportSelect = (report: Report) => {
    setSelectedReport(report);
    setActionIdToReverse(undefined);
    if (onReportSelect) {
      onReportSelect(report);
    }
  };

  const handleReversalRequested = (actionId: string, report: Report) => {
    setSelectedReport(report);
    setActionIdToReverse(actionId);
  };

  const handleActionComplete = () => {
    // Refresh the queue after action is taken
    loadReports();
  };

  const handleCloseActionPanel = () => {
    setSelectedReport(null);
    setActionIdToReverse(undefined);
  };

  return (
    <>
      {selectedReport && (
        <ModerationActionPanel
          report={selectedReport}
          onClose={handleCloseActionPanel}
          onActionComplete={handleActionComplete}
          actionIdToReverse={actionIdToReverse}
        />
      )}
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-gray-700 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 sm:hidden">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status || ''}
              onChange={(e) => handleStatusFilter(e.target.value as ReportStatus | '')}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Priority
            </label>
            <select
              id="priority-filter"
              value={filters.priority || ''}
              onChange={(e) => handlePriorityFilter(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="1">P1 - Critical</option>
              <option value="2">P2 - High</option>
              <option value="3">P3 - Standard</option>
              <option value="4">P4 - Low</option>
              <option value="5">P5 - Minimal</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label htmlFor="source-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Source
            </label>
            <select
              id="source-filter"
              value={filters.moderatorFlagged === undefined ? '' : filters.moderatorFlagged.toString()}
              onChange={(e) =>
                handleSourceFilter(e.target.value === '' ? '' : e.target.value === 'true')
              }
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sources</option>
              <option value="true">Moderator Flags</option>
              <option value="false">User Reports</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Type
            </label>
            <select
              id="type-filter"
              value={filters.reportType || ''}
              onChange={(e) => handleTypeFilter(e.target.value as ReportType | '')}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="post">Post</option>
              <option value="comment">Comment</option>
              <option value="track">Track</option>
              <option value="user">User</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="sm:col-span-2 lg:col-span-4 xl:col-span-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={clearFilters}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={loadReports}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div>
          Showing {currentReports.length > 0 ? startIndex + 1 : 0} -{' '}
          {Math.min(endIndex, reports.length)} of {reports.length} reports
        </div>
        {Object.keys(filters).some((key) => filters[key as keyof QueueFilters] !== undefined) && (
          <div className="text-blue-400">Filters active</div>
        )}
      </div>

      {/* Loading State with Skeleton */}
      {loading && (
        <div className="space-y-4" role="status" aria-label="Loading reports">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-700 rounded-lg p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2">
                  <div className="h-6 w-24 bg-gray-600 rounded"></div>
                  <div className="h-6 w-20 bg-gray-600 rounded"></div>
                </div>
                <div className="h-4 w-32 bg-gray-600 rounded"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-gray-600 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-600 rounded"></div>
                <div className="h-20 bg-gray-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-400">{error}</p>
          </div>
          <button
            onClick={loadReports}
            className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reports.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-700 mb-6">
            <span className="text-5xl">📭</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No reports found</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {Object.keys(filters).some((key) => filters[key as keyof QueueFilters] !== undefined)
              ? 'No reports match your current filters. Try adjusting them to see more results.'
              : 'The moderation queue is empty. Great job keeping the community safe!'}
          </p>
          {Object.keys(filters).some((key) => filters[key as keyof QueueFilters] !== undefined) && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Reports List */}
      {!loading && !error && currentReports.length > 0 && (
        <div className="space-y-4">
          {currentReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onSelect={() => handleReportSelect(report)}
              showActions={true}
              onReversalRequested={(actionId) => handleReversalRequested(actionId, report)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
    </>
  );
}
