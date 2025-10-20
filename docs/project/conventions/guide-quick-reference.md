# File Organization Quick Reference

## Naming Convention

**Format:** `[type]-[descriptor].md`

**Type Prefixes:**
- `guide-` → How-to guides
- `task-` → Task summaries
- `test-` → Test results
- `review-` → Code reviews
- `security-` → Security audits
- `spec-` → Specifications
- `status-` → Status reports
- `summary-` → Summaries
- `feature-` → Feature notes
- `checklist-` → Checklists

**Rules:**
- ✅ All lowercase
- ✅ Use hyphens
- ❌ NO ALL CAPS
- ❌ NO spaces
- ❌ NO underscores

## Directory Structure

```
docs/features/{feature}/
├── README.md          # Feature hub
├── guides/            # How-to guides
├── tasks/             # Task summaries
├── testing/           # Test results
├── reviews/           # Code reviews
├── security/          # Security audits
├── specs/             # Specifications
└── notes/             # Development notes
```

## Quick Examples

### Creating a Guide
```
docs/features/analytics/guides/guide-deployment.md
```

### Creating a Task
```
docs/features/comments/tasks/task-01-setup.md
```

### Creating a Test
```
docs/features/load-more/testing/test-integration-results.md
```

### Creating a Review
```
docs/features/social/reviews/review-code-quality.md
```

## Common Mistakes

❌ `docs/features/analytics/DEPLOYMENT_GUIDE.md`
✅ `docs/features/analytics/guides/guide-deployment.md`

❌ `docs/ANALYTICS_GUIDE.md`
✅ `docs/features/analytics/guides/guide-analytics.md`

❌ `analytics-guide.md` (in root)
✅ `docs/features/analytics/guides/guide-overview.md`

## Automatic Organization

Files in wrong locations will be automatically moved on commit by the pre-commit hook.

## Manual Organization

Run this command to organize files manually:
```bash
bash scripts/utilities/organize-files.sh
```

Or on Windows:
```powershell
.\scripts\utilities\organize-files.ps1
```
