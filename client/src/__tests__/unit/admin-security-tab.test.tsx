/**
 * Security Tab Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecurityTab } from '@/components/admin/SecurityTab';
import * as securityService from '@/lib/securityService';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

jest.mock('@/lib/securityService');

const mockSecurityEvents = [
  {
    id: '1',
    event_type: 'failed_login',
    severity: 'medium' as const,
    user_id: 'user-1',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    details: { attempts: 3 },
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockAuditLogs = [
  {
    id: '1',
    admin_user_id: 'admin-1',
    action_type: 'user_role_changed',
    target_resource_type: 'user',
    target_resource_id: 'user-1',
    old_value: { roles: [] },
    new_value: { roles: ['moderator'] },
    metadata: null,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockSessions = [
  {
    id: 'session-1',
    user_id: 'user-1',
    session_token: 'token-123',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    last_activity: '2024-01-01T00:00:00Z',
    expires_at: '2024-01-02T00:00:00Z',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

describe('SecurityTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.alert and window.confirm
    global.alert = jest.fn();
    global.confirm = jest.fn(() => true);
    (securityService.fetchSecurityEvents as jest.Mock).mockResolvedValue({
      events: mockSecurityEvents,
    });
    (securityService.fetchAuditLogs as jest.Mock).mockResolvedValue({
      logs: mockAuditLogs,
    });
    (securityService.fetchActiveSessions as jest.Mock).mockResolvedValue(mockSessions);
  });

  it('should render view selector tabs', async () => {
    render(<SecurityTab />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Security Events/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Audit Logs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Active Sessions/i })).toBeInTheDocument();
    });
  });

  it('should show security events by default', async () => {
    render(<SecurityTab />);

    await waitFor(() => {
      expect(screen.getByText('failed_login')).toBeInTheDocument();
    });
  });

  it('should switch to audit logs view', async () => {
    const user = userEvent.setup();
    render(<SecurityTab />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Audit Logs/i })).toBeInTheDocument();
    });

    const auditTab = screen.getByRole('button', { name: /Audit Logs/i });
    await user.click(auditTab);

    await waitFor(() => {
      expect(screen.getByText('user_role_changed')).toBeInTheDocument();
    });
  });

  it('should switch to sessions view', async () => {
    const user = userEvent.setup();
    render(<SecurityTab />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Active Sessions/i })).toBeInTheDocument();
    });

    const sessionsTab = screen.getByRole('button', { name: /Active Sessions/i });
    await user.click(sessionsTab);

    await waitFor(() => {
      // Check for user-1 which is displayed in the table
      expect(screen.getByText(/user-1/)).toBeInTheDocument();
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    });
  });

  it('should filter security events by severity', async () => {
    const user = userEvent.setup();
    render(<SecurityTab />);

    await waitFor(() => {
      expect(screen.getByText('failed_login')).toBeInTheDocument();
    });

    const severityFilter = screen.getAllByRole('combobox')[0];
    await user.selectOptions(severityFilter, 'high');

    await waitFor(() => {
      expect(securityService.fetchSecurityEvents).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'high' })
      );
    });
  });

  it('should resolve security event', async () => {
    const user = userEvent.setup();
    (securityService.resolveSecurityEvent as jest.Mock).mockResolvedValue(undefined);

    render(<SecurityTab />);

    await waitFor(() => {
      expect(screen.getByText('failed_login')).toBeInTheDocument();
    });

    const resolveButton = screen.getByRole('button', { name: /Resolve/i });
    await user.click(resolveButton);

    await waitFor(() => {
      expect(securityService.resolveSecurityEvent).toHaveBeenCalledWith('1');
    });
  });

  it('should terminate session', async () => {
    const user = userEvent.setup();
    (securityService.terminateSession as jest.Mock).mockResolvedValue(undefined);

    render(<SecurityTab />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Active Sessions/i })).toBeInTheDocument();
    });

    const sessionsTab = screen.getByRole('button', { name: /Active Sessions/i });
    await user.click(sessionsTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Terminate/i })).toBeInTheDocument();
    });

    const terminateButton = screen.getByRole('button', { name: /Terminate/i });
    await user.click(terminateButton);

    await waitFor(() => {
      expect(securityService.terminateSession).toHaveBeenCalledWith('session-1');
    });
  });
});
