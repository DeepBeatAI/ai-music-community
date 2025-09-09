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
      console.log('✅ Using cached URL, access count:', cached.accessCount);
      return cached.url;
    }

    // Generate new signed URL
    console.log('🔄 Generating fresh signed URL for cache');
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
      console.log('⚡ Proactively refreshing URL before expiry');
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
      // Import here to avoid circular dependency
      const { getAudioSignedUrl } = await import('./audio');
      return await getAudioSignedUrl(originalUrl);
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }
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

    console.log('💾 Cached new URL, expires at:', new Date(expires));
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
      console.log('🗑️ Evicted oldest cached URL:', oldestKey);
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
      console.log('🧹 Cleaned up', cleaned, 'expired URLs from cache');
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
    console.log('🗑️ Cache cleared');
  }
}

// Export singleton instance
export const audioUrlCache = new AudioUrlCache();

// Convenience functions
export const getCachedAudioUrl = (originalUrl: string): Promise<string> => 
  audioUrlCache.getCachedUrl(originalUrl);

export const refreshAudioUrl = (originalUrl: string): Promise<string> => 
  audioUrlCache.refreshIfNeeded(originalUrl);

export const isAudioUrlExpired = (signedUrl: string): boolean => 
  audioUrlCache.isUrlExpired(signedUrl);
