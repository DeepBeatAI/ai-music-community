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

    // Unban the user using Auth Admin API
    // Set ban_duration to 'none' or '0h' to remove the ban
    const { data: unbanData, error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: 'none' } // Remove ban
    );

    if (unbanError) {
      console.error('Unban error:', unbanError);
      return NextResponse.json(
        { error: 'Failed to unban user', details: unbanError.message },
        { status: 500 }
      );
    }

    console.log('User unbanned successfully:', { userId, unbanData });

    // Log the action
    await supabaseAdmin.rpc('log_admin_action', {
      p_action_type: 'user_unbanned',
      p_target_resource_type: 'user',
      p_target_resource_id: userId,
      p_old_value: null,
      p_new_value: { unbanned_at: new Date().toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in unban-user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
