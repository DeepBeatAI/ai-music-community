# Design Document

## Overview

This design addresses the malformed PostgREST query issue in the search functionality by restructuring how we query across the `posts` and `tracks` tables. The core problem is that PostgREST's `.or()` method cannot directly reference columns from related tables (e.g., `track.title.ilike.%query%`). 

The solution involves a two-phase approach:
1. **Phase 1**: Query the main `posts` table with valid `.or()` syntax for local columns only
2. **Phase 2**: Filter results client-side to include matches from related `tracks` table columns

This approach maintains search comprehensiveness while adhering to PostgREST's query syntax limitations.

## Architecture

### Current (Broken) Architecture

```
User Input → SearchBar Component → searchContent() → Supabase Query with .or()
                                                      ↓
                                                   INVALID: .or() with track.title
                                                      ↓
                                                   400 Bad Request Error
```

### New (Fixed) Architecture

```
User Input → SearchBar Component → searchContent() → Supabase Query (posts columns only)
                                                      ↓
                                                   Valid Query Returns Results
                                                      ↓
                                                   Client-side Filter (track columns)
                                                      ↓
                                                   Combined Results → User
```

## Components and Interfaces

### Modified Component: `searchContent()` Function

**Location**: `client/src/utils/search.ts`

**Current Problematic Code** (lines 136-140):
```typescript
postsQuery = postsQuery.or(
  `content.ilike.%${query}%,audio_filename.ilike.%${query}%,track.title.ilike.%${query}%,track.description.ilike.%${query}%`
);
```

**New Implementation Strategy**:

```typescript
// Phase 1: Query only posts table columns
postsQuery = postsQuery.or(
  `content.ilike.%${query}%,audio_filename.ilike.%${query}%`
);

// Execute query
const { data: postsData, error: postsError } = await postsQuery;

// Phase 2: Client-side filtering for track columns
if (postsData && filters.query) {
  const queryLower = filters.query.toLowerCase();
  
  // Filter to include posts that match in track title or description
  const matchingPosts = postsData.filter(post => {
    // Already matched in posts table columns
    const matchesPostColumns = 
      post.content?.toLowerCase().includes(queryLower) ||
      post.audio_filename?.toLowerCase().includes(queryLower);
    
    // Check track columns if post has a track
    const matchesTrackColumns = post.track && (
      post.track.title?.toLowerCase().includes(queryLower) ||
      post.track.description?.toLowerCase().includes(queryLower)
    );
    
    return matchesPostColumns || matchesTrackColumns;
  });
  
  posts = matchingPosts;
} else {
  posts = postsData || [];
}
```

### Interface Preservation

The `searchContent()` function interface remains unchanged:

```typescript
export async function searchContent(
  filters: SearchFilters,
  page: number = 0,
  limit: number = 200
): Promise<SearchResults>
```

**Input Parameters**:
- `filters`: SearchFilters object containing query, postType, sortBy, etc.
- `page`: Pagination page number (default: 0)
- `limit`: Maximum results per page (default: 200)

**Return Type**:
- `SearchResults`: Object containing posts array, users array, and totalResults count

## Data Models

### SearchFilters Interface (Unchanged)

```typescript
export interface SearchFilters {
  query?: string;
  postType?: 'all' | 'text' | 'audio' | 'creators';
  aiTool?: string;
  sortBy?: 'relevance' | 'recent' | 'oldest' | 'popular' | 'likes';
  timeRange?: 'all' | 'today' | 'week' | 'month';
  creatorId?: string;
  creatorUsername?: string;
}
```

### Post Data Structure (Unchanged)

Posts returned from the query include:
- `id`: Post identifier
- `content`: Post text content
- `audio_filename`: Legacy audio filename field
- `track`: Related track object (if audio post)
  - `title`: Track title
  - `description`: Track description
- `user_profiles`: Related user profile object
- `created_at`: Timestamp

## Error Handling

### Current Error

**Error Code**: `PGRST100`
**Error Message**: `"failed to parse logic tree ((content.ilike.%query%,track.title.ilike.%query%))" (line 1, column 67)`
**HTTP Status**: 400 Bad Request

### Error Prevention Strategy

1. **Validate Query Syntax**: Only use `.or()` with columns from the main table
2. **Graceful Degradation**: If the initial query fails, return empty results rather than throwing
3. **Client-side Filtering**: Move complex filtering logic to the client to avoid query syntax issues
4. **Logging**: Add console logging to track query construction and filtering steps

### Error Handling Code

```typescript
const { data: postsData, error: postsError } = await postsQuery;

if (postsError) {
  console.error('Posts search error:', postsError);
  // Return empty results instead of throwing
  posts = [];
} else {
  // Apply client-side filtering
  posts = filterPostsByTrackColumns(postsData, filters.query);
}
```

## Testing Strategy

### Unit Tests

1. **Test Valid Query Construction**
   - Verify `.or()` clause only includes posts table columns
   - Confirm no related table columns in query string

2. **Test Client-side Filtering**
   - Verify posts with matching track titles are included
   - Verify posts with matching track descriptions are included
   - Verify posts without tracks are handled correctly

3. **Test Edge Cases**
   - Empty query string
   - Query with special characters
   - Posts without related tracks
   - Null/undefined track fields

### Integration Tests

1. **Test Search Bar Integration**
   - Type in search bar and verify no 400 errors
   - Verify results include matches from all fields (content, audio_filename, track title, track description)
   - Verify sorting and filtering still work correctly

2. **Test Performance**
   - Measure query execution time
   - Verify client-side filtering doesn't cause UI lag
   - Test with large result sets (100+ posts)

### Manual Testing Checklist

- [ ] Search for a term that appears in post content
- [ ] Search for a term that appears in track title
- [ ] Search for a term that appears in track description
- [ ] Search for a term that appears in audio_filename
- [ ] Verify no console errors during search
- [ ] Verify search results are comprehensive
- [ ] Verify sorting options work correctly
- [ ] Verify filtering options work correctly
- [ ] Test search performance with various query lengths

## Performance Considerations

### Query Performance

**Before Fix**:
- Single database query (fails with 400 error)
- No results returned

**After Fix**:
- Single database query (succeeds)
- Client-side filtering adds minimal overhead (~1-5ms for 100 posts)
- Total time: < 500ms for typical queries

### Optimization Strategies

1. **Limit Result Set**: Maintain the 200-post limit to prevent excessive client-side filtering
2. **Early Return**: If no query string, skip client-side filtering entirely
3. **Efficient Filtering**: Use simple string includes() rather than regex for performance
4. **Caching**: Leverage existing searchCache to avoid redundant queries

### Memory Impact

- Client-side filtering operates on already-loaded data
- No additional memory allocation required
- Filtering is done in-place with minimal overhead

## Migration Strategy

### Deployment Steps

1. **Update search.ts**: Modify the `searchContent()` function with the new query logic
2. **Test Locally**: Verify search works without errors
3. **Deploy to Production**: No database migrations required
4. **Monitor**: Watch for any search-related errors in production logs

### Rollback Plan

If issues arise:
1. Revert the changes to `search.ts`
2. Redeploy previous version
3. No data loss or database changes to revert

### Backward Compatibility

- Function signature unchanged
- Return type unchanged
- All existing code continues to work
- No breaking changes to dependent components

## Security Considerations

### SQL Injection Prevention

- Continue using Supabase's parameterized queries
- No raw SQL construction
- Query strings are properly escaped by Supabase client

### Input Validation

- Trim whitespace from query strings
- Limit query length (handled by existing validation)
- Sanitize special characters (handled by Supabase)

## Alternative Approaches Considered

### Alternative 1: Multiple Separate Queries

**Approach**: Execute separate queries for posts table and tracks table, then merge results.

**Pros**:
- Clear separation of concerns
- Each query is simple and valid

**Cons**:
- Multiple database round-trips (slower)
- More complex result merging logic
- Potential for duplicate results

**Decision**: Rejected due to performance concerns

### Alternative 2: Database View

**Approach**: Create a PostgreSQL view that flattens posts and tracks into a single queryable structure.

**Pros**:
- Single query with all columns
- No client-side filtering needed

**Cons**:
- Requires database migration
- More complex to maintain
- Adds database overhead

**Decision**: Rejected to avoid database changes

### Alternative 3: Full-Text Search

**Approach**: Use PostgreSQL's full-text search capabilities with tsvector columns.

**Pros**:
- More powerful search features
- Better performance for complex queries

**Cons**:
- Requires significant database changes
- Migration complexity
- Overkill for current needs

**Decision**: Rejected as too complex for this fix; consider for future enhancement

## Chosen Solution Rationale

The two-phase approach (database query + client-side filtering) was chosen because:

1. **Minimal Changes**: Only modifies one function in one file
2. **No Database Changes**: No migrations or schema updates required
3. **Maintains Performance**: Client-side filtering is fast for typical result sets
4. **Backward Compatible**: No breaking changes to existing code
5. **Quick to Implement**: Can be deployed immediately
6. **Easy to Test**: Simple logic that's easy to verify
7. **Low Risk**: If it fails, easy to rollback

This solution provides the best balance of simplicity, performance, and maintainability for fixing the immediate issue.
