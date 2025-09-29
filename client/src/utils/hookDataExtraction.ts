/**
 * Hook Data Extraction Utilities
 * 
 * This module provides functions to extract essential metrics from TypeScript hook execution
 * and format them for compact reporting.
 */

import { type ReportData } from './reportTemplates';

export interface HookExecutionData {
  initialErrorCount: number;
  finalErrorCount: number;
  iterationsUsed: number;
  totalFixesApplied: number;
  processingStartTime: number;
  processingEndTime: number;
  success: boolean;
  errorCategories?: {
    syntax: number;
    type: number;
    import: number;
    config: number;
    other: number;
  };
  fixesAppliedByCategory?: {
    syntax: number;
    type: number;
    import: number;
    config: number;
    other: number;
  };
}

export interface FormattedMetrics {
  errorReductionPercentage: number;
  averageFixesPerIteration: number;
  processingTimeFormatted: string;
  successRate: number;
  mostCommonErrorType: string;
}

/**
 * Extracts essential report data from hook execution data
 */
export function extractReportData(hookData: HookExecutionData): ReportData {
  const processingTimeSeconds = (hookData.processingEndTime - hookData.processingStartTime) / 1000;
  
  return {
    initialErrorCount: hookData.initialErrorCount,
    finalErrorCount: hookData.finalErrorCount,
    iterationsUsed: hookData.iterationsUsed,
    totalFixesApplied: hookData.totalFixesApplied,
    processingTimeSeconds: Math.max(0.1, processingTimeSeconds), // Minimum 0.1s for display
    success: hookData.success
  };
}

/**
 * Formats numbers for clean display in reports
 */
export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

/**
 * Formats processing time for display
 */
export function formatProcessingTime(seconds: number): string {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  } else if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m${remainingSeconds}s`;
  }
}

/**
 * Determines success/failure status based on error resolution results
 */
export function determineSuccessStatus(
  initialErrors: number,
  finalErrors: number,
  maxIterationsReached: boolean
): {
  success: boolean;
  requiresManualIntervention: boolean;
  completionType: 'full-success' | 'partial-success' | 'max-iterations' | 'no-progress';
} {
  const errorsResolved = initialErrors - finalErrors;
  
  if (finalErrors === 0) {
    return {
      success: true,
      requiresManualIntervention: false,
      completionType: 'full-success'
    };
  }
  
  if (maxIterationsReached) {
    if (errorsResolved > 0) {
      return {
        success: false,
        requiresManualIntervention: true,
        completionType: 'max-iterations'
      };
    } else {
      return {
        success: false,
        requiresManualIntervention: true,
        completionType: 'no-progress'
      };
    }
  }
  
  return {
    success: false,
    requiresManualIntervention: true,
    completionType: 'partial-success'
  };
}

/**
 * Calculates additional formatted metrics for detailed analysis
 */
export function calculateFormattedMetrics(hookData: HookExecutionData): FormattedMetrics {
  const errorReduction = hookData.initialErrorCount - hookData.finalErrorCount;
  const errorReductionPercentage = hookData.initialErrorCount > 0 
    ? (errorReduction / hookData.initialErrorCount) * 100 
    : 0;
  
  const averageFixesPerIteration = hookData.iterationsUsed > 0 
    ? hookData.totalFixesApplied / hookData.iterationsUsed 
    : 0;
  
  const processingTimeSeconds = (hookData.processingEndTime - hookData.processingStartTime) / 1000;
  const processingTimeFormatted = formatProcessingTime(processingTimeSeconds);
  
  const successRate = hookData.initialErrorCount > 0 
    ? (errorReduction / hookData.initialErrorCount) * 100 
    : 100;
  
  // Determine most common error type
  let mostCommonErrorType = 'unknown';
  if (hookData.errorCategories) {
    const categories = hookData.errorCategories;
    const maxCount = Math.max(categories.syntax, categories.type, categories.import, categories.config, categories.other);
    
    if (maxCount > 0) {
      if (categories.syntax === maxCount) mostCommonErrorType = 'syntax';
      else if (categories.type === maxCount) mostCommonErrorType = 'type';
      else if (categories.import === maxCount) mostCommonErrorType = 'import';
      else if (categories.config === maxCount) mostCommonErrorType = 'config';
      else mostCommonErrorType = 'other';
    }
  }
  
  return {
    errorReductionPercentage: Math.round(errorReductionPercentage),
    averageFixesPerIteration: Math.round(averageFixesPerIteration * 10) / 10, // Round to 1 decimal
    processingTimeFormatted,
    successRate: Math.round(successRate),
    mostCommonErrorType
  };
}

/**
 * Creates a summary of the most important metrics for compact reporting
 */
export function createMetricsSummary(hookData: HookExecutionData): {
  keyMetrics: string[];
  priorityInfo: string[];
} {
  const metrics = calculateFormattedMetrics(hookData);
  const status = determineSuccessStatus(
    hookData.initialErrorCount,
    hookData.finalErrorCount,
    hookData.iterationsUsed >= 5 // Assuming 5 is max iterations
  );
  
  const keyMetrics: string[] = [];
  const priorityInfo: string[] = [];
  
  // Always include error count progression
  keyMetrics.push(`${hookData.initialErrorCount} → ${hookData.finalErrorCount} errors`);
  
  // Include iterations if more than 1
  if (hookData.iterationsUsed > 1) {
    keyMetrics.push(`${hookData.iterationsUsed} iterations`);
  }
  
  // Include processing time if significant
  if (hookData.processingEndTime - hookData.processingStartTime > 1000) {
    keyMetrics.push(metrics.processingTimeFormatted);
  }
  
  // Priority information based on completion type
  switch (status.completionType) {
    case 'full-success':
      priorityInfo.push('All errors resolved');
      break;
    case 'partial-success':
      priorityInfo.push(`${hookData.finalErrorCount} errors remain`);
      break;
    case 'max-iterations':
      priorityInfo.push('Max iterations reached');
      break;
    case 'no-progress':
      priorityInfo.push('No progress made');
      break;
  }
  
  return { keyMetrics, priorityInfo };
}

/**
 * Validates hook execution data for completeness
 */
export function validateHookData(hookData: Partial<HookExecutionData>): hookData is HookExecutionData {
  return (
    typeof hookData.initialErrorCount === 'number' &&
    typeof hookData.finalErrorCount === 'number' &&
    typeof hookData.iterationsUsed === 'number' &&
    typeof hookData.totalFixesApplied === 'number' &&
    typeof hookData.processingStartTime === 'number' &&
    typeof hookData.processingEndTime === 'number' &&
    typeof hookData.success === 'boolean' &&
    hookData.initialErrorCount >= 0 &&
    hookData.finalErrorCount >= 0 &&
    hookData.iterationsUsed >= 0 &&
    hookData.totalFixesApplied >= 0 &&
    hookData.processingEndTime >= hookData.processingStartTime
  );
}

/**
 * Creates mock hook data for testing purposes
 */
export function createMockHookData(overrides: Partial<HookExecutionData> = {}): HookExecutionData {
  const baseTime = Date.now();
  
  return {
    initialErrorCount: 10,
    finalErrorCount: 0,
    iterationsUsed: 2,
    totalFixesApplied: 12,
    processingStartTime: baseTime,
    processingEndTime: baseTime + 2500, // 2.5 seconds
    success: true,
    errorCategories: {
      syntax: 4,
      type: 3,
      import: 2,
      config: 1,
      other: 0
    },
    fixesAppliedByCategory: {
      syntax: 5,
      type: 4,
      import: 2,
      config: 1,
      other: 0
    },
    ...overrides
  };
}