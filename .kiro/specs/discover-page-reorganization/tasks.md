# Implementation Plan

## Overview

This implementation plan breaks down the Discover page reorganization into discrete, manageable tasks. Each task builds incrementally on previous work and includes specific requirements references.

## Task Execution Order

Tasks are organized by phase with clear dependencies. Complete all tasks in a phase before moving to the next phase.

---

## Phase 1: Analytics Page Cleanup

- [x] 1. Remove TrendingSection from Analytics Page

  - Open `client/src/app/analytics/page.tsx`
  - Remove the import statement for TrendingSection component
  - Remove the `<TrendingSection />` component usage (inside the `<div className="mt-8">` wrapper)
  - Verify MetricsGrid, ActivityChart, and MetricCollectionMonitor remain unchanged
  - Test that Analytics page still loads and displays metrics correctly
  - _Requirements: 1.5, 1.6_

---

## Phase 2: Discover Page Reorganization

- [x] 2. Create DiscoverTrendingSection wrapper component

  - Create new file: `client/src/components/discover/DiscoverTrendingSection.tsx`
  - Import data fetching functions from `@/lib/trendingAnalytics`
  - Import card components: TrendingTrackCard, PopularCreatorCard
  - Implement component with `type: 'tracks' | 'creators'` prop
  - Fetch all four data sources (trending 7d, trending all, creators 7d, creators all)
  - Render only tracks sections when `type='tracks'`
  - Render only creators sections when `type='creators'`
  - Include loading skeletons and error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8_

- [x] 3. Update Discover page with two-column layout

  - Open `client/src/app/discover/page.tsx`
  - Remove existing trending/popular data fetching logic
  - Import DiscoverTrendingSection component
  - Implement responsive grid layout: `grid grid-cols-1 lg:grid-cols-2 gap-8`
  - Left column: Add `<DiscoverTrendingSection type="tracks" />`

  - Right column: Keep UserRecommendations at top
  - Right column: Add `<DiscoverTrendingSection type="creators" />` below UserRecommendations
  - Remove old TrendingTrackCard and PopularCreatorCard rendering logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 4. Update UserRecommendations limit on Discover page

  - In `client/src/app/discover/page.tsx`
  - Update UserRecommendations component props
  - Change `limit` from 6 to 8
  - Verify `showProfileButton={true}` is set
  - Verify `title="Suggested for You"` is set
  - Test that 8 creator cards display correctly
  - _Requirements: 2.3 (right column content)_

---

## Phase 3: Header Navigation Update

- [x] 5. Locate and analyze header component

  - Search for header/navigation component files
  - Likely locations: `client/src/components/layout/Header.tsx` or `client/src/components/layout/MainLayout.tsx`
  - Identify where "Activity Feed" link is rendered in main navigation
  - Identify where bell icon dropdown menu is rendered
  - Document current structure for next task
  - _Requirements: 4.1, 4.2_

- [x] 6. Move Activity Feed link to bell icon dropdown

  - Remove "Activity Feed" link from main navigation bar
  - Add "Activity Feed" link to bell icon dropdown menu
  - Position link at the top of the dropdown (before notifications)
  - Use consistent styling with other dropdown menu items
  - Include appropriate icon (activity/feed icon)
  - Ensure link navigates to `/feed` page
  - Test dropdown functionality on desktop

  - Test dropdown functionality on mobile
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

---

## Phase 4: Home Page Optimization

- [x] 7. Update Home page section limits

  - Open `client/src/components/AuthenticatedHome.tsx`
  - In `loadHomeContent` function, update `setTrendingTracks` to slice to 3 items: `trending.slice(0, 3)`
  - Update `setRecentActivity` to slice to 3 items: `activity.slice(0, 3)`
  - Verify `setPopularCreators` already slices to 3 items: `popular.slice(0, 3)`
  - Remove any additional slicing in the render section (data should already be limited)
  - Test that all three sections display exactly 3 items
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Fix Home page "View All" button navigation

  - In `client/src/components/AuthenticatedHome.tsx`
  - Find "Recent Activity" section's "View All" button
  - Change `onClick` from `router.push('/feed')` to `router.push('/dashboard')`
  - Find "Trending This Week" section's "View All" button
  - Change `onClick` from `router.push('/analytics')` to `router.push('/discover')`
  - Find "Popular Creators" section's "View All" button
  - Change `onClick` from `router.push('/analytics')` to `router.push('/discover')`
  - Test all three navigation links
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

---

## Phase 5: Testing and Validation

- [x] 9. Run TypeScript and linting checks

  - Run `npm run type-check` or equivalent TypeScript validation
  - Fix any TypeScript errors in modified files
  - Run `npm run lint` or equivalent linting validation
  - Fix any linting errors or warnings
  - Use getDiagnostics tool on all modified files
  - Ensure no errors remain before proceeding
  - _Requirements: All requirements (code quality)_

- [x] 10. Test Discover page layout and functionality


  - Test desktop two-column layout (≥1024px width)
  - Test mobile single-column layout (<1024px width)
  - Verify left column shows both trending track sections
  - Verify right column shows Suggested for You + both creator sections
  - Test play buttons on trending tracks
  - Test creator profile links
  - Test loading states and error handling
  - Verify responsive breakpoints work smoothly
  - _Requirements: 2.1-2.8, 7.1-7.8, 8.1-8.8_

- [x] 11. Test Analytics page


  - Navigate to `/analytics` page
  - Verify TrendingSection is no longer displayed
  - Verify MetricsGrid displays correctly
  - Verify ActivityChart displays correctly
  - Verify MetricCollectionMonitor displays correctly
  - Test refresh functionality
  - Verify no console errors
  - _Requirements: 1.5, 1.6_

- [x] 12. Test Home page


  - Navigate to `/` (home) page when authenticated
  - Verify "Recent Activity" shows exactly 3 items
  - Verify "Trending This Week" shows exactly 3 items
  - Verify "Popular Creators" shows exactly 3 items
  - Click "View All" on Recent Activity → should go to `/dashboard`
  - Click "View All" on Trending This Week → should go to `/discover`
  - Click "View All" on Popular Creators → should go to `/discover`
  - Verify all navigation works correctly
  - _Requirements: 3.1-3.8, 5.1-5.8_

- [x] 13. Test header navigation


  - Verify "Activity Feed" link is NOT in main navigation
  - Hover over bell icon in header
  - Verify dropdown menu appears
  - Verify "Activity Feed" link is in the dropdown
  - Click "Activity Feed" link → should go to `/feed`
  - Test on desktop browser
  - Test on mobile browser or responsive mode
  - Verify dropdown closes after navigation
  - _Requirements: 4.1-4.8_

- [x] 14. Test data consistency across pages


  - Navigate to Home page, note trending tracks and creators
  - Navigate to Discover page within 5 minutes (cache window)
  - Verify same data appears (cached)
  - Wait 5+ minutes for cache to expire
  - Refresh Discover page
  - Verify fresh data is fetched
  - Test that play buttons work on all pages
  - Test that creator links work on all pages
  - _Requirements: 6.1-6.8, 7.1-7.8_

- [x] 15. Cross-browser and performance testing


  - Test in Chrome/Edge (Chromium)
  - Test in Firefox
  - Test in Safari (if available)
  - Verify page load time < 3 seconds
  - Verify no layout shifts during load
  - Verify smooth scrolling on all pages
  - Test touch interactions on mobile
  - Verify all touch targets are ≥44px
  - _Requirements: 8.1-8.8, 9.1-9.8_

---

## Notes

- **Code Reuse**: Always import and reuse existing components. Never duplicate code.
- **Testing**: Test each phase before moving to the next.
- **TypeScript**: Fix all type errors immediately.
- **User Testing**: Pause after Phase 4 for user validation before final testing phase.
- **Rollback**: If issues arise, changes can be reverted without database impact.

## Success Criteria

All tasks are complete when:

- ✅ Discover page displays two-column layout with all four trending/popular sections
- ✅ Analytics page no longer shows TrendingSection
- ✅ Home page shows exactly 3 items per section
- ✅ All "View All" buttons navigate correctly
- ✅ Activity Feed link is in bell icon dropdown
- ✅ No TypeScript or linting errors
- ✅ All tests pass
- ✅ User testing confirms improved experience
