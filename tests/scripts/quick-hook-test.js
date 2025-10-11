#!/usr/bin/env node

/**
 * Quick TypeScript Hook Test Runner
 * This script provides a simple way to test specific aspects of the enhanced TypeScript hook
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const TEST_DIR = path.join('client', 'src', 'hook-test');
const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function createTestDirectory() {
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
        log(`📁 Created test directory: ${TEST_DIR}`, 'blue');
    }
}

function cleanupTestDirectory() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
        log(`🧹 Cleaned up test directory: ${TEST_DIR}`, 'yellow');
    }
}

function createSimpleErrorFile() {
    const content = `// Simple TypeScript errors for testing
const message = "Hello World"  // Missing semicolon
let count: number = "5"        // Type mismatch
function greet(name) {         // Missing type annotation
  return \`Hello \${name}\`
}

interface TestUser {
  id: number
  name: string
  email: string
}

const user: TestUser = {
  id: 1,
  name: "Test"
  // Missing email property
}`;

    const filePath = path.join(TEST_DIR, 'simple-errors.ts');
    fs.writeFileSync(filePath, content);
    log(`📝 Created simple error test file: ${filePath}`, 'green');
    return filePath;
}

function createComplexErrorFile() {
    const content = `// Complex TypeScript errors requiring multiple iterations
interface ComplexUser {
  id: number
  name: string
  profile: UserProfile
}

interface UserProfile {
  avatar: string
  bio: string
  settings: UserSettings
}

interface UserSettings {
  theme: ThemeType
  notifications: boolean
}

type ThemeType = "light" | "dark"

const complexUser: ComplexUser = {
  id: 1,
  name: "Complex User",
  profile: {
    avatar: "avatar.jpg"
    // Missing bio and settings
  }
  // Missing profile completion
}

function processUser(user: ComplexUser): ProcessedUser {
  return {
    displayName: user.name,
    isActive: true
  }
}

interface ProcessedUser {
  displayName: string
  isActive: boolean
  lastSeen: Date  // This will cause an error in the return object
}`;

    const filePath = path.join(TEST_DIR, 'complex-errors.ts');
    fs.writeFileSync(filePath, content);
    log(`📝 Created complex error test file: ${filePath}`, 'green');
    return filePath;
}

function createPersistentErrorFile() {
    const content = `// Persistent errors that should trigger safety mechanisms
import { NonExistentType } from '@missing/package'
import { AnotherMissing } from './non-existent-file'

type ImpossibleConstraint<T extends NonExistentType> = T & AnotherMissing

const impossibleValue: ImpossibleConstraint<any> = {} as any

class ProblematicClass extends NonExistentBaseClass {
  private impossibleProperty: NonExistentType
  
  constructor() {
    super()  // Base class doesn't exist
    this.impossibleProperty = new NonExistentType()
  }
}

export { impossibleValue, ProblematicClass }`;

    const filePath = path.join(TEST_DIR, 'persistent-errors.ts');
    fs.writeFileSync(filePath, content);
    log(`📝 Created persistent error test file: ${filePath}`, 'green');
    return filePath;
}

function checkTypeScriptErrors() {
    try {
        log('🔍 Checking TypeScript errors...', 'blue');
        const output = execSync('npx tsc --noEmit', { 
            cwd: 'client', 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        log('✅ No TypeScript errors found', 'green');
        return { hasErrors: false, output: '' };
    } catch (error) {
        const errorOutput = error.stdout || error.stderr || '';
        const errorLines = errorOutput.split('\n').filter(line => line.includes('error TS'));
        log(`❌ Found ${errorLines.length} TypeScript errors`, 'red');
        
        // Show first few errors
        errorLines.slice(0, 5).forEach(line => {
            log(`  ${line}`, 'red');
        });
        
        if (errorLines.length > 5) {
            log(`  ... and ${errorLines.length - 5} more errors`, 'yellow');
        }
        
        return { hasErrors: true, output: errorOutput, errorCount: errorLines.length };
    }
}

function runTestScenario(scenarioName, createFileFunction, expectedBehavior) {
    log(`\n📋 Test Scenario: ${scenarioName}`, 'cyan');
    log('='.repeat(50), 'cyan');
    
    // Create test file
    const testFile = createFileFunction();
    
    // Check for errors
    const errorCheck = checkTypeScriptErrors();
    
    if (errorCheck.hasErrors) {
        log(`📊 Initial error count: ${errorCheck.errorCount}`, 'yellow');
        log(`\n🔘 MANUAL ACTION REQUIRED:`, 'yellow');
        log(`1. The test file has been created: ${testFile}`, 'white');
        log(`2. Trigger the TypeScript hook manually using 'Check TypeScript Errors' button`, 'white');
        log(`3. Expected behavior: ${expectedBehavior}`, 'cyan');
        log(`4. Observe and record the hook's behavior`, 'white');
        
        // Wait for user input
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('\nPress Enter when you have completed testing this scenario...', () => {
                rl.close();
                resolve();
            });
        });
    } else {
        log('ℹ️  No errors found in test file - scenario may not be effective', 'yellow');
        return Promise.resolve();
    }
}

async function main() {
    log('🧪 Quick TypeScript Hook Test Runner', 'cyan');
    log('=====================================', 'cyan');
    log('This tool creates test scenarios for validating the enhanced TypeScript hook\n', 'white');
    
    // Setup
    createTestDirectory();
    
    try {
        // Test Scenario 1: Simple Errors
        await runTestScenario(
            'Simple Auto-Fixable Errors',
            createSimpleErrorFile,
            'Hook should resolve all errors in 1-2 iterations with detailed reporting'
        );
        
        // Test Scenario 2: Complex Errors
        await runTestScenario(
            'Complex Interdependent Errors',
            createComplexErrorFile,
            'Hook should require 2-4 iterations with progress tracking'
        );
        
        // Test Scenario 3: Persistent Errors
        await runTestScenario(
            'Persistent/Unfixable Errors',
            createPersistentErrorFile,
            'Hook should detect stuck errors and trigger safety mechanisms'
        );
        
        // Final summary
        log('\n🏁 Test Scenarios Complete', 'green');
        log('============================', 'green');
        log('\n📊 Validation Checklist:', 'blue');
        log('□ Simple errors resolved automatically', 'white');
        log('□ Complex errors handled iteratively', 'white');
        log('□ Safety mechanisms triggered for persistent errors', 'white');
        log('□ Detailed progress reporting provided', 'white');
        log('□ No infinite loops occurred', 'white');
        log('□ Performance was acceptable', 'white');
        
        log('\n📝 Next Steps:', 'yellow');
        log('1. Review the hook execution logs', 'white');
        log('2. Verify all requirements are satisfied', 'white');
        log('3. Document any issues found', 'white');
        log('4. Test manual trigger functionality separately', 'white');
        
    } finally {
        // Cleanup
        log('\n🧹 Cleaning up test files...', 'yellow');
        cleanupTestDirectory();
        log('✅ Cleanup complete', 'green');
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Quick TypeScript Hook Test Runner

Usage: node quick-hook-test.js [options]

Options:
  --help, -h     Show this help message
  --cleanup      Only cleanup test files
  --simple       Run only simple error test
  --complex      Run only complex error test
  --persistent   Run only persistent error test

Examples:
  node quick-hook-test.js              # Run all test scenarios
  node quick-hook-test.js --simple     # Run only simple error test
  node quick-hook-test.js --cleanup    # Cleanup test files only
`);
    process.exit(0);
}

if (args.includes('--cleanup')) {
    log('🧹 Cleanup mode - removing test files only', 'yellow');
    cleanupTestDirectory();
    process.exit(0);
}

// Run specific tests based on arguments
if (args.includes('--simple') || args.includes('--complex') || args.includes('--persistent')) {
    createTestDirectory();
    
    if (args.includes('--simple')) {
        runTestScenario(
            'Simple Auto-Fixable Errors',
            createSimpleErrorFile,
            'Hook should resolve all errors in 1-2 iterations'
        ).then(() => cleanupTestDirectory());
    }
    
    if (args.includes('--complex')) {
        runTestScenario(
            'Complex Interdependent Errors',
            createComplexErrorFile,
            'Hook should require 2-4 iterations'
        ).then(() => cleanupTestDirectory());
    }
    
    if (args.includes('--persistent')) {
        runTestScenario(
            'Persistent/Unfixable Errors',
            createPersistentErrorFile,
            'Hook should trigger safety mechanisms'
        ).then(() => cleanupTestDirectory());
    }
} else {
    // Run all tests
    main().catch(error => {
        log(`❌ Error: ${error.message}`, 'red');
        cleanupTestDirectory();
        process.exit(1);
    });
}