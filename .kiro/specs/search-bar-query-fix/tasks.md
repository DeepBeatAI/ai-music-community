# Implementation Plan

- [x] 1. Fix the malformed PostgREST query in searchContent()

  - Modify the `.or()` query to only include posts table columns (content, audio_filename)
  - Remove track.title and track.description from the `.or()` clause
  - Add console logging to track query construction
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. Implement client-side filtering for track columns

  - Add filtering logic after the database query executes
  - Check if posts have matching track titles or descriptions
  - Ensure posts without tracks are handled correctly
  - Preserve posts that match in either posts columns OR track columns
  - _Requirements: 1.3, 2.3, 2.4_

- [x] 3. Verify search functionality and error handling

  - Test that search queries no longer generate 400 errors
  - Verify all search result types are returned (content, audio_filename, track title, track description matches)
  - Confirm existing sorting and filtering behavior is maintained
  - Check that the searchCache integration still works
  - _Requirements: 1.5, 2.1, 2.2, 2.5, 4.3_

- [x] 4. Validate performance and backward compatibility

  - Measure query execution time to ensure it's under 2 seconds
  - Verify the function signature and return type are unchanged
  - Test with the existing SearchBar component to ensure no breaking changes
  - Confirm dashboard page filter handling continues to work
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.4, 4.5_
