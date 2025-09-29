/**
 * Hook Validation Script
 * 
 * Comprehensive validation script to test TypeScript hook with various error scenarios
 * and validate compliance with requirements.
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
  calculateFormattedMetrics,
  type HookExecutionData
} from '../hookDataExtraction';

interface ValidationResult {
  scenario: string;
  passed: boolean;
  wordCount: number;
  message: string;
  executionTime: number;
  errors: string[];
}

interface ValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
  overallCompliance: boolean;
}

/**
 * Validates a single hook scenario
 */
function validateScenario(
  scenario: string,
  hookData: HookExecutionData,
  config: ReportingConfig = DEFAULT_REPORTING_CONFIG
): ValidationResult {
  const errors: string[] = [];
  const startTime = performance.now();
  
  try {
    // Validate hook data
    if (!validateHookData(hookData)) {
      errors.push('Invalid hook execution data');
    }
    
    // Extract report data
    const reportData = extractReportData(hookData);
    
    // Generate report
    const report = validateAndGenerateReport(reportData, config);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Validate 50-word limit compliance
    if (report.wordCount > 50) {
      errors.push(`Word count exceeds limit: ${report.wordCount} > 50`);
    }
    
    // Validate word count accuracy
    const manualCount = countWords(report.message);
    if (report.wordCount !== manualCount) {
      errors.push(`Word count mismatch: reported ${report.wordCount}, actual ${manualCount}`);
    }
    
    // Validate essential information preservation
    if (hookData.initialErrorCount > 0 && !report.message.match(new RegExp(hookData.initialErrorCount.toString()))) {
      errors.push('Initial error count not preserved in report');
    }
    
    if (hookData.iterationsUsed > 0 && !report.message.match(new RegExp(hookData.iterationsUsed.toString()))) {
      errors.push('Iteration count not preserved in report');
    }
    
    if (hookData.success && !report.message.match(/✅|success|complete/i)) {
      errors.push('Success status not indicated in report');
    }
    
    if (!hookData.success && !report.message.match(/⚠️|manual|intervention|remain/i)) {
      errors.push('Failure status not indicated in report');
    }
    
    // Validate message is not empty
    if (!report.message.trim()) {
      errors.push('Generated report message is empty');
    }
    
    // Validate performance (should be under 100ms)
    if (executionTime > 100) {
      errors.push(`Execution time too slow: ${executionTime.toFixed(2)}ms > 100ms`);
    }
    
    return {
      scenario,
      passed: errors.length === 0,
      wordCount: report.wordCount,
      message: report.message,
      executionTime,
      errors
    };
    
  } catch (error) {
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    errors.push(`Exception during validation: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      scenario,
      passed: false,
      wordCount: 0,
      message: '',
      executionTime,
      errors
    };
  }
}

/**
 * Runs comprehensive validation tests
 */
export function runHookValidation(): ValidationSummary {
  const results: ValidationResult[] = [];
  
  // Test scenarios as specified in the requirements
  const testScenarios: Array<{ name: string; hookData: HookExecutionData }> = [
    // 0 errors scenario
    {
      name: '0 errors scenario',
      hookData: createMockHookData({
        initialErrorCount: 0,
        finalErrorCount: 0,
        iterationsUsed: 0,
        totalFixesApplied: 0,
        success: true
      })
    },
    
    // 1 error scenario
    {
      name: '1 error scenario',
      hookData: createMockHookData({
        initialErrorCount: 1,
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 1,
        success: true
      })
    },
    
    // 10 errors scenario
    {
      name: '10 errors scenario',
      hookData: createMockHookData({
        initialErrorCount: 10,
        finalErrorCount: 0,
        iterationsUsed: 2,
        totalFixesApplied: 12,
        success: true
      })
    },
    
    // 50+ errors scenario
    {
      name: '50+ errors scenario',
      hookData: createMockHookData({
        initialErrorCount: 75,
        finalErrorCount: 0,
        iterationsUsed: 4,
        totalFixesApplied: 89,
        success: true
      })
    },
    
    // Extreme error count
    {
      name: 'Extreme error count (200+)',
      hookData: createMockHookData({
        initialErrorCount: 250,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: 300,
        success: true
      })
    },
    
    // Partial success scenarios
    {
      name: 'Partial success (some errors remain)',
      hookData: createMockHookData({
        initialErrorCount: 30,
        finalErrorCount: 8,
        iterationsUsed: 5,
        totalFixesApplied: 35,
        success: false
      })
    },
    
    // No progress scenario
    {
      name: 'No progress (max iterations reached)',
      hookData: createMockHookData({
        initialErrorCount: 15,
        finalErrorCount: 15,
        iterationsUsed: 5,
        totalFixesApplied: 0,
        success: false
      })
    },
    
    // Edge cases
    {
      name: 'Maximum safe integer values',
      hookData: createMockHookData({
        initialErrorCount: Number.MAX_SAFE_INTEGER,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: Number.MAX_SAFE_INTEGER,
        success: true
      })
    },
    
    // Quick execution
    {
      name: 'Very quick execution',
      hookData: createMockHookData({
        initialErrorCount: 3,
        finalErrorCount: 0,
        iterationsUsed: 1,
        totalFixesApplied: 3,
        processingStartTime: Date.now() - 100,
        processingEndTime: Date.now(),
        success: true
      })
    },
    
    // Long execution
    {
      name: 'Long execution time',
      hookData: createMockHookData({
        initialErrorCount: 50,
        finalErrorCount: 0,
        iterationsUsed: 5,
        totalFixesApplied: 65,
        processingStartTime: Date.now() - 30000, // 30 seconds
        processingEndTime: Date.now(),
        success: true
      })
    }
  ];
  
  // Run validation for each scenario
  testScenarios.forEach(({ name, hookData }) => {
    const result = validateScenario(name, hookData);
    results.push(result);
  });
  
  // Test with restrictive word limits
  const restrictiveConfigs: Array<{ name: string; config: ReportingConfig }> = [
    {
      name: 'Very restrictive (10 words)',
      config: { ...DEFAULT_REPORTING_CONFIG, maxWords: 10 }
    },
    {
      name: 'Extremely restrictive (5 words)',
      config: { ...DEFAULT_REPORTING_CONFIG, maxWords: 5 }
    },
    {
      name: 'Nearly impossible (2 words)',
      config: { ...DEFAULT_REPORTING_CONFIG, maxWords: 2 }
    }
  ];
  
  restrictiveConfigs.forEach(({ name, config }) => {
    const hookData = createMockHookData({
      initialErrorCount: 25,
      finalErrorCount: 0,
      iterationsUsed: 3,
      totalFixesApplied: 30,
      success: true
    });
    
    const result = validateScenario(`Restrictive config: ${name}`, hookData, config);
    results.push(result);
  });
  
  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const overallCompliance = failed === 0;
  
  return {
    totalTests: results.length,
    passed,
    failed,
    results,
    overallCompliance
  };
}

/**
 * Prints validation results to console
 */
export function printValidationResults(summary: ValidationSummary): void {
  console.log('\n=== TypeScript Hook Validation Results ===\n');
  
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Overall Compliance: ${summary.overallCompliance ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (summary.failed > 0) {
    console.log('=== Failed Tests ===\n');
    summary.results
      .filter(r => !r.passed)
      .forEach(result => {
        console.log(`❌ ${result.scenario}`);
        console.log(`   Word Count: ${result.wordCount}`);
        console.log(`   Execution Time: ${result.executionTime.toFixed(2)}ms`);
        console.log(`   Message: "${result.message}"`);
        console.log(`   Errors:`);
        result.errors.forEach(error => console.log(`     - ${error}`));
        console.log('');
      });
  }
  
  console.log('=== Passed Tests Summary ===\n');
  summary.results
    .filter(r => r.passed)
    .forEach(result => {
      console.log(`✅ ${result.scenario}`);
      console.log(`   Word Count: ${result.wordCount}/50`);
      console.log(`   Execution Time: ${result.executionTime.toFixed(2)}ms`);
      console.log(`   Message: "${result.message}"`);
      console.log('');
    });
  
  // Performance statistics
  const executionTimes = summary.results.map(r => r.executionTime);
  const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
  const maxTime = Math.max(...executionTimes);
  const minTime = Math.min(...executionTimes);
  
  console.log('=== Performance Statistics ===\n');
  console.log(`Average Execution Time: ${avgTime.toFixed(2)}ms`);
  console.log(`Maximum Execution Time: ${maxTime.toFixed(2)}ms`);
  console.log(`Minimum Execution Time: ${minTime.toFixed(2)}ms`);
  
  // Word count statistics
  const wordCounts = summary.results.map(r => r.wordCount);
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const maxWords = Math.max(...wordCounts);
  const minWords = Math.min(...wordCounts);
  
  console.log(`Average Word Count: ${avgWords.toFixed(1)}`);
  console.log(`Maximum Word Count: ${maxWords}`);
  console.log(`Minimum Word Count: ${minWords}`);
  
  console.log(`\n50-Word Limit Compliance: ${wordCounts.every(count => count <= 50) ? '✅ ALL COMPLIANT' : '❌ VIOLATIONS FOUND'}`);
}

/**
 * Runs validation and returns results for programmatic use
 */
export function validateHookCompliance(): boolean {
  const summary = runHookValidation();
  return summary.overallCompliance;
}

// Export for use in tests
export { validateScenario };

// If run directly, execute validation
if (require.main === module) {
  const summary = runHookValidation();
  printValidationResults(summary);
  
  // Exit with appropriate code
  process.exit(summary.overallCompliance ? 0 : 1);
}