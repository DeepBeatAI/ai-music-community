# Validation Rules Documentation

## Overview

This document describes all validation rules for evidence fields in the Enhanced Report Evidence & Context feature. Validation occurs at both client-side (immediate feedback) and server-side (security enforcement).

**Requirements:** 14.2, 14.3, 14.4

## Description Field Validation

### User Reports

**Field:** `description`  
**Minimum Length:** 20 characters  
**Maximum Length:** 1000 characters  
**Required:** Yes

**Validation Logic:**
```typescript
if (!description || description.trim().length < 20) {
  throw new ModerationError(
    'Description must be at least 20 characters',
    MODERATION_ERROR_CODES.VALIDATION_ERROR
  );
}

if (description.length > 1000) {
  throw new ModerationError(
    'Description must not exceed 1000 characters',
    MODERATION_ERROR_CODES.VALIDATION_ERROR
  );
}
```

**Error Messages:**
- Too short: "Please provide at least 20 characters describing the violation"
- Too long: "Description must not exceed 1000 characters"

**UI Feedback:**
- Character counter: "X / 1000 characters (minimum 20)"
- Real-time validation on blur
- Submit button disabled until valid

### Moderator Flags

**Field:** `internalNotes`  
**Minimum Length:** 10 characters  
**Maximum Length:** 1000 characters  
**Required:** Yes

**Rationale:** Moderators are expected to provide more detailed context than regular users, but the minimum is lower (10 vs 20 characters) to allow for concise internal notes.

**Validation Logic:**
```typescript
if (!internalNotes || internalNotes.trim().length < 10) {
  throw new ModerationError(
    'Internal notes must be at least 10 characters',
    MODERATION_ERROR_CODES.VALIDATION_ERROR
  );
}
```

**Error Messages:**
- Too short: "Internal notes must be at least 10 characters"

## URL Validation

### Original Work Link

**Field:** `originalWorkLink`  
**Required:** No (optional)  
**Format:** Valid URL with protocol

**Validation Logic:**
```typescript
const validateUrl = (url: string): boolean => {
  if (!url || url.trim() === '') {
    return true; // Empty is valid (optional field)
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

if (originalWorkLink && !validateUrl(originalWorkLink)) {
  throw new ModerationError(
    'Please enter a valid URL (e.g., https://example.com)',
    MODERATION_ERROR_CODES.VALIDATION_ERROR
  );
}
```

**Valid Examples:**
- `https://example.com/track`
- `http://soundcloud.com/artist/song`
- `https://www.youtube.com/watch?v=abc123`
- `` (empty string - optional field)

**Invalid Examples:**
- `example.com` (missing protocol)
- `ftp://example.com` (wrong protocol)
- `not a url` (invalid format)
- `javascript:alert('xss')` (security risk)

**Error Messages:**
- Invalid format: "Please enter a valid URL (e.g., https://example.com)"

**UI Feedback:**
- Validation on blur
- Red border and error message for invalid URLs
- Helper text: "Link to the original copyrighted work"

## Timestamp Validation

### Audio Timestamp

**Field:** `audioTimestamp`  
**Required:** No (optional)  
**Format:** `MM:SS` or `HH:MM:SS`  
**Multiple Values:** Comma-separated

**Validation Regex:**
```typescript
// Single timestamp pattern
const TIMESTAMP_PATTERN = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;

// Multiple timestamps pattern (comma-separated)
const MULTIPLE_TIMESTAMPS_PATTERN = /^(\d{1,2}:[0-5]\d(?::[0-5]\d)?)(,\s*\d{1,2}:[0-5]\d(?::[0-5]\d)?)*$/;
```

**Validation Logic:**
```typescript
const validateTimestamp = (timestamp: string): boolean => {
  if (!timestamp || timestamp.trim() === '') {
    return true; // Empty is valid (optional field)
  }
  
  // Check if multiple timestamps (comma-separated)
  if (timestamp.includes(',')) {
    return MULTIPLE_TIMESTAMPS_PATTERN.test(timestamp.trim());
  }
  
  // Single timestamp
  return TIMESTAMP_PATTERN.test(timestamp.trim());
};

const validateTimestampFormat = (timestamp: string): boolean => {
  const match = timestamp.match(TIMESTAMP_PATTERN);
  if (!match) return false;
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const hours = match[3] ? parseInt(match[3], 10) : undefined;
  
  // Validate ranges
  if (seconds > 59) return false;
  if (minutes > 59 && hours === undefined) return false;
  
  return true;
};

if (audioTimestamp && !validateTimestamp(audioTimestamp)) {
  throw new ModerationError(
    'Please use format MM:SS or HH:MM:SS (e.g., 2:35 or 1:23:45)',
    MODERATION_ERROR_CODES.VALIDATION_ERROR
  );
}
```

**Valid Examples:**
- `2:35` (2 minutes, 35 seconds)
- `1:23:45` (1 hour, 23 minutes, 45 seconds)
- `0:05` (5 seconds)
- `59:59` (59 minutes, 59 seconds)
- `2:35, 5:12, 8:45` (multiple timestamps)
- `1:23:45, 2:30:00` (multiple with hours)
- `` (empty string - optional field)

**Invalid Examples:**
- `235` (missing colon)
- `2:60` (seconds > 59)
- `60:00` (minutes > 59 without hours)
- `1:2:3` (single-digit seconds)
- `abc` (non-numeric)
- `2:35,5:12` (missing space after comma)

**Error Messages:**
- Invalid format: "Please use format MM:SS or HH:MM:SS (e.g., 2:35 or 1:23:45)"
- Invalid range: "Seconds and minutes must be 00-59"

**UI Feedback:**
- Validation on blur
- Red border and error message for invalid timestamps
- Helper text: "Help moderators find the violation quickly (e.g., 2:35)"
- Placeholder: "2:35 or 1:23:45"

## Character Limit Validation

### Proof of Ownership

**Field:** `proofOfOwnership`  
**Required:** No (optional)  
**Maximum Length:** 500 characters

**Validation Logic:**
```typescript
if (proofOfOwnership && proofOfOwnership.length > 500) {
  throw new ModerationError(
    'Proof of ownership must not exceed 500 characters',
    MODERATION_ERROR_CODES.VALIDATION_ERROR
  );
}
```

**Error Messages:**
- Too long: "Proof of ownership must not exceed 500 characters"

**UI Feedback:**
- Character counter: "X / 500 characters"
- Real-time validation on input
- Red text when limit exceeded

### Verification Notes

**Field:** `verificationNotes` (in moderation actions)  
**Required:** No (optional)  
**Maximum Length:** 500 characters

**Validation Logic:**
```typescript
if (verificationNotes && verificationNotes.length > 500) {
  throw new ModerationError(
    'Verification notes must not exceed 500 characters',
    MODERATION_ERROR_CODES.VALIDATION_ERROR
  );
}
```

**Error Messages:**
- Too long: "Verification notes must not exceed 500 characters"

**UI Feedback:**
- Character counter: "X / 500 characters"
- Real-time validation on input

## Validation Timing

### Client-Side Validation

**When:** Before form submission  
**Purpose:** Immediate user feedback  
**Implementation:** React component state and validation functions

**Validation Points:**
1. **On Blur:** Field loses focus
2. **On Submit:** Form submission attempt
3. **Real-time:** Character counters update on input

**Example:**
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});

const validateField = (field: string, value: string) => {
  const newErrors = { ...errors };
  
  switch (field) {
    case 'description':
      if (value.trim().length < 20) {
        newErrors.description = 'Please provide at least 20 characters';
      } else {
        delete newErrors.description;
      }
      break;
      
    case 'originalWorkLink':
      if (value && !validateUrl(value)) {
        newErrors.originalWorkLink = 'Please enter a valid URL';
      } else {
        delete newErrors.originalWorkLink;
      }
      break;
      
    case 'audioTimestamp':
      if (value && !validateTimestamp(value)) {
        newErrors.audioTimestamp = 'Please use format MM:SS or HH:MM:SS';
      } else {
        delete newErrors.audioTimestamp;
      }
      break;
  }
  
  setErrors(newErrors);
};
```

### Server-Side Validation

**When:** On API request  
**Purpose:** Security enforcement  
**Implementation:** Service layer functions

**Validation Points:**
1. **submitReport()** - Validates user reports
2. **moderatorFlagContent()** - Validates moderator flags
3. **takeModerationAction()** - Validates verification notes

**Example:**
```typescript
export async function submitReport(params: ReportParams): Promise<void> {
  // Validate description
  if (!params.description || params.description.trim().length < 20) {
    throw new ModerationError(
      'Description must be at least 20 characters',
      MODERATION_ERROR_CODES.VALIDATION_ERROR
    );
  }
  
  // Validate URL if provided
  if (params.metadata?.originalWorkLink) {
    if (!validateUrl(params.metadata.originalWorkLink)) {
      throw new ModerationError(
        'Invalid URL format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
  }
  
  // Validate timestamp if provided
  if (params.metadata?.audioTimestamp) {
    if (!validateTimestamp(params.metadata.audioTimestamp)) {
      throw new ModerationError(
        'Invalid timestamp format',
        MODERATION_ERROR_CODES.VALIDATION_ERROR
      );
    }
  }
  
  // Validate character limits
  if (params.metadata?.proofOfOwnership?.length > 500) {
    throw new ModerationError(
      'Proof of ownership must not exceed 500 characters',
      MODERATION_ERROR_CODES.VALIDATION_ERROR
    );
  }
  
  // Proceed with submission...
}
```

## Validation Error Handling

### Error Display

**User Reports (ReportModal):**
- Inline error messages below each field
- Red border on invalid fields
- Submit button disabled until all errors resolved
- Error summary at top of form if multiple errors

**Moderator Flags (ModeratorFlagModal):**
- Same pattern as user reports
- Additional validation for internal notes

**Moderation Actions (ModerationActionPanel):**
- Toast notification for validation errors
- Inline error messages for verification notes

### Error Recovery

**User Actions:**
1. Read error message
2. Correct the invalid field
3. Error clears automatically on blur
4. Submit button re-enables when valid

**Moderator Actions:**
1. Same as user actions
2. Can save draft with validation errors (future feature)

## Security Considerations

### Input Sanitization

All text inputs are sanitized to prevent XSS attacks:

```typescript
const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
```

### URL Validation Security

URL validation prevents:
- JavaScript protocol URLs (`javascript:alert('xss')`)
- Data URLs (`data:text/html,<script>alert('xss')</script>`)
- File protocol URLs (`file:///etc/passwd`)

Only `http:` and `https:` protocols are allowed.

### SQL Injection Prevention

All database queries use parameterized queries via Supabase client:

```typescript
const { data, error } = await supabase
  .from('moderation_reports')
  .insert({
    description: params.description, // Automatically escaped
    metadata: params.metadata,       // Automatically escaped
  });
```

## Testing Validation Rules

### Unit Tests

Test each validation function with:
- Valid inputs (should pass)
- Invalid inputs (should fail)
- Edge cases (empty, null, boundary values)
- Security cases (XSS, SQL injection attempts)

**Example:**
```typescript
describe('validateTimestamp', () => {
  it('accepts valid MM:SS format', () => {
    expect(validateTimestamp('2:35')).toBe(true);
  });
  
  it('accepts valid HH:MM:SS format', () => {
    expect(validateTimestamp('1:23:45')).toBe(true);
  });
  
  it('rejects invalid format', () => {
    expect(validateTimestamp('235')).toBe(false);
  });
  
  it('rejects seconds > 59', () => {
    expect(validateTimestamp('2:60')).toBe(false);
  });
});
```

### Integration Tests

Test validation in complete submission flow:
- Submit report with invalid data
- Verify error message displayed
- Correct data and resubmit
- Verify success

## Related Documentation

- [Metadata Structure](guide-metadata-structure.md) - Field definitions
- [Evidence Effects](guide-evidence-effects.md) - How validation affects behavior
- [Extensibility Guide](guide-extensibility.md) - Adding new validation rules
- [Technical Reference](guide-technical-reference.md) - Complete API reference

---

**Last Updated:** January 4, 2026  
**Version:** 1.0  
**Requirements:** 14.2, 14.3, 14.4
