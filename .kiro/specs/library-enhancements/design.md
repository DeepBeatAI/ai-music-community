# Design Document

## Overview

This design document outlines the enhancements to the Library page to improve UI consistency, data filtering, and user experience. The enhancements align the saved content UI with creator page patterns, add collapse state persistence to all sections, and simplify the My Playlists section.

### Key Design Principles

1. **UI Consistency**: Match creator page card designs for saved content
2. **State Persistence**: Remember user preferences for section collapse states
3. **Simplicity**: Remove unnecessary UI complexity (Public Playlists sub-section)
4. **Data Integrity**: Filter saved content to show only appropriate items
5. **Reusability**: Leverage existing components where possible

## Architecture

### Component Hierarchy

```
LibraryPage
├── StatsSection
├── TrackUploadSection
├── AllTracksSection (with collapse state)
├── MyAlbumsSection (with collapse state)
├── PlaylistsList (with collapse state, no sub-sections)
├── [Visual Divider: "🔖 Saved Content"]
└── [Saved Content Sections]
    ├── SavedTracksSection (updated UI)
    ├── SavedAlbumsSection (updated UI)
    └── SavedPlaylistsSection (updated UI)
```

### Data Flow

#### Saved Content Filtering
```
User Request → Service Function → Supabase Query (with filters) → Filter Results → Cache → Component State → UI
```

**Filters Applied:**
- Exclude own content: `.neq('tracks.user_id', userId)`
- Public only (playlists): `.eq('playlists.is_public', true)`

#### Collapse State Persistence
```
User Toggles Section → Update State → Save to localStorage → Update UI
Page Load → Read localStorage → Restore State → Update UI
```

## Components and Interfaces

### 1. Updated SavedTracksSection

#### SavedTrackCard Component

**UI Structure:**
```tsx
<div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors group">
  {/* Cover Art with Play Button Overlay */}
  <div className="relative aspect-square bg-gray-700 group/cover">
    <MusicIcon />
    <PlayButtonOverlay onPlay={handlePlay} />
  </div>
  
  {/* Track Info */}
  <div className="p-4">
    <h3>{track.title}</h3>
    <p>by {track.author}</p>
    
    {/* Membership Badges */}
    <div className="flex flex-wrap gap-2 mb-3">
      {albumBadge}
      {playlistBadge}
    </div>
    
    {/* Metadata and Actions */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <PlayCount />
        <LikeCount />
        <UploadDate />
      </div>
      <ActionsMenu />
    </div>
  </div>
</div>
```

**New Features:**
- Play button overlay (integrates with PlaybackContext)
- Album/playlist membership badges
- Actions menu (Remove, Add to Playlist, Copy URL, Share)
- Enhanced metadata display

**Props:**
```typescript
interface SavedTrackCardProps {
  track: SavedTrackWithUploader;
  onRemove: (trackId: string) => void;
  onPlay: (trackId: string) => void;
  onAddToPlaylist: (trackId: string) => void;
  onCopyUrl: (trackId: string) => void;
  onShare: (trackId: string) => void;
}
```

### 2. Updated SavedAlbumsSection

#### SavedAlbumCard Component

**UI Structure:**
```tsx
<div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors cursor-pointer group">
  {/* Cover Image or Gradient Placeholder */}
  <div className="h-48 relative" onClick={handleCardClick}>
    {coverImage || gradientPlaceholder}
  </div>
  
  {/* Content */}
  <div className="p-4">
    <h3 onClick={handleCardClick}>{album.name}</h3>
    {album.description && <p>{album.description}</p>}
    
    {/* Metadata */}
    <div className="flex items-center justify-between">
      <span>{creationDate}</span>
      <SaveButton onToggle={handleRemove} isSaved={true} />
    </div>
  </div>
</div>
```

**Changes:**
- Match creator page gradient colors
- Use SaveButton component for Remove action
- Clickable card navigates to album detail page

### 3. Updated SavedPlaylistsSection

#### SavedPlaylistCard Component

**UI Structure:**
```tsx
<div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors cursor-pointer group">
  {/* Cover Image or Gradient Placeholder */}
  <div className="h-48 relative" onClick={handleCardClick}>
    {coverImage || gradientPlaceholder}
  </div>
  
  {/* Content */}
  <div className="p-4">
    <h3 onClick={handleCardClick}>{playlist.name}</h3>
    {playlist.description && <p>{playlist.description}</p>}
    
    {/* Metadata */}
    <div className="flex items-center justify-between">
      <span>{creationDate}</span>
      <SaveButton onToggle={handleRemove} isSaved={true} />
    </div>
  </div>
</div>
```

**Changes:**
- Match creator page gradient colors
- Use SaveButton component for Remove action
- Clickable card navigates to playlist detail page

### 4. Collapse State Implementation

#### localStorage Keys
- `all-tracks-collapsed`: boolean
- `my-albums-collapsed`: boolean
- `my-playlists-collapsed`: boolean
- `saved-tracks-collapsed`: boolean (existing)
- `saved-albums-collapsed`: boolean (existing)
- `saved-playlists-collapsed`: boolean (existing)

#### Implementation Pattern
```typescript
// Initialize state from localStorage
const [isCollapsed, setIsCollapsed] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('section-key-collapsed');
    return saved === 'true';
  }
  return false;
});

// Save to localStorage when toggled
const toggleCollapse = () => {
  const newState = !isCollapsed;
  setIsCollapsed(newState);
  localStorage.setItem('section-key-collapsed', String(newState));
};
```

### 5. PlaylistsList Simplification

**Current Structure (to be removed):**
```tsx
<PlaylistsList>
  <MyPlaylistsSubSection />
  <PublicPlaylistsSubSection />  // REMOVE THIS
</PlaylistsList>
```

**New Structure:**
```tsx
<PlaylistsList>
  {/* All playlists in single unified list */}
  {playlists.map(playlist => <PlaylistCard />)}
</PlaylistsList>
```

**Changes:**
- Remove "Public Playlists" sub-section wrapper
- Display all user playlists in single grid
- Maintain privacy badges on individual cards
- Keep all existing functionality (CRUD operations)

## Data Models

### SavedTrackWithUploader (existing, no changes)
```typescript
interface SavedTrackWithUploader extends Track {
  uploader_username: string;
  uploader_id: string;
  saved_at: string;
  like_count: number;
}
```

### TrackWithMembership (for badges)
```typescript
interface TrackWithMembership extends Track {
  albumId: string | null;
  albumName: string | null;
  playlistIds: string[];
  playlistNames: string[];
}
```

## Error Handling

### Saved Content Filtering
- If query fails, return empty array (graceful degradation)
- Log errors to console for debugging
- Show empty state to user

### Collapse State
- If localStorage is unavailable, default to expanded state
- Handle localStorage quota exceeded gracefully
- No error messages to user (non-critical feature)

### UI Updates
- Maintain existing error boundaries
- Show loading skeletons during data fetch
- Provide retry buttons on error states

## Testing Strategy

### Unit Testing
- Test saved content filtering logic
- Test collapse state persistence
- Test card component rendering

### Integration Testing
- Test saved content sections with filtered data
- Test collapse state across page refreshes
- Test PlaylistsList without sub-sections

### Manual Testing
- Verify saved content shows only other users' public content
- Verify card UI matches creator pages
- Verify collapse state persists across sessions
- Verify PlaylistsList displays correctly without sub-sections

## Performance Considerations

### Caching
- Maintain existing cache strategy (2-minute TTL)
- Invalidate cache after remove actions
- Use existing CACHE_KEYS constants

### Rendering
- Use React.memo for card components
- Implement virtualization if lists exceed 100 items
- Lazy load images/covers

### localStorage
- Minimize writes (only on toggle)
- Use simple boolean values
- No cleanup needed (small data footprint)

## Accessibility

### Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Maintain focus indicators
- Support Tab, Enter, Space keys

### Screen Readers
- Add ARIA labels to icon-only buttons
- Announce state changes (collapsed/expanded)
- Provide meaningful alt text

### Visual
- Maintain color contrast ratios
- Ensure touch targets are 44px minimum
- Provide visual feedback for interactions

## Migration Notes

### Breaking Changes
- None (all changes are enhancements)

### Backward Compatibility
- Existing saved content data remains unchanged
- Existing collapse states (saved sections) remain functional
- No database migrations required

### Rollback Plan
- Revert component changes
- localStorage keys can remain (no cleanup needed)
- No data cleanup required
