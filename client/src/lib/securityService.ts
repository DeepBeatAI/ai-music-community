/**
 * Security Service
 * 
 * This service provides functions for security monitoring and management.
 * Includes security event tracking, audit log viewing, and session management.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 8.3, 8.4
 */

import { supabase } from '@/lib/supabase';
import { AdminError, ADMIN_ERROR_CODES, SecurityEvent, AdminAuditLog, UserSession } from '@/types/admin';

/**
 * Security event filter parameters
 */
export interface SecurityEventFilters {
  eventType?: SecurityEvent['event_type'];
  severity?: SecurityEvent['severity'];
  resolved?: boolean;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  cursor?: string; // For cursor-based pagination
}

/**
 * Paginated security events response
 */
export interface PaginatedSecurityEvents {
  events: SecurityEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nextCursor?: string; // For cursor-based pagination
  hasMore: boolean;
}

/**
 * Audit log filter parameters
 */
export interface AuditLogFilters {
  actionType?: AdminAuditLog['action_type'];
  targetResourceType?: AdminAuditLog['target_resource_type'];
  adminUserId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  cursor?: string; // For cursor-based pagination
}

/**
 * Paginated audit logs response
 */
export interface PaginatedAuditLogs {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nextCursor?: string; // For cursor-based pagination
  hasMore: boolean;
}

/**
 * Fetch security events with filtering
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export async function fetchSecurityEvents(
  filters: SecurityEventFilters = {}
): Promise<PaginatedSecurityEvents> {
  try {
    const {
      eventType,
      severity,
      resolved,
      userId,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = filters;

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabase
      .from('security_events')
      .select('*', { count: 'exact' });

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (resolved !== undefined) {
      query = query.eq('resolved', resolved);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply cursor-based pagination if cursor provided
    if (filters.cursor) {
      query = query.lt('created_at', filters.cursor);
    }

    // Apply pagination and ordering
    query = query
      .range(from, to)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new AdminError(
        'Failed to fetch security events',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    const totalPages = Math.ceil((count || 0) / pageSize);
    const hasMore = (data?.length || 0) === pageSize;
    const nextCursor = hasMore && data && data.length > 0 
      ? data[data.length - 1].created_at 
      : undefined;

    return {
      events: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching security events',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Resolve a security event
 * Requirements: 5.3
 */
export async function resolveSecurityEvent(eventId: string): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new AdminError(
        'User not authenticated',
        ADMIN_ERROR_CODES.UNAUTHORIZED
      );
    }

    const { error } = await supabase
      .from('security_events')
      .update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) {
      throw new AdminError(
        'Failed to resolve security event',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    // Log the action
    await supabase.rpc('log_admin_action', {
      p_action_type: 'security_event_resolved',
      p_target_resource_type: 'security',
      p_target_resource_id: eventId,
      p_old_value: { resolved: false },
      p_new_value: { resolved: true },
    });
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while resolving security event',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch audit logs with filtering
 * Requirements: 8.3, 8.4
 */
export async function fetchAuditLogs(
  filters: AuditLogFilters = {}
): Promise<PaginatedAuditLogs> {
  try {
    const {
      actionType,
      targetResourceType,
      adminUserId,
      startDate,
      endDate,
      page = 1,
      pageSize = 100,
    } = filters;

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' });

    // Apply filters
    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    if (targetResourceType) {
      query = query.eq('target_resource_type', targetResourceType);
    }

    if (adminUserId) {
      query = query.eq('admin_user_id', adminUserId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply cursor-based pagination if cursor provided
    if (filters.cursor) {
      query = query.lt('created_at', filters.cursor);
    }

    // Apply pagination and ordering
    query = query
      .range(from, to)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new AdminError(
        'Failed to fetch audit logs',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    const totalPages = Math.ceil((count || 0) / pageSize);
    const hasMore = (data?.length || 0) === pageSize;
    const nextCursor = hasMore && data && data.length > 0 
      ? data[data.length - 1].created_at 
      : undefined;

    return {
      logs: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching audit logs',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch active user sessions
 * Requirements: 5.5, 5.6
 */
export async function fetchActiveSessions(): Promise<UserSession[]> {
  try {
    const { data, error } = await supabase.rpc('get_active_sessions_with_usernames');

    if (error) {
      throw new AdminError(
        'Failed to fetch active sessions',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return data || [];
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching active sessions',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch sessions for a specific user
 * Requirements: 5.5
 */
export async function fetchUserSessions(userId: string): Promise<UserSession[]> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false });

    if (error) {
      throw new AdminError(
        'Failed to fetch user sessions',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    return data || [];
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching user sessions',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Terminate a user session
 * Requirements: 5.6
 */
export async function terminateSession(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('terminate_user_session', {
      p_session_id: sessionId,
    });

    if (error) {
      throw new AdminError(
        'Failed to terminate session',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while terminating session',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Fetch unresolved security events count by severity
 * Requirements: 5.4
 */
export async function fetchUnresolvedEventsCounts(): Promise<{
  critical: number;
  high: number;
  medium: number;
  low: number;
}> {
  try {
    const { data, error } = await supabase
      .from('security_events')
      .select('severity')
      .eq('resolved', false);

    if (error) {
      throw new AdminError(
        'Failed to fetch unresolved events counts',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }

    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    (data || []).forEach((event: { severity: string }) => {
      if (event.severity in counts) {
        counts[event.severity as keyof typeof counts]++;
      }
    });

    return counts;
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while fetching unresolved events counts',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Log a security event
 * Requirements: 5.1
 */
export async function logSecurityEvent(
  eventType: SecurityEvent['event_type'],
  severity: SecurityEvent['severity'],
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_severity: severity,
      p_user_id: userId || null,
      p_details: details || null,
    });

    if (error) {
      throw new AdminError(
        'Failed to log security event',
        ADMIN_ERROR_CODES.DATABASE_ERROR,
        { originalError: error }
      );
    }
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(
      'An unexpected error occurred while logging security event',
      ADMIN_ERROR_CODES.DATABASE_ERROR,
      { originalError: error }
    );
  }
}
