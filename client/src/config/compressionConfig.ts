// Production Environment Configuration for Audio Compression
export const compressionConfig = {
  // Enable compression in production, keep for testing in development
  enableCompression: process.env.NODE_ENV === 'production' || process.env.COMPRESSION_ENABLED === 'true',
  
  // Default compression quality
  defaultQuality: (process.env.COMPRESSION_QUALITY as 'high' | 'medium' | 'low') || 'medium',
  
  // Maximum processing time before timeout (in minutes)
  maxProcessingTime: parseInt(process.env.COMPRESSION_TIMEOUT || '10') * 60 * 1000,
  
  // Fallback to original file if compression fails
  fallbackToOriginal: process.env.COMPRESSION_FALLBACK !== 'false',
  
  // Enable analytics tracking
  enableAnalytics: process.env.COMPRESSION_ANALYTICS !== 'false',
  
  // File size limits
  maxFileSize: parseInt(process.env.MAX_AUDIO_FILE_SIZE || '52428800'), // 50MB default
  
  // Performance thresholds
  performance: {
    maxMemoryIncrease: 100 * 1024 * 1024, // 100MB
    maxProcessingTime: 300, // 5 minutes
    minCompressionRatio: 1.1, // At least 10% reduction expected
  },
  
  // Aggressive compression settings
  aggressiveCompression: {
    enabled: process.env.AGGRESSIVE_COMPRESSION !== 'false',
    targetBitrates: {
      high: '128k',
      medium: '96k', 
      low: '64k'
    },
    minBitrate: '32k' // Absolute minimum
  }
};

// Environment-specific settings
export const getCompressionSettings = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development compression settings loaded');
    return {
      ...compressionConfig,
      enableAnalytics: true, // Always enable in dev for testing
      performance: {
        ...compressionConfig.performance,
        maxProcessingTime: 600 // 10 minutes for dev testing
      }
    };
  }
  
  console.log('🚀 Production compression settings loaded');
  return compressionConfig;
};

export default compressionConfig;