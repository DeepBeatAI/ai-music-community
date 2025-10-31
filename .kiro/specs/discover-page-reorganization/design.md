# Design Document

## Overview

This design document outlines the technical approach for reorganizing the Discover page to consolidate trending tracks and popular creators information, implementing a new two-column layout, optimizing the Home page display, and reorganizing the header navigation. The design emphasizes code reuse, component composition, and minimal changes to existing working functionality.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │   Analytics      │  │    Discover      │  │     Home     │ │
│  │     Page         │  │      Page        │  │     Page     │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│         │                      │                     │          │
│         │                      │                     │          │
│         ▼                      ▼                     ▼          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ MetricsGrid      │  │ TrendingSection  │  │ Limited      │ │
│  │ ActivityChart    │  │ (imported)       │  │ Sections     │ │
│  │ MetricMonitor    │  │                  │  │ (3 items)    │ │
│  └──────────────────┘  │ UserRecommend.   │  └──────────────┘ │
│                        │ (existing)       │                    │
│                        └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Shared Components Layer                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ TrendingSection │ TrendingTrackCard │ PopularCreatorCard │  │
│  │ (reusable)      │ (reusable)        │ (reusable)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                Data Layer                                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ trendingAnalytics.ts │ getCachedAnalytics │ Database     │  │
│  │ (shared functions)   │ (5-min cache)      │ Functions    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Code Reuse**: Import and reuse existing components without modification
2. **Component Composition**: Build new layouts by composing existing components
3. **Minimal Changes**: Make the smallest changes necessary to achieve requirements
4. **Responsive Design**: Use CSS Grid/Flexbox for adaptive layouts
5. **Performance**: Leverage existing caching mechanisms

## Components and Interfaces

### 1. Discover Page Redesign

#### Current Structure
```typescript
// client/src/app/discover/page.tsx (CURRENT)
export default function DiscoverPage() {
  // Fetches trending tracks (7 days, 10 items)
  // Fetches popular creators (7 days, 5 items)
  // Displays: UserRecommendations, Trending, Popular
  // Layout: Single column, stacked sections
}
```

#### New Structure
```typescript
// client/src/app/discover/page.tsx (NEW)
import { TrendingSection } from '@/components/analytics/TrendingSection';
import UserRecommendations from '@/components/UserRecommendations';

export default function DiscoverPage() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1>Discover</h1>
          <p>Find amazing creators and AI-generated music</p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Tracks */}
          <div className="space-y-8">
            {/* TrendingSection will render both 7-day and all-time tracks */}
            {/* We'll extract just the track sections */}
          </div>

          {/* Right Column: Creators */}
          <div className="space-y-8">
            {/* Personalized recommendations - uses its own card UI */}
            <UserRecommendations 
              title="Suggested for You" 
              limit={8}
              showProfileButton={true}
            />
            {/* TrendingSection will render both 7-day and all-time creators */}
            {/* We'll extract just the creator sections */}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
```

#### Layout Specifications

**Desktop (≥1024px):**
```
┌─────────────────────────────────────────────────────────┐
│                    Discover Header                       │
├──────────────────────────┬──────────────────────────────┤
│  LEFT COLUMN (Tracks)    │  RIGHT COLUMN (Creators)     │
│                          │                              │
│  🔥 Top 10 Trending      │  ✨ Suggested for You        │
│     Tracks (7 Days)      │                              │
│  [10 track cards]        │  [8 creator cards]           │
│                          │                              │
│  ⭐ Top 10 Trending      │  🎵 Top 5 Popular            │
│     Tracks (All Time)    │     Creators (7 Days)        │
│  [10 track cards]        │  [5 creator cards]           │
│                          │                              │
│                          │  👑 Top 5 Popular            │
│                          │     Creators (All Time)      │
│                          │  [5 creator cards]           │
└──────────────────────────┴──────────────────────────────┘
```

**Mobile (<1024px):**
```
┌─────────────────────────────────┐
│      Discover Header            │
├─────────────────────────────────┤
│  ✨ Suggested for You           │
│  [8 creator cards]              │
├─────────────────────────────────┤
│  🔥 Top 10 Trending             │
│     Tracks (7 Days)             │
│  [10 track cards]               │
├─────────────────────────────────┤
│  ⭐ Top 10 Trending             │
│     Tracks (All Time)           │
│  [10 track cards]               │
├─────────────────────────────────┤
│  🎵 Top 5 Popular               │
│     Creators (7 Days)           │
│  [5 creator cards]              │
├─────────────────────────────────┤
│  👑 Top 5 Popular               │
│     Creators (All Time)         │
│  [5 creator cards]              │
└─────────────────────────────────┘
```



### 2. UserRecommendations Component (No Changes)

**IMPORTANT: The UserRecommendations component uses its own distinct UI and MUST NOT be changed.**

**Current UI Style:**
- Horizontal card layout with avatar, username, stats, and follow button
- Shows: posts count, followers count, mutual follows
- Includes "Check out Creator" button when `showProfileButton={true}`
- Different visual style from PopularCreatorCard (which shows rank badges and scores)

**Updated Limit for Discover Page: 8 creators (increased from current 6)**

**Rationale:**
- More than Top 5 Popular Creators (5 items) to provide variety
- Balances content density with scrolling
- Personalized recommendations deserve more visibility
- 8 items fit well in the right column without overwhelming
- Provides users with more discovery options

**Configuration on Discover Page:**
```typescript
<UserRecommendations 
  title="Suggested for You" 
  limit={8}              // Changed from 6 to 8
  showProfileButton={true}
  showReason={true}
/>
```

**Note:** The component's UI remains unchanged - only the `limit` prop is updated from 6 to 8.

**Visual Distinction:**
- **Suggested for You**: Personalized, horizontal cards, social proof (mutual follows)
- **Popular Creators**: Objective ranking, vertical cards with rank badges, engagement scores

This distinction helps users understand the difference between personalized suggestions and objective popularity.

### 3. TrendingSection Component Adaptation

The existing `TrendingSection` component displays all four sections in a single column. We need to adapt how we use it on the Discover page to support the two-column layout.

#### Option A: Split Rendering (Recommended)

Create a wrapper component that uses TrendingSection's data but renders sections separately:

```typescript
// client/src/components/discover/DiscoverTrendingSection.tsx
import { useState, useEffect } from 'react';
import {
  getTrendingTracks7Days,
  getTrendingTracksAllTime,
  getPopularCreators7Days,
  getPopularCreatorsAllTime,
  getCachedAnalytics,
} from '@/lib/trendingAnalytics';
import { TrendingTrackCard } from '@/components/analytics/TrendingTrackCard';
import { PopularCreatorCard } from '@/components/analytics/PopularCreatorCard';

interface DiscoverTrendingSectionProps {
  type: 'tracks' | 'creators';
}

export function DiscoverTrendingSection({ type }: DiscoverTrendingSectionProps) {
  // Reuse the same data fetching logic as TrendingSection
  // Render only tracks or only creators based on type prop
}
```

#### Option B: Use TrendingSection As-Is (Simpler)

Import TrendingSection and let it render all four sections, then use CSS Grid to reflow them:

```typescript
// client/src/app/discover/page.tsx
import { TrendingSection } from '@/components/analytics/TrendingSection';

// Wrap TrendingSection in a container with custom CSS
<div className="discover-trending-grid">
  <TrendingSection />
</div>

// CSS to reflow sections into two columns
.discover-trending-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
```

**Decision: Option A is recommended** because it provides better control over section placement and maintains semantic HTML structure. Option B would require complex CSS selectors and might be fragile.

### 4. Analytics Page Simplification

#### Current Structure
```typescript
// client/src/app/analytics/page.tsx (CURRENT)
export default function AnalyticsPage() {
  return (
    <MainLayout>
      <MetricsGrid />
      <ActivityChart />
      <TrendingSection />  {/* REMOVE THIS */}
      <MetricCollectionMonitor />
    </MainLayout>
  );
}
```

#### New Structure
```typescript
// client/src/app/analytics/page.tsx (NEW)
export default function AnalyticsPage() {
  return (
    <MainLayout>
      <MetricsGrid />
      <ActivityChart />
      {/* TrendingSection removed - now on Discover page */}
      <MetricCollectionMonitor />
    </MainLayout>
  );
}
```

**Changes:**
- Remove the `<TrendingSection />` component import and usage
- Keep all other sections unchanged
- Verify no broken imports or dependencies

### 5. Home Page Optimization

#### Current Structure
```typescript
// client/src/components/AuthenticatedHome.tsx (CURRENT)
export default function AuthenticatedHome() {
  // Fetches trending (4 items), popular (3 items), activity (6 items)
  // Displays: Activity (slice 0-3), Trending (all 4), Popular (all 3)
  // View All buttons: Activity→/feed, Trending→/analytics, Popular→/analytics
}
```

#### New Structure
```typescript
// client/src/components/AuthenticatedHome.tsx (NEW)
export default function AuthenticatedHome() {
  const loadHomeContent = useCallback(async () => {
    const [trending, popular, activity] = await Promise.all([
      getCachedAnalytics('home_trending_7d', getTrendingTracks7Days),
      getCachedAnalytics('home_popular_creators_7d', getPopularCreators7Days),
      getActivityFeed(user.id, { following: true }, 0, 6),
    ]);
    
    // Limit all sections to 3 items
    setTrendingTracks(trending.slice(0, 3)); // Changed from 4 to 3
    setPopularCreators(popular.slice(0, 3)); // Already 3
    setRecentActivity(activity.slice(0, 3)); // Changed from 6 to 3
  }, [user]);

  return (
    <div>
      {/* Recent Activity - 3 items */}
      <div>
        <h2>Recent Activity</h2>
        <button onClick={() => router.push('/dashboard')}>View All</button>
        {recentActivity.slice(0, 3).map(...)}
      </div>

      {/* Trending This Week - 3 items */}
      <div>
        <h2>🔥 Trending This Week</h2>
        <button onClick={() => router.push('/discover')}>View All</button>
        {trendingTracks.map(...)} {/* Already sliced to 3 */}
      </div>

      {/* Popular Creators - 3 items */}
      <div>
        <h2>⭐ Popular Creators</h2>
        <button onClick={() => router.push('/discover')}>View All</button>
        {popularCreators.map(...)} {/* Already sliced to 3 */}
      </div>
    </div>
  );
}
```

**Changes:**
1. Update `setTrendingTracks` to slice to 3 items instead of 4
2. Update `setRecentActivity` to slice to 3 items instead of 6
3. Change "View All" button for Recent Activity: `/feed` → `/dashboard`
4. Change "View All" button for Trending This Week: `/analytics` → `/discover`
5. Change "View All" button for Popular Creators: `/analytics` → `/discover`



### 6. Header Navigation Reorganization

#### Current Structure

The header navigation currently has an "Activity Feed" link in the main navigation bar. We need to identify the header component and move this link to the bell icon dropdown menu.

#### Expected Header Component Location
```
client/src/components/layout/MainLayout.tsx
  or
client/src/components/layout/Header.tsx
  or
client/src/components/Header.tsx
```

#### Design Approach

**Step 1: Locate the Header Component**
- Find where the main navigation links are rendered
- Identify the bell icon and its dropdown menu
- Locate the "Activity Feed" link in the navigation

**Step 2: Remove Activity Feed from Main Navigation**
```typescript
// BEFORE
<nav>
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/discover">Discover</Link>
  <Link href="/feed">Activity Feed</Link>  {/* REMOVE */}
  <Link href="/analytics">Analytics</Link>
</nav>
```

```typescript
// AFTER
<nav>
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/discover">Discover</Link>
  {/* Activity Feed removed from main nav */}
  <Link href="/analytics">Analytics</Link>
</nav>
```

**Step 3: Add Activity Feed to Bell Icon Dropdown**
```typescript
// Bell Icon Dropdown Menu
<DropdownMenu>
  {/* Add Activity Feed link at the top */}
  <DropdownMenuItem>
    <Link href="/feed" className="flex items-center gap-2">
      <ActivityIcon />
      <span>Activity Feed</span>
    </Link>
  </DropdownMenuItem>
  
  <DropdownMenuSeparator />
  
  {/* Existing notifications */}
  {notifications.map(notification => (
    <DropdownMenuItem key={notification.id}>
      {/* Notification content */}
    </DropdownMenuItem>
  ))}
</DropdownMenu>
```

#### Mobile Considerations

Ensure the bell icon dropdown is accessible on mobile:
- Touch target should be at least 44px
- Dropdown should be positioned correctly on small screens
- Activity Feed link should be easily tappable

## Data Models

### No Changes Required

All existing data models remain unchanged:
- `TrendingTrack` interface (from `@/lib/trendingAnalytics`)
- `PopularCreator` interface (from `@/lib/trendingAnalytics`)
- `ActivityFeedItem` interface (from `@/utils/activityFeed`)

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Visits Page                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Component Mounts & Fetches Data                 │
├─────────────────────────────────────────────────────────────┤
│  Home Page:                                                  │
│    - getTrendingTracks7Days() → slice(0, 3)                 │
│    - getPopularCreators7Days() → slice(0, 3)                │
│    - getActivityFeed() → slice(0, 3)                         │
│                                                              │
│  Discover Page:                                              │
│    - getTrendingTracks7Days() → all 10                      │
│    - getTrendingTracksAllTime() → all 10                    │
│    - getPopularCreators7Days() → all 5                      │
│    - getPopularCreatorsAllTime() → all 5                    │
│    - getRecommendedUsers() → 8 (increased from 6)           │
│                                                              │
│  Analytics Page:                                             │
│    - fetchCurrentMetrics()                                   │
│    - fetchActivityData()                                     │
│    - (TrendingSection removed)                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  getCachedAnalytics()                        │
│              (5-minute cache wrapper)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Functions (Supabase)                   │
├─────────────────────────────────────────────────────────────┤
│  - get_trending_tracks(days, limit)                         │
│  - get_popular_creators(days, limit)                        │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

### Existing Error Handling (Preserved)

All existing error handling mechanisms are preserved:

1. **TrendingSection Component**
   - Try-catch blocks around data fetching
   - Error state display with retry button
   - Loading skeletons during fetch

2. **Home Page**
   - Graceful degradation on fetch errors
   - Empty states when no data available
   - Errors logged to console

3. **Discover Page**
   - Error boundaries for component failures
   - Empty states for missing data
   - Loading indicators

### New Error Scenarios

**Scenario 1: TrendingSection Import Fails**
- **Cause**: Component path incorrect or component renamed
- **Handling**: TypeScript will catch at compile time
- **Prevention**: Use absolute imports with `@/` alias

**Scenario 2: Layout Breaks on Mobile**
- **Cause**: CSS Grid not responsive
- **Handling**: Use Tailwind responsive classes (`lg:grid-cols-2`)
- **Prevention**: Test on multiple screen sizes

**Scenario 3: Navigation Links Broken**
- **Cause**: Incorrect route paths
- **Handling**: Next.js will show 404 page
- **Prevention**: Use constants for route paths



## Testing Strategy

### Unit Testing

**Components to Test:**
1. **DiscoverTrendingSection** (if created)
   - Renders correct sections based on `type` prop
   - Fetches data using correct functions
   - Displays loading states
   - Handles errors gracefully

2. **AuthenticatedHome**
   - Limits sections to 3 items
   - Navigation buttons point to correct routes
   - Data fetching works correctly

### Integration Testing

**Test Scenarios:**

1. **Discover Page Layout**
   - Desktop: Two columns display correctly
   - Mobile: Single column stacks properly
   - Sections appear in correct order
   - All data loads and displays

2. **Navigation Flow**
   - Home → Discover (via "View All" buttons)
   - Home → Dashboard (via "View All" on Recent Activity)
   - Header → Activity Feed (via bell icon dropdown)

3. **Data Consistency**
   - Same data appears on Home and Discover (when cached)
   - Cache works across page navigation
   - Fresh data fetched after cache expires

### Manual Testing Checklist

**Desktop Testing:**
- [ ] Discover page shows two-column layout
- [ ] Left column has both trending track sections
- [ ] Right column has Suggested + both creator sections
- [ ] Analytics page no longer shows TrendingSection
- [ ] Home page shows exactly 3 items per section
- [ ] All "View All" buttons navigate correctly
- [ ] Activity Feed link is in bell icon dropdown
- [ ] Activity Feed link removed from main nav

**Mobile Testing:**
- [ ] Discover page shows single-column layout
- [ ] Sections stack in correct order
- [ ] All cards are readable and tappable
- [ ] Bell icon dropdown is accessible
- [ ] Activity Feed link works in dropdown

**Cross-Browser Testing:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

**Performance Testing:**
- [ ] Page load time < 3 seconds
- [ ] No layout shifts during load
- [ ] Smooth scrolling on all pages
- [ ] Cache reduces subsequent load times

## Responsive Design Specifications

### Breakpoints

```css
/* Mobile First Approach */
/* Default: Mobile (< 1024px) */
.discover-layout {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Desktop (≥ 1024px) */
@media (min-width: 1024px) {
  .discover-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
}
```

### Tailwind CSS Classes

```typescript
// Two-column layout with responsive behavior
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  {/* Left Column */}
  <div className="space-y-8">
    {/* Track sections */}
  </div>
  
  {/* Right Column */}
  <div className="space-y-8">
    {/* Creator sections */}
  </div>
</div>
```

### Mobile Optimization

**Touch Targets:**
- Minimum 44px height for all interactive elements
- Adequate spacing between clickable items
- Large enough text for readability (16px minimum)

**Performance:**
- Lazy load images if needed
- Use loading skeletons for perceived performance
- Minimize layout shifts with proper sizing

## Security Considerations

### No New Security Concerns

This feature involves UI reorganization only, with no changes to:
- Authentication or authorization
- Data access patterns
- API endpoints
- Database queries
- User permissions

### Existing Security Maintained

All existing security measures are preserved:
- Row Level Security (RLS) on database queries
- Authentication checks on protected pages
- Secure data fetching through Supabase client
- No exposure of sensitive data

## Performance Optimization

### Caching Strategy

**Existing Cache (Preserved):**
```typescript
// 5-minute cache for analytics data
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedAnalytics<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

**Cache Keys:**
- Home page: `home_trending_7d`, `home_popular_creators_7d`
- Discover page: `trending_7d`, `trending_all`, `creators_7d`, `creators_all`
- Analytics page: (no longer uses trending cache)

### Concurrent Data Fetching

```typescript
// Fetch all data sources in parallel
const [trending7d, trendingAll, creators7d, creatorsAll] = await Promise.all([
  getCachedAnalytics('trending_7d', getTrendingTracks7Days),
  getCachedAnalytics('trending_all', getTrendingTracksAllTime),
  getCachedAnalytics('creators_7d', getPopularCreators7Days),
  getCachedAnalytics('creators_all', getPopularCreatorsAllTime),
]);
```

### React Optimization

**Memoization:**
```typescript
// Memoize expensive computations
const trendingTracks = useMemo(() => 
  allTracks.slice(0, 3), 
  [allTracks]
);

// Memoize callbacks
const handleViewAll = useCallback(() => {
  router.push('/discover');
}, [router]);
```

**Component Splitting:**
- Keep TrendingSection as a separate component
- Lazy load if needed (though not required for this feature)
- Use React.memo for pure components

## Migration Strategy

### Deployment Approach

**Single Deployment:**
All changes can be deployed together as they are UI-only and don't require database migrations or API changes.

**Rollback Plan:**
If issues arise, rollback is straightforward:
1. Revert code changes
2. No database rollback needed
3. Cache will clear naturally after 5 minutes

### User Impact

**Minimal Disruption:**
- No breaking changes to existing functionality
- All features continue to work
- Users may notice improved organization
- No data loss or corruption risk

**User Communication:**
- Optional: Announce improved Discover page layout
- Optional: Highlight easier access to Activity Feed



## Implementation Details

### File Changes Summary

**Files to Modify:**
1. `client/src/app/discover/page.tsx` - Add two-column layout, TrendingSection, and update UserRecommendations limit to 8
2. `client/src/app/analytics/page.tsx` - Remove TrendingSection
3. `client/src/components/AuthenticatedHome.tsx` - Limit to 3 items, fix navigation
4. `client/src/components/layout/Header.tsx` (or similar) - Move Activity Feed link

**Files to Create:**
1. `client/src/components/discover/DiscoverTrendingSection.tsx` (optional, if needed)

**Files to Read (for context):**
1. `client/src/components/analytics/TrendingSection.tsx` - Understand structure
2. `client/src/components/analytics/TrendingTrackCard.tsx` - Reuse component
3. `client/src/components/analytics/PopularCreatorCard.tsx` - Reuse component
4. `client/src/lib/trendingAnalytics.ts` - Understand data fetching

### Code Patterns to Follow

**Import Pattern:**
```typescript
// Use absolute imports with @ alias
import { TrendingSection } from '@/components/analytics/TrendingSection';
import { getTrendingTracks7Days } from '@/lib/trendingAnalytics';
```

**Component Pattern:**
```typescript
// Functional components with TypeScript
export default function ComponentName() {
  // State
  const [data, setData] = useState<Type[]>([]);
  
  // Effects
  useEffect(() => {
    loadData();
  }, []);
  
  // Handlers
  const handleAction = () => {
    // Implementation
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

**Styling Pattern:**
```typescript
// Use Tailwind CSS utility classes
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div className="space-y-8">
    {/* Content */}
  </div>
</div>
```

### TypeScript Considerations

**Type Safety:**
```typescript
// Import existing types
import type { TrendingTrack, PopularCreator } from '@/lib/trendingAnalytics';

// Use proper typing for state
const [tracks, setTracks] = useState<TrendingTrack[]>([]);
const [creators, setCreators] = useState<PopularCreator[]>([]);

// Type function parameters
const handleClick = (trackId: string): void => {
  // Implementation
};
```

**No Type Errors:**
- All imports must resolve correctly
- All props must match component interfaces
- All function calls must have correct parameters

## Design Decisions and Rationale

### Decision 1: Reuse TrendingSection vs. Create New Component

**Options Considered:**
1. Import and reuse TrendingSection as-is
2. Create DiscoverTrendingSection wrapper
3. Duplicate TrendingSection code

**Decision: Create DiscoverTrendingSection wrapper**

**Rationale:**
- Provides flexibility for two-column layout
- Maintains single source of truth for data fetching
- Allows independent rendering of track/creator sections
- Avoids complex CSS to reflow existing component
- Keeps TrendingSection unchanged for potential future use

### Decision 2: Two-Column Layout Implementation

**Options Considered:**
1. CSS Grid with `grid-template-columns: 1fr 1fr`
2. Flexbox with `flex-direction: row`
3. Separate pages for tracks and creators

**Decision: CSS Grid with Tailwind classes**

**Rationale:**
- Grid provides better control over column sizing
- Tailwind's responsive classes make mobile adaptation easy
- Semantic HTML structure with clear column separation
- Easy to maintain and understand

### Decision 3: Home Page Item Limit

**Options Considered:**
1. Fetch only 3 items from database
2. Fetch full dataset, slice to 3 in component
3. Add limit parameter to data fetching functions

**Decision: Fetch full dataset, slice to 3**

**Rationale:**
- Maintains cache efficiency (same data for all pages)
- No changes to data fetching functions
- Flexibility to change limit without backend changes
- Cache can be reused by other pages

### Decision 4: Activity Feed Link Placement

**Options Considered:**
1. Keep in main navigation
2. Move to bell icon dropdown
3. Move to user profile dropdown
4. Remove entirely

**Decision: Move to bell icon dropdown**

**Rationale:**
- Activity Feed is related to notifications
- Reduces clutter in main navigation
- Logical grouping of activity-related features
- Maintains easy access for users

## Accessibility Considerations

### Keyboard Navigation

**Requirements:**
- All interactive elements must be keyboard accessible
- Tab order must be logical
- Focus indicators must be visible

**Implementation:**
```typescript
// Ensure proper tab order
<button
  onClick={handleClick}
  className="focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  View All
</button>
```

### Screen Reader Support

**Requirements:**
- Section headings must use proper heading hierarchy
- Links must have descriptive text
- Loading states must be announced

**Implementation:**
```typescript
// Proper heading hierarchy
<h1>Discover</h1>
<h2>Trending This Week</h2>
<h3>Track Title</h3>

// Descriptive link text
<Link href="/discover" aria-label="View all trending tracks">
  View All
</Link>

// Loading announcement
<div role="status" aria-live="polite">
  {loading ? 'Loading trending tracks...' : null}
</div>
```

### Color Contrast

**Requirements:**
- Text must meet WCAG 2.1 AA standards (4.5:1 ratio)
- Interactive elements must be distinguishable

**Verification:**
- Use existing color scheme (already compliant)
- Test with browser dev tools contrast checker

## Future Enhancements

### Potential Improvements (Out of Scope)

1. **Filtering Options**
   - Filter by genre, mood, or time period
   - Sort by different metrics

2. **Personalization**
   - Show different content based on user preferences
   - Machine learning recommendations

3. **Infinite Scroll**
   - Load more items as user scrolls
   - Pagination for large datasets

4. **Advanced Analytics**
   - Detailed charts and graphs
   - Export data functionality

5. **Social Features**
   - Share trending tracks
   - Follow trending creators directly

These enhancements are not part of this specification but could be considered for future iterations.

## Summary

This design document outlines a straightforward approach to reorganizing the Discover page by:

1. **Reusing existing components** (TrendingSection, TrendingTrackCard, PopularCreatorCard)
2. **Implementing a responsive two-column layout** using CSS Grid and Tailwind
3. **Optimizing the Home page** by limiting sections to 3 items
4. **Improving navigation** by moving Activity Feed to bell icon dropdown
5. **Maintaining all existing functionality** without breaking changes

The design emphasizes code reuse, minimal changes, and preservation of existing functionality while improving the user experience through better organization and layout.
