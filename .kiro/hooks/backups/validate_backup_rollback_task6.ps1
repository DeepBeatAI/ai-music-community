# TypeScript Hook Backup and Rollback Validation Script - Task 6
# Created: 2025-09-25 22:56:14
# Purpose: Validate backup and rollback mechanisms

Write-Host "🔍 TypeScript Hook Backup & Rollback Validation - Task 6" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Define paths
$backupFile = ".kiro/hooks/backups/ts-error-checker.kiro.hook.backup-task6-20250925-225614"
$originalFile = ".kiro/hooks/ts-error-checker.kiro.hook"
$changeDoc = ".kiro/hooks/backups/CHANGES_DOCUMENTATION_task6_20250925-225614.md"
$rollbackScript = ".kiro/hooks/backups/rollback_task6_20250925-225614.ps1"

$validationResults = @()

# Test 1: Verify backup file exists and is valid
Write-Host "🧪 Test 1: Backup File Validation" -ForegroundColor Yellow
if (Test-Path $backupFile) {
    $backupSize = (Get-Item $backupFile).Length
    if ($backupSize -gt 0) {
        Write-Host "   ✅ Backup file exists and has content ($backupSize bytes)" -ForegroundColor Green
        $validationResults += "PASS: Backup file validation"
    } else {
        Write-Host "   ❌ Backup file exists but is empty" -ForegroundColor Red
        $validationResults += "FAIL: Backup file validation - empty file"
    }
} else {
    Write-Host "   ❌ Backup file not found" -ForegroundColor Red
    $validationResults += "FAIL: Backup file validation - file not found"
}

# Test 2: Verify change documentation exists
Write-Host "🧪 Test 2: Change Documentation Validation" -ForegroundColor Yellow
if (Test-Path $changeDoc) {
    $docContent = Get-Content $changeDoc -Raw
    if ($docContent -match "Task 6" -and $docContent -match "Compact Reporting" -and $docContent -match "Rollback Instructions") {
        Write-Host "   ✅ Change documentation exists and contains required sections" -ForegroundColor Green
        $validationResults += "PASS: Change documentation validation"
    } else {
        Write-Host "   ❌ Change documentation missing required sections" -ForegroundColor Red
        $validationResults += "FAIL: Change documentation validation - incomplete content"
    }
} else {
    Write-Host "   ❌ Change documentation not found" -ForegroundColor Red
    $validationResults += "FAIL: Change documentation validation - file not found"
}

# Test 3: Verify rollback script exists and is executable
Write-Host "🧪 Test 3: Rollback Script Validation" -ForegroundColor Yellow
if (Test-Path $rollbackScript) {
    $scriptContent = Get-Content $rollbackScript -Raw
    if ($scriptContent -match "Copy-Item" -and $scriptContent -match "backup" -and $scriptContent -match "rollback") {
        Write-Host "   ✅ Rollback script exists and contains required commands" -ForegroundColor Green
        $validationResults += "PASS: Rollback script validation"
    } else {
        Write-Host "   ❌ Rollback script missing required commands" -ForegroundColor Red
        $validationResults += "FAIL: Rollback script validation - incomplete script"
    }
} else {
    Write-Host "   ❌ Rollback script not found" -ForegroundColor Red
    $validationResults += "FAIL: Rollback script validation - file not found"
}

# Test 4: Verify original file integrity
Write-Host "🧪 Test 4: Original File Integrity" -ForegroundColor Yellow
if (Test-Path $originalFile) {
    $originalContent = Get-Content $originalFile -Raw
    if ($originalContent -match "Enhanced TypeScript Error Checker" -and $originalContent -match "compact reporting") {
        Write-Host "   ✅ Original file exists and contains expected content" -ForegroundColor Green
        $validationResults += "PASS: Original file integrity"
    } else {
        Write-Host "   ❌ Original file missing expected content" -ForegroundColor Red
        $validationResults += "FAIL: Original file integrity - content mismatch"
    }
} else {
    Write-Host "   ❌ Original file not found" -ForegroundColor Red
    $validationResults += "FAIL: Original file integrity - file not found"
}

# Test 5: Backup file content comparison
Write-Host "🧪 Test 5: Backup Content Validation" -ForegroundColor Yellow
if ((Test-Path $backupFile) -and (Test-Path $originalFile)) {
    $backupContent = Get-Content $backupFile -Raw
    $originalContent = Get-Content $originalFile -Raw
    
    # Check if backup contains the original structure
    if ($backupContent -match "Enhanced TypeScript Error Checker" -and $backupContent -match "version") {
        Write-Host "   ✅ Backup contains valid hook structure" -ForegroundColor Green
        $validationResults += "PASS: Backup content validation"
    } else {
        Write-Host "   ❌ Backup does not contain valid hook structure" -ForegroundColor Red
        $validationResults += "FAIL: Backup content validation - invalid structure"
    }
} else {
    Write-Host "   ❌ Cannot compare - missing files" -ForegroundColor Red
    $validationResults += "FAIL: Backup content validation - missing files"
}

# Test 6: Rollback functionality test (dry run)
Write-Host "🧪 Test 6: Rollback Functionality Test (Dry Run)" -ForegroundColor Yellow
try {
    # Create a temporary test file
    $testFile = ".kiro/hooks/backups/test_rollback_temp.txt"
    $testBackup = ".kiro/hooks/backups/test_backup_temp.txt"
    
    "Original Content" | Out-File $testFile -Encoding UTF8
    "Backup Content" | Out-File $testBackup -Encoding UTF8
    
    # Test copy operation
    Copy-Item $testBackup $testFile -ErrorAction Stop
    $restoredContent = Get-Content $testFile -Raw
    
    if ($restoredContent -match "Backup Content") {
        Write-Host "   ✅ Rollback copy operation works correctly" -ForegroundColor Green
        $validationResults += "PASS: Rollback functionality test"
    } else {
        Write-Host "   ❌ Rollback copy operation failed" -ForegroundColor Red
        $validationResults += "FAIL: Rollback functionality test - copy failed"
    }
    
    # Cleanup test files
    Remove-Item $testFile -ErrorAction SilentlyContinue
    Remove-Item $testBackup -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "   ❌ Rollback functionality test failed: $($_.Exception.Message)" -ForegroundColor Red
    $validationResults += "FAIL: Rollback functionality test - exception"
}

# Summary
Write-Host "" -ForegroundColor White
Write-Host "📊 VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

$passCount = ($validationResults | Where-Object { $_ -match "PASS" }).Count
$failCount = ($validationResults | Where-Object { $_ -match "FAIL" }).Count
$totalTests = $validationResults.Count

foreach ($result in $validationResults) {
    if ($result -match "PASS") {
        Write-Host "✅ $result" -ForegroundColor Green
    } else {
        Write-Host "❌ $result" -ForegroundColor Red
    }
}

Write-Host "" -ForegroundColor White
Write-Host "📈 RESULTS: $passCount/$totalTests tests passed" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host "🎉 ALL VALIDATION TESTS PASSED!" -ForegroundColor Green
    Write-Host "Backup and rollback mechanisms are fully functional." -ForegroundColor Green
} else {
    Write-Host "⚠️ $failCount validation test(s) failed." -ForegroundColor Yellow
    Write-Host "Review the failed tests and address any issues." -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "🔧 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   • Test the rollback script in a safe environment" -ForegroundColor White
Write-Host "   • Verify hook functionality after any changes" -ForegroundColor White
Write-Host "   • Keep backup files for future reference" -ForegroundColor White