import { supabase } from '@/lib/supabase';

// Supported audio file types and their MIME types
export const SUPPORTED_AUDIO_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/flac': ['.flac'],
  'audio/mp4': ['.m4a'],
  'audio/ogg': ['.ogg'],
} as const;

// Type for supported MIME types
type SupportedMimeType = keyof typeof SUPPORTED_AUDIO_TYPES;

// Helper function to check if a MIME type is supported
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
      
      // Check for common audio file magic numbers
      const headerChecks = [
        // MP3: FF FB or ID3
        () => (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) || 
              (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33),
        // WAV: RIFF...WAVE
        () => bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
              bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45,
        // FLAC: fLaC
        () => bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43,
        // M4A: ftypM4A
        () => bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70,
        // OGG: OggS
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

  // 1. Basic file type check
  if (!isSupportedMimeType(file.type)) {
    errors.push(`Unsupported file type. Supported types: MP3, WAV, FLAC, M4A, OGG`);
  }

  // 2. File size check
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // 3. Enhanced extension and MIME validation
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (fileExtension) {
    // Check if extension is supported
    const allSupportedExtensions = Object.values(SUPPORTED_AUDIO_TYPES).flat();
    if (!allSupportedExtensions.includes(fileExtension)) {
      errors.push(`Unsupported file extension: ${fileExtension}`);
    }
    
    // Strict MIME and extension matching
    if (isSupportedMimeType(file.type)) {
      const expectedExtensions = SUPPORTED_AUDIO_TYPES[file.type];
      if (!(expectedExtensions as readonly string[]).includes(fileExtension)) {
        errors.push(`File extension ${fileExtension} doesn't match detected file type ${file.type}. This may indicate a renamed or corrupted file.`);
      }
    }
    
    // Additional suspicious file detection
    const suspiciousPatterns: { [key: string]: string[] } = {
      '.mp3': ['audio/wav', 'audio/flac'],
      '.wav': ['audio/mpeg', 'audio/mp4'],
      '.flac': ['audio/mpeg', 'audio/wav'],
      '.m4a': ['audio/mpeg', 'audio/wav'],
      '.ogg': ['audio/mpeg', 'audio/wav']
    };
    
    if (suspiciousPatterns[fileExtension]?.includes(file.type)) {
      errors.push(`Suspicious file detected: ${fileExtension} extension but content appears to be ${file.type}`);
    }
  }

  // 4. File header validation (magic number check)
  try {
    const isValidAudio = await validateAudioHeader(file);
    if (!isValidAudio) {
      errors.push(`File doesn't appear to be a valid audio file (invalid header)`);
    }
  } catch (error) {
    console.warn('Could not validate audio header:', error);
    // Don't fail validation on header check failure
  }

  // 5. Duration validation
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
 * Upload audio file to Supabase Storage
 */
export const uploadAudioFile = async (
  file: File, 
  userId: string
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

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(filePath, file, {
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

    // Get signed URL for the uploaded file (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(data.path, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Signed URL error:', urlError);
      return {
        success: false,
        error: 'Failed to generate file access URL. Please try again.'
      };
    }

    console.log('Upload successful, signed URL generated:', signedUrlData.signedUrl);

    return {
      success: true,
      audioUrl: signedUrlData.signedUrl,
      fileName: file.name,
      fileSize: file.size,
      duration: validation.duration,
      mimeType: file.type
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
  console.log('🔍 Extracting file path from URL:', audioUrl);
  
  let filePath = '';
  
  // Handle signed URLs
  if (audioUrl.includes('/object/sign/audio-files/')) {
    const pathStart = audioUrl.indexOf('/object/sign/audio-files/') + '/object/sign/audio-files/'.length;
    const pathEnd = audioUrl.indexOf('?') !== -1 ? audioUrl.indexOf('?') : audioUrl.length;
    filePath = audioUrl.substring(pathStart, pathEnd);
    console.log('📝 Extracted from signed URL:', filePath);
  }
  // Handle public URLs  
  else if (audioUrl.includes('/object/public/audio-files/')) {
    const pathStart = audioUrl.indexOf('/object/public/audio-files/') + '/object/public/audio-files/'.length;
    filePath = audioUrl.substring(pathStart);
    console.log('📝 Extracted from public URL:', filePath);
  }
  // Handle storage URLs with different patterns
  else if (audioUrl.includes('storage/v1/object/')) {
    const urlParts = audioUrl.split('/');
    const audioFilesIndex = urlParts.findIndex(part => part === 'audio-files');
    
    if (audioFilesIndex !== -1) {
      filePath = urlParts.slice(audioFilesIndex + 1).join('/').split('?')[0];
      console.log('📝 Extracted from storage URL:', filePath);
    }
  }
  // Fallback method
  else {
    const urlParts = audioUrl.split('/');
    const audioFilesIndex = urlParts.findIndex(part => part === 'audio-files');
    
    if (audioFilesIndex !== -1) {
      filePath = urlParts.slice(audioFilesIndex + 1).join('/').split('?')[0];
      console.log('📝 Extracted using fallback method:', filePath);
    }
  }
  
  return filePath;
};

/**
 * ENHANCED - Get a fresh signed URL with multiple extraction methods
 */
export const getAudioSignedUrl = async (audioUrl: string): Promise<string | null> => {
  try {
    console.log('🎵 getAudioSignedUrl processing:', audioUrl.substring(0, 80) + '...');
    
    // Multiple methods to extract file path
    let filePath = '';
    
    // Method 1: Direct extraction for signed URLs
    if (audioUrl.includes('/object/sign/audio-files/')) {
      const pathStart = audioUrl.indexOf('/object/sign/audio-files/') + '/object/sign/audio-files/'.length;
      const pathEnd = audioUrl.indexOf('?') !== -1 ? audioUrl.indexOf('?') : audioUrl.length;
      filePath = audioUrl.substring(pathStart, pathEnd);
      console.log('📁 Extracted from signed URL:', filePath);
    }
    // Method 2: Direct extraction for public URLs
    else if (audioUrl.includes('/object/public/audio-files/')) {
      const pathStart = audioUrl.indexOf('/object/public/audio-files/') + '/object/public/audio-files/'.length;
      filePath = audioUrl.substring(pathStart);
      console.log('📁 Extracted from public URL:', filePath);
    }
    // Method 3: Fallback extraction
    else {
      filePath = extractFilePathFromUrl(audioUrl);
      console.log('📁 Extracted using fallback method:', filePath);
    }
    
    if (!filePath) {
      console.error('❌ Could not extract file path from any method');
      return audioUrl; // Return original URL as fallback
    }

    console.log('✅ File path successfully extracted:', filePath);

    // Create new signed URL with extended expiry
    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(filePath, 7200); // 2 hour expiry for better reliability

    if (error) {
      console.error('❌ Error creating signed URL:', error.message);
      
      // Try alternative approach - sometimes the path needs adjustment
      if (filePath.includes('/')) {
        console.log('🔄 Trying alternative file path format...');
        const alternativePath = filePath.split('/').slice(-1)[0]; // Just the filename
        const { data: altData, error: altError } = await supabase.storage
          .from('audio-files')
          .createSignedUrl(alternativePath, 7200);
          
        if (!altError && altData) {
          console.log('✅ Alternative path worked:', alternativePath);
          return altData.signedUrl;
        }
      }
      
      console.log('🔄 All signing attempts failed, returning original URL');
      return audioUrl;
    }

    console.log('✅ Successfully created fresh signed URL');
    return data.signedUrl;
    
  } catch (error) {
    console.error('❌ Exception in getAudioSignedUrl:', error);
    return audioUrl; // Return original URL as final fallback
  }
};

/**
 * STRICT - Check if an audio URL is truly accessible and not expired
 */
export const validateAudioUrl = async (audioUrl: string, timeout: number = 3000): Promise<boolean> => {
  try {
    console.log('🔍 STRICT validation for URL...');
    
    // FIRST: If it's a signed URL, check if token is expired
    if (audioUrl.includes('/object/sign/audio-files/') && audioUrl.includes('token=')) {
      try {
        const tokenPart = audioUrl.split('token=')[1].split('&')[0];
        const payload = JSON.parse(atob(tokenPart.split('.')[1]));
        const expiry = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        
        if (now > expiry) {
          console.log('❌ URL has expired token, automatically invalid');
          return false;
        }
        
        console.log('✅ Token is not expired, proceeding with network test');
      } catch (tokenError) {
        console.warn('⚠️ Could not parse token, proceeding with network test');
      }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('⏱️ URL validation timed out after', timeout, 'ms');
    }, timeout);
    
    // Make a more comprehensive request
    const response = await fetch(audioUrl, { 
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      // Disable caching completely
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    // Be VERY strict - only 200 or 206 (partial content) are acceptable
    const isValid = response.status === 200 || response.status === 206;
    
    if (isValid) {
      console.log('✅ URL passed strict validation');
    } else {
      console.log('❌ URL failed strict validation - status:', response.status);
    }
    
    return isValid;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️ URL validation timeout - treating as invalid');
    } else {
      console.log('❌ URL validation error:', error.message, '- treating as invalid');
    }
    return false;
  }
};

/**
 * ENHANCED - Get the best available audio URL with aggressive URL refresh
 */
export const getBestAudioUrl = async (originalUrl: string): Promise<string | null> => {
  try {
    console.log('🎵 getBestAudioUrl processing:', originalUrl.substring(0, 80) + '...');
    
    // Check if it's a signed URL and if it's expired
    let shouldForceRefresh = false;
    
    if (originalUrl.includes('/object/sign/audio-files/') && originalUrl.includes('token=')) {
      console.log('🔍 Checking if signed URL is expired...');
      
      try {
        // Parse the JWT token to check expiration
        const tokenPart = originalUrl.split('token=')[1].split('&')[0];
        const payload = JSON.parse(atob(tokenPart.split('.')[1]));
        const expiry = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now > expiry;
        
        if (isExpired) {
          console.log('⏰ URL is expired, forcing refresh');
          shouldForceRefresh = true;
        } else {
          const timeToExpiry = expiry - now;
          console.log(`✅ URL expires in ${timeToExpiry} seconds`);
          
          // If it expires soon (within 5 minutes), refresh it preemptively
          if (timeToExpiry < 300) {
            console.log('⚠️ URL expires soon, preemptively refreshing');
            shouldForceRefresh = true;
          }
        }
      } catch (tokenError) {
        console.warn('⚠️ Could not parse token, will test URL directly:', tokenError.message);
        shouldForceRefresh = false;
      }
    }
    
    // If we know it's expired, skip validation and go straight to refresh
    if (!shouldForceRefresh && originalUrl.includes('/object/sign/audio-files/')) {
      console.log('🔍 Quick validation test...');
      const quickTest = await validateAudioUrl(originalUrl, 2000);
      if (quickTest) {
        console.log('✅ Existing URL works, using as-is');
        return originalUrl;
      }
      console.log('❌ Existing URL failed validation, will refresh');
      shouldForceRefresh = true;
    }
    
    // Generate fresh signed URL for ANY URL type
    console.log('🔄 Generating fresh signed URL...');
    const freshSignedUrl = await getAudioSignedUrl(originalUrl);
    
    if (freshSignedUrl && freshSignedUrl !== originalUrl) {
      console.log('🆕 Got fresh signed URL, quick validation...');
      const isValidFresh = await validateAudioUrl(freshSignedUrl, 2000);
      if (isValidFresh) {
        console.log('✅ Fresh signed URL validated successfully');
        return freshSignedUrl;
      } else {
        console.log('⚠️ Fresh signed URL failed validation, but using anyway');
        return freshSignedUrl; // Use it anyway, let the player handle it
      }
    }
    
    // Try public URL approach
    if (originalUrl.includes('/object/public/audio-files/')) {
      console.log('🔄 Testing original public URL...');
      const isValidPublic = await validateAudioUrl(originalUrl, 2000);
      if (isValidPublic) {
        console.log('✅ Original public URL works');
        return originalUrl;
      }
    }
    
    // Final fallback - return the fresh signed URL or original
    if (freshSignedUrl && freshSignedUrl !== originalUrl) {
      console.log('🔄 Using fresh URL as final choice');
      return freshSignedUrl;
    }
    
    console.log('🔄 Using original URL as final fallback');
    return originalUrl;
    
  } catch (error) {
    console.error('❌ Error in getBestAudioUrl:', error);
    return originalUrl; // Always return something
  }
};

/**
 * Delete audio file from Supabase Storage
 */
export const deleteAudioFile = async (audioUrl: string, userId: string): Promise<boolean> => {
  try {
    console.log('Attempting to delete audio file:', audioUrl);
    
    const filePath = extractFilePathFromUrl(audioUrl);

    console.log('Extracted file path for deletion:', filePath);

    // Verify the file belongs to the current user
    if (!filePath.startsWith(`${userId}/`)) {
      console.error('Security violation: Attempting to delete file not owned by user');
      return false;
    }

    // Attempt deletion
    const { error } = await supabase.storage
      .from('audio-files')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    console.log('Successfully deleted file:', filePath);
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