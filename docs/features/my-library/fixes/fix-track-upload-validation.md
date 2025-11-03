# Track Upload Validation Fix

## Overview

Fixed track upload database errors by improving validation and error handling for required fields, particularly the mandatory `author` field.

## Problem Analysis

### Database Schema Requirements

The `tracks` table has the following required fields:
- `user_id` (uuid, NOT NULL)
- `title` (text, NOT NULL)
- `author` (text, NOT NULL) - **Critical field**
- `file_url` (text, NOT NULL)
- `duration` (integer, nullable) - **Must be integer, not float**

The `author` field has strict constraints:
- NOT NULL (required)
- CHECK: `length(TRIM(BOTH FROM author)) > 0` (cannot be empty)
- CHECK: `length(author) <= 100` (max 100 characters)

### Root Causes Identified

**Issue 1: Type Mismatch (Primary Issue)**
- The `duration` field was being sent as a float (e.g., `276.52`)
- Database expects an integer type
- Error: `invalid input syntax for type integer: "276.52"`

**Issue 2: Validation and UX**
- Author field might not be populated if profile hasn't loaded
- Insufficient client-side validation before upload
- Generic error messages didn't guide users to fix the issue
- No visual feedback for validation errors
- Error details showed as `[object Object]`

## Solution Implemented

### 1. Fixed Duration Type Mismatch (CRITICAL)

**File:** `client/src/lib/tracks.ts`

The primary issue was that duration was being sent as a float but the database expects an integer:

```typescript
// Extract duration and ensure it's an integer
let extractedDuration = await extractAudioDuration(uploadData.file);
if (extractedDuration) {
  // Ensure duration is an integer (database expects integer, not float)
  extractedDuration = Math.round(extractedDuration);
  console.log(`✅ Duration extracted: ${extractedDuration}s`);
}

// Also round duration from compression result
let finalDuration: number | null = null;
if (uploadData.compressionResult?.duration) {
  finalDuration = Math.round(uploadData.compressionResult.duration);
} else if (extractedDuration) {
  finalDuration = extractedDuration; // Already rounded above
}
```

### 2. Enhanced Client-Side Validation

**File:** `client/src/components/AudioUpload.tsx`

Added comprehensive validation before upload:
```typescript
// Validate required fields before upload
const trimmedTitle = trackTitle.trim();
const trimmedAuthor = trackAuthor.trim();

if (!trimmedTitle) {
  setUploadError('Track title is required');
  return;
}

if (!trimmedAuthor) {
  setUploadError('Track author is required. Please enter an artist name.');
  return;
}

if (trimmedAuthor.length > 100) {
  setUploadError('Author name must be 100 characters or less');
  return;
}
```

### 3. Improved Default Value Handling

Enhanced author field initialization to always provide a default:
```typescript
// Pre-fill author with username from profile (mandatory field)
if (!trackAuthor) {
  // Use profile username if available, otherwise use email prefix
  const defaultAuthor = profile?.username || user?.email?.split('@')[0] || '';
  setTrackAuthor(defaultAuthor);
}
```

### 4. Better Error Messages

Improved error display to show specific details:
```typescript
// Provide more specific error messages
const errorMessage = result.error || 'Failed to upload track';
const details = result.details ? ` (${result.details})` : '';
setUploadError(errorMessage + details);
```

### 5. Visual Feedback for Validation Errors

Added red border highlighting for fields with errors:
```typescript
className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
  uploadError && uploadError.toLowerCase().includes('author') 
    ? 'border-red-500 focus:ring-red-500' 
    : 'border-gray-600'
}`}
```

### 6. Auto-Clear Errors on User Input

Errors automatically clear when user starts typing:
```typescript
onChange={(e) => {
  setTrackAuthor(e.target.value);
  // Clear error when user starts typing
  if (uploadError && uploadError.includes('author')) {
    setUploadError(null);
  }
}}
```

## Changes Made

### Modified Files

1. **client/src/components/AudioUpload.tsx**
   - Added comprehensive field validation before upload
   - Improved default author value initialization
   - Enhanced error messages with details
   - Added visual feedback for validation errors
   - Implemented auto-clear errors on user input
   - Fixed React Hook dependency warning

2. **client/src/lib/tracks.ts**
   - **CRITICAL FIX:** Round duration to integer before database insert
   - Ensure duration from compression result is also rounded
   - Enhanced database error logging with detailed information
   - Added logging of insert data for debugging
   - Improved error message extraction from Supabase errors
   - Fixed error details display (was showing [object Object])
   - Added detailed error breakdown (message, details, hint, code)

## Testing Recommendations

### Test Cases

1. **Valid Upload**
   - Upload track with all required fields filled
   - Verify successful upload and database insert

2. **Missing Title**
   - Try to upload without entering a title
   - Verify error message: "Track title is required"
   - Verify red border on title field

3. **Missing Author**
   - Clear the author field and try to upload
   - Verify error message: "Track author is required. Please enter an artist name."
   - Verify red border on author field

4. **Author Too Long**
   - Enter more than 100 characters in author field
   - Verify error message: "Author name must be 100 characters or less"

5. **Default Author Population**
   - Upload track without modifying author field
   - Verify author is pre-filled with username or email prefix

6. **Error Recovery**
   - Trigger a validation error
   - Start typing in the error field
   - Verify error message clears and border returns to normal

7. **Various File Formats**
   - Test with MP3, WAV, FLAC files
   - Verify all formats upload successfully

## Database Validation

The server-side validation in `uploadTrack` function already handles:
- Author field presence check
- Author length validation (max 100 characters)
- Empty string check (after trimming)
- Proper error codes and messages

## Success Criteria

- ✅ All required fields validated before upload
- ✅ Clear, specific error messages for validation failures
- ✅ Visual feedback (red borders) for fields with errors
- ✅ Default values populated for author field
- ✅ Errors auto-clear when user starts typing
- ✅ No TypeScript errors or warnings
- ✅ Proper error handling for database constraints

## Related Requirements

- Requirement 3.1: Query tracks table schema to identify all required fields
- Requirement 3.2: Check for constraints and default values
- Requirement 3.3: Review AudioUpload component to see what fields it sends
- Requirement 3.4: Update AudioUpload component to provide all required fields
- Requirement 3.5: Add validation before database insert

## Debugging

### Enhanced Error Logging

The fix includes comprehensive error logging to help diagnose database issues:

1. **Insert Data Logging**
   - All fields being inserted are logged to console
   - Helps identify which field might be causing the error

2. **Detailed Error Information**
   - Extracts `message`, `details`, `hint`, and `code` from Supabase errors
   - Displays full error context instead of `[object Object]`

3. **Console Output**
   - Look for `❌ Database insert error:` in console
   - Check `📋 Insert data was:` to see what was sent
   - Review `📝 Detailed error:` for full error breakdown

### Common Database Errors

1. **Type mismatch (FIXED)**
   - Error: `invalid input syntax for type integer: "276.52"`
   - Cause: Sending float value to integer column
   - Solution: Round numeric values to integers before insert

2. **NOT NULL constraint violation**
   - Error: "null value in column X violates not-null constraint"
   - Solution: Ensure all required fields are provided

3. **CHECK constraint violation**
   - Error: "new row for relation X violates check constraint Y"
   - Solution: Check field values meet constraint requirements

4. **Foreign key violation**
   - Error: "insert or update on table X violates foreign key constraint Y"
   - Solution: Ensure referenced records exist (e.g., user_id)

5. **RLS policy violation**
   - Error: "new row violates row-level security policy"
   - Solution: Check user authentication and RLS policies

## Notes

- The `author` field is immutable after upload (by design)
- Users are warned that author cannot be changed after upload
- The validation prevents database constraint violations
- Error messages guide users to fix the specific issue
- Visual feedback improves user experience
- Enhanced error logging helps diagnose database issues quickly

---

**Status:** ✅ Complete (with enhanced debugging)
**Date:** 2025-01-03
**Task:** 3.1 Implement track upload fix

**Next Steps:**
- Try uploading a track again
- Check browser console for detailed error information
- Share the console output if the error persists
