// Create: src/utils/performanceAnalytics.ts

interface PerformanceEvent {
  type: 'page_load' | 'audio_load' | 'image_load' | 'cache_hit' | 'cache_miss' | 'error';
  timestamp: number;
  duration?: number;
  size?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  
  // Custom metrics
  audioLoadTime: number;
  cacheHitRate: number;
  bandwidthSaved: number;
  totalRequests: number;
  errorRate: number;
}

interface AnalyticsConfig {
  enableRealTimeTracking: boolean;
  sampleRate: number; // 0.0 to 1.0
  batchSize: number;
  maxEvents: number;
}

class PerformanceAnalyticsManager {
  private events: PerformanceEvent[] = [];
  private metrics: Partial<PerformanceMetrics> = {};
  private config: AnalyticsConfig = {
    enableRealTimeTracking: true,
    sampleRate: 1.0, // Track everything in development
    batchSize: 50,
    maxEvents: 1000
  };
  private performanceObserver?: PerformanceObserver;
  private startTime = Date.now();

  constructor() {
    this.initializeWebVitals();
    this.initializePerformanceObserver();
  }

  trackEvent(event: Omit<PerformanceEvent, 'timestamp'>): void {
    if (Math.random() > this.config.sampleRate) return;

    const fullEvent: PerformanceEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);
    this.updateRealTimeMetrics(fullEvent);

    // Clean up old events
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents * 0.8);
    }

    // Batch reporting (in production, send to analytics service)
    if (this.events.length % this.config.batchSize === 0) {
      this.reportBatch();
    }
  }

  private initializeWebVitals(): void {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
        }
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.fid = (entry as any).processingStart - entry.startTime;
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          this.metrics.cls = clsValue;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private initializePerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.trackResourceLoad(entry as PerformanceResourceTiming);
        }
      }
    });
    this.performanceObserver.observe({ entryTypes: ['resource'] });
  }

  private trackResourceLoad(entry: PerformanceResourceTiming): void {
    const isAudio = entry.name.includes('audio') || entry.name.includes('.mp3') ||
      entry.name.includes('.wav');
    const isImage = entry.name.includes('image') || entry.name.includes('.jpg') ||
      entry.name.includes('.png');

    if (isAudio) {
      this.trackEvent({
        type: 'audio_load',
        duration: entry.responseEnd - entry.requestStart,
        size: entry.transferSize,
        url: entry.name,
        metadata: {
          fromCache: entry.transferSize === 0,
          redirectCount: entry.redirectCount
        }
      });
    } else if (isImage) {
      this.trackEvent({
        type: 'image_load',
        duration: entry.responseEnd - entry.requestStart,
        size: entry.transferSize,
        url: entry.name,
        metadata: {
          fromCache: entry.transferSize === 0
        }
      });
    }
  }

  private updateRealTimeMetrics(event: PerformanceEvent): void {
    if (!this.config.enableRealTimeTracking) return;

    const recentEvents = this.events.filter(e =>
      e.timestamp > Date.now() - (5 * 60 * 1000) // Last 5 minutes
    );

    // Calculate cache hit rate
    const cacheHits = recentEvents.filter(e => e.type === 'cache_hit').length;
    const totalRequests = recentEvents.filter(e =>
      ['cache_hit', 'cache_miss'].includes(e.type)
    ).length;

    this.metrics.cacheHitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;

    // Calculate average audio load time
    const audioLoads = recentEvents.filter(e => e.type === 'audio_load');
    this.metrics.audioLoadTime = audioLoads.length > 0
      ? audioLoads.reduce((sum, e) => sum + (e.duration || 0), 0) / audioLoads.length
      : 0;

    // Calculate bandwidth saved
    const savedTransfers = recentEvents.filter(e =>
      e.metadata?.fromCache === true
    );
    this.metrics.bandwidthSaved = savedTransfers.reduce((sum, e) =>
      sum + (e.size || 0), 0
    );

    // Error rate
    const errors = recentEvents.filter(e => e.type === 'error').length;
    this.metrics.errorRate = totalRequests > 0 ? errors / totalRequests : 0;

    this.metrics.totalRequests = totalRequests;
  }

  getCurrentMetrics(): PerformanceMetrics {
    return {
      fcp: this.metrics.fcp || 0,
      lcp: this.metrics.lcp || 0,
      fid: this.metrics.fid || 0,
      cls: this.metrics.cls || 0,
      audioLoadTime: this.metrics.audioLoadTime || 0,
      cacheHitRate: this.metrics.cacheHitRate || 0,
      bandwidthSaved: this.metrics.bandwidthSaved || 0,
      totalRequests: this.metrics.totalRequests || 0,
      errorRate: this.metrics.errorRate || 0
    };
  }

  getDetailedAnalytics(): {
    events: PerformanceEvent[];
    metrics: PerformanceMetrics;
    sessionDuration: number;
    summary: {
      totalAudioLoads: number;
      totalImageLoads: number;
      averageAudioSize: number;
      totalBandwidthUsed: number;
      performanceScore: number;
      recommendations: string[];
    };
  } {
    const metrics = this.getCurrentMetrics();
    const sessionDuration = Date.now() - this.startTime;

    // Generate summary statistics
    const audioEvents = this.events.filter(e => e.type === 'audio_load');
    const imageEvents = this.events.filter(e => e.type === 'image_load');

    const summary = {
      totalAudioLoads: audioEvents.length,
      totalImageLoads: imageEvents.length,
      averageAudioSize: audioEvents.length > 0
        ? audioEvents.reduce((sum, e) => sum + (e.size || 0), 0) / audioEvents.length
        : 0,
      totalBandwidthUsed: this.events.reduce((sum, e) => sum + (e.size || 0), 0),
      performanceScore: this.calculatePerformanceScore(metrics),
      recommendations: this.generateRecommendations(metrics)
    };

    return {
      events: this.events,
      metrics,
      sessionDuration,
      summary
    };
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Deduct points for poor Core Web Vitals
    if (metrics.lcp > 2500) score -= 20;
    else if (metrics.lcp > 4000) score -= 40;

    if (metrics.fid > 100) score -= 15;
    else if (metrics.fid > 300) score -= 30;

    if (metrics.cls > 0.1) score -= 15;
    else if (metrics.cls > 0.25) score -= 30;

    // Bonus points for good caching
    if (metrics.cacheHitRate > 0.8) score += 10;
    if (metrics.errorRate < 0.05) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by preloading critical images');
    }

    if (metrics.cacheHitRate < 0.7) {
      recommendations.push('Improve cache hit rate by extending cache TTL values');
    }

    if (metrics.audioLoadTime > 3000) {
      recommendations.push('Consider audio compression or CDN optimization');
    }

    if (metrics.errorRate > 0.1) {
      recommendations.push('Investigate and fix error sources to improve reliability');
    }

    return recommendations;
  }

  private reportBatch(): void {
    // In production, send to analytics service
    console.log(`Analytics batch: ${this.config.batchSize} events processed`);
    
    // Could implement actual reporting here:
    // await fetch('/api/analytics', {
    //   method: 'POST',
    //   body: JSON.stringify(this.events.slice(-this.config.batchSize))
    // });
  }

  exportData(): string {
    return JSON.stringify(this.getDetailedAnalytics(), null, 2);
  }

  destroy(): void {
    this.performanceObserver?.disconnect();
  }
}

export const performanceAnalytics = new PerformanceAnalyticsManager();

// Global error tracking
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    performanceAnalytics.trackEvent({
      type: 'error',
      url: event.filename,
      metadata: {
        message: event.message,
        line: event.lineno,
        column: event.colno
      }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    performanceAnalytics.trackEvent({
      type: 'error',
      metadata: {
        reason: event.reason?.toString()
      }
    });
  });
}