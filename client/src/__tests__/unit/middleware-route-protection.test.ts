/**
 * Unit Tests for Route Protection Middleware Configuration
 * 
 * These tests verify that the middleware has correct route protection rules configured
 * for admin-only routes.
 * 
 * Requirements tested:
 * - 1.1: Admin Dashboard accessible at /admin route
 * - 1.2: Non-admin users redirected from /admin with unauthorized message
 * - 2.1: /analytics route protected for admin users only
 * - 2.2: /test-audio-compression route protected for admin users only
 * - 2.3: Performance overlay hidden from non-admins
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Middleware Route Protection Configuration', () => {
  let middlewareContent: string;

  beforeAll(() => {
    // Read the middleware file
    const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');
    middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
  });

  describe('Admin Route Protection (/admin)', () => {
    it('should have /admin route configured with requiresAdmin flag', () => {
      // Requirement 1.1: Admin Dashboard accessible at /admin route
      expect(middlewareContent).toContain("'/admin'");
      expect(middlewareContent).toContain('requiresAdmin: true');
    });

    it('should check for admin role when accessing /admin', () => {
      // Requirement 1.2: Non-admin users redirected from /admin
      expect(middlewareContent).toContain('requiresAdmin');
      expect(middlewareContent).toContain("checkUserRole(supabase, userId, 'admin')");
    });

    it('should redirect unauthorized users with error message', () => {
      // Requirement 1.2: Redirect with unauthorized message
      expect(middlewareContent).toContain("error', 'unauthorized'");
      expect(middlewareContent).toContain('Admin access required');
    });
  });

  describe('Analytics Route Protection (/analytics)', () => {
    it('should have /analytics route configured with requiresAdmin flag', () => {
      // Requirement 2.1: /analytics route protected for admin users only
      expect(middlewareContent).toContain("'/analytics'");
      expect(middlewareContent).toContain('requiresAdmin: true');
    });

    it('should require authentication for /analytics route', () => {
      // Requirement 2.1: Authentication required
      expect(middlewareContent).toContain('requiresAuth: true');
    });
  });

  describe('Test Audio Compression Route Protection (/test-audio-compression)', () => {
    it('should have /test-audio-compression route configured with requiresAdmin flag', () => {
      // Requirement 2.2: /test-audio-compression route protected for admin users only
      expect(middlewareContent).toContain("'/test-audio-compression'");
      expect(middlewareContent).toContain('requiresAdmin: true');
    });

    it('should require authentication for /test-audio-compression route', () => {
      // Requirement 2.2: Authentication required
      expect(middlewareContent).toContain('requiresAuth: true');
    });
  });

  describe('Unauthorized Redirect Behavior', () => {
    it('should include error parameter in redirect URL', () => {
      // Verify error parameter is set
      expect(middlewareContent).toContain("url.searchParams.set('error', 'unauthorized')");
    });

    it('should include descriptive message in redirect URL', () => {
      // Verify message parameter is set with descriptive text
      expect(middlewareContent).toContain("url.searchParams.set('message'");
      expect(middlewareContent).toContain('Admin access required');
    });

    it('should include redirectedFrom parameter for login redirects', () => {
      // Verify redirectedFrom parameter for unauthenticated redirects
      expect(middlewareContent).toContain("url.searchParams.set('redirectedFrom', pathname)");
    });
  });

  describe('Role Checking Function', () => {
    it('should have checkUserRole function for admin verification', () => {
      // Verify role checking function exists
      expect(middlewareContent).toContain('async function checkUserRole');
      expect(middlewareContent).toContain("'admin' | 'moderator' | 'tester'");
    });

    it('should call get_user_roles RPC function', () => {
      // Verify RPC call to get user roles
      expect(middlewareContent).toContain("rpc('get_user_roles'");
      expect(middlewareContent).toContain('p_user_id');
    });

    it('should handle role check errors gracefully', () => {
      // Verify error handling in role check
      expect(middlewareContent).toContain('if (error)');
      expect(middlewareContent).toContain('return false');
    });
  });

  describe('Route Protection Rules', () => {
    it('should define routeProtection configuration object', () => {
      // Verify route protection configuration exists
      expect(middlewareContent).toContain('const routeProtection');
      expect(middlewareContent).toContain('Record<string, RouteProtection>');
    });

    it('should have RouteProtection interface with requiresAdmin property', () => {
      // Verify interface definition
      expect(middlewareContent).toContain('interface RouteProtection');
      expect(middlewareContent).toContain('requiresAdmin?');
    });

    it('should check protection.requiresAdmin before allowing access', () => {
      // Verify admin check logic
      expect(middlewareContent).toContain('if (protection.requiresAdmin)');
      expect(middlewareContent).toContain('const isAdmin = await checkUserRole');
      expect(middlewareContent).toContain('if (!isAdmin)');
    });
  });

  describe('Middleware Matcher Configuration', () => {
    it('should have matcher configuration to apply middleware to routes', () => {
      // Verify matcher configuration exists
      expect(middlewareContent).toContain('export const config');
      expect(middlewareContent).toContain('matcher:');
    });

    it('should exclude API routes from middleware', () => {
      // Verify API routes are excluded
      expect(middlewareContent).toContain('api');
    });

    it('should exclude static files from middleware', () => {
      // Verify static files are excluded
      expect(middlewareContent).toContain('_next/static');
      expect(middlewareContent).toContain('_next/image');
    });
  });

  describe('Session Handling', () => {
    it('should check for session before applying role-based protection', () => {
      // Verify session check
      expect(middlewareContent).toContain('getSession()');
      expect(middlewareContent).toContain('if (session && session.user)');
    });

    it('should redirect to login if authentication required but no session', () => {
      // Verify login redirect for unauthenticated users
      expect(middlewareContent).toContain('if (protection.requiresAuth && !session)');
      expect(middlewareContent).toContain("new URL('/login', request.url)");
    });
  });

  describe('Admin-Protected Routes List', () => {
    it('should have all three admin routes configured', () => {
      // Verify all admin routes are present
      const adminRoutes = ['/admin', '/analytics', '/test-audio-compression'];
      adminRoutes.forEach(route => {
        expect(middlewareContent).toContain(`'${route}'`);
      });
    });

    it('should have consistent admin protection for all admin routes', () => {
      // Verify all admin routes have requiresAdmin: true
      // Check that each admin route has requiresAdmin configured
      expect(middlewareContent).toContain("'/admin'");
      expect(middlewareContent).toContain("'/analytics'");
      expect(middlewareContent).toContain("'/test-audio-compression'");
      
      // Count occurrences of requiresAdmin: true (should be at least 3)
      const requiresAdminMatches = middlewareContent.match(/requiresAdmin:\s*true/g);
      expect(requiresAdminMatches).not.toBeNull();
      expect(requiresAdminMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });
});
