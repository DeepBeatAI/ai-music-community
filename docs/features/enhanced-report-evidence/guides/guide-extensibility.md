# Extensibility Guide

## Overview

This guide explains how to extend the Enhanced Report Evidence & Context feature with new evidence types, validation rules, and metadata fields.

**Requirements:** 14.6, 14.7

## Adding New Evidence Types

### Step 1: Update Type Definitions

Add the new field to the `ReportMetadata` interface in `client/src/types/moderation.ts`:

```typescript
export interface ReportMetadata {
  // Existing fields
  originalWorkLink?: string;
  proofOfOwnership?: string;
  audioTimestamp?: string;
  
  // NEW: Add your new evidence field
  videoTimestamp?: string;  // Example: timestamp for video content
  witnessContact?: string;  // Example: contact info for witness
  additionalContext?: string;  // Example: extra context field
  
  // Reporter accuracy (keep this)
  reporterAccuracy?: {
    totalReports: number;
    accurateReports: number;
    accuracyRate: number;
  };
}
```

**Naming Conventions:**
- Use camelCase for field names
- Use descriptive names that indicate the field's purpose
- Add JSDoc comments explaining the field

**Example:**
```typescript
/**
 * Video timestamp evidence
 * Format: MM:SS or HH:MM:SS
 * Used for video content violations
 */
videoTimestamp?: string;
```

### Step 2: Add Validation Rules

Create validation functions for your new field in the component or service layer:

**Client-Side Validation (ReportModal.tsx):**
```typescript
const validateVideoTimestamp = (timestamp: string): boolean => {
  if (!timestamp || timestamp.trim() === '') {
    return true; // Optional field
  }
  
  // Reuse existing timestamp validation
  const TIMESTAMP_PATTERN = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;
  return TIMESTAMP_PATTERN.test(timestamp.trim());
};

// Add to validation logic
const [videoTimestamp, setVideoTimestamp] = useState('');
const [errors, setErrors] = useState<Record<string, string>>({});

const handleVideoTimestampBlur = () => {
  if (videoTimestamp && !validateVideoTimestamp(videoTimestamp)) {
    setErrors({
      ...errors,
      videoTimestamp: 'Please use format MM:SS or HH:MM:SS',
    });
  } else {
    const newErrors = { ...errors };
    delete newErrors.videoTimestamp;
    setErrors(newErrors);
  }
};
```

**Server-Side Validation (moderationService.ts):**
```typescript
export async function submitReport(params: ReportParams): Promise<void> {
  // Existing validation...
  
  // NEW: Validate video timestamp
  if (params.metadata?.videoTimestamp) {
    if (!validateTimestamp(params.metadata.videoTimestamp)) {
      throw new ModerationError(
        'Invalid video timestamp format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
  }
  
  // Continue with submission...
}
```

### Step 3: Add UI Fields

Add input fields to the report modal components:

**ReportModal.tsx:**
```typescript
// Add state
const [videoTimestamp, setVideoTimestamp] = useState('');

// Add conditional rendering based on report type/reason
const showVideoTimestamp = 
  reportType === 'post' && 
  (reason === 'hate_speech' || reason === 'harassment');

// Add UI field
{showVideoTimestamp && (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-300">
      Video Timestamp (optional)
    </label>
    <input
      type="text"
      value={videoTimestamp}
      onChange={(e) => setVideoTimestamp(e.target.value)}
      onBlur={handleVideoTimestampBlur}
      placeholder="e.g., 2:35 or 1:23:45"
      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg ${
        errors.videoTimestamp ? 'border-red-500' : 'border-gray-600'
      }`}
    />
    {errors.videoTimestamp && (
      <p className="text-sm text-red-400">{errors.videoTimestamp}</p>
    )}
    <p className="text-xs text-gray-400">
      Help moderators find the violation quickly
    </p>
  </div>
)}

// Update form submission
const handleSubmit = async () => {
  await submitReport({
    reportType,
    targetId,
    reason,
    description,
    metadata: {
      originalWorkLink: originalWorkLink.trim() || undefined,
      proofOfOwnership: proofOfOwnership.trim() || undefined,
      audioTimestamp: audioTimestamp.trim() || undefined,
      videoTimestamp: videoTimestamp.trim() || undefined, // NEW
    },
  });
};
```

**ModeratorFlagModal.tsx:**
```typescript
// Add the same fields and logic as ReportModal
// Moderators should have access to the same evidence fields
```

### Step 4: Add Display Logic

Add display logic to the ModerationActionPanel:

**ModerationActionPanel.tsx:**
```typescript
{/* Evidence Section */}
{(report.metadata?.originalWorkLink || 
  report.metadata?.proofOfOwnership || 
  report.metadata?.audioTimestamp ||
  report.metadata?.videoTimestamp) && ( // NEW
  <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 space-y-3">
    <h3 className="text-lg font-semibold text-blue-300">Evidence Provided</h3>
    
    {/* Existing evidence fields... */}
    
    {/* NEW: Video timestamp display */}
    {report.metadata?.videoTimestamp && (
      <div>
        <span className="text-sm text-blue-400">Video timestamp:</span>
        <p className="text-white text-sm mt-1">{report.metadata.videoTimestamp}</p>
      </div>
    )}
  </div>
)}
```

### Step 5: Add Badge Logic (Optional)

If you want a badge for your new evidence type:

**ReportCard.tsx:**
```typescript
{/* NEW: Video timestamp badge */}
{report.metadata?.videoTimestamp && (
  <span className="px-2 py-1 text-xs font-medium bg-purple-900/30 text-purple-400 rounded">
    🎥 {report.metadata.videoTimestamp}
  </span>
)}
```

### Step 6: Update Evidence Detection

Update the `hasEvidence` helper function:

**moderationService.ts or utility file:**
```typescript
export const hasEvidence = (report: Report): boolean => {
  return !!(
    report.metadata?.originalWorkLink ||
    report.metadata?.proofOfOwnership ||
    report.metadata?.audioTimestamp ||
    report.metadata?.videoTimestamp // NEW
  );
};
```

### Step 7: Write Tests

Add tests for your new evidence type:

**Unit Tests:**
```typescript
describe('videoTimestamp validation', () => {
  it('accepts valid MM:SS format', () => {
    expect(validateVideoTimestamp('2:35')).toBe(true);
  });
  
  it('accepts valid HH:MM:SS format', () => {
    expect(validateVideoTimestamp('1:23:45')).toBe(true);
  });
  
  it('rejects invalid format', () => {
    expect(validateVideoTimestamp('invalid')).toBe(false);
  });
  
  it('accepts empty string (optional field)', () => {
    expect(validateVideoTimestamp('')).toBe(true);
  });
});
```

**Integration Tests:**
```typescript
describe('Report submission with video timestamp', () => {
  it('stores video timestamp in metadata', async () => {
    const reportId = await submitReport({
      reportType: 'post',
      targetId: 'test-post-id',
      reason: 'hate_speech',
      description: 'Test description with sufficient length',
      metadata: {
        videoTimestamp: '2:35',
      },
    });
    
    const report = await fetchReport(reportId);
    expect(report.metadata?.videoTimestamp).toBe('2:35');
  });
});
```

**Property-Based Tests:**
```typescript
test('video timestamp round-trip', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ pattern: /\d{1,2}:[0-5]\d(?::[0-5]\d)?/ }),
      async (timestamp) => {
        const reportId = await submitReport({
          reportType: 'post',
          targetId: 'test-post-id',
          reason: 'hate_speech',
          description: 'Test description with sufficient length',
          metadata: { videoTimestamp: timestamp },
        });
        
        const report = await fetchReport(reportId);
        expect(report.metadata?.videoTimestamp).toBe(timestamp);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Adding New Validation Rules

### Step 1: Define Validation Function

Create a reusable validation function:

```typescript
// In utils/validation.ts or similar
export const validateEmail = (email: string): boolean => {
  if (!email || email.trim() === '') {
    return true; // Optional field
  }
  
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_PATTERN.test(email.trim());
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || phone.trim() === '') {
    return true; // Optional field
  }
  
  // E.164 format: +[country code][number]
  const PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;
  return PHONE_PATTERN.test(phone.trim());
};
```

### Step 2: Add Client-Side Validation

Use the validation function in your component:

```typescript
const [witnessContact, setWitnessContact] = useState('');
const [errors, setErrors] = useState<Record<string, string>>({});

const handleWitnessContactBlur = () => {
  if (witnessContact && !validateEmail(witnessContact)) {
    setErrors({
      ...errors,
      witnessContact: 'Please enter a valid email address',
    });
  } else {
    const newErrors = { ...errors };
    delete newErrors.witnessContact;
    setErrors(newErrors);
  }
};
```

### Step 3: Add Server-Side Validation

Add validation to the service layer:

```typescript
export async function submitReport(params: ReportParams): Promise<void> {
  // Existing validation...
  
  // NEW: Validate witness contact
  if (params.metadata?.witnessContact) {
    if (!validateEmail(params.metadata.witnessContact)) {
      throw new ModerationError(
        'Invalid email format for witness contact',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
  }
  
  // Continue with submission...
}
```

### Step 4: Write Validation Tests

Test your validation function thoroughly:

```typescript
describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.uk')).toBe(true);
  });
  
  it('rejects invalid email addresses', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
  
  it('accepts empty string (optional field)', () => {
    expect(validateEmail('')).toBe(true);
  });
});
```

## Extending Metadata Structure

### Adding Nested Objects

You can add complex nested structures to metadata:

```typescript
export interface ReportMetadata {
  // Existing fields...
  
  // NEW: Nested structure for detailed evidence
  detailedEvidence?: {
    category: 'copyright' | 'harassment' | 'spam';
    severity: 'low' | 'medium' | 'high';
    affectedUsers?: string[];
    relatedContent?: string[];
    additionalNotes?: string;
  };
}
```

**Usage:**
```typescript
await submitReport({
  reportType: 'post',
  targetId: 'test-post-id',
  reason: 'harassment',
  description: 'Test description',
  metadata: {
    detailedEvidence: {
      category: 'harassment',
      severity: 'high',
      affectedUsers: ['user1', 'user2'],
      relatedContent: ['post1', 'post2'],
      additionalNotes: 'Pattern of behavior over multiple posts',
    },
  },
});
```

### Adding Arrays

You can store arrays of evidence items:

```typescript
export interface ReportMetadata {
  // Existing fields...
  
  // NEW: Array of screenshot URLs
  screenshots?: string[];
  
  // NEW: Array of witness statements
  witnessStatements?: Array<{
    name: string;
    contact: string;
    statement: string;
  }>;
}
```

**Usage:**
```typescript
await submitReport({
  reportType: 'post',
  targetId: 'test-post-id',
  reason: 'harassment',
  description: 'Test description',
  metadata: {
    screenshots: [
      'https://example.com/screenshot1.png',
      'https://example.com/screenshot2.png',
    ],
    witnessStatements: [
      {
        name: 'John Doe',
        contact: 'john@example.com',
        statement: 'I witnessed the harassment',
      },
    ],
  },
});
```

## Testing Requirements for New Evidence Types

### Unit Tests (Required)

1. **Validation Tests:**
   - Test valid inputs
   - Test invalid inputs
   - Test edge cases (empty, null, boundary values)
   - Test security cases (XSS, SQL injection)

2. **Component Tests:**
   - Test field rendering
   - Test conditional display logic
   - Test state management
   - Test error handling

### Integration Tests (Required)

1. **Submission Tests:**
   - Test report submission with new evidence
   - Test metadata storage
   - Test metadata retrieval

2. **Display Tests:**
   - Test evidence display in action panel
   - Test badge display in report cards
   - Test filtering by new evidence type

### Property-Based Tests (Recommended)

1. **Round-Trip Tests:**
   - Test that evidence survives submission and retrieval
   - Test with randomly generated valid inputs

2. **Validation Tests:**
   - Test validation with randomly generated inputs
   - Ensure invalid inputs are always rejected

### E2E Tests (Recommended)

1. **User Flow Tests:**
   - Test complete report submission flow
   - Test moderator review flow
   - Test evidence display and interaction

## Best Practices

### 1. Keep Fields Optional

All evidence fields should be optional to maintain flexibility:

```typescript
// ✅ Good: Optional field
videoTimestamp?: string;

// ❌ Bad: Required field
videoTimestamp: string;
```

### 2. Validate on Both Client and Server

Always implement validation on both sides:

```typescript
// Client-side: Immediate feedback
const handleBlur = () => {
  if (field && !validate(field)) {
    setError('Invalid format');
  }
};

// Server-side: Security enforcement
if (params.metadata?.field && !validate(params.metadata.field)) {
  throw new ModerationError('Invalid format', VALIDATION_ERROR);
}
```

### 3. Use Descriptive Error Messages

Provide clear, actionable error messages:

```typescript
// ✅ Good: Specific and helpful
'Please use format MM:SS or HH:MM:SS (e.g., 2:35 or 1:23:45)'

// ❌ Bad: Vague and unhelpful
'Invalid format'
```

### 4. Document Your Changes

Add JSDoc comments to new fields and functions:

```typescript
/**
 * Video timestamp evidence
 * 
 * Format: MM:SS or HH:MM:SS
 * Used for: Video content violations
 * Validation: Must match timestamp pattern
 * 
 * @example "2:35" - 2 minutes, 35 seconds
 * @example "1:23:45" - 1 hour, 23 minutes, 45 seconds
 */
videoTimestamp?: string;
```

### 5. Maintain Backward Compatibility

Ensure new fields don't break existing functionality:

```typescript
// ✅ Good: Safe access with optional chaining
const hasEvidence = report.metadata?.originalWorkLink || 
                    report.metadata?.videoTimestamp;

// ❌ Bad: Assumes metadata exists
const hasEvidence = report.metadata.originalWorkLink;
```

### 6. Test Thoroughly

Write comprehensive tests for all new functionality:

- Unit tests for validation
- Integration tests for submission and retrieval
- Property-based tests for round-trip consistency
- E2E tests for user workflows

### 7. Update Documentation

Update all relevant documentation:

- Metadata structure documentation
- Validation rules documentation
- Evidence effects documentation
- This extensibility guide

## Common Pitfalls

### 1. Forgetting Server-Side Validation

**Problem:** Only validating on client-side  
**Solution:** Always validate on both client and server

### 2. Breaking Backward Compatibility

**Problem:** Assuming all reports have metadata  
**Solution:** Use optional chaining and null checks

### 3. Inconsistent Validation

**Problem:** Different validation rules on client vs server  
**Solution:** Share validation functions or keep rules in sync

### 4. Poor Error Messages

**Problem:** Generic error messages that don't help users  
**Solution:** Provide specific, actionable error messages

### 5. Missing Tests

**Problem:** Not testing new evidence types thoroughly  
**Solution:** Write comprehensive unit, integration, and E2E tests

## Example: Complete Implementation

Here's a complete example of adding a new evidence type:

```typescript
// 1. Update types (client/src/types/moderation.ts)
export interface ReportMetadata {
  // Existing fields...
  
  /**
   * Screenshot URLs for visual evidence
   * Format: Array of valid HTTPS URLs
   * Used for: All report types
   */
  screenshots?: string[];
}

// 2. Add validation (utils/validation.ts)
export const validateScreenshotUrls = (urls: string[]): boolean => {
  if (!urls || urls.length === 0) {
    return true; // Optional field
  }
  
  return urls.every(url => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  });
};

// 3. Add UI field (ReportModal.tsx)
const [screenshots, setScreenshots] = useState<string[]>([]);

const handleAddScreenshot = () => {
  setScreenshots([...screenshots, '']);
};

const handleScreenshotChange = (index: number, value: string) => {
  const newScreenshots = [...screenshots];
  newScreenshots[index] = value;
  setScreenshots(newScreenshots);
};

{/* UI */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-300">
    Screenshots (optional)
  </label>
  {screenshots.map((url, index) => (
    <input
      key={index}
      type="text"
      value={url}
      onChange={(e) => handleScreenshotChange(index, e.target.value)}
      placeholder="https://example.com/screenshot.png"
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
    />
  ))}
  <button
    type="button"
    onClick={handleAddScreenshot}
    className="text-sm text-blue-400 hover:text-blue-300"
  >
    + Add Screenshot
  </button>
</div>

// 4. Add server validation (moderationService.ts)
if (params.metadata?.screenshots) {
  if (!validateScreenshotUrls(params.metadata.screenshots)) {
    throw new ModerationError(
      'All screenshot URLs must be valid HTTPS URLs',
      MODERATION_ERROR_CODES.VALIDATION_ERROR
    );
  }
}

// 5. Add display (ModerationActionPanel.tsx)
{report.metadata?.screenshots && report.metadata.screenshots.length > 0 && (
  <div>
    <span className="text-sm text-blue-400">Screenshots:</span>
    <div className="grid grid-cols-2 gap-2 mt-2">
      {report.metadata.screenshots.map((url, index) => (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 hover:text-blue-200 underline text-sm"
        >
          Screenshot {index + 1}
        </a>
      ))}
    </div>
  </div>
)}

// 6. Write tests
describe('screenshots evidence', () => {
  it('stores screenshot URLs in metadata', async () => {
    const reportId = await submitReport({
      reportType: 'post',
      targetId: 'test-post-id',
      reason: 'harassment',
      description: 'Test description with sufficient length',
      metadata: {
        screenshots: [
          'https://example.com/screenshot1.png',
          'https://example.com/screenshot2.png',
        ],
      },
    });
    
    const report = await fetchReport(reportId);
    expect(report.metadata?.screenshots).toHaveLength(2);
  });
  
  it('validates screenshot URLs', () => {
    expect(validateScreenshotUrls([
      'https://example.com/screenshot.png'
    ])).toBe(true);
    
    expect(validateScreenshotUrls([
      'http://example.com/screenshot.png' // HTTP not allowed
    ])).toBe(false);
  });
});
```

## Related Documentation

- [Metadata Structure](guide-metadata-structure.md) - Field definitions
- [Validation Rules](guide-validation-rules.md) - Validation requirements
- [Evidence Effects](guide-evidence-effects.md) - How evidence affects behavior
- [Technical Reference](guide-technical-reference.md) - Complete API reference

---

**Last Updated:** January 4, 2026  
**Version:** 1.0  
**Requirements:** 14.6, 14.7
