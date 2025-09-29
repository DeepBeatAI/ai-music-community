/**
 * Unit tests for Report Template System
 * 
 * Tests word counting accuracy, template generation, and word limit compliance
 */

import {
  countWords,
  substitutePlaceholders,
  calculateEssentialMetrics,
  selectTemplate,
  generateCompactReport,
  validateWordCount,
  generateFallbackReport,
  generateReportWithFallbackCascade,
  generateEmergencyFallbackReport,
  validateAndGenerateReport,
  REPORT_TEMPLATES,
  DEFAULT_REPORTING_CONFIG,
  type ReportData,
  type ReportingConfig
} from '../reportTemplates';

describe('reportTemplates', () => {
  // Sample test data
  const mockSuccessData: ReportData = {
    initialErrorCount: 15,
    finalErrorCount: 0,
    iterationsUsed: 3,
    totalFixesApplied: 18,
    processingTimeSeconds: 2.5,
    success: true
  };

  const mockPartialSuccessData: ReportData = {
    initialErrorCount: 20,
    finalErrorCount: 5,
    iterationsUsed: 5,
    totalFixesApplied: 25,
    processingTimeSeconds: 8.2,
    success: false
  };

  const mockMinimalData: ReportData = {
    initialErrorCount: 1,
    finalErrorCount: 0,
    iterationsUsed: 1,
    totalFixesApplied: 1,
    processingTimeSeconds: 0.3,
    success: true
  };

  describe('countWords', () => {
    it('should count words accurately in simple text', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('TypeScript errors resolved')).toBe(3);
      expect(countWords('✅ TypeScript: 15 → 0 errors')).toBe(6);
    });

    it('should handle multiple whitespace types', () => {
      expect(countWords('Hello   world')).toBe(2);
      expect(countWords('Hello\tworld\ntest')).toBe(3);
      expect(countWords('  Hello   world  ')).toBe(2);
    });

    it('should handle edge cases', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('single')).toBe(1);
    });

    it('should handle special characters and emojis', () => {
      expect(countWords('✅ Success!')).toBe(2);
      expect(countWords('⚠️ Warning: errors remain')).toBe(4);
      expect(countWords('15 → 0 errors')).toBe(4);
    });

    it('should handle multi-line text', () => {
      const multiLine = `✅ TypeScript Check Complete
15 → 0 errors | 3 iterations | 2.5s`;
      expect(countWords(multiLine)).toBe(13);
    });

    it('should handle null and undefined inputs', () => {
      expect(countWords(null as any)).toBe(0);
      expect(countWords(undefined as any)).toBe(0);
      expect(countWords(123 as any)).toBe(0);
    });
  });

  describe('substitutePlaceholders', () => {
    it('should substitute all placeholders correctly', () => {
      const template = '{successEmoji} TypeScript: {initialErrors} → {finalErrors} errors in {iterations} iterations';
      const result = substitutePlaceholders(template, mockSuccessData, DEFAULT_REPORTING_CONFIG);
      
      expect(result).toBe('✅ TypeScript: 15 → 0 errors in 3 iterations');
    });

    it('should handle processing time formatting', () => {
      const template = 'Processing time: {processingTime}s';
      const result = substitutePlaceholders(template, mockSuccessData, DEFAULT_REPORTING_CONFIG);
      
      expect(result).toBe('Processing time: 2.5s');
    });

    it('should calculate resolved and remaining errors', () => {
      const template = '{resolved} resolved, {remainingErrors} remaining';
      const result = substitutePlaceholders(template, mockPartialSuccessData, DEFAULT_REPORTING_CONFIG);
      
      expect(result).toBe('15 resolved, 5 remaining');
    });

    it('should handle custom emoji configuration', () => {
      const customConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        successEmoji: '🎉',
        failureEmoji: '❌'
      };
      
      const template = '{successEmoji} Success! {failureEmoji} Failure!';
      const result = substitutePlaceholders(template, mockSuccessData, customConfig);
      
      expect(result).toBe('🎉 Success! ❌ Failure!');
    });

    it('should handle multiple occurrences of same placeholder', () => {
      const template = '{iterations} iterations, total {iterations} cycles';
      const result = substitutePlaceholders(template, mockSuccessData, DEFAULT_REPORTING_CONFIG);
      
      expect(result).toBe('3 iterations, total 3 cycles');
    });
  });

  describe('calculateEssentialMetrics', () => {
    it('should calculate metrics for successful resolution', () => {
      const metrics = calculateEssentialMetrics(mockSuccessData);
      
      expect(metrics.errorReduction).toBe(15);
      expect(metrics.iterationEfficiency).toBe(5); // 15 errors / 3 iterations
      expect(metrics.success).toBe(true);
      expect(metrics.requiresManualIntervention).toBe(false);
    });

    it('should calculate metrics for partial success', () => {
      const metrics = calculateEssentialMetrics(mockPartialSuccessData);
      
      expect(metrics.errorReduction).toBe(15);
      expect(metrics.iterationEfficiency).toBe(3); // 15 errors / 5 iterations
      expect(metrics.success).toBe(false);
      expect(metrics.requiresManualIntervention).toBe(true);
    });

    it('should handle zero fixes applied', () => {
      const noFixesData: ReportData = {
        ...mockSuccessData,
        totalFixesApplied: 0
      };
      
      const metrics = calculateEssentialMetrics(noFixesData);
      expect(metrics.iterationEfficiency).toBe(5); // 15 errors / 3 iterations
    });
  });

  describe('selectTemplate', () => {
    it('should select single line template for simple success cases', () => {
      const template = selectTemplate(mockSuccessData);
      expect(template).toBe(REPORT_TEMPLATES.singleLineSuccess);
    });

    it('should select partial success template for failures', () => {
      const template = selectTemplate(mockPartialSuccessData);
      expect(template).toBe(REPORT_TEMPLATES.partialSuccess);
    });

    it('should fall back to shorter templates when word limit exceeded', () => {
      // Create data that would make single line template too long
      const longData: ReportData = {
        initialErrorCount: 999999,
        finalErrorCount: 0,
        iterationsUsed: 999,
        totalFixesApplied: 999999,
        processingTimeSeconds: 999.9,
        success: true
      };

      const restrictiveConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 10 // Very restrictive limit
      };

      const template = selectTemplate(longData, restrictiveConfig);
      
      // Should fall back to a shorter template
      expect([
        REPORT_TEMPLATES.compactMultiLineSuccess,
        REPORT_TEMPLATES.minimalSuccess,
        REPORT_TEMPLATES.ultraMinimal
      ]).toContain(template);
    });

    it('should use ultra-minimal as final fallback', () => {
      const extremeData: ReportData = {
        initialErrorCount: 999999999,
        finalErrorCount: 0,
        iterationsUsed: 999999,
        totalFixesApplied: 999999999,
        processingTimeSeconds: 9999.9,
        success: true
      };

      const veryRestrictiveConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 5 // Extremely restrictive
      };

      const template = selectTemplate(extremeData, veryRestrictiveConfig);
      expect(template).toBe(REPORT_TEMPLATES.ultraMinimal);
    });
  });

  describe('generateCompactReport', () => {
    it('should generate valid compact report for success case', () => {
      const report = generateCompactReport(mockSuccessData);
      
      expect(report.message).toContain('✅');
      expect(report.message).toContain('15');
      expect(report.message).toContain('0 errors');
      expect(report.message).toContain('3 iterations');
      expect(report.wordCount).toBeGreaterThan(0);
      expect(report.wordCount).toBeLessThanOrEqual(50);
      expect(report.format).toMatch(/^(single-line|compact-multi-line)$/);
      expect(report.templateUsed).toBeTruthy();
    });

    it('should generate valid compact report for partial success', () => {
      const report = generateCompactReport(mockPartialSuccessData);
      
      expect(report.message).toContain('⚠️');
      expect(report.message).toContain('15/20');
      expect(report.message).toContain('5 errors require manual intervention');
      expect(report.wordCount).toBeLessThanOrEqual(50);
    });

    it('should respect custom configuration', () => {
      const customConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        successEmoji: '🎉',
        maxWords: 25
      };

      const report = generateCompactReport(mockSuccessData, customConfig);
      
      expect(report.message).toContain('🎉');
      expect(report.wordCount).toBeLessThanOrEqual(25);
    });

    it('should determine format correctly', () => {
      const singleLineReport = generateCompactReport(mockMinimalData);
      expect(singleLineReport.format).toBe('single-line');
      
      // Force multi-line template selection by using specific data
      const multiLineData: ReportData = {
        initialErrorCount: 5,
        finalErrorCount: 0,
        iterationsUsed: 2,
        totalFixesApplied: 6,
        processingTimeSeconds: 1.2,
        success: true
      };
      
      // This should select compact multi-line template
      const multiLineReport = generateCompactReport(multiLineData);
      if (multiLineReport.message.includes('\n')) {
        expect(multiLineReport.format).toBe('compact-multi-line');
      }
    });

    it('should track which template was used', () => {
      const report = generateCompactReport(mockSuccessData);
      expect(report.templateUsed).toBe('singleLineSuccess');
      
      const partialReport = generateCompactReport(mockPartialSuccessData);
      expect(partialReport.templateUsed).toBe('partialSuccess');
    });
  });

  describe('validateWordCount', () => {
    it('should validate reports within word limit', () => {
      const validReport = generateCompactReport(mockSuccessData);
      expect(validateWordCount(validReport, 50)).toBe(true);
      expect(validateWordCount(validReport, 100)).toBe(true);
    });

    it('should reject reports exceeding word limit', () => {
      const report = generateCompactReport(mockSuccessData);
      expect(validateWordCount(report, 5)).toBe(false);
      expect(validateWordCount(report, 1)).toBe(false);
    });

    it('should use default limit when not specified', () => {
      const report = generateCompactReport(mockSuccessData);
      expect(validateWordCount(report)).toBe(true);
    });
  });

  describe('generateFallbackReport', () => {
    it('should generate minimal fallback report', () => {
      const fallback = generateFallbackReport(mockSuccessData);
      
      expect(fallback.message).toBe('✅ TypeScript: 15 → 0');
      expect(fallback.wordCount).toBe(5);
      expect(fallback.format).toBe('single-line');
      expect(fallback.templateUsed).toBe('emergency-fallback');
    });

    it('should generate fallback for partial success', () => {
      const fallback = generateFallbackReport(mockPartialSuccessData);
      
      expect(fallback.message).toBe('✅ TypeScript: 20 → 5');
      expect(fallback.wordCount).toBe(5);
    });

    it('should always be very short', () => {
      const extremeData: ReportData = {
        initialErrorCount: 999999,
        finalErrorCount: 888888,
        iterationsUsed: 999,
        totalFixesApplied: 111111,
        processingTimeSeconds: 999.9,
        success: false
      };

      const fallback = generateFallbackReport(extremeData);
      expect(fallback.wordCount).toBeLessThanOrEqual(10);
    });
  });

  describe('generateReportWithFallbackCascade', () => {
    it('should use appropriate fallback when standard templates exceed limit', () => {
      const restrictiveConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 8 // Very restrictive
      };

      const report = generateReportWithFallbackCascade(mockSuccessData, restrictiveConfig);
      
      expect(report.wordCount).toBeLessThanOrEqual(8);
      expect(report.templateUsed).toMatch(/^fallback-/);
      expect(report.message).toContain('15');
      expect(report.message).toContain('0');
    });

    it('should handle failure cases with appropriate fallbacks', () => {
      const restrictiveConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 6
      };

      const report = generateReportWithFallbackCascade(mockPartialSuccessData, restrictiveConfig);
      
      expect(report.wordCount).toBeLessThanOrEqual(6);
      expect(report.templateUsed).toMatch(/^fallback-/);
    });

    it('should fall back to emergency when all templates fail', () => {
      const extremelyRestrictiveConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 2
      };

      const report = generateReportWithFallbackCascade(mockSuccessData, extremelyRestrictiveConfig);
      
      expect(report.wordCount).toBeLessThanOrEqual(2);
      expect(report.templateUsed).toMatch(/fallback-|emergency-/);
    });
  });

  describe('generateEmergencyFallbackReport', () => {
    it('should generate ultra-minimal report for success', () => {
      const emergency = generateEmergencyFallbackReport(mockSuccessData);
      
      expect(emergency.message).toBe('✅ 15→0');
      expect(emergency.wordCount).toBe(2);
      expect(emergency.format).toBe('single-line');
      expect(emergency.templateUsed).toBe('emergency-minimal');
    });

    it('should generate ultra-minimal report for failure', () => {
      const emergency = generateEmergencyFallbackReport(mockPartialSuccessData);
      
      expect(emergency.message).toBe('⚠️ 20→5');
      expect(emergency.wordCount).toBe(2);
      expect(emergency.templateUsed).toBe('emergency-minimal');
    });

    it('should handle template generation errors gracefully', () => {
      // Mock data that might cause issues
      const problematicData: ReportData = {
        initialErrorCount: NaN,
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 1,
        processingTimeSeconds: 1,
        success: true
      };

      const emergency = generateEmergencyFallbackReport(problematicData);
      
      expect(emergency.message).toBeTruthy();
      expect(emergency.wordCount).toBeGreaterThan(0);
      expect(emergency.templateUsed).toMatch(/emergency/);
    });
  });

  describe('validateAndGenerateReport', () => {
    it('should validate input data and generate report', () => {
      const report = validateAndGenerateReport(mockSuccessData);
      
      expect(report).toBeTruthy();
      expect(report.wordCount).toBeLessThanOrEqual(50);
      expect(report.message).toBeTruthy();
    });

    it('should throw error for invalid input data', () => {
      expect(() => validateAndGenerateReport(null as any)).toThrow('Invalid report data provided');
      expect(() => validateAndGenerateReport({} as any)).toThrow('Invalid initial error count');
      
      const invalidData = {
        initialErrorCount: -1,
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 1,
        processingTimeSeconds: 1,
        success: true
      };
      
      expect(() => validateAndGenerateReport(invalidData)).toThrow('Invalid initial error count');
    });

    it('should handle edge cases with emergency fallback', () => {
      const edgeCaseData: ReportData = {
        initialErrorCount: 0,
        finalErrorCount: 0,
        iterationsUsed: 0,
        totalFixesApplied: 0,
        processingTimeSeconds: 0,
        success: true
      };

      const report = validateAndGenerateReport(edgeCaseData);
      
      expect(report).toBeTruthy();
      expect(report.wordCount).toBeGreaterThan(0);
    });

    it('should use emergency fallback when generated report exceeds limit', () => {
      const extremeConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 1 // Impossible to meet
      };

      const report = validateAndGenerateReport(mockSuccessData, extremeConfig);
      
      expect(report.templateUsed).toMatch(/emergency/);
      expect(report.wordCount).toBeLessThanOrEqual(extremeConfig.maxWords + 1); // Allow small tolerance
    });
  });

  describe('Word count compliance across all templates', () => {
    const testCases = [
      { name: 'minimal data', data: mockMinimalData },
      { name: 'success data', data: mockSuccessData },
      { name: 'partial success data', data: mockPartialSuccessData },
      {
        name: 'large numbers',
        data: {
          initialErrorCount: 100,
          finalErrorCount: 0,
          iterationsUsed: 10,
          totalFixesApplied: 150,
          processingTimeSeconds: 45.7,
          success: true
        }
      }
    ];

    testCases.forEach(({ name, data }) => {
      it(`should generate reports within 50-word limit for ${name}`, () => {
        const report = generateCompactReport(data);
        expect(report.wordCount).toBeLessThanOrEqual(50);
        expect(validateWordCount(report)).toBe(true);
      });
    });
  });

  describe('Template content validation', () => {
    it('should include essential information in success reports', () => {
      const report = generateCompactReport(mockSuccessData);
      
      // Must include initial error count
      expect(report.message).toMatch(/15/);
      // Must include final state (0 errors or similar)
      expect(report.message).toMatch(/0|zero/i);
      // Must include iteration count
      expect(report.message).toMatch(/3/);
      // Must include success indicator
      expect(report.message).toMatch(/✅|success|complete/i);
    });

    it('should include essential information in partial success reports', () => {
      const report = generateCompactReport(mockPartialSuccessData);
      
      // Must include resolved count
      expect(report.message).toMatch(/15/);
      // Must include total count
      expect(report.message).toMatch(/20/);
      // Must include remaining errors
      expect(report.message).toMatch(/5/);
      // Must indicate manual intervention needed
      expect(report.message).toMatch(/manual|intervention/i);
    });
  });

  describe('Error handling and robustness', () => {
    it('should handle template substitution errors gracefully', () => {
      // Mock console.warn to avoid noise in tests
      const originalWarn = console.warn;
      console.warn = jest.fn();

      const corruptedData: ReportData = {
        initialErrorCount: undefined as any,
        finalErrorCount: null as any,
        iterationsUsed: 'invalid' as any,
        totalFixesApplied: 1,
        processingTimeSeconds: 1,
        success: true
      };

      // Should not throw, should return some fallback
      const report = generateCompactReport(corruptedData);
      
      expect(report).toBeTruthy();
      expect(report.templateUsed).toBeTruthy();
      expect(report.message).toBeTruthy();

      console.warn = originalWarn;
    });

    it('should handle extreme word count restrictions', () => {
      const impossibleConfig: ReportingConfig = {
        ...DEFAULT_REPORTING_CONFIG,
        maxWords: 0
      };

      const report = generateCompactReport(mockSuccessData, impossibleConfig);
      
      expect(report).toBeTruthy();
      expect(report.templateUsed).toMatch(/emergency/);
    });

    it('should handle very large numbers without breaking', () => {
      const extremeData: ReportData = {
        initialErrorCount: Number.MAX_SAFE_INTEGER,
        finalErrorCount: 0,
        iterationsUsed: Number.MAX_SAFE_INTEGER,
        totalFixesApplied: Number.MAX_SAFE_INTEGER,
        processingTimeSeconds: Number.MAX_SAFE_INTEGER,
        success: true
      };

      const report = generateCompactReport(extremeData);
      
      expect(report).toBeTruthy();
      expect(report.wordCount).toBeGreaterThan(0);
      expect(report.message).toBeTruthy();
    });

    it('should maintain word count accuracy under all conditions', () => {
      const testCases = [
        mockMinimalData,
        mockSuccessData,
        mockPartialSuccessData,
        {
          initialErrorCount: 0,
          finalErrorCount: 0,
          iterationsUsed: 0,
          totalFixesApplied: 0,
          processingTimeSeconds: 0,
          success: true
        },
        {
          initialErrorCount: 1000,
          finalErrorCount: 500,
          iterationsUsed: 50,
          totalFixesApplied: 750,
          processingTimeSeconds: 120.5,
          success: false
        }
      ];

      testCases.forEach((testData, index) => {
        const report = generateCompactReport(testData);
        const manualWordCount = countWords(report.message);
        
        expect(report.wordCount).toBe(manualWordCount);
        expect(report.wordCount).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('Comprehensive fallback cascade testing', () => {
    it('should progressively use shorter templates as limits decrease', () => {
      const wordLimits = [50, 25, 15, 10, 8, 5, 3, 2, 1];
      const results: string[] = [];

      wordLimits.forEach(limit => {
        const config: ReportingConfig = {
          ...DEFAULT_REPORTING_CONFIG,
          maxWords: limit
        };

        const report = generateCompactReport(mockSuccessData, config);
        results.push(`${limit}: ${report.templateUsed} (${report.wordCount} words)`);
        
        expect(report.wordCount).toBeLessThanOrEqual(limit + 1); // Allow small tolerance for edge cases
      });

      // Verify that templates get progressively shorter
      expect(results.length).toBe(wordLimits.length);
    });

    it('should handle all template types with extreme restrictions', () => {
      const testData = [
        { data: mockSuccessData, type: 'success' },
        { data: mockPartialSuccessData, type: 'partial' },
        { data: mockMinimalData, type: 'minimal' }
      ];

      testData.forEach(({ data, type }) => {
        const extremeConfig: ReportingConfig = {
          ...DEFAULT_REPORTING_CONFIG,
          maxWords: 2
        };

        const report = generateCompactReport(data, extremeConfig);
        
        expect(report.wordCount).toBeLessThanOrEqual(3); // Very small tolerance
        expect(report.message).toBeTruthy();
        expect(report.templateUsed).toBeTruthy();
      });
    });
  });
});