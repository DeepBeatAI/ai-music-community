# Library Components

This directory contains components for the My Library feature, which provides a comprehensive personal music management interface.

## Components

### StatsSection

**Location:** `StatsSection.tsx`

**Purpose:** Displays library statistics in a responsive grid layout.

**Features:**
- Fetches and displays 6 key statistics:
  - Upload Remaining (∞ for MVP)
  - Total Tracks
  - Total Albums
  - Total Playlists
  - Plays This Week
  - Total Plays (All Time)
- Responsive layout:
  - Desktop (≥768px): 1 row × 6 columns
  - Mobile (<768px): 2 rows × 3 columns
- Loading skeleton state with 6 placeholder cards
- Error state with retry button
- Hover effects on stat cards

**Props:**
```typescript
interface StatsSectionProps {
  userId?: string; // Optional - defaults to authenticated user
}
```

**Usage:**
```tsx
import StatsSection from '@/components/library/StatsSection';

// Use with authenticated user
<StatsSection />

// Use with specific user ID
<StatsSection userId="user-id-here" />
```

**Requirements Addressed:**
- 1.1: Display six metrics in horizontal row layout
- 1.2: Display "Upload Remaining" with infinity value
- 1.3: Display "Total Tracks" count
- 1.4: Display "Total Albums" count
- 1.5: Display "Total Playlists" count
- 1.6: Display "Total Plays This Week"
- 1.7: Display "Total Plays All Time"
- 1.8: Render as 2×3 grid on mobile devices

**Sub-Components:**

#### StatCard
Displays a single statistic with icon, value, and label.

```typescript
interface StatCardProps {
  icon: string;      // Emoji icon
  value: string | number;  // Stat value
  label: string;     // Stat label
  colorClass: string; // Tailwind color class
}
```

#### StatCardSkeleton
Loading skeleton for StatCard during data fetch.

**Dependencies:**
- `@/contexts/AuthContext` - For user authentication
- `@/lib/library` - For getLibraryStats API function
- `@/types/library` - For LibraryStats type definition

**Testing:**
- Visual example: `__tests__/StatsSection.visual.example.tsx`

### TrackCard

**Location:** `TrackCard.tsx`

**Purpose:** Displays a track card with cover art, metadata, membership badges, and actions menu.

**Features:**
- Cover art display with fallback icon
- Track title and metadata
- Album and playlist membership badges
- Actions menu with hover (desktop) and long-press (mobile) triggers
- Play count and relative upload date
- Responsive design

**Props:**
```typescript
interface TrackCardProps {
  track: TrackWithMembership;
  onAddToAlbum: (trackId: string) => void;
  onAddToPlaylist: (trackId: string) => void;
  onCopyUrl: (trackId: string) => void;
  onShare: (trackId: string) => void;
  onDelete: (trackId: string) => void;
}
```

**Requirements Addressed:** 3.4, 3.5, 3.6, 3.7, 3.8, 3.12

### TrackCardWithActions

**Location:** `TrackCardWithActions.tsx`

**Purpose:** Wrapper component that combines TrackCard with all action modals and handlers.

**Features:**
- Integrates all action modals (album, playlist, share, delete)
- Implements action handlers with optimistic UI updates
- Handles errors with rollback
- Shows toast notifications for user feedback

**Props:**
```typescript
interface TrackCardWithActionsProps {
  track: TrackWithMembership;
  userId: string;
  onTrackUpdate: (trackId: string, updates: Partial<TrackWithMembership>) => void;
  onTrackDelete: (trackId: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}
```

**Requirements Addressed:** 3.9, 3.10, 3.11, 9.2, 9.5, 9.6

### AddToAlbumModal

**Location:** `AddToAlbumModal.tsx`

**Purpose:** Modal for adding a track to an album (single select).

**Features:**
- Single select dropdown for album selection
- "None" option to remove from current album
- Loading and error states
- Keyboard navigation (Escape to close)
- Click outside to close

**Requirements Addressed:** 3.9, 4.8, 4.9

### AddToPlaylistModal

**Location:** `AddToPlaylistModal.tsx`

**Purpose:** Modal for adding a track to multiple playlists (multi-select).

**Features:**
- Multi-select checkboxes for playlist selection
- Shows current playlist membership
- Loading and error states
- Keyboard navigation (Escape to close)
- Click outside to close

**Requirements Addressed:** 3.10, 4.8, 4.9

### ShareModal

**Location:** `ShareModal.tsx`

**Purpose:** Modal for sharing a track with various options.

**Features:**
- Copy track URL to clipboard
- Social media sharing buttons (future)
- Keyboard navigation (Escape to close)
- Click outside to close

**Requirements Addressed:** 3.11, 9.6

### DeleteConfirmationModal

**Location:** `DeleteConfirmationModal.tsx`

**Purpose:** Modal for confirming track deletion.

**Features:**
- Clear warning message
- Explains consequences (removal from albums/playlists)
- Confirmation and cancel buttons
- Loading state during deletion
- Keyboard navigation (Escape to close)

**Requirements Addressed:** 3.11, 9.2, 9.5

## Future Components

The following components will be added as the My Library feature is developed:

- `TrackUploadSection` - Track upload with post-upload assignment
- `AllTracksSection` - Grid display of user tracks
- `MyAlbumsSection` - Album management interface
- `AlbumCard` - Individual album display card
- `CreateAlbumModal` - Album creation modal

## Related Files

- **API Functions:** `client/src/lib/library.ts`
- **Type Definitions:** `client/src/types/library.ts`
- **Design Document:** `.kiro/specs/my-library/design.md`
- **Requirements:** `.kiro/specs/my-library/requirements.md`
- **Tasks:** `.kiro/specs/my-library/tasks.md`
