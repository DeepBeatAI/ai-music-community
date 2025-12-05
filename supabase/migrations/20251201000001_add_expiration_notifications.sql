-- =====================================================
-- Migration: Add Expiration Notifications
-- Description: Integrate notification sending with expiration functions
-- Requirements: 7.7
-- =====================================================

-- =====================================================
-- 1. Create Function to Send Expiration Notifications
-- =====================================================
-- This function will be called by the expiration functions to send notifications

CREATE OR REPLACE FUNCTION public.send_expiration_notification(
  p_user_id UUID,
  p_restriction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Generate notification title and message based on restriction type
  IF p_restriction_type = 'suspended' THEN
    v_title := 'Account Suspension Expired';
    v_message := 'Your account suspension has expired. Your account has been restored.' || E'\n\n' ||
                 'You can now:' || E'\n' ||
                 '• Create posts and comments' || E'\n' ||
                 '• Upload tracks' || E'\n' ||
                 '• Interact with other users' || E'\n\n' ||
                 'Please continue to follow our community guidelines to maintain your account in good standing. ' ||
                 'Thank you for your cooperation.';
  ELSIF p_restriction_type = 'posting_disabled' THEN
    v_title := 'Account Restriction Lifted';
    v_message := 'Your posting restriction has expired and has been lifted.' || E'\n\n' ||
                 'You can now use all platform features normally.' || E'\n\n' ||
                 'Please continue to follow our community guidelines to maintain your account in good standing. ' ||
                 'Thank you for your cooperation.';
  ELSIF p_restriction_type = 'commenting_disabled' THEN
    v_title := 'Account Restriction Lifted';
    v_message := 'Your commenting restriction has expired and has been lifted.' || E'\n\n' ||
                 'You can now use all platform features normally.' || E'\n\n' ||
                 'Please continue to follow our community guidelines to maintain your account in good standing. ' ||
                 'Thank you for your cooperation.';
  ELSIF p_restriction_type = 'upload_disabled' THEN
    v_title := 'Account Restriction Lifted';
    v_message := 'Your upload restriction has expired and has been lifted.' || E'\n\n' ||
                 'You can now use all platform features normally.' || E'\n\n' ||
                 'Please continue to follow our community guidelines to maintain your account in good standing. ' ||
                 'Thank you for your cooperation.';
  ELSE
    v_title := 'Account Restriction Lifted';
    v_message := 'A restriction on your account has expired and has been lifted.' || E'\n\n' ||
                 'You can now use all platform features normally.' || E'\n\n' ||
                 'Please continue to follow our community guidelines to maintain your account in good standing. ' ||
                 'Thank you for your cooperation.';
  END IF;
  
  -- Insert notification into notifications table
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    read,
    data,
    created_at
  )
  VALUES (
    p_user_id,
    'system',
    v_title,
    v_message,
    false,
    jsonb_build_object(
      'moderation_action', 'restriction_expired',
      'restriction_type', p_restriction_type
    ),
    NOW()
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the expiration process
    RAISE NOTICE 'Failed to send expiration notification for user %: %', p_user_id, SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.send_expiration_notification(UUID, TEXT) IS 
  'Sends a notification to a user when their restriction or suspension expires. ' ||
  'Called automatically by expire_restrictions() and expire_suspensions() functions.';

-- =====================================================
-- 2. Update expire_restrictions to Send Notifications
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_restrictions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_start_time TIMESTAMP;
  v_duration_ms INTEGER;
  v_expired_restriction RECORD;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Get all restrictions that need to be expired
  FOR v_expired_restriction IN
    SELECT user_id, restriction_type
    FROM public.user_restrictions
    WHERE 
      is_active = true
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
  LOOP
    -- Update the restriction
    UPDATE public.user_restrictions
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE 
      user_id = v_expired_restriction.user_id
      AND restriction_type = v_expired_restriction.restriction_type
      AND is_active = true;
    
    -- Send expiration notification
    PERFORM public.send_expiration_notification(
      v_expired_restriction.user_id,
      v_expired_restriction.restriction_type
    );
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  -- Calculate execution duration
  v_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
  
  -- Log the expiration activity
  INSERT INTO public.expiration_logs (job_type, expired_count, execution_duration_ms)
  VALUES ('restriction', v_expired_count, v_duration_ms);
  
  RETURN v_expired_count;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO public.expiration_logs (job_type, expired_count, error_message)
    VALUES ('restriction', 0, SQLERRM);
    
    RAISE NOTICE 'Error expiring restrictions: %', SQLERRM;
    RETURN -1;
END;
$$;

-- =====================================================
-- 3. Update expire_suspensions to Send Notifications
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_suspensions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_start_time TIMESTAMP;
  v_duration_ms INTEGER;
  v_expired_user RECORD;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Get all users with expired suspensions
  FOR v_expired_user IN
    SELECT id as user_id
    FROM public.user_profiles
    WHERE 
      suspended_until IS NOT NULL
      AND suspended_until <= NOW()
  LOOP
    -- Clear suspension from user_profiles
    UPDATE public.user_profiles
    SET 
      suspended_until = NULL,
      suspension_reason = NULL,
      updated_at = NOW()
    WHERE id = v_expired_user.user_id;
    
    -- Mark corresponding user_restrictions as inactive
    UPDATE public.user_restrictions
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE 
      user_id = v_expired_user.user_id
      AND restriction_type = 'suspended'
      AND is_active = true;
    
    -- Send expiration notification
    PERFORM public.send_expiration_notification(
      v_expired_user.user_id,
      'suspended'
    );
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  -- Calculate execution duration
  v_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
  
  -- Log the expiration activity
  INSERT INTO public.expiration_logs (job_type, expired_count, execution_duration_ms)
  VALUES ('suspension', v_expired_count, v_duration_ms);
  
  RETURN v_expired_count;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO public.expiration_logs (job_type, expired_count, error_message)
    VALUES ('suspension', 0, SQLERRM);
    
    RAISE NOTICE 'Error expiring suspensions: %', SQLERRM;
    RETURN -1;
END;
$$;

-- =====================================================
-- 4. Grant Permissions
-- =====================================================

-- Grant execute permissions on notification function
GRANT EXECUTE ON FUNCTION public.send_expiration_notification(UUID, TEXT) TO authenticated;

-- Grant execute permissions on updated expiration functions
GRANT EXECUTE ON FUNCTION public.expire_restrictions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_suspensions() TO authenticated;

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Created send_expiration_notification() function
-- ✓ Updated expire_restrictions() to send notifications
-- ✓ Updated expire_suspensions() to send notifications
-- ✓ Granted appropriate permissions
--
-- Next Steps:
-- - Write integration tests for auto-expiration (task 16.3)
-- - Test notification delivery when restrictions expire
-- - Monitor expiration_logs table for notification failures
