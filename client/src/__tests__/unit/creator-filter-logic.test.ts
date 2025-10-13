import { SearchFilters } from '@/utils/search';
import { Post } from '@/types';

// Mock the applyFiltersDirectly function since it's defined in the dashboard component
// We'll create a standalone version for testing
function applyFiltersDirectly(filters: SearchFilters, allPosts: Post[]): Post[] {
  console.log('🔧 Applying filters:', filters, 'to', allPosts.length, 'posts');
  let filtered = [...allPosts];
  
  // Apply search query filter FIRST if present
  if (filters.query && filters.query.trim()) {
    const queryLower = filters.query.toLowerCase().trim();
    const before = filtered.length;
    
    filtered = filtered.filter(post => {
      // Check content
      if (post.content && post.content.toLowerCase().includes(queryLower)) return true;
      
      // Check audio filename for audio posts
      if (post.post_type === 'audio' && post.audio_filename) {
        const filename = post.audio_filename.toLowerCase();
        if (filename.includes(queryLower)) return true;
      }
      
      return false;
    });
    
    console.log(`  ✓ Search query filter ("${filters.query}"): ${before} → ${filtered.length}`);
  }
  
  // Apply creator filter
  if (filters.creatorId) {
    // Basic validation: ensure creatorId is a non-empty string
    if (typeof filters.creatorId === 'string' && filters.creatorId.trim()) {
      const before = filtered.length;
      filtered = filtered.filter(post => post.user_id === filters.creatorId);
      console.log(`✓ Creator filter (${filters.creatorUsername || 'Unknown'}): ${before} → ${filtered.length}`);
    } else {
      console.warn('⚠️ Invalid creatorId provided to filter:', filters.creatorId);
    }
  }
  
  // Apply post type filter
  if (filters.postType && filters.postType !== 'all' && filters.postType !== 'creators') {
    const before = filtered.length;
    filtered = filtered.filter(post => post.post_type === filters.postType);
    console.log(`  ✓ Post type filter (${filters.postType}): ${before} → ${filtered.length}`);
  }
  
  // Apply time range filter (UTC-based)
  if (filters.timeRange && filters.timeRange !== 'all') {
    const now = new Date();
    const nowMs = now.getTime();
    let cutoffMs: number;
    
    switch (filters.timeRange) {
      case 'today':
        // Get start of today in UTC (00:00:00)
        const todayUTC = new Date(now);
        todayUTC.setUTCHours(0, 0, 0, 0);
        cutoffMs = todayUTC.getTime();
        break;
      case 'week':
        // Exactly 7 days ago
        cutoffMs = nowMs - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        // Exactly 30 days ago
        cutoffMs = nowMs - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffMs = 0; // Unix epoch
    }
    
    const before = filtered.length;
    const cutoffDate = new Date(cutoffMs);
    
    filtered = filtered.filter(post => {
      const postDate = new Date(post.created_at);
      const postMs = postDate.getTime();
      return postMs >= cutoffMs;
    });
    
    console.log(`  ✓ Time range filter (${filters.timeRange}): ${before} → ${filtered.length}`);
  }
  
  // Apply sorting
  const sortBy = filters.sortBy || 'recent';
  switch (sortBy) {
    case 'oldest':
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
      
    case 'likes':
      filtered.sort((a, b) => {
        const aLikes = (a.like_count ?? 0);
        const bLikes = (b.like_count ?? 0);
        
        const likeDiff = bLikes - aLikes;
        if (likeDiff === 0) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return likeDiff;
      });
      break;
      
    case 'popular':
      filtered.sort((a, b) => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        
        const aLikes = (a.like_count ?? 0);
        const bLikes = (b.like_count ?? 0);
        
        // Calculate recency score (0-7 based on days old, max 7 days)
        const aDaysOld = Math.floor((now - new Date(a.created_at).getTime()) / dayMs);
        const bDaysOld = Math.floor((now - new Date(b.created_at).getTime()) / dayMs);
        const aRecencyScore = Math.max(0, 7 - aDaysOld);
        const bRecencyScore = Math.max(0, 7 - bDaysOld);
        
        // Weighted score: likes * 2 + recency score
        const aScore = (aLikes * 2) + aRecencyScore;
        const bScore = (bLikes * 2) + bRecencyScore;
        
        if (bScore === aScore) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        
        return bScore - aScore;
      });
      break;
      
    case 'relevance':
      if (filters.query && filters.query.trim()) {
        const queryLower = filters.query.toLowerCase();
        filtered.sort((a, b) => {
          let aScore = 0;
          let bScore = 0;
          
          // Exact matches in content get highest score
          if (a.content.toLowerCase().includes(queryLower)) aScore += 10;
          if (b.content.toLowerCase().includes(queryLower)) bScore += 10;
          
          // Audio filename matches
          if (a.audio_filename && a.audio_filename.toLowerCase().includes(queryLower)) aScore += 8;
          if (b.audio_filename && b.audio_filename.toLowerCase().includes(queryLower)) bScore += 8;
          
          // Username matches
          if (a.user_profiles?.username?.toLowerCase().includes(queryLower)) aScore += 5;
          if (b.user_profiles?.username?.toLowerCase().includes(queryLower)) bScore += 5;
          
          // Add like bonus for equal relevance (max 5 points)
          const aLikes = (a.like_count ?? 0);
          const bLikes = (b.like_count ?? 0);
          aScore += Math.min(aLikes, 5);
          bScore += Math.min(bLikes, 5);
          
          if (bScore === aScore) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          return bScore - aScore;
        });
      } else {
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      break;
      
    case 'recent':
    default:
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  
  console.log(`✅ Final filtered count: ${filtered.length}`);
  return filtered;
}

// Helper function to create mock posts
function createMockPost(overrides: Partial<Post> = {}): Post {
  const defaultPost: Post = {
    id: `post-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content: 'Test post content',
    user_id: 'user-123',
    post_type: 'text',
    like_count: 0,
    liked_by_user: false,
    user_profiles: {
      username: 'testuser',
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  };
  
  return { ...defaultPost, ...overrides };
}

describe('Creator Filter Logic', () => {
  let mockPosts: Post[];
  
  beforeEach(() => {
    // Create mock posts from different creators
    mockPosts = [
      createMockPost({
        id: 'post-1',
        user_id: 'creator-1',
        content: 'Music post by creator 1',
        post_type: 'audio',
        audio_filename: 'song1.mp3',
        like_count: 5,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        user_profiles: {
          username: 'musiccreator1',
          user_id: 'creator-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }),
      createMockPost({
        id: 'post-2',
        user_id: 'creator-2',
        content: 'Text post by creator 2',
        post_type: 'text',
        like_count: 3,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        user_profiles: {
          username: 'textcreator2',
          user_id: 'creator-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }),
      createMockPost({
        id: 'post-3',
        user_id: 'creator-1',
        content: 'Another post by creator 1',
        post_type: 'text',
        like_count: 8,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        user_profiles: {
          username: 'musiccreator1',
          user_id: 'creator-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }),
      createMockPost({
        id: 'post-4',
        user_id: 'creator-3',
        content: 'Post by creator 3',
        post_type: 'audio',
        audio_filename: 'beat.wav',
        like_count: 1,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        user_profiles: {
          username: 'beatmaker3',
          user_id: 'creator-3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })
    ];
  });

  describe('Basic Creator Filter', () => {
    it('should filter posts by creator ID', () => {
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      expect(result).toHaveLength(2);
      expect(result.every(post => post.user_id === 'creator-1')).toBe(true);
      expect(result.map(post => post.id)).toEqual(['post-1', 'post-3']);
    });

    it('should return empty array when creator has no posts', () => {
      const filters: SearchFilters = {
        creatorId: 'nonexistent-creator',
        creatorUsername: 'nonexistent'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      expect(result).toHaveLength(0);
    });

    it('should handle invalid creator ID gracefully', () => {
      const filters: SearchFilters = {
        creatorId: '',
        creatorUsername: 'empty'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      // Should return all posts when creator ID is invalid
      expect(result).toHaveLength(4);
    });

    it('should handle null/undefined creator ID', () => {
      const filters: SearchFilters = {
        creatorId: undefined,
        creatorUsername: undefined
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      // Should return all posts when no creator filter
      expect(result).toHaveLength(4);
    });
  });

  describe('Creator Filter with Other Filters', () => {
    it('should combine creator filter with post type filter', () => {
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1',
        postType: 'audio'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('post-1');
      expect(result[0].post_type).toBe('audio');
      expect(result[0].user_id).toBe('creator-1');
    });

    it('should combine creator filter with time range filter', () => {
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1',
        timeRange: 'today'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      // Both posts from creator-1 should be from today (within last 24 hours)
      expect(result).toHaveLength(2);
      expect(result.every(post => post.user_id === 'creator-1')).toBe(true);
    });

    it('should combine creator filter with search query', () => {
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1',
        query: 'Music'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('post-1');
      expect(result[0].content).toContain('Music');
      expect(result[0].user_id).toBe('creator-1');
    });

    it('should combine creator filter with sorting', () => {
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1',
        sortBy: 'likes'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      expect(result).toHaveLength(2);
      // Should be sorted by likes (post-3 has 8 likes, post-1 has 5 likes)
      expect(result[0].id).toBe('post-3');
      expect(result[1].id).toBe('post-1');
      expect(result[0].like_count).toBe(8);
      expect(result[1].like_count).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty posts array', () => {
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1'
      };

      const result = applyFiltersDirectly(filters, []);

      expect(result).toHaveLength(0);
    });

    it('should handle posts with missing user_id', () => {
      const postsWithMissingUserId = [
        createMockPost({ id: 'post-1', user_id: 'creator-1' }),
        createMockPost({ id: 'post-2', user_id: '' }), // Empty user_id
        createMockPost({ id: 'post-3' }) // user_id will be default 'user-123'
      ];

      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'creator1'
      };

      const result = applyFiltersDirectly(filters, postsWithMissingUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('post-1');
    });

    it('should handle multiple filters resulting in no matches', () => {
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1',
        postType: 'audio',
        query: 'nonexistent content'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      expect(result).toHaveLength(0);
    });

    it('should preserve original posts array', () => {
      const originalPosts = [...mockPosts];
      const filters: SearchFilters = {
        creatorId: 'creator-1',
        creatorUsername: 'musiccreator1'
      };

      applyFiltersDirectly(filters, mockPosts);

      // Original array should not be modified
      expect(mockPosts).toEqual(originalPosts);
    });
  });

  describe('Filter Validation', () => {
    it('should validate creator ID is a string', () => {
      const filters: SearchFilters = {
        creatorId: 123 as any, // Invalid type
        creatorUsername: 'creator'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      // Should not filter when creator ID is invalid type
      expect(result).toHaveLength(4);
    });

    it('should handle creator ID with whitespace (no trimming)', () => {
      const filters: SearchFilters = {
        creatorId: '  creator-1  ',
        creatorUsername: 'musiccreator1'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      // The current implementation doesn't trim, so this should return no results
      expect(result).toHaveLength(0);
    });

    it('should handle creator ID with only whitespace', () => {
      const filters: SearchFilters = {
        creatorId: '   ',
        creatorUsername: 'creator'
      };

      const result = applyFiltersDirectly(filters, mockPosts);

      // Should not filter when creator ID is only whitespace
      expect(result).toHaveLength(4);
    });
  });
});