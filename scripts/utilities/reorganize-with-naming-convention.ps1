# Reorganize files with new naming convention
# This script renames and moves files according to the new structure

Write-Host "🔄 Reorganizing files with new naming convention..." -ForegroundColor Blue
Write-Host ""

$movedCount = 0
$renamedCount = 0

# Function to move and rename file
function Move-AndRename {
    param(
        [string]$OldPath,
        [string]$NewPath,
        [string]$Reason
    )
    
    if (Test-Path $OldPath) {
        Write-Host "📦 $OldPath" -ForegroundColor Yellow
        Write-Host "   → $NewPath" -ForegroundColor Green
        Write-Host "   Reason: $Reason" -ForegroundColor Gray
        Write-Host ""
        
        # Create destination directory
        $destDir = Split-Path -Parent $NewPath
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        # Move and rename
        Move-Item -Path $OldPath -Destination $NewPath -Force
        
        $script:movedCount++
        $script:renamedCount++
        return $true
    }
    return $false
}

Write-Host "Creating new directory structure..." -ForegroundColor Cyan
# Create new directories
$directories = @(
    "docs/specs/comments",
    "docs/specs/analytics",
    "docs/specs/load-more",
    "docs/specs/social",
    "docs/tasks/comments",
    "docs/tasks/analytics",
    "docs/tasks/load-more",
    "docs/tasks/project",
    "docs/testing/results/comments",
    "docs/testing/results/analytics",
    "docs/testing/results/load-more",
    "docs/testing/checklists",
    "docs/reviews/comments",
    "docs/reviews/analytics",
    "docs/reviews/project",
    "docs/security/comments",
    "docs/security/analytics",
    "docs/guides/deployment",
    "docs/guides/testing",
    "docs/guides/development",
    "docs/migrations/project",
    "docs/project/conventions",
    "docs/project/architecture",
    "docs/project/processes"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "✅ Directory structure created" -ForegroundColor Green
Write-Host ""
Write-Host "Reorganizing files..." -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# TASKS - Reorganize by feature
# ============================================================================

Move-AndRename "docs/tasks/task-11-summary.md" "docs/tasks/comments/task-comments-11-summary.md" "Comments task summary"
Move-AndRename "docs/tasks/task-9.3-completion-summary.md" "docs/tasks/analytics/task-analytics-9.3-summary.md" "Analytics task summary"
Move-AndRename "docs/tasks/task-9.5-completion-summary.md" "docs/tasks/analytics/task-analytics-9.5-summary.md" "Analytics task summary"
Move-AndRename "docs/tasks/task_10_implementation_summary.md" "docs/tasks/comments/task-comments-10-implementation.md" "Comments implementation"
Move-AndRename "docs/tasks/task_11_implementation_complete.md" "docs/tasks/comments/task-comments-11-complete.md" "Comments completion"
Move-AndRename "docs/tasks/task_11_implementation_summary.md" "docs/tasks/comments/task-comments-11-implementation.md" "Comments implementation"
Move-AndRename "docs/tasks/task_11_verification_complete.md" "docs/tasks/comments/task-comments-11-verification.md" "Comments verification"
Move-AndRename "docs/tasks/task_14_completion_summary.md" "docs/tasks/analytics/task-analytics-14-summary.md" "Analytics task summary"
Move-AndRename "docs/tasks/task_14_performance_validation.md" "docs/tasks/analytics/task-analytics-14-performance.md" "Analytics performance"

# ============================================================================
# TESTING - Reorganize by feature
# ============================================================================

# Analytics testing
Move-AndRename "docs/testing/test-results/analytics-dashboard-test-results.md" "docs/testing/results/analytics/test-analytics-dashboard-results.md" "Analytics test results"
Move-AndRename "docs/testing/test-results/performance-optimization-test-summary.md" "docs/testing/results/analytics/test-analytics-performance-summary.md" "Analytics performance"
Move-AndRename "docs/testing/test-results/performance-test-results.md" "docs/testing/results/analytics/test-analytics-performance-results.md" "Analytics performance"
Move-AndRename "docs/testing/test-results/integration_test_summary.md" "docs/testing/results/analytics/test-analytics-integration-summary.md" "Analytics integration"
Move-AndRename "docs/testing/test-results/toast_mobile_testing.md" "docs/testing/results/analytics/test-analytics-toast-mobile.md" "Analytics mobile testing"

# General testing
Move-AndRename "docs/testing/test-results/browser-verification-results.md" "docs/testing/results/project/test-project-browser-verification.md" "Browser verification"
Move-AndRename "docs/testing/test-results/creator-filter-verification.md" "docs/testing/results/project/test-project-creator-filter.md" "Creator filter test"
Move-AndRename "docs/testing/test-results/mobile-accessibility-test-results.md" "docs/testing/results/project/test-project-mobile-accessibility.md" "Mobile accessibility"

# Testing guides
Move-AndRename "docs/testing/guides/browser-console-verification-guide.md" "docs/guides/testing/guide-testing-browser-console.md" "Browser console guide"
Move-AndRename "docs/testing/guides/performance-index-testing-guide.md" "docs/guides/testing/guide-testing-performance-index.md" "Performance testing guide"
Move-AndRename "docs/testing/guides/quick-performance-test.md" "docs/guides/testing/guide-testing-quick-performance.md" "Quick performance guide"
Move-AndRename "docs/testing/guides/run-lighthouse-audit.md" "docs/guides/testing/guide-testing-lighthouse.md" "Lighthouse guide"

# Testing checklists
Move-AndRename "docs/testing/PERFORMANCE_VALIDATION_CHECKLIST.md" "docs/testing/checklists/checklist-performance-validation.md" "Performance checklist"
Move-AndRename "docs/testing/PERFORMANCE_VALIDATION_GUIDE.md" "docs/guides/testing/guide-testing-performance-validation.md" "Performance validation guide"
Move-AndRename "docs/testing/TASK_14_SUMMARY.md" "docs/tasks/analytics/task-analytics-14-testing-summary.md" "Analytics testing summary"

# Manual tests
Move-AndRename "docs/testing/manual-tests/analytics-dashboard-manual-test-guide.md" "docs/guides/testing/guide-testing-analytics-manual.md" "Analytics manual test guide"

# ============================================================================
# REVIEWS - Reorganize by feature
# ============================================================================

Move-AndRename "docs/reviews/final-code-review.md" "docs/reviews/comments/review-comments-final.md" "Comments final review"
Move-AndRename "docs/reviews/code-quality-report.md" "docs/reviews/project/review-project-code-quality.md" "Project code quality"

# ============================================================================
# SECURITY - Reorganize by feature
# ============================================================================

Move-AndRename "docs/security/rls-policy-verification.md" "docs/security/comments/security-comments-rls-verification.md" "Comments RLS verification"
Move-AndRename "docs/security/security-audit-report.md" "docs/security/comments/security-comments-audit.md" "Comments security audit"

# ============================================================================
# FEATURES - Reorganize
# ============================================================================

# Analytics feature docs
Move-AndRename "docs/features/analytics/deletion-behavior-analysis.md" "docs/features/analytics/feature-analytics-deletion-behavior.md" "Analytics deletion behavior"
Move-AndRename "docs/features/analytics/tooltip-fix.md" "docs/features/analytics/feature-analytics-tooltip-fix.md" "Analytics tooltip fix"
Move-AndRename "docs/features/analytics/TASK_15_COMPLETION_SUMMARY.md" "docs/tasks/analytics/task-analytics-15-summary.md" "Analytics task 15"

# Load more feature docs
Move-AndRename "docs/features/load-more/deployment-guide.md" "docs/guides/deployment/guide-load-more-deployment.md" "Load more deployment"
Move-AndRename "docs/features/load-more/system-documentation.md" "docs/features/load-more/feature-load-more-system.md" "Load more system docs"
Move-AndRename "docs/features/load-more/troubleshooting-guide.md" "docs/guides/development/guide-load-more-troubleshooting.md" "Load more troubleshooting"

# Other features
Move-AndRename "docs/features/bandwidth-monitor-consolidation.md" "docs/features/analytics/feature-analytics-bandwidth-monitor.md" "Bandwidth monitor"

# ============================================================================
# MIGRATIONS - Reorganize
# ============================================================================

Move-AndRename "docs/migrations/APPLY_COMMENTS_MIGRATION.md" "docs/migrations/project/migration-comments-apply.md" "Comments migration"
Move-AndRename "docs/migrations/analytics_system_complete.md" "docs/migrations/project/migration-analytics-complete.md" "Analytics migration"
Move-AndRename "docs/migrations/automation-setup-complete.md" "docs/migrations/project/migration-project-automation-setup.md" "Automation setup"
Move-AndRename "docs/migrations/cleanup-complete.md" "docs/migrations/project/migration-project-cleanup.md" "Cleanup migration"
Move-AndRename "docs/migrations/commit-ready.md" "docs/migrations/project/migration-project-commit-ready.md" "Commit ready"
Move-AndRename "docs/migrations/CRITICAL-FIXES-APPLIED.md" "docs/migrations/project/migration-project-critical-fixes.md" "Critical fixes"
Move-AndRename "docs/migrations/deletion-candidates.md" "docs/migrations/project/migration-project-deletion-candidates.md" "Deletion candidates"
Move-AndRename "docs/migrations/file-organization-automation.md" "docs/migrations/project/migration-project-file-automation.md" "File automation"
Move-AndRename "docs/migrations/reference-updates-complete.md" "docs/migrations/project/migration-project-reference-updates.md" "Reference updates"
Move-AndRename "docs/migrations/reorganization-complete.md" "docs/migrations/project/migration-project-reorganization-complete.md" "Reorganization complete"
Move-AndRename "docs/migrations/reorganization-final.md" "docs/migrations/project/migration-project-reorganization-final.md" "Reorganization final"
Move-AndRename "docs/migrations/reorganization-plan.md" "docs/migrations/project/migration-project-reorganization-plan.md" "Reorganization plan"
Move-AndRename "docs/migrations/reorganization-summary.md" "docs/migrations/project/migration-project-reorganization-summary.md" "Reorganization summary"
Move-AndRename "docs/migrations/script-fixes-and-safeguards.md" "docs/migrations/project/migration-project-script-fixes.md" "Script fixes"

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "✅ Reorganization complete!" -ForegroundColor Green
Write-Host "   Files moved: $movedCount" -ForegroundColor Cyan
Write-Host "   Files renamed: $renamedCount" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review the changes" -ForegroundColor Gray
Write-Host "   2. Update cross-references (run update-references script)" -ForegroundColor Gray
Write-Host "   3. Test the new structure" -ForegroundColor Gray
Write-Host "   4. Commit the changes" -ForegroundColor Gray
Write-Host ""
