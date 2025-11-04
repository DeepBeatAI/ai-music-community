# Design Document

## Overview

This design document outlines the technical approach for implementing dashboard enhancements that improve the audio post creation workflow and add granular sharing capabilities. The design focuses on reusing existing components from the library page, maintaining consistency, and providing a seamless user experience.

## Architecture

### Component Hierarchy

```
Dashboard Page
├── Post Creation Form (Expandable)
│   ├── Tab Headers (Text | Audio)
│   ├── Text Post Tab
│   │   └── Textarea
│   └── Audio Post Tab
│       ├── TrackPicker (NEW)
│       │   ├── TrackGrid
│       │   │   └── TrackPickerCard (NEW)
│       │   ├── EmptyState (NEW)
│       │   └── LoadingState
│       └── Caption Textarea
│
└── Posts List
    └── EditablePost
        └── PostItem
            ├── Post Header
            ├── Post Content
            ├── About This Track Section (Audio Posts)
            │   ├── Track Metadata
            │   ├── Add to Playlist Button (MOVED)
            │   ├── Copy Track URL Button (NEW)
            │   └── Share Track Button (NEW)
            └── Post Footer
                ├── Like Button
                ├── Comment Button
                └── Share Post Button (RENAMED)
```

### Data Flow

```
User Action → Component → API Call → State Update → UI Update

Track Selection Flow:
1. User opens Audio Post tab
2. TrackPicker fetches user's tracks from Supabase
3. User selects a track
4. Selected track data populates form state
5. User adds caption (optional)
6. User submits → Creates post with track_id reference

Share Flow:
1. User clicks "Copy track URL" or "Share track"
2. Component generates track URL
3. Copy to clipboard or open ShareModal
4. Show success/error toast
```

## Components and Interfaces

### 1. TrackPicker Component (NEW)

**Purpose:** Display user's uploaded tracks in a grid for selection

**Props:**
```typescript
interface TrackPickerProps {
  userId: string;
  onTrackSelect: (track: Track) => void;
  selectedTrackId?: string | null;
  disabled?: boolean;
}
```

**State:**
```typescript
interface TrackPickerState {
  tracks: Track[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}
```

**Features:**
- Fetches tracks from `tracks` table filtered by `user_id`
- Displays tracks in a responsive grid (2-4 columns based on screen size)
- Shows loading skeleton while fetching
- Implements pagination (20 tracks per page)
- Highlights selected track
- Shows empty state with link to Library page

**API Integration:**
```typescript
// Fetch user tracks
const { data: tracks, error } = await supabase
  .from('tracks')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(from, to);
```

### 2. TrackPickerCard Component (NEW)

**Purpose:** Display individual track in picker with selection state

**Props:**
```typescript
interface TrackPickerCardProps {
  track: Track;
  isSelected: boolean;
  onSelect: (track: Track) => void;
  disabled?: boolean;
}
```

**Features:**
- Shows track title and author
- Displays duration
- Visual indicator for selected state (border, checkmark)
- Hover effects
- Click to select
- Keyboard accessible (Enter/Space to select)

**Design:**
```
┌─────────────────────────┐
│  🎵 Track Title         │
│  by Author Name         │
│                         │
│  Duration: 3:45         │
│                         │
│  [✓ Selected]           │ (if selected)
└─────────────────────────┘
```

### 3. Updated Dashboard Audio Post Tab

**Current State:**
- AudioUpload component for file selection
- Track author input
- Track description textarea
- Post caption textarea

**New State:**
- TrackPicker component (replaces AudioUpload)
- Post caption textarea only
- Track metadata shown as read-only after selection

**Form State:**
```typescript
interface AudioPostFormState {
  selectedTrack: Track | null;
  caption: string; // Post caption (social commentary)
}
```

**Submission Logic:**
```typescript
// Create audio post with existing track
const handleAudioPostSubmit = async () => {
  if (!selectedTrack) return;
  
  // Create post with track reference
  await createAudioPost(
    user.id,
    selectedTrack.id, // Reference existing track
    caption || undefined
  );
  
  // Reset form
  setSelectedTrack(null);
  setCaption('');
  
  // Reload posts
  await loadPosts(1, false);
};
```

### 4. Updated PostItem Component

**Changes to "About this track" Section:**

**Note:** The "Add to Playlist" button will be moved from the post footer to the "About this track" section to group all track-specific actions together.

**Current:**
```tsx
<div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
  <p className="text-sm font-semibold">About this track:</p>
  <div className="space-y-1">
    <p>Author: {track.author}</p>
    <p>Description: {track.description}</p>
  </div>
</div>
```

**New:**
```tsx
<div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
  <div className="flex items-center justify-between mb-2">
    <p className="text-sm font-semibold">About this track:</p>
    <div className="flex items-center gap-2">
      <AddToPlaylist trackId={post.track_id} />
      <button onClick={handleCopyTrackUrl}>
        📋 Copy track URL
      </button>
      <button onClick={handleShareTrack}>
        🔗 Share track
      </button>
    </div>
  </div>
  <div className="space-y-1">
    <p>Author: {track.author}</p>
    <p>Description: {track.description}</p>
  </div>
</div>
```

**Button Handlers:**
```typescript
const handleCopyTrackUrl = async () => {
  try {
    const trackUrl = `${window.location.origin}/tracks/${post.track_id}`;
    await navigator.clipboard.writeText(trackUrl);
    showToast('Track URL copied to clipboard', 'success');
  } catch (error) {
    showToast('Failed to copy URL', 'error');
  }
};

const handleShareTrack = () => {
  setShowShareModal(true);
  setShareModalType('track'); // vs 'post'
};
```

### 5. Updated Share Button

**Change:**
- Rename "Share" to "Share post" in PostItem footer
- Update button text and aria-label
- Maintain existing functionality

**Before:**
```tsx
<button>
  <span>🔗</span>
  <span>Share</span>
</button>
```

**After:**
```tsx
<button>
  <span>🔗</span>
  <span>Share post</span>
</button>
```

### 6. Enhanced ShareModal Component

**Purpose:** Reuse existing ShareModal for both post and track sharing

**Props Update:**
```typescript
interface ShareModalProps {
  isOpen: boolean;
  shareType: 'post' | 'track'; // NEW
  itemId: string; // post_id or track_id
  itemTitle: string;
  onClose: () => void;
  onCopySuccess: () => void;
}
```

**URL Generation:**
```typescript
const getShareUrl = () => {
  if (shareType === 'track') {
    return `${window.location.origin}/tracks/${itemId}`;
  } else {
    return `${window.location.origin}/posts/${itemId}`;
  }
};
```

## Data Models

### Track Model (Existing)

```typescript
interface Track {
  id: string;
  user_id: string;
  title: string;
  author: string;
  description: string | null;
  file_url: string;
  duration: number;
  genre: string | null;
  is_public: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
}
```

### Post Model (Existing - No Changes)

```typescript
interface Post {
  id: string;
  user_id: string;
  content: string; // Caption for audio posts
  post_type: 'text' | 'audio';
  track_id: string | null; // Reference to track
  created_at: string;
  updated_at: string;
  // ... other fields
}
```

## Error Handling

### Track Loading Errors

```typescript
try {
  const tracks = await fetchUserTracks(userId);
  setTracks(tracks);
} catch (error) {
  console.error('Failed to load tracks:', error);
  setError('Failed to load tracks. Please try again.');
  // Show retry button
}
```

### Clipboard Errors

```typescript
try {
  await navigator.clipboard.writeText(url);
  showToast('URL copied to clipboard', 'success');
} catch (error) {
  console.error('Clipboard error:', error);
  // Fallback: Show URL in modal for manual copy
  showToast('Failed to copy. Please copy manually.', 'error');
  setShowManualCopyModal(true);
}
```

### Track Selection Errors

```typescript
if (!selectedTrack) {
  setError('Please select a track to create an audio post');
  return;
}

if (!selectedTrack.is_public) {
  setError('Selected track must be public to create a post');
  return;
}
```

## Testing Strategy

### Unit Tests

1. **TrackPicker Component**
   - Renders loading state correctly
   - Renders empty state with Library link
   - Renders tracks in grid
   - Handles track selection
   - Implements pagination correctly

2. **TrackPickerCard Component**
   - Displays track information correctly
   - Shows selected state visually
   - Handles click events
   - Keyboard accessible

3. **Button Handlers**
   - Copy track URL copies correct URL
   - Share track opens modal with correct data
   - Share post button has correct text

### Integration Tests

1. **Audio Post Creation Flow**
   - User opens audio post tab
   - Track picker loads user's tracks
   - User selects a track
   - User adds caption
   - User submits successfully
   - Post appears in feed with correct track

2. **Track Sharing Flow**
   - User views audio post
   - User clicks "Copy track URL"
   - URL is copied to clipboard
   - Success toast appears

3. **Empty State Flow**
   - User with no tracks opens audio post tab
   - Empty state appears
   - Link to Library page works

### Manual Testing Checklist

- [ ] Track picker displays correctly on desktop
- [ ] Track picker displays correctly on mobile
- [ ] Track selection works with mouse
- [ ] Track selection works with keyboard
- [ ] Empty state shows correct message and link
- [ ] Copy track URL works in all browsers
- [ ] Share track modal opens correctly
- [ ] Share post button text is correct
- [ ] All buttons are touch-friendly on mobile
- [ ] Loading states appear appropriately
- [ ] Error states display helpful messages

## Performance Considerations

### Optimization Strategies

1. **Track Loading**
   - Implement pagination (20 tracks per page)
   - Cache track data in component state
   - Use React.memo for TrackPickerCard
   - Lazy load track images if added later

2. **Component Rendering**
   - Memoize track selection handler
   - Use useCallback for event handlers
   - Avoid unnecessary re-renders with React.memo

3. **API Calls**
   - Fetch tracks only when audio tab is opened
   - Cache tracks for session duration
   - Implement debouncing for search if added

### Performance Metrics

- Track picker load time: < 500ms
- Track selection response: < 100ms
- Clipboard copy operation: < 50ms
- Modal open/close: < 200ms

## Accessibility

### Keyboard Navigation

- Tab order: Track picker → Caption textarea → Submit button
- Arrow keys: Navigate between tracks in picker
- Enter/Space: Select track
- Escape: Close modals

### Screen Reader Support

```tsx
// Track picker
<div role="listbox" aria-label="Select a track">
  {tracks.map(track => (
    <div
      role="option"
      aria-selected={isSelected}
      aria-label={`${track.title} by ${track.author}`}
    >
      {/* Track content */}
    </div>
  ))}
</div>

// Buttons
<button aria-label="Copy track URL to clipboard">
  📋 Copy track URL
</button>

<button aria-label="Share this track">
  🔗 Share track
</button>

<button aria-label="Share this post">
  🔗 Share post
</button>
```

### Focus Management

- Focus moves to track picker when audio tab opens
- Focus returns to tab button when modal closes
- Focus trapped in modals when open
- Visual focus indicators on all interactive elements

## Mobile Responsiveness

### Breakpoints

- Mobile: < 640px (1-2 column grid)
- Tablet: 640px - 1024px (2-3 column grid)
- Desktop: > 1024px (3-4 column grid)

### Touch Targets

- Minimum button size: 44x44px
- Track cards: Minimum 120px height
- Adequate spacing between interactive elements

### Mobile-Specific Considerations

- Larger touch targets for track selection
- Simplified button labels on small screens
- Bottom sheet for share modal on mobile
- Optimized image loading for slower connections

## Security Considerations

### URL Generation

- Always use `window.location.origin` for base URL
- Validate track_id and post_id before generating URLs
- Sanitize any user input in share messages

### Clipboard Access

- Request clipboard permission gracefully
- Provide fallback for browsers without clipboard API
- Handle permission denied errors

### Data Access

- Verify user owns tracks before displaying in picker
- Ensure track is public before allowing post creation
- Validate track_id exists before creating post

## Migration Strategy

### Phase 1: Add New Components (Non-Breaking)

1. Create TrackPicker component
2. Create TrackPickerCard component
3. Add new buttons to PostItem (hidden behind feature flag)
4. Test in isolation

### Phase 2: Update Dashboard (Breaking Change)

1. Replace AudioUpload with TrackPicker in audio post tab
2. Update form submission logic
3. Remove track author and description inputs
4. Test audio post creation flow

### Phase 3: Enable New Features

1. Show new buttons in PostItem
2. Rename "Share" to "Share post"
3. Update ShareModal to handle both types
4. Monitor for errors

### Rollback Plan

- Keep AudioUpload component code for quick rollback
- Feature flag for new track picker
- Database unchanged (posts still reference tracks)
- Can revert UI changes without data migration

## Dependencies

### Existing Components to Reuse

- ShareModal (from library)
- Toast notifications (from ToastContext)
- Loading skeletons (from existing patterns)
- Button styles (from existing components)

### New Dependencies

- None (using existing libraries and patterns)

### API Endpoints

- `GET /tracks?user_id={userId}` - Fetch user tracks
- `POST /posts` - Create audio post (existing)
- No new API endpoints required

## Future Enhancements

### Potential Improvements

1. **Track Search in Picker**
   - Add search bar to filter tracks by title/author
   - Implement client-side filtering for performance

2. **Track Preview in Picker**
   - Add play button to preview track before selection
   - Mini waveform visualization

3. **Recent Tracks Section**
   - Show recently used tracks at top of picker
   - Track usage analytics

4. **Bulk Actions**
   - Select multiple tracks for batch posting
   - Create carousel posts with multiple tracks

5. **Track Editing from Picker**
   - Quick edit track metadata from picker
   - Update track without leaving dashboard

## Success Metrics

### User Experience Metrics

- Time to create audio post (should decrease)
- Number of audio posts created (should increase)
- Track sharing actions (new metric)
- User satisfaction with track picker

### Technical Metrics

- Track picker load time < 500ms
- Zero clipboard errors
- No increase in error rates
- Maintained page performance scores

### Business Metrics

- Increased audio post creation rate
- More track shares (new engagement metric)
- Reduced duplicate track uploads
- Higher user retention
