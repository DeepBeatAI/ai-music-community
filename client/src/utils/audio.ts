import { supabase } from '@/lib/supabase';
import { isAudioUrlExpired } from './audioCache';
import { serverAudioCompressor, CompressionResult } from './serverAudioCompression';

// Supported audio file types and their MIME types
export const SUPPORTED_AUDIO_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/flac': ['.flac'],
  'audio/mp4': ['.m4a'],
  'audio/ogg': ['.ogg'],
} as const;

type SupportedMimeType = keyof typeof SUPPORTED_AUDIO_TYPES;

const isSupportedMimeType = (mimeType: string): mimeType is SupportedMimeType => {
  return mimeType in SUPPORTED_AUDIO_TYPES;
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_DURATION = 600; // 10 minutes in seconds

export interface AudioValidationResult {
  isValid: boolean;
  errors: string[];
  file?: File;
  duration?: number;
}

export interface AudioUploadResult {
  success: boolean;
  audioUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  mimeType?: string;
  error?: string;
  // Enhanced with compression info
  compressionApplied?: boolean;
  originalFileSize?: number;
  compressionRatio?: number;
  compressionBitrate?: string;
}

/**
 * Validate audio file headers (magic numbers)
 */
const validateAudioHeader = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve(false);
        return;
      }
      
      const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
      
      const headerChecks = [
        () => (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) || 
              (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33),
        () => bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
              bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45,
        () => bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43,
        () => bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70,
        () => bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53
      ];
      
      const isValid = headerChecks.some(check => check());
      resolve(isValid);
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
};

/**
 * Enhanced file validation with multiple security checks
 */
export const validateAudioFile = async (file: File): Promise<AudioValidationResult> => {
  const errors: string[] = [];

  if (!isSupportedMimeType(file.type)) {
    errors.push(`Unsupported file type. Supported types: MP3, WAV, FLAC, M4A, OGG`);
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (fileExtension && fileExtension !== '.') {
    const allSupportedExtensions = Object.values(SUPPORTED_AUDIO_TYPES).flat();
    if (!allSupportedExtensions.includes(fileExtension as typeof allSupportedExtensions[number])) {
      errors.push(`Unsupported file extension: ${fileExtension}`);
    }
    
    if (isSupportedMimeType(file.type)) {
      const expectedExtensions = SUPPORTED_AUDIO_TYPES[file.type];
      if (!(expectedExtensions as readonly string[]).includes(fileExtension)) {
        errors.push(`File extension ${fileExtension} doesn't match detected file type ${file.type}. This may indicate a renamed or corrupted file.`);
      }
    }
  }

  try {
    const isValidAudio = await validateAudioHeader(file);
    if (!isValidAudio) {
      errors.push(`File doesn't appear to be a valid audio file (invalid header)`);
    }
  } catch (error) {
    console.warn('Could not validate audio header:', error);
  }

  let duration: number | undefined;
  try {
    duration = await getAudioDuration(file);
    if (duration && duration > MAX_DURATION) {
      errors.push(`Audio too long. Maximum duration: ${MAX_DURATION / 60} minutes`);
    }
  } catch (error) {
    console.warn('Could not determine audio duration:', error);
  }

  return {
    isValid: errors.length === 0,
    errors,
    file: errors.length === 0 ? file : undefined,
    duration
  };
};

/**
 * Get audio file duration using HTML5 Audio API
 */
export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load audio file'));
    });

    audio.src = objectUrl;
  });
};

/**
 * ENHANCED: Upload audio file with intelligent compression
 */
export const uploadAudioFile = async (
  file: File, 
  userId: string,
  compressionInfo?: CompressionResult
): Promise<AudioUploadResult> => {
  try {
    // Validate file first
    const validation = await validateAudioFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    const finalFile = file;
    let compressionData: CompressionResult | undefined = compressionInfo;

    // If compression info wasn't provided, try to compress now
    if (!compressionData) {
      console.log('🎵 No compression info provided - attempting compression during upload...');
      
      try {
        const recommendedSettings = serverAudioCompressor.getRecommendedSettings(file);
        const compressionResult = await serverAudioCompressor.compressAudio(file, recommendedSettings);
        
        if (compressionResult.success && compressionResult.supabaseUrl) {
          // Server compression successful - the file is already uploaded to Supabase!
          console.log('✅ Server compression completed with direct upload');
          
          return {
            success: true,
            audioUrl: compressionResult.supabaseUrl,
            fileName: file.name,
            fileSize: compressionResult.compressedSize,
            originalFileSize: compressionResult.originalSize,
            duration: compressionResult.duration,
            mimeType: 'audio/mpeg', // Compressed files are always MP3
            compressionApplied: compressionResult.compressionApplied,
            compressionRatio: compressionResult.compressionRatio,
            compressionBitrate: compressionResult.bitrate
          };
        } else if (compressionResult.success) {
          // Compression decided not to compress, continue with original upload
          console.log('📝 Compression analysis complete - using original file');
          compressionData = compressionResult;
        } else {
          console.warn('⚠️ Compression failed, proceeding with original upload:', compressionResult.error);
        }
      } catch (compressionError) {
        console.warn('⚠️ Compression process failed, proceeding with original upload:', compressionError);
      }
    }

    // If we reach here, we need to do traditional upload (either compression failed or wasn't beneficial)
    console.log('📤 Proceeding with standard Supabase upload...');

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = finalFile.name.split('.').pop()?.toLowerCase();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(filePath, finalFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: 'Failed to upload file. Please try again.'
      };
    }

    // Get signed URL for the uploaded file
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(data.path, 3600);

    if (urlError) {
      console.error('Signed URL error:', urlError);
      return {
        success: false,
        error: 'Failed to generate file access URL. Please try again.'
      };
    }

    console.log('✅ Standard upload successful');

    return {
      success: true,
      audioUrl: signedUrlData.signedUrl,
      fileName: finalFile.name,
      fileSize: finalFile.size,
      originalFileSize: compressionData?.originalSize,
      duration: validation.duration,
      mimeType: finalFile.type,
      compressionApplied: compressionData?.compressionApplied || false,
      compressionRatio: compressionData?.compressionRatio,
      compressionBitrate: compressionData?.bitrate
    };

  } catch (error) {
    console.error('Upload process error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during upload.'
    };
  }
};

/**
 * Extract file path from various URL formats
 */
const extractFilePathFromUrl = (audioUrl: string): string => {
  console.log('🔍 Extracting file path from URL:', audioUrl.substring(0, 80) + '...');
  
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
};

/**
 * DEPRECATED - Legacy function kept for compatibility
 * @deprecated Use getBestAudioUrl instead for better performance and caching
 * @see getBestAudioUrl
 */
export const getAudioSignedUrl = async (audioUrl: string): Promise<string | null> => {
  // Deprecation warning removed - function should not be called anymore
  try {
    const filePath = extractFilePathFromUrl(audioUrl);
    
    if (!filePath) {
      console.error('❌ Could not extract file path from URL:', audioUrl);
      return audioUrl;
    }

    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(filePath, 7200);

    if (error) {
      console.error('❌ Error creating signed URL:', error.message);
      return audioUrl;
    }

    return data.signedUrl;
    
  } catch (error) {
    console.error('❌ Exception in getAudioSignedUrl:', error);
    return audioUrl;
  }
};

/**
 * Check if an audio URL is truly accessible and not expired
 */
export const validateAudioUrl = async (audioUrl: string, timeout: number = 3000): Promise<boolean> => {
  try {
    if (audioUrl.includes('/object/sign/audio-files/') && audioUrl.includes('token=')) {
      try {
        const tokenPart = audioUrl.split('token=')[1].split('&')[0];
        const payload = JSON.parse(atob(tokenPart.split('.')[1]));
        const expiry = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        
        if (now > expiry) {
          return false;
        }
      } catch {
        console.warn('⚠️ Could not parse token, proceeding with network test');
      }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(audioUrl, { 
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    const isValid = response.status === 200 || response.status === 206;
    return isValid;
  } catch (error: unknown) {
    return false;
  }
};

/**
 * Get the best available audio URL with smart caching
 * This function is now a simple wrapper that delegates to audioCache
 */
export const getBestAudioUrl = async (originalUrl: string): Promise<string | null> => {
  try {
    // Check if URL is already signed and not expired
    if (originalUrl.includes('/object/sign/audio-files/')) {
      if (!isAudioUrlExpired(originalUrl)) {
        return originalUrl;
      }
    }
    
    // For public URLs or expired signed URLs, generate a new signed URL
    const filePath = extractFilePathFromUrl(originalUrl);
    
    if (!filePath) {
      console.error('❌ Could not extract file path from URL:', originalUrl);
      return originalUrl;
    }

    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(filePath, 7200); // 2 hours

    if (error) {
      console.error('❌ Error creating signed URL:', error.message);
      return originalUrl;
    }

    return data.signedUrl;
    
  } catch (error) {
    console.error('❌ Error in getBestAudioUrl:', error);
    return originalUrl;
  }
};

/**
 * Delete audio file from Supabase Storage
 */
export const deleteAudioFile = async (audioUrl: string, userId: string): Promise<boolean> => {
  try {
    const filePath = extractFilePathFromUrl(audioUrl);

    if (!filePath.startsWith(`${userId}/`)) {
      console.error('Security violation: Attempting to delete file not owned by user');
      return false;
    }

    const { error } = await supabase.storage
      .from('audio-files')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete process error:', error);
    return false;
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format duration for display
 */
export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Legacy compatibility function
 */
export const testAudioUrl = validateAudioUrl;