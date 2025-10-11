# Project Reorganization Plan

## Overview
This document outlines the complete reorganization of non-code files in the project.

## New Directory Structure

```
├── docs/
│   ├── features/              # Feature-specific documentation
│   │   ├── analytics/         # Analytics feature docs
│   │   ├── load-more/         # Load more feature docs
│   │   └── [other-features]/
│   ├── testing/               # All testing documentation
│   │   ├── guides/            # Testing guides and procedures
│   │   ├── manual-tests/      # Manual test procedures
│   │   └── test-results/      # Test execution results
│   ├── security/              # Security audits and reports
│   ├── reviews/               # Code reviews and quality reports
│   ├── tasks/                 # Task completion summaries
│   ├── migrations/            # Migration guides and docs
│   ├── reports/               # Performance and audit reports
│   └── [architecture/design/legal remain as-is]
│
├── scripts/
│   ├── database/              # Database scripts
│   ├── deployment/            # Deployment scripts
│   ├── testing/               # Test scripts
│   └── utilities/             # Utility scripts
│
├── tests/                     # Test files (NEW)
│   ├── html/                  # HTML test files
│   ├── scripts/               # Test scripts
│   └── reports/               # Test reports (HTML/JSON)
│
├── .kiro/                     # Kiro configuration (existing structure maintained)
│   ├── specs/
│   ├── steering/
│   ├── hooks/
│   └── [other kiro dirs]
│
└── [root level - only essential files]
    ├── README.md
    ├── CHANGELOG.md
    ├── package.json
    └── [config files]
```

## File Movements

### From `docs/` root → Organized subdirectories

| Current Location | New Location | Category |
|-----------------|--------------|----------|
| `docs/analytics-dashboard-manual-test-guide.md` | `docs/testing/manual-tests/analytics-dashboard-manual-test-guide.md` | Testing |
| `docs/analytics-dashboard-test-results.md` | `docs/testing/test-results/analytics-dashboard-test-results.md` | Testing |
| `docs/analytics-deletion-behavior-analysis.md` | `docs/features/analytics/deletion-behavior-analysis.md` | Feature |
| `docs/analytics-tooltip-fix.md` | `docs/features/analytics/tooltip-fix.md` | Feature |
| `docs/bandwidth-monitor-consolidation.md` | `docs/features/bandwidth-monitor-consolidation.md` | Feature |
| `docs/final-code-review.md` | `docs/reviews/final-code-review.md` | Review |
| `docs/load-more-deployment-guide.md` | `docs/features/load-more/deployment-guide.md` | Feature |
| `docs/load-more-system-documentation.md` | `docs/features/load-more/system-documentation.md` | Feature |
| `docs/load-more-troubleshooting-guide.md` | `docs/features/load-more/troubleshooting-guide.md` | Feature |
| `docs/mobile-accessibility-test-results.md` | `docs/testing/test-results/mobile-accessibility-test-results.md` | Testing |
| `docs/performance-index-testing-guide.md` | `docs/testing/guides/performance-index-testing-guide.md` | Testing |
| `docs/performance-optimization-test-summary.md` | `docs/testing/test-results/performance-optimization-test-summary.md` | Testing |
| `docs/quick-performance-test.md` | `docs/testing/guides/quick-performance-test.md` | Testing |
| `docs/rls-policy-verification.md` | `docs/security/rls-policy-verification.md` | Security |
| `docs/security-audit-report.md` | `docs/security/security-audit-report.md` | Security |
| `docs/task-11-summary.md` | `docs/tasks/task-11-summary.md` | Task |
| `docs/task-9.3-completion-summary.md` | `docs/tasks/task-9.3-completion-summary.md` | Task |

### From `root/` → Organized locations

| Current Location | New Location | Category |
|-----------------|--------------|----------|
| `APPLY_COMMENTS_MIGRATION.md` | `docs/migrations/APPLY_COMMENTS_MIGRATION.md` | Migration |
| `dashboard-filter-test.html` | `tests/html/dashboard-filter-test.html` | Test |
| `debug_dashboard_backup.js` | `tests/scripts/debug_dashboard_backup.js` | Test (⚠️ DELETE CANDIDATE) |
| `quick-hook-test.js` | `tests/scripts/quick-hook-test.js` | Test |
| `test_dashboard_query_backup.js` | `tests/scripts/test_dashboard_query_backup.js` | Test (⚠️ DELETE CANDIDATE) |
| `test-typescript-hook-validation.js` | `scripts/testing/test-typescript-hook-validation.js` | Script |
| `validate-typescript-hook.ps1` | `scripts/testing/validate-typescript-hook.ps1` | Script |
| `validate-typescript-hook.sh` | `scripts/testing/validate-typescript-hook.sh` | Script |
| `save_progress.sh` | `scripts/utilities/save_progress.sh` | Utility |

### From `client/` → Organized locations

| Current Location | New Location | Category |
|-----------------|--------------|----------|
| `client/BROWSER_CONSOLE_VERIFICATION_GUIDE.md` | `docs/testing/guides/browser-console-verification-guide.md` | Testing |
| `client/BROWSER_VERIFICATION_RESULTS.md` | `docs/testing/test-results/browser-verification-results.md` | Testing |
| `client/CODE_QUALITY_REPORT.md` | `docs/reviews/code-quality-report.md` | Review |
| `client/creator-filter-verification.md` | `docs/testing/test-results/creator-filter-verification.md` | Testing |
| `client/performance-test-results.md` | `docs/testing/test-results/performance-test-results.md` | Testing |
| `client/run-lighthouse-audit.md` | `docs/testing/guides/run-lighthouse-audit.md` | Testing |
| `client/TASK_9.5_COMPLETION_SUMMARY.md` | `docs/tasks/task-9.5-completion-summary.md` | Task |
| `client/chromewebdata_2025-10-08_20-42-02.report.html` | `tests/reports/chromewebdata_2025-10-08_20-42-02.report.html` | Report (⚠️ DELETE CANDIDATE) |
| `client/localhost_2025-10-08_20-43-50.report.html` | `tests/reports/localhost_2025-10-08_20-43-50.report.html` | Report (⚠️ DELETE CANDIDATE) |
| `client/lighthouse-report.html` | `tests/reports/lighthouse-report.html` | Report (⚠️ DELETE CANDIDATE) |
| `client/eslint-report.json` | `tests/reports/eslint-report.json` | Report (⚠️ DELETE CANDIDATE) |
| `client/test-creator-filter-fix.html` | `tests/html/test-creator-filter-fix.html` | Test |
| `client/test-search-bar-fix.html` | `tests/html/test-search-bar-fix.html` | Test |
| `client/test-search-filters-fix.html` | `tests/html/test-search-filters-fix.html` | Test |
| `client/creator-filter-fix-verification.html` | `tests/html/creator-filter-fix-verification.html` | Test |
| `client/check-searchbar-types.js` | `tests/scripts/check-searchbar-types.js` | Test |
| `client/check-types.sh` | `scripts/testing/check-types.sh` | Script |
| `client/create_performance_analytics_table.sql` | `scripts/database/create_performance_analytics_table.sql` | Database |
| `client/commit_aggressive_compression.bat` | `scripts/deployment/commit_aggressive_compression.bat` | Deployment (⚠️ DELETE CANDIDATE) |
| `client/commit_compression_integration.bat` | `scripts/deployment/commit_compression_integration.bat` | Deployment (⚠️ DELETE CANDIDATE) |
| `client/final_deployment_commit.bat` | `scripts/deployment/final_deployment_commit.bat` | Deployment (⚠️ DELETE CANDIDATE) |
| `client/install_audio_compression.bat` | `scripts/deployment/install_audio_compression.bat` | Deployment (⚠️ DELETE CANDIDATE) |
| `client/install_audio_compression.sh` | `scripts/deployment/install_audio_compression.sh` | Deployment (⚠️ DELETE CANDIDATE) |
| `client/final_compression_validation.sh` | `scripts/testing/final_compression_validation.sh` | Testing (⚠️ DELETE CANDIDATE) |
| `client/test_compression_integration.sh` | `scripts/testing/test_compression_integration.sh` | Testing (⚠️ DELETE CANDIDATE) |

### From `scripts/` → Organized subdirectories

| Current Location | New Location | Category |
|-----------------|--------------|----------|
| `scripts/test-rls-policies.sql` | `scripts/database/test-rls-policies.sql` | Database |
| `scripts/test-typescript-hook-validation.js` | `scripts/testing/test-typescript-hook-validation.js` | Testing |

## Files Flagged for Deletion Review

### ⚠️ Backup/Debug Files (Likely Temporary)
- `debug_dashboard_backup.js` - Backup file, likely obsolete
- `test_dashboard_query_backup.js` - Backup file, likely obsolete

### ⚠️ Old Reports (Dated October 8, 2025)
- `client/chromewebdata_2025-10-08_20-42-02.report.html` - Old performance report
- `client/localhost_2025-10-08_20-43-50.report.html` - Old performance report
- `client/lighthouse-report.html` - Old lighthouse report
- `client/eslint-report.json` - Old eslint report

### ⚠️ Deployment Scripts (If Already Deployed)
- `client/commit_aggressive_compression.bat` - One-time deployment script
- `client/commit_compression_integration.bat` - One-time deployment script
- `client/final_deployment_commit.bat` - One-time deployment script
- `client/install_audio_compression.bat` - One-time install script
- `client/install_audio_compression.sh` - One-time install script
- `client/final_compression_validation.sh` - One-time validation script
- `client/test_compression_integration.sh` - One-time test script

## Files to Keep in Root
- `README.md` - Project readme
- `CHANGELOG.md` - Project changelog
- `package.json` - Node dependencies
- `package-lock.json` - Lock file
- `.gitignore` - Git configuration
- `.gitattributes` - Git configuration
- Config files (tsconfig, eslint, etc.)

## Implementation Status

### ✅ Completed
- Created new directory structure
- Moved security documentation
- Moved testing documentation (partial)

### 🔄 In Progress
- Moving all remaining files
- Creating deletion candidates list

### ⏳ Pending
- User review of deletion candidates
- Final cleanup
- Update any references in code/docs

## Benefits of New Structure

1. **Clear Organization**: Files grouped by purpose (testing, features, security, etc.)
2. **Easy Navigation**: Logical hierarchy makes finding files intuitive
3. **Scalability**: Structure supports future growth
4. **Separation**: Test files separated from documentation
5. **Maintainability**: Related files grouped together

## Next Steps

1. Complete all file movements
2. Review deletion candidates with user
3. Delete approved files
4. Update any hardcoded paths in scripts/docs
5. Commit changes with descriptive message
6. Update project documentation to reflect new structure
