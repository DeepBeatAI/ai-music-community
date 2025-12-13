import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user with the regular Supabase client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the user is an admin
    const { data: isAdminData, error: adminCheckError } = await supabaseAdmin.rpc(
      'is_user_admin',
      { p_user_id: user.id }
    );

    if (adminCheckError || !isAdminData) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get the request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Get the user's auth data to check ban status
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError) {
      console.error('Get user error:', getUserError);
      return NextResponse.json(
        { error: 'Failed to get user', details: getUserError.message },
        { status: 500 }
      );
    }

    // Check if user has banned_until field set
    const user_data = authUser.user as any;
    const isBanned = user_data.banned_until !== undefined && user_data.banned_until !== null;
    const bannedUntil = user_data.banned_until || null;

    return NextResponse.json({ 
      isBanned,
      bannedUntil
    });
  } catch (error) {
    console.error('Unexpected error in check-ban-status API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
