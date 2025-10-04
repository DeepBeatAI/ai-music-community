import { SearchFilters } from './search';
import { Post } from '@/types';

export class FilterManager {
  private currentFilters: SearchFilters = {};
  private originalPosts: Post[] = [];
  private filteredPosts: Post[] = [];
  
  setOriginalPosts(posts: Post[]) {
    this.originalPosts = posts;
    this.applyFilters();
  }
  
  updateFilters(filters: SearchFilters) {
    this.currentFilters = { ...filters };
    this.applyFilters();
  }
  
  private applyFilters() {
    let result = [...this.originalPosts];
    
    // Apply each filter in sequence
    if (this.currentFilters.query) {
      result = this.filterByQuery(result, this.currentFilters.query);
    }
    
    if (this.currentFilters.postType && this.currentFilters.postType !== 'all') {
      result = this.filterByType(result, this.currentFilters.postType);
    }
    
    if (this.currentFilters.timeRange && this.currentFilters.timeRange !== 'all') {
      result = this.filterByTimeRange(result, this.currentFilters.timeRange);
    }
    
    // Apply sorting
    result = this.sortPosts(result, this.currentFilters.sortBy || 'recent');
    
    this.filteredPosts = result;
  }
  
  private filterByQuery(posts: Post[], query: string): Post[] {
    const queryLower = query.toLowerCase();
    return posts.filter(post => {
      if (post.content?.toLowerCase().includes(queryLower)) return true;
      if (post.audio_filename?.toLowerCase().includes(queryLower)) return true;
      return false;
    });
  }
  
  private filterByType(posts: Post[], type: string): Post[] {
    if (type === 'creators') return posts;
    return posts.filter(post => post.post_type === type);
  }
  
  private filterByTimeRange(posts: Post[], range: string): Post[] {
    const now = Date.now();
    let cutoffMs: number;
    
    switch (range) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        cutoffMs = today.getTime();
        break;
      case 'week':
        cutoffMs = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffMs = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return posts;
    }
    
    return posts.filter(post => new Date(post.created_at).getTime() >= cutoffMs);
  }
  
  private sortPosts(posts: Post[], sortBy: string): Post[] {
    const sorted = [...posts];
    
    switch (sortBy) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'likes':
        sorted.sort((a, b) => {
          const aLikes = a.like_count ?? (a as any).likes_count ?? 0;
          const bLikes = b.like_count ?? (b as any).likes_count ?? 0;
          if (bLikes === aLikes) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return bLikes - aLikes;
        });
        break;
      case 'popular':
        sorted.sort((a, b) => {
          const now = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;
          const aDaysOld = Math.floor((now - new Date(a.created_at).getTime()) / dayMs);
          const bDaysOld = Math.floor((now - new Date(b.created_at).getTime()) / dayMs);
          const aLikes = a.like_count ?? (a as any).likes_count ?? 0;
          const bLikes = b.like_count ?? (b as any).likes_count ?? 0;
          const aScore = (aLikes * 2) + Math.max(0, 7 - aDaysOld);
          const bScore = (bLikes * 2) + Math.max(0, 7 - bDaysOld);
          if (bScore === aScore) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return bScore - aScore;
        });
        break;
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return sorted;
  }
  
  getFilteredPosts(): Post[] {
    return this.filteredPosts;
  }
  
  getCurrentFilters(): SearchFilters {
    return this.currentFilters;
  }
  
  hasActiveFilters(): boolean {
    return !!(
      this.currentFilters.query ||
      (this.currentFilters.postType && this.currentFilters.postType !== 'all') ||
      (this.currentFilters.sortBy && this.currentFilters.sortBy !== 'recent') ||
      (this.currentFilters.timeRange && this.currentFilters.timeRange !== 'all') ||
      this.currentFilters.creatorId
    );
  }
  
  reset() {
    this.currentFilters = {};
    this.filteredPosts = [...this.originalPosts];
  }
}
