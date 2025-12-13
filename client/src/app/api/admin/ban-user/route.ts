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
    const { userId, reason } = body;

    if (!userId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and reason' },
        { status: 400 }
      );
    }

    // Ban the user using Auth Admin API
    // Use '876000h' (100 years in hours) for permanent ban
    // Valid duration units: ns, us, ms, s, m, h
    const { data: banData, error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: '876000h' } // Permanent ban (100 years = 876000 hours)
    );

    if (banError) {
      console.error('Ban error:', banError);
      return NextResponse.json(
        { error: 'Failed to ban user', details: banError.message },
        { status: 500 }
      );
    }

    console.log('User banned successfully:', { userId, banData });

    // Revoke all active sessions for the banned user
    // This will immediately log them out from all devices
    try {
      console.log('Attempting to revoke sessions for user:', userId);
      const { data: revokeData, error: revokeError } = await supabaseAdmin.rpc('revoke_user_sessions', {
        p_user_id: userId,
      });
      
      if (revokeError) {
        console.error('Failed to revoke sessions via RPC:', revokeError);
        console.error('Revoke error details:', JSON.stringify(revokeError, null, 2));
        
        // Fallback: Try to directly update user_sessions table
        console.log('Attempting direct session revocation...');
        const { error: directError } = await supabaseAdmin
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', userId);
        
        if (directError) {
          console.error('Direct session revocation also failed:', directError);
        } else {
          console.log('Successfully revoked sessions via direct update');
        }
      } else {
        console.log('Successfully revoked sessions via RPC. Result:', revokeData);
        console.log('Revoked all sessions for banned user:', userId);
      }
    } catch (revokeError) {
      console.error('Exception while revoking sessions:', revokeError);
      // Don't fail the ban if session revocation fails
    }

    // Log the action
    try {
      const { error: logError } = await supabaseAdmin.rpc('log_admin_action', {
        p_action_type: 'user_banned',
        p_target_resource_type: 'user',
        p_target_resource_id: userId,
        p_old_value: null,
        p_new_value: { reason, banned_at: new Date().toISOString() },
      });
      
      if (logError) {
        console.error('Failed to log admin action:', logError);
        // Don't fail the ban if logging fails
      }
    } catch (logError) {
      console.error('Exception while logging admin action:', logError);
      // Don't fail the ban if logging fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in ban-user API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
