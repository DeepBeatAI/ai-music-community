interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

interface ImageCacheStats {
  totalImages: number;
  totalSize: number;
  hitRate: number;
  oldestEntry: number;
}

class ImageCacheManager {
  private cache = new Map<string, CachedImage>();
  private maxSize = 50 * 1024 * 1024; // 50MB limit
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  private hits = 0;
  private misses = 0;

  async getImage(url: string): Promise<string> {
    const cacheKey = this.generateCacheKey(url);
    
    // Check memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      this.hits++;
      return URL.createObjectURL(cached.blob);
    }

    // Check IndexedDB
    const indexedDBCache = await this.getFromIndexedDB(cacheKey);
    if (indexedDBCache && this.isValidCache(indexedDBCache)) {
      this.cache.set(cacheKey, indexedDBCache);
      this.hits++;
      return URL.createObjectURL(indexedDBCache.blob);
    }

    // Fetch from network
    this.misses++;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const imageCache: CachedImage = {
        url,
        blob,
        timestamp: Date.now(),
        size: blob.size
      };

      // Store in memory and IndexedDB
      await this.storeImage(cacheKey, imageCache);
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to load image:', error);
      return url; // Fallback to original URL
    }
  }

  private async storeImage(key: string, image: CachedImage): Promise<void> {
    // Store in memory cache
    this.cache.set(key, image);
    
    // Clean up if over size limit
    await this.cleanup();
    
    // Store in IndexedDB
    await this.storeInIndexedDB(key, image);
  }

  private async cleanup(): Promise<void> {
    const currentSize = Array.from(this.cache.values())
      .reduce((total, img) => total + img.size, 0);
    
    if (currentSize > this.maxSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      let removedSize = 0;
      for (const [key, image] of entries) {
        this.cache.delete(key);
        removedSize += image.size;
        
        if (currentSize - removedSize < this.maxSize * 0.8) break;
      }
    }
  }

  private isValidCache(cached: CachedImage): boolean {
    return Date.now() - cached.timestamp < this.maxAge;
  }

  private generateCacheKey(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '');
  }

  private async storeInIndexedDB(key: string, image: CachedImage): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ImageCache', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        store.put({ key, ...image });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(key: string): Promise<CachedImage | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('ImageCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { key: _, ...imageData } = result;
            resolve(imageData as CachedImage);
          } else {
            resolve(null);
          }
        };
        
        getRequest.onerror = () => resolve(null);
      };
      
      request.onerror = () => resolve(null);
    });
  }

  getStats(): ImageCacheStats {
    const images = Array.from(this.cache.values());
    return {
      totalImages: images.length,
      totalSize: images.reduce((total, img) => total + img.size, 0),
      hitRate: this.hits / (this.hits + this.misses) || 0,
      oldestEntry: Math.min(...images.map(img => img.timestamp)) || 0
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    
    // Clear IndexedDB
    const request = indexedDB.deleteDatabase('ImageCache');
    request.onsuccess = () => console.log('Image cache cleared');
  }
}

export const imageCache = new ImageCacheManager();