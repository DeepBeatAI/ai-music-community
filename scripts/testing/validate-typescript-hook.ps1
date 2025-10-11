# Comprehensive TypeScript Hook Validation Script (PowerShell)
# This script creates test scenarios and validates the enhanced TypeScript hook behavior

param(
    [switch]$SkipBackup,
    [switch]$CleanupOnly
)

Write-Host "🧪 TypeScript Hook Validation Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing enhanced TypeScript hook with comprehensive scenarios" -ForegroundColor White
Write-Host ""

# Test configuration
$TestDir = "client\src\test-scenarios"
$BackupDir = "test-backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Create test directories
if (-not (Test-Path $TestDir)) {
    New-Item -ItemType Directory -Path $TestDir -Force | Out-Null
}
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "📁 Created test directories" -ForegroundColor Blue

# Function to create test files
function Create-TestFiles {
    Write-Host "📝 Creating test scenario files..." -ForegroundColor Yellow
    
    # Scenario 1: Simple auto-fixable errors
    $SimpleErrors = @"
// Simple TypeScript errors that should be auto-fixable
const message = "Hello World"  // Missing semicolon
let count: number = "5"        // Type mismatch - string assigned to number
function greet(name) {         // Missing type annotation for parameter
  return `Hello `${name}``
}

// Missing return type annotation
function calculate(a, b) {
  return a + b
}

// Unused variable (should be handled)
const unusedVar = "test"

// Missing interface property
interface SimpleUser {
  id: number
  name: string
  email: string
}

const user: SimpleUser = {
  id: 1,
  name: "Test User"
  // Missing email property
}
"@
    
    $SimpleErrors | Out-File -FilePath "$TestDir\simple-errors.ts" -Encoding UTF8
    
    # Scenario 2: Complex interdependent errors
    $ComplexErrors = @"
// Complex errors requiring multiple iterations
interface ComplexUser {
  id: number
  name: string
  profile: UserProfile
  settings: UserSettings
}

// Forward reference - interface defined later
interface UserProfile {
  avatar: string
  bio: string
  socialLinks: SocialLinks
}

interface UserSettings {
  theme: ThemeType
  notifications: boolean
  privacy: PrivacyLevel
}

// Missing type definitions
type ThemeType = "light" | "dark" | "auto"
type PrivacyLevel = "public" | "private" | "friends"

interface SocialLinks {
  twitter?: string
  github?: string
  linkedin?: string
}

// Object with missing properties and type errors
const complexUser: ComplexUser = {
  id: 1,
  name: "Complex User",
  profile: {
    avatar: "avatar.jpg",
    bio: "Test bio"
    // Missing socialLinks
  }
  // Missing settings
}

// Function with complex type issues
function processComplexUser(user: ComplexUser): ProcessedUser {
  return {
    displayName: user.name,
    isActive: true,
    lastSeen: new Date()
  }
}

// Missing interface definition
interface ProcessedUser {
  displayName: string
  isActive: boolean
  lastSeen: Date
}
"@
    
    $ComplexErrors | Out-File -FilePath "$TestDir\complex-errors.ts" -Encoding UTF8
    
    # Scenario 3: Import and module errors
    $ImportErrors = @"
// Import and module related errors
import { NonExistentFunction } from './non-existent-module'
import { AnotherMissing } from '@/utils/missing-utility'
import React from 'react'  // May or may not exist depending on setup

// Using imported items that don't exist
const result = NonExistentFunction("test")
const processed = AnotherMissing.process(result)

// Export with type errors
export interface ExportedInterface {
  id: number
  data: UnknownType  // Unknown type reference
}

export const exportedFunction = (param: UnknownType): ExportedInterface => {
  return {
    id: 1,
    data: param
  }
}

// Default export with issues
export default class DefaultClass {
  private value: UnknownType
  
  constructor(val: UnknownType) {
    this.value = val
  }
  
  getValue(): UnknownType {
    return this.value
  }
}
"@
    
    $ImportErrors | Out-File -FilePath "$TestDir\import-errors.ts" -Encoding UTF8
    
    # Scenario 4: Persistent/unfixable errors
    $PersistentErrors = @"
// Errors that should trigger safety mechanisms
import { ImpossibleType } from '@external/missing-package'
import { ComplexGeneric } from '@another/missing-dependency'

// Complex generic constraints that can't be auto-resolved
type ImpossibleConstraint<T extends ImpossibleType<U>, U extends ComplexGeneric<T>> = T & U

// Circular type dependencies
type CircularA<T> = CircularB<T> & { a: string }
type CircularB<T> = CircularA<T> & { b: number }

// Using impossible types
const impossibleValue: ImpossibleConstraint<any, any> = {} as any
const circularValue: CircularA<string> = {} as any

// Function with impossible signature
function impossibleFunction<T extends never>(param: T): T extends infer U ? U : never {
  return param as any
}

// Class with architectural issues
class ArchitecturalProblem extends NonExistentBaseClass {
  private impossibleProperty: ImpossibleType<ComplexGeneric<never>>
  
  constructor() {
    super()  // Super class doesn't exist
    this.impossibleProperty = new ImpossibleType()
  }
}
"@
    
    $PersistentErrors | Out-File -FilePath "$TestDir\persistent-errors.ts" -Encoding UTF8
    
    Write-Host "✅ Test scenario files created" -ForegroundColor Green
}

# Function to backup existing files
function Backup-ExistingFiles {
    if ($SkipBackup) {
        Write-Host "⏭️  Skipping backup (SkipBackup flag set)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "💾 Creating backup of existing files..." -ForegroundColor Yellow
    
    if (Test-Path "client\src") {
        $BackupPath = "$BackupDir\src_backup_$Timestamp"
        Copy-Item -Path "client\src" -Destination $BackupPath -Recurse -Force
        Write-Host "✅ Backup created at $BackupPath" -ForegroundColor Green
    }
}

# Function to check initial state
function Check-InitialState {
    Write-Host "🔍 Checking initial TypeScript state..." -ForegroundColor Blue
    
    Push-Location client
    try {
        $TscOutput = & npx tsc --noEmit 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Initial state: No TypeScript errors" -ForegroundColor Green
            $script:InitialClean = $true
        } else {
            Write-Host "⚠️  Initial state: TypeScript errors present" -ForegroundColor Yellow
            Write-Host "Current errors:" -ForegroundColor Yellow
            $TscOutput | Select-Object -First 10 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            $script:InitialClean = $false
        }
    } finally {
        Pop-Location
    }
}

# Function to run test scenario
function Run-TestScenario {
    param(
        [string]$ScenarioName,
        [string]$ScenarioFile,
        [string]$ExpectedBehavior
    )
    
    Write-Host ""
    Write-Host "📋 Test Scenario: $ScenarioName" -ForegroundColor Blue
    Write-Host "File: $ScenarioFile" -ForegroundColor White
    Write-Host "Expected: $ExpectedBehavior" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    # Check if file exists
    if (-not (Test-Path $ScenarioFile)) {
        Write-Host "❌ Test file not found: $ScenarioFile" -ForegroundColor Red
        return
    }
    
    # Run TypeScript check to confirm errors exist
    Push-Location client
    try {
        Write-Host "🔍 Confirming errors exist in scenario..." -ForegroundColor White
        $TscOutput = & npx tsc --noEmit 2>&1
        $ErrorLines = $TscOutput | Where-Object { $_ -match "error TS" }
        
        if ($ErrorLines.Count -gt 0) {
            Write-Host "✅ Errors confirmed in test scenario" -ForegroundColor Yellow
            Write-Host "📊 Initial error count: $($ErrorLines.Count)" -ForegroundColor White
        } else {
            Write-Host "ℹ️  No errors found in current scenario" -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
    
    Write-Host ""
    Write-Host "🔘 MANUAL ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "1. Trigger the TypeScript hook manually using 'Check TypeScript Errors' button" -ForegroundColor White
    Write-Host "2. Observe the hook behavior and compare with expected behavior" -ForegroundColor White
    Write-Host "3. Record the results in the validation log" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected behavior: $ExpectedBehavior" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter when you have completed this test scenario"
}

# Function to cleanup test files
function Cleanup-TestFiles {
    Write-Host "🧹 Cleaning up test files..." -ForegroundColor Yellow
    
    if (Test-Path $TestDir) {
        Remove-Item -Path $TestDir -Recurse -Force
        Write-Host "✅ Test files cleaned up" -ForegroundColor Green
    }
}

# Function to restore from backup
function Restore-Backup {
    Write-Host ""
    Write-Host "🔄 Restore from backup?" -ForegroundColor Yellow
    $Response = Read-Host "Do you want to restore the original files from backup? (y/N)"
    
    if ($Response -match "^[Yy]") {
        $BackupPath = "$BackupDir\src_backup_$Timestamp"
        if (Test-Path $BackupPath) {
            Remove-Item -Path "client\src" -Recurse -Force -ErrorAction SilentlyContinue
            Copy-Item -Path $BackupPath -Destination "client\src" -Recurse -Force
            Write-Host "✅ Files restored from backup" -ForegroundColor Green
        } else {
            Write-Host "❌ Backup not found" -ForegroundColor Red
        }
    }
}

# Main execution
function Main {
    if ($CleanupOnly) {
        Write-Host "🧹 Cleanup mode - removing test files only" -ForegroundColor Yellow
        Cleanup-TestFiles
        return
    }
    
    Write-Host "Starting comprehensive TypeScript hook validation..." -ForegroundColor White
    Write-Host ""
    
    # Backup existing files
    Backup-ExistingFiles
    
    # Check initial state
    Check-InitialState
    
    # Create test files
    Create-TestFiles
    
    Write-Host ""
    Write-Host "🎯 Test Execution Plan" -ForegroundColor Blue
    Write-Host "======================================" -ForegroundColor Blue
    Write-Host "The following test scenarios will be executed:" -ForegroundColor White
    Write-Host "1. Simple Auto-Fixable Errors" -ForegroundColor White
    Write-Host "2. Complex Interdependent Errors" -ForegroundColor White
    Write-Host "3. Import and Module Errors" -ForegroundColor White
    Write-Host "4. Persistent/Unfixable Errors (Safety Mechanisms)" -ForegroundColor White
    Write-Host "5. Manual Trigger Functionality" -ForegroundColor White
    Write-Host "6. Backward Compatibility Check" -ForegroundColor White
    Write-Host ""
    
    Read-Host "Press Enter to begin test execution"
    
    # Test Scenarios
    Run-TestScenario -ScenarioName "Simple Auto-Fixable Errors" -ScenarioFile "$TestDir\simple-errors.ts" -ExpectedBehavior "Hook should resolve all errors in 1-2 iterations with detailed fix reporting"
    
    Run-TestScenario -ScenarioName "Complex Interdependent Errors" -ScenarioFile "$TestDir\complex-errors.ts" -ExpectedBehavior "Hook should require 2-4 iterations with progress tracking and gradual error reduction"
    
    Run-TestScenario -ScenarioName "Import and Module Errors" -ScenarioFile "$TestDir\import-errors.ts" -ExpectedBehavior "Hook should attempt import fixes but may hit safety limits for missing dependencies"
    
    Run-TestScenario -ScenarioName "Persistent/Unfixable Errors" -ScenarioFile "$TestDir\persistent-errors.ts" -ExpectedBehavior "Hook should detect stuck errors and trigger safety mechanisms with manual intervention guidance"
    
    # Manual Trigger Test
    Write-Host ""
    Write-Host "📋 Test Scenario: Manual Trigger Functionality" -ForegroundColor Blue
    Write-Host "Expected: Manual trigger button should work correctly" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "🔘 MANUAL ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "1. Navigate to any TypeScript file in the editor" -ForegroundColor White
    Write-Host "2. Look for 'Check TypeScript Errors' button" -ForegroundColor White
    Write-Host "3. Click the button and verify hook executes" -ForegroundColor White
    Write-Host "4. Confirm same behavior as automatic triggers" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter when you have tested manual trigger functionality"
    
    # Backward Compatibility Test
    Write-Host ""
    Write-Host "📋 Test Scenario: Backward Compatibility" -ForegroundColor Blue
    Write-Host "Expected: No breaking changes to existing functionality" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "🔘 MANUAL ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "1. Verify existing TypeScript files are unmodified" -ForegroundColor White
    Write-Host "2. Check that build processes still work" -ForegroundColor White
    Write-Host "3. Confirm development workflow is intact" -ForegroundColor White
    Write-Host "4. Test with existing project files" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter when you have verified backward compatibility"
    
    # Cleanup
    Cleanup-TestFiles
    
    # Final validation summary
    Write-Host ""
    Write-Host "🏁 Test Execution Complete" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Validation Checklist:" -ForegroundColor Blue
    Write-Host "□ Simple errors resolved automatically (1-2 iterations)" -ForegroundColor White
    Write-Host "□ Complex errors handled with multiple iterations" -ForegroundColor White
    Write-Host "□ Import errors processed appropriately" -ForegroundColor White
    Write-Host "□ Safety mechanisms triggered for persistent errors" -ForegroundColor White
    Write-Host "□ Manual trigger functionality works" -ForegroundColor White
    Write-Host "□ Backward compatibility maintained" -ForegroundColor White
    Write-Host "□ No infinite loops or resource exhaustion" -ForegroundColor White
    Write-Host "□ Detailed progress reporting provided" -ForegroundColor White
    Write-Host "□ Error categorization accurate" -ForegroundColor White
    Write-Host "□ Performance within acceptable limits" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Review hook execution logs for each scenario" -ForegroundColor White
    Write-Host "2. Verify all requirements (1.1-4.4) are satisfied" -ForegroundColor White
    Write-Host "3. Document any issues or unexpected behaviors" -ForegroundColor White
    Write-Host "4. Update hook configuration if needed" -ForegroundColor White
    Write-Host ""
    
    # Restore backup option
    if (-not $SkipBackup) {
        Restore-Backup
    }
    
    Write-Host "✅ TypeScript Hook Validation Complete" -ForegroundColor Green
}

# Execute main function
Main