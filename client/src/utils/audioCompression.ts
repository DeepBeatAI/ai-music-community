// Audio compression utility for reducing file sizes
interface CompressionOptions {
  quality: number; // 0.1 to 1.0
  maxFileSize: number; // in bytes
  targetFormat: 'mp3' | 'webm' | 'aac';
}

interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
}

// Type for WebKit AudioContext compatibility
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export class AudioCompressor {
  private audioContext: AudioContext;

  constructor() {
    // Proper typing for cross-browser AudioContext support
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass();
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
      // Check if compression is needed
      if (file.size <= options.maxFileSize) {
        return {
          compressedFile: file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1,
          duration: await this.getAudioDuration(file)
        };
      }

      // Load audio buffer
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Compress using Web Audio API
      const compressedBuffer = await this.processAudioBuffer(audioBuffer, options);
      
      // Convert back to file
      const compressedFile = await this.bufferToFile(
        compressedBuffer, 
        file.name, 
        options.targetFormat
      );

      return {
        compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio: file.size / compressedFile.size,
        duration: audioBuffer.duration
      };

    } catch (error) {
      console.error('Audio compression failed:', error);
      // Fallback to original file
      return {
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        duration: await this.getAudioDuration(file)
      };
    }
  }

  private async processAudioBuffer(
    buffer: AudioBuffer, 
    options: CompressionOptions
  ): Promise<AudioBuffer> {
    const { numberOfChannels, sampleRate } = buffer;
    
    // Calculate target sample rate based on quality
    const targetSampleRate = Math.floor(sampleRate * options.quality);
    
    // Create new buffer with potentially reduced sample rate
    const compressedBuffer = this.audioContext.createBuffer(
      numberOfChannels,
      Math.floor(buffer.length * (targetSampleRate / sampleRate)),
      targetSampleRate
    );

    // Copy and downsample audio data
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalData = buffer.getChannelData(channel);
      const compressedData = compressedBuffer.getChannelData(channel);
      
      // Simple linear interpolation downsampling
      const ratio = originalData.length / compressedData.length;
      
      for (let i = 0; i < compressedData.length; i++) {
        const sourceIndex = Math.floor(i * ratio);
        compressedData[i] = originalData[sourceIndex];
      }
    }

    return compressedBuffer;
  }

  private async bufferToFile(
    buffer: AudioBuffer, 
    originalName: string, 
    format: string
  ): Promise<File> {
    // This is a simplified implementation
    // In production, you'd use a library like lamejs for MP3 encoding
    
    // Create WAV file (simplified - in production use proper MP3 encoding)
    const arrayBuffer = this.audioBufferToWav(buffer);
    
    const fileName = originalName.replace(/\.[^/.]+$/, `.${format}`);
    return new File([arrayBuffer], fileName, { 
      type: `audio/${format}` 
    });
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const { numberOfChannels, sampleRate, length } = buffer;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    let offset = 0;
    writeString(offset, 'RIFF'); offset += 4;
    view.setUint32(offset, arrayBuffer.byteLength - 8, true); offset += 4;
    writeString(offset, 'WAVE'); offset += 4;
    writeString(offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numberOfChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numberOfChannels * 2, true); offset += 4;
    view.setUint16(offset, numberOfChannels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString(offset, 'data'); offset += 4;
    view.setUint32(offset, length * numberOfChannels * 2, true); offset += 4;
    
    // Write audio data
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }

  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(0);
      });
      audio.src = URL.createObjectURL(file);
    });
  }
}

// Export singleton instance
export const audioCompressor = new AudioCompressor();
