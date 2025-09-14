// Server-side audio compression service with enhanced diagnostics
export interface CompressionOptions {
  quality: 'high' | 'medium' | 'low';
  maxFileSize?: number; // in bytes
  targetBitrate?: string; // e.g., '128k', '192k', '256k'
}

export interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  bitrate: string;
  supabaseUrl?: string;
  error?: string;
  processingTime?: number;
}

export class ServerAudioCompressor {
  private readonly apiEndpoint = '/api/audio/compress';

  async compressAudio(
    file: File,
    options: CompressionOptions = { quality: 'medium' }
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    
    try {
      // Validate file
      if (!file.type.startsWith('audio/')) {
        throw new Error('File must be an audio file');
      }

      console.log(`🎵 Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      console.log(`⚙️  Options:`, options);

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));

      console.log(`📤 Sending to ${this.apiEndpoint}...`);

      // Make API request with much longer timeout for large files
      const controller = new AbortController();
      const timeoutMinutes = this.getTimeoutForFile(file.size);
      const timeoutMs = timeoutMinutes * 60 * 1000;
      
      console.log(`⏰ Setting timeout to ${timeoutMinutes} minutes for ${(file.size / 1024 / 1024).toFixed(2)}MB file`);
      
      const timeoutId = setTimeout(() => {
        console.error(`❌ Timeout after ${timeoutMinutes} minutes`);
        controller.abort();
      }, timeoutMs);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const processingTime = (Date.now() - startTime) / 1000;

      console.log(`📨 Response status: ${response.status} (took ${processingTime.toFixed(1)}s)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }
      }

      const result: CompressionResult = await response.json();
      result.processingTime = processingTime;
      
      console.log(`📊 Compression result:`, result);

      if (!result.success) {
        throw new Error(result.error || 'Compression failed');
      }

      console.log(`✅ Compression successful: ${(result.originalSize / 1024 / 1024).toFixed(2)}MB → ${(result.compressedSize / 1024 / 1024).toFixed(2)}MB (${result.compressionRatio.toFixed(2)}x reduction) in ${processingTime.toFixed(1)}s`);

      return result;

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      console.error('❌ Audio compression error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          originalSize: file.size,
          compressedSize: 0,
          compressionRatio: 0,
          duration: 0,
          bitrate: '',
          processingTime,
          error: `Compression timeout after ${processingTime.toFixed(1)}s - file may be too large or FFmpeg may be having issues`
        };
      }
      
      return {
        success: false,
        originalSize: file.size,
        compressedSize: 0,
        compressionRatio: 0,
        duration: 0,
        bitrate: '',
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown compression error'
      };
    }
  }

  private getTimeoutForFile(fileSize: number): number {
    // Dynamic timeout based on file size
    const sizeMB = fileSize / (1024 * 1024);
    
    if (sizeMB > 50) return 15; // 15 minutes for very large files
    if (sizeMB > 25) return 10; // 10 minutes for large files  
    if (sizeMB > 10) return 8;  // 8 minutes for medium files
    if (sizeMB > 5) return 5;   // 5 minutes for smaller files
    return 3; // 3 minutes for small files
  }

  // Test with a small file first
  async testWithSmallFile(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🧪 Testing with small generated file...');
      
      // Create a small test MP3 file (1 second of silence)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 100;
      canvas.height = 50;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 100, 50);
      
      // Convert to blob and create a test file
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg');
      });
      
      // Create a minimal audio file for testing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 1, audioContext.sampleRate);
      
      // This is just for testing - in real scenario we'd need proper MP3 encoding
      const testFile = new File([blob], 'test.mp3', { type: 'audio/mpeg' });
      
      console.log(`📁 Created test file: ${testFile.size} bytes`);
      
      const result = await this.compressAudio(testFile, { quality: 'low', targetBitrate: '96k' });
      
      return {
        success: result.success,
        message: result.success ? 'Small file test passed' : 'Small file test failed',
        details: result
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Small file test failed: ${error}`,
        details: null
      };
    }
  }

  async getCompressionPreview(file: File, options: CompressionOptions): Promise<{
    shouldCompress: boolean;
    estimatedSize: number;
    targetBitrate: string;
    estimatedDuration: number;
    estimatedTime: number;
  }> {
    const duration = await this.getAudioDuration(file);
    const targetBitrate = this.getTargetBitrateForPreview(options, file.size);
    const bitrateKbps = parseInt(targetBitrate.replace('k', ''));
    const estimatedSize = Math.floor((bitrateKbps * duration * 1024) / 8);
    
    // Estimate processing time based on file size
    const sizeMB = file.size / (1024 * 1024);
    const estimatedTime = Math.max(30, sizeMB * 3); // ~3 seconds per MB

    return {
      shouldCompress: true,
      estimatedSize,
      targetBitrate,
      estimatedDuration: duration,
      estimatedTime
    };
  }

  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const timeoutId = setTimeout(() => resolve(0), 10000); // Longer timeout
      
      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeoutId);
        resolve(audio.duration || 0);
      });
      
      audio.addEventListener('error', () => {
        clearTimeout(timeoutId);
        resolve(0);
      });
      
      audio.src = URL.createObjectURL(file);
    });
  }

  getRecommendedSettings(file: File): CompressionOptions {
    const fileSizeMB = file.size / (1024 * 1024);
    console.log(`📏 File size: ${fileSizeMB.toFixed(2)}MB`);

    if (fileSizeMB > 50) {
      console.log(`🎯 Recommended: LOW quality (file > 50MB)`);
      return { quality: 'low', targetBitrate: '96k' };
    } else if (fileSizeMB > 25) {
      console.log(`🎯 Recommended: LOW quality (file > 25MB)`);
      return { quality: 'low', targetBitrate: '128k' };
    } else if (fileSizeMB > 10) {
      console.log(`🎯 Recommended: MEDIUM quality (file > 10MB)`);
      return { quality: 'medium', targetBitrate: '112k' }; // Lower bitrate for faster processing
    } else if (fileSizeMB > 3) {
      console.log(`🎯 Recommended: MEDIUM quality (file > 3MB)`);
      return { quality: 'medium', targetBitrate: '112k' };
    } else {
      console.log(`🎯 Recommended: HIGH quality (file <= 3MB)`);
      return { quality: 'high', targetBitrate: '160k' };
    }
  }

  private getTargetBitrateForPreview(options: CompressionOptions, fileSize: number): string {
    if (options.targetBitrate) return options.targetBitrate;

    const fileSizeMB = fileSize / (1024 * 1024);
    
    switch (options.quality) {
      case 'high':
        return fileSizeMB > 20 ? '256k' : fileSizeMB > 10 ? '192k' : '160k';
      case 'medium':
        return fileSizeMB > 20 ? '192k' : fileSizeMB > 10 ? '128k' : '112k';
      case 'low':
        return fileSizeMB > 20 ? '128k' : fileSizeMB > 10 ? '96k' : '80k';
      default:
        return '128k';
    }
  }
}

// Export singleton instance
export const serverAudioCompressor = new ServerAudioCompressor();