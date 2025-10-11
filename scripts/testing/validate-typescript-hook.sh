#!/bin/bash

# Comprehensive TypeScript Hook Validation Script
# This script creates test scenarios and validates the enhanced TypeScript hook behavior

set -e  # Exit on any error

echo "🧪 TypeScript Hook Validation Test Suite"
echo "========================================"
echo "Testing enhanced TypeScript hook with comprehensive scenarios"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="client/src/test-scenarios"
BACKUP_DIR="test-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create test directory
mkdir -p "$TEST_DIR"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}📁 Created test directories${NC}"

# Function to create test files
create_test_files() {
    echo -e "${YELLOW}📝 Creating test scenario files...${NC}"
    
    # Scenario 1: Simple auto-fixable errors
    cat > "$TEST_DIR/simple-errors.ts" << 'EOF'
// Simple TypeScript errors that should be auto-fixable
const message = "Hello World"  // Missing semicolon
let count: number = "5"        // Type mismatch - string assigned to number
function greet(name) {         // Missing type annotation for parameter
  return `Hello ${name}`
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
EOF

    # Scenario 2: Complex interdependent errors
    cat > "$TEST_DIR/complex-errors.ts" << 'EOF'
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
EOF

    # Scenario 3: Import and module errors
    cat > "$TEST_DIR/import-errors.ts" << 'EOF'
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
EOF

    # Scenario 4: Persistent/unfixable errors (for safety mechanism testing)
    cat > "$TEST_DIR/persistent-errors.ts" << 'EOF'
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
EOF

    echo -e "${GREEN}✅ Test scenario files created${NC}"
}

# Function to backup existing files
backup_existing_files() {
    echo -e "${YELLOW}💾 Creating backup of existing files...${NC}"
    
    if [ -d "client/src" ]; then
        cp -r client/src "$BACKUP_DIR/src_backup_$TIMESTAMP"
        echo -e "${GREEN}✅ Backup created at $BACKUP_DIR/src_backup_$TIMESTAMP${NC}"
    fi
}

# Function to check initial state
check_initial_state() {
    echo -e "${BLUE}🔍 Checking initial TypeScript state...${NC}"
    
    cd client
    if npx tsc --noEmit > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Initial state: No TypeScript errors${NC}"
        INITIAL_CLEAN=true
    else
        echo -e "${YELLOW}⚠️  Initial state: TypeScript errors present${NC}"
        echo "Current errors:"
        npx tsc --noEmit 2>&1 | head -10
        INITIAL_CLEAN=false
    fi
    cd ..
}

# Function to run test scenario
run_test_scenario() {
    local scenario_name="$1"
    local scenario_file="$2"
    local expected_behavior="$3"
    
    echo ""
    echo -e "${BLUE}📋 Test Scenario: $scenario_name${NC}"
    echo "File: $scenario_file"
    echo "Expected: $expected_behavior"
    echo "----------------------------------------"
    
    # Check if file exists
    if [ ! -f "$scenario_file" ]; then
        echo -e "${RED}❌ Test file not found: $scenario_file${NC}"
        return 1
    fi
    
    # Run TypeScript check to confirm errors exist
    cd client
    echo "🔍 Confirming errors exist in scenario..."
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
        echo -e "${YELLOW}✅ Errors confirmed in test scenario${NC}"
        
        # Count initial errors
        ERROR_COUNT=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
        echo "📊 Initial error count: $ERROR_COUNT"
        
    else
        echo -e "${GREEN}ℹ️  No errors found in current scenario${NC}"
    fi
    cd ..
    
    echo ""
    echo -e "${YELLOW}🔘 MANUAL ACTION REQUIRED:${NC}"
    echo "1. Trigger the TypeScript hook manually using 'Check TypeScript Errors' button"
    echo "2. Observe the hook behavior and compare with expected behavior"
    echo "3. Record the results in the validation log"
    echo ""
    echo "Expected behavior: $expected_behavior"
    echo ""
    read -p "Press Enter when you have completed this test scenario..."
}

# Function to cleanup test files
cleanup_test_files() {
    echo -e "${YELLOW}🧹 Cleaning up test files...${NC}"
    
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
        echo -e "${GREEN}✅ Test files cleaned up${NC}"
    fi
}

# Function to restore from backup if needed
restore_backup() {
    echo ""
    echo -e "${YELLOW}🔄 Restore from backup?${NC}"
    read -p "Do you want to restore the original files from backup? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$BACKUP_DIR/src_backup_$TIMESTAMP" ]; then
            rm -rf client/src
            cp -r "$BACKUP_DIR/src_backup_$TIMESTAMP" client/src
            echo -e "${GREEN}✅ Files restored from backup${NC}"
        else
            echo -e "${RED}❌ Backup not found${NC}"
        fi
    fi
}

# Main test execution
main() {
    echo "Starting comprehensive TypeScript hook validation..."
    echo ""
    
    # Backup existing files
    backup_existing_files
    
    # Check initial state
    check_initial_state
    
    # Create test files
    create_test_files
    
    echo ""
    echo -e "${BLUE}🎯 Test Execution Plan${NC}"
    echo "======================================"
    echo "The following test scenarios will be executed:"
    echo "1. Simple Auto-Fixable Errors"
    echo "2. Complex Interdependent Errors" 
    echo "3. Import and Module Errors"
    echo "4. Persistent/Unfixable Errors (Safety Mechanisms)"
    echo "5. Manual Trigger Functionality"
    echo "6. Backward Compatibility Check"
    echo ""
    
    read -p "Press Enter to begin test execution..."
    
    # Test Scenario 1: Simple Errors
    run_test_scenario \
        "Simple Auto-Fixable Errors" \
        "$TEST_DIR/simple-errors.ts" \
        "Hook should resolve all errors in 1-2 iterations with detailed fix reporting"
    
    # Test Scenario 2: Complex Errors
    run_test_scenario \
        "Complex Interdependent Errors" \
        "$TEST_DIR/complex-errors.ts" \
        "Hook should require 2-4 iterations with progress tracking and gradual error reduction"
    
    # Test Scenario 3: Import Errors
    run_test_scenario \
        "Import and Module Errors" \
        "$TEST_DIR/import-errors.ts" \
        "Hook should attempt import fixes but may hit safety limits for missing dependencies"
    
    # Test Scenario 4: Persistent Errors
    run_test_scenario \
        "Persistent/Unfixable Errors" \
        "$TEST_DIR/persistent-errors.ts" \
        "Hook should detect stuck errors and trigger safety mechanisms with manual intervention guidance"
    
    # Test Scenario 5: Manual Trigger
    echo ""
    echo -e "${BLUE}📋 Test Scenario: Manual Trigger Functionality${NC}"
    echo "Expected: Manual trigger button should work correctly"
    echo "----------------------------------------"
    echo -e "${YELLOW}🔘 MANUAL ACTION REQUIRED:${NC}"
    echo "1. Navigate to any TypeScript file in the editor"
    echo "2. Look for 'Check TypeScript Errors' button"
    echo "3. Click the button and verify hook executes"
    echo "4. Confirm same behavior as automatic triggers"
    echo ""
    read -p "Press Enter when you have tested manual trigger functionality..."
    
    # Test Scenario 6: Backward Compatibility
    echo ""
    echo -e "${BLUE}📋 Test Scenario: Backward Compatibility${NC}"
    echo "Expected: No breaking changes to existing functionality"
    echo "----------------------------------------"
    echo -e "${YELLOW}🔘 MANUAL ACTION REQUIRED:${NC}"
    echo "1. Verify existing TypeScript files are unmodified"
    echo "2. Check that build processes still work"
    echo "3. Confirm development workflow is intact"
    echo "4. Test with existing project files"
    echo ""
    read -p "Press Enter when you have verified backward compatibility..."
    
    # Cleanup
    cleanup_test_files
    
    # Final validation summary
    echo ""
    echo -e "${GREEN}🏁 Test Execution Complete${NC}"
    echo "======================================"
    echo ""
    echo -e "${BLUE}📊 Validation Checklist:${NC}"
    echo "□ Simple errors resolved automatically (1-2 iterations)"
    echo "□ Complex errors handled with multiple iterations"
    echo "□ Import errors processed appropriately"
    echo "□ Safety mechanisms triggered for persistent errors"
    echo "□ Manual trigger functionality works"
    echo "□ Backward compatibility maintained"
    echo "□ No infinite loops or resource exhaustion"
    echo "□ Detailed progress reporting provided"
    echo "□ Error categorization accurate"
    echo "□ Performance within acceptable limits"
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo "1. Review hook execution logs for each scenario"
    echo "2. Verify all requirements (1.1-4.4) are satisfied"
    echo "3. Document any issues or unexpected behaviors"
    echo "4. Update hook configuration if needed"
    echo ""
    
    # Restore backup option
    restore_backup
    
    echo -e "${GREEN}✅ TypeScript Hook Validation Complete${NC}"
}

# Execute main function
main "$@"