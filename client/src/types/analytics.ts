/**
 * Analytics Types and Interfaces
 * 
 * Type definitions for the analytics metrics system that captures
 * daily snapshots of platform activity.
 */

/**
 * DailyMetric interface
 * Represents a single metric snapshot for a specific date
 */
export interface DailyMetric {
  id: string;
  metric_date: string;
  metric_type: 'count' | 'average' | 'percentage' | 'aggregate';
  metric_category: string;
  value: number;
  metadata: Record<string, unknown>;
  collection_timestamp: string;
  created_at: string;
}

/**
 * MetricDefinition interface
 * Defines metadata about a metric type for display and formatting
 */
export interface MetricDefinition {
  id: string;
  metric_type: string;
  metric_category: string;
  display_name: string;
  description: string | null;
  unit: string | null;
  format_pattern: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * MetricsQueryParams interface
 * Parameters for querying metrics data with filtering and aggregation options
 */
export interface MetricsQueryParams {
  startDate: string;
  endDate: string;
  categories?: string[];
  types?: string[];
  aggregation?: 'daily' | 'weekly' | 'monthly';
}

/**
 * ActivityDataPoint interface
 * Represents activity data for a single date (posts and comments created)
 */
export interface ActivityDataPoint {
  date: string;
  posts: number;
  comments: number;
}

/**
 * CollectionStatus interface
 * Status information about the most recent metric collection run
 */
export interface CollectionStatus {
  last_run: string;
  status: 'completed' | 'failed' | 'running';
  metrics_collected: number;
  duration_ms: number;
  error_message?: string;
}

/**
 * Metric collection result from the database function
 */
export interface MetricCollectionResult {
  metrics_collected: number;
  execution_time_ms: number;
  status: string;
}

/**
 * Backfill result from the database function
 */
export interface BackfillResult {
  dates_processed: number;
  total_metrics: number;
  execution_time_ms: number;
}

/**
 * Current metrics summary for dashboard display
 */
export interface CurrentMetrics {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
}

/**
 * Metric collection log entry
 */
export interface MetricCollectionLog {
  id: string;
  collection_date: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  metrics_collected: number;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  created_at: string;
}
