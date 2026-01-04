# Report Metadata Structure Documentation

## Overview

This document describes the metadata structure used in the Enhanced Report Evidence & Context feature. All evidence fields are stored in the `metadata` JSONB column of the `moderation_reports` table.

**Requirements:** 14.1

## ReportMetadata Interface

The `ReportMetadata` interface defines the structure for all evidence data stored with reports.

**Location:** `client/src/types/moderation.ts`

```typescript
export interface ReportMetadata {
  // Copyright evidence (Requirement 1)
  originalWorkLink?: string;
  proofOfOwnership?: string;
  
  // Audio timestamp evidence (Requirement 2)
  audioTimestamp?: string;
  
  // Reporter accuracy (for display in report cards - Requirement 5)
  reporterAccuracy?: {
    totalReports: number;
    accurateReports: number;
    accuracyRate: number;
  };
}
```

## Field Descriptions

### Copyright Evidence Fields

#### originalWorkLink (optional)

**Type:** `string | undefined`  
**Purpose:** URL to the original copyrighted work  
**Used When:** Report reason is `copyright_violation`  
**Validation:** Must be a valid URL format (see validation rules)  
**Character Limit:** None (reasonable URL length expected)

**Example:**
```json
{
  "originalWorkLink": "https://example.com/original-work"
}
```

#### proofOfOwnership (optional)

**Type:** `string | undefined`  
**Purpose:** Text description of proof of copyright ownership  
**Used When:** Report reason is `copyright_violation`  
**Validation:** None (free text)  
**Character Limit:** 500 characters maximum

**Example:**
```json
{
  "proofOfOwnership": "I am the original artist and can provide registration documents from the copyright office."
}
```

### Audio Timestamp Evidence

#### audioTimestamp (optional)

**Type:** `string | undefined`  
**Purpose:** Timestamp(s) in audio where violation occurs  
**Used When:** Report type is `track` and reason is `hate_speech`, `harassment`, or `inappropriate_content`  
**Validation:** Must match format `MM:SS` or `HH:MM:SS` (see validation rules)  
**Multiple Values:** Comma-separated (e.g., "2:35, 5:12, 8:45")

**Examples:**
```json
{
  "audioTimestamp": "2:35"
}
```

```json
{
  "audioTimestamp": "1:23:45"
}
```

```json
{
  "audioTimestamp": "2:35, 5:12, 8:45"
}
```

### Reporter Accuracy Data

#### reporterAccuracy (optional)

**Type:** `object | undefined`  
**Purpose:** Cached reporter accuracy data for display in report cards  
**Calculated By:** `calculateReporterAccuracy()` function  
**Updated:** When report is loaded in moderation queue  
**Display:** Report cards and User Violation History section

**Structure:**
```typescript
{
  totalReports: number;      // Total reports submitted by this reporter
  accurateReports: number;   // Reports that resulted in moderation action
  accuracyRate: number;      // Percentage (0-100)
}
```

**Example:**
```json
{
  "reporterAccuracy": {
    "totalReports": 20,
    "accurateReports": 17,
    "accuracyRate": 85
  }
}
```

## Complete Metadata Examples

### Copyright Report with Full Evidence

```json
{
  "originalWorkLink": "https://soundcloud.com/artist/original-track",
  "proofOfOwnership": "I am the original artist. My artist name is John Doe and I can provide copyright registration documents.",
  "reporterAccuracy": {
    "totalReports": 15,
    "accurateReports": 14,
    "accuracyRate": 93
  }
}
```

### Audio Violation Report with Timestamps

```json
{
  "audioTimestamp": "2:35, 5:12",
  "reporterAccuracy": {
    "totalReports": 8,
    "accurateReports": 6,
    "accuracyRate": 75
  }
}
```

### Report with No Evidence

```json
{
  "reporterAccuracy": {
    "totalReports": 3,
    "accurateReports": 2,
    "accuracyRate": 67
  }
}
```

Or simply:
```json
null
```

## Database Storage

### Table: moderation_reports

**Column:** `metadata`  
**Type:** `JSONB`  
**Nullable:** Yes  
**Default:** `null`

The metadata column stores the entire `ReportMetadata` object as JSON. PostgreSQL's JSONB type provides:
- Efficient storage (binary format)
- Fast querying with GIN indexes
- Flexible schema evolution

### Querying Metadata

**Check if evidence exists:**
```sql
SELECT * FROM moderation_reports
WHERE metadata IS NOT NULL
  AND (
    metadata->>'originalWorkLink' IS NOT NULL
    OR metadata->>'proofOfOwnership' IS NOT NULL
    OR metadata->>'audioTimestamp' IS NOT NULL
  );
```

**Filter by copyright evidence:**
```sql
SELECT * FROM moderation_reports
WHERE metadata->>'originalWorkLink' IS NOT NULL;
```

**Filter by audio timestamp:**
```sql
SELECT * FROM moderation_reports
WHERE metadata->>'audioTimestamp' IS NOT NULL;
```

## Evidence Verification Metadata

In addition to report metadata, moderation actions can store evidence verification data in their own metadata field.

**Location:** `moderation_actions.metadata.evidence_verification`

**Structure:**
```typescript
{
  evidence_verification?: {
    verified: boolean;
    notes?: string;  // Max 500 characters
    verified_at: string;  // ISO timestamp
    verified_by: string;  // Moderator user ID
  }
}
```

**Example:**
```json
{
  "evidence_verification": {
    "verified": true,
    "notes": "Confirmed original work link is valid and matches reported content.",
    "verified_at": "2026-01-04T10:30:00Z",
    "verified_by": "mod-user-id-123"
  }
}
```

## Field Eligibility Rules

Not all evidence fields are available for all report types and reasons. The UI conditionally displays fields based on these rules:

### Copyright Evidence
- **Available When:** `reason === 'copyright_violation'`
- **Fields:** `originalWorkLink`, `proofOfOwnership`
- **Report Types:** All (post, comment, track, album, user)

### Audio Timestamp Evidence
- **Available When:** 
  - `report_type === 'track'` AND
  - `reason` is one of: `hate_speech`, `harassment`, `inappropriate_content`
- **Fields:** `audioTimestamp`
- **Report Types:** Track only

### Reporter Accuracy
- **Available When:** Always (calculated for all reports)
- **Fields:** `reporterAccuracy`
- **Display:** Report cards and User Violation History

## Optional vs Required Fields

**All evidence fields are OPTIONAL.**

Users can submit reports without providing any evidence. However:
- Reports with evidence are prioritized in the queue
- Reports with evidence display badges for quick identification
- Evidence helps moderators make faster, more confident decisions

**The only REQUIRED field is the report description:**
- Minimum 20 characters for user reports
- Minimum 10 characters for moderator flags

## Backward Compatibility

The metadata structure is designed for backward compatibility:

1. **Null metadata:** Reports created before this feature have `metadata = null`
2. **Missing fields:** Reports with partial evidence have some fields undefined
3. **New fields:** Future evidence types can be added without breaking existing reports

**Example of handling missing metadata:**
```typescript
// Safe access pattern
const hasEvidence = report.metadata && (
  report.metadata.originalWorkLink ||
  report.metadata.proofOfOwnership ||
  report.metadata.audioTimestamp
);
```

## Related Documentation

- [Validation Rules](guide-validation-rules.md) - Field validation requirements
- [Evidence Effects](guide-evidence-effects.md) - How evidence affects queue behavior
- [Extensibility Guide](guide-extensibility.md) - Adding new evidence types
- [Technical Reference](guide-technical-reference.md) - Complete API reference

---

**Last Updated:** January 4, 2026  
**Version:** 1.0  
**Requirements:** 14.1
