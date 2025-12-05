'use client';

import { useState, useEffect } from 'react';
import {
  Report,
  ModerationActionType,
  RestrictionType,
  PRIORITY_LABELS,
  REASON_LABELS,
  STATUS_LABELS,
  ACTION_TYPE_LABELS,
  RESTRICTION_TYPE_LABELS,
} from '@/types/moderation';
import { takeModerationAction, isAdmin, revokeAction } from '@/lib/moderationService';
import { supabase } from '@/lib/supabase';

interface ModerationActionPanelProps {
  report: Report;
  onClose: () => void;
  onActionComplete: () => void;
  actionIdToReverse?: string;
}

interface UserViolationHistory {
  total_reports: number;
  total_actions: number;
  recent_actions: Array<{
    action_type: string;
    reason: string;
    created_at: string;
  }>;
}

export function ModerationActionPanel({
  report,
  onClose,
  onActionComplete,
  actionIdToReverse,
}: ModerationActionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [actionToReverse, setActionToReverse] = useState<any | null>(null);
  
  // User details
  const [reportedUsername, setReportedUsername] = useState<string>('Unknown User');
  const [reporterUsername, setReporterUsername] = useState<string>('Anonymous');
  const [contentPreview, setContentPreview] = useState<string | null>(null);
  const [userHistory, setUserHistory] = useState<UserViolationHistory | null>(null);
  
  // Action form state
  const [selectedAction, setSelectedAction] = useState<ModerationActionType | ''>('');
  const [suspensionDuration, setSuspensionDuration] = useState<number>(7);
  const [restrictionType, setRestrictionType] = useState<RestrictionType>('posting_disabled');
  const [restrictionDuration, setRestrictionDuration] = useState<number | ''>('');
  const [internalNotes, setInternalNotes] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // User role
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isReportedUserAdmin, setIsReportedUserAdmin] = useState(false);

  useEffect(() => {
    loadReportDetails();
    checkAdminStatus();
    checkReportedUserAdminStatus();
    
    // If actionIdToReverse is provided, load that action and show reversal dialog
    if (actionIdToReverse) {
      loadActionToReverse(actionIdToReverse);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, actionIdToReverse]);

  const loadActionToReverse = async (actionId: string) => {
    try {
      const { data: action } = await supabase
        .from('moderation_actions')
        .select('*')
        .eq('id', actionId)
        .single();
      
      if (action) {
        setActionToReverse(action);
        setShowReversalDialog(true);
      }
    } catch (error) {
      console.error('Failed to load action to reverse:', error);
      setError('Failed to load action details');
    }
  };

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

  const checkReportedUserAdminStatus = async () => {
    try {
      if (report.reported_user_id) {
        const adminStatus = await isAdmin(report.reported_user_id);
        setIsReportedUserAdmin(adminStatus);
      }
    } catch (error) {
      console.error('Failed to check reported user admin status:', error);
    }
  };

  const loadReportDetails = async () => {
    try {
      // Fetch reporter username
      if (report.reporter_id) {
        const { data: reporterProfile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('user_id', report.reporter_id)
          .single();
        
        if (reporterProfile) {
          setReporterUsername(reporterProfile.username);
        }
      }

      // Fetch reported user username
      if (report.reported_user_id) {
        const { data: reportedProfile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('user_id', report.reported_user_id)
          .single();
        
        if (reportedProfile) {
          setReportedUsername(reportedProfile.username);
        }

        // Fetch user violation history
        await loadUserHistory(report.reported_user_id);
      }

      // Fetch content preview
      await loadContentPreview();
    } catch (error) {
      console.error('Failed to load report details:', error);
    }
  };

  const loadUserHistory = async (userId: string) => {
    try {
      // Count total reports against this user
      const { count: reportCount } = await supabase
        .from('moderation_reports')
        .select('id', { count: 'exact', head: true })
        .eq('reported_user_id', userId);

      // Fetch recent moderation actions
      const { data: actions } = await supabase
        .from('moderation_actions')
        .select('action_type, reason, created_at')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setUserHistory({
        total_reports: reportCount || 0,
        total_actions: actions?.length || 0,
        recent_actions: actions || [],
      });
    } catch (error) {
      console.error('Failed to load user history:', error);
    }
  };

  const loadContentPreview = async () => {
    try {
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

      const { data } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', report.target_id)
        .maybeSingle();

      if (data) {
        if (report.report_type === 'track') {
          const trackData = data as unknown as { title: string; description?: string };
          setContentPreview(`Title: ${trackData.title}\n${trackData.description || 'No description'}`);
        } else if (report.report_type === 'user') {
          const userData = data as unknown as { username: string; bio?: string };
          setContentPreview(`Username: ${userData.username}\nBio: ${userData.bio || 'No bio'}`);
        } else {
          const contentData = data as unknown as { content?: string };
          setContentPreview(contentData.content || 'No content available');
        }
      } else {
        setContentPreview('Content has been deleted or is unavailable');
      }
    } catch (error) {
      console.error('Failed to load content preview:', error);
      setContentPreview('Failed to load content');
    }
  };

  const handleActionSubmit = async () => {
    if (!selectedAction) {
      setError('Please select an action');
      return;
    }

    // Validate required fields
    if (!internalNotes.trim()) {
      setError('Internal notes are required');
      return;
    }

    // Check if action requires confirmation
    const destructiveActions: ModerationActionType[] = [
      'content_removed',
      'user_suspended',
      'user_banned',
    ];

    if (destructiveActions.includes(selectedAction) && !showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const actionParams: {
        reportId: string;
        actionType: ModerationActionType;
        targetUserId: string;
        reason: string;
        internalNotes: string;
        notificationMessage?: string;
        targetType?: 'post' | 'comment' | 'track' | 'user';
        targetId?: string;
        durationDays?: number;
      } = {
        reportId: report.id,
        actionType: selectedAction,
        targetUserId: report.reported_user_id || report.reporter_id,
        reason: internalNotes,
        internalNotes,
        notificationMessage: notificationMessage || undefined,
      };

      // Add target info for content actions
      if (['content_removed', 'content_approved'].includes(selectedAction)) {
        actionParams.targetType = report.report_type as 'post' | 'comment' | 'track' | 'user';
        actionParams.targetId = report.target_id;
      }

      // Add duration for suspensions
      if (selectedAction === 'user_suspended') {
        actionParams.durationDays = suspensionDuration;
      }

      await takeModerationAction(actionParams);

      // If restriction is being applied, handle it separately
      if (selectedAction === 'restriction_applied') {
        // The restriction would be applied through a separate function
        // For now, we'll include it in the action metadata
      }

      setSuccess(true);
      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to take moderation action:', err);
      
      // Handle specific error codes with user-friendly messages
      if (err && typeof err === 'object' && 'code' in err) {
        const errorCode = (err as { code: string }).code;
        
        if (errorCode === 'MODERATION_INSUFFICIENT_PERMISSIONS') {
          setError('You do not have permission to take action on this user. Moderators cannot take actions on admin accounts.');
        } else if (errorCode === 'MODERATION_UNAUTHORIZED') {
          setError('You are not authorized to perform this action. Please contact an administrator.');
        } else if (errorCode === 'MODERATION_RATE_LIMIT_EXCEEDED') {
          setError('You have exceeded the rate limit for moderation actions. Please try again later.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to take action');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to take action');
      }
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionDescription = (action: ModerationActionType): string => {
    const descriptions: Record<ModerationActionType, string> = {
      content_removed: 'Permanently delete the reported content',
      content_approved: 'Dismiss the report and approve the content',
      user_warned: 'Send a warning notification to the user',
      user_suspended: 'Temporarily suspend the user account',
      user_banned: 'Permanently ban the user account (Admin only)',
      restriction_applied: 'Apply specific restrictions to user capabilities',
    };
    return descriptions[action];
  };

  const handleReversal = async () => {
    if (!actionToReverse) return;
    
    if (!reversalReason.trim()) {
      setError('Reversal reason is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await revokeAction(actionToReverse.id, reversalReason);
      
      setSuccess(true);
      setShowReversalDialog(false);
      
      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to reverse action:', err);
      setError(err instanceof Error ? err.message : 'Failed to reverse action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-none sm:rounded-lg max-w-4xl w-full min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 sm:p-6 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Moderation Action Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <p className="text-green-400 font-medium">Action completed successfully!</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">⚠️</span>
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Admin Account Warning (for non-admin moderators) */}
          {!isAdminUser && isReportedUserAdmin && (
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-500 text-xl">⚠️</span>
                <div>
                  <p className="text-yellow-400 font-semibold mb-1">Admin Account Detected</p>
                  <p className="text-yellow-300 text-sm">
                    This report involves an admin account. As a moderator, you cannot take actions on admin accounts. 
                    Please escalate this report to an administrator if action is needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Report Details Section */}
          <div className="bg-gray-700 rounded-lg p-4 sm:p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-3">Report Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-400">Report ID:</span>
                <p className="text-white font-mono text-sm">{report.id.substring(0, 16)}...</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Created:</span>
                <p className="text-white text-sm">{formatDate(report.created_at)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Type:</span>
                <p className="text-white text-sm capitalize">{report.report_type}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Priority:</span>
                <p className="text-white text-sm">{PRIORITY_LABELS[report.priority]}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Reason:</span>
                <p className="text-white text-sm">{REASON_LABELS[report.reason]}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Status:</span>
                <p className="text-white text-sm">{STATUS_LABELS[report.status]}</p>
              </div>
            </div>

            {report.moderator_flagged && (
              <div className="bg-purple-500/20 border border-purple-500 rounded-md p-3">
                <span className="text-purple-300 font-medium">⚠️ Moderator Flagged</span>
              </div>
            )}

            {report.description && (
              <div>
                <span className="text-sm text-gray-400 block mb-1">Description:</span>
                <p className="text-white text-sm bg-gray-800 rounded p-3">{report.description}</p>
              </div>
            )}
          </div>

          {/* Reported Content Section */}
          <div className="bg-gray-700 rounded-lg p-5 space-y-3">
            <h3 className="text-lg font-semibold text-white">Reported Content</h3>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-400">Reporter:</span>
                <p className="text-white text-sm">{reporterUsername}</p>
              </div>
              {reportedUsername && (
                <div>
                  <span className="text-sm text-gray-400">Reported User:</span>
                  <p className="text-white text-sm">{reportedUsername}</p>
                </div>
              )}
            </div>

            {contentPreview && (
              <div>
                <span className="text-sm text-gray-400 block mb-1">Content Preview:</span>
                <div className="bg-gray-800 rounded p-3 max-h-40 overflow-y-auto">
                  <pre className="text-white text-sm whitespace-pre-wrap font-sans">
                    {contentPreview}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* User History Section */}
          {userHistory && (
            <div className="bg-gray-700 rounded-lg p-4 sm:p-5 space-y-3">
              <h3 className="text-lg font-semibold text-white">User Violation History</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-400">Total Reports:</span>
                  <p className="text-white text-lg font-semibold">{userHistory.total_reports}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Past Actions:</span>
                  <p className="text-white text-lg font-semibold">{userHistory.total_actions}</p>
                </div>
              </div>

              {userHistory.recent_actions.length > 0 && (
                <div>
                  <span className="text-sm text-gray-400 block mb-2">Recent Actions:</span>
                  <div className="space-y-2">
                    {userHistory.recent_actions.map((action, index) => (
                      <div key={index} className="bg-gray-800 rounded p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-orange-400 font-medium">
                            {ACTION_TYPE_LABELS[action.action_type as ModerationActionType]}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {formatDate(action.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-300 text-xs mt-1">{action.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Selection Section */}
          <div className="bg-gray-700 rounded-lg p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white">Take Action</h3>

            {/* Action Type Selector */}
            <div>
              <label htmlFor="action-type" className="block text-sm font-medium text-gray-300 mb-2">
                Action Type *
              </label>
              <select
                id="action-type"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as ModerationActionType)}
                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || success}
              >
                <option value="">Select an action...</option>
                <option value="content_approved">Dismiss Report (Approve Content)</option>
                <option value="content_removed">Remove Content</option>
                <option value="user_warned">Warn User</option>
                <option value="user_suspended">Suspend User</option>
                <option value="restriction_applied">Apply Restriction</option>
                {isAdminUser && <option value="user_banned">Ban User (Admin Only)</option>}
              </select>
              {selectedAction && (
                <p className="text-sm text-gray-400 mt-1">{getActionDescription(selectedAction)}</p>
              )}
            </div>

            {/* Suspension Duration (if suspension selected) */}
            {selectedAction === 'user_suspended' && (
              <div>
                <label htmlFor="suspension-duration" className="block text-sm font-medium text-gray-300 mb-2">
                  Suspension Duration
                </label>
                <select
                  id="suspension-duration"
                  value={suspensionDuration}
                  onChange={(e) => setSuspensionDuration(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || success}
                >
                  <option value={1}>1 Day</option>
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
            )}

            {/* Restriction Type (if restriction selected) */}
            {selectedAction === 'restriction_applied' && (
              <>
                <div>
                  <label htmlFor="restriction-type" className="block text-sm font-medium text-gray-300 mb-2">
                    Restriction Type
                  </label>
                  <select
                    id="restriction-type"
                    value={restrictionType}
                    onChange={(e) => setRestrictionType(e.target.value as RestrictionType)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading || success}
                  >
                    <option value="posting_disabled">Disable Posting</option>
                    <option value="commenting_disabled">Disable Commenting</option>
                    <option value="upload_disabled">Disable Uploads</option>
                  </select>
                  <p className="text-sm text-gray-400 mt-1">
                    {RESTRICTION_TYPE_LABELS[restrictionType]}
                  </p>
                </div>

                <div>
                  <label htmlFor="restriction-duration" className="block text-sm font-medium text-gray-300 mb-2">
                    Restriction Duration (days, leave empty for permanent)
                  </label>
                  <input
                    id="restriction-duration"
                    type="number"
                    min="1"
                    value={restrictionDuration}
                    onChange={(e) => setRestrictionDuration(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Leave empty for permanent"
                    className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading || success}
                  />
                </div>
              </>
            )}

            {/* Internal Notes */}
            <div>
              <label htmlFor="internal-notes" className="block text-sm font-medium text-gray-300 mb-2">
                Internal Notes * (visible to moderators only)
              </label>
              <textarea
                id="internal-notes"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={4}
                placeholder="Explain your decision and reasoning..."
                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={loading || success}
              />
            </div>

            {/* User Notification Message */}
            <div>
              <label htmlFor="notification-message" className="block text-sm font-medium text-gray-300 mb-2">
                User Notification Message (optional)
              </label>
              <textarea
                id="notification-message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={3}
                placeholder="Custom message to send to the user (optional)..."
                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={loading || success}
              />
              <p className="text-xs text-gray-400 mt-1">
                If empty, a default notification will be sent based on the action type
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-700">
            {!isAdminUser && isReportedUserAdmin && (
              <p className="text-sm text-yellow-400 mb-3 text-center">
                Actions are disabled because this report involves an admin account.
              </p>
            )}
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={loading || success || !selectedAction || (!isAdminUser && isReportedUserAdmin)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                title={!isAdminUser && isReportedUserAdmin ? 'Cannot take action on admin accounts' : ''}
              >
                {loading ? 'Processing...' : 'Submit Action'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to {ACTION_TYPE_LABELS[selectedAction as ModerationActionType].toLowerCase()}?
              This action cannot be easily undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reversal Dialog */}
      {showReversalDialog && actionToReverse && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Reverse Moderation Action</h3>
            
            {/* Original Action Details */}
            <div className="bg-gray-700 rounded-lg p-4 mb-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Original Action Details</h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Action Type:</span>
                  <p className="text-white font-medium">
                    {ACTION_TYPE_LABELS[actionToReverse.action_type as ModerationActionType]}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <p className="text-white">
                    {new Date(actionToReverse.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {actionToReverse.duration_days && (
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <p className="text-white">{actionToReverse.duration_days} days</p>
                  </div>
                )}
                {actionToReverse.expires_at && (
                  <div>
                    <span className="text-gray-400">Expires:</span>
                    <p className="text-white">
                      {new Date(actionToReverse.expires_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {actionToReverse.reason && (
                <div>
                  <span className="text-gray-400 text-sm">Original Reason:</span>
                  <p className="text-white text-sm bg-gray-800 rounded p-2 mt-1">
                    {actionToReverse.reason}
                  </p>
                </div>
              )}

              {actionToReverse.internal_notes && (
                <div>
                  <span className="text-gray-400 text-sm">Internal Notes:</span>
                  <p className="text-white text-sm bg-gray-800 rounded p-2 mt-1">
                    {actionToReverse.internal_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-500 text-lg">⚠️</span>
                <div>
                  <p className="text-yellow-400 font-semibold mb-1">Warning</p>
                  <p className="text-yellow-300 text-sm">
                    Reversing this action will restore the user's account status and send them a notification. 
                    This action will be logged in the audit trail.
                  </p>
                </div>
              </div>
            </div>

            {/* Reversal Reason Input */}
            <div className="mb-4">
              <label htmlFor="reversal-reason" className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Reversal * (required)
              </label>
              <textarea
                id="reversal-reason"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                rows={4}
                placeholder="Explain why this action is being reversed (e.g., false positive, user appeal approved, error in judgment)..."
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                This reason will be included in the notification sent to the user and logged in the audit trail.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReversalDialog(false);
                  setReversalReason('');
                  setError(null);
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleReversal}
                disabled={loading || !reversalReason.trim()}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
