/**
 * Security Service Tests
 * 
 * Tests for security monitoring and management service functions
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 8.3, 8.4
 */

import { supabase } from '@/lib/supabase';
import {
  fetchSecurityEvents,
  resolveSecurityEvent,
  fetchAuditLogs,
  fetchActiveSessions,
  fetchUserSessions,
  terminateSession,
  fetchUnresolvedEventsCounts,
  logSecurityEvent,
} from '@/lib/securityService';
import { AdminError, ADMIN_ERROR_CODES } from '@/types/admin';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

describe('Security Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchSecurityEvents', () => {
    it('should fetch security events with default pagination', async () => {
      const mockEvents = [
        {
          id: '1',
          event_type: 'failed_login',
          severity: 'medium',
          user_id: 'user-1',
          resolved: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
          count: 1,
        }),
      });

      const result = await fetchSecurityEvents();

      expect(result).toEqual({
        events: mockEvents,
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
        nextCursor: undefined,
        hasMore: false,
      });
    });

    it('should apply event type filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchSecurityEvents({ eventType: 'failed_login' });

      expect(mockFrom.eq).toHaveBeenCalledWith('event_type', 'failed_login');
    });

    it('should apply severity filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchSecurityEvents({ severity: 'critical' });

      expect(mockFrom.eq).toHaveBeenCalledWith('severity', 'critical');
    });

    it('should apply resolved filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchSecurityEvents({ resolved: false });

      expect(mockFrom.eq).toHaveBeenCalledWith('resolved', false);
    });

    it('should apply date range filters', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchSecurityEvents({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockFrom.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
      expect(mockFrom.lte).toHaveBeenCalledWith('created_at', '2024-01-31');
    });

    it('should handle database errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0,
        }),
      });

      await expect(fetchSecurityEvents()).rejects.toThrow(AdminError);
    });
  });

  describe('resolveSecurityEvent', () => {
    it('should resolve security event and log action', async () => {
      const mockUser = { id: 'admin-1' };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await resolveSecurityEvent('event-1');

      expect(supabase.from).toHaveBeenCalledWith('security_events');
      expect(supabase.rpc).toHaveBeenCalledWith('log_admin_action', expect.any(Object));
    });

    it('should handle unauthenticated user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await expect(resolveSecurityEvent('event-1')).rejects.toThrow(AdminError);
      await expect(resolveSecurityEvent('event-1')).rejects.toThrow('User not authenticated');
    });

    it('should handle update errors', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      });

      await expect(resolveSecurityEvent('event-1')).rejects.toThrow(AdminError);
    });
  });

  describe('fetchAuditLogs', () => {
    it('should fetch audit logs with default pagination', async () => {
      const mockLogs = [
        {
          id: '1',
          admin_user_id: 'admin-1',
          action_type: 'user_plan_changed',
          target_resource_type: 'user',
          target_resource_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockLogs,
          error: null,
          count: 1,
        }),
      });

      const result = await fetchAuditLogs();

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1,
        nextCursor: undefined,
        hasMore: false,
      });
    });

    it('should apply action type filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchAuditLogs({ actionType: 'user_plan_changed' });

      expect(mockFrom.eq).toHaveBeenCalledWith('action_type', 'user_plan_changed');
    });

    it('should apply target resource type filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await fetchAuditLogs({ targetResourceType: 'user' });

      expect(mockFrom.eq).toHaveBeenCalledWith('target_resource_type', 'user');
    });
  });

  describe('fetchActiveSessions', () => {
    it('should fetch active user sessions', async () => {
      const mockSessions = [
        {
          id: '1',
          user_id: 'user-1',
          session_token: 'token-1',
          is_active: true,
          expires_at: '2024-12-31T00:00:00Z',
          last_activity: '2024-01-01T00:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      });

      const result = await fetchActiveSessions();

      expect(result).toEqual(mockSessions);
      expect(supabase.from).toHaveBeenCalledWith('user_sessions');
    });

    it('should handle fetch errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Fetch failed' },
        }),
      });

      await expect(fetchActiveSessions()).rejects.toThrow(AdminError);
    });
  });

  describe('fetchUserSessions', () => {
    it('should fetch sessions for specific user', async () => {
      const mockSessions = [
        {
          id: '1',
          user_id: 'user-1',
          session_token: 'token-1',
          is_active: true,
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      });

      const result = await fetchUserSessions('user-1');

      expect(result).toEqual(mockSessions);
    });
  });

  describe('terminateSession', () => {
    it('should terminate user session', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await terminateSession('session-1');

      expect(supabase.rpc).toHaveBeenCalledWith('terminate_user_session', {
        p_session_id: 'session-1',
      });
    });

    it('should handle termination errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        error: { message: 'Termination failed' },
      });

      await expect(terminateSession('session-1')).rejects.toThrow(AdminError);
    });
  });

  describe('fetchUnresolvedEventsCounts', () => {
    it('should count unresolved events by severity', async () => {
      const mockEvents = [
        { severity: 'critical' },
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const result = await fetchUnresolvedEventsCounts();

      expect(result).toEqual({
        critical: 2,
        high: 1,
        medium: 1,
        low: 1,
      });
    });

    it('should handle fetch errors', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Fetch failed' },
        }),
      });

      await expect(fetchUnresolvedEventsCounts()).rejects.toThrow(AdminError);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

      await logSecurityEvent(
        'failed_login',
        'medium',
        'user-1',
        { ip: '127.0.0.1' }
      );

      expect(supabase.rpc).toHaveBeenCalledWith('log_security_event', {
        p_event_type: 'failed_login',
        p_severity: 'medium',
        p_user_id: 'user-1',
        p_details: { ip: '127.0.0.1' },
      });
    });

    it('should handle logging errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        error: { message: 'Logging failed' },
      });

      await expect(
        logSecurityEvent('failed_login', 'medium')
      ).rejects.toThrow(AdminError);
    });
  });
});
