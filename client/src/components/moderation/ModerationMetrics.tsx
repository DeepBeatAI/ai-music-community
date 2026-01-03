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

interface ReversalMetricsSummary {
  overallReversalRate: number;
  totalReversals: number;
  totalActions: number;
  averageTimeToReversalHours: number;
}

interface ModeratorPerformanceWithUsername {
  moderatorId: string;
  moderatorUsername: string;
  actionsCount: number;
  averageResolutionTime: number;
  reversalRate: number;
  accuracy: string;
}

interface ReportQualityMetrics {
  averageQualityScore: number;
  percentageWithEvidence: number;
  percentageDetailedDescription: number;
  averageDescriptionLength: number;
  accuracyRate: number;
  totalReports: number;
  reportsWithEvidence: number;
  eligibleForEvidence: number;
  reportsWithDetailedDescription: number;
  finalizedReports: number;
  validatedReports: number;
  qualityByReason: Array<{
    reason: string;
    qualityScore: number;
    reportCount: number;
    evidenceRate: number;
    avgDescriptionLength: number;
    accuracyRate: number;
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
  const [reversalMetrics, setReversalMetrics] = useState<ReversalMetricsSummary | null>(null);
  const [reversalLoading, setReversalLoading] = useState(true);
  const [moderatorPerformanceWithUsernames, setModeratorPerformanceWithUsernames] = useState<ModeratorPerformanceWithUsername[]>([]);
  const [topReasonsFilter, setTopReasonsFilter] = useState<'all' | 'post' | 'comment' | 'track' | 'album' | 'user'>('all');
  const [filteredTopReasons, setFilteredTopReasons] = useState<Array<{ reason: string; count: number }>>([]);
  const [reportQualityMetrics, setReportQualityMetrics] = useState<ReportQualityMetrics | null>(null);
  const [qualityLoading, setQualityLoading] = useState(true);

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
        // Always fetch overall metrics without date range for Reports Received, Reports Resolved, and Average Resolution Time
        // But include SLA and Trends if requested
        const overallData = await calculateModerationMetrics(undefined, includeSLA, includeTrends);
        // Fetch filtered metrics for other sections if date range is set
        const filteredData = dateRange ? await calculateModerationMetrics(dateRange, includeSLA, includeTrends) : overallData;
        
        // Combine: use overall data for certain metrics, filtered data for others
        const data = {
          ...filteredData,
          reportsReceived: overallData.reportsReceived,
          reportsResolved: overallData.reportsResolved,
          averageResolutionTime: overallData.averageResolutionTime,
        };
        setMetrics(data);

        // Fetch usernames for moderator performance if available
        if (data.moderatorPerformance && data.moderatorPerformance.length > 0) {
          const performanceWithUsernames = await Promise.all(
            data.moderatorPerformance.map(async (mod) => {
              const { data: moderatorProfile, error } = await supabase
                .from('user_profiles')
                .select('username')
                .eq('user_id', mod.moderatorId)
                .maybeSingle();

              if (error) {
                console.error('Error fetching moderator username:', error);
              }

              return {
                ...mod,
                moderatorUsername: moderatorProfile?.username || 'Unknown Moderator',
              };
            })
          );

          setModeratorPerformanceWithUsernames(performanceWithUsernames);
        } else {
          setModeratorPerformanceWithUsernames([]);
        }
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
          console.error('Reversal metrics error:', {
            message: metricsError.message,
            details: metricsError.details,
            hint: metricsError.hint,
            code: metricsError.code,
          });
          throw metricsError;
        }

        if (!metricsData) {
          console.error('No data returned from get_reversal_metrics');
          throw new Error('No data returned from get_reversal_metrics');
        }

        setReversalMetrics({
          overallReversalRate: metricsData.overallReversalRate || 0,
          totalReversals: metricsData.totalReversals || 0,
          totalActions: metricsData.totalActions || 0,
          averageTimeToReversalHours: metricsData.timeToReversalStats?.averageHours || 0,
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

  // Fetch and filter top reasons by report type
  useEffect(() => {
    const fetchFilteredTopReasons = async () => {
      try {
        // Calculate date range (last 30 days if not specified)
        const endDate = dateRange?.endDate || new Date().toISOString();
        const startDate =
          dateRange?.startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Build query
        let query = supabase
          .from('moderation_reports')
          .select('reason, report_type')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        // Apply filter if not 'all'
        if (topReasonsFilter !== 'all') {
          query = query.eq('report_type', topReasonsFilter);
        }

        const { data: reports } = await query;

        // Calculate reason counts
        const reasonCounts: Record<string, number> = {};
        if (reports) {
          reports.forEach((report) => {
            reasonCounts[report.reason] = (reasonCounts[report.reason] || 0) + 1;
          });
        }

        // Get all reasons sorted by count
        const topReasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);

        setFilteredTopReasons(topReasons);
      } catch (error) {
        console.error('Failed to fetch filtered top reasons:', error);
        setFilteredTopReasons([]);
      }
    };

    fetchFilteredTopReasons();
  }, [dateRange, topReasonsFilter]);

  // Fetch report quality metrics
  useEffect(() => {
    const fetchReportQualityMetrics = async () => {
      try {
        setQualityLoading(true);

        // Calculate date range (last 30 days if not specified)
        const endDate = dateRange?.endDate || new Date().toISOString();
        const startDate =
          dateRange?.startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all reports in date range with reason, report_type, and action_taken
        const { data: reports, error } = await supabase
          .from('moderation_reports')
          .select('description, metadata, reason, report_type, status, action_taken')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (error) {
          console.error('Failed to fetch reports for quality metrics:', error);
          throw error;
        }

        if (!reports || reports.length === 0) {
          setReportQualityMetrics({
            averageQualityScore: 0,
            percentageWithEvidence: 0,
            percentageDetailedDescription: 0,
            averageDescriptionLength: 0,
            accuracyRate: 0,
            totalReports: 0,
            reportsWithEvidence: 0,
            eligibleForEvidence: 0,
            reportsWithDetailedDescription: 0,
            finalizedReports: 0,
            validatedReports: 0,
            qualityByReason: [],
          });
          return;
        }

        // Calculate metrics
        const totalReports = reports.length;
        let reportsWithEvidence = 0;
        let eligibleForEvidence = 0;
        let totalDescriptionLength = 0;
        let reportsWithDetailedDescription = 0;

        // For accuracy calculation, we need finalized reports
        // Accuracy = reports that resulted in action (resolved) / all finalized reports
        const finalizedReports = reports.filter(
          (r) => r.status === 'resolved' || r.status === 'dismissed'
        );
        const validatedReports = reports.filter(
          (r) => r.status === 'resolved' // Resolved means action was taken
        ).length;
        const accuracyRate = finalizedReports.length > 0 
          ? (validatedReports / finalizedReports.length) * 100 
          : 0;

        reports.forEach((report) => {
          // Check if report is eligible for evidence based on reason and type
          const isEligibleForEvidence = 
            report.reason === 'copyright_violation' ||
            (report.report_type === 'track' && 
             (report.reason === 'hate_speech' || 
              report.reason === 'harassment' || 
              report.reason === 'inappropriate_content'));

          if (isEligibleForEvidence) {
            eligibleForEvidence++;

            // Check if report has evidence
            if (report.metadata) {
              const metadata = report.metadata as any;
              if (
                metadata.originalWorkLink ||
                metadata.proofOfOwnership ||
                metadata.audioTimestamp
              ) {
                reportsWithEvidence++;
              }
            }
          }

          // Calculate description length
          const descriptionLength = report.description?.length || 0;
          totalDescriptionLength += descriptionLength;

          // Check if has detailed description (>100 chars)
          if (descriptionLength > 100) {
            reportsWithDetailedDescription++;
          }
        });

        const averageDescriptionLength = Math.round(totalDescriptionLength / totalReports);
        const percentageWithEvidence = eligibleForEvidence > 0 
          ? Math.round((reportsWithEvidence / eligibleForEvidence) * 100)
          : 0;
        const percentageDetailedDescription = Math.round((reportsWithDetailedDescription / totalReports) * 100);

        // Calculate Average Quality Score
        // Formula: evidence (40%) + description length (30%) + accuracy (30%)
        const evidenceScore = percentageWithEvidence * 0.4;
        const descriptionScore = Math.min((averageDescriptionLength / 100) * 100, 100) * 0.3;
        const accuracyScore = accuracyRate * 0.3;
        const averageQualityScore = Math.round(evidenceScore + descriptionScore + accuracyScore);

        // Calculate quality by reason
        const reasonMap = new Map<string, {
          reports: any[];
          eligibleForEvidence: number;
          withEvidence: number;
          totalDescLength: number;
          finalized: number;
          resolvedWithAction: number;
        }>();

        reports.forEach((report) => {
          if (!reasonMap.has(report.reason)) {
            reasonMap.set(report.reason, {
              reports: [],
              eligibleForEvidence: 0,
              withEvidence: 0,
              totalDescLength: 0,
              finalized: 0,
              resolvedWithAction: 0,
            });
          }

          const reasonData = reasonMap.get(report.reason)!;
          reasonData.reports.push(report);
          reasonData.totalDescLength += report.description?.length || 0;

          // Check if eligible for evidence
          const isEligible = 
            report.reason === 'copyright_violation' ||
            (report.report_type === 'track' && 
             (report.reason === 'hate_speech' || 
              report.reason === 'harassment' || 
              report.reason === 'inappropriate_content'));

          if (isEligible) {
            reasonData.eligibleForEvidence++;
            if (report.metadata?.originalWorkLink || 
                report.metadata?.proofOfOwnership || 
                report.metadata?.audioTimestamp) {
              reasonData.withEvidence++;
            }
          }

          // Track finalized and validated (resolved = action taken)
          if (report.status === 'resolved' || report.status === 'dismissed') {
            reasonData.finalized++;
            if (report.status === 'resolved') {
              reasonData.resolvedWithAction++;
            }
          }
        });

        // Calculate quality score for each reason
        const qualityByReason = Array.from(reasonMap.entries())
          .map(([reason, data]) => {
            const reportCount = data.reports.length;
            const avgDescLength = Math.round(data.totalDescLength / reportCount);
            const evidenceRate = data.eligibleForEvidence > 0 
              ? (data.withEvidence / data.eligibleForEvidence) * 100 
              : 0;
            const accuracyRate = data.finalized > 0 
              ? (data.resolvedWithAction / data.finalized) * 100 
              : 0;

            // Calculate quality score for this reason
            const evidenceScore = evidenceRate * 0.4;
            const descScore = Math.min((avgDescLength / 100) * 100, 100) * 0.3;
            const accScore = accuracyRate * 0.3;
            const qualityScore = Math.round(evidenceScore + descScore + accScore);

            return {
              reason,
              qualityScore,
              reportCount,
              evidenceRate: Math.round(evidenceRate),
              avgDescriptionLength: avgDescLength,
              accuracyRate: Math.round(accuracyRate),
            };
          })
          .filter(item => item.reportCount >= 3) // Only include reasons with 3+ reports
          .sort((a, b) => b.qualityScore - a.qualityScore); // Sort by quality score

        setReportQualityMetrics({
          averageQualityScore,
          percentageWithEvidence,
          percentageDetailedDescription,
          averageDescriptionLength,
          accuracyRate,
          totalReports,
          reportsWithEvidence,
          eligibleForEvidence,
          reportsWithDetailedDescription,
          finalizedReports: finalizedReports.length,
          validatedReports: validatedReports,
          qualityByReason,
        });
      } catch (error) {
        console.error('Failed to fetch report quality metrics:', error);
        setReportQualityMetrics(null);
      } finally {
        setQualityLoading(false);
      }
    };

    fetchReportQualityMetrics();
  }, [dateRange]);

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

      {/* Reasons for Reports */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Reasons for Reports</h3>
          <select
            value={topReasonsFilter}
            onChange={(e) => setTopReasonsFilter(e.target.value as typeof topReasonsFilter)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
            <option value="track">Tracks</option>
            <option value="album">Albums</option>
            <option value="user">Users</option>
          </select>
        </div>
        {filteredTopReasons.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No reports in the last 30 days</p>
        ) : (
          <div className="space-y-3">
            {filteredTopReasons.map((item, index) => {
              const total = filteredTopReasons.reduce((sum, r) => sum + r.count, 0);
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

      {/* Report Quality Metrics */}
      {!qualityLoading && reportQualityMetrics && (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Report Quality</h3>
            <span className="text-sm text-gray-400">
              Based on {reportQualityMetrics.totalReports} reports
            </span>
          </div>

          {/* Average Quality Score - New */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 font-semibold">Average Quality Score</span>
                <span 
                  className="text-gray-400 cursor-help text-xs" 
                  title="Calculated as: Evidence Provision (40%) + Description Quality (30%) + Reporter Accuracy (30%). Higher scores indicate better report quality."
                >
                  ℹ️
                </span>
              </div>
              {reportQualityMetrics.averageQualityScore >= 70 && (
                <span className="text-green-400 text-xs">✓ Excellent</span>
              )}
            </div>
            <div
              className={`text-4xl font-bold ${
                reportQualityMetrics.averageQualityScore >= 70
                  ? 'text-green-400'
                  : reportQualityMetrics.averageQualityScore >= 50
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {reportQualityMetrics.averageQualityScore}
              <span className="text-2xl text-gray-400">/100</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Evidence (40%) + Description (30%) + Accuracy (30%)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Evidence Score (40% weight) */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400">Evidence Score</span>
                  <span 
                    className="text-gray-500 cursor-help text-xs" 
                    title="Percentage of eligible reports that include evidence (copyright links, timestamps, etc.). Contributes 40% to overall quality score. Only counts reports that can have evidence based on reason and type."
                  >
                    ℹ️
                  </span>
                </div>
                <span className="text-xs text-purple-400 font-medium">40% weight</span>
              </div>
              <div
                className={`text-3xl font-bold ${
                  reportQualityMetrics.percentageWithEvidence >= 60
                    ? 'text-green-400'
                    : reportQualityMetrics.percentageWithEvidence >= 40
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {reportQualityMetrics.percentageWithEvidence}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {reportQualityMetrics.reportsWithEvidence} of {reportQualityMetrics.eligibleForEvidence} eligible
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    reportQualityMetrics.percentageWithEvidence >= 60
                      ? 'bg-green-500'
                      : reportQualityMetrics.percentageWithEvidence >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${reportQualityMetrics.percentageWithEvidence}%` }}
                />
              </div>
            </div>

            {/* Description Score (30% weight) */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400">Description Score</span>
                  <span 
                    className="text-gray-500 cursor-help text-xs" 
                    title="Average description length normalized to 0-100 scale (100 chars = 100%). Contributes 30% to overall quality score. Longer, detailed descriptions help moderators make better decisions."
                  >
                    ℹ️
                  </span>
                </div>
                <span className="text-xs text-purple-400 font-medium">30% weight</span>
              </div>
              <div
                className={`text-3xl font-bold ${
                  reportQualityMetrics.averageDescriptionLength >= 100
                    ? 'text-green-400'
                    : reportQualityMetrics.averageDescriptionLength >= 60
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {Math.min(Math.round((reportQualityMetrics.averageDescriptionLength / 100) * 100), 100)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Avg: {reportQualityMetrics.averageDescriptionLength} chars
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    reportQualityMetrics.averageDescriptionLength >= 100
                      ? 'bg-green-500'
                      : reportQualityMetrics.averageDescriptionLength >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min((reportQualityMetrics.averageDescriptionLength / 100) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Accuracy Score (30% weight) */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400">Accuracy Score</span>
                  <span 
                    className="text-gray-500 cursor-help text-xs" 
                    title="Validation Rate: Percentage of reviewed reports where a violation was confirmed (status = 'resolved'). Dismissed reports mean no violation was found. Formula: (resolved reports ÷ total reviewed) × 100. Contributes 30% to overall quality score."
                  >
                    ℹ️
                  </span>
                </div>
                <span className="text-xs text-purple-400 font-medium">30% weight</span>
              </div>
              <div
                className={`text-3xl font-bold ${
                  reportQualityMetrics.accuracyRate >= 70
                    ? 'text-green-400'
                    : reportQualityMetrics.accuracyRate >= 50
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {Math.round(reportQualityMetrics.accuracyRate)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {reportQualityMetrics.validatedReports} validated of {reportQualityMetrics.finalizedReports} reviewed
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    reportQualityMetrics.accuracyRate >= 70
                      ? 'bg-green-500'
                      : reportQualityMetrics.accuracyRate >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.round(reportQualityMetrics.accuracyRate)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quality Insights */}
          <div className="space-y-3">
            {reportQualityMetrics.percentageWithEvidence < 40 && (
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <h5 className="text-yellow-400 font-semibold text-sm mb-1">
                      Low Evidence Provision Rate
                    </h5>
                    <p className="text-gray-300 text-xs">
                      Only {reportQualityMetrics.percentageWithEvidence}% of eligible reports include evidence. Consider educating users about providing evidence for faster resolution.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reportQualityMetrics.averageDescriptionLength < 50 && (
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <h5 className="text-yellow-400 font-semibold text-sm mb-1">
                      Short Descriptions
                    </h5>
                    <p className="text-gray-300 text-xs">
                      Average description length is {reportQualityMetrics.averageDescriptionLength} characters. Encourage users to provide more detailed descriptions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reportQualityMetrics.averageQualityScore >= 70 &&
              reportQualityMetrics.percentageWithEvidence >= 40 &&
              reportQualityMetrics.percentageDetailedDescription >= 60 && (
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">✨</span>
                    <div>
                      <h5 className="text-green-400 font-semibold text-sm mb-1">
                        Excellent Report Quality
                      </h5>
                      <p className="text-gray-300 text-xs">
                        Your community is submitting high-quality reports with good evidence and detailed descriptions. Keep up the great work!
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Accuracy Breakdown by Report Reason */}
          {reportQualityMetrics.qualityByReason.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-white">Accuracy Scores by Report Reason</h4>
                <span 
                  className="text-gray-400 cursor-help text-xs" 
                  title="Shows validation rate for each report reason. This measures how often reports for each reason result in confirmed violations (status = 'resolved'). Only includes reasons with 3+ reports for statistical significance."
                >
                  ℹ️
                </span>
              </div>
              
              <div className="space-y-2">
                {reportQualityMetrics.qualityByReason
                  .sort((a, b) => b.accuracyRate - a.accuracyRate) // Sort by accuracy (highest first)
                  .map((item, index) => (
                    <div key={item.reason} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-gray-500 font-mono text-xs w-6">#{index + 1}</span>
                          <div className="flex-1">
                            <span className="text-gray-200 text-sm font-medium">
                              {REASON_LABELS[item.reason as keyof typeof REASON_LABELS] || item.reason}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">({item.reportCount} reports)</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Accuracy Percentage */}
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              item.accuracyRate >= 70 ? 'text-green-400' :
                              item.accuracyRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {item.accuracyRate}%
                            </div>
                            <div className="text-xs text-gray-500">Accuracy</div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-32">
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-300 ${
                                  item.accuracyRate >= 70 ? 'bg-green-500' :
                                  item.accuracyRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${item.accuracyRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Explanation */}
              <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <span className="text-sm">💡</span>
                  <p className="text-gray-300 text-xs">
                    <strong>Accuracy Rate</strong> measures how often reports for each reason result in confirmed violations. 
                    Higher accuracy means reports for that reason are more likely to identify real violations. 
                    This helps identify which violation types are well-understood by reporters and which may need better guidance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Moderator Performance (Admin Only) */}
      {isAdminUser && moderatorPerformanceWithUsernames.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Moderator Performance Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Moderator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Avg Resolution Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Reversal Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {moderatorPerformanceWithUsernames
                  .sort((a, b) => b.actionsCount - a.actionsCount)
                  .map((mod) => (
                    <tr key={mod.moderatorId} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {mod.moderatorUsername}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mod.reversalRate < 10 
                            ? 'bg-green-900 text-green-200' 
                            : mod.reversalRate < 25 
                            ? 'bg-yellow-900 text-yellow-200' 
                            : 'bg-red-900 text-red-200'
                        }`}>
                          {mod.reversalRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          mod.reversalRate < 10 
                            ? 'text-green-400' 
                            : mod.reversalRate < 25 
                            ? 'text-yellow-400' 
                            : 'text-red-400'
                        }`}>
                          {mod.accuracy}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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
