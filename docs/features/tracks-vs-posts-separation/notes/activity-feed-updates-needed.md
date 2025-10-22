# Activity Feed Updates for Tracks-Posts Separation

## Overview

This document provides the specific code changes needed to update the activity feed system for tracks-posts separation. These changes are **documented but not yet implemented**.

## Status: 📋 DOCUMENTED (Not Implemented)

The changes below should be implemented when the activity feed feature is actively used in the application.

---

## Change 1: Update Post Query in activityFeed.ts

**File:** `client/src/utils/activityFeed.ts`  
**Lines:** ~90-95  
**Priority:** HIGH  
**Estimated Time:** 5 minutes

### Current Code

```typescript
// Get unique post IDs for post lookup
const postIds = activities
  .filter(a => a.target_post_id)
  .map(a => a.target_post_id);

let posts: any[] = [];
if (postIds.length > 0) {
  const { data: postsData } = await supabase
    .from('posts')
    .select('id, content, post_type, audio_filename')  // ⚠️ DEPRECATED FIELD
    .in('id', postIds);
  posts = postsData || [];
}
```

### Updated Code

```typescript
// Get unique post IDs for post lookup
const postIds = activities
  .filter(a => a.target_post_id)
  .map(a => a.target_post_id);

let posts: any[] = [];
if (postIds.length > 0) {
  const { data: postsData } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      post_type,
      track_id,
      track:tracks(
        id,
        title,
        file_url,
        duration
      )
    `)
    .in('id', postIds);
  posts = postsData || [];
}
```

### Explanation

- Adds `track_id` field to the query
- Joins with `tracks` table to get track metadata
- Removes deprecated `audio_filename` field
- Provides track title, file URL, and duration for activity display

---

## Change 2: Update ActivityFeedItem Interface in activityFeed.ts

**File:** `client/src/utils/activityFeed.ts`  
**Lines:** ~15-25  
**Priority:** HIGH  
**Estimated Time:** 3 minutes

### Current Code

```typescript
export interface ActivityFeedItem {
  id: string;
  created_at: string;
  activity_type: string;
  user_profile: UserProfile;
  target_user_profile?: UserProfile;
  target_post_id?: string;
  target_post?: {
    content: string;
    post_type: string;
    audio_filename?: string;  // ⚠️ DEPRECATED
  };
}
```

### Updated Code

```typescript
export interface ActivityFeedItem {
  id: string;
  created_at: string;
  activity_type: string;
  user_profile: UserProfile;
  target_user_profile?: UserProfile;
  target_post_id?: string;
  target_post?: {
    content: string;
    post_type: string;
    track_id?: string;
    track?: {
      id: string;
      title: string;
      file_url: string;
      duration?: number;
    };
    // DEPRECATED: Keep for backward compatibility during transition
    audio_filename?: string;
  };
}
```

### Explanation

- Adds `track_id` field for audio posts
- Adds `track` object with track metadata
- Keeps deprecated `audio_filename` for backward compatibility
- Provides type safety for track data access

---

## Change 3: Update Activity Interface in activity.ts

**File:** `client/src/utils/activity.ts`  
**Lines:** ~20-30  
**Priority:** HIGH  
**Estimated Time:** 3 minutes

### Current Code

```typescript
export interface Activity {
  id: string;
  created_at: string;
  user_id: string;
  activity_type: 'post_created' | 'post_liked' | 'user_followed' | 'comment_created' | 'audio_uploaded';
  target_user_id?: string;
  target_post_id?: string;
  metadata?: any;
  is_public: boolean;
  // Joined data
  user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  target_user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  posts?: {
    content: string;
    post_type: string;
    audio_filename?: string;  // ⚠️ DEPRECATED
  };
}
```

### Updated Code

```typescript
export interface Activity {
  id: string;
  created_at: string;
  user_id: string;
  activity_type: 'post_created' | 'post_liked' | 'user_followed' | 'comment_created' | 'audio_uploaded';
  target_user_id?: string;
  target_post_id?: string;
  metadata?: any;
  is_public: boolean;
  // Joined data
  user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  target_user_profiles?: {
    username: string;
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  posts?: {
    content: string;
    post_type: string;
    track_id?: string;
    track?: {
      id: string;
      title: string;
      file_url: string;
      duration?: number;
    };
    // DEPRECATED: Keep for backward compatibility during transition
    audio_filename?: string;
  };
}
```

### Explanation

- Adds `track_id` field for audio posts
- Adds `track` object with track metadata
- Keeps deprecated `audio_filename` for backward compatibility
- Provides type safety for track data access

---

## Optional Enhancement: Display Track Titles in Messages

**File:** `client/src/utils/activityFeed.ts`  
**Lines:** ~130-140  
**Priority:** LOW (Enhancement)  
**Estimated Time:** 5 minutes

### Current Code

```typescript
export function formatActivityMessage(activity: ActivityFeedItem): string {
  const username = activity.user_profile?.username || 'Someone';
  const targetUsername = activity.target_user_profile?.username || 'someone';

  switch (activity.activity_type) {
    case 'post_created':
      // Check if it's an audio post
      if (activity.target_post?.post_type === 'audio') {
        return `uploaded new audio`;
      }
      return `created a new post`;
    case 'audio_uploaded':
      return `uploaded new audio`;
    case 'post_liked':
      return `liked ${targetUsername}'s post`;
    case 'user_followed':
      return `followed ${targetUsername}`;
    default:
      return `performed an action`;
  }
}
```

### Enhanced Code

```typescript
export function formatActivityMessage(activity: ActivityFeedItem): string {
  const username = activity.user_profile?.username || 'Someone';
  const targetUsername = activity.target_user_profile?.username || 'someone';

  switch (activity.activity_type) {
    case 'post_created':
      // Check if it's an audio post
      if (activity.target_post?.post_type === 'audio') {
        const trackTitle = activity.target_post?.track?.title;
        if (trackTitle) {
          return `uploaded "${trackTitle}"`;
        }
        return `uploaded new audio`;
      }
      return `created a new post`;
    case 'audio_uploaded':
      const trackTitle = activity.target_post?.track?.title;
      if (trackTitle) {
        return `uploaded "${trackTitle}"`;
      }
      return `uploaded new audio`;
    case 'post_liked':
      return `liked ${targetUsername}'s post`;
    case 'user_followed':
      return `followed ${targetUsername}`;
    default:
      return `performed an action`;
  }
}
```

### Explanation

- Displays track title in activity messages when available
- Falls back to generic message if track title is not available
- Provides more informative activity feed entries
- Enhances user experience

---

## Testing Checklist

After implementing these changes:

### Manual Testing

- [ ] Create an audio post
- [ ] Verify activity appears in activity feed
- [ ] Check that track title is displayed (if enhancement implemented)
- [ ] Verify activity message is formatted correctly
- [ ] Test activity feed filtering with audio posts
- [ ] Check real-time updates for audio post activities

### Automated Testing

Add tests to verify track data in activities:

```typescript
// client/src/__tests__/unit/activityFeed.test.ts

describe('Activity Feed with Tracks', () => {
  it('should include track data for audio post activities', async () => {
    const activities = await getActivityFeed('user-id');
    
    const audioActivity = activities.find(
      a => a.target_post?.post_type === 'audio'
    );
    
    if (audioActivity) {
      expect(audioActivity.target_post?.track_id).toBeDefined();
      expect(audioActivity.target_post?.track).toBeDefined();
      expect(audioActivity.target_post?.track?.title).toBeDefined();
    }
  });

  it('should format audio post activity messages correctly', () => {
    const activity: ActivityFeedItem = {
      id: 'test-id',
      created_at: new Date().toISOString(),
      activity_type: 'post_created',
      user_profile: {
        id: 'user-id',
        user_id: 'user-id',
        username: 'testuser',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      target_post: {
        content: 'Test post',
        post_type: 'audio',
        track: {
          id: 'track-id',
          title: 'Test Track',
          file_url: 'https://example.com/track.mp3',
          duration: 180
        }
      }
    };
    
    const message = formatActivityMessage(activity);
    expect(message).toContain('uploaded');
    // If enhancement implemented:
    // expect(message).toContain('Test Track');
  });
});
```

---

## Implementation Priority

### High Priority (Required)

1. ✅ Change 1: Update post query in `activityFeed.ts`
2. ✅ Change 2: Update `ActivityFeedItem` interface
3. ✅ Change 3: Update `Activity` interface

### Low Priority (Optional)

4. 💡 Optional Enhancement: Display track titles in messages

---

## Rollback Plan

If issues occur after implementation:

1. **Revert Query Changes:**
   - Remove track join from post query
   - Restore `audio_filename` field selection

2. **Revert Interface Changes:**
   - Remove `track_id` and `track` fields
   - Keep only `audio_filename` field

3. **Database Compatibility:**
   - Changes are backward compatible
   - Old code will continue to work during transition
   - Deprecated fields are kept for compatibility

---

## Notes

- These changes are **backward compatible**
- Deprecated fields are kept during transition period
- No database schema changes required
- Activity feed tables may not exist yet in database
- Changes should be implemented when activity feed is actively used

---

**Document Status:** 📋 DOCUMENTED  
**Implementation Status:** ⏭️ PENDING  
**Priority:** MEDIUM (Implement when activity feed is active)  
**Estimated Total Time:** 15-30 minutes
