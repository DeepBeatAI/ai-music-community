'use client';

import { useState, useEffect } from 'react';
import {
  getUserModerationHistory,
  ModerationHistoryEntry,
} from '@/lib/moderationService';
import { ACTION_TYPE_LABELS, REASON_LABELS, ReportReason } from '@/types/moderation';
import { ReversalTooltip } from './ReversalTooltip';

interface ModerationHistoryTimelineProps {
  userId: string;
}

/**
 * ModerationHistoryTimeline Component
 * 
 * Displays a chronological timeline of moderation actions and reversals for a user.
 * 
 * Features:
 * - Color coding: active (red), reversed (gray), expired (blue)
 * - Shows progression of actions over time
 * - Highlights self-reversals (when moderator reverses their own action)
 * - Displays reversal details on hover
 * 
 * Requirements: 14.2, 15.4, 15.6, 15.7
 */
export function ModerationHistoryTimeline({ userId }: ModerationHistoryTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ModerationHistoryEntry[]>([]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load complete moderation history including revoked actions
      const historyData = await getUserModerationHistory(userId, true);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load moderation history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          <p className="font-semibold">Error loading timeline</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Moderation Timeline</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No moderation history</p>
          <p className="text-sm mt-1">This user has no moderation actions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Moderation Timeline</h3>
        <p className="text-sm text-gray-600 mt-1">
          Chronological history of all moderation actions
        </p>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Timeline entries */}
          <div className="space-y-6">
            {history.map((entry, index) => (
              <TimelineEntry
                key={entry.action.id}
                entry={entry}
                isLast={index === history.length - 1}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend - Requirements: 15.4 */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-700 mb-2">Color Legend:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-gray-600">Active Action</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-600">Reversed Action</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-gray-600">Expired Action</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 ring-2 ring-yellow-300"></div>
            <span className="text-gray-600">Self-Reversal</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Timeline Entry Component
// ============================================================================

interface TimelineEntryProps {
  entry: ModerationHistoryEntry;
  isLast: boolean;
}

function TimelineEntry({ entry, isLast }: TimelineEntryProps) {
  const { action, isRevoked, revokedAt, revokedBy, reversalReason, timeBetweenActionAndReversal } = entry;

  // Determine if this is a self-reversal
  const isSelfReversal = isRevoked && action.moderator_id === revokedBy;

  // Determine action state and color
  const isExpired = action.expires_at && new Date(action.expires_at) < new Date();
  const state = isRevoked ? 'reversed' : isExpired ? 'expired' : 'active';

  // Color coding: Requirements 15.4
  // Active: Red (#DC2626) or Orange (#EA580C)
  // Reversed: Gray (#6B7280) with strikethrough
  // Expired: Blue (#2563EB)
  const stateColors = {
    active: {
      marker: 'bg-red-600', // #DC2626
      ring: 'ring-red-200',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
    },
    reversed: {
      marker: 'bg-gray-500', // #6B7280
      ring: 'ring-gray-200',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
    },
    expired: {
      marker: 'bg-blue-600', // #2563EB
      ring: 'ring-blue-200',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
    },
  };

  const colors = stateColors[state];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (durationDays: number | null) => {
    if (!durationDays) return 'Permanent';
    if (durationDays === 1) return '1 day';
    return `${durationDays} days`;
  };

  // Format time between action and reversal
  // Requirements: 15.6 - Show time between action and reversal
  const formatTimeBetween = (milliseconds: number | null) => {
    if (!milliseconds) return null;
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  };

  // Helper function to get full reason label
  const getReasonLabel = (reason: string): string => {
    // Check if reason is a key in REASON_LABELS
    if (reason in REASON_LABELS) {
      return REASON_LABELS[reason as ReportReason];
    }
    // Otherwise return the reason as-is (might be custom text)
    return reason;
  };

  return (
    <div className="relative pl-12">
      {/* Timeline marker - Requirements: 15.7 - Different marker style for self-reversals */}
      <div
        className={`absolute left-2 top-2 w-4 h-4 rounded-full ${
          isSelfReversal ? 'bg-yellow-500 ring-4 ring-yellow-300' : `${colors.marker} ring-4 ${colors.ring}`
        } z-10 cursor-help`}
        title={isSelfReversal ? 'Self-Reversal: Moderator reversed their own action' : state.charAt(0).toUpperCase() + state.slice(1)}
      ></div>

      {/* Action card */}
      <ReversalTooltip action={action} position="right">
        <div className={`border ${colors.border} ${colors.bg} rounded-lg p-4 ${
          isRevoked ? 'opacity-75 cursor-help' : ''
        }`}>
          {/* Action header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4
                  className={`font-semibold ${colors.text} ${
                    isRevoked ? 'line-through' : ''
                  }`}
                >
                  {ACTION_TYPE_LABELS[action.action_type]}
                </h4>

                {/* State badges */}
                {isRevoked && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                    REVERSED
                  </span>
                )}
                {isSelfReversal && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-200 text-yellow-800">
                    SELF-REVERSAL
                  </span>
                )}
                {isExpired && !isRevoked && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-200 text-blue-800">
                    EXPIRED
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {formatDate(action.created_at)}
              </p>
            </div>
          </div>

          {/* Action details */}
          <div className="space-y-1 text-sm">
            {action.reason && (
              <p className={`${colors.text} ${isRevoked ? 'line-through' : ''}`}>
                <span className="font-medium">Reason:</span> {getReasonLabel(action.reason)}
              </p>
            )}

            {action.duration_days && (
              <p className={`${colors.text} ${isRevoked ? 'line-through' : ''}`}>
                <span className="font-medium">Duration:</span>{' '}
                {formatDuration(action.duration_days)}
              </p>
            )}

            {action.expires_at && (
              <p className={`${colors.text} ${isRevoked ? 'line-through' : ''}`}>
                <span className="font-medium">Expires:</span>{' '}
                {formatDate(action.expires_at)}
              </p>
            )}

            {action.internal_notes && (
              <p className={`${colors.text} ${isRevoked ? 'line-through' : ''}`}>
                <span className="font-medium">Notes:</span> {action.internal_notes}
              </p>
            )}
          </div>

          {/* Reversal information - inside the action card */}
          {isRevoked && revokedAt && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0">↩️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    Action Reversed
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatDate(revokedAt)}
                  </p>
                  {/* Requirements: 15.6 - Show time between action and reversal */}
                  {timeBetweenActionAndReversal && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-medium">Time to reversal:</span> {formatTimeBetween(timeBetweenActionAndReversal)}
                    </p>
                  )}
                  {reversalReason && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-medium">Reversal reason:</span> {reversalReason}
                    </p>
                  )}
                  
                  {/* Self-reversal note - inside reversal section */}
                  {isSelfReversal && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-start gap-2">
                        <span className="text-sm flex-shrink-0">⚠️</span>
                        <div className="flex-1">
                          <p className="text-xs text-yellow-800 font-semibold">
                            Self-Reversal
                          </p>
                          <p className="text-xs text-yellow-700 mt-0.5">
                            Moderator corrected their own action
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </ReversalTooltip>

      {/* Connection line to next entry */}
      {!isLast && (
        <div className="absolute left-4 top-6 w-0.5 h-6 bg-gray-200"></div>
      )}
    </div>
  );
}
