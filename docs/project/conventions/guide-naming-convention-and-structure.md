# Project Naming Convention and Structure

## Overview

This document defines the naming convention and folder structure for all non-code files in the project.

---

## Naming Convention

### Format

```
[category]-[spec/feature]-[type]-[descriptor].md
```

### Components

1. **Category** (required)

   - `spec` - Specification documents
   - `task` - Task completion summaries
   - `test` - Testing documentation
   - `review` - Code reviews
   - `security` - Security audits
   - `migration` - Migration guides
   - `guide` - How-to guides
   - `project` - Project-level documentation

2. **Spec/Feature** (required for spec-related files)

   - `comments` - Comments system
   - `analytics` - Analytics feature
   - `load-more` - Load more pagination
   - `social` - Social features
   - `auth` - Authentication
   - `project` - Project-wide

3. **Type** (required)

   - `requirements` - Requirements document
   - `design` - Design document
   - `tasks` - Task list
   - `summary` - Completion summary
   - `guide` - Implementation guide
   - `results` - Test results
   - `report` - Audit/review report
   - `checklist` - Validation checklist

4. **Descriptor** (optional, for clarity)
   - `deployment` - Deployment-related
   - `performance` - Performance-related
   - `mobile` - Mobile-specific
   - `security` - Security-related

### Examples

**Good Names:**

- `spec-comments-requirements.md`
- `spec-comments-design.md`
- `spec-comments-tasks.md`
- `task-comments-11-summary.md`
- `test-comments-results.md`
- `test-analytics-performance-results.md`
- `review-comments-code-quality.md`
- `security-comments-audit-report.md`
- `guide-analytics-deployment.md`
- `migration-project-reorganization.md`

**Bad Names:**

- `task-11-summary.md` (missing spec/feature)
- `final-code-review.md` (missing category and spec)
- `analytics-tooltip-fix.md` (unclear category)

---

## Folder Structure

### Primary Structure

```
docs/
├── specs/                      # All specification documents
│   ├── comments/               # Comments system spec
│   ├── analytics/              # Analytics feature spec
│   ├── load-more/              # Load more spec
│   └── [feature-name]/         # Other feature specs
│
├── tasks/                      # Task completion summaries
│   ├── comments/               # Comments system tasks
│   ├── analytics/              # Analytics tasks
│   ├── load-more/              # Load more tasks
│   └── [feature-name]/         # Other feature tasks
│
├── testing/                    # All testing documentation
│   ├── guides/                 # Testing guides
│   ├── results/                # Test results
│   │   ├── comments/           # Comments tests
│   │   ├── analytics/          # Analytics tests
│   │   └── [feature-name]/     # Other feature tests
│   └── checklists/             # Testing checklists
│
├── reviews/                    # Code reviews
│   ├── comments/               # Comments reviews
│   ├── analytics/              # Analytics reviews
│   └── [feature-name]/         # Other feature reviews
│
├── security/                   # Security audits
│   ├── comments/               # Comments security
│   ├── analytics/              # Analytics security
│   └── [feature-name]/         # Other feature security
│
├── guides/                     # Implementation guides
│   ├── deployment/             # Deployment guides
│   ├── testing/                # Testing guides
│   └── development/            # Development guides
│
├── migrations/                 # Migration documentation
│   └── project/                # Project-wide migrations
│
└── project/                    # Project-level documentation
    ├── conventions/            # Naming conventions, standards
    ├── architecture/           # Architecture decisions
    └── processes/              # Development processes
```

---

## File Organization Rules

### Specification Documents

**Location:** `docs/specs/[feature-name]/`

**Files:**

- `spec-[feature]-requirements.md` - Requirements
- `spec-[feature]-design.md` - Design
- `spec-[feature]-tasks.md` - Task list
- `spec-[feature]-summary.md` - Completion summary

**Example:**

```
docs/specs/comments/
├── spec-comments-requirements.md
├── spec-comments-design.md
├── spec-comments-tasks.md
└── spec-comments-summary.md
```

### Task Summaries

**Location:** `docs/tasks/[feature-name]/`

**Naming:** `task-[feature]-[number]-[descriptor].md`

**Example:**

```
docs/tasks/comments/
├── task-comments-10-implementation.md
├── task-comments-11-security-audit.md
└── task-comments-12-performance.md
```

### Testing Documentation

**Location:** `docs/testing/results/[feature-name]/`

**Naming:** `test-[feature]-[type]-[descriptor].md`

**Example:**

```
docs/testing/results/comments/
├── test-comments-unit-results.md
├── test-comments-integration-results.md
└── test-comments-performance-results.md
```

### Reviews

**Location:** `docs/reviews/[feature-name]/`

**Naming:** `review-[feature]-[type].md`

**Example:**

```
docs/reviews/comments/
├── review-comments-code-quality.md
└── review-comments-final.md
```

### Security

**Location:** `docs/security/[feature-name]/`

**Naming:** `security-[feature]-[type].md`

**Example:**

```
docs/security/comments/
├── security-comments-audit.md
└── security-comments-rls-verification.md
```

### Guides

**Location:** `docs/guides/[category]/`

**Naming:** `guide-[feature]-[purpose].md`

**Example:**

```
docs/guides/deployment/
├── guide-analytics-deployment.md
└── guide-load-more-deployment.md
```

---

## Migration Plan

### Phase 1: Create New Structure

1. Create all new directories
2. Keep old files in place

### Phase 2: Rename and Move Files

1. Rename files according to convention
2. Move to new locations
3. Update all cross-references

### Phase 3: Update Scripts

1. Update organize-files scripts
2. Update documentation
3. Test thoroughly

---

## Cross-Reference Updates

When moving/renaming files, update references in:

- Other documentation files
- README files
- Migration summaries
- Task lists
- Spec documents

---

## Protected Files

These files keep their current names:

- `README.md` (in any directory)
- `INDEX.md` (in any directory)
- `.gitignore`
- `.gitattributes`
- `CHANGELOG.md`
- `package.json`

---

## Implementation Status

- [ ] Create new folder structure
- [ ] Rename existing files
- [ ] Move files to new locations
- [ ] Update cross-references
- [ ] Update organize-files scripts
- [ ] Test automation
- [ ] Document changes

---

**Created:** January 10, 2025  
**Status:** Planning  
**Next:** Implementation
