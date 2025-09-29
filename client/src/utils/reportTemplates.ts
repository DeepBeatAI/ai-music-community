/**
 * Report Template System for TypeScript Hook Optimization
 * 
 * This module provides compact report templates with placeholder substitution
 * and word counting utilities to ensure 50-word limit compliance.
 */

export interface ReportData {
  initialErrorCount: number;
  finalErrorCount: number;
  iterationsUsed: number;
  totalFixesApplied: number;
  processingTimeSeconds: number;
  success: boolean;
}

export interface CompactReport {
  message: string;
  wordCount: number;
  format: 'single-line' | 'compact-multi-line';
  templateUsed: string;
}

export interface ReportingConfig {
  maxWords: number;
  includeProcessingTime: boolean;
  includeFixCount: boolean;
  format: 'minimal' | 'compact';
  successEmoji: string;
  failureEmoji: string;
}

export interface EssentialMetrics {
  errorReduction: number;
  iterationEfficiency: number;
  success: boolean;
  requiresManualIntervention: boolean;
}

// Default configuration
export const DEFAULT_REPORTING_CONFIG: ReportingConfig = {
  maxWords: 50,
  includeProcessingTime: true,
  includeFixCount: true,
  format: 'compact',
  successEmoji: '✅',
  failureEmoji: '⚠️'
};

// Report templates with placeholders
export const REPORT_TEMPLATES = {
  // Template 1: Single Line Success (most compact)
  singleLineSuccess: '{successEmoji} TypeScript: {initialErrors} → 0 errors resolved in {iterations} iterations ({fixes} fixes applied)',
  
  // Template 2: Compact Multi-Line Success
  compactMultiLineSuccess: `{successEmoji} TypeScript Check Complete
{initialErrors} → 0 errors | {iterations} iterations | {processingTime}s`,
  
  // Template 3: Failure/Partial Success
  partialSuccess: `{failureEmoji} TypeScript: {resolved}/{initialErrors} errors resolved in {iterations} iterations
{remainingErrors} errors require manual intervention`,
  
  // Template 4: Minimal Success (absolute minimum for edge cases)
  minimalSuccess: '{successEmoji} TypeScript: {initialErrors} errors fixed in {iterations} iterations',
  
  // Template 5: Ultra-minimal (emergency fallback)
  ultraMinimal: '{successEmoji} TypeScript: {initialErrors} → 0 errors ({iterations} iterations)',
  
  // Template 6: Absolute minimum success (extreme edge cases)
  absoluteMinimal: '{successEmoji} TS: {initialErrors}→0 ({iterations}x)',
  
  // Template 7: Absolute minimum failure
  absoluteMinimalFailure: '{failureEmoji} TS: {resolved}/{initialErrors}',
  
  // Template 8: Bare minimum (last resort)
  bareMinimum: '{successEmoji} {initialErrors}→{finalErrors}'
};

/**
 * Accurately counts words in a text string
 * Handles multiple whitespace types and edge cases
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  // Remove extra whitespace and split by whitespace
  const words = text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .split(' ')
    .filter(word => word.length > 0);
  
  return words.length;
}

/**
 * Substitutes placeholders in template with actual data
 */
export function substitutePlaceholders(template: string, data: ReportData, config: ReportingConfig): string {
  const resolved = data.initialErrorCount - data.finalErrorCount;
  const remainingErrors = data.finalErrorCount;
  
  const placeholders: Record<string, string | number> = {
    successEmoji: config.successEmoji,
    failureEmoji: config.failureEmoji,
    initialErrors: data.initialErrorCount,
    finalErrors: data.finalErrorCount,
    iterations: data.iterationsUsed,
    fixes: data.totalFixesApplied,
    processingTime: data.processingTimeSeconds.toFixed(1),
    resolved: resolved,
    remainingErrors: remainingErrors
  };
  
  let result = template;
  
  // Replace all placeholders
  Object.entries(placeholders).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  });
  
  return result;
}

/**
 * Calculates essential metrics from report data
 */
export function calculateEssentialMetrics(data: ReportData): EssentialMetrics {
  const errorReduction = data.initialErrorCount - data.finalErrorCount;
  return {
    errorReduction,
    iterationEfficiency: data.iterationsUsed > 0 ? errorReduction / data.iterationsUsed : 0,
    success: data.finalErrorCount === 0,
    requiresManualIntervention: data.finalErrorCount > 0
  };
}

/**
 * Selects the most appropriate template based on data complexity and word limits with enhanced fallback logic
 */
export function selectTemplate(data: ReportData, config: ReportingConfig = DEFAULT_REPORTING_CONFIG): string {
  const metrics = calculateEssentialMetrics(data);
  
  try {
    // For failures/partial success, try failure templates first
    if (!metrics.success) {
      const failureTemplates = [
        REPORT_TEMPLATES.partialSuccess,
        '{failureEmoji} TS: {resolved}/{initialErrors} errors fixed, {remainingErrors} remain',
        '{failureEmoji} {resolved}/{initialErrors} fixed'
      ];
      
      for (const template of failureTemplates) {
        try {
          const testMessage = substitutePlaceholders(template, data, config);
          const wordCount = countWords(testMessage);
          
          if (wordCount <= config.maxWords) {
            return template;
          }
        } catch (error) {
          console.warn('Template substitution failed, trying next template:', error);
          continue;
        }
      }
    }
    
    // For success cases, try templates in order of preference
    const successTemplates = [
      { name: 'singleLineSuccess', template: REPORT_TEMPLATES.singleLineSuccess },
      { name: 'compactMultiLineSuccess', template: REPORT_TEMPLATES.compactMultiLineSuccess },
      { name: 'minimalSuccess', template: REPORT_TEMPLATES.minimalSuccess },
      { name: 'ultraMinimal', template: REPORT_TEMPLATES.ultraMinimal }
    ];
    
    // Try each template and return the first one that fits within word limit
    for (const { template } of successTemplates) {
      try {
        const testMessage = substitutePlaceholders(template, data, config);
        const wordCount = countWords(testMessage);
        
        if (wordCount <= config.maxWords) {
          return template;
        }
      } catch (error) {
        console.warn('Template substitution failed, trying next template:', error);
        continue;
      }
    }
    
    // If all standard templates fail, return ultra-minimal as last resort
    return REPORT_TEMPLATES.ultraMinimal;
    
  } catch (error) {
    console.warn('Template selection failed, using ultra-minimal fallback:', error);
    return REPORT_TEMPLATES.ultraMinimal;
  }
}

/**
 * Generates a compact report with comprehensive word count validation and fallback mechanisms
 */
export function generateCompactReport(
  data: ReportData, 
  config: ReportingConfig = DEFAULT_REPORTING_CONFIG
): CompactReport {
  try {
    // First attempt: Use template selection logic
    const selectedTemplate = selectTemplate(data, config);
    const message = substitutePlaceholders(selectedTemplate, data, config);
    const wordCount = countWords(message);
    
    // Validate word count before returning
    if (wordCount <= config.maxWords) {
      const format = message.includes('\n') ? 'compact-multi-line' : 'single-line';
      const templateUsed = Object.entries(REPORT_TEMPLATES).find(
        ([, template]) => template === selectedTemplate
      )?.[0] || 'unknown';
      
      return {
        message,
        wordCount,
        format,
        templateUsed
      };
    }
    
    // If selected template exceeds limit, try fallback cascade
    return generateReportWithFallbackCascade(data, config);
    
  } catch (error) {
    // Error handling for template generation failures
    console.warn('Template generation failed, using emergency fallback:', error);
    return generateEmergencyFallbackReport(data);
  }
}

/**
 * Validates that a report meets the word count requirements
 */
export function validateWordCount(report: CompactReport, maxWords: number = 50): boolean {
  return report.wordCount <= maxWords;
}

/**
 * Generates fallback report if all templates exceed word limit
 */
export function generateFallbackReport(data: ReportData): CompactReport {
  const message = `${DEFAULT_REPORTING_CONFIG.successEmoji} TypeScript: ${data.initialErrorCount} → ${data.finalErrorCount}`;
  
  return {
    message,
    wordCount: countWords(message),
    format: 'single-line',
    templateUsed: 'emergency-fallback'
  };
}

/**
 * Implements a cascade of fallback templates when word limits are exceeded
 */
export function generateReportWithFallbackCascade(
  data: ReportData, 
  config: ReportingConfig = DEFAULT_REPORTING_CONFIG
): CompactReport {
  const metrics = calculateEssentialMetrics(data);
  
  // Define fallback templates in order of preference (shortest to longest acceptable)
  const fallbackTemplates = [
    {
      name: 'ultra-minimal',
      template: REPORT_TEMPLATES.ultraMinimal,
      condition: () => metrics.success
    },
    {
      name: 'minimal-success',
      template: REPORT_TEMPLATES.minimalSuccess,
      condition: () => metrics.success
    },
    {
      name: 'absolute-minimum',
      template: '{successEmoji} TS: {initialErrors}→{finalErrors} ({iterations}x)',
      condition: () => metrics.success
    },
    {
      name: 'absolute-minimum-failure',
      template: '{failureEmoji} TS: {resolved}/{initialErrors} fixed',
      condition: () => !metrics.success
    },
    {
      name: 'bare-minimum',
      template: '{successEmoji} {initialErrors}→{finalErrors}',
      condition: () => true // Always applicable
    }
  ];
  
  // Try each fallback template
  for (const fallback of fallbackTemplates) {
    if (fallback.condition()) {
      try {
        const message = substitutePlaceholders(fallback.template, data, config);
        const wordCount = countWords(message);
        
        if (wordCount <= config.maxWords) {
          return {
            message,
            wordCount,
            format: 'single-line',
            templateUsed: `fallback-${fallback.name}`
          };
        }
      } catch (error) {
        console.warn(`Fallback template ${fallback.name} failed:`, error);
        continue;
      }
    }
  }
  
  // If all fallbacks fail, use emergency fallback
  return generateEmergencyFallbackReport(data);
}

/**
 * Generates the most minimal possible report for extreme edge cases
 */
export function generateEmergencyFallbackReport(data: ReportData): CompactReport {
  try {
    // Try the most minimal format possible
    const message = `${data.success ? '✅' : '⚠️'} ${data.initialErrorCount}→${data.finalErrorCount}`;
    const wordCount = countWords(message);
    
    return {
      message,
      wordCount,
      format: 'single-line',
      templateUsed: 'emergency-minimal'
    };
  } catch (error) {
    // Absolute last resort - no emojis, just numbers
    const message = `${data.initialErrorCount}->${data.finalErrorCount}`;
    return {
      message,
      wordCount: countWords(message),
      format: 'single-line',
      templateUsed: 'absolute-emergency'
    };
  }
}

/**
 * Validates report generation and applies additional safety checks
 */
export function validateAndGenerateReport(
  data: ReportData,
  config: ReportingConfig = DEFAULT_REPORTING_CONFIG
): CompactReport {
  // Input validation
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid report data provided');
  }
  
  if (typeof data.initialErrorCount !== 'number' || data.initialErrorCount < 0) {
    throw new Error('Invalid initial error count');
  }
  
  if (typeof data.finalErrorCount !== 'number' || data.finalErrorCount < 0) {
    throw new Error('Invalid final error count');
  }
  
  if (typeof data.iterationsUsed !== 'number' || data.iterationsUsed < 0) {
    throw new Error('Invalid iterations count');
  }
  
  // Generate report with validation
  const report = generateCompactReport(data, config);
  
  // Final validation
  if (!validateWordCount(report, config.maxWords)) {
    console.warn(`Generated report exceeds word limit: ${report.wordCount} > ${config.maxWords}`);
    return generateEmergencyFallbackReport(data);
  }
  
  if (!report.message || report.message.trim().length === 0) {
    console.warn('Generated report is empty, using emergency fallback');
    return generateEmergencyFallbackReport(data);
  }
  
  return report;
}