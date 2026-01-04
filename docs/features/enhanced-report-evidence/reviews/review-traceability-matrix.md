# Requirements Traceability Matrix
# Enhanced Report Evidence & Context Feature

## Purpose
This matrix maps each requirement and acceptance criterion to its implementation and tests, ensuring complete coverage and preventing gaps.

---

## How to Use This Matrix

1. **Before marking a task complete:** Verify all linked acceptance criteria are implemented
2. **During code review:** Check that implementation matches requirements
3. **When adding features:** Update this matrix with new mappings
4. **For testing:** Ensure each criterion has corresponding tests

---

## Requirement 1: Copyright Evidence Fields

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 1.1 | Display "Link to Original Work" field | `ReportModal.tsx` lines 150-165 | `ReportModal.evidence.property.test.tsx` | ✅ |
| 1.2 | Display "Proof of Ownership" field | `ReportModal.tsx` lines 167-182 | `ReportModal.evidence.property.test.tsx` | ✅ |
| 1.3 | Display UI hint | `ReportModal.tsx` line 149 | Manual | ✅ |
| 1.4 | Store evidence in metadata | `moderationService.ts` submitReport() | `ReportSubmission.evidence.integration.test.tsx` | ✅ |
| 1.5 | Accept report without evidence | `ReportModal.tsx` optional fields | `ReportSubmission.evidence.integration.test.tsx` | ✅ |
| 1.6 | Validate URL format | `ReportModal.tsx` validateURL() | `ReportModal.validation.property.test.tsx` | ✅ |
| 1.7 | Limit proof to 500 chars | `ReportModal.tsx` maxLength={500} | Manual | ✅ |

---

## Requirement 2: Audio Timestamp Evidence

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 2.1 | Display timestamp field for tracks | `ReportModal.tsx` lines 184-199 | `ReportModal.evidence.property.test.tsx` | ✅ |
| 2.2 | Accept MM:SS or HH:MM:SS format | `ReportModal.tsx` validateTimestamp() | `ReportModal.validation.property.test.tsx` | ✅ |
| 2.3 | Display UI hint | `ReportModal.tsx` line 193 | Manual | ✅ |
| 2.4 | Validate format before submission | `ReportModal.tsx` validateTimestamp() | `ReportModal.validation.property.test.tsx` | ✅ |
| 2.5 | Store timestamp in metadata | `moderationService.ts` submitReport() | `ReportSubmission.evidence.integration.test.tsx` | ✅ |
| 2.6 | Allow multiple timestamps (comma-separated) | `ReportModal.tsx` validateTimestamp() | Manual | ✅ |
| 2.7 | Display timestamp prominently in queue | `ReportCard.tsx` timestamp badge | Manual | ✅ |

---

## Requirement 3: Description Guidance

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 3.1 | Expand description field with prompts | `ReportModal.tsx` dynamic placeholder | Manual | ✅ |
| 3.2 | Prompt for "Spam or Misleading Content" | `ReportModal.tsx` getDescriptionPlaceholder() | Manual | ✅ |
| 3.3 | Prompt for "Harassment or Bullying" | `ReportModal.tsx` getDescriptionPlaceholder() | Manual | ✅ |
| 3.4 | Prompt for "Hate Speech" | `ReportModal.tsx` getDescriptionPlaceholder() | Manual | ✅ |
| 3.5 | Prompt for "Inappropriate Content" | `ReportModal.tsx` getDescriptionPlaceholder() | Manual | ✅ |
| 3.6 | Enforce 20-character minimum | `ReportModal.tsx` validation | `ReportModal.evidence.property.test.tsx` | ✅ |
| 3.7 | Display character count indicator | `ReportModal.tsx` character counter | Manual | ✅ |
| 3.8 | Display error for <20 characters | `ReportModal.tsx` error message | `ReportModal.evidence.property.test.tsx` | ✅ |

---

## Requirement 4: Reporting Tips

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 4.1 | Display "Reporting Tips" section | `ReportModal.tsx` examples section | Manual | ✅ |
| 4.2 | Show good report examples | `ReportModal.tsx` examples content | Manual | ✅ |
| 4.3 | Show bad report examples | `ReportModal.tsx` examples content | Manual | ✅ |
| 4.4 | Display as collapsible section | `ReportModal.tsx` useState for collapse | Manual | ✅ |
| 4.5 | Show 2-3 relevant examples | `ReportModal.tsx` examples by reason | Manual | ✅ |
| 4.6 | Update examples dynamically | `ReportModal.tsx` useEffect on reason | Manual | ✅ |
| 4.7 | Include copyright evidence tip | `ReportModal.tsx` examples content | Manual | ✅ |

---

## Requirement 4.5: Moderator Flag Evidence

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 4.5.1 | Extend ModeratorFlagModal with evidence | `ModeratorFlagModal.tsx` | `ModeratorFlagModal.evidence.property.test.tsx` | ✅ |
| 4.5.2 | Display copyright evidence fields | `ModeratorFlagModal.tsx` | `ModeratorFlagModal.evidence.property.test.tsx` | ✅ |
| 4.5.3 | Display timestamp field for tracks | `ModeratorFlagModal.tsx` | `ModeratorFlagModal.evidence.property.test.tsx` | ✅ |
| 4.5.4 | Maintain 10-char minimum for notes | `ModeratorFlagModal.tsx` validation | `ModeratorFlagModal.evidence.property.test.tsx` | ✅ |
| 4.5.5 | Display reporting tips for moderators | `ModeratorFlagModal.tsx` | Manual | ✅ |
| 4.5.6 | Store evidence in same metadata structure | `moderationService.ts` moderatorFlagContent() | `ModeratorFlagModal.evidence.property.test.tsx` | ✅ |
| 4.5.7 | Display evidence with same badges | `ReportCard.tsx` | Manual | ✅ |

---

## Requirement 5: Reporter Accuracy in Cards

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 5.1 | Display reporter's total report count | `ReportCard.tsx` | Manual | ✅ |
| 5.2 | Calculate and display accuracy rate | `moderationService.ts` calculateReporterAccuracy() | `ReporterAccuracy.integration.test.tsx` | ✅ |
| 5.3 | Calculate accuracy correctly | `moderationService.ts` formula | `ReporterAccuracy.integration.test.tsx` | ✅ |
| 5.4 | Color code accuracy (Green/Yellow/Red) | `ReportCard.tsx` & `ModerationActionPanel.tsx` | Manual | ✅ |
| 5.5 | Display "Trusted Reporter" badge | **NOT IMPLEMENTED** | N/A | ❌ |
| 5.6 | Display "Low Accuracy" warning badge | **NOT IMPLEMENTED** | N/A | ❌ |
| 5.7 | Show tooltip with breakdown | `ReportCard.tsx` & `ModerationActionPanel.tsx` | Manual | ✅ |

---

## Requirement 6: Enhanced Violation History

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 6.1 | Enhance User Violation History section | **NOT IMPLEMENTED** | N/A | ❌ |
| 6.2 | Display "Repeat Offender" badge | **NOT IMPLEMENTED** | N/A | ❌ |
| 6.3 | Highlight same-type violations | **NOT IMPLEMENTED** | N/A | ❌ |
| 6.4 | Display timeline indicator | **NOT IMPLEMENTED** | N/A | ❌ |
| 6.5 | Display violation trend indicator | **NOT IMPLEMENTED** | N/A | ❌ |
| 6.6 | Show reversed actions with reasons | **NOT IMPLEMENTED** | N/A | ❌ |
| 6.7 | Maintain backward compatibility | **NOT IMPLEMENTED** | N/A | ❌ |

---

## Requirement 7: Related Reports

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 7.1 | Display "Related Reports" section | `ModerationActionPanel.tsx` | Manual | ✅ |
| 7.2 | Search for same target_id reports | `ModerationActionPanel.tsx` loadRelatedReports() | Manual | ✅ |
| 7.3 | Search for same reported_user_id | `ModerationActionPanel.tsx` loadRelatedReports() | Manual | ✅ |
| 7.4 | Display up to 5 most recent | `ModerationActionPanel.tsx` limit 5 | Manual | ✅ |
| 7.5 | Display with date, reason, status | `ModerationActionPanel.tsx` | Manual | ✅ |
| 7.6 | Display "Multiple Reports" badge | `ReportCard.tsx` multipleReportsCount (lines 140-155) + `moderationService.ts` optimized count query (lines 1458-1481) | Manual | ✅ |
| 7.7 | Display "Multiple Reports Today" badge | **NOT IMPLEMENTED** | N/A | ❌ |

---

## Requirement 8: Evidence Display in Queue

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 8.1 | Display "Evidence Provided" badge | `ReportCard.tsx` evidence badge | Manual | ✅ |
| 8.2 | Display timestamp on card | `ReportCard.tsx` timestamp badge | Manual | ✅ |
| 8.3 | Display "Detailed Report" badge | `ReportCard.tsx` detailed badge | Manual | ✅ |
| 8.4 | Use distinct badge colors | `ReportCard.tsx` color classes | Manual | ✅ |
| 8.5 | Show tooltip with evidence preview | `ReportCard.tsx` title attributes | Manual | ✅ |
| 8.6 | Sort reports with evidence higher | `moderationService.ts` fetchModerationQueue() lines 1467-1550 (4-level sorting: status → priority → multiple reports count → hybrid age/evidence) | Manual | ✅ |
| 8.7 | Allow filtering by "Has Evidence" | `ModerationQueue.tsx` Evidence filter dropdown + `moderationService.ts` lines 1445-1456 (in-memory filtering) | Manual | ✅ |

---

## Requirement 9: Copyright Evidence Display

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 9.1 | Display "Copyright Evidence" section | `ModerationActionPanel.tsx` | Manual | ✅ |
| 9.2 | Display clickable link | `ModerationActionPanel.tsx` | Manual | ✅ |
| 9.3 | Display proof of ownership | `ModerationActionPanel.tsx` | Manual | ✅ |
| 9.4 | Display warning when no evidence | `ModerationActionPanel.tsx` | Manual | ✅ |
| 9.5 | Display "Verify Evidence" button | **NOT IMPLEMENTED** | N/A | ❌ |
| 9.6 | Allow verification notes | **NOT IMPLEMENTED** | N/A | ❌ |
| 9.7 | Track evidence verification | **NOT IMPLEMENTED** | N/A | ❌ |

---

## Requirement 10: Audio Timestamp Jump

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 10.1 | Display audio player in action panel | **NOT IMPLEMENTED** | N/A | ❌ |
| 10.2 | Display "Jump to Timestamp" button | **NOT IMPLEMENTED** | N/A | ❌ |
| 10.3 | Seek audio to exact time | **NOT IMPLEMENTED** | N/A | ❌ |
| 10.4 | Highlight timestamp when reached | **NOT IMPLEMENTED** | N/A | ❌ |
| 10.5 | Display multiple timestamps as buttons | **NOT IMPLEMENTED** | N/A | ❌ |
| 10.6 | Display timestamps chronologically | **NOT IMPLEMENTED** | N/A | ❌ |
| 10.7 | Allow notes about findings | **NOT IMPLEMENTED** | N/A | ❌ |

---

## Requirement 11: Report Quality Metrics

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 11.1 | Add "Report Quality" section | `ModerationMetrics.tsx` | Manual | ✅ |
| 11.2 | Calculate average quality score | `ModerationMetrics.tsx` | Manual | ✅ |
| 11.3 | Display quality metrics | `ModerationMetrics.tsx` | Manual | ✅ |
| 11.4 | Display breakdown by reason (high) | `ModerationMetrics.tsx` accuracy breakdown | Manual | ✅ |
| 11.5 | Display breakdown by reason (low) | `ModerationMetrics.tsx` accuracy breakdown | Manual | ✅ |
| 11.6 | Display trends over time | `ModerationMetrics.tsx` date range filter | Manual | ✅ |
| 11.7 | Integrate with existing metrics | `ModerationMetrics.tsx` | Manual | ✅ |

---

## Requirement 12: Low-Quality Reporter Education

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 12.1 | Flag users with <20% accuracy | **NOT IMPLEMENTED** | N/A | ❌ |
| 12.2 | Send automated notification | **NOT IMPLEMENTED** | N/A | ❌ |
| 12.3 | Display "Reporting Guidelines" link | **NOT IMPLEMENTED** | N/A | ❌ |
| 12.4 | Show educational banner | **NOT IMPLEMENTED** | N/A | ❌ |
| 12.5 | Track intervention effectiveness | **NOT IMPLEMENTED** | N/A | ❌ |
| 12.6 | Allow manual sending of guidelines | **NOT IMPLEMENTED** | N/A | ❌ |
| 12.7 | Remove flag when accuracy improves | **NOT IMPLEMENTED** | N/A | ❌ |

---

## Requirement 13: Infrastructure Reuse

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 13.1 | Reuse moderation_reports table | Database schema | N/A | ✅ |
| 13.2 | Reuse ReportModal component | `ReportModal.tsx` | All tests | ✅ |
| 13.3 | Reuse ModerationQueue component | `ModerationQueue.tsx` | Manual | ✅ |
| 13.4 | Reuse ModerationActionPanel | `ModerationActionPanel.tsx` | Manual | ✅ |
| 13.5 | Reuse moderationService.ts | `moderationService.ts` | All tests | ✅ |
| 13.6 | Maintain backward compatibility | All components | All tests | ✅ |
| 13.7 | No schema changes except indexes | Database | N/A | ✅ |

---

## Requirement 14: Documentation

| AC# | Acceptance Criterion | Implementation | Tests | Status |
|-----|---------------------|----------------|-------|--------|
| 14.1 | Document metadata JSONB structure | **NOT IMPLEMENTED** | N/A | ❌ |
| 14.2 | Document timestamp validation rules | **NOT IMPLEMENTED** | N/A | ❌ |
| 14.3 | Document URL validation rules | **NOT IMPLEMENTED** | N/A | ❌ |
| 14.4 | Document character limits | **NOT IMPLEMENTED** | N/A | ❌ |
| 14.5 | Document evidence effects on sorting | **PARTIALLY DONE** (this matrix) | N/A | ⚠️ |
| 14.6 | Document how to add evidence types | **NOT IMPLEMENTED** | N/A | ❌ |
| 14.7 | Include code examples | **NOT IMPLEMENTED** | N/A | ❌ |

---

## Coverage Summary

**Total Acceptance Criteria:** 98
**Implemented:** 71 (72%)
**Not Implemented:** 27 (28%)

**By Requirement:**
- Req 1: 7/7 (100%) ✅
- Req 2: 7/7 (100%) ✅
- Req 3: 8/8 (100%) ✅
- Req 4: 7/7 (100%) ✅
- Req 4.5: 7/7 (100%) ✅
- Req 5: 5/7 (71%) ⚠️
- Req 6: 0/7 (0%) ❌
- Req 7: 6/7 (86%) ⚠️
- Req 8: 7/7 (100%) ✅
- Req 9: 4/7 (57%) ⚠️
- Req 10: 0/7 (0%) ❌
- Req 11: 7/7 (100%) ✅
- Req 12: 0/7 (0%) ❌
- Req 13: 7/7 (100%) ✅
- Req 14: 1/7 (14%) ❌

---

## Update Log

| Date | Change | Updated By |
|------|--------|------------|
| 2026-01-04 | Initial matrix creation | Kiro AI |
| 2026-01-04 | Added Req 8.6 & 8.7 implementation | Kiro AI |
| 2026-01-04 | Added Req 7.6 multiple reports count optimization details | Kiro AI |

---

## How to Update This Matrix

1. **When implementing a feature:**
   - Update Status column to ✅
   - Add implementation file and line numbers
   - Add test file references
   - Update coverage summary

2. **When adding new requirements:**
   - Add new section with all acceptance criteria
   - Mark all as ❌ initially
   - Update coverage summary

3. **During code review:**
   - Verify implementation matches AC
   - Check tests cover the AC
   - Update any discrepancies

---

**Last Updated:** January 4, 2026
**Maintained By:** Development Team
**Review Frequency:** After each feature implementation
