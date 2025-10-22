# Requirements Document: Tracks vs Posts Separation Analysis

## Introduction

This document analyzes the current confusion between "audio posts" and "tracks" concepts in the AI Music Community Platform and evaluates the feasibility and impact of separating these two entities. Currently, the platform uses a `posts` table that serves dual purposes: storing social media posts (text and audio) and acting as the audio track repository for features like playlists.

## Glossary

- **Post**: A social media content item created by a user, which can be either text-only or include audio content
- **Audio Post**: A post with `post_type = 'audio'` that includes an audio file attachment
- **Track**: An audio file entity that represents a musical composition or recording
- **Playlist System**: A feature that allows users to organize tracks into collections
- **Posts Table**: The current database table storing all post content including audio metadata
- **Tracks Table**: An existing but unused database table originally designed for audio files
- **Playlist Tracks Junction Table**: The `playlist_tracks` table that currently references `posts.id` as `track_id`

## Current State Analysis

### Requirement 1: Database Structure Assessment

**User Story:** As a platform architect, I want to understand the current database structure, so that I can identify structural inconsistencies.

#### Acceptance Criteria

1. WHEN analyzing the database schema, THE System SHALL identify that both `posts` and `tracks` tables exist in the database
2. WHEN examining the `posts` table, THE System SHALL confirm it contains columns for both social post data (`content`, `post_type`) and audio metadata (`audio_url`, `audio_filename`, `audio_duration`, `audio_file_size`, `audio_mime_type`)
3. WHEN examining the `tracks` table, THE System SHALL confirm it exists from the initial migration but is not currently used by the application
4. WHEN analyzing the `playlist_tracks` junction table, THE System SHALL identify that it references `posts.id` as the foreign key for `track_id`
5. WHEN reviewing the migration history, THE System SHALL document that `tracks` table was created in migration `001_initial_schema.sql` but playlists reference `posts` table created later

### Requirement 2: Application Code Assessment

**User Story:** As a developer, I want to understand how the codebase currently handles audio content, so that I can evaluate the impact of structural changes.

#### Acceptance Criteria

1. WHEN analyzing TypeScript types, THE System SHALL identify that the `Post` interface includes both social and audio-specific properties
2. WHEN examining utility functions, THE System SHALL confirm that `createAudioPost()` stores audio metadata directly in the `posts` table
3. WHEN reviewing component code, THE System SHALL identify that `PostItem` component treats audio posts as social content with embedded audio players
4. WHEN analyzing playlist functionality, THE System SHALL confirm that playlists reference post IDs rather than dedicated track IDs
5. WHEN examining the `AddToPlaylist` component, THE System SHALL verify it operates on post IDs for audio posts

### Requirement 3: Conceptual Model Evaluation

**User Story:** As a product designer, I want to understand the semantic difference between posts and tracks, so that I can design appropriate user experiences.

#### Acceptance Criteria

1. WHEN defining a "post", THE System SHALL recognize it as a social media content item with temporal relevance and social interactions (likes, comments, follows)
2. WHEN defining a "track", THE System SHALL recognize it as a reusable audio asset that can exist independently of social context

### Requirement 3A: Audio Compression System Assessment (NEW)

**User Story:** As a platform architect, I want to understand how the existing audio compression system integrates with tracks, so that I can ensure cost optimization is maintained.

#### Acceptance Criteria

1. WHEN analyzing the audio compression system, THE System SHALL identify that `serverAudioCompressor` and `audioCompression.ts` provide sophisticated compression capabilities
2. WHEN examining track upload implementation, THE System SHALL identify that `uploadTrack()` currently bypasses the compression system entirely
3. WHEN reviewing the `AudioUpload` component, THE System SHALL confirm that compression works in legacy mode but not in track mode
4. WHEN analyzing cost impact, THE System SHALL recognize that bypassing compression increases egress costs by 2-5x
5. WHEN examining the tracks table schema, THE System SHALL identify that compression metadata columns are missing
3. WHEN analyzing user workflows, THE System SHALL identify that users currently cannot upload tracks without creating a post
4. WHEN examining playlist use cases, THE System SHALL confirm that playlists should logically contain tracks rather than posts
5. WHEN considering future features, THE System SHALL identify that track-only uploads, track libraries, and track reuse across multiple posts would require separation

### Requirement 3B: Platform-Wide Integration Assessment (NEW)

**User Story:** As a developer, I want to identify all components that interact with audio posts, so that I can ensure complete integration with the new track structure.

#### Acceptance Criteria

1. WHEN analyzing platform components, THE System SHALL identify 40+ components that interact with audio posts or tracks
2. WHEN categorizing components, THE System SHALL classify them as Compatible (15), Needs Update (12), Critical Update (3), or Needs Review (10)
3. WHEN examining content delivery, THE System SHALL confirm that audio caching and URL management systems are compatible with tracks
4. WHEN reviewing post display components, THE System SHALL identify that `PostItem` and `AuthenticatedHome` require critical updates
5. WHEN analyzing search and discovery, THE System SHALL identify that search utilities need to join tracks table for audio metadata

## Proposed Separation Model

### Requirement 4: Separated Architecture Design

**User Story:** As a platform architect, I want to define a clear separation between tracks and posts, so that each entity serves its distinct purpose.

#### Acceptance Criteria

1. WHEN designing the new structure, THE System SHALL ensure tracks table stores audio file metadata and properties independent of social context
2. WHEN designing the new structure, THE System SHALL ensure posts table references tracks via a foreign key when post type is audio
3. WHEN a user uploads audio, THE System SHALL create a track record first, then optionally create a post that references the track
4. WHEN a user creates a playlist, THE System SHALL reference track IDs rather than post IDs
5. WHERE a track is used in multiple contexts, THE System SHALL allow the same track to be referenced by multiple posts or playlists
6. WHEN designing the tracks table, THE System SHALL include columns for compression metadata (original_file_size, compression_ratio, compression_applied)

### Requirement 4A: Audio Compression Integration (NEW - CRITICAL)

**User Story:** As a platform operator, I want track uploads to use audio compression, so that bandwidth costs are minimized.

#### Acceptance Criteria

1. WHEN a user uploads a track, THE System SHALL apply audio compression using the existing `serverAudioCompressor` before storage
2. WHEN compression is applied, THE System SHALL store compression metadata in the track record (original size, compressed size, ratio, bitrate)
3. WHEN compression fails, THE System SHALL fall back to uploading the original file and log the failure
4. WHEN tracking analytics, THE System SHALL record compression metrics using the existing `compressionAnalytics` system
5. WHEN displaying track information, THE System SHALL show compression savings to users where appropriate

### Requirement 5: Data Migration Requirements

**User Story:** As a database administrator, I want to migrate existing data safely, so that no user content is lost during the transition.

#### Acceptance Criteria

1. WHEN migrating existing audio posts, THE System SHALL create corresponding track records for each audio post
2. WHEN creating track records, THE System SHALL preserve all audio metadata from the posts table
3. WHEN updating posts table, THE System SHALL add a `track_id` foreign key column for audio posts
4. WHEN updating playlist_tracks table, THE System SHALL update all references from post IDs to track IDs
5. WHEN migration completes, THE System SHALL verify data integrity by confirming all audio posts have valid track references

### Requirement 6: Backward Compatibility Requirements

**User Story:** As a developer, I want to ensure existing functionality continues to work, so that users experience no disruption.

#### Acceptance Criteria

1. WHEN displaying audio posts, THE System SHALL fetch track data via the foreign key relationship
2. WHEN users interact with existing playlists, THE System SHALL resolve track references correctly
3. WHEN users like or comment on audio posts, THE System SHALL maintain all social interaction functionality
4. WHEN users add audio posts to playlists, THE System SHALL add the referenced track to the playlist
5. WHERE legacy code exists, THE System SHALL provide compatibility layers during the transition period

## Benefits Analysis

### Requirement 7: Architectural Benefits

**User Story:** As a platform architect, I want to understand the architectural improvements, so that I can justify the refactoring effort.

#### Acceptance Criteria

1. WHEN evaluating data modeling, THE System SHALL demonstrate improved semantic clarity with separated concerns
2. WHEN analyzing reusability, THE System SHALL enable tracks to be referenced by multiple posts without duplication
3. WHEN considering scalability, THE System SHALL support future features like track libraries and track-only uploads
4. WHEN examining query performance, THE System SHALL identify potential optimization opportunities with dedicated track queries
5. WHEN reviewing data integrity, THE System SHALL demonstrate clearer ownership and lifecycle management for audio assets

### Requirement 8: Feature Enablement Benefits

**User Story:** As a product manager, I want to understand what new features become possible, so that I can plan the product roadmap.

#### Acceptance Criteria

1. WHEN planning future features, THE System SHALL enable users to upload tracks to their library without creating posts
2. WHEN designing track management, THE System SHALL support dedicated track libraries and organization
3. WHEN implementing track reuse, THE System SHALL allow users to create multiple posts featuring the same track
4. WHEN building playlist features, THE System SHALL enable playlists to contain tracks that may not have associated posts
5. WHERE advanced features are needed, THE System SHALL support track versioning and track metadata management

## Risks and Challenges

### Requirement 9: Migration Complexity Assessment

**User Story:** As a technical lead, I want to understand migration risks, so that I can plan mitigation strategies.

#### Acceptance Criteria

1. WHEN estimating migration effort, THE System SHALL identify that data migration requires careful planning and testing
2. WHEN analyzing code changes, THE System SHALL estimate that multiple components require updates to use track references
3. WHEN considering rollback scenarios, THE System SHALL require a comprehensive rollback plan for failed migrations
4. WHEN evaluating testing requirements, THE System SHALL require extensive testing of all audio and playlist functionality
5. WHERE production data exists, THE System SHALL require zero-downtime migration strategy for live systems

### Requirement 10: Documentation Update Requirements

**User Story:** As a developer, I want all documentation to reflect the new structure, so that future development is not confused by outdated references.

#### Acceptance Criteria

1. WHEN updating the structure, THE System SHALL identify all documentation files that reference the old posts-as-tracks pattern
2. WHEN migrating documentation, THE System SHALL update all architectural diagrams to show the track-post relationship
3. WHEN updating code documentation, THE System SHALL revise all inline comments and JSDoc that reference audio posts as tracks
4. WHEN updating feature documentation, THE System SHALL revise guides, specs, and README files to reflect the new structure
5. WHEN creating new documentation, THE System SHALL establish documentation standards that maintain the track-post separation clarity

### Requirement 11: Development Effort Assessment

**User Story:** As a project manager, I want to understand the development effort required, so that I can allocate resources appropriately.

#### Acceptance Criteria

1. WHEN estimating database changes, THE System SHALL require migration scripts, schema updates, and RLS policy updates
2. WHEN estimating backend changes, THE System SHALL require updates to all audio upload, post creation, and playlist functions
3. WHEN estimating frontend changes, THE System SHALL require updates to components, types, and API calls
4. WHEN estimating testing effort, THE System SHALL require unit tests, integration tests, and end-to-end tests
5. WHEN estimating documentation updates, THE System SHALL require systematic review and update of all project documentation
6. WHEN calculating total effort, THE System SHALL estimate 25-50 hours of development, testing, and documentation work

### Requirement 10: Documentation Update Requirements

**User Story:** As a developer, I want all documentation to reflect the new structure, so that future development is not confused by outdated references.

#### Acceptance Criteria

1. WHEN updating the structure, THE System SHALL identify all documentation files that reference the old posts-as-tracks pattern
2. WHEN migrating documentation, THE System SHALL update all architectural diagrams to show the track-post relationship
3. WHEN updating code documentation, THE System SHALL revise all inline comments and JSDoc that reference audio posts as tracks
4. WHEN updating feature documentation, THE System SHALL revise guides, specs, and README files to reflect the new structure
5. WHEN creating new documentation, THE System SHALL establish documentation standards that maintain the track-post separation clarity

## Recommendations

### Requirement 11: Decision Framework

**User Story:** As a decision maker, I want clear recommendations, so that I can choose the appropriate path forward.

#### Acceptance Criteria

1. WHEN the platform is in early development with minimal users, THE System SHALL recommend proceeding with separation
2. WHEN the platform has significant production data, THE System SHALL recommend careful planning and phased migration
3. WHEN future features require track independence, THE System SHALL recommend prioritizing the separation
4. WHEN development resources are limited, THE System SHALL recommend deferring separation until critical mass is reached
5. WHERE the current structure causes active problems, THE System SHALL recommend immediate separation planning

### Requirement 12: Implementation Phasing

**User Story:** As a technical lead, I want a phased implementation approach, so that risks are minimized.

#### Acceptance Criteria

1. WHEN implementing Phase 1, THE System SHALL create the new track-post relationship without breaking existing functionality
2. WHEN implementing Phase 2, THE System SHALL migrate existing data with comprehensive validation
3. WHEN implementing Phase 3, THE System SHALL update application code to use the new structure
4. WHEN implementing Phase 4, THE System SHALL update all documentation to reflect the new structure
5. WHEN implementing Phase 5, THE System SHALL deprecate old patterns and clean up legacy code
6. WHEN completing all phases, THE System SHALL verify that all functionality works correctly with the new structure

---

*Requirements Document Version: 1.0*  
*Created: January 2025*  
*Status: Analysis Complete - Awaiting Design Phase*
