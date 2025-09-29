/**
 * Unit tests for Hook Data Extraction utilities
 */

import {
  extractReportData,
  formatNumber,
  formatProcessingTime,
  determineSuccessStatus,
  calculateFormattedMetrics,
  createMetricsSummary,
  validateHookData,
  createMockHookData,
  type HookExecutionData
} from '../hookDataExtraction';

describe('hookDataExtraction', () => {
  const baseTime = Date.now();
  
  const mockSuccessData: HookExecutionData = {
    initialErrorCount: 15,
    finalErrorCount: 0,
    iterationsUsed: 3,
    totalFixesApplied: 18,
    processingStartTime: baseTime,
    processingEndTime: baseTime + 2500, // 2.5 seconds
    success: true,
    errorCategories: {
      syntax: 6,
      type: 5,
      import: 3,
      config: 1,
      other: 0
    },
    fixesAppliedByCategory: {
      syntax: 7,
      type: 6,
      import: 3,
      config: 2,
      other: 0
    }
  };

  const mockPartialData: HookExecutionData = {
    initialErrorCount: 20,
    finalErrorCount: 5,
    iterationsUsed: 3, // Changed from 5 to avoid max iterations
    totalFixesApplied: 25,
    processingStartTime: baseTime,
    processingEndTime: baseTime + 8200, // 8.2 seconds
    success: false
  };

  describe('extractReportData', () => {
    it('should extract essential report data correctly', () => {
      const reportData = extractReportData(mockSuccessData);
      
      expect(reportData.initialErrorCount).toBe(15);
      expect(reportData.finalErrorCount).toBe(0);
      expect(reportData.iterationsUsed).toBe(3);
      expect(reportData.totalFixesApplied).toBe(18);
      expect(reportData.processingTimeSeconds).toBe(2.5);
      expect(reportData.success).toBe(true);
    });

    it('should handle very short processing times', () => {
      const quickData: HookExecutionData = {
        ...mockSuccessData,
        processingStartTime: baseTime,
        processingEndTime: baseTime + 50 // 0.05 seconds
      };
      
      const reportData = extractReportData(quickData);
      expect(reportData.processingTimeSeconds).toBe(0.1); // Minimum 0.1s
    });

    it('should handle zero processing time', () => {
      const instantData: HookExecutionData = {
        ...mockSuccessData,
        processingStartTime: baseTime,
        processingEndTime: baseTime // Same time
      };
      
      const reportData = extractReportData(instantData);
      expect(reportData.processingTimeSeconds).toBe(0.1); // Minimum 0.1s
    });
  });

  describe('formatNumber', () => {
    it('should format small numbers normally', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(5)).toBe('5');
      expect(formatNumber(99)).toBe('99');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format large numbers with k suffix', () => {
      expect(formatNumber(1000)).toBe('1.0k');
      expect(formatNumber(1500)).toBe('1.5k');
      expect(formatNumber(2000)).toBe('2.0k');
      expect(formatNumber(10000)).toBe('10.0k');
    });
  });

  describe('formatProcessingTime', () => {
    it('should format milliseconds for very short times', () => {
      expect(formatProcessingTime(0.1)).toBe('100ms');
      expect(formatProcessingTime(0.5)).toBe('500ms');
      expect(formatProcessingTime(0.999)).toBe('999ms');
    });

    it('should format seconds for medium times', () => {
      expect(formatProcessingTime(1.0)).toBe('1.0s');
      expect(formatProcessingTime(2.5)).toBe('2.5s');
      expect(formatProcessingTime(59.9)).toBe('59.9s');
    });

    it('should format minutes and seconds for long times', () => {
      expect(formatProcessingTime(60)).toBe('1m0s');
      expect(formatProcessingTime(65)).toBe('1m5s');
      expect(formatProcessingTime(125)).toBe('2m5s');
      expect(formatProcessingTime(3661)).toBe('61m1s');
    });
  });

  describe('determineSuccessStatus', () => {
    it('should identify full success', () => {
      const status = determineSuccessStatus(10, 0, false);
      
      expect(status.success).toBe(true);
      expect(status.requiresManualIntervention).toBe(false);
      expect(status.completionType).toBe('full-success');
    });

    it('should identify partial success with max iterations', () => {
      const status = determineSuccessStatus(10, 3, true);
      
      expect(status.success).toBe(false);
      expect(status.requiresManualIntervention).toBe(true);
      expect(status.completionType).toBe('max-iterations');
    });

    it('should identify no progress with max iterations', () => {
      const status = determineSuccessStatus(10, 10, true);
      
      expect(status.success).toBe(false);
      expect(status.requiresManualIntervention).toBe(true);
      expect(status.completionType).toBe('no-progress');
    });

    it('should identify partial success without max iterations', () => {
      const status = determineSuccessStatus(10, 3, false);
      
      expect(status.success).toBe(false);
      expect(status.requiresManualIntervention).toBe(true);
      expect(status.completionType).toBe('partial-success');
    });

    it('should handle zero initial errors', () => {
      const status = determineSuccessStatus(0, 0, false);
      
      expect(status.success).toBe(true);
      expect(status.requiresManualIntervention).toBe(false);
      expect(status.completionType).toBe('full-success');
    });
  });

  describe('calculateFormattedMetrics', () => {
    it('should calculate metrics for successful execution', () => {
      const metrics = calculateFormattedMetrics(mockSuccessData);
      
      expect(metrics.errorReductionPercentage).toBe(100); // 15/15 * 100
      expect(metrics.averageFixesPerIteration).toBe(6); // 18/3
      expect(metrics.processingTimeFormatted).toBe('2.5s');
      expect(metrics.successRate).toBe(100);
      expect(metrics.mostCommonErrorType).toBe('syntax'); // 6 syntax errors
    });

    it('should calculate metrics for partial success', () => {
      const metrics = calculateFormattedMetrics(mockPartialData);
      
      expect(metrics.errorReductionPercentage).toBe(75); // 15/20 * 100
      expect(metrics.averageFixesPerIteration).toBe(8.3); // 25/3 = 8.33, rounded to 8.3
      expect(metrics.processingTimeFormatted).toBe('8.2s');
      expect(metrics.successRate).toBe(75);
      expect(metrics.mostCommonErrorType).toBe('unknown'); // No categories provided
    });

    it('should handle zero initial errors', () => {
      const zeroErrorData: HookExecutionData = {
        ...mockSuccessData,
        initialErrorCount: 0,
        finalErrorCount: 0,
        totalFixesApplied: 0
      };
      
      const metrics = calculateFormattedMetrics(zeroErrorData);
      
      expect(metrics.errorReductionPercentage).toBe(0);
      expect(metrics.successRate).toBe(100);
    });

    it('should identify most common error type correctly', () => {
      const typeHeavyData: HookExecutionData = {
        ...mockSuccessData,
        errorCategories: {
          syntax: 2,
          type: 8, // Most common
          import: 1,
          config: 1,
          other: 0
        }
      };
      
      const metrics = calculateFormattedMetrics(typeHeavyData);
      expect(metrics.mostCommonErrorType).toBe('type');
    });
  });

  describe('createMetricsSummary', () => {
    it('should create summary for successful execution', () => {
      const summary = createMetricsSummary(mockSuccessData);
      
      expect(summary.keyMetrics).toContain('15 → 0 errors');
      expect(summary.keyMetrics).toContain('3 iterations');
      expect(summary.keyMetrics).toContain('2.5s');
      expect(summary.priorityInfo).toContain('All errors resolved');
    });

    it('should create summary for partial success', () => {
      const summary = createMetricsSummary(mockPartialData);
      
      expect(summary.keyMetrics).toContain('20 → 5 errors');
      expect(summary.keyMetrics).toContain('3 iterations');
      expect(summary.priorityInfo).toContain('5 errors remain');
    });

    it('should omit iterations for single iteration', () => {
      const singleIterationData: HookExecutionData = {
        ...mockSuccessData,
        iterationsUsed: 1
      };
      
      const summary = createMetricsSummary(singleIterationData);
      
      expect(summary.keyMetrics).not.toContain('1 iterations');
      expect(summary.keyMetrics).toContain('15 → 0 errors');
    });

    it('should omit processing time for quick executions', () => {
      const quickData: HookExecutionData = {
        ...mockSuccessData,
        processingStartTime: baseTime,
        processingEndTime: baseTime + 500 // 0.5 seconds
      };
      
      const summary = createMetricsSummary(quickData);
      
      expect(summary.keyMetrics).not.toContain('500ms');
      expect(summary.keyMetrics).toContain('15 → 0 errors');
    });
  });

  describe('validateHookData', () => {
    it('should validate complete valid data', () => {
      expect(validateHookData(mockSuccessData)).toBe(true);
    });

    it('should reject incomplete data', () => {
      const incompleteData = {
        initialErrorCount: 10,
        finalErrorCount: 0
        // Missing required fields
      };
      
      expect(validateHookData(incompleteData)).toBe(false);
    });

    it('should reject invalid number types', () => {
      const invalidData = {
        ...mockSuccessData,
        initialErrorCount: 'not a number'
      };
      
      expect(validateHookData(invalidData as any)).toBe(false);
    });

    it('should reject negative values', () => {
      const negativeData = {
        ...mockSuccessData,
        initialErrorCount: -5
      };
      
      expect(validateHookData(negativeData)).toBe(false);
    });

    it('should reject invalid time sequence', () => {
      const invalidTimeData = {
        ...mockSuccessData,
        processingStartTime: baseTime + 1000,
        processingEndTime: baseTime // End before start
      };
      
      expect(validateHookData(invalidTimeData)).toBe(false);
    });
  });

  describe('createMockHookData', () => {
    it('should create valid mock data with defaults', () => {
      const mockData = createMockHookData();
      
      expect(validateHookData(mockData)).toBe(true);
      expect(mockData.initialErrorCount).toBe(10);
      expect(mockData.finalErrorCount).toBe(0);
      expect(mockData.success).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const overrides = {
        initialErrorCount: 25,
        finalErrorCount: 5,
        success: false
      };
      
      const mockData = createMockHookData(overrides);
      
      expect(mockData.initialErrorCount).toBe(25);
      expect(mockData.finalErrorCount).toBe(5);
      expect(mockData.success).toBe(false);
      expect(mockData.iterationsUsed).toBe(2); // Default value preserved
    });

    it('should include error categories by default', () => {
      const mockData = createMockHookData();
      
      expect(mockData.errorCategories).toBeDefined();
      expect(mockData.fixesAppliedByCategory).toBeDefined();
      expect(mockData.errorCategories!.syntax).toBeGreaterThan(0);
    });
  });

  describe('Integration with reportTemplates', () => {
    it('should produce data compatible with report generation', () => {
      const reportData = extractReportData(mockSuccessData);
      
      // Verify all required fields are present and valid
      expect(typeof reportData.initialErrorCount).toBe('number');
      expect(typeof reportData.finalErrorCount).toBe('number');
      expect(typeof reportData.iterationsUsed).toBe('number');
      expect(typeof reportData.totalFixesApplied).toBe('number');
      expect(typeof reportData.processingTimeSeconds).toBe('number');
      expect(typeof reportData.success).toBe('boolean');
      
      // Verify values are reasonable
      expect(reportData.processingTimeSeconds).toBeGreaterThan(0);
      expect(reportData.initialErrorCount).toBeGreaterThanOrEqual(reportData.finalErrorCount);
    });
  });
});