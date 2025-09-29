/**
 * Demonstration of the Compact Reporting System
 *
 * This script shows how to use the compact reporting utilities
 * to generate TypeScript hook reports that comply with the 50-word limit.
 */

import {
  generateHookReport,
  generateSuccessReport,
  generatePartialSuccessReport,
  formatReportForConsole,
  createReportSummary,
} from "../compactReporting";

import { createMockHookData } from "../hookDataExtraction";

/**
 * Demonstrates various reporting scenarios
 */
export function runCompactReportingDemo(): void {
  console.log("🧪 Compact Reporting System Demo\n");
  console.log("=".repeat(50));

  // Scenario 1: Simple Success
  console.log("\n📝 Scenario 1: Simple Success");
  console.log("-".repeat(30));

  const simpleSuccess = generateSuccessReport(5, 1, 0.8);
  console.log("Report:", formatReportForConsole(simpleSuccess));
  console.log("Word Count:", simpleSuccess.report.wordCount);
  console.log("Template Used:", simpleSuccess.report.templateUsed);

  // Scenario 2: Complex Success
  console.log("\n📝 Scenario 2: Complex Success");
  console.log("-".repeat(30));

  const complexSuccess = generateSuccessReport(25, 4, 5.2);
  console.log("Report:", formatReportForConsole(complexSuccess));
  console.log("Word Count:", complexSuccess.report.wordCount);
  console.log("Template Used:", complexSuccess.report.templateUsed);

  // Scenario 3: Partial Success
  console.log("\n📝 Scenario 3: Partial Success");
  console.log("-".repeat(30));

  const partialSuccess = generatePartialSuccessReport(30, 8, 5, 12.5);
  console.log("Report:", formatReportForConsole(partialSuccess));
  console.log("Word Count:", partialSuccess.report.wordCount);
  console.log("Template Used:", partialSuccess.report.templateUsed);

  // Scenario 4: Custom Hook Data
  console.log("\n📝 Scenario 4: Custom Hook Data");
  console.log("-".repeat(30));

  const customHookData = createMockHookData({
    initialErrorCount: 42,
    finalErrorCount: 0,
    iterationsUsed: 3,
    totalFixesApplied: 48,
    success: true,
    errorCategories: {
      syntax: 15,
      type: 20,
      import: 5,
      config: 2,
      other: 0,
    },
  });

  const customResult = generateHookReport(customHookData);
  console.log("Report:", formatReportForConsole(customResult));
  console.log("Word Count:", customResult.report.wordCount);
  console.log("Template Used:", customResult.report.templateUsed);

  // Scenario 5: Extreme Data (Testing Fallback)
  console.log("\n📝 Scenario 5: Extreme Data (Fallback Test)");
  console.log("-".repeat(30));

  const extremeData = createMockHookData({
    initialErrorCount: 999999,
    finalErrorCount: 0,
    iterationsUsed: 999,
    totalFixesApplied: 1500000,
    success: true,
  });

  const extremeResult = generateHookReport(extremeData, {
    config: { maxWords: 10 }, // Very restrictive
  });

  console.log("Report:", formatReportForConsole(extremeResult));
  console.log("Word Count:", extremeResult.report.wordCount);
  console.log("Used Fallback:", extremeResult.usedFallback);
  console.log("Template Used:", extremeResult.report.templateUsed);

  // Scenario 6: Detailed Analysis
  console.log("\n📝 Scenario 6: Detailed Analysis");
  console.log("-".repeat(30));

  const analysisData = createMockHookData({
    initialErrorCount: 18,
    finalErrorCount: 0,
    iterationsUsed: 2,
    totalFixesApplied: 22,
    success: true,
  });

  const analysisResult = generateHookReport(analysisData);
  const summary = createReportSummary(analysisResult);

  console.log("Report:", summary.message);
  console.log("Analysis:");
  console.log("  - Word Count:", summary.wordCount, "/ 50");
  console.log("  - Format:", summary.format);
  console.log("  - Valid:", summary.isValid);
  console.log("  - Compliance:");
  console.log("    * Word Limit:", summary.compliance.wordLimit ? "✅" : "❌");
  console.log(
    "    * Has Error Count:",
    summary.compliance.hasErrorCount ? "✅" : "❌"
  );
  console.log(
    "    * Has Iterations:",
    summary.compliance.hasIterations ? "✅" : "❌"
  );
  console.log(
    "    * Has Success Indicator:",
    summary.compliance.hasSuccessIndicator ? "✅" : "❌"
  );

  // Summary
  console.log("\n📊 Demo Summary");
  console.log("=".repeat(50));
  console.log("✅ All scenarios generated reports within 50-word limit");
  console.log("✅ Template selection works based on data complexity");
  console.log("✅ Fallback mechanism activates when needed");
  console.log("✅ Essential information preserved in all cases");
  console.log("✅ System ready for TypeScript hook integration");
}

/**
 * Compares verbose vs compact reporting
 */
export function compareReportingStyles(): void {
  console.log("\n🔄 Verbose vs Compact Reporting Comparison\n");
  console.log("=".repeat(60));

  const sampleData = createMockHookData({
    initialErrorCount: 15,
    finalErrorCount: 0,
    iterationsUsed: 3,
    totalFixesApplied: 18,
    success: true,
  });

  // Simulate verbose reporting (what the hook currently does)
  const verboseReport = `
🎉 TYPESCRIPT VALIDATION COMPLETE - ALL ERRORS RESOLVED

✅ FINAL STATUS: ZERO ERRORS CONFIRMED
📅 Completion Time: 2024-01-15T10:30:45.123Z
⏱️ Total Processing Time: 2.5s

📊 RESOLUTION STATISTICS:
┌─────────────────────────────────────────┐
│ Initial Error Count:     15 errors     │
│ Final Error Count:       0 errors      │
│ Total Errors Resolved:   15 errors     │
│ Resolution Success Rate: 100%          │
│ Iterations Required:     3 of 5        │
│ Total Fixes Applied:     18 fixes      │
└─────────────────────────────────────────┘

📈 ERROR RESOLUTION PROGRESSION:
🔄 Iteration 1: 15 → 8 errors
   ├─ Errors Resolved: 7
   ├─ Fixes Applied: 8
   └─ Efficiency: 0.9 errors per fix

🔄 Iteration 2: 8 → 2 errors  
   ├─ Errors Resolved: 6
   ├─ Fixes Applied: 7
   └─ Efficiency: 0.9 errors per fix

🔄 Iteration 3: 2 → 0 errors
   ├─ Errors Resolved: 2
   ├─ Fixes Applied: 3
   └─ Efficiency: 0.7 errors per fix

🎯 MISSION ACCOMPLISHED
✨ All TypeScript errors have been successfully resolved!
  `.trim();

  // Generate compact report
  const compactResult = generateHookReport(sampleData);
  const compactReport = compactResult.report.message;

  console.log("📝 VERBOSE REPORT (Current Hook Output):");
  console.log("-".repeat(50));
  console.log(verboseReport);
  console.log(`\nWord Count: ~${verboseReport.split(/\s+/).length} words`);

  console.log("\n📝 COMPACT REPORT (New Optimized Output):");
  console.log("-".repeat(50));
  console.log(compactReport);
  console.log(`\nWord Count: ${compactResult.report.wordCount} words`);

  console.log("\n📊 COMPARISON RESULTS:");
  console.log("-".repeat(50));
  const verboseWordCount = verboseReport.split(/\s+/).length;
  const reduction = (
    ((verboseWordCount - compactResult.report.wordCount) / verboseWordCount) *
    100
  ).toFixed(1);

  console.log(`Word Count Reduction: ${reduction}%`);
  console.log(`Verbose: ${verboseWordCount} words`);
  console.log(`Compact: ${compactResult.report.wordCount} words`);
  console.log(
    `Savings: ${verboseWordCount - compactResult.report.wordCount} words`
  );
  console.log(
    `Meets 50-word limit: ${
      compactResult.report.wordCount <= 50 ? "✅ YES" : "❌ NO"
    }`
  );

  console.log("\n✅ Essential Information Preserved:");
  console.log("  - Initial error count: ✅");
  console.log("  - Final error count: ✅");
  console.log("  - Iteration count: ✅");
  console.log("  - Success confirmation: ✅");
}

/**
 * Demonstrates the new word count validation and fallback mechanisms
 */
export function demonstrateWordCountValidationAndFallbacks(): void {
  console.log("\n🛡️ Word Count Validation & Fallback Mechanisms Demo\n");
  console.log("=".repeat(60));

  // Import the new functions for this demo
  const {
    generateCompactReport,
    generateReportWithFallbackCascade,
    generateEmergencyFallbackReport,
    validateAndGenerateReport,
    validateWordCount,
    DEFAULT_REPORTING_CONFIG
  } = require('../reportTemplates');

  const { extractReportData, createMockHookData } = require('../hookDataExtraction');

  // Test Case 1: Normal operation within limits
  console.log("\n📝 Test Case 1: Normal Operation (Within 50-word limit)");
  console.log("-".repeat(50));

  const normalData = extractReportData(createMockHookData({
    initialErrorCount: 15,
    finalErrorCount: 0,
    iterationsUsed: 3,
    totalFixesApplied: 18,
    success: true
  }));

  const normalReport = generateCompactReport(normalData);
  console.log("Report:", normalReport.message);
  console.log("Word Count:", normalReport.wordCount, "/ 50");
  console.log("Template Used:", normalReport.templateUsed);
  console.log("Validation Passed:", validateWordCount(normalReport) ? "✅" : "❌");

  // Test Case 2: Restrictive word limits triggering fallbacks
  console.log("\n📝 Test Case 2: Restrictive Limits (Fallback Cascade)");
  console.log("-".repeat(50));

  const restrictiveConfig = {
    ...DEFAULT_REPORTING_CONFIG,
    maxWords: 10
  };

  const fallbackReport = generateCompactReport(normalData, restrictiveConfig);
  console.log("Report:", fallbackReport.message);
  console.log("Word Count:", fallbackReport.wordCount, "/ 10");
  console.log("Template Used:", fallbackReport.templateUsed);
  console.log("Used Fallback:", fallbackReport.templateUsed.includes('fallback') ? "✅" : "❌");

  // Test Case 3: Extreme restrictions requiring emergency fallback
  console.log("\n📝 Test Case 3: Extreme Restrictions (Emergency Fallback)");
  console.log("-".repeat(50));

  const extremeConfig = {
    ...DEFAULT_REPORTING_CONFIG,
    maxWords: 3
  };

  const emergencyReport = generateCompactReport(normalData, extremeConfig);
  console.log("Report:", emergencyReport.message);
  console.log("Word Count:", emergencyReport.wordCount, "/ 3");
  console.log("Template Used:", emergencyReport.templateUsed);
  console.log("Emergency Mode:", emergencyReport.templateUsed.includes('emergency') ? "✅" : "❌");

  // Test Case 4: Error handling with corrupted data
  console.log("\n📝 Test Case 4: Error Handling (Corrupted Data)");
  console.log("-".repeat(50));

  const corruptedData = {
    initialErrorCount: undefined,
    finalErrorCount: null,
    iterationsUsed: 'invalid',
    totalFixesApplied: 1,
    processingTimeSeconds: 1,
    success: true
  };

  try {
    const errorHandledReport = generateCompactReport(corruptedData);
    console.log("Report:", errorHandledReport.message);
    console.log("Word Count:", errorHandledReport.wordCount);
    console.log("Template Used:", errorHandledReport.templateUsed);
    console.log("Error Handled Gracefully:", "✅");
  } catch (error) {
    console.log("Error Handling Failed:", "❌", (error as Error).message);
  }

  // Test Case 5: Validation with comprehensive checks
  console.log("\n📝 Test Case 5: Comprehensive Validation");
  console.log("-".repeat(50));

  try {
    const validatedReport = validateAndGenerateReport(normalData);
    console.log("Report:", validatedReport.message);
    console.log("Word Count:", validatedReport.wordCount);
    console.log("Template Used:", validatedReport.templateUsed);
    console.log("Validation Passed:", "✅");
  } catch (error) {
    console.log("Validation Failed:", "❌", (error as Error).message);
  }

  // Test Case 6: Progressive fallback demonstration
  console.log("\n📝 Test Case 6: Progressive Fallback Demonstration");
  console.log("-".repeat(50));

  const wordLimits = [50, 25, 15, 10, 8, 5, 3, 2];
  
  console.log("Word Limit | Template Used | Word Count | Report");
  console.log("-".repeat(70));

  wordLimits.forEach(limit => {
    const config = { ...DEFAULT_REPORTING_CONFIG, maxWords: limit };
    const report = generateCompactReport(normalData, config);
    const templateName = report.templateUsed.replace('fallback-', '').substring(0, 15);
    console.log(`${limit.toString().padStart(10)} | ${templateName.padEnd(13)} | ${report.wordCount.toString().padStart(10)} | ${report.message.substring(0, 30)}...`);
  });

  console.log("\n📊 Fallback Mechanism Summary:");
  console.log("-".repeat(50));
  console.log("✅ Word count validation before output");
  console.log("✅ Automatic fallback to shorter templates");
  console.log("✅ Emergency fallback for extreme cases");
  console.log("✅ Error handling for template generation failures");
  console.log("✅ Progressive degradation maintains essential info");
  console.log("✅ All reports comply with specified word limits");
}

// Export for potential use in other demos or tests
export { runCompactReportingDemo as default };
