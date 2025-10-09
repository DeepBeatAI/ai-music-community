import { logger } from './logger';

// Smart URL caching system for audio files
interface CachedUrl {
  url: string;
  expires: number;
  originalUrl: string;
  createdAt: number;
  accessCount: number;
}

class AudioUrlCache {
  private cache = new Map<string, CachedUrl>();
  private readonly BUFFER_TIME = 5 * 60 * 1000; // 5 minutes buffer before expiry
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Auto-cleanup expired entries
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Get cached URL or create new one if needed
   */
  async getCachedUrl(originalUrl: string): Promise<string> {
    const cacheKey = this.getCacheKey(originalUrl);
    const cached = this.cache.get(cacheKey);

    // Return cached URL if valid and not near expiry
    if (cached && this.isUrlValid(cached)) {
      cached.accessCount++;
      logger.debug('Using cached URL, access count:', cached.accessCount);
      return cached.url;
    }

    // Generate new signed URL
    logger.debug('Generating fresh signed URL for cache');
    const freshUrl = await this.generateSignedUrl(originalUrl);
    
    if (freshUrl) {
      this.setCachedUrl(originalUrl, freshUrl);
      return freshUrl;
    }

    // Fallback to original URL
    return originalUrl;
  }

  /**
   * Check if URL is expired or needs refresh
   */
  isUrlExpired(signedUrl: string): boolean {
    if (!signedUrl.includes('token=')) return false;
    
    try {
      const token = signedUrl.split('token=')[1].split('&')[0];
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      
      // Consider expired if within buffer time
      return now >= (expiryTime - this.BUFFER_TIME);
    } catch {
      return false; // If can't parse, assume not expired
    }
  }

  /**
   * Proactively refresh URLs that will expire soon
   */
  async refreshIfNeeded(originalUrl: string): Promise<string> {
    const cacheKey = this.getCacheKey(originalUrl);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return this.getCachedUrl(originalUrl);
    }

    // Check if URL will expire within buffer time
    if (Date.now() >= (cached.expires - this.BUFFER_TIME)) {
      logger.debug('Proactively refreshing URL before expiry');
      return this.getCachedUrl(originalUrl);
    }

    return cached.url;
  }

  private getCacheKey(url: string): string {
    // Extract file path for consistent caching
    return url.split('?')[0].split('/').pop() || url;
  }

  private isUrlValid(cached: CachedUrl): boolean {
    const now = Date.now();
    return now < (cached.expires - this.BUFFER_TIME);
  }

  private async generateSignedUrl(originalUrl: string): Promise<string | null> {
    try {
      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(originalUrl);
      
      if (!filePath) {
        logger.error('Could not extract file path from URL:', originalUrl);
        return originalUrl;
      }

      // Import supabase here to avoid circular dependency
      const { supabase } = await import('@/lib/supabase');
      
      // Create signed URL
      const { data, error } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(filePath, 7200); // 2 hours

      if (error) {
        logger.error('Error creating signed URL:', error.message);
        return originalUrl;
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      return null;
    }
  }

  private extractFilePathFromUrl(audioUrl: string): string {
    let filePath = '';
    
    if (audioUrl.includes('/object/sign/audio-files/')) {
      const pathStart = audioUrl.indexOf('/object/sign/audio-files/') + '/object/sign/audio-files/'.length;
      const pathEnd = audioUrl.indexOf('?') !== -1 ? audioUrl.indexOf('?') : audioUrl.length;
      filePath = audioUrl.substring(pathStart, pathEnd);
    } else if (audioUrl.includes('/object/public/audio-files/')) {
      const pathStart = audioUrl.indexOf('/object/public/audio-files/') + '/object/public/audio-files/'.length;
      filePath = audioUrl.substring(pathStart);
    } else if (audioUrl.includes('storage/v1/object/')) {
      const urlParts = audioUrl.split('/');
      const audioFilesIndex = urlParts.findIndex(part => part === 'audio-files');
      
      if (audioFilesIndex !== -1) {
        filePath = urlParts.slice(audioFilesIndex + 1).join('/').split('?')[0];
      }
    } else {
      const urlParts = audioUrl.split('/');
      const audioFilesIndex = urlParts.findIndex(part => part === 'audio-files');
      
      if (audioFilesIndex !== -1) {
        filePath = urlParts.slice(audioFilesIndex + 1).join('/').split('?')[0];
      }
    }
    
    return filePath;
  }

  private setCachedUrl(originalUrl: string, signedUrl: string): void {
    const cacheKey = this.getCacheKey(originalUrl);
    
    // Extract expiry from signed URL
    let expires = Date.now() + (3600 * 1000); // Default 1 hour
    try {
      if (signedUrl.includes('token=')) {
        const token = signedUrl.split('token=')[1].split('&')[0];
        const payload = JSON.parse(atob(token.split('.')[1]));
        expires = payload.exp * 1000;
      }
    } catch {
      // Use default expiry
    }

    // Manage cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      url: signedUrl,
      expires,
      originalUrl,
      createdAt: Date.now(),
      accessCount: 1
    });

    logger.debug('Cached new URL, expires at:', new Date(expires));
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.createdAt < oldestTime) {
        oldestTime = cached.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Evicted oldest cached URL:', oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now >= cached.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up', cleaned, 'expired URLs from cache');
    }
  }

  // Debug methods
  getCacheStats(): { size: number; entries: Array<{ key: string; expires: Date; accessCount: number }> } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, cached]) => ({
        key,
        expires: new Date(cached.expires),
        accessCount: cached.accessCount
      }))
    };
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }
}

// Performance metrics for analytics
interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalBandwidthSaved: number;
  averageLoadTime: number;
  loadTimes: number[];
}

// Enhanced AudioCache with performance tracking
export class AudioCacheManager {
  private urlCache: AudioUrlCache;
  private performanceMetrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalBandwidthSaved: 0,
    averageLoadTime: 0,
    loadTimes: []
  };

  constructor() {
    this.urlCache = new AudioUrlCache();
  }

  async getCachedAudioUrl(audioUrl: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      // First check if we already have a cached URL
      const stats = this.urlCache.getCacheStats();
      const existingEntry = stats.entries.find(entry => 
        audioUrl.includes(entry.key) || entry.key === this.extractCacheKey(audioUrl)
      );
      
      if (existingEntry && existingEntry.expires > new Date()) {
        this.performanceMetrics.cacheHits++;
        const loadTime = Date.now() - startTime;
        this.updatePerformanceMetrics(loadTime, true);
        return await this.urlCache.getCachedUrl(audioUrl);
      } else {
        this.performanceMetrics.cacheMisses++;
        const url = await this.urlCache.getCachedUrl(audioUrl);
        const loadTime = Date.now() - startTime;
        this.updatePerformanceMetrics(loadTime, false);
        return url;
      }
    } catch (error) {
      const loadTime = Date.now() - startTime;
      this.updatePerformanceMetrics(loadTime, false);
      throw error;
    }
  }

  private extractCacheKey(url: string): string {
    return url.split('?')[0].split('/').pop() || url;
  }

  private updatePerformanceMetrics(loadTime: number, wasHit: boolean): void {
    this.performanceMetrics.loadTimes.push(loadTime);
    
    // Keep only last 100 measurements
    if (this.performanceMetrics.loadTimes.length > 100) {
      this.performanceMetrics.loadTimes.shift();
    }
    
    this.performanceMetrics.averageLoadTime = 
      this.performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / 
      this.performanceMetrics.loadTimes.length;
      
    if (wasHit) {
      // Estimate 5MB saved per cache hit
      this.performanceMetrics.totalBandwidthSaved += 5 * 1024 * 1024;
    }
  }

  getPerformanceStats() {
    const total = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    
    return {
      hitRate: total > 0 ? this.performanceMetrics.cacheHits / total : 0,
      averageLoadTime: this.performanceMetrics.averageLoadTime,
      totalRequests: total,
      estimatedBandwidthSaved: this.performanceMetrics.totalBandwidthSaved
    };
  }

  clearCache(): void {
    this.urlCache.clearCache();
  }

  getCacheStats() {
    return this.urlCache.getCacheStats();
  }
}

// Export singleton instance
export const audioUrlCache = new AudioUrlCache();
export const audioCacheManager = new AudioCacheManager();

// Convenience functions
export const getCachedAudioUrl = (originalUrl: string): Promise<string> => 
  audioCacheManager.getCachedAudioUrl(originalUrl);

export const refreshAudioUrl = (originalUrl: string): Promise<string> => 
  audioUrlCache.refreshIfNeeded(originalUrl);

export const isAudioUrlExpired = (signedUrl: string): boolean => 
  audioUrlCache.isUrlExpired(signedUrl);
