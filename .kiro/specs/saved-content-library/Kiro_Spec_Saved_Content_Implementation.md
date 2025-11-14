# Kiro Spec: Saved Content Display - Library Page Enhancement

## Objective
Implement UI for displaying saved tracks, albums, and playlists on the existing `/library` page by adding three new collapsible sections below existing content.

## Current State Analysis Required
Before implementation, analyze:
1. `/library/page.tsx` - current structure and section patterns
2. `AllTracksSection.tsx`, `MyAlbumsSection.tsx`, `PlaylistsList.tsx` - reusable patterns
3. `lib/saveService.ts` - existing save/unsave functions (already implemented)
4. Database tables: `saved_tracks`, `saved_albums`, `saved_playlists` (already exist)
5. Supabase queries for fetching user's own content - adapt for saved content

## Implementation Requirements

### Phase 1: Backend Service Functions (Priority 1)
**File:** `client/src/lib/library.ts`

Add three functions following existing patterns in this file:

1. `getSavedTracks(userId, limit?, offset?)` - Query `saved_tracks` JOIN `tracks` JOIN `user_profiles` to get:
   - Track details
   - Creator username
   - Saved timestamp
   - Order by `created_at DESC`

2. `getSavedAlbums(userId, limit?, offset?)` - Query `saved_albums` JOIN `albums` JOIN `user_profiles`

3. `getSavedPlaylists(userId, limit?, offset?)` - Query `saved_playlists` JOIN `playlists` JOIN `user_profiles`

**Pattern Reference:** Follow same query structure as `getUserTracksWithMembership()` but join saved tables instead.

### Phase 2: Saved Section Components (Priority 2)
**Files:** Create in `client/src/components/library/`

1. `SavedTracksSection.tsx` - Copy from `AllTracksSection.tsx`, adapt with:
   - Use `getSavedTracks()` instead of user tracks query
   - Display creator username prominently ("by @username")
   - Replace delete with "Remove" button (calls `unsaveTrack()`)
   - No edit capability
   - Clicking creator name navigates to `/profile/[username]`

2. `SavedAlbumsSection.tsx` - Copy from `MyAlbumsSection.tsx`, adapt similarly

3. `SavedPlaylistsSection.tsx` - Copy from `PlaylistsList.tsx` (My Playlists portion), adapt similarly

**Key Modifications:**
- Icon prefix: 🔖 (bookmark emoji)
- Button action: "Remove" (unsave) not "Delete"
- Show creator attribution
- Link to creator profile
- Maintain collapsible behavior
- Include loading/error/empty states

### Phase 3: Library Page Integration (Priority 3)
**File:** `client/src/app/library/page.tsx`

Add after existing sections:
1. Visual divider with "🔖 Saved Content" label
2. Three saved sections with error boundaries (follow existing pattern)
3. Update `handleUploadSuccess` to invalidate saved caches if needed

**Layout:**
```
[Existing sections: Stats, Upload, My Tracks, My Albums, My Playlists]
[Visual Divider: Centered text "🔖 Saved Content" with border line]
[SavedTracksSection]
[SavedAlbumsSection]
[SavedPlaylistsSection]
```

### Phase 4: Optional Stats Enhancement (Priority 4)
**File:** `client/src/components/library/StatsSection.tsx`

Consider adding saved content counts to stats grid (ask user first if they want this).

## Technical Constraints

### Must Follow
- Reuse existing component patterns (AllTracksSection, MyAlbumsSection, PlaylistsList)
- Maintain collapsible section behavior with localStorage persistence
- Use existing cache utility with appropriate cache keys
- Follow existing error boundary patterns
- Maintain responsive grid layouts (desktop/tablet/mobile)
- Use existing toast notification system
- No new dependencies

### Database
- Tables already exist: `saved_tracks`, `saved_albums`, `saved_playlists`
- Use Supabase joins to fetch creator info in single query
- Order by `created_at DESC` (most recently saved first)

### Styling
- Match existing section styling
- Use 🔖 emoji for saved sections
- Add subtle visual separator before saved content
- Maintain dark theme consistency

## Testing Requirements

After each phase:
1. TypeScript compilation check
2. ESLint validation
3. Manual user testing pause

Test scenarios to verify:
- Empty state when no saved content
- Loading states during fetch
- Error states with retry button
- Save from creator profile → appears in saved section
- Remove button → item disappears, toast notification
- Creator username link → navigates to profile
- Mobile responsive behavior
- Collapsible state persistence

## Implementation Order

1. Backend functions → Test with console.log
2. SavedTracksSection → Integrate → Manual test
3. SavedAlbumsSection → Integrate → Manual test  
4. SavedPlaylistsSection → Integrate → Manual test
5. Stats update (if user confirms)

## Questions to Confirm Before Starting

1. Should stats section include saved content counts?
2. Initial item limit per section (recommend 8, same as existing)?
3. Any specific error messages or empty state text preferences?

## Files to Analyze First
- `/library/page.tsx`
- `/library/AllTracksSection.tsx`
- `/library/MyAlbumsSection.tsx`
- `/playlists/PlaylistsList.tsx`
- `/lib/library.ts`
- `/lib/saveService.ts`

## Deliverables
- 3 new service functions in `lib/library.ts`
- 3 new section components in `components/library/`
- Updated `/library/page.tsx` with saved sections
- No git commits (user will handle)
