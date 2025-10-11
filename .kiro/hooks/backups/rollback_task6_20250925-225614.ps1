# TypeScript Hook Rollback Script - Task 6
# Created: 2025-09-25 22:56:14
# Purpose: Rollback compact reporting optimization changes

Write-Host "🔄 TypeScript Hook Rollback Script - Task 6" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Define paths
$backupFile = ".kiro/hooks/backups/ts-error-checker.kiro.hook.backup-task6-20250925-225614"
$originalFile = ".kiro/hooks/ts-error-checker.kiro.hook"
$currentBackup = ".kiro/hooks/backups/ts-error-checker.kiro.hook.current-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Verify backup file exists
if (-not (Test-Path $backupFile)) {
    Write-Host "❌ ERROR: Backup file not found at $backupFile" -ForegroundColor Red
    Write-Host "Cannot proceed with rollback." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backup file found: $backupFile" -ForegroundColor Green

# Create backup of current state before rollback
Write-Host "📦 Creating backup of current state..." -ForegroundColor Yellow
try {
    Copy-Item $originalFile $currentBackup -ErrorAction Stop
    Write-Host "✅ Current state backed up to: $currentBackup" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to backup current state: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Perform rollback
Write-Host "🔄 Rolling back to previous version..." -ForegroundColor Yellow
try {
    Copy-Item $backupFile $originalFile -ErrorAction Stop
    Write-Host "✅ Rollback completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Rollback failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Attempting to restore current state..." -ForegroundColor Yellow
    try {
        Copy-Item $currentBackup $originalFile -ErrorAction Stop
        Write-Host "✅ Current state restored." -ForegroundColor Green
    } catch {
        Write-Host "❌ CRITICAL ERROR: Failed to restore current state!" -ForegroundColor Red
        Write-Host "Manual intervention required." -ForegroundColor Red
    }
    exit 1
}

# Verify rollback
Write-Host "🔍 Verifying rollback..." -ForegroundColor Yellow
if (Test-Path $originalFile) {
    $fileSize = (Get-Item $originalFile).Length
    Write-Host "✅ Hook file exists (Size: $fileSize bytes)" -ForegroundColor Green
    
    # Show first few lines to confirm content
    Write-Host "📄 File content preview:" -ForegroundColor Cyan
    Get-Content $originalFile | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "❌ ERROR: Hook file missing after rollback!" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 ROLLBACK COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   • Original file restored from: $backupFile" -ForegroundColor White
Write-Host "   • Current state backed up to: $currentBackup" -ForegroundColor White
Write-Host "   • Hook functionality should be restored to pre-task6 state" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "⚠️  IMPORTANT: Test the hook functionality to ensure proper restoration!" -ForegroundColor Yellow
Write-Host "   Run the TypeScript error checker manually to verify operation." -ForegroundColor Yellow