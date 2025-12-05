'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import {
  getReversalMetrics,
  getReversalHistory,
  getReversalPatterns,
  type ReversalMetrics,
} from '@/lib/moderationService';
import { ReversalMetricsPanel } from './ReversalMetricsPanel';
import type { ReversalHistoryEntry, ReversalPatterns } from '@/types/moderation';

interface ReversalReportProps {
  startDate: string;
  endDate: string;
  onClose?: () => void;
}

interface ReportData {
  metrics: ReversalMetrics | null;
  history: ReversalHistoryEntry[];
  patterns: ReversalPatterns | null;
  generatedAt: string;
}

/**
 * ReversalReport Component
 * 
 * Generates comprehensive reversal reports for a date range with:
 * - All metrics and statistics
 * - Patterns and trends analysis
 * - Complete reversal history
 * - PDF export capability
 * 
 * Requirements: 14.9
 */
export function ReversalReport({ startDate, endDate, onClose }: ReversalReportProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch all report data
  useEffect(() => {
    async function fetchReportData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [metricsResult, historyResult, patternsResult] = await Promise.all([
          getReversalMetrics(startDate, endDate),
          getReversalHistory({ startDate, endDate }),
          getReversalPatterns(startDate, endDate),
        ]);

        setReportData({
          metrics: metricsResult,
          history: historyResult,
          patterns: patternsResult,
          generatedAt: new Date().toISOString(),
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
        console.error('Error generating reversal report:', err);
        setError(errorMessage);
        showToast('Failed to generate reversal report', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [startDate, endDate, showToast]);

  // Export report to PDF
  const handleExportPDF = async () => {
    if (!reportData) return;

    try {
      setExporting(true);

      // Create printable HTML content
      const printContent = generatePrintableHTML(reportData, startDate, endDate);

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window. Please allow popups.');
      }

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
      };

      showToast('Opening print dialog...', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDF';
      console.error('Error exporting PDF:', err);
      showToast(errorMessage, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <h3 className="text-xl font-bold text-white mb-2">Generating Report</h3>
            <p className="text-gray-400">
              Analyzing reversal data from {new Date(startDate).toLocaleDateString()} to{' '}
              {new Date(endDate).toLocaleDateString()}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reportData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Report Generation Failed</h3>
            <p className="text-gray-400 mb-6">{error || 'An unexpected error occurred'}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg w-full max-w-7xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Reversal Report</h2>
              <p className="text-gray-400 text-sm">
                {new Date(startDate).toLocaleDateString()} -{' '}
                {new Date(endDate).toLocaleDateString()}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Generated: {new Date(reportData.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    <span>Export PDF</span>
                  </>
                )}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6 space-y-8">
          {/* Executive Summary */}
          <ReportSummary reportData={reportData} startDate={startDate} endDate={endDate} />

          {/* Metrics Section */}
          <section>
            <h3 className="text-xl font-bold text-white mb-4">📊 Reversal Metrics</h3>
            <ReversalMetricsPanel startDate={startDate} endDate={endDate} />
          </section>

          {/* Patterns and Trends */}
          <PatternsSection patterns={reportData.patterns} />

          {/* Reversal History */}
          <section>
            <h3 className="text-xl font-bold text-white mb-4">📜 Complete Reversal History</h3>
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-4">
                Showing {reportData.history.length} reversal(s) from{' '}
                {new Date(startDate).toLocaleDateString()} to{' '}
                {new Date(endDate).toLocaleDateString()}
              </p>
              {reportData.history.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No reversals in this period</p>
              ) : (
                <div className="space-y-4">
                  {reportData.history.slice(0, 20).map((entry, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 opacity-75"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-white font-medium line-through">
                            {entry.action.action_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-gray-400">
                            Reversed: {new Date(entry.revokedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-600 text-gray-300">
                            REVERSED
                          </span>
                          {entry.isSelfReversal && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-400">
                              Self-Reversal
                            </span>
                          )}
                        </div>
                      </div>
                      {entry.action.reason && (
                        <div className="text-sm text-gray-300 mt-2 line-through">
                          Original Reason: {entry.action.reason}
                        </div>
                      )}
                      {entry.reversalReason && (
                        <div className="text-sm text-gray-300 mt-2">
                          Reversal Reason: {entry.reversalReason}
                        </div>
                      )}
                    </div>
                  ))}
                  {reportData.history.length > 20 && (
                    <p className="text-gray-400 text-sm text-center">
                      Showing first 20 of {reportData.history.length} reversals
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Recommendations */}
          <RecommendationsSection reportData={reportData} />
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Report Summary Component
// ============================================================================

interface ReportSummaryProps {
  reportData: ReportData;
  startDate: string;
  endDate: string;
}

function ReportSummary({ reportData }: ReportSummaryProps) {
  const { metrics, history, patterns } = reportData;
  
  // Calculate key insights
  const totalReversals = history.length;
  const avgTimeToReversal = metrics?.timeToReversalStats?.averageHours || 0;
  const overallReversalRate = metrics?.overallReversalRate || 0;
  
  // Determine health status
  const getHealthStatus = () => {
    if (overallReversalRate < 10) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-900/30' };
    if (overallReversalRate < 15) return { label: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-900/30' };
    if (overallReversalRate < 20) return { label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' };
    if (overallReversalRate < 30) return { label: 'Concerning', color: 'text-orange-400', bgColor: 'bg-orange-900/30' };
    return { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-900/30' };
  };

  const healthStatus = getHealthStatus();

  return (
    <section className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">📋 Executive Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Reversals</div>
          <div className="text-3xl font-bold text-white">{totalReversals}</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Reversal Rate</div>
          <div className={`text-3xl font-bold ${healthStatus.color}`}>
            {overallReversalRate.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Avg Time to Reversal</div>
          <div className="text-3xl font-bold text-purple-400">
            {avgTimeToReversal.toFixed(1)}h
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">System Health</div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${healthStatus.bgColor} ${healthStatus.color}`}>
            {healthStatus.label}
          </div>
        </div>
      </div>

      <div className="bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Key Findings</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>
              <strong className="text-white">{totalReversals}</strong> moderation actions were reversed
              during this period
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>
              Overall reversal rate of <strong className="text-white">{overallReversalRate.toFixed(1)}%</strong>{' '}
              indicates {healthStatus.label.toLowerCase()} moderation quality
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>
              Average time to detect and reverse mistakes:{' '}
              <strong className="text-white">{avgTimeToReversal.toFixed(1)} hours</strong>
            </span>
          </li>
          {patterns?.commonReasons && patterns.commonReasons.length > 0 && (
            <li className="flex items-start space-x-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>
                Most common reversal reason:{' '}
                <strong className="text-white">{patterns.commonReasons[0].reason}</strong>{' '}
                ({patterns.commonReasons[0].count} occurrences)
              </span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

// ============================================================================
// Patterns Section Component
// ============================================================================

interface PatternsSectionProps {
  patterns: ReversalPatterns | null;
}

function PatternsSection({ patterns }: PatternsSectionProps) {
  if (!patterns) {
    return (
      <section className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">📈 Patterns & Trends</h3>
        <p className="text-gray-400 text-center py-8">No pattern data available</p>
      </section>
    );
  }

  return (
    <section className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">📈 Patterns & Trends</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Common Reversal Reasons */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Common Reversal Reasons</h4>
          {patterns.commonReasons && patterns.commonReasons.length > 0 ? (
            <div className="space-y-3">
              {patterns.commonReasons.slice(0, 5).map((reason, index: number) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm">{reason.reason}</span>
                    <span className="text-gray-400 text-sm">
                      {reason.count} ({reason.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${reason.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No data available</p>
          )}
        </div>

        {/* Users with Multiple Reversals */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Users with Multiple Reversals</h4>
          {patterns.usersWithMultipleReversals && patterns.usersWithMultipleReversals.length > 0 ? (
            <div className="space-y-2">
              {patterns.usersWithMultipleReversals.slice(0, 5).map((user, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-700/50 rounded"
                >
                  <div>
                    <div className="text-white text-sm font-medium">
                      {user.username || 'Unknown User'}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {user.reversedActionCount} of {user.totalActionCount} actions reversed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      user.reversalRate > 25 ? 'text-red-400' : 
                      user.reversalRate > 15 ? 'text-yellow-400' : 
                      'text-blue-400'
                    }`}>
                      {user.reversalRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No data available</p>
          )}
        </div>

        {/* Day of Week Patterns */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Reversals by Day of Week</h4>
          {patterns.dayOfWeekPatterns && patterns.dayOfWeekPatterns.length > 0 ? (
            <div className="space-y-2">
              {patterns.dayOfWeekPatterns.map((day, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm w-24">{day.dayOfWeek}</span>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${day.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm w-16 text-right">
                    {day.count} ({day.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No data available</p>
          )}
        </div>

        {/* Hour of Day Patterns */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Reversals by Hour of Day</h4>
          {patterns.hourOfDayPatterns && patterns.hourOfDayPatterns.length > 0 ? (
            <div className="space-y-1">
              {patterns.hourOfDayPatterns
                .filter((hour) => hour.count > 0)
                .slice(0, 8)
                .map((hour, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 w-16">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-600 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${hour.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-gray-400 w-12 text-right">{hour.count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No data available</p>
          )}
        </div>
      </div>
    </section>
  );
}


// ============================================================================
// Recommendations Section Component
// ============================================================================

interface RecommendationsSectionProps {
  reportData: ReportData;
}

function RecommendationsSection({ reportData }: RecommendationsSectionProps) {
  const { metrics, patterns } = reportData;
  const recommendations: Array<{ type: 'success' | 'warning' | 'error'; text: string }> = [];

  // Analyze metrics and generate recommendations
  const overallRate = metrics?.overallReversalRate || 0;
  const avgTime = metrics?.timeToReversalStats?.averageHours || 0;

  if (overallRate < 10) {
    recommendations.push({
      type: 'success',
      text: 'Excellent moderation quality! Reversal rate is below 10%, indicating strong decision-making.',
    });
  } else if (overallRate >= 20) {
    recommendations.push({
      type: 'error',
      text: 'High reversal rate detected. Consider implementing peer review for complex cases and providing additional moderator training.',
    });
  } else if (overallRate >= 15) {
    recommendations.push({
      type: 'warning',
      text: 'Reversal rate is approaching concerning levels. Review moderation guidelines and ensure clarity on edge cases.',
    });
  }

  if (avgTime > 48) {
    recommendations.push({
      type: 'warning',
      text: 'Mistakes are taking too long to correct (>48 hours). Implement more frequent quality checks or peer review processes.',
    });
  } else if (avgTime < 12) {
    recommendations.push({
      type: 'success',
      text: 'Quick error detection! Mistakes are being caught and corrected within 12 hours on average.',
    });
  }

  // Check for patterns
  if (patterns?.usersWithMultipleReversals && patterns.usersWithMultipleReversals.length > 0) {
    const highRateUsers = patterns.usersWithMultipleReversals.filter((u) => u.reversalRate > 25);
    if (highRateUsers.length > 0) {
      recommendations.push({
        type: 'error',
        text: `${highRateUsers.length} moderator(s) have reversal rates above 25%. Provide targeted training and mentorship.`,
      });
    }
  }

  // Check for common reversal reasons
  if (patterns?.commonReasons && patterns.commonReasons.length > 0) {
    const topReason = patterns.commonReasons[0];
    if (topReason.percentage > 30) {
      recommendations.push({
        type: 'warning',
        text: `"${topReason.reason}" accounts for ${topReason.percentage.toFixed(0)}% of reversals. Review and clarify guidelines for this scenario.`,
      });
    }
  }

  // Check for time patterns
  if (patterns?.dayOfWeekPatterns && patterns.dayOfWeekPatterns.length > 0) {
    const sortedDays = [...patterns.dayOfWeekPatterns].sort((a, b) => b.count - a.count);
    if (sortedDays[0].count > sortedDays[sortedDays.length - 1].count * 2) {
      recommendations.push({
        type: 'warning',
        text: `Reversals spike on ${sortedDays[0].dayOfWeek}. Consider additional support or review processes on this day.`,
      });
    }
  }

  // If no issues found
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      text: 'No significant issues detected. Continue current moderation practices and maintain regular quality reviews.',
    });
  }

  return (
    <section className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">💡 Recommendations</h3>
      
      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const config = {
            success: {
              icon: '✅',
              bgColor: 'bg-green-900/20',
              borderColor: 'border-green-500/50',
              textColor: 'text-green-400',
            },
            warning: {
              icon: '⚠️',
              bgColor: 'bg-yellow-900/20',
              borderColor: 'border-yellow-500/50',
              textColor: 'text-yellow-400',
            },
            error: {
              icon: '🚨',
              bgColor: 'bg-red-900/20',
              borderColor: 'border-red-500/50',
              textColor: 'text-red-400',
            },
          }[rec.type];

          return (
            <div
              key={index}
              className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{config.icon}</span>
                <p className={`${config.textColor} text-sm flex-1`}>{rec.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Items */}
      <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Suggested Action Items</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">1.</span>
            <span>Review this report with moderation team leadership</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">2.</span>
            <span>Address high-priority recommendations within 1 week</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">3.</span>
            <span>Schedule follow-up report in 30 days to track improvements</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">4.</span>
            <span>Update moderation guidelines based on common reversal patterns</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-400 mt-0.5">5.</span>
            <span>Provide targeted training for moderators with high reversal rates</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

// ============================================================================
// PDF Generation Function
// ============================================================================

function generatePrintableHTML(reportData: ReportData, startDate: string, endDate: string): string {
  const { metrics, history, patterns, generatedAt } = reportData;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reversal Report - ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: #1a1a1a;
    }
    
    h2 {
      font-size: 24px;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #2a2a2a;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 5px;
    }
    
    h3 {
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
      color: #3a3a3a;
    }
    
    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4a90e2;
    }
    
    .meta {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    
    .summary-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      background: #f9f9f9;
    }
    
    .summary-card .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    
    .summary-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
    }
    
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    th {
      background: #f5f5f5;
      font-weight: 600;
      color: #333;
    }
    
    .recommendation {
      margin: 10px 0;
      padding: 15px;
      border-left: 4px solid #4a90e2;
      background: #f0f7ff;
      border-radius: 4px;
    }
    
    .recommendation.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    
    .recommendation.error {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      h2 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reversal Report</h1>
    <div class="meta">
      <div>Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</div>
      <div>Generated: ${new Date(generatedAt).toLocaleString()}</div>
    </div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Total Reversals</div>
        <div class="value">${history.length}</div>
      </div>
      <div class="summary-card">
        <div class="label">Reversal Rate</div>
        <div class="value">${metrics?.overallReversalRate?.toFixed(1) || 0}%</div>
      </div>
      <div class="summary-card">
        <div class="label">Avg Time to Reversal</div>
        <div class="value">${metrics?.timeToReversalStats?.averageHours?.toFixed(1) || 0}h</div>
      </div>
      <div class="summary-card">
        <div class="label">Total Actions</div>
        <div class="value">${metrics?.totalActions || 0}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Reversal Metrics Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Actions</td>
          <td>${metrics?.totalActions || 0}</td>
        </tr>
        <tr>
          <td>Total Reversals</td>
          <td>${metrics?.totalReversals || 0}</td>
        </tr>
        <tr>
          <td>Overall Reversal Rate</td>
          <td>${metrics?.overallReversalRate?.toFixed(1) || 0}%</td>
        </tr>
        <tr>
          <td>Average Time to Reversal</td>
          <td>${metrics?.timeToReversalStats?.averageHours?.toFixed(1) || 0} hours</td>
        </tr>
        <tr>
          <td>Median Time to Reversal</td>
          <td>${metrics?.timeToReversalStats?.medianHours?.toFixed(1) || 0} hours</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${patterns?.commonReasons && patterns.commonReasons.length > 0 ? `
  <div class="section">
    <h2>Common Reversal Reasons</h2>
    <table>
      <thead>
        <tr>
          <th>Reason</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${patterns.commonReasons.slice(0, 10).map((reason) => `
          <tr>
            <td>${reason.reason}</td>
            <td>${reason.count}</td>
            <td>${reason.percentage.toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${patterns?.usersWithMultipleReversals && patterns.usersWithMultipleReversals.length > 0 ? `
  <div class="section">
    <h2>Moderators with Multiple Reversals</h2>
    <table>
      <thead>
        <tr>
          <th>Moderator</th>
          <th>Total Actions</th>
          <th>Reversed Actions</th>
          <th>Reversal Rate</th>
        </tr>
      </thead>
      <tbody>
        ${patterns.usersWithMultipleReversals.slice(0, 10).map((user) => `
          <tr>
            <td>${user.username || 'Unknown'}</td>
            <td>${user.totalActionCount}</td>
            <td>${user.reversedActionCount}</td>
            <td>${user.reversalRate.toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>Recommendations</h2>
    ${generateRecommendationsHTML(metrics)}
  </div>

  <div class="footer">
    <p>This report was automatically generated by the Moderation System</p>
    <p>For questions or concerns, please contact the moderation team leadership</p>
  </div>
</body>
</html>
  `;
}

function generateRecommendationsHTML(metrics: ReversalMetrics | null): string {
  const recommendations: Array<{ type: string; text: string }> = [];
  const overallRate = metrics?.overallReversalRate || 0;
  const avgTime = metrics?.timeToReversalStats?.averageHours || 0;

  if (overallRate < 10) {
    recommendations.push({
      type: 'success',
      text: 'Excellent moderation quality! Reversal rate is below 10%.',
    });
  } else if (overallRate >= 20) {
    recommendations.push({
      type: 'error',
      text: 'High reversal rate detected. Implement peer review and additional training.',
    });
  }

  if (avgTime > 48) {
    recommendations.push({
      type: 'warning',
      text: 'Mistakes taking too long to correct. Implement more frequent quality checks.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      text: 'No significant issues detected. Continue current practices.',
    });
  }

  return recommendations
    .map(
      (rec) => `
    <div class="recommendation ${rec.type}">
      ${rec.text}
    </div>
  `
    )
    .join('');
}
