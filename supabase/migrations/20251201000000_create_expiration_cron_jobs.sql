-- =====================================================
-- Migration: Create Auto-Expiration Cron Jobs
-- Description: Set up scheduled jobs to automatically expire restrictions and suspensions
-- Requirements: 6.7, 12.3
-- =====================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 1. Create Cron Job for Restriction Expiration
-- =====================================================
-- Schedule expire_restrictions() to run every hour
-- This will automatically mark expired restrictions as inactive

SELECT cron.schedule(
  'expire-restrictions-hourly',           -- Job name
  '0 * * * *',                            -- Cron expression: Every hour at minute 0
  $$SELECT public.expire_restrictions();$$ -- SQL command to execute
);

COMMENT ON EXTENSION pg_cron IS 
  'Scheduled job for expiring restrictions runs hourly at minute 0';

-- =====================================================
-- 2. Create Cron Job for Suspension Expiration
-- =====================================================
-- Schedule expire_suspensions() to run every hour
-- This will automatically clear expired suspensions from user_profiles

SELECT cron.schedule(
  'expire-suspensions-hourly',            -- Job name
  '0 * * * *',                            -- Cron expression: Every hour at minute 0
  $$SELECT public.expire_suspensions();$$ -- SQL command to execute
);

-- =====================================================
-- 3. Create Logging Table for Expiration Activities
-- =====================================================
-- Create a table to log expiration activities for monitoring

CREATE TABLE IF NOT EXISTS public.expiration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('restriction', 'suspension')),
  expired_count INTEGER NOT NULL DEFAULT 0,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_expiration_logs_execution_time 
  ON public.expiration_logs(execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_expiration_logs_job_type 
  ON public.expiration_logs(job_type);

-- Enable RLS on expiration_logs
ALTER TABLE public.expiration_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view expiration logs
CREATE POLICY "Admins can view expiration logs"
  ON public.expiration_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- =====================================================
-- 4. Enhanced Expiration Functions with Logging
-- =====================================================
-- Update expire_restrictions to log its activity

CREATE OR REPLACE FUNCTION public.expire_restrictions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
  v_start_time TIMESTAMP;
  v_duration_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Update expired restrictions
  UPDATE public.user_restrictions
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE 
    is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
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

-- Update expire_suspensions to log its activity

CREATE OR REPLACE FUNCTION public.expire_suspensions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
  v_start_time TIMESTAMP;
  v_duration_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Clear expired suspensions from user_profiles
  UPDATE public.user_profiles
  SET 
    suspended_until = NULL,
    suspension_reason = NULL,
    updated_at = NOW()
  WHERE 
    suspended_until IS NOT NULL
    AND suspended_until <= NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Mark corresponding user_restrictions as inactive
  UPDATE public.user_restrictions
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE 
    restriction_type = 'suspended'
    AND is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();
  
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
-- 5. Grant Permissions
-- =====================================================

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION public.expire_restrictions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_suspensions() TO authenticated;

-- =====================================================
-- 6. Verification Query
-- =====================================================

-- Query to verify cron jobs are scheduled
-- Run this to check: SELECT * FROM cron.job;

-- =====================================================
-- Migration Summary
-- =====================================================
-- ✓ Enabled pg_cron extension
-- ✓ Created hourly cron job for expire_restrictions()
-- ✓ Created hourly cron job for expire_suspensions()
-- ✓ Created expiration_logs table for monitoring
-- ✓ Enhanced expiration functions with logging
-- ✓ Added RLS policies for expiration_logs
-- ✓ Granted appropriate permissions
--
-- Next Steps:
-- - Implement expiration notifications (task 16.2)
-- - Write integration tests for auto-expiration (task 16.3)
-- - Monitor expiration_logs table for activity
