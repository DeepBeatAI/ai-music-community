// Compression Analytics and Performance Monitoring
interface CompressionMetrics {
  sessionId: string;
  userId: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
  compressionApplied: boolean;
  quality: string;
  bitrate: string;
  originalBitrate: string;
  bandwidthSaved: number;
  timestamp: string;
}

class CompressionAnalytics {
  private sessionId = Math.random().toString(36).substring(2);
  private metrics: CompressionMetrics[] = [];
  
  async trackCompression(data: Omit<CompressionMetrics, 'sessionId' | 'timestamp' | 'bandwidthSaved'>) {
    try {
      const bandwidthSaved = Math.max(0, data.originalSize - data.compressedSize);
      
      const fullMetrics: CompressionMetrics = {
        ...data,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        bandwidthSaved
      };

      // Store locally for session analysis
      this.metrics.push(fullMetrics);

      // Send to analytics (if endpoint exists)
      try {
        await fetch('/api/analytics/compression', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullMetrics)
        });
      } catch (apiError) {
        console.warn('📊 Analytics API not available, storing locally only');
      }

      console.log('📊 Compression metrics tracked:', {
        file: data.fileName,
        savings: `${(bandwidthSaved / 1024 / 1024).toFixed(2)}MB`,
        ratio: `${data.compressionRatio.toFixed(2)}x`,
        time: `${data.processingTime.toFixed(1)}s`
      });

    } catch (error) {
      console.warn('⚠️ Failed to track compression metrics:', error);
    }
  }

  getSessionStats() {
    if (this.metrics.length === 0) return null;

    const totalOriginalSize = this.metrics.reduce((sum, m) => sum + m.originalSize, 0);
    const totalCompressedSize = this.metrics.reduce((sum, m) => sum + m.compressedSize, 0);
    const totalBandwidthSaved = this.metrics.reduce((sum, m) => sum + m.bandwidthSaved, 0);
    const avgCompressionRatio = this.metrics.reduce((sum, m) => sum + m.compressionRatio, 0) / this.metrics.length;
    const avgProcessingTime = this.metrics.reduce((sum, m) => sum + m.processingTime, 0) / this.metrics.length;

    return {
      filesProcessed: this.metrics.length,
      totalOriginalSize,
      totalCompressedSize,
      totalBandwidthSaved,
      avgCompressionRatio,
      avgProcessingTime,
      compressionSuccessRate: this.metrics.filter(m => m.compressionApplied).length / this.metrics.length,
      sessionId: this.sessionId
    };
  }

  getBandwidthSavings(originalSize: number, compressedSize: number): number {
    return Math.max(0, originalSize - compressedSize);
  }

  // Performance validation
  validateCompressionPerformance() {
    console.log('🔍 COMPRESSION PERFORMANCE VALIDATION');
    
    const stats = this.getSessionStats();
    if (!stats) {
      console.log('📝 No compression data available for validation');
      return;
    }

    console.log('📊 Session Statistics:');
    console.log(`  - Files processed: ${stats.filesProcessed}`);
    console.log(`  - Total bandwidth saved: ${(stats.totalBandwidthSaved / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  - Average compression: ${stats.avgCompressionRatio.toFixed(2)}x`);
    console.log(`  - Average processing time: ${stats.avgProcessingTime.toFixed(1)}s`);
    console.log(`  - Success rate: ${(stats.compressionSuccessRate * 100).toFixed(1)}%`);

    // Performance benchmarks
    const performanceGrade = this.calculatePerformanceGrade(stats);
    console.log(`🎯 Performance Grade: ${performanceGrade}`);

    return stats;
  }

  private calculatePerformanceGrade(stats: ReturnType<CompressionAnalytics['getSessionStats']>) {
    if (!stats) return 'N/A';

    let score = 0;
    
    // Bandwidth savings (0-40 points)
    const savingsPercent = stats.totalBandwidthSaved / stats.totalOriginalSize;
    if (savingsPercent >= 0.6) score += 40;
    else if (savingsPercent >= 0.4) score += 30;
    else if (savingsPercent >= 0.2) score += 20;
    else score += 10;

    // Processing speed (0-30 points)
    if (stats.avgProcessingTime <= 30) score += 30;
    else if (stats.avgProcessingTime <= 60) score += 20;
    else if (stats.avgProcessingTime <= 120) score += 10;

    // Success rate (0-30 points)
    if (stats.compressionSuccessRate >= 0.95) score += 30;
    else if (stats.compressionSuccessRate >= 0.8) score += 20;
    else if (stats.compressionSuccessRate >= 0.6) score += 10;

    if (score >= 85) return 'A+ (Excellent)';
    if (score >= 70) return 'A (Very Good)';
    if (score >= 55) return 'B (Good)';
    if (score >= 40) return 'C (Fair)';
    return 'D (Needs Improvement)';
  }
}

// Memory usage monitoring
class MemoryMonitor {
  private startMemory: number = 0;
  
  startMonitoring() {
    if ('memory' in performance) {
      this.startMemory = (performance as any).memory.usedJSHeapSize;
      console.log('🧠 Memory monitoring started:', this.formatBytes(this.startMemory));
    }
  }

  checkMemoryUsage() {
    if ('memory' in performance) {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = currentMemory - this.startMemory;
      
      console.log('🧠 Memory usage check:');
      console.log(`  - Current: ${this.formatBytes(currentMemory)}`);
      console.log(`  - Increase: ${this.formatBytes(memoryIncrease)}`);
      
      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
        console.warn('⚠️ High memory usage detected');
      }
      
      return { currentMemory, memoryIncrease };
    }
    return null;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export instances
export const compressionAnalytics = new CompressionAnalytics();
export const memoryMonitor = new MemoryMonitor();

// Browser-based validation script
export const validateProductionCompression = () => {
  console.log('🚀 PRODUCTION COMPRESSION VALIDATION');
  console.log('=====================================');
  
  // Check 1: Compression API accessibility
  fetch('/api/audio/compress', { method: 'OPTIONS' })
    .then(response => {
      console.log(`✅ Compression API accessible: ${response.status === 200 ? 'YES' : 'NO'}`);
    })
    .catch(error => {
      console.error('❌ Compression API not accessible:', error.message);
    });

  // Check 2: AudioUpload component detection
  const audioUploadElements = document.querySelectorAll('[data-testid="audio-upload"], input[accept*="audio"]');
  console.log(`✅ Audio upload components found: ${audioUploadElements.length}`);

  // Check 3: Environment validation
  const isDev = window.location.hostname === 'localhost';
  console.log(`✅ Environment: ${isDev ? 'Development' : 'Production'}`);

  // Check 4: Performance monitor availability
  const hasPerformanceAPI = 'performance' in window && 'memory' in performance;
  console.log(`✅ Performance monitoring: ${hasPerformanceAPI ? 'Available' : 'Limited'}`);

  console.log('=====================================');
  console.log('🔍 Manual testing steps:');
  console.log('1. Upload a 5MB+ audio file via dashboard');
  console.log('2. Verify compression progress indicator appears');
  console.log('3. Check compression success message shows bandwidth saved');
  console.log('4. Confirm file uploads successfully');
  console.log('=====================================');
};

// Auto-run validation in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Run after a delay to ensure DOM is ready
  setTimeout(validateProductionCompression, 2000);
}