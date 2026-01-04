# Guide: Preventing Requirement Gaps
# Enhanced Report Evidence & Context Feature

## Purpose
This guide establishes guardrails and processes to prevent requirement gaps in future development, ensuring all acceptance criteria are implemented before marking tasks complete.

---

## The Problem

During manual testing of the Enhanced Report Evidence feature, we discovered multiple missing features despite requirements being clearly documented:

**Missing Features Found:**
- Queue filtering by evidence (Req 8.7)
- Queue sorting by evidence (Req 8.6)
- Reporter accuracy badges (Req 5.5, 5.6)
- Enhanced violation history (Req 6 - all 7 criteria)
- Audio timestamp jump functionality (Req 10 - all 7 criteria)
- Evidence verification tracking (Req 9.5, 9.6, 9.7)
- Low-quality reporter education (Req 12 - all 7 criteria)
- Technical documentation (Req 14 - 6/7 criteria)

**Root Causes:**
1. No systematic tracking of requirements to implementation
2. Tasks marked complete without verifying all acceptance criteria
3. No requirement-to-test mapping
4. Complex requirements deferred without explicit decision
5. Documentation requirements deprioritized

---

## Guardrail 1: Requirements Traceability Matrix

### What It Is
A living document that maps every acceptance criterion to its implementation and tests.

### Location
`docs/features/{feature}/reviews/review-traceability-matrix.md`

### When to Update
- ✅ **Before starting implementation:** Review all ACs for the requirement
- ✅ **During implementation:** Add file/line references as you code
- ✅ **After implementation:** Verify all ACs are covered
- ✅ **Before marking complete:** Check matrix shows 100% coverage
- ✅ **During code review:** Reviewer verifies matrix accuracy

### How to Use

**Step 1: Before Implementation**
```markdown
## Requirement X: Feature Name

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| X.1 | Criterion text | TBD | TBD | ❌ |
| X.2 | Criterion text | TBD | TBD | ❌ |
```

**Step 2: During Implementation**
```markdown
| X.1 | Criterion text | `Component.tsx` lines 50-75 | `Component.test.tsx` | ⚠️ |
```

**Step 3: After Implementation**
```markdown
| X.1 | Criterion text | `Component.tsx` lines 50-75 | `Component.test.tsx` | ✅ |
```

**Step 4: Verification**
- All rows must show ✅ before marking task complete
- If any row shows ❌ or ⚠️, task is NOT complete

---

## Guardrail 2: Acceptance Criteria Checklist

### What It Is
A pre-completion checklist that must be verified before marking any task as done.

### Template

```markdown
## Task Completion Checklist

### Requirement Coverage
- [ ] All acceptance criteria identified
- [ ] All acceptance criteria implemented
- [ ] Traceability matrix updated
- [ ] No criteria marked as ❌ or ⚠️

### Code Quality
- [ ] All TypeScript errors fixed (getDiagnostics passes)
- [ ] All linting errors fixed
- [ ] Code follows project patterns
- [ ] No console errors in browser

### Testing
- [ ] All automated tests pass
- [ ] Manual testing completed (if applicable)
- [ ] Edge cases tested
- [ ] Error handling tested

### Documentation
- [ ] Code comments added for complex logic
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Traceability matrix updated

### Review
- [ ] Self-review completed
- [ ] All checklist items verified
- [ ] Ready for peer review
```

### When to Use
**Before marking ANY task as complete**, go through this checklist and verify every item.

---

## Guardrail 3: Definition of Done

### A Task is ONLY "Done" When:

1. ✅ **All acceptance criteria implemented**
   - Every AC in the requirement has corresponding code
   - Traceability matrix shows 100% coverage
   - No ❌ or ⚠️ status in matrix

2. ✅ **All automated tests pass**
   - Unit tests pass
   - Integration tests pass
   - Property tests pass (if applicable)
   - E2E tests pass (if applicable)

3. ✅ **No errors or warnings**
   - `getDiagnostics` shows no TypeScript errors
   - No ESLint errors
   - No console errors in browser
   - No console warnings (unless justified)

4. ✅ **Manual testing completed**
   - All manual test cases pass (if applicable)
   - UI/UX validated
   - Cross-browser tested (if UI change)
   - Mobile responsive (if UI change)

5. ✅ **Documentation updated**
   - Traceability matrix updated
   - Code comments added
   - README updated (if needed)
   - Technical docs updated (if needed)

6. ✅ **Code review ready**
   - Self-review completed
   - All checklist items verified
   - PR description includes AC coverage

### If ANY of these are not met, the task is NOT done.

---

## Guardrail 4: Requirement Comments in Code

### What It Is
Add comments in code linking to specific requirements and acceptance criteria.

### Format
```typescript
// Requirement 8.6: Sort reports with evidence higher (within same priority)
// Requirement 8.7: Filter by "Has Evidence"
export async function fetchModerationQueue(filters: QueueFilters = {}): Promise<Report[]> {
  // Implementation...
}
```

### Benefits
- Easy to find implementation for specific requirements
- Code reviewers can verify requirement coverage
- Future developers understand why code exists
- Prevents accidental removal of requirement-driven code

### When to Add
- At the start of functions implementing requirements
- Before complex logic blocks
- In type definitions related to requirements
- In UI components implementing specific ACs

---

## Guardrail 5: Pre-Completion Review Process

### Step-by-Step Process

**Step 1: Self-Review (Developer)**
1. Open requirements document
2. Read all acceptance criteria for the requirement
3. For each AC, verify:
   - Code exists that implements it
   - Tests exist that validate it
   - Traceability matrix references it
4. Run all automated tests
5. Run diagnostics
6. Perform manual testing
7. Complete checklist

**Step 2: Traceability Verification**
1. Open traceability matrix
2. Find your requirement section
3. Verify all ACs show ✅
4. Verify implementation references are accurate
5. Verify test references are accurate
6. Update coverage summary

**Step 3: Documentation Check**
1. Verify code comments reference requirements
2. Update README if needed
3. Update technical docs if needed
4. Ensure examples are current

**Step 4: Mark Complete**
- Only after ALL above steps are verified
- Add note in task file: "Verified complete: [date]"
- Include traceability matrix link

---

## Guardrail 6: Automated Requirement Coverage

### Future Enhancement
Consider adding automated checks:

```typescript
// Example: Automated AC coverage check
interface RequirementCoverage {
  requirementId: string;
  totalCriteria: number;
  implementedCriteria: number;
  testedCriteria: number;
  coveragePercentage: number;
}

function checkRequirementCoverage(requirementId: string): RequirementCoverage {
  // Parse traceability matrix
  // Count ✅ vs total ACs
  // Return coverage stats
}
```

### Benefits
- Automated verification before marking complete
- CI/CD integration possible
- Prevents human error

---

## Guardrail 7: Requirement Review Meetings

### When to Hold
- Before starting a new requirement
- After completing a requirement
- When discovering gaps

### Agenda
1. **Pre-Implementation Review:**
   - Review all acceptance criteria
   - Identify complex or unclear ACs
   - Estimate effort for each AC
   - Identify dependencies
   - Plan implementation order

2. **Post-Implementation Review:**
   - Verify all ACs implemented
   - Review traceability matrix
   - Discuss any deferred ACs
   - Document decisions
   - Update requirements if needed

---

## Guardrail 8: Explicit Deferral Process

### If You Must Defer an AC

**Don't just skip it - document it!**

1. **Create a deferral record:**
```markdown
## Deferred Acceptance Criteria

| AC# | Criterion | Reason | Target Date | Owner |
|-----|-----------|--------|-------------|-------|
| 6.2 | "Repeat Offender" badge | Complexity - needs design review | Sprint 5 | Team |
```

2. **Update traceability matrix:**
```markdown
| 6.2 | Display "Repeat Offender" badge | **DEFERRED** (See deferral log) | N/A | 🔄 |
```

3. **Create follow-up task:**
- Add to backlog
- Link to original requirement
- Include deferral reason
- Set target completion date

4. **Communicate:**
- Inform stakeholders
- Update project status
- Add to sprint planning

### Never Defer Silently
- ❌ Don't just skip ACs without documentation
- ❌ Don't mark tasks complete with missing ACs
- ❌ Don't assume "we'll do it later"
- ✅ Always document deferral decisions
- ✅ Always create follow-up tasks
- ✅ Always communicate to team

---

## Guardrail 9: Regular Requirement Audits

### Monthly Audit Process

**What to Check:**
1. Traceability matrix accuracy
2. Deferred ACs status
3. Test coverage gaps
4. Documentation completeness
5. Code comment accuracy

**Audit Checklist:**
```markdown
## Monthly Requirement Audit - [Month Year]

### Traceability Matrix
- [ ] All implemented ACs marked ✅
- [ ] All file references accurate
- [ ] All test references accurate
- [ ] Coverage summary updated

### Deferred ACs
- [ ] All deferrals documented
- [ ] Follow-up tasks created
- [ ] Target dates realistic
- [ ] Progress tracked

### Test Coverage
- [ ] All ACs have tests
- [ ] All tests passing
- [ ] No test gaps identified
- [ ] Manual tests documented

### Documentation
- [ ] Code comments current
- [ ] README up to date
- [ ] Technical docs complete
- [ ] Examples working

### Action Items
- [List any issues found]
- [List remediation tasks]
```

---

## Guardrail 10: Lessons Learned Integration

### After Each Feature

**Document:**
1. What went well
2. What gaps were found
3. Why gaps occurred
4. How to prevent in future

**Update Processes:**
- Improve checklists
- Add new guardrails
- Update templates
- Share with team

**Example:**
```markdown
## Lessons Learned: Enhanced Report Evidence

### Gaps Found
- Queue filtering not implemented
- No systematic AC tracking

### Root Causes
- No traceability matrix
- Tasks marked complete prematurely

### Improvements Made
- Created traceability matrix
- Added completion checklist
- Established definition of done

### New Guardrails
- Requirement comments in code
- Pre-completion review process
- Explicit deferral process
```

---

## Quick Reference Card

### Before Starting Implementation
- [ ] Read all acceptance criteria
- [ ] Create traceability matrix entries
- [ ] Identify dependencies
- [ ] Estimate effort

### During Implementation
- [ ] Add requirement comments in code
- [ ] Update traceability matrix with file references
- [ ] Write tests for each AC
- [ ] Document any deferrals

### Before Marking Complete
- [ ] Verify all ACs implemented
- [ ] Run all automated tests
- [ ] Run diagnostics (no errors)
- [ ] Complete manual testing
- [ ] Update traceability matrix
- [ ] Complete checklist
- [ ] Self-review

### After Completion
- [ ] Update coverage summary
- [ ] Document lessons learned
- [ ] Create follow-up tasks for deferrals
- [ ] Ready for code review

---

## Success Metrics

### How to Measure Success

**Requirement Coverage:**
- Target: 100% of ACs implemented before marking complete
- Measure: Traceability matrix coverage percentage
- Review: Before marking any task complete

**Gap Detection:**
- Target: Zero gaps found in manual testing
- Measure: Number of missing features found in testing
- Review: After each testing phase

**Documentation Quality:**
- Target: All requirements have code comments
- Measure: Percentage of requirement-driven code with comments
- Review: During code review

**Process Adherence:**
- Target: 100% of tasks follow completion checklist
- Measure: Checklist completion rate
- Review: During sprint retrospectives

---

## Conclusion

These guardrails ensure that:
1. ✅ All requirements are tracked systematically
2. ✅ No acceptance criteria are missed
3. ✅ Tasks are only marked complete when truly done
4. ✅ Deferrals are explicit and tracked
5. ✅ Quality is maintained throughout development

**Remember:** It's better to take extra time to verify completeness than to discover gaps during testing or production.

---

**Document Version:** 1.0
**Last Updated:** January 4, 2026
**Next Review:** After next feature implementation
**Maintained By:** Development Team
