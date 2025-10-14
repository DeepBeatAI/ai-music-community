# Organize Supabase Migrations Directory
# Move documentation files out, keep only SQL migrations

Write-Host "[*] Organizing supabase/migrations/ directory..." -ForegroundColor Blue
Write-Host ""

$movedCount = 0

function Move-MigrationDoc {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Reason
    )
    
    if (Test-Path $Source) {
        Write-Host "[MOVE] $Source" -ForegroundColor Yellow
        Write-Host "    -> $Destination" -ForegroundColor Green
        Write-Host "    Reason: $Reason" -ForegroundColor Gray
        Write-Host ""
        
        $destDir = Split-Path -Parent $Destination
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Move-Item -Path $Source -Destination $Destination -Force
        $script:movedCount++
        return $true
    }
    return $false
}

Write-Host "Creating database documentation structure..." -ForegroundColor Cyan
Write-Host ""

# Create directories
$dirs = @(
    "docs/database/migrations/comments",
    "docs/database/migrations/analytics",
    "docs/database/migrations/performance",
    "docs/database/migrations/edit-tracking",
    "docs/database/testing",
    "docs/database/utilities",
    "docs/database/guides"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "[OK] Directory structure created" -ForegroundColor Green
Write-Host ""
Write-Host "Moving files..." -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# TASK SUMMARIES -> Feature Directories
# ============================================================================

Write-Host "[CATEGORY] Task Summaries -> Features" -ForegroundColor Magenta

# Comments tasks
Move-MigrationDoc "supabase/migrations/TASK_2_COMPLETION_SUMMARY.md" "docs/features/comments/tasks/task-02-summary.md" "Comments task"
Move-MigrationDoc "supabase/migrations/TASK_2_VERIFICATION_REPORT.md" "docs/features/comments/tasks/task-02-verification.md" "Comments task"
Move-MigrationDoc "supabase/migrations/TASK_3_COMPLETION_SUMMARY.md" "docs/features/comments/tasks/task-03-summary.md" "Comments task"
Move-MigrationDoc "supabase/migrations/TASK_3_RLS_VALIDATION.md" "docs/features/comments/tasks/task-03-rls-validation.md" "Comments task"
Move-MigrationDoc "supabase/migrations/TASK_11_COMPLETION_SUMMARY.md" "docs/features/comments/tasks/task-11-completion-summary.md" "Comments task"
Move-MigrationDoc "supabase/migrations/TASK_12_COMPLETION_SUMMARY.md" "docs/features/comments/tasks/task-12-summary.md" "Comments task"

# Analytics tasks
Move-MigrationDoc "supabase/migrations/TASK_1_EDIT_TRACKING_SUMMARY.md" "docs/features/analytics/tasks/task-01-edit-tracking-summary.md" "Analytics task"
Move-MigrationDoc "supabase/migrations/TASK_4_COMPLETION_SUMMARY.md" "docs/features/analytics/tasks/task-04-summary.md" "Analytics task"
Move-MigrationDoc "supabase/migrations/TASK_4.1_COMPLETION_SUMMARY.md" "docs/features/analytics/tasks/task-04.1-summary.md" "Analytics task"
Move-MigrationDoc "supabase/migrations/TASK_4.2_MANUAL_TESTING_GUIDE.md" "docs/features/analytics/tasks/task-04.2-manual-testing.md" "Analytics task"
Move-MigrationDoc "supabase/migrations/TASK_5_COMPLETION_SUMMARY.md" "docs/features/analytics/tasks/task-05-summary.md" "Analytics task"
Move-MigrationDoc "supabase/migrations/TASK_5_BACKFILL_VALIDATION_GUIDE.md" "docs/features/analytics/tasks/task-05-backfill-validation.md" "Analytics task"
Move-MigrationDoc "supabase/migrations/TASK_5.3_BACKFILL_VALIDATION_GUIDE.md" "docs/features/analytics/tasks/task-05.3-backfill-validation.md" "Analytics task"

# ============================================================================
# MIGRATION GUIDES → Database Migrations
# ============================================================================

Write-Host "📁 Migration Guides → Database" -ForegroundColor Magenta

# Comments migrations
Move-MigrationDoc "supabase/migrations/003_APPLY_MIGRATION_GUIDE.md" "docs/database/migrations/comments/migration-003-apply-guide.md" "Comments migration"
Move-MigrationDoc "supabase/migrations/003_TASK_SUMMARY.md" "docs/database/migrations/comments/migration-003-summary.md" "Comments migration"

# Analytics migrations
Move-MigrationDoc "supabase/migrations/20250111000000_APPLY_GUIDE.md" "docs/database/migrations/analytics/migration-20250111-apply-guide.md" "Analytics migration"
Move-MigrationDoc "supabase/migrations/20250111000000_IMPLEMENTATION_SUMMARY.md" "docs/database/migrations/analytics/migration-20250111-summary.md" "Analytics migration"
Move-MigrationDoc "supabase/migrations/20250111000000_VALIDATION_CHECKLIST.md" "docs/database/migrations/analytics/migration-20250111-validation.md" "Analytics migration"
Move-MigrationDoc "supabase/migrations/ANALYTICS_MIGRATION_GUIDE.md" "docs/database/migrations/analytics/guide-analytics-migration.md" "Analytics migration"

# Performance migrations
Move-MigrationDoc "supabase/migrations/004_IMPLEMENTATION_SUMMARY.md" "docs/database/migrations/performance/migration-004-summary.md" "Performance migration"

# Edit tracking migrations
Move-MigrationDoc "supabase/migrations/APPLY_EDIT_TRACKING_MIGRATION.md" "docs/database/migrations/edit-tracking/migration-apply.md" "Edit tracking migration"

# ============================================================================
# TEST FILES -> Database Testing
# ============================================================================

Write-Host "[CATEGORY] Test Files -> Database Testing" -ForegroundColor Magenta

Move-MigrationDoc "supabase/migrations/test_analytics_schema.sql" "docs/database/testing/test-analytics-schema.sql" "Test file"
Move-MigrationDoc "supabase/migrations/test_collect_daily_metrics.sql" "docs/database/testing/test-collect-daily-metrics.sql" "Test file"
Move-MigrationDoc "supabase/migrations/test_edit_authorization_rls.sql" "docs/database/testing/test-edit-authorization-rls.sql" "Test file"
Move-MigrationDoc "supabase/migrations/test_edit_tracking_triggers.sql" "docs/database/testing/test-edit-tracking-triggers.sql" "Test file"
Move-MigrationDoc "supabase/migrations/test_metric_definitions_seed.sql" "docs/database/testing/test-metric-definitions-seed.sql" "Test file"
Move-MigrationDoc "supabase/migrations/test_rls_policies.sql" "docs/database/testing/test-rls-policies.sql" "Test file"
Move-MigrationDoc "supabase/migrations/validate_analytics_migration.sql" "docs/database/testing/validate-analytics-migration.sql" "Validation file"
Move-MigrationDoc "supabase/migrations/validate_backfill_results.sql" "docs/database/testing/validate-backfill-results.sql" "Validation file"
Move-MigrationDoc "supabase/migrations/validate_index_performance.sql" "docs/database/testing/validate-index-performance.sql" "Validation file"
Move-MigrationDoc "supabase/migrations/verify_edit_tracking.sql" "docs/database/testing/verify-edit-tracking.sql" "Verification file"
Move-MigrationDoc "supabase/migrations/DEBUG_check_timestamps.sql" "docs/database/testing/debug-check-timestamps.sql" "Debug file"
Move-MigrationDoc "supabase/migrations/performance_validation.sql" "docs/database/testing/performance-validation.sql" "Validation file"

# ============================================================================
# UTILITY SCRIPTS -> Database Utilities
# ============================================================================

Write-Host "[CATEGORY] Utility Scripts -> Database Utilities" -ForegroundColor Magenta

Move-MigrationDoc "supabase/migrations/EXECUTE_BACKFILL.sql" "docs/database/utilities/execute-backfill.sql" "Utility script"
Move-MigrationDoc "supabase/migrations/run_backfill.sql" "docs/database/utilities/run-backfill.sql" "Utility script"
Move-MigrationDoc "supabase/migrations/run_manual_tests.sql" "docs/database/utilities/run-manual-tests.sql" "Utility script"
Move-MigrationDoc "supabase/migrations/manual_test_triggers.sql" "docs/database/utilities/manual-test-triggers.sql" "Utility script"
Move-MigrationDoc "supabase/migrations/FIX_disable_trigger_then_update.sql" "docs/database/utilities/fix-disable-trigger-then-update.sql" "Fix script"
Move-MigrationDoc "supabase/migrations/FIX_EDITED_BADGE_GUIDE.md" "docs/database/utilities/fix-edited-badge-guide.md" "Fix guide"
Move-MigrationDoc "supabase/migrations/FIX_reset_updated_at_for_unedited_posts.sql" "docs/database/utilities/fix-reset-updated-at.sql" "Fix script"
Move-MigrationDoc "supabase/migrations/FORCE_FIX_all_timestamps.sql" "docs/database/utilities/force-fix-all-timestamps.sql" "Fix script"
Move-MigrationDoc "supabase/migrations/SAFE_add_updated_at_to_posts.sql" "docs/database/utilities/safe-add-updated-at-to-posts.sql" "Utility script"

# ============================================================================
# GUIDES -> Database Guides
# ============================================================================

Write-Host "[CATEGORY] Guides -> Database Guides" -ForegroundColor Magenta

Move-MigrationDoc "supabase/migrations/INDEX_DOCUMENTATION.md" "docs/database/guides/guide-index-documentation.md" "Guide"
Move-MigrationDoc "supabase/migrations/METRIC_DEFINITIONS_USAGE_GUIDE.md" "docs/database/guides/guide-metric-definitions.md" "Guide"
Move-MigrationDoc "supabase/migrations/QUICK_REFERENCE.md" "docs/database/guides/guide-quick-reference.md" "Guide"
Move-MigrationDoc "supabase/migrations/APPLY_SAFE_MIGRATION.md" "docs/database/guides/guide-safe-migration.md" "Guide"
Move-MigrationDoc "supabase/migrations/AUTHORIZATION_VERIFICATION_GUIDE.md" "docs/database/guides/guide-authorization-verification.md" "Guide"
Move-MigrationDoc "supabase/migrations/DEBUG_GUIDE.md" "docs/database/guides/guide-debug.md" "Guide"
Move-MigrationDoc "supabase/migrations/FINAL_FIX_GUIDE.md" "docs/database/guides/guide-final-fix.md" "Guide"
Move-MigrationDoc "supabase/migrations/REAL_FIX_GUIDE.md" "docs/database/guides/guide-real-fix.md" "Guide"

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "[OK] Organization complete!" -ForegroundColor Green
Write-Host "     Files moved: $movedCount" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "[SUCCESS] supabase/migrations/ now contains only SQL migrations!" -ForegroundColor Green
Write-Host ""
