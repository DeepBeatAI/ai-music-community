---
inclusion: always
---

# File Organization and Naming Standards

## CRITICAL RULES - ALWAYS FOLLOW

### 1. File Naming Convention

**ALL non-code documentation files MUST follow this format:**

```
[type]-[descriptor].md
```

**NEVER use:**

- ❌ ALL CAPS filenames (e.g., `README.md` is exception, but not `GUIDE.md`)
- ❌ Spaces in filenames
- ❌ Special characters except hyphens

**Type Prefixes (lowercase only):**

- `guide-` → How-to guides and implementation docs
- `task-` → Task summaries and tracking
- `test-` → Test results and validation
- `review-` → Code reviews and assessments
- `security-` → Security audits and analyses
- `migration-` → Database migrations and data migrations
- `spec-` → Specifications and designs
- `status-` → Status reports and updates
- `summary-` → Summary documents
- `feature-` → Feature notes and descriptions
- `checklist-` → Checklists and validation lists

**Examples:**

- ✅ `guide-deployment.md`
- ✅ `task-01-setup.md`
- ✅ `test-integration-results.md`
- ✅ `review-code-quality.md`
- ❌ `DEPLOYMENT_GUIDE.md`
- ❌ `Task 01 Setup.md`
- ❌ `test_results.md`

### 2. Directory Structure - Hybrid Feature-First

**ALL documentation MUST be organized by feature first, then by type:**

```
docs/
├── features/
│   └── {feature-name}/
│       ├── README.md              # Feature hub (REQUIRED)
│       ├── guides/                # Implementation guides
│       ├── tasks/                 # Task summaries
│       ├── testing/               # Test results
│       ├── reviews/               # Code reviews
│       ├── security/              # Security audits
│       ├── specs/                 # Specifications
│       └── notes/                 # Development notes
├── project/
│   ├── conventions/               # Project conventions
│   ├── guides/                    # Project-wide guides
│   ├── testing/                   # Project-wide testing
│   └── reviews/                   # Project-wide reviews
├── database/
│   ├── guides/                    # Database guides
│   ├── migrations/                # Migration documentation
│   ├── testing/                   # Database tests
│   └── utilities/                 # Database utilities
└── migrations/
    └── project/                   # Project migration docs
```

### 3. File Creation Rules

**When creating ANY documentation file:**

1. **Determine the feature:**

   - Is it analytics-related? → `docs/features/analytics/`
   - Is it comments-related? → `docs/features/comments/`
   - Is it load-more-related? → `docs/features/load-more/`
   - Is it social-related? → `docs/features/social/`
   - Is it auth-related? → `docs/features/auth/`
   - Is it project-wide? → `docs/project/`
   - Is it database-related? → `docs/database/`

2. **Determine the type:**

   - Guide/how-to? → `guides/`
   - Task summary? → `tasks/`
   - Test result? → `testing/`
   - Code review? → `reviews/`
   - Security audit? → `security/`
   - Specification? → `specs/`
   - Development note? → `notes/`

3. **Create the file with proper naming:**
   ```
   docs/features/{feature}/{type}/{type}-{descriptor}.md
   ```

**Example:**

```
# Creating a deployment guide for analytics feature
docs/features/analytics/guides/guide-deployment.md

# Creating a task summary for comments feature
docs/features/comments/tasks/task-01-setup.md

# Creating a test result for load-more feature
docs/features/load-more/testing/test-integration-results.md
```

### 4. Feature README Requirements

**EVERY feature directory MUST have a README.md that:**

- Provides an overview of the feature
- Links to all important documentation in that feature
- Acts as a hub for the feature

**Example structure:**

```markdown
# Feature Name

## Overview

[Brief description]

## Documentation

- [Deployment Guide](guides/guide-deployment.md)
- [Task 01: Setup](tasks/task-01-setup.md)
- [Integration Tests](testing/test-integration-results.md)

## Status

[Current status]
```

### 5. Protected Files

**NEVER move or rename these files:**

- `package.json`, `package-lock.json`
- `tsconfig.json`
- `next.config.ts`, `next.config.js`
- `tailwind.config.js`, `tailwind.config.ts`
- `postcss.config.js`, `postcss.config.mjs`
- `jest.config.js`, `jest.setup.js`
- `eslint.config.mjs`, `.eslintrc.json`
- `.prettierrc`
- `vercel.json`
- `.env`, `.env.local`, `.env.production`
- `.gitignore`, `.gitattributes`
- Root `README.md`, `CHANGELOG.md`

### 6. Pre-Commit Hook

**The pre-commit hook will automatically:**

- Detect misplaced files
- Move them to correct locations
- Apply proper naming conventions
- Protect config files

**This means:**

- If you accidentally create a file in the wrong location, it will be moved automatically on commit
- You should still try to create files in the correct location initially

### 7. Common Mistakes to Avoid

❌ **DON'T:**

- Create files in project root (except README.md, CHANGELOG.md)
- Use ALL CAPS in filenames
- Create files directly in `docs/features/{feature}/` (use subdirectories)
- Mix documentation types in the same directory
- Create duplicate documentation

✅ **DO:**

- Use lowercase with hyphens
- Follow the `[type]-[descriptor].md` format
- Create files in feature-specific subdirectories
- Keep feature documentation together
- Update feature README.md when adding new docs

### 8. Quick Reference

**Creating a new guide:**

```
docs/features/{feature}/guides/guide-{name}.md
```

**Creating a new task:**

```
docs/features/{feature}/tasks/task-{number}-{name}.md
```

**Creating a new test:**

```
docs/features/{feature}/testing/test-{type}-{name}.md
```

**Creating a new review:**

```
docs/features/{feature}/reviews/review-{name}.md
```

**Creating a new security doc:**

```
docs/features/{feature}/security/security-{name}.md
```

### 9. Enforcement

**These rules are enforced by:**

1. This steering file (guides Kiro's behavior)
2. Pre-commit hook (automatically organizes files)
3. Organization scripts (can be run manually)

**If you see a file that doesn't follow these rules:**

- It will be automatically moved/renamed on next commit
- Or you can run: `bash scripts/utilities/organize-files.sh`

---

## Examples of Correct File Paths

```
✅ docs/features/analytics/guides/guide-deployment.md
✅ docs/features/analytics/tasks/task-01-setup.md
✅ docs/features/analytics/testing/test-integration-results.md
✅ docs/features/comments/reviews/review-final.md
✅ docs/features/comments/security/security-audit.md
✅ docs/project/conventions/guide-naming-convention.md
✅ docs/database/guides/guide-migration-process.md

❌ docs/features/analytics/DEPLOYMENT_GUIDE.md
❌ docs/features/analytics/deployment-guide.md (wrong location)
❌ docs/ANALYTICS_GUIDE.md
❌ analytics-guide.md (in root)
❌ docs/features/analytics/Guide-Deployment.md (wrong case)
```

---

**Remember: Feature cohesion is the priority. Keep all feature-related documentation together!**
