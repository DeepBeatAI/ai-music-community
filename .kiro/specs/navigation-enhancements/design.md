# Design Document

## Overview

This design document outlines the implementation approach for navigation and UI enhancements across the AI Music Community Platform. The enhancements improve creator discoverability, navigation consistency, and content browsing capabilities through clickable creator links, browser-based navigation, load more functionality, and synchronized save button states.

## Architecture

### Component Architecture

The implementation follows the existing component-based architecture with these key patterns:

1. **Reusable Link Components**: Creator name links will be implemented as reusable components that can be used across different card types
2. **Browser History API**: Navigation will use Next.js router's `back()` method for browser-like navigation
3. **Pagination State Management**: Load More functionality will use local component state with cache integration
4. **Bulk Status Checking**: Save button synchronization will use the existing `getBulkSavedStatus` utility for efficient database queries

### Data Flow

```
User Action → Component State Update → API Call (if needed) → Cache Update → UI Update
```

## Components and Interfaces

### 1. Creator Link Component

**Purpose**: Provide consistent clickable creator names across all card components

**Location**: `client/src/components/common/CreatorLink.tsx`

**Interface**:
```typescript
interface CreatorLinkProps {
  userId: string;
  username?: string;
  displayName?: string;
  className?: string;
  showIcon?: boolean;
}
```

**Behavior**:
- Navigates to `/profile/[username]` if username is available
- Falls back to `/profile/[userid]` if username is not available
- Displays hover state (text-blue-400 hover:text-blue-300)
- Prevents event propagation when clicked (stops card click events)
- Optional icon display for visual consistency

### 2. Enhanced Saved Content Cards

**Modified Components**:
- `SavedAlbumCard` in `SavedAlbumsSection.tsx`
- `SavedPlaylistCard` in `SavedPlaylistsSection.tsx`

**Changes**:
- Add creator name display below title
- Integrate CreatorLink component
- Maintain existing card layout and functionality

**Layout Structure**:
```
[Cover Image/Gradient]
[Title] (clickable → detail page)
[Creator Name] (clickable → profile page)
[Description] (if available)
[Metadata Row: Date | Save Button]
```

### 3. Back Button Implementation

**Modified Pages**:
- `client/src/app/album/[id]/page.tsx`
- `client/src/app/playlist/[playlist_id]/page.tsx`

**Implementation**:
```typescript
const router = useRouter();

const handleBack = () => {
  router.back();
};
```

**Button Design**:
- Replace "Back to Creator" text with "Back"
- Keep existing icon (left arrow)
- Maintain existing styling and positioning
- Use router.back() instead of router.push()

### 4. Creator Name on Detail Pages

**Album Detail Page**:
- Add creator name below album title
- Use CreatorLink component
- Position in album header section
- Display format: "by [Creator Name]"

**Playlist Detail Page** (Server Component):
- Fetch creator username in server component
- Pass to client component via props
- Display creator name in playlist header
- Use CreatorLink component in client component

### 5. Load More Functionality

**Implementation Pattern** (same for all three sections):

**State Management**:
```typescript
const [displayLimit, setDisplayLimit] = useState(initialLimit);
const [isLoadingMore, setIsLoadingMore] = useState(false);

const handleLoadMore = () => {
  setIsLoadingMore(true);
  setDisplayLimit(prev => prev + 8);
  setIsLoadingMore(false);
};

const hasMore = displayLimit < totalCount;
const showLoadMore = totalCount >= 9 && hasMore;
```

**Button Design**:
```typescript
{showLoadMore && (
  <div className="flex justify-center mt-6">
    <button
      onClick={handleLoadMore}
      disabled={isLoadingMore}
      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoadingMore ? (
        <span className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Loading...
        </span>
      ) : (
        'Load More'
      )}
    </button>
  </div>
)}
```

**Modified Components**:
- `SavedTracksSection.tsx`
- `SavedAlbumsSection.tsx`
- `SavedPlaylistsSection.tsx`

**Cache Integration**:
- Fetch all items from cache/API once
- Store in component state
- Slice based on displayLimit for rendering
- No additional API calls when loading more

### 6. Save Button State Synchronization

**Problem**: Creator page components currently don't check saved status, causing buttons to always show "Save"

**Solution**: Use existing `getBulkSavedStatus` utility for efficient batch checking

**Modified Components**:
- `CreatorTracksSection.tsx` (already has pattern, verify implementation)
- `CreatorAlbumsSection.tsx` (needs implementation)
- `CreatorPlaylistsSection.tsx` (needs implementation)

**Implementation Pattern**:
```typescript
const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());

const fetchSavedStatus = async (items: Item[]) => {
  if (!user) return;
  
  const itemIds = items.map(item => item.id);
  const result = await getBulkSavedStatus(user.id, itemIds, itemType);
  
  if (result.data) {
    const savedIds = new Set<string>();
    Object.entries(result.data).forEach(([id, isSaved]) => {
      if (isSaved) savedIds.add(id);
    });
    setSavedItemIds(savedIds);
  }
};

// In render:
<SaveButton
  itemId={item.id}
  itemType={itemType}
  isSaved={savedItemIds.has(item.id)}
  onToggle={() => handleSaveToggle(item.id)}
/>
```

### 7. Like Count Display Fix

**Problem**: Track cards show like_count as 0 because the field doesn't exist or isn't populated

**Investigation Needed**:
1. Check if `like_count` column exists in tracks table
2. Check if likes are stored in a separate `likes` table
3. Determine if we need to add a computed field or join

**Potential Solutions**:

**Option A**: If likes table exists
```typescript
// In getPublicTracks query, add join:
const { data, error } = await supabase
  .from('tracks')
  .select(`
    *,
    likes:likes(count)
  `)
  .eq('user_id', userId)
  .eq('is_public', true);
```

**Option B**: If like_count column exists but isn't updated
- Add trigger to update like_count when likes are added/removed
- Or compute on query

**Option C**: If no like system exists yet
- Document that like functionality needs to be implemented
- Set like_count to 0 as placeholder

## Data Models

### SavedAlbumWithCreator (Enhanced)
```typescript
interface SavedAlbumWithCreator {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  user_id: string;
  created_at: string;
  // Add creator info:
  creator_username?: string;
  creator_display_name?: string;
}
```

### SavedPlaylistWithCreator (Enhanced)
```typescript
interface SavedPlaylistWithCreator {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
  // Add creator info:
  creator_username?: string;
  creator_display_name?: string;
}
```

## Error Handling

### Navigation Errors
- If creator profile doesn't exist, redirect to 404 or discover page
- Handle cases where username is not available (use user_id fallback)

### Load More Errors
- Display error toast if additional items fail to load
- Keep existing items displayed
- Allow retry

### Save Status Errors
- Default to "Save" button if status check fails
- Log error for debugging
- Don't block UI rendering

### Like Count Errors
- Default to 0 if like count unavailable
- Log error for investigation
- Don't break track card rendering

## Testing Strategy

### Unit Tests
- CreatorLink component navigation logic
- Load More state management
- Save status synchronization logic
- Like count display logic

### Integration Tests
- Creator link navigation flow
- Back button navigation with history
- Load More pagination
- Save/unsave with state updates

### Manual Testing Checklist
- [ ] Click creator names on saved album cards → navigates to profile
- [ ] Click creator names on saved playlist cards → navigates to profile
- [ ] Click Back button on album page → returns to previous page
- [ ] Click Back button on playlist page → returns to previous page
- [ ] Click creator name on album page → navigates to profile
- [ ] Click creator name on playlist page → navigates to profile
- [ ] Load More appears when 9+ items exist
- [ ] Load More loads 8 additional items
- [ ] Load More disappears when all items loaded
- [ ] Save buttons show correct state on creator pages
- [ ] Like counts display correctly on track cards

## Performance Considerations

### Bulk Status Checking
- Use `getBulkSavedStatus` to check all items in one query
- Reduces N+1 query problem
- Cache results in component state

### Load More Optimization
- Fetch all data once, paginate in memory
- Avoids multiple API calls
- Uses existing cache infrastructure

### Creator Link Optimization
- Prefer username over user_id for cleaner URLs
- Cache creator info with saved items
- Minimize additional queries

## Security Considerations

### Access Control
- Verify user can access creator profiles (public profiles only)
- Maintain existing RLS policies
- No new security concerns introduced

### Data Validation
- Validate user_id and username formats
- Sanitize creator names for display
- Prevent XSS through proper escaping

## Migration Strategy

### Phase 1: Creator Links (Low Risk)
1. Create CreatorLink component
2. Update SavedAlbumsSection
3. Update SavedPlaylistsSection
4. Update Album detail page
5. Update Playlist detail page

### Phase 2: Navigation (Low Risk)
1. Update Album page back button
2. Update Playlist page back button
3. Test browser history behavior

### Phase 3: Load More (Medium Risk)
1. Update SavedTracksSection
2. Update SavedAlbumsSection
3. Update SavedPlaylistsSection
4. Test with various data sizes

### Phase 4: Save Status Sync (Medium Risk)
1. Update CreatorAlbumsSection
2. Update CreatorPlaylistsSection
3. Verify CreatorTracksSection
4. Test with saved/unsaved items

### Phase 5: Like Count Fix (Depends on Investigation)
1. Investigate database schema
2. Implement appropriate solution
3. Update track card display
4. Test like count accuracy

## Rollback Plan

All changes are additive and don't modify existing database schema:
- Creator links: Remove component, revert to plain text
- Back button: Revert to "Back to Creator" with direct navigation
- Load More: Remove button, keep initial limit
- Save status: Revert to always showing "Save"
- Like count: Revert to showing 0

No data migration required, all changes are UI-only.
