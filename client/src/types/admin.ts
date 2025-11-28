/**
 * Admin Dashboard Type Definitions
 * 
 * This file contains all TypeScript type definitions for the Admin Dashboard feature.
 * These types ensure type safety across admin operations, data structures, and error handling.
 */

/**
 * Admin audit log entry
 * Records all administrative actions for compliance and accountability
 */
export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  action_type: 'user_role_changed' | 'user_plan_changed' | 'user_suspended' | 'user_password_reset' | 'config_updated' | 'cache_cleared' | 'security_policy_changed';
  target_resource_type: 'user' | 'config' | 'system' | 'security';
  target_resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Security event entry
 * Tracks security-related events for monitoring and alerting
 */
export interface SecurityEvent {
  id: string;
  event_type: 'failed_login' | 'unauthorized_access' | 'rate_limit_exceeded' | 'suspicious_activity' | 'privilege_escalation_attempt' | 'session_hijack_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

/**
 * Platform configuration entry
 * Stores platform-wide configuration settings
 */
export interface PlatformConfig {
  id: string;
  config_key: string;
  config_value: Record<string, unknown>;
  config_type: 'feature_flag' | 'upload_limit' | 'rate_limit' | 'email_template' | 'system_setting';
  description: string | null;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * System metric entry
 * Stores historical system performance and health metrics
 */
export interface SystemMetric {
  id: string;
  metric_type: 'page_load_time' | 'api_response_time' | 'database_query_time' | 'error_rate' | 'cache_hit_rate' | 'storage_usage' | 'active_users';
  metric_value: number;
  metric_unit: string;
  metadata: Record<string, unknown> | null;
  recorded_at: string;
}

/**
 * User session entry
 * Tracks active user sessions for security monitoring
 */
export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  username?: string; // Added by get_active_sessions_with_usernames function
}

/**
 * User activity summary
 * Aggregated user activity metrics for admin dashboard
 */
export interface UserActivitySummary {
  posts_count: number;
  tracks_count: number;
  albums_count: number;
  playlists_count: number;
  comments_count: number;
  likes_given: number;
  likes_received: number;
  last_active: string;
}

/**
 * User management data for admin dashboard
 * Complete user information including profile, plan, roles, and activity
 */
export interface AdminUserData {
  id: string;
  user_id: string;
  username: string;
  email: string;
  plan_tier: string;
  roles: string[];
  created_at: string;
  last_active: string;
  is_suspended: boolean;
  activity_summary: UserActivitySummary;
}

/**
 * Platform analytics data
 * Comprehensive platform metrics for business intelligence
 */
export interface PlatformAnalytics {
  user_growth: {
    total_users: number;
    new_users_today: number;
    new_users_this_week: number;
    new_users_this_month: number;
    growth_rate: number;
  };
  content_metrics: {
    total_tracks: number;
    total_albums: number;
    total_playlists: number;
    total_posts: number;
    uploads_today: number;
    uploads_this_week: number;
    uploads_this_month: number;
  };
  engagement_metrics: {
    total_plays: number;
    total_likes: number;
    total_comments: number;
    total_follows: number;
    avg_plays_per_track: number;
    avg_engagement_rate: number;
  };
  plan_distribution: {
    free_users: number;
    creator_pro: number;
    creator_premium: number;
  };
  revenue_metrics: {
    mrr: number;
    arr: number;
    churn_rate: number;
  };
}

/**
 * System health status
 * Real-time system health and performance indicators
 */
export interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connection_count: number;
    avg_query_time: number;
    slow_queries: number;
  };
  storage: {
    total_capacity_gb: number;
    used_capacity_gb: number;
    available_capacity_gb: number;
    usage_percentage: number;
  };
  api_health: {
    supabase: 'healthy' | 'degraded' | 'down';
    vercel: 'healthy' | 'degraded' | 'down';
  };
  error_rate: {
    current_rate: number;
    threshold: number;
    status: 'normal' | 'elevated' | 'critical';
  };
  uptime: {
    percentage: number;
    last_downtime: string | null;
  };
}

/**
 * Admin error class
 * Custom error class for admin-specific errors with error codes
 */
export class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AdminError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdminError);
    }
  }
}

/**
 * Admin error codes
 * Standardized error codes for admin operations
 */
export const ADMIN_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * Type guard to check if an error is an AdminError
 */
export function isAdminError(error: unknown): error is AdminError {
  return error instanceof AdminError;
}

/**
 * Helper type for admin error codes
 */
export type AdminErrorCode = typeof ADMIN_ERROR_CODES[keyof typeof ADMIN_ERROR_CODES];
