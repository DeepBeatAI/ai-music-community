import { supabase } from '@/lib/supabase';

/**
 * Enhanced audio URL handler for cross-user access
 * This fixes the issue where other users' audio posts don't play
 */
export const getAccessibleAudioUrl = async (originalUrl: string): Promise<string | null> => {
  try {
    console.log('🎵 Getting accessible audio URL for cross-user access:', originalUrl);
    
    // Extract file path from URL
    let filePath = '';
    
    if (originalUrl.includes('/object/sign/audio-files/')) {
      const pathStart = originalUrl.indexOf('/object/sign/audio-files/') + '/object/sign/audio-files/'.length;
      const pathEnd = originalUrl.indexOf('?') !== -1 ? originalUrl.indexOf('?') : originalUrl.length;
      filePath = originalUrl.substring(pathStart, pathEnd);
    } else if (originalUrl.includes('/object/public/audio-files/')) {
      const pathStart = originalUrl.indexOf('/object/public/audio-files/') + '/object/public/audio-files/'.length;
      filePath = originalUrl.substring(pathStart);
    } else {
      // Fallback: extract from URL parts
      const urlParts = originalUrl.split('/');
      const audioFilesIndex = urlParts.findIndex(part => part === 'audio-files');
      
      if (audioFilesIndex === -1) {
        console.error('❌ Invalid audio URL format:', originalUrl);
        return null;
      }
      
      filePath = urlParts.slice(audioFilesIndex + 1).join('/').split('?')[0];
    }

    console.log('📁 Extracted file path for cross-user access:', filePath);

    if (!filePath) {
      console.error('❌ Could not extract file path from URL:', originalUrl);
      return null;
    }

    // Create a fresh signed URL that should work for cross-user access
    // The key insight: creating a fresh signed URL bypasses some RLS restrictions
    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(filePath, 86400); // 24 hours

    if (error) {
      console.error('❌ Error creating accessible URL:', error);
      // If signed URL creation fails, try the original URL as fallback
      return originalUrl;
    }

    console.log('✅ Successfully created accessible audio URL for cross-user access');
    return data.signedUrl;
    
  } catch (error) {
    console.error('❌ Error in getAccessibleAudioUrl:', error);
    // Return original URL as fallback
    return originalUrl;
  }
};

/**
 * Check if current user can access a file by testing the URL
 */
export const testAudioAccess = async (audioUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(audioUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Failed to test audio access:', error);
    return false;
  }
};
