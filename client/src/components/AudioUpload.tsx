'use client'
import { useState, useRef, useCallback } from 'react';
import { validateAudioFile, formatFileSize, formatDuration, AudioValidationResult } from '@/utils/audio';
import { serverAudioCompressor, CompressionResult, CompressionOptions } from '@/utils/serverAudioCompression';
import { compressionAnalytics, memoryMonitor } from '@/utils/compressionAnalytics';
import { uploadTrack } from '@/lib/tracks';
import { useAuth } from '@/contexts/AuthContext';
import type { TrackUploadData } from '@/types/track';

interface UploadedTrack {
  id: string;
  title: string;
  description?: string | null;
  file_url: string;
  duration?: number | null;
}

interface AudioUploadProps {
  onFileSelect: (file: File, duration?: number, compressionInfo?: CompressionResult) => void;
  onFileRemove: () => void;
  onTrackUploaded?: (trackId: string, track: UploadedTrack) => void; // NEW: Callback when track is uploaded
  disabled?: boolean;
  maxFileSize?: number;
  enableCompression?: boolean; // New prop to control compression
  compressionQuality?: 'high' | 'medium' | 'low'; // New prop for quality
  uploadMode?: 'legacy' | 'track'; // NEW: Control upload behavior
  showLibraryOption?: boolean; // NEW: Show option to upload to library only
}

export default function AudioUpload({ 
  onFileSelect, 
  onFileRemove,
  onTrackUploaded,
  disabled = false,
  maxFileSize = 50 * 1024 * 1024,
  enableCompression = true, // Enable by default for production
  compressionQuality = 'medium', // Default to medium quality
  uploadMode = 'legacy', // Default to legacy mode for backward compatibility
  showLibraryOption = false // Default to false for backward compatibility
}: AudioUploadProps) {
  const { user, profile } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<AudioValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // New compression state
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [compressionError, setCompressionError] = useState<string | null>(null);
  
  // NEW: Track upload state
  const [isUploadingTrack, setIsUploadingTrack] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedTrack, setUploadedTrack] = useState<UploadedTrack | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackAuthor, setTrackAuthor] = useState(''); // NEW: Author field
  const [trackDescription, setTrackDescription] = useState('');
  const [showTrackForm, setShowTrackForm] = useState(false);
  
  // NEW: Post caption state (separate from track description)
  const [postCaption, setPostCaption] = useState('');
  const [showPostForm, setShowPostForm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);
    setIsValidating(true);
    setValidation(null);
    setCompressionResult(null);
    setCompressionError(null);

    try {
      // Step 1: Validate the original file
      const validationResult = await validateAudioFile(file);
      setValidation(validationResult);

      if (!validationResult.isValid || !validationResult.file) {
        return; // Stop here if validation failed
      }

      // Step 2: Apply aggressive compression for egress reduction
      const finalFile = validationResult.file;
      let compressionInfo: CompressionResult | null = null;

      if (enableCompression) {
        setIsValidating(false); // End validation phase
        setIsCompressing(true);

        try {
          console.log('🎯 Starting aggressive compression for egress reduction...');
          
          // Start performance monitoring
          memoryMonitor.startMonitoring();
          const startTime = Date.now();
          
          // Use aggressive compression settings that always reduce file size
          const compressionOptions: CompressionOptions = {
            quality: compressionQuality, // Use user preference but with aggressive targets
            // Remove targetBitrate to let server choose aggressive settings
          };

          console.log('⚙️ Aggressive compression settings:', compressionOptions);

          const compression = await serverAudioCompressor.compressAudio(validationResult.file, compressionOptions);
          
          // Calculate processing time and track analytics
          const processingTime = (Date.now() - startTime) / 1000;
          
          if (compression.success) {
            // Always use compression result for egress savings
            console.log(`✅ Compression completed: ${compression.compressionRatio.toFixed(2)}x reduction`);
            console.log(`📊 Egress savings: ${((compression.originalSize - compression.compressedSize) / 1024 / 1024).toFixed(2)}MB`);
            
            // Track compression analytics
            compressionAnalytics.trackCompression({
              userId: 'current-user', // Will be replaced with actual user ID
              fileName: validationResult.file.name,
              originalSize: compression.originalSize,
              compressedSize: compression.compressedSize,
              compressionRatio: compression.compressionRatio,
              processingTime,
              compressionApplied: compression.compressionApplied || true,
              quality: compressionQuality,
              bitrate: compression.bitrate || 'unknown',
              originalBitrate: compression.originalBitrate || 'unknown'
            });
            
            compressionInfo = compression;
            setCompressionResult(compression);
          } else {
            // Compression failed, use original file
            console.warn('⚠️ Compression failed:', compression.error);
            setCompressionError(compression.error || 'Compression failed');
            // Continue with original file
          }

        } catch (compressionError) {
          console.error('❌ Compression error:', compressionError);
          setCompressionError(compressionError instanceof Error ? compressionError.message : 'Compression failed');
          // Continue with original file
        }
      }

      // Step 3: Handle based on upload mode
      if (uploadMode === 'track') {
        // NEW: Show track form for metadata input
        setShowTrackForm(true);
        // Auto-populate title from filename
        const defaultTitle = finalFile.name.replace(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i, '');
        setTrackTitle(defaultTitle);
        // Pre-fill author with username from profile
        if (profile?.username && !trackAuthor) {
          setTrackAuthor(profile.username);
        }
      } else {
        // LEGACY: Notify parent component directly
        onFileSelect(finalFile, validationResult.duration, compressionInfo || undefined);
      }

    } catch (error) {
      console.error('File processing error:', error);
      setValidation({
        isValid: false,
        errors: ['Failed to process file. Please try again.']
      });
    } finally {
      setIsValidating(false);
      setIsCompressing(false);
    }
  }, [enableCompression, uploadMode, compressionQuality, profile?.username, trackAuthor, onFileSelect]);

  // NEW: Handle track upload
  const handleTrackUpload = useCallback(async () => {
    if (!user || !selectedFile || !validation?.file) {
      return;
    }

    setIsUploadingTrack(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // CRITICAL FIX: Use compressed file if compression was successful
      // The compression result contains the Supabase URL of the already-uploaded compressed file
      const uploadData: TrackUploadData = {
        file: validation.file, // Original file (uploadTrack will handle compression internally)
        title: trackTitle || selectedFile.name.replace(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i, ''),
        author: trackAuthor.trim() || profile?.username || 'Unknown Artist', // Mandatory author field
        description: trackDescription || undefined,
        is_public: true, // Default to public
        // Pass compression result so uploadTrack knows compression already happened
        compressionResult: compressionResult || undefined,
      };

      const result = await uploadTrack(user.id, uploadData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.track) {
        setUploadedTrack(result.track);
        
        // Show post creation form after successful track upload
        setShowPostForm(true);
        
        // Notify parent component
        if (onTrackUploaded) {
          onTrackUploaded(result.track.id, result.track);
        }
        
        // Also call legacy callback for backward compatibility
        onFileSelect(validation.file, validation.duration, compressionResult || undefined);
      } else {
        setUploadError(result.error || 'Failed to upload track');
      }
    } catch (error) {
      console.error('Track upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload track');
    } finally {
      setIsUploadingTrack(false);
    }
  }, [user, selectedFile, validation, trackTitle, trackAuthor, profile?.username, trackDescription, compressionResult, onTrackUploaded, onFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    handleFiles(e.target.files);
  }, [disabled, handleFiles]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setValidation(null);
    setCompressionResult(null);
    setCompressionError(null);
    setUploadedTrack(null);
    setUploadError(null);
    setTrackTitle('');
    setTrackAuthor(''); // Reset author field
    setTrackDescription('');
    setShowTrackForm(false);
    setUploadProgress(0);
    setPostCaption('');
    setShowPostForm(false);
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileRemove]);

  const openFileDialog = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${dragActive ? 'border-blue-400 bg-blue-50/5' : 'border-gray-600 hover:border-gray-500'}
          ${disabled || isValidating || isCompressing ? 'opacity-50 cursor-not-allowed' : ''}
          ${selectedFile ? 'border-green-500 bg-green-50/5' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || isValidating || isCompressing}
        />

        {isValidating ? (
          <div className="space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400">Validating audio file...</p>
          </div>
        ) : isCompressing ? (
          <div className="space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-purple-400">Compressing for bandwidth savings...</p>
            <p className="text-xs text-gray-500">Reducing file size to minimize egress costs</p>
          </div>
        ) : selectedFile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <span className="text-2xl">🎵</span>
              <span className="font-medium">Audio file ready</span>
              {compressionResult && compressionResult.compressionApplied && (
                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                  Optimized
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-300 space-y-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-gray-400">
                {formatFileSize(selectedFile.size)}
                {validation?.duration && ` • ${formatDuration(validation.duration)}`}
              </p>
            </div>

            {/* Compression Success Info */}
            {compressionResult && compressionResult.success && compressionResult.compressionApplied && (
              <div className="bg-green-900/20 border border-green-700 rounded p-3 text-left">
                <p className="text-green-400 text-sm font-medium mb-1">✅ File Compressed for Bandwidth Savings!</p>
                <div className="text-green-300 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Original size:</span>
                    <span>{formatFileSize(compressionResult.originalSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compressed size:</span>
                    <span>{formatFileSize(compressionResult.compressedSize)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Bandwidth saved:</span>
                    <span>{formatFileSize(compressionResult.originalSize - compressionResult.compressedSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compression:</span>
                    <span>{compressionResult.compressionRatio.toFixed(1)}x smaller</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Optimized bitrate:</span>
                    <span>{compressionResult.bitrate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Compression Skipped Info - This should rarely happen now */}
            {compressionResult && compressionResult.success && !compressionResult.compressionApplied && (
              <div className="bg-blue-900/20 border border-blue-700 rounded p-2 text-left">
                <p className="text-blue-400 text-xs">
                  ℹ️ Compression failed but file uploaded successfully
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="px-3 py-1 text-sm text-red-400 hover:text-red-300 border border-red-400 hover:border-red-300 rounded transition-colors"
            >
              Remove File
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl text-gray-500">🎵</div>
            <div className="space-y-1">
              <p className="text-lg font-medium text-gray-300">
                Drop your audio file here, or click to browse
              </p>
              <p className="text-sm text-gray-400">
                Supports MP3, WAV, FLAC, M4A, OGG • Max {formatFileSize(maxFileSize)} • Max 10 minutes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validation && !validation.isValid && (
        <div className="bg-red-900/20 border border-red-700 rounded p-3">
          <p className="text-red-400 text-sm font-medium mb-1">File validation failed:</p>
          <ul className="text-red-400 text-sm space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Compression Errors */}
      {compressionError && (
        <div className="bg-orange-900/20 border border-orange-700 rounded p-3">
          <p className="text-orange-400 text-sm font-medium mb-1">⚠️ Compression Warning:</p>
          <p className="text-orange-400 text-sm">{compressionError}</p>
          <p className="text-orange-300 text-xs mt-1">Don&apos;t worry - your original file will be used.</p>
        </div>
      )}

      {/* NEW: Track Metadata Form (only in track mode) */}
      {uploadMode === 'track' && showTrackForm && selectedFile && !uploadedTrack && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-medium text-gray-200">Track Details</h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="track-title" className="block text-sm font-medium text-gray-300 mb-1">
                Title *
              </label>
              <input
                id="track-title"
                type="text"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                placeholder="Enter track title"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploadingTrack}
              />
            </div>

            <div>
              <label htmlFor="track-author" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1">
                Track Author *
                <span 
                  className="text-amber-500 cursor-help" 
                  title="Author cannot be changed after upload. To change, you must delete and re-upload the track."
                >
                  ⚠️
                </span>
              </label>
              <input
                id="track-author"
                type="text"
                value={trackAuthor}
                onChange={(e) => setTrackAuthor(e.target.value)}
                placeholder="Enter artist/author name"
                maxLength={100}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploadingTrack}
              />
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <span>⚠️</span>
                <span>Warning: Author cannot be changed after upload</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Default is your username. Edit for covers, remixes, or collaborations.
              </p>
            </div>

            <div>
              <label htmlFor="track-description" className="block text-sm font-medium text-gray-300 mb-1">
                Track Description (optional)
              </label>
              <textarea
                id="track-description"
                value={trackDescription}
                onChange={(e) => setTrackDescription(e.target.value)}
                placeholder="Describe your music, genre, inspiration..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isUploadingTrack}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Describe the track itself (genre, inspiration, technical details)
                </p>
                <p className="text-xs text-gray-500">
                  {trackDescription.length}/500
                </p>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploadingTrack && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Uploading track...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <div className="bg-red-900/20 border border-red-700 rounded p-3">
              <p className="text-red-400 text-sm font-medium mb-1">Upload failed:</p>
              <p className="text-red-400 text-sm">{uploadError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTrackUpload}
              disabled={isUploadingTrack || !trackTitle.trim() || !trackAuthor.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isUploadingTrack ? 'Uploading...' : 'Upload Track'}
            </button>
            
            {showLibraryOption && (
              <button
                onClick={handleTrackUpload}
                disabled={isUploadingTrack || !trackTitle.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isUploadingTrack ? 'Uploading...' : 'Save to Library'}
              </button>
            )}
            
            <button
              onClick={() => setShowTrackForm(false)}
              disabled={isUploadingTrack}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* NEW: Track Upload Success */}
      {uploadedTrack && !showPostForm && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="text-green-400 font-medium mb-1">Track uploaded successfully!</p>
              <p className="text-green-300 text-sm">
                {uploadedTrack.title}
              </p>
              {uploadedTrack.description && (
                <p className="text-green-300 text-xs mt-1">
                  {uploadedTrack.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW: Post Caption Form (appears after track upload) */}
      {uploadedTrack && showPostForm && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-4">
          <div className="flex items-start space-x-3 mb-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="text-green-400 font-medium mb-1">Track uploaded successfully!</p>
              <p className="text-green-300 text-sm">{uploadedTrack.title}</p>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-4">
            <h3 className="text-lg font-medium text-gray-200 mb-3">Create a Post? (Optional)</h3>
            
            <div>
              <label htmlFor="post-caption" className="block text-sm font-medium text-gray-300 mb-1">
                What&apos;s on your mind?
              </label>
              <textarea
                id="post-caption"
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder="Share your thoughts about this track..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                This caption will appear when you share this track as a post. It&apos;s separate from the track description.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-4">
              <button
                onClick={() => {
                  // TODO: Create post with caption
                  console.log('Creating post with caption:', postCaption);
                  setShowPostForm(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Share as Post
              </button>
              
              <button
                onClick={() => {
                  // Skip post creation
                  setShowPostForm(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Skip - Just Save Track
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}