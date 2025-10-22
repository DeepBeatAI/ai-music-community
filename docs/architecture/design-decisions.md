# Design Decisions: Tracks vs Posts Separation

## Overview

This document records the key design decisions made during the tracks-posts separation implementation, including rationale, alternatives considered, and trade-offs.

**Last Updated:** January 2025  
**Version:** 1.0

---

## Decision 1: Separate Tracks from Posts

### Context

Originally, audio metadata was stored directly in the posts table, conflating social content with audio assets.

### Decision

Create a separate `tracks` table for audio metadata, with posts referencing tracks via `track_id` foreign key.

### Rationale

1. **Semantic Clarity**: Clear separation between social content (posts) and audio assets (tracks)
2. **Reusability**: Same track can be referenced by multiple posts
3. **Future Features**: Enables track libraries, track-only uploads, and better organization
4. **Data Integrity**: Prevents data duplication and inconsistencies

### Alternatives Considered

**Alternative 1: Keep audio in posts**
- ❌ No track reuse
- ❌ No track libraries
- ❌ Duplicated audio data
- ✅ Simpler initial implementation

**Alternative 2: Soft separation (views/computed columns)**
- ❌ Still stores data in posts
- ❌ Complex query logic
- ✅ No migration needed
- ❌ Doesn't enable new features

### Trade-offs

**Benefits:**
- Track reuse across posts
- Track library features
- Better data organization
- Clearer domain model

**Costs:**
- Migration complexity
- Additional join queries
- Breaking changes to API
- Learning curve for developers

### Outcome

✅ Implemented - Benefits outweigh costs, enables future features

---

## Decision 2: Foreign Key with SET NULL

### Context

When a track is deleted, what should happen to posts referencing it?

### Decision

Use `ON DELETE SET NULL` for `posts.track_id` foreign key.

### Rationale

1. **Preserve Posts**: Social context (caption, likes, comments) remains valuable
2. **User Experience**: Users don't lose their posts when tracks are deleted
3. **Data Integrity**: Posts can exist without tracks (graceful degradation)

### Alternatives Considered

**Alternative 1: CASCADE delete**
- ❌ Loses social content
- ❌ Deletes likes and comments
- ✅ Cleaner data model
- ❌ Poor user experience

**Alternative 2: RESTRICT delete**
- ❌ Can't delete tracks with posts
- ❌ Forces manual cleanup
- ✅ Prevents data loss
- ❌ Poor user experience

### Trade-offs

**Benefits:**
- Preserves social content
- Better user experience
- Flexible data model

**Costs:**
- Posts with null track_id
- Need to handle missing tracks in UI
- Slightly more complex queries

### Outcome

✅ Implemented - User experience prioritized

---

## Decision 3: Playlist References Tracks (Not Posts)

### Context

Playlists were incorrectly referencing posts instead of tracks.

### Decision

Update `playlist_tracks.track_id` to reference `tracks.id` with CASCADE delete.

### Rationale

1. **Semantic Correctness**: Playlists contain tracks, not posts
2. **Direct Management**: Add tracks to playlists without creating posts
3. **Data Integrity**: Tracks removed from playlists when deleted
4. **Future Features**: Enables track-only playlists

### Alternatives Considered

**Alternative 1: Keep referencing posts**
- ❌ Semantically incorrect
- ❌ Can't add tracks without posts
- ✅ No migration needed
- ❌ Limits future features

**Alternative 2: Reference both tracks and posts**
- ❌ Complex data model
- ❌ Ambiguous semantics
- ❌ Difficult to maintain
- ✅ Maximum flexibility

### Trade-offs

**Benefits:**
- Correct semantics
- Direct track management
- Cleaner data model
- Enables new features

**Costs:**
- Migration complexity
- Breaking changes
- Need to update UI

### Outcome

✅ Implemented - Correctness prioritized

---

## Decision 4: Automatic Audio Compression

### Context

Audio files can be large, increasing storage and bandwidth costs.

### Decision

Automatically compress audio files during upload with fallback to original.

### Rationale

1. **Cost Optimization**: Reduces storage and bandwidth costs by 2-5x
2. **Performance**: Faster uploads and downloads
3. **User Experience**: Transparent to users
4. **Flexibility**: Falls back to original if compression fails

### Alternatives Considered

**Alternative 1: No compression**
- ❌ Higher costs
- ❌ Slower performance
- ✅ Simpler implementation
- ✅ No quality loss

**Alternative 2: User-controlled compression**
- ✅ User choice
- ❌ Complex UI
- ❌ Most users won't use it
- ❌ Inconsistent results

**Alternative 3: Always compress (no fallback)**
- ✅ Guaranteed savings
- ❌ May fail for some files
- ❌ Potential quality issues
- ❌ Poor user experience

### Trade-offs

**Benefits:**
- Significant cost savings
- Better performance
- Transparent to users
- Graceful fallback

**Costs:**
- Processing time
- Compression API dependency
- Potential quality loss
- Additional complexity

### Outcome

✅ Implemented - Cost savings justify complexity

---

## Decision 5: Track Privacy with is_public Flag

### Context

Users need control over track visibility and usage.

### Decision

Add `is_public` boolean flag to tracks table with RLS policies.

### Rationale

1. **User Control**: Users decide who can see/use their tracks
2. **Privacy**: Private tracks only visible to owner
3. **Flexibility**: Public tracks can be used by anyone
4. **Security**: Enforced by RLS policies

### Alternatives Considered

**Alternative 1: All tracks public**
- ❌ No privacy control
- ❌ Security concerns
- ✅ Simpler implementation
- ❌ Poor user experience

**Alternative 2: Complex permission system**
- ✅ Fine-grained control
- ❌ Complex implementation
- ❌ Difficult to understand
- ❌ Overkill for MVP

**Alternative 3: Inherit from post visibility**
- ❌ Tracks tied to posts
- ❌ Can't have track-only uploads
- ✅ Simpler model
- ❌ Limits features

### Trade-offs

**Benefits:**
- User privacy control
- Simple to understand
- Flexible usage
- Secure by default

**Costs:**
- Additional column
- RLS policy complexity
- Permission checks needed
- UI for privacy settings

### Outcome

✅ Implemented - Privacy is essential

---

## Decision 6: Compression Metadata Storage

### Context

Need to track compression effectiveness for analytics and optimization.

### Decision

Store compression metadata in tracks table (original_file_size, compression_ratio, compression_applied).

### Rationale

1. **Analytics**: Track compression effectiveness
2. **Transparency**: Users can see savings
3. **Optimization**: Identify compression issues
4. **Reporting**: Generate cost savings reports

### Alternatives Considered

**Alternative 1: No metadata storage**
- ❌ No analytics
- ❌ Can't track savings
- ✅ Simpler schema
- ❌ Missed insights

**Alternative 2: Separate analytics table**
- ✅ Cleaner separation
- ❌ Additional joins
- ❌ More complex queries
- ❌ Overkill for MVP

### Trade-offs

**Benefits:**
- Valuable analytics
- User transparency
- Optimization insights
- Simple implementation

**Costs:**
- Additional columns
- Slightly larger records
- Need to populate data

### Outcome

✅ Implemented - Analytics value justifies cost

---

## Decision 7: Two-Step Upload Process

### Context

Audio upload now requires creating track first, then optionally creating post.

### Decision

Implement two-step process: uploadTrack() then createAudioPost().

### Rationale

1. **Flexibility**: Users can upload without posting
2. **Track Libraries**: Enables track-only uploads
3. **Reusability**: Same track can be used in multiple posts
4. **Clarity**: Clear separation of concerns

### Alternatives Considered

**Alternative 1: Single-step upload**
- ❌ Can't upload without posting
- ❌ No track libraries
- ✅ Simpler API
- ❌ Limits features

**Alternative 2: Optional post creation in upload**
- ✅ Flexible
- ❌ Complex function signature
- ❌ Unclear API
- ❌ Mixing concerns

### Trade-offs

**Benefits:**
- Maximum flexibility
- Clear API
- Enables new features
- Better separation

**Costs:**
- Breaking change
- More API calls
- Learning curve
- Migration effort

### Outcome

✅ Implemented - Flexibility worth the cost

---

## Decision 8: Backward Compatibility Period

### Context

Need to migrate existing code without breaking production.

### Decision

Keep deprecated audio_* columns in posts table for 2-4 weeks transition period.

### Rationale

1. **Safety**: Gradual migration reduces risk
2. **Compatibility**: Old code continues working
3. **Testing**: Time to verify new implementation
4. **Rollback**: Can revert if issues found

### Alternatives Considered

**Alternative 1: Immediate removal**
- ❌ Breaks existing code
- ❌ High risk
- ✅ Cleaner schema
- ❌ No rollback option

**Alternative 2: Permanent compatibility**
- ✅ No breaking changes
- ❌ Technical debt
- ❌ Confusing for developers
- ❌ Maintenance burden

### Trade-offs

**Benefits:**
- Safe migration
- Time for testing
- Rollback option
- Gradual adoption

**Costs:**
- Temporary redundancy
- Larger records
- Need to remove later
- Documentation overhead

### Outcome

✅ Implemented - Safety prioritized

---

## Decision 9: Track Reuse Across Posts

### Context

Should the same track be usable in multiple posts?

### Decision

Allow track reuse - multiple posts can reference the same track_id.

### Rationale

1. **Storage Efficiency**: File stored once, referenced many times
2. **Consistency**: Updates reflected everywhere
3. **Flexibility**: Different contexts for same audio
4. **User Value**: Share tracks in different ways

### Alternatives Considered

**Alternative 1: One track per post**
- ❌ Duplicated storage
- ❌ Inconsistent updates
- ✅ Simpler model
- ❌ Poor efficiency

**Alternative 2: Copy track on reuse**
- ❌ Storage waste
- ❌ Inconsistency
- ✅ Independent updates
- ❌ Confusing for users

### Trade-offs

**Benefits:**
- Storage efficiency
- Consistency
- User flexibility
- Cost savings

**Costs:**
- Need to handle shared tracks
- Deletion complexity
- UI considerations

### Outcome

✅ Implemented - Efficiency and flexibility win

---

## Decision 10: RLS Policy Enforcement

### Context

How to enforce track access permissions?

### Decision

Use Row Level Security (RLS) policies on tracks table.

### Rationale

1. **Security**: Database-level enforcement
2. **Consistency**: Same rules everywhere
3. **Performance**: Optimized by PostgreSQL
4. **Simplicity**: No application-level checks needed

### Alternatives Considered

**Alternative 1: Application-level checks**
- ❌ Can be bypassed
- ❌ Inconsistent enforcement
- ❌ More code to maintain
- ✅ More flexible

**Alternative 2: No access control**
- ❌ Security risk
- ❌ Privacy concerns
- ✅ Simpler implementation
- ❌ Unacceptable for production

### Trade-offs

**Benefits:**
- Strong security
- Consistent enforcement
- Database-optimized
- Less application code

**Costs:**
- RLS complexity
- Harder to debug
- Performance overhead
- Learning curve

### Outcome

✅ Implemented - Security is non-negotiable

---

## Summary of Decisions

| Decision | Status | Priority | Impact |
|----------|--------|----------|--------|
| Separate tracks from posts | ✅ Implemented | High | Breaking |
| Foreign key SET NULL | ✅ Implemented | Medium | Non-breaking |
| Playlists reference tracks | ✅ Implemented | High | Breaking |
| Automatic compression | ✅ Implemented | Medium | Non-breaking |
| Track privacy flag | ✅ Implemented | High | Non-breaking |
| Compression metadata | ✅ Implemented | Low | Non-breaking |
| Two-step upload | ✅ Implemented | High | Breaking |
| Backward compatibility | ✅ Implemented | High | Temporary |
| Track reuse | ✅ Implemented | Medium | Non-breaking |
| RLS enforcement | ✅ Implemented | High | Non-breaking |

---

## Lessons Learned

### What Went Well

1. **Clear Separation**: Tracks-posts separation improved code clarity
2. **Migration Strategy**: Phased approach reduced risk
3. **Compression**: Automatic compression saved significant costs
4. **RLS Policies**: Database-level security worked well

### What Could Be Improved

1. **Documentation**: Should have documented earlier
2. **Testing**: More integration tests needed upfront
3. **Communication**: Better communication of breaking changes
4. **Rollback Plan**: More detailed rollback procedures

### Future Considerations

1. **Track Versioning**: Consider versioning for track updates
2. **Collaborative Playlists**: Multi-user playlist editing
3. **Track Analytics**: More detailed usage analytics
4. **Advanced Permissions**: Fine-grained sharing controls

---

## Related Documentation

- [Database Schema](./database-schema.md)
- [Data Flow](./data-flow.md)
- [Migration Guide](../migrations/tracks-posts-separation.md)
- [Design Document](../.kiro/specs/tracks-vs-posts-separation/design.md)

---

*Design Decisions Version: 1.0*  
*Last Updated: January 2025*
