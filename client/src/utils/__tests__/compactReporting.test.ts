/**
 * Unit tests for Compact Reporting Integration Module
 */

import {
  generateHookReport,
  generateSuccessReport,
  generatePartialSuccessReport,
  validateCompactReport,
  formatReportForConsole,
  createReportSummary,
  type CompactReportingResult,
  type CompactReportingOptions
} from '../compactReporting';

import { createMockHookData, type HookExecutionData } from '../hookDataExtraction';

describe('compactReporting', () => {
  const mockSuccessData: HookExecutionData = createMockHookData({
    initialErrorCount: 15,
    finalErrorCount: 0,
    iterationsUsed: 3,
    totalFixesApplied: 18,
    success: true
  });

  const mockPartialData: HookExecutionData = createMockHookData({
    initialErrorCount: 20,
    finalErrorCount: 5,
    iterationsUsed: 3,
    totalFixesApplied: 25,
    success: false
  });

  describe('generateHookReport', () => {
    it('should generate valid report for successful execution', () => {
      const result = generateHookReport(mockSuccessData);
      
      expect(result.isValid).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.report.wordCount).toBeLessThanOrEqual(50);
      expect(result.report.message).toContain('✅');
      expect(result.report.message).toContain('15');
      expect(result.report.message).toContain('0 errors');
    });

    it('should generate valid report for partial success', () => {
      const result = generateHookReport(mockPartialData);
      
      expect(result.isValid).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.report.wordCount).toBeLessThanOrEqual(50);
      expect(result.report.message).toContain('⚠️');
      expect(result.report.message).toContain('15/20');
    });

    it('should handle custom configuration', () => {
      const customOptions: CompactReportingOptions = {
        config: {
          maxWords: 25,
          successEmoji: '🎉',
          failureEmoji: '❌'
        }
      };

      const result = generateHookReport(mockSuccessData, customOptions);
      
      expect(result.isValid).toBe(true);
      expect(result.report.wordCount).toBeLessThanOrEqual(25);
      expect(result.report.message).toContain('🎉');
    });

    it('should use fallback when report exceeds word limit', () => {
      const extremeData: HookExecutionData = createMockHookData({
        initialErrorCount: 999999,
        finalErrorCount: 0,
        iterationsUsed: 999,
        totalFixesApplied: 999999,
        success: true
      });

      const restrictiveOptions: CompactReportingOptions = {
        config: { maxWords: 5 }
      };

      const result = generateHookReport(extremeData, restrictiveOptions);
      
      expect(result.usedFallback).toBe(true);
      expect(result.report.wordCount).toBeLessThanOrEqual(10); // Fallback should be very short
    });

    it('should handle invalid data with strict validation', () => {
      const invalidData = {
        initialErrorCount: -5, // Invalid negative value
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 1,
        processingStartTime: Date.now(),
        processingEndTime: Date.now() + 1000,
        success: true
      } as HookExecutionData;

      const result = generateHookReport(invalidData, { strictValidation: true });
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });

    it('should disable fallback when requested', () => {
      const extremeData: HookExecutionData = createMockHookData({
        initialErrorCount: 999999,
        finalErrorCount: 0,
        iterationsUsed: 999,
        totalFixesApplied: 999999,
        success: true
      });

      const noFallbackOptions: CompactReportingOptions = {
        config: { maxWords: 5 },
        enableFallback: false
      };

      const result = generateHookReport(extremeData, noFallbackOptions);
      
      expect(result.usedFallback).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });

    it('should handle report generation errors gracefully', () => {
      // Create data that might cause issues
      const problematicData: HookExecutionData = createMockHookData({
        processingStartTime: NaN,
        processingEndTime: NaN
      });

      const result = generateHookReport(problematicData, { enableFallback: true });
      
      // Should either succeed or use fallback
      expect(result.report).toBeDefined();
      expect(result.report.message).toBeTruthy();
    });
  });

  describe('generateSuccessReport', () => {
    it('should generate quick success report', () => {
      const result = generateSuccessReport(10, 2, 1.5);
      
      expect(result.isValid).toBe(true);
      expect(result.report.message).toContain('✅');
      expect(result.report.message).toContain('10');
      expect(result.report.message).toContain('0 errors');
      expect(result.report.message).toContain('2 iterations');
    });

    it('should handle single iteration', () => {
      const result = generateSuccessReport(5, 1);
      
      expect(result.isValid).toBe(true);
      expect(result.report.message).toContain('5');
      expect(result.report.message).toContain('0 errors');
    });

    it('should handle large error counts', () => {
      const result = generateSuccessReport(100, 5, 10.0);
      
      expect(result.isValid).toBe(true);
      expect(result.report.wordCount).toBeLessThanOrEqual(50);
    });
  });

  describe('generatePartialSuccessReport', () => {
    it('should generate partial success report', () => {
      const result = generatePartialSuccessReport(20, 5, 4, 8.0);
      
      expect(result.isValid).toBe(true);
      expect(result.report.message).toContain('⚠️');
      expect(result.report.message).toContain('15/20');
      expect(result.report.message).toContain('5 errors require manual intervention');
    });

    it('should handle no progress scenario', () => {
      const result = generatePartialSuccessReport(10, 10, 5, 15.0);
      
      expect(result.isValid).toBe(true);
      expect(result.report.message).toContain('0/10');
    });
  });

  describe('validateCompactReport', () => {
    it('should validate compliant reports', () => {
      const result = generateHookReport(mockSuccessData);
      const validation = validateCompactReport(result.report);
      
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should detect word count violations', () => {
      const result = generateHookReport(mockSuccessData);
      const validation = validateCompactReport(result.report, { maxWords: 5 });
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations[0]).toMatch(/exceeds word limit/i);
    });

    it('should detect missing required content', () => {
      const mockReport = {
        message: 'Something happened',
        wordCount: 2,
        format: 'single-line' as const,
        templateUsed: 'test'
      };

      const validation = validateCompactReport(mockReport, {
        mustIncludeErrorCount: true,
        mustIncludeIterations: true,
        mustIncludeSuccessIndicator: true
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(0);
    });

    it('should allow optional requirements', () => {
      const mockReport = {
        message: '✅ Success: 10 errors fixed',
        wordCount: 5,
        format: 'single-line' as const,
        templateUsed: 'test'
      };

      const validation = validateCompactReport(mockReport, {
        mustIncludeIterations: false
      });
      
      expect(validation.isValid).toBe(true);
    });
  });

  describe('formatReportForConsole', () => {
    it('should format valid reports cleanly', () => {
      const result = generateHookReport(mockSuccessData);
      const formatted = formatReportForConsole(result);
      
      expect(formatted).toBe(result.report.message);
      expect(formatted).not.toContain('fallback');
      expect(formatted).not.toContain('validation errors');
    });

    it('should add metadata for fallback reports', () => {
      const result: CompactReportingResult = {
        report: {
          message: '✅ TypeScript: 10 → 0',
          wordCount: 5,
          format: 'single-line',
          templateUsed: 'emergency-fallback'
        },
        isValid: true,
        usedFallback: true,
        validationErrors: []
      };

      const formatted = formatReportForConsole(result);
      
      expect(formatted).toContain('(fallback used)');
    });

    it('should add metadata for invalid reports', () => {
      const result: CompactReportingResult = {
        report: {
          message: 'Error: Invalid data',
          wordCount: 3,
          format: 'single-line',
          templateUsed: 'error'
        },
        isValid: false,
        usedFallback: false,
        validationErrors: ['Invalid input', 'Missing data']
      };

      const formatted = formatReportForConsole(result);
      
      expect(formatted).toContain('(2 validation errors)');
    });

    it('should combine multiple metadata flags', () => {
      const result: CompactReportingResult = {
        report: {
          message: '✅ TypeScript: 10 → 0',
          wordCount: 5,
          format: 'single-line',
          templateUsed: 'emergency-fallback'
        },
        isValid: false,
        usedFallback: true,
        validationErrors: ['Some error']
      };

      const formatted = formatReportForConsole(result);
      
      expect(formatted).toContain('(fallback used)');
      expect(formatted).toContain('(1 validation errors)');
    });
  });

  describe('createReportSummary', () => {
    it('should create comprehensive summary', () => {
      const result = generateHookReport(mockSuccessData);
      const summary = createReportSummary(result);
      
      expect(summary.message).toBe(result.report.message);
      expect(summary.wordCount).toBe(result.report.wordCount);
      expect(summary.format).toBe(result.report.format);
      expect(summary.templateUsed).toBe(result.report.templateUsed);
      expect(summary.isValid).toBe(result.isValid);
      expect(summary.usedFallback).toBe(result.usedFallback);
      expect(summary.validationErrors).toEqual(result.validationErrors);
    });

    it('should analyze compliance correctly', () => {
      const result = generateHookReport(mockSuccessData);
      const summary = createReportSummary(result);
      
      expect(summary.compliance.wordLimit).toBe(true);
      expect(summary.compliance.hasErrorCount).toBe(true);
      expect(summary.compliance.hasIterations).toBe(true);
      expect(summary.compliance.hasSuccessIndicator).toBe(true);
    });

    it('should detect compliance violations', () => {
      const result: CompactReportingResult = {
        report: {
          message: 'Something happened without details',
          wordCount: 60, // Exceeds limit
          format: 'single-line',
          templateUsed: 'test'
        },
        isValid: false,
        usedFallback: false,
        validationErrors: ['Word limit exceeded']
      };

      const summary = createReportSummary(result);
      
      expect(summary.compliance.wordLimit).toBe(false);
      expect(summary.compliance.hasErrorCount).toBe(false);
      expect(summary.compliance.hasIterations).toBe(false);
      expect(summary.compliance.hasSuccessIndicator).toBe(false);
    });
  });

  describe('End-to-end integration', () => {
    it('should handle complete workflow from hook data to formatted output', () => {
      // Start with hook execution data
      const hookData = createMockHookData({
        initialErrorCount: 25,
        finalErrorCount: 0,
        iterationsUsed: 4,
        totalFixesApplied: 30,
        success: true
      });

      // Generate report
      const result = generateHookReport(hookData);

      // Validate report
      const validation = validateCompactReport(result.report);

      // Format for console
      const consoleOutput = formatReportForConsole(result);

      // Create summary
      const summary = createReportSummary(result);

      // Verify complete workflow
      expect(result.isValid).toBe(true);
      expect(validation.isValid).toBe(true);
      expect(consoleOutput).toBeTruthy();
      expect(summary.compliance.wordLimit).toBe(true);
      expect(summary.compliance.hasErrorCount).toBe(true);
      expect(summary.compliance.hasSuccessIndicator).toBe(true);
    });

    it('should maintain data integrity throughout the pipeline', () => {
      const originalData = createMockHookData({
        initialErrorCount: 42,
        finalErrorCount: 0,
        iterationsUsed: 3,
        success: true
      });

      const result = generateHookReport(originalData);
      
      // Verify original data is preserved in the report
      expect(result.report.message).toContain('42');
      expect(result.report.message).toContain('0 errors');
      expect(result.report.message).toContain('3 iterations');
    });
  });
});