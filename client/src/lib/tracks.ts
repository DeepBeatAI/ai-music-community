/**
 * Track Management Functions
 * 
 * This module provides functions for managing audio tracks in the platform.
 * Tracks are reusable audio assets that can be referenced by posts and playlists.
 * 
 * @module lib/tracks
 */

import { supabase } from './supabase';
import { serverAudioCompressor } from '@/utils/serverAudioCompression';
import { compressionAnalytics } from '@/utils/compressionAnalytics';
import {
  createTrackError,
  retryTrackOperation,
  validateTrackUpload,
  logTrackError,
} from './trackErrorHandling';
import {
  TrackUploadError,
  type Track,
  TrackFormData,
  TrackUploadData,
  TrackUploadResult,
} from '@/types/track';

/**
 * Extract duration from an audio file
 * @param file - The audio file to extract duration from
 * @returns Promise<number | null> - Duration in seconds, or null if extraction fails
 */
async function extractAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl);
        const duration = audio.duration;
        
        // Check if duration is valid (not NaN or Infinity)
        if (isFinite(duration) && duration > 0) {
          console.log(`✅ Extracted duration: ${duration.toFixed(2)}s`);
          resolve(Math.round(duration)); // Round to nearest second
        } else {
          console.warn('⚠️ Invalid duration extracted:', duration);
          resolve(null);
        }
      });
      
      audio.addEventListener('error', (error) => {
        console.error('❌ Error extracting duration:', error);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      });
      
      audio.src = objectUrl;
      
      // Timeout after 5 seconds
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        console.warn('⚠️ Duration extraction timed out');
        resolve(null);
      }, 5000);
    } catch (error) {
      console.error('❌ Exception extracting duration:', error);
      resolve(null);
    }
  });
}

/**
 * Upload a new track with audio file
 * 
 * This function handles the complete track upload process with compression:
 * 1. Validates file size and format
 * 2. Applies audio compression to reduce bandwidth costs
 * 3. Uploads compressed audio file to Supabase storage
 * 4. Creates track record in database with compression metadata
 * 5. Tracks compression analytics for monitoring
 * 6. Returns the created track or error details
 * 
 * @param userId - The ID of the user uploading the track
 * @param uploadData - Track metadata and audio file
 * @returns Promise<TrackUploadResult> - Result object with success status, track data, and compression info
 * 
 * @example
 * ```typescript
 * const result = await uploadTrack(userId, {
 *   file: audioFile,
 *   title: 'My New Track',
 *   description: 'A great track',
 *   is_public: true,
 * });
 * 
 * if (result.success) {
 *   console.log('Track uploaded:', result.track);
 *   console.log('Compression saved:', result.compressionInfo?.compressionRatio);
 * } else {
 *   console.error('Upload failed:', result.error);
 * }
 * ```
 */
export async function uploadTrack(
  userId: string,
  uploadData: TrackUploadData
): Promise<TrackUploadResult> {
  const startTime = Date.now();
  
  try {
    // Validate upload data
    const validation = validateTrackUpload(uploadData.file, uploadData.title);
    if (!validation.success) {
      const errorDetails = validation.error!;
      logTrackError('uploadTrack:validation', errorDetails, {
        userId,
        fileName: uploadData.file.name,
        fileSize: uploadData.file.size,
      });
      
      return {
        success: false,
        error: errorDetails.userMessage,
        errorCode: errorDetails.code,
        details: errorDetails.technicalDetails,
      };
    }

    console.log(`🎵 Starting track upload for: ${uploadData.file.name} (${(uploadData.file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Extract duration from audio file
    console.log('⏱️ Extracting audio duration...');
    const extractedDuration = await extractAudioDuration(uploadData.file);
    if (extractedDuration) {
      console.log(`✅ Duration extracted: ${extractedDuration}s`);
    } else {
      console.warn('⚠️ Could not extract duration, will be null in database');
    }

    // 1. Apply audio compression (CRITICAL for cost optimization)
    // Check if compression was already done by the UI component
    let compressionResult;
    const compressionSettings = serverAudioCompressor.getRecommendedSettings(uploadData.file);
    
    if (uploadData.compressionResult && uploadData.compressionResult.success) {
      console.log('✅ Using pre-compressed file from UI layer');
      compressionResult = uploadData.compressionResult;
    } else {
      console.log('🔄 Applying audio compression...');
      compressionResult = await serverAudioCompressor.compressAudio(
        uploadData.file,
        compressionSettings
      );
    }

    // 2. Determine which file to upload (compressed or original)
    let fileToUpload: File;
    let compressionApplied = false;
    let compressionRatio = 1.0;
    const originalFileSize = uploadData.file.size;
    let compressedBitrate: string | undefined;
    let originalBitrate: string | undefined;

    if (compressionResult.success && compressionResult.compressedSize < uploadData.file.size) {
      // Compression succeeded and actually reduced file size
      console.log(`✅ Compression successful: ${(compressionResult.originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressionResult.compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionResult.compressionRatio.toFixed(2)}x reduction)`);
      
      // Create a File object from the compressed data (if available from API)
      // Note: The compression API should return the compressed file or a URL to download it
      // For now, we'll use the original file as fallback if compressed file isn't available
      if (compressionResult.supabaseUrl) {
        // If compression API already uploaded to Supabase, we can skip the upload step
        console.log('✅ Compression API already uploaded file to Supabase');
        fileToUpload = uploadData.file; // Won't be used, but needed for type safety
      } else {
        // Fallback: use original file (compression API should provide compressed file)
        console.warn('⚠️ Compression succeeded but compressed file not available, using original');
        fileToUpload = uploadData.file;
      }
      
      compressionApplied = true;
      compressionRatio = compressionResult.compressionRatio;
      compressedBitrate = compressionResult.bitrate;
      originalBitrate = compressionResult.originalBitrate;
    } else {
      // Compression failed or didn't reduce size - use original file
      if (!compressionResult.success) {
        console.warn('⚠️ Compression failed, uploading original file');
      } else {
        console.warn('⚠️ Compression did not reduce file size, uploading original file');
      }
      fileToUpload = uploadData.file;
      compressionApplied = false;
    }

    // 3. Upload audio file to storage (skip if compression API already uploaded)
    let publicUrl: string;
    let uploadedFileName: string;
    let finalFileSize: number;

    if (compressionResult.success && compressionResult.supabaseUrl) {
      // Use the URL from compression API
      publicUrl = compressionResult.supabaseUrl;
      uploadedFileName = publicUrl.split('/').pop() || 'unknown';
      finalFileSize = compressionResult.compressedSize;
      console.log('✅ Using file URL from compression API');
    } else {
      // Upload file to Supabase storage
      const fileExt = fileToUpload.name.split('.').pop() || 'mp3';
      uploadedFileName = `${userId}/${Date.now()}.${fileExt}`;
      
      console.log(`📤 Uploading to storage: ${uploadedFileName}`);
      
      // Upload with retry logic using improved error handling
      try {
        await retryTrackOperation(
          async () => {
            const result = await supabase.storage
              .from('audio-files')
              .upload(uploadedFileName, fileToUpload);
            
            if (result.error) {
              throw result.error;
            }
            
            return result.data;
          },
          { maxAttempts: 3, delayMs: 1000 },
          (attempt, error) => {
            console.log(`⚠️ Upload failed, retrying... (attempt ${attempt}/3)`);
            logTrackError('uploadTrack:storage:retry', error, {
              attempt,
              userId,
              fileName: uploadedFileName,
            });
          }
        );
      } catch (storageError) {
        console.error('❌ Storage upload error after retries:', storageError);
        const errorDetails = createTrackError(TrackUploadError.STORAGE_FAILED, storageError);
        logTrackError('uploadTrack:storage', storageError, {
          userId,
          fileName: uploadedFileName,
        });
        
        return {
          success: false,
          error: errorDetails.userMessage,
          errorCode: errorDetails.code,
          details: errorDetails.technicalDetails,
        };
      }

      // Get public URL
      const { data: { publicUrl: url } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(uploadedFileName);
      
      publicUrl = url;
      finalFileSize = fileToUpload.size;
      console.log('✅ File uploaded successfully');
    }

    // 4. Create track record in database with compression metadata
    console.log('💾 Creating track record in database...');
    const { data: track, error: dbError} = await supabase
      .from('tracks')
      .insert({
        user_id: userId,
        title: uploadData.title,
        description: uploadData.description || null,
        file_url: publicUrl,
        file_size: finalFileSize,
        original_file_size: originalFileSize,
        compression_ratio: compressionApplied ? compressionRatio : null,
        compression_applied: compressionApplied,
        mime_type: uploadData.file.type,
        genre: uploadData.genre || null,
        tags: uploadData.tags || null,
        is_public: uploadData.is_public,
        duration: uploadData.compressionResult?.duration || extractedDuration || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert error:', dbError);
      const errorDetails = createTrackError(TrackUploadError.DATABASE_FAILED, dbError);
      logTrackError('uploadTrack:database', dbError, {
        userId,
        trackTitle: uploadData.title,
      });
      
      // Try to clean up uploaded file (only if we uploaded it)
      if (!compressionResult.supabaseUrl) {
        try {
          await supabase.storage
            .from('audio-files')
            .remove([uploadedFileName]);
          console.log('🧹 Cleaned up uploaded file after database error');
        } catch (cleanupError) {
          console.error('⚠️ Failed to clean up file:', cleanupError);
        }
      }
      
      return {
        success: false,
        error: errorDetails.userMessage,
        errorCode: errorDetails.code,
        details: errorDetails.technicalDetails,
      };
    }

    // 5. Track compression analytics (after track is created so we have track ID)
    if (compressionApplied && track) {
      const processingTime = (Date.now() - startTime) / 1000;
      await compressionAnalytics.trackCompression({
        userId,
        trackId: track.id, // NEW: Link analytics to track record
        fileName: uploadData.file.name,
        originalSize: originalFileSize,
        compressedSize: finalFileSize,
        compressionRatio,
        processingTime,
        compressionApplied: true,
        quality: compressionSettings.quality,
        bitrate: compressedBitrate || 'unknown',
        originalBitrate: originalBitrate || 'unknown',
      });
      console.log('📊 Compression analytics tracked with track ID:', track.id);
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Track upload complete in ${totalTime.toFixed(1)}s`);

    // 6. Return success with compression info
    return {
      success: true,
      track,
      compressionInfo: compressionApplied ? {
        originalSize: originalFileSize,
        compressedSize: finalFileSize,
        compressionRatio,
        compressionApplied: true,
        bitrate: compressedBitrate,
        originalBitrate,
      } : undefined,
    };
  } catch (error) {
    console.error('❌ Unexpected error uploading track:', error);
    const errorDetails = createTrackError(TrackUploadError.NETWORK_ERROR, error);
    logTrackError('uploadTrack:unexpected', error, {
      userId,
      fileName: uploadData.file.name,
    });
    
    return {
      success: false,
      error: errorDetails.userMessage,
      errorCode: errorDetails.code,
      details: errorDetails.technicalDetails,
    };
  }
}

/**
 * Get track by ID
 * 
 * Fetches a single track from the database by its ID.
 * Returns null if the track doesn't exist or user doesn't have access.
 * 
 * @param trackId - The UUID of the track to fetch
 * @returns Promise<Track | null> - The track data or null if not found
 * 
 * @example
 * ```typescript
 * const track = await getTrack('123e4567-e89b-12d3-a456-426614174000');
 * if (track) {
 *   console.log('Track title:', track.title);
 * }
 * ```
 */
export async function getTrack(trackId: string): Promise<Track | null> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (error) {
      console.error('Error fetching track:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching track:', error);
    return null;
  }
}

/**
 * Get user's tracks
 * 
 * Fetches all tracks belonging to a specific user.
 * By default, only returns public tracks unless includePrivate is true.
 * 
 * @param userId - The UUID of the user whose tracks to fetch
 * @param includePrivate - Whether to include private tracks (default: false)
 * @returns Promise<Track[]> - Array of tracks (empty array if none found)
 * 
 * @example
 * ```typescript
 * // Get only public tracks
 * const publicTracks = await getUserTracks(userId);
 * 
 * // Get all tracks including private ones
 * const allTracks = await getUserTracks(userId, true);
 * ```
 */
export async function getUserTracks(
  userId: string,
  includePrivate: boolean = false
): Promise<Track[]> {
  try {
    let query = supabase
      .from('tracks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includePrivate) {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user tracks:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user tracks:', error);
    return [];
  }
}

/**
 * Update track metadata
 * 
 * Updates the metadata of an existing track.
 * Only the track owner can update their tracks (enforced by RLS).
 * 
 * @param trackId - The UUID of the track to update
 * @param updates - Partial track data to update
 * @returns Promise<boolean> - True if update succeeded, false otherwise
 * 
 * @example
 * ```typescript
 * const success = await updateTrack(trackId, {
 *   title: 'Updated Title',
 *   description: 'New description',
 *   is_public: false,
 * });
 * ```
 */
export async function updateTrack(
  trackId: string,
  updates: Partial<TrackFormData>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tracks')
      .update(updates)
      .eq('id', trackId);

    if (error) {
      console.error('Error updating track:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating track:', error);
    return false;
  }
}

/**
 * Delete track
 * 
 * Deletes a track from the database.
 * This will also remove the track from any playlists (CASCADE).
 * Posts referencing this track will have their track_id set to NULL.
 * Only the track owner can delete their tracks (enforced by RLS).
 * 
 * @param trackId - The UUID of the track to delete
 * @returns Promise<boolean> - True if deletion succeeded, false otherwise
 * 
 * @example
 * ```typescript
 * const success = await deleteTrack(trackId);
 * if (success) {
 *   console.log('Track deleted successfully');
 * }
 * ```
 * 
 * @remarks
 * This function does NOT delete the audio file from storage.
 * Consider implementing storage cleanup separately if needed.
 */
export async function deleteTrack(trackId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId);

    if (error) {
      console.error('Error deleting track:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting track:', error);
    return false;
  }
}
