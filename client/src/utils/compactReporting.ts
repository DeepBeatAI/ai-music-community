/**
 * Compact Reporting Integration Module
 * 
 * This module provides a unified interface for generating compact TypeScript hook reports
 * by combining the report template system with hook data extraction utilities.
 */

import { 
  generateCompactReport, 
  validateWordCount, 
  generateFallbackReport,
  type ReportData,
  type CompactReport,
  type ReportingConfig,
  DEFAULT_REPORTING_CONFIG
} from './reportTemplates';

import {
  extractReportData,
  validateHookData,
  type HookExecutionData
} from './hookDataExtraction';

export interface CompactReportingResult {
  report: CompactReport;
  isValid: boolean;
  usedFallback: boolean;
  validationErrors: string[];
}

export interface CompactReportingOptions {
  config?: Partial<ReportingConfig>;
  enableFallback?: boolean;
  strictValidation?: boolean;
}

/**
 * Main function to generate a compact report from hook execution data
 */
export function generateHookReport(
  hookData: HookExecutionData,
  options: CompactReportingOptions = {}
): CompactReportingResult {
  const {
    config = {},
    enableFallback = true,
    strictValidation = true
  } = options;

  const validationErrors: string[] = [];
  let usedFallback = false;

  // Validate input data
  if (strictValidation && !validateHookData(hookData)) {
    validationErrors.push('Invalid hook execution data provided');
    
    if (!enableFallback) {
      return {
        report: {
          message: 'Error: Invalid hook data',
          wordCount: 4,
          format: 'single-line',
          templateUsed: 'error'
        },
        isValid: false,
        usedFallback: false,
        validationErrors
      };
    }
  }

  // Extract report data
  const reportData: ReportData = extractReportData(hookData);
  
  // Merge configuration with defaults
  const finalConfig: ReportingConfig = {
    ...DEFAULT_REPORTING_CONFIG,
    ...config
  };

  // Generate initial report
  let report: CompactReport;
  
  try {
    report = generateCompactReport(reportData, finalConfig);
  } catch (error) {
    validationErrors.push(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    if (enableFallback) {
      report = generateFallbackReport(reportData);
      usedFallback = true;
    } else {
      return {
        report: {
          message: 'Error: Report generation failed',
          wordCount: 4,
          format: 'single-line',
          templateUsed: 'error'
        },
        isValid: false,
        usedFallback: false,
        validationErrors
      };
    }
  }

  // Validate word count
  const isValidWordCount = validateWordCount(report, finalConfig.maxWords);
  
  if (!isValidWordCount) {
    validationErrors.push(`Report exceeds word limit: ${report.wordCount} > ${finalConfig.maxWords}`);
    
    if (enableFallback && !usedFallback) {
      report = generateFallbackReport(reportData);
      usedFallback = true;
      
      // Re-validate fallback
      if (!validateWordCount(report, finalConfig.maxWords)) {
        validationErrors.push('Even fallback report exceeds word limit');
      }
    }
  }

  const isValid = validationErrors.length === 0;

  return {
    report,
    isValid,
    usedFallback,
    validationErrors
  };
}

/**
 * Quick function to generate a simple success report
 */
export function generateSuccessReport(
  initialErrors: number,
  iterations: number,
  processingTimeSeconds: number = 1.0
): CompactReportingResult {
  const mockHookData: HookExecutionData = {
    initialErrorCount: initialErrors,
    finalErrorCount: 0,
    iterationsUsed: iterations,
    totalFixesApplied: initialErrors + Math.floor(initialErrors * 0.2), // Assume 20% extra fixes
    processingStartTime: Date.now() - (processingTimeSeconds * 1000),
    processingEndTime: Date.now(),
    success: true
  };

  return generateHookReport(mockHookData);
}

/**
 * Quick function to generate a partial success report
 */
export function generatePartialSuccessReport(
  initialErrors: number,
  remainingErrors: number,
  iterations: number,
  processingTimeSeconds: number = 5.0
): CompactReportingResult {
  const mockHookData: HookExecutionData = {
    initialErrorCount: initialErrors,
    finalErrorCount: remainingErrors,
    iterationsUsed: iterations,
    totalFixesApplied: (initialErrors - remainingErrors) + Math.floor(initialErrors * 0.3),
    processingStartTime: Date.now() - (processingTimeSeconds * 1000),
    processingEndTime: Date.now(),
    success: false
  };

  return generateHookReport(mockHookData);
}

/**
 * Validates that a report meets all requirements
 */
export function validateCompactReport(
  report: CompactReport,
  requirements: {
    maxWords?: number;
    mustIncludeErrorCount?: boolean;
    mustIncludeIterations?: boolean;
    mustIncludeSuccessIndicator?: boolean;
  } = {}
): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const {
    maxWords = 50,
    mustIncludeErrorCount = true,
    mustIncludeIterations = true,
    mustIncludeSuccessIndicator = true
  } = requirements;

  // Check word count
  if (report.wordCount > maxWords) {
    violations.push(`Exceeds word limit: ${report.wordCount} > ${maxWords}`);
  }

  // Check required content
  if (mustIncludeErrorCount && !report.message.match(/\d+/)) {
    violations.push('Missing error count information');
  }

  if (mustIncludeIterations && !report.message.match(/iteration/i)) {
    violations.push('Missing iteration information');
  }

  if (mustIncludeSuccessIndicator && !report.message.match(/[✅⚠️❌]|success|complete|error/i)) {
    violations.push('Missing success/failure indicator');
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Formats a report for console output with color coding
 */
export function formatReportForConsole(result: CompactReportingResult): string {
  const { report, isValid, usedFallback, validationErrors } = result;
  
  let output = report.message;
  
  // Add metadata for debugging if needed
  if (!isValid || usedFallback) {
    const metadata: string[] = [];
    
    if (usedFallback) {
      metadata.push('(fallback used)');
    }
    
    if (!isValid) {
      metadata.push(`(${validationErrors.length} validation errors)`);
    }
    
    if (metadata.length > 0) {
      output += ` ${metadata.join(' ')}`;
    }
  }
  
  return output;
}

/**
 * Creates a detailed report summary for debugging
 */
export function createReportSummary(result: CompactReportingResult): {
  message: string;
  wordCount: number;
  format: string;
  templateUsed: string;
  isValid: boolean;
  usedFallback: boolean;
  validationErrors: string[];
  compliance: {
    wordLimit: boolean;
    hasErrorCount: boolean;
    hasIterations: boolean;
    hasSuccessIndicator: boolean;
  };
} {
  const { report, isValid, usedFallback, validationErrors } = result;
  
  return {
    message: report.message,
    wordCount: report.wordCount,
    format: report.format,
    templateUsed: report.templateUsed,
    isValid,
    usedFallback,
    validationErrors,
    compliance: {
      wordLimit: report.wordCount <= 50,
      hasErrorCount: /\d+/.test(report.message),
      hasIterations: /iteration/i.test(report.message),
      hasSuccessIndicator: /[✅⚠️❌]|success|complete|error/i.test(report.message)
    }
  };
}

// Export types for external use
export type {
  CompactReport,
  ReportData,
  ReportingConfig
} from './reportTemplates';

export type {
  HookExecutionData
} from './hookDataExtraction';

export {
  DEFAULT_REPORTING_CONFIG
} from './reportTemplates';