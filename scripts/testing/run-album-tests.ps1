# Album Flagging System - Complete Test Suite Runner
# This script runs all automated tests for the album flagging system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Album Flagging System - Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testResults = @()
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Run-TestFile {
    param(
        [string]$TestPath,
        [string]$Category
    )
    
    Write-Host "Running: $TestPath" -ForegroundColor Yellow
    $result = npm test -- --run $TestPath 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "✓ PASSED" -ForegroundColor Green
        $script:passedTests++
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        $script:failedTests++
    }
    
    $script:totalTests++
    $script:testResults += [PSCustomObject]@{
        Category = $Category
        TestFile = $TestPath
        Status = if ($exitCode -eq 0) { "PASSED" } else { "FAILED" }
        ExitCode = $exitCode
    }
    
    Write-Host ""
}

# Unit Tests
Write-Host "=== UNIT TESTS ===" -ForegroundColor Cyan
Run-TestFile "src/__tests__/unit/AlbumPageButtons.test.tsx" "Unit"
Run-TestFile "src/lib/__tests__/fetchAlbumContext.test.ts" "Unit"
Run-TestFile "src/lib/__tests__/moderationService.album.test.ts" "Unit"
Run-TestFile "src/components/moderation/__tests__/AlbumContextDisplay.test.tsx" "Unit"

# Property-Based Tests
Write-Host "=== PROPERTY-BASED TESTS ===" -ForegroundColor Cyan
Run-TestFile "src/lib/__tests__/fetchAlbumContext.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.album.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumAdminProtection.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumAuthorization.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumAuthorizationLogging.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumReportCreation.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumReportModal.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumRateLimit.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumModeratorFlag.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumActionLogging.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumCascadingLogging.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumReportStatus.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumInputValidation.property.test.ts" "Property"
Run-TestFile "src/lib/__tests__/moderationService.albumMetrics.property.test.ts" "Property"
Run-TestFile "src/components/moderation/__tests__/ModerationQueue.property.test.tsx" "Property"

# Integration Tests
Write-Host "=== INTEGRATION TESTS ===" -ForegroundColor Cyan
Run-TestFile "src/lib/__tests__/albumFlagging.database.integration.test.ts" "Integration"
Run-TestFile "src/lib/__tests__/albumFlagging.api.integration.test.ts" "Integration"
Run-TestFile "src/lib/__tests__/albumFlagging.e2e.integration.test.ts" "Integration"

# Performance Tests
Write-Host "=== PERFORMANCE TESTS ===" -ForegroundColor Cyan
Run-TestFile "src/lib/__tests__/moderationService.albumPerformance.test.ts" "Performance"

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Test Files: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host ""

# Display results by category
$testResults | Group-Object Category | ForEach-Object {
    Write-Host "$($_.Name) Tests:" -ForegroundColor Cyan
    $_.Group | ForEach-Object {
        $color = if ($_.Status -eq "PASSED") { "Green" } else { "Red" }
        Write-Host "  [$($_.Status)] $($_.TestFile)" -ForegroundColor $color
    }
    Write-Host ""
}

# Exit with error if any tests failed
if ($failedTests -gt 0) {
    Write-Host "Some tests failed. Please review the output above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
}
