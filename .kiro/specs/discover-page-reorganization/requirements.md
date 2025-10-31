# Requirements Document

## Introduction

This specification defines the requirements for reorganizing the Discover page to consolidate trending tracks and popular creators information from the Analytics page, implementing a new two-column layout, and optimizing the Home page display limits and navigation. Currently, the Analytics and Discover pages both display trending tracks and popular creators, creating duplication. The Analytics page has more complete data (7-day and all-time views for both tracks and creators), which should be moved to the Discover page where users naturally expect to find discovery-focused content. Additionally, the Home page needs display limits and proper navigation links to improve user experience.

## Glossary

- **System**: The AI Music Community Platform
- **Analytics Page**: The `/analytics` page that displays platform-wide metrics, activity charts, and trending/popular data
- **Discover Page**: The `/discover` page designed for content discovery, currently showing trending tracks, popular creators, and personalized recommendations
- **Home Page**: The authenticated home page (`/`) showing recent activity, trending tracks, popular creators, and personalized recommendations
- **Dashboard Page**: The `/dashboard` page showing the user's activity feed from followed creators
- **Header Navigation**: The top navigation menu bar containing links to main pages and user actions
- **Bell Icon Menu**: The notification dropdown menu that appears when hovering over the bell icon in the header
- **Activity Feed Link**: Navigation link to the `/feed` page showing activity from followed creators
- **Trending Tracks**: Audio tracks ranked by engagement score (70% plays + 30% likes) within a time window
- **Popular Creators**: Users ranked by creator score (60% total plays + 40% total likes) within a time window
- **Suggested for You**: Personalized creator recommendations based on social proof and activity patterns
- **7-Day Window**: Content created or activity occurring within the last 7 days (168 hours)
- **All Time**: All content regardless of creation date
- **TrendingSection Component**: React component displaying the four sections of trending/popular data
- **View All Button**: Navigation button that redirects users to pages with complete data sets

## Requirements

### Requirement 1: Move Trending and Popular Sections from Analytics to Discover

**User Story:** As a user exploring the platform, I want to find all trending tracks and popular creators on the Discover page, so that I have a centralized location for content discovery without navigating to the Analytics page.

#### Acceptance Criteria

1. WHEN the System renders the Discover Page, THE System SHALL display the "Top 10 Trending Tracks (Last 7 Days)" section
2. WHEN the System renders the Discover Page, THE System SHALL display the "Top 10 Trending Tracks (All Time)" section
3. WHEN the System renders the Discover Page, THE System SHALL display the "Top 5 Popular Creators (Last 7 Days)" section
4. WHEN the System renders the Discover Page, THE System SHALL display the "Top 5 Popular Creators (All Time)" section
5. WHEN the System renders the Analytics Page, THE System SHALL NOT display the TrendingSection component
6. WHEN the System renders the Analytics Page, THE System SHALL continue to display platform metrics, activity charts, and metric collection monitoring
7. WHEN the sections are moved, THE System SHALL reuse the existing TrendingSection component from the Analytics page by importing it into the Discover page
8. WHEN the TrendingSection component is imported, THE System SHALL NOT rewrite or duplicate the component code
9. WHEN the sections are moved, THE System SHALL maintain all existing functionality including play buttons, creator links, and data fetching logic
10. WHEN the sections are moved, THE System SHALL preserve the same database functions and caching mechanisms

### Requirement 2: Implement Two-Column Layout on Discover Page

**User Story:** As a user browsing the Discover page, I want tracks and creators organized in separate columns, so that I can easily scan content by type and find what interests me.

#### Acceptance Criteria

1. WHEN the System renders the Discover Page on desktop, THE System SHALL display a two-column layout with tracks on the left and creators on the right
2. WHEN the left column is rendered, THE System SHALL display "Top 10 Trending Tracks (Last 7 Days)" followed by "Top 10 Trending Tracks (All Time)"
3. WHEN the right column is rendered, THE System SHALL display "Suggested for You" followed by "Top 5 Popular Creators (Last 7 Days)" followed by "Top 5 Popular Creators (All Time)"
4. WHEN the System renders the Discover Page on mobile, THE System SHALL display a single-column layout with sections stacked vertically in the order: Suggested for You, Trending Tracks (7 Days), Trending Tracks (All Time), Popular Creators (7 Days), Popular Creators (All Time)
5. WHEN the layout is rendered, THE System SHALL use responsive CSS grid or flexbox to ensure proper spacing and alignment
6. WHEN sections have no data, THE System SHALL display appropriate empty states without breaking the layout
7. WHEN the page is scrolled, THE System SHALL maintain the two-column structure without layout shifts
8. WHEN the viewport is resized, THE System SHALL smoothly transition between desktop and mobile layouts

### Requirement 3: Limit Home Page Section Display to 3 Items

**User Story:** As a user viewing the Home page, I want to see a concise preview of recent activity, trending tracks, and popular creators, so that I can quickly scan highlights without being overwhelmed by information.

#### Acceptance Criteria

1. WHEN the System displays "Recent Activity" on the Home Page, THE System SHALL show a maximum of 3 activity items
2. WHEN the System displays "Trending This Week" on the Home Page, THE System SHALL show a maximum of 3 trending tracks
3. WHEN the System displays "Popular Creators" on the Home Page, THE System SHALL show a maximum of 3 popular creators
4. WHEN the System fetches data for these sections, THE System SHALL continue to fetch the full dataset and cache it for 5 minutes
5. WHEN the System renders the sections, THE System SHALL slice the cached data to display only the first 3 items
6. WHEN a section has fewer than 3 items, THE System SHALL display all available items without errors
7. WHEN a section has no items, THE System SHALL display the appropriate empty state
8. WHEN the user clicks "View All" on any section, THE System SHALL navigate to the appropriate page with the complete dataset

### Requirement 4: Move Activity Feed Link to Bell Icon Menu

**User Story:** As a user navigating the platform, I want the Activity Feed link to be accessible from the notifications menu, so that I can quickly access my activity feed alongside my notifications in a logical grouping.

#### Acceptance Criteria

1. WHEN the System renders the header navigation, THE System SHALL NOT display the "Activity Feed" link in the main navigation menu
2. WHEN the user hovers over the bell icon in the header, THE System SHALL display a dropdown menu containing notifications
3. WHEN the bell icon dropdown menu is displayed, THE System SHALL include an "Activity Feed" link at the top or bottom of the menu
4. WHEN the user clicks the "Activity Feed" link in the dropdown, THE System SHALL navigate to the `/feed` page
5. WHEN the dropdown menu is rendered, THE System SHALL maintain consistent styling with other menu items
6. WHEN the user navigates away from the dropdown, THE System SHALL close the menu automatically
7. WHEN the Activity Feed link is clicked, THE System SHALL use Next.js router for client-side navigation
8. WHEN the header is rendered on mobile, THE System SHALL ensure the bell icon menu remains accessible and functional

### Requirement 5: Fix Home Page "View All" Button Navigation

**User Story:** As a user on the Home page, I want the "View All" buttons to take me to the correct pages where I can see complete data, so that I can easily explore more content when interested.

#### Acceptance Criteria

1. WHEN the user clicks "View All" next to "Recent Activity", THE System SHALL navigate to the `/dashboard` page
2. WHEN the user clicks "View All" next to "Trending This Week", THE System SHALL navigate to the `/discover` page
3. WHEN the user clicks "View All" next to "Popular Creators", THE System SHALL navigate to the `/discover` page
4. WHEN the navigation occurs, THE System SHALL preserve the user's authentication state
5. WHEN the user navigates to the target page, THE System SHALL display the complete dataset for the relevant section
6. WHEN the navigation button is rendered, THE System SHALL use consistent styling with other navigation elements
7. WHEN the user hovers over the button, THE System SHALL provide visual feedback indicating it is clickable
8. WHEN the button is clicked, THE System SHALL use Next.js router for client-side navigation without full page reload

### Requirement 6: Maintain Data Consistency Across Pages

**User Story:** As a user navigating between Home, Discover, and Analytics pages, I want to see consistent data based on the same calculations, so that I can trust the platform's metrics regardless of which page I'm viewing.

#### Acceptance Criteria

1. WHEN the System displays trending tracks on any page, THE System SHALL use the same database functions with consistent scoring formulas
2. WHEN the System displays popular creators on any page, THE System SHALL use the same database functions with consistent scoring formulas
3. WHEN the System caches analytics data, THE System SHALL use a 5-minute TTL across all pages
4. WHEN the System fetches trending or popular data, THE System SHALL use the shared cache to minimize redundant database queries
5. WHEN data is displayed on multiple pages, THE System SHALL show the same results if fetched within the cache window
6. WHEN the cache expires, THE System SHALL fetch fresh data from the database functions
7. WHEN database functions are called, THE System SHALL use the same time windows (7 days = 168 hours) across all pages
8. WHEN errors occur during data fetching, THE System SHALL handle them gracefully without crashing the page

### Requirement 7: Preserve Existing Functionality

**User Story:** As a developer, I want to ensure that moving sections between pages doesn't break existing functionality, so that users continue to have a seamless experience with all features working correctly.

#### Acceptance Criteria

1. WHEN trending tracks are displayed, THE System SHALL maintain the play button functionality using the PlaybackContext
2. WHEN the play button is clicked, THE System SHALL load the track into the mini player using getCachedAudioUrl
3. WHEN creator cards are displayed, THE System SHALL maintain clickable links to creator profiles
4. WHEN the user clicks a creator name or avatar, THE System SHALL navigate to the creator's profile page
5. WHEN sections are loading, THE System SHALL display loading skeletons matching the card layouts
6. WHEN data fetching fails, THE System SHALL display error messages with retry buttons
7. WHEN the user clicks retry, THE System SHALL attempt to fetch the data again
8. WHEN empty states are shown, THE System SHALL provide helpful guidance and action buttons

### Requirement 8: Responsive Design and Mobile Optimization

**User Story:** As a mobile user, I want the Discover page to work well on my device, so that I can browse trending content and creators comfortably on any screen size.

#### Acceptance Criteria

1. WHEN the System renders the Discover Page on screens wider than 1024px, THE System SHALL display the two-column layout
2. WHEN the System renders the Discover Page on screens narrower than 1024px, THE System SHALL display a single-column layout
3. WHEN the single-column layout is used, THE System SHALL stack sections vertically with appropriate spacing
4. WHEN cards are displayed on mobile, THE System SHALL ensure touch targets are at least 44px for accessibility
5. WHEN the user scrolls on mobile, THE System SHALL maintain smooth scrolling performance
6. WHEN images or avatars are loaded, THE System SHALL use appropriate sizes for the viewport
7. WHEN text is displayed, THE System SHALL ensure readability with proper font sizes and line heights
8. WHEN the layout changes, THE System SHALL use CSS transitions for smooth visual feedback

### Requirement 9: Performance Optimization

**User Story:** As a user, I want the Discover page to load quickly and respond smoothly, so that I can browse content without delays or lag.

#### Acceptance Criteria

1. WHEN the System loads the Discover Page, THE System SHALL fetch all data sources concurrently using Promise.all
2. WHEN cached data is available, THE System SHALL use it instead of making new database queries
3. WHEN the page renders, THE System SHALL display loading skeletons immediately to provide visual feedback
4. WHEN data is fetched, THE System SHALL update the UI progressively as each data source completes
5. WHEN the user navigates to the Discover Page multiple times, THE System SHALL leverage the 5-minute cache to reduce load times
6. WHEN components re-render, THE System SHALL use React memoization to prevent unnecessary re-renders
7. WHEN the page is loaded, THE System SHALL achieve a Time to Interactive (TTI) of less than 3 seconds
8. WHEN the user interacts with the page, THE System SHALL respond to clicks within 100ms

## Implementation Priority and Dependencies

### Phase 1: Analytics Page Cleanup (No Dependencies)
- Remove TrendingSection component from Analytics page
- Verify Analytics page still displays metrics, activity chart, and monitoring

### Phase 2: Discover Page Layout (Depends on Phase 1)
- Implement two-column responsive layout
- Move TrendingSection component to Discover page
- Integrate the four sections into the new layout
- Test responsive behavior on various screen sizes

### Phase 3: Header Navigation Update (Independent of Phases 1-2)
- Move Activity Feed link from main navigation to bell icon dropdown menu
- Test dropdown menu functionality
- Verify mobile responsiveness

### Phase 4: Home Page Optimization (Independent of Phases 1-3)
- Update display limits to 3 items per section
- Fix "View All" button navigation links
- Test navigation flows

### Phase 5: Testing and Validation (Depends on All Phases)
- Cross-browser testing
- Mobile device testing
- Performance validation
- Data consistency verification

## Non-Functional Requirements

### Performance
- Page load time SHALL be less than 3 seconds on 3G networks
- Time to Interactive SHALL be less than 3 seconds
- Cache hit rate SHALL be greater than 80% during normal usage
- Database queries SHALL complete in less than 100ms

### Usability
- Navigation SHALL be intuitive with clear visual hierarchy
- Empty states SHALL provide helpful guidance
- Error messages SHALL be user-friendly and actionable
- Loading states SHALL provide clear feedback

### Accessibility
- Touch targets SHALL be at least 44px for mobile users
- Color contrast SHALL meet WCAG 2.1 AA standards
- Keyboard navigation SHALL work for all interactive elements
- Screen readers SHALL announce section headings and content

### Maintainability
- Code SHALL follow existing project patterns and conventions
- Components SHALL be reusable and well-documented
- Changes SHALL not introduce TypeScript or linting errors
- Tests SHALL validate critical functionality

## Implementation Constraints

### Code Reuse Requirements

**CRITICAL: The implementation MUST reuse existing components without rewriting them.**

1. **TrendingSection Component**: The existing `TrendingSection` component from the Analytics page MUST be imported and reused in the Discover page. DO NOT rewrite or duplicate this component.

2. **TrendingTrackCard Component**: The existing `TrendingTrackCard` component MUST be reused as-is. DO NOT create new track card components.

3. **PopularCreatorCard Component**: The existing `PopularCreatorCard` component MUST be reused as-is. DO NOT create new creator card components.

4. **Data Fetching Functions**: The existing functions from `@/lib/trendingAnalytics` MUST be reused. DO NOT create new data fetching logic.

5. **Caching Mechanism**: The existing `getCachedAnalytics` wrapper MUST be reused. DO NOT implement new caching logic.

**Rationale**: These components are already working correctly on the Analytics page. Reusing them ensures consistency, reduces development time, prevents bugs, and maintains a single source of truth for trending/popular data display.

## Out of Scope

The following items are explicitly out of scope for this specification:

- Changes to the database functions or scoring formulas
- Modifications to the TrendingSection component's internal logic (only importing/positioning)
- Rewriting or duplicating existing components (TrendingSection, TrendingTrackCard, PopularCreatorCard)
- Changes to the Analytics page beyond removing the TrendingSection component
- Addition of new analytics or discovery features
- Changes to the caching mechanism or TTL values
- Modifications to the authentication or authorization logic
- Changes to the mini player or audio playback functionality
- Updates to the UserRecommendations component
- Changes to the activity feed logic or display
- Modifications to creator profile pages
- Updates to the dashboard page layout or functionality

## Success Criteria

This specification will be considered successfully implemented when:

1. The Discover page displays all four trending/popular sections in a two-column layout
2. The Analytics page no longer displays the TrendingSection component
3. The Activity Feed link is moved from the main header navigation to the bell icon dropdown menu
4. The Home page displays exactly 3 items per section (Recent Activity, Trending This Week, Popular Creators)
5. All "View All" buttons on the Home page navigate to the correct destinations
6. All existing functionality (play buttons, creator links, caching) continues to work
7. The layout is responsive and works well on mobile devices
8. No TypeScript or linting errors are introduced
9. Performance metrics meet the specified requirements
10. User testing confirms improved content discovery experience
11. All acceptance criteria for all requirements are met
