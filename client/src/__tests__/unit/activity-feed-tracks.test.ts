/**
 * Activity Feed with Tracks Integration Tests
 * 
 * Tests the activity feed system's compatibility with tracks-posts separation
 */

import { formatActivityMessage, getActivityIcon, getActivityIconForPost } from '@/utils/activityFeed';
import type { ActivityFeedItem } from '@/utils/activityFeed';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => ({
              data: [],
              error: null
            })),
            limit: jest.fn(() => ({
              data: [],
              error: null
            })),
            gte: jest.fn(() => ({
              range: jest.fn(() => ({
                data: [],
                error: null
              })),
              limit: jest.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        })),
        in: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    }))
  }
}));

describe('Activity Feed with Tracks', () => {
  describe('ActivityFeedItem Interface', () => {
    it('should support track data in target_post', () => {
      const activityItem: ActivityFeedItem = {
        id: 'activity-1',
        created_at: new Date().toISOString(),
        activity_type: 'post_created',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_post: {
          content: 'Check out my new track!',
          post_type: 'audio',
          track_id: 'track-1',
          track: {
            id: 'track-1',
            title: 'Test Track',
            file_url: 'https://example.com/track.mp3',
            duration: 180
          }
        }
      };

      expect(activityItem.target_post?.track_id).toBe('track-1');
      expect(activityItem.target_post?.track).toBeDefined();
      expect(activityItem.target_post?.track?.title).toBe('Test Track');
      expect(activityItem.target_post?.track?.duration).toBe(180);
    });

    it('should support text posts without track data', () => {
      const activityItem: ActivityFeedItem = {
        id: 'activity-2',
        created_at: new Date().toISOString(),
        activity_type: 'post_created',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_post: {
          content: 'Just a text post',
          post_type: 'text'
        }
      };

      expect(activityItem.target_post?.track_id).toBeUndefined();
      expect(activityItem.target_post?.track).toBeUndefined();
    });
  });

  describe('formatActivityMessage', () => {
    it('should format audio post creation message', () => {
      const activity: ActivityFeedItem = {
        id: 'activity-1',
        created_at: new Date().toISOString(),
        activity_type: 'post_created',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_post: {
          content: 'New audio',
          post_type: 'audio',
          track: {
            id: 'track-1',
            title: 'Test Track',
            file_url: 'https://example.com/track.mp3'
          }
        }
      };

      const message = formatActivityMessage(activity);
      expect(message).toBe('uploaded new audio');
    });

    it('should format text post creation message', () => {
      const activity: ActivityFeedItem = {
        id: 'activity-2',
        created_at: new Date().toISOString(),
        activity_type: 'post_created',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_post: {
          content: 'Text post',
          post_type: 'text'
        }
      };

      const message = formatActivityMessage(activity);
      expect(message).toBe('created a new post');
    });

    it('should format post liked message', () => {
      const activity: ActivityFeedItem = {
        id: 'activity-3',
        created_at: new Date().toISOString(),
        activity_type: 'post_liked',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_user_profile: {
          id: 'user-2',
          user_id: 'user-2',
          username: 'targetuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

      const message = formatActivityMessage(activity);
      expect(message).toBe("liked targetuser's post");
    });

    it('should format user followed message', () => {
      const activity: ActivityFeedItem = {
        id: 'activity-4',
        created_at: new Date().toISOString(),
        activity_type: 'user_followed',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_user_profile: {
          id: 'user-2',
          user_id: 'user-2',
          username: 'targetuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

      const message = formatActivityMessage(activity);
      expect(message).toBe('followed targetuser');
    });
  });

  describe('getActivityIconForPost', () => {
    it('should return music note for audio post creation', () => {
      const icon = getActivityIconForPost('post_created', 'audio');
      expect(icon).toBe('🎵');
    });

    it('should return document icon for text post creation', () => {
      const icon = getActivityIconForPost('post_created', 'text');
      expect(icon).toBe('📝');
    });

    it('should return heart icon for post likes', () => {
      const icon = getActivityIconForPost('post_liked', 'audio');
      expect(icon).toBe('❤️');
      
      const textIcon = getActivityIconForPost('post_liked', 'text');
      expect(textIcon).toBe('❤️');
    });

    it('should return music note for audio uploaded', () => {
      const icon = getActivityIconForPost('audio_uploaded');
      expect(icon).toBe('🎵');
    });

    it('should return people icon for user followed', () => {
      const icon = getActivityIconForPost('user_followed');
      expect(icon).toBe('👥');
    });
  });

  describe('getActivityIcon', () => {
    it('should return correct icons for activity types', () => {
      expect(getActivityIcon('post_created')).toBe('📝');
      expect(getActivityIcon('audio_uploaded')).toBe('♪');
      expect(getActivityIcon('unknown')).toBe('📢');
    });
  });

  describe('Track Data Integration', () => {
    it('should handle activities with complete track data', () => {
      const activity: ActivityFeedItem = {
        id: 'activity-1',
        created_at: new Date().toISOString(),
        activity_type: 'post_created',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_post: {
          content: 'New track!',
          post_type: 'audio',
          track_id: 'track-1',
          track: {
            id: 'track-1',
            title: 'Amazing Song',
            file_url: 'https://storage.example.com/tracks/track-1.mp3',
            duration: 240
          }
        }
      };

      // Verify all track fields are accessible
      expect(activity.target_post?.track_id).toBe('track-1');
      expect(activity.target_post?.track?.id).toBe('track-1');
      expect(activity.target_post?.track?.title).toBe('Amazing Song');
      expect(activity.target_post?.track?.file_url).toContain('track-1.mp3');
      expect(activity.target_post?.track?.duration).toBe(240);
    });

    it('should handle activities with missing track data gracefully', () => {
      const activity: ActivityFeedItem = {
        id: 'activity-2',
        created_at: new Date().toISOString(),
        activity_type: 'post_created',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_post: {
          content: 'Post without track',
          post_type: 'audio',
          track_id: 'track-1'
          // track data missing
        }
      };

      // Should not throw error
      expect(activity.target_post?.track_id).toBe('track-1');
      expect(activity.target_post?.track).toBeUndefined();
      
      const message = formatActivityMessage(activity);
      expect(message).toBe('uploaded new audio');
    });

    it('should support backward compatibility with audio_filename', () => {
      const activity: ActivityFeedItem = {
        id: 'activity-3',
        created_at: new Date().toISOString(),
        activity_type: 'post_created',
        user_profile: {
          id: 'user-1',
          user_id: 'user-1',
          username: 'testuser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        target_post: {
          content: 'Old format post',
          post_type: 'audio',
          audio_filename: 'old-track.mp3' // Deprecated field
        }
      };

      // Should still be accessible for backward compatibility
      expect(activity.target_post?.audio_filename).toBe('old-track.mp3');
    });
  });

  describe('Activity Feed Filtering with Tracks', () => {
    it('should filter audio activities correctly', () => {
      const activities: ActivityFeedItem[] = [
        {
          id: 'activity-1',
          created_at: new Date().toISOString(),
          activity_type: 'post_created',
          user_profile: {
            id: 'user-1',
            user_id: 'user-1',
            username: 'user1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          target_post: {
            content: 'Audio post',
            post_type: 'audio',
            track: {
              id: 'track-1',
              title: 'Track 1',
              file_url: 'url1'
            }
          }
        },
        {
          id: 'activity-2',
          created_at: new Date().toISOString(),
          activity_type: 'post_created',
          user_profile: {
            id: 'user-2',
            user_id: 'user-2',
            username: 'user2',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          target_post: {
            content: 'Text post',
            post_type: 'text'
          }
        }
      ];

      const audioActivities = activities.filter(
        a => a.target_post?.post_type === 'audio'
      );

      expect(audioActivities).toHaveLength(1);
      expect(audioActivities[0].target_post?.track).toBeDefined();
    });
  });
});
