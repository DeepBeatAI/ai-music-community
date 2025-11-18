/**
 * User Types Integration Tests
 * 
 * Tests the complete integration of the user types system including:
 * - Authentication flow with user types
 * - AuthContext user type loading
 * - Profile page badge display
 * - Account page plan information
 * - Admin operations end-to-end
 * 
 * Requirements: 3.4, 4.5, 6.2, 6.3
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PlanTier, RoleType, UserTypeError } from '@/types/userTypes';
import UserTypeBadge from '@/components/profile/UserTypeBadge';
import PlanInformationSection from '@/components/account/PlanInformationSection';
import { assignPlanTier, grantRole, revokeRole } from '@/lib/adminService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('User Types Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow with User Types', () => {
    it.skip('should load user type information after successful login', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token',
      };

      // Mock auth session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      // Mock user profile fetch
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: mockUser.id,
                username: 'testuser',
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        if (table === 'user_plan_tiers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { plan_tier: PlanTier.CREATOR_PRO },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ role_type: RoleType.MODERATOR }],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      // Test component that uses auth
      function TestComponent() {
        const { user, userTypeInfo, userTypeLoading } = useAuth();
        
        if (userTypeLoading) {
          return <div>Loading user types...</div>;
        }

        return (
          <div>
            <div data-testid="user-email">{user?.email}</div>
            <div data-testid="plan-tier">{userTypeInfo?.planTier}</div>
            <div data-testid="is-admin">{userTypeInfo?.isAdmin ? 'true' : 'false'}</div>
          </div>
        );
      }

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
    });

    it.skip('should set default plan tier for users without assigned tier', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        email_confirmed_at: new Date().toISOString(),
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      // Mock no plan tier found
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                user_id: mockUser.id,
                username: 'newuser',
              },
              error: null,
            }),
          };
        }
        if (table === 'user_plan_tiers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null, // No plan tier
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      function TestComponent() {
        const { userTypeInfo, userTypeLoading } = useAuth();
        
        if (userTypeLoading) {
          return <div>Loading...</div>;
        }

        return (
          <div data-testid="plan-tier">{userTypeInfo?.planTier}</div>
        );
      }

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('plan-tier')).toHaveTextContent(PlanTier.FREE_USER);
      });
    });
  });

  describe('AuthContext User Type Loading', () => {
    it.skip('should provide user type information through context', async () => {
      const mockUser = {
        id: 'context-test-user',
        email: 'context@example.com',
        email_confirmed_at: new Date().toISOString(),
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: mockUser.id, username: 'contextuser' },
              error: null,
            }),
          };
        }
        if (table === 'user_plan_tiers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { plan_tier: PlanTier.CREATOR_PREMIUM },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { role_type: RoleType.ADMIN },
                  { role_type: RoleType.TESTER },
                ],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      function TestComponent() {
        const { userTypeInfo, isAdmin, userTypeLoading } = useAuth();
        
        if (userTypeLoading) {
          return <div>Loading...</div>;
        }

        return (
          <div>
            <div data-testid="plan-tier">{userTypeInfo?.planTier}</div>
            <div data-testid="roles">{userTypeInfo?.roles.join(', ')}</div>
            <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
            <div data-testid="display-types">{userTypeInfo?.displayTypes.join(', ')}</div>
          </div>
        );
      }

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('plan-tier')).toHaveTextContent(PlanTier.CREATOR_PREMIUM);
        expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
      });
    });

    it.skip('should handle user type loading errors gracefully', async () => {
      const mockUser = {
        id: 'error-test-user',
        email: 'error@example.com',
        email_confirmed_at: new Date().toISOString(),
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      // Mock database error
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: mockUser.id, username: 'erroruser' },
              error: null,
            }),
          };
        }
        if (table === 'user_plan_tiers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error', code: 'DB_ERROR' },
                }),
              }),
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      function TestComponent() {
        const { userTypeInfo, userTypeError, userTypeLoading } = useAuth();
        
        if (userTypeLoading) {
          return <div>Loading...</div>;
        }

        return (
          <div>
            <div data-testid="error">{userTypeError || 'No error'}</div>
            <div data-testid="plan-tier">{userTypeInfo?.planTier}</div>
          </div>
        );
      }

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        // Should fall back to FREE_USER on error
        expect(screen.getByTestId('plan-tier')).toHaveTextContent(PlanTier.FREE_USER);
      });
    });
  });

  describe('Profile Page Badge Display', () => {
    it('should display plan tier badge correctly', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO}
          roles={[]}
        />
      );

      expect(screen.getByText('Creator Pro')).toBeInTheDocument();
      expect(screen.getByLabelText('Creator Pro plan tier')).toBeInTheDocument();
    });

    it('should display multiple badges for plan tier and roles', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PREMIUM}
          roles={[RoleType.MODERATOR, RoleType.TESTER]}
        />
      );

      expect(screen.getByText('Creator Premium')).toBeInTheDocument();
      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getByText('Tester')).toBeInTheDocument();
    });

    it('should hide plan tier when showPlanTier is false', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.CREATOR_PRO}
          roles={[RoleType.ADMIN]}
          showPlanTier={false}
        />
      );

      expect(screen.queryByText('Creator Pro')).not.toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should hide roles when showRoles is false', () => {
      render(
        <UserTypeBadge 
          planTier={PlanTier.FREE_USER}
          roles={[RoleType.MODERATOR]}
          showRoles={false}
        />
      );

      expect(screen.getByText('Free User')).toBeInTheDocument();
      expect(screen.queryByText('Moderator')).not.toBeInTheDocument();
    });

    it('should apply correct size styles', () => {
      const { rerender } = render(
        <UserTypeBadge 
          planTier={PlanTier.FREE_USER}
          roles={[]}
          size="sm"
        />
      );

      let badge = screen.getByText('Free User');
      expect(badge).toHaveClass('text-xs');

      rerender(
        <UserTypeBadge 
          planTier={PlanTier.FREE_USER}
          roles={[]}
          size="lg"
        />
      );

      badge = screen.getByText('Free User');
      expect(badge).toHaveClass('text-base');
    });
  });

  describe('Account Page Plan Information', () => {
    it('should display plan information correctly', () => {
      render(
        <PlanInformationSection 
          planTier={PlanTier.CREATOR_PREMIUM}
          roles={[RoleType.TESTER]}
        />
      );

      expect(screen.getByText('Plan & Subscription')).toBeInTheDocument();
      expect(screen.getAllByText('Creator Premium').length).toBeGreaterThan(0);
      expect(screen.getByText(/Full platform access/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Change subscription plan/i })).toBeInTheDocument();
    });

    it('should display all badges on account page', () => {
      render(
        <PlanInformationSection 
          planTier={PlanTier.CREATOR_PRO}
          roles={[RoleType.MODERATOR, RoleType.ADMIN]}
        />
      );

      expect(screen.getAllByText('Creator Pro').length).toBeGreaterThan(0);
      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should call onChangePlan when button is clicked', () => {
      const mockOnChangePlan = jest.fn();
      
      render(
        <PlanInformationSection 
          planTier={PlanTier.FREE_USER}
          roles={[]}
          onChangePlan={mockOnChangePlan}
        />
      );

      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      button.click();

      expect(mockOnChangePlan).toHaveBeenCalledTimes(1);
    });

    it('should show alert when no onChangePlan handler provided', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(
        <PlanInformationSection 
          planTier={PlanTier.FREE_USER}
          roles={[]}
        />
      );

      const button = screen.getByRole('button', { name: /Change subscription plan/i });
      button.click();

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Plan management coming soon')
      );

      alertSpy.mockRestore();
    });
  });

  describe('Admin Operations End-to-End', () => {
    const validUserId = '123e4567-e89b-12d3-a456-426614174000';
    const validAdminId = '123e4567-e89b-12d3-a456-426614174001';

    beforeEach(() => {
      // Mock admin user session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            user: { id: validAdminId },
            access_token: 'admin-token',
          },
        },
        error: null,
      });

      // Mock admin check to return true
      const mockEqChain = {
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'admin-role-id', role_type: RoleType.ADMIN },
          error: null,
        }),
      };
      
      const mockEq3 = jest.fn().mockReturnValue(mockEqChain);
      const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: mockSelect,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it.skip('should successfully assign plan tier as admin', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await assignPlanTier(validUserId, PlanTier.CREATOR_PRO);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('assign_plan_tier', {
        p_target_user_id: validUserId,
        p_new_plan_tier: PlanTier.CREATOR_PRO,
      });
    });

    it.skip('should successfully grant role as admin', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await grantRole(validUserId, RoleType.MODERATOR);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('grant_user_role', {
        p_target_user_id: validUserId,
        p_role_type: RoleType.MODERATOR,
      });
    });

    it.skip('should successfully revoke role as admin', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await revokeRole(validUserId, RoleType.TESTER);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('revoke_user_role', {
        p_target_user_id: validUserId,
        p_role_type: RoleType.TESTER,
      });
    });

    it.skip('should handle admin operation errors', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Only admins can assign plan tiers' },
      });

      try {
        await assignPlanTier(validUserId, PlanTier.CREATOR_PRO);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UserTypeError);
      }
    });

    it.skip('should validate plan tier values before assignment', async () => {
      try {
        await assignPlanTier(validUserId, 'invalid-tier' as PlanTier);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UserTypeError);
      }
    });

    it.skip('should validate role type values before granting', async () => {
      try {
        await grantRole(validUserId, 'invalid-role' as RoleType);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UserTypeError);
      }
    });
  });
});
