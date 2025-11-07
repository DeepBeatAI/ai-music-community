# Design Document

## Overview

The Creator Profile Page feature introduces a comprehensive public profile system that enables users to discover and explore other creators' work. This design transforms the existing library-centric architecture into a social discovery platform while maintaining clear separation between personal account management and public creator profiles.

### Key Design Principles

1. **Component Isolation**: Copy components from /library rather than reusing them to prevent unintended side effects
2. **Public-Only Content**: Display only public tracks, albums, and playlists on creator profiles
3. **Consistent Scoring**: Use the same creator score algorithm as the discover page
4. **Progressive Enhancement**: Build on existing patterns while adding new social features
5. **URL-First Design**: Support username-based URLs with fallback to user ID

### Design Goals

- Enable seamless creator discovery and exploration
- Maintain performance with efficient data fetching and caching
- Provide intuitive navigation between account settings and public profiles
- Support future expansion of user types and social features
- Ensure consistent UI/UX across library and profile pages

## Architecture

### URL Routing Structure

```
Current State:
/profile → Account settings page

New State:
/account → Account settings page (moved from /profile)
/profile → Authenticated user's own creator profile
/profile/[username] → Public creator profile by username
/profile/[userid] → Public creator profile by user ID (fallback)
/profile/[username]/tracks → All public tracks for creator
```

### Page Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ MainLayout                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Header (with avatar dropdown)                           │ │
│ │ ├─ My Creator Profile → /profile                        │ │
│ │ └─ Manage my Account → /account                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Creator Profile Page (/profile/[username])              │ │
│ │ ├─ User Type Badge                                      │ │
│ │ ├─ Profile Header (avatar, username, bio)              │ │
│ │ ├─ Follow/Following Button                             │ │
│ │ ├─ Stats Cards Section                                 │ │
│ │ ├─ All Tracks Section (with View All button)           │ │
│ │ ├─ Albums Section                                       │ │
│ │ └─ Public Playlists Section                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Client Layer                                                 │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Creator Profile Page Component                           │ │
│ │ ├─ useCreatorProfile(username/userid)                    │ │
│ │ ├─ useCreatorStats(userid)                               │ │
│ │ ├─ useFollowStatus(userid)                               │ │
│ │ └─ useSavedContent(userid)                               │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ API/Service Layer                                            │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Profile Service                                          │ │
│ │ ├─ getCreatorByUsername(username)                        │ │
│ │ ├─ getCreatorById(userid)                                │ │
│ │ ├─ getCreatorStats(userid)                               │ │
│ │ ├─ getPublicTracks(userid, limit, offset)                │ │
│ │ ├─ getPublicAlbums(userid, limit, offset)                │ │
│ │ └─ getPublicPlaylists(userid, limit, offset)             │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Social Service                                           │ │
│ │ ├─ followUser(follower_id, following_id)                 │ │
│ │ ├─ unfollowUser(follower_id, following_id)               │ │
│ │ ├─ getFollowStatus(follower_id, following_id)            │ │
│ │ ├─ saveTrack(user_id, track_id)                          │ │
│ │ ├─ unsaveTrack(user_id, track_id)                        │ │
│ │ ├─ saveAlbum(user_id, album_id)                          │ │
│ │ ├─ unsaveAlbum(user_id, album_id)                        │ │
│ │ ├─ savePlaylist(user_id, playlist_id)                    │ │
│ │ └─ unsavePlaylist(user_id, playlist_id)                  │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ Database Layer (Supabase)                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Tables                                                   │ │
│ │ ├─ profiles (with user_type column)                      │ │
│ │ ├─ tracks (with is_public, play_count)                   │ │
│ │ ├─ albums (with is_public)                               │ │
│ │ ├─ playlists (with is_public)                            │ │
│ │ ├─ user_follows (new)                                    │ │
│ │ ├─ saved_tracks (new)                                    │ │
│ │ ├─ saved_albums (new)                                    │ │
│ │ └─ saved_playlists (new)                                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Database Functions                                       │ │
│ │ ├─ get_creator_score(user_id) → number                   │ │
│ │ ├─ get_follower_count(user_id) → number                  │ │
│ │ ├─ get_public_track_count(user_id) → number              │ │
│ │ ├─ get_public_album_count(user_id) → number              │ │
│ │ ├─ get_public_playlist_count(user_id) → number           │ │
│ │ └─ get_total_plays(user_id) → number                     │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```



## Components and Interfaces

### New Page Components

#### 1. CreatorProfilePage (`/app/profile/[username]/page.tsx`)

**Purpose**: Main creator profile page displaying public content and stats

**Props**: None (uses URL params)

**State**:
- `creatorProfile: CreatorProfile | null` - Creator's profile data
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `isFollowing: boolean` - Follow status
- `refreshKey: number` - Trigger for data refresh

**Key Features**:
- Fetches creator by username from URL params
- Falls back to user ID if username fails
- Displays user type badge
- Shows follow/following button (hidden for own profile)
- Renders stats cards, tracks, albums, and playlists sections
- Handles authentication state (some features require login)

**Component Structure**:
```tsx
<MainLayout>
  <div className="max-w-7xl mx-auto p-4">
    {/* User Type Badge */}
    <UserTypeBadge userType={profile.user_type} />
    
    {/* Profile Header */}
    <CreatorProfileHeader 
      profile={profile}
      isFollowing={isFollowing}
      onFollowToggle={handleFollowToggle}
      isOwnProfile={isOwnProfile}
    />
    
    {/* Stats Section */}
    <CreatorStatsSection userId={profile.id} />
    
    {/* All Tracks Section */}
    <CreatorTracksSection 
      userId={profile.id}
      initialLimit={8}
      showViewAll={true}
    />
    
    {/* Albums Section */}
    <CreatorAlbumsSection 
      userId={profile.id}
      initialLimit={8}
    />
    
    {/* Public Playlists Section */}
    <CreatorPlaylistsSection 
      userId={profile.id}
      initialLimit={8}
    />
  </div>
</MainLayout>
```

#### 2. CreatorTracksPage (`/app/profile/[username]/tracks/page.tsx`)

**Purpose**: Dedicated page showing all public tracks from a creator

**Props**: None (uses URL params)

**State**:
- `tracks: Track[]` - List of public tracks
- `loading: boolean` - Loading state
- `hasMore: boolean` - Pagination flag
- `page: number` - Current page number

**Key Features**:
- Copied from /library/tracks page structure
- Filters to show only public tracks
- Includes save functionality
- Supports infinite scroll or pagination
- Modified track card menu (no delete, no add to album)

#### 3. AccountPage (`/app/account/page.tsx`)

**Purpose**: Renamed from /profile, handles account settings

**Implementation**: Move existing /profile page content to /account

### New Component Library

#### 1. UserTypeBadge Component

**Purpose**: Display user account tier badge

**Props**:
```tsx
interface UserTypeBadgeProps {
  userType: string; // e.g., "Free User", "Premium", "Pro"
  userTypes?: string[]; // Future: support multiple badges
}
```

**Design**:
- Pill-shaped badge with icon
- Color-coded by tier (gray for free, blue for premium, gold for pro)
- Positioned at top of profile
- Responsive sizing
- Space for multiple badges in future

#### 2. CreatorProfileHeader Component

**Purpose**: Display creator's profile information and follow button

**Props**:
```tsx
interface CreatorProfileHeaderProps {
  profile: CreatorProfile;
  isFollowing: boolean;
  onFollowToggle: () => Promise<void>;
  isOwnProfile: boolean;
}
```

**Design**:
- Avatar (large, circular)
- Username (bold, large text)
- Bio (if available)
- Website link (if available)
- Follow/Following button (hidden if own profile)
- Responsive layout (stacked on mobile, horizontal on desktop)

#### 3. CreatorStatsSection Component

**Purpose**: Display creator statistics cards

**Props**:
```tsx
interface CreatorStatsSectionProps {
  userId: string;
}
```

**Stats Displayed**:
1. **Creator Score**: Calculated using `(total_plays × 0.6) + (total_likes × 0.4)`
2. **Followers**: Total follower count
3. **Tracks**: Count of public tracks only
4. **Albums**: Count of public albums only
5. **Playlists**: Count of public playlists only
6. **Total Plays**: Sum of play_count across all public tracks

**Design**:
- Grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
- Each stat card shows: icon, value, label
- Animated number counting on load
- Skeleton loading state

#### 4. CreatorTracksSection Component

**Purpose**: Display creator's public tracks with save functionality

**Props**:
```tsx
interface CreatorTracksSectionProps {
  userId: string;
  initialLimit: number;
  showViewAll: boolean;
}
```

**Features**:
- Copied from AllTracksSection (not reused)
- Filters to is_public = true
- Save button on each track card
- Modified 3-dot menu (no delete, no add to album, includes share and copy URL)
- View All button redirects to /profile/[username]/tracks
- Collapsible section

#### 5. CreatorAlbumsSection Component

**Purpose**: Display creator's public albums with save functionality

**Props**:
```tsx
interface CreatorAlbumsSectionProps {
  userId: string;
  initialLimit: number;
}
```

**Features**:
- Copied from MyAlbumsSection (not reused)
- Filters to is_public = true
- Save button on each album card
- No edit or delete options
- Collapsible section
- Grid layout

#### 6. CreatorPlaylistsSection Component

**Purpose**: Display creator's public playlists with save functionality

**Props**:
```tsx
interface CreatorPlaylistsSectionProps {
  userId: string;
  initialLimit: number;
}
```

**Features**:
- Copied from PlaylistsList (not reused)
- Filters to is_public = true
- Save button on each playlist card
- No edit or delete options
- Collapsible section
- Grid layout

#### 7. FollowButton Component

**Purpose**: Reusable follow/following toggle button

**Props**:
```tsx
interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onToggle: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
}
```

**States**:
- Not following: "Follow" button (blue background)
- Following: "Following" button (gray background, hover shows "Unfollow")
- Loading: Spinner icon
- Error: Red border with error message

**Design Pattern**: Reuse existing follow button from UserRecommendations component

#### 8. SaveButton Component

**Purpose**: Reusable save/remove toggle button for tracks, albums, playlists

**Props**:
```tsx
interface SaveButtonProps {
  itemId: string;
  itemType: 'track' | 'album' | 'playlist';
  isSaved: boolean;
  onToggle: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
}
```

**States**:
- Not saved: Outline bookmark icon, "Save" label
- Saved: Filled bookmark icon, "Remove" label
- Loading: Spinner
- Error: Red color with error message

**Design**:
- Icon + text button
- Smooth transition between states
- Optimistic UI updates
- Rollback on error

### Modified Components

#### 1. Header Component (Avatar Dropdown)

**Current**: Clicking avatar redirects to /profile

**New**: Clicking avatar shows dropdown menu with:
- "My Creator Profile" → /profile
- "Manage my Account" → /account

**Implementation**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar src={user.avatar_url} />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => router.push('/profile')}>
      <User className="mr-2" />
      My Creator Profile
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => router.push('/account')}>
      <Settings className="mr-2" />
      Manage my Account
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 2. Track Card Component (for Creator Profiles)

**Modifications**:
- Remove "Add to Album" menu option
- Remove "Delete" menu option
- Keep "Add to Playlist" menu option
- Add "Save" menu option
- Add "Copy Track URL" menu option
- Add "Share" menu option

**Implementation**: Create `CreatorTrackCard` component (copied from existing TrackCard)

### Integration Points

#### Links to Creator Profile

**Pattern for all integrations**:
```tsx
// Check if username is current user
const isOwnProfile = username === currentUser?.username;

// Render username as link or plain text
{isOwnProfile ? (
  <span className="font-semibold">{username}</span>
) : (
  <Link href={`/profile/${username}`} className="font-semibold hover:underline">
    {username}
  </Link>
)}
```

**Pages to Update**:

1. **Home Page** (`/app/page.tsx`):
   - Recent Activity section: Username links, event card clicks
   - Popular Creators section: View button, username links
   - Suggested for You section: Username links

2. **Discover Page** (`/app/discover/page.tsx`):
   - Suggested for You section: "Check out Creator" button
   - Top 5 Popular Creators sections: "View Profile" buttons

3. **Dashboard Page** (`/app/dashboard/page.tsx`):
   - Post cards: Username links

4. **Feed Page** (`/app/feed/page.tsx`):
   - Event cards: Username links, event card clicks

5. **Notifications Page** (`/app/notifications/page.tsx`):
   - Notification cards: Username links (remove /discover link)



## Data Models

### Database Schema Changes

#### 1. profiles Table (Modified)

**Add Column**:
```sql
ALTER TABLE profiles 
ADD COLUMN user_type TEXT DEFAULT 'Free User';

-- Add index for faster queries
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
```

**Purpose**: Store user account tier for badge display

**Future Expansion**: Can be changed to JSONB array for multiple badges:
```sql
-- Future migration
ALTER TABLE profiles 
ADD COLUMN user_types JSONB DEFAULT '["Free User"]';
```

#### 2. user_follows Table (New)

**Schema**:
```sql
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-follows and duplicate follows
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- Indexes for performance
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_follows_created_at ON user_follows(created_at DESC);
```

**RLS Policies**:
```sql
-- Anyone can view follows
CREATE POLICY "Follows are viewable by everyone"
  ON user_follows FOR SELECT
  USING (true);

-- Users can create follows for themselves
CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follows
CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);
```

#### 3. saved_tracks Table (New)

**Schema**:
```sql
CREATE TABLE saved_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate saves
  CONSTRAINT unique_saved_track UNIQUE (user_id, track_id)
);

-- Indexes for performance
CREATE INDEX idx_saved_tracks_user ON saved_tracks(user_id);
CREATE INDEX idx_saved_tracks_track ON saved_tracks(track_id);
CREATE INDEX idx_saved_tracks_created_at ON saved_tracks(created_at DESC);
```

**RLS Policies**:
```sql
-- Users can only view their own saved tracks
CREATE POLICY "Users can view own saved tracks"
  ON saved_tracks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save tracks
CREATE POLICY "Users can save tracks"
  ON saved_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave tracks
CREATE POLICY "Users can unsave tracks"
  ON saved_tracks FOR DELETE
  USING (auth.uid() = user_id);
```

#### 4. saved_albums Table (New)

**Schema**:
```sql
CREATE TABLE saved_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate saves
  CONSTRAINT unique_saved_album UNIQUE (user_id, album_id)
);

-- Indexes for performance
CREATE INDEX idx_saved_albums_user ON saved_albums(user_id);
CREATE INDEX idx_saved_albums_album ON saved_albums(album_id);
CREATE INDEX idx_saved_albums_created_at ON saved_albums(created_at DESC);
```

**RLS Policies**: Same pattern as saved_tracks

#### 5. saved_playlists Table (New)

**Schema**:
```sql
CREATE TABLE saved_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate saves
  CONSTRAINT unique_saved_playlist UNIQUE (user_id, playlist_id)
);

-- Indexes for performance
CREATE INDEX idx_saved_playlists_user ON saved_playlists(user_id);
CREATE INDEX idx_saved_playlists_playlist ON saved_playlists(playlist_id);
CREATE INDEX idx_saved_playlists_created_at ON saved_playlists(created_at DESC);
```

**RLS Policies**: Same pattern as saved_tracks

### Database Functions

#### 1. get_creator_score(user_id UUID)

**Purpose**: Calculate creator score using same algorithm as popular creators

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_creator_score(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_plays BIGINT;
  total_likes BIGINT;
  score NUMERIC;
BEGIN
  -- Get total plays from public tracks
  SELECT COALESCE(SUM(play_count), 0)
  INTO total_plays
  FROM tracks
  WHERE user_id = p_user_id AND is_public = true;
  
  -- Get total likes from public tracks
  SELECT COALESCE(COUNT(*), 0)
  INTO total_likes
  FROM track_likes tl
  JOIN tracks t ON t.id = tl.track_id
  WHERE t.user_id = p_user_id AND t.is_public = true;
  
  -- Calculate score: (total_plays × 0.6) + (total_likes × 0.4)
  score := (total_plays * 0.6) + (total_likes * 0.4);
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. get_follower_count(user_id UUID)

**Purpose**: Get total number of followers for a user

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_follows
    WHERE following_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. get_public_track_count(user_id UUID)

**Purpose**: Get count of public tracks for a user

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_public_track_count(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM tracks
    WHERE user_id = p_user_id AND is_public = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 4. get_public_album_count(user_id UUID)

**Purpose**: Get count of public albums for a user

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_public_album_count(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM albums
    WHERE user_id = p_user_id AND is_public = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 5. get_public_playlist_count(user_id UUID)

**Purpose**: Get count of public playlists for a user

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_public_playlist_count(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM playlists
    WHERE user_id = p_user_id AND is_public = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 6. get_total_plays(user_id UUID)

**Purpose**: Get sum of play counts across all public tracks

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_total_plays(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(play_count), 0)
    FROM tracks
    WHERE user_id = p_user_id AND is_public = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 7. get_creator_stats(user_id UUID)

**Purpose**: Get all stats in a single query for efficiency

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION get_creator_stats(p_user_id UUID)
RETURNS TABLE (
  creator_score NUMERIC,
  follower_count BIGINT,
  track_count BIGINT,
  album_count BIGINT,
  playlist_count BIGINT,
  total_plays BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    get_creator_score(p_user_id),
    get_follower_count(p_user_id),
    get_public_track_count(p_user_id),
    get_public_album_count(p_user_id),
    get_public_playlist_count(p_user_id),
    get_total_plays(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### TypeScript Interfaces

#### CreatorProfile Interface

```typescript
export interface CreatorProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  user_type: string;
  created_at: string;
  updated_at: string;
}
```

#### CreatorStats Interface

```typescript
export interface CreatorStats {
  creator_score: number;
  follower_count: number;
  track_count: number;
  album_count: number;
  playlist_count: number;
  total_plays: number;
}
```

#### UserFollow Interface

```typescript
export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}
```

#### SavedItem Interfaces

```typescript
export interface SavedTrack {
  id: string;
  user_id: string;
  track_id: string;
  created_at: string;
}

export interface SavedAlbum {
  id: string;
  user_id: string;
  album_id: string;
  created_at: string;
}

export interface SavedPlaylist {
  id: string;
  user_id: string;
  playlist_id: string;
  created_at: string;
}
```



## Error Handling

### Error Scenarios and Handling

#### 1. Creator Not Found

**Scenario**: User navigates to /profile/[username] but username doesn't exist

**Handling**:
```tsx
if (!creatorProfile && !loading) {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Creator Not Found
        </h1>
        <p className="text-gray-400 mb-6">
          The creator you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/discover" className="btn-primary">
          Discover Creators
        </Link>
      </div>
    </MainLayout>
  );
}
```

#### 2. Invalid Username Format

**Scenario**: Username contains special characters that break routing

**Handling**:
- Try username-based route first
- If fails, fall back to user ID route
- Display error message if both fail

```tsx
async function fetchCreator(identifier: string) {
  try {
    // Try as username first
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', identifier)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Not found, try as user ID
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', identifier)
        .single();
      
      if (userError) throw userError;
      return userData;
    }
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching creator:', err);
    throw err;
  }
}
```

#### 3. Follow/Unfollow Failures

**Scenario**: Network error or database constraint violation during follow action

**Handling**:
- Optimistic UI update
- Rollback on error
- Display error toast
- Retry mechanism

```tsx
async function handleFollowToggle() {
  const previousState = isFollowing;
  
  try {
    // Optimistic update
    setIsFollowing(!isFollowing);
    
    if (isFollowing) {
      await unfollowUser(user.id, creatorId);
    } else {
      await followUser(user.id, creatorId);
    }
  } catch (error) {
    // Rollback on error
    setIsFollowing(previousState);
    
    toast.error('Failed to update follow status. Please try again.');
    console.error('Follow toggle error:', error);
  }
}
```

#### 4. Save/Unsave Failures

**Scenario**: Network error or database constraint violation during save action

**Handling**: Same pattern as follow/unfollow with optimistic updates and rollback

#### 5. Authentication Required

**Scenario**: Unauthenticated user tries to follow or save content

**Handling**:
```tsx
function handleFollowClick() {
  if (!user) {
    toast.info('Please log in to follow creators');
    router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
    return;
  }
  
  handleFollowToggle();
}
```

#### 6. Data Loading Failures

**Scenario**: Failed to load tracks, albums, or playlists

**Handling**:
- Display error message in section
- Provide retry button
- Don't block other sections from loading

```tsx
{error ? (
  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
    <p className="text-red-400 mb-2">{error}</p>
    <button onClick={retry} className="btn-secondary">
      Retry
    </button>
  </div>
) : (
  // Normal content
)}
```

### Error Boundaries

**Wrap each major section in error boundary**:

```tsx
<ErrorBoundary
  fallback={
    <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
      <p className="text-red-400">Failed to load this section</p>
    </div>
  }
>
  <CreatorTracksSection userId={creatorId} />
</ErrorBoundary>
```

### Validation Rules

#### Username Validation

```typescript
function isValidUsername(username: string): boolean {
  // Allow alphanumeric, underscore, hyphen
  // Length: 3-30 characters
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}
```

#### User ID Validation

```typescript
function isValidUserId(id: string): boolean {
  // UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

## Testing Strategy

### Unit Tests

#### 1. Component Tests

**CreatorProfilePage**:
- ✅ Renders loading state correctly
- ✅ Renders creator profile when data loads
- ✅ Shows error message when creator not found
- ✅ Hides follow button on own profile
- ✅ Shows follow button on other profiles
- ✅ Handles authentication state correctly

**FollowButton**:
- ✅ Displays "Follow" when not following
- ✅ Displays "Following" when following
- ✅ Shows loading spinner during action
- ✅ Calls onToggle when clicked
- ✅ Disables button during loading

**SaveButton**:
- ✅ Displays "Save" when not saved
- ✅ Displays "Remove" when saved
- ✅ Shows correct icon for each state
- ✅ Calls onToggle when clicked
- ✅ Handles errors gracefully

**CreatorStatsSection**:
- ✅ Fetches and displays all stats
- ✅ Shows loading skeleton
- ✅ Handles fetch errors
- ✅ Formats numbers correctly (e.g., 1.2K, 1.5M)

#### 2. Service/API Tests

**Profile Service**:
- ✅ getCreatorByUsername returns correct profile
- ✅ getCreatorById returns correct profile
- ✅ Returns null for non-existent creator
- ✅ Handles database errors

**Social Service**:
- ✅ followUser creates follow relationship
- ✅ unfollowUser removes follow relationship
- ✅ getFollowStatus returns correct status
- ✅ saveTrack creates saved_tracks record
- ✅ unsaveTrack removes saved_tracks record
- ✅ Prevents duplicate follows/saves

#### 3. Database Function Tests

**get_creator_score**:
- ✅ Calculates score correctly with formula
- ✅ Returns 0 for creator with no tracks
- ✅ Only counts public tracks
- ✅ Handles NULL values correctly

**get_follower_count**:
- ✅ Returns correct count
- ✅ Returns 0 for creator with no followers
- ✅ Updates in real-time

**get_creator_stats**:
- ✅ Returns all stats in single query
- ✅ Performance is acceptable (<100ms)

### Integration Tests

#### 1. Page Navigation Tests

- ✅ /profile redirects to authenticated user's profile
- ✅ /profile/[username] loads correct creator profile
- ✅ /profile/[userid] loads correct creator profile
- ✅ /profile/[username]/tracks shows all public tracks
- ✅ /account shows account settings page
- ✅ Avatar dropdown navigates correctly

#### 2. Follow Workflow Tests

- ✅ User can follow another creator
- ✅ User can unfollow a creator
- ✅ Follow count updates immediately
- ✅ Follow status persists across page refreshes
- ✅ Cannot follow self
- ✅ Requires authentication

#### 3. Save Workflow Tests

- ✅ User can save a track
- ✅ User can unsave a track
- ✅ Save status persists across page refreshes
- ✅ Saved items appear in correct state
- ✅ Requires authentication

#### 4. Integration Link Tests

- ✅ Home page links navigate to creator profiles
- ✅ Discover page links navigate to creator profiles
- ✅ Dashboard page links navigate to creator profiles
- ✅ Feed page links navigate to creator profiles
- ✅ Notifications page links navigate to creator profiles
- ✅ Own username is not clickable

### End-to-End Tests

#### 1. Creator Discovery Flow

```typescript
test('User discovers and follows a creator', async () => {
  // 1. Navigate to discover page
  await page.goto('/discover');
  
  // 2. Click on a popular creator
  await page.click('[data-testid="creator-card-view-button"]');
  
  // 3. Verify creator profile loads
  await expect(page).toHaveURL(/\/profile\/.+/);
  await expect(page.locator('h1')).toContainText('username');
  
  // 4. Click follow button
  await page.click('[data-testid="follow-button"]');
  
  // 5. Verify button changes to "Following"
  await expect(page.locator('[data-testid="follow-button"]')).toContainText('Following');
  
  // 6. Verify follower count increased
  const followerCount = await page.locator('[data-testid="follower-count"]').textContent();
  expect(parseInt(followerCount)).toBeGreaterThan(0);
});
```

#### 2. Content Saving Flow

```typescript
test('User saves a track from creator profile', async () => {
  // 1. Navigate to creator profile
  await page.goto('/profile/testuser');
  
  // 2. Click save button on first track
  await page.click('[data-testid="track-save-button"]:first-child');
  
  // 3. Verify button changes to "Remove"
  await expect(page.locator('[data-testid="track-save-button"]:first-child'))
    .toContainText('Remove');
  
  // 4. Navigate to own library (future: saved section)
  // Verify track appears in saved items
});
```

#### 3. URL Routing Flow

```typescript
test('URL routing works correctly', async () => {
  // 1. Test /profile redirects to own profile
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile\/.+/);
  
  // 2. Test /account shows account settings
  await page.goto('/account');
  await expect(page.locator('h1')).toContainText('Account Settings');
  
  // 3. Test avatar dropdown
  await page.click('[data-testid="avatar-button"]');
  await expect(page.locator('[data-testid="dropdown-menu"]')).toBeVisible();
  
  // 4. Click "My Creator Profile"
  await page.click('[data-testid="my-creator-profile-link"]');
  await expect(page).toHaveURL('/profile');
});
```

### Performance Tests

#### 1. Page Load Performance

- ✅ Creator profile page loads in < 3 seconds
- ✅ Stats section loads in < 1 second
- ✅ Tracks section loads in < 2 seconds
- ✅ Images lazy load correctly

#### 2. Database Query Performance

- ✅ get_creator_stats executes in < 100ms
- ✅ Public tracks query with pagination < 100ms
- ✅ Follow/unfollow operations < 50ms
- ✅ Save/unsave operations < 50ms

#### 3. Caching Effectiveness

- ✅ Creator profile cached for 5 minutes
- ✅ Stats cached for 5 minutes
- ✅ Cache invalidates on follow/unfollow
- ✅ Cache invalidates on save/unsave

### Manual Testing Checklist

#### Visual Design

- [ ] User type badge displays correctly
- [ ] Profile header layout is responsive
- [ ] Stats cards align properly
- [ ] Follow button styling matches design
- [ ] Save buttons are clearly visible
- [ ] Track cards display correctly
- [ ] Album cards display correctly
- [ ] Playlist cards display correctly

#### Responsive Design

- [ ] Mobile layout (< 768px) works correctly
- [ ] Tablet layout (768px - 1024px) works correctly
- [ ] Desktop layout (> 1024px) works correctly
- [ ] Avatar dropdown works on mobile
- [ ] Touch targets are at least 44px

#### Accessibility

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Screen reader labels are present
- [ ] Color contrast meets WCAG AA standards
- [ ] Alt text for images

#### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)



## Implementation Notes

### Database Dependencies

#### Albums Table

The design assumes an `albums` table exists with the following structure:
```sql
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**If the albums table doesn't exist**, it needs to be created before implementing the Creator Profile Page feature. The `saved_albums` table and `get_public_album_count` function depend on it.

#### Track Likes Table

The `get_creator_score` function references a `track_likes` table for calculating likes. If this table doesn't exist, we have two options:

**Option 1**: Create the track_likes table:
```sql
CREATE TABLE track_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_track_like UNIQUE (user_id, track_id)
);

CREATE INDEX idx_track_likes_user ON track_likes(user_id);
CREATE INDEX idx_track_likes_track ON track_likes(track_id);
```

**Option 2**: Modify the creator score calculation to use an existing likes mechanism (e.g., if likes are stored differently in the current system).

**Recommendation**: Verify the current database schema and adjust the design accordingly before implementation.

### Component Copying Strategy

When copying components from /library pages:

1. **Create new files** with "Creator" prefix (e.g., `CreatorTracksSection.tsx`)
2. **Copy the entire component** code
3. **Modify the queries** to filter by `is_public = true`
4. **Remove owner-specific features** (edit, delete, add to album)
5. **Add save functionality** to each card
6. **Update prop interfaces** to match new requirements

**Do NOT**:
- Import and reuse library components directly
- Create shared components that both pages use
- Modify existing library components

This ensures changes to library pages don't affect creator profiles and vice versa.

### URL Routing Implementation

The `/profile` route needs special handling:

```tsx
// app/profile/page.tsx
export default function ProfileRedirect() {
  const { user } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (user) {
      // Redirect to own creator profile
      router.push(`/profile/${user.username || user.id}`);
    } else {
      // Redirect to login
      router.push('/login?redirect=/profile');
    }
  }, [user, router]);
  
  return <LoadingSpinner />;
}
```

This ensures `/profile` always redirects to the authenticated user's creator profile.

### Migration Order

Implement database changes in this order:

1. **Add user_type column** to profiles table
2. **Create user_follows table** with RLS policies
3. **Create saved_tracks table** with RLS policies
4. **Create saved_albums table** with RLS policies (if albums table exists)
5. **Create saved_playlists table** with RLS policies
6. **Create database functions** for stats calculation
7. **Update TypeScript types** from database schema

### Integration Priority

Implement page integrations in this order:

1. **Header component** (avatar dropdown) - affects all pages
2. **Creator profile pages** (main profile and tracks page)
3. **Home page** - highest traffic
4. **Discover page** - second highest traffic
5. **Dashboard page**
6. **Feed page**
7. **Notifications page**

This ensures the most critical user flows work first.

### Performance Considerations

1. **Stats Calculation**: The `get_creator_stats` function calls multiple sub-functions. Consider optimizing to a single query if performance is an issue.

2. **Public Content Queries**: Add composite indexes for common queries:
```sql
CREATE INDEX idx_tracks_user_public ON tracks(user_id, is_public);
CREATE INDEX idx_albums_user_public ON albums(user_id, is_public);
CREATE INDEX idx_playlists_user_public ON playlists(user_id, is_public);
```

3. **Caching Strategy**: Use the existing cache utility (`@/utils/cache`) for:
   - Creator profiles (5-minute TTL)
   - Creator stats (5-minute TTL)
   - Public content lists (5-minute TTL)

4. **Pagination**: Implement cursor-based pagination for tracks, albums, and playlists to handle creators with large catalogs.

### Security Considerations

1. **RLS Policies**: All new tables have RLS enabled by default
2. **Public Content**: Only show content where `is_public = true`
3. **Authentication**: Follow/save features require authentication
4. **Rate Limiting**: Consider adding rate limits for follow/unfollow actions to prevent abuse
5. **Input Validation**: Validate usernames and user IDs before querying database

### Future Enhancements

Features to consider for future iterations:

1. **Saved Content Section**: Add a dedicated page for viewing saved tracks, albums, and playlists
2. **Following Feed**: Show content from followed creators
3. **Creator Analytics**: Show creators their own profile analytics
4. **Multiple User Types**: Support multiple badges per user (Premium + Verified)
5. **Profile Customization**: Allow creators to customize their profile appearance
6. **Social Sharing**: Share creator profiles on social media
7. **Collaborative Playlists**: Allow multiple creators to contribute to playlists
8. **Creator Verification**: Badge system for verified creators

