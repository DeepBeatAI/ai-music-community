-- =====================================================
-- Create Reversal Metrics Function
-- =====================================================
-- This migration creates a database function to efficiently
-- calculate reversal statistics for a given time period.
--
-- Requirements: 14.3, 14.7
-- Task: 21.3 Database Updates - Create database function get_reversal_metrics(start_date, end_date)
-- =====================================================

-- Drop function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.get_reversal_metrics(timestamptz, timestamptz);

-- Create the reversal metrics function
CREATE OR REPLACE FUNCTION public.get_reversal_metrics(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total_actions integer;
  v_total_reversals integer;
  v_overall_reversal_rate numeric;
  v_per_moderator_stats jsonb;
  v_time_to_reversal_stats jsonb;
  v_reversal_by_action_type jsonb;
BEGIN
  -- Calculate total actions in the time period
  SELECT COUNT(*)
  INTO v_total_actions
  FROM moderation_actions
  WHERE created_at >= p_start_date
    AND created_at <= p_end_date;

  -- Calculate total reversals in the time period
  SELECT COUNT(*)
  INTO v_total_reversals
  FROM moderation_actions
  WHERE created_at >= p_start_date
    AND created_at <= p_end_date
    AND revoked_at IS NOT NULL;

  -- Calculate overall reversal rate
  IF v_total_actions > 0 THEN
    v_overall_reversal_rate := ROUND((v_total_reversals::numeric / v_total_actions::numeric) * 100, 2);
  ELSE
    v_overall_reversal_rate := 0;
  END IF;

  -- Calculate per-moderator statistics
  SELECT jsonb_agg(
    jsonb_build_object(
      'moderatorId', moderator_id,
      'totalActions', total_actions,
      'reversedActions', reversed_actions,
      'reversalRate', reversal_rate,
      'averageTimeToReversalHours', avg_time_to_reversal_hours
    ) ORDER BY reversal_rate DESC
  )
  INTO v_per_moderator_stats
  FROM (
    SELECT
      moderator_id,
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as reversed_actions,
      CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END as reversal_rate,
      ROUND(
        AVG(
          EXTRACT(EPOCH FROM (revoked_at - created_at)) / 3600
        ) FILTER (WHERE revoked_at IS NOT NULL),
        2
      ) as avg_time_to_reversal_hours
    FROM moderation_actions
    WHERE created_at >= p_start_date
      AND created_at <= p_end_date
    GROUP BY moderator_id
    HAVING COUNT(*) > 0
  ) moderator_stats;

  -- Calculate time-to-reversal statistics
  SELECT jsonb_build_object(
    'averageHours', COALESCE(ROUND(AVG(time_diff_hours), 2), 0),
    'medianHours', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_diff_hours), 2), 0),
    'minHours', COALESCE(ROUND(MIN(time_diff_hours), 2), 0),
    'maxHours', COALESCE(ROUND(MAX(time_diff_hours), 2), 0),
    'totalReversals', COUNT(*)
  )
  INTO v_time_to_reversal_stats
  FROM (
    SELECT EXTRACT(EPOCH FROM (revoked_at - created_at)) / 3600 as time_diff_hours
    FROM moderation_actions
    WHERE created_at >= p_start_date
      AND created_at <= p_end_date
      AND revoked_at IS NOT NULL
  ) time_diffs;

  -- Calculate reversal rate by action type
  SELECT jsonb_agg(
    jsonb_build_object(
      'actionType', action_type,
      'totalActions', total_actions,
      'reversedActions', reversed_actions,
      'reversalRate', reversal_rate
    ) ORDER BY reversal_rate DESC
  )
  INTO v_reversal_by_action_type
  FROM (
    SELECT
      action_type,
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as reversed_actions,
      CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END as reversal_rate
    FROM moderation_actions
    WHERE created_at >= p_start_date
      AND created_at <= p_end_date
    GROUP BY action_type
    HAVING COUNT(*) > 0
  ) action_type_stats;

  -- Build the final result
  v_result := jsonb_build_object(
    'startDate', p_start_date,
    'endDate', p_end_date,
    'totalActions', v_total_actions,
    'totalReversals', v_total_reversals,
    'overallReversalRate', v_overall_reversal_rate,
    'perModeratorStats', COALESCE(v_per_moderator_stats, '[]'::jsonb),
    'timeToReversalStats', v_time_to_reversal_stats,
    'reversalByActionType', COALESCE(v_reversal_by_action_type, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION public.get_reversal_metrics(timestamptz, timestamptz) IS
  'Calculates comprehensive reversal metrics for a given time period.
   
   Parameters:
   - p_start_date: Start of the time period (inclusive)
   - p_end_date: End of the time period (inclusive)
   
   Returns a JSONB object containing:
   - startDate: The start date of the period
   - endDate: The end date of the period
   - totalActions: Total number of moderation actions in the period
   - totalReversals: Total number of reversed actions in the period
   - overallReversalRate: Percentage of actions that were reversed (0-100)
   - perModeratorStats: Array of per-moderator statistics including:
     * moderatorId: UUID of the moderator
     * totalActions: Total actions by this moderator
     * reversedActions: Number of reversed actions
     * reversalRate: Percentage of their actions that were reversed
     * averageTimeToReversalHours: Average time from action to reversal in hours
   - timeToReversalStats: Overall time-to-reversal statistics including:
     * averageHours: Average time from action to reversal
     * medianHours: Median time from action to reversal
     * minHours: Fastest reversal time
     * maxHours: Slowest reversal time
     * totalReversals: Number of reversals used in calculation
   - reversalByActionType: Array of reversal rates by action type including:
     * actionType: The type of action
     * totalActions: Total actions of this type
     * reversedActions: Number of reversed actions of this type
     * reversalRate: Percentage of this action type that were reversed
   
   Requirements: 14.3, 14.7
   
   Example usage:
   SELECT get_reversal_metrics(
     ''2024-01-01T00:00:00Z''::timestamptz,
     ''2024-01-31T23:59:59Z''::timestamptz
   );';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_reversal_metrics(timestamptz, timestamptz) TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Created get_reversal_metrics function
-- ✓ Calculates overall reversal rate
-- ✓ Calculates per-moderator reversal statistics
-- ✓ Calculates time-to-reversal statistics (avg, median, min, max)
-- ✓ Calculates reversal rate by action type
-- ✓ Returns comprehensive JSONB result
-- ✓ Granted execute permission to authenticated users
-- ✓ Added comprehensive documentation
--
-- The function efficiently calculates all reversal metrics
-- in a single database query, minimizing round trips and
-- ensuring consistent results.
-- =====================================================
