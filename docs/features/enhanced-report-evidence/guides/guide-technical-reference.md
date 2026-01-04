# Technical Reference Guide

## Overview

This technical reference provides comprehensive documentation for the Enhanced Report Evidence & Context feature. For detailed information on specific topics, refer to the specialized guides listed below.

**Requirements:** 14.1-14.7

## Quick Links

- **[Metadata Structure](guide-metadata-structure.md)** - Complete field definitions, database storage, and examples
- **[Validation Rules](guide-validation-rules.md)** - All validation patterns, error messages, and security considerations
- **[Evidence Effects](guide-evidence-effects.md)** - Queue sorting, filtering, badges, and display logic
- **[Extensibility Guide](guide-extensibility.md)** - Step-by-step guide for adding new evidence types

## Key Concepts

### Metadata Structure

All evidence is stored in the `metadata` JSONB column of the `moderation_reports` table.

**Core Fields:**
- `originalWorkLink` - URL to copyrighted work (copyright violations)
- `proofOfOwnership` - Text proof of ownership (copyright violations)
- `audioTimestamp` - Time markers in audio (track violations)
- `reporterAccuracy` - Calculated accuracy data (display only)

**See:** [Metadata Structure Guide](guide-metadata-structure.md)

### Validation

**Description Requirements:**
- User reports: 20-1000 characters
- Moderator flags: 10-1000 characters

**Evidence Validation:**
- URLs: Must include http:// or https://
- Timestamps: MM:SS or HH:MM:SS format
- Character limits: 500 chars for proof/notes

**See:** [Validation Rules Guide](guide-validation-rules.md)

### Queue Behavior

**Sorting Algorithm (4 levels):**
1. Status (under_review → pending → resolved → dismissed)
2. Priority (P1 → P2 → P3 → P4 → P5)
3. Evidence/Age (evidence first, then oldest)
4. Creation time (oldest first)

**Filtering:**
- "Has Evidence" checkbox filters reports with any evidence field

**See:** [Evidence Effects Guide](guide-evidence-effects.md)

## API Quick Reference

### submitReport()

```typescript
await submitReport({
  reportType: 'track',
  targetId: 'track-123',
  reason: 'copyright_violation',
  description: 'Minimum 20 characters required',
  metadata: {
    originalWorkLink: 'https://example.com/original',
    proofOfOwnership: 'I am the original artist...',
  },
});
```

### moderatorFlagContent()

```typescript
await moderatorFlagContent({
  reportType: 'track',
  targetId: 'track-123',
  reason: 'hate_speech',
  internalNotes: 'Minimum 10 characters',
  priority: 2,
  metadata: {
    audioTimestamp: '2:35, 5:12',
  },
});
```

### calculateReporterAccuracy()

```typescript
const accuracy = await calculateReporterAccuracy('user-123');
// Returns: { totalReports, accurateReports, accuracyRate } or null
```

### takeModerationAction()

```typescript
await takeModerationAction({
  reportId: 'report-123',
  actionType: 'content_removed',
  targetUserId: 'user-456',
  reason: 'Copyright violation confirmed',
  evidenceVerified: true,
  verificationNotes: 'Verified original work link',
});
```

## Common Code Patterns

### Check for Evidence

```typescript
const hasEvidence = (report: Report): boolean => {
  return !!(
    report.metadata?.originalWorkLink ||
    report.metadata?.proofOfOwnership ||
    report.metadata?.audioTimestamp
  );
};
```

### Validate URL

```typescript
const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};
```

### Validate Timestamp

```typescript
const TIMESTAMP_PATTERN = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;

const validateTimestamp = (timestamp: string): boolean => {
  if (!timestamp || timestamp.trim() === '') return true;
  return TIMESTAMP_PATTERN.test(timestamp.trim());
};
```

## Troubleshooting

### "Description must be at least 20 characters"
- **Cause:** Description too short
- **Fix:** Add meaningful content (minimum 20 chars for users, 10 for moderators)

### "Please enter a valid URL"
- **Cause:** Missing protocol or invalid format
- **Fix:** Use `https://example.com` format

### "Please use format MM:SS or HH:MM:SS"
- **Cause:** Invalid timestamp format
- **Fix:** Use `2:35` or `1:23:45` format

### Evidence not displaying
- **Cause:** Metadata null or fields undefined
- **Fix:** Verify submission and database storage

## FAQ

**Q: Are evidence fields required?**  
A: No, all evidence fields are optional.

**Q: Can I add multiple timestamps?**  
A: Yes, separate with commas: "2:35, 5:12, 8:45"

**Q: How is reporter accuracy calculated?**  
A: (resolved with action / total reports) × 100

**Q: How does evidence affect sorting?**  
A: Reports with evidence appear before those without (within same priority)

**Q: Can I add new evidence types?**  
A: Yes, see the [Extensibility Guide](guide-extensibility.md)

## Database Queries

### Find reports with evidence

```sql
SELECT * FROM moderation_reports
WHERE metadata IS NOT NULL
  AND (
    metadata->>'originalWorkLink' IS NOT NULL
    OR metadata->>'proofOfOwnership' IS NOT NULL
    OR metadata->>'audioTimestamp' IS NOT NULL
  );
```

### Filter by copyright evidence

```sql
SELECT * FROM moderation_reports
WHERE metadata->>'originalWorkLink' IS NOT NULL;
```

### Filter by timestamp evidence

```sql
SELECT * FROM moderation_reports
WHERE metadata->>'audioTimestamp' IS NOT NULL;
```

## Evidence Eligibility

### Copyright Evidence
- **When:** `reason === 'copyright_violation'`
- **Types:** All (post, comment, track, album, user)
- **Fields:** `originalWorkLink`, `proofOfOwnership`

### Audio Timestamp
- **When:** `report_type === 'track'` AND `reason` in [`hate_speech`, `harassment`, `inappropriate_content`]
- **Types:** Track only
- **Fields:** `audioTimestamp`

## Badge Display

| Badge | Condition | Color | Icon |
|-------|-----------|-------|------|
| Evidence | Has any evidence | Blue | 📎 |
| Timestamp | Has audio timestamp | Orange | 🕐 |
| Detailed | Description > 100 chars | Green | 📝 |

## Related Documentation

- **[Metadata Structure](guide-metadata-structure.md)** - Complete field reference
- **[Validation Rules](guide-validation-rules.md)** - All validation patterns
- **[Evidence Effects](guide-evidence-effects.md)** - Queue and display behavior
- **[Extensibility Guide](guide-extensibility.md)** - Adding new evidence types

---

**Last Updated:** January 4, 2026  
**Version:** 1.0  
**Requirements:** 14.1-14.7
