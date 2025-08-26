import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

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

    // Define public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/login', 
      '/signup', 
      '/verify-email',
      '/discover' // Make discover public for marketing
    ];

    // Check if current path is public
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!session && !isPublicRoute) {
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