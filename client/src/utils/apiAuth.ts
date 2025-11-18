/**
 * API route authorization helpers
 * Provides utilities for protecting API endpoints with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorizeUser, requireAdmin, requireModerator, requireTester } from './authorization';
import type { Database } from '@/types/database';

/**
 * Extract user ID from request
 * @param request - Next.js request object
 * @returns Promise<string | null> - User ID or null if not authenticated
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return null;
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Error verifying token:', error);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Exception extracting user ID:', error);
    return null;
  }
}

/**
 * Create unauthorized response
 * @param message - Error message
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 * @param message - Error message
 * @returns NextResponse with 403 status
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Protect API route - require authentication
 * @param request - Next.js request object
 * @param handler - Handler function to execute if authorized
 * @returns Promise<NextResponse> - Response from handler or error response
 */
export async function withAuth(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse('Authentication required');
  }

  try {
    return await handler(userId, request);
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Protect API route - require admin role
 * @param request - Next.js request object
 * @param handler - Handler function to execute if authorized
 * @returns Promise<NextResponse> - Response from handler or error response
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse('Authentication required');
  }

  const authResult = await requireAdmin(userId);

  if (!authResult.authorized) {
    return forbiddenResponse(authResult.error || 'Admin access required');
  }

  try {
    return await handler(userId, request);
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Protect API route - require moderator role
 * @param request - Next.js request object
 * @param handler - Handler function to execute if authorized
 * @returns Promise<NextResponse> - Response from handler or error response
 */
export async function withModeratorAuth(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse('Authentication required');
  }

  const authResult = await requireModerator(userId);

  if (!authResult.authorized) {
    return forbiddenResponse(authResult.error || 'Moderator access required');
  }

  try {
    return await handler(userId, request);
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Protect API route - require tester role
 * @param request - Next.js request object
 * @param handler - Handler function to execute if authorized
 * @returns Promise<NextResponse> - Response from handler or error response
 */
export async function withTesterAuth(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse('Authentication required');
  }

  const authResult = await requireTester(userId);

  if (!authResult.authorized) {
    return forbiddenResponse(authResult.error || 'Tester access required');
  }

  try {
    return await handler(userId, request);
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get authorization info for current user
 * @param request - Next.js request object
 * @returns Promise<NextResponse> - Authorization info or error response
 */
export async function getAuthInfo(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse('Authentication required');
  }

  const authResult = await authorizeUser(userId);

  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error || 'Authorization failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    userId: authResult.userId,
    planTier: authResult.planTier,
    roles: authResult.roles,
    isAdmin: authResult.isAdmin,
  });
}
