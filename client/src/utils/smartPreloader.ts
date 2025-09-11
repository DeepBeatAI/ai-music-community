// Create: src/utils/smartPreloader.ts
import { metadataCache } from './metadataCache';
import { imageCache } from './imageCache';
import { getCachedAudioUrl } from './audioCache';

interface PreloadTask {
  type: 'audio' | 'image' | 'metadata';
  url: string;
  priority: number;
  estimatedSize: number;
  callback?: () => Promise<unknown>;
}

interface PreloadOptions {
  maxConcurrent: number;
  maxBandwidth: number; // bytes per second
  networkType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
}

class SmartPreloader {
  private queue: PreloadTask[] = [];
  private activeLoads = new Set<string>();
  private options: PreloadOptions;
  private bandwidthUsed = 0;
  private lastBandwidthReset = Date.now();

  constructor() {
    this.options = {
      maxConcurrent: this.detectOptimalConcurrency(),
      maxBandwidth: this.detectBandwidthLimit(),
      networkType: this.detectNetworkType()
    };
  }

  async preloadCriticalAssets(): Promise<void> {
    // Preload most important assets first
    const criticalTasks: PreloadTask[] = [
      {
        type: 'metadata',
        url: 'user_profiles',
        priority: 10,
        estimatedSize: 1024,
        callback: () => this.preloadUserProfiles()
      },
      {
        type: 'metadata',
        url: 'recent_posts',
        priority: 9,
        estimatedSize: 5120,
        callback: () => this.preloadRecentPosts()
      }
    ];

    await this.processTasks(criticalTasks);
  }

  async preloadUserContent(userId: string): Promise<void> {
    const userTasks: PreloadTask[] = [
      {
        type: 'metadata',
        url: `user_stats_${userId}`,
        priority: 8,
        estimatedSize: 512,
        callback: () => this.preloadUserStats(userId)
      },
      {
        type: 'metadata',
        url: `user_posts_${userId}`,
        priority: 7,
        estimatedSize: 2048,
        callback: () => this.preloadUserPosts(userId)
      }
    ];

    await this.processTasks(userTasks);
  }

  async preloadVisibleContent(visiblePosts: Array<{
    audio_url?: string;
    user_profile?: { avatar_url?: string };
  }>): Promise<void> {
    const contentTasks: PreloadTask[] = [];

    for (const post of visiblePosts.slice(0, 5)) { // Only first 5 visible
      if (post.audio_url) {
        contentTasks.push({
          type: 'audio',
          url: post.audio_url,
          priority: 6,
          estimatedSize: 5 * 1024 * 1024, // 5MB estimate
          callback: () => getCachedAudioUrl(post.audio_url!)
        });
      }

      // Preload user avatars
      if (post.user_profile?.avatar_url) {
        contentTasks.push({
          type: 'image',
          url: post.user_profile.avatar_url,
          priority: 5,
          estimatedSize: 50 * 1024, // 50KB estimate
          callback: () => imageCache.getImage(post.user_profile!.avatar_url!)
        });
      }
    }

    await this.processTasks(contentTasks);
  }

  private async processTasks(tasks: PreloadTask[]): Promise<void> {
    // Sort by priority (higher first)
    tasks.sort((a, b) => b.priority - a.priority);

    const promises: Promise<unknown>[] = [];

    for (const task of tasks) {
      if (this.shouldSkipTask(task)) continue;

      if (this.activeLoads.size >= this.options.maxConcurrent) {
        await Promise.race(Array.from(this.activeLoads).map(url =>
          this.waitForCompletion(url)
        ));
      }

      promises.push(this.executeTask(task));
    }

    await Promise.allSettled(promises);
  }

  private async executeTask(task: PreloadTask): Promise<void> {
    this.activeLoads.add(task.url);

    try {
      await this.checkBandwidthThrottle(task);

      if (task.callback) {
        await task.callback();
      }

      this.bandwidthUsed += task.estimatedSize;
    } catch (error) {
      console.warn(`Preload failed for ${task.url}:`, error);
    } finally {
      this.activeLoads.delete(task.url);
    }
  }

  private shouldSkipTask(task: PreloadTask): boolean {
    // Skip if on slow network and task is large
    if (this.options.networkType === 'slow-2g' && task.estimatedSize > 1024 * 1024) {
      return true;
    }

    // Skip audio preloading on 2g
    if (this.options.networkType === '2g' && task.type === 'audio') {
      return true;
    }

    return false;
  }

  private async checkBandwidthThrottle(task: PreloadTask): Promise<void> {
    const now = Date.now();
    const timeElapsed = now - this.lastBandwidthReset;

    // Reset bandwidth counter every second
    if (timeElapsed >= 1000) {
      this.bandwidthUsed = 0;
      this.lastBandwidthReset = now;
      return;
    }

    // Check if adding this task would exceed bandwidth limit
    if (this.bandwidthUsed + task.estimatedSize > this.options.maxBandwidth) {
      const waitTime = 1000 - timeElapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.bandwidthUsed = 0;
      this.lastBandwidthReset = Date.now();
    }
  }

  private async waitForCompletion(url: string): Promise<void> {
    while (this.activeLoads.has(url)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private detectOptimalConcurrency(): number {
    const connection = (navigator as any).connection;
    if (!connection) return 3; // Default

    switch (connection.effectiveType) {
      case 'slow-2g': return 1;
      case '2g': return 2;
      case '3g': return 3;
      case '4g': return 6;
      default: return 4;
    }
  }

  private detectBandwidthLimit(): number {
    const connection = (navigator as any).connection;
    if (!connection) return 2 * 1024 * 1024; // 2MB/s default

    const downlink = connection.downlink * 1024 * 1024; // Convert Mbps to bytes
    return Math.min(downlink * 0.3, 10 * 1024 * 1024); // Use 30% of available, max 10MB/s
  }

  private detectNetworkType(): PreloadOptions['networkType'] {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || '4g';
  }

  // Specific preload functions
  private async preloadUserProfiles(): Promise<unknown> {
    return metadataCache.getOrFetch('user_profiles_recent', async () => {
      // In a real implementation, this would call your Supabase API
      console.log('Preloading user profiles...');
      return [];
    });
  }

  private async preloadRecentPosts(): Promise<unknown> {
    return metadataCache.getOrFetch('recent_posts', async () => {
      console.log('Preloading recent posts...');
      return [];
    });
  }

  private async preloadUserStats(userId: string): Promise<unknown> {
    return metadataCache.getOrFetch(`user_stats_${userId}`, async () => {
      console.log(`Preloading stats for user ${userId}...`);
      return {};
    });
  }

  private async preloadUserPosts(userId: string): Promise<unknown> {
    return metadataCache.getOrFetch(`user_posts_${userId}`, async () => {
      console.log(`Preloading posts for user ${userId}...`);
      return [];
    });
  }
}

export const smartPreloader = new SmartPreloader();