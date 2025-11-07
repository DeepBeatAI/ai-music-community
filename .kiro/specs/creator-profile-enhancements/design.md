# Design Document

## Overview

This design document outlines the implementation approach for enhancing the creator profile feature and related pages. The enhancements focus on improving user experience, implementing missing functionality, and creating new pages for content viewing.

### Key Design Principles

1. **Copy, Don't Reuse**: Follow the existing pattern of copying components from library pages
2. **Consistency**: Match existing UI patterns and behaviors
3. **Ownership Checks**: Properly handle own vs. other users' content
4. **Error Handling**: Graceful degradation with appropriate error messages

## Architecture

### Component Structure

```
client/src/
├── app/
│   ├── album/
│   │   └── [album_id]/
│   │       └── page.tsx (NEW - copied from /library/albums/[album_id])
│   ├── playlist/
│   │   └── [playlist_id]/
│   │       └── page.tsx (NEW - copied from /library/playlists/[playlist_id])
│   └── notifications/
│       └── page.tsx (MODIFY - add navigation and fix follow button)
├── components/
│   └── profile/
│       ├── CreatorTrackCard.tsx (MODIFY - add to playlist, share)
│       ├── CreatorTracksSection.tsx (MODIFY - add to playlist, share)
│       ├── CreatorAlbumsSection.tsx (MODIFY - hide save on own profile, add placeholder)
│       └── CreatorPlaylistsSection.tsx (MODIFY - hide save on own profile, add placeholder)
└── utils/
    └── gradientGenerator.ts (REUSE - for colorful placeholders)
```

## Components and Interfaces

### 1. Hide Save Buttons on Own Profile

**Implementation Approach:**
- Pass `isOwnProfile` prop to section components
- Conditionally render Save buttons based on ownership
- Check: `user.id === creatorProfile.id`

**Modified Components:**
- `CreatorTracksSection.tsx`
- `CreatorAlbumsSection.tsx`
- `CreatorPlaylistsSection.tsx`
- `CreatorTrackCard.tsx`

**Props Update:**
```typescript
interface CreatorTracksSectionProps {
  userId: string;
  username?: string;
  initialLimit?: number;
  showViewAll?: boolean;
  isOwnProfile?: boolean; // NEW
}
```

### 2. Colorful Placeholders

**Implementation Approach:**
- Copy gradient generation logic from `/library` page
- Apply to album and playlist cards without cover art
- Use consistent hash-based color generation

**Source:**
- Check `client/src/components/library/AlbumCard.tsx`
- Check `client/src/components/playlists/PlaylistCard.tsx`

**Pattern:**
```typescript
const getGradientForId = (id: string): string => {
  // Hash the ID to get consistent colors
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
  ];
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
```

### 3. Album Detail Page

**File:** `client/src/app/album/[album_id]/page.tsx`

**Copy From:** `client/src/app/library/albums/[album_id]/page.tsx`

**Modifications:**
1. Fetch album by ID (check is_public = true)
2. Check if user is album owner
3. Hide edit/delete buttons if not owner
4. Disable track reordering if not owner
5. Show 404 for private albums accessed by non-owners

**Key Logic:**
```typescript
const isOwner = user?.id === album.user_id;

// Only show public albums to non-owners
if (!isOwner && !album.is_public) {
  return <NotFoundPage message="Album not found or is private" />;
}
```

### 4. Playlist Detail Page

**File:** `client/src/app/playlist/[playlist_id]/page.tsx`

**Copy From:** `client/src/app/library/playlists/[playlist_id]/page.tsx`

**Modifications:**
1. Fetch playlist by ID (check is_public = true)
2. Check if user is playlist owner
3. Hide edit/delete buttons if not owner
4. Disable track reordering if not owner
5. Show 404 for private playlists accessed by non-owners

**Key Logic:**
```typescript
const isOwner = user?.id === playlist.user_id;

// Only show public playlists to non-owners
if (!isOwner && !playlist.is_public) {
  return <NotFoundPage message="Playlist not found or is private" />;
}
```

### 5. Add to Playlist Implementation

**Source:** `client/src/components/library/TrackCard.tsx` or `AddToPlaylistModal.tsx`

**Implementation:**
1. Copy AddToPlaylistModal component usage
2. Update `handleAddToPlaylist` in CreatorTracksSection (for `/profile/[username]/`)
3. Update `handleAddToPlaylist` in CreatorTracksPage (for `/profile/[username]/tracks/`)
4. Remove "coming soon" toast from both pages
5. Show modal with user's playlists
6. Handle add action with success/error toasts

**Pattern:**
```typescript
const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

const handleAddToPlaylist = (trackId: string) => {
  if (!user) {
    showToast('Please log in to add tracks to playlists', 'info');
    return;
  }
  setSelectedTrackId(trackId);
  setShowAddToPlaylistModal(true);
};
```

**Note:** Both pages currently show "Add to playlist feature coming soon" - this needs to be replaced with the actual modal implementation.

### 6. Share Implementation

**Source:** `client/src/components/library/TrackCard.tsx`

**Implementation:**
1. Copy share logic from library track cards
2. Update `handleShare` in CreatorTracksSection (for `/profile/[username]/`)
3. Update `handleShare` in CreatorTracksPage (for `/profile/[username]/tracks/`)
4. Remove "coming soon" toast from both pages
5. Use native share API with fallback to clipboard
6. Use correct URL format: `/tracks/[track_id]`

**Pattern:**
```typescript
const handleShare = (trackId: string) => {
  const url = `${window.location.origin}/tracks/${trackId}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Check out this track',
      url: url
    }).catch(err => console.error('Error sharing:', err));
  } else {
    navigator.clipboard.writeText(url);
    showToast('Track URL copied to clipboard', 'success');
  }
};
```

**Note:** This implementation is already partially done in the bug fixes, but needs to be verified that it's working correctly on both pages.

### 7. Notifications Page - Event Card Navigation

**File:** `client/src/app/notifications/page.tsx`

**Modifications:**
1. Make event cards clickable
2. Add onClick handlers based on event type
3. Add username links with ownership check
4. Navigate to appropriate pages

**Event Type Routing:**
```typescript
const handleEventCardClick = (notification: Notification) => {
  switch (notification.type) {
    case 'follow':
      router.push(`/profile/${notification.related_username}`);
      break;
    case 'post':
    case 'audio_post':
    case 'like':
      router.push('/dashboard');
      break;
    default:
      // Do nothing
  }
};

const handleUsernameClick = (username: string, e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent card click
  if (username !== user?.username) {
    router.push(`/profile/${username}`);
  }
};
```

### 8. Notifications Page - Fix Follow Button

**Source:** `client/src/components/UserRecommendations.tsx` (Suggested for you section)

**Implementation:**
1. Find working FollowButton implementation
2. Copy to notifications page
3. Ensure it uses FollowContext
4. Handle optimistic updates
5. Show error toasts on failure

**Pattern:**
```typescript
import { FollowButton } from '@/components/FollowButton';

// In notification card
{notification.type === 'follow' && notification.related_user_id && (
  <FollowButton
    userId={notification.related_user_id}
    size="sm"
  />
)}
```

## Data Models

### Album and Playlist Queries

**Check Ownership:**
```typescript
const { data: album } = await supabase
  .from('albums')
  .select('*, user_id')
  .eq('id', albumId)
  .single();

const isOwner = user?.id === album.user_id;
const canView = isOwner || album.is_public;
```

### Notification Event Types

```typescript
type NotificationEventType = 
  | 'follow'
  | 'post'
  | 'audio_post'
  | 'like'
  | 'comment'
  | 'mention'
  | 'system';
```

## Error Handling

### Private Content Access

```typescript
if (!canView) {
  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Content Not Found
          </h1>
          <p className="text-gray-400 mb-6">
            This {contentType} is private or doesn't exist.
          </p>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
```

### Add to Playlist Errors

```typescript
try {
  await addTrackToPlaylist(playlistId, trackId);
  showToast('Track added to playlist', 'success');
} catch (error) {
  console.error('Error adding track:', error);
  showToast('Failed to add track to playlist', 'error');
}
```

## Testing Strategy

### Manual Testing Checklist

**Hide Save Buttons:**
- [ ] View own profile - no save buttons visible
- [ ] View other profile - save buttons visible

**Colorful Placeholders:**
- [ ] Albums without cover show gradient
- [ ] Playlists without cover show gradient
- [ ] Gradients are consistent for same item

**Album/Playlist Pages:**
- [ ] Can view public albums/playlists
- [ ] Cannot view private albums/playlists (non-owner)
- [ ] Owner can edit/delete/reorder
- [ ] Non-owner cannot edit/delete/reorder

**Add to Playlist:**
- [ ] Modal opens with user's playlists
- [ ] Can add track to playlist
- [ ] Success toast shows
- [ ] Track appears in playlist

**Share:**
- [ ] Native share works (mobile)
- [ ] Clipboard fallback works (desktop)
- [ ] Correct URL format used

**Notifications:**
- [ ] Follow events navigate to profile
- [ ] Post events navigate to dashboard
- [ ] Username links work
- [ ] Own username not clickable
- [ ] Follow button works

