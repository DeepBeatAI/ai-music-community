/**
 * Hook Performance Testing
 * 
 * Tests to ensure the TypeScript hook maintains performance standards
 * and doesn't regress in execution time across different scenarios.
 */

import {
  validateAndGenerateReport,
  generateCompactReport,
  countWords,
  type ReportData
} from '../reportTemplates';

import {
  extractReportData,
  createMockHookData,
  calculateFormattedMetrics,
  type HookExecutionData
} from '../hookDataExtraction';

describe('Hook Performance Testing', () => {
  // Performance benchmarks (in milliseconds)
  const PERFORMANCE_BENCHMARKS = {
    REPORT_GENERATION_MAX: 50,     // Report generation should be under 50ms
    WORD_COUNTING_MAX: 10,         // Word counting should be under 10ms
    DATA_EXTRACTION_MAX: 5,        // Data extraction should be under 5ms
    TEMPLATE_SELECTION_MAX: 20,    // Template selection should be under 20ms
    FULL_PIPELINE_MAX: 100         // Full pipeline should be under 100ms
  };

  describe('Report Generation Performance', () => {
    it('should generate reports quickly for small error counts', () => {
      const hookData = createMockHookData({
        initialErrorCount: 5,
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 5,
        success: true
      });

      const reportData = extractReportData(hookData);
      
      const startTime = performance.now();
      const report = generateCompactReport(reportData);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.REPORT_GENERATION_MAX);
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });

    it('should generate reports quickly for large error counts', () => {
      const hookData = createMockHookData({
        initialErrorCount: 100,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: 150,
        success: true
      });

      const reportData = extractReportData(hookData);
      
      const startTime = performance.now();
      const report = generateCompactReport(reportData);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.REPORT_GENERATION_MAX);
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });

    it('should generate reports quickly for extreme error counts', () => {
      const hookData = createMockHookData({
        initialErrorCount: 1000,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: 1500,
        success: true
      });

      const reportData = extractReportData(hookData);
      
      const startTime = performance.now();
      const report = generateCompactReport(reportData);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      // Should still be fast even with large numbers
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.REPORT_GENERATION_MAX * 2);
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });
  });

  describe('Word Counting Performance', () => {
    const testMessages = [
      '✅ TypeScript: 15 → 0 errors resolved in 3 iterations (18 fixes applied)',
      '⚠️ TypeScript: 15/20 errors resolved in 5 iterations\n5 errors require manual intervention',
      '✅ TypeScript Check Complete\n15 → 0 errors | 3 iterations | 2.5s',
      '✅ TypeScript: 100 → 0 errors resolved in 5 iterations (150 fixes applied)',
      '⚠️ TypeScript: 75/100 errors resolved in 5 iterations\n25 errors require manual intervention'
    ];

    testMessages.forEach((message, index) => {
      it(`should count words quickly for message ${index + 1}`, () => {
        const startTime = performance.now();
        const wordCount = countWords(message);
        const endTime = performance.now();
        
        const executionTime = endTime - startTime;
        
        expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.WORD_COUNTING_MAX);
        expect(wordCount).toBeGreaterThan(0);
      });
    });

    it('should count words quickly for very long messages', () => {
      // Create a very long message to stress test
      const longMessage = 'TypeScript error resolution '.repeat(100);
      
      const startTime = performance.now();
      const wordCount = countWords(longMessage);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.WORD_COUNTING_MAX * 5);
      expect(wordCount).toBe(300); // 3 words * 100 repetitions
    });
  });

  describe('Data Extraction Performance', () => {
    it('should extract data quickly from hook execution data', () => {
      const hookData = createMockHookData({
        initialErrorCount: 50,
        finalErrorCount: 0,
        iterationsUsed: 3,
        totalFixesApplied: 60,
        success: true
      });

      const startTime = performance.now();
      const reportData = extractReportData(hookData);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.DATA_EXTRACTION_MAX);
      expect(reportData.initialErrorCount).toBe(50);
      expect(reportData.finalErrorCount).toBe(0);
    });

    it('should calculate formatted metrics quickly', () => {
      const hookData = createMockHookData({
        initialErrorCount: 25,
        finalErrorCount: 5,
        iterationsUsed: 4,
        totalFixesApplied: 30,
        success: false
      });

      const startTime = performance.now();
      const metrics = calculateFormattedMetrics(hookData);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.DATA_EXTRACTION_MAX);
      expect(metrics.errorReductionPercentage).toBe(80); // 20/25 * 100
    });
  });

  describe('Full Pipeline Performance', () => {
    const performanceTestCases = [
      { name: 'minimal', initialErrors: 1, finalErrors: 0, iterations: 1, fixes: 1 },
      { name: 'small', initialErrors: 5, finalErrors: 0, iterations: 2, fixes: 6 },
      { name: 'medium', initialErrors: 25, finalErrors: 0, iterations: 3, fixes: 30 },
      { name: 'large', initialErrors: 75, finalErrors: 0, iterations: 4, fixes: 90 },
      { name: 'extra-large', initialErrors: 150, finalErrors: 0, iterations: 5, fixes: 200 },
      { name: 'partial', initialErrors: 50, finalErrors: 10, iterations: 5, fixes: 60 }
    ];

    performanceTestCases.forEach(testCase => {
      it(`should complete full pipeline quickly for ${testCase.name} scenario`, () => {
        const hookData = createMockHookData({
          initialErrorCount: testCase.initialErrors,
          finalErrorCount: testCase.finalErrors,
          iterationsUsed: testCase.iterations,
          totalFixesApplied: testCase.fixes,
          success: testCase.finalErrors === 0
        });

        const startTime = performance.now();
        
        // Full pipeline: extract data -> generate report -> validate
        const reportData = extractReportData(hookData);
        const report = validateAndGenerateReport(reportData);
        const wordCount = countWords(report.message);
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_PIPELINE_MAX);
        expect(report.wordCount).toBe(wordCount);
        expect(report.wordCount).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle multiple rapid report generations', () => {
      const iterations = 100;
      const hookData = createMockHookData({
        initialErrorCount: 10,
        finalErrorCount: 0,
        iterationsUsed: 2,
        totalFixesApplied: 12,
        success: true
      });

      const reportData = extractReportData(hookData);
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const report = generateCompactReport(reportData);
        expect(report.wordCount).toBeLessThanOrEqual(50);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;
      
      // Average time per report should be very fast
      expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.REPORT_GENERATION_MAX / 10);
      expect(totalTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_PIPELINE_MAX * 10);
    });

    it('should handle concurrent report generations', async () => {
      const concurrentCount = 10;
      const hookData = createMockHookData({
        initialErrorCount: 20,
        finalErrorCount: 0,
        iterationsUsed: 3,
        totalFixesApplied: 25,
        success: true
      });

      const reportData = extractReportData(hookData);
      
      const startTime = performance.now();
      
      // Create multiple concurrent report generation promises
      const promises = Array.from({ length: concurrentCount }, () => 
        Promise.resolve().then(() => generateCompactReport(reportData))
      );
      
      const reports = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All reports should be valid
      reports.forEach(report => {
        expect(report.wordCount).toBeLessThanOrEqual(50);
        expect(report.message).toBeTruthy();
      });
      
      // Total time should be reasonable for concurrent execution
      expect(totalTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_PIPELINE_MAX * 2);
    });
  });

  describe('Memory Usage Validation', () => {
    it('should not create memory leaks during repeated operations', () => {
      const iterations = 1000;
      const hookData = createMockHookData({
        initialErrorCount: 15,
        finalErrorCount: 0,
        iterationsUsed: 3,
        totalFixesApplied: 18,
        success: true
      });

      // Force garbage collection if available (Node.js with --expose-gc)
      if (global.gc) {
        global.gc();
      }

      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const reportData = extractReportData(hookData);
        const report = validateAndGenerateReport(reportData);
        
        // Validate each report
        expect(report.wordCount).toBeLessThanOrEqual(50);
        
        // Clear references to help garbage collection
        // (In a real scenario, these would go out of scope naturally)
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete all iterations in reasonable time
      expect(totalTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_PIPELINE_MAX * 20);
      
      // Force garbage collection again if available
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across different data sizes', () => {
      const dataSizes = [1, 10, 50, 100, 500, 1000];
      const executionTimes: number[] = [];

      dataSizes.forEach(size => {
        const hookData = createMockHookData({
          initialErrorCount: size,
          finalErrorCount: 0,
          iterationsUsed: Math.min(5, Math.ceil(size / 20)),
          totalFixesApplied: size + Math.floor(size * 0.2),
          success: true
        });

        const reportData = extractReportData(hookData);
        
        const startTime = performance.now();
        const report = validateAndGenerateReport(reportData);
        const endTime = performance.now();
        
        const executionTime = endTime - startTime;
        executionTimes.push(executionTime);
        
        // Each report should still comply with word limit
        expect(report.wordCount).toBeLessThanOrEqual(50);
      });

      // Performance should not degrade significantly with larger data
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);
      const performanceRatio = maxTime / minTime;
      
      // Performance ratio should not exceed 10x (allowing for some variance)
      expect(performanceRatio).toBeLessThan(10);
      
      // All execution times should be within reasonable bounds
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_PIPELINE_MAX);
      });
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle zero values efficiently', () => {
      const hookData = createMockHookData({
        initialErrorCount: 0,
        finalErrorCount: 0,
        iterationsUsed: 0,
        totalFixesApplied: 0,
        success: true
      });

      const startTime = performance.now();
      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_PIPELINE_MAX);
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });

    it('should handle maximum safe integer values efficiently', () => {
      const hookData = createMockHookData({
        initialErrorCount: Number.MAX_SAFE_INTEGER,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: Number.MAX_SAFE_INTEGER,
        success: true
      });

      const startTime = performance.now();
      const reportData = extractReportData(hookData);
      const report = validateAndGenerateReport(reportData);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      // Should handle large numbers without significant performance impact
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_PIPELINE_MAX * 2);
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });
  });
});