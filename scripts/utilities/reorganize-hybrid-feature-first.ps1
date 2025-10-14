# Reorganize to Hybrid Feature-First Structure
# Priority: Feature Cohesion

Write-Host "🔄 Reorganizing to hybrid feature-first structure..." -ForegroundColor Blue
Write-Host "   Priority: Feature Cohesion" -ForegroundColor Cyan
Write-Host ""

$movedCount = 0

function Move-ToFeature {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Reason
    )
    
    if (Test-Path $Source) {
        Write-Host "📦 $Source" -ForegroundColor Yellow
        Write-Host "   → $Destination" -ForegroundColor Green
        Write-Host "   $Reason" -ForegroundColor Gray
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

Write-Host "Creating feature-first directory structure..." -ForegroundColor Cyan
Write-Host ""

# Create feature directories
$features = @("comments", "analytics", "load-more", "social", "auth")
foreach ($feature in $features) {
    $dirs = @(
        "docs/features/$feature/tasks",
        "docs/features/$feature/testing",
        "docs/features/$feature/reviews",
        "docs/features/$feature/security",
        "docs/features/$feature/guides",
        "docs/features/$feature/notes"
    )
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
}

# Create index directory
if (-not (Test-Path "docs/_indexes")) {
    New-Item -ItemType Directory -Path "docs/_indexes" -Force | Out-Null
}

Write-Host "✅ Directory structure created" -ForegroundColor Green
Write-Host ""
Write-Host "Moving files to feature directories..." -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# COMMENTS FEATURE
# ============================================================================

Write-Host "📁 Comments Feature" -ForegroundColor Magenta

# Tasks
Move-ToFeature "docs/tasks/comments/task-comments-10-implementation.md" "docs/features/comments/tasks/task-10-implementation.md" "Comments task"
Move-ToFeature "docs/tasks/comments/task-comments-11-summary.md" "docs/features/comments/tasks/task-11-summary.md" "Comments task"
Move-ToFeature "docs/tasks/comments/task-comments-11-complete.md" "docs/features/comments/tasks/task-11-complete.md" "Comments task"
Move-ToFeature "docs/tasks/comments/task-comments-11-implementation.md" "docs/features/comments/tasks/task-11-implementation.md" "Comments task"
Move-ToFeature "docs/tasks/comments/task-comments-11-verification.md" "docs/features/comments/tasks/task-11-verification.md" "Comments task"

# Reviews
Move-ToFeature "docs/reviews/comments/review-comments-final.md" "docs/features/comments/reviews/review-final.md" "Comments review"

# Security
Move-ToFeature "docs/security/comments/security-comments-rls-verification.md" "docs/features/comments/security/security-rls-verification.md" "Comments security"
Move-ToFeature "docs/security/comments/security-comments-audit.md" "docs/features/comments/security/security-audit.md" "Comments security"

# ============================================================================
# ANALYTICS FEATURE
# ============================================================================

Write-Host "📁 Analytics Feature" -ForegroundColor Magenta

# Tasks
Move-ToFeature "docs/tasks/analytics/task-analytics-9.3-summary.md" "docs/features/analytics/tasks/task-9.3-summary.md" "Analytics task"
Move-ToFeature "docs/tasks/analytics/task-analytics-9.5-summary.md" "docs/features/analytics/tasks/task-9.5-summary.md" "Analytics task"
Move-ToFeature "docs/tasks/analytics/task-analytics-14-summary.md" "docs/features/analytics/tasks/task-14-summary.md" "Analytics task"
Move-ToFeature "docs/tasks/analytics/task-analytics-14-performance.md" "docs/features/analytics/tasks/task-14-performance.md" "Analytics task"
Move-ToFeature "docs/tasks/analytics/task-analytics-14-testing-summary.md" "docs/features/analytics/tasks/task-14-testing-summary.md" "Analytics task"
Move-ToFeature "docs/tasks/analytics/task-analytics-15-summary.md" "docs/features/analytics/tasks/task-15-summary.md" "Analytics task"

# Testing
Move-ToFeature "docs/testing/results/analytics/test-analytics-dashboard-results.md" "docs/features/analytics/testing/test-dashboard-results.md" "Analytics test"
Move-ToFeature "docs/testing/results/analytics/test-analytics-performance-summary.md" "docs/features/analytics/testing/test-performance-summary.md" "Analytics test"
Move-ToFeature "docs/testing/results/analytics/test-analytics-performance-results.md" "docs/features/analytics/testing/test-performance-results.md" "Analytics test"
Move-ToFeature "docs/testing/results/analytics/test-analytics-integration-summary.md" "docs/features/analytics/testing/test-integration-summary.md" "Analytics test"
Move-ToFeature "docs/testing/results/analytics/test-analytics-toast-mobile.md" "docs/features/analytics/testing/test-toast-mobile.md" "Analytics test"

# Guides
Move-ToFeature "docs/guides/testing/guide-testing-analytics-manual.md" "docs/features/analytics/guides/guide-testing-manual.md" "Analytics guide"
Move-ToFeature "docs/testing/checklists/checklist-performance-validation.md" "docs/features/analytics/testing/checklist-performance-validation.md" "Analytics checklist"

# ============================================================================
# LOAD-MORE FEATURE
# ============================================================================

Write-Host "📁 Load-More Feature" -ForegroundColor Magenta

# Guides
Move-ToFeature "docs/guides/deployment/guide-load-more-deployment.md" "docs/features/load-more/guides/guide-deployment.md" "Load-more guide"
Move-ToFeature "docs/guides/development/guide-load-more-troubleshooting.md" "docs/features/load-more/guides/guide-troubleshooting.md" "Load-more guide"

# ============================================================================
# PROJECT-WIDE (Not feature-specific)
# ============================================================================

Write-Host "📁 Project-Wide Documentation" -ForegroundColor Magenta

# Testing guides (general)
Move-ToFeature "docs/guides/testing/guide-testing-browser-console.md" "docs/project/guides/guide-testing-browser-console.md" "Project guide"
Move-ToFeature "docs/guides/testing/guide-testing-performance-index.md" "docs/project/guides/guide-testing-performance-index.md" "Project guide"
Move-ToFeature "docs/guides/testing/guide-testing-quick-performance.md" "docs/project/guides/guide-testing-quick-performance.md" "Project guide"
Move-ToFeature "docs/guides/testing/guide-testing-lighthouse.md" "docs/project/guides/guide-testing-lighthouse.md" "Project guide"
Move-ToFeature "docs/guides/testing/guide-testing-performance-validation.md" "docs/project/guides/guide-testing-performance-validation.md" "Project guide"

# Testing results (project-wide)
Move-ToFeature "docs/testing/results/project/test-project-browser-verification.md" "docs/project/testing/test-browser-verification.md" "Project test"
Move-ToFeature "docs/testing/results/project/test-project-creator-filter.md" "docs/project/testing/test-creator-filter.md" "Project test"
Move-ToFeature "docs/testing/results/project/test-project-mobile-accessibility.md" "docs/project/testing/test-mobile-accessibility.md" "Project test"

# Reviews (project-wide)
Move-ToFeature "docs/reviews/project/review-project-code-quality.md" "docs/project/reviews/review-code-quality.md" "Project review"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "✅ Reorganization complete!" -ForegroundColor Green
Write-Host "   Files moved: $movedCount" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  Next steps:" -ForegroundColor Yellow
Write-Host "   1. Create README.md for each feature" -ForegroundColor Gray
Write-Host "   2. Generate index files" -ForegroundColor Gray
Write-Host "   3. Update automation scripts" -ForegroundColor Gray
Write-Host "   4. Test and commit" -ForegroundColor Gray
Write-Host ""
