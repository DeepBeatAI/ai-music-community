'use client'
import { useState, useRef, useCallback } from 'react';
import { validateAudioFile, formatFileSize, formatDuration, AudioValidationResult } from '@/utils/audio';
import { serverAudioCompressor, CompressionResult, CompressionOptions } from '@/utils/serverAudioCompression';
import { compressionAnalytics, memoryMonitor } from '@/utils/compressionAnalytics';

interface AudioUploadProps {
  onFileSelect: (file: File, duration?: number, compressionInfo?: CompressionResult) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  maxFileSize?: number;
  enableCompression?: boolean; // New prop to control compression
  compressionQuality?: 'high' | 'medium' | 'low'; // New prop for quality
}

export default function AudioUpload({ 
  onFileSelect, 
  onFileRemove, 
  disabled = false,
  maxFileSize = 50 * 1024 * 1024,
  enableCompression = true, // Enable by default for production
  compressionQuality = 'medium' // Default to medium quality
}: AudioUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<AudioValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // New compression state
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [compressionError, setCompressionError] = useState<string | null>(null);
  
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

      // Step 3: Notify parent component
      onFileSelect(finalFile, validationResult.duration, compressionInfo || undefined);

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
  }, [onFileSelect, enableCompression, compressionQuality]);

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
          <p className="text-orange-300 text-xs mt-1">Don't worry - your original file will be used.</p>
        </div>
      )}
    </div>
  );
}