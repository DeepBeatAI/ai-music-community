# Design Document

## Overview

This design document outlines the implementation of a "See posts from this creator" button feature for the dashboard search results. The feature will allow users to filter posts by a specific creator directly from the search results, providing a seamless way to explore content from individual creators without requiring additional navigation or search operations.

## Architecture

### Component Integration Points

The feature integrates with the existing dashboard architecture at several key points:

1. **Creator Cards in Search Results**: Each creator card in the "Search Results: Creators" section will include the new button
2. **Filter State Management**: The existing `currentFilters` state and `handleFiltersChange` function will be extended to support creator filtering
3. **Search Utility**: The `SearchFilters` interface will be extended to include a `creatorId` field
4. **URL State Management**: The filter state will be reflected in the URL for bookmarking and sharing

### State Management Flow

```mermaid
graph TD
    A[User clicks "See posts from creator"] --> B[Update currentFilters with creatorId]
    B --> C[handleFiltersChange called with new filters]
    C --> D[Apply creator filter to existing posts]
    D --> E[Update filteredPosts state]
    E --> F[Display filtered posts with creator indicator]
    F --> G[Show clear filter option]
    G --> H[User can clear creator filter]
    H --> I[Return to original search state]
```

## Components and Interfaces

### Extended SearchFilters Interface

```typescript
export interface SearchFilters {
  query?: string;
  postType?: 'all' | 'text' | 'audio' | 'creators';
  aiTool?: string;
  sortBy?: 'relevance' | 'recent' | 'oldest' | 'popular' | 'likes';
  timeRange?: 'all' | 'today' | 'week' | 'month';
  creatorId?: string; // NEW: Filter by specific creator
  creatorUsername?: string; // NEW: For display purposes
}
```

### Creator Filter Button Component

A new button component will be added to each creator card:

```typescript
interface CreatorFilterButtonProps {
  creatorId: string;
  creatorUsername: string;
  onFilterByCreator: (creatorId: string, username: string) => void;
  isActive?: boolean;
}
```

### Filter Indicator Component

A new component to show active creator filter:

```typescript
interface CreatorFilterIndicatorProps {
  creatorUsername: string;
  onClearFilter: () => void;
}
```

## Data Models

### Creator Filter State

The creator filter will be managed as part of the existing filter state:

```typescript
// Extended currentFilters state
const [currentFilters, setCurrentFilters] = useState<SearchFilters>({
  // existing filters...
  creatorId?: string;
  creatorUsername?: string;
});
```

### Posts Filtering Logic

The existing `applyFiltersDirectly` function will be extended to handle creator filtering:

```typescript
// New filter condition in applyFiltersDirectly
if (filters.creatorId) {
  const before = filtered.length;
  filtered = filtered.filter(post => post.user_id === filters.creatorId);
  console.log(`✓ Creator filter (${filters.creatorUsername}): ${before} → ${filtered.length}`);
}
```

## Error Handling

### Filter State Validation

- Validate that `creatorId` exists and is a valid UUID format
- Handle cases where the creator has no posts matching other active filters
- Gracefully handle network errors when applying filters

### User Experience Error States

- Display appropriate message when no posts found for selected creator
- Provide clear path to remove creator filter if no results
- Maintain other filter states when creator filter fails

### Error Recovery

```typescript
const handleCreatorFilter = useCallback(async (creatorId: string, username: string) => {
  try {
    const newFilters = {
      ...currentFilters,
      creatorId,
      creatorUsername: username
    };
    
    await handleFiltersChange(newFilters);
  } catch (error) {
    console.error('Error applying creator filter:', error);
    // Show user-friendly error message
    setError('Unable to filter by creator. Please try again.');
    // Don't update filter state on error
  }
}, [currentFilters, handleFiltersChange]);
```

## Testing Strategy

### Unit Testing

1. **Filter Logic Testing**
   - Test `applyFiltersDirectly` with creator filter
   - Test filter combination scenarios (creator + time range + post type)
   - Test edge cases (invalid creator ID, no posts found)

2. **Component Testing**
   - Test creator filter button click behavior
   - Test filter indicator display and clear functionality
   - Test visual states (active/inactive button states)

### Integration Testing

1. **Search Flow Testing**
   - Test complete flow from search → creator selection → filtered results
   - Test filter persistence across page interactions
   - Test URL state management for creator filters

2. **State Management Testing**
   - Test filter state updates and synchronization
   - Test interaction with existing filters
   - Test clear filter functionality

### User Experience Testing

1. **Visual Feedback Testing**
   - Verify active creator filter indication
   - Test loading states during filter application
   - Verify clear filter button visibility and functionality

2. **Performance Testing**
   - Test filter application performance with large datasets
   - Verify no duplicate posts in filtered results
   - Test memory usage with multiple filter operations

## Implementation Approach

### Phase 1: Core Functionality

1. Extend `SearchFilters` interface with creator fields
2. Add creator filter logic to `applyFiltersDirectly` function
3. Create creator filter button component
4. Integrate button into existing creator cards

### Phase 2: User Experience Enhancements

1. Add creator filter indicator component
2. Implement visual feedback for active filters
3. Add clear filter functionality
4. Handle edge cases and error states

### Phase 3: State Management

1. Implement URL state reflection for creator filters
2. Add filter persistence across navigation
3. Optimize performance for filter operations
4. Add comprehensive error handling

## Security Considerations

### Input Validation

- Validate creator ID format (UUID) before applying filter
- Sanitize creator username for display purposes
- Prevent injection attacks through filter parameters

### Access Control

- Ensure users can only filter by public creator profiles
- Respect any privacy settings for creator visibility
- Handle deleted or deactivated creator accounts gracefully

## Performance Considerations

### Filter Optimization

- Leverage existing post deduplication logic
- Minimize database queries by filtering client-side when possible
- Cache creator information to avoid repeated lookups

### Memory Management

- Reuse existing filtered posts array when possible
- Clear unnecessary filter state when switching between creators
- Optimize re-renders when filter state changes

### Network Efficiency

- Batch creator information requests when possible
- Use existing search results cache for creator data
- Minimize redundant API calls during filter operations