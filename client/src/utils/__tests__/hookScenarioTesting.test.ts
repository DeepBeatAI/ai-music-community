/**
 * Hook Scenario Testing
 * 
 * Comprehensive tests for TypeScript hook execution with various error scenarios
 * to validate 50-word limit compliance and essential information preservation.
 */

import {
  validateAndGenerateReport,
  generateCompactReport,
  countWords,
  type ReportData,
  type ReportingConfig,
  DEFAULT_REPORTING_CONFIG
} from '../reportTemplates';

import {
  extractReportData,
  createMockHookData,
  validateHookData,
  type HookExecutionData
} from '../hookDataExtraction';

describe('Hook Scenario Testing', () => {
  describe('Error Count Scenarios', () => {
    it('should handle 0 errors scenario with compliance', () => {
      const hookData = createMockHookData({
        initialErrorCount: 0,
        finalErrorCount: 0,
        iterationsUsed: 0,
        totalFixesApplied: 0,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Validate 50-word limit compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Validate essential information preservation
      expect(report.message).toMatch(/0/); // Should show 0 errors
      expect(report.message).toMatch(/✅|success/i); // Success indicator
      
      // Validate no regression in execution time (should be reasonable)
      expect(reportData.processingTimeSeconds).toBeGreaterThan(0);
    });

    it('should handle 1 error scenario with compliance', () => {
      const hookData = createMockHookData({
        initialErrorCount: 1,
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 1,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Validate 50-word limit compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Validate essential information preservation
      expect(report.message).toMatch(/1/); // Initial error count
      expect(report.message).toMatch(/0/); // Final error count
      expect(report.message).toMatch(/1.*iteration/i); // Iteration count
      expect(report.message).toMatch(/✅/); // Success status
    });

    it('should handle 10 errors scenario with compliance', () => {
      const hookData = createMockHookData({
        initialErrorCount: 10,
        finalErrorCount: 0,
        iterationsUsed: 2,
        totalFixesApplied: 12,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Validate 50-word limit compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Validate essential information preservation
      expect(report.message).toMatch(/10/); // Initial error count
      expect(report.message).toMatch(/0/); // Final error count
      expect(report.message).toMatch(/2.*iteration/i); // Iteration count
      expect(report.message).toMatch(/✅/); // Success status
    });

    it('should handle 50+ errors scenario with compliance', () => {
      const hookData = createMockHookData({
        initialErrorCount: 75,
        finalErrorCount: 0,
        iterationsUsed: 4,
        totalFixesApplied: 89,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Validate 50-word limit compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Validate essential information preservation
      expect(report.message).toMatch(/75/); // Initial error count
      expect(report.message).toMatch(/0/); // Final error count
      expect(report.message).toMatch(/4.*iteration/i); // Iteration count
      expect(report.message).toMatch(/✅/); // Success status
    });

    it('should handle extreme error counts (100+) with compliance', () => {
      const hookData = createMockHookData({
        initialErrorCount: 150,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: 200,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Validate 50-word limit compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Validate essential information preservation
      expect(report.message).toMatch(/150/); // Initial error count
      expect(report.message).toMatch(/0/); // Final error count
      expect(report.message).toMatch(/5.*iteration/i); // Iteration count
      expect(report.message).toMatch(/✅/); // Success status
    });
  });

  describe('Partial Success Scenarios', () => {
    it('should handle partial resolution with remaining errors', () => {
      const hookData = createMockHookData({
        initialErrorCount: 20,
        finalErrorCount: 5,
        iterationsUsed: 5, // Max iterations reached
        totalFixesApplied: 25,
        success: false
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Validate 50-word limit compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Validate essential information preservation
      expect(report.message).toMatch(/20|15/); // Initial or resolved count
      expect(report.message).toMatch(/5/); // Remaining errors
      expect(report.message).toMatch(/5.*iteration/i); // Iteration count
      expect(report.message).toMatch(/⚠️|manual/i); // Failure/manual intervention indicator
    });

    it('should handle no progress scenario', () => {
      const hookData = createMockHookData({
        initialErrorCount: 10,
        finalErrorCount: 10,
        iterationsUsed: 5,
        totalFixesApplied: 0,
        success: false
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Validate 50-word limit compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Validate essential information preservation
      expect(report.message).toMatch(/10/); // Error count
      expect(report.message).toMatch(/5.*iteration/i); // Iteration count
      expect(report.message).toMatch(/⚠️/); // Failure indicator
    });
  });

  describe('Performance Validation', () => {
    it('should not regress in execution time for small error counts', () => {
      const startTime = Date.now();
      
      const hookData = createMockHookData({
        initialErrorCount: 5,
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 5,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);
      
      const executionTime = Date.now() - startTime;
      
      // Should execute very quickly (under 100ms for report generation)
      expect(executionTime).toBeLessThan(100);
      
      // Should still maintain compliance
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });

    it('should not regress in execution time for large error counts', () => {
      const startTime = Date.now();
      
      const hookData = createMockHookData({
        initialErrorCount: 100,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: 150,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);
      
      const executionTime = Date.now() - startTime;
      
      // Should still execute quickly even with large numbers
      expect(executionTime).toBeLessThan(200);
      
      // Should maintain compliance regardless of data size
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });
  });

  describe('Word Limit Compliance Validation', () => {
    const testScenarios = [
      { name: 'zero errors', initialErrors: 0, finalErrors: 0, iterations: 0, fixes: 0, success: true },
      { name: 'single error', initialErrors: 1, finalErrors: 0, iterations: 1, fixes: 1, success: true },
      { name: 'few errors', initialErrors: 5, finalErrors: 0, iterations: 2, fixes: 6, success: true },
      { name: 'moderate errors', initialErrors: 25, finalErrors: 0, iterations: 3, fixes: 30, success: true },
      { name: 'many errors', initialErrors: 75, finalErrors: 0, iterations: 4, fixes: 90, success: true },
      { name: 'extreme errors', initialErrors: 200, finalErrors: 0, iterations: 5, fixes: 250, success: true },
      { name: 'partial success', initialErrors: 50, finalErrors: 10, iterations: 5, fixes: 60, success: false },
      { name: 'no progress', initialErrors: 20, finalErrors: 20, iterations: 5, fixes: 0, success: false }
    ];

    testScenarios.forEach(scenario => {
      it(`should maintain 50-word limit for ${scenario.name} scenario`, () => {
        const hookData = createMockHookData({
          initialErrorCount: scenario.initialErrors,
          finalErrorCount: scenario.finalErrors,
          iterationsUsed: scenario.iterations,
          totalFixesApplied: scenario.fixes,
          success: scenario.success
        });

        const reportData = extractReportData(hookData);
        const report = validateAndGenerateReport(reportData);

        // Strict 50-word limit compliance
        expect(report.wordCount).toBeLessThanOrEqual(50);
        
        // Verify word count accuracy
        const manualCount = countWords(report.message);
        expect(report.wordCount).toBe(manualCount);
        
        // Ensure message is not empty
        expect(report.message.trim()).toBeTruthy();
      });
    });
  });

  describe('Essential Information Preservation', () => {
    it('should preserve error counts in all scenarios', () => {
      const scenarios = [
        { initial: 0, final: 0 },
        { initial: 1, final: 0 },
        { initial: 10, final: 0 },
        { initial: 50, final: 0 },
        { initial: 100, final: 0 },
        { initial: 25, final: 5 },
        { initial: 50, final: 15 }
      ];

      scenarios.forEach(({ initial, final }) => {
        const hookData = createMockHookData({
          initialErrorCount: initial,
          finalErrorCount: final,
          iterationsUsed: 3,
          totalFixesApplied: initial - final + 5,
          success: final === 0
        });

        const reportData = extractReportData(hookData);
        const report = validateAndGenerateReport(reportData);

        // Should contain initial error count
        expect(report.message).toMatch(new RegExp(initial.toString()));
        
        // Should contain final error count or indicate success/failure
        if (final === 0) {
          expect(report.message).toMatch(/0|zero|success|complete/i);
        } else {
          expect(report.message).toMatch(new RegExp(final.toString()));
        }
      });
    });

    it('should preserve iteration counts in all scenarios', () => {
      const iterationCounts = [1, 2, 3, 4, 5];

      iterationCounts.forEach(iterations => {
        const hookData = createMockHookData({
          initialErrorCount: 10,
          finalErrorCount: 0,
          iterationsUsed: iterations,
          totalFixesApplied: 12,
          success: true
        });

        const reportData = extractReportData(hookData);
        const report = validateAndGenerateReport(reportData);

        // Should contain iteration count
        expect(report.message).toMatch(new RegExp(iterations.toString()));
        expect(report.message).toMatch(/iteration/i);
      });
    });

    it('should preserve success status in all scenarios', () => {
      const successScenarios = [
        { success: true, expectedIndicator: /✅|success|complete/i },
        { success: false, expectedIndicator: /⚠️|manual|intervention|remain/i }
      ];

      successScenarios.forEach(({ success, expectedIndicator }) => {
        const hookData = createMockHookData({
          initialErrorCount: 10,
          finalErrorCount: success ? 0 : 3,
          iterationsUsed: 3,
          totalFixesApplied: success ? 10 : 7,
          success
        });

        const reportData = extractReportData(hookData);
        const report = validateAndGenerateReport(reportData);

        // Should contain appropriate success/failure indicator
        expect(report.message).toMatch(expectedIndicator);
      });
    });
  });

  describe('Extreme Edge Cases', () => {
    it('should handle maximum safe integer values', () => {
      const hookData = createMockHookData({
        initialErrorCount: Number.MAX_SAFE_INTEGER,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: Number.MAX_SAFE_INTEGER,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);

      // Should still maintain word limit
      expect(report.wordCount).toBeLessThanOrEqual(50);
      
      // Should not crash or produce empty message
      expect(report.message.trim()).toBeTruthy();
    });

    it('should handle very restrictive word limits', () => {
      const restrictiveConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 5 // Very restrictive
      };

      const hookData = createMockHookData({
        initialErrorCount: 25,
        finalErrorCount: 0,
        iterationsUsed: 3,
        totalFixesApplied: 30,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData, restrictiveConfig);

      // Should respect the restrictive limit
      expect(report.wordCount).toBeLessThanOrEqual(5);
      
      // Should still contain essential information
      expect(report.message).toMatch(/25|0/);
    });

    it('should handle impossible word limits gracefully', () => {
      const impossibleConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 1 // Nearly impossible
      };

      const hookData = createMockHookData({
        initialErrorCount: 10,
        finalErrorCount: 0,
        iterationsUsed: 2,
        totalFixesApplied: 12,
        success: true
      });

      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData, impossibleConfig);

      // Should use emergency fallback
      expect(report.templateUsed).toMatch(/emergency/);
      expect(report.wordCount).toBeLessThanOrEqual(2); // Small tolerance
      expect(report.message.trim()).toBeTruthy();
    });
  });

  describe('Template Fallback Validation', () => {
    it('should progressively use shorter templates as word limits decrease', () => {
      const wordLimits = [50, 25, 15, 10, 8, 5, 3, 2];
      const hookData = createMockHookData({
        initialErrorCount: 15,
        finalErrorCount: 0,
        iterationsUsed: 3,
        totalFixesApplied: 18,
        success: true
      });

      const reportData = extractReportData(hookData);
      const templates: string[] = [];

      wordLimits.forEach(limit => {
        const config: ReportingConfig = {
          ...DEFAULT_REPORTING_CONFIG,
          maxWords: limit
        };

        const report = validateAndGenerateReport(reportData, config);
        templates.push(report.templateUsed);
        
        // Should always respect the limit
        expect(report.wordCount).toBeLessThanOrEqual(limit + 1); // Small tolerance
      });

      // Should show progression to more compact templates
      expect(templates.length).toBe(wordLimits.length);
      expect(templates).toContain('singleLineSuccess'); // Should use standard template for higher limits
      expect(templates.some(t => t.includes('fallback') || t.includes('emergency'))).toBe(true); // Should use fallbacks for lower limits
    });
  });

  describe('Integration with Hook Execution', () => {
    it('should validate complete hook execution data flow', () => {
      // Simulate complete hook execution data
      const hookData: HookExecutionData = {
        initialErrorCount: 12,
        finalErrorCount: 0,
        iterationsUsed: 2,
        totalFixesApplied: 15,
        processingStartTime: Date.now() - 3000,
        processingEndTime: Date.now(),
        success: true,
        errorCategories: {
          syntax: 4,
          type: 5,
          import: 2,
          config: 1,
          other: 0
        },
        fixesAppliedByCategory: {
          syntax: 5,
          type: 6,
          import: 2,
          config: 2,
          other: 0
        }
      };

      // Validate data integrity
      expect(validateHookData(hookData)).toBe(true);

      // Extract report data
      const reportData = extractReportData(hookData);
      expect(reportData.processingTimeSeconds).toBeCloseTo(3, 1);

      // Generate report
      const report = validateAndGenerateReport(reportData);

      // Validate final output
      expect(report.wordCount).toBeLessThanOrEqual(50);
      expect(report.message).toMatch(/12/); // Initial errors
      expect(report.message).toMatch(/0/); // Final errors
      expect(report.message).toMatch(/2/); // Iterations
      expect(report.message).toMatch(/✅/); // Success
    });
  });
});