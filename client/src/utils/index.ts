/**
 * Utility Functions Index
 * 
 * This file exports all utility functions for easy importing throughout the application.
 * Updated to include the new compact reporting system.
 */

// Existing utilities (keeping existing exports)
export * from './audio';
export * from './audioCache';
export * from './audioCompression';
export * from './validation';
export * from './posts';
export * from './community';
export * from './notifications';
export * from './userStats';
export * from './wavesurfer';

// Export format utilities with specific names to avoid conflicts
export { formatTimeAgo } from './format';
export { formatDuration as formatDurationFromFormat, formatFileSize as formatFileSizeFromFormat } from './format';

// Export search utilities with specific names to avoid conflicts
export * from './search';
export { getFeaturedCreators as getFeaturedCreatorsFromRecommendations, getTrendingContent as getTrendingContentFromRecommendations } from './recommendations';

// New compact reporting system utilities
export * from './reportTemplates';
export * from './hookDataExtraction';
export * from './compactReporting';

// Re-export commonly used types and functions with clear names
export {
  generateHookReport as generateCompactHookReport,
  generateSuccessReport as generateQuickSuccessReport,
  generatePartialSuccessReport as generateQuickPartialReport,
  formatReportForConsole as formatCompactReportForConsole,
  createReportSummary as createCompactReportSummary,
  type CompactReportingResult,
  type CompactReportingOptions
} from './compactReporting';

export {
  countWords,
  generateCompactReport,
  validateWordCount,
  REPORT_TEMPLATES,
  DEFAULT_REPORTING_CONFIG,
  type ReportData,
  type CompactReport,
  type ReportingConfig
} from './reportTemplates';

export {
  extractReportData,
  formatNumber,
  formatProcessingTime,
  determineSuccessStatus,
  calculateFormattedMetrics,
  createMetricsSummary,
  validateHookData,
  createMockHookData,
  type HookExecutionData,
  type FormattedMetrics
} from './hookDataExtraction';