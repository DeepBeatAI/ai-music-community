# Hybrid Organization Structure - Feature Cohesion Priority

## Philosophy

**Feature cohesion is the priority.** All documentation related to a feature should be easily discoverable from the feature's directory, while maintaining organized cross-feature views for specific document types.

---

## Structure

### Primary: Feature-First Organization

```
docs/
└── features/
    └── [feature-name]/
        ├── README.md                           # Feature hub (required)
        ├── spec-requirements.md                # Spec documents
        ├── spec-design.md
        ├── spec-tasks.md
        ├── tasks/                              # Implementation tasks
        │   ├── task-01-setup.md
        │   ├── task-02-implementation.md
        │   └── task-03-testing.md
        ├── testing/                            # All testing docs
        │   ├── test-unit-results.md
        │   ├── test-integration-results.md
        │   ├── test-performance-results.md
        │   └── guide-testing.md
        ├── reviews/                            # Code reviews
        │   ├── review-code-quality.md
        │   └── review-final.md
        ├── security/                           # Security docs
        │   ├── security-audit.md
        │   └── security-rls-verification.md
        ├── guides/                             # Feature-specific guides
        │   ├── guide-deployment.md
        │   ├── guide-troubleshooting.md
        │   └── guide-usage.md
        └── notes/                              # Implementation notes
            ├── decisions.md
            └── lessons-learned.md
```

### Secondary: Cross-Feature Views (Indexes)

```
docs/
├── _indexes/                                   # Auto-generated indexes
│   ├── all-tasks.md                           # Links to all tasks
│   ├── all-tests.md                           # Links to all tests
│   ├── all-reviews.md                         # Links to all reviews
│   ├── all-security.md                        # Links to all security
│   └── all-guides.md                          # Links to all guides
│
└── project/                                    # Project-wide docs
    ├── conventions/
    ├── architecture/
    └── processes/
```

---

## Naming Convention

### Within Feature Directory

**Format:** `[type]-[descriptor].md`

**Types:**
- `spec-` - Specification documents
- `task-` - Task summaries
- `test-` - Test results
- `review-` - Code reviews
- `security-` - Security audits
- `guide-` - Implementation guides
- `feature-` - Feature documentation

**Examples:**
```
features/comments/
├── spec-requirements.md
├── spec-design.md
├── spec-tasks.md
├── tasks/
│   ├── task-10-implementation.md
│   ├── task-11-security.md
│   └── task-12-performance.md
├── testing/
│   ├── test-unit-results.md
│   ├── test-integration-results.md
│   └── guide-testing-manual.md
├── reviews/
│   ├── review-code-quality.md
│   └── review-final.md
├── security/
│   ├── security-audit.md
│   └── security-rls-verification.md
└── guides/
    ├── guide-deployment.md
    └── guide-troubleshooting.md
```

---

## Feature README Template

Every feature MUST have a README.md that serves as the hub:

```markdown
# [Feature Name]

## Overview
Brief description of the feature.

## Status
🟢 Complete | 🟡 In Progress | 🔴 Not Started

## Specification
- [Requirements](spec-requirements.md)
- [Design](spec-design.md)
- [Tasks](spec-tasks.md)

## Implementation
- [Task 10: Setup](tasks/task-10-setup.md)
- [Task 11: Core Implementation](tasks/task-11-implementation.md)
- [Task 12: Testing](tasks/task-12-testing.md)

## Testing
- [Unit Tests](testing/test-unit-results.md)
- [Integration Tests](testing/test-integration-results.md)
- [Performance Tests](testing/test-performance-results.md)
- [Testing Guide](testing/guide-testing-manual.md)

## Quality Assurance
- [Code Review](reviews/review-code-quality.md)
- [Final Review](reviews/review-final.md)
- [Security Audit](security/security-audit.md)

## Guides
- [Deployment Guide](guides/guide-deployment.md)
- [Troubleshooting Guide](guides/guide-troubleshooting.md)

## Related Features
- [Feature X](../feature-x/README.md)
- [Feature Y](../feature-y/README.md)

## Quick Links
- [All Tasks Index](../../_indexes/all-tasks.md#comments)
- [All Tests Index](../../_indexes/all-tests.md#comments)
```

---

## Benefits

### ✅ Feature Cohesion
- Everything about a feature in one place
- Easy to see complete picture
- Self-contained documentation
- Clear feature boundaries

### ✅ Easy Discovery
- Feature README is single entry point
- All related docs linked from one place
- No hunting across directories

### ✅ Cross-Feature Views
- Index files for finding all tests, all reviews, etc.
- Can still compare across features
- Supports specialized roles (QA, Security)

### ✅ Scalability
- Easy to add new features
- Clear template to follow
- Consistent structure

### ✅ Maintainability
- Related docs stay together
- Easy to archive completed features
- Clear ownership

---

## Workflow Examples

### Working on a Feature
1. Go to `docs/features/[feature-name]/`
2. Open `README.md` to see everything
3. All related docs are in subdirectories
4. No need to navigate elsewhere

### Cross-Feature Review (e.g., Security Audit)
1. Go to `docs/_indexes/all-security.md`
2. See links to all security audits
3. Click through to specific features
4. Compare across features

### Finding All Tests
1. Go to `docs/_indexes/all-tests.md`
2. See all tests organized by feature
3. Click through to specific test results

---

## Migration Strategy

### Phase 1: Reorganize Existing Files
1. Create feature directories
2. Move files into feature subdirectories
3. Create README.md for each feature
4. Generate index files

### Phase 2: Update Automation
1. Update organize-files script to use feature-first structure
2. Add validation for required README.md
3. Auto-generate index files

### Phase 3: Enforce Going Forward
1. Pre-commit hook validates structure
2. Template for new features
3. Documentation on how to add new features

---

## Rules for Automation

### File Placement Rules

**1. Identify Feature**
- Extract feature name from filename or content
- Common features: comments, analytics, load-more, auth, social

**2. Determine Document Type**
- spec-* → Root of feature directory
- task-* → features/[feature]/tasks/
- test-* → features/[feature]/testing/
- review-* → features/[feature]/reviews/
- security-* → features/[feature]/security/
- guide-* → features/[feature]/guides/

**3. Create Feature Directory if Needed**
- Always create features/[feature]/ if it doesn't exist
- Always create README.md if it doesn't exist (from template)

**4. Update Indexes**
- Regenerate all-tasks.md
- Regenerate all-tests.md
- Regenerate all-reviews.md
- Regenerate all-security.md

### Protected Patterns
- Never move README.md files
- Never move INDEX.md files
- Never move files in docs/project/
- Never move files in docs/_indexes/

---

## Implementation Checklist

- [ ] Create new directory structure
- [ ] Move existing files to feature directories
- [ ] Create README.md for each feature
- [ ] Generate index files
- [ ] Update organize-files scripts
- [ ] Add README template
- [ ] Add index generation script
- [ ] Update pre-commit hook
- [ ] Test with new files
- [ ] Document for team

---

## Example: Complete Feature Structure

```
docs/features/comments/
├── README.md                                   # Hub
├── spec-requirements.md                        # Spec
├── spec-design.md
├── spec-tasks.md
├── tasks/                                      # Implementation
│   ├── task-10-setup.md
│   ├── task-11-core-implementation.md
│   ├── task-12-security-audit.md
│   └── task-13-performance-optimization.md
├── testing/                                    # All testing
│   ├── test-unit-results.md
│   ├── test-integration-results.md
│   ├── test-performance-results.md
│   ├── test-security-results.md
│   └── guide-testing-manual.md
├── reviews/                                    # Quality
│   ├── review-code-quality.md
│   ├── review-architecture.md
│   └── review-final.md
├── security/                                   # Security
│   ├── security-audit.md
│   ├── security-rls-verification.md
│   └── security-penetration-test.md
├── guides/                                     # Guides
│   ├── guide-deployment.md
│   ├── guide-troubleshooting.md
│   ├── guide-api-usage.md
│   └── guide-testing.md
└── notes/                                      # Notes
    ├── implementation-decisions.md
    ├── lessons-learned.md
    └── future-improvements.md
```

---

**Status:** Ready for Implementation  
**Priority:** High - Feature Cohesion  
**Next:** Execute reorganization script
