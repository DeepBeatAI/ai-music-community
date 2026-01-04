# Requirements Verification Protocol

## CRITICAL: Before Marking ANY Task Complete

### Quick Verification Process

1. **Find the requirements document** for the feature you're working on
2. **Count the acceptance criteria (ACs)** - e.g., "Requirement 8 has 7 ACs"
3. **Verify each AC is implemented:**
   - Read each AC
   - Confirm code exists that implements it
   - Confirm tests exist that validate it
4. **Update traceability matrix:**
   - File: `docs/features/{feature}/reviews/review-traceability-matrix.md`
   - Add implementation file + line numbers for each AC
   - Mark status as ✅ (complete) or ❌ (missing)
5. **Run diagnostics:**
   - Use `getDiagnostics` on all modified files
   - Fix all TypeScript/linting errors
6. **Only mark complete when:**
   - All ACs show ✅ in traceability matrix
   - All tests pass
   - No diagnostic errors

### If You Find Missing ACs

**DO NOT mark task complete!**

Instead:
1. Implement the missing ACs
2. Update traceability matrix
3. Run tests and diagnostics
4. Then mark complete

### If AC Must Be Deferred

1. Mark in traceability matrix: `**DEFERRED** (reason)`
2. Create follow-up task
3. Inform user explicitly

### Example

```markdown
## Requirement 8: Evidence Display in Queue

| AC# | Criterion | Implementation | Tests | Status |
|-----|-----------|----------------|-------|--------|
| 8.1 | Display badge | `ReportCard.tsx` lines 45-50 | Manual | ✅ |
| 8.2 | Display timestamp | `ReportCard.tsx` lines 52-57 | Manual | ✅ |
| 8.7 | Filter by evidence | `ModerationQueue.tsx` lines 88-95 | Manual | ✅ |
```

**All 7 ACs must show ✅ before marking Requirement 8 complete.**

---

## Why This Matters

Following this process prevents requirement gaps and ensures quality. It takes 5-10 extra minutes but saves hours of rework during testing.

**This is not optional - it's part of the definition of done.**
