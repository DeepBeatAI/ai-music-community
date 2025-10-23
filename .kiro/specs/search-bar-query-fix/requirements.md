# Requirements Document

## Introduction

This specification addresses a critical bug in the dashboard search functionality where typing in the search bar generates malformed PostgREST queries, resulting in 400 Bad Request errors. The issue stems from an incorrect `.or()` query syntax that attempts to search across related tables (like `track.title` and `track.description`) which PostgREST does not support in a single `.or()` clause.

## Glossary

- **PostgREST**: The REST API layer that Supabase uses to interact with PostgreSQL databases
- **Search Bar**: The input field on the dashboard page where users can search for posts and creators
- **Query Filter**: The `.or()` method used to search across multiple columns in Supabase queries
- **Related Table**: A table joined via foreign key relationship (e.g., `tracks` table related to `posts` table)
- **Search Utility**: The `searchContent` function in `client/src/utils/search.ts` that handles search operations

## Requirements

### Requirement 1: Fix Malformed PostgREST Query

**User Story:** As a user, I want to search for content in the dashboard search bar without encountering errors, so that I can find posts and creators efficiently.

#### Acceptance Criteria

1. WHEN a user types in the search bar, THE Search Utility SHALL construct a valid PostgREST query that does not attempt to use `.or()` syntax with related table columns
2. WHEN searching for posts, THE Search Utility SHALL search only in the main `posts` table columns (content, audio_filename) using the `.or()` method
3. WHEN searching for posts with track information, THE Search Utility SHALL apply separate filters for related `tracks` table columns (title, description) after the initial query
4. WHEN a search query is executed, THE Search Utility SHALL return results without generating 400 Bad Request errors
5. WHEN a search completes successfully, THE Search Utility SHALL return posts that match the query in content, audio_filename, track title, or track description

### Requirement 2: Maintain Search Functionality

**User Story:** As a user, I want search results to include all relevant matches across post content and track metadata, so that I can find what I'm looking for comprehensively.

#### Acceptance Criteria

1. WHEN a user searches for a term, THE Search Utility SHALL return posts where the term appears in the post content field
2. WHEN a user searches for a term, THE Search Utility SHALL return posts where the term appears in the audio_filename field (for legacy support)
3. WHEN a user searches for a term, THE Search Utility SHALL return posts where the term appears in the related track's title field
4. WHEN a user searches for a term, THE Search Utility SHALL return posts where the term appears in the related track's description field
5. WHEN search results are returned, THE Search Utility SHALL maintain the existing sorting and filtering behavior (relevance, recent, likes, etc.)

### Requirement 3: Preserve Performance

**User Story:** As a user, I want search results to load quickly, so that I can find content without delays.

#### Acceptance Criteria

1. WHEN executing a search query, THE Search Utility SHALL complete the search operation in under 2 seconds for typical queries
2. WHEN filtering results client-side, THE Search Utility SHALL use efficient filtering algorithms that do not cause UI lag
3. WHEN a search is performed, THE Search Utility SHALL leverage existing caching mechanisms to avoid redundant database queries
4. WHEN processing search results, THE Search Utility SHALL minimize the number of database round-trips required
5. WHEN handling large result sets, THE Search Utility SHALL apply pagination limits to prevent performance degradation

### Requirement 4: Maintain Backward Compatibility

**User Story:** As a developer, I want the search fix to maintain compatibility with existing code, so that other features continue to work without modification.

#### Acceptance Criteria

1. WHEN the search utility is updated, THE Search Utility SHALL maintain the same function signature for `searchContent()`
2. WHEN the search utility is updated, THE Search Utility SHALL return results in the same data structure format
3. WHEN the search utility is updated, THE Search Utility SHALL support all existing filter parameters (postType, sortBy, timeRange, etc.)
4. WHEN the search utility is updated, THE Search Utility SHALL continue to work with the existing SearchBar component without modifications
5. WHEN the search utility is updated, THE Search Utility SHALL maintain compatibility with the dashboard page's filter handling logic
