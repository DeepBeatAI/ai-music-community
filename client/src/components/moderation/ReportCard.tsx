'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Report,
  ModerationAction,
  PRIORITY_LABELS,
  REASON_LABELS,
  STATUS_LABELS,
} from '@/types/moderation';
import { supabase } from '@/lib/supabase';
import { ReversalTooltip } from './ReversalTooltip';
import { checkPreviousReversals } from '@/lib/moderationService';

interface ReportCardProps {
  report: Report;
  onSelect: () => void;
  showActions?: boolean;
  onReversalRequested?: (actionId: string) => void;
}

export function ReportCard({ report, onSelect, showActions = true, onReversalRequested }: ReportCardProps) {
  const [reporterUsername, setReporterUsername] = useState<string>('Anonymous');
  const [reportedUsername, setReportedUsername] = useState<string | null>(null);
  const [reviewerUsername, setReviewerUsername] = useState<string | null>(null);
  const [contentPreview, setContentPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [relatedAction, setRelatedAction] = useState<ModerationAction | null>(null);
  const [previousReversals, setPreviousReversals] = useState<{
    hasPreviousReversals: boolean;
    reversalCount: number;
    mostRecentReversal: {
      actionType: string;
      reversedAt: string;
      reversalReason: string;
      moderatorId: string;
    } | null;
  } | null>(null);

  const loadRelatedAction = useCallback(async () => {
    try {
      // Fetch the related moderation action if this report has been resolved
      if (report.status === 'resolved' && report.action_taken) {
        const { data: action } = await supabase
          .from('moderation_actions')
          .select('*')
          .eq('related_report_id', report.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (action) {
          setRelatedAction(action);
        }
      }
    } catch (error) {
      console.error('Failed to load related action:', error);
    }
  }, [report.id, report.status, report.action_taken]);

  const loadPreviousReversals = useCallback(async () => {
    try {
      // Check for previous reversed actions related to this report
      const reversalInfo = await checkPreviousReversals(report);
      setPreviousReversals(reversalInfo);
    } catch (error) {
      console.error('Failed to load previous reversals:', error);
      // Don't block the UI if this fails
      setPreviousReversals(null);
    }
  }, [report]);

  const loadReportDetails = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch reporter username
      const { data: reporterData } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('user_id', report.reporter_id)
        .single();
      
      if (reporterData) {
        setReporterUsername(reporterData.username);
      } else {
        setReporterUsername('Unknown User');
      }

      // Fetch reported user username
      if (report.reported_user_id) {
        const { data: reportedUserData } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('user_id', report.reported_user_id)
          .single();
        
        if (reportedUserData) {
          setReportedUsername(reportedUserData.username);
        } else {
          setReportedUsername('Unknown User');
        }
      }

      // Fetch reviewer username if report has been reviewed
      if (report.reviewed_by) {
        const { data: reviewerData } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('user_id', report.reviewed_by)
          .single();
        
        if (reviewerData) {
          setReviewerUsername(reviewerData.username);
        } else {
          setReviewerUsername('Unknown Reviewer');
        }
      }
      
      // Fetch actual content preview
      if (report.target_id) {
        let tableName: string;
        let selectFields: string;

        switch (report.report_type) {
          case 'post':
            tableName = 'posts';
            selectFields = 'content, created_at';
            break;
          case 'comment':
            tableName = 'comments';
            selectFields = 'content, created_at';
            break;
          case 'track':
            tableName = 'tracks';
            selectFields = 'title, description, created_at';
            break;
          case 'user':
            tableName = 'user_profiles';
            selectFields = 'username, bio, created_at';
            break;
          default:
            return;
        }

        const { data: contentData } = await supabase
          .from(tableName)
          .select(selectFields)
          .eq('id', report.target_id)
          .maybeSingle();

        if (contentData) {
          if (report.report_type === 'track') {
            const trackData = contentData as unknown as { title: string; description?: string };
            // Only show title for tracks, not description
            setContentPreview(`Title: ${trackData.title}`);
          } else if (report.report_type === 'user') {
            // Don't show content preview for user reports
            // The user info is already shown in the "Reported user" field
            setContentPreview(null);
          } else {
            const postCommentData = contentData as unknown as { content?: string };
            setContentPreview(postCommentData.content || 'No content available');
          }
        } else {
          // Don't show "content deleted" message for user reports
          if (report.report_type === 'user') {
            setContentPreview(null);
          } else {
            setContentPreview('Content has been deleted or is unavailable');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load report details:', error);
    } finally {
      setLoading(false);
    }
  }, [report.reporter_id, report.reported_user_id, report.report_type]);

  // Fetch additional data when component mounts
  useEffect(() => {
    loadReportDetails();
    loadRelatedAction();
    loadPreviousReversals();
  }, [loadReportDetails, loadRelatedAction, loadPreviousReversals]);

  // Color coding: Requirements 15.4
  // Priority colors remain as-is for priority badges
  // Active actions use Red/Orange, Reversed use Gray
  const priorityColor = {
    1: 'bg-red-600', // High priority - Red (#DC2626)
    2: 'bg-orange-600', // Medium-high - Orange (#EA580C)
    3: 'bg-yellow-500',
    4: 'bg-blue-500',
    5: 'bg-gray-500',
  }[report.priority] || 'bg-gray-500';

  const statusColor = {
    pending: 'bg-yellow-500',
    under_review: 'bg-blue-500',
    resolved: 'bg-green-500',
    dismissed: 'bg-gray-500',
  }[report.status];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'post':
        return '📝';
      case 'comment':
        return '💬';
      case 'track':
        return '🎵';
      case 'user':
        return '👤';
      case 'album':
        return '💿';
      default:
        return '📄';
    }
  };

  return (
    <div
      className="relative bg-gray-700 rounded-lg p-5 hover:bg-gray-650 transition-colors cursor-pointer border border-gray-600 hover:border-gray-500 shadow-sm"
      onClick={onSelect}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Moderator Flag Badge */}
          {report.moderator_flagged && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500">
              ⚠️ Moderator Flag
            </span>
          )}

          {/* Priority Badge */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-white ${priorityColor}`}
          >
            {PRIORITY_LABELS[report.priority]}
          </span>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-white ${statusColor}`}
          >
            {STATUS_LABELS[report.status]}
          </span>

          {/* Evidence Provided Badge */}
          {(report.metadata?.originalWorkLink || 
            report.metadata?.proofOfOwnership || 
            report.metadata?.audioTimestamp) && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-900/30 text-blue-400 border border-blue-500">
              📎 Evidence Provided
            </span>
          )}

          {/* Reporter Accuracy Badge */}
          {report.metadata?.reporterAccuracy && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                report.metadata.reporterAccuracy.accuracyRate >= 80
                  ? 'bg-green-900/30 text-green-400 border border-green-500'
                  : report.metadata.reporterAccuracy.accuracyRate >= 50
                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500'
                  : 'bg-red-900/30 text-red-400 border border-red-500'
              }`}
            >
              Reporter: {report.metadata.reporterAccuracy.accuracyRate}% accurate
            </span>
          )}

          {/* Previously Reversed Badge - Requirements: 15.9 */}
          {previousReversals?.hasPreviousReversals && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500 cursor-help"
              title={`${previousReversals.reversalCount} previous action(s) on this ${report.report_type} were reversed. Most recent: ${previousReversals.mostRecentReversal?.reversalReason || 'No reason provided'}`}
            >
              ⚠️ Previously Reversed
            </span>
          )}
        </div>

        <div className="text-sm text-gray-400 whitespace-nowrap ml-4">
          {formatDate(report.created_at)}
        </div>
      </div>

      {/* Report Details Section */}
      <div className="space-y-3">
        {/* Report Type and Reason */}
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{getReportTypeIcon(report.report_type)}</span>
          <div className="flex-1">
            <div className="flex items-center space-x-2 text-sm mb-1">
              <span className="text-white font-semibold capitalize">{report.report_type}</span>
              <span className="text-gray-500">•</span>
              <span className="text-orange-400 font-medium">{REASON_LABELS[report.reason]}</span>
            </div>
            
            {/* Reporter and Reported User Info */}
            <div className="text-xs text-gray-400 space-y-1">
              <div>
                <span className="text-gray-500">Reported by:</span>{' '}
                <span className="text-gray-300">{reporterUsername}</span>
              </div>
              {reportedUsername && (
                <div>
                  <span className="text-gray-500">Reported user:</span>{' '}
                  <span className="text-gray-300">{reportedUsername}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <div className="bg-gray-800 rounded-md p-3 border border-gray-600">
            <div className="text-xs text-gray-400 mb-1 font-medium">Description:</div>
            <div className="text-sm text-gray-200 line-clamp-3">{report.description}</div>
          </div>
        )}

        {/* Content Preview */}
        {contentPreview && (
          <div className="bg-gray-800 rounded-md p-3 border border-gray-600">
            <div className="text-xs text-gray-400 mb-1 font-medium">Content Preview:</div>
            <div className="text-sm text-gray-300 line-clamp-2 italic">{contentPreview}</div>
          </div>
        )}

        {/* Resolution Notes (if resolved) */}
        {report.resolution_notes && (
          <div className="bg-green-900/20 rounded-md p-3 border border-green-700">
            <div className="text-xs text-green-400 mb-1 font-medium">Resolution Notes:</div>
            <div className="text-sm text-green-200">{report.resolution_notes}</div>
          </div>
        )}

        {/* Reviewed By (if reviewed) */}
        {report.reviewed_by && report.reviewed_at && (
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Reviewed by:</span>{' '}
            <span className="text-gray-300">{reviewerUsername || 'Loading...'}</span>
            {' on '}
            {formatDate(report.reviewed_at)}
          </div>
        )}

        {/* Previous Reversals Context - Requirements: 15.9 */}
        {previousReversals?.hasPreviousReversals && previousReversals.mostRecentReversal && (
          <div className="bg-yellow-900/20 rounded-md p-3 border border-yellow-700">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-500 text-lg">⚠️</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-yellow-400 mb-1">
                  Previous Action Reversed
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>
                    <span className="text-gray-400">Count:</span>{' '}
                    <span className="text-yellow-300 font-medium">
                      {previousReversals.reversalCount} action{previousReversals.reversalCount !== 1 ? 's' : ''} on this {report.report_type} {previousReversals.reversalCount !== 1 ? 'have' : 'has'} been reversed
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Most Recent:</span>{' '}
                    <span className="text-yellow-300">
                      {previousReversals.mostRecentReversal.actionType.replace(/_/g, ' ')}
                    </span>
                    {' on '}
                    {formatDate(previousReversals.mostRecentReversal.reversedAt)}
                  </div>
                  <div>
                    <span className="text-gray-400">Reason:</span>{' '}
                    <span className="text-yellow-300 italic">
                      {previousReversals.mostRecentReversal.reversalReason}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-yellow-200 bg-yellow-900/30 rounded px-2 py-1">
                    💡 This context helps avoid repeating past mistakes. Review carefully before taking action.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reversal Indicator (if action was reversed) */}
      {relatedAction && relatedAction.revoked_at && (
        <ReversalTooltip action={relatedAction} position="top">
          <div className="mt-4 bg-gray-800/50 rounded-md p-3 border border-gray-600 cursor-help">
            <div className="flex items-start space-x-2">
              <span className="text-green-500 text-lg">✓</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-green-400 mb-1">
                  Action Reversed
                </div>
                <div className="text-xs text-gray-400">
                  This action was reversed on {new Date(relatedAction.revoked_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {relatedAction.metadata?.reversal_reason && (
                  <div className="text-xs text-gray-300 mt-1">
                    Reason: {relatedAction.metadata.reversal_reason}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ReversalTooltip>
      )}

      {/* Footer Section with Actions */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-600 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-mono break-all">
            ID: {report.id}
          </div>
          <div className="flex items-center space-x-2">
            {/* Show reversal button if action exists and hasn't been reversed */}
            {relatedAction && !relatedAction.revoked_at && onReversalRequested && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReversalRequested(relatedAction.id);
                }}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                Reverse Action
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Review Report →
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-gray-900/70 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-300">Loading details...</span>
          </div>
        </div>
      )}
    </div>
  );
}
