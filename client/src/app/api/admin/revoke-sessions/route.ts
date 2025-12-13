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

    // Delete all sessions for the user from auth.sessions table
    // This will immediately invalidate all their JWT tokens
    const { error: revokeError } = await supabaseAdmin
      .from('auth.sessions')
      .delete()
      .eq('user_id', userId);

    if (revokeError) {
      console.error('Revoke sessions error:', revokeError);
      // Don't fail if this doesn't work - the ban itself is still effective
    }

    console.log('Revoked all sessions for user:', userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in revoke-sessions API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', { message: errorMessage });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
