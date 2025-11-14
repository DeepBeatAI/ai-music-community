# Design Document

## Overview

The Saved Content Library feature extends the existing Library page (`/library`) to display content that users have saved from other creators. This feature adds three new collapsible sections below the existing "My Content" sections, allowing users to view and manage their saved tracks, albums, and playlists.

### Key Design Principles

1. **Consistency**: Reuse existing component patterns from AllTracksSection, MyAlbumsSection, and PlaylistsList
2. **Performance**: Leverage existing cache utility to minimize database queries
3. **User Experience**: Maintain collapsible behavior with localStorage persistence
4. **Visual Distinction**: Clearly differentiate saved content from user-created content
5. **Maintainability**: Follow established code patterns and TypeScript conventions

### Feature Scope

**In Scope:**
- Display saved tracks, albums, and playlists in dedicated sections
- Remove items from saved collections
- Navigate to creator profiles
- Collapsible sections with state persistence
- Loading, error, and empty states
- Responsive grid layouts

**Out of Scope:**
- Editing saved content (read-only view)
- Bulk operations (select multiple items)
- Sorting or filtering saved content
- Saved content statistics in stats section (optional, to be confirmed)

## Architecture

### High-Level Component Structure

```
LibraryPage
├── [Existing Sections]
│   ├── StatsSection
│   ├── TrackUploadSection
│   ├── AllTracksSection
│   ├── MyAlbumsSection
│   └── PlaylistsList
├── [Visual Divider: "🔖 Saved Content"]
└── [New Saved Content Sections]
    ├── SavedTracksSection
    ├── SavedAlbumsSection
    └── SavedPlaylistsSection
```

### Data Flow Architecture

```
User Action → Component → Service Function → Supabase Query → Cache → Component State → UI Update
```

**Example Flow for Viewing Saved Tracks:**
1. User navigates to Library page
2. SavedTracksSection mounts and checks cache
3. If cache miss, calls `getSavedTracks(userId)`
4. Service function queries `saved_tracks` JOIN `tracks` JOIN `user_profiles`
5. Results cached with CACHE_KEYS.SAVED_TRACKS
6. Component renders track cards with creator attribution

**Example Flow for Removing Saved Track:**
1. User clicks "Remove" button
2. Component calls `unsaveTrack(userId, trackId)` (existing function)
3. Optimistic UI update (remove from display immediately)
4. Cache invalidated for CACHE_KEYS.SAVED_TRACKS
5. Toast notification confirms removal
6. If error, rollback UI and show error toast



## Components and Interfaces

### 1. Backend Service Functions (lib/library.ts)

#### getSavedTracks Function

```typescript
/**
 * Get saved tracks for a user with uploader information
 * 
 * Fetches tracks that the user has saved from other users.
 * Includes track details (including author field), uploader username, and saved timestamp.
 * 
 * Note: Tracks have both an 'author' field (the artist/creator of the music) and
 * a 'user_id' field (the person who uploaded it to the platform). The UI displays
 * the author field prominently, with uploader info available separately.
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for pagination (default: no limit)
 * @param offset - Optional offset for pagination (default: 0)
 * @returns Promise<SavedTrackWithUploader[]> - Array of saved tracks with uploader info
 */
export async function getSavedTracks(
  userId: string,
  limit?: number,
  offset?: number
): Promise<SavedTrackWithUploader[]>
```

**Query Pattern:**
```sql
SELECT 
  tracks.*,
  user_profiles.username as uploader_username,
  user_profiles.id as uploader_id,
  saved_tracks.created_at as saved_at
FROM saved_tracks
JOIN tracks ON saved_tracks.track_id = tracks.id
JOIN user_profiles ON tracks.user_id = user_profiles.id
WHERE saved_tracks.user_id = ?
ORDER BY saved_tracks.created_at DESC
LIMIT ? OFFSET ?
```

**Implementation Notes:**
- Follow same pattern as `getUserTracksWithMembership()`
- Use Supabase joins to fetch all data in single query
- Order by `saved_tracks.created_at DESC` (most recently saved first)
- Support optional pagination parameters
- Return empty array on error (graceful degradation)
- Track includes `author` field (artist name) and uploader info (platform user)

#### getSavedAlbums Function

```typescript
/**
 * Get saved albums for a user with creator information
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for pagination
 * @param offset - Optional offset for pagination
 * @returns Promise<SavedAlbumWithCreator[]> - Array of saved albums with creator info
 */
export async function getSavedAlbums(
  userId: string,
  limit?: number,
  offset?: number
): Promise<SavedAlbumWithCreator[]>
```

**Query Pattern:**
```sql
SELECT 
  albums.*,
  user_profiles.username as creator_username,
  user_profiles.id as creator_id,
  saved_albums.created_at as saved_at,
  (SELECT COUNT(*) FROM album_tracks WHERE album_id = albums.id) as track_count
FROM saved_albums
JOIN albums ON saved_albums.album_id = albums.id
JOIN user_profiles ON albums.user_id = user_profiles.id
WHERE saved_albums.user_id = ?
ORDER BY saved_albums.created_at DESC
LIMIT ? OFFSET ?
```

#### getSavedPlaylists Function

```typescript
/**
 * Get saved playlists for a user with creator information
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for pagination
 * @param offset - Optional offset for pagination
 * @returns Promise<SavedPlaylistWithCreator[]> - Array of saved playlists with creator info
 */
export async function getSavedPlaylists(
  userId: string,
  limit?: number,
  offset?: number
): Promise<SavedPlaylistWithCreator[]>
```

**Query Pattern:**
```sql
SELECT 
  playlists.*,
  user_profiles.username as creator_username,
  user_profiles.id as creator_id,
  saved_playlists.created_at as saved_at,
  (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = playlists.id) as track_count
FROM saved_playlists
JOIN playlists ON saved_playlists.playlist_id = playlists.id
JOIN user_profiles ON playlists.user_id = user_profiles.id
WHERE saved_playlists.user_id = ?
ORDER BY saved_playlists.created_at DESC
LIMIT ? OFFSET ?
```



### 2. Type Definitions (types/library.ts)

```typescript
// Saved track with uploader information
// Note: Track already has 'author' field for the artist name
// This adds uploader info (the platform user who uploaded it)
export interface SavedTrackWithUploader extends Track {
  uploader_username: string;
  uploader_id: string;
  saved_at: string;
  like_count?: number;
}

// Saved album with creator information
export interface SavedAlbumWithCreator extends Album {
  creator_username: string;
  creator_id: string;
  saved_at: string;
  track_count: number;
}

// Saved playlist with creator information
export interface SavedPlaylistWithCreator extends Playlist {
  creator_username: string;
  creator_id: string;
  saved_at: string;
  track_count: number;
}
```

### 3. SavedTracksSection Component

**File:** `client/src/components/library/SavedTracksSection.tsx`

**Component Structure:**
```typescript
interface SavedTracksSectionProps {
  userId?: string;
  initialLimit?: number; // Default: 8
}

export default function SavedTracksSection({ 
  userId, 
  initialLimit = 8 
}: SavedTracksSectionProps)
```

**State Management:**
```typescript
const [tracks, setTracks] = useState<SavedTrackWithUploader[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isCollapsed, setIsCollapsed] = useState(false);
const [totalTracksCount, setTotalTracksCount] = useState(0);
const [toast, setToast] = useState<ToastState | null>(null);
```

**Key Features:**
- Fetches saved tracks using `getSavedTracks()`
- Displays tracks in responsive grid (2/3/4 columns)
- Shows track author prominently: "by {track.author}" (the artist/creator of the music)
- Shows uploader info separately if needed: "uploaded by @{uploader_username}"
- "Remove" button calls `unsaveTrack()` with optimistic update
- Clicking uploader username navigates to `/profile/[username]`
- Collapsible with localStorage persistence
- Loading skeleton (8 cards)
- Error state with retry button
- Empty state: "No saved tracks yet"

**Visual Indicators:**
- Section icon: 🔖 (bookmark emoji)
- Section title: "🔖 Saved Tracks (count)"
- Track author: Displayed prominently (e.g., "by Artist Name")
- Uploader link: Clickable username with hover effect (secondary info)

**Cache Integration:**
```typescript
const cacheKey = CACHE_KEYS.SAVED_TRACKS(effectiveUserId);
const cachedData = cache.get<{ tracks: SavedTrackWithUploader[]; totalCount: number }>(cacheKey);
```



### 4. SavedAlbumsSection Component

**File:** `client/src/components/library/SavedAlbumsSection.tsx`

**Component Structure:**
```typescript
interface SavedAlbumsSectionProps {
  userId?: string;
  initialLimit?: number; // Default: 8
}

export default function SavedAlbumsSection({ 
  userId, 
  initialLimit = 8 
}: SavedAlbumsSectionProps)
```

**Key Features:**
- Fetches saved albums using `getSavedAlbums()`
- Displays albums in responsive grid (1/2/3/4 columns)
- Shows creator attribution and track count
- "Remove" button calls `unsaveAlbum()` with optimistic update
- Clicking creator username navigates to creator profile
- Collapsible with localStorage persistence
- Loading skeleton (6 cards)
- Error state with retry button
- Empty state: "No saved albums yet"

**Visual Indicators:**
- Section icon: 🔖
- Section title: "🔖 Saved Albums (count)"
- Album card shows: cover image, title, creator, track count, remove button

**Differences from MyAlbumsSection:**
- No "+ New Album" button (read-only)
- No edit functionality
- Shows creator username instead of ownership indicator
- Uses `unsaveAlbum()` instead of delete

### 5. SavedPlaylistsSection Component

**File:** `client/src/components/library/SavedPlaylistsSection.tsx`

**Component Structure:**
```typescript
interface SavedPlaylistsSectionProps {
  userId?: string;
  initialLimit?: number; // Default: 8
}

export default function SavedPlaylistsSection({ 
  userId, 
  initialLimit = 8 
}: SavedPlaylistsSectionProps)
```

**Key Features:**
- Fetches saved playlists using `getSavedPlaylists()`
- Displays playlists in responsive grid
- Shows creator attribution, track count, and privacy status
- "Remove" button calls `unsavePlaylist()` with optimistic update
- Clicking creator username navigates to creator profile
- Collapsible with localStorage persistence
- Loading skeleton
- Error state with retry button
- Empty state: "No saved playlists yet"

**Visual Indicators:**
- Section icon: 🔖
- Section title: "🔖 Saved Playlists (count)"
- Playlist card shows: title, creator, track count, privacy badge, remove button



### 6. Library Page Integration

**File:** `client/src/app/library/page.tsx`

**Integration Points:**

1. **Visual Divider**
```tsx
{/* Saved Content Divider */}
<div className="mb-8 mt-12">
  <div className="flex items-center gap-4">
    <div className="flex-1 h-px bg-gray-700"></div>
    <h2 className="text-xl font-semibold text-gray-400 flex items-center gap-2">
      <span>🔖</span>
      <span>Saved Content</span>
    </h2>
    <div className="flex-1 h-px bg-gray-700"></div>
  </div>
</div>
```

2. **Saved Sections with Error Boundaries**
```tsx
{/* Saved Tracks Section */}
<div className="mb-8">
  <SavedTracksSectionErrorBoundary>
    <SavedTracksSection 
      userId={user.id}
      initialLimit={8}
      key={`saved-tracks-${refreshKey}`}
    />
  </SavedTracksSectionErrorBoundary>
</div>

{/* Saved Albums Section */}
<div className="mb-8">
  <SavedAlbumsSectionErrorBoundary>
    <SavedAlbumsSection 
      userId={user.id}
      initialLimit={8}
      key={`saved-albums-${refreshKey}`}
    />
  </SavedAlbumsSectionErrorBoundary>
</div>

{/* Saved Playlists Section */}
<div className="mb-8">
  <SavedPlaylistsSectionErrorBoundary>
    <SavedPlaylistsSection 
      userId={user.id}
      initialLimit={8}
      key={`saved-playlists-${refreshKey}`}
    />
  </SavedPlaylistsSectionErrorBoundary>
</div>
```

3. **Cache Invalidation in handleUploadSuccess**
```typescript
const handleUploadSuccess = useCallback(() => {
  if (!user) return;
  
  setTimeout(() => {
    // Existing cache invalidations
    cache.invalidate(CACHE_KEYS.TRACKS(user.id));
    cache.invalidate(CACHE_KEYS.STATS(user.id));
    cache.invalidate(CACHE_KEYS.ALBUMS(user.id));
    cache.invalidate(CACHE_KEYS.PLAYLISTS(user.id));
    
    // Note: Saved content caches don't need invalidation on upload
    // They only change when user saves/unsaves content
    
    setRefreshKey(prev => prev + 1);
  }, 100);
}, [user]);
```



## Data Models

### Database Schema (Existing)

The following tables already exist in the database:

**saved_tracks**
```sql
CREATE TABLE saved_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_saved_tracks_user_id ON saved_tracks(user_id);
CREATE INDEX idx_saved_tracks_created_at ON saved_tracks(created_at DESC);
```

**saved_albums**
```sql
CREATE TABLE saved_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

CREATE INDEX idx_saved_albums_user_id ON saved_albums(user_id);
CREATE INDEX idx_saved_albums_created_at ON saved_albums(created_at DESC);
```

**saved_playlists**
```sql
CREATE TABLE saved_playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, playlist_id)
);

CREATE INDEX idx_saved_playlists_user_id ON saved_playlists(user_id);
CREATE INDEX idx_saved_playlists_created_at ON saved_playlists(created_at DESC);
```

### Query Performance Considerations

**Indexes:**
- `user_id` indexes enable fast filtering by user
- `created_at DESC` indexes optimize ORDER BY queries
- Unique constraints prevent duplicate saves

**Join Optimization:**
- Single query with JOINs is more efficient than multiple queries
- Supabase automatically uses indexes for JOIN operations
- Limit/offset parameters enable pagination without loading all data

**Expected Query Performance:**
- User with 100 saved tracks: < 50ms
- User with 1000 saved tracks: < 100ms
- Pagination queries: < 30ms



## Error Handling

### Error Scenarios and Handling

1. **Network Errors**
   - Display error state with retry button
   - Show user-friendly message: "Failed to load saved tracks"
   - Log detailed error to console for debugging
   - Preserve component state (don't unmount)

2. **Authentication Errors**
   - Redirect to login page with return URL
   - Clear any cached data for security
   - Show toast: "Please log in to view saved content"

3. **Database Query Errors**
   - Return empty array (graceful degradation)
   - Log error to console
   - Display error state with retry option
   - Don't crash the entire page (use error boundaries)

4. **Unsave Operation Errors**
   - Rollback optimistic UI update
   - Show error toast: "Failed to remove item. Please try again."
   - Keep item in the list
   - Log error for debugging

5. **Cache Errors**
   - Ignore cache and fetch fresh data
   - Log warning to console
   - Continue normal operation

### Error Boundary Implementation

```typescript
// LibraryErrorBoundaries.tsx
export function SavedTracksSectionErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-gray-800 rounded-lg p-8 border border-red-500/50">
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg mb-2">Failed to load saved tracks</p>
            <p className="text-gray-400 text-sm">Please refresh the page to try again</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Similar error boundaries for SavedAlbumsSection and SavedPlaylistsSection
```

### Toast Notification Messages

**Success Messages:**
- "Track removed from saved"
- "Album removed from saved"
- "Playlist removed from saved"

**Error Messages:**
- "Failed to remove track. Please try again."
- "Failed to remove album. Please try again."
- "Failed to remove playlist. Please try again."
- "Failed to load saved content. Please try again."



## Testing Strategy

### Unit Testing

**Service Functions (lib/library.ts):**
```typescript
describe('getSavedTracks', () => {
  it('should fetch saved tracks with creator info', async () => {
    const tracks = await getSavedTracks(userId);
    expect(tracks).toBeInstanceOf(Array);
    expect(tracks[0]).toHaveProperty('creator_username');
    expect(tracks[0]).toHaveProperty('saved_at');
  });

  it('should respect limit parameter', async () => {
    const tracks = await getSavedTracks(userId, 5);
    expect(tracks.length).toBeLessThanOrEqual(5);
  });

  it('should return empty array on error', async () => {
    const tracks = await getSavedTracks('invalid-id');
    expect(tracks).toEqual([]);
  });
});
```

**Component Testing:**
```typescript
describe('SavedTracksSection', () => {
  it('should render loading state initially', () => {
    render(<SavedTracksSection userId={userId} />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(8);
  });

  it('should render tracks after loading', async () => {
    render(<SavedTracksSection userId={userId} />);
    await waitFor(() => {
      expect(screen.getByText('Track Title')).toBeInTheDocument();
    });
  });

  it('should show empty state when no saved tracks', async () => {
    render(<SavedTracksSection userId={userId} />);
    await waitFor(() => {
      expect(screen.getByText('No saved tracks yet')).toBeInTheDocument();
    });
  });

  it('should handle remove action', async () => {
    render(<SavedTracksSection userId={userId} />);
    const removeButton = await screen.findByText('Remove');
    fireEvent.click(removeButton);
    await waitFor(() => {
      expect(screen.getByText('Track removed from saved')).toBeInTheDocument();
    });
  });
});
```

### Integration Testing

**End-to-End Flow:**
1. User saves a track from creator profile
2. Navigate to Library page
3. Verify track appears in Saved Tracks section
4. Click "Remove" button
5. Verify track disappears from section
6. Verify toast notification appears
7. Refresh page and verify track is still removed

**Cache Integration:**
1. Load saved tracks (cache miss)
2. Verify data is cached
3. Reload component (cache hit)
4. Verify no additional API call
5. Invalidate cache
6. Verify fresh data is fetched

### Manual Testing Checklist

**Functional Testing:**
- [ ] Saved tracks display correctly with creator info
- [ ] Saved albums display correctly with track count
- [ ] Saved playlists display correctly with privacy status
- [ ] Remove button works for all content types
- [ ] Creator username links navigate to correct profile
- [ ] Collapsible sections work and persist state
- [ ] Empty states display when no saved content
- [ ] Loading states display during fetch
- [ ] Error states display with retry button
- [ ] Toast notifications appear for all actions

**Responsive Testing:**
- [ ] Desktop (1920x1080): 4-column grid for tracks
- [ ] Tablet (768x1024): 3-column grid for tracks
- [ ] Mobile (375x667): 2-column grid for tracks
- [ ] Horizontal scroll works on mobile for albums
- [ ] Touch targets are at least 44px for mobile
- [ ] Text is readable on all screen sizes

**Performance Testing:**
- [ ] Initial load time < 2 seconds
- [ ] Cache hit response < 100ms
- [ ] Remove action feels instant (optimistic update)
- [ ] No layout shift during loading
- [ ] Smooth collapse/expand animations

**Accessibility Testing:**
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces section titles correctly
- [ ] Focus indicators visible on all buttons
- [ ] ARIA labels present for icon-only buttons
- [ ] Color contrast meets WCAG AA standards



## Cache Strategy

### Cache Keys

```typescript
// Add to CACHE_KEYS in utils/cache.ts
export const CACHE_KEYS = {
  // Existing keys
  STATS: (userId: string) => `stats:${userId}`,
  TRACKS: (userId: string) => `tracks:${userId}`,
  ALBUMS: (userId: string) => `albums:${userId}`,
  PLAYLISTS: (userId: string) => `playlists:${userId}`,
  
  // New keys for saved content
  SAVED_TRACKS: (userId: string) => `saved-tracks:${userId}`,
  SAVED_ALBUMS: (userId: string) => `saved-albums:${userId}`,
  SAVED_PLAYLISTS: (userId: string) => `saved-playlists:${userId}`,
} as const;
```

### Cache TTL

```typescript
// Add to CACHE_TTL in utils/cache.ts
export const CACHE_TTL = {
  // Existing TTLs
  STATS: 5 * 60 * 1000, // 5 minutes
  TRACKS: 2 * 60 * 1000, // 2 minutes
  ALBUMS: 2 * 60 * 1000, // 2 minutes
  PLAYLISTS: 2 * 60 * 1000, // 2 minutes
  
  // New TTLs for saved content
  SAVED_TRACKS: 2 * 60 * 1000, // 2 minutes
  SAVED_ALBUMS: 2 * 60 * 1000, // 2 minutes
  SAVED_PLAYLISTS: 2 * 60 * 1000, // 2 minutes
} as const;
```

### Cache Invalidation Strategy

**When to Invalidate:**

1. **After Unsave Action:**
   ```typescript
   // In SavedTracksSection after successful unsave
   cache.invalidate(CACHE_KEYS.SAVED_TRACKS(userId));
   ```

2. **After Save Action (from other pages):**
   ```typescript
   // In profile page after saving a track
   cache.invalidate(CACHE_KEYS.SAVED_TRACKS(userId));
   ```

3. **On Component Unmount (optional):**
   - Don't invalidate on unmount
   - Let TTL handle expiration naturally
   - Improves performance when navigating back

**Cache Event Listeners:**
```typescript
// In SavedTracksSection
useEffect(() => {
  if (!effectiveUserId) return;

  const handleCacheInvalidated = (event: Event) => {
    const customEvent = event as CustomEvent<{ key: string }>;
    const invalidatedKey = customEvent.detail?.key;
    
    if (invalidatedKey === CACHE_KEYS.SAVED_TRACKS(effectiveUserId)) {
      console.log('Saved tracks cache invalidated, refetching...');
      fetchTracks();
    }
  };

  window.addEventListener('cache-invalidated', handleCacheInvalidated);
  return () => {
    window.removeEventListener('cache-invalidated', handleCacheInvalidated);
  };
}, [effectiveUserId, fetchTracks]);
```

### Cache Data Structure

```typescript
// Cached data format for saved tracks
interface CachedSavedTracks {
  tracks: SavedTrackWithCreator[];
  totalCount: number;
  timestamp: number;
}

// Usage in component
const cachedData = cache.get<CachedSavedTracks>(cacheKey);
if (cachedData) {
  setTracks(cachedData.tracks.slice(0, initialLimit));
  setTotalTracksCount(cachedData.totalCount);
  setLoading(false);
  return;
}
```



## UI/UX Design Specifications

### Visual Hierarchy

```
Library Page Layout:
┌─────────────────────────────────────────┐
│ My Library Header                       │
├─────────────────────────────────────────┤
│ Stats Section (always visible)          │
├─────────────────────────────────────────┤
│ ▼ Track Upload Section                  │
├─────────────────────────────────────────┤
│ ▼ 📀 All Tracks (12)                    │
│   [Track Grid]                          │
├─────────────────────────────────────────┤
│ ▼ 💿 My Albums (5)                      │
│   [Album Grid]                          │
├─────────────────────────────────────────┤
│ ▼ 📝 My Playlists (8)                   │
│   [Playlist Grid]                       │
├─────────────────────────────────────────┤
│ ─────── 🔖 Saved Content ───────        │ ← Visual Divider
├─────────────────────────────────────────┤
│ ▼ 🔖 Saved Tracks (15)                  │
│   [Track Grid with Creator Info]        │
├─────────────────────────────────────────┤
│ ▼ 🔖 Saved Albums (7)                   │
│   [Album Grid with Creator Info]        │
├─────────────────────────────────────────┤
│ ▼ 🔖 Saved Playlists (3)                │
│   [Playlist Grid with Creator Info]     │
└─────────────────────────────────────────┘
```

### Component Styling

**Section Header:**
```tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    {/* Collapse Button */}
    <button className="p-3 md:p-2 hover:bg-gray-800 rounded-lg transition-colors">
      <svg className={`w-5 h-5 text-gray-400 transition-transform ${
        isCollapsed ? 'rotate-0' : 'rotate-90'
      }`}>
        {/* Arrow icon */}
      </svg>
    </button>
    
    {/* Section Title */}
    <h2 className="text-2xl font-bold text-white">
      🔖 Saved Tracks ({totalCount})
    </h2>
  </div>
</div>
```

**Track Card with Author and Uploader:**
```tsx
<div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors">
  {/* Waveform/Cover */}
  <div className="aspect-square bg-gray-700">
    {/* Track visualization */}
  </div>
  
  {/* Content */}
  <div className="p-4">
    {/* Track Title */}
    <h3 className="text-white font-semibold mb-2 truncate">
      {track.title}
    </h3>
    
    {/* Author (Artist) - Primary Attribution */}
    <p className="text-sm text-gray-400 truncate mb-2">
      by {track.author || 'Unknown Artist'}
    </p>
    
    {/* Uploader (Platform User) - Secondary Info */}
    <Link 
      href={`/profile/${track.uploader_username}`}
      className="text-blue-400 hover:text-blue-300 text-xs mb-3 block truncate"
    >
      uploaded by @{track.uploader_username}
    </Link>
    
    {/* Metadata */}
    <div className="flex justify-between items-center text-sm text-gray-400">
      <span>{formatDate(track.saved_at)}</span>
      <span>▶ {track.play_count}</span>
    </div>
    
    {/* Actions */}
    <button 
      onClick={handleRemove}
      className="w-full mt-3 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
    >
      Remove
    </button>
  </div>
</div>
```

**Visual Divider:**
```tsx
<div className="mb-8 mt-12">
  <div className="flex items-center gap-4">
    <div className="flex-1 h-px bg-gray-700"></div>
    <h2 className="text-xl font-semibold text-gray-400 flex items-center gap-2">
      <span>🔖</span>
      <span>Saved Content</span>
    </h2>
    <div className="flex-1 h-px bg-gray-700"></div>
  </div>
</div>
```

### Responsive Grid Layouts

**Saved Tracks Grid:**
```css
/* Mobile: 2 columns */
grid-cols-2

/* Tablet: 3 columns */
md:grid-cols-3

/* Desktop: 4 columns */
lg:grid-cols-4
```

**Saved Albums Grid:**
```css
/* Mobile: 1 column */
grid-cols-1

/* Small tablet: 2 columns */
sm:grid-cols-2

/* Large tablet: 3 columns */
lg:grid-cols-3

/* Desktop: 4 columns */
xl:grid-cols-4
```

**Saved Playlists Grid:**
```css
/* Mobile: 1 column */
grid-cols-1

/* Tablet: 2 columns */
md:grid-cols-2

/* Desktop: 3 columns */
lg:grid-cols-3
```

### Animation Specifications

**Collapse/Expand Animation:**
```css
transition-all duration-300 ease-in-out
```

**Hover Effects:**
```css
/* Card hover */
hover:bg-gray-750 transition-colors duration-200

/* Button hover */
hover:bg-blue-700 transition-colors duration-150

/* Link hover */
hover:text-blue-300 transition-colors duration-150
```

**Loading Skeleton:**
```css
animate-pulse
```

**Toast Slide-In:**
```css
animate-slide-up /* Custom animation */
```

### Color Palette

**Saved Content Theme:**
- Primary indicator: 🔖 (bookmark emoji)
- Section background: `bg-gray-800`
- Card background: `bg-gray-800`
- Card hover: `bg-gray-750`
- Border: `border-gray-700`
- Creator link: `text-blue-400` / `hover:text-blue-300`
- Remove button: `bg-red-600/20` / `hover:bg-red-600/30` / `text-red-400`
- Text primary: `text-white`
- Text secondary: `text-gray-400`



## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Load saved sections only when visible (optional future enhancement)
   - Use Intersection Observer for viewport detection
   - Current implementation: Load all sections on mount (simpler, acceptable for MVP)

2. **Pagination**
   - Initial limit: 8 items per section
   - "View All" link for sections with more items
   - Future: Implement infinite scroll or "Load More" button

3. **Query Optimization**
   - Single JOIN query instead of multiple queries
   - Use database indexes for fast filtering
   - Limit results to reduce data transfer
   - Cache results to avoid redundant queries

4. **Image Optimization**
   - Use Next.js Image component for cover art
   - Lazy load images below the fold
   - Provide placeholder while loading

5. **Bundle Size**
   - Reuse existing components (no new dependencies)
   - Share code between SavedTracksSection and AllTracksSection
   - Tree-shake unused code

### Performance Metrics

**Target Metrics:**
- Initial page load: < 3 seconds
- Saved section render: < 500ms
- Cache hit response: < 100ms
- Remove action (optimistic): < 50ms
- Remove action (confirmed): < 500ms

**Monitoring:**
- Use Performance Dashboard to track metrics
- Log slow queries (> 200ms) to console
- Monitor cache hit rate
- Track user interactions with saved content

### Memory Management

**Cache Size Limits:**
- Maximum cached items per section: 100
- Automatic cleanup after TTL expiration
- Manual cleanup on logout

**Component Cleanup:**
```typescript
useEffect(() => {
  // Setup
  const listener = handleCacheInvalidated;
  window.addEventListener('cache-invalidated', listener);
  
  // Cleanup
  return () => {
    window.removeEventListener('cache-invalidated', listener);
  };
}, []);
```



## Security Considerations

### Row Level Security (RLS)

**Existing RLS Policies:**
The saved_tracks, saved_albums, and saved_playlists tables already have RLS policies in place:

```sql
-- Users can only view their own saved content
CREATE POLICY "Users can view own saved tracks"
  ON saved_tracks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only save content for themselves
CREATE POLICY "Users can save tracks"
  ON saved_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only unsave their own content
CREATE POLICY "Users can unsave tracks"
  ON saved_tracks FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies exist for saved_albums and saved_playlists
```

### Authentication Checks

**Component-Level:**
```typescript
// In SavedTracksSection
const { user } = useAuth();
const effectiveUserId = userId || user?.id;

if (!effectiveUserId) {
  setError('User not authenticated');
  setLoading(false);
  return;
}
```

**Page-Level:**
```typescript
// In LibraryPage
useEffect(() => {
  if (!loading && !user) {
    router.push('/login?redirect=/library');
  }
}, [user, loading, router]);
```

### Data Validation

**Input Validation:**
- User ID: Validate UUID format
- Track/Album/Playlist ID: Validate UUID format
- Limit/Offset: Validate positive integers

**Output Sanitization:**
- Creator usernames: Already sanitized in database
- Track titles: Already sanitized in database
- No user-generated HTML content in saved sections

### Privacy Considerations

**User Privacy:**
- Users can only see their own saved content
- Saved content is private (not visible to other users)
- No public API endpoint for viewing saved content

**Creator Privacy:**
- Public content can be saved by any user
- Private playlists can only be saved if user has access
- Creator is notified when content is saved (future feature)

### XSS Prevention

**React Built-in Protection:**
- React automatically escapes text content
- No `dangerouslySetInnerHTML` used
- All user data rendered as text, not HTML

**Link Safety:**
```typescript
// Safe navigation to creator profile
<Link href={`/profile/${encodeURIComponent(track.creator_username)}`}>
  by @{track.creator_username}
</Link>
```



## Accessibility

### WCAG 2.1 AA Compliance

**Keyboard Navigation:**
- All interactive elements accessible via Tab key
- Collapse/expand buttons: Space or Enter to activate
- Remove buttons: Space or Enter to activate
- Creator links: Enter to navigate
- Focus order follows visual order

**Screen Reader Support:**
```tsx
{/* Collapse button */}
<button
  onClick={toggleCollapse}
  aria-label={isCollapsed ? 'Expand saved tracks section' : 'Collapse saved tracks section'}
  aria-expanded={!isCollapsed}
>
  {/* Icon */}
</button>

{/* Section heading */}
<h2 id="saved-tracks-heading">
  🔖 Saved Tracks ({totalCount})
</h2>

{/* Section content */}
<div 
  role="region" 
  aria-labelledby="saved-tracks-heading"
  aria-live="polite"
>
  {/* Track cards */}
</div>

{/* Remove button */}
<button
  onClick={handleRemove}
  aria-label={`Remove ${track.title} by ${track.creator_username} from saved tracks`}
>
  Remove
</button>
```

**Color Contrast:**
- Text on background: 7:1 (AAA)
- Links: 4.5:1 minimum (AA)
- Buttons: 4.5:1 minimum (AA)
- Focus indicators: 3:1 minimum

**Focus Indicators:**
```css
/* Visible focus ring */
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
```

**Touch Targets:**
- Minimum size: 44x44px (mobile)
- Adequate spacing between targets
- Larger hit areas for small icons

### Semantic HTML

```tsx
{/* Proper heading hierarchy */}
<h1>My Library</h1>
<h2>🔖 Saved Content</h2>
<h3>Track Title</h3>

{/* Semantic lists */}
<ul role="list">
  {tracks.map(track => (
    <li key={track.id}>
      {/* Track card */}
    </li>
  ))}
</ul>

{/* Proper link usage */}
<Link href={`/profile/${username}`}>
  by @{username}
</Link>

{/* Button for actions */}
<button onClick={handleRemove}>
  Remove
</button>
```

### Loading States

```tsx
{/* Announce loading to screen readers */}
<div role="status" aria-live="polite" aria-busy="true">
  <span className="sr-only">Loading saved tracks...</span>
  {/* Skeleton UI */}
</div>

{/* Announce completion */}
<div role="status" aria-live="polite" aria-busy="false">
  <span className="sr-only">
    Loaded {tracks.length} saved tracks
  </span>
</div>
```

### Error Messages

```tsx
{/* Accessible error messages */}
<div role="alert" aria-live="assertive">
  <p>Failed to load saved tracks. Please try again.</p>
  <button onClick={retry}>Retry</button>
</div>
```



## Migration and Rollout Strategy

### Implementation Phases

**Phase 1: Backend Service Functions**
- Add `getSavedTracks()`, `getSavedAlbums()`, `getSavedPlaylists()` to `lib/library.ts`
- Add type definitions to `types/library.ts`
- Add cache keys to `utils/cache.ts`
- Test functions with console.log output
- Verify query performance

**Phase 2: SavedTracksSection Component**
- Create `SavedTracksSection.tsx` based on `AllTracksSection.tsx`
- Implement loading, error, and empty states
- Add remove functionality with optimistic updates
- Add creator attribution and profile links
- Test component in isolation
- Add error boundary

**Phase 3: SavedAlbumsSection Component**
- Create `SavedAlbumsSection.tsx` based on `MyAlbumsSection.tsx`
- Implement similar features as SavedTracksSection
- Test component in isolation
- Add error boundary

**Phase 4: SavedPlaylistsSection Component**
- Create `SavedPlaylistsSection.tsx` based on `PlaylistsList.tsx`
- Implement similar features as other saved sections
- Test component in isolation
- Add error boundary

**Phase 5: Library Page Integration**
- Add visual divider to Library page
- Integrate all three saved sections
- Add error boundaries to page
- Test full integration
- Verify cache invalidation works correctly

**Phase 6: Optional Stats Enhancement**
- Add saved content counts to StatsSection (if user confirms)
- Update `getLibraryStats()` to include saved counts
- Test stats display

### Testing Checkpoints

**After Each Phase:**
1. Run TypeScript compilation: `npm run type-check`
2. Run ESLint: `npm run lint`
3. Manual testing in browser
4. Verify no console errors
5. Test on mobile device

**Before Final Deployment:**
1. Full regression testing
2. Performance testing
3. Accessibility audit
4. Cross-browser testing
5. Mobile responsiveness check

### Rollback Plan

**If Issues Arise:**
1. Remove saved sections from Library page
2. Keep backend functions (no harm in having them)
3. Investigate and fix issues
4. Re-deploy when ready

**Minimal Risk:**
- No database changes required
- No breaking changes to existing features
- Isolated components with error boundaries
- Easy to disable by commenting out sections



## Future Enhancements

### Potential Improvements (Out of Scope for MVP)

1. **Sorting and Filtering**
   - Sort by: Recently saved, Title, Creator, Play count
   - Filter by: Genre, Date range, Creator
   - Search within saved content

2. **Bulk Operations**
   - Select multiple items
   - Bulk remove from saved
   - Export saved content list

3. **Collections/Folders**
   - Organize saved content into custom collections
   - "Favorites" subfolder within saved content
   - Share collections with other users

4. **Smart Playlists**
   - Auto-generate playlists from saved tracks
   - "Recently Saved" playlist
   - "Most Played Saved Tracks" playlist

5. **Notifications**
   - Notify when saved content is updated
   - Notify when creator releases new content
   - Weekly digest of saved content activity

6. **Analytics**
   - Track which saved content is played most
   - Show trends in saved content
   - Recommend similar content based on saves

7. **Social Features**
   - See what friends have saved (with privacy controls)
   - Share saved collections
   - Collaborative saved playlists

8. **Offline Support**
   - Download saved content for offline playback
   - Sync saved content across devices
   - Progressive Web App (PWA) features

9. **Advanced UI**
   - Drag-and-drop to reorder saved items
   - Grid/List view toggle
   - Compact/Expanded view modes
   - Infinite scroll instead of pagination

10. **Integration with Stats**
    - Add saved content counts to StatsSection
    - Show "Saved by X users" on content cards
    - Track save/unsave trends over time

### Technical Debt Considerations

**Current Approach:**
- Reusing existing patterns (good for consistency)
- Some code duplication between sections (acceptable for MVP)
- Manual cache management (works but could be automated)

**Future Refactoring:**
- Create generic `SavedContentSection` component
- Implement automatic cache invalidation hooks
- Add React Query or SWR for data fetching
- Consolidate error boundaries into single reusable component

### Performance Optimization Opportunities

**Current Implementation:**
- Load all sections on mount (simple, works for MVP)
- Cache for 2 minutes (reasonable default)

**Future Optimizations:**
- Lazy load sections below the fold
- Implement virtual scrolling for large lists
- Prefetch saved content on hover
- Optimize images with WebP format
- Implement service worker for offline caching



## Design Decisions and Rationale

### Key Design Decisions

1. **Reuse Existing Component Patterns**
   - **Decision:** Copy and adapt AllTracksSection, MyAlbumsSection, PlaylistsList
   - **Rationale:** Ensures consistency, reduces development time, leverages tested code
   - **Trade-off:** Some code duplication, but acceptable for MVP

2. **Single Query with JOINs**
   - **Decision:** Fetch all data (track + creator) in one query
   - **Rationale:** Better performance than multiple queries, reduces network overhead
   - **Trade-off:** Slightly more complex query, but database handles it efficiently

3. **Optimistic UI Updates**
   - **Decision:** Remove items from UI immediately, rollback on error
   - **Rationale:** Better perceived performance, feels instant to users
   - **Trade-off:** Need to handle rollback logic, but improves UX significantly

4. **Collapsible Sections with localStorage**
   - **Decision:** Persist collapse state in browser localStorage
   - **Rationale:** Maintains user preferences across sessions, follows existing pattern
   - **Trade-off:** Slight complexity, but users expect this behavior

5. **Initial Limit of 8 Items**
   - **Decision:** Show 8 items per section initially, with "View All" link
   - **Rationale:** Balances initial load time with content discovery
   - **Trade-off:** Users with many saved items need to click "View All"

6. **Visual Divider for Saved Content**
   - **Decision:** Add prominent divider with "🔖 Saved Content" label
   - **Rationale:** Clearly separates user's content from saved content
   - **Trade-off:** Adds visual weight, but improves clarity

7. **No Edit Functionality**
   - **Decision:** Saved content is read-only (can only remove)
   - **Rationale:** Users don't own saved content, can't modify it
   - **Trade-off:** Less functionality, but correct from ownership perspective

8. **Cache TTL of 2 Minutes**
   - **Decision:** Cache saved content for 2 minutes
   - **Rationale:** Balances freshness with performance, matches existing TTL
   - **Trade-off:** Slight delay in seeing updates, but acceptable

9. **Error Boundaries per Section**
   - **Decision:** Wrap each saved section in error boundary
   - **Rationale:** Prevents one section's error from crashing entire page
   - **Trade-off:** More boilerplate, but better resilience

10. **Toast Notifications for Actions**
    - **Decision:** Show toast on remove success/error
    - **Rationale:** Provides immediate feedback, follows existing pattern
    - **Trade-off:** Can be annoying if overused, but necessary for confirmation

### Alternative Approaches Considered

**Alternative 1: Separate Page for Saved Content**
- **Pros:** Cleaner separation, dedicated space
- **Cons:** Extra navigation, less discoverable
- **Decision:** Keep on Library page for better UX

**Alternative 2: Tabs Instead of Sections**
- **Pros:** Less scrolling, cleaner layout
- **Cons:** Hides content, requires extra clicks
- **Decision:** Use sections for better content visibility

**Alternative 3: Combined "All Content" Section**
- **Pros:** Simpler implementation, less code
- **Cons:** Harder to find specific content type
- **Decision:** Separate sections for better organization

**Alternative 4: Infinite Scroll**
- **Pros:** Seamless browsing, no pagination
- **Cons:** More complex, harder to navigate back
- **Decision:** Use "View All" link for MVP, consider infinite scroll later

**Alternative 5: React Query for Data Fetching**
- **Pros:** Automatic caching, refetching, error handling
- **Cons:** New dependency, learning curve
- **Decision:** Use existing cache utility for consistency



## Dependencies and Integration Points

### External Dependencies

**No New Dependencies Required:**
- All functionality uses existing libraries
- React, Next.js, TypeScript (already in project)
- Supabase client (already in project)
- Tailwind CSS (already in project)

### Internal Dependencies

**Required Files:**
- `lib/supabase.ts` - Supabase client
- `lib/saveService.ts` - Save/unsave functions (already exists)
- `contexts/AuthContext.tsx` - User authentication
- `utils/cache.ts` - Caching utility
- `types/track.ts`, `types/album.ts`, `types/playlist.ts` - Base types

**Files to Create:**
- `lib/library.ts` - Add new service functions
- `types/library.ts` - Add new type definitions
- `components/library/SavedTracksSection.tsx` - New component
- `components/library/SavedAlbumsSection.tsx` - New component
- `components/library/SavedPlaylistsSection.tsx` - New component
- `components/library/LibraryErrorBoundaries.tsx` - Add new error boundaries

**Files to Modify:**
- `app/library/page.tsx` - Add saved sections
- `utils/cache.ts` - Add new cache keys and TTLs

### Integration with Existing Features

**Save/Unsave Functionality:**
- Already implemented in `lib/saveService.ts`
- Used from profile pages and track cards
- No changes needed to existing save functionality

**Authentication:**
- Uses existing `useAuth()` hook
- Redirects to login if not authenticated
- No changes needed to auth system

**Caching:**
- Uses existing cache utility
- Follows same patterns as other sections
- Integrates with cache invalidation events

**Navigation:**
- Uses Next.js Link component
- Navigates to existing profile pages
- No new routes needed

**Toast Notifications:**
- Uses existing toast pattern from other components
- Consistent styling and behavior
- No new notification system needed

### Database Integration

**Existing Tables:**
- `saved_tracks` - Already exists with RLS policies
- `saved_albums` - Already exists with RLS policies
- `saved_playlists` - Already exists with RLS policies
- `tracks`, `albums`, `playlists` - Already exist
- `user_profiles` - Already exists

**No Database Changes Required:**
- All necessary tables and indexes exist
- RLS policies already in place
- No migrations needed

### API Integration

**Supabase Queries:**
- Uses existing Supabase client
- Follows same query patterns as other features
- No new API endpoints needed

**Error Handling:**
- Uses existing error handling patterns
- Consistent error messages
- No new error handling system needed



## Monitoring and Observability

### Logging Strategy

**Console Logging:**
```typescript
// Success logs
console.log('✅ Saved tracks loaded:', tracks.length);
console.log('✅ Track removed from saved:', trackId);

// Error logs
console.error('❌ Error fetching saved tracks:', error);
console.error('❌ Failed to remove track:', error);

// Cache logs
console.log('💾 Cache hit for saved tracks');
console.log('🔄 Cache invalidated for saved tracks');

// Performance logs
console.log('⏱️ Saved tracks query took:', duration, 'ms');
```

**Error Tracking:**
- All errors logged to console with context
- Error boundaries catch component crashes
- Toast notifications inform users of errors
- Future: Integrate with Sentry or similar service

### Performance Monitoring

**Metrics to Track:**
- Query execution time
- Cache hit rate
- Component render time
- User interaction latency
- Error rate

**Performance Dashboard Integration:**
```typescript
// Track saved content metrics
if (typeof window !== 'undefined' && window.performanceDashboard) {
  window.performanceDashboard.trackMetric('saved_tracks_load_time', duration);
  window.performanceDashboard.trackMetric('saved_tracks_cache_hit', cacheHit);
}
```

### User Analytics

**Events to Track (Future):**
- Saved content viewed
- Item removed from saved
- Creator profile clicked from saved content
- "View All" link clicked
- Section collapsed/expanded
- Error encountered

**Analytics Integration:**
```typescript
// Example analytics tracking
analytics.track('saved_content_viewed', {
  section: 'tracks',
  count: tracks.length,
  userId: user.id
});

analytics.track('saved_item_removed', {
  type: 'track',
  trackId: track.id,
  userId: user.id
});
```

### Health Checks

**Component Health:**
- Error boundaries report component crashes
- Loading states indicate fetch progress
- Empty states show when no data available
- Error states show when fetch fails

**System Health:**
- Database connection status
- Cache availability
- Authentication status
- Network connectivity



## Documentation Requirements

### Code Documentation

**Function Documentation:**
```typescript
/**
 * Get saved tracks for a user with creator information
 * 
 * Fetches tracks that the user has saved from other creators.
 * Includes track details, creator username, and saved timestamp.
 * Results are ordered by most recently saved first.
 * 
 * @param userId - The ID of the user
 * @param limit - Optional limit for pagination (default: no limit)
 * @param offset - Optional offset for pagination (default: 0)
 * @returns Promise<SavedTrackWithCreator[]> - Array of saved tracks with creator info
 * 
 * @example
 * ```typescript
 * const tracks = await getSavedTracks(user.id, 10);
 * console.log(`Loaded ${tracks.length} saved tracks`);
 * ```
 * 
 * @remarks
 * - Uses single JOIN query for optimal performance
 * - Returns empty array on error (graceful degradation)
 * - Results are cached for 2 minutes
 */
```

**Component Documentation:**
```typescript
/**
 * SavedTracksSection Component
 * 
 * Displays saved tracks with creator attribution and management actions.
 * Follows the same pattern as AllTracksSection but for saved content.
 * 
 * Features:
 * - Fetches saved tracks with creator info
 * - Displays in responsive grid (2/3/4 columns)
 * - Shows creator username with profile link
 * - "Remove" button with optimistic updates
 * - Collapsible with localStorage persistence
 * - Loading, error, and empty states
 * 
 * @param userId - Optional user ID (defaults to authenticated user)
 * @param initialLimit - Number of tracks to display initially (default: 8)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
```

### User Documentation

**Feature Description:**
```markdown
# Saved Content

View and manage content you've saved from other creators.

## Viewing Saved Content

1. Navigate to the Library page
2. Scroll down to the "🔖 Saved Content" section
3. Browse your saved tracks, albums, and playlists

## Removing Saved Content

1. Find the item you want to remove
2. Click the "Remove" button
3. The item will be removed from your saved collection

## Visiting Creator Profiles

1. Click on the creator's username (e.g., "by @username")
2. You'll be taken to their profile page
3. Explore more content from that creator
```

### Developer Documentation

**Implementation Guide:**
```markdown
# Implementing Saved Content Display

## Overview
This feature adds three sections to the Library page for displaying saved content.

## Architecture
- Backend: Service functions in `lib/library.ts`
- Frontend: Three section components in `components/library/`
- Integration: Library page in `app/library/page.tsx`

## Key Patterns
- Reuse existing component patterns
- Use cache utility for performance
- Implement optimistic updates for actions
- Follow error boundary pattern

## Testing
- Unit tests for service functions
- Component tests for sections
- Integration tests for full flow
- Manual testing checklist provided
```

### API Documentation

**Service Function Reference:**
```markdown
# Library Service Functions

## getSavedTracks(userId, limit?, offset?)
Fetches saved tracks for a user with creator information.

**Parameters:**
- `userId` (string): User ID
- `limit` (number, optional): Maximum number of tracks to return
- `offset` (number, optional): Number of tracks to skip

**Returns:** `Promise<SavedTrackWithCreator[]>`

**Example:**
```typescript
const tracks = await getSavedTracks(user.id, 10, 0);
```

## getSavedAlbums(userId, limit?, offset?)
Fetches saved albums for a user with creator information.

[Similar documentation structure]

## getSavedPlaylists(userId, limit?, offset?)
Fetches saved playlists for a user with creator information.

[Similar documentation structure]
```



## Summary

### Design Overview

The Saved Content Library feature extends the existing Library page to display content that users have saved from other creators. The design follows these core principles:

1. **Consistency**: Reuses existing component patterns and styling
2. **Performance**: Leverages caching and optimized queries
3. **User Experience**: Clear visual distinction and intuitive interactions
4. **Maintainability**: Follows established code patterns and conventions

### Key Components

**Backend (lib/library.ts):**
- `getSavedTracks()` - Fetch saved tracks with creator info
- `getSavedAlbums()` - Fetch saved albums with creator info
- `getSavedPlaylists()` - Fetch saved playlists with creator info

**Frontend (components/library/):**
- `SavedTracksSection.tsx` - Display saved tracks
- `SavedAlbumsSection.tsx` - Display saved albums
- `SavedPlaylistsSection.tsx` - Display saved playlists

**Integration (app/library/page.tsx):**
- Visual divider: "🔖 Saved Content"
- Three saved sections with error boundaries
- Cache invalidation handling

### Technical Highlights

- **Single JOIN queries** for optimal performance
- **Optimistic UI updates** for instant feedback
- **Cache with 2-minute TTL** for performance
- **Error boundaries** for resilience
- **Responsive grids** for all screen sizes
- **Accessibility compliant** (WCAG 2.1 AA)

### Implementation Approach

1. Add backend service functions
2. Create SavedTracksSection component
3. Create SavedAlbumsSection component
4. Create SavedPlaylistsSection component
5. Integrate into Library page
6. Optional: Add stats enhancement

### Success Criteria

- Users can view their saved content in dedicated sections
- Users can remove items from saved collections
- Users can navigate to creator profiles
- Sections are collapsible with state persistence
- Loading, error, and empty states work correctly
- Performance meets targets (< 3s page load, < 500ms section render)
- Accessibility standards met (WCAG 2.1 AA)
- No breaking changes to existing features

### Risk Mitigation

- **Low risk**: No database changes required
- **Isolated**: Error boundaries prevent cascading failures
- **Reversible**: Easy to disable if issues arise
- **Tested**: Comprehensive testing strategy in place

This design provides a solid foundation for implementing the Saved Content Library feature while maintaining consistency with the existing codebase and ensuring a high-quality user experience.

