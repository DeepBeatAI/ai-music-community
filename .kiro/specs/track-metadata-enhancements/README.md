# Track Metadata Enhancements

## Overview

This spec defines three enhancement features that build upon the successful tracks-vs-posts separation, implemented in priority order with clear dependencies:

1. **Track Description vs Post Caption Separation** (Priority 1)
2. **Mandatory Track Author Field** (Priority 2)
3. **Play Count Tracking & Analytics** (Priority 3)

## Current Status

- **Phase**: Design Complete (v1.0)
- **Next Step**: Create Tasks Document
- **Estimated Effort**: 20-28 hours total
- **Dependencies**: Tracks-vs-posts separation (✅ Complete)

## Documents

- ✅ `requirements.md` - Complete requirements with EARS format (v2.0)
- ✅ `design.md` - Complete technical design (v1.0)
- ⏳ `tasks.md` - Implementation tasks (pending)

## Features Summary

### Priority 1: Track Description vs Post Caption (4-6 hours)

**Problem**: When creating audio posts, the "What's on your mind?" text goes into `track.description` instead of `post.content`. This pollutes track metadata with social commentary.

**Solution**: 
- Add optional "Track Description" field during upload (for describing the music)
- Use "Post Caption" field when creating posts (for social commentary)
- Migrate existing data to correct fields
- Update all display components (playlists, feed, trending, etc.)

**Risk**: Low | **Blocks**: Priority 2

### Priority 2: Mandatory Track Author Field (6-8 hours)

**Problem**: Tracks don't have explicit author field. Author requires JOIN with profiles. No way to specify different author for covers/remixes.

**Solution**:
- Add mandatory `author` TEXT field to tracks table
- Default to username but allow editing before upload
- **Make author immutable after upload** (delete and re-upload to change)
- Display prominent warning: "⚠️ Author cannot be changed after upload"
- Update all display components to show track.author (no more JOINs)

**Benefits**:
- Performance: Eliminates JOIN for author display
- Flexibility: Enables covers, remixes, collaborations
- Clarity: Explicit attribution separate from uploader

**Risk**: Medium | **Depends on**: Priority 1 | **Blocks**: Priority 3

### Priority 3: Play Count Tracking & Analytics (10-14 hours)

**Problem**: `tracks.play_count` exists but is always 0. No tracking, no analytics, trending doesn't use play data.

**Solution**:
- Track play events (30+ seconds = valid play)
- Increment play_count in database
- Update "Most Popular" and "Most Relevant" filters
- Update trending algorithms with formula: `(plays * 0.6) + (likes * 0.3) + (recency * 0.1)`
- Add 4 new sections to both /analytics/ and /discover/ pages:
  1. **Top 10 Trending Tracks (Last 7 Days)**
  2. **Top 10 Trending Tracks (All Time)**
  3. **Top 5 Popular Creators (Last 7 Days)** - based on plays + likes
  4. **Top 5 Popular Creators (All Time)** - based on plays + likes

**Risk**: Medium | **Depends on**: Priority 1 & 2

## Implementation Order

**Week 1 (Days 1-2)**: Priority 1 - Track Description Separation
- Database migration
- Update upload flow
- Update all display components
- Test and validate

**Week 1 (Days 3-4)**: Priority 2 - Track Author Field
- Add author field to database
- Update upload flow with warnings
- Enforce immutability
- Update all display components
- Test and validate

**Week 2-3**: Priority 3 - Play Count Tracking
- Implement play event tracking
- Create database functions
- Update sorting/filtering
- Update trending algorithms
- Create analytics sections
- Add to /discover/ page
- Test and validate

## Key Changes from v1.0

1. **Author Field Decision**: Mandatory field with immutability (not optional override)
2. **Analytics Metrics**: Changed from "Top 10 active users" to "Top 5 popular creators" with 7-day and all-time variants
3. **Trending Tracks**: Added "All Time" variant in addition to "Last 7 Days"
4. **Display Locations**: All 4 metrics appear in both /analytics/ and /discover/ pages
5. **Priority Order**: Reordered to reflect dependencies (description → author → play count)

## Files

- `requirements.md` - Complete requirements with EARS format acceptance criteria (v2.0)
- `README.md` - This file (overview and summary)

## Next Steps

1. **Review** the updated requirements document
2. **Approve** to proceed to design phase
3. **Design** phase will create technical implementation plan
4. **Tasks** phase will break down into executable steps

