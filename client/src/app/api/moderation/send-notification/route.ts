/**
 * API Route: Send Moderation Notification
 * 
 * This server-side route sends moderation notifications using the service role key,
 * which bypasses RLS policies. This is necessary because moderators need to send
 * notifications to other users, which would be blocked by client-side RLS.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role key (bypasses RLS)
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

// Create regular Supabase client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has moderator or admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (roleError || !roles || roles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to verify user roles' },
        { status: 500 }
      );
    }

    const isModerator = roles.some((r) => ['moderator', 'admin'].includes(r.role_type));
    if (!isModerator) {
      return NextResponse.json(
        { error: 'Only moderators and admins can send moderation notifications' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, title, message, data: notificationData } = body;

    // Validate required fields
    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message' },
        { status: 400 }
      );
    }

    // Insert notification using service role (bypasses RLS)
    const { data: notification, error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'moderation',
        title,
        message,
        read: false,
        data: notificationData || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert notification:', insertError);
      return NextResponse.json(
        { error: 'Failed to send notification', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
    });
  } catch (error) {
    console.error('Unexpected error in send-notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
