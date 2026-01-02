# Enhanced Report Evidence & Context - Design Document

## 1. Overview

This design document outlines the implementation approach for enhancing the moderation system with better evidence collection and context display. The design leverages existing moderation infrastructure (ReportModal, ModeratorFlagModal, ModerationActionPanel, ModerationQueue, ModerationMetrics) and uses the existing `metadata` JSONB column in the `moderation_reports` table.

## 2. Database Schema

### 2.1 No Schema Changes Required

The existing `moderation_reports` table already has a `metadata` JSONB column that will store all evidence fields. No migrations are needed.

### 2.2 Metadata Structure

The `metadata` JSONB column will store evidence fields with the following structure:

```typescript
interface ReportMetadata {
  // Copyright evidence (Requirement 1)
  originalWorkLink?: string;
  proofOfOwnership?: string;
  
  // Audio timestamp evidence (Requirement 2)
  audioTimestamp?: string;
  
  // Enhanced description (Requirement 3)
  enhancedDescription?: string;
  
  // Reporter accuracy (for display in report cards - Requirement 5)
  reporterAccuracy?: {
    totalReports: number;
    accurateReports: number;
    accuracyRate: number;
  };
}
```

## 3. Component Modifications

### 3.1 ReportModal Component

**File:** `client/src/components/moderation/ReportModal.tsx`

**Changes:**

1. **Add state for evidence fields:**
   ```typescript
   const [originalWorkLink, setOriginalWorkLink] = useState('');
   const [proofOfOwnership, setProofOfOwnership] = useState('');
   const [audioTimestamp, setAudioTimestamp] = useState('');
   ```

2. **Update description field:**
   - Change label to "Description of violation *"
   - Add character minimum: 20 characters
   - Update validation to enforce minimum
   - Add helper text: "Please provide specific details about the violation (minimum 20 characters)"

3. **Add conditional evidence fields based on reason:**
   - **Copyright violations** (`reason === 'copyright'`):
     - Optional text input: "Link to original work"
     - Optional text input: "Proof of ownership"
     - Helper text: "Providing evidence helps moderators process your report faster"
   
   - **Hate speech** (`reason === 'hate_speech'`):
     - Optional text input: "Timestamp in audio (e.g., 2:35)"
     - Helper text: "Help moderators find the violation quickly"
   
   - **Harassment** (`reason === 'harassment'`):
     - Optional text input: "Timestamp in audio (e.g., 2:35)"
     - Helper text: "Help moderators find the violation quickly"

4. **Update form submission:**
   ```typescript
   await submitReport({
     reportType,
     targetId,
     reason: reason as ReportReason,
     description: description.trim(),
     metadata: {
       originalWorkLink: originalWorkLink.trim() || undefined,
       proofOfOwnership: proofOfOwnership.trim() || undefined,
       audioTimestamp: audioTimestamp.trim() || undefined,
     },
   });
   ```

5. **Add examples section:**
   - Collapsible section showing good vs bad report examples
   - Examples specific to each violation type


### 3.2 ModeratorFlagModal Component

**File:** `client/src/components/moderation/ModeratorFlagModal.tsx`

**Changes:**

1. **Add state for evidence fields:**
   ```typescript
   const [originalWorkLink, setOriginalWorkLink] = useState('');
   const [proofOfOwnership, setProofOfOwnership] = useState('');
   const [audioTimestamp, setAudioTimestamp] = useState('');
   ```

2. **Keep existing 10-character minimum for internal notes** (no change)

3. **Add conditional evidence fields** (same as ReportModal but with moderator-focused helper text)

4. **Update form submission:**
   ```typescript
   await moderatorFlagContent({
     reportType,
     targetId,
     reason: reason as ReportReason,
     internalNotes: internalNotes.trim(),
     priority,
     metadata: {
       originalWorkLink: originalWorkLink.trim() || undefined,
       proofOfOwnership: proofOfOwnership.trim() || undefined,
       audioTimestamp: audioTimestamp.trim() || undefined,
     },
   });
   ```

### 3.3 ModerationActionPanel Component

**File:** `client/src/components/moderation/ModerationActionPanel.tsx`

**Changes:**

1. **Add Evidence Display Section** (after Report Details, before Profile Context):
   ```tsx
   {/* Evidence Section */}
   {(report.metadata?.originalWorkLink || 
     report.metadata?.proofOfOwnership || 
     report.metadata?.audioTimestamp) && (
     <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 space-y-3">
       <h3 className="text-lg font-semibold text-blue-300">Evidence Provided</h3>
       
       {report.metadata.originalWorkLink && (
         <div>
           <span className="text-sm text-blue-400">Link to original work:</span>
           <a 
             href={report.metadata.originalWorkLink}
             target="_blank"
             rel="noopener noreferrer"
             className="text-blue-300 hover:text-blue-200 underline block mt-1"
           >
             {report.metadata.originalWorkLink}
           </a>
         </div>
       )}
       
       {report.metadata.proofOfOwnership && (
         <div>
           <span className="text-sm text-blue-400">Proof of ownership:</span>
           <p className="text-white text-sm mt-1">{report.metadata.proofOfOwnership}</p>
         </div>
       )}
       
       {report.metadata.audioTimestamp && (
         <div>
           <span className="text-sm text-blue-400">Timestamp in audio:</span>
           <p className="text-white text-sm mt-1">{report.metadata.audioTimestamp}</p>
         </div>
       )}
     </div>
   )}
   ```

2. **Enhance User Violation History Section** (existing section):
   - Add reporter accuracy display (if available in metadata)
   - Add "Related Reports" subsection showing other reports on same content/user
   - Keep existing total reports and past actions display

3. **Add Related Reports Query:**
   ```typescript
   const loadRelatedReports = async () => {
     // Query for reports with same target_id
     const { data: sameContentReports } = await supabase
       .from('moderation_reports')
       .select('id, reason, status, created_at')
       .eq('target_id', report.target_id)
       .neq('id', report.id)
       .order('created_at', { ascending: false })
       .limit(5);
     
     // Query for reports against same user
     const { data: sameUserReports } = await supabase
       .from('moderation_reports')
       .select('id, reason, status, created_at, report_type')
       .eq('reported_user_id', report.reported_user_id)
       .neq('id', report.id)
       .order('created_at', { ascending: false })
       .limit(5);
     
     setRelatedReports({
       sameContent: sameContentReports || [],
       sameUser: sameUserReports || [],
     });
   };
   ```


4. **Update User Violation History Section:**
   ```tsx
   {/* User Violation History Section - Enhanced */}
   {userHistory && (
     <div className="bg-gray-700 rounded-lg p-4 sm:p-5 space-y-4">
       <h3 className="text-lg font-semibold text-white">User Violation History</h3>
       
       {/* Existing stats */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div>
           <span className="text-sm text-gray-400">Total Reports:</span>
           <p className="text-white text-lg font-semibold">{userHistory.total_reports}</p>
         </div>
         <div>
           <span className="text-sm text-gray-400">Past Actions (total):</span>
           <p className="text-white text-lg font-semibold">{userHistory.total_actions}</p>
         </div>
       </div>

       {/* NEW: Reporter Accuracy (if this is a user report) */}
       {report.reporter_id && reporterAccuracy && (
         <div className="bg-gray-800 rounded p-3">
           <span className="text-sm text-gray-400 block mb-2">Reporter Accuracy:</span>
           <div className="flex items-center gap-3">
             <div className="text-2xl font-bold text-white">
               {reporterAccuracy.accuracyRate}%
             </div>
             <div className="text-sm text-gray-400">
               {reporterAccuracy.accurateReports} accurate out of {reporterAccuracy.totalReports} reports
             </div>
           </div>
         </div>
       )}

       {/* NEW: Related Reports */}
       {relatedReports && (relatedReports.sameContent.length > 0 || relatedReports.sameUser.length > 0) && (
         <div>
           <span className="text-sm text-gray-400 block mb-2">Related Reports:</span>
           
           {relatedReports.sameContent.length > 0 && (
             <div className="mb-3">
               <p className="text-xs text-gray-500 mb-1">Same content ({relatedReports.sameContent.length}):</p>
               <div className="space-y-1">
                 {relatedReports.sameContent.map((r) => (
                   <div key={r.id} className="bg-gray-800 rounded p-2 text-xs">
                     <span className="text-orange-400">{REASON_LABELS[r.reason]}</span>
                     <span className="text-gray-500 ml-2">{STATUS_LABELS[r.status]}</span>
                     <span className="text-gray-600 ml-2">{formatDate(r.created_at)}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
           
           {relatedReports.sameUser.length > 0 && (
             <div>
               <p className="text-xs text-gray-500 mb-1">Same user ({relatedReports.sameUser.length}):</p>
               <div className="space-y-1">
                 {relatedReports.sameUser.map((r) => (
                   <div key={r.id} className="bg-gray-800 rounded p-2 text-xs">
                     <span className="text-purple-400">{r.report_type}</span>
                     <span className="text-orange-400 ml-2">{REASON_LABELS[r.reason]}</span>
                     <span className="text-gray-500 ml-2">{STATUS_LABELS[r.status]}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}

       {/* Existing recent actions display */}
       {userHistory.recent_actions.length > 0 && (
         <div>
           <span className="text-sm text-gray-400 block mb-2">Recent Actions (last 5):</span>
           {/* ... existing code ... */}
         </div>
       )}
     </div>
   )}
   ```

### 3.4 ReportCard Component

**File:** `client/src/components/moderation/ReportCard.tsx`

**Changes:**

1. **Add evidence indicator badge:**
   ```tsx
   {(report.metadata?.originalWorkLink || 
     report.metadata?.proofOfOwnership || 
     report.metadata?.audioTimestamp) && (
     <span className="px-2 py-1 text-xs font-medium bg-blue-900/30 text-blue-400 rounded">
       📎 Evidence Provided
     </span>
   )}
   ```

2. **Add reporter accuracy badge** (if available):
   ```tsx
   {report.metadata?.reporterAccuracy && (
     <span className={`px-2 py-1 text-xs font-medium rounded ${
       report.metadata.reporterAccuracy.accuracyRate >= 80
         ? 'bg-green-900/30 text-green-400'
         : report.metadata.reporterAccuracy.accuracyRate >= 50
         ? 'bg-yellow-900/30 text-yellow-400'
         : 'bg-red-900/30 text-red-400'
     }`}>
       Reporter: {report.metadata.reporterAccuracy.accuracyRate}% accurate
     </span>
   )}
   ```

### 3.5 ModerationMetrics Component

**File:** `client/src/components/moderation/ModerationMetrics.tsx`

**Changes:**

1. **Add "Report Quality" section** to Metrics tab:
   - Average evidence provision rate
   - Reports with evidence vs without
   - Average description length
   - Reports meeting minimum character requirement

2. **Enhance Moderator Performance Comparison:**
   - Already shows accuracy rating and reversal rate
   - No changes needed (Requirement 5 confirmed existing feature is sufficient)


## 4. Service Layer Changes

### 4.1 moderationService.ts

**File:** `client/src/lib/moderationService.ts`

**Changes:**

1. **Update `submitReport` function:**
   ```typescript
   export async function submitReport(params: {
     reportType: ReportType;
     targetId: string;
     reason: ReportReason;
     description?: string;
     metadata?: ReportMetadata;
   }): Promise<void> {
     // ... existing validation ...
     
     // NEW: Validate description minimum length
     if (params.description && params.description.length < 20) {
       throw new ModerationError(
         'Description must be at least 20 characters',
         MODERATION_ERROR_CODES.VALIDATION_ERROR
       );
     }
     
     // ... existing code ...
     
     const { error } = await supabase
       .from('moderation_reports')
       .insert({
         // ... existing fields ...
         metadata: params.metadata || null,
       });
     
     // ... rest of function ...
   }
   ```

2. **Update `moderatorFlagContent` function:**
   ```typescript
   export async function moderatorFlagContent(params: {
     reportType: ReportType;
     targetId: string;
     reason: ReportReason;
     internalNotes: string;
     priority: number;
     metadata?: ReportMetadata;
   }): Promise<void> {
     // ... existing validation ...
     
     // Keep existing 10-character minimum for internal notes
     if (params.internalNotes.length < 10) {
       throw new ModerationError(
         'Internal notes must be at least 10 characters',
         MODERATION_ERROR_CODES.VALIDATION_ERROR
       );
     }
     
     // ... existing code ...
     
     const { error } = await supabase
       .from('moderation_reports')
       .insert({
         // ... existing fields ...
         metadata: params.metadata || null,
       });
     
     // ... rest of function ...
   }
   ```

3. **Add `calculateReporterAccuracy` function:**
   ```typescript
   export async function calculateReporterAccuracy(
     reporterId: string
   ): Promise<{ totalReports: number; accurateReports: number; accuracyRate: number } | null> {
     // Query all reports by this reporter
     const { data: reports } = await supabase
       .from('moderation_reports')
       .select('id, status')
       .eq('reporter_id', reporterId);
     
     if (!reports || reports.length === 0) {
       return null;
     }
     
     // Count accurate reports (resolved with action taken)
     const { data: accurateReports } = await supabase
       .from('moderation_reports')
       .select('id', { count: 'exact', head: true })
       .eq('reporter_id', reporterId)
       .eq('status', 'resolved')
       .not('action_taken', 'is', null);
     
     const totalReports = reports.length;
     const accurate = accurateReports || 0;
     const accuracyRate = Math.round((accurate / totalReports) * 100);
     
     return {
       totalReports,
       accurateReports: accurate,
       accuracyRate,
     };
   }
   ```

## 5. Type Definitions

### 5.1 moderation.ts

**File:** `client/src/types/moderation.ts`

**Changes:**

1. **Add ReportMetadata interface:**
   ```typescript
   export interface ReportMetadata {
     // Copyright evidence
     originalWorkLink?: string;
     proofOfOwnership?: string;
     
     // Audio timestamp evidence
     audioTimestamp?: string;
     
     // Reporter accuracy (calculated and stored for display)
     reporterAccuracy?: {
       totalReports: number;
       accurateReports: number;
       accuracyRate: number;
     };
   }
   ```

2. **Update Report interface:**
   ```typescript
   export interface Report {
     // ... existing fields ...
     metadata: ReportMetadata | null;
   }
   ```


## 6. UI/UX Design

### 6.1 Evidence Input Fields

**Design Pattern:**
- Conditional rendering based on selected reason
- Optional fields with clear helper text
- Inline validation feedback
- Character counters where applicable

**Visual Hierarchy:**
- Evidence fields appear after reason selection
- Highlighted with subtle blue background
- Icon indicators (🔗 for links, ⏱️ for timestamps)

### 6.2 Evidence Display

**Design Pattern:**
- Prominent blue-bordered section in ModerationActionPanel
- Clear labels for each evidence type
- Clickable links for URLs (open in new tab)
- Copy-to-clipboard functionality for timestamps

**Visual Hierarchy:**
- Appears after Report Details section
- Before Profile Context section
- Uses blue color scheme to distinguish from other sections

### 6.3 Reporter Accuracy Display

**Design Pattern:**
- Badge in report cards (color-coded: green ≥80%, yellow ≥50%, red <50%)
- Detailed breakdown in User Violation History section
- Percentage with fraction (e.g., "85% (17/20 reports)")

**Visual Hierarchy:**
- Badge appears with other metadata badges in report cards
- Dedicated subsection in User Violation History

### 6.4 Related Reports Display

**Design Pattern:**
- Collapsible sections for "Same Content" and "Same User"
- Compact list view with key information
- Color-coded by status
- Limited to 5 most recent per category

**Visual Hierarchy:**
- Appears in User Violation History section
- After reporter accuracy, before recent actions

### 6.5 Examples Section

**Design Pattern:**
- Collapsible "Examples of Good Reports" section
- Side-by-side comparison (Good vs Bad)
- Specific to violation type
- Appears at bottom of report modal

**Content:**
```
Good Report Example (Copyright):
"This track uses the melody from 'Song Name' by Artist Name without permission. 
Original work: [link]. I am the copyright holder and can provide proof of ownership."

Bad Report Example:
"This is stolen music."
```

## 7. Validation Logic

### 7.1 Client-Side Validation

**ReportModal:**
- Description: minimum 20 characters (required)
- Original work link: valid URL format (optional)
- Audio timestamp: format validation (e.g., "2:35" or "1:23:45") (optional)

**ModeratorFlagModal:**
- Internal notes: minimum 10 characters (required)
- Same evidence field validation as ReportModal

### 7.2 Server-Side Validation

**submitReport:**
- Enforce 20-character minimum for description
- Validate URL format for originalWorkLink
- Sanitize all text inputs
- Validate metadata structure

**moderatorFlagContent:**
- Enforce 10-character minimum for internalNotes
- Same evidence field validation as submitReport

## 8. Integration Points

### 8.1 Existing Features

**No changes needed to:**
- Metrics tab (already shows moderator accuracy and reversal rate)
- Action reversal system
- Notification system
- Audit logging

**Enhanced features:**
- ReportModal: Add evidence fields
- ModeratorFlagModal: Add evidence fields
- ModerationActionPanel: Add evidence display and related reports
- ReportCard: Add evidence and accuracy badges

### 8.2 Database Queries

**New queries:**
- Calculate reporter accuracy
- Fetch related reports (same content, same user)

**Modified queries:**
- Include metadata in report fetches
- Store metadata in report creation


## 9. Performance Considerations

### 9.1 Query Optimization

- Related reports queries limited to 5 results each
- Reporter accuracy calculated on-demand (not on every report fetch)
- Metadata stored as JSONB for efficient querying

### 9.2 Caching Strategy

- Reporter accuracy cached in report metadata after first calculation
- Related reports fetched only when ModerationActionPanel opens
- No additional database load on queue listing

## 10. Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

**1.1 WHEN a user reports copyright violation THEN the system SHALL provide optional fields for original work link and proof of ownership**
Thoughts: This is about UI behavior - ensuring that when copyright is selected, specific fields appear. We can test this by generating random report scenarios with copyright reason and verifying the fields are present and functional.
Testable: yes - property

**1.2 WHEN a user provides copyright evidence THEN the system SHALL store it in the report metadata**
Thoughts: This is a round-trip property - we can create a report with copyright evidence, submit it, then retrieve it and verify the evidence is preserved.
Testable: yes - property

**2.1 WHEN a user reports hate speech or harassment in audio content THEN the system SHALL provide an optional timestamp field**
Thoughts: This is about UI behavior - ensuring timestamp field appears for specific reasons. We can test this across all audio content types with hate speech/harassment reasons.
Testable: yes - property

**2.2 WHEN a user provides audio timestamp THEN the system SHALL store it in the report metadata**
Thoughts: This is a round-trip property - submit report with timestamp, retrieve it, verify timestamp is preserved.
Testable: yes - property

**3.1 WHEN a user submits a report THEN the system SHALL require a description of at least 20 characters**
Thoughts: This is input validation - we can generate random descriptions of various lengths and ensure those under 20 characters are rejected.
Testable: yes - property

**3.2 WHEN a user submits a report with insufficient description THEN the system SHALL display a clear error message**
Thoughts: This is error handling behavior - we can test that submitting with <20 chars produces the expected error message.
Testable: yes - property

**4.1 WHEN a moderator flags content THEN the system SHALL provide the same evidence fields as user reports**
Thoughts: This is about UI parity - we can verify that moderator flag modal has the same evidence fields as user report modal.
Testable: yes - property

**4.2 WHEN a moderator provides evidence THEN the system SHALL store it in the report metadata**
Thoughts: This is a round-trip property for moderator flags - same as 1.2 but for moderator-created reports.
Testable: yes - property

**5.1 WHEN displaying a report card THEN the system SHALL show reporter accuracy if available**
Thoughts: This is about UI display - we can create reports with reporter accuracy metadata and verify it displays correctly.
Testable: yes - property

**5.2 WHEN calculating reporter accuracy THEN the system SHALL count resolved reports with actions taken as accurate**
Thoughts: This is business logic - we can create various report scenarios and verify the accuracy calculation is correct.
Testable: yes - property

**6.1 WHEN displaying user violation history THEN the system SHALL show total reports and past actions**
Thoughts: This is existing functionality that should continue to work. We can verify the counts are accurate.
Testable: yes - property

**6.2 WHEN displaying user violation history THEN the system SHALL show reporter accuracy if this is a user report**
Thoughts: This is conditional display logic - verify accuracy appears for user reports but not moderator flags.
Testable: yes - property

**7.1 WHEN viewing a report in the action panel THEN the system SHALL show related reports on the same content**
Thoughts: This is query logic - we can create multiple reports on same content and verify they appear in related reports.
Testable: yes - property

**7.2 WHEN viewing a report in the action panel THEN the system SHALL show related reports against the same user**
Thoughts: This is query logic - we can create multiple reports against same user and verify they appear in related reports.
Testable: yes - property

**8.1 WHEN evidence is provided in a report THEN the system SHALL display it prominently in the action panel**
Thoughts: This is UI display - we can create reports with various evidence types and verify they display correctly.
Testable: yes - property

**9.1 WHEN a report includes evidence THEN the system SHALL display an evidence indicator badge in the report card**
Thoughts: This is UI display - verify badge appears when evidence exists and doesn't appear when it doesn't.
Testable: yes - property

**10.1 WHEN submitting a report with invalid URL format THEN the system SHALL reject it with a clear error**
Thoughts: This is input validation - we can generate various invalid URL formats and ensure they're rejected.
Testable: yes - property

**11.1 WHEN viewing metrics THEN the system SHALL show report quality statistics**
Thoughts: This is about aggregate statistics display - we can create various reports and verify the metrics are calculated correctly.
Testable: yes - property


### Property Reflection

Reviewing all properties for redundancy:

- Properties 1.2, 2.2, and 4.2 all test metadata storage round-trip but for different evidence types. These can be combined into a single comprehensive property.
- Properties 5.1 and 9.1 both test badge display. These are distinct (accuracy badge vs evidence badge) so should remain separate.
- Properties 7.1 and 7.2 both test related reports but for different criteria (same content vs same user). These should remain separate as they test different query logic.
- Properties 3.1 and 3.2 test validation and error display. These are complementary and should remain separate.

**Consolidated Properties:**

**Property 1: Evidence Metadata Round-Trip**
*For any* report with evidence fields (copyright link, proof of ownership, or audio timestamp), submitting the report and then retrieving it should preserve all provided evidence in the metadata field.
**Validates: Requirements 1.2, 2.2, 4.2**

**Property 2: Copyright Evidence Fields Display**
*For any* report form where copyright violation is selected as the reason, the form should display optional fields for original work link and proof of ownership.
**Validates: Requirements 1.1**

**Property 3: Audio Timestamp Field Display**
*For any* audio content report where hate speech or harassment is selected as the reason, the form should display an optional timestamp field.
**Validates: Requirements 2.1**

**Property 4: Description Minimum Length Validation**
*For any* report submission with a description shorter than 20 characters, the system should reject the submission.
**Validates: Requirements 3.1**

**Property 5: Description Validation Error Message**
*For any* report submission rejected due to insufficient description length, the system should display a clear error message indicating the 20-character minimum.
**Validates: Requirements 3.2**

**Property 6: Moderator Evidence Field Parity**
*For any* violation reason, the moderator flag modal should provide the same evidence fields as the user report modal.
**Validates: Requirements 4.1**

**Property 7: Reporter Accuracy Display in Cards**
*For any* report card where reporter accuracy metadata exists, the card should display an accuracy badge with color coding (green ≥80%, yellow ≥50%, red <50%).
**Validates: Requirements 5.1**

**Property 8: Reporter Accuracy Calculation**
*For any* reporter, the accuracy rate should equal the percentage of their reports that were resolved with moderation actions taken.
**Validates: Requirements 5.2**

**Property 9: User Violation History Display**
*For any* report in the action panel, the user violation history section should display total reports count and past actions count for the reported user.
**Validates: Requirements 6.1**

**Property 10: Conditional Reporter Accuracy in History**
*For any* user-submitted report (not moderator flag), the user violation history section should display the reporter's accuracy if available.
**Validates: Requirements 6.2**

**Property 11: Related Reports Same Content**
*For any* report viewed in the action panel, the system should display up to 5 other reports targeting the same content, ordered by most recent first.
**Validates: Requirements 7.1**

**Property 12: Related Reports Same User**
*For any* report viewed in the action panel, the system should display up to 5 other reports against the same user, ordered by most recent first.
**Validates: Requirements 7.2**

**Property 13: Evidence Display in Action Panel**
*For any* report with evidence metadata, the action panel should display a prominent blue-bordered evidence section showing all provided evidence fields.
**Validates: Requirements 8.1**

**Property 14: Evidence Indicator Badge**
*For any* report card, an evidence indicator badge should appear if and only if the report contains at least one evidence field in its metadata.
**Validates: Requirements 9.1**

**Property 15: URL Format Validation**
*For any* report submission with an original work link, the system should validate that it is a properly formatted URL and reject invalid formats with a clear error message.
**Validates: Requirements 10.1**

**Property 16: Report Quality Metrics**
*For any* time period, the metrics dashboard should accurately calculate and display the percentage of reports with evidence, average description length, and percentage meeting minimum character requirements.
**Validates: Requirements 11.1**


## 11. Error Handling

### 11.1 Client-Side Error Handling

**Validation Errors:**
- Description too short: "Description must be at least 20 characters"
- Invalid URL format: "Please enter a valid URL (e.g., https://example.com)"
- Invalid timestamp format: "Please use format MM:SS or HH:MM:SS (e.g., 2:35)"

**Network Errors:**
- Failed to submit report: "Failed to submit report. Please check your connection and try again."
- Failed to load evidence: "Failed to load evidence. Please refresh the page."

### 11.2 Server-Side Error Handling

**Validation Errors:**
- Throw `ModerationError` with `VALIDATION_ERROR` code
- Include specific error message for user feedback

**Database Errors:**
- Log error details for debugging
- Return generic error message to user
- Ensure no sensitive information is exposed

## 12. Testing Strategy

### 12.1 Unit Tests

**Evidence Field Components:**
- Test conditional rendering based on reason
- Test state management for evidence fields
- Test validation logic for each field type

**Metadata Handling:**
- Test metadata structure creation
- Test metadata serialization/deserialization
- Test metadata validation

**Reporter Accuracy Calculation:**
- Test accuracy calculation with various scenarios
- Test edge cases (0 reports, all accurate, all inaccurate)
- Test null handling

### 12.2 Integration Tests

**Report Submission Flow:**
- Test report submission with evidence
- Test report submission without evidence
- Test validation error handling
- Test metadata storage and retrieval

**Evidence Display:**
- Test evidence display in action panel
- Test evidence badges in report cards
- Test related reports fetching

**Reporter Accuracy:**
- Test accuracy calculation integration
- Test accuracy display in various contexts
- Test accuracy badge color coding

### 12.3 Property-Based Tests

**Configuration:**
- Minimum 100 iterations per property test
- Use fast-check or similar PBT library for TypeScript
- Tag each test with feature name and property number

**Test Implementation:**
- Each correctness property should have one property-based test
- Generate random valid inputs for comprehensive coverage
- Verify universal properties hold across all inputs

**Example Test Structure:**
```typescript
// Feature: enhanced-report-evidence, Property 1: Evidence Metadata Round-Trip
test('evidence metadata round-trip', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        originalWorkLink: fc.option(fc.webUrl()),
        proofOfOwnership: fc.option(fc.string()),
        audioTimestamp: fc.option(fc.string({ pattern: /\d{1,2}:\d{2}(:\d{2})?/ })),
      }),
      async (evidence) => {
        // Submit report with evidence
        const reportId = await submitReport({
          reportType: 'track',
          targetId: 'test-track-id',
          reason: 'copyright',
          description: 'Test description with sufficient length',
          metadata: evidence,
        });
        
        // Retrieve report
        const report = await fetchReport(reportId);
        
        // Verify evidence is preserved
        expect(report.metadata).toEqual(evidence);
      }
    ),
    { numRuns: 100 }
  );
});
```

### 12.4 E2E Tests

**User Report Flow:**
- Navigate to content
- Open report modal
- Select violation reason
- Fill in evidence fields
- Submit report
- Verify success message

**Moderator Review Flow:**
- Navigate to moderation queue
- Select report with evidence
- Verify evidence display in action panel
- Verify related reports display
- Take moderation action

**Reporter Accuracy Flow:**
- Submit multiple reports as same user
- Have moderator resolve some reports
- Verify accuracy calculation
- Verify accuracy display in report cards


## 13. Rollout Plan

### Phase 1: Evidence Collection (Week 1)
**Goal:** Enable evidence collection in report and flag modals

**Tasks:**
- Update ReportModal component with evidence fields
- Update ModeratorFlagModal component with evidence fields
- Add ReportMetadata type definition
- Update submitReport service function
- Update moderatorFlagContent service function
- Add client-side validation for evidence fields
- Add server-side validation for evidence fields
- Write unit tests for evidence field components
- Write integration tests for report submission with evidence

**Success Criteria:**
- Users can provide copyright evidence when reporting
- Users can provide audio timestamps when reporting
- Moderators can provide same evidence when flagging
- Evidence is stored in metadata column
- Validation works correctly

### Phase 2: Evidence Display (Week 2)
**Goal:** Display evidence in moderation interface

**Tasks:**
- Add evidence display section to ModerationActionPanel
- Add evidence indicator badge to ReportCard
- Update Report interface to include metadata
- Add related reports fetching logic
- Add related reports display to User Violation History
- Write unit tests for evidence display components
- Write integration tests for evidence retrieval
- Write E2E tests for evidence display flow

**Success Criteria:**
- Evidence displays prominently in action panel
- Evidence badges appear in report cards
- Related reports display correctly
- No performance degradation

### Phase 3: Reporter Accuracy (Week 3)
**Goal:** Calculate and display reporter accuracy

**Tasks:**
- Implement calculateReporterAccuracy function
- Add reporter accuracy display to report cards
- Add reporter accuracy display to User Violation History
- Add reporter accuracy badge color coding
- Write unit tests for accuracy calculation
- Write integration tests for accuracy display
- Write property-based tests for accuracy calculation
- Write E2E tests for accuracy flow

**Success Criteria:**
- Accuracy calculated correctly
- Accuracy displays in report cards
- Accuracy displays in violation history
- Color coding works correctly

### Phase 4: Polish & Metrics (Week 4)
**Goal:** Add examples, metrics, and final polish

**Tasks:**
- Add examples section to ReportModal
- Add report quality metrics to ModerationMetrics
- Implement URL format validation
- Implement timestamp format validation
- Add copy-to-clipboard for timestamps
- Write comprehensive property-based tests
- Write E2E tests for complete flows
- Update documentation
- Performance testing and optimization

**Success Criteria:**
- Examples help users write better reports
- Metrics provide insights into report quality
- All validation works correctly
- All tests pass
- Documentation is complete

## 14. Success Metrics

### 14.1 Report Quality Metrics

**Primary Metrics:**
- Percentage of reports with evidence: Target ≥40%
- Average description length: Target ≥100 characters
- Percentage meeting minimum (20 chars): Target ≥95%

**Secondary Metrics:**
- Copyright reports with evidence: Target ≥60%
- Audio violation reports with timestamps: Target ≥50%
- Moderator flag evidence rate: Target ≥80%

### 14.2 Moderation Efficiency Metrics

**Primary Metrics:**
- Average time to resolve reports: Target 20% decrease
- False positive rate: Target 30% decrease
- Reports requiring clarification: Target 40% decrease

**Secondary Metrics:**
- Moderator confidence ratings: Target ≥4.0/5.0
- Report dismissal rate: Target 15% decrease
- Action reversal rate: Target 25% decrease

### 14.3 User Education Metrics

**Primary Metrics:**
- Repeat offender rate: Target 20% decrease
- Report quality improvement over time: Target 15% increase per quarter
- User satisfaction with reporting process: Target ≥4.0/5.0

**Secondary Metrics:**
- Examples section usage rate: Track engagement
- Evidence provision rate by user tenure: Track learning curve
- Report accuracy by user: Track improvement

## 15. Monitoring and Observability

### 15.1 Logging

**Evidence Collection:**
- Log evidence field usage rates
- Log validation failures
- Log submission errors

**Evidence Display:**
- Log evidence display errors
- Log related reports query performance
- Log accuracy calculation errors

### 15.2 Metrics

**Performance Metrics:**
- Report submission latency
- Evidence display load time
- Related reports query time
- Accuracy calculation time

**Business Metrics:**
- Evidence provision rate by violation type
- Reporter accuracy distribution
- Report quality trends over time

### 15.3 Alerts

**Critical Alerts:**
- Report submission failure rate >5%
- Evidence display error rate >2%
- Accuracy calculation failure rate >1%

**Warning Alerts:**
- Report submission latency >2s
- Evidence display load time >1s
- Related reports query time >500ms

## 16. Security Considerations

### 16.1 Input Validation

**Evidence Fields:**
- Sanitize all text inputs to prevent XSS
- Validate URL format to prevent malicious links
- Limit field lengths to prevent DoS
- Escape special characters in display

### 16.2 Data Privacy

**Reporter Accuracy:**
- Only display to moderators and admins
- Do not expose individual report details
- Aggregate data for privacy protection

**Evidence Data:**
- Store securely in metadata column
- Encrypt sensitive information if needed
- Implement proper access controls

### 16.3 Access Control

**Evidence Display:**
- Only moderators and admins can view evidence
- Implement RLS policies for metadata access
- Audit evidence access for compliance

---

**Design Document Version:** 1.0  
**Last Updated:** January 2, 2026  
**Status:** Ready for Implementation
