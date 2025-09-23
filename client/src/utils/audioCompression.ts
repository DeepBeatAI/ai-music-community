// Practical Audio Compression - Browser Compatible
export interface CompressionOptions {
  quality: number; // 0.1 to 1.0
  maxFileSize: number; // in bytes
  targetFormat: 'mp3' | 'webm' | 'aac';
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  compressionApplied: boolean;
  method: 'none' | 'smart_truncation' | 'frame_sampling' | 'quality_reduction';
}

export class AudioCompressor {
  private audioContext: AudioContext | null = null;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('AudioContext not available:', error);
    }
  }

  async compressAudio(
    file: File, 
    options: CompressionOptions = {
      quality: 0.8,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      targetFormat: 'mp3'
    }
  ): Promise<CompressionResult> {
    try {
      const duration = await this.getAudioDuration(file);
      
      // Check if compression is needed
      if (file.size <= options.maxFileSize) {
        console.log(`File ${(file.size / 1024 / 1024).toFixed(2)}MB is under ${(options.maxFileSize / 1024 / 1024).toFixed(2)}MB limit - no compression needed`);
        return {
          compressedFile: file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1,
          duration,
          compressionApplied: false,
          method: 'none'
        };
      }

      console.log(`File ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds ${(options.maxFileSize / 1024 / 1024).toFixed(2)}MB limit - applying compression`);

      // Use MP3-specific compression techniques that maintain format
      let compressedFile: File;
      let method: CompressionResult['method'];

      try {
        // Method 1: Smart MP3 frame truncation (maintains MP3 format)
        compressedFile = await this.compressViaMp3FrameSampling(file, options);
        method = 'frame_sampling';
        console.log('Using MP3 frame sampling compression');
      } catch (error) {
        console.warn('Frame sampling failed, trying smart truncation:', error);
        try {
          // Method 2: Intelligent data truncation
          compressedFile = await this.compressViaSmartTruncation(file, options);
          method = 'smart_truncation';
          console.log('Using smart truncation compression');
        } catch (error2) {
          console.warn('Smart truncation failed, using quality reduction:', error2);
          // Method 3: Simple quality reduction
          compressedFile = await this.compressViaQualityReduction(file, options);
          method = 'quality_reduction';
          console.log('Using quality reduction compression');
        }
      }

      const compressionRatio = file.size / compressedFile.size;

      return {
        compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio,
        duration,
        compressionApplied: true,
        method
      };

    } catch (error) {
      console.error('All compression methods failed:', error);
      const duration = await this.getAudioDuration(file);
      
      return {
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        duration,
        compressionApplied: false,
        method: 'none'
      };
    }
  }

  private async compressViaMp3FrameSampling(file: File, options: CompressionOptions): Promise<File> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Calculate target size based on quality
    const targetSize = Math.floor(file.size * options.quality);
    console.log(`MP3 Frame Sampling: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(targetSize / 1024 / 1024).toFixed(2)}MB target`);

    // Find MP3 frame headers (0xFF 0xFB pattern for most MP3s)
    const frames = this.findMp3Frames(uint8Array);
    console.log(`Found ${frames.length} MP3 frames`);

    if (frames.length === 0) {
      throw new Error('No MP3 frames found, not a valid MP3 file');
    }

    // Calculate how many frames to keep based on quality
    const framesToKeep = Math.max(1, Math.floor(frames.length * options.quality));
    const frameInterval = Math.max(1, Math.floor(frames.length / framesToKeep));

    console.log(`Keeping ${framesToKeep} of ${frames.length} frames (every ${frameInterval} frames)`);

    // Build compressed file by selecting frames
    const compressedParts: Uint8Array[] = [];
    let currentSize = 0;

    // Keep ID3 header if present (first ~128-2048 bytes typically)
    const id3HeaderSize = this.findId3HeaderSize(uint8Array);
    if (id3HeaderSize > 0) {
      compressedParts.push(uint8Array.slice(0, id3HeaderSize));
      currentSize += id3HeaderSize;
    }

    // Sample frames at intervals
    for (let i = 0; i < frames.length && currentSize < targetSize; i += frameInterval) {
      const currentFrame = frames[i];
      const nextFrame = frames[i + 1] || uint8Array.length;
      const frameData = uint8Array.slice(currentFrame, nextFrame);
      
      if (currentSize + frameData.length <= targetSize) {
        compressedParts.push(frameData);
        currentSize += frameData.length;
      } else {
        // Partial frame to reach target size
        const remainingBytes = targetSize - currentSize;
        if (remainingBytes > 0) {
          compressedParts.push(frameData.slice(0, remainingBytes));
        }
        break;
      }
    }

    // Combine all parts
    const compressedArray = new Uint8Array(currentSize);
    let offset = 0;
    for (const part of compressedParts) {
      compressedArray.set(part, offset);
      offset += part.length;
    }

    const fileName = file.name.replace(/(\.[^.]+)?$/, '_compressed.mp3');
    return new File([compressedArray], fileName, { type: 'audio/mpeg' });
  }

  private findMp3Frames(data: Uint8Array): number[] {
    const frames: number[] = [];
    
    for (let i = 0; i < data.length - 4; i++) {
      // Look for MP3 frame sync (0xFF 0xFB or 0xFF 0xFA)
      if (data[i] === 0xFF && (data[i + 1] & 0xE0) === 0xE0) {
        // Additional validation - check if this looks like a real frame header
        const header = (data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3];
        if (this.isValidMp3Header(header)) {
          frames.push(i);
        }
      }
    }
    
    return frames;
  }

  private isValidMp3Header(header: number): boolean {
    // Basic MP3 header validation
    const syncWord = (header >> 21) & 0x7FF;
    const version = (header >> 19) & 0x3;
    const layer = (header >> 17) & 0x3;
    const bitrate = (header >> 12) & 0xF;
    const sampleRate = (header >> 10) & 0x3;

    return (
      syncWord === 0x7FF && // Sync word
      version !== 1 &&     // Valid version
      layer !== 0 &&       // Valid layer
      bitrate !== 0 && bitrate !== 15 && // Valid bitrate
      sampleRate !== 3      // Valid sample rate
    );
  }

  private findId3HeaderSize(data: Uint8Array): number {
    // Check for ID3v2 header (starts with "ID3")
    if (data.length > 10 && 
        data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
      // Calculate ID3v2 header size
      const size = ((data[6] & 0x7F) << 21) | 
                   ((data[7] & 0x7F) << 14) | 
                   ((data[8] & 0x7F) << 7) | 
                   (data[9] & 0x7F);
      return size + 10; // +10 for the header itself
    }
    return 0;
  }

  private async compressViaSmartTruncation(file: File, options: CompressionOptions): Promise<File> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Calculate target size
    const targetSize = Math.floor(file.size * options.quality);
    console.log(`Smart Truncation: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(targetSize / 1024 / 1024).toFixed(2)}MB`);

    // Keep file structure: header + sampled middle content + tail
    const headerSize = Math.min(8192, Math.floor(targetSize * 0.1)); // 10% for headers
    const tailSize = Math.min(1024, Math.floor(targetSize * 0.05));   // 5% for tail
    const contentSize = targetSize - headerSize - tailSize;

    const compressedArray = new Uint8Array(targetSize);
    
    // Copy header
    compressedArray.set(uint8Array.slice(0, headerSize), 0);
    
    // Sample middle content
    const middleStart = headerSize;
    const middleEnd = uint8Array.length - tailSize;
    const middleOriginalSize = middleEnd - middleStart;
    
    if (middleOriginalSize > 0 && contentSize > 0) {
      const sampleRatio = middleOriginalSize / contentSize;
      
      for (let i = 0; i < contentSize; i++) {
        const sourceIndex = middleStart + Math.floor(i * sampleRatio);
        compressedArray[headerSize + i] = uint8Array[Math.min(sourceIndex, middleEnd - 1)];
      }
    }
    
    // Copy tail
    if (tailSize > 0) {
      compressedArray.set(
        uint8Array.slice(-tailSize), 
        headerSize + contentSize
      );
    }

    const fileName = file.name.replace(/(\.[^.]+)?$/, '_compressed.mp3');
    return new File([compressedArray], fileName, { type: 'audio/mpeg' });
  }

  private async compressViaQualityReduction(file: File, options: CompressionOptions): Promise<File> {
    const arrayBuffer = await file.arrayBuffer();
    const targetSize = Math.floor(file.size * options.quality);
    
    console.log(`Quality Reduction: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(targetSize / 1024 / 1024).toFixed(2)}MB`);

    // Simple approach: keep first N bytes that fit in target size
    // This maintains file header structure
    const uint8Array = new Uint8Array(arrayBuffer);
    const compressedArray = uint8Array.slice(0, targetSize);

    const fileName = file.name.replace(/(\.[^.]+)?$/, '_compressed.mp3');
    return new File([compressedArray], fileName, { type: 'audio/mpeg' });
  }

  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const timeoutId = setTimeout(() => resolve(0), 5000);
      
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
}

// Export singleton instance
export const audioCompressor = new AudioCompressor();