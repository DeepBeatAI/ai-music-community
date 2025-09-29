/**
 * Hook Validation Runner Test
 * 
 * Runs the comprehensive validation script as a Jest test
 */

import { runHookValidation, printValidationResults } from './hookValidationScript';

describe('Hook Validation Runner', () => {
  it('should run comprehensive hook validation and report results', () => {
    const summary = runHookValidation();
    
    // Core requirement: All reports must comply with 50-word limit
    summary.results.forEach(result => {
      expect(result.wordCount).toBeLessThanOrEqual(50);
    });
    
    // Core requirement: All reports must preserve essential information
    const coreScenarios = summary.results.filter(r => 
      r.scenario.includes('0 errors') || 
      r.scenario.includes('1 error') || 
      r.scenario.includes('10 errors') || 
      r.scenario.includes('50+ errors')
    );
    
    coreScenarios.forEach(result => {
      expect(result.wordCount).toBeLessThanOrEqual(50);
      expect(result.message.trim()).toBeTruthy();
    });
    
    // Performance requirement: No regression in execution time
    summary.results.forEach(result => {
      expect(result.executionTime).toBeLessThan(200); // 200ms max
    });
    
    // Basic validation: Should have run tests
    expect(summary.totalTests).toBeGreaterThan(0);
    expect(summary.results.length).toBeGreaterThan(0);
    
    // Validate that all reports comply with 50-word limit
    summary.results.forEach(result => {
      expect(result.wordCount).toBeLessThanOrEqual(50);
    });
    
    // Validate that all reports have reasonable execution times
    summary.results.forEach(result => {
      expect(result.executionTime).toBeLessThan(200); // 200ms max
    });
    
    // Validate that all successful tests have non-empty messages
    summary.results
      .filter(r => r.passed)
      .forEach(result => {
        expect(result.message.trim()).toBeTruthy();
      });
  });
});