# Design Document

## Overview

This design implements two major features for the AI Music Community Platform: a comprehensive playlist management system and a unified performance monitoring dashboard. The playlist system enables users to create, organize, and share collections of audio tracks with granular privacy controls. The performance dashboard consolidates scattered monitoring components into a single, professional interface for tracking application metrics, cache efficiency, and bandwidth usage. Both features leverage the existing Next.js 14, React 19, Supabase, and TypeScript stack while maintaining consistency with established patterns.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer (Next.js 14)                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Playlist UI      │  │ Performance      │  │ Track Integration│  │
│  │ Components       │  │ Dashboard        │  │ Components       │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                      │             │
│  ┌────────▼─────────────────────▼──────────────────────▼─────────┐  │
│  │              React Context (Auth, State Management)            │  │
│  └────────┬───────────────────────────────────────────────────────┘  │
└───────────┼──────────────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────────────┐
│                        API/Library Layer                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Playlist Utils   │  │ Performance      │  │ Type Definitions │  │
│  │ (lib/playlists)  │  │ Tracking Utils   │  │ (types/*)        │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘  │
└───────────┼──────────────────────┼──────────────────────────────────┘
            │                      │
┌───────────▼──────────────────────▼──────────────────────────────────┐
│                      Supabase Layer                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL DB    │  │ RLS Policies     │  │ Auth System      │  │
│  │ - playlists      │  │ - Ownership      │  │ - User Sessions  │  │
│  │ - playlist_tracks│  │ - Visibility     │  │ - JWT Tokens     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### Playlist System Architecture

```
User Action Flow:
┌─────────────┐
│ User clicks │
│ "Create     │
│  Playlist"  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ CreatePlaylist      │
│ Component renders   │
│ modal with form     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ User fills form     │
│ and submits         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ createPlaylist()    │
│ function called     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Supabase INSERT     │
│ with RLS check      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Success: redirect   │
│ or refresh list     │
└─────────────────────┘
```


## Components and Interfaces

### Playlist System Components

#### 1. CreatePlaylist Component
**Location:** `src/components/playlists/CreatePlaylist.tsx`

**Purpose:** Form component for creating new playlists

**Props Interface:**
```typescript
interface CreatePlaylistProps {
  onSuccess?: (playlistId: string) => void;
  onCancel?: () => void;
}
```

**State Management:**
- Form data (name, description, is_public)
- Submission state (isSubmitting)
- Error state (error message)

**Key Features:**
- Form validation (required name field)
- Loading states during submission
- Error display
- Success callback or navigation

#### 2. CreatePlaylistModal Component
**Location:** `src/components/playlists/CreatePlaylistModal.tsx`

**Purpose:** Modal wrapper for CreatePlaylist component

**Props Interface:**
```typescript
interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}
```

**Key Features:**
- Backdrop click to close
- Close button
- Wraps CreatePlaylist component

#### 3. PlaylistCard Component
**Location:** `src/components/playlists/PlaylistCard.tsx`

**Purpose:** Display individual playlist in grid view

**Props Interface:**
```typescript
interface PlaylistCardProps {
  playlist: Playlist;
  onDelete?: () => void;
  isOwner: boolean;
}
```

**Key Features:**
- Cover image or gradient placeholder
- Playlist metadata display
- Edit/Delete buttons (owner only)
- Delete confirmation modal
- Privacy indicator badge

#### 4. PlaylistsList Component
**Location:** `src/components/playlists/PlaylistsList.tsx`

**Purpose:** Display user's playlists in grid layout

**State Management:**
- Playlists array
- Loading state
- Create modal visibility

**Key Features:**
- Responsive grid layout
- Empty state handling
- Create playlist button
- Auto-refresh on changes

#### 5. AddToPlaylist Component
**Location:** `src/components/playlists/AddToPlaylist.tsx`

**Purpose:** Dropdown to add tracks to playlists

**Props Interface:**
```typescript
interface AddToPlaylistProps {
  trackId: string;
  onSuccess?: () => void;
}
```

**Key Features:**
- Dropdown menu with user's playlists
- Visual indicator for tracks already in playlist
- Loading states
- Duplicate prevention

#### 6. PlaylistDetailClient Component
**Location:** `src/components/playlists/PlaylistDetailClient.tsx`

**Purpose:** Display playlist details and track list

**Props Interface:**
```typescript
interface PlaylistDetailClientProps {
  playlist: PlaylistWithTracks;
  isOwner: boolean;
}
```

**Key Features:**
- Playlist header with metadata
- Track list with position numbers
- Remove track functionality (owner only)
- Empty state handling
- Optimistic UI updates

### Performance Dashboard Components

#### 7. PerformanceDashboard Component
**Location:** `src/components/performance/PerformanceDashboard.tsx`

**Purpose:** Main dashboard container with tabs

**State Management:**
- Expanded/collapsed state
- Active tab
- Auto-refresh toggle

**Key Features:**
- Fixed position button/panel
- Four tabs: Overview, Performance, Cache, Bandwidth
- Auto-refresh every 5 seconds
- Generate report functionality
- Reset functionality

**Sub-Components:**
- OverviewTab: Session metrics and cache hit rate
- PerformanceTab: Component renders and effects
- CacheTab: Cache statistics by type
- BandwidthTab: Transfer and bandwidth metrics


## Data Models

### Database Schema

#### Playlists Table
```sql
CREATE TABLE public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX playlists_user_id_idx ON public.playlists(user_id);
CREATE INDEX playlists_created_at_idx ON public.playlists(created_at DESC);
```

#### Playlist Tracks Table
```sql
CREATE TABLE public.playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(playlist_id, track_id)
);

-- Indexes
CREATE INDEX playlist_tracks_playlist_id_idx ON public.playlist_tracks(playlist_id);
CREATE INDEX playlist_tracks_track_id_idx ON public.playlist_tracks(track_id);
CREATE INDEX playlist_tracks_position_idx ON public.playlist_tracks(playlist_id, position);
```

### TypeScript Type Definitions

#### Base Types
```typescript
// From database
export type Playlist = Database['public']['Tables']['playlists']['Row'];
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert'];
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update'];
export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row'];
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert'];
```

#### Extended Types
```typescript
export interface PlaylistWithTracks extends Playlist {
  tracks: Array<{
    id: string;
    track_id: string;
    position: number;
    added_at: string;
    track: {
      id: string;
      title: string;
      artist_name: string;
      audio_url: string;
      duration?: number;
      cover_image_url?: string;
    };
  }>;
  track_count: number;
}

export interface PlaylistFormData {
  name: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
}

export interface AddTrackToPlaylistParams {
  playlist_id: string;
  track_id: string;
  position?: number;
}

export interface CreatePlaylistResponse {
  success: boolean;
  playlist?: Playlist;
  error?: string;
}

export interface PlaylistOperationResponse {
  success: boolean;
  error?: string;
}
```

### Performance Metrics Data Models

#### LocalStorage Schema
```typescript
// Cache Statistics
interface CacheStats {
  hits: number;
  misses: number;
}

// Performance Metrics
interface PerformanceMetrics {
  renders: number;
  effects: number;
  warnings: string[];
}

// Bandwidth Statistics
interface BandwidthStats {
  total: number;
  cached: number;
  saved: number;
  resources: Array<{
    url: string;
    size: number;
    cached: boolean;
  }>;
}

// Session Storage
interface SessionData {
  sessionStart: string; // timestamp
}
```


## Error Handling

### Playlist System Error Handling

#### Database Errors
```typescript
try {
  const { data, error } = await supabase
    .from('playlists')
    .insert(playlistData);
  
  if (error) throw error;
  return { success: true, playlist: data };
} catch (error) {
  console.error('Error creating playlist:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Failed to create playlist'
  };
}
```

**Error Categories:**
1. **Validation Errors:** Empty name, invalid data types
2. **Authorization Errors:** User not authenticated, RLS policy violations
3. **Duplicate Errors:** Track already in playlist (unique constraint)
4. **Network Errors:** Connection failures, timeouts
5. **Not Found Errors:** Playlist or track doesn't exist

#### User-Facing Error Messages
- "Playlist name is required"
- "You must be logged in to create a playlist"
- "Failed to create playlist"
- "Track already in playlist"
- "Failed to add track"
- "Failed to remove track"
- "Failed to delete playlist"

### Performance Dashboard Error Handling

#### LocalStorage Errors
```typescript
try {
  const data = JSON.parse(localStorage.getItem('cacheStats') || '{}');
  return data;
} catch (error) {
  console.error('Error reading cache stats:', error);
  return { hits: 0, misses: 0 };
}
```

**Error Categories:**
1. **Parse Errors:** Invalid JSON in localStorage
2. **Storage Quota Errors:** localStorage full
3. **Access Errors:** localStorage disabled or unavailable

#### Graceful Degradation
- If localStorage unavailable, show zeros for metrics
- If metrics can't be calculated, show "N/A"
- Continue functioning even if tracking fails

## Testing Strategy

### Unit Testing

#### Playlist Utility Functions
```typescript
describe('createPlaylist', () => {
  it('should create a playlist with valid data', async () => {
    const result = await createPlaylist(userId, {
      name: 'Test Playlist',
      description: 'Test Description',
      is_public: false
    });
    
    expect(result.success).toBe(true);
    expect(result.playlist).toBeDefined();
  });
  
  it('should handle errors gracefully', async () => {
    // Mock Supabase error
    const result = await createPlaylist(userId, invalidData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

#### Component Testing
```typescript
describe('PlaylistCard', () => {
  it('should render playlist information', () => {
    render(<PlaylistCard playlist={mockPlaylist} isOwner={true} />);
    
    expect(screen.getByText(mockPlaylist.name)).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
  
  it('should not show edit buttons for non-owners', () => {
    render(<PlaylistCard playlist={mockPlaylist} isOwner={false} />);
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
```

### Integration Testing

#### Playlist Creation Flow
1. User clicks "Create Playlist"
2. Modal opens with form
3. User fills in name and description
4. User submits form
5. Playlist is created in database
6. User is redirected to playlist page
7. Playlist appears in user's playlist list

#### Track Management Flow
1. User views a track
2. User clicks "Add to Playlist"
3. Dropdown shows user's playlists
4. User selects a playlist
5. Track is added to playlist
6. Success notification appears
7. Track shows as "already added" on next attempt

### End-to-End Testing

#### Complete User Journey
```typescript
test('user can create playlist and add tracks', async () => {
  // Login
  await login(testUser);
  
  // Navigate to playlists
  await page.goto('/playlists');
  
  // Create playlist
  await page.click('button:has-text("Create Playlist")');
  await page.fill('input[name="name"]', 'My Test Playlist');
  await page.click('button:has-text("Create Playlist")');
  
  // Verify creation
  await expect(page.locator('text=My Test Playlist')).toBeVisible();
  
  // Navigate to track
  await page.goto('/tracks/test-track-id');
  
  // Add to playlist
  await page.click('button:has-text("Add to Playlist")');
  await page.click('text=My Test Playlist');
  
  // Verify addition
  await expect(page.locator('text=✓')).toBeVisible();
});
```

### Performance Testing

#### Metrics to Track
1. **Database Query Performance:** < 100ms for playlist queries
2. **Page Load Time:** < 3 seconds for playlist pages
3. **Component Render Time:** < 50ms for playlist cards
4. **Memory Usage:** No memory leaks in dashboard
5. **LocalStorage Size:** < 5MB total


## Security Considerations

### Row Level Security (RLS) Policies

#### Playlists Table Policies

**SELECT Policy - View Own Playlists:**
```sql
CREATE POLICY "Users can view their own playlists"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);
```

**SELECT Policy - View Public Playlists:**
```sql
CREATE POLICY "Users can view public playlists"
  ON public.playlists FOR SELECT
  USING (is_public = true);
```

**INSERT Policy:**
```sql
CREATE POLICY "Users can create playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**UPDATE Policy:**
```sql
CREATE POLICY "Users can update their own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**DELETE Policy:**
```sql
CREATE POLICY "Users can delete their own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);
```

#### Playlist Tracks Table Policies

**SELECT Policy:**
```sql
CREATE POLICY "Users can view tracks in their playlists"
  ON public.playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
    )
  );
```

**INSERT Policy:**
```sql
CREATE POLICY "Users can add tracks to their playlists"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );
```

**DELETE Policy:**
```sql
CREATE POLICY "Users can remove tracks from their playlists"
  ON public.playlist_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );
```

### Input Validation

#### Client-Side Validation
```typescript
// Playlist name validation
if (!formData.name.trim()) {
  setError('Playlist name is required');
  return;
}

if (formData.name.length > 255) {
  setError('Playlist name must be 255 characters or less');
  return;
}

// Description validation (optional)
if (formData.description && formData.description.length > 5000) {
  setError('Description must be 5000 characters or less');
  return;
}
```

#### Server-Side Validation
- Database constraints enforce NOT NULL on required fields
- VARCHAR(255) limit on name field
- Foreign key constraints ensure valid user_id and track_id
- Unique constraint prevents duplicate tracks in playlist

### XSS Protection
- All user input is sanitized by React's default escaping
- No dangerouslySetInnerHTML usage
- Text content rendered as text nodes, not HTML

### CSRF Protection
- Supabase handles CSRF tokens automatically
- All mutations require valid JWT token
- Token validated on every request

### Authentication Requirements
- All playlist operations require authenticated user
- JWT token validated by Supabase
- Expired tokens automatically refreshed
- Unauthenticated users redirected to login

## Performance Optimizations

### Database Optimizations

#### Indexes
```sql
-- Fast user playlist lookups
CREATE INDEX playlists_user_id_idx ON public.playlists(user_id);

-- Fast chronological sorting
CREATE INDEX playlists_created_at_idx ON public.playlists(created_at DESC);

-- Fast playlist track lookups
CREATE INDEX playlist_tracks_playlist_id_idx ON public.playlist_tracks(playlist_id);

-- Fast track-to-playlist lookups
CREATE INDEX playlist_tracks_track_id_idx ON public.playlist_tracks(track_id);

-- Fast position-based sorting
CREATE INDEX playlist_tracks_position_idx ON public.playlist_tracks(playlist_id, position);
```

#### Query Optimization
```typescript
// Efficient playlist with tracks query
const { data } = await supabase
  .from('playlists')
  .select(`
    *,
    tracks:playlist_tracks(
      id,
      track_id,
      position,
      added_at,
      track:tracks(
        id,
        title,
        artist_name,
        audio_url,
        duration,
        cover_image_url
      )
    )
  `)
  .eq('id', playlistId)
  .single();
```

### Frontend Optimizations

#### Component Memoization
```typescript
// Memoize expensive computations
const sortedTracks = useMemo(() => {
  return tracks.sort((a, b) => a.position - b.position);
}, [tracks]);

// Memoize callbacks
const handleDelete = useCallback(async (playlistId: string) => {
  await deletePlaylist(playlistId);
  onDelete?.();
}, [onDelete]);
```

#### Lazy Loading
```typescript
// Lazy load playlist detail page
const PlaylistDetailClient = dynamic(
  () => import('@/components/playlists/PlaylistDetailClient'),
  { loading: () => <LoadingSpinner /> }
);
```

#### Optimistic Updates
```typescript
// Update UI immediately, rollback on error
const handleRemoveTrack = async (trackId: string) => {
  // Optimistic update
  setPlaylist(prev => ({
    ...prev,
    tracks: prev.tracks.filter(t => t.track_id !== trackId),
    track_count: prev.track_count - 1
  }));
  
  const result = await removeTrackFromPlaylist({ playlist_id, track_id: trackId });
  
  if (!result.success) {
    // Rollback on error
    setPlaylist(originalPlaylist);
    alert(result.error);
  }
};
```

### Performance Dashboard Optimizations

#### Throttled Updates
```typescript
// Update metrics every 5 seconds, not on every render
useEffect(() => {
  updateMetrics();
  
  if (autoRefresh) {
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }
}, [autoRefresh]);
```

#### Efficient Storage
```typescript
// Only store essential metrics
const storeMetric = (key: string, value: number) => {
  const stored = JSON.parse(localStorage.getItem('performanceMetrics') || '{}');
  stored[key] = value;
  localStorage.setItem('performanceMetrics', JSON.stringify(stored));
};
```


## Implementation Phases

### Phase 1: Database Foundation (TASK-1, TASK-2, TASK-3)
**Estimated Time:** 1.5 hours

**Deliverables:**
1. Database migration with playlists and playlist_tracks tables
2. RLS policies for security
3. Database functions and triggers
4. TypeScript type definitions
5. Playlist utility functions

**Success Criteria:**
- Tables created successfully in Supabase
- RLS policies active and tested
- All TypeScript types compile without errors
- Utility functions have proper error handling

### Phase 2: Playlist UI Implementation (TASK-4, TASK-5, TASK-6)
**Estimated Time:** 1.5 hours

**Deliverables:**
1. CreatePlaylist and CreatePlaylistModal components
2. PlaylistCard and PlaylistsList components
3. AddToPlaylist component
4. PlaylistDetailClient component
5. Playlist detail page

**Success Criteria:**
- Users can create playlists
- Playlists display in grid layout
- Tracks can be added to playlists
- Tracks can be removed from playlists
- All components render without errors

### Phase 3: Integration and Performance Dashboard (TASK-7, TASK-8, TASK-9)
**Estimated Time:** 1.5 hours

**Deliverables:**
1. Navigation integration
2. Track component integration
3. Playlists main page
4. PerformanceDashboard component structure
5. All dashboard tabs implemented
6. Dashboard added to layout

**Success Criteria:**
- Playlist links in navigation
- AddToPlaylist on all track displays
- Performance dashboard accessible
- All tabs functional
- Metrics update correctly

### Phase 4: Testing and Documentation (TASK-10, TASK-11)
**Estimated Time:** 1 hour

**Deliverables:**
1. Comprehensive functional testing
2. Cross-browser testing
3. Performance validation
4. Security validation
5. Updated README
6. Updated CHANGELOG
7. Updated steering documents
8. Code quality checks

**Success Criteria:**
- All tests pass
- No TypeScript errors
- No console errors
- Documentation complete
- Ready for git commit

## Migration Strategy

### Database Migration Script
**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_playlists.sql`

```sql
-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create playlist_tracks table
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(playlist_id, track_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS playlists_user_id_idx ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS playlists_created_at_idx ON public.playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_id_idx ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS playlist_tracks_track_id_idx ON public.playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS playlist_tracks_position_idx ON public.playlist_tracks(playlist_id, position);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (see Security Considerations section for full policies)

-- Create functions
CREATE OR REPLACE FUNCTION update_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_updated_at();

CREATE OR REPLACE FUNCTION get_playlist_track_count(playlist_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.playlist_tracks
  WHERE playlist_id = playlist_uuid;
$$ LANGUAGE sql STABLE;
```

### Rollback Strategy
```sql
-- Rollback script if needed
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
DROP FUNCTION IF EXISTS update_playlist_updated_at();
DROP FUNCTION IF EXISTS get_playlist_track_count(UUID);
DROP TABLE IF EXISTS public.playlist_tracks;
DROP TABLE IF EXISTS public.playlists;
```

## Deployment Considerations

### Environment Variables
No new environment variables required. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Build Process
```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Deploy
vercel --prod
```

### Database Migration
```bash
# Apply migration to production
supabase db push

# Verify migration
supabase db diff
```

### Post-Deployment Verification
1. Verify playlists table exists
2. Verify RLS policies are active
3. Test playlist creation
4. Test track addition
5. Test public/private access
6. Verify performance dashboard loads
7. Check for console errors

## Future Enhancements

### Playlist System
1. **Collaborative Playlists:** Allow multiple users to contribute
2. **Playlist Sharing:** Generate shareable links
3. **Playlist Covers:** Upload custom cover images
4. **Track Reordering:** Drag-and-drop track positions
5. **Playlist Import/Export:** Import from other platforms
6. **Playlist Analytics:** Track plays and engagement
7. **Smart Playlists:** Auto-generate based on criteria

### Performance Dashboard
1. **Historical Data:** Store metrics over time
2. **Performance Alerts:** Notify on threshold breaches
3. **Export Reports:** Download performance reports
4. **Comparison Views:** Compare metrics across time periods
5. **Custom Metrics:** Allow developers to add custom tracking
6. **Real-time Graphs:** Visualize metrics with charts
7. **Performance Recommendations:** AI-powered optimization suggestions

---

*Design Document Version: 1.0*  
*Created: Month 3 Week 4*  
*Status: Ready for Implementation*
