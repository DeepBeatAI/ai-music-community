'use client';

import { useState, useEffect } from 'react';
import {
  UserRestriction,
  RESTRICTION_TYPE_LABELS,
} from '@/types/moderation';
import {
  getUserActiveRestrictions,
  getUserSuspensionStatus,
  getUserModerationHistory,
  liftSuspension,
  removeBan,
  removeUserRestriction,
  isAdmin,
  UserSuspensionStatus,
  ModerationHistoryEntry,
} from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';
import { ReversalTooltip } from './ReversalTooltip';
import { ModerationHistoryTimeline } from './ModerationHistoryTimeline';

interface UserStatusPanelProps {
  userId: string;
  onActionComplete?: () => void;
}

export function UserStatusPanel({ userId, onActionComplete }: UserStatusPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspensionStatus, setSuspensionStatus] = useState<UserSuspensionStatus | null>(null);
  const [activeRestrictions, setActiveRestrictions] = useState<UserRestriction[]>([]);
  const [fullHistory, setFullHistory] = useState<ModerationHistoryEntry[]>([]); // Store full history for stats and display
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUserStatus();
    checkAdminStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const adminStatus = await isAdmin(user.id);
        setIsAdminUser(adminStatus);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  const loadUserStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load suspension status
      const suspension = await getUserSuspensionStatus(userId);
      setSuspensionStatus(suspension);

      // Load active restrictions
      const restrictions = await getUserActiveRestrictions(userId);
      setActiveRestrictions(restrictions);

      // Load full moderation history (includes all action types)
      const fullHistoryData = await getUserModerationHistory(userId, true);
      setFullHistory(fullHistoryData);
    } catch (err) {
      console.error('Failed to load user status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          <p className="font-semibold">Error loading user status</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate action counts from FULL history (not filtered view)
  // Requirements: 15.8 - Show summary counts for active, reversed, and expired actions
  const now = new Date();
  
  const activeActionsCount = fullHistory.filter(h => {
    if (h.isRevoked) return false;
    if (!h.action.expires_at) return true;
    return new Date(h.action.expires_at) > now;
  }).length;
  
  const revokedActionsCount = fullHistory.filter(h => h.isRevoked).length;
  
  const expiredActionsCount = fullHistory.filter(h => {
    if (h.isRevoked) return false;
    if (!h.action.expires_at) return false;
    return new Date(h.action.expires_at) <= now;
  }).length;
  
  const totalActionsCount = fullHistory.length;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">User Status</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Active Restrictions */}
        {activeRestrictions.length > 0 && (
          <RestrictionsSection
            restrictions={activeRestrictions}
            userId={userId}
            onActionComplete={() => {
              loadUserStatus();
              onActionComplete?.();
            }}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
          />
        )}

        {/* No Active Actions */}
        {!suspensionStatus?.isSuspended && activeRestrictions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No active moderation actions</p>
            <p className="text-sm mt-1">This user has no current restrictions or suspensions</p>
          </div>
        )}

        {/* Action Summary */}
        <ActionSummary
          activeCount={activeActionsCount}
          revokedCount={revokedActionsCount}
          expiredCount={expiredActionsCount}
          totalCount={totalActionsCount}
        />

        {/* Recent Moderation History */}
        <ModerationHistorySection
          history={fullHistory}
        />

        {/* Timeline Visualization - Requirements: 15.6 */}
        {/* Display chronological action history with color-coded markers */}
        {/* Highlight reversals with special markers */}
        {/* Show time between action and reversal */}
        <ModerationHistoryTimeline userId={userId} />
      </div>
    </div>
  );
}

// ============================================================================
// Restrictions Section Component
// ============================================================================

interface RestrictionsSectionProps {
  restrictions: UserRestriction[];
  userId: string;
  onActionComplete: () => void;
  actionLoading: boolean;
  setActionLoading: (loading: boolean) => void;
}

function RestrictionsSection({
  restrictions,
  userId,
  onActionComplete,
  actionLoading,
  setActionLoading,
}: RestrictionsSectionProps) {
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState<UserRestriction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState<string | null>(null);

  const handleRemoveRestriction = async () => {
    if (!selectedRestriction) return;
    
    if (!reversalReason.trim()) {
      setReversalError('Reason is required');
      return;
    }

    try {
      setActionLoading(true);
      setReversalError(null);

      await removeUserRestriction(selectedRestriction.id, reversalReason);

      setShowReversalDialog(false);
      setSelectedRestriction(null);
      setReversalReason('');
      onActionComplete();
    } catch (err) {
      console.error('Failed to remove restriction:', err);
      setReversalError(err instanceof Error ? err.message : 'Failed to remove restriction');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Color coding: Requirements 15.4 - Active actions use Orange (#EA580C)
  return (
    <div className="border border-orange-600 rounded-lg p-4 bg-orange-50">
      <h3 className="text-lg font-semibold text-orange-900 mb-3">Active Restrictions</h3>
      
      <div className="space-y-3">
        {restrictions.map((restriction) => (
          <div
            key={restriction.id}
            className="bg-white rounded border border-orange-200 p-3 flex items-start justify-between"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {RESTRICTION_TYPE_LABELS[restriction.restriction_type]}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Expires: {formatDate(restriction.expires_at)}
              </p>
              {restriction.reason && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Reason:</span> {restriction.reason}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedRestriction(restriction);
                setShowReversalDialog(true);
              }}
              disabled={actionLoading}
              className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Reversal Confirmation Dialog */}
      {showReversalDialog && selectedRestriction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Remove Restriction</h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                You are about to remove this restriction from the user.
              </p>

              <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                <p className="font-medium text-gray-700 mb-1">Restriction Details:</p>
                <p className="text-gray-600">
                  • Type: {RESTRICTION_TYPE_LABELS[selectedRestriction.restriction_type]}
                </p>
                <p className="text-gray-600">
                  • Expires: {formatDate(selectedRestriction.expires_at)}
                </p>
                {selectedRestriction.reason && (
                  <p className="text-gray-600">• Reason: {selectedRestriction.reason}</p>
                )}
              </div>

              <div>
                <label htmlFor="restrictionReversalReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for removal (required)
                </label>
                <textarea
                  id="restrictionReversalReason"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  rows={3}
                  placeholder="Explain why this restriction is being removed..."
                />
              </div>

              {reversalError && (
                <p className="text-sm text-red-600 mt-2">{reversalError}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReversalDialog(false);
                  setSelectedRestriction(null);
                  setReversalReason('');
                  setReversalError(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveRestriction}
                disabled={actionLoading || !reversalReason.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Confirm Remove Restriction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// Action Summary Component
// ============================================================================

interface ActionSummaryProps {
  activeCount: number;
  revokedCount: number;
  expiredCount: number;
  totalCount: number;
}

function ActionSummary({ activeCount, revokedCount, expiredCount, totalCount }: ActionSummaryProps) {
  // Color coding: Requirements 15.4, 15.8
  // Active: Red (#DC2626), Reversed: Gray (#6B7280), Expired: Blue (#2563EB)
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Action Summary</h3>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{activeCount}</p>
          <p className="text-xs text-gray-600 mt-1">Active Actions</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: '#6B7280' }}>{revokedCount}</p>
          <p className="text-xs text-gray-600 mt-1">Reversed Actions</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{expiredCount}</p>
          <p className="text-xs text-gray-600 mt-1">Expired Actions</p>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          <p className="text-xs text-gray-600 mt-1">Total Actions</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Moderation History Section Component
// ============================================================================

interface ModerationHistorySectionProps {
  history: ModerationHistoryEntry[];
}

function ModerationHistorySection({
  history,
}: ModerationHistorySectionProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionTypeLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      content_removed: 'Content Removed',
      content_approved: 'Content Approved',
      user_warned: 'User Warned',
      user_suspended: 'User Suspended',
      user_banned: 'User Permanently Suspended',
      restriction_applied: 'Restriction Applied',
    };
    return labels[actionType] || actionType;
  };

  if (history.length === 0) {
    return null;
  }

  // Show last 5 entries from full history (includes all action types)
  const recentHistory = history.slice(0, 5);

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Recent Moderation History (last 5)</h3>
      </div>

      <div className="divide-y divide-gray-200">
        {recentHistory.map((entry) => {
          // Check if action is expired
          const isExpired = entry.action.expires_at && new Date(entry.action.expires_at) <= new Date();
          
          return (
            <ReversalTooltip key={entry.action.id} action={entry.action} position="right">
              <div
                className={`px-4 py-3 transition-all ${
                  entry.isRevoked 
                    ? 'bg-gray-50 opacity-60' 
                    : isExpired 
                    ? 'bg-blue-50 opacity-60' 
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header - Always visible */}
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${
                        entry.isRevoked 
                          ? 'line-through text-gray-500' 
                          : isExpired 
                          ? 'text-blue-600' 
                          : 'text-gray-900'
                      }`}>
                        {getActionTypeLabel(entry.action.action_type)}
                      </p>
                      {entry.isRevoked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                          REVERSED
                        </span>
                      )}
                      {!entry.isRevoked && isExpired && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-200 text-blue-700">
                          EXPIRED
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(entry.action.created_at)}
                    </p>
                    
                    {entry.action.expires_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {formatDate(entry.action.expires_at)}
                      </p>
                    )}
                    
                    {entry.action.reason && (
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">Reason:</span> {entry.action.reason}
                      </p>
                    )}
                    
                    {entry.isRevoked && entry.reversalReason && (
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">Reversal reason:</span> {entry.reversalReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </ReversalTooltip>
          );
        })}
      </div>

      {history.length > 5 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-600">
            Showing 5 of {history.length} total actions
          </p>
        </div>
      )}
    </div>
  );
}
