'use client';

import { useState, useEffect } from 'react';
import {
  fetchSecurityEvents,
  resolveSecurityEvent,
  fetchAuditLogs,
  fetchActiveSessions,
  terminateSession,
} from '@/lib/securityService';
import type { SecurityEvent, AdminAuditLog, UserSession } from '@/types/admin';

export function SecurityTab() {
  const [activeView, setActiveView] = useState<'events' | 'audit' | 'sessions'>('events');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('unresolved');

  const loadSecurityEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const severity = severityFilter !== 'all' ? (severityFilter as 'low' | 'medium' | 'high' | 'critical') : undefined;
      const data = await fetchSecurityEvents({
        severity,
        resolved: resolvedFilter === 'resolved' ? true : resolvedFilter === 'unresolved' ? false : undefined,
      });
      setSecurityEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security events');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAuditLogs({});
      setAuditLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchActiveSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'events') {
      loadSecurityEvents();
    } else if (activeView === 'audit') {
      loadAuditLogs();
    } else if (activeView === 'sessions') {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, severityFilter, resolvedFilter]);

  const handleResolveEvent = async (eventId: string) => {
    try {
      await resolveSecurityEvent(eventId);
      loadSecurityEvents();
      alert('Security event resolved successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve security event');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) return;

    try {
      await terminateSession(sessionId);
      loadSessions();
      alert('Session terminated successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to terminate session');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveView('events')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeView === 'events'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Security Events
        </button>
        <button
          onClick={() => setActiveView('audit')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeView === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveView('sessions')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeView === 'sessions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Sessions
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Security Events View */}
      {activeView === 'events' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Events</option>
              <option value="unresolved">Unresolved Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
          </div>

          {/* Events List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading security events...</div>
            ) : securityEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No security events found</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {securityEvents.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span>{getSeverityIcon(event.severity)}</span>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(
                              event.severity
                            )}`}
                          >
                            {event.severity.toUpperCase()}
                          </span>
                          <span className="font-medium">{event.event_type}</span>
                          {event.resolved && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {event.user_id && <p>User ID: {event.user_id}</p>}
                          {event.ip_address && <p>IP: {event.ip_address}</p>}
                          {event.details && (
                            <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          )}
                          <p className="text-xs text-gray-400">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!event.resolved && (
                        <button
                          onClick={() => handleResolveEvent(event.id)}
                          className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Logs View */}
      {activeView === 'audit' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.admin_user_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.action_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.target_resource_type}
                        {log.target_resource_id && `: ${log.target_resource_id.substring(0, 8)}...`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.new_value && (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-800">
                              View changes
                            </summary>
                            <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify({ old: log.old_value, new: log.new_value }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Sessions View */}
      {activeView === 'sessions' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading active sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No active sessions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.user_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.ip_address || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.last_activity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.expires_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleTerminateSession(session.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Terminate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
