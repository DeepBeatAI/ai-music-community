import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

/**
 * Route protection configuration
 */
interface RouteProtection {
  requiresAuth: boolean;
  requiresAdmin?: boolean;
  requiresModerator?: boolean;
  requiresTester?: boolean;
}

/**
 * Define route protection rules
 */
const routeProtection: Record<string, RouteProtection> = {
  // Public routes
  '/': { requiresAuth: false },
  '/login': { requiresAuth: false },
  '/signup': { requiresAuth: false },
  '/verify-email': { requiresAuth: false },
  '/discover': { requiresAuth: false },
  
  // Protected routes (authentication required)
  '/account': { requiresAuth: true },
  '/dashboard': { requiresAuth: true },
  '/feed': { requiresAuth: true },
  '/library': { requiresAuth: true },
  '/notifications': { requiresAuth: true },
  '/playlists': { requiresAuth: true },
  
  // Admin-only routes (future)
  '/admin': { requiresAuth: true, requiresAdmin: true },
  
  // Moderator routes (future)
  '/moderation': { requiresAuth: true, requiresModerator: true },
  
  // Tester routes (future)
  '/beta': { requiresAuth: true, requiresTester: true },
};

/**
 * Check if user has required role
 */
async function checkUserRole(
  supabase: ReturnType<typeof createClient>['supabase'],
  userId: string,
  requiredRole: 'admin' | 'moderator' | 'tester'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_roles', { p_user_id: userId });

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return (data || []).includes(requiredRole);
  } catch (error) {
    console.error('Exception checking user role:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log('Middleware: Checking path:', pathname);

  try {
    const { supabase, response } = createClient(request)
    const { data: { session }, error } = await supabase.auth.getSession()

    console.log('Middleware: Session found:', !!session);

    if (error) {
      console.error('Middleware: Supabase session error:', error);
      return response;
    }

    // Get route protection rules
    const protection = routeProtection[pathname] || { requiresAuth: true };

    // Check authentication requirement
    if (protection.requiresAuth && !session) {
      console.log('Middleware: No session found, redirecting to /login');
      const url = new URL('/login', request.url);
      url.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(url);
    }

    // If user is authenticated and trying to access auth pages, redirect to home page
    if (session && ['/login', '/signup'].includes(pathname)) {
      console.log('Middleware: Authenticated user accessing auth page, redirecting to home page');
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check role-based access if authenticated
    if (session && session.user) {
      const userId = session.user.id;

      // Check admin requirement
      if (protection.requiresAdmin) {
        const isAdmin = await checkUserRole(supabase, userId, 'admin');
        if (!isAdmin) {
          console.log('Middleware: Admin access required, redirecting to home');
          const url = new URL('/', request.url);
          url.searchParams.set('error', 'admin_required');
          return NextResponse.redirect(url);
        }
      }

      // Check moderator requirement
      if (protection.requiresModerator) {
        const isModerator = await checkUserRole(supabase, userId, 'moderator');
        const isAdmin = await checkUserRole(supabase, userId, 'admin');
        if (!isModerator && !isAdmin) {
          console.log('Middleware: Moderator access required, redirecting to home');
          const url = new URL('/', request.url);
          url.searchParams.set('error', 'moderator_required');
          return NextResponse.redirect(url);
        }
      }

      // Check tester requirement
      if (protection.requiresTester) {
        const isTester = await checkUserRole(supabase, userId, 'tester');
        const isAdmin = await checkUserRole(supabase, userId, 'admin');
        if (!isTester && !isAdmin) {
          console.log('Middleware: Tester access required, redirecting to home');
          const url = new URL('/', request.url);
          url.searchParams.set('error', 'tester_required');
          return NextResponse.redirect(url);
        }
      }
    }

    console.log('Middleware: Access granted to:', pathname);
    return response
  } catch (e) {
    console.error('Middleware: General error:', e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (if any)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}